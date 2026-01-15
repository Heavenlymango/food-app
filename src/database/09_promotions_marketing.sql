-- Campus Food Ordering System - Promotions & Marketing
-- PostgreSQL / Supabase Compatible

-- ============================================================================
-- PROMO CODES / COUPONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Discount details
  discount_type VARCHAR(50) NOT NULL, -- 'percent', 'fixed_amount', 'free_delivery', 'free_item'
  discount_percent DECIMAL(5, 2), -- e.g., 15.00 for 15% off
  discount_amount DECIMAL(10, 2), -- e.g., 5.00 for $5 off
  max_discount_amount DECIMAL(10, 2), -- Cap for percentage discounts
  free_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  
  -- Usage constraints
  min_order_amount DECIMAL(10, 2), -- Minimum order to use promo
  max_uses_total INTEGER, -- Total times this code can be used
  max_uses_per_user INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  
  -- Applicable scope
  applicable_to VARCHAR(50) DEFAULT 'all', -- 'all', 'specific_shops', 'specific_categories', 'specific_items'
  applicable_shop_ids UUID[], -- NULL means all shops
  applicable_campus VARCHAR(50), -- 'RUPP', 'IFL', NULL means both
  applicable_user_tier VARCHAR(20), -- 'bronze', 'silver', 'gold', 'platinum', NULL means all
  
  -- Time validity
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Days of week (NULL means all days, [] means no days)
  valid_days_of_week INTEGER[], -- [0,1,2,3,4,5,6] for Sunday-Saturday
  
  -- Time of day validity
  valid_time_from TIME,
  valid_time_until TIME,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true, -- False for private/targeted codes
  
  -- Metadata
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  image_url TEXT,
  terms_and_conditions TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_promo_codes_code ON promo_codes(code);
CREATE INDEX idx_promo_codes_is_active ON promo_codes(is_active);
CREATE INDEX idx_promo_codes_valid_from ON promo_codes(valid_from);
CREATE INDEX idx_promo_codes_valid_until ON promo_codes(valid_until);
CREATE INDEX idx_promo_codes_applicable_campus ON promo_codes(applicable_campus);

-- ============================================================================
-- PROMO CODE USAGE
-- ============================================================================
CREATE TABLE IF NOT EXISTS promo_code_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  discount_applied DECIMAL(10, 2) NOT NULL,
  
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_promo_code_usage_promo_code_id ON promo_code_usage(promo_code_id);
CREATE INDEX idx_promo_code_usage_user_id ON promo_code_usage(user_id);
CREATE INDEX idx_promo_code_usage_order_id ON promo_code_usage(order_id);
CREATE INDEX idx_promo_code_usage_used_at ON promo_code_usage(used_at DESC);

-- ============================================================================
-- FLASH SALES / SPECIAL OFFERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS flash_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  sale_type VARCHAR(50) NOT NULL, -- 'menu_item_discount', 'category_discount', 'shop_wide', 'buy_one_get_one'
  
  discount_percent DECIMAL(5, 2),
  discount_amount DECIMAL(10, 2),
  
  -- Applicable items
  applicable_menu_item_ids UUID[],
  applicable_shop_ids UUID[],
  applicable_category VARCHAR(100),
  
  -- BOGO details
  bogo_buy_quantity INTEGER,
  bogo_get_quantity INTEGER,
  bogo_get_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  
  -- Time period
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Limits
  max_items_per_order INTEGER,
  max_discount_per_order DECIMAL(10, 2),
  total_inventory_limit INTEGER, -- Total items available at sale price
  current_sold_count INTEGER DEFAULT 0,
  
  is_active BOOLEAN DEFAULT true,
  
  banner_image_url TEXT,
  badge_text VARCHAR(50), -- e.g., "50% OFF", "BOGO"
  priority INTEGER DEFAULT 0, -- For display order
  
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_flash_sales_is_active ON flash_sales(is_active);
CREATE INDEX idx_flash_sales_starts_at ON flash_sales(starts_at);
CREATE INDEX idx_flash_sales_ends_at ON flash_sales(ends_at);
CREATE INDEX idx_flash_sales_priority ON flash_sales(priority DESC);

