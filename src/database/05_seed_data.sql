-- Campus Food Ordering System — Seed Data
-- Run after 04_rls_policies.sql
-- Uses Supabase service-role context (bypasses RLS)
-- IMPORTANT: Replace placeholder hashes with real bcrypt hashes before production

-- ============================================================================
-- SELLER ACCOUNTS  (one per shop)
-- password placeholder: hash of 'seller123'
-- ============================================================================
INSERT INTO users (email, password_hash, role, name, phone) VALUES
  ('shop.a1@rupp.edu.kh',       '$2b$12$PLACEHOLDER', 'seller', 'Shop A1',              '+855-12-345-001'),
  ('shop.a2@rupp.edu.kh',       '$2b$12$PLACEHOLDER', 'seller', 'Shop A2-A3',            '+855-12-345-002'),
  ('shop.a4@rupp.edu.kh',       '$2b$12$PLACEHOLDER', 'seller', 'Shop A4',              '+855-12-345-004'),
  ('shop.a5@rupp.edu.kh',       '$2b$12$PLACEHOLDER', 'seller', 'Shop A5',              '+855-12-345-005'),
  ('shop.a6@rupp.edu.kh',       '$2b$12$PLACEHOLDER', 'seller', 'Shop A6',              '+855-12-345-006'),
  ('shop.a7@rupp.edu.kh',       '$2b$12$PLACEHOLDER', 'seller', 'Shop A7',              '+855-12-345-007'),
  ('shop.a8@rupp.edu.kh',       '$2b$12$PLACEHOLDER', 'seller', 'Shop A8',              '+855-12-345-008'),
  ('shop.a9@rupp.edu.kh',       '$2b$12$PLACEHOLDER', 'seller', 'Shop A9',              '+855-12-345-009'),
  ('shop.a10@rupp.edu.kh',      '$2b$12$PLACEHOLDER', 'seller', 'Shop A10',             '+855-12-345-010'),
  ('shop.b1@rupp.edu.kh',       '$2b$12$PLACEHOLDER', 'seller', 'Shop B1',              '+855-12-345-011'),
  ('shop.b2@rupp.edu.kh',       '$2b$12$PLACEHOLDER', 'seller', 'Shop B2',              '+855-12-345-012'),
  ('shop.b3@rupp.edu.kh',       '$2b$12$PLACEHOLDER', 'seller', 'Shop B3',              '+855-12-345-013'),
  ('shop.b4@rupp.edu.kh',       '$2b$12$PLACEHOLDER', 'seller', 'Shop B4',              '+855-12-345-014'),
  ('shop.b5@rupp.edu.kh',       '$2b$12$PLACEHOLDER', 'seller', 'Shop B5',              '+855-12-345-015'),
  ('shop.b6@rupp.edu.kh',       '$2b$12$PLACEHOLDER', 'seller', 'Shop B6',              '+855-12-345-016'),
  ('shop.b7@rupp.edu.kh',       '$2b$12$PLACEHOLDER', 'seller', 'Shop B7',              '+855-12-345-017'),
  ('shop.b8@rupp.edu.kh',       '$2b$12$PLACEHOLDER', 'seller', 'Shop B8',              '+855-12-345-018'),
  ('shop.b9@rupp.edu.kh',       '$2b$12$PLACEHOLDER', 'seller', 'Shop B9',              '+855-12-345-019'),
  ('shop.ifl.nc@ifl.edu.kh',    '$2b$12$PLACEHOLDER', 'seller', 'Nature Café',          '+855-12-345-020'),
  ('shop.ifl.dmc@ifl.edu.kh',   '$2b$12$PLACEHOLDER', 'seller', 'DMC Alumni Café',      '+855-12-345-021'),
  ('shop.ifl.niset@ifl.edu.kh', '$2b$12$PLACEHOLDER', 'seller', 'Niset Café',           '+855-12-345-022'),
  ('shop.ifl.urban@ifl.edu.kh', '$2b$12$PLACEHOLDER', 'seller', 'Urban Canteen',        '+855-12-345-023'),
  ('shop.ifl.c1@ifl.edu.kh',    '$2b$12$PLACEHOLDER', 'seller', 'Normal Canteen 1',     '+855-12-345-024'),
  ('shop.ifl.c2@ifl.edu.kh',    '$2b$12$PLACEHOLDER', 'seller', 'Normal Canteen 2',     '+855-12-345-025'),
  ('shop.ifl.c3@ifl.edu.kh',    '$2b$12$PLACEHOLDER', 'seller', 'Normal Canteen 3',     '+855-12-345-026')
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- SAMPLE STUDENT ACCOUNTS
-- password placeholder: hash of 'student123'
-- ============================================================================
INSERT INTO users (student_id, password_hash, role, name, phone) VALUES
  ('e20210001', '$2b$12$PLACEHOLDER', 'student', 'Dara Chan',    '+855-77-100-001'),
  ('e20210002', '$2b$12$PLACEHOLDER', 'student', 'Sokha Lim',    '+855-77-100-002'),
  ('e20210003', '$2b$12$PLACEHOLDER', 'student', 'Vanna Keo',    '+855-77-100-003'),
  ('ifl-001',   '$2b$12$PLACEHOLDER', 'student', 'Maly Pich',    '+855-77-100-004'),
  ('ifl-002',   '$2b$12$PLACEHOLDER', 'student', 'Reaksmey Heng','+855-77-100-005')
