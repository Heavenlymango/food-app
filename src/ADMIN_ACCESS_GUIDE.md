# Admin Dashboard Access Guide

## How to Access Admin Management

### 1. **Login as Admin**

To access the admin dashboard, you need to login with admin credentials:

1. Go to the login page
2. Enter your admin credentials:
   - **Admin ID**: Use `admin` (or whatever admin user ID you created)
   - **Password**: Your admin password

The system will automatically detect your role and redirect you to the admin dashboard.

---

## 2. **Creating Admin Accounts**

Admin accounts must be created in the database. There are two types:

- **admin**: Standard admin with specific permissions
- **super_admin**: Full access to everything

### Option A: Using SQL (Recommended for first admin)

Run this SQL in your database (Supabase SQL Editor):

```sql
-- Create a super admin account
INSERT INTO users (id, name, email, phone, role, password_hash)
VALUES (
  uuid_generate_v4(),
  'System Administrator',
  'admin@campusfood.edu.kh',
  '+855-12-000-0000',
  'super_admin',
  '$2a$10$YourBcryptHashedPasswordHere'
);

-- OR create a regular admin
INSERT INTO users (id, name, email, phone, role, password_hash)
VALUES (
  uuid_generate_v4(),
  'Admin Name',
  'admin@campusfood.edu.kh',
  '+855-12-000-0001',
  'admin',
  '$2a$10$YourBcryptHashedPasswordHere'
);
```

**Note**: Replace `$2a$10$YourBcryptHashedPasswordHere` with an actual bcrypt hash of your desired password.

### Option B: Via Backend API

Add an admin registration endpoint in your backend server:

```typescript
// In /supabase/functions/server/index.tsx
app.post('/make-server-36162e30/api/auth/register-admin', async (c) => {
  const { email, name, password, role } = await c.req.json();
  
  // Hash password
  const passwordHash = await hashPassword(password);
  
  // Create admin user
  const result = await kv.set(`user:${email}`, {
    id: generateUUID(),
    name,
    email,
    role: role || 'admin', // 'admin' or 'super_admin'
    passwordHash,
    createdAt: new Date().toISOString(),
  });
  
  return c.json({ success: true });
});
```

---

## 3. **Admin Dashboard Features**

Once logged in as admin, you'll see 5 main tabs:

### 📊 **Overview Tab**
- Total users, shops, orders statistics
- Revenue tracking
- Active orders count
- Today's order summary
- Recent orders table

### 👥 **Users Tab**
- View all users (students, sellers, admins)
- Search by name or email
- Filter by role
- Activate/deactivate user accounts
- View user details
- Edit user information
- Ban/unban users

### 🏪 **Shops Tab**
- View all campus shops
- Filter by campus (RUPP/IFL)
- Activate/deactivate shops
- View shop performance metrics
- Edit shop information
- Manage shop owners

### 📦 **Orders Tab**
- View all orders across platform
- Filter by status
- View order details
- Monitor order flow
- Track completion rates

### ⚙️ **Settings Tab**
- Enable/disable new registrations
- Maintenance mode toggle
- Email notification settings
- Platform commission configuration
- Support email management
- System-wide announcements
- Broadcast notifications

---

## 4. **Admin Permissions System**

### Super Admin
- Has all permissions automatically
- Can manage other admins
- Full platform control

### Regular Admin
Permissions are granted individually from this list:

**User Management:**
- view_users
- create_users
- edit_users
- delete_users
- ban_users
- verify_users

**Shop Management:**
- view_shops
- create_shops
- edit_shops
- delete_shops
- manage_shop_status

**Order Management:**
- view_all_orders
- cancel_any_order
- refund_orders

**Menu Management:**
- manage_menu_items
- approve_menu_items

**Analytics:**
- view_analytics
- export_data

**System:**
- manage_settings
- manage_permissions
- view_logs
- manage_announcements

**Support:**
- view_reports
- manage_reports
- view_support_tickets
- manage_support_tickets

---

## 5. **Quick Access Tips**

### For Development/Testing:
Create a test admin account:
```sql
INSERT INTO users (id, name, email, role, password_hash)
VALUES (
  uuid_generate_v4(),
  'Test Admin',
  'testadmin@campus.edu',
  'super_admin',
  -- Password: "admin123"
  '$2a$10$rNrUGl/ZC6WTDc6JwJLz1ebE7vZ7RaB.DhLqYZ2rX5sYHBVJqxYQy'
);
```

Then login with:
- **User ID**: testadmin@campus.edu
- **Password**: admin123

### For Production:
1. Create admin account via secure SQL
2. Use strong passwords (12+ characters, mixed case, numbers, symbols)
3. Enable two-factor authentication (if implemented)
4. Restrict admin IPs if possible
5. Regularly review admin activity logs

---

## 6. **Admin Activity Logging**

All admin actions are logged in the `admin_activity_log` table:
- User activations/deactivations
- Shop modifications
- Order interventions
- Settings changes
- Permission grants

View logs with:
```sql
SELECT * FROM admin_activity_log
WHERE admin_id = 'your-admin-id'
ORDER BY created_at DESC
LIMIT 100;
```

---

## 7. **Logout**

Click the **Logout** button in the top-right corner of the admin dashboard to safely logout.

---

## 🔐 Security Best Practices

1. **Never share admin credentials**
2. **Use strong, unique passwords**
3. **Enable 2FA when available**
4. **Regularly review user permissions**
5. **Monitor admin activity logs**
6. **Immediately revoke access for departing admins**
7. **Use super_admin only when necessary**
8. **Keep admin accounts to minimum required**

---

## 📝 Common Admin Tasks

### Ban a User
1. Go to Users tab
2. Search for the user
3. Click the deactivate icon (red user X icon)
4. Confirm action

### Create Announcement
1. Go to Settings tab
2. Scroll to Announcement Message
3. Enter your message
4. Click "Broadcast Announcement"

### View Platform Analytics
1. Go to Overview tab
2. View stats cards at top
3. Scroll down for recent orders
4. Use Export button for data export

### Manage Shop Status
1. Go to Shops tab
2. Find the shop
3. Click the settings icon
4. Toggle active status

---

## 🚨 Troubleshooting

**Can't login as admin?**
- Check role is set to 'admin' or 'super_admin' in database
- Verify password hash is correct
- Ensure account is_active = true

**Admin dashboard not showing?**
- Clear browser cache
- Check browser console for errors
- Verify role detection logic in App.tsx

**Missing permissions?**
- Super admins have all permissions
- Regular admins need permissions granted in admin_role_permissions table

---

**Need Help?** Contact the development team or check the database documentation in `/database/`.
