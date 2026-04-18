-- ============================================================================
-- SEED SELLER ACCOUNTS IN SUPABASE AUTH
-- Creates one auth user per shop (email = shop_code@seller.local, password = campus123)
-- Run AFTER 06_seed_complete.sql so shops table is populated.
-- Safe to re-run (ON CONFLICT DO NOTHING).
-- ============================================================================

DO $$
DECLARE
  s       RECORD;
  uid     UUID;
  already BOOLEAN;
BEGIN
  FOR s IN SELECT shop_code, name FROM shops ORDER BY shop_code LOOP

    -- skip if this seller email already exists
    SELECT EXISTS(
      SELECT 1 FROM auth.users WHERE email = s.shop_code || '@seller.local'
    ) INTO already;

    IF already THEN
      CONTINUE;
    END IF;

    uid := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      is_sso_user,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      uid,
      'authenticated',
      'authenticated',
      s.shop_code || '@seller.local',
      crypt('campus123', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object(
        'role',    'seller',
        'shop_id', s.shop_code,
        'name',    s.name
      ),
      false,
      '',
      '',
      '',
      '',
      false,
      NOW(),
      NOW()
    );

    INSERT INTO auth.identities (
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at,
      id
    ) VALUES (
      s.shop_code || '@seller.local',
      uid,
      jsonb_build_object(
        'sub',   uid::TEXT,
        'email', s.shop_code || '@seller.local'
      ),
      'email',
      NOW(), NOW(), NOW(),
      gen_random_uuid()
    );

  END LOOP;
END $$;
