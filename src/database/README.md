# Campus Food Ordering System - Database Documentation

## Overview

This directory contains the complete database schema and migration files for the Campus Food Ordering System. The database is designed to work with **PostgreSQL 12+** and is fully compatible with **Supabase**.

## Database Architecture

The system uses a **three-tier architecture**:
```
Frontend (React) → Server (Hono/Edge Functions) → Database (PostgreSQL)
```

## Files Structure

```
/database/
├── README.md                    # This file
├── 01_schema.sql               # Core database tables and constraints
├── 02_indexes.sql              # Performance indexes
├── 03_functions_triggers.sql   # Database functions and triggers
└── 04_seed_data.sql            # Sample data for testing
```

## Database Schema

### Core Tables

#### 1. **users**
Stores both students and sellers (shop owners).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | VARCHAR(255) | Unique email address |
| password_hash | VARCHAR(255) | Bcrypt hashed password |
| role | VARCHAR(20) | 'student' or 'seller' |
| name | VARCHAR(255) | Full name |
| student_id | VARCHAR(50) | Student ID (students only) |
| phone | VARCHAR(20) | Contact phone |
| created_at | TIMESTAMP | Account creation time |
| updated_at | TIMESTAMP | Last update time |

#### 2. **shops**
Campus food shops/cafeterias.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| shop_id | VARCHAR(50) | Unique shop identifier (e.g., 'A1', 'IFL-NC') |
| name | VARCHAR(255) | Shop display name |
| campus | VARCHAR(50) | 'RUPP' or 'IFL' |
| category | VARCHAR(50) | Shop category (e.g., 'Khmer', 'BBQ') |
| description | TEXT | Shop description |
| owner_id | UUID | Foreign key to users table |
| is_active | BOOLEAN | Shop operational status |
| created_at | TIMESTAMP | Shop creation time |
| updated_at | TIMESTAMP | Last update time |

#### 3. **menu_items**
Food and drink items available at shops.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| shop_id | UUID | Foreign key to shops |
| name | VARCHAR(255) | Item name |
| name_khmer | VARCHAR(255) | Khmer language name (optional) |
| price | DECIMAL(10,2) | Item price in USD |
| category | VARCHAR(100) | Item category |
| health_classification | VARCHAR(50) | 'healthy', 'moderate', or 'indulgent' |
| description | TEXT | Item description |
| image_url | TEXT | Image URL |
| is_available | BOOLEAN | Availability status |
| preparation_time_minutes | INTEGER | Estimated prep time |
| created_at | TIMESTAMP | Item creation time |
| updated_at | TIMESTAMP | Last update time |

#### 4. **orders**
Customer food orders with comprehensive tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| order_number | VARCHAR(50) | Unique order number (auto-generated) |
| student_id | UUID | Foreign key to users |
| shop_id | UUID | Foreign key to shops |
| total_amount | DECIMAL(10,2) | Total order cost |
| service_type | VARCHAR(20) | 'pickup' or 'dine-in' |
| status | VARCHAR(50) | Order status (see workflow below) |
| ordered_at | TIMESTAMP | Order placement time |
| accepted_at | TIMESTAMP | When seller accepted |
| ready_at | TIMESTAMP | When order ready |
| completed_at | TIMESTAMP | When order completed |
| cancelled_at | TIMESTAMP | When order cancelled |
| estimated_ready_time | TIMESTAMP | Estimated completion time |
| cancelled_by | VARCHAR(20) | 'student' or 'seller' |
| cancellation_reason | TEXT | Cancellation reason |
| cancellation_category | VARCHAR(50) | 'preset' or 'custom' |
| special_instructions | TEXT | Customer instructions |
| is_late | BOOLEAN | Late order flag |
| student_notified | BOOLEAN | Notification sent flag |
| created_at | TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | Last update time |

**Order Status Workflow** (4 Stages):
1. `pending` - Order received, waiting for seller acceptance
2. `preparing` - Seller accepted, food being prepared
3. `ready` - Food ready for pickup/serving
4. `completed` - Order fulfilled
5. `cancelled` - Order cancelled (can happen at any stage)

#### 5. **order_items**
Individual items within an order.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| order_id | UUID | Foreign key to orders |
| menu_item_id | UUID | Foreign key to menu_items |
| quantity | INTEGER | Item quantity |
| price_at_order | DECIMAL(10,2) | Price at time of order |
| item_name | VARCHAR(255) | Cached item name |
| created_at | TIMESTAMP | Item added time |

#### 6. **order_status_history**
Audit trail of all order status changes.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| order_id | UUID | Foreign key to orders |
| previous_status | VARCHAR(50) | Previous status |
| new_status | VARCHAR(50) | New status |
| changed_by | UUID | User who made the change |
| changed_at | TIMESTAMP | Change timestamp |
| notes | TEXT | Optional notes |

