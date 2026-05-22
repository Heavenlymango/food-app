import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.ts";
import * as crypto from "node:crypto";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
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

// Initialize sellers on startup
initializeSellers().catch(console.error);

// Seed shops and menu items from the canonical data set
async function initializeMenuData() {
  const VERSION = 'menu-initialized-v3';
  const initialized = await kv.get(VERSION);
  if (initialized) {
    console.log('Menu + shop data already seeded');
    return;
  }
  console.log('Seeding shops and menu items...');

  const seedShops = [
    { id: 'A1',       name: 'Shop A1',           description: 'Mixed Menu - Rice, Noodles & Drinks', healthyCount: 6,  totalItems: 12, campus: 'RUPP' },
    { id: 'A2-A3',   name: 'Shop A2-A3',         description: 'Joined Shop - Full Menu',              healthyCount: 7,  totalItems: 15, campus: 'RUPP' },
    { id: 'A4',       name: 'Shop A4',            description: 'Mixed Menu',                           healthyCount: 4,  totalItems: 10, campus: 'RUPP' },
    { id: 'A5',       name: 'Shop A5',            description: 'Noodles & Rice',                       healthyCount: 5,  totalItems: 10, campus: 'RUPP' },
    { id: 'A6',       name: 'Shop A6',            description: 'Healthy Food Only',                    healthyCount: 10, totalItems: 10, campus: 'RUPP' },
    { id: 'A7',       name: 'Shop A7',            description: 'Mixed Menu',                           healthyCount: 5,  totalItems: 10, campus: 'RUPP' },
    { id: 'A8',       name: 'Shop A8',            description: 'Meals & Drinks',                       healthyCount: 5,  totalItems: 10, campus: 'RUPP' },
    { id: 'A9',       name: 'Shop A9',            description: 'Rice & Noodles',                       healthyCount: 5,  totalItems: 10, campus: 'RUPP' },
    { id: 'A10',      name: 'Shop A10',           description: 'Full Menu',                            healthyCount: 5,  totalItems: 10, campus: 'RUPP' },
    { id: 'B1',       name: 'Shop B1',            description: 'Khmer Food & Rice',                    healthyCount: 4,  totalItems: 10, campus: 'RUPP' },
    { id: 'B2',       name: 'Shop B2',            description: 'Noodle Soups',                         healthyCount: 5,  totalItems: 10, campus: 'RUPP' },
    { id: 'B3',       name: 'Shop B3',            description: 'BBQ & Grilled Food',                   healthyCount: 5,  totalItems: 10, campus: 'RUPP' },
    { id: 'B4',       name: 'Shop B4',            description: 'Fried Snacks',                         healthyCount: 0,  totalItems: 10, campus: 'RUPP' },
    { id: 'B5',       name: 'Shop B5',            description: 'Breakfast & Porridge',                 healthyCount: 6,  totalItems: 10, campus: 'RUPP' },
    { id: 'B6',       name: 'Shop B6',            description: 'Healthy Bowls & Smoothies',            healthyCount: 10, totalItems: 10, campus: 'RUPP' },
    { id: 'B7',       name: 'Shop B7',            description: 'Fried Chicken & Cheese',               healthyCount: 0,  totalItems: 10, campus: 'RUPP' },
    { id: 'B8',       name: 'Shop B8',            description: 'Smoothies & Drinks',                   healthyCount: 4,  totalItems: 10, campus: 'RUPP' },
    { id: 'B9',       name: 'Shop B9',            description: 'Coffee Shop Only',                     healthyCount: 3,  totalItems: 10, campus: 'RUPP' },
    { id: 'IFL-NC',   name: 'Nature Café',        description: 'Premium Organic & Healthy Food',       healthyCount: 10, totalItems: 20, campus: 'IFL'  },
    { id: 'IFL-DMC',  name: 'DMC Alumni Café',    description: 'Affordable Baked Goods & Coffee',      healthyCount: 11, totalItems: 20, campus: 'IFL'  },
    { id: 'IFL-NISET',name: 'Niset Café (IFL)',   description: 'Rice Plates & Local Favorites',        healthyCount: 7,  totalItems: 22, campus: 'IFL'  },
    { id: 'IFL-URBAN',name: 'Urban Canteen',      description: 'International Fine Dining',            healthyCount: 9,  totalItems: 20, campus: 'IFL'  },
    { id: 'IFL-NORM1',name: 'Normal Canteen 1',   description: 'Budget Rice & Noodles',                healthyCount: 11, totalItems: 20, campus: 'IFL'  },
    { id: 'IFL-NORM2',name: 'Normal Canteen 2',   description: 'Noodles & Fried Rice',                 healthyCount: 8,  totalItems: 20, campus: 'IFL'  },
    { id: 'IFL-NORM3',name: 'Normal Canteen 3',   description: 'Vegetarian & Mixed Menu',              healthyCount: 13, totalItems: 20, campus: 'IFL'  },
  ];

  for (const shop of seedShops) {
    await kv.set(`shop:${shop.id}`, shop);
  }

  const seedItems = [
    // Shop A1
    { id:'A1-1',  name:'Chicken Fried Rice',    description:'Wok-fried rice with chicken and vegetables',  price:2.30, category:'Rice',      calories:520, isHealthy:false, isSpecial:false, image:'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400', preparationTime:8,  shop:'A1' },
    { id:'A1-2',  name:'Vegetable Stir-Fry',    description:'Fresh vegetables stir-fried with garlic',     price:1.90, category:'Vegetables',calories:180, isHealthy:true,  isSpecial:true,  image:'https://images.unsplash.com/photo-1758979690131-11e2aa0b142b?w=400', preparationTime:6,  shop:'A1' },
    { id:'A1-3',  name:'Fresh Spring Rolls',    description:'Rice paper rolls with vegetables and herbs',  price:1.20, category:'Snacks',    calories:150, isHealthy:true,  isSpecial:true,  image:'https://images.unsplash.com/photo-1695712641569-05eee7b37b6d?w=400', preparationTime:5,  shop:'A1' },
    { id:'A1-4',  name:'Iced Milk Tea',         description:'Sweet milk tea with ice',                     price:1.70, category:'Drinks',    calories:180, isHealthy:false, isSpecial:false, image:'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400', preparationTime:3,  shop:'A1' },
    { id:'A1-5',  name:'Fruit Salad',           description:'Fresh mixed seasonal fruits',                 price:2.00, category:'Snacks',    calories:120, isHealthy:true,  isSpecial:false, image:'https://images.unsplash.com/photo-1564093497595-593b96d80180?w=400', preparationTime:5,  shop:'A1' },
    { id:'A1-7',  name:'Khmer Noodle Soup',     description:'Traditional soup with rice noodles',          price:2.20, category:'Soup',      calories:320, isHealthy:true,  isSpecial:true,  image:'https://images.unsplash.com/photo-1701480253822-1842236c9a97?w=400', preparationTime:10, shop:'A1' },
    { id:'A1-10', name:'Iced Coffee',           description:'Strong iced coffee with condensed milk',      price:1.30, category:'Drinks',    calories:150, isHealthy:false, isSpecial:false, image:'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400', preparationTime:3,  shop:'A1' },
    { id:'A1-12', name:'French Fries',          description:'Crispy golden french fries',                  price:1.30, category:'Snacks',    calories:360, isHealthy:false, isSpecial:false, image:'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=400', preparationTime:6,  shop:'A1' },
    // Shop A2-A3
    { id:'A2-1',  name:'Stir-Fried Noodles',   description:'Wok-tossed noodles with vegetables',          price:2.10, category:'Noodles',   calories:450, isHealthy:false, isSpecial:false, image:'https://images.unsplash.com/photo-1758979690131-11e2aa0b142b?w=400', preparationTime:8,  shop:'A2-A3' },
    { id:'A2-2',  name:'Grilled Chicken Rice',  description:'Grilled chicken with steamed rice',           price:2.60, category:'Rice',      calories:420, isHealthy:true,  isSpecial:true,  image:'https://images.unsplash.com/photo-1581184953963-d15972933db1?w=400', preparationTime:12, shop:'A2-A3' },
    { id:'A2-4',  name:'Grilled Pork Rice',     description:'Marinated pork with broken rice',             price:2.50, category:'Rice',      calories:480, isHealthy:true,  isSpecial:true,  image:'https://images.unsplash.com/photo-1759670332534-21a316c53462?w=400', preparationTime:12, shop:'A2-A3' },
    { id:'A2-5',  name:'Chicken Salad Bowl',    description:'Fresh greens with grilled chicken',           price:2.50, category:'Salads',    calories:280, isHealthy:true,  isSpecial:false, image:'https://images.unsplash.com/photo-1649531794884-b8bb1de72e68?w=400', preparationTime:8,  shop:'A2-A3' },
    { id:'A2-6',  name:'Beef Pho',              description:'Rich beef broth with noodles',                price:2.70, category:'Noodles',   calories:420, isHealthy:true,  isSpecial:false, image:'https://images.unsplash.com/photo-1631709497146-a239ef373cf1?w=400', preparationTime:15, shop:'A2-A3' },
    { id:'A2-7',  name:'Seafood Fried Rice',    description:'Mixed seafood with wok-fried rice',           price:2.90, category:'Rice',      calories:560, isHealthy:false, isSpecial:true,  image:'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400', preparationTime:10, shop:'A2-A3' },
    { id:'A2-8',  name:'Papaya Salad',          description:'Spicy green papaya salad',                    price:1.50, category:'Salads',    calories:120, isHealthy:true,  isSpecial:false, image:'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400', preparationTime:6,  shop:'A2-A3' },
    { id:'A2-11', name:'Tom Yum Soup',          description:'Spicy and sour Thai soup',                    price:2.40, category:'Soup',      calories:180, isHealthy:true,  isSpecial:false, image:'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400', preparationTime:12, shop:'A2-A3' },
    { id:'A2-14', name:'Shrimp Pad Thai',       description:'Classic Thai stir-fried noodles',             price:2.80, category:'Noodles',   calories:520, isHealthy:false, isSpecial:false, image:'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400', preparationTime:10, shop:'A2-A3' },
    // Shop A4
    { id:'A4-1',  name:'Grilled Pork Rice',     description:'Popular morning dish',                        price:2.20, category:'Rice',      calories:480, isHealthy:false, isSpecial:false, image:'https://images.unsplash.com/photo-1759670332534-21a316c53462?w=400', preparationTime:12, shop:'A4' },
    { id:'A4-2',  name:'Beef Lok Lak',          description:'Khmer-style stir-fried beef with rice',       price:2.80, category:'Rice',      calories:550, isHealthy:false, isSpecial:true,  image:'https://images.unsplash.com/photo-1544025162-d76694265947?w=400', preparationTime:15, shop:'A4' },
    { id:'A4-3',  name:'Fish Soup',             description:'Clear fish broth soup',                       price:2.30, category:'Soup',      calories:280, isHealthy:true,  isSpecial:false, image:'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=400', preparationTime:10, shop:'A4' },
    { id:'A4-5',  name:'Stir-Fried Vegetables', description:'Low oil stir-fried vegetables',              price:1.80, category:'Vegetables',calories:180, isHealthy:true,  isSpecial:true,  image:'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400', preparationTime:6,  shop:'A4' },
    { id:'A4-6',  name:'Chicken Noodle Soup',   description:'Light chicken broth noodles',                 price:2.10, category:'Noodles',   calories:340, isHealthy:true,  isSpecial:false, image:'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400', preparationTime:10, shop:'A4' },
    { id:'A4-9',  name:'Spring Rolls',          description:'Crispy vegetarian spring rolls',              price:1.50, category:'Snacks',    calories:150, isHealthy:true,  isSpecial:false, image:'https://images.unsplash.com/photo-1695712641569-05eee7b37b6d?w=400', preparationTime:5,  shop:'A4' },
    // Shop A5
    { id:'A5-1',  name:'Beef Noodle Soup',      description:'Classic style beef pho',                      price:2.50, category:'Noodles',   calories:420, isHealthy:true,  isSpecial:false, image:'https://images.unsplash.com/photo-1631709497146-a239ef373cf1?w=400', preparationTime:12, shop:'A5' },
    { id:'A5-2',  name:'BBQ Pork Rice',         description:'Sweet BBQ marinade pork',                     price:2.00, category:'Rice',      calories:500, isHealthy:false, isSpecial:true,  image:'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400', preparationTime:12, shop:'A5' },
    { id:'A5-3',  name:'Chicken Curry',         description:'Rice included',                               price:2.40, category:'Rice',      calories:580, isHealthy:false, isSpecial:false, image:'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400', preparationTime:15, shop:'A5' },
    { id:'A5-4',  name:'Vegetable Stir Fry',    description:'Light salt, fresh vegetables',                price:1.70, category:'Vegetables',calories:190, isHealthy:true,  isSpecial:true,  image:'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400', preparationTime:6,  shop:'A5' },
    { id:'A5-5',  name:'Shrimp Fried Rice',     description:'Standard portion shrimp fried rice',          price:2.20, category:'Rice',      calories:540, isHealthy:false, isSpecial:false, image:'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400', preparationTime:8,  shop:'A5' },
    // Shop A6 (Healthy Only)
    { id:'A6-1',  name:'Quinoa Salad Bowl',     description:'Quinoa with roasted vegetables',              price:3.50, category:'Salads',    calories:310, isHealthy:true,  isSpecial:false, image:'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400', preparationTime:8,  shop:'A6' },
    { id:'A6-2',  name:'Green Detox Smoothie',  description:'Spinach, cucumber, lemon blend',             price:2.50, category:'Drinks',    calories:120, isHealthy:true,  isSpecial:false, image:'https://images.unsplash.com/photo-1638176067239-fc40e1cadc68?w=400', preparationTime:5,  shop:'A6' },
    { id:'A6-3',  name:'Steamed Chicken Breast',description:'With mixed vegetables',                      price:3.20, category:'Meal',      calories:280, isHealthy:true,  isSpecial:true,  image:'https://images.unsplash.com/photo-1580554996521-9cb34cc5b398?w=400', preparationTime:12, shop:'A6' },
    { id:'A6-4',  name:'Avocado Toast',         description:'Multigrain bread with avocado',              price:2.80, category:'Breakfast', calories:320, isHealthy:true,  isSpecial:false, image:'https://images.unsplash.com/photo-1541519227354-08fa5d50c820?w=400', preparationTime:7,  shop:'A6' },
    { id:'A6-5',  name:'Acai Berry Bowl',       description:'Acai blend with granola and fruits',         price:3.80, category:'Breakfast', calories:340, isHealthy:true,  isSpecial:true,  image:'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400', preparationTime:8,  shop:'A6' },
    // Shop B1 (Khmer Food)
    { id:'B1-1',  name:'Amok Fish',             description:'Traditional Khmer fish curry in coconut',    price:3.00, category:'Khmer',     calories:380, isHealthy:true,  isSpecial:true,  image:'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400', preparationTime:15, shop:'B1' },
    { id:'B1-2',  name:'Lok Lak Beef',          description:'Stir-fried beef with lime-pepper sauce',     price:3.20, category:'Khmer',     calories:520, isHealthy:false, isSpecial:true,  image:'https://images.unsplash.com/photo-1544025162-d76694265947?w=400', preparationTime:15, shop:'B1' },
    { id:'B1-3',  name:'Bai Sach Chrouk',       description:'Grilled pork over rice - Khmer breakfast',   price:2.20, category:'Rice',      calories:480, isHealthy:false, isSpecial:false, image:'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400', preparationTime:10, shop:'B1' },
    { id:'B1-4',  name:'Num Banh Chok',         description:'Khmer rice noodles with green curry',        price:2.00, category:'Noodles',   calories:320, isHealthy:true,  isSpecial:false, image:'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400', preparationTime:10, shop:'B1' },
    { id:'B1-5',  name:'Samlor Korko',          description:'Khmer stirring soup with vegetables',        price:2.50, category:'Soup',      calories:240, isHealthy:true,  isSpecial:false, image:'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=400', preparationTime:12, shop:'B1' },
    // Shop B2 (Noodle Soups)
    { id:'B2-1',  name:'Pho Bo',                description:'Vietnamese beef pho with herbs',             price:2.80, category:'Noodles',   calories:420, isHealthy:true,  isSpecial:false, image:'https://images.unsplash.com/photo-1631709497146-a239ef373cf1?w=400', preparationTime:15, shop:'B2' },
    { id:'B2-2',  name:'Wonton Noodle Soup',    description:'Egg noodles with pork wontons',              price:2.50, category:'Noodles',   calories:380, isHealthy:false, isSpecial:true,  image:'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400', preparationTime:12, shop:'B2' },
    { id:'B2-3',  name:'Ramen',                 description:'Japanese-style ramen with egg',              price:3.00, category:'Noodles',   calories:520, isHealthy:false, isSpecial:false, image:'https://images.unsplash.com/photo-1557872943-16a5ac26437e?w=400', preparationTime:12, shop:'B2' },
    { id:'B2-4',  name:'Laksa',                 description:'Spicy coconut curry noodle soup',            price:2.90, category:'Noodles',   calories:540, isHealthy:false, isSpecial:true,  image:'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400', preparationTime:12, shop:'B2' },
    // Shop B3 (BBQ & Grilled)
    { id:'B3-1',  name:'BBQ Chicken Skewer',    description:'Marinated chicken skewers grilled',          price:2.50, category:'BBQ',       calories:320, isHealthy:true,  isSpecial:false, image:'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400', preparationTime:15, shop:'B3' },
    { id:'B3-2',  name:'Grilled Pork Ribs',     description:'Slow-grilled pork ribs',                     price:4.50, category:'BBQ',       calories:620, isHealthy:false, isSpecial:true,  image:'https://images.unsplash.com/photo-1544025162-d76694265947?w=400', preparationTime:20, shop:'B3' },
    { id:'B3-3',  name:'Grilled Corn',          description:'Sweet corn with butter',                     price:1.00, category:'Snacks',    calories:160, isHealthy:true,  isSpecial:false, image:'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400', preparationTime:8,  shop:'B3' },
    { id:'B3-4',  name:'Grilled Seafood Platter',description:'Shrimp, squid, and fish grilled',           price:5.00, category:'BBQ',       calories:480, isHealthy:true,  isSpecial:true,  image:'https://images.unsplash.com/photo-1615361200141-f45040f367be?w=400', preparationTime:20, shop:'B3' },
    // Shop B5 (Breakfast)
    { id:'B5-1',  name:'Rice Porridge',         description:'Cambodian congee with chicken',              price:1.80, category:'Breakfast', calories:280, isHealthy:true,  isSpecial:false, image:'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400', preparationTime:8,  shop:'B5' },
    { id:'B5-2',  name:'French Baguette',       description:'Cambodian baguette with pate',               price:1.50, category:'Breakfast', calories:340, isHealthy:false, isSpecial:false, image:'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400', preparationTime:5,  shop:'B5' },
    { id:'B5-3',  name:'Fried Egg Rice',        description:'Steamed rice with fried egg',                price:1.20, category:'Breakfast', calories:380, isHealthy:false, isSpecial:true,  image:'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400', preparationTime:6,  shop:'B5' },
    { id:'B5-4',  name:'Banana Pancakes',       description:'Fluffy pancakes with banana',                price:2.00, category:'Breakfast', calories:420, isHealthy:false, isSpecial:false, image:'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=400', preparationTime:10, shop:'B5' },
    // Shop B6 (Healthy Bowls)
    { id:'B6-1',  name:'Açaí Bowl',             description:'Açaí with granola, banana, berries',         price:3.50, category:'Breakfast', calories:320, isHealthy:true,  isSpecial:false, image:'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=400', preparationTime:8,  shop:'B6' },
    { id:'B6-2',  name:'Green Power Smoothie',  description:'Spinach, apple, ginger, lemon',             price:2.80, category:'Drinks',    calories:140, isHealthy:true,  isSpecial:false, image:'https://images.unsplash.com/photo-1638176067239-fc40e1cadc68?w=400', preparationTime:5,  shop:'B6' },
    { id:'B6-3',  name:'Buddha Bowl',           description:'Grain bowl with roasted veggies and tahini', price:4.00, category:'Meal',      calories:420, isHealthy:true,  isSpecial:true,  image:'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400', preparationTime:10, shop:'B6' },
    { id:'B6-4',  name:'Mango Smoothie Bowl',   description:'Mango, coconut milk, chia seeds',            price:3.20, category:'Breakfast', calories:280, isHealthy:true,  isSpecial:true,  image:'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=400', preparationTime:8,  shop:'B6' },
    // Shop B7 (Fried Chicken)
    { id:'B7-1',  name:'Crispy Fried Chicken',  description:'Golden fried chicken pieces',                price:2.50, category:'Fried',     calories:580, isHealthy:false, isSpecial:false, image:'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=400', preparationTime:15, shop:'B7' },
    { id:'B7-2',  name:'Cheese Burger',         description:'Beef patty with cheese and lettuce',         price:3.00, category:'Meal',      calories:650, isHealthy:false, isSpecial:true,  image:'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400', preparationTime:12, shop:'B7' },
    { id:'B7-3',  name:'Chicken Wings',         description:'Spicy fried chicken wings',                  price:2.00, category:'Fried',     calories:480, isHealthy:false, isSpecial:false, image:'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=400', preparationTime:12, shop:'B7' },
    { id:'B7-4',  name:'Cheese Fries',          description:'Fries with melted cheese sauce',             price:2.20, category:'Snacks',    calories:520, isHealthy:false, isSpecial:false, image:'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=400', preparationTime:8,  shop:'B7' },
    // Shop B9 (Coffee)
    { id:'B9-1',  name:'Cambodian Iced Coffee', description:'Strong coffee with condensed milk',          price:1.50, category:'Coffee',    calories:180, isHealthy:false, isSpecial:false, image:'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400', preparationTime:3,  shop:'B9' },
    { id:'B9-2',  name:'Cappuccino',            description:'Espresso with steamed milk foam',            price:2.50, category:'Coffee',    calories:120, isHealthy:false, isSpecial:false, image:'https://images.unsplash.com/photo-1529892485617-25f63cd7b1e9?w=400', preparationTime:4,  shop:'B9' },
    { id:'B9-3',  name:'Matcha Latte',          description:'Japanese matcha with oat milk',             price:2.80, category:'Coffee',    calories:160, isHealthy:true,  isSpecial:true,  image:'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400', preparationTime:4,  shop:'B9' },
    { id:'B9-4',  name:'Affogato',              description:'Vanilla ice cream with espresso',            price:3.00, category:'Coffee',    calories:220, isHealthy:false, isSpecial:true,  image:'https://images.unsplash.com/photo-1529892485617-25f63cd7b1e9?w=400', preparationTime:3,  shop:'B9' },
    // IFL - Nature Café
    { id:'IFL-NC-1',   name:'Organic Salad Bowl',       description:'Organic greens with house dressing',          price:4.50, category:'Salads',    calories:220, isHealthy:true,  isSpecial:false, image:'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400', preparationTime:8,  shop:'IFL-NC' },
    { id:'IFL-NC-2',   name:'Cold Pressed Juice',       description:'Fresh pressed fruit and vegetable juice',     price:3.50, category:'Drinks',    calories:130, isHealthy:true,  isSpecial:false, image:'https://images.unsplash.com/photo-1638176067239-fc40e1cadc68?w=400', preparationTime:5,  shop:'IFL-NC' },
    { id:'IFL-NC-3',   name:'Tofu Bowl',                description:'Pan-seared tofu with brown rice',             price:4.00, category:'Meal',      calories:380, isHealthy:true,  isSpecial:true,  image:'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400', preparationTime:10, shop:'IFL-NC' },
    { id:'IFL-NC-4',   name:'Granola Bowl',             description:'House-made granola with berries',             price:3.80, category:'Breakfast', calories:340, isHealthy:true,  isSpecial:false, image:'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=400', preparationTime:5,  shop:'IFL-NC' },
    // IFL - DMC Alumni Café
    { id:'IFL-DMC-1',  name:'Croissant',               description:'Buttery flaky croissant',                     price:2.50, category:'Breakfast', calories:280, isHealthy:false, isSpecial:false, image:'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400', preparationTime:3,  shop:'IFL-DMC' },
    { id:'IFL-DMC-2',  name:'Americano',               description:'Double shot espresso',                        price:2.00, category:'Coffee',    calories:10,  isHealthy:true,  isSpecial:false, image:'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400', preparationTime:3,  shop:'IFL-DMC' },
    { id:'IFL-DMC-3',  name:'Egg & Ham Sandwich',      description:'On toasted sourdough',                        price:3.50, category:'Breakfast', calories:420, isHealthy:false, isSpecial:true,  image:'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400', preparationTime:7,  shop:'IFL-DMC' },
    { id:'IFL-DMC-4',  name:'Banana Bread',            description:'Moist homemade banana bread',                 price:2.20, category:'Snacks',    calories:310, isHealthy:false, isSpecial:false, image:'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400', preparationTime:3,  shop:'IFL-DMC' },
    // IFL - Niset Café
    { id:'IFL-NISET-1',name:'Steamed Rice + 3 Dishes', description:'Rice with 3 selected side dishes',           price:2.50, category:'Rice',      calories:520, isHealthy:true,  isSpecial:false, image:'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400', preparationTime:8,  shop:'IFL-NISET' },
    { id:'IFL-NISET-2',name:'Pork Lok Lak Rice',       description:'Khmer-style pork with fried egg',            price:2.80, category:'Rice',      calories:560, isHealthy:false, isSpecial:true,  image:'https://images.unsplash.com/photo-1544025162-d76694265947?w=400', preparationTime:12, shop:'IFL-NISET' },
    { id:'IFL-NISET-3',name:'Chicken Soup Noodles',    description:'Clear broth with rice noodles',              price:2.30, category:'Noodles',   calories:320, isHealthy:true,  isSpecial:false, image:'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400', preparationTime:10, shop:'IFL-NISET' },
    // IFL - Urban Canteen
    { id:'IFL-URBAN-1',name:'Pasta Carbonara',         description:'Creamy Italian pasta',                       price:5.50, category:'Pasta',     calories:620, isHealthy:false, isSpecial:false, image:'https://images.unsplash.com/photo-1545608284-b6a2951b86f9?w=400', preparationTime:15, shop:'IFL-URBAN' },
    { id:'IFL-URBAN-2',name:'Caesar Salad',            description:'Romaine, croutons, parmesan',                price:4.50, category:'Salads',    calories:320, isHealthy:false, isSpecial:false, image:'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400', preparationTime:8,  shop:'IFL-URBAN' },
    { id:'IFL-URBAN-3',name:'Club Sandwich',           description:'Triple-decker with chicken and bacon',       price:4.80, category:'Meal',      calories:580, isHealthy:false, isSpecial:true,  image:'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400', preparationTime:10, shop:'IFL-URBAN' },
    { id:'IFL-URBAN-4',name:'Grilled Salmon',          description:'Atlantic salmon with salad',                 price:7.50, category:'Meal',      calories:420, isHealthy:true,  isSpecial:true,  image:'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400', preparationTime:18, shop:'IFL-URBAN' },
    // IFL - Normal Canteen 1
    { id:'IFL-NORM1-1',name:'Budget Fried Rice',       description:'Simple fried rice with egg',                 price:1.50, category:'Rice',      calories:480, isHealthy:false, isSpecial:false, image:'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400', preparationTime:8,  shop:'IFL-NORM1' },
    { id:'IFL-NORM1-2',name:'Noodle Soup',             description:'Simple noodle soup with pork',               price:1.50, category:'Noodles',   calories:360, isHealthy:false, isSpecial:false, image:'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400', preparationTime:8,  shop:'IFL-NORM1' },
    { id:'IFL-NORM1-3',name:'Rice + Stir-fry Veggies', description:'Budget meal with rice',                    price:1.20, category:'Rice',      calories:340, isHealthy:true,  isSpecial:false, image:'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400', preparationTime:6,  shop:'IFL-NORM1' },
    { id:'IFL-NORM1-4',name:'Sugar Cane Juice',        description:'Fresh pressed sugarcane',                    price:0.80, category:'Drinks',    calories:120, isHealthy:true,  isSpecial:false, image:'https://images.unsplash.com/photo-1638176067239-fc40e1cadc68?w=400', preparationTime:3,  shop:'IFL-NORM1' },
    // IFL - Normal Canteen 2
    { id:'IFL-NORM2-1',name:'Wok Noodles',             description:'Stir-fried egg noodles',                     price:1.80, category:'Noodles',   calories:420, isHealthy:false, isSpecial:false, image:'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', preparationTime:8,  shop:'IFL-NORM2' },
    { id:'IFL-NORM2-2',name:'Egg Fried Rice',          description:'Classic egg fried rice',                     price:1.80, category:'Rice',      calories:490, isHealthy:false, isSpecial:true,  image:'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400', preparationTime:8,  shop:'IFL-NORM2' },
    { id:'IFL-NORM2-3',name:'Soup of the Day',         description:'Daily rotating soup',                        price:1.50, category:'Soup',      calories:200, isHealthy:true,  isSpecial:false, image:'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=400', preparationTime:6,  shop:'IFL-NORM2' },
    // IFL - Normal Canteen 3 (Vegetarian)
    { id:'IFL-NORM3-1',name:'Vegetable Curry',         description:'Mild vegetable curry with rice',             price:2.20, category:'Vegetables',calories:340, isHealthy:true,  isSpecial:false, image:'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400', preparationTime:10, shop:'IFL-NORM3' },
    { id:'IFL-NORM3-2',name:'Mixed Veg Stir Fry',      description:'Seasonal vegetables wok fried',              price:1.80, category:'Vegetables',calories:180, isHealthy:true,  isSpecial:true,  image:'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400', preparationTime:7,  shop:'IFL-NORM3' },
    { id:'IFL-NORM3-3',name:'Tofu Soup',               description:'Light tofu and mushroom soup',               price:1.90, category:'Soup',      calories:150, isHealthy:true,  isSpecial:false, image:'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=400', preparationTime:8,  shop:'IFL-NORM3' },
    { id:'IFL-NORM3-4',name:'Brown Rice Bowl',         description:'Brown rice with pickled vegetables',         price:2.00, category:'Rice',      calories:320, isHealthy:true,  isSpecial:false, image:'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400', preparationTime:6,  shop:'IFL-NORM3' },
  ];

  for (const item of seedItems) {
    await kv.set(`menu:${item.shop}:${item.id}`, item);
  }

  await kv.set(VERSION, true);
  console.log(`Seeded ${seedShops.length} shops and ${seedItems.length} menu items`);
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

// ── Token helpers ──────────────────────────────────────────────────────────
// Generate a random session token and store userId → token in KV
async function createSessionToken(userId: string): Promise<string> {
  const token = crypto.randomUUID();
  await kv.set(`token:${token}`, userId);
  return token;
}

// Look up userId from the Bearer token in the Authorization header
async function getUserIdFromToken(c: any): Promise<string | null> {
  const auth = c.req.header('Authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  return (await kv.get(`token:${token}`)) as string | null;
}
// ───────────────────────────────────────────────────────────────────────────

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
    const { studentId, name, campus, password } = await c.req.json();

    if (!studentId || !name || !password) {
      return c.json({ error: 'studentId, name and password are required' }, 400);
    }

    const existingUser = await kv.get(`user:${studentId}`);
    if (existingUser) {
      return c.json({ error: "Student ID already registered" }, 400);
    }

    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    const user = {
      id: studentId,
      studentId,
      name,
      campus: campus ?? '',
      role: 'student',
      createdAt: new Date().toISOString(),
    };

    await kv.set(`user:${studentId}`, user);
    await kv.set(`password:${studentId}`, hashedPassword);

    const token = await createSessionToken(studentId);
    return c.json({ token, user });
  } catch (error) {
    console.error('Student registration error:', error);
    return c.json({ error: 'Registration failed' }, 500);
  }
});