ON CONFLICT (student_id) DO NOTHING;

-- ============================================================================
-- SHOPS  (linked to seller accounts above)
-- ============================================================================
INSERT INTO shops (shop_code, name, campus, category, description, owner_id, estimated_prep_time)
SELECT s.shop_code, s.name, s.campus, s.category, s.description, u.id, s.prep
FROM (VALUES
  ('A1',     'Shop A1',          'RUPP', 'Khmer',       'Traditional Khmer rice and noodle dishes',          'shop.a1@rupp.edu.kh',       10),
  ('A2',     'Shop A2-A3',       'RUPP', 'Mixed',       'Mixed local and Asian dishes',                       'shop.a2@rupp.edu.kh',       12),
  ('A4',     'Shop A4',          'RUPP', 'Drinks',      'Fresh juices, smoothies and cold drinks',            'shop.a4@rupp.edu.kh',        5),
  ('A5',     'Shop A5',          'RUPP', 'Khmer',       'Khmer noodle soups and stir-fry',                   'shop.a5@rupp.edu.kh',       10),
  ('A6',     'Shop A6',          'RUPP', 'Snacks',      'Snacks, pastries and quick bites',                   'shop.a6@rupp.edu.kh',        5),
  ('A7',     'Shop A7',          'RUPP', 'Rice',        'Rice dishes with grilled and stewed meats',          'shop.a7@rupp.edu.kh',       10),
  ('A8',     'Shop A8',          'RUPP', 'Noodles',     'Noodle soups and dry noodle dishes',                 'shop.a8@rupp.edu.kh',       10),
  ('A9',     'Shop A9',          'RUPP', 'Healthy',     'Salads, grilled items and low-calorie meals',        'shop.a9@rupp.edu.kh',       10),
  ('A10',    'Shop A10',         'RUPP', 'Desserts',    'Khmer sweets, ice cream and dessert drinks',         'shop.a10@rupp.edu.kh',       8),
  ('B1',     'Shop B1',          'RUPP', 'Khmer',       'Home-style Khmer cooking',                          'shop.b1@rupp.edu.kh',       12),
  ('B2',     'Shop B2',          'RUPP', 'Sandwiches',  'Banh mi and sandwiches',                             'shop.b2@rupp.edu.kh',        5),
  ('B3',     'Shop B3',          'RUPP', 'Rice',        'Grilled rice plates and curry',                      'shop.b3@rupp.edu.kh',       10),
  ('B4',     'Shop B4',          'RUPP', 'Drinks',      'Coffee, tea and blended drinks',                     'shop.b4@rupp.edu.kh',        5),
  ('B5',     'Shop B5',          'RUPP', 'Noodles',     'Beef noodle soup specialty',                         'shop.b5@rupp.edu.kh',       12),
  ('B6',     'Shop B6',          'RUPP', 'Mixed',       'Thai and Khmer fusion dishes',                       'shop.b6@rupp.edu.kh',       12),
  ('B7',     'Shop B7',          'RUPP', 'Snacks',      'Deep-fried snacks and street food',                  'shop.b7@rupp.edu.kh',        5),
  ('B8',     'Shop B8',          'RUPP', 'Healthy',     'Fruit bowls, yogurt and healthy wraps',              'shop.b8@rupp.edu.kh',        8),
  ('B9',     'Shop B9',          'RUPP', 'Desserts',    'Bubble tea and Khmer desserts',                      'shop.b9@rupp.edu.kh',        8),
  ('IFL-NC', 'Nature Café',      'IFL',  'Healthy',     'Organic and healthy café meals',                     'shop.ifl.nc@ifl.edu.kh',    10),
  ('IFL-DMC','DMC Alumni Café',  'IFL',  'Coffee',      'Specialty coffee and light meals',                   'shop.ifl.dmc@ifl.edu.kh',    8),
  ('IFL-NS', 'Niset Café',       'IFL',  'Mixed',       'Casual all-day dining',                              'shop.ifl.niset@ifl.edu.kh', 12),
  ('IFL-UC', 'Urban Canteen',    'IFL',  'International','Western and Asian fusion meals',                    'shop.ifl.urban@ifl.edu.kh', 15),
  ('IFL-C1', 'Normal Canteen 1', 'IFL',  'Khmer',       'Daily Khmer canteen meals',                          'shop.ifl.c1@ifl.edu.kh',    10),
  ('IFL-C2', 'Normal Canteen 2', 'IFL',  'Khmer',       'Daily Khmer canteen meals',                          'shop.ifl.c2@ifl.edu.kh',    10),
  ('IFL-C3', 'Normal Canteen 3', 'IFL',  'Snacks',      'Snacks, drinks and quick meals',                     'shop.ifl.c3@ifl.edu.kh',     8)
) AS s(shop_code, name, campus, category, description, email, prep)
JOIN users u ON u.email = s.email
ON CONFLICT (shop_code) DO NOTHING;

