import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import * as crypto from "node:crypto";
const app = new Hono();

// Initialize seller accounts on startup
async function initializeSellers() {
  const shops = [
    { id: 'A1', name: 'Shop A1' },
    { id: 'A2', name: 'Shop A2' },
    { id: 'A3', name: 'Shop A3' },
    { id: 'A4', name: 'Shop A4' },
    { id: 'A5', name: 'Shop A5' },
    { id: 'A6', name: 'Shop A6' },
    { id: 'A7', name: 'Shop A7' },
    { id: 'A8', name: 'Shop A8' },
    { id: 'A9', name: 'Shop A9' },
    { id: 'A10', name: 'Shop A10' },
    { id: 'B1', name: 'Shop B1' },
    { id: 'B2', name: 'Shop B2' },
    { id: 'B3', name: 'Shop B3' },
    { id: 'B4', name: 'Shop B4' },
    { id: 'B5', name: 'Shop B5' },
    { id: 'B6', name: 'Shop B6' },
    { id: 'B7', name: 'Shop B7' },
    { id: 'B8', name: 'Shop B8' },
    { id: 'B9', name: 'Shop B9' },
    { id: 'IFL-1', name: 'IFL Shop 1' },
    { id: 'IFL-2', name: 'IFL Shop 2' },
    { id: 'IFL-3', name: 'IFL Shop 3' },
    { id: 'IFL-4', name: 'IFL Shop 4' },
    { id: 'IFL-5', name: 'IFL Shop 5' },
    { id: 'IFL-6', name: 'IFL Shop 6' },
    { id: 'IFL-7', name: 'IFL Shop 7' },
  ];

  const defaultPassword = 'campus123';
  const hashedPassword = crypto.createHash('sha256').update(defaultPassword).digest('hex');

  // Check if sellers are already initialized
  const initialized = await kv.get('sellers-initialized');
  if (initialized) {
    console.log('Sellers already initialized');
    return;
  }

  for (const shop of shops) {
    const user = {
      id: shop.id,
      name: shop.name,
      shopId: shop.id,
      role: 'seller',
      createdAt: new Date().toISOString(),
    };

    await kv.set(`user:${shop.id}`, user);
    await kv.set(`password:${shop.id}`, hashedPassword);
  }

  await kv.set('sellers-initialized', true);
  console.log('Initialized all seller accounts with default password: campus123');
}



