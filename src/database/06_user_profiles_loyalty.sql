-- Campus Food Ordering System - User Profiles & Loyalty
-- PostgreSQL / Supabase Compatible

-- ============================================================================
-- USER PROFILE ENHANCEMENTS
-- ============================================================================

-- Add profile fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20);

-- ============================================================================
-- USER ADDRESSES
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label VARCHAR(50) NOT NULL, -- 'home', 'work', 'dorm', 'other'
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  city VARCHAR(100) DEFAULT 'Phnom Penh',
  province VARCHAR(100) DEFAULT 'Phnom Penh',
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'Cambodia',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  phone VARCHAR(20),
  delivery_instructions TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX idx_user_addresses_is_default ON user_addresses(is_default);

-- ============================================================================
-- PAYMENT METHODS
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  method_type VARCHAR(50) NOT NULL, -- 'cash', 'card', 'mobile_banking', 'e_wallet'
  provider VARCHAR(50), -- 'ABA', 'WING', 'Pi Pay', 'Visa', 'Mastercard'
  
  -- Card details (encrypted in production)
  card_last_four VARCHAR(4),
  card_holder_name VARCHAR(255),
  card_expiry_month INTEGER,
  card_expiry_year INTEGER,
  card_brand VARCHAR(50), -- 'Visa', 'Mastercard', 'JCB'
  
  -- Mobile banking / E-wallet
  account_number VARCHAR(100),
  account_name VARCHAR(255),
  
  is_default BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX idx_payment_methods_method_type ON payment_methods(method_type);
CREATE INDEX idx_payment_methods_is_default ON payment_methods(is_default);

-- ============================================================================
-- LOYALTY PROGRAM
-- ============================================================================
CREATE TABLE IF NOT EXISTS loyalty_accounts (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  points_balance INTEGER DEFAULT 0,
  lifetime_points_earned INTEGER DEFAULT 0,
  tier VARCHAR(20) DEFAULT 'bronze', -- 'bronze', 'silver', 'gold', 'platinum'
  tier_expires_at TIMESTAMP WITH TIME ZONE,
  referral_code VARCHAR(20) UNIQUE NOT NULL,
  referred_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_loyalty_accounts_tier ON loyalty_accounts(tier);
CREATE INDEX idx_loyalty_accounts_referral_code ON loyalty_accounts(referral_code);
CREATE INDEX idx_loyalty_accounts_referred_by ON loyalty_accounts(referred_by);

-- ============================================================================
-- LOYALTY POINTS TRANSACTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL, -- 'earned', 'redeemed', 'expired', 'bonus', 'refund'
  points_change INTEGER NOT NULL, -- Positive for earning, negative for spending
  points_balance_after INTEGER NOT NULL,
  reason VARCHAR(100) NOT NULL, -- 'order_completed', 'referral_bonus', 'birthday_bonus', 'redeemed_for_discount'
  related_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  description TEXT,
  expires_at TIMESTAMP WITH TIME ZONE, -- For points that expire
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_loyalty_transactions_user_id ON loyalty_transactions(user_id);
CREATE INDEX idx_loyalty_transactions_created_at ON loyalty_transactions(created_at DESC);
CREATE INDEX idx_loyalty_transactions_transaction_type ON loyalty_transactions(transaction_type);
CREATE INDEX idx_loyalty_transactions_expires_at ON loyalty_transactions(expires_at);

-- ============================================================================
-- LOYALTY REWARDS CATALOG
-- ============================================================================
CREATE TABLE IF NOT EXISTS loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  reward_type VARCHAR(50) NOT NULL, -- 'discount_percent', 'discount_amount', 'free_item', 'free_delivery'
  discount_percent DECIMAL(5, 2), -- e.g., 10.00 for 10% off
  discount_amount DECIMAL(10, 2), -- e.g., 2.00 for $2 off
  free_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  points_cost INTEGER NOT NULL,
  minimum_order_amount DECIMAL(10, 2), -- Minimum order required to use reward
  valid_for_days INTEGER DEFAULT 30, -- How long the reward is valid after redemption
  max_redemptions_per_user INTEGER, -- Limit how many times a user can redeem this
  is_active BOOLEAN DEFAULT true,
  image_url TEXT,
  terms_and_conditions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_loyalty_rewards_is_active ON loyalty_rewards(is_active);
CREATE INDEX idx_loyalty_rewards_points_cost ON loyalty_rewards(points_cost);

-- ============================================================================
-- REDEEMED REWARDS
-- ============================================================================
CREATE TABLE IF NOT EXISTS redeemed_rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES loyalty_rewards(id) ON DELETE CASCADE,
  loyalty_transaction_id UUID REFERENCES loyalty_transactions(id) ON DELETE SET NULL,
  
  -- Generated unique code for the reward
  redemption_code VARCHAR(20) UNIQUE NOT NULL,
  
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'used', 'expired', 'cancelled'
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  
  used_at TIMESTAMP WITH TIME ZONE,
  used_in_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_redeemed_rewards_user_id ON redeemed_rewards(user_id);
CREATE INDEX idx_redeemed_rewards_redemption_code ON redeemed_rewards(redemption_code);
CREATE INDEX idx_redeemed_rewards_status ON redeemed_rewards(status);
CREATE INDEX idx_redeemed_rewards_valid_until ON redeemed_rewards(valid_until);

-- ============================================================================
-- FAVORITE SHOPS (Enhanced from user_preferences)
-- ============================================================================
CREATE TABLE IF NOT EXISTS favorite_shops (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, shop_id)
);

