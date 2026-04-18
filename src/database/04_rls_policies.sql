-- Campus Food Ordering System — Row Level Security (Supabase)
-- Run after 03_functions_triggers.sql
-- Assumes Supabase auth: auth.uid() returns the logged-in user's UUID
--                        auth.jwt() ->> 'role' returns 'student' | 'seller' | 'admin'

-- ============================================================================
-- Enable RLS on every table
-- ============================================================================
ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops               ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_addons    ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_daily_stock    ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_operating_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_closures       ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_announcements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews             ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences    ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_statistics     ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS
-- ============================================================================
-- Anyone can read basic user info (name, role) — needed for seller lookups
CREATE POLICY users_select ON users FOR SELECT USING (true);
-- Users can only update their own row
CREATE POLICY users_update ON users FOR UPDATE USING (auth.uid() = id);
-- Only admins can insert/delete users directly (registration goes through Edge Function)
CREATE POLICY users_insert ON users FOR INSERT WITH CHECK (
  (auth.jwt() ->> 'role') = 'admin'
);
CREATE POLICY users_delete ON users FOR DELETE USING (
  (auth.jwt() ->> 'role') = 'admin'
);

-- ============================================================================
-- SHOPS
-- ============================================================================
CREATE POLICY shops_select ON shops FOR SELECT USING (true);

CREATE POLICY shops_insert ON shops FOR INSERT WITH CHECK (
  (auth.jwt() ->> 'role') IN ('seller', 'admin')
);
-- Sellers can only update their own shop; admins can update any
CREATE POLICY shops_update ON shops FOR UPDATE USING (
  auth.uid() = owner_id OR (auth.jwt() ->> 'role') = 'admin'
);
CREATE POLICY shops_delete ON shops FOR DELETE USING (
  (auth.jwt() ->> 'role') = 'admin'
);

-- ============================================================================
-- MENU CATEGORIES
-- ============================================================================
CREATE POLICY mc_select ON menu_categories FOR SELECT USING (true);

CREATE POLICY mc_insert ON menu_categories FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND owner_id = auth.uid())
  OR (auth.jwt() ->> 'role') = 'admin'
);
CREATE POLICY mc_update ON menu_categories FOR UPDATE USING (
  EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND owner_id = auth.uid())
  OR (auth.jwt() ->> 'role') = 'admin'
);
CREATE POLICY mc_delete ON menu_categories FOR DELETE USING (
  EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND owner_id = auth.uid())
  OR (auth.jwt() ->> 'role') = 'admin'
);

-- ============================================================================
-- MENU ITEMS
-- ============================================================================
CREATE POLICY mi_select ON menu_items FOR SELECT USING (true);

CREATE POLICY mi_insert ON menu_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND owner_id = auth.uid())
  OR (auth.jwt() ->> 'role') = 'admin'
);
CREATE POLICY mi_update ON menu_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND owner_id = auth.uid())
  OR (auth.jwt() ->> 'role') = 'admin'
);
CREATE POLICY mi_delete ON menu_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND owner_id = auth.uid())
  OR (auth.jwt() ->> 'role') = 'admin'
);

-- ============================================================================
-- MENU ITEM ADD-ONS
-- ============================================================================
CREATE POLICY addon_select ON menu_item_addons FOR SELECT USING (true);

CREATE POLICY addon_write ON menu_item_addons FOR ALL USING (
  EXISTS (
    SELECT 1 FROM menu_items mi
    JOIN shops s ON s.id = mi.shop_id
    WHERE mi.id = menu_item_id AND s.owner_id = auth.uid()
  )
  OR (auth.jwt() ->> 'role') = 'admin'
);

-- ============================================================================
-- ITEM DAILY STOCK
-- ============================================================================
CREATE POLICY stock_select ON item_daily_stock FOR SELECT USING (true);

-- Only the trigger (service role) writes stock rows; sellers can update their items' stock
CREATE POLICY stock_write ON item_daily_stock FOR ALL USING (
  EXISTS (
    SELECT 1 FROM menu_items mi
    JOIN shops s ON s.id = mi.shop_id
    WHERE mi.id = menu_item_id AND s.owner_id = auth.uid()
  )
  OR (auth.jwt() ->> 'role') = 'admin'
);

