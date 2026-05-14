-- Food Nutrition Reference Table
-- Stores nutritional data for the 32 food classes used by the YOLOv11 recognition model.
-- Run this after the main schema (01_schema.sql).

CREATE TABLE IF NOT EXISTS food_nutrition_reference (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  food_class          VARCHAR(100) UNIQUE NOT NULL, -- matches model class name (class_names.json)
  display_name        VARCHAR(255) NOT NULL,
  description         TEXT,
  calories_per_serving INTEGER NOT NULL DEFAULT 0,
  protein_g           DECIMAL(5,1) NOT NULL DEFAULT 0,
  carbs_g             DECIMAL(5,1) NOT NULL DEFAULT 0,
  fat_g               DECIMAL(5,1) NOT NULL DEFAULT 0,
  fiber_g             DECIMAL(5,1) NOT NULL DEFAULT 0,
  serving_size_g      INTEGER NOT NULL DEFAULT 250,    -- grams per typical serving
  is_healthy          BOOLEAN NOT NULL DEFAULT false,
  cuisine             VARCHAR(100),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by class name
CREATE INDEX IF NOT EXISTS idx_food_nutrition_class ON food_nutrition_reference (food_class);

-- ============================================================================
-- SEED DATA — 32 food classes
-- Nutritional values are per typical single serving (approx.)
-- ============================================================================
INSERT INTO food_nutrition_reference
  (food_class, display_name, description, calories_per_serving, protein_g, carbs_g, fat_g, fiber_g, serving_size_g, is_healthy, cuisine)
VALUES

-- ── Khmer dishes ────────────────────────────────────────────────────────────
('nom_banh_chok',
 'Nom Banh Chok',
 'Cambodian rice noodles served with green fish-based sauce and fresh vegetables. Light and refreshing.',
 280, 14.0, 45.0, 5.0, 3.0, 300, true, 'Khmer'),

('kuy_teav',
 'Kuy Teav',
 'Cambodian rice noodle soup with pork or beef broth, herbs and bean sprouts. Popular breakfast dish.',
 320, 18.0, 42.0, 7.0, 2.0, 400, true, 'Khmer'),

('bai_sach_chrouk',
 'Bai Sach Chrouk',
 'Grilled pork over broken rice with pickled vegetables. Classic Cambodian breakfast.',
 390, 22.0, 48.0, 12.0, 1.5, 350, true, 'Khmer'),

('amok',
 'Amok',
 'Cambodian fish curry steamed in banana leaves with coconut milk and kroeung paste.',
 340, 20.0, 18.0, 22.0, 2.0, 300, true, 'Khmer'),

('lok_lak',
 'Lok Lak',
 'Stir-fried diced beef with Kampot pepper sauce, served over rice with a lime-pepper dip.',
 420, 28.0, 32.0, 18.0, 2.0, 350, false, 'Khmer'),

('samlor_korko',
 'Samlor Korko',
 'Cambodian mixed vegetable and meat stew made with roasted prahok and green papaya.',
 250, 15.0, 22.0, 10.0, 4.0, 350, true, 'Khmer'),

('samlor_machu',
 'Samlor Machu',
 'Cambodian sour soup made with tamarind, tomato and your choice of fish, chicken or pork.',
 200, 14.0, 18.0, 7.0, 3.0, 350, true, 'Khmer'),

('pleah_sach_ko',
 'Pleah Sach Ko',
 'Cambodian rare beef salad with lemongrass, kaffir lime, roasted peanuts and fresh herbs.',
 280, 22.0, 14.0, 15.0, 2.5, 250, true, 'Khmer'),

('num_pang',
 'Num Pang',
 'Cambodian-style baguette sandwich stuffed with grilled meat, pickled vegetables, chili and herbs.',
 350, 18.0, 44.0, 10.0, 3.0, 220, false, 'Khmer'),

('rice porridge',
 'Rice Porridge (Bobor)',
 'Congee-style rice porridge cooked until silky smooth, typically served with ginger and spring onion.',
 200, 8.0, 38.0, 3.0, 1.0, 400, true, 'Khmer'),

-- ── Regional Asian dishes ────────────────────────────────────────────────────
('pad_thai',
 'Pad Thai',
 'Stir-fried rice noodles with eggs, tofu or shrimp, bean sprouts, green onions and peanuts.',
 520, 20.0, 68.0, 18.0, 3.0, 400, false, 'Thai'),

('tom_yum_soup',
 'Tom Yum Soup',
 'Spicy and sour Thai soup with lemongrass, kaffir lime, galangal, chili and mushrooms.',
 180, 14.0, 12.0, 7.0, 2.0, 350, true, 'Thai'),

('papaya_salad',
 'Papaya Salad (Som Tum)',
 'Spicy shredded green papaya salad with tomatoes, green beans, peanuts and lime dressing.',
 120, 4.0, 22.0, 3.0, 4.0, 200, true, 'Thai'),

('pho',
 'Pho',
 'Vietnamese beef or chicken rice noodle soup with aromatic broth, fresh herbs and lime.',
 350, 22.0, 42.0, 8.0, 2.0, 500, true, 'Vietnamese'),

('ramen',
 'Ramen',
 'Japanese noodle soup with seasoned broth, wheat noodles, chashu pork, egg and nori.',
 450, 24.0, 55.0, 14.0, 3.0, 500, false, 'Japanese'),

('sushi',
 'Sushi',
 'Japanese vinegared rice topped with fresh fish, seafood or vegetables. Rich in omega-3.',
 300, 14.0, 48.0, 6.0, 2.0, 200, true, 'Japanese'),

('laksa',
 'Laksa',
 'Spicy Southeast Asian noodle soup in rich coconut milk broth with shrimp and tofu.',
 460, 18.0, 52.0, 20.0, 3.0, 450, false, 'Malaysian'),

('curry',
 'Curry',
 'Slow-cooked spiced curry with coconut milk, vegetables and choice of meat. Served with rice.',
 400, 20.0, 38.0, 18.0, 4.0, 350, false, 'Asian'),

('dumplings',
 'Dumplings',
 'Steamed or fried dumplings stuffed with minced pork, vegetables and ginger.',
 280, 14.0, 32.0, 10.0, 2.0, 200, false, 'Chinese'),

('spring_rolls',
 'Spring Rolls',
 'Crispy fried rolls filled with vegetables, noodles and minced pork.',
 200, 7.0, 26.0, 8.0, 2.0, 150, false, 'Asian'),

('tofu_bowl',
 'Tofu Bowl',
 'Silken tofu served over rice with soy dressing, sesame oil, green onion and chili.',
 280, 16.0, 36.0, 8.0, 3.0, 350, true, 'Asian'),

('buddha_bowl',
 'Buddha Bowl',
 'Wholesome bowl with grains, roasted vegetables, legumes, avocado and tahini dressing.',
 380, 15.0, 52.0, 14.0, 8.0, 400, true, 'International'),

-- ── Common / everyday dishes ─────────────────────────────────────────────────
('fried_rice',
 'Fried Rice',
 'Wok-fried rice with egg, vegetables and choice of protein. Quick and satisfying.',
 450, 14.0, 62.0, 14.0, 2.0, 350, false, 'Asian'),

('fried_egg',
 'Fried Egg',
 'Pan-fried egg with crispy edges. High in protein and ready in minutes.',
 90, 6.0, 1.0, 7.0, 0.0, 60, true, 'Universal'),

('grilled_skewer',
 'Grilled Skewer',
 'Marinated meat or seafood grilled on skewers over charcoal. Good protein source.',
 220, 20.0, 5.0, 13.0, 0.5, 150, true, 'Asian'),

('grilled_pork_ribs',
 'Grilled Pork Ribs',
 'Slow-grilled pork ribs with smoky barbecue marinade. Rich and tender.',
 480, 30.0, 10.0, 36.0, 0.0, 300, false, 'Asian'),

('grilled_corn',
 'Grilled Corn',
 'Sweet corn roasted on the grill with butter or chili seasoning. Naturally sweet.',
 130, 3.5, 27.0, 2.5, 3.0, 140, true, 'Universal'),

-- ── Western / hard-negative dishes ──────────────────────────────────────────
('pizza',
 'Pizza',
 'Baked pizza with tomato sauce, mozzarella and various toppings on a wheat crust.',
 700, 28.0, 78.0, 28.0, 4.0, 400, false, 'Western'),

('hamburger',
 'Hamburger',
 'Beef patty in a sesame bun with lettuce, tomato, onion, pickles and sauces.',
 600, 26.0, 48.0, 32.0, 3.0, 300, false, 'Western'),

('french_fries',
 'French Fries',
 'Deep-fried potato sticks with crispy exterior. Best enjoyed fresh.',
 380, 4.0, 50.0, 18.0, 4.0, 200, false, 'Western'),

('banana_pancakes',
 'Banana Pancakes',
 'Fluffy pancakes topped with sliced banana, honey and whipped cream.',
 320, 8.0, 52.0, 9.0, 2.0, 200, false, 'Western')

ON CONFLICT (food_class) DO UPDATE SET
  display_name        = EXCLUDED.display_name,
  description         = EXCLUDED.description,
  calories_per_serving = EXCLUDED.calories_per_serving,
  protein_g           = EXCLUDED.protein_g,
  carbs_g             = EXCLUDED.carbs_g,
  fat_g               = EXCLUDED.fat_g,
  fiber_g             = EXCLUDED.fiber_g,
  serving_size_g      = EXCLUDED.serving_size_g,
  is_healthy          = EXCLUDED.is_healthy,
  cuisine             = EXCLUDED.cuisine;

-- RLS: readable by anyone authenticated, no writes from client
ALTER TABLE food_nutrition_reference ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nutrition_reference_read"
  ON food_nutrition_reference FOR SELECT
  TO authenticated
  USING (true);