-- ============================================================================
-- MENU CATEGORIES per shop (examples for A1)
-- ============================================================================
INSERT INTO menu_categories (shop_id, name, sort_order)
SELECT s.id, c.name, c.sort_order
FROM shops s
JOIN (VALUES
  ('A1', 'Rice Dishes',   1),
  ('A1', 'Noodles',       2),
  ('A1', 'Drinks',        3),
  ('A1', 'Desserts',      4)
) AS c(shop_code, name, sort_order) ON c.shop_code = s.shop_code
ON CONFLICT (shop_id, name) DO NOTHING;

-- ============================================================================
-- SAMPLE MENU ITEMS  (a handful per shop to demonstrate structure)
-- ============================================================================
INSERT INTO menu_items (shop_id, name, price, calories, is_healthy, is_special, discount_percent, description, image_url, preparation_time)
SELECT s.id, m.name, m.price, m.calories, m.healthy, m.special, m.discount, m.description, m.img, m.prep
FROM shops s
JOIN (VALUES
  -- Shop A1 – Khmer
  ('A1', 'Bai Sach Chrouk',       1.50, 480, false, false, 0,   'Grilled pork over rice with pickled daikon',      'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400', 10),
  ('A1', 'Num Banh Chok',         1.25, 320, true,  true,  10,  'Khmer noodles with fish-based green curry sauce', 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400', 8),
  ('A1', 'Chicken Amok',          2.00, 420, false, true,  0,   'Steamed chicken in coconut lemongrass sauce',     'https://images.unsplash.com/photo-1604908177453-7462950a6a3b?w=400', 15),
  ('A1', 'Iced Coffee',           0.75, 120, false, false, 0,   'Strong Cambodian iced coffee with condensed milk','https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400', 3),

  -- Shop A4 – Drinks
  ('A4', 'Mango Smoothie',        1.50, 210, true,  false, 0,   'Fresh mango blended with yogurt',                 'https://images.unsplash.com/photo-1546173159-315724a31696?w=400', 5),
  ('A4', 'Watermelon Juice',      1.00, 90,  true,  false, 0,   'Fresh-pressed watermelon, no sugar added',        'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400', 3),
  ('A4', 'Coconut Water',         1.25, 50,  true,  true,  15,  'Young coconut water, chilled',                    'https://images.unsplash.com/photo-1560023907-5f339a2d1e2a?w=400', 2),

  -- Shop A9 – Healthy
  ('A9', 'Grilled Chicken Salad', 2.50, 310, true,  true,  0,   'Mixed greens, grilled chicken, sesame dressing',  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400', 10),
  ('A9', 'Quinoa Bowl',           3.00, 380, true,  false, 0,   'Quinoa with roasted vegetables and tahini',       'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400', 12),
  ('A9', 'Steamed Fish with Veg', 2.25, 290, true,  false, 0,   'Steamed white fish with seasonal vegetables',     'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400', 15),

  -- Shop B4 – Coffee
  ('B4', 'Espresso',              1.00, 10,  false, false, 0,   'Double shot espresso',                            'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=400', 3),
  ('B4', 'Latte',                 1.50, 180, false, false, 0,   'Espresso with steamed milk',                      'https://images.unsplash.com/photo-1561882468-9110e03e0f78?w=400', 4),
  ('B4', 'Iced Matcha Latte',     1.75, 160, true,  true,  0,   'Ceremonial grade matcha with oat milk',           'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400', 5),

  -- IFL Nature Café
  ('IFL-NC', 'Avocado Toast',     3.50, 340, true,  true,  0,   'Sourdough with smashed avocado and poached egg',  'https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?w=400', 10),
  ('IFL-NC', 'Acai Bowl',         4.00, 280, true,  false, 0,   'Blended acai with granola and fresh fruit',       'https://images.unsplash.com/photo-1490323914169-4db59c3b5e7a?w=400', 8),

  -- IFL DMC Café
  ('IFL-DMC', 'Flat White',       2.00, 120, false, false, 0,   'Double ristretto with micro-foamed milk',         'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=400', 4),
  ('IFL-DMC', 'Club Sandwich',    3.25, 520, false, false, 0,   'Triple-decker with chicken, bacon and egg',       'https://images.unsplash.com/photo-1528736235302-52922df5c122?w=400', 12)
) AS m(shop_code, name, price, calories, healthy, special, discount, description, img, prep)
ON m.shop_code = s.shop_code
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SHOP OPERATING HOURS  (Mon–Fri 7am–5pm, Sat 7am–12pm, Sun closed)
-- Applied to all shops
-- ============================================================================
INSERT INTO shop_operating_hours (shop_id, day_of_week, opens_at, closes_at, is_closed)
SELECT s.id, d.dow, d.opens, d.closes, d.closed
FROM shops s
CROSS JOIN (VALUES
  (0, '07:00'::TIME, '12:00'::TIME, true),   -- Sunday closed
  (1, '07:00'::TIME, '17:00'::TIME, false),
  (2, '07:00'::TIME, '17:00'::TIME, false),
  (3, '07:00'::TIME, '17:00'::TIME, false),
  (4, '07:00'::TIME, '17:00'::TIME, false),
  (5, '07:00'::TIME, '17:00'::TIME, false),
  (6, '07:00'::TIME, '12:00'::TIME, false)   -- Saturday half day
) AS d(dow, opens, closes, closed)
ON CONFLICT (shop_id, day_of_week) DO NOTHING;