#### 7. **messages**
Shop-to-student communication about orders.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| order_id | UUID | Foreign key to orders |
| sender_id | UUID | Foreign key to users (sender) |
| recipient_id | UUID | Foreign key to users (recipient) |
| message | TEXT | Message content |
| is_read | BOOLEAN | Read status |
| sent_at | TIMESTAMP | Send time |
| read_at | TIMESTAMP | Read time |

#### 8. **notifications**
System notifications for users.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| type | VARCHAR(50) | 'order_update', 'message', 'system', 'promotion' |
| title | VARCHAR(255) | Notification title |
| message | TEXT | Notification message |
| related_order_id | UUID | Foreign key to orders (optional) |
| related_message_id | UUID | Foreign key to messages (optional) |
| is_read | BOOLEAN | Read status |
| priority | VARCHAR(20) | 'low', 'normal', 'high', 'urgent' |
| created_at | TIMESTAMP | Creation time |
| read_at | TIMESTAMP | Read time |

#### 9. **user_preferences**
User settings and preferences.

| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | Primary key, foreign key to users |
| notification_enabled | BOOLEAN | Notification toggle |
| email_notifications | BOOLEAN | Email notifications |
| favorite_shops | UUID[] | Array of favorite shop IDs |
| dietary_preferences | VARCHAR(50)[] | Dietary preferences array |
| theme | VARCHAR(20) | 'light', 'dark', 'auto' |
| language | VARCHAR(10) | 'en' or 'km' |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

#### 10. **shop_statistics**
Daily statistics for analytics.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| shop_id | UUID | Foreign key to shops |
| date | DATE | Statistics date |
| total_orders | INTEGER | Total orders |
| total_revenue | DECIMAL(10,2) | Total revenue |
| completed_orders | INTEGER | Completed orders count |
| cancelled_orders | INTEGER | Cancelled orders count |
| average_preparation_time | INTEGER | Avg prep time in minutes |
| created_at | TIMESTAMP | Record creation time |

#### 11. **reviews** (Optional - Future Feature)
Customer reviews for orders.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| order_id | UUID | Foreign key to orders (unique) |
| student_id | UUID | Foreign key to users |
| shop_id | UUID | Foreign key to shops |
| rating | INTEGER | Rating 1-5 |
| comment | TEXT | Review comment |
| created_at | TIMESTAMP | Review creation time |

## Database Functions & Triggers

### Automatic Triggers

1. **update_updated_at_column()** - Automatically updates `updated_at` timestamp on row updates
2. **track_order_status_change()** - Logs all status changes to order_status_history
3. **generate_order_number()** - Auto-generates unique order numbers (Format: ORD-YYYYMMDD-XXXX)
4. **update_shop_statistics()** - Updates daily statistics when orders are created/updated
5. **check_order_lateness()** - Automatically flags late orders
6. **create_order_status_notification()** - Creates notifications when order status changes
7. **create_message_notification()** - Creates notifications when messages are sent
8. **update_message_read_at()** - Updates read timestamp when messages are read
9. **update_notification_read_at()** - Updates read timestamp when notifications are read

### Utility Functions

```sql
-- Get unread notification count
SELECT get_unread_notification_count('user-uuid-here');

-- Get unread message count
SELECT get_unread_message_count('user-uuid-here');

-- Get active orders count for a shop
SELECT get_active_orders_count('shop-uuid-here');

-- Get today's revenue for a shop
SELECT get_today_revenue('shop-uuid-here');
```

## Installation Instructions

### Option 1: Supabase (Recommended)

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Wait for project initialization

2. **Run Migration Files**
   ```sql
   -- In Supabase SQL Editor, run files in order:
   -- 1. Run 01_schema.sql
   -- 2. Run 02_indexes.sql
   -- 3. Run 03_functions_triggers.sql
   -- 4. Run 04_seed_data.sql (optional, for testing)
   ```

3. **Configure Environment Variables**
   ```env
   SUPABASE_URL=your-project-url
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

### Option 2: Local PostgreSQL

1. **Install PostgreSQL 12+**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install postgresql-12
   
   # macOS
   brew install postgresql@12
   ```

2. **Create Database**
   ```bash
   createdb campus_food_ordering
   ```

3. **Run Migrations**
   ```bash
   psql -d campus_food_ordering -f database/01_schema.sql
   psql -d campus_food_ordering -f database/02_indexes.sql
   psql -d campus_food_ordering -f database/03_functions_triggers.sql
   psql -d campus_food_ordering -f database/04_seed_data.sql
   ```

### Option 3: Docker PostgreSQL

