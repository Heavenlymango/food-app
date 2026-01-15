-- Campus Food Ordering System - Payments & Transactions
-- PostgreSQL / Supabase Compatible

-- ============================================================================
-- PAYMENT TRANSACTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_number VARCHAR(50) UNIQUE NOT NULL,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Payment details
  payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
  payment_type VARCHAR(50) NOT NULL, -- 'cash', 'card', 'mobile_banking', 'e_wallet', 'points'
  payment_provider VARCHAR(50), -- 'ABA', 'WING', 'Pi Pay', etc.
  
  -- Amounts
  amount DECIMAL(10, 2) NOT NULL,
  discount_amount DECIMAL(10, 2) DEFAULT 0.00,
  points_used INTEGER DEFAULT 0,
  points_value DECIMAL(10, 2) DEFAULT 0.00, -- Dollar value of points used
  service_fee DECIMAL(10, 2) DEFAULT 0.00,
  total_amount DECIMAL(10, 2) NOT NULL,
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded'
  
  -- External reference
  external_transaction_id VARCHAR(255), -- ID from payment provider
  payment_proof_url TEXT, -- Receipt/proof image
  
  -- Timestamps
  initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  
  -- Error handling
  failure_reason TEXT,
  failure_code VARCHAR(50),
  
  -- Metadata
  metadata JSONB, -- Additional payment gateway data
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payment_transactions_transaction_number ON payment_transactions(transaction_number);
CREATE INDEX idx_payment_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_created_at ON payment_transactions(created_at DESC);
CREATE INDEX idx_payment_transactions_external_id ON payment_transactions(external_transaction_id);

-- ============================================================================
-- REFUNDS
-- ============================================================================
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  refund_number VARCHAR(50) UNIQUE NOT NULL,
  payment_transaction_id UUID NOT NULL REFERENCES payment_transactions(id) ON DELETE RESTRICT,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  
  refund_amount DECIMAL(10, 2) NOT NULL,
  refund_reason VARCHAR(100) NOT NULL, -- 'order_cancelled', 'quality_issue', 'wrong_order', 'customer_request'
  refund_description TEXT,
  
  refund_method VARCHAR(50), -- 'original_payment', 'store_credit', 'points'
  
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  processed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  external_refund_id VARCHAR(255),
  failure_reason TEXT,
  
  metadata JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_refunds_refund_number ON refunds(refund_number);
CREATE INDEX idx_refunds_payment_transaction_id ON refunds(payment_transaction_id);
CREATE INDEX idx_refunds_order_id ON refunds(order_id);
CREATE INDEX idx_refunds_status ON refunds(status);
CREATE INDEX idx_refunds_requested_by ON refunds(requested_by);

-- ============================================================================
-- WALLET / STORE CREDIT
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_wallets (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance DECIMAL(10, 2) DEFAULT 0.00 CHECK (balance >= 0),
  lifetime_added DECIMAL(10, 2) DEFAULT 0.00,
  lifetime_spent DECIMAL(10, 2) DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'USD',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- WALLET TRANSACTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL, -- 'credit', 'debit', 'refund', 'bonus'
  amount DECIMAL(10, 2) NOT NULL,
  balance_before DECIMAL(10, 2) NOT NULL,
  balance_after DECIMAL(10, 2) NOT NULL,
  
  reason VARCHAR(100) NOT NULL,
  description TEXT,
  
  related_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  related_payment_id UUID REFERENCES payment_transactions(id) ON DELETE SET NULL,
  related_refund_id UUID REFERENCES refunds(id) ON DELETE SET NULL,
  
  processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  metadata JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);
CREATE INDEX idx_wallet_transactions_transaction_type ON wallet_transactions(transaction_type);

