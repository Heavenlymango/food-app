import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BOT_TOKEN            = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function sendMessage(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}

const WEBHOOK_URL = `https://qavwicfoiccfwfntumjj.supabase.co/functions/v1/telegram-webhook`;

serve(async (req) => {
  const url = new URL(req.url);

  // One-time setup: GET /telegram-webhook?setup=1 registers the webhook with Telegram
  if (req.method === 'GET' && url.searchParams.get('setup') === '1') {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: WEBHOOK_URL, drop_pending_updates: true }),
      }
    );
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Telegram always sends POST; any other method is a health check
  if (req.method !== 'POST') return new Response('OK');

  try {
    const update = await req.json();
    const message = update?.message;
    if (!message) return new Response('OK');

    const chatId: number = message.chat.id;
    const text: string   = message.text ?? '';

    if (!text.startsWith('/start')) {
      await sendMessage(chatId, 'Please use the verification link from the Campus Food app.');
      return new Response('OK');
    }

    const verifyToken = text.replace('/start', '').trim();
    if (!verifyToken) {
      await sendMessage(chatId, 'Please use the verification link from the Campus Food app.');
      return new Response('OK');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: row, error } = await supabase
      .from('telegram_otp')
      .select('id, verified, expires_at')
      .eq('verify_token', verifyToken)
      .single();

    if (error || !row) {
      await sendMessage(chatId, '❌ Invalid or expired link. Please request a new one from the app.');
      return new Response('OK');
    }

    if (row.verified) {
      await sendMessage(chatId, '✅ Your account is already verified! You can order freely.');
      return new Response('OK');
    }

    // Generate 6-digit OTP, valid 10 minutes
    const otp       = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await supabase
      .from('telegram_otp')
      .update({ telegram_chat_id: chatId, otp_code: otp, expires_at: expiresAt })
      .eq('id', row.id);

    await sendMessage(
      chatId,
      `🔐 <b>Campus Food Verification</b>\n\nYour OTP code is:\n\n<code>${otp}</code>\n\n⏱ Valid for 10 minutes.\n\nEnter this code in the app to verify your account.`,
    );

    return new Response('OK');
  } catch (err) {
    console.error(err);
    return new Response('OK'); // Always return 200 so Telegram doesn't retry
  }
});