// Login
app.post("/make-server-36162e30/api/auth/login", async (c) => {
  try {
    const { userId, password } = await c.req.json();

    if (!userId || !password) {
      return c.json({ error: 'userId and password are required' }, 400);
    }

    const user = await kv.get(`user:${userId}`);
    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const storedPassword = await kv.get(`password:${userId}`);
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    if (storedPassword !== hashedPassword) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Ensure legacy users have studentId field
    if (!user.studentId) {
      user.studentId = user.id;
      await kv.set(`user:${userId}`, user);
    }

    const token = await createSessionToken(userId);
    return c.json({ token, user });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Login failed' }, 500);
  }
});

// Place Order — writes to Supabase DB
app.post("/make-server-36162e30/api/orders/place", async (c) => {
  try {
    // Get student UUID from Supabase JWT
    const authHeader = c.req.header('Authorization') ?? '';
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!jwt) return c.json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user: supaUser }, error: authErr } = await supabase.auth.getUser(jwt);
    if (authErr || !supaUser) return c.json({ error: 'Unauthorized' }, 401);

    const { shopId: shopCode, serviceType, items, total, estimatedMinutes, scheduledFor } = await c.req.json();

    // Look up shop UUID from shop_code
    const { data: shop, error: shopErr } = await supabase
      .from('shops')
      .select('id, shop_code')
      .eq('shop_code', shopCode)
      .single();
    if (shopErr || !shop) return c.json({ error: 'Shop not found' }, 404);

    // Insert order
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        student_id: supaUser.id,
        shop_id: shop.id,
        total_amount: total,
        service_type: serviceType ?? 'pickup',
        status: 'pending',
        estimated_ready_time: estimatedMinutes
          ? new Date(Date.now() + estimatedMinutes * 60000).toISOString()
          : null,
        scheduled_for: scheduledFor ?? null,
      })
      .select()
      .single();
    if (orderErr || !order) return c.json({ error: 'Failed to create order' }, 500);

    // Insert order items
    if (items?.length) {
      const orderItems = items.map((i: any) => ({
        order_id: order.id,
        menu_item_id: i.menuItemId || null,
        item_name: i.name,
        unit_price: i.price,
        quantity: i.quantity,
      }));
      await supabase.from('order_items').insert(orderItems);
    }

    // Return Flutter-compatible shape
    return c.json({
      order: {
        id: order.id,
        studentId: supaUser.id,
        shopId: shopCode,
        items: items ?? [],
        total,
        status: 'pending',
        createdAt: order.ordered_at,
        estimatedMinutes: estimatedMinutes ?? 15,
        scheduledFor: scheduledFor ?? null,
      }
    });
  } catch (error) {
    console.error('Place order error:', error);
    return c.json({ error: 'Failed to place order' }, 500);
  }
});

