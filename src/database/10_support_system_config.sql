-- Campus Food Ordering System - Support & System Configuration
-- PostgreSQL / Supabase Compatible

-- ============================================================================
-- SUPPORT TICKETS
-- ============================================================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number VARCHAR(50) UNIQUE NOT NULL,
  
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  related_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  
  subject VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'order_issue', 'payment', 'account', 'technical', 'feedback', 'other'
  priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  
  status VARCHAR(50) DEFAULT 'open', -- 'open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed'
  
  description TEXT NOT NULL,
  
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE,
  
  resolved_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  
  resolution_notes TEXT,
  customer_satisfaction_rating INTEGER CHECK (customer_satisfaction_rating BETWEEN 1 AND 5),
  customer_feedback TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_support_tickets_ticket_number ON support_tickets(ticket_number);
CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX idx_support_tickets_category ON support_tickets(category);

-- ============================================================================
-- SUPPORT TICKET MESSAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false, -- Internal notes not visible to customer
  
  attachments JSONB, -- Array of {filename, url, size, type}
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_support_ticket_messages_ticket_id ON support_ticket_messages(ticket_id);
CREATE INDEX idx_support_ticket_messages_sender_id ON support_ticket_messages(sender_id);
CREATE INDEX idx_support_ticket_messages_created_at ON support_ticket_messages(created_at);

-- ============================================================================
-- FEEDBACK / RATINGS
-- ============================================================================
-- Extend existing reviews table with more fields
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS food_quality_rating INTEGER CHECK (food_quality_rating BETWEEN 1 AND 5);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS service_rating INTEGER CHECK (service_rating BETWEEN 1 AND 5);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS value_rating INTEGER CHECK (value_rating BETWEEN 1 AND 5);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS cleanliness_rating INTEGER CHECK (cleanliness_rating BETWEEN 1 AND 5);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS would_recommend BOOLEAN;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS images TEXT[]; -- Array of image URLs

-- ============================================================================
-- REVIEW HELPFUL VOTES
-- ============================================================================
CREATE TABLE IF NOT EXISTS review_helpful_votes (
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_helpful BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (review_id, user_id)
);

CREATE INDEX idx_review_helpful_votes_review_id ON review_helpful_votes(review_id);
CREATE INDEX idx_review_helpful_votes_user_id ON review_helpful_votes(user_id);

-- ============================================================================
-- REVIEW RESPONSES (Shop responses to reviews)
-- ============================================================================
CREATE TABLE IF NOT EXISTS review_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID UNIQUE NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Shop owner/manager
  response TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_review_responses_review_id ON review_responses(review_id);
CREATE INDEX idx_review_responses_responder_id ON review_responses(responder_id);

-- ============================================================================
-- GENERAL FEEDBACK (Not tied to orders)
-- ============================================================================
CREATE TABLE IF NOT EXISTS general_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  feedback_type VARCHAR(50) NOT NULL, -- 'feature_request', 'bug_report', 'improvement', 'complaint', 'compliment'
  category VARCHAR(50), -- 'app_design', 'performance', 'new_feature', 'payment', 'ordering'
  
  subject VARCHAR(255),
  message TEXT NOT NULL,
  
  platform VARCHAR(50), -- 'web', 'ios', 'android'
  app_version VARCHAR(20),
  
  status VARCHAR(50) DEFAULT 'new', -- 'new', 'reviewed', 'planned', 'implemented', 'wont_fix'
  
  upvotes INTEGER DEFAULT 0,
  
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  response TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_general_feedback_user_id ON general_feedback(user_id);
CREATE INDEX idx_general_feedback_feedback_type ON general_feedback(feedback_type);
CREATE INDEX idx_general_feedback_status ON general_feedback(status);
CREATE INDEX idx_general_feedback_created_at ON general_feedback(created_at DESC);