// Initialize admin account on startup
async function initializeAdmins() {
  const initialized = await kv.get('admins-initialized');
  if (initialized) {
    console.log('Admins already initialized');
    return;
  }

  const adminUserId = 'admin';
  const adminPassword = 'admin123';

  const existing = await kv.get(`user:${adminUserId}`);
  if (!existing) {
    const user = {
      id: adminUserId,
      name: 'System Admin',
      email: 'admin@campusfood.local',
      role: 'admin',
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    const hashedPassword = crypto.createHash('sha256').update(adminPassword).digest('hex');
    await kv.set(`user:${adminUserId}`, user);
    await kv.set(`password:${adminUserId}`, hashedPassword);
  }

  await kv.set('admins-initialized', true);
  console.log('Initialized admin account (userId: admin, password: admin123)');
}

// Initialize sellers on startup
initializeSellers().catch(console.error);
initializeAdmins().catch(console.error);

// Initialize menu data for all shops
async function initializeMenuData() {
  // Check if menu is already initialized
  const initialized = await kv.get('menu-initialized');
  if (initialized) {
    console.log('Menu data already initialized');
    return;
  }

  console.log('Initializing menu data for all shops...');
  
  // Note: The actual menu data would be imported from menuData.ts
  // For now, we'll mark as initialized and let vendors add their own items
  // Or you can populate with initial data here
  
  await kv.set('menu-initialized', true);
  console.log('Menu initialization complete');
}

// Initialize menu data on startup
initializeMenuData().catch(console.error);

// Initialize sample promotions for shops
async function initializePromotions() {
  // Check if promotions are already initialized
  const initialized = await kv.get('promotions-initialized');
  if (initialized) {
    console.log('Promotions already initialized');
    return;
  }

  console.log('Initializing sample promotions...');

  const samplePromotions = [
    {
      shopId: 'A1',
      name: 'Lunch Special - 20% Off',
      description: 'Get 20% off on all items during lunch hours',
      type: 'percentage',
      discountValue: 20,
      applicableItems: [],
      minPurchase: null,
      maxDiscount: 5,
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      startTime: '11:00',
      endTime: '14:00',
      isActive: true,
      usageLimit: null,
      validDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    },
    {
      shopId: 'A2',
      name: 'Happy Hour - Buy 1 Get 1',
      description: 'Buy one drink, get one free during happy hours',
      type: 'bogo',
      discountValue: 100,
      applicableItems: [],
      minPurchase: null,
      maxDiscount: null,
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      startTime: '15:00',
      endTime: '17:00',
      isActive: true,
      usageLimit: 100,
      validDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    },
    {
      shopId: 'A3',
      name: 'Weekend Special - $2 Off',
      description: 'Save $2 on orders over $10 this weekend',
      type: 'fixed',
      discountValue: 2,
      applicableItems: [],
      minPurchase: 10,
      maxDiscount: null,
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      startTime: '',
      endTime: '',
      isActive: true,
      usageLimit: null,
      validDays: ['Saturday', 'Sunday']
    },
    {
      shopId: 'B1',
      name: 'Student Discount - 15% Off',
      description: 'All students get 15% off anytime',
      type: 'percentage',
      discountValue: 15,
      applicableItems: [],
      minPurchase: 5,
      maxDiscount: null,
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      startTime: '',
      endTime: '',
      isActive: true,
      usageLimit: null,
      validDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    },
    {
      shopId: 'B3',
      name: 'Morning Deal - $1 Off Coffee',
      description: 'Get $1 off any coffee before 10am',
      type: 'fixed',
      discountValue: 1,
      applicableItems: [],
      minPurchase: null,
      maxDiscount: null,
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      startTime: '07:00',
      endTime: '10:00',
      isActive: true,
      usageLimit: null,
      validDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    },
    {
      shopId: 'IFL-1',
      name: 'IFL Special - 25% Off',
      description: 'Special discount for IFL students',
      type: 'percentage',
      discountValue: 25,
      applicableItems: [],
      minPurchase: 8,
      maxDiscount: 10,
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      startTime: '',
      endTime: '',
      isActive: true,
      usageLimit: null,
      validDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    }
  ];

  for (const promo of samplePromotions) {
    const promoId = `promo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const promotion = {
      id: promoId,
      ...promo,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`promotion:${promo.shopId}:${promoId}`, promotion);
  }

  await kv.set('promotions-initialized', true);
  console.log('Sample promotions initialized successfully');
}

// Initialize promotions on startup
initializePromotions().catch(console.error);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-36162e30/health", (c) => {
  return c.json({ status: "ok" });
});

// Send OTP for email verification
app.post("/make-server-36162e30/api/auth/send-otp", async (c) => {
  try {
    const { email, name, studentId, type } = await c.req.json();

    // For password reset, email must exist
    if (type === 'reset') {
      const existingStudentId = await kv.get(`email:${email}`);
      if (!existingStudentId) {
        return c.json({ error: "No account found with this email" }, 404);
      }

      // Get user data
      const user = await kv.get(`user:${existingStudentId}`);
      if (!user) {
        return c.json({ error: "User not found" }, 404);
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store OTP with 10 minute expiry
      const otpData = {
        otp,
        email,
        studentId: user.id,
        name: user.name,
        createdAt: Date.now(),
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      };
      
      await kv.set(`otp:${email}`, otpData);

      console.log(`\n==========================================`);
      console.log(`Password Reset OTP for ${user.name} (${email}): ${otp}`);
      console.log(`This code expires in 10 minutes`);
      console.log(`==========================================\n`);

      return c.json({ 
        success: true, 
        message: 'OTP sent to your email',
        // For demo purposes, include OTP in response (REMOVE IN PRODUCTION!)
        debug: { otp } 
      });
    }

    // For registration, check if student ID/email already exists
    const existingUser = await kv.get(`user:${studentId}`);
    if (existingUser) {
      return c.json({ error: "Student ID already registered" }, 400);
    }

    // Check if email already exists
    const existingEmail = await kv.get(`email:${email}`);
    if (existingEmail) {
      return c.json({ error: "Email already registered" }, 400);
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP with 10 minute expiry
    const otpData = {
      otp,
      email,
      studentId,
      name,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    };
    
    await kv.set(`otp:${email}`, otpData);

    // Send OTP email using Supabase built-in email
    // For now, we'll log it to console (in production, integrate with email service)
    console.log(`\n==========================================`);
    console.log(`OTP for ${name} (${email}): ${otp}`);
    console.log(`This code expires in 10 minutes`);
    console.log(`==========================================\n`);

    // In production, you would send the email here:
    // await sendEmail({
    //   to: email,
    //   subject: 'Campus Food - Email Verification',
    //   html: `Your verification code is: <strong>${otp}</strong>`,
    // });

    return c.json({ 
      success: true, 
      message: 'OTP sent to your email',
      // For demo purposes, include OTP in response (REMOVE IN PRODUCTION!)
      debug: { otp } 
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return c.json({ error: 'Failed to send OTP' }, 500);
  }
});

// Verify OTP and create student account
app.post("/make-server-36162e30/api/auth/verify-otp", async (c) => {
  try {
    const { email, otp, studentId, name, type } = await c.req.json();

    // Get stored OTP
    const storedOtpData = await kv.get(`otp:${email}`);
    
    if (!storedOtpData) {
      return c.json({ error: 'OTP expired or not found' }, 400);
    }

    // Check if OTP expired
    if (Date.now() > storedOtpData.expiresAt) {
      await kv.del(`otp:${email}`);
      return c.json({ error: 'OTP has expired' }, 400);
    }

    // Verify OTP
    if (storedOtpData.otp !== otp) {
      return c.json({ error: 'Invalid OTP' }, 400);
    }

    if (type === 'login') {
      // For login, just get the existing user
      const existingStudentId = await kv.get(`email:${email}`);
      if (!existingStudentId) {
        return c.json({ error: 'No account found with this email' }, 404);
      }

      const user = await kv.get(`user:${existingStudentId}`);
      if (!user) {
        return c.json({ error: 'User not found' }, 404);
      }

      // Delete OTP after successful verification
      await kv.del(`otp:${email}`);

      console.log(`✅ Login via OTP successful for ${email}`);

      return c.json({ user });
    } else {
      // For registration, create user account
      const user = {
        id: studentId,
        name,
        email,
        role: 'student',
        emailVerified: true,
        createdAt: new Date().toISOString(),
      };

      // Store user
      await kv.set(`user:${studentId}`, user);
      await kv.set(`email:${email}`, studentId);
      
      // Delete OTP after successful verification
      await kv.del(`otp:${email}`);

      console.log(`✅ Email verified for ${name} (${email})`);

      return c.json({ user });
    }
  } catch (error) {
    console.error('OTP verification error:', error);
    return c.json({ error: 'Verification failed' }, 500);
  }
});

// Send OTP for login (passwordless)
app.post("/make-server-36162e30/api/auth/send-login-otp", async (c) => {
  try {
    const { email } = await c.req.json();

    // Check if email exists
    const existingStudentId = await kv.get(`email:${email}`);
    if (!existingStudentId) {
      return c.json({ error: "No account found with this email. Please register first or use password login." }, 404);
    }

    // Get user data
    const user = await kv.get(`user:${existingStudentId}`);
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Only allow students to use OTP login
    if (user.role !== 'student') {
      return c.json({ error: "OTP login is only available for students. Please use password login." }, 403);
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP with 10 minute expiry
    const otpData = {
      otp,
      email,
      studentId: user.id,
      name: user.name,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    };
    
    await kv.set(`otp:${email}`, otpData);

    console.log(`\n==========================================`);
    console.log(`Login OTP for ${user.name} (${email}): ${otp}`);
    console.log(`This code expires in 10 minutes`);
    console.log(`==========================================\n`);

    return c.json({ 
      success: true, 
      message: 'OTP sent to your email',
      name: user.name,
      studentId: user.id,
      // For demo purposes, include OTP in response (REMOVE IN PRODUCTION!)
      debug: { otp } 
    });
  } catch (error) {
    console.error('Send login OTP error:', error);
    return c.json({ error: 'Failed to send OTP' }, 500);
  }
});

// Verify OTP only (for password reset)
app.post("/make-server-36162e30/api/auth/verify-otp-only", async (c) => {
  try {
    const { email, otp } = await c.req.json();

    // Get stored OTP
    const storedOtpData = await kv.get(`otp:${email}`);
    
    if (!storedOtpData) {
      return c.json({ error: 'OTP expired or not found' }, 400);
    }

    // Check if OTP expired
    if (Date.now() > storedOtpData.expiresAt) {
      await kv.del(`otp:${email}`);
      return c.json({ error: 'OTP has expired' }, 400);
    }

    // Verify OTP
    if (storedOtpData.otp !== otp) {
      return c.json({ error: 'Invalid OTP' }, 400);
    }

    // Don't delete OTP yet - need it for password reset
    console.log(`✅ OTP verified for password reset: ${email}`);

    return c.json({ success: true });
  } catch (error) {
    console.error('OTP verification error:', error);
    return c.json({ error: 'Verification failed' }, 500);
  }
});

// Reset password with OTP
app.post("/make-server-36162e30/api/auth/reset-password", async (c) => {
  try {
    const { email, otp, newPassword } = await c.req.json();

    // Get stored OTP
    const storedOtpData = await kv.get(`otp:${email}`);
    
    if (!storedOtpData) {
      return c.json({ error: 'OTP expired or not found' }, 400);
    }

    // Check if OTP expired
    if (Date.now() > storedOtpData.expiresAt) {
      await kv.del(`otp:${email}`);
      return c.json({ error: 'OTP has expired' }, 400);
    }

    // Verify OTP
    if (storedOtpData.otp !== otp) {
      return c.json({ error: 'Invalid OTP' }, 400);
    }

    // Get student ID from email
    const studentId = await kv.get(`email:${email}`);
    if (!studentId) {
      return c.json({ error: 'No account found with this email' }, 404);
    }

    // Get user
    const user = await kv.get(`user:${studentId}`);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Hash new password
    const hashedPassword = crypto.createHash('sha256').update(newPassword).digest('hex');

    // Update password
    await kv.set(`password:${studentId}`, hashedPassword);
    
    // Delete OTP after successful reset
    await kv.del(`otp:${email}`);

    console.log(`✅ Password reset successful for ${email}`);

    return c.json({ user });
  } catch (error) {
    console.error('Password reset error:', error);
    return c.json({ error: 'Password reset failed' }, 500);
  }
});

// Student Registration
app.post("/make-server-36162e30/api/auth/register-student", async (c) => {
  try {
    const { studentId, name, password } = await c.req.json();

    // Check if student ID already exists
    const existingUser = await kv.get(`user:${studentId}`);
    if (existingUser) {
      return c.json({ error: "Student ID already registered" }, 400);
    }

    // Hash password (simple hash for demo)
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    const user = {
      id: studentId,
      name,
      role: 'student',
      createdAt: new Date().toISOString(),
    };

    // Store user and password
    await kv.set(`user:${studentId}`, user);
    await kv.set(`password:${studentId}`, hashedPassword);

    return c.json({ user });
  } catch (error) {
    console.error('Student registration error:', error);
    return c.json({ error: 'Registration failed' }, 500);
  }
});

// Login
app.post("/make-server-36162e30/api/auth/login", async (c) => {
  try {
    const { userId, password } = await c.req.json();

    const user = await kv.get(`user:${userId}`);
    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const storedPassword = await kv.get(`password:${userId}`);
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    if (storedPassword !== hashedPassword) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    return c.json({ user });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Login failed' }, 500);
  }
});

// Place Order
app.post("/make-server-36162e30/api/orders/place", async (c) => {
  try {
    const { studentId, shopId, items, total, orderType, estimatedReadyTime } = await c.req.json();

    // Check for duplicate orders in the last 5 seconds
    const studentOrdersKey = `student-orders:${studentId}`;
    const existingOrderIds = await kv.get(studentOrdersKey) || [];
    
    const recentOrders = [];
    for (const orderId of existingOrderIds.slice(-5)) { // Check last 5 orders
      const order = await kv.get(`order:${orderId}`);
      if (order) {
        recentOrders.push(order);
      }
    }

    const now = Date.now();
    const duplicateOrder = recentOrders.find(order => {
      const orderTime = new Date(order.createdAt).getTime();
      const timeDiff = now - orderTime;
      // Check if order was created in last 5 seconds with same total
      return timeDiff < 5000 && Math.abs(order.total - total) < 0.01;
    });

    if (duplicateOrder) {
      console.log('Duplicate order detected, returning existing order:', duplicateOrder.id);
      return c.json({ order: duplicateOrder });
    }

    const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const user = await kv.get(`user:${studentId}`);
    
    const order = {
      id: orderId,
      studentId,
      studentName: user?.name || 'Unknown',
      shopId,
      items,
      total,
      status: 'pending',
      orderType,
      orderTime: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      estimatedReadyTime: estimatedReadyTime || null,
    };

    // Store order
    await kv.set(`order:${orderId}`, order);
    
    // Add to shop orders list
    const shopOrdersKey = `shop-orders:${shopId}`;
    const shopOrders = await kv.get(shopOrdersKey) || [];
    shopOrders.push(orderId);
    await kv.set(shopOrdersKey, shopOrders);

    // Add to student orders list
    const studentOrders = await kv.get(studentOrdersKey) || [];
    studentOrders.push(orderId);
    await kv.set(studentOrdersKey, studentOrders);

    console.log('New order created:', orderId);
    return c.json({ order });
  } catch (error) {
    console.error('Place order error:', error);
    return c.json({ error: 'Failed to place order' }, 500);
  }
});

// Get Seller Orders
app.get("/make-server-36162e30/api/seller/orders", async (c) => {
  try {
    const shopId = c.req.query('shopId');
    
    if (!shopId) {
      return c.json({ error: 'Shop ID required' }, 400);
    }

    // Get all order IDs for this shop
    const orderIds = await kv.get(`shop-orders:${shopId}`) || [];
    
    // Fetch all orders
    const orders = await Promise.all(
      orderIds.map(async (id: string) => await kv.get(`order:${id}`))
    );

    // Filter out null values and sort by time
    const validOrders = orders.filter(o => o !== null).sort((a: any, b: any) => 
      new Date(b.orderTime).getTime() - new Date(a.orderTime).getTime()
    );

    // Get viewed cancelled orders for this shop
    const viewedCancelledIds = await kv.get(`shop-viewed-cancelled:${shopId}`) || [];

    // Mark orders as viewed or not
    const ordersWithViewStatus = validOrders.map((order: any) => ({
      ...order,
      isNewCancellation: order.status === 'cancelled' && !viewedCancelledIds.includes(order.id)
    }));

    // Calculate stats
    const today = new Date().toDateString();
    const todayOrders = ordersWithViewStatus.filter((o: any) => 
      new Date(o.orderTime).toDateString() === today
    );

    const stats = {
      today: {
        orders: todayOrders.length,
        revenue: todayOrders
          .filter((o: any) => o.status === 'completed')
          .reduce((sum: number, o: any) => sum + o.total, 0),
      },
      pending: ordersWithViewStatus.filter((o: any) => o.status === 'pending').length,
      completed: todayOrders.filter((o: any) => o.status === 'completed').length,
    };

    return c.json({ orders: ordersWithViewStatus, stats });
  } catch (error) {
    console.error('Get seller orders error:', error);
    return c.json({ error: 'Failed to fetch orders' }, 500);
  }
});

// Update Order Status
app.post("/make-server-36162e30/api/seller/update-order", async (c) => {
  try {
    const { orderId, status, shopId, cancellationReason } = await c.req.json();

    const order = await kv.get(`order:${orderId}`);
    
    if (!order) {
      return c.json({ error: 'Order not found' }, 404);
    }

    if (order.shopId !== shopId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const previousStatus = order.status;
    order.status = status;
    order.updatedAt = new Date().toISOString();

    // Store cancellation reason if order is being cancelled
    if (status === 'cancelled' && cancellationReason) {
      order.cancellationReason = cancellationReason;
      order.cancelledAt = new Date().toISOString();
    }

    await kv.set(`order:${orderId}`, order);

    // Create notification when order becomes ready
    if (status === 'ready' && previousStatus !== 'ready') {
      const notificationId = `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const notification = {
        id: notificationId,
        studentId: order.studentId,
        orderId: order.id,
        type: 'order_ready',
        title: 'Order Ready for Pickup! 🎉',
        message: `Your order from ${shopId} is ready for ${order.orderType}`,
        read: false,
        createdAt: new Date().toISOString(),
      };

      await kv.set(`notification:${notificationId}`, notification);

      // Add to student's notification list
      const studentNotificationsKey = `student-notifications:${order.studentId}`;
      const studentNotifications = await kv.get(studentNotificationsKey) || [];
      studentNotifications.unshift(notificationId); // Add to beginning
      await kv.set(studentNotificationsKey, studentNotifications);

      console.log('Created notification for student:', order.studentId);
    }

    // Create notification when order is cancelled
    if (status === 'cancelled' && previousStatus !== 'cancelled') {
      const notificationId = `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const notification = {
        id: notificationId,
        studentId: order.studentId,
        orderId: order.id,
        type: 'order_cancelled',
        title: 'Order Cancelled',
        message: cancellationReason 
          ? `Your order from ${shopId} was cancelled. Reason: ${cancellationReason}`
          : `Your order from ${shopId} was cancelled`,
        read: false,
        createdAt: new Date().toISOString(),
      };

      await kv.set(`notification:${notificationId}`, notification);

      // Add to student's notification list
      const studentNotificationsKey = `student-notifications:${order.studentId}`;
      const studentNotifications = await kv.get(studentNotificationsKey) || [];
      studentNotifications.unshift(notificationId);
      await kv.set(studentNotificationsKey, studentNotifications);

      console.log('Created cancellation notification for student:', order.studentId);
    }

    return c.json({ order });
  } catch (error) {
    console.error('Update order error:', error);
    return c.json({ error: 'Failed to update order' }, 500);
  }
});

// Get Student Orders
app.get("/make-server-36162e30/api/student/orders", async (c) => {
  try {
    const studentId = c.req.query('studentId');
    
    const studentOrdersKey = `student-orders:${studentId}`;
    const orderIds = await kv.get(studentOrdersKey) || [];
    
    const orders = [];
    for (const orderId of orderIds) {
      const order = await kv.get(`order:${orderId}`);
      if (order) {
        orders.push(order);
      }
    }

    // Sort by creation time (newest first)
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return c.json({ orders });
  } catch (error) {
    console.error('Get student orders error:', error);
    return c.json({ error: 'Failed to fetch orders' }, 500);
  }
});

// Get Student Notifications
app.get("/make-server-36162e30/api/student/notifications", async (c) => {
  try {
    const studentId = c.req.query('studentId');
    
    if (!studentId) {
      return c.json({ error: 'Student ID is required' }, 400);
    }

    const studentNotificationsKey = `student-notifications:${studentId}`;
    const notificationIds = await kv.get(studentNotificationsKey) || [];
    
    const notifications = [];
    for (const notificationId of notificationIds.slice(0, 20)) { // Get last 20 notifications
      const notification = await kv.get(`notification:${notificationId}`);
      if (notification) {
        notifications.push(notification);
      }
    }

    return c.json({ notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    return c.json({ error: 'Failed to fetch notifications' }, 500);
  }
});

// Mark Notification as Read
app.post("/make-server-36162e30/api/student/notifications/read", async (c) => {
  try {
    const { notificationId, studentId } = await c.req.json();

    const notification = await kv.get(`notification:${notificationId}`);
    
    if (!notification) {
      return c.json({ error: 'Notification not found' }, 404);
    }

    if (notification.studentId !== studentId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    notification.read = true;
    await kv.set(`notification:${notificationId}`, notification);

    return c.json({ notification });
  } catch (error) {
    console.error('Mark notification read error:', error);
    return c.json({ error: 'Failed to mark notification as read' }, 500);
  }
});

// Mark All Notifications as Read
app.post("/make-server-36162e30/api/student/notifications/read-all", async (c) => {
  try {
    const { studentId } = await c.req.json();

    const studentNotificationsKey = `student-notifications:${studentId}`;
    const notificationIds = await kv.get(studentNotificationsKey) || [];
    
    for (const notificationId of notificationIds) {
      const notification = await kv.get(`notification:${notificationId}`);
      if (notification && !notification.read) {
        notification.read = true;
        await kv.set(`notification:${notificationId}`, notification);
      }
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    return c.json({ error: 'Failed to mark notifications as read' }, 500);
  }
});

// Mark Cancelled Orders as Viewed
app.post("/make-server-36162e30/api/seller/mark-cancelled-viewed", async (c) => {
  try {
    const { shopId } = await c.req.json();

    if (!shopId) {
      return c.json({ error: 'Shop ID required' }, 400);
    }

    // Get all order IDs for this shop
    const orderIds = await kv.get(`shop-orders:${shopId}`) || [];
    
    // Get all cancelled orders
    const cancelledOrderIds = [];
    for (const orderId of orderIds) {
      const order = await kv.get(`order:${orderId}`);
      if (order && order.status === 'cancelled') {
        cancelledOrderIds.push(orderId);
      }
    }

    // Mark all cancelled orders as viewed
    await kv.set(`shop-viewed-cancelled:${shopId}`, cancelledOrderIds);

    console.log(`Marked ${cancelledOrderIds.length} cancelled orders as viewed for shop ${shopId}`);
    return c.json({ success: true, viewedCount: cancelledOrderIds.length });
  } catch (error) {
    console.error('Mark cancelled viewed error:', error);
    return c.json({ error: 'Failed to mark cancelled orders as viewed' }, 500);
  }
});

// Send Message (Shop to Student)
app.post("/make-server-36162e30/api/messages/send", async (c) => {
  try {
    const { orderId, senderId, senderType, message } = await c.req.json();

    if (!orderId || !senderId || !senderType || !message) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Get existing messages
    const messagesKey = `order-messages:${orderId}`;
    const messages = await kv.get(messagesKey) || [];

    // Create new message
    const newMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      senderId,
      senderType,
      message,
      timestamp: new Date().toISOString(),
    };

    messages.push(newMessage);
    await kv.set(messagesKey, messages);

    // If shop is sending, mark as unread for student
    if (senderType === 'shop') {
      const order = await kv.get(`order:${orderId}`);
      if (order) {
        const studentUnreadKey = `student-unread-messages:${order.studentId}`;
        const unreadOrders = await kv.get(studentUnreadKey) || [];
        
        if (!unreadOrders.includes(orderId)) {
          unreadOrders.push(orderId);
          await kv.set(studentUnreadKey, unreadOrders);
        }
      }
    }

    console.log(`Message sent for order ${orderId} by ${senderType} ${senderId}`);
    return c.json({ success: true, message: newMessage });
  } catch (error) {
    console.error('Send message error:', error);
    return c.json({ error: 'Failed to send message' }, 500);
  }
});

// Get Messages for Order
app.get("/make-server-36162e30/api/messages/:orderId", async (c) => {
  try {
    const orderId = c.req.param('orderId');
    const messagesKey = `order-messages:${orderId}`;
    const messages = await kv.get(messagesKey) || [];

    return c.json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    return c.json({ error: 'Failed to fetch messages' }, 500);
  }
});

// Mark Messages as Read (Student)
app.post("/make-server-36162e30/api/messages/mark-read", async (c) => {
  try {
    const { studentId, orderId } = await c.req.json();

    const studentUnreadKey = `student-unread-messages:${studentId}`;
    const unreadOrders = await kv.get(studentUnreadKey) || [];
    
    const updatedUnread = unreadOrders.filter((id: string) => id !== orderId);
    await kv.set(studentUnreadKey, updatedUnread);

    return c.json({ success: true });
  } catch (error) {
    console.error('Mark messages read error:', error);
    return c.json({ error: 'Failed to mark messages as read' }, 500);
  }
});

// Get Unread Message Count (Student)
app.get("/make-server-36162e30/api/messages/unread-count", async (c) => {
  try {
    const studentId = c.req.query('studentId');
    
    if (!studentId) {
      return c.json({ error: 'Student ID required' }, 400);
    }

    const studentUnreadKey = `student-unread-messages:${studentId}`;
    const unreadOrders = await kv.get(studentUnreadKey) || [];

    // Get detailed unread count per order
    const unreadByOrder: Record<string, number> = {};
    const orderDetails: Record<string, any> = {};

    for (const orderId of unreadOrders) {
      const messagesKey = `order-messages:${orderId}`;
      const messages = await kv.get(messagesKey) || [];
      
      // Count unread messages from shop
      const unreadCount = messages.filter((msg: any) => 
        msg.senderType === 'shop' && !msg.readByStudent
      ).length;

      if (unreadCount > 0) {
        unreadByOrder[orderId] = unreadCount;

        // Get order details for notification
        const order = await kv.get(`order:${orderId}`);
        if (order) {
          orderDetails[orderId] = {
            shopName: order.shopId,
            studentName: order.studentName || 'Student',
          };
        }
      }
    }

    return c.json({ 
      count: unreadOrders.length, 
      orderIds: unreadOrders,
      unreadByOrder,
      orderDetails,
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    return c.json({ error: 'Failed to get unread count' }, 500);
  }
});

// Get Unread Message Count (Shop)
app.get("/make-server-36162e30/api/messages/unread-count-shop", async (c) => {
  try {
    const shopId = c.req.query('shopId');
    
    if (!shopId) {
      return c.json({ error: 'Shop ID required' }, 400);
    }

    // Get all orders for this shop
    const allOrders = await kv.getByPrefix(`order:`);
    const shopOrders = allOrders.filter((order: any) => order.shopId === shopId);

    const unreadByOrder: Record<string, number> = {};
    const orderDetails: Record<string, any> = {};

    for (const order of shopOrders) {
      const messagesKey = `order-messages:${order.id}`;
      const messages = await kv.get(messagesKey) || [];
      
      // Count unread messages from students
      const unreadCount = messages.filter((msg: any) => 
        msg.senderType === 'student' && !msg.readByShop
      ).length;

      if (unreadCount > 0) {
        unreadByOrder[order.id] = unreadCount;
        orderDetails[order.id] = {
          shopName: order.shopId,
          studentName: order.studentName || order.studentId,
        };
      }
    }

    const totalCount = Object.keys(unreadByOrder).length;

    return c.json({ 
      count: totalCount,
      unreadByOrder,
      orderDetails,
    });
  } catch (error) {
    console.error('Get shop unread count error:', error);
    return c.json({ error: 'Failed to get unread count' }, 500);
  }
});

// ===== VENDOR MANAGEMENT ENDPOINTS =====

// Get Shop Menu Items
app.get("/make-server-36162e30/api/vendor/menu/:shopId", async (c) => {
  try {
    const shopId = c.req.param('shopId');
    const items = await kv.getByPrefix(`menu:${shopId}:`);
    
    return c.json({ items });
  } catch (error) {
    console.error('Get menu error:', error);
    return c.json({ error: 'Failed to load menu items' }, 500);
  }
});

// Add/Update Menu Item
app.post("/make-server-36162e30/api/vendor/menu", async (c) => {
  try {
    const itemData = await c.req.json();
    const itemId = itemData.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const menuItem = {
      id: itemId,
      ...itemData,
      createdAt: itemData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`menu:${itemData.shopId}:${itemId}`, menuItem);
    
    return c.json({ item: menuItem });
  } catch (error) {
    console.error('Add menu item error:', error);
    return c.json({ error: 'Failed to add menu item' }, 500);
  }
});

// Update Menu Item
app.put("/make-server-36162e30/api/vendor/menu/:itemId", async (c) => {
  try {
    const itemId = c.req.param('itemId');
    const itemData = await c.req.json();
    
    // Find existing item
    const allItems = await kv.getByPrefix(`menu:${itemData.shopId}:`);
    const existingItem = allItems.find((item: any) => item.id === itemId);
    
    if (!existingItem) {
      return c.json({ error: 'Item not found' }, 404);
    }
    
    const updatedItem = {
      ...existingItem,
      ...itemData,
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`menu:${itemData.shopId}:${itemId}`, updatedItem);
    
    return c.json({ item: updatedItem });
  } catch (error) {
    console.error('Update menu item error:', error);
    return c.json({ error: 'Failed to update menu item' }, 500);
  }
});

// Delete Menu Item
app.delete("/make-server-36162e30/api/vendor/menu/:itemId", async (c) => {
  try {
    const itemId = c.req.param('itemId');
    const shopId = c.req.query('shopId');
    
    await kv.del(`menu:${shopId}:${itemId}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete menu item error:', error);
    return c.json({ error: 'Failed to delete menu item' }, 500);
  }
});

