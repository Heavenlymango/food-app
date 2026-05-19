import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY    = Deno.env.get('SUPABASE_ANON_KEY')!;

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });
    }

    const { otp } = await req.json();
    if (!otp?.trim()) {
      return new Response(JSON.stringify({ error: 'OTP is required' }), { status: 400, headers: cors });
    }

    // Verify caller
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Find the most recent pending OTP that has a chat_id (user opened the bot)
    const { data: row, error } = await supabase
      .from('telegram_otp')
      .select('*')
      .eq('user_id', user.id)
      .eq('verified', false)
      .not('otp_code', 'is', null)
      .not('telegram_chat_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !row) {
      return new Response(
        JSON.stringify({ error: "Haven't received your Telegram message yet. Please open the link and tap Start first." }),
        { status: 400, headers: cors },
      );
    }

    if (new Date(row.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'OTP has expired. Please request a new verification link.' }),
        { status: 400, headers: cors },
      );
    }

    if (row.otp_code !== otp.trim()) {
      return new Response(
        JSON.stringify({ error: 'Incorrect OTP. Please check the code in your Telegram chat.' }),
        { status: 400, headers: cors },
      );
    }

    // Mark row as verified
    await supabase
      .from('telegram_otp')
      .update({ verified: true })
      .eq('id', row.id);

    // Stamp telegram_verified on the user's metadata
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, telegram_verified: true },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
});
