-- Campus Food Ordering System - Functions & Triggers
-- PostgreSQL / Supabase Compatible

-- ============================================================================
-- FUNCTION: Update timestamp on row update
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON shops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTION: Track order status changes
-- ============================================================================
CREATE OR REPLACE FUNCTION track_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_history (order_id, previous_status, new_status, changed_at)
    VALUES (NEW.id, OLD.status, NEW.status, NOW());
    
    -- Update timing fields based on new status
    IF NEW.status = 'preparing' AND NEW.accepted_at IS NULL THEN
      NEW.accepted_at = NOW();
    ELSIF NEW.status = 'ready' AND NEW.ready_at IS NULL THEN
      NEW.ready_at = NOW();
    ELSIF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN
      NEW.completed_at = NOW();
    ELSIF NEW.status = 'cancelled' AND NEW.cancelled_at IS NULL THEN
      NEW.cancelled_at = NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_order_status_changes BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION track_order_status_change();

-- ============================================================================
-- FUNCTION: Generate order number
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  order_date TEXT;
  order_count INTEGER;
  new_order_number TEXT;
BEGIN
  -- Format: ORD-YYYYMMDD-XXXX
  order_date := TO_CHAR(NOW(), 'YYYYMMDD');
  
  -- Count orders today
  SELECT COUNT(*) INTO order_count
  FROM orders
  WHERE DATE(ordered_at) = CURRENT_DATE;
  
  -- Generate order number
  new_order_number := 'ORD-' || order_date || '-' || LPAD((order_count + 1)::TEXT, 4, '0');
  
  NEW.order_number = new_order_number;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_order_number_trigger BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- ============================================================================
-- FUNCTION: Update shop statistics on order completion/cancellation
-- ============================================================================
CREATE OR REPLACE FUNCTION update_shop_statistics()
RETURNS TRIGGER AS $$
DECLARE
  order_date DATE;
BEGIN
  order_date := DATE(COALESCE(NEW.ordered_at, OLD.ordered_at));
  
  -- Insert or update statistics for the shop on this date
  INSERT INTO shop_statistics (shop_id, date, total_orders, total_revenue, completed_orders, cancelled_orders)
  VALUES (
    COALESCE(NEW.shop_id, OLD.shop_id),
    order_date,
    CASE WHEN TG_OP = 'INSERT' THEN 1 ELSE 0 END,
    CASE WHEN TG_OP = 'INSERT' THEN NEW.total_amount ELSE 0 END,
    CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
    CASE WHEN NEW.status = 'cancelled' THEN 1 ELSE 0 END
  )
  ON CONFLICT (shop_id, date) DO UPDATE SET
    total_orders = shop_statistics.total_orders + CASE WHEN TG_OP = 'INSERT' THEN 1 ELSE 0 END,
    total_revenue = shop_statistics.total_revenue + 
      CASE 
        WHEN TG_OP = 'UPDATE' AND OLD.status != 'completed' AND NEW.status = 'completed' THEN NEW.total_amount
        WHEN TG_OP = 'UPDATE' AND OLD.status = 'completed' AND NEW.status = 'cancelled' THEN -OLD.total_amount
        ELSE 0
      END,
    completed_orders = shop_statistics.completed_orders + 
      CASE 
        WHEN TG_OP = 'UPDATE' AND OLD.status != 'completed' AND NEW.status = 'completed' THEN 1
        WHEN TG_OP = 'UPDATE' AND OLD.status = 'completed' AND NEW.status != 'completed' THEN -1
        ELSE 0
      END,
    cancelled_orders = shop_statistics.cancelled_orders + 
      CASE 
        WHEN TG_OP = 'UPDATE' AND OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN 1
        WHEN TG_OP = 'UPDATE' AND OLD.status = 'cancelled' AND NEW.status != 'cancelled' THEN -1
        ELSE 0
      END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_statistics_on_order_change AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_shop_statistics();

-- ============================================================================
-- FUNCTION: Mark message as read and update read_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_message_read_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_read = false AND NEW.is_read = true THEN
    NEW.read_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_message_read_timestamp BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_message_read_at();

-- ============================================================================
-- FUNCTION: Mark notification as read and update read_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_notification_read_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_read = false AND NEW.is_read = true THEN
    NEW.read_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notification_read_timestamp BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_notification_read_at();