-- ============================================================================
-- FAQ (Frequently Asked Questions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS faq (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question VARCHAR(500) NOT NULL,
  answer TEXT NOT NULL,
  
  category VARCHAR(50) NOT NULL, -- 'ordering', 'payment', 'account', 'delivery', 'general'
  subcategory VARCHAR(50),
  
  display_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  
  tags TEXT[], -- For search
  
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_faq_category ON faq(category);
CREATE INDEX idx_faq_is_published ON faq(is_published);
CREATE INDEX idx_faq_display_order ON faq(display_order);

-- ============================================================================
-- SYSTEM CONFIGURATION
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT,
  value_type VARCHAR(20) NOT NULL, -- 'string', 'number', 'boolean', 'json'
  category VARCHAR(50) NOT NULL, -- 'general', 'orders', 'payments', 'notifications', 'features'
  description TEXT,
  is_public BOOLEAN DEFAULT false, -- Can be accessed by frontend
  is_editable BOOLEAN DEFAULT true,
  
  last_modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  last_modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_system_settings_category ON system_settings(category);
CREATE INDEX idx_system_settings_is_public ON system_settings(is_public);

-- ============================================================================
-- FEATURE FLAGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flag_name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  
  is_enabled BOOLEAN DEFAULT false,
  
  -- Rollout strategy
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
  enabled_for_user_ids UUID[],
  enabled_for_user_roles VARCHAR(20)[],
  enabled_for_campus VARCHAR(50),
  
  -- Scheduling
  enabled_from TIMESTAMP WITH TIME ZONE,
  enabled_until TIMESTAMP WITH TIME ZONE,
  
  last_modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_feature_flags_flag_name ON feature_flags(flag_name);
CREATE INDEX idx_feature_flags_is_enabled ON feature_flags(is_enabled);

-- ============================================================================
-- MAINTENANCE WINDOWS
-- ============================================================================
CREATE TABLE IF NOT EXISTS maintenance_windows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  maintenance_type VARCHAR(50) NOT NULL, -- 'scheduled', 'emergency', 'deployment'
  
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  affected_services TEXT[], -- ['orders', 'payments', 'authentication', 'all']
  
  notify_users BOOLEAN DEFAULT true,
  notification_message TEXT,
  
  status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled'
  
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_maintenance_windows_starts_at ON maintenance_windows(starts_at);
CREATE INDEX idx_maintenance_windows_status ON maintenance_windows(status);

-- ============================================================================
-- APP VERSIONS / RELEASE NOTES
-- ============================================================================
CREATE TABLE IF NOT EXISTS app_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version VARCHAR(20) NOT NULL, -- e.g., '1.2.3'
  platform VARCHAR(20) NOT NULL, -- 'web', 'ios', 'android', 'all'
  
  release_type VARCHAR(20) NOT NULL, -- 'major', 'minor', 'patch', 'hotfix'
  
  release_notes TEXT NOT NULL,
  release_notes_short VARCHAR(500), -- Brief summary
  
  is_mandatory_update BOOLEAN DEFAULT false,
  min_supported_version VARCHAR(20), -- Minimum version that can still run
  
  download_url TEXT,
  
  release_date DATE NOT NULL,
  
  is_published BOOLEAN DEFAULT false,
  
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(version, platform)
);

CREATE INDEX idx_app_versions_platform ON app_versions(platform);
CREATE INDEX idx_app_versions_is_published ON app_versions(is_published);
CREATE INDEX idx_app_versions_release_date ON app_versions(release_date DESC);

-- ============================================================================
-- ANALYTICS EVENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id UUID,
  
  event_name VARCHAR(100) NOT NULL,
  event_category VARCHAR(50), -- 'user_action', 'page_view', 'error', 'conversion'
  
  properties JSONB,
  
  page_url TEXT,
  referrer_url TEXT,
  
  device_type VARCHAR(50),
  platform VARCHAR(50),
  browser VARCHAR(50),
  
  ip_address VARCHAR(45),
  country VARCHAR(100),
  city VARCHAR(100),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at DESC);
CREATE INDEX idx_analytics_events_event_category ON analytics_events(event_category);

-- Partition by month for better performance (example for 2026)
-- CREATE TABLE analytics_events_y2026m01 PARTITION OF analytics_events
--   FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function: Generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
  ticket_date TEXT;
  ticket_count INTEGER;
  new_ticket_number TEXT;
BEGIN
  ticket_date := TO_CHAR(NOW(), 'YYYYMMDD');
  
  SELECT COUNT(*) INTO ticket_count
  FROM support_tickets
  WHERE DATE(created_at) = CURRENT_DATE;
  
  new_ticket_number := 'TKT-' || ticket_date || '-' || LPAD((ticket_count + 1)::TEXT, 4, '0');
  
  NEW.ticket_number = new_ticket_number;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_ticket_number_trigger
  BEFORE INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION generate_ticket_number();

