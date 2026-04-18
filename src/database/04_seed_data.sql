-- Campus Food Ordering System - Seed Data
-- PostgreSQL / Supabase Compatible
-- This file contains sample data for shops and menu items

-- ============================================================================
-- IMPORTANT: Password Hashing
-- ============================================================================
-- Note: In production, passwords should be hashed using bcrypt or similar
-- For this seed file, we use placeholder hashes
-- Replace these with actual hashed passwords before deployment

-- ============================================================================
-- SAMPLE SELLER USERS
-- ============================================================================
-- Creating seller accounts for each shop
-- Password for all sellers: 'seller123' (MUST be hashed in production)

INSERT INTO users (email, password_hash, role, name, phone) VALUES
  ('shop.a1@rupp.edu.kh', '$2b$10$placeholder_hash_for_seller123', 'seller', 'Shop A1 Manager', '+855-12-345-001'),
  ('shop.a2a3@rupp.edu.kh', '$2b$10$placeholder_hash_for_seller123', 'seller', 'Shop A2-A3 Manager', '+855-12-345-002'),
  ('shop.a4@rupp.edu.kh', '$2b$10$placeholder_hash_for_seller123', 'seller', 'Shop A4 Manager', '+855-12-345-004'),
  ('shop.a5@rupp.edu.kh', '$2b$10$placeholder_hash_for_seller123', 'seller', 'Shop A5 Manager', '+855-12-345-005'),
  ('shop.a6@rupp.edu.kh', '$2b$10$placeholder_hash_for_seller123', 'seller', 'Shop A6 Manager', '+855-12-345-006'),
  ('shop.a7@rupp.edu.kh', '$2b$10$placeholder_hash_for_seller123', 'seller', 'Shop A7 Manager', '+855-12-345-007'),
  ('shop.a8@rupp.edu.kh', '$2b$10$placeholder_hash_for_seller123', 'seller', 'Shop A8 Manager', '+855-12-345-008'),
  ('shop.a9@rupp.edu.kh', '$2b$10$placeholder_hash_for_seller123', 'seller', 'Shop A9 Manager', '+855-12-345-009'),
  ('shop.a10@rupp.edu.kh', '$2b$10$placeholder_hash_for_seller123', 'seller', 'Shop A10 Manager', '+855-12-345-010'),
  ('shop.b1@rupp.edu.kh', '$2b$10$placeholder_hash_for_seller123', 'seller', 'Shop B1 Manager', '+855-12-345-011'),
  ('shop.b2@rupp.edu.kh', '$2b$10$placeholder_hash_for_seller123', 'seller', 'Shop B2 Manager', '+855-12-345-012'),
  ('shop.b3@rupp.edu.kh', '$2b$10$placeholder_hash_for_seller123', 'seller', 'Shop B3 Manager', '+855-12-345-013'),
  ('shop.b4@rupp.edu.kh', '$2b$10$placeholder_hash_for_seller123', 'seller', 'Shop B4 Manager', '+855-12-345-014'),
  ('shop.b5@rupp.edu.kh', '$2b$10$placeholder_hash_for_seller123', 'seller', 'Shop B5 Manager', '+855-12-345-015'),
  ('shop.b6@rupp.edu.kh', '$2b$10$placeholder_hash_for_seller123', 'seller', 'Shop B6 Manager', '+855-12-345-016'),
  ('shop.b7@rupp.edu.kh', '$2b$10$placeholder_hash_for_seller123', 'seller', 'Shop B7 Manager', '+855-12-345-017'),
  ('shop.b8@rupp.edu.kh', '$2b$10$placeholder_hash_for_seller123', 'seller', 'Shop B8 Manager', '+855-12-345-018'),
  ('shop.b9@rupp.edu.kh', '$2b$10$placeholder_hash_for_seller123', 'seller', 'Shop B9 Manager', '+855-12-345-019'),
  ('shop.ifl.nc@ifl.edu.kh', '$2b$10$placeholder_hash_for_seller123', 'seller', 'Nature Café Manager', '+855-12-345-020'),
  ('shop.ifl.dmc@ifl.edu.kh', '$2b$10$placeholder_hash_for_seller123', 'seller', 'DMC Alumni Café Manager', '+855-12-345-021'),
  ('shop.ifl.niset@ifl.edu.kh', '$2b$10$placeholder_hash_for_seller123', 'seller', 'Niset Café Manager', '+855-12-345-022'),
  ('shop.ifl.urban@ifl.edu.kh', '$2b$10$placeholder_hash_for_seller123', 'seller', 'Urban Canteen Manager', '+855-12-345-023'),
  ('shop.ifl.norm1@ifl.edu.kh', '$2b$10$placeholder_hash_for_seller123', 'seller', 'Normal Canteen 1 Manager', '+855-12-345-024'),
  ('shop.ifl.norm2@ifl.edu.kh', '$2b$10$placeholder_hash_for_seller123', 'seller', 'Normal Canteen 2 Manager', '+855-12-345-025'),
  ('shop.ifl.norm3@ifl.edu.kh', '$2b$10$placeholder_hash_for_seller123', 'seller', 'Normal Canteen 3 Manager', '+855-12-345-026');