// Toggle Menu Item Availability
app.post("/make-server-36162e30/api/vendor/menu/:itemId/toggle", async (c) => {
  try {
    const itemId = c.req.param('itemId');
    const { isAvailable } = await c.req.json();
    
    // Find existing item
    const allItems = await kv.getByPrefix(`menu:`);
    const existingItem = allItems.find((item: any) => item.id === itemId);
    
    if (!existingItem) {
      return c.json({ error: 'Item not found' }, 404);
    }
    
    const updatedItem = {
      ...existingItem,
      isAvailable,
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`menu:${existingItem.shopId}:${itemId}`, updatedItem);
    
    return c.json({ item: updatedItem });
  } catch (error) {
    console.error('Toggle item availability error:', error);
    return c.json({ error: 'Failed to toggle availability' }, 500);
  }
});

// Get Shop Promotions
app.get("/make-server-36162e30/api/vendor/promotions/:shopId", async (c) => {
  try {
    const shopId = c.req.param('shopId');
    const promotions = await kv.getByPrefix(`promotion:${shopId}:`);
    
    return c.json({ promotions });
  } catch (error) {
    console.error('Get promotions error:', error);
    return c.json({ error: 'Failed to load promotions' }, 500);
  }
});

// Add/Update Promotion
app.post("/make-server-36162e30/api/vendor/promotions", async (c) => {
  try {
    const promoData = await c.req.json();
    const promoId = promoData.id || `promo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const promotion = {
      id: promoId,
      ...promoData,
      usageCount: 0,
      createdAt: promoData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`promotion:${promoData.shopId}:${promoId}`, promotion);
    
    return c.json({ promotion });
  } catch (error) {
    console.error('Add promotion error:', error);
    return c.json({ error: 'Failed to add promotion' }, 500);
  }
});

// Update Promotion
app.put("/make-server-36162e30/api/vendor/promotions/:promoId", async (c) => {
  try {
    const promoId = c.req.param('promoId');
    const promoData = await c.req.json();
    
    // Find existing promotion
    const allPromos = await kv.getByPrefix(`promotion:${promoData.shopId}:`);
    const existingPromo = allPromos.find((promo: any) => promo.id === promoId);
    
    if (!existingPromo) {
      return c.json({ error: 'Promotion not found' }, 404);
    }
    
    const updatedPromo = {
      ...existingPromo,
      ...promoData,
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`promotion:${promoData.shopId}:${promoId}`, updatedPromo);
    
    return c.json({ promotion: updatedPromo });
  } catch (error) {
    console.error('Update promotion error:', error);
    return c.json({ error: 'Failed to update promotion' }, 500);
  }
});

// Delete Promotion
app.delete("/make-server-36162e30/api/vendor/promotions/:promoId", async (c) => {
  try {
    const promoId = c.req.param('promoId');
    const shopId = c.req.query('shopId');
    
    await kv.del(`promotion:${shopId}:${promoId}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete promotion error:', error);
    return c.json({ error: 'Failed to delete promotion' }, 500);
  }
});