-- Function: Update review helpful count
CREATE OR REPLACE FUNCTION update_review_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE reviews
  SET helpful_count = (
    SELECT COUNT(*) FROM review_helpful_votes
    WHERE review_id = COALESCE(NEW.review_id, OLD.review_id)
      AND is_helpful = true
  )
  WHERE id = COALESCE(NEW.review_id, OLD.review_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_review_helpful_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON review_helpful_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_review_helpful_count();

-- Function: Create notification for new support ticket message
CREATE OR REPLACE FUNCTION notify_support_ticket_message()
RETURNS TRIGGER AS $$
DECLARE
  ticket RECORD;
  recipient_id UUID;
BEGIN
  SELECT * INTO ticket FROM support_tickets WHERE id = NEW.ticket_id;
  
  -- Notify customer or support staff
  IF NEW.sender_id = ticket.user_id THEN
    -- Message from customer to support
    recipient_id := ticket.assigned_to;
  ELSE
    -- Message from support to customer
    recipient_id := ticket.user_id;
  END IF;
  
  IF recipient_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      priority
    )
    VALUES (
      recipient_id,
      'support',
      'New Support Message',
      'You have a new message on ticket ' || ticket.ticket_number,
      'normal'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_support_ticket_message_trigger
  AFTER INSERT ON support_ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_support_ticket_message();

-- Function: Get system setting
CREATE OR REPLACE FUNCTION get_setting(setting_key VARCHAR(100), default_value TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  setting_value TEXT;
BEGIN
  SELECT value INTO setting_value
  FROM system_settings
  WHERE key = setting_key;
  
  RETURN COALESCE(setting_value, default_value);
END;
$$ LANGUAGE plpgsql;

-- Function: Check if feature is enabled for user
CREATE OR REPLACE FUNCTION is_feature_enabled(
  flag_name_param VARCHAR(100),
  user_uuid UUID DEFAULT NULL,
  user_role_param VARCHAR(20) DEFAULT NULL,
  campus_param VARCHAR(50) DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  feature RECORD;
  random_percentage INTEGER;
BEGIN
  SELECT * INTO feature
  FROM feature_flags
  WHERE flag_name = flag_name_param;
  
  IF NOT FOUND OR NOT feature.is_enabled THEN
    RETURN false;
  END IF;
  
  -- Check time window
  IF feature.enabled_from IS NOT NULL AND NOW() < feature.enabled_from THEN
    RETURN false;
  END IF;
  
  IF feature.enabled_until IS NOT NULL AND NOW() > feature.enabled_until THEN
    RETURN false;
  END IF;
  
  -- Check user-specific enable
  IF user_uuid IS NOT NULL AND feature.enabled_for_user_ids IS NOT NULL THEN
    IF user_uuid = ANY(feature.enabled_for_user_ids) THEN
      RETURN true;
    END IF;
  END IF;
  
  -- Check role
  IF user_role_param IS NOT NULL AND feature.enabled_for_user_roles IS NOT NULL THEN
    IF user_role_param = ANY(feature.enabled_for_user_roles) THEN
      RETURN true;
    END IF;
  END IF;
  
  -- Check campus
  IF feature.enabled_for_campus IS NOT NULL THEN
    IF campus_param IS NULL OR campus_param != feature.enabled_for_campus THEN
      RETURN false;
    END IF;
  END IF;
  
  -- Check rollout percentage
  IF user_uuid IS NOT NULL THEN
    -- Deterministic random based on user ID
    random_percentage := (('x' || substr(user_uuid::text, 1, 8))::bit(32)::bigint % 100)::integer;
    IF random_percentage < feature.rollout_percentage THEN
      RETURN true;
    END IF;
  END IF;
  
  -- If rollout is 100%, enable for everyone
  RETURN feature.rollout_percentage >= 100;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SEED DATA: System Settings
-- ============================================================================

INSERT INTO system_settings (key, value, value_type, category, description, is_public) VALUES
  -- General
  ('app_name', 'Campus Food Ordering', 'string', 'general', 'Application name', true),
  ('support_email', 'support@campusfood.edu.kh', 'string', 'general', 'Support contact email', true),
  ('support_phone', '+855-12-345-6789', 'string', 'general', 'Support contact phone', true),
  
  -- Orders
  ('order_timeout_minutes', '30', 'number', 'orders', 'Auto-cancel pending orders after X minutes', false),
  ('max_orders_per_day_per_user', '10', 'number', 'orders', 'Maximum orders a user can place per day', false),
  ('late_order_threshold_minutes', '5', 'number', 'orders', 'Mark order as late if prep time exceeds by X minutes', false),
  
  -- Payments
  ('enable_cash_payment', 'true', 'boolean', 'payments', 'Allow cash payments', true),
  ('enable_card_payment', 'false', 'boolean', 'payments', 'Allow card payments', true),
  ('enable_wallet_payment', 'true', 'boolean', 'payments', 'Allow wallet payments', true),
  ('platform_commission_percent', '10', 'number', 'payments', 'Platform commission percentage', false),
  
  -- Loyalty
  ('loyalty_points_per_dollar', '1', 'number', 'loyalty', 'Points earned per dollar spent', true),
  ('bronze_tier_threshold', '0', 'number', 'loyalty', 'Lifetime points for bronze tier', true),
  ('silver_tier_threshold', '2000', 'number', 'loyalty', 'Lifetime points for silver tier', true),
  ('gold_tier_threshold', '5000', 'number', 'loyalty', 'Lifetime points for gold tier', true),
  ('platinum_tier_threshold', '10000', 'number', 'loyalty', 'Lifetime points for platinum tier', true),
  
  -- Features
  ('enable_reviews', 'true', 'boolean', 'features', 'Allow users to write reviews', true),
  ('enable_referrals', 'true', 'boolean', 'features', 'Enable referral program', true),
  ('enable_preorders', 'false', 'boolean', 'features', 'Allow scheduling orders for future', true),
  
  -- Notifications
  ('send_order_confirmation_email', 'false', 'boolean', 'notifications', 'Send email on order confirmation', false),
  ('send_order_ready_sms', 'false', 'boolean', 'notifications', 'Send SMS when order ready', false)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- SEED DATA: Feature Flags
-- ============================================================================

INSERT INTO feature_flags (flag_name, description, is_enabled, rollout_percentage) VALUES
  ('new_ui_dashboard', 'New dashboard UI redesign', false, 0),
  ('advanced_search', 'Advanced search with filters', true, 100),
  ('social_login', 'Login with social media accounts', false, 50),
  ('pre_order_scheduling', 'Schedule orders for future time', false, 0),
  ('dark_mode', 'Dark mode theme', true, 100),
  ('voice_ordering', 'Voice-based ordering (experimental)', false, 5),
  ('ai_recommendations', 'AI-powered food recommendations', false, 25)
ON CONFLICT (flag_name) DO NOTHING;

-- ============================================================================
-- SEED DATA: FAQ
-- ============================================================================

INSERT INTO faq (question, answer, category, display_order) VALUES
  ('How do I place an order?', 'Browse the menu, add items to your cart, and proceed to checkout. You can choose between pickup or dine-in service.', 'ordering', 1),
  ('How long does it take to prepare my order?', 'Preparation time varies by shop and menu item, typically 10-20 minutes. You''ll see an estimated ready time when you place your order.', 'ordering', 2),
  ('Can I cancel my order?', 'Yes, you can cancel your order before it''s accepted by the shop. Once preparation begins, cancellation may not be possible.', 'ordering', 3),
  ('What payment methods are accepted?', 'We accept cash on pickup, mobile wallets, and loyalty points. Card payments coming soon!', 'payment', 1),
  ('How do I earn loyalty points?', 'You earn 1 point for every dollar spent on completed orders. Points can be redeemed for discounts and rewards.', 'account', 1),
  ('I forgot my password, what should I do?', 'Click "Forgot Password" on the login page and follow the instructions to reset your password via email.', 'account', 2)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE support_tickets IS 'Customer support ticket system';
COMMENT ON TABLE support_ticket_messages IS 'Messages/replies within support tickets';
COMMENT ON TABLE review_helpful_votes IS 'Users voting on review helpfulness';
COMMENT ON TABLE review_responses IS 'Shop responses to customer reviews';
COMMENT ON TABLE general_feedback IS 'General app feedback and feature requests';
COMMENT ON TABLE faq IS 'Frequently asked questions';
COMMENT ON TABLE system_settings IS 'System-wide configuration settings';
COMMENT ON TABLE feature_flags IS 'Feature flag system for gradual rollouts';
COMMENT ON TABLE maintenance_windows IS 'Scheduled and emergency maintenance periods';
COMMENT ON TABLE app_versions IS 'App version tracking and release notes';
COMMENT ON TABLE analytics_events IS 'User behavior and analytics tracking';