CREATE INDEX idx_favorite_shops_user_id ON favorite_shops(user_id);
CREATE INDEX idx_favorite_shops_shop_id ON favorite_shops(shop_id);

-- ============================================================================
-- FAVORITE MENU ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS favorite_menu_items (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, menu_item_id)
);

CREATE INDEX idx_favorite_menu_items_user_id ON favorite_menu_items(user_id);
CREATE INDEX idx_favorite_menu_items_menu_item_id ON favorite_menu_items(menu_item_id);

-- ============================================================================
-- SAVED ORDERS (Reorder functionality)
-- ============================================================================
CREATE TABLE IF NOT EXISTS saved_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL, -- User-given name like "My Regular Order"
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  items JSONB NOT NULL, -- Array of {menu_item_id, quantity}
  total_amount DECIMAL(10, 2), -- Cached, may change with menu prices
  service_type VARCHAR(20), -- 'pickup' or 'dine-in'
  special_instructions TEXT,
  order_count INTEGER DEFAULT 0, -- How many times this has been ordered
  last_ordered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_saved_orders_user_id ON saved_orders(user_id);
CREATE INDEX idx_saved_orders_shop_id ON saved_orders(shop_id);

-- ============================================================================
-- USER ACTIVITY TRACKING
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL, -- 'view_menu', 'search', 'add_to_cart', 'view_order'
  target_type VARCHAR(50), -- 'shop', 'menu_item', 'order'
  target_id UUID,
  metadata JSONB, -- Additional context
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX idx_user_activity_created_at ON user_activity(created_at DESC);
CREATE INDEX idx_user_activity_activity_type ON user_activity(activity_type);

-- Partition by month for better performance
-- CREATE TABLE user_activity_y2026m01 PARTITION OF user_activity
--   FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- ============================================================================
-- REFERRAL TRACKING
-- ============================================================================
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'rewarded'
  referrer_reward_points INTEGER,
  referred_reward_points INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE, -- When referred user made first order
  rewarded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id)
);

CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX idx_referrals_status ON referrals(status);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function: Generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS VARCHAR(20) AS $$
DECLARE
  code VARCHAR(20);
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 8-character alphanumeric code
    code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    
    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM loyalty_accounts WHERE referral_code = code) INTO exists;
    
    EXIT WHEN NOT exists;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Create loyalty account on user creation
CREATE OR REPLACE FUNCTION create_loyalty_account()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'student' THEN
    INSERT INTO loyalty_accounts (user_id, referral_code)
    VALUES (NEW.id, generate_referral_code());
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_loyalty_account_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_loyalty_account();

-- Function: Award loyalty points for order
CREATE OR REPLACE FUNCTION award_loyalty_points_for_order()
RETURNS TRIGGER AS $$
DECLARE
  points_to_award INTEGER;
  current_balance INTEGER;
