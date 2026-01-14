-- Step images migration

-- Create step_images table
CREATE TABLE step_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  step_index INT NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_step_images_recipe ON step_images(recipe_id);
CREATE INDEX idx_step_images_step ON step_images(recipe_id, step_index);
