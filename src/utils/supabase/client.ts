import { createClient } from '@jsr/supabase__supabase-js';
import { projectId, publicAnonKey } from './info';

export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
);

export function userFromSession(session: any) {
  const meta = session?.user?.user_metadata ?? {};
  return {
    id: session.user.id,
    name: (meta.name as string) ?? '',
    role: (meta.role as string) ?? 'student',
    studentId: meta.student_id as string | undefined,
    shopId: meta.shop_id as string | undefined,
    campus: meta.campus as string | undefined,
    accessToken: session.access_token as string,
    telegramVerified: (meta.telegram_verified as boolean) ?? false,
  };
}

/** Mirrors Flutter AuthService._toEmail */
export function toEmail(userId: string) {
  if (userId.includes('@')) return userId;
  return /^\d/.test(userId)
    ? `${userId}@student.local`
    : `${userId}@seller.local`;
}