-- ============================================================================
-- ORDERS
-- ============================================================================
-- Students see only their own orders; sellers see orders for their shop; admins see all
CREATE POLICY orders_select ON orders FOR SELECT USING (
  auth.uid() = student_id
  OR EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND owner_id = auth.uid())
  OR (auth.jwt() ->> 'role') = 'admin'
);
-- Only students can create orders
CREATE POLICY orders_insert ON orders FOR INSERT WITH CHECK (
  auth.uid() = student_id
);
-- Sellers update their shop's orders (status changes); students can cancel their own
CREATE POLICY orders_update ON orders FOR UPDATE USING (
  auth.uid() = student_id
  OR EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND owner_id = auth.uid())
  OR (auth.jwt() ->> 'role') = 'admin'
);

-- ============================================================================
-- ORDER ITEMS
-- ============================================================================
CREATE POLICY oi_select ON order_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_id
      AND (o.student_id = auth.uid()
           OR EXISTS (SELECT 1 FROM shops WHERE id = o.shop_id AND owner_id = auth.uid())
           OR (auth.jwt() ->> 'role') = 'admin')
  )
);
CREATE POLICY oi_insert ON order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM orders WHERE id = order_id AND student_id = auth.uid())
);

-- ============================================================================
-- ORDER STATUS HISTORY
-- ============================================================================
CREATE POLICY osh_select ON order_status_history FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_id
      AND (o.student_id = auth.uid()
           OR EXISTS (SELECT 1 FROM shops WHERE id = o.shop_id AND owner_id = auth.uid())
           OR (auth.jwt() ->> 'role') = 'admin')
  )
);
-- History rows are written by trigger (service role) — no direct-write policy needed

-- ============================================================================
-- SHOP OPERATING HOURS & CLOSURES
-- ============================================================================
CREATE POLICY soh_select    ON shop_operating_hours FOR SELECT USING (true);
CREATE POLICY soh_write     ON shop_operating_hours FOR ALL USING (
  EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND owner_id = auth.uid())
  OR (auth.jwt() ->> 'role') = 'admin'
);

CREATE POLICY sc_select     ON shop_closures FOR SELECT USING (true);
CREATE POLICY sc_write      ON shop_closures FOR ALL USING (
  EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND owner_id = auth.uid())
  OR (auth.jwt() ->> 'role') = 'admin'
);

-- ============================================================================
-- SHOP ANNOUNCEMENTS
-- ============================================================================
CREATE POLICY sa_select ON shop_announcements FOR SELECT USING (true);
CREATE POLICY sa_write  ON shop_announcements FOR ALL USING (
  EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND owner_id = auth.uid())
  OR (auth.jwt() ->> 'role') = 'admin'
);

-- ============================================================================
-- MESSAGES
-- ============================================================================
CREATE POLICY msg_select ON messages FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = recipient_id
  OR (auth.jwt() ->> 'role') = 'admin'
);
CREATE POLICY msg_insert ON messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id
);
CREATE POLICY msg_update ON messages FOR UPDATE USING (
  auth.uid() = recipient_id -- only recipient marks as read
);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================
CREATE POLICY notif_select ON notifications FOR SELECT USING (
  auth.uid() = user_id
);
-- Notifications are created by triggers (service role); users can only mark them read
CREATE POLICY notif_update ON notifications FOR UPDATE USING (
  auth.uid() = user_id
);

-- ============================================================================
-- REVIEWS
-- ============================================================================
CREATE POLICY rev_select ON reviews FOR SELECT USING (true);
CREATE POLICY rev_insert ON reviews FOR INSERT WITH CHECK (
  auth.uid() = student_id
  AND EXISTS (SELECT 1 FROM orders WHERE id = order_id AND student_id = auth.uid() AND status = 'completed')
);
CREATE POLICY rev_update ON reviews FOR UPDATE USING (
  auth.uid() = student_id
);

-- ============================================================================
-- USER PREFERENCES
-- ============================================================================
CREATE POLICY prefs_select ON user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY prefs_write  ON user_preferences FOR ALL   USING (auth.uid() = user_id);

-- ============================================================================
-- SHOP STATISTICS
-- ============================================================================
-- Sellers see their own shop stats; admins see all
CREATE POLICY stats_select ON shop_statistics FOR SELECT USING (
  EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND owner_id = auth.uid())
  OR (auth.jwt() ->> 'role') = 'admin'
);
-- Stats are maintained by trigger (service role) — no direct write needed
