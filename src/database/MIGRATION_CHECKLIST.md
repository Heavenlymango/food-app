# Database Migration Checklist

Use this checklist when deploying the database to ensure nothing is missed.

## Pre-Migration Checklist

### Planning Phase

- [ ] Database type chosen (Supabase / Local PostgreSQL / Docker)
- [ ] Database credentials secured
- [ ] Backup strategy planned
- [ ] Rollback plan documented
- [ ] Team notified of migration schedule
- [ ] Maintenance window scheduled (if production)

### Environment Setup

- [ ] PostgreSQL 12+ installed (or Supabase project created)
- [ ] Database created
- [ ] Database user permissions verified
- [ ] Connection string configured
- [ ] `.env` file created from `.env.example`
- [ ] Environment variables secured (not in version control)

---

## Migration Execution

### Step 1: Schema Creation

- [ ] Run `01_schema.sql` successfully
- [ ] Verify all tables created:
  ```sql
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public' 
  ORDER BY table_name;
  ```
  Expected tables (14 total):
  - [ ] users
  - [ ] shops
  - [ ] menu_items
  - [ ] orders
  - [ ] order_items
  - [ ] order_status_history
  - [ ] messages
  - [ ] notifications
  - [ ] user_preferences
  - [ ] shop_statistics
  - [ ] reviews

- [ ] Verify foreign key constraints:
  ```sql
  SELECT COUNT(*) FROM information_schema.table_constraints 
  WHERE constraint_type = 'FOREIGN KEY';
  ```
  Expected: ~15+ foreign keys

### Step 2: Indexes

- [ ] Run `02_indexes.sql` successfully
- [ ] Verify indexes created:
  ```sql
  SELECT tablename, indexname FROM pg_indexes 
  WHERE schemaname = 'public' 
  ORDER BY tablename, indexname;
  ```
  Expected: 40+ indexes

### Step 3: Functions & Triggers

- [ ] Run `03_functions_triggers.sql` successfully
- [ ] Verify functions created:
  ```sql
  SELECT routine_name FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  ORDER BY routine_name;
  ```
  Expected functions:
  - [ ] update_updated_at_column
  - [ ] track_order_status_change
  - [ ] generate_order_number
  - [ ] update_shop_statistics
  - [ ] check_order_lateness
  - [ ] create_order_status_notification
  - [ ] create_message_notification
  - [ ] update_message_read_at
  - [ ] update_notification_read_at
  - [ ] get_unread_notification_count
  - [ ] get_unread_message_count
  - [ ] get_active_orders_count
  - [ ] get_today_revenue

- [ ] Verify triggers created:
  ```sql
  SELECT trigger_name, event_object_table 
  FROM information_schema.triggers 
  WHERE trigger_schema = 'public';
  ```
  Expected triggers: 10+

### Step 4: Seed Data (Optional)

- [ ] Run `04_seed_data.sql` (if testing/development)
- [ ] Verify sample data:
  ```sql
  SELECT 'users' as table, COUNT(*) as count FROM users
  UNION ALL
  SELECT 'shops', COUNT(*) FROM shops
  UNION ALL
  SELECT 'menu_items', COUNT(*) FROM menu_items;
  ```
  Expected:
  - Users: ~30 (25 sellers + sample students)
  - Shops: 25
  - Menu items: 10+ (sample data)

---

## Post-Migration Verification

### Data Integrity

- [ ] All tables accessible
- [ ] Sample INSERT works:
  ```sql
  INSERT INTO users (email, password_hash, role, name) 
  VALUES ('test@test.com', 'hash', 'student', 'Test') 
  RETURNING id;
  DELETE FROM users WHERE email = 'test@test.com';
  ```

- [ ] Foreign keys enforced:
  ```sql
  -- Should fail:
  INSERT INTO orders (student_id, shop_id, total_amount, service_type) 
  VALUES ('00000000-0000-0000-0000-000000000000', 
          '00000000-0000-0000-0000-000000000000', 
          10.00, 'pickup');
  ```

- [ ] Check constraints working:
  ```sql
  -- Should fail (invalid role):
  INSERT INTO users (email, password_hash, role, name) 
  VALUES ('bad@test.com', 'hash', 'invalid_role', 'Test');
  ```

### Trigger Verification

- [ ] Test order number generation:
  ```sql
  -- Create a test order and verify order_number is auto-generated
  INSERT INTO orders (student_id, shop_id, total_amount, service_type) 
  SELECT 
    (SELECT id FROM users WHERE role = 'student' LIMIT 1),
    (SELECT id FROM shops LIMIT 1),
    10.00,
    'pickup'
  RETURNING order_number; -- Should be ORD-YYYYMMDD-0001 format
  ```

- [ ] Test status change notification:
  ```sql
  -- Update order status and verify notification created
  UPDATE orders SET status = 'preparing' WHERE id = (last test order);
  SELECT * FROM notifications WHERE related_order_id = (last test order);
  ```

- [ ] Test updated_at trigger:
  ```sql
  -- Update any record and verify updated_at changed
  SELECT updated_at FROM shops WHERE id = (SELECT id FROM shops LIMIT 1);
  UPDATE shops SET description = 'Test' WHERE id = (SELECT id FROM shops LIMIT 1);
  SELECT updated_at FROM shops WHERE id = (SELECT id FROM shops LIMIT 1);
  -- Should show new timestamp
  ```

### Performance Verification

- [ ] Query performance acceptable:
  ```sql
  EXPLAIN ANALYZE 
  SELECT * FROM orders WHERE shop_id = (SELECT id FROM shops LIMIT 1);
  -- Execution time should be < 10ms
  ```

- [ ] Index usage verified:
  ```sql
  EXPLAIN ANALYZE 
  SELECT * FROM orders WHERE order_number = 'ORD-20260112-0001';
  -- Should use idx_orders_order_number
  ```