// Get Seller Orders
app.get("/make-server-36162e30/api/seller/orders", async (c) => {
  try {
    const shopId = c.req.query('shopId');
    if (!shopId) return c.json({ error: 'Shop ID required' }, 400);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Resolve shop_code → UUID (seller metadata may store either)
    let shopUuid = shopId;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(shopId)) {
      const { data: shopRow, error: shopErr } = await supabase
        .from('shops').select('id').eq('shop_code', shopId).single();
      if (shopErr || !shopRow) return c.json({ error: 'Shop not found' }, 404);
      shopUuid = shopRow.id;
    }

    const { data: ordersData, error } = await supabase
      .from('orders')
      .select(`
        id, student_id, total_amount, status, service_type,
        ordered_at, estimated_ready_time, scheduled_for, cancellation_reason, cancelled_at,
        order_items (
          id, menu_item_id, quantity, unit_price, item_name,
          menu_items ( description, image_url, category, calories, preparation_time, is_healthy, is_special )
        )
      `)
      .eq('shop_id', shopUuid)
      .order('ordered_at', { ascending: false })
      .limit(100);

    if (error) return c.json({ error: 'Failed to fetch orders', detail: error.message }, 500);

    // Fetch student names via admin auth
    const studentIds = [...new Set((ordersData ?? []).map((o: any) => o.student_id as string))];
    const studentNames: Record<string, string> = {};
    for (const sid of studentIds) {
      try {
        const { data: { user } } = await supabase.auth.admin.getUserById(sid);
        if (user?.user_metadata?.name) {
          studentNames[sid] = user.user_metadata.name;
        } else if (user?.email) {
          studentNames[sid] = user.email.replace(/@(student|seller)\.local$/, '');
        } else {
          studentNames[sid] = sid.slice(0, 8).toUpperCase();
        }
      } catch { studentNames[sid] = sid.slice(0, 8).toUpperCase(); }
    }

    const viewedCancelledIds: string[] = await kv.get(`shop-viewed-cancelled:${shopUuid}`) || [];

    const orders = (ordersData ?? []).map((o: any) => ({
      id: o.id,
      studentId: o.student_id,
      studentName: studentNames[o.student_id] ?? 'Unknown',
      items: (o.order_items ?? []).map((oi: any) => ({
        id: oi.menu_item_id ?? oi.id,
        name: oi.item_name,
        description: oi.menu_items?.description ?? '',
        quantity: oi.quantity,
        price: oi.unit_price,
        image: oi.menu_items?.image_url ?? '',
        category: oi.menu_items?.category ?? '',
        calories: oi.menu_items?.calories ?? 0,
        preparationTime: oi.menu_items?.preparation_time ?? 15,
        isHealthy: oi.menu_items?.is_healthy ?? false,
        isSpecial: oi.menu_items?.is_special ?? false,
        shop: shopId,
      })),
      total: o.total_amount,
      status: o.status,
      orderTime: o.ordered_at,
      orderType: o.service_type ?? 'pickup',
      estimatedReadyTime: o.estimated_ready_time ?? null,
      scheduledFor: o.scheduled_for ?? null,
      cancellationReason: o.cancellation_reason ?? null,
      cancelledAt: o.cancelled_at ?? null,
      isNewCancellation: o.status === 'cancelled' && !viewedCancelledIds.includes(o.id),
    }));

    const today = new Date().toDateString();
    const todayOrders = orders.filter((o: any) => new Date(o.orderTime).toDateString() === today);
    const stats = {
      today: {
        orders: todayOrders.length,
        revenue: todayOrders
          .filter((o: any) => o.status !== 'cancelled')
          .reduce((sum: number, o: any) => sum + o.total, 0),
      },
      pending: orders.filter((o: any) => o.status === 'pending' || o.status === 'preparing').length,
      completed: todayOrders.filter((o: any) => o.status === 'completed').length,
    };

    return c.json({ orders, stats });
  } catch (error) {
    console.error('Get seller orders error:', error);
    return c.json({ error: 'Failed to fetch orders' }, 500);
  }
});

