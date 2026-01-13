-- Initial database schema for Chef App

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Units (g, bunch, cup, tbsp, tsp, ml, piece, slice, etc.)
CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  name_zh VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ingredients (standardized Chinese names)
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Cuisine Regions
CREATE TABLE cuisine_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE
);

-- Cuisine Categories
CREATE TABLE cuisine_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE
);

-- Cooking Methods
CREATE TABLE cooking_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE
);

-- Cook Time Ranges
CREATE TABLE cook_time_ranges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label VARCHAR(50) NOT NULL,
  min_minutes INT,
  max_minutes INT
);

-- Recipes
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  alternative_name VARCHAR(200),
  cook_time_range_id UUID REFERENCES cook_time_ranges(id),
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Recipe Ingredients (junction with quantity)
CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id),
  unit_id UUID REFERENCES units(id),
  count DECIMAL(10,2),
  sort_order INT DEFAULT 0
);

-- Recipe Images
CREATE TABLE recipe_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  file_path VARCHAR(500) NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Recipe-Region Junction
CREATE TABLE recipe_regions (
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  region_id UUID REFERENCES cuisine_regions(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, region_id)
);

-- Recipe-Category Junction
CREATE TABLE recipe_categories (
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  category_id UUID REFERENCES cuisine_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, category_id)
);

-- Recipe-Method Junction
CREATE TABLE recipe_methods (
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  method_id UUID REFERENCES cooking_methods(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, method_id)
);

-- Meals
CREATE TABLE meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Meal Dishes (junction with order)
CREATE TABLE meal_dishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID REFERENCES meals(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id),
  sort_order INT DEFAULT 0
);

-- Indexes
CREATE INDEX idx_recipes_deleted ON recipes(deleted_at);
CREATE INDEX idx_recipes_name ON recipes(name);
CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_ingredient ON recipe_ingredients(ingredient_id);
CREATE INDEX idx_meal_dishes_meal ON meal_dishes(meal_id);
CREATE INDEX idx_ingredients_name ON ingredients(name);
CREATE INDEX idx_ingredients_category ON ingredients(category);
