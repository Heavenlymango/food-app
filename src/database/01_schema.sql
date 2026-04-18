-- Campus Food Ordering System — Master Schema
-- PostgreSQL / Supabase Compatible
-- Single source of truth. Run this file once on a fresh database.
-- Files 06–10 are deprecated; all their definitions live here.

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- fuzzy menu search

-- ============================================================================
-- USERS
-- ============================================================================
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- email is optional: students register with student_id only
  email           VARCHAR(255) UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  role            VARCHAR(20)  NOT NULL CHECK (role IN ('student', 'seller', 'admin')),
  name            VARCHAR(255) NOT NULL,
  student_id      VARCHAR(50)  UNIQUE, -- students only
  phone           VARCHAR(20),
  avatar_url      TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SHOPS
-- ============================================================================
CREATE TABLE shops (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_code           VARCHAR(50)  UNIQUE NOT NULL, -- short code: 'A1', 'IFL-NC'
  name                VARCHAR(255) NOT NULL,
  campus              VARCHAR(50)  NOT NULL CHECK (campus IN ('RUPP', 'IFL')),
  category            VARCHAR(50),   -- 'Khmer', 'Drinks', 'Snacks', …
  description         TEXT,
  location            VARCHAR(255),  -- stall / building label
  logo_url            TEXT,
  banner_url          TEXT,
  contact_phone       VARCHAR(20),
  contact_email       VARCHAR(255),
  owner_id            UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active           BOOLEAN DEFAULT true,
  is_open             BOOLEAN DEFAULT true, -- real-time open/closed toggle
  accepts_preorders   BOOLEAN DEFAULT false,
  min_order_amount    DECIMAL(10,2),
  estimated_prep_time INTEGER DEFAULT 15, -- minutes
  rating              DECIMAL(3,2) DEFAULT 0.00 CHECK (rating BETWEEN 0 AND 5),
  total_reviews       INTEGER DEFAULT 0,
  total_orders        INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MENU CATEGORIES  (managed by seller)
-- ============================================================================
CREATE TABLE menu_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id     UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  sort_order  INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (shop_id, name)
);