// Update Order Status
app.post("/make-server-36162e30/api/seller/update-order", async (c) => {
  try {
    const { orderId, status, shopId, cancellationReason } = await c.req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Resolve shop_code → UUID (seller metadata may store either)
    let shopUuid = shopId as string | undefined;
    if (shopUuid && !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(shopUuid)) {
      const { data: shopRow } = await supabase
        .from('shops').select('id').eq('shop_code', shopUuid).single();
      if (shopRow) shopUuid = shopRow.id;
    }

    // Verify order belongs to this shop
    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('id, student_id, status, shop_id')
      .eq('id', orderId)
      .single();

    if (fetchErr || !order) return c.json({ error: 'Order not found' }, 404);
    if (shopUuid && order.shop_id !== shopUuid) return c.json({ error: 'Unauthorized' }, 403);

    const previousStatus = order.status;

    const updatePayload: any = { status, updated_at: new Date().toISOString() };
    if (status === 'cancelled' && cancellationReason) {
      updatePayload.cancellation_reason = cancellationReason;
      updatePayload.cancelled_at = new Date().toISOString();
    }
    if (status === 'ready') updatePayload.ready_at = new Date().toISOString();
    if (status === 'completed') updatePayload.completed_at = new Date().toISOString();

    const { error: updateErr } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId);

    if (updateErr) return c.json({ error: 'Failed to update order', detail: updateErr.message }, 500);

    // Notify student when order becomes ready or is cancelled
    if ((status === 'ready' || status === 'cancelled') && previousStatus !== status) {
      const isReady = status === 'ready';
      await supabase.from('notifications').insert({
        user_id: order.student_id,
        type: 'order_update',
        title: isReady ? 'Order Ready for Pickup! 🎉' : 'Order Cancelled',
        message: isReady
          ? 'Your order is ready for pickup!'
          : cancellationReason
            ? `Your order was cancelled. Reason: ${cancellationReason}`
            : 'Your order was cancelled.',
        related_order_id: orderId,
      });
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Update order error:', error);
    return c.json({ error: 'Failed to update order' }, 500);
  }
});

