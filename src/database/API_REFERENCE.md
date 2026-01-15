# Database API Reference

This document provides common SQL queries and API patterns for the Campus Food Ordering System.

## Table of Contents

1. [User Operations](#user-operations)
2. [Shop Operations](#shop-operations)
3. [Menu Operations](#menu-operations)
4. [Order Operations](#order-operations)
5. [Notification Operations](#notification-operations)
6. [Message Operations](#message-operations)
7. [Statistics & Analytics](#statistics--analytics)

---

## User Operations

### Create Student Account

```sql
INSERT INTO users (email, password_hash, role, name, student_id, phone)
VALUES (
  'student@rupp.edu.kh',
  '$2b$10$hashed_password',
  'student',
  'Student Name',
  'RUPP2024001',
  '+855-12-345-678'
)
RETURNING id, email, name, role, student_id;
```

### Authenticate User

```sql
SELECT id, email, password_hash, role, name, student_id
FROM users
WHERE email = 'user@example.com';
-- Verify password hash in application code using bcrypt
```

### Get User Profile

```sql
SELECT 
  u.id,
  u.email,
  u.name,
  u.role,
  u.student_id,
  u.phone,
  u.created_at,
  up.notification_enabled,
  up.favorite_shops,
  up.dietary_preferences
FROM users u
LEFT JOIN user_preferences up ON u.id = up.user_id
WHERE u.id = $1;
```

### Update User Preferences

```sql
INSERT INTO user_preferences (
  user_id, 
  notification_enabled, 
  favorite_shops, 
  dietary_preferences,
  theme,
  language
)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (user_id) DO UPDATE SET
  notification_enabled = EXCLUDED.notification_enabled,
  favorite_shops = EXCLUDED.favorite_shops,
  dietary_preferences = EXCLUDED.dietary_preferences,
  theme = EXCLUDED.theme,
  language = EXCLUDED.language,
  updated_at = NOW();
```

---

## Shop Operations

### Get All Shops by Campus

```sql
SELECT 
  id,
  shop_id,
  name,
  campus,
  category,
  description,
  is_active
FROM shops
WHERE campus = 'RUPP' AND is_active = true
ORDER BY shop_id;
```

### Get Shop Details with Menu Count

```sql
SELECT 
  s.id,
  s.shop_id,
  s.name,
  s.campus,
  s.category,
  s.description,
  COUNT(mi.id) FILTER (WHERE mi.is_available = true) as available_items,
  COUNT(mi.id) FILTER (WHERE mi.health_classification = 'healthy') as healthy_items
FROM shops s
LEFT JOIN menu_items mi ON s.id = mi.shop_id
WHERE s.id = $1
GROUP BY s.id;
```

### Get Shop Statistics (Today)

```sql
SELECT 
  s.name,
  COUNT(o.id) FILTER (WHERE o.status = 'pending') as pending_orders,
  COUNT(o.id) FILTER (WHERE o.status = 'preparing') as preparing_orders,
  COUNT(o.id) FILTER (WHERE o.status = 'ready') as ready_orders,
  COUNT(o.id) FILTER (WHERE o.status = 'completed') as completed_orders,
  COUNT(o.id) FILTER (WHERE o.is_late = true) as late_orders,
  COALESCE(SUM(o.total_amount) FILTER (WHERE o.status = 'completed'), 0) as revenue_today
FROM shops s
LEFT JOIN orders o ON s.id = o.shop_id AND DATE(o.ordered_at) = CURRENT_DATE
WHERE s.id = $1
GROUP BY s.id, s.name;
```

---

## Menu Operations

### Get Menu Items by Shop

```sql
SELECT 
  id,
  name,
  name_khmer,
  price,
  category,
  health_classification,
  description,
  image_url,
  preparation_time_minutes,
  is_available
FROM menu_items
WHERE shop_id = $1 AND is_available = true
ORDER BY category, name;
```

### Search Menu Items

```sql
SELECT 
  mi.id,
  mi.name,
  mi.price,
  mi.health_classification,
  mi.image_url,
  s.shop_id,
  s.name as shop_name,
  s.campus
FROM menu_items mi
JOIN shops s ON mi.shop_id = s.id
WHERE 
  mi.is_available = true
  AND (
    mi.name ILIKE '%' || $1 || '%' 
    OR mi.description ILIKE '%' || $1 || '%'
  )
  AND ($2::text IS NULL OR s.campus = $2)
  AND ($3::text IS NULL OR mi.health_classification = $3)
  AND ($4::decimal IS NULL OR mi.price <= $4)
ORDER BY mi.name
LIMIT 20;
```

### Get Healthy Food Recommendations

```sql
SELECT 
  mi.id,
  mi.name,
  mi.price,
  mi.image_url,
  mi.preparation_time_minutes,
  s.name as shop_name,
  s.shop_id
FROM menu_items mi
JOIN shops s ON mi.shop_id = s.id
WHERE 
  mi.health_classification = 'healthy'
  AND mi.is_available = true
  AND s.is_active = true
  AND s.campus = $1
ORDER BY mi.price ASC
LIMIT 10;
```

### Get Budget-Friendly Options

```sql
SELECT 
  mi.id,
  mi.name,
  mi.price,
  mi.image_url,
  s.name as shop_name
FROM menu_items mi
JOIN shops s ON mi.shop_id = s.id
WHERE 
  mi.is_available = true
  AND mi.price <= 2.00
  AND s.campus = $1
ORDER BY mi.price ASC
LIMIT 10;
```

### Update Menu Item Availability

```sql
UPDATE menu_items
SET 
  is_available = $2,
  updated_at = NOW()
WHERE id = $1 AND shop_id = $3
RETURNING *;
```

---

## Order Operations

### Create Order

```sql
-- Step 1: Insert order
INSERT INTO orders (
  student_id,
  shop_id,
  total_amount,
  service_type,
  special_instructions,
  estimated_ready_time
)
VALUES (
  $1, -- student_id
  $2, -- shop_id
  $3, -- total_amount
  $4, -- service_type ('pickup' or 'dine-in')
  $5, -- special_instructions
  NOW() + INTERVAL '15 minutes' -- estimated_ready_time
)
RETURNING id, order_number;

-- Step 2: Insert order items
INSERT INTO order_items (order_id, menu_item_id, quantity, price_at_order, item_name)
SELECT 
  $1, -- order_id from step 1
  id,
  $2, -- quantity
  price,
  name
FROM menu_items
WHERE id = $3;
```

### Get Student Orders

```sql
SELECT 
  o.id,
  o.order_number,
  o.status,
  o.service_type,
  o.total_amount,
  o.ordered_at,
  o.estimated_ready_time,
  o.is_late,
  s.name as shop_name,
  s.shop_id,
  s.campus,
  json_agg(
    json_build_object(
      'id', oi.id,
      'name', oi.item_name,
      'quantity', oi.quantity,
      'price', oi.price_at_order
    )
  ) as items
FROM orders o
JOIN shops s ON o.shop_id = s.id
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.student_id = $1
GROUP BY o.id, s.id
ORDER BY o.ordered_at DESC
LIMIT 50;
```

### Get Shop Orders by Status

```sql
SELECT 
  o.id,
  o.order_number,
  o.status,
  o.service_type,
  o.total_amount,
  o.ordered_at,
  o.estimated_ready_time,
  o.is_late,
  o.special_instructions,
  u.name as student_name,
  u.phone as student_phone,
  json_agg(
    json_build_object(
      'name', oi.item_name,
      'quantity', oi.quantity,
      'price', oi.price_at_order
    )
  ) as items
FROM orders o
JOIN users u ON o.student_id = u.id
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE 
  o.shop_id = $1
  AND o.status = ANY($2::text[]) -- e.g., ARRAY['pending', 'preparing']
GROUP BY o.id, u.id
ORDER BY 
  CASE o.status
    WHEN 'pending' THEN 1
    WHEN 'preparing' THEN 2
    WHEN 'ready' THEN 3
    ELSE 4
  END,
  o.ordered_at ASC;
```

### Update Order Status

```sql
UPDATE orders
SET 
  status = $2,
  updated_at = NOW()
WHERE id = $1
RETURNING *;

-- The trigger will automatically:
-- 1. Log to order_status_history
-- 2. Update timestamp fields (accepted_at, ready_at, etc.)
-- 3. Create notification for student
```

### Cancel Order

```sql
UPDATE orders
SET 
  status = 'cancelled',
  cancelled_by = $2, -- 'student' or 'seller'
  cancellation_reason = $3,
  cancellation_category = $4, -- 'preset' or 'custom'
  cancelled_at = NOW(),
  updated_at = NOW()
WHERE id = $1
RETURNING *;
```

### Get Order Details with Full Info

```sql
SELECT 
  o.*,
  s.name as shop_name,
  s.shop_id,
  u.name as student_name,
  u.email as student_email,
  u.phone as student_phone,
  json_agg(
    json_build_object(
      'id', oi.id,
      'menu_item_id', oi.menu_item_id,
      'name', oi.item_name,
      'quantity', oi.quantity,
      'price', oi.price_at_order
    ) ORDER BY oi.id
  ) as items
FROM orders o
JOIN shops s ON o.shop_id = s.id
JOIN users u ON o.student_id = u.id
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.id = $1
GROUP BY o.id, s.id, u.id;
```

### Get Order Status History

```sql
SELECT 
  osh.previous_status,
  osh.new_status,
  osh.changed_at,
  osh.notes,
  u.name as changed_by_name,
  u.role as changed_by_role
FROM order_status_history osh
LEFT JOIN users u ON osh.changed_by = u.id
WHERE osh.order_id = $1
ORDER BY osh.changed_at ASC;
```

---

## Notification Operations

### Get User Notifications

```sql
SELECT 
  n.id,
  n.type,
  n.title,
  n.message,
  n.priority,
  n.is_read,
  n.created_at,
  n.related_order_id,
  o.order_number
FROM notifications n
LEFT JOIN orders o ON n.related_order_id = o.id
WHERE n.user_id = $1
ORDER BY 
  n.is_read ASC,
  n.priority DESC,
  n.created_at DESC
LIMIT 50;
```

### Mark Notification as Read

```sql
UPDATE notifications
SET is_read = true
WHERE id = $1 AND user_id = $2
RETURNING *;
```

### Mark All Notifications as Read

```sql
UPDATE notifications
SET is_read = true
WHERE user_id = $1 AND is_read = false
RETURNING COUNT(*);
```

### Create Custom Notification

```sql
INSERT INTO notifications (
  user_id,
  type,
  title,
  message,
  priority,
  related_order_id
)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;
```

### Delete Old Notifications

```sql
DELETE FROM notifications
WHERE 
  user_id = $1
  AND is_read = true
  AND created_at < NOW() - INTERVAL '30 days'
RETURNING COUNT(*);
```

---

## Message Operations

### Send Message (Shop to Student)

```sql
INSERT INTO messages (
  order_id,
  sender_id,
  recipient_id,
  message
)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- Trigger will automatically create a notification
```

### Get Conversation

```sql
SELECT 
  m.id,
  m.message,
  m.sent_at,
  m.is_read,
  m.sender_id,
  sender.name as sender_name,
  sender.role as sender_role
FROM messages m
JOIN users sender ON m.sender_id = sender.id
WHERE m.order_id = $1
ORDER BY m.sent_at ASC;
```

### Get Unread Messages Count

```sql
SELECT COUNT(*) as unread_count
FROM messages
WHERE recipient_id = $1 AND is_read = false;
```

### Mark Message as Read

```sql
UPDATE messages
SET is_read = true
WHERE id = $1 AND recipient_id = $2
RETURNING *;
```

---

## Statistics & Analytics

### Daily Shop Revenue

```sql
SELECT 
  DATE(o.ordered_at) as date,
  COUNT(o.id) as total_orders,
  COUNT(o.id) FILTER (WHERE o.status = 'completed') as completed_orders,
  COUNT(o.id) FILTER (WHERE o.status = 'cancelled') as cancelled_orders,
  COALESCE(SUM(o.total_amount) FILTER (WHERE o.status = 'completed'), 0) as revenue
FROM orders o
WHERE 
  o.shop_id = $1
  AND o.ordered_at >= $2
  AND o.ordered_at < $3
GROUP BY DATE(o.ordered_at)
ORDER BY date DESC;
```

### Popular Menu Items

```sql
SELECT 
  mi.name,
  mi.price,
  COUNT(oi.id) as times_ordered,
  SUM(oi.quantity) as total_quantity,
  SUM(oi.price_at_order * oi.quantity) as total_revenue
FROM order_items oi
JOIN menu_items mi ON oi.menu_item_id = mi.id
JOIN orders o ON oi.order_id = o.id
WHERE 
  mi.shop_id = $1
  AND o.status = 'completed'
  AND o.ordered_at >= NOW() - INTERVAL '30 days'
GROUP BY mi.id
ORDER BY times_ordered DESC
LIMIT 10;
```

### Peak Hours Analysis

```sql
SELECT 
  EXTRACT(HOUR FROM o.ordered_at) as hour,
  COUNT(o.id) as order_count,
  COALESCE(SUM(o.total_amount), 0) as revenue
FROM orders o
WHERE 
  o.shop_id = $1
  AND o.status = 'completed'
  AND o.ordered_at >= NOW() - INTERVAL '7 days'
GROUP BY EXTRACT(HOUR FROM o.ordered_at)
ORDER BY hour;
```

### Average Preparation Time

```sql
SELECT 
  AVG(EXTRACT(EPOCH FROM (ready_at - accepted_at)) / 60) as avg_prep_minutes
FROM orders
WHERE 
  shop_id = $1
  AND status = 'completed'
  AND accepted_at IS NOT NULL
  AND ready_at IS NOT NULL
  AND ordered_at >= NOW() - INTERVAL '7 days';
```

### Customer Retention Rate

```sql
SELECT 
  COUNT(DISTINCT student_id) as total_customers,
  COUNT(DISTINCT student_id) FILTER (
    WHERE student_id IN (
      SELECT student_id 
      FROM orders 
      WHERE shop_id = $1 
        AND ordered_at >= NOW() - INTERVAL '30 days'
      GROUP BY student_id 
      HAVING COUNT(*) > 1
    )
  ) as returning_customers
FROM orders
WHERE shop_id = $1
  AND ordered_at >= NOW() - INTERVAL '30 days';
```

### Health Classification Distribution

```sql
SELECT 
  mi.health_classification,
  COUNT(oi.id) as orders_count,
  SUM(oi.quantity) as total_quantity
FROM order_items oi
JOIN menu_items mi ON oi.menu_item_id = mi.id
JOIN orders o ON oi.order_id = o.id
WHERE 
  mi.shop_id = $1
  AND o.status = 'completed'
  AND o.ordered_at >= NOW() - INTERVAL '30 days'
GROUP BY mi.health_classification;
```

---

## Utility Queries

### Check Database Health

```sql
-- Table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Active connections
SELECT COUNT(*) FROM pg_stat_activity;

-- Slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Cleanup Old Data

```sql
-- Archive completed orders older than 90 days
-- (Consider moving to archive table instead of deleting)
DELETE FROM orders
WHERE status = 'completed'
  AND completed_at < NOW() - INTERVAL '90 days'
RETURNING COUNT(*);

-- Clean up read notifications older than 30 days
DELETE FROM notifications
WHERE is_read = true
  AND read_at < NOW() - INTERVAL '30 days'
RETURNING COUNT(*);
```

---

## Performance Tips

1. **Always use indexes** on WHERE, JOIN, and ORDER BY columns
2. **Use LIMIT** for pagination
3. **Use prepared statements** to prevent SQL injection
4. **Use connection pooling** in production
5. **Monitor slow queries** with pg_stat_statements
6. **Use EXPLAIN ANALYZE** to optimize complex queries

Example:
```sql
EXPLAIN ANALYZE
SELECT * FROM orders WHERE shop_id = $1;
```

---

## Security Best Practices

1. **Never expose service role key** to frontend
2. **Always validate user input**
3. **Use parameterized queries** ($1, $2, etc.)
4. **Implement rate limiting** on API endpoints
5. **Enable Row Level Security (RLS)** in Supabase
6. **Hash passwords** with bcrypt (salt rounds: 10-12)
7. **Use HTTPS** for all connections
8. **Regularly rotate secrets**

---

## Common Patterns

### Transaction Example

```sql
BEGIN;

-- Create order
INSERT INTO orders (...) VALUES (...);

-- Add order items
INSERT INTO order_items (...) VALUES (...);

-- Update inventory (if applicable)
UPDATE menu_items SET stock = stock - 1 WHERE id = ...;

COMMIT;
-- Or ROLLBACK; if error
```

### Conditional Update

```sql
UPDATE orders
SET status = 'preparing'
WHERE id = $1 
  AND status = 'pending'
  AND shop_id IN (
    SELECT id FROM shops WHERE owner_id = $2
  )
RETURNING *;
```

### Bulk Insert

```sql
INSERT INTO order_items (order_id, menu_item_id, quantity, price_at_order, item_name)
SELECT 
  $1 as order_id,
  unnest($2::uuid[]) as menu_item_id,
  unnest($3::integer[]) as quantity,
  unnest($4::decimal[]) as price_at_order,
  unnest($5::text[]) as item_name;
```

---

For more examples, see the [README.md](./README.md) or [QUICK_START.md](./QUICK_START.md).