-- ============================================================================
-- SAMPLE STUDENT USERS
-- ============================================================================
-- Sample student accounts for testing
-- Password for all students: 'student123' (MUST be hashed in production)

INSERT INTO users (email, password_hash, role, name, student_id, phone) VALUES
  ('student1@rupp.edu.kh', '$2b$10$placeholder_hash_for_student123', 'student', 'Sokha Chan', 'RUPP2024001', '+855-12-111-001'),
  ('student2@rupp.edu.kh', '$2b$10$placeholder_hash_for_student123', 'student', 'Dara Pov', 'RUPP2024002', '+855-12-111-002'),
  ('student3@ifl.edu.kh', '$2b$10$placeholder_hash_for_student123', 'student', 'Vanna Kim', 'IFL2024001', '+855-12-111-003'),
  ('student4@ifl.edu.kh', '$2b$10$placeholder_hash_for_student123', 'student', 'Rachana Seng', 'IFL2024002', '+855-12-111-004');

-- ============================================================================
-- SHOPS DATA (25 Shops)
-- ============================================================================

INSERT INTO shops (shop_id, name, campus, category, description, owner_id) 
SELECT 
  'A1', 
  'Shop A1', 
  'RUPP', 
  'Mixed Menu',
  'Mixed Menu - Rice, Noodles & Drinks',
  u.id 
FROM users u WHERE u.email = 'shop.a1@rupp.edu.kh';

INSERT INTO shops (shop_id, name, campus, category, description, owner_id) 
SELECT 
  'A2-A3', 
  'Shop A2-A3', 
  'RUPP', 
  'Full Menu',
  'Joined Shop - Full Menu',
  u.id 
FROM users u WHERE u.email = 'shop.a2a3@rupp.edu.kh';

INSERT INTO shops (shop_id, name, campus, category, description, owner_id) 
SELECT 
  'A4', 
  'Shop A4', 
  'RUPP', 
  'Mixed Menu',
  'Mixed Menu',
  u.id 
FROM users u WHERE u.email = 'shop.a4@rupp.edu.kh';

INSERT INTO shops (shop_id, name, campus, category, description, owner_id) 
SELECT 
  'A5', 
  'Shop A5', 
  'RUPP', 
  'Noodles',
  'Noodles & Rice',
  u.id 
FROM users u WHERE u.email = 'shop.a5@rupp.edu.kh';

INSERT INTO shops (shop_id, name, campus, category, description, owner_id) 
SELECT 
  'A6', 
  'Shop A6', 
  'RUPP', 
  'Healthy',
  'Healthy Food Only',
  u.id 
FROM users u WHERE u.email = 'shop.a6@rupp.edu.kh';

INSERT INTO shops (shop_id, name, campus, category, description, owner_id) 
SELECT 
  'A7', 
  'Shop A7', 
  'RUPP', 
  'Mixed Menu',
  'Mixed Menu',
  u.id 
FROM users u WHERE u.email = 'shop.a7@rupp.edu.kh';

INSERT INTO shops (shop_id, name, campus, category, description, owner_id) 
SELECT 
  'A8', 
  'Shop A8', 
  'RUPP', 
  'Meals',
  'Meals & Drinks',
  u.id 
FROM users u WHERE u.email = 'shop.a8@rupp.edu.kh';

INSERT INTO shops (shop_id, name, campus, category, description, owner_id) 
SELECT 
  'A9', 
  'Shop A9', 
  'RUPP', 
  'Rice & Noodles',
  'Rice & Noodles',
  u.id 
FROM users u WHERE u.email = 'shop.a9@rupp.edu.kh';

INSERT INTO shops (shop_id, name, campus, category, description, owner_id) 
SELECT 
  'A10', 
  'Shop A10', 
  'RUPP', 
  'Full Menu',
  'Full Menu',
  u.id 
FROM users u WHERE u.email = 'shop.a10@rupp.edu.kh';