// Get Student Orders
app.get("/make-server-36162e30/api/student/orders", async (c) => {
  try {
    const studentId = await getUserIdFromToken(c) ?? c.req.query('studentId');
    if (!studentId) return c.json({ error: 'Unauthorized' }, 401);

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
    const studentId = await getUserIdFromToken(c) ?? c.req.query('studentId');
    if (!studentId) return c.json({ error: 'Unauthorized' }, 401);

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
    const studentId = await getUserIdFromToken(c);
    if (!studentId) return c.json({ error: 'Unauthorized' }, 401);

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

    // Enrich with telegram_verified from Supabase auth metadata
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const { data: { users: authUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const verifiedIds = new Set(
        authUsers
          .filter((u: any) => u.user_metadata?.telegram_verified === true)
          .map((u: any) => u.id)
      );
      return c.json(users.map((u: any) => ({
        ...u,
        isActive: u.isActive ?? true,
        telegramVerified: verifiedIds.has(u.id),
      })));
    } catch (_) {
      // If Supabase lookup fails, return users without telegram status
      return c.json(users.map((u: any) => ({ ...u, isActive: u.isActive ?? true })));
    }
  } catch (error) {
    console.error('Get users error:', error);
    return c.json({ error: 'Failed to load users' }, 500);
  }
});

// Get All Shops
app.get("/make-server-36162e30/admin/shops", async (c) => {
  try {
    const shops = await kv.getByPrefix('shop:');
    return c.json(shops.map((s: any) => ({ ...s, isActive: s.isActive ?? true })));
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

// Get / Save System Settings
app.get("/make-server-36162e30/admin/settings", async (c) => {
  try {
    const settings = await kv.get('system-settings') ?? {
      registrationsEnabled: true,
      maintenanceMode: false,
      emailNotifications: false,
      commission: 0,
      supportEmail: '',
    };
    return c.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    return c.json({ error: 'Failed to load settings' }, 500);
  }
});

app.post("/make-server-36162e30/admin/settings", async (c) => {
  try {
    const body = await c.req.json();
    const existing = await kv.get('system-settings') ?? {};
    const updated = { ...existing, ...body, updatedAt: new Date().toISOString() };
    await kv.set('system-settings', updated);
    return c.json({ ok: true, settings: updated });
  } catch (error) {
    console.error('Save settings error:', error);
    return c.json({ error: 'Failed to save settings' }, 500);
  }
});

// Broadcast Announcement — creates a notification for every active user in Supabase
app.post("/make-server-36162e30/admin/broadcast", async (c) => {
  try {
    const { message, title } = await c.req.json();
    if (!message || !title) return c.json({ error: 'title and message required' }, 400);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Fetch all user IDs from Supabase auth
    const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers();
    if (authErr) throw authErr;

    const notifications = authUsers.users.map((u: any) => ({
      user_id: u.id,
      type: 'system',
      title,
      message,
      priority: 'high',
    }));

    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
    }

    return c.json({ ok: true, sent: notifications.length });
  } catch (error) {
    console.error('Broadcast error:', error);
    return c.json({ error: 'Failed to broadcast' }, 500);
  }
});

// Create Seller Account (admin only)
app.post("/make-server-36162e30/admin/users/create", async (c) => {
  try {
    const { email, password, name, role, shopCode } = await c.req.json();
    if (!email || !password || !name || !role) {
      return c.json({ error: 'email, password, name, role required' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const metadata: any = { name, role };
    if (role === 'seller' && shopCode) metadata.shop_id = shopCode;

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });

    if (error) throw error;

    // Mirror to KV for the admin dashboard listing
    await kv.set(`user:${data.user.id}`, {
      id: data.user.id,
      email,
      name,
      role,
      shopId: shopCode ?? null,
      isActive: true,
      createdAt: new Date().toISOString(),
    });

    return c.json({ ok: true, user: data.user });
  } catch (error: any) {
    console.error('Create user error:', error);
    return c.json({ error: error.message ?? 'Failed to create user' }, 500);
  }
});

// Create Shop (admin only)
app.post("/make-server-36162e30/admin/shops/create", async (c) => {
  try {
    const { name, campus, shopCode, category, description } = await c.req.json();
    if (!name || !campus || !shopCode) {
      return c.json({ error: 'name, campus, shopCode required' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data, error } = await supabase.from('shops').insert({
      shop_code: shopCode,
      name,
      campus,
      category: category ?? null,
      description: description ?? null,
      is_active: true,
      is_open: true,
    }).select().single();

    if (error) throw error;

    // Mirror to KV
    await kv.set(`shop:${shopCode}`, {
      id: shopCode,
      name,
      campus,
      category,
      description,
      isActive: true,
      totalOrders: 0,
      createdAt: new Date().toISOString(),
    });

    return c.json({ ok: true, shop: data });
  } catch (error: any) {
    console.error('Create shop error:', error);
    return c.json({ error: error.message ?? 'Failed to create shop' }, 500);
  }
});

// Delete User (admin only)
app.delete("/make-server-36162e30/admin/users/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw error;

    await kv.delete(`user:${userId}`);

    return c.json({ ok: true });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return c.json({ error: error.message ?? 'Failed to delete user' }, 500);
  }
});

// Admin Stats (from Supabase DB — more accurate than KV counts)
app.get("/make-server-36162e30/admin/stats/db", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [usersRes, shopsRes, ordersRes, revenueRes, activeRes, todayRes] = await Promise.all([
      supabase.auth.admin.listUsers(),
      supabase.from('shops').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('total_amount').neq('status', 'cancelled'),
      supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', ['pending', 'preparing', 'ready']),
      supabase.from('orders').select('id', { count: 'exact', head: true }).gte('ordered_at', today.toISOString()),
    ]);

    const totalRevenue = (revenueRes.data ?? []).reduce((s: number, o: any) => s + (o.total_amount ?? 0), 0);

    return c.json({
      totalUsers: usersRes.data?.users?.length ?? 0,
      totalShops: shopsRes.count ?? 0,
      totalOrders: ordersRes.count ?? 0,
      totalRevenue,
      activeOrders: activeRes.count ?? 0,
      todayOrders: todayRes.count ?? 0,
    });
  } catch (error) {
    console.error('DB stats error:', error);
    return c.json({ error: 'Failed to load stats' }, 500);
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

// ─── Public Menu API (no auth required) ──────────────────────────────────────

app.get("/make-server-36162e30/api/public/shops", async (c) => {
  try {
    const shops = await kv.getByPrefix('shop:');
    return c.json({ shops });
  } catch (error) {
    console.error('Get public shops error:', error);
    return c.json({ error: 'Failed to load shops' }, 500);
  }
});

app.get("/make-server-36162e30/api/public/menu", async (c) => {
  try {
    const items = await kv.getByPrefix('menu:');
    // Filter to only items with isAvailable !== false (vendor-toggled items)
    const available = items.filter((i: any) => i.isAvailable !== false);
    return c.json({ items: available });
  } catch (error) {
    console.error('Get public menu error:', error);
    return c.json({ error: 'Failed to load menu' }, 500);
  }
});

// (duplicate profile route removed — see PUT /api/student/profile above)

Deno.serve(app.fetch);