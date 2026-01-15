# Database Migration Order

Run the migration files in this exact order to ensure all dependencies are met.

---

## ✅ Migration Steps

### Step 1: Core Schema (REQUIRED)
```bash
psql -d your_database -f database/01_schema.sql
```
**What it does:** Creates core tables (users, shops, menu_items, orders, notifications, etc.)  
**Time:** ~5 seconds  
**Tables created:** 14

---

### Step 2: Performance Indexes (REQUIRED)
```bash
psql -d your_database -f database/02_indexes.sql
```
**What it does:** Adds performance indexes for fast queries  
**Time:** ~10 seconds  
**Indexes created:** 40+

---

### Step 3: Functions & Triggers (REQUIRED)
```bash
psql -d your_database -f database/03_functions_triggers.sql
```
**What it does:** Adds automation (order numbers, notifications, statistics)  
**Time:** ~5 seconds  
**Functions created:** 13  
**Triggers created:** 10

---

### Step 4: Sample Data (OPTIONAL - for testing)
```bash
psql -d your_database -f database/04_seed_data.sql
```
**What it does:** Adds sample shops, users, and menu items  
**Time:** ~2 seconds  
**⚠️ Note:** Contains placeholder passwords - update before production!

---

### Step 5: Authentication & Admin (RECOMMENDED)
```bash
psql -d your_database -f database/05_authentication_admin.sql
```
**What it does:** Adds sessions, tokens, 2FA, admin permissions, audit logs  
**Time:** ~10 seconds  
**Tables created:** 10  
**Features added:**
- Session management
- Password reset
- Email verification
- Two-factor authentication
- Admin system with 25+ permissions
- Login history
- Admin activity logging

---

### Step 6: User Profiles & Loyalty (RECOMMENDED)
```bash
psql -d your_database -f database/06_user_profiles_loyalty.sql
```
**What it does:** Adds loyalty program, addresses, payment methods, favorites  
**Time:** ~8 seconds  
**Tables created:** 12  
**Features added:**
- User addresses
- Payment method storage
- Loyalty points system (4 tiers)
- Rewards catalog
- Referrals
- Favorite shops/items
- Saved orders
- User activity tracking

---

### Step 7: Shop Management (RECOMMENDED)
```bash
psql -d your_database -f database/07_shop_management.sql
```
**What it does:** Adds operating hours, closures, shop settings, menu variants  
**Time:** ~8 seconds  
**Tables created:** 11  
**Features added:**
- Operating hours schedule
- Holiday closures
- Shop images/gallery
- Shop settings
- Menu categories
- Menu item variants (sizes, add-ons)
- Shop tags (vegetarian, halal, etc.)
- Staff management
- Peak hours tracking

---

### Step 8: Payments & Transactions (REQUIRED for payments)
```bash
psql -d your_database -f database/08_payments_transactions.sql
```
**What it does:** Adds payment processing, refunds, wallet, commissions  
**Time:** ~10 seconds  
**Tables created:** 8  
**Features added:**
- Payment transactions
- Refund system
- User wallets/store credit
- Payment gateway integration
- Webhook handling
- Commission tracking
- Shop payouts

---

### Step 9: Promotions & Marketing (OPTIONAL)
```bash
psql -d your_database -f database/09_promotions_marketing.sql
```
**What it does:** Adds promo codes, flash sales, announcements, campaigns  
**Time:** ~10 seconds  
**Tables created:** 11  
**Features added:**
- Promo codes/coupons
- Flash sales/BOGO deals
- Announcements/banners
- Notification campaigns
- Email templates
- User segmentation
- Campaign analytics

---

### Step 10: Support & Configuration (RECOMMENDED)
```bash
psql -d your_database -f database/10_support_system_config.sql
```
**What it does:** Adds support tickets, FAQ, system settings, feature flags  
**Time:** ~10 seconds  
**Tables created:** 14  
**Features added:**
- Support ticket system
- Enhanced reviews with photos
- General feedback
- FAQ system
- System settings
- Feature flags
- Maintenance windows
- App version tracking
- Analytics events

---

## 🎯 Recommended Configurations

### Minimal Setup (MVP)
For basic food ordering functionality:
```bash
01_schema.sql ✅ (REQUIRED)
02_indexes.sql ✅ (REQUIRED)
03_functions_triggers.sql ✅ (REQUIRED)
04_seed_data.sql (for testing only)
```
**Total tables:** 14  
**Features:** Core ordering, notifications, basic reviews

---

### Standard Setup (Production-Ready)
For a complete food ordering app:
```bash
01_schema.sql ✅ (REQUIRED)
02_indexes.sql ✅ (REQUIRED)
03_functions_triggers.sql ✅ (REQUIRED)
05_authentication_admin.sql ✅
06_user_profiles_loyalty.sql ✅
07_shop_management.sql ✅
08_payments_transactions.sql ✅
10_support_system_config.sql ✅
```
**Total tables:** 60+  
**Features:** Everything except marketing automation

