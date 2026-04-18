-- Campus Food Ordering System — Indexes
-- Run after 01_schema.sql

-- users
CREATE INDEX idx_users_email        ON users(email);
CREATE INDEX idx_users_student_id   ON users(student_id);
CREATE INDEX idx_users_role         ON users(role);

-- shops
CREATE INDEX idx_shops_campus       ON shops(campus);
CREATE INDEX idx_shops_owner_id     ON shops(owner_id);
CREATE INDEX idx_shops_is_active    ON shops(is_active);
CREATE INDEX idx_shops_category     ON shops(category);

-- menu_categories
CREATE INDEX idx_menu_cat_shop      ON menu_categories(shop_id);

-- menu_items
CREATE INDEX idx_mi_shop            ON menu_items(shop_id);
CREATE INDEX idx_mi_category        ON menu_items(category_id);
CREATE INDEX idx_mi_is_available    ON menu_items(is_available);
CREATE INDEX idx_mi_is_healthy      ON menu_items(is_healthy);
CREATE INDEX idx_mi_is_special      ON menu_items(is_special);
CREATE INDEX idx_mi_price           ON menu_items(price);
CREATE INDEX idx_mi_sort            ON menu_items(shop_id, sort_order);
-- for trgm fuzzy search on menu item names
CREATE INDEX idx_mi_name_trgm       ON menu_items USING gin(name gin_trgm_ops);

-- menu_item_addons
CREATE INDEX idx_addon_item         ON menu_item_addons(menu_item_id);

-- item_daily_stock
CREATE INDEX idx_stock_item_date    ON item_daily_stock(menu_item_id, date);

-- orders
CREATE INDEX idx_orders_student     ON orders(student_id);
CREATE INDEX idx_orders_shop        ON orders(shop_id);
CREATE INDEX idx_orders_status      ON orders(status);
CREATE INDEX idx_orders_ordered_at  ON orders(ordered_at DESC);
CREATE INDEX idx_orders_shop_status ON orders(shop_id, status);
CREATE INDEX idx_orders_stu_status  ON orders(student_id, status);
CREATE INDEX idx_orders_shop_date   ON orders(shop_id, ordered_at DESC);

-- order_items
CREATE INDEX idx_oi_order           ON order_items(order_id);
CREATE INDEX idx_oi_menu_item       ON order_items(menu_item_id);

-- order_status_history
CREATE INDEX idx_osh_order          ON order_status_history(order_id);
CREATE INDEX idx_osh_changed_at     ON order_status_history(changed_at DESC);

-- shop_operating_hours
CREATE INDEX idx_soh_shop           ON shop_operating_hours(shop_id);

-- shop_closures
CREATE INDEX idx_sc_shop            ON shop_closures(shop_id);
CREATE INDEX idx_sc_starts          ON shop_closures(starts_at);

-- shop_announcements
CREATE INDEX idx_sa_shop            ON shop_announcements(shop_id);
CREATE INDEX idx_sa_pinned          ON shop_announcements(shop_id, is_pinned);

-- messages
CREATE INDEX idx_msg_order          ON messages(order_id);
CREATE INDEX idx_msg_recipient      ON messages(recipient_id, is_read, sent_at DESC);

-- notifications
CREATE INDEX idx_notif_user         ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notif_order        ON notifications(related_order_id);

-- reviews
CREATE INDEX idx_rev_shop           ON reviews(shop_id, rating, created_at DESC);
CREATE INDEX idx_rev_student        ON reviews(student_id);

-- shop_statistics
CREATE INDEX idx_stat_shop_date     ON shop_statistics(shop_id, date DESC);
