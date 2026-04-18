-- Campus Food Ordering System — Functions & Triggers
-- Run after 02_indexes.sql

-- ============================================================================
-- updated_at maintenance
-- ============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at          BEFORE UPDATE ON users          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_shops_updated_at          BEFORE UPDATE ON shops          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_menu_items_updated_at     BEFORE UPDATE ON menu_items     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_orders_updated_at         BEFORE UPDATE ON orders         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_user_prefs_updated_at     BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_shop_ann_updated_at       BEFORE UPDATE ON shop_announcements FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_item_stock_updated_at     BEFORE UPDATE ON item_daily_stock FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- Order number  (ORD-YYYYMMDD-NNNN)
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  today TEXT;
  seq   INTEGER;
BEGIN
  today := TO_CHAR(NOW(), 'YYYYMMDD');
  SELECT COUNT(*) + 1 INTO seq
  FROM orders
  WHERE DATE(ordered_at) = CURRENT_DATE;
  NEW.order_number := 'ORD-' || today || '-' || LPAD(seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- ============================================================================
-- Queue number  (per-shop daily counter, 1-999)
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_queue_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  SELECT COALESCE(MAX(queue_number), 0) + 1 INTO NEW.queue_number
  FROM orders
  WHERE shop_id = NEW.shop_id
    AND DATE(ordered_at) = CURRENT_DATE;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_queue_number
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION generate_queue_number();

-- ============================================================================
-- Order status: auto-fill timestamps + log history
-- ============================================================================
CREATE OR REPLACE FUNCTION on_order_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- log transition
  INSERT INTO order_status_history (order_id, previous_status, new_status)
  VALUES (NEW.id, OLD.status, NEW.status);

  -- auto-fill stage timestamps
  IF NEW.status = 'preparing'  AND NEW.accepted_at  IS NULL THEN NEW.accepted_at  := NOW(); END IF;
  IF NEW.status = 'ready'      AND NEW.ready_at      IS NULL THEN NEW.ready_at      := NOW(); END IF;
  IF NEW.status = 'completed'  AND NEW.completed_at  IS NULL THEN NEW.completed_at  := NOW(); END IF;
  IF NEW.status = 'cancelled'  AND NEW.cancelled_at  IS NULL THEN NEW.cancelled_at  := NOW(); END IF;

  -- lateness flag
  IF NEW.status = 'preparing' AND NEW.estimated_ready_time IS NOT NULL THEN
    NEW.is_late := (NOW() > NEW.estimated_ready_time);
  ELSIF NEW.status IN ('ready','completed','cancelled') THEN
    NEW.is_late := false;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_order_status_change
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION on_order_status_change();

-- ============================================================================
-- Notifications: auto-create when order status changes
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_student_on_order_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  ttl  TEXT;
  msg  TEXT;
  prio TEXT := 'normal';
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;

  CASE NEW.status
    WHEN 'preparing' THEN
      ttl := 'Order Accepted';
      msg := 'Your order ' || NEW.order_number || ' is being prepared.';
    WHEN 'ready' THEN
      ttl  := 'Ready for Pickup!';
      msg  := 'Order ' || NEW.order_number || ' (Queue #' || COALESCE(NEW.queue_number::TEXT, '—') || ') is ready.';
      prio := 'high';
    WHEN 'completed' THEN
      ttl := 'Order Completed';
      msg := 'Thank you! Order ' || NEW.order_number || ' has been completed.';
    WHEN 'cancelled' THEN
      ttl  := 'Order Cancelled';
      msg  := 'Order ' || NEW.order_number || ' was cancelled. ' || COALESCE(NEW.cancellation_reason, '');
      prio := 'high';
    ELSE
      RETURN NEW;
  END CASE;

  INSERT INTO notifications (user_id, type, title, message, related_order_id, priority)
  VALUES (NEW.student_id, 'order_update', ttl, msg, NEW.id, prio);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_student
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION notify_student_on_order_change();

-- ============================================================================
-- Notifications: auto-create when a message is sent
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_on_message()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  sender_name TEXT;
  order_num   TEXT;
BEGIN
  SELECT name         INTO sender_name FROM users  WHERE id = NEW.sender_id;
  SELECT order_number INTO order_num   FROM orders WHERE id = NEW.order_id;

  INSERT INTO notifications (user_id, type, title, message, related_order_id)
  VALUES (
    NEW.recipient_id,
    'message',
    'Message from ' || sender_name,
    'New message about order ' || order_num,
    NEW.order_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION notify_on_message();

-- ============================================================================
-- read_at: auto-fill when is_read flips to true
-- ============================================================================
CREATE OR REPLACE FUNCTION set_read_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.is_read = false AND NEW.is_read = true THEN
    NEW.read_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_msg_read_at   BEFORE UPDATE ON messages      FOR EACH ROW EXECUTE FUNCTION set_read_at();
CREATE TRIGGER trg_notif_read_at BEFORE UPDATE ON notifications  FOR EACH ROW EXECUTE FUNCTION set_read_at();

-- ============================================================================
-- Daily stock: decrement sold_count when an order item is inserted
-- ============================================================================
CREATE OR REPLACE FUNCTION decrement_daily_stock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  lim INTEGER;
BEGIN
  -- only if item has a daily stock limit
  SELECT daily_stock_limit INTO lim
  FROM menu_items WHERE id = NEW.menu_item_id;

  IF lim IS NULL THEN RETURN NEW; END IF;

  -- upsert today's stock row
  INSERT INTO item_daily_stock (menu_item_id, date, stock_limit, sold_count)
  VALUES (NEW.menu_item_id, CURRENT_DATE, lim, NEW.quantity)
  ON CONFLICT (menu_item_id, date) DO UPDATE
    SET sold_count = item_daily_stock.sold_count + NEW.quantity;

  -- mark unavailable when sold out
  UPDATE menu_items
  SET is_available = false
  WHERE id = NEW.menu_item_id
    AND (SELECT sold_count FROM item_daily_stock
         WHERE menu_item_id = NEW.menu_item_id AND date = CURRENT_DATE) >= lim;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_decrement_stock
  AFTER INSERT ON order_items
  FOR EACH ROW EXECUTE FUNCTION decrement_daily_stock();

-- ============================================================================
-- Shop statistics: maintain daily aggregate
-- ============================================================================
CREATE OR REPLACE FUNCTION update_shop_statistics()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  odate DATE := DATE(COALESCE(NEW.ordered_at, OLD.ordered_at));
  sid   UUID := COALESCE(NEW.shop_id, OLD.shop_id);
BEGIN
  INSERT INTO shop_statistics (shop_id, date, total_orders)
  VALUES (sid, odate, CASE WHEN TG_OP = 'INSERT' THEN 1 ELSE 0 END)
  ON CONFLICT (shop_id, date) DO UPDATE SET
    total_orders     = shop_statistics.total_orders
                       + CASE WHEN TG_OP = 'INSERT' THEN 1 ELSE 0 END,
    total_revenue    = shop_statistics.total_revenue
                       + CASE
                           WHEN TG_OP = 'UPDATE' AND OLD.status <> 'completed' AND NEW.status = 'completed' THEN  NEW.total_amount
                           WHEN TG_OP = 'UPDATE' AND OLD.status = 'completed'  AND NEW.status = 'cancelled' THEN -OLD.total_amount
                           ELSE 0
                         END,
    completed_orders = shop_statistics.completed_orders
                       + CASE
                           WHEN TG_OP = 'UPDATE' AND OLD.status <> 'completed' AND NEW.status = 'completed' THEN  1
                           WHEN TG_OP = 'UPDATE' AND OLD.status = 'completed'  AND NEW.status <> 'completed' THEN -1
                           ELSE 0
                         END,
    cancelled_orders = shop_statistics.cancelled_orders
                       + CASE
                           WHEN TG_OP = 'UPDATE' AND OLD.status <> 'cancelled' AND NEW.status = 'cancelled' THEN  1
                           WHEN TG_OP = 'UPDATE' AND OLD.status = 'cancelled'  AND NEW.status <> 'cancelled' THEN -1
                           ELSE 0
                         END;

  -- keep shop.total_orders in sync
  UPDATE shops SET total_orders = total_orders + CASE WHEN TG_OP = 'INSERT' THEN 1 ELSE 0 END
  WHERE id = sid;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_shop_statistics
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_shop_statistics();

-- ============================================================================
-- Reviews: keep shops.rating and total_reviews in sync
-- ============================================================================
CREATE OR REPLACE FUNCTION update_shop_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE shops
  SET
    rating        = (SELECT ROUND(AVG(rating)::NUMERIC, 2) FROM reviews WHERE shop_id = NEW.shop_id),
    total_reviews = (SELECT COUNT(*) FROM reviews WHERE shop_id = NEW.shop_id)
  WHERE id = NEW.shop_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_shop_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_shop_rating();

-- ============================================================================
-- Utility functions
-- ============================================================================
CREATE OR REPLACE FUNCTION get_unread_notifications(uid UUID)
RETURNS INTEGER LANGUAGE sql STABLE AS $$
  SELECT COUNT(*)::INTEGER FROM notifications WHERE user_id = uid AND is_read = false;
$$;

CREATE OR REPLACE FUNCTION get_active_orders(sid UUID)
RETURNS INTEGER LANGUAGE sql STABLE AS $$
  SELECT COUNT(*)::INTEGER FROM orders
  WHERE shop_id = sid AND status IN ('pending','preparing','ready');
$$;

CREATE OR REPLACE FUNCTION get_today_revenue(sid UUID)
RETURNS DECIMAL LANGUAGE sql STABLE AS $$
  SELECT COALESCE(SUM(total_amount), 0)
  FROM orders
  WHERE shop_id = sid AND DATE(ordered_at) = CURRENT_DATE AND status = 'completed';
$$;