1. **Run PostgreSQL Container**
   ```bash
   docker run --name campus-food-db \
     -e POSTGRES_PASSWORD=yourpassword \
     -e POSTGRES_DB=campus_food_ordering \
     -p 5432:5432 \
     -d postgres:12
   ```

2. **Run Migrations**
   ```bash
   docker exec -i campus-food-db psql -U postgres -d campus_food_ordering < database/01_schema.sql
   docker exec -i campus-food-db psql -U postgres -d campus_food_ordering < database/02_indexes.sql
   docker exec -i campus-food-db psql -U postgres -d campus_food_ordering < database/03_functions_triggers.sql
   docker exec -i campus-food-db psql -U postgres -d campus_food_ordering < database/04_seed_data.sql
   ```

## Security Considerations

### Password Hashing

⚠️ **IMPORTANT**: The seed data file contains placeholder password hashes. Before deploying to production:

1. Install bcrypt library:
   ```bash
   npm install bcrypt
   ```

2. Hash passwords properly:
   ```javascript
   const bcrypt = require('bcrypt');
   const saltRounds = 10;
   const hash = await bcrypt.hash('password', saltRounds);
   ```

3. Replace placeholder hashes in `04_seed_data.sql`

### Database Security

1. **Never expose SERVICE_ROLE_KEY to frontend** - Use it only on the server
2. **Use Row Level Security (RLS)** in Supabase for production
3. **Implement API rate limiting** to prevent abuse
4. **Use prepared statements** to prevent SQL injection
5. **Enable SSL** for database connections in production

## Row Level Security (RLS) Policies

For Supabase deployment, add these RLS policies:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Example policies (customize as needed)

-- Users can read their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Students can view all shops
CREATE POLICY "Students can view shops" ON shops
  FOR SELECT TO authenticated
  USING (true);

-- Students can view available menu items
CREATE POLICY "Students can view menu items" ON menu_items
  FOR SELECT TO authenticated
  USING (is_available = true);

-- Students can view their own orders
CREATE POLICY "Students can view own orders" ON orders
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- Sellers can view orders for their shops
CREATE POLICY "Sellers can view shop orders" ON orders
  FOR SELECT TO authenticated
  USING (
    shop_id IN (
      SELECT id FROM shops WHERE owner_id = auth.uid()
    )
  );
```

## Performance Optimization

### Indexed Columns

All frequently queried columns have indexes (see `02_indexes.sql`):
- User emails
- Order numbers and statuses
- Shop IDs and campus
- Menu item availability
- Notification read status
- Message read status
- Date-based queries

### Query Optimization Tips

1. **Use composite indexes** for multi-column WHERE clauses
2. **Limit result sets** with pagination
3. **Use SELECT only needed columns** instead of SELECT *
4. **Cache frequently accessed data** in application layer
5. **Use database functions** for complex calculations

## Backup and Recovery

### Automated Backups (Supabase)

Supabase provides automatic daily backups. Enable Point-in-Time Recovery (PITR) for production.

### Manual Backup (PostgreSQL)

```bash
# Backup
pg_dump -U postgres -d campus_food_ordering > backup.sql

# Restore
psql -U postgres -d campus_food_ordering < backup.sql
```

## Monitoring

### Key Metrics to Monitor

1. **Query Performance**
   - Slow queries (> 100ms)
   - Connection pool usage
   - Cache hit ratio

2. **Table Statistics**
   - Active orders count
   - Daily order volume
   - Revenue per shop

3. **System Health**
   - Database size
   - Index bloat
   - Dead tuples

### Useful Monitoring Queries

```sql
-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Active orders by shop
SELECT 
  s.name,
  COUNT(o.id) as active_orders
FROM shops s
LEFT JOIN orders o ON s.id = o.shop_id AND o.status IN ('pending', 'preparing', 'ready')
GROUP BY s.name
ORDER BY active_orders DESC;
```

## Troubleshooting

### Common Issues

1. **"relation does not exist"**
   - Solution: Ensure migrations run in correct order

2. **"permission denied"**
   - Solution: Check user permissions and RLS policies

3. **"duplicate key value"**
   - Solution: Check for existing data before inserting

4. **Slow queries**
   - Solution: Analyze with EXPLAIN and add indexes

### Getting Help

- Check Supabase docs: https://supabase.com/docs
- PostgreSQL docs: https://www.postgresql.org/docs/
- GitHub Issues: [Your repo URL]

## Maintenance Tasks

### Daily
- Monitor active orders
- Check error logs

### Weekly
- Review slow queries
- Analyze shop statistics
- Check disk space

### Monthly
- Update statistics: `ANALYZE;`
- Reindex if needed: `REINDEX DATABASE campus_food_ordering;`
- Review and archive old data

## License

[Your License Here]

## Contact

For questions or support:
- Email: [Your email]
- Documentation: [Your docs URL]