// Toggle Promotion Status
app.post("/make-server-36162e30/api/vendor/promotions/:promoId/toggle", async (c) => {
  try {
    const promoId = c.req.param('promoId');
    const { isActive } = await c.req.json();
    
    // Find existing promotion
    const allPromos = await kv.getByPrefix(`promotion:`);
    const existingPromo = allPromos.find((promo: any) => promo.id === promoId);
    
    if (!existingPromo) {
      return c.json({ error: 'Promotion not found' }, 404);
    }
    
    const updatedPromo = {
      ...existingPromo,
      isActive,
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`promotion:${existingPromo.shopId}:${promoId}`, updatedPromo);
    
    return c.json({ promotion: updatedPromo });
  } catch (error) {
    console.error('Toggle promotion status error:', error);
    return c.json({ error: 'Failed to toggle promotion status' }, 500);
  }
});

// Get Shop Details
app.get("/make-server-36162e30/api/vendor/shop/:shopId", async (c) => {
  try {
    const shopId = c.req.param('shopId');
    const shop = await kv.get(`shop:${shopId}`) || {
      id: shopId,
      name: `Shop ${shopId}`,
      description: '',
      phone: '',
      location: '',
      campus: shopId.startsWith('IFL') ? 'IFL' : 'RUPP',
      isOpen: true,
      operatingHours: {
        Monday: { open: '07:00', close: '18:00', isClosed: false },
        Tuesday: { open: '07:00', close: '18:00', isClosed: false },
        Wednesday: { open: '07:00', close: '18:00', isClosed: false },
        Thursday: { open: '07:00', close: '18:00', isClosed: false },
        Friday: { open: '07:00', close: '18:00', isClosed: false },
        Saturday: { open: '08:00', close: '17:00', isClosed: false },
        Sunday: { open: '00:00', close: '00:00', isClosed: true }
      },
      specialClosures: []
    };
    
    return c.json({ shop });
  } catch (error) {
    console.error('Get shop details error:', error);
    return c.json({ error: 'Failed to load shop details' }, 500);
  }
});

