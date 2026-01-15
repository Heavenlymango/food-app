-- Campus Food Ordering System - Shop Management
-- PostgreSQL / Supabase Compatible

-- ============================================================================
-- SHOP ENHANCEMENTS
-- ============================================================================

-- Add additional fields to shops table
ALTER TABLE shops ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE shops ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20);
ALTER TABLE shops ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE shops ADD COLUMN IF NOT EXISTS rating DECIMAL(3, 2) DEFAULT 0.00; -- Average rating 0.00-5.00
ALTER TABLE shops ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS accepts_preorders BOOLEAN DEFAULT false;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS min_order_amount DECIMAL(10, 2);
ALTER TABLE shops ADD COLUMN IF NOT EXISTS estimated_prep_time INTEGER DEFAULT 15; -- minutes

-- ============================================================================
-- SHOP OPERATING HOURS
-- ============================================================================
CREATE TABLE IF NOT EXISTS shop_operating_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  opens_at TIME NOT NULL,
  closes_at TIME NOT NULL,
  is_closed BOOLEAN DEFAULT false, -- Allow marking specific days as closed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(shop_id, day_of_week)
);

CREATE INDEX idx_shop_operating_hours_shop_id ON shop_operating_hours(shop_id);
CREATE INDEX idx_shop_operating_hours_day_of_week ON shop_operating_hours(day_of_week);

-- ============================================================================
-- SHOP SPECIAL HOURS / CLOSURES
-- ============================================================================
CREATE TABLE IF NOT EXISTS shop_closures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  closure_type VARCHAR(50) NOT NULL, -- 'holiday', 'maintenance', 'special_event', 'emergency'
  reason VARCHAR(255) NOT NULL,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  all_day BOOLEAN DEFAULT false,
  notify_customers BOOLEAN DEFAULT true, -- Send notification to customers
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_shop_closures_shop_id ON shop_closures(shop_id);
CREATE INDEX idx_shop_closures_starts_at ON shop_closures(starts_at);
CREATE INDEX idx_shop_closures_ends_at ON shop_closures(ends_at);

-- ============================================================================
-- SHOP IMAGES/GALLERY
-- ============================================================================
CREATE TABLE IF NOT EXISTS shop_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_type VARCHAR(50), -- 'interior', 'exterior', 'food', 'staff', 'other'
  caption TEXT,
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_shop_images_shop_id ON shop_images(shop_id);
CREATE INDEX idx_shop_images_is_featured ON shop_images(is_featured);
CREATE INDEX idx_shop_images_display_order ON shop_images(display_order);

-- ============================================================================
-- SHOP SETTINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS shop_settings (
  shop_id UUID PRIMARY KEY REFERENCES shops(id) ON DELETE CASCADE,
  
  -- Order settings
  auto_accept_orders BOOLEAN DEFAULT false,
  max_daily_orders INTEGER,
  max_concurrent_orders INTEGER DEFAULT 10,
  allow_special_instructions BOOLEAN DEFAULT true,
  
  -- Notification settings
  notify_new_orders BOOLEAN DEFAULT true,
  notify_order_cancelled BOOLEAN DEFAULT true,
  notification_email VARCHAR(255),
  notification_phone VARCHAR(20),
  
  -- Operational
  pause_new_orders BOOLEAN DEFAULT false,
  pause_reason TEXT,
  
  -- Display
  show_preparation_time BOOLEAN DEFAULT true,
  show_waiting_orders_count BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- MENU ITEM IMAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS menu_item_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_menu_item_images_menu_item_id ON menu_item_images(menu_item_id);
CREATE INDEX idx_menu_item_images_is_primary ON menu_item_images(is_primary);

-- ============================================================================
-- MENU ITEM VARIANTS (e.g., sizes, add-ons)
-- ============================================================================
CREATE TABLE IF NOT EXISTS menu_item_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  variant_type VARCHAR(50) NOT NULL, -- 'size', 'spice_level', 'add_on'
  name VARCHAR(100) NOT NULL, -- 'Small', 'Medium', 'Large', 'Extra Spicy', 'Add Cheese'
  price_adjustment DECIMAL(10, 2) DEFAULT 0.00, -- Additional price
  is_default BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_menu_item_variants_menu_item_id ON menu_item_variants(menu_item_id);
CREATE INDEX idx_menu_item_variants_variant_type ON menu_item_variants(variant_type);
CREATE INDEX idx_menu_item_variants_is_available ON menu_item_variants(is_available);

-- ============================================================================
-- MENU CATEGORIES (For better organization)
-- ============================================================================
CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  icon_name VARCHAR(50), -- For frontend icon display
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_menu_categories_shop_id ON menu_categories(shop_id);
CREATE INDEX idx_menu_categories_is_active ON menu_categories(is_active);
CREATE INDEX idx_menu_categories_display_order ON menu_categories(display_order);

-- Add category reference to menu_items
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id);