-- ============================================================================
-- FUNCTION: Calculate if order is late
-- ============================================================================
CREATE OR REPLACE FUNCTION check_order_lateness()
RETURNS TRIGGER AS $$
BEGIN
  -- An order is late if it's in 'preparing' status and current time > estimated_ready_time
  IF NEW.status = 'preparing' AND NEW.estimated_ready_time IS NOT NULL THEN
    NEW.is_late = (NOW() > NEW.estimated_ready_time);
  ELSIF NEW.status IN ('ready', 'completed', 'cancelled') THEN
    -- Reset late flag when order moves to final stages
    NEW.is_late = false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_order_late_status BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION check_order_lateness();

-- ============================================================================
-- FUNCTION: Create notification when order status changes
-- ============================================================================
CREATE OR REPLACE FUNCTION create_order_status_notification()
RETURNS TRIGGER AS $$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
  notification_type TEXT;
  notification_priority TEXT;
BEGIN
  -- Only create notification if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    notification_type := 'order_update';
    notification_priority := 'normal';
    
    -- Generate notification based on new status
    CASE NEW.status
      WHEN 'preparing' THEN
        notification_title := 'Order Accepted';
        notification_message := 'Your order ' || NEW.order_number || ' is now being prepared!';
      WHEN 'ready' THEN
        notification_title := 'Order Ready!';
        notification_message := 'Your order ' || NEW.order_number || ' is ready for ' || NEW.service_type || '!';
        notification_priority := 'high';
      WHEN 'completed' THEN
        notification_title := 'Order Completed';
        notification_message := 'Thank you! Your order ' || NEW.order_number || ' has been completed.';
      WHEN 'cancelled' THEN
        notification_title := 'Order Cancelled';
        notification_message := 'Your order ' || NEW.order_number || ' has been cancelled.';
        notification_priority := 'high';
      ELSE
        RETURN NEW; -- Don't create notification for other statuses
    END CASE;
    
    -- Insert notification for student
    INSERT INTO notifications (user_id, type, title, message, related_order_id, priority)
    VALUES (NEW.student_id, notification_type, notification_title, notification_message, NEW.id, notification_priority);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_status_notification AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION create_order_status_notification();

-- ============================================================================
-- FUNCTION: Create notification when message is sent
-- ============================================================================
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  order_num TEXT;
BEGIN
  -- Get sender name
  SELECT name INTO sender_name FROM users WHERE id = NEW.sender_id;
  
  -- Get order number
  SELECT order_number INTO order_num FROM orders WHERE id = NEW.order_id;
  
  -- Create notification for recipient
  INSERT INTO notifications (
    user_id, 
    type, 
    title, 
    message, 
    related_order_id,
    related_message_id,
    priority
  )
  VALUES (
    NEW.recipient_id,
    'message',
    'New Message from ' || sender_name,
    'You have a new message about order ' || order_num,
    NEW.order_id,
    NEW.id,
    'normal'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_message_notification_trigger AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION create_message_notification();

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to get unread notification count for a user
CREATE OR REPLACE FUNCTION get_unread_notification_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  count INTEGER;
BEGIN
  SELECT COUNT(*) INTO count
  FROM notifications
  WHERE user_id = user_uuid AND is_read = false;
  
  RETURN count;
END;
$$ LANGUAGE plpgsql;

-- Function to get unread message count for a user
CREATE OR REPLACE FUNCTION get_unread_message_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  count INTEGER;
BEGIN
  SELECT COUNT(*) INTO count
  FROM messages
  WHERE recipient_id = user_uuid AND is_read = false;
  
  RETURN count;
END;
$$ LANGUAGE plpgsql;

-- Function to get active orders count for a shop
CREATE OR REPLACE FUNCTION get_active_orders_count(shop_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  count INTEGER;
BEGIN
  SELECT COUNT(*) INTO count
  FROM orders
  WHERE shop_id = shop_uuid 
    AND status IN ('pending', 'preparing', 'ready');
  
  RETURN count;
END;
$$ LANGUAGE plpgsql;

-- Function to get today's revenue for a shop
CREATE OR REPLACE FUNCTION get_today_revenue(shop_uuid UUID)
RETURNS DECIMAL AS $$
DECLARE
  revenue DECIMAL;
BEGIN
  SELECT COALESCE(SUM(total_amount), 0) INTO revenue
  FROM orders
  WHERE shop_id = shop_uuid 
    AND DATE(ordered_at) = CURRENT_DATE
    AND status = 'completed';
  
  RETURN revenue;
END;
$$ LANGUAGE plpgsql;
