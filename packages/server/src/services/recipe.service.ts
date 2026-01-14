import { db } from '../db/client.js';
import type {
  Recipe,
  RecipeListItem,
  CreateRecipeInput,
  UpdateRecipeInput,
  RecipeFilters,
  PaginatedResponse,
  RecipeStep,
  RecipeStepInput
} from '@chef-app/shared';
import { isExternalUrl, downloadImage } from './image-download.js';

// Helper to convert step data to RecipeStep[] format
function normalizeSteps(steps: unknown): RecipeStep[] {
  if (!Array.isArray(steps)) return [];
  if (steps.length === 0) return [];

  // Handle string array format (legacy)
  if (typeof steps[0] === 'string') {
    return steps.map((text: string) => ({ text }));
  }

  // Object format with text and optional imageUrls
  return steps.map((step: { text?: string; imageUrl?: string; imageUrls?: string[] }) => {
    // Support both old imageUrl and new imageUrls format
    let imageUrls = step.imageUrls;
    if (!imageUrls && step.imageUrl) {
      imageUrls = [step.imageUrl];
    }
    return {
      text: step.text || '',
      imageUrls: imageUrls?.filter(Boolean)
    };
  });
}

// Download external step images and replace URLs with local paths
async function downloadStepImages(steps: RecipeStepInput[]): Promise<RecipeStepInput[]> {
  const downloadPromises = steps.map(async (step) => {
    if (!step.imageUrls || step.imageUrls.length === 0) {
      return step;
    }

    // Download all external images in parallel
    const downloadedUrls = await Promise.all(
      step.imageUrls.map(async (url) => {
        if (isExternalUrl(url)) {
          const localPath = await downloadImage(url);
          return localPath || null; // null if download failed
        }
        return url; // Already local
      })
    );

    return {
      text: step.text,
      imageUrls: downloadedUrls.filter((url): url is string => url !== null)
    };
  });

  return Promise.all(downloadPromises);
}

