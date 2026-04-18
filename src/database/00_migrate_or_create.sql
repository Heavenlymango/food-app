-- ============================================================================
-- SAFE SETUP — run this instead of 01_schema.sql if tables already exist.
-- Also run this on a fresh database (CREATE TABLE IF NOT EXISTS is harmless).
--
-- Key difference from 01_schema.sql:
--   • Uses IF NOT EXISTS everywhere (idempotent)
--   • student_id / user_id columns store auth.users UUIDs (no FK to public.users)
--   • Drops any stale FK constraints that block Supabase Auth UUIDs
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── SHOPS ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shops (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_code           VARCHAR(50)  UNIQUE NOT NULL,
  name                VARCHAR(255) NOT NULL,
  campus              VARCHAR(50)  NOT NULL CHECK (campus IN ('RUPP','IFL')),
  category            VARCHAR(50),
  description         TEXT,
  location            VARCHAR(255),
  logo_url            TEXT,
  banner_url          TEXT,
  contact_phone       VARCHAR(20),
  contact_email       VARCHAR(255),
  owner_id            UUID,            -- auth.users UUID, no FK
  is_active           BOOLEAN DEFAULT true,
  is_open             BOOLEAN DEFAULT true,
  accepts_preorders   BOOLEAN DEFAULT false,
  min_order_amount    DECIMAL(10,2),
  estimated_prep_time INTEGER DEFAULT 15,
  rating              DECIMAL(3,2) DEFAULT 0.00 CHECK (rating BETWEEN 0 AND 5),
  total_reviews       INTEGER DEFAULT 0,
  total_orders        INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── MENU CATEGORIES ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id     UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  sort_order  INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (shop_id, name)
);

-- ── MENU ITEMS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id           UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  category_id       UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
  name              VARCHAR(255) NOT NULL,
  name_khmer        VARCHAR(255),
  description       TEXT,
  price             DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  discount_percent  DECIMAL(5,2) DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
  calories          INTEGER,
  health_tags       TEXT[] DEFAULT '{}',
  is_healthy        BOOLEAN DEFAULT false,
  is_special        BOOLEAN DEFAULT false,
  is_available      BOOLEAN DEFAULT true,
  daily_stock_limit INTEGER,
  category          VARCHAR(100),
  image_url         TEXT,
  sort_order        INTEGER DEFAULT 0,
  preparation_time  INTEGER DEFAULT 15,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Add category column to existing tables that pre-date this migration
ALTER TABLE IF EXISTS menu_items ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- ── MENU ITEM ADD-ONS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_item_addons (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  group_name   VARCHAR(100) NOT NULL,
  option_name  VARCHAR(100) NOT NULL,
  extra_price  DECIMAL(10,2) DEFAULT 0 CHECK (extra_price >= 0),
  is_default   BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (menu_item_id, group_name, option_name)
);

-- ── ITEM DAILY STOCK ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS item_daily_stock (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  stock_limit  INTEGER NOT NULL,
  sold_count   INTEGER NOT NULL DEFAULT 0 CHECK (sold_count >= 0),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (menu_item_id, date)
);

-- ── ORDERS ────────────────────────────────────────────────────────────────────
-- student_id is an auth.users UUID — stored without FK so inserts never fail.
-- Drop the old FK if it exists (was pointing to public.users).
ALTER TABLE IF EXISTS orders DROP CONSTRAINT IF EXISTS orders_student_id_fkey;

