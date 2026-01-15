-- Campus Food Ordering System - Authentication & Admin Tables
-- PostgreSQL / Supabase Compatible

-- ============================================================================
-- ADMIN ROLES & PERMISSIONS
-- ============================================================================

-- Extend user roles to include admin types
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('student', 'seller', 'admin', 'super_admin'));

-- Add admin-specific fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_locked BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;

-- ============================================================================
-- USER SESSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  refresh_token VARCHAR(255) UNIQUE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_type VARCHAR(50), -- 'mobile', 'tablet', 'desktop'
  device_name VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_is_active ON user_sessions(is_active);

-- ============================================================================
-- PASSWORD RESET TOKENS
-- ============================================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- ============================================================================
-- EMAIL VERIFICATION TOKENS
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  new_email VARCHAR(255), -- For email change verification
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX idx_email_verification_tokens_token ON email_verification_tokens(token);

-- ============================================================================
-- TWO-FACTOR AUTHENTICATION
-- ============================================================================
CREATE TABLE IF NOT EXISTS two_factor_auth (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  secret VARCHAR(255) NOT NULL,
  backup_codes TEXT[], -- Array of backup codes
  enabled BOOLEAN DEFAULT false,
  enabled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- LOGIN HISTORY / AUDIT LOG
-- ============================================================================
CREATE TABLE IF NOT EXISTS login_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  login_successful BOOLEAN NOT NULL,
  failure_reason VARCHAR(100), -- 'wrong_password', 'account_locked', 'account_not_found'
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_type VARCHAR(50),
  location_country VARCHAR(100),
  location_city VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_login_history_user_id ON login_history(user_id);
CREATE INDEX idx_login_history_created_at ON login_history(created_at DESC);
CREATE INDEX idx_login_history_login_successful ON login_history(login_successful);
CREATE INDEX idx_login_history_ip_address ON login_history(ip_address);

-- ============================================================================
-- ADMIN PERMISSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'manage_users', 'manage_shops', 'view_analytics'
  description TEXT,
  category VARCHAR(50), -- 'user_management', 'shop_management', 'system', 'analytics'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_permissions_category ON admin_permissions(category);

-- ============================================================================
-- ADMIN ROLE PERMISSIONS (Many-to-Many)
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_role_permissions (
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES admin_permissions(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (admin_id, permission_id)
);

CREATE INDEX idx_admin_role_permissions_admin_id ON admin_role_permissions(admin_id);
CREATE INDEX idx_admin_role_permissions_permission_id ON admin_role_permissions(permission_id);

-- ============================================================================
-- ADMIN ACTIVITY LOG
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL, -- 'create_user', 'delete_order', 'update_shop', 'ban_user'
  target_type VARCHAR(50), -- 'user', 'shop', 'order', 'menu_item'
  target_id UUID,
  description TEXT,
  metadata JSONB, -- Store additional action details
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_activity_log_admin_id ON admin_activity_log(admin_id);
CREATE INDEX idx_admin_activity_log_created_at ON admin_activity_log(created_at DESC);
CREATE INDEX idx_admin_activity_log_action ON admin_activity_log(action);
CREATE INDEX idx_admin_activity_log_target_type ON admin_activity_log(target_type);

-- ============================================================================
-- USER REPORTS (For reporting other users/shops)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_type VARCHAR(50) NOT NULL, -- 'user', 'shop', 'order'
  reported_id UUID NOT NULL,
  report_category VARCHAR(50) NOT NULL, -- 'spam', 'inappropriate', 'fraud', 'quality_issue'
  description TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'reviewing', 'resolved', 'dismissed'
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_reports_reporter_id ON user_reports(reporter_id);
CREATE INDEX idx_user_reports_status ON user_reports(status);
CREATE INDEX idx_user_reports_created_at ON user_reports(created_at DESC);
CREATE INDEX idx_user_reports_reported_type ON user_reports(reported_type);

-- ============================================================================
-- SYSTEM AUDIT LOG (General system events)
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(100) NOT NULL, -- 'database_backup', 'system_restart', 'config_change'
  severity VARCHAR(20) DEFAULT 'info', -- 'info', 'warning', 'error', 'critical'
  message TEXT NOT NULL,
  metadata JSONB,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_system_audit_log_created_at ON system_audit_log(created_at DESC);
CREATE INDEX idx_system_audit_log_event_type ON system_audit_log(event_type);
CREATE INDEX idx_system_audit_log_severity ON system_audit_log(severity);

-- ============================================================================
-- SEED ADMIN PERMISSIONS
-- ============================================================================

INSERT INTO admin_permissions (name, description, category) VALUES
  -- User Management
  ('view_users', 'View user list and details', 'user_management'),
  ('create_users', 'Create new user accounts', 'user_management'),
  ('edit_users', 'Edit user information', 'user_management'),
  ('delete_users', 'Delete user accounts', 'user_management'),
  ('ban_users', 'Ban/suspend user accounts', 'user_management'),
  ('verify_users', 'Verify user email addresses', 'user_management'),
  
  -- Shop Management
  ('view_shops', 'View shop list and details', 'shop_management'),
  ('create_shops', 'Create new shops', 'shop_management'),
  ('edit_shops', 'Edit shop information', 'shop_management'),
  ('delete_shops', 'Delete shops', 'shop_management'),
  ('manage_shop_status', 'Enable/disable shops', 'shop_management'),
  
  -- Order Management
  ('view_all_orders', 'View all orders in system', 'order_management'),
  ('cancel_any_order', 'Cancel any order', 'order_management'),
  ('refund_orders', 'Process order refunds', 'order_management'),
  
  -- Menu Management
  ('manage_menu_items', 'Add, edit, delete menu items', 'menu_management'),
  ('approve_menu_items', 'Approve new menu items', 'menu_management'),
  
  -- Analytics
  ('view_analytics', 'View system analytics and reports', 'analytics'),
  ('export_data', 'Export system data', 'analytics'),
  
  -- System Configuration
  ('manage_settings', 'Manage system settings', 'system'),
  ('manage_permissions', 'Manage admin permissions', 'system'),
  ('view_logs', 'View system logs', 'system'),
  ('manage_announcements', 'Create/edit system announcements', 'system'),
  
  -- Support
  ('view_reports', 'View user reports', 'support'),
  ('manage_reports', 'Manage and resolve reports', 'support'),
  ('view_support_tickets', 'View support tickets', 'support'),
  ('manage_support_tickets', 'Respond to support tickets', 'support')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function: Update last_login_at on successful login
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.login_successful = true THEN
    UPDATE users 
    SET last_login_at = NEW.created_at,
        failed_login_attempts = 0
    WHERE id = NEW.user_id;
  ELSE
    UPDATE users 
    SET failed_login_attempts = failed_login_attempts + 1
    WHERE id = NEW.user_id;
    
    -- Auto-lock account after 5 failed attempts
    UPDATE users 
    SET account_locked = true
    WHERE id = NEW.user_id AND failed_login_attempts >= 5;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_last_login_trigger
  AFTER INSERT ON login_history
  FOR EACH ROW
  EXECUTE FUNCTION update_last_login();

-- Function: Cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_sessions
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Cleanup expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM password_reset_tokens
  WHERE expires_at < NOW() OR used = true;
  
  DELETE FROM email_verification_tokens
  WHERE expires_at < NOW() OR verified = true;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(
  user_uuid UUID,
  permission_name VARCHAR(100)
)
RETURNS BOOLEAN AS $$
DECLARE
  has_perm BOOLEAN;
  user_role VARCHAR(20);
BEGIN
  -- Get user role
  SELECT role INTO user_role FROM users WHERE id = user_uuid;
  
  -- Super admins have all permissions
  IF user_role = 'super_admin' THEN
    RETURN true;
  END IF;
  
  -- Check specific permission
  SELECT EXISTS(
    SELECT 1 
    FROM admin_role_permissions arp
    JOIN admin_permissions ap ON arp.permission_id = ap.id
    WHERE arp.admin_id = user_uuid 
      AND ap.name = permission_name
  ) INTO has_perm;
  
  RETURN has_perm;
END;
$$ LANGUAGE plpgsql;

-- Function: Log admin action
CREATE OR REPLACE FUNCTION log_admin_action(
  p_admin_id UUID,
  p_action VARCHAR(100),
  p_target_type VARCHAR(50),
  p_target_id UUID,
  p_description TEXT,
  p_metadata JSONB DEFAULT NULL,
  p_ip_address VARCHAR(45) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO admin_activity_log (
    admin_id,
    action,
    target_type,
    target_id,
    description,
    metadata,
    ip_address
  )
  VALUES (
    p_admin_id,
    p_action,
    p_target_type,
    p_target_id,
    p_description,
    p_metadata,
    p_ip_address
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE user_sessions IS 'Tracks active user sessions for JWT token management';
COMMENT ON TABLE password_reset_tokens IS 'Temporary tokens for password reset functionality';
COMMENT ON TABLE email_verification_tokens IS 'Tokens for email verification and email change confirmation';
COMMENT ON TABLE two_factor_auth IS 'Two-factor authentication settings per user';
COMMENT ON TABLE login_history IS 'Complete audit log of all login attempts';
COMMENT ON TABLE admin_permissions IS 'System permissions that can be granted to admins';
COMMENT ON TABLE admin_role_permissions IS 'Maps which permissions each admin has';
COMMENT ON TABLE admin_activity_log IS 'Audit trail of all admin actions';
COMMENT ON TABLE user_reports IS 'User-submitted reports about content or behavior';
COMMENT ON TABLE system_audit_log IS 'General system events and audit trail';