-- ============================================================================
-- SHOP TAGS (For filtering and discovery)
-- ============================================================================
CREATE TABLE IF NOT EXISTS shop_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL, -- 'vegetarian', 'halal', 'fast_service', 'budget_friendly'
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  icon_name VARCHAR(50),
  color VARCHAR(20), -- For UI display
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_shop_tags_name ON shop_tags(name);

-- ============================================================================
-- SHOP TAG ASSIGNMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS shop_tag_assignments (
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES shop_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (shop_id, tag_id)
);

CREATE INDEX idx_shop_tag_assignments_shop_id ON shop_tag_assignments(shop_id);
CREATE INDEX idx_shop_tag_assignments_tag_id ON shop_tag_assignments(tag_id);

-- ============================================================================
-- SHOP STAFF (Additional staff members)
-- ============================================================================
CREATE TABLE IF NOT EXISTS shop_staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- 'manager', 'cashier', 'chef', 'server'
  permissions JSONB, -- Specific permissions for this staff member
  is_active BOOLEAN DEFAULT true,
  hired_at DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(shop_id, user_id)
);

CREATE INDEX idx_shop_staff_shop_id ON shop_staff(shop_id);
CREATE INDEX idx_shop_staff_user_id ON shop_staff(user_id);
CREATE INDEX idx_shop_staff_is_active ON shop_staff(is_active);

-- ============================================================================
-- PEAK HOURS TRACKING
-- ============================================================================
CREATE TABLE IF NOT EXISTS shop_peak_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  hour INTEGER NOT NULL CHECK (hour BETWEEN 0 AND 23),
  average_orders DECIMAL(10, 2) DEFAULT 0,
  average_revenue DECIMAL(10, 2) DEFAULT 0,
  is_peak BOOLEAN DEFAULT false,
  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(shop_id, day_of_week, hour)
);

CREATE INDEX idx_shop_peak_hours_shop_id ON shop_peak_hours(shop_id);
CREATE INDEX idx_shop_peak_hours_is_peak ON shop_peak_hours(is_peak);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function: Check if shop is currently open
CREATE OR REPLACE FUNCTION is_shop_open(shop_uuid UUID, check_time TIMESTAMP WITH TIME ZONE DEFAULT NOW())
RETURNS BOOLEAN AS $$
DECLARE
  is_open BOOLEAN;
  day_num INTEGER;
  time_only TIME;
  closure_exists BOOLEAN;
BEGIN
  -- Check if shop is active
  SELECT is_active INTO is_open FROM shops WHERE id = shop_uuid;
  IF NOT is_open THEN
    RETURN false;
  END IF;
  
  -- Check for closures
  SELECT EXISTS(
    SELECT 1 FROM shop_closures
    WHERE shop_id = shop_uuid
      AND check_time BETWEEN starts_at AND ends_at
  ) INTO closure_exists;
  
  IF closure_exists THEN
    RETURN false;
  END IF;
  
  -- Check operating hours
  day_num := EXTRACT(DOW FROM check_time);
  time_only := check_time::TIME;
  
  SELECT EXISTS(
    SELECT 1 FROM shop_operating_hours
    WHERE shop_id = shop_uuid
      AND day_of_week = day_num
      AND is_closed = false
      AND time_only BETWEEN opens_at AND closes_at
  ) INTO is_open;
  
  RETURN is_open;
END;
$$ LANGUAGE plpgsql;

-- Function: Get shop next opening time
CREATE OR REPLACE FUNCTION get_next_opening_time(shop_uuid UUID)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
  next_opening TIMESTAMP WITH TIME ZONE;
  current_day INTEGER;
  days_checked INTEGER := 0;