// Update Shop Details
app.put("/make-server-36162e30/api/vendor/shop/:shopId", async (c) => {
  try {
    const shopId = c.req.param('shopId');
    const shopData = await c.req.json();
    
    const updatedShop = {
      ...shopData,
      id: shopId,
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`shop:${shopId}`, updatedShop);
    
    return c.json({ shop: updatedShop });
  } catch (error) {
    console.error('Update shop details error:', error);
    return c.json({ error: 'Failed to update shop details' }, 500);
  }
});

// Toggle Shop Status
app.post("/make-server-36162e30/api/vendor/shop/:shopId/toggle-status", async (c) => {
  try {
    const shopId = c.req.param('shopId');
    const { isOpen } = await c.req.json();
    
    const shop = await kv.get(`shop:${shopId}`) || { id: shopId };
    
    const updatedShop = {
      ...shop,
      isOpen,
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`shop:${shopId}`, updatedShop);
    
    return c.json({ shop: updatedShop });
  } catch (error) {
    console.error('Toggle shop status error:', error);
    return c.json({ error: 'Failed to toggle shop status' }, 500);
  }
});

// Add Special Closure
app.post("/make-server-36162e30/api/vendor/shop/:shopId/closures", async (c) => {
  try {
    const shopId = c.req.param('shopId');
    const closureData = await c.req.json();
    
    const shop = await kv.get(`shop:${shopId}`) || { id: shopId, specialClosures: [] };
    
    const closure = {
      id: `closure-${Date.now()}`,
      ...closureData,
      createdAt: new Date().toISOString(),
    };
    
    const updatedShop = {
      ...shop,
      specialClosures: [...(shop.specialClosures || []), closure],
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`shop:${shopId}`, updatedShop);
    
    return c.json({ closure });
  } catch (error) {
    console.error('Add closure error:', error);
    return c.json({ error: 'Failed to add closure' }, 500);
  }
});