### Function Testing

- [ ] Test utility functions:
  ```sql
  -- Get unread notification count
  SELECT get_unread_notification_count(
    (SELECT id FROM users LIMIT 1)
  );
  
  -- Get shop revenue
  SELECT get_today_revenue(
    (SELECT id FROM shops LIMIT 1)
  );
  ```

---

## Security Configuration

### Supabase Specific

- [ ] Row Level Security (RLS) policies created (if production)
- [ ] API keys secured
- [ ] Service role key never exposed to frontend
- [ ] CORS configured properly
- [ ] Rate limiting enabled

### General PostgreSQL

- [ ] Database user has minimum required permissions
- [ ] SSL enabled for connections
- [ ] Firewall rules configured
- [ ] Backup user created (read-only)
- [ ] Connection pooling configured

### Application Level

- [ ] Environment variables set correctly
- [ ] Password hashing implemented (bcrypt)
- [ ] JWT authentication configured
- [ ] API endpoints secured
- [ ] Input validation implemented

---

## Production-Specific Checklist

### Before Going Live

- [ ] **IMPORTANT**: Change all seed data passwords
- [ ] Remove or disable sample student accounts
- [ ] Add real shop data
- [ ] Add complete menu data from menuData.ts
- [ ] Test with production-like data volume
- [ ] Performance test with expected load
- [ ] Backup created before migration
- [ ] Rollback script prepared

### Monitoring Setup

- [ ] Query performance monitoring enabled
- [ ] Error logging configured
- [ ] Alerts set up for:
  - [ ] Slow queries (> 100ms)
  - [ ] Failed queries
  - [ ] Database connection errors
  - [ ] Disk space warnings
  - [ ] High CPU/memory usage

- [ ] Dashboard created for:
  - [ ] Active orders
  - [ ] Daily revenue
  - [ ] System health
  - [ ] Error rates

### Backup Configuration

- [ ] Automated daily backups enabled
- [ ] Backup retention policy set (30 days minimum)
- [ ] Backup restoration tested
- [ ] Point-in-time recovery enabled (if Supabase)
- [ ] Backup location secured
- [ ] Backup verification scheduled

---

## Post-Migration Tasks

### Immediate (Day 1)

- [ ] Monitor error logs
- [ ] Verify all features working
- [ ] Test critical user flows:
  - [ ] Student registration
  - [ ] Seller login
  - [ ] Order placement
  - [ ] Order status updates
  - [ ] Notifications
  - [ ] Messages

- [ ] Check database performance
- [ ] Verify backup completed

### Week 1

- [ ] Review slow query log
- [ ] Analyze usage patterns
- [ ] Optimize queries if needed
- [ ] Add missing indexes if needed
- [ ] Update documentation
- [ ] Train support team

### Month 1

- [ ] Run VACUUM ANALYZE
- [ ] Review and archive old data
- [ ] Analyze growth trends
- [ ] Plan capacity upgrades if needed
- [ ] Review security logs
- [ ] Update monitoring thresholds

---

## Rollback Plan

### If Migration Fails

1. **Stop application**
   ```bash
   # Stop your application servers
   ```

2. **Restore from backup**
   ```bash
   # For local PostgreSQL
   psql -U postgres -d campus_food_ordering < backup.sql
   
   # For Supabase
   # Use dashboard to restore from snapshot
   ```

3. **Verify restoration**
   ```sql
   SELECT COUNT(*) FROM shops;
   -- Should match pre-migration count
   ```

4. **Restart application with old code**

5. **Investigate issue**
   - Check error logs
   - Review failed migration SQL
   - Test in development environment

6. **Plan retry**
   - Fix identified issues
   - Schedule new migration window
   - Update team

---

## Common Issues & Solutions

### Issue: "relation already exists"

**Solution**: Database already has tables
```sql
-- Check existing tables
\dt

-- Drop and recreate (DANGER: loses data)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
-- Then re-run migrations
```

### Issue: "permission denied"

**Solution**: Grant permissions
```sql
GRANT ALL PRIVILEGES ON DATABASE campus_food_ordering TO your_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO your_user;
```

### Issue: Triggers not firing

**Solution**: Verify trigger creation
```sql
-- List triggers
SELECT * FROM pg_trigger WHERE tgname LIKE '%order%';

-- Recreate if missing
-- Re-run 03_functions_triggers.sql
```

### Issue: Slow queries

**Solution**: Analyze and add indexes
```sql
-- Analyze query
EXPLAIN ANALYZE SELECT * FROM orders WHERE ...;

-- Add index if needed
CREATE INDEX idx_custom ON table_name(column_name);

-- Update statistics
ANALYZE orders;
```

---

## Sign-Off

### Development Environment

- [ ] Migration completed by: ________________
- [ ] Date: ________________
- [ ] Verified by: ________________
- [ ] Issues encountered: ________________

### Staging Environment

- [ ] Migration completed by: ________________
- [ ] Date: ________________
- [ ] Verified by: ________________
- [ ] Performance tested: Yes / No
- [ ] Issues encountered: ________________

### Production Environment

- [ ] Migration completed by: ________________
- [ ] Date: ________________
- [ ] Verified by: ________________
- [ ] Backup confirmed: Yes / No
- [ ] Rollback plan ready: Yes / No
- [ ] Team notified: Yes / No
- [ ] Issues encountered: ________________

---

## Additional Resources

- [README.md](./README.md) - Full documentation
- [QUICK_START.md](./QUICK_START.md) - Quick setup guide
- [API_REFERENCE.md](./API_REFERENCE.md) - SQL query examples
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase Documentation](https://supabase.com/docs)

---

**Last Updated**: January 2026