BEGIN
  -- Only award points for completed orders
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    -- Award 1 point per $1 spent (adjust ratio as needed)
    points_to_award := FLOOR(NEW.total_amount);
    
    -- Get current balance
    SELECT points_balance INTO current_balance
    FROM loyalty_accounts
    WHERE user_id = NEW.student_id;
    
    -- Add loyalty transaction
    INSERT INTO loyalty_transactions (
      user_id,
      transaction_type,
      points_change,
      points_balance_after,
      reason,
      related_order_id,
      description
    )
    VALUES (
      NEW.student_id,
      'earned',
      points_to_award,
      current_balance + points_to_award,
      'order_completed',
      NEW.id,
      'Earned from order ' || NEW.order_number
    );
    
    -- Update loyalty account
    UPDATE loyalty_accounts
    SET 
      points_balance = points_balance + points_to_award,
      lifetime_points_earned = lifetime_points_earned + points_to_award,
      updated_at = NOW()
    WHERE user_id = NEW.student_id;
    
    -- Check and update tier
    PERFORM update_loyalty_tier(NEW.student_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER award_loyalty_points_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION award_loyalty_points_for_order();

-- Function: Update loyalty tier based on lifetime points
CREATE OR REPLACE FUNCTION update_loyalty_tier(user_uuid UUID)
RETURNS VOID AS $$
DECLARE
  lifetime_points INTEGER;
  new_tier VARCHAR(20);
BEGIN
  SELECT lifetime_points_earned INTO lifetime_points
  FROM loyalty_accounts
  WHERE user_id = user_uuid;
  
  -- Determine tier (adjust thresholds as needed)
  IF lifetime_points >= 10000 THEN
    new_tier := 'platinum';
  ELSIF lifetime_points >= 5000 THEN
    new_tier := 'gold';
  ELSIF lifetime_points >= 2000 THEN
    new_tier := 'silver';
  ELSE
    new_tier := 'bronze';
  END IF;
  
  -- Update tier
  UPDATE loyalty_accounts
  SET 
    tier = new_tier,
    tier_expires_at = NOW() + INTERVAL '1 year',
    updated_at = NOW()
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function: Redeem loyalty reward
CREATE OR REPLACE FUNCTION redeem_loyalty_reward(
  p_user_id UUID,
  p_reward_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_points_cost INTEGER;
  v_current_balance INTEGER;
  v_valid_days INTEGER;
  v_redemption_code VARCHAR(20);
  v_redeemed_id UUID;
  v_transaction_id UUID;
BEGIN
  -- Get reward details
  SELECT points_cost, valid_for_days 
  INTO v_points_cost, v_valid_days
  FROM loyalty_rewards
  WHERE id = p_reward_id AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reward not found or inactive';
  END IF;
  
  -- Get current balance
  SELECT points_balance INTO v_current_balance
  FROM loyalty_accounts
  WHERE user_id = p_user_id;
  
  IF v_current_balance < v_points_cost THEN
    RAISE EXCEPTION 'Insufficient points';
  END IF;
  
  -- Generate redemption code
  v_redemption_code := upper(substring(md5(random()::text) from 1 for 12));
  
  -- Deduct points
  INSERT INTO loyalty_transactions (
    user_id,
    transaction_type,
    points_change,
    points_balance_after,
    reason,
    description
  )
  VALUES (
    p_user_id,
    'redeemed',
    -v_points_cost,
    v_current_balance - v_points_cost,
    'redeemed_for_reward',
    'Redeemed reward'
  )
  RETURNING id INTO v_transaction_id;
  
  UPDATE loyalty_accounts
  SET points_balance = points_balance - v_points_cost
  WHERE user_id = p_user_id;
  
  -- Create redeemed reward
  INSERT INTO redeemed_rewards (
    user_id,
    reward_id,
    loyalty_transaction_id,
    redemption_code,
    valid_until
  )
  VALUES (
    p_user_id,
    p_reward_id,
    v_transaction_id,
    v_redemption_code,
    NOW() + (v_valid_days || ' days')::INTERVAL
  )
  RETURNING id INTO v_redeemed_id;
  
  RETURN v_redeemed_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Get user profile summary
CREATE OR REPLACE FUNCTION get_user_profile_summary(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'user', json_build_object(
      'id', u.id,
      'name', u.name,
      'email', u.email,
      'avatar_url', u.avatar_url,
      'phone', u.phone,
      'student_id', u.student_id,
      'email_verified', u.email_verified,
      'created_at', u.created_at
    ),
    'loyalty', json_build_object(
      'points_balance', la.points_balance,
      'lifetime_points_earned', la.lifetime_points_earned,
      'tier', la.tier,
      'referral_code', la.referral_code
    ),
    'stats', json_build_object(
      'total_orders', COUNT(o.id),
      'total_spent', COALESCE(SUM(o.total_amount) FILTER (WHERE o.status = 'completed'), 0),
      'favorite_shops_count', (SELECT COUNT(*) FROM favorite_shops WHERE user_id = user_uuid)
    )
  )
  INTO result
  FROM users u
  LEFT JOIN loyalty_accounts la ON u.id = la.user_id
  LEFT JOIN orders o ON u.id = o.student_id
  WHERE u.id = user_uuid
  GROUP BY u.id, la.user_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SEED DATA: Loyalty Rewards
-- ============================================================================

INSERT INTO loyalty_rewards (name, description, reward_type, discount_percent, points_cost, minimum_order_amount, is_active) VALUES
  ('10% Off Any Order', 'Get 10% off your entire order', 'discount_percent', 10.00, 500, 5.00, true),
  ('$2 Off', 'Get $2 off your order', 'discount_amount', NULL, 300, 10.00, true),
  ('$5 Off Large Orders', 'Get $5 off orders above $15', 'discount_amount', NULL, 800, 15.00, true),
  ('Free Drink', 'Get a free drink with any order', 'discount_amount', NULL, 400, 5.00, true),
  ('20% Off Healthy Items', 'Get 20% off all healthy menu items', 'discount_percent', 20.00, 600, 8.00, true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE user_addresses IS 'User delivery addresses for future delivery feature';
COMMENT ON TABLE payment_methods IS 'Saved payment methods for quick checkout';
COMMENT ON TABLE loyalty_accounts IS 'Main loyalty program account for each user';
COMMENT ON TABLE loyalty_transactions IS 'All point earning and spending transactions';
COMMENT ON TABLE loyalty_rewards IS 'Catalog of rewards users can redeem';
COMMENT ON TABLE redeemed_rewards IS 'Rewards that users have redeemed';
COMMENT ON TABLE favorite_shops IS 'User favorite shops for quick access';
COMMENT ON TABLE favorite_menu_items IS 'User favorite menu items';
COMMENT ON TABLE saved_orders IS 'Saved order templates for quick reordering';
COMMENT ON TABLE user_activity IS 'Tracks user behavior for analytics';
COMMENT ON TABLE referrals IS 'Tracks user referrals and rewards';