BEGIN
  current_day := EXTRACT(DOW FROM NOW());
  
  WHILE days_checked < 7 LOOP
    SELECT 
      (CURRENT_DATE + (days_checked || ' days')::INTERVAL + opens_at)::TIMESTAMP WITH TIME ZONE
    INTO next_opening
    FROM shop_operating_hours
    WHERE shop_id = shop_uuid
      AND day_of_week = (current_day + days_checked) % 7
      AND is_closed = false
      AND (CURRENT_DATE + (days_checked || ' days')::INTERVAL + opens_at) > NOW()
    ORDER BY opens_at
    LIMIT 1;
    
    IF FOUND THEN
      -- Check if there's a closure during this time
      IF NOT EXISTS(
        SELECT 1 FROM shop_closures
        WHERE shop_id = shop_uuid
          AND next_opening BETWEEN starts_at AND ends_at
      ) THEN
        RETURN next_opening;
      END IF;
    END IF;
    
    days_checked := days_checked + 1;
  END LOOP;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function: Update shop rating
CREATE OR REPLACE FUNCTION update_shop_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE shops
  SET 
    rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM reviews
      WHERE shop_id = NEW.shop_id
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM reviews
      WHERE shop_id = NEW.shop_id
    ),
    updated_at = NOW()
  WHERE id = NEW.shop_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shop_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_shop_rating();

-- Function: Update shop total orders
CREATE OR REPLACE FUNCTION update_shop_total_orders()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE shops
    SET 
      total_orders = total_orders + 1,
      updated_at = NOW()
    WHERE id = NEW.shop_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shop_total_orders_trigger
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_shop_total_orders();

-- Function: Create default shop settings
CREATE OR REPLACE FUNCTION create_default_shop_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO shop_settings (shop_id)
  VALUES (NEW.id)
  ON CONFLICT (shop_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_default_shop_settings_trigger
  AFTER INSERT ON shops
  FOR EACH ROW
  EXECUTE FUNCTION create_default_shop_settings();

-- ============================================================================
-- SEED DATA: Shop Tags
-- ============================================================================

INSERT INTO shop_tags (name, display_name, description, icon_name, color) VALUES
  ('vegetarian', 'Vegetarian Options', 'Has vegetarian menu items', 'leaf', '#22c55e'),
  ('vegan', 'Vegan Options', 'Has vegan menu items', 'sprout', '#10b981'),
  ('halal', 'Halal Certified', 'Serves halal food', 'check-circle', '#3b82f6'),
  ('fast_service', 'Fast Service', 'Quick preparation time', 'zap', '#f59e0b'),
  ('budget_friendly', 'Budget Friendly', 'Affordable prices', 'dollar-sign', '#8b5cf6'),
  ('healthy', 'Healthy Options', 'Focuses on healthy food', 'heart', '#ec4899'),
  ('local_favorite', 'Local Favorite', 'Popular among students', 'star', '#eab308'),
  ('accepts_cards', 'Card Payment', 'Accepts credit/debit cards', 'credit-card', '#06b6d4'),
  ('wifi_available', 'WiFi Available', 'Free WiFi for customers', 'wifi', '#6366f1'),
  ('outdoor_seating', 'Outdoor Seating', 'Has outdoor dining area', 'sun', '#f97316')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- SEED DATA: Default Operating Hours (Monday-Friday, 7AM-7PM)
-- ============================================================================

-- This would be run after shops are created
-- INSERT INTO shop_operating_hours (shop_id, day_of_week, opens_at, closes_at)
-- SELECT id, day, '07:00'::TIME, '19:00'::TIME
-- FROM shops, generate_series(1, 5) AS day
-- WHERE NOT EXISTS (
--   SELECT 1 FROM shop_operating_hours 
--   WHERE shop_id = shops.id AND day_of_week = day
-- );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE shop_operating_hours IS 'Regular weekly operating hours for each shop';
COMMENT ON TABLE shop_closures IS 'Temporary closures, holidays, and special events';
COMMENT ON TABLE shop_images IS 'Gallery images for shop pages';
COMMENT ON TABLE shop_settings IS 'Operational settings and preferences per shop';
COMMENT ON TABLE menu_item_images IS 'Multiple images per menu item';
COMMENT ON TABLE menu_item_variants IS 'Size options, add-ons, and customizations';
COMMENT ON TABLE menu_categories IS 'Organize menu items into categories';
COMMENT ON TABLE shop_tags IS 'Discoverable tags/features for shops';
COMMENT ON TABLE shop_tag_assignments IS 'Which tags apply to which shops';
COMMENT ON TABLE shop_staff IS 'Additional staff members with specific roles';
COMMENT ON TABLE shop_peak_hours IS 'Analytics on busy hours for optimization';
