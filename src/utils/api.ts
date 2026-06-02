import { projectId, publicAnonKey } from './supabase/info';
import { supabase } from './supabase/client';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-36162e30`;

/**
 * Thrown when the user's Supabase session is gone or can't be refreshed.
 * Callers should catch this specifically — show a "please sign in again"
 * message, sign the user out, and stop their polling loop.
 */
export class AuthExpiredError extends Error {
  constructor() {
    super('Session expired');
    this.name = 'AuthExpiredError';
  }
}

async function currentToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? publicAnonKey;
}

/**
 * Try to refresh the access token using the refresh token. Returns the new
 * access token, or null if the refresh failed (refresh token itself expired
 * or the session was wiped).
 */
async function tryRefresh(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) return null;
    return data.session.access_token;
  } catch {
    return null;
  }
}

/**
 * fetch() with automatic 401 retry: if the server returns 401, force a session
 * refresh and try again exactly once. If still 401, throw AuthExpiredError.
 */
async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const buildHeaders = (token: string) => ({
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined ?? {}),
    'Authorization': `Bearer ${token}`,
  });

  let token = await currentToken();
  let res = await fetch(input, { ...init, headers: buildHeaders(token) });

  if (res.status === 401) {
    const fresh = await tryRefresh();
    if (!fresh) throw new AuthExpiredError();
    res = await fetch(input, { ...init, headers: buildHeaders(fresh) });
    if (res.status === 401) throw new AuthExpiredError();
  }

  return res;
}

export const api = {
  async post(endpoint: string, body: any) {
    const res = await authFetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },

  async get(endpoint: string, params?: Record<string, string>) {
    const url = new URL(`${API_BASE}${endpoint}`);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
    // cache: 'no-store' — every poll must hit the Edge Function, never the
    // browser's HTTP cache. Without this, the student order list (and seller
    // queue) silently serves the first response forever once it's been
    // cached, even though the server has fresh data.
    const res = await authFetch(url.toString(), { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },

  async delete(endpoint: string) {
    const res = await authFetch(`${API_BASE}${endpoint}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },
};