-- ============================================================================
-- ANNOUNCEMENTS / BANNERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  announcement_type VARCHAR(50) NOT NULL, -- 'info', 'warning', 'success', 'promotion', 'maintenance'
  
  -- Display settings
  display_location VARCHAR(50)[], -- ['home', 'menu', 'cart', 'profile', 'all']
  banner_image_url TEXT,
  banner_color VARCHAR(20), -- Hex color for banner background
  text_color VARCHAR(20),
  
  -- Targeting
  target_audience VARCHAR(50) DEFAULT 'all', -- 'all', 'students', 'sellers', 'specific_campus'
  target_campus VARCHAR(50), -- 'RUPP', 'IFL', NULL
  target_user_ids UUID[], -- Specific users (for targeted announcements)
  
  -- Action button
  action_button_text VARCHAR(100),
  action_button_url TEXT,
  action_button_type VARCHAR(50), -- 'internal_link', 'external_link', 'promo_code'
  related_promo_code_id UUID REFERENCES promo_codes(id) ON DELETE SET NULL,
  
  -- Timing
  starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ends_at TIMESTAMP WITH TIME ZONE,
  
  is_active BOOLEAN DEFAULT true,
  is_dismissible BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_announcements_is_active ON announcements(is_active);
CREATE INDEX idx_announcements_starts_at ON announcements(starts_at);
CREATE INDEX idx_announcements_ends_at ON announcements(ends_at);
CREATE INDEX idx_announcements_priority ON announcements(priority DESC);
CREATE INDEX idx_announcements_target_audience ON announcements(target_audience);

-- ============================================================================
-- DISMISSED ANNOUNCEMENTS (User preferences)
-- ============================================================================
CREATE TABLE IF NOT EXISTS dismissed_announcements (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, announcement_id)
);

CREATE INDEX idx_dismissed_announcements_user_id ON dismissed_announcements(user_id);

-- ============================================================================
-- PUSH NOTIFICATION CAMPAIGNS
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  
  campaign_type VARCHAR(50) NOT NULL, -- 'promotional', 'transactional', 'engagement', 'announcement'
  
  -- Targeting
  target_audience VARCHAR(50) DEFAULT 'all', -- 'all', 'students', 'specific_segment'
  target_campus VARCHAR(50),
  target_user_tier VARCHAR(20), -- Target specific loyalty tiers
  target_user_ids UUID[],
  
  -- Filters
  filter_active_users_only BOOLEAN DEFAULT true,
  filter_min_orders INTEGER, -- Target users with at least X orders
  filter_last_order_days INTEGER, -- Target users who ordered in last X days
  filter_never_ordered BOOLEAN DEFAULT false, -- Target users who never ordered
  
  -- Delivery
  delivery_channel VARCHAR(50)[], -- ['push', 'email', 'sms', 'in_app']
  scheduled_for TIMESTAMP WITH TIME ZONE,
  
  -- Links and actions
  deep_link_url TEXT,
  related_promo_code_id UUID REFERENCES promo_codes(id) ON DELETE SET NULL,
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'sent', 'cancelled'
  
  -- Stats
  target_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  
  sent_at TIMESTAMP WITH TIME ZONE,
  
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notification_campaigns_status ON notification_campaigns(status);
CREATE INDEX idx_notification_campaigns_scheduled_for ON notification_campaigns(scheduled_for);
CREATE INDEX idx_notification_campaigns_created_by ON notification_campaigns(created_by);

-- ============================================================================
-- CAMPAIGN DELIVERY LOG
-- ============================================================================
CREATE TABLE IF NOT EXISTS campaign_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES notification_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  delivery_channel VARCHAR(50) NOT NULL,
  
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'bounced'
  
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  
  failure_reason TEXT,
  
  metadata JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_campaign_deliveries_campaign_id ON campaign_deliveries(campaign_id);
CREATE INDEX idx_campaign_deliveries_user_id ON campaign_deliveries(user_id);
CREATE INDEX idx_campaign_deliveries_status ON campaign_deliveries(status);

-- ============================================================================
-- EMAIL TEMPLATES
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_name VARCHAR(100) UNIQUE NOT NULL,
  template_type VARCHAR(50) NOT NULL, -- 'order_confirmation', 'password_reset', 'promotional', 'receipt'
  
  subject VARCHAR(255) NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  
  -- Variables that can be used in template
  available_variables TEXT[], -- ['order_number', 'customer_name', 'total_amount', etc.]
  
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_email_templates_template_name ON email_templates(template_name);
CREATE INDEX idx_email_templates_template_type ON email_templates(template_type);
CREATE INDEX idx_email_templates_is_active ON email_templates(is_active);

