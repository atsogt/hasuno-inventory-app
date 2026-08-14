-- Adds station/category grouping to the item catalog and seeds it with the
-- full Hasuno v4 menu ingredient list (89 items), so the Request screen can
-- group and filter instead of showing one flat grid.

alter table items
  add column station text not null default 'Kitchen' check (station in ('Sushi', 'Kitchen')),
  add column category text not null default 'Uncategorized',
  add column is_prep boolean not null default false;

-- Existing ad-hoc items (added before this migration) keep the defaults above
-- and show up under Kitchen / Uncategorized until someone edits them.

insert into items (name, amount, station, category, is_prep) values
  -- Sushi / Fish & seafood
  ('Albacore', 1, 'Sushi', 'Fish & Seafood', false),
  ('Crabstick', 1, 'Sushi', 'Fish & Seafood', false),
  ('Ebi', 1, 'Sushi', 'Fish & Seafood', false),
  ('Eel', 1, 'Sushi', 'Fish & Seafood', false),
  ('Fatty tuna', 1, 'Sushi', 'Fish & Seafood', false),
  ('Halibut', 1, 'Sushi', 'Fish & Seafood', false),
  ('Mackerel', 1, 'Sushi', 'Fish & Seafood', false),
  ('Octopus', 1, 'Sushi', 'Fish & Seafood', false),
  ('Salmon', 1, 'Sushi', 'Fish & Seafood', false),
  ('Scallop', 1, 'Sushi', 'Fish & Seafood', false),
  ('Sea urchin', 1, 'Sushi', 'Fish & Seafood', false),
  ('Seabass', 1, 'Sushi', 'Fish & Seafood', false),
  ('Shrimp, raw', 1, 'Sushi', 'Fish & Seafood', false),
  ('Smoked salmon', 1, 'Sushi', 'Fish & Seafood', false),
  ('Soft-shell crab', 1, 'Sushi', 'Fish & Seafood', false),
  ('Squid', 1, 'Sushi', 'Fish & Seafood', false),
  ('Sweet shrimp', 1, 'Sushi', 'Fish & Seafood', false),
  ('Tuna', 1, 'Sushi', 'Fish & Seafood', false),
  ('White tuna', 1, 'Sushi', 'Fish & Seafood', false),
  ('Yellowtail', 1, 'Sushi', 'Fish & Seafood', false),
  -- Sushi / Roe
  ('Ikura', 1, 'Sushi', 'Roe', false),
  ('Masago', 1, 'Sushi', 'Roe', false),
  ('Tobiko', 1, 'Sushi', 'Roe', false),
  -- Sushi / Produce
  ('Asparagus', 1, 'Sushi', 'Produce', false),
  ('Avocado', 1, 'Sushi', 'Produce', false),
  ('Chives', 1, 'Sushi', 'Produce', false),
  ('Cilantro', 1, 'Sushi', 'Produce', false),
  ('Cucumber', 1, 'Sushi', 'Produce', false),
  ('Gobo', 1, 'Sushi', 'Produce', false),
  ('Jalapeno', 1, 'Sushi', 'Produce', false),
  ('Mango', 1, 'Sushi', 'Produce', false),
  ('Spring mix', 1, 'Sushi', 'Produce', false),
  -- Sushi / Dairy
  ('Cream cheese', 1, 'Sushi', 'Dairy', false),
  -- Sushi / Rice, Nori & Wrappers
  ('Nori', 1, 'Sushi', 'Rice, Nori & Wrappers', false),
  ('Soy paper', 1, 'Sushi', 'Rice, Nori & Wrappers', false),
  ('Sushi rice', 1, 'Sushi', 'Rice, Nori & Wrappers', false),
  -- Sushi / Sauces
  ('Chili sauce', 1, 'Sushi', 'Sauces', false),
  ('Eel sauce', 1, 'Sushi', 'Sauces', false),
  ('Midori sauce', 1, 'Sushi', 'Sauces', false),
  ('Spicy mayo', 1, 'Sushi', 'Sauces', false),
  -- Sushi / Prepared In-House
  ('Chicken tempura', 1, 'Sushi', 'Prepared In-House', true),
  ('Shrimp tempura', 1, 'Sushi', 'Prepared In-House', true),
  ('Spicy crabstick', 1, 'Sushi', 'Prepared In-House', true),
  ('Spicy salmon', 1, 'Sushi', 'Prepared In-House', true),
  ('Spicy tuna', 1, 'Sushi', 'Prepared In-House', true),
  ('Sweet tofu', 1, 'Sushi', 'Prepared In-House', true),
  ('Tamago', 1, 'Sushi', 'Prepared In-House', true),
  ('Tempura batter', 1, 'Sushi', 'Prepared In-House', true),
  ('Tempura flakes', 1, 'Sushi', 'Prepared In-House', true),
  ('Tempura mix', 1, 'Sushi', 'Prepared In-House', true),
  -- Kitchen / Starters
  ('Calamari', 1, 'Kitchen', 'Starters', false),
  ('Crab rangoon', 1, 'Kitchen', 'Starters', false),
  ('Edamame', 1, 'Kitchen', 'Starters', false),
  ('Ginger salad', 1, 'Kitchen', 'Starters', false),
  ('Gyoza', 1, 'Kitchen', 'Starters', false),
  ('Miso soup', 1, 'Kitchen', 'Starters', false),
  ('Seaweed salad', 1, 'Kitchen', 'Starters', false),
  ('Shrimp shumai', 1, 'Kitchen', 'Starters', false),
  ('Vegetable spring rolls', 1, 'Kitchen', 'Starters', false),
  ('Wasabi shumai', 1, 'Kitchen', 'Starters', false),
  -- Kitchen / Proteins
  ('Chicken', 1, 'Kitchen', 'Proteins', false),
  ('Chicken katsu', 1, 'Kitchen', 'Proteins', false),
  ('Steak', 1, 'Kitchen', 'Proteins', false),
  ('Tofu', 1, 'Kitchen', 'Proteins', false),
  ('Wagyu patty', 1, 'Kitchen', 'Proteins', false),
  -- Kitchen / Produce & Aromatics
  ('Broccoli', 1, 'Kitchen', 'Produce & Aromatics', false),
  ('Cabbage', 1, 'Kitchen', 'Produce & Aromatics', false),
  ('Carrot', 1, 'Kitchen', 'Produce & Aromatics', false),
  ('Onion', 1, 'Kitchen', 'Produce & Aromatics', false),
  ('Pickle', 1, 'Kitchen', 'Produce & Aromatics', false),
  ('Potato', 1, 'Kitchen', 'Produce & Aromatics', false),
  -- Kitchen / Rice, Grains & Noodles
  ('Egg', 1, 'Kitchen', 'Rice, Grains & Noodles', false),
  ('Fries', 1, 'Kitchen', 'Rice, Grains & Noodles', false),
  ('Udon noodles', 1, 'Kitchen', 'Rice, Grains & Noodles', false),
  ('White rice', 1, 'Kitchen', 'Rice, Grains & Noodles', false),
  ('Yakisoba noodles', 1, 'Kitchen', 'Rice, Grains & Noodles', false),
  -- Kitchen / Dairy
  ('Cheese', 1, 'Kitchen', 'Dairy', false),
  -- Kitchen / Sauces
  ('Japanese curry', 1, 'Kitchen', 'Sauces', false),
  ('Teriyaki sauce', 1, 'Kitchen', 'Sauces', false),
  -- Kitchen / Drinks
  ('Coke / Diet Coke / Sprite', 1, 'Kitchen', 'Drinks', false),
  ('Hot green tea', 1, 'Kitchen', 'Drinks', false),
  ('Iced tea', 1, 'Kitchen', 'Drinks', false),
  ('Lemonade', 1, 'Kitchen', 'Drinks', false),
  ('Ramune', 1, 'Kitchen', 'Drinks', false),
  ('Sparkling water', 1, 'Kitchen', 'Drinks', false),
  ('Still water', 1, 'Kitchen', 'Drinks', false),
  -- Kitchen / Dessert
  ('Bomba Exotic', 1, 'Kitchen', 'Dessert', false),
  ('Chocolate lava cake', 1, 'Kitchen', 'Dessert', false),
  ('Chocolate tartufo', 1, 'Kitchen', 'Dessert', false)
on conflict (name) do nothing;
