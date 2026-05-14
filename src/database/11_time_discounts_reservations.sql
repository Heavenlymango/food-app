-- ============================================================================
-- TIME-BASED DISCOUNTS, CLASS BREAKS, AND ORDER RESERVATIONS
-- Run this after 01_schema.sql (or after 00_migrate_or_create.sql)
-- Safe to re-run: uses IF NOT EXISTS and IF EXISTS guards.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. TIME-BASED DISCOUNT SCHEDULES  (per menu item, per time window)
-- ────────────────────────────────────────────────────────────────────────────
-- Shops set discount windows: e.g. "Breakfast Deal — 20% off Mon–Fri 07:00–09:30"
-- Multiple schedules per item are allowed; the highest active % wins at query time.

CREATE TABLE IF NOT EXISTS item_discount_schedules (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id     UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  label            VARCHAR(100) NOT NULL DEFAULT 'Special Deal',
  discount_percent DECIMAL(5,2)  NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
  -- days_of_week: PostgreSQL SMALLINT[] — 0=Sunday, 1=Monday … 6=Saturday
  days_of_week     SMALLINT[]   NOT NULL DEFAULT '{1,2,3,4,5}',
  start_time       TIME         NOT NULL,
  end_time         TIME         NOT NULL,
  is_active        BOOLEAN      DEFAULT true,
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  DEFAULT NOW(),
  CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_discount_schedules_item
  ON item_discount_schedules(menu_item_id);

CREATE INDEX IF NOT EXISTS idx_discount_schedules_active
  ON item_discount_schedules(is_active, menu_item_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. CLASS BREAK SCHEDULES  (admin-managed, campus-level)
-- ────────────────────────────────────────────────────────────────────────────
-- Different classes have different break times; students reserve orders for
-- their break so food is ready exactly when they arrive.

CREATE TABLE IF NOT EXISTS class_breaks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campus      VARCHAR(50)  NOT NULL,
  class_name  VARCHAR(100) NOT NULL,   -- "Year 1 Section A", "Morning Class", …
  day_of_week SMALLINT     NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  break_start TIME         NOT NULL,
  break_end   TIME         NOT NULL,
  break_label VARCHAR(100) NOT NULL DEFAULT 'Break',  -- "Lunch", "Morning Break"
  is_active   BOOLEAN      DEFAULT true,
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  CHECK (break_start < break_end)
);

CREATE INDEX IF NOT EXISTS idx_class_breaks_campus_dow
  ON class_breaks(campus, day_of_week, is_active);

-- Seed default break schedules (only if the table is currently empty)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM class_breaks LIMIT 1) THEN

    -- ── RUPP ────────────────────────────────────────────────────────────────
    -- Morning class break (Mon–Fri)
    INSERT INTO class_breaks (campus, class_name, day_of_week, break_start, break_end, break_label)
    SELECT 'RUPP', 'Morning Class', d, '09:45', '10:00', 'Morning Break'
    FROM unnest(ARRAY[1,2,3,4,5]) AS d;

    -- Lunch (Mon–Sat)
    INSERT INTO class_breaks (campus, class_name, day_of_week, break_start, break_end, break_label)
    SELECT 'RUPP', 'All Classes', d, '12:00', '13:00', 'Lunch Break'
    FROM unnest(ARRAY[1,2,3,4,5,6]) AS d;

    -- Afternoon break (Mon–Fri)
    INSERT INTO class_breaks (campus, class_name, day_of_week, break_start, break_end, break_label)
    SELECT 'RUPP', 'Afternoon Class', d, '14:45', '15:00', 'Afternoon Break'
    FROM unnest(ARRAY[1,2,3,4,5]) AS d;

    -- Evening class break (Mon–Fri)
    INSERT INTO class_breaks (campus, class_name, day_of_week, break_start, break_end, break_label)
    SELECT 'RUPP', 'Evening Class', d, '17:00', '17:15', 'Evening Break'
    FROM unnest(ARRAY[1,2,3,4,5]) AS d;

    -- ── IFL ─────────────────────────────────────────────────────────────────
    -- Morning break (Mon–Fri)
    INSERT INTO class_breaks (campus, class_name, day_of_week, break_start, break_end, break_label)
    SELECT 'IFL', 'Morning Class', d, '10:00', '10:15', 'Morning Break'
    FROM unnest(ARRAY[1,2,3,4,5]) AS d;

    -- Lunch (Mon–Fri)
    INSERT INTO class_breaks (campus, class_name, day_of_week, break_start, break_end, break_label)
    SELECT 'IFL', 'All Classes', d, '11:30', '12:30', 'Lunch Break'
    FROM unnest(ARRAY[1,2,3,4,5]) AS d;

    -- Afternoon break (Mon–Fri)
    INSERT INTO class_breaks (campus, class_name, day_of_week, break_start, break_end, break_label)
    SELECT 'IFL', 'Afternoon Class', d, '14:30', '14:45', 'Afternoon Break'
    FROM unnest(ARRAY[1,2,3,4,5]) AS d;

  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. ADD scheduled_for TO ORDERS  (reservation pickup time; NULL = ASAP)
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;

-- Index so sellers can quickly query upcoming reservations
CREATE INDEX IF NOT EXISTS idx_orders_scheduled_for
  ON orders(scheduled_for)
  WHERE scheduled_for IS NOT NULL;