-- ============================================================================
-- USER SEGMENTS (For targeted marketing)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Segment criteria (stored as JSON for flexibility)
  criteria JSONB NOT NULL,
  -- Example: {
  --   "campus": "RUPP",
  --   "min_orders": 5,
  --   "loyalty_tier": ["gold", "platinum"],
  --   "last_order_days": 30
  -- }
  
  is_dynamic BOOLEAN DEFAULT true, -- Auto-update membership
  
  -- Cached stats
  member_count INTEGER DEFAULT 0,
  last_calculated_at TIMESTAMP WITH TIME ZONE,
  
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_segments_is_dynamic ON user_segments(is_dynamic);

-- ============================================================================
-- USER SEGMENT MEMBERSHIP
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_segment_members (
  segment_id UUID NOT NULL REFERENCES user_segments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (segment_id, user_id)
);

CREATE INDEX idx_user_segment_members_segment_id ON user_segment_members(segment_id);
CREATE INDEX idx_user_segment_members_user_id ON user_segment_members(user_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function: Validate promo code
CREATE OR REPLACE FUNCTION validate_promo_code(
  p_code VARCHAR(50),
  p_user_id UUID,
  p_shop_id UUID,
  p_order_amount DECIMAL(10, 2),
  p_check_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS JSON AS $$
DECLARE
  promo RECORD;
  usage_count INTEGER;
  campus_name VARCHAR(50);
  user_tier VARCHAR(20);
  day_of_week INTEGER;
  time_of_day TIME;
  result JSON;
BEGIN
  -- Get promo code
  SELECT * INTO promo
  FROM promo_codes
  WHERE code = p_code AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN json_build_object('valid', false, 'reason', 'Code not found or inactive');
  END IF;
  
  -- Check time validity
  IF p_check_time < promo.valid_from OR p_check_time > promo.valid_until THEN
    RETURN json_build_object('valid', false, 'reason', 'Code expired or not yet valid');
  END IF;
  
  -- Check minimum order amount
  IF promo.min_order_amount IS NOT NULL AND p_order_amount < promo.min_order_amount THEN
    RETURN json_build_object('valid', false, 'reason', 
      'Minimum order amount $' || promo.min_order_amount || ' required');
  END IF;
  
  -- Check per-user usage limit
  SELECT COUNT(*) INTO usage_count
  FROM promo_code_usage
  WHERE promo_code_id = promo.id AND user_id = p_user_id;
  
  IF promo.max_uses_per_user IS NOT NULL AND usage_count >= promo.max_uses_per_user THEN
    RETURN json_build_object('valid', false, 'reason', 'Usage limit reached for this code');
  END IF;
  
  -- Check total usage limit
  IF promo.max_uses_total IS NOT NULL AND promo.current_uses >= promo.max_uses_total THEN
    RETURN json_build_object('valid', false, 'reason', 'Code usage limit reached');
  END IF;
  
  -- Check campus restriction
  IF promo.applicable_campus IS NOT NULL THEN
    SELECT campus INTO campus_name FROM shops WHERE id = p_shop_id;
    IF campus_name != promo.applicable_campus THEN
      RETURN json_build_object('valid', false, 'reason', 'Code not valid for this campus');
    END IF;
  END IF;
  
  -- Check shop restriction
  IF promo.applicable_shop_ids IS NOT NULL AND array_length(promo.applicable_shop_ids, 1) > 0 THEN
    IF NOT (p_shop_id = ANY(promo.applicable_shop_ids)) THEN
      RETURN json_build_object('valid', false, 'reason', 'Code not valid for this shop');
    END IF;
  END IF;
  
  -- Check user tier restriction
  IF promo.applicable_user_tier IS NOT NULL THEN
    SELECT tier INTO user_tier FROM loyalty_accounts WHERE user_id = p_user_id;
    IF user_tier != promo.applicable_user_tier THEN
      RETURN json_build_object('valid', false, 'reason', 
        'Code only valid for ' || promo.applicable_user_tier || ' tier members');
    END IF;
  END IF;
  
  -- Check day of week
  IF promo.valid_days_of_week IS NOT NULL AND array_length(promo.valid_days_of_week, 1) > 0 THEN
    day_of_week := EXTRACT(DOW FROM p_check_time);
    IF NOT (day_of_week = ANY(promo.valid_days_of_week)) THEN
      RETURN json_build_object('valid', false, 'reason', 'Code not valid on this day');
    END IF;
  END IF;
  
  -- Check time of day
  IF promo.valid_time_from IS NOT NULL AND promo.valid_time_until IS NOT NULL THEN
    time_of_day := p_check_time::TIME;
    IF time_of_day < promo.valid_time_from OR time_of_day > promo.valid_time_until THEN
      RETURN json_build_object('valid', false, 'reason', 'Code not valid at this time');
    END IF;
  END IF;
  
  -- Code is valid, return details
  RETURN json_build_object(
    'valid', true,
    'promo_id', promo.id,
    'code', promo.code,
    'name', promo.name,
    'discount_type', promo.discount_type,
    'discount_percent', promo.discount_percent,
    'discount_amount', promo.discount_amount,
    'max_discount_amount', promo.max_discount_amount
  );
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate promo code discount
CREATE OR REPLACE FUNCTION calculate_promo_discount(
  p_promo_id UUID,
  p_order_amount DECIMAL(10, 2)
)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
  promo RECORD;
  discount DECIMAL(10, 2);
BEGIN
  SELECT * INTO promo FROM promo_codes WHERE id = p_promo_id;
  
  IF promo.discount_type = 'percent' THEN
    discount := p_order_amount * (promo.discount_percent / 100);
    IF promo.max_discount_amount IS NOT NULL THEN
      discount := LEAST(discount, promo.max_discount_amount);
    END IF;
  ELSIF promo.discount_type = 'fixed_amount' THEN
    discount := promo.discount_amount;
  ELSE
    discount := 0;
  END IF;
  
  -- Don't discount more than order amount
  discount := LEAST(discount, p_order_amount);
  
  RETURN discount;
END;
$$ LANGUAGE plpgsql;

-- Function: Increment promo code usage
CREATE OR REPLACE FUNCTION increment_promo_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE promo_codes
  SET current_uses = current_uses + 1
  WHERE id = NEW.promo_code_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_promo_usage_trigger
  AFTER INSERT ON promo_code_usage
  FOR EACH ROW
  EXECUTE FUNCTION increment_promo_usage();

-- ============================================================================
-- SEED DATA: Sample Promo Codes
-- ============================================================================

INSERT INTO promo_codes (code, name, description, discount_type, discount_percent, min_order_amount, max_uses_total, valid_from, valid_until, is_public) VALUES
  ('WELCOME10', 'Welcome 10% Off', 'Get 10% off your first order', 'percent', 10.00, 5.00, 1000, NOW(), NOW() + INTERVAL '90 days', true),
  ('SAVE5', '$5 Off Large Orders', 'Get $5 off orders above $15', 'fixed_amount', NULL, 15.00, 500, NOW(), NOW() + INTERVAL '30 days', true),
  ('STUDENT20', 'Student Special 20% Off', '20% off for all students', 'percent', 20.00, 10.00, 2000, NOW(), NOW() + INTERVAL '60 days', true),
  ('LUNCH15', 'Lunch Deal 15% Off', '15% off during lunch hours', 'percent', 15.00, 8.00, NULL, NOW(), NOW() + INTERVAL '30 days', true)
ON CONFLICT (code) DO NOTHING;

-- Update lunch deal to be valid only during lunch hours (11 AM - 2 PM)
UPDATE promo_codes
SET valid_time_from = '11:00'::TIME,
    valid_time_until = '14:00'::TIME
WHERE code = 'LUNCH15';

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE promo_codes IS 'Promotional discount codes and coupons';
COMMENT ON TABLE promo_code_usage IS 'Track when and by whom promo codes are used';
COMMENT ON TABLE flash_sales IS 'Time-limited special offers and sales';
COMMENT ON TABLE announcements IS 'System-wide announcements and banners';
COMMENT ON TABLE dismissed_announcements IS 'Track which users dismissed which announcements';
COMMENT ON TABLE notification_campaigns IS 'Marketing campaigns and bulk notifications';
COMMENT ON TABLE campaign_deliveries IS 'Individual delivery tracking for campaigns';
COMMENT ON TABLE email_templates IS 'Reusable email templates';
COMMENT ON TABLE user_segments IS 'User groups for targeted marketing';
COMMENT ON TABLE user_segment_members IS 'Membership in user segments';