class RecipeService {
  async listRecipes(
    filters: RecipeFilters,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<RecipeListItem>> {
    const conditions: string[] = ['r.deleted_at IS NULL'];
    const params: unknown[] = [];
    let paramIndex = 1;

    // Search filter (name or ingredient name)
    if (filters.search) {
      conditions.push(`(
        r.name ILIKE $${paramIndex} OR
        r.alternative_name ILIKE $${paramIndex} OR
        EXISTS (
          SELECT 1 FROM recipe_ingredients ri
          JOIN ingredients i ON ri.ingredient_id = i.id
          WHERE ri.recipe_id = r.id AND i.name ILIKE $${paramIndex}
        )
      )`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    // Region filter
    if (filters.regionIds && filters.regionIds.length > 0) {
      conditions.push(`EXISTS (
        SELECT 1 FROM recipe_regions rr
        WHERE rr.recipe_id = r.id AND rr.region_id = ANY($${paramIndex}::uuid[])
      )`);
      params.push(filters.regionIds);
      paramIndex++;
    }

    // Category filter
    if (filters.categoryIds && filters.categoryIds.length > 0) {
      conditions.push(`EXISTS (
        SELECT 1 FROM recipe_categories rc
        WHERE rc.recipe_id = r.id AND rc.category_id = ANY($${paramIndex}::uuid[])
      )`);
      params.push(filters.categoryIds);
      paramIndex++;
    }

    // Method filter
    if (filters.methodIds && filters.methodIds.length > 0) {
      conditions.push(`EXISTS (
        SELECT 1 FROM recipe_methods rm
        WHERE rm.recipe_id = r.id AND rm.method_id = ANY($${paramIndex}::uuid[])
      )`);
      params.push(filters.methodIds);
      paramIndex++;
    }

    // Cook time filter
    if (filters.cookTimeRangeId) {
      conditions.push(`r.cook_time_range_id = $${paramIndex}`);
      params.push(filters.cookTimeRangeId);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await db.query<{ count: string }>(
      `SELECT COUNT(*) FROM recipes r WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Build order by clause for search ranking
    let orderByClause = 'r.created_at DESC';
    if (filters.search) {
      orderByClause = `
        CASE
          WHEN r.name ILIKE $${paramIndex} THEN 1
          WHEN r.alternative_name ILIKE $${paramIndex} THEN 2
          ELSE 3
        END,
        r.created_at DESC
      `;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    // Get recipes
    const offset = (page - 1) * pageSize;
    params.push(pageSize, offset);

    const result = await db.query<RecipeListItem & { thumbnail_url: string; ingredient_count: string }>(
      `SELECT
        r.id,
        r.name,
        r.alternative_name as "alternativeName",
        r.created_at as "createdAt",
        (SELECT file_path FROM recipe_images WHERE recipe_id = r.id ORDER BY sort_order LIMIT 1) as thumbnail_url,
        (SELECT COUNT(*) FROM recipe_ingredients WHERE recipe_id = r.id) as ingredient_count,
        COALESCE(
          (SELECT json_build_object('id', ctr.id, 'label', ctr.label, 'minMinutes', ctr.min_minutes, 'maxMinutes', ctr.max_minutes)
           FROM cook_time_ranges ctr WHERE ctr.id = r.cook_time_range_id),
          NULL
        ) as "cookTimeRange",
        COALESCE(
          (SELECT json_agg(json_build_object('id', cr.id, 'name', cr.name))
           FROM cuisine_regions cr
           JOIN recipe_regions rr ON cr.id = rr.region_id
           WHERE rr.recipe_id = r.id),
          '[]'
        ) as regions,
        COALESCE(
          (SELECT json_agg(json_build_object('id', cc.id, 'name', cc.name))
           FROM cuisine_categories cc
           JOIN recipe_categories rc ON cc.id = rc.category_id
           WHERE rc.recipe_id = r.id),
          '[]'
        ) as categories,
        COALESCE(
          (SELECT json_agg(json_build_object('id', cm.id, 'name', cm.name))
           FROM cooking_methods cm
           JOIN recipe_methods rm ON cm.id = rm.method_id
           WHERE rm.recipe_id = r.id),
          '[]'
        ) as methods
      FROM recipes r
      WHERE ${whereClause}
      ORDER BY ${orderByClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    const items = result.rows.map(row => ({
      ...row,
      thumbnailUrl: row.thumbnail_url,
      ingredientCount: parseInt(row.ingredient_count)
    }));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  async getRecipe(id: string): Promise<Recipe | null> {
    const result = await db.query<Recipe>(
      `SELECT
        r.id,
        r.name,
        r.alternative_name as "alternativeName",
        r.cook_time_range_id as "cookTimeRangeId",
        r.steps,
        r.created_at as "createdAt",
        r.updated_at as "updatedAt",
        r.deleted_at as "deletedAt",
        COALESCE(
          (SELECT json_build_object('id', ctr.id, 'label', ctr.label, 'minMinutes', ctr.min_minutes, 'maxMinutes', ctr.max_minutes)
           FROM cook_time_ranges ctr WHERE ctr.id = r.cook_time_range_id),
          NULL
        ) as "cookTimeRange"
      FROM recipes r
      WHERE r.id = $1 AND r.deleted_at IS NULL`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const recipe = result.rows[0];

    // Get ingredients
    const ingredientsResult = await db.query(
      `SELECT
        ri.id,
        ri.ingredient_id as "ingredientId",
        ri.unit_id as "unitId",
        ri.count,
        ri.sort_order as "sortOrder",
        json_build_object('id', i.id, 'name', i.name, 'category', i.category) as ingredient,
        CASE WHEN u.id IS NOT NULL
          THEN json_build_object('id', u.id, 'name', u.name, 'nameZh', u.name_zh)
          ELSE NULL
        END as unit
      FROM recipe_ingredients ri
      JOIN ingredients i ON ri.ingredient_id = i.id
      LEFT JOIN units u ON ri.unit_id = u.id
      WHERE ri.recipe_id = $1
      ORDER BY ri.sort_order`,
      [id]
    );

    // Get images
    const imagesResult = await db.query(
      `SELECT id, file_path as "filePath", sort_order as "sortOrder", created_at as "createdAt"
       FROM recipe_images
       WHERE recipe_id = $1
       ORDER BY sort_order`,
      [id]
    );

    // Get regions
    const regionsResult = await db.query(
      `SELECT cr.id, cr.name
       FROM cuisine_regions cr
       JOIN recipe_regions rr ON cr.id = rr.region_id
       WHERE rr.recipe_id = $1`,
      [id]
    );

    // Get categories
    const categoriesResult = await db.query(
      `SELECT cc.id, cc.name
       FROM cuisine_categories cc
       JOIN recipe_categories rc ON cc.id = rc.category_id
       WHERE rc.recipe_id = $1`,
      [id]
    );

    // Get methods
    const methodsResult = await db.query(
      `SELECT cm.id, cm.name
       FROM cooking_methods cm
       JOIN recipe_methods rm ON cm.id = rm.method_id
       WHERE rm.recipe_id = $1`,
      [id]
    );

    // Normalize steps
    const normalizedSteps = normalizeSteps(recipe.steps);

    return {
      ...recipe,
      steps: normalizedSteps,
      ingredients: ingredientsResult.rows as Recipe['ingredients'],
      images: imagesResult.rows as Recipe['images'],
      regions: regionsResult.rows as Recipe['regions'],
      categories: categoriesResult.rows as Recipe['categories'],
      methods: methodsResult.rows as Recipe['methods']
    };
  }

  async createRecipe(input: CreateRecipeInput): Promise<Recipe> {
    // Download external step images before saving
    const stepsWithLocalImages = input.steps
      ? await downloadStepImages(input.steps)
      : [];

    return db.transaction(async (client) => {
      // Create recipe
      const recipeResult = await client.query(
        `INSERT INTO recipes (name, alternative_name, cook_time_range_id, steps)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [
          input.name,
          input.alternativeName || null,
          input.cookTimeRangeId || null,
          JSON.stringify(stepsWithLocalImages)
        ]
      );
      const recipeId = recipeResult.rows[0].id;

      // Add ingredients
      if (input.ingredients && input.ingredients.length > 0) {
        for (let i = 0; i < input.ingredients.length; i++) {
          const ing = input.ingredients[i];
          await client.query(
            `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, unit_id, count, sort_order)
             VALUES ($1, $2, $3, $4, $5)`,
            [recipeId, ing.ingredientId, ing.unitId, ing.count, i]
          );
        }
      }

      // Add images
      if (input.imageIds && input.imageIds.length > 0) {
        for (let i = 0; i < input.imageIds.length; i++) {
          await client.query(
            `UPDATE recipe_images SET recipe_id = $1, sort_order = $2 WHERE id = $3`,
            [recipeId, i, input.imageIds[i]]
          );
        }
      }

      // Add regions
      if (input.regionIds && input.regionIds.length > 0) {
        for (const regionId of input.regionIds) {
          await client.query(
            `INSERT INTO recipe_regions (recipe_id, region_id) VALUES ($1, $2)`,
            [recipeId, regionId]
          );
        }
      }

      // Add categories
      if (input.categoryIds && input.categoryIds.length > 0) {
        for (const categoryId of input.categoryIds) {
          await client.query(
            `INSERT INTO recipe_categories (recipe_id, category_id) VALUES ($1, $2)`,
            [recipeId, categoryId]
          );
        }
      }

      // Add methods
      if (input.methodIds && input.methodIds.length > 0) {
        for (const methodId of input.methodIds) {
          await client.query(
            `INSERT INTO recipe_methods (recipe_id, method_id) VALUES ($1, $2)`,
            [recipeId, methodId]
          );
        }
      }

      return this.getRecipe(recipeId) as Promise<Recipe>;
    });
  }

  async updateRecipe(input: UpdateRecipeInput): Promise<Recipe | null> {
    // Download external step images before saving (if steps are being updated)
    let stepsWithLocalImages: RecipeStepInput[] | undefined;
    if (input.steps) {
      stepsWithLocalImages = await downloadStepImages(input.steps);
    }

    return db.transaction(async (client) => {
      // Check recipe exists
      const checkResult = await client.query(
        `SELECT id FROM recipes WHERE id = $1 AND deleted_at IS NULL`,
        [input.id]
      );
      if (checkResult.rows.length === 0) {
        return null;
      }

      // Update recipe
      const updates: string[] = ['updated_at = NOW()'];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (input.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        params.push(input.name);
      }
      if (input.alternativeName !== undefined) {
        updates.push(`alternative_name = $${paramIndex++}`);
        params.push(input.alternativeName);
      }
      if (input.cookTimeRangeId !== undefined) {
        updates.push(`cook_time_range_id = $${paramIndex++}`);
        params.push(input.cookTimeRangeId);
      }
      if (stepsWithLocalImages !== undefined) {
        updates.push(`steps = $${paramIndex++}`);
        params.push(JSON.stringify(stepsWithLocalImages));
      }

      if (params.length > 0) {
        params.push(input.id);
        await client.query(
          `UPDATE recipes SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
          params
        );
      }

      // Update ingredients
      if (input.ingredients !== undefined) {
        await client.query(
          `DELETE FROM recipe_ingredients WHERE recipe_id = $1`,
          [input.id]
        );
        for (let i = 0; i < input.ingredients.length; i++) {
          const ing = input.ingredients[i];
          await client.query(
            `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, unit_id, count, sort_order)
             VALUES ($1, $2, $3, $4, $5)`,
            [input.id, ing.ingredientId, ing.unitId, ing.count, i]
          );
        }
      }

      // Update regions
      if (input.regionIds !== undefined) {
        await client.query(
          `DELETE FROM recipe_regions WHERE recipe_id = $1`,
          [input.id]
        );
        for (const regionId of input.regionIds) {
          await client.query(
            `INSERT INTO recipe_regions (recipe_id, region_id) VALUES ($1, $2)`,
            [input.id, regionId]
          );
        }
      }

      // Update categories
      if (input.categoryIds !== undefined) {
        await client.query(
          `DELETE FROM recipe_categories WHERE recipe_id = $1`,
          [input.id]
        );
        for (const categoryId of input.categoryIds) {
          await client.query(
            `INSERT INTO recipe_categories (recipe_id, category_id) VALUES ($1, $2)`,
            [input.id, categoryId]
          );
        }
      }

      // Update methods
      if (input.methodIds !== undefined) {
        await client.query(
          `DELETE FROM recipe_methods WHERE recipe_id = $1`,
          [input.id]
        );
        for (const methodId of input.methodIds) {
          await client.query(
            `INSERT INTO recipe_methods (recipe_id, method_id) VALUES ($1, $2)`,
            [input.id, methodId]
          );
        }
      }

      return this.getRecipe(input.id);
    });
  }

  async deleteRecipe(id: string): Promise<boolean> {
    const result = await db.query(
      `UPDATE recipes SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [id]
    );
    return result.rows.length > 0;
  }
}

export const recipeService = new RecipeService();