INSERT INTO shops (shop_id, name, campus, category, description, owner_id) 
SELECT 
  'B1', 
  'Shop B1', 
  'RUPP', 
  'Khmer',
  'Khmer Food & Rice',
  u.id 
FROM users u WHERE u.email = 'shop.b1@rupp.edu.kh';

INSERT INTO shops (shop_id, name, campus, category, description, owner_id) 
SELECT 
  'B2', 
  'Shop B2', 
  'RUPP', 
  'Noodles',
  'Noodle Soups',
  u.id 
FROM users u WHERE u.email = 'shop.b2@rupp.edu.kh';

INSERT INTO shops (shop_id, name, campus, category, description, owner_id) 
SELECT 
  'B3', 
  'Shop B3', 
  'RUPP', 
  'BBQ',
  'BBQ & Grilled Food',
  u.id 
FROM users u WHERE u.email = 'shop.b3@rupp.edu.kh';

INSERT INTO shops (shop_id, name, campus, category, description, owner_id) 
SELECT 
  'B4', 
  'Shop B4', 
  'RUPP', 
  'Snacks',
  'Fried Snacks',
  u.id 
FROM users u WHERE u.email = 'shop.b4@rupp.edu.kh';

INSERT INTO shops (shop_id, name, campus, category, description, owner_id) 
SELECT 
  'B5', 
  'Shop B5', 
  'RUPP', 
  'Breakfast',
  'Breakfast & Porridge',
  u.id 
FROM users u WHERE u.email = 'shop.b5@rupp.edu.kh';

INSERT INTO shops (shop_id, name, campus, category, description, owner_id) 
SELECT 
  'B6', 
  'Shop B6', 
  'RUPP', 
  'Healthy',
  'Healthy Bowls & Smoothies',
  u.id 
FROM users u WHERE u.email = 'shop.b6@rupp.edu.kh';

INSERT INTO shops (shop_id, name, campus, category, description, owner_id) 
SELECT 
  'B7', 
  'Shop B7', 
  'RUPP', 
  'Fried Food',
  'Fried Chicken & Cheese',
  u.id 
FROM users u WHERE u.email = 'shop.b7@rupp.edu.kh';

INSERT INTO shops (shop_id, name, campus, category, description, owner_id) 
SELECT 
  'B8', 
  'Shop B8', 
  'RUPP', 
  'Drinks',
  'Smoothies & Drinks',
  u.id 
FROM users u WHERE u.email = 'shop.b8@rupp.edu.kh';

INSERT INTO shops (shop_id, name, campus, category, description, owner_id) 
SELECT 
  'B9', 
  'Shop B9', 
  'RUPP', 
  'Coffee',
  'Coffee Shop Only',
  u.id 
FROM users u WHERE u.email = 'shop.b9@rupp.edu.kh';

INSERT INTO shops (shop_id, name, campus, category, description, owner_id) 
SELECT 
  'IFL-NC', 
  'Nature Café', 
  'IFL', 
  'Organic',
  'Premium Organic & Healthy Food',
  u.id 
FROM users u WHERE u.email = 'shop.ifl.nc@ifl.edu.kh';

INSERT INTO shops (shop_id, name, campus, category, description, owner_id) 
SELECT 
  'IFL-DMC', 
  'DMC Alumni Café', 
  'IFL', 
  'Bakery',
  'Affordable Baked Goods & Coffee',
  u.id 
FROM users u WHERE u.email = 'shop.ifl.dmc@ifl.edu.kh';

INSERT INTO shops (shop_id, name, campus, category, description, owner_id) 
SELECT 
  'IFL-NISET', 
  'Niset Café (IFL)', 
  'IFL', 
  'Local',
  'Rice Plates & Local Favorites',
  u.id 
FROM users u WHERE u.email = 'shop.ifl.niset@ifl.edu.kh';

INSERT INTO shops (shop_id, name, campus, category, description, owner_id) 
SELECT 
  'IFL-URBAN', 
  'Urban Canteen', 
  'IFL', 
  'International',
  'International Fine Dining',
  u.id 
FROM users u WHERE u.email = 'shop.ifl.urban@ifl.edu.kh';

INSERT INTO shops (shop_id, name, campus, category, description, owner_id) 
SELECT 
  'IFL-NORM1', 
  'Normal Canteen 1', 
  'IFL', 
  'Budget',
  'Budget Rice & Noodles',
  u.id 
FROM users u WHERE u.email = 'shop.ifl.norm1@ifl.edu.kh';

INSERT INTO shops (shop_id, name, campus, category, description, owner_id) 
SELECT 
  'IFL-NORM2', 
  'Normal Canteen 2', 
  'IFL', 
  'Noodles',
  'Noodles & Fried Rice',
  u.id 