// Delete Special Closure
app.delete("/make-server-36162e30/api/vendor/shop/:shopId/closures/:closureId", async (c) => {
  try {
    const shopId = c.req.param('shopId');
    const closureId = c.req.param('closureId');
    
    const shop = await kv.get(`shop:${shopId}`);
    
    if (!shop) {
      return c.json({ error: 'Shop not found' }, 404);
    }
    
    const updatedShop = {
      ...shop,
      specialClosures: (shop.specialClosures || []).filter((c: any) => c.id !== closureId),
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`shop:${shopId}`, updatedShop);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete closure error:', error);
    return c.json({ error: 'Failed to delete closure' }, 500);
  }
});

// ===== ADMIN ENDPOINTS =====

// Get Admin Stats
app.get("/make-server-36162e30/admin/stats", async (c) => {
  try {
    const allUsers = await kv.getByPrefix('user:');
    const allOrders = await kv.getByPrefix('order:');
    const allShops = await kv.getByPrefix('shop:');
    
    const totalRevenue = allOrders.reduce((sum: number, order: any) => sum + (order.total || 0), 0);
    const activeOrders = allOrders.filter((o: any) => o.status === 'pending' || o.status === 'preparing' || o.status === 'ready').length;
    
    const today = new Date().toDateString();
    const todayOrders = allOrders.filter((o: any) => new Date(o.createdAt).toDateString() === today).length;
    
    return c.json({
      totalUsers: allUsers.length,
      totalShops: allShops.length,
      totalOrders: allOrders.length,
      totalRevenue,
      activeOrders,
      todayOrders,
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    return c.json({ error: 'Failed to load stats' }, 500);
  }
});

// Get All Users
app.get("/make-server-36162e30/admin/users", async (c) => {
  try {
    const users = await kv.getByPrefix('user:');
    return c.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    return c.json({ error: 'Failed to load users' }, 500);
  }
});

// Get All Shops
app.get("/make-server-36162e30/admin/shops", async (c) => {
  try {
    const shops = await kv.getByPrefix('shop:');
    return c.json(shops);
  } catch (error) {
    console.error('Get shops error:', error);
    return c.json({ error: 'Failed to load shops' }, 500);
  }
});

// Get All Orders
app.get("/make-server-36162e30/admin/orders", async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50');
    const allOrders = await kv.getByPrefix('order:');
    const orders = allOrders.slice(0, limit);
    
    return c.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    return c.json({ error: 'Failed to load orders' }, 500);
  }
});