-- ============================================================================
-- MENU ITEMS
-- ============================================================================
CREATE TABLE menu_items (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id              UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  category_id          UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
  name                 VARCHAR(255) NOT NULL,
  name_khmer           VARCHAR(255),
  description          TEXT,
  price                DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  -- Discounts: discount_percent takes precedence over a fixed sale_price
  discount_percent     DECIMAL(5,2) DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
  -- Health & dietary info
  calories             INTEGER,           -- kcal per serving
  health_tags          TEXT[] DEFAULT '{}', -- ['vegetarian','halal','gluten-free',…]
  is_healthy           BOOLEAN DEFAULT false,
  is_special           BOOLEAN DEFAULT false,  -- featured / today's special
  -- Availability
  is_available         BOOLEAN DEFAULT true,
  daily_stock_limit    INTEGER,           -- NULL = unlimited
  -- Presentation
  image_url            TEXT,
  sort_order           INTEGER DEFAULT 0,
  preparation_time     INTEGER DEFAULT 15, -- minutes
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MENU ITEM ADD-ONS  (size, spice level, toppings, etc.)
-- ============================================================================
CREATE TABLE menu_item_addons (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  group_name   VARCHAR(100) NOT NULL,  -- 'Size', 'Spice Level', 'Toppings'
  option_name  VARCHAR(100) NOT NULL,  -- 'Large', 'Extra Hot', 'Egg'
  extra_price  DECIMAL(10,2) DEFAULT 0 CHECK (extra_price >= 0),
  is_default   BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (menu_item_id, group_name, option_name)
);

-- ============================================================================
-- ITEM DAILY STOCK  (per-date portion tracking)
-- ============================================================================
CREATE TABLE item_daily_stock (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  stock_limit  INTEGER NOT NULL,
  sold_count   INTEGER NOT NULL DEFAULT 0 CHECK (sold_count >= 0),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (menu_item_id, date)
);

-- ============================================================================
-- ORDERS
-- ============================================================================
CREATE TABLE orders (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number          VARCHAR(50) UNIQUE NOT NULL, -- ORD-20260418-0001
  queue_number          SMALLINT,                    -- per-shop daily counter for pickup

  student_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_id               UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  total_amount          DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  service_type          VARCHAR(20) NOT NULL CHECK (service_type IN ('pickup', 'dine-in')),

  status  VARCHAR(20) NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending','preparing','ready','completed','cancelled')),

  -- Timestamps per stage
  ordered_at            TIMESTAMPTZ DEFAULT NOW(),
  accepted_at           TIMESTAMPTZ,
  ready_at              TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ,
  estimated_ready_time  TIMESTAMPTZ,

  -- Cancellation
  cancelled_by          VARCHAR(20) CHECK (cancelled_by IN ('student','seller','admin')),
  cancellation_reason   TEXT,

  special_instructions  TEXT,
  is_late               BOOLEAN DEFAULT false,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ORDER ITEMS
-- ============================================================================
CREATE TABLE order_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id         UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  -- SET NULL preserves order history when a menu item is later deleted
  menu_item_id     UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  quantity         INTEGER NOT NULL CHECK (quantity > 0),
  unit_price       DECIMAL(10,2) NOT NULL, -- price at time of order
  item_name        VARCHAR(255) NOT NULL,  -- snapshot in case item is deleted
  addons_snapshot  JSONB DEFAULT '[]',     -- [{group, option, extra_price}]
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ORDER STATUS HISTORY
-- ============================================================================
CREATE TABLE order_status_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  previous_status VARCHAR(20),
  new_status      VARCHAR(20) NOT NULL,
  changed_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  notes           TEXT,
  changed_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SHOP OPERATING HOURS
-- ============================================================================
CREATE TABLE shop_operating_hours (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id     UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun
  opens_at    TIME NOT NULL,
  closes_at   TIME NOT NULL,
  is_closed   BOOLEAN DEFAULT false,
  UNIQUE (shop_id, day_of_week)
);

-- ============================================================================
-- SHOP CLOSURES  (holidays, emergencies)
-- ============================================================================
CREATE TABLE shop_closures (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id          UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  closure_type     VARCHAR(50) NOT NULL CHECK (closure_type IN ('holiday','maintenance','special_event','emergency')),
  reason           VARCHAR(255) NOT NULL,
  starts_at        TIMESTAMPTZ NOT NULL,
  ends_at          TIMESTAMPTZ NOT NULL,
  notify_customers BOOLEAN DEFAULT true,
  created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SHOP ANNOUNCEMENTS
-- ============================================================================
CREATE TABLE shop_announcements (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id    UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  title      VARCHAR(255) NOT NULL,
  body       TEXT NOT NULL,
  is_pinned  BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MESSAGES  (shop ↔ student per order)
-- ============================================================================
CREATE TABLE messages (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sender_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message      TEXT NOT NULL,
  is_read      BOOLEAN DEFAULT false,
  read_at      TIMESTAMPTZ,
  sent_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================
CREATE TABLE notifications (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type             VARCHAR(50) NOT NULL CHECK (type IN ('order_update','message','system','promotion')),
  title            VARCHAR(255) NOT NULL,
  message          TEXT NOT NULL,
  related_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  is_read          BOOLEAN DEFAULT false,
  read_at          TIMESTAMPTZ,
  priority         VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- REVIEWS
-- ============================================================================
CREATE TABLE reviews (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_id    UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  rating     SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (order_id) -- one review per order
);

-- ============================================================================
-- USER PREFERENCES
-- ============================================================================
CREATE TABLE user_preferences (
  user_id                 UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  notification_enabled    BOOLEAN DEFAULT true,
  email_notifications     BOOLEAN DEFAULT false,
  favorite_shops          UUID[] DEFAULT '{}',
  dietary_preferences     TEXT[]  DEFAULT '{}', -- ['vegetarian','halal',…]
  language                VARCHAR(10) DEFAULT 'en' CHECK (language IN ('en','km')),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SHOP STATISTICS  (daily aggregate — maintained by trigger)
-- ============================================================================
CREATE TABLE shop_statistics (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id                  UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  date                     DATE NOT NULL,
  total_orders             INTEGER DEFAULT 0,
  completed_orders         INTEGER DEFAULT 0,
  cancelled_orders         INTEGER DEFAULT 0,
  total_revenue            DECIMAL(10,2) DEFAULT 0,
  average_preparation_time INTEGER, -- minutes
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (shop_id, date)
);