CREATE TABLE IF NOT EXISTS orders (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number         VARCHAR(50) UNIQUE NOT NULL DEFAULT 'ORD-TMP-' || substr(gen_random_uuid()::TEXT, 1, 8),
  queue_number         SMALLINT,
  student_id           UUID NOT NULL,   -- auth.users UUID, no FK constraint
  shop_id              UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  total_amount         DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  service_type         VARCHAR(20) NOT NULL DEFAULT 'pickup'
                       CHECK (service_type IN ('pickup','dine-in')),
  status               VARCHAR(20) NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','preparing','ready','completed','cancelled')),
  ordered_at           TIMESTAMPTZ DEFAULT NOW(),
  accepted_at          TIMESTAMPTZ,
  ready_at             TIMESTAMPTZ,
  completed_at         TIMESTAMPTZ,
  cancelled_at         TIMESTAMPTZ,
  estimated_ready_time TIMESTAMPTZ,
  cancelled_by         VARCHAR(20) CHECK (cancelled_by IN ('student','seller','admin')),
  cancellation_reason  TEXT,
  special_instructions TEXT,
  is_late              BOOLEAN DEFAULT false,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── ORDER ITEMS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id    UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  unit_price      DECIMAL(10,2) NOT NULL,
  item_name       VARCHAR(255) NOT NULL,
  addons_snapshot JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── ORDER STATUS HISTORY ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_status_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  previous_status VARCHAR(20),
  new_status      VARCHAR(20) NOT NULL,
  changed_by      UUID,   -- auth.users UUID, no FK
  notes           TEXT,
  changed_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── SHOP OPERATING HOURS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shop_operating_hours (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id     UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  opens_at    TIME NOT NULL,
  closes_at   TIME NOT NULL,
  is_closed   BOOLEAN DEFAULT false,
  UNIQUE (shop_id, day_of_week)
);

-- ── SHOP CLOSURES ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shop_closures (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id          UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  closure_type     VARCHAR(50) NOT NULL
                   CHECK (closure_type IN ('holiday','maintenance','special_event','emergency')),
  reason           VARCHAR(255) NOT NULL,
  starts_at        TIMESTAMPTZ NOT NULL,
  ends_at          TIMESTAMPTZ NOT NULL,
  notify_customers BOOLEAN DEFAULT true,
  created_by       UUID,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── SHOP ANNOUNCEMENTS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shop_announcements (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id    UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  title      VARCHAR(255) NOT NULL,
  body       TEXT NOT NULL,
  is_pinned  BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── MESSAGES ─────────────────────────────────────────────────────────────────
-- Drop old FKs if they reference public.users
ALTER TABLE IF EXISTS messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE IF EXISTS messages DROP CONSTRAINT IF EXISTS messages_recipient_id_fkey;

CREATE TABLE IF NOT EXISTS messages (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sender_id    UUID NOT NULL,     -- auth.users UUID
  recipient_id UUID NOT NULL,     -- auth.users UUID
  message      TEXT NOT NULL,
  is_read      BOOLEAN DEFAULT false,
  read_at      TIMESTAMPTZ,
  sent_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
-- Drop old FK if it references public.users
ALTER TABLE IF EXISTS notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

CREATE TABLE IF NOT EXISTS notifications (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL,   -- auth.users UUID, no FK
  type             VARCHAR(50) NOT NULL DEFAULT 'order_update'
                   CHECK (type IN ('order_update','message','system','promotion')),
  title            VARCHAR(255) NOT NULL DEFAULT '',
  message          TEXT NOT NULL,
  related_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  is_read          BOOLEAN DEFAULT false,
  read_at          TIMESTAMPTZ,
  priority         VARCHAR(20) DEFAULT 'normal'
                   CHECK (priority IN ('low','normal','high','urgent')),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── REVIEWS ──────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS reviews DROP CONSTRAINT IF EXISTS reviews_student_id_fkey;

CREATE TABLE IF NOT EXISTS reviews (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,    -- auth.users UUID
  shop_id    UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  rating     SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (order_id)
);

-- ── USER PREFERENCES ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id              UUID PRIMARY KEY,  -- auth.users UUID
  notification_enabled BOOLEAN DEFAULT true,
  email_notifications  BOOLEAN DEFAULT false,
  favorite_shops       UUID[] DEFAULT '{}',
  dietary_preferences  TEXT[] DEFAULT '{}',
  language             VARCHAR(10) DEFAULT 'en' CHECK (language IN ('en','km')),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── SHOP STATISTICS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shop_statistics (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id                  UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  date                     DATE NOT NULL,
  total_orders             INTEGER DEFAULT 0,
  completed_orders         INTEGER DEFAULT 0,
  cancelled_orders         INTEGER DEFAULT 0,
  total_revenue            DECIMAL(10,2) DEFAULT 0,
  average_preparation_time INTEGER,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (shop_id, date)
);

-- ── INDEXES (IF NOT EXISTS prevents duplicates) ───────────────────────────────
CREATE INDEX IF NOT EXISTS idx_shops_campus        ON shops(campus);
CREATE INDEX IF NOT EXISTS idx_shops_is_active     ON shops(is_active);
CREATE INDEX IF NOT EXISTS idx_mi_shop             ON menu_items(shop_id);
CREATE INDEX IF NOT EXISTS idx_mi_is_available     ON menu_items(is_available);
CREATE INDEX IF NOT EXISTS idx_mi_is_healthy       ON menu_items(is_healthy);
CREATE INDEX IF NOT EXISTS idx_mi_is_special       ON menu_items(is_special);
CREATE INDEX IF NOT EXISTS idx_mi_name_trgm        ON menu_items USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_orders_student      ON orders(student_id);
CREATE INDEX IF NOT EXISTS idx_orders_shop         ON orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_status       ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_ordered_at   ON orders(ordered_at DESC);
CREATE INDEX IF NOT EXISTS idx_oi_order            ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_notif_user          ON notifications(user_id, is_read, created_at DESC);

-- ── AUTO-GENERATE ORDER NUMBER ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE today TEXT; seq INTEGER;
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number LIKE 'ORD-TMP-%' THEN
    today := TO_CHAR(NOW(), 'YYYYMMDD');
    SELECT COUNT(*)+1 INTO seq FROM orders WHERE DATE(ordered_at) = CURRENT_DATE;
    NEW.order_number := 'ORD-' || today || '-' || LPAD(seq::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_order_number ON orders;
CREATE TRIGGER trg_order_number
  BEFORE INSERT ON orders FOR EACH ROW EXECUTE FUNCTION set_order_number();

-- ── AUTO-TIMESTAMPS ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_shops_ts      ON shops;
DROP TRIGGER IF EXISTS trg_menu_items_ts ON menu_items;
DROP TRIGGER IF EXISTS trg_orders_ts     ON orders;

CREATE TRIGGER trg_shops_ts      BEFORE UPDATE ON shops      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_menu_items_ts BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_orders_ts     BEFORE UPDATE ON orders     FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE shops          ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications  ENABLE ROW LEVEL SECURITY;

-- Public read for shops and menu
DROP POLICY IF EXISTS shops_read     ON shops;
DROP POLICY IF EXISTS mi_read        ON menu_items;
CREATE POLICY shops_read ON shops    FOR SELECT USING (true);
CREATE POLICY mi_read    ON menu_items FOR SELECT USING (true);

-- Orders: students see own; service role (Edge Function) can insert/update
DROP POLICY IF EXISTS orders_select  ON orders;
DROP POLICY IF EXISTS orders_insert  ON orders;
DROP POLICY IF EXISTS orders_update  ON orders;
CREATE POLICY orders_select ON orders FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY orders_insert ON orders FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY orders_update ON orders FOR UPDATE USING (auth.uid() = student_id);

-- Order items: readable if you own the order
DROP POLICY IF EXISTS oi_select ON order_items;
CREATE POLICY oi_select ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE id = order_id AND student_id = auth.uid())
);
DROP POLICY IF EXISTS oi_insert ON order_items;
CREATE POLICY oi_insert ON order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM orders WHERE id = order_id AND student_id = auth.uid())
);

-- Notifications: users see only their own
DROP POLICY IF EXISTS notif_select ON notifications;
DROP POLICY IF EXISTS notif_update ON notifications;
CREATE POLICY notif_select ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY notif_update ON notifications FOR UPDATE USING (auth.uid() = user_id);