// Toggle User Status
app.post("/make-server-36162e30/admin/users/:userId/toggle-status", async (c) => {
  try {
    const userId = c.req.param('userId');
    const { isActive } = await c.req.json();
    
    const user = await kv.get(`user:${userId}`);
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    const updatedUser = {
      ...user,
      isActive,
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`user:${userId}`, updatedUser);
    
    return c.json({ user: updatedUser });
  } catch (error) {
    console.error('Toggle user status error:', error);
    return c.json({ error: 'Failed to toggle user status' }, 500);
  }
});

// Toggle Shop Status (Admin)
app.post("/make-server-36162e30/admin/shops/:shopId/toggle-status", async (c) => {
  try {
    const shopId = c.req.param('shopId');
    const { isActive } = await c.req.json();
    
    const shop = await kv.get(`shop:${shopId}`);
    
    if (!shop) {
      return c.json({ error: 'Shop not found' }, 404);
    }
    
    const updatedShop = {
      ...shop,
      isActive,
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`shop:${shopId}`, updatedShop);
    
    return c.json({ shop: updatedShop });
  } catch (error) {
    console.error('Toggle shop status error:', error);
    return c.json({ error: 'Failed to toggle shop status' }, 500);
  }
});

// ===== STUDENT PROFILE & PAYMENT ENDPOINTS =====