FROM users u WHERE u.email = 'shop.ifl.norm2@ifl.edu.kh';

INSERT INTO shops (shop_id, name, campus, category, description, owner_id) 
SELECT 
  'IFL-NORM3', 
  'Normal Canteen 3', 
  'IFL', 
  'Vegetarian',
  'Vegetarian & Mixed Menu',
  u.id 
FROM users u WHERE u.email = 'shop.ifl.norm3@ifl.edu.kh';

-- ============================================================================
-- MENU ITEMS DATA
-- ============================================================================
-- Note: This is a sample of menu items. The actual implementation should
-- include all items from your menuData.ts file.
-- For brevity, this file shows the structure for a few items from each shop.

-- Shop A1 Menu Items (12 items total in full dataset)
INSERT INTO menu_items (shop_id, name, price, category, health_classification, description, preparation_time_minutes)
SELECT s.id, 'Chicken Fried Rice', 2.30, 'Rice', 'moderate', 'Wok-fried rice with chicken and vegetables', 8
FROM shops s WHERE s.shop_id = 'A1';

INSERT INTO menu_items (shop_id, name, price, category, health_classification, description, preparation_time_minutes)
SELECT s.id, 'Vegetable Stir-Fry', 1.90, 'Vegetables', 'healthy', 'Fresh vegetables stir-fried with garlic', 6
FROM shops s WHERE s.shop_id = 'A1';

INSERT INTO menu_items (shop_id, name, price, category, health_classification, description, preparation_time_minutes)
SELECT s.id, 'Fresh Spring Rolls', 1.20, 'Snacks', 'healthy', 'Rice paper rolls with vegetables and herbs', 5
FROM shops s WHERE s.shop_id = 'A1';

-- Shop A6 Menu Items (Healthy Food Only - 10 items)
INSERT INTO menu_items (shop_id, name, price, category, health_classification, description, preparation_time_minutes)
SELECT s.id, 'Tofu Rice Bowl', 2.30, 'Rice', 'healthy', 'Grilled tofu with brown rice and vegetables', 10
FROM shops s WHERE s.shop_id = 'A6';

INSERT INTO menu_items (shop_id, name, price, category, health_classification, description, preparation_time_minutes)
SELECT s.id, 'Salad Bowl', 2.50, 'Salads', 'healthy', 'Fresh garden salad with vinaigrette', 6
FROM shops s WHERE s.shop_id = 'A6';

INSERT INTO menu_items (shop_id, name, price, category, health_classification, description, preparation_time_minutes)
SELECT s.id, 'Green Smoothie', 2.20, 'Drinks', 'healthy', 'Kale, spinach, apple and banana blend', 5
FROM shops s WHERE s.shop_id = 'A6';

-- IFL Nature Café Menu Items (Premium Organic - 20 items)
INSERT INTO menu_items (shop_id, name, price, category, health_classification, description, preparation_time_minutes)
SELECT s.id, 'Organic Quinoa Bowl', 3.50, 'Rice', 'healthy', 'Quinoa with roasted vegetables and tahini dressing', 12
FROM shops s WHERE s.shop_id = 'IFL-NC';

INSERT INTO menu_items (shop_id, name, price, category, health_classification, description, preparation_time_minutes)
SELECT s.id, 'Avocado Toast', 3.20, 'Breakfast', 'healthy', 'Whole grain toast with smashed avocado and seeds', 8
FROM shops s WHERE s.shop_id = 'IFL-NC';

INSERT INTO menu_items (shop_id, name, price, category, health_classification, description, preparation_time_minutes)
SELECT s.id, 'Acai Power Bowl', 3.80, 'Snacks', 'healthy', 'Acai berries with granola, fruits, and honey', 10
FROM shops s WHERE s.shop_id = 'IFL-NC';

-- ============================================================================
-- NOTES FOR COMPLETE IMPLEMENTATION
-- ============================================================================
-- 
-- To complete the seed data:
-- 1. Extract all menu items from /data/menuData.ts
-- 2. Convert each menu item to an INSERT statement following the pattern above
-- 3. Map health classification:
--    - isHealthy: true -> 'healthy'
--    - calories < 300 -> 'healthy'
--    - calories 300-500 -> 'moderate'
--    - calories > 500 -> 'indulgent'
-- 4. Include image URLs if needed (store in image_url column)
-- 5. Map preparationTime from the menuData.ts file
-- 
-- Total expected menu items: ~300+ items across all 25 shops
-- 
-- ============================================================================
