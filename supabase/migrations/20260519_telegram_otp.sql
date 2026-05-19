-- Telegram OTP verification table
CREATE TABLE IF NOT EXISTS public.telegram_otp (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verify_token    TEXT        NOT NULL UNIQUE,
  telegram_chat_id BIGINT,
  otp_code        TEXT,
  expires_at      TIMESTAMPTZ,
  verified        BOOLEAN     NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_otp_verify_token ON public.telegram_otp(verify_token);
CREATE INDEX IF NOT EXISTS idx_telegram_otp_user_id      ON public.telegram_otp(user_id);

ALTER TABLE public.telegram_otp ENABLE ROW LEVEL SECURITY;

-- Authenticated users can only read their own rows (edge functions use service role)
CREATE POLICY "Users read own OTP" ON public.telegram_otp
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