-- ============================================================================
-- PAYMENT GATEWAYS CONFIGURATION
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_gateways (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  provider VARCHAR(50) UNIQUE NOT NULL, -- 'stripe', 'aba_payway', 'wing', 'pi_pay'
  is_active BOOLEAN DEFAULT false,
  is_test_mode BOOLEAN DEFAULT true,
  
  -- Configuration (encrypted in production)
  api_key TEXT,
  secret_key TEXT,
  webhook_secret TEXT,
  merchant_id VARCHAR(255),
  
  -- Settings
  supported_currencies TEXT[] DEFAULT ARRAY['USD'],
  min_amount DECIMAL(10, 2) DEFAULT 0.01,
  max_amount DECIMAL(10, 2),
  
  processing_fee_percent DECIMAL(5, 2) DEFAULT 0.00,
  processing_fee_fixed DECIMAL(10, 2) DEFAULT 0.00,
  
  display_name VARCHAR(100),
  logo_url TEXT,
  display_order INTEGER DEFAULT 0,
  
  metadata JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payment_gateways_provider ON payment_gateways(provider);
CREATE INDEX idx_payment_gateways_is_active ON payment_gateways(is_active);

-- ============================================================================
-- PAYMENT WEBHOOKS LOG
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gateway_provider VARCHAR(50) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  event_id VARCHAR(255),
  
  payload JSONB NOT NULL,
  headers JSONB,
  
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  
  related_transaction_id UUID REFERENCES payment_transactions(id) ON DELETE SET NULL,
  
  error_message TEXT,
  
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payment_webhooks_gateway_provider ON payment_webhooks(gateway_provider);
CREATE INDEX idx_payment_webhooks_event_type ON payment_webhooks(event_type);
CREATE INDEX idx_payment_webhooks_processed ON payment_webhooks(processed);
CREATE INDEX idx_payment_webhooks_received_at ON payment_webhooks(received_at DESC);

-- ============================================================================
-- COMMISSION / REVENUE SPLIT
-- ============================================================================
CREATE TABLE IF NOT EXISTS commission_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  payment_transaction_id UUID REFERENCES payment_transactions(id) ON DELETE SET NULL,
  
  order_amount DECIMAL(10, 2) NOT NULL,
  commission_rate DECIMAL(5, 2) NOT NULL, -- Percentage
  commission_amount DECIMAL(10, 2) NOT NULL,
  shop_payout_amount DECIMAL(10, 2) NOT NULL,
  
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'paid', 'disputed'
  
  payout_scheduled_date DATE,
  payout_completed_date DATE,
  payout_reference VARCHAR(255),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_commission_transactions_order_id ON commission_transactions(order_id);
CREATE INDEX idx_commission_transactions_shop_id ON commission_transactions(shop_id);
CREATE INDEX idx_commission_transactions_status ON commission_transactions(status);
CREATE INDEX idx_commission_transactions_payout_scheduled ON commission_transactions(payout_scheduled_date);

-- ============================================================================
-- SHOP PAYOUT ACCOUNTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS shop_payout_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  
  account_type VARCHAR(50) NOT NULL, -- 'bank_account', 'mobile_wallet'
  
  -- Bank details
  bank_name VARCHAR(100),
  account_number VARCHAR(100),
  account_holder_name VARCHAR(255),
  bank_branch VARCHAR(100),
  swift_code VARCHAR(20),
  
  -- Mobile wallet
  wallet_provider VARCHAR(50), -- 'WING', 'Pi Pay', 'ABA'
  wallet_number VARCHAR(100),
  wallet_holder_name VARCHAR(255),
  
  is_default BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_shop_payout_accounts_shop_id ON shop_payout_accounts(shop_id);
CREATE INDEX idx_shop_payout_accounts_is_default ON shop_payout_accounts(is_default);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function: Generate transaction number
CREATE OR REPLACE FUNCTION generate_transaction_number()
RETURNS TRIGGER AS $$
DECLARE
  trans_date TEXT;
  trans_count INTEGER;
  new_trans_number TEXT;
BEGIN
  trans_date := TO_CHAR(NOW(), 'YYYYMMDD');
  
  SELECT COUNT(*) INTO trans_count
  FROM payment_transactions
  WHERE DATE(created_at) = CURRENT_DATE;
  
  new_trans_number := 'TXN-' || trans_date || '-' || LPAD((trans_count + 1)::TEXT, 6, '0');
  
  NEW.transaction_number = new_trans_number;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_transaction_number_trigger
  BEFORE INSERT ON payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION generate_transaction_number();

-- Function: Generate refund number
CREATE OR REPLACE FUNCTION generate_refund_number()
RETURNS TRIGGER AS $$
DECLARE
  refund_date TEXT;
  refund_count INTEGER;
  new_refund_number TEXT;
BEGIN
  refund_date := TO_CHAR(NOW(), 'YYYYMMDD');
  
  SELECT COUNT(*) INTO refund_count
  FROM refunds
  WHERE DATE(created_at) = CURRENT_DATE;
  
  new_refund_number := 'REF-' || refund_date || '-' || LPAD((refund_count + 1)::TEXT, 6, '0');
  
  NEW.refund_number = new_refund_number;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_refund_number_trigger
  BEFORE INSERT ON refunds
  FOR EACH ROW
  EXECUTE FUNCTION generate_refund_number();

-- Function: Create commission transaction on order completion
CREATE OR REPLACE FUNCTION create_commission_transaction()
RETURNS TRIGGER AS $$
DECLARE
  commission_rate DECIMAL(5, 2) := 10.00; -- 10% commission (configurable)
  commission_amt DECIMAL(10, 2);
  payout_amt DECIMAL(10, 2);
BEGIN
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    commission_amt := NEW.total_amount * (commission_rate / 100);
    payout_amt := NEW.total_amount - commission_amt;
    
    INSERT INTO commission_transactions (
      order_id,
      shop_id,
      order_amount,
      commission_rate,
      commission_amount,
      shop_payout_amount,
      payout_scheduled_date
    )
    VALUES (
      NEW.id,
      NEW.shop_id,
      NEW.total_amount,
      commission_rate,
      commission_amt,
      payout_amt,
      CURRENT_DATE + INTERVAL '7 days' -- Payout after 7 days
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_commission_transaction_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION create_commission_transaction();

-- Function: Process wallet transaction
CREATE OR REPLACE FUNCTION process_wallet_transaction(
  p_user_id UUID,
  p_transaction_type VARCHAR(50),
  p_amount DECIMAL(10, 2),
  p_reason VARCHAR(100),
  p_description TEXT DEFAULT NULL,
  p_related_order_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  current_balance DECIMAL(10, 2);
  new_balance DECIMAL(10, 2);
  transaction_id UUID;
BEGIN
  -- Get current balance
  SELECT balance INTO current_balance
  FROM user_wallets
  WHERE user_id = p_user_id;
  
  -- Create wallet if doesn't exist
  IF NOT FOUND THEN
    INSERT INTO user_wallets (user_id, balance)
    VALUES (p_user_id, 0.00)
    RETURNING balance INTO current_balance;
  END IF;
  
  -- Calculate new balance
  IF p_transaction_type IN ('credit', 'refund', 'bonus') THEN
    new_balance := current_balance + p_amount;
  ELSIF p_transaction_type = 'debit' THEN
    IF current_balance < p_amount THEN
      RAISE EXCEPTION 'Insufficient wallet balance';
    END IF;
    new_balance := current_balance - p_amount;
  ELSE
    RAISE EXCEPTION 'Invalid transaction type';
  END IF;
  
  -- Create transaction record
  INSERT INTO wallet_transactions (
    user_id,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    reason,
    description,
    related_order_id
  )
  VALUES (
    p_user_id,
    p_transaction_type,
    p_amount,
    current_balance,
    new_balance,
    p_reason,
    p_description,
    p_related_order_id
  )
  RETURNING id INTO transaction_id;
  
  -- Update wallet balance
  UPDATE user_wallets
  SET 
    balance = new_balance,
    lifetime_added = CASE 
      WHEN p_transaction_type IN ('credit', 'refund', 'bonus') 
      THEN lifetime_added + p_amount 
      ELSE lifetime_added 
    END,
    lifetime_spent = CASE 
      WHEN p_transaction_type = 'debit' 
      THEN lifetime_spent + p_amount 
      ELSE lifetime_spent 
    END,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Process refund and update wallet
CREATE OR REPLACE FUNCTION process_completed_refund()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    -- Get the original order's student_id
    DECLARE
      student_uuid UUID;
    BEGIN
      SELECT student_id INTO student_uuid
      FROM orders
      WHERE id = NEW.order_id;
      
      -- Add to wallet as credit
      PERFORM process_wallet_transaction(
        student_uuid,
        'refund',
        NEW.refund_amount,
        'order_refund',
        'Refund for order: ' || NEW.refund_number,
        NEW.order_id
      );
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER process_completed_refund_trigger
  AFTER UPDATE ON refunds
  FOR EACH ROW
  EXECUTE FUNCTION process_completed_refund();

-- Function: Get payment summary for order
CREATE OR REPLACE FUNCTION get_order_payment_summary(order_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'order_id', order_uuid,
    'total_paid', COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed'), 0),
    'total_refunded', COALESCE(SUM(r.refund_amount) FILTER (WHERE r.status = 'completed'), 0),
    'net_amount', 
      COALESCE(SUM(pt.total_amount) FILTER (WHERE pt.status = 'completed'), 0) - 
      COALESCE(SUM(r.refund_amount) FILTER (WHERE r.status = 'completed'), 0),
    'payment_status', 
      CASE 
        WHEN SUM(pt.total_amount) FILTER (WHERE pt.status = 'completed') >= o.total_amount THEN 'paid'
        WHEN SUM(r.refund_amount) FILTER (WHERE r.status = 'completed') >= o.total_amount THEN 'refunded'
        ELSE 'pending'
      END
  )
  INTO result
  FROM orders o
  LEFT JOIN payment_transactions pt ON o.id = pt.order_id
  LEFT JOIN refunds r ON o.id = r.order_id
  WHERE o.id = order_uuid
  GROUP BY o.id, o.total_amount;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE payment_transactions IS 'All payment transactions for orders';
COMMENT ON TABLE refunds IS 'Refund requests and processing';
COMMENT ON TABLE user_wallets IS 'User store credit / wallet balance';
COMMENT ON TABLE wallet_transactions IS 'All wallet credits and debits';
COMMENT ON TABLE payment_gateways IS 'Payment gateway configurations';
COMMENT ON TABLE payment_webhooks IS 'Webhook events from payment providers';
COMMENT ON TABLE commission_transactions IS 'Platform commission and shop payouts';
COMMENT ON TABLE shop_payout_accounts IS 'Shop bank/wallet accounts for payouts';