---

### Complete Setup (Enterprise)
For maximum features:
```bash
01_schema.sql ✅ (REQUIRED)
02_indexes.sql ✅ (REQUIRED)
03_functions_triggers.sql ✅ (REQUIRED)
05_authentication_admin.sql ✅
06_user_profiles_loyalty.sql ✅
07_shop_management.sql ✅
08_payments_transactions.sql ✅
09_promotions_marketing.sql ✅
10_support_system_config.sql ✅
```
**Total tables:** 70+  
**Features:** All features including marketing campaigns

---

## 🔄 Migration Commands

### For Supabase
1. Go to SQL Editor
2. Copy and paste each file's content
3. Run in order
4. Check for errors

### For Local PostgreSQL
```bash
# All at once (Standard Setup)
cat database/01_schema.sql \
    database/02_indexes.sql \
    database/03_functions_triggers.sql \
    database/05_authentication_admin.sql \
    database/06_user_profiles_loyalty.sql \
    database/07_shop_management.sql \
    database/08_payments_transactions.sql \
    database/10_support_system_config.sql \
  | psql -U postgres -d campus_food_ordering

# Or one by one
for file in database/{01..10}_*.sql; do
  echo "Running $file..."
  psql -U postgres -d campus_food_ordering -f "$file"
  if [ $? -ne 0 ]; then
    echo "Error in $file"
    exit 1
  fi
done
```

### For Docker
```bash
# Copy files into container
docker cp database/ campus-food-db:/tmp/

# Run migrations
docker exec -it campus-food-db bash -c "
  cd /tmp/database && \
  for f in {01..10}_*.sql; do \
    echo \"Running \$f...\"; \
    psql -U postgres -d campus_food_ordering -f \"\$f\"; \
  done
"
```

---

## ⚠️ Important Notes

### Dependencies
- File 05-10 depend on file 01 (users, shops, menu_items, orders tables)
- File 06 creates triggers on users table (from file 01)
- File 07 extends shops and menu_items tables
- File 08 references orders table
- File 09 references users and menu_items
- File 10 extends reviews table

### Order Matters!
❌ Don't run file 06 before file 01  
❌ Don't run file 08 before file 01  
✅ Always run files 01-03 first  
✅ Files 05-10 can be run in any order AFTER 01-03

### Skip Optional Files
If you don't need marketing features, skip file 09.  
If you don't need loyalty, skip file 06.  
But we recommend all files for best experience!

---

## 🧪 Testing Migrations

After running migrations, verify with:

```sql
-- Count tables
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';

-- Count indexes
SELECT COUNT(*) FROM pg_indexes 
WHERE schemaname = 'public';

-- Count functions
SELECT COUNT(*) FROM information_schema.routines 
WHERE routine_schema = 'public';

-- List all tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Expected results (Complete Setup):
- Tables: 70+
- Indexes: 100+
- Functions: 30+

---

## 🔙 Rollback

If something goes wrong:

```sql
-- DANGER: This deletes everything!
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- Then re-run migrations
```

For individual file rollback, you'll need to manually drop tables created by that file.

---

## 📊 Migration Timeline

| File | Time | Complexity |
|------|------|------------|
| 01 | 5s | Low |
| 02 | 10s | Low |
| 03 | 5s | Medium |
| 04 | 2s | Low |
| 05 | 10s | Medium |
| 06 | 8s | Medium |
| 07 | 8s | Medium |
| 08 | 10s | High |
| 09 | 10s | Medium |
| 10 | 10s | Medium |
| **Total** | **~80s** | - |

---

## ✅ Post-Migration Checklist

After running all migrations:

- [ ] Verify table count matches expected
- [ ] Test user registration
- [ ] Test shop creation
- [ ] Test order placement
- [ ] Check notifications work
- [ ] Verify triggers fire correctly
- [ ] Test promo code validation (if using file 09)
- [ ] Check loyalty points earn (if using file 06)
- [ ] Verify payment transaction logging (if using file 08)
- [ ] Test support ticket creation (if using file 10)

---

## 🆘 Common Issues

### "relation already exists"
**Solution:** Table already created. Either skip this file or drop and recreate.

### "function does not exist"
**Solution:** File 03 not run yet. Run files in order.

### "column does not exist"
**Solution:** File extending a table run before base table created.

### "permission denied"
**Solution:** Database user needs CREATE permissions.

---

## 📞 Need Help?

- Check [README.md](./README.md) for detailed documentation
- See [QUICK_START.md](./QUICK_START.md) for step-by-step setup
- Review [MIGRATION_CHECKLIST.md](./MIGRATION_CHECKLIST.md) for production deployment

---

**Last Updated**: January 2026
