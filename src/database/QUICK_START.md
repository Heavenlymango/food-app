# Quick Start Guide - Campus Food Ordering Database

This guide will help you set up the database in 10 minutes.

## Prerequisites

- A Supabase account (free tier works fine) OR
- PostgreSQL 12+ installed locally

## Method 1: Supabase (Easiest - Recommended)

### Step 1: Create Supabase Project (2 minutes)

1. Go to https://supabase.com
2. Click "Start your project"
3. Sign in with GitHub/Google
4. Click "New Project"
5. Fill in:
   - Name: `campus-food-ordering`
   - Database Password: (save this!)
   - Region: Choose closest to you
6. Click "Create new project"
7. Wait ~2 minutes for setup

### Step 2: Get Your Credentials (1 minute)

1. In your Supabase project, go to **Settings** → **API**
2. Copy these values (you'll need them):
   ```
   Project URL: https://xxxxx.supabase.co
   anon public key: eyJhbGci...
   service_role key: eyJhbGci... (keep secret!)
   ```

### Step 3: Run Database Migrations (5 minutes)

1. In Supabase, go to **SQL Editor**
2. Click "New Query"
3. Copy and paste content from `/database/01_schema.sql`
4. Click "Run"
5. Repeat for:
   - `02_indexes.sql`
   - `03_functions_triggers.sql`
   - `04_seed_data.sql` (optional - sample data)

### Step 4: Update Your App (2 minutes)

Update your app's environment variables:

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... (SERVER ONLY!)
```

### Step 5: Test Connection

Run this query in SQL Editor to verify:
```sql
SELECT COUNT(*) as shop_count FROM shops;
-- Should return 25 if you ran seed data
```

✅ **Done! Your database is ready!**

---

## Method 2: Local PostgreSQL

### Step 1: Install PostgreSQL

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql-14
sudo systemctl start postgresql
```

**Windows:**
Download from https://www.postgresql.org/download/windows/

### Step 2: Create Database

```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE campus_food_ordering;

# Exit psql
\q
```

### Step 3: Run Migrations

```bash
# Navigate to your project directory
cd /path/to/your/project

# Run migrations in order
psql -U postgres -d campus_food_ordering -f database/01_schema.sql
psql -U postgres -d campus_food_ordering -f database/02_indexes.sql
psql -U postgres -d campus_food_ordering -f database/03_functions_triggers.sql
psql -U postgres -d campus_food_ordering -f database/04_seed_data.sql
```

### Step 4: Configure Connection

Update your app's connection string:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/campus_food_ordering
```

### Step 5: Verify

```bash
psql -U postgres -d campus_food_ordering -c "SELECT COUNT(*) FROM shops;"
```

✅ **Done! Local database is ready!**

---

## Method 3: Docker (For Development)

### One-Command Setup

```bash
# Create and start PostgreSQL container
docker run --name campus-food-db \
  -e POSTGRES_PASSWORD=mysecretpassword \
  -e POSTGRES_DB=campus_food_ordering \
  -p 5432:5432 \
  -d postgres:14

# Wait 10 seconds for startup
sleep 10

# Run migrations
cat database/01_schema.sql database/02_indexes.sql database/03_functions_triggers.sql database/04_seed_data.sql | \
docker exec -i campus-food-db psql -U postgres -d campus_food_ordering
```

### Verify

```bash
docker exec -it campus-food-db psql -U postgres -d campus_food_ordering -c "SELECT COUNT(*) FROM shops;"
```

### Stop/Start

```bash
# Stop
docker stop campus-food-db

# Start
docker start campus-food-db

# Remove (WARNING: deletes all data)
docker rm -f campus-food-db
```

✅ **Done! Docker database is ready!**

---

## What's Next?

### 1. Update Seed Data Passwords

⚠️ **IMPORTANT**: The seed data uses placeholder passwords. Before production:

```javascript
// Install bcrypt
npm install bcrypt

// Hash passwords
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash('your-secure-password', 10);

// Update 04_seed_data.sql with real hashes
```

### 2. Test API Connection

Create a test file `test-db.js`:

```javascript
// For Supabase
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_ANON_KEY'
)

// Test query
const { data, error } = await supabase
  .from('shops')
  .select('*')
  .limit(5)

console.log('Shops:', data)
```

Run: `node test-db.js`

### 3. Enable Row Level Security (Production Only)

In Supabase SQL Editor:

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Add policies (example)
CREATE POLICY "Students can view own orders" 
  ON orders FOR SELECT 
  USING (student_id = auth.uid());
```

### 4. Set Up Backups

**Supabase**: Automatic backups included

**Local PostgreSQL**:
```bash
# Daily backup script
pg_dump -U postgres campus_food_ordering > backup_$(date +%Y%m%d).sql

# Add to crontab
0 2 * * * /path/to/backup-script.sh
```

---

## Troubleshooting

### "psql: command not found"

**Solution**: Add PostgreSQL to PATH or use full path:
```bash
# macOS
export PATH="/usr/local/opt/postgresql@14/bin:$PATH"

# Ubuntu
sudo apt install postgresql-client
```

### "FATAL: password authentication failed"

**Solution**: Reset PostgreSQL password:
```bash
sudo -u postgres psql
ALTER USER postgres PASSWORD 'newpassword';
```

### "relation already exists"

**Solution**: Database already has tables. To reset:
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
-- Then re-run migrations
```

### Supabase migrations won't run

**Solution**: 
1. Check for syntax errors
2. Run migrations one at a time
3. Check error message in SQL Editor
4. Clear browser cache and retry

---

## Sample Data Overview

After running `04_seed_data.sql`, you'll have:

### Test Accounts

**Sellers** (shop managers):
- Email: `shop.a1@rupp.edu.kh` to `shop.b9@rupp.edu.kh` (RUPP campus)
- Email: `shop.ifl.nc@ifl.edu.kh` etc. (IFL campus)
- Password: `seller123` (placeholder - change in production!)

**Students**:
- Email: `student1@rupp.edu.kh` to `student4@ifl.edu.kh`
- Password: `student123` (placeholder - change in production!)

### Shops
- 18 RUPP campus shops (A1-A10, B1-B9)
- 7 IFL campus shops (Nature Café, DMC Alumni, etc.)
- Each shop has a category and description

### Menu Items
- Sample items for each shop
- Includes prices, health classifications, and prep times
- **Note**: Seed file has samples; add all items from your menuData.ts

---

## Performance Tips

1. **Index frequently queried columns** ✅ (already done in 02_indexes.sql)
2. **Use connection pooling** in production
3. **Enable query caching** if using Supabase
4. **Monitor slow queries** regularly
5. **Vacuum database** monthly: `VACUUM ANALYZE;`

---

## Need Help?

- 📖 Read the full [README.md](./README.md)
- 🐛 Check [GitHub Issues](https://github.com/supabase/supabase/issues)
- 💬 Ask in [Supabase Discord](https://discord.supabase.com)
- 📧 Email support: [your-email@example.com]

---

## Checklist

Before going to production:

- [ ] ✅ Database created
- [ ] ✅ All migrations run successfully
- [ ] ⚠️ Changed default passwords
- [ ] ⚠️ Set up environment variables
- [ ] ⚠️ Tested database connection
- [ ] ⚠️ Enabled Row Level Security (Supabase)
- [ ] ⚠️ Configured backups
- [ ] ⚠️ Added all menu items from menuData.ts
- [ ] ⚠️ Set up monitoring
- [ ] ⚠️ SSL enabled for connections

---

**Estimated Total Time**: 10-30 minutes depending on method chosen

Good luck! 🚀
