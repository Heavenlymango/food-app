-- Campus Food Ordering System - Indexes & Performance Optimization
-- PostgreSQL / Supabase Compatible

-- ============================================================================
-- USERS TABLE INDEXES
-- ============================================================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- ============================================================================
-- SHOPS TABLE INDEXES
-- ============================================================================
CREATE INDEX idx_shops_shop_id ON shops(shop_id);
CREATE INDEX idx_shops_campus ON shops(campus);
CREATE INDEX idx_shops_is_active ON shops(is_active);
CREATE INDEX idx_shops_owner_id ON shops(owner_id);
CREATE INDEX idx_shops_category ON shops(category);

-- ============================================================================
-- MENU ITEMS TABLE INDEXES
-- ============================================================================
CREATE INDEX idx_menu_items_shop_id ON menu_items(shop_id);
CREATE INDEX idx_menu_items_is_available ON menu_items(is_available);
CREATE INDEX idx_menu_items_health_classification ON menu_items(health_classification);
CREATE INDEX idx_menu_items_category ON menu_items(category);
CREATE INDEX idx_menu_items_price ON menu_items(price);
-- Composite index for common queries
CREATE INDEX idx_menu_items_shop_available ON menu_items(shop_id, is_available);

-- ============================================================================
-- ORDERS TABLE INDEXES
-- ============================================================================
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_student_id ON orders(student_id);
CREATE INDEX idx_orders_shop_id ON orders(shop_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_ordered_at ON orders(ordered_at DESC);
CREATE INDEX idx_orders_is_late ON orders(is_late);
CREATE INDEX idx_orders_service_type ON orders(service_type);
-- Composite indexes for common queries
CREATE INDEX idx_orders_shop_status ON orders(shop_id, status);
CREATE INDEX idx_orders_student_status ON orders(student_id, status);
CREATE INDEX idx_orders_shop_date ON orders(shop_id, ordered_at DESC);
CREATE INDEX idx_orders_status_date ON orders(status, ordered_at DESC);

-- ============================================================================
-- ORDER ITEMS TABLE INDEXES
-- ============================================================================
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_menu_item_id ON order_items(menu_item_id);

-- ============================================================================
-- ORDER STATUS HISTORY TABLE INDEXES
-- ============================================================================
CREATE INDEX idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX idx_order_status_history_changed_at ON order_status_history(changed_at DESC);
CREATE INDEX idx_order_status_history_changed_by ON order_status_history(changed_by);

-- ============================================================================
-- MESSAGES TABLE INDEXES
-- ============================================================================
CREATE INDEX idx_messages_order_id ON messages(order_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_messages_is_read ON messages(is_read);
CREATE INDEX idx_messages_sent_at ON messages(sent_at DESC);
-- Composite index for unread messages
CREATE INDEX idx_messages_recipient_unread ON messages(recipient_id, is_read, sent_at DESC);

-- ============================================================================
-- NOTIFICATIONS TABLE INDEXES
-- ============================================================================
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_priority ON notifications(priority);
CREATE INDEX idx_notifications_related_order ON notifications(related_order_id);
-- Composite index for unread notifications
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);

-- ============================================================================
-- USER PREFERENCES TABLE INDEXES
-- ============================================================================
-- Primary key on user_id is already indexed

-- ============================================================================
-- SHOP STATISTICS TABLE INDEXES
-- ============================================================================
CREATE INDEX idx_shop_statistics_shop_id ON shop_statistics(shop_id);
CREATE INDEX idx_shop_statistics_date ON shop_statistics(date DESC);
-- Composite index for date range queries
CREATE INDEX idx_shop_statistics_shop_date ON shop_statistics(shop_id, date DESC);

-- ============================================================================
-- REVIEWS TABLE INDEXES
-- ============================================================================
CREATE INDEX idx_reviews_order_id ON reviews(order_id);
CREATE INDEX idx_reviews_student_id ON reviews(student_id);
CREATE INDEX idx_reviews_shop_id ON reviews(shop_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);
-- Composite index for shop reviews
CREATE INDEX idx_reviews_shop_rating ON reviews(shop_id, rating, created_at DESC);

-- ============================================================================
-- PERFORMANCE OPTIMIZATION COMMENTS
-- ============================================================================
-- These indexes are designed to optimize:
-- 1. Student order history queries (student_id + status/date)
-- 2. Seller dashboard queries (shop_id + status)
-- 3. Real-time order tracking (order_number, status)
-- 4. Notification fetching (user_id + is_read + created_at)
-- 5. Message queries (recipient_id + is_read)
-- 6. Menu browsing (shop_id + is_available)
-- 7. Analytics and reporting (date-based queries)