// Update Student Profile
app.put("/make-server-36162e30/api/student/profile", async (c) => {
  try {
    const { studentId, name, email, phone } = await c.req.json();

    const user = await kv.get(`user:${studentId}`);
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const updatedUser = {
      ...user,
      name,
      email: email || user.email,
      phone: phone || user.phone,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`user:${studentId}`, updatedUser);

    return c.json({ user: updatedUser });
  } catch (error) {
    console.error('Update profile error:', error);
    return c.json({ error: 'Failed to update profile' }, 500);
  }
});

// Get Payment Methods
app.get("/make-server-36162e30/api/student/payment-methods", async (c) => {
  try {
    const studentId = c.req.query('studentId');

    if (!studentId) {
      return c.json({ error: 'Student ID required' }, 400);
    }

    const paymentMethods = await kv.getByPrefix(`payment:${studentId}:`);

    return c.json({ paymentMethods });
  } catch (error) {
    console.error('Get payment methods error:', error);
    return c.json({ error: 'Failed to load payment methods' }, 500);
  }
});

// Add Payment Method
app.post("/make-server-36162e30/api/student/payment-methods", async (c) => {
  try {
    const paymentData = await c.req.json();
    const paymentId = `payment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Check if this is the first payment method
    const existingMethods = await kv.getByPrefix(`payment:${paymentData.studentId}:`);
    const isFirstPayment = existingMethods.length === 0;

    const paymentMethod = {
      id: paymentId,
      type: paymentData.type,
      accountNumber: paymentData.accountNumber || null,
      accountName: paymentData.accountName || null,
      cardNumber: paymentData.cardNumber || null,
      cardHolder: paymentData.cardHolder || null,
      expiryDate: paymentData.expiryDate || null,
      isDefault: isFirstPayment, // First payment is default
      createdAt: new Date().toISOString(),
    };

    await kv.set(`payment:${paymentData.studentId}:${paymentId}`, paymentMethod);

    return c.json({ paymentMethod });
  } catch (error) {
    console.error('Add payment method error:', error);
    return c.json({ error: 'Failed to add payment method' }, 500);
  }
});

// Update Payment Method
app.put("/make-server-36162e30/api/student/payment-methods/:paymentId", async (c) => {
  try {
    const paymentId = c.req.param('paymentId');
    const paymentData = await c.req.json();

    // Find existing payment method
    const allPayments = await kv.getByPrefix(`payment:${paymentData.studentId}:`);
    const existingPayment = allPayments.find((p: any) => p.id === paymentId);

    if (!existingPayment) {
      return c.json({ error: 'Payment method not found' }, 404);
    }

    const updatedPayment = {
      ...existingPayment,
      type: paymentData.type,
      accountNumber: paymentData.accountNumber || null,
      accountName: paymentData.accountName || null,
      cardNumber: paymentData.cardNumber || null,
      cardHolder: paymentData.cardHolder || null,
      expiryDate: paymentData.expiryDate || null,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`payment:${paymentData.studentId}:${paymentId}`, updatedPayment);

    return c.json({ paymentMethod: updatedPayment });
  } catch (error) {
    console.error('Update payment method error:', error);
    return c.json({ error: 'Failed to update payment method' }, 500);
  }
});

// Delete Payment Method
app.delete("/make-server-36162e30/api/student/payment-methods/:paymentId", async (c) => {
  try {
    const paymentId = c.req.param('paymentId');
    const studentId = c.req.query('studentId');

    await kv.del(`payment:${studentId}:${paymentId}`);

    return c.json({ success: true });
  } catch (error) {
    console.error('Delete payment method error:', error);
    return c.json({ error: 'Failed to delete payment method' }, 500);
  }
});

// Set Default Payment Method
app.post("/make-server-36162e30/api/student/payment-methods/:paymentId/set-default", async (c) => {
  try {
    const paymentId = c.req.param('paymentId');
    const { studentId } = await c.req.json();

    // Get all payment methods
    const allPayments = await kv.getByPrefix(`payment:${studentId}:`);

    // Update all payment methods
    for (const payment of allPayments) {
      const updated = {
        ...payment,
        isDefault: payment.id === paymentId,
      };
      await kv.set(`payment:${studentId}:${payment.id}`, updated);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Set default payment error:', error);
    return c.json({ error: 'Failed to set default payment' }, 500);
  }
});

// Get Student Preferences
app.get("/make-server-36162e30/api/student/preferences", async (c) => {
  try {
    const studentId = c.req.query('studentId');

    if (!studentId) {
      return c.json({ error: 'Student ID required' }, 400);
    }

    const preferences = await kv.get(`preferences:${studentId}`) || {
      emailNotifications: true,
      pushNotifications: true,
      orderUpdates: true,
      promotions: true,
      language: 'en',
    };

    return c.json({ preferences });
  } catch (error) {
    console.error('Get preferences error:', error);
    return c.json({ error: 'Failed to load preferences' }, 500);
  }
});

// Update Student Preferences
app.put("/make-server-36162e30/api/student/preferences", async (c) => {
  try {
    const { studentId, preferences } = await c.req.json();

    await kv.set(`preferences:${studentId}`, {
      ...preferences,
      updatedAt: new Date().toISOString(),
    });

    return c.json({ preferences });
  } catch (error) {
    console.error('Update preferences error:', error);
    return c.json({ error: 'Failed to update preferences' }, 500);
  }
});

Deno.serve(app.fetch);