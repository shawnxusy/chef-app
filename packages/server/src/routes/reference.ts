import { Router } from 'express';
import { asyncHandler, AppError } from '../middleware/error.js';
import { db } from '../db/client.js';
import type { ReferenceData, ReferenceType, Unit, Ingredient, CuisineRegion, CuisineCategory, CookingMethod, CookTimeRange } from '@chef-app/shared';

const router = Router();

// Map type names to table info
const tableMap: Record<ReferenceType, { table: string; columns: string[] }> = {
  units: { table: 'units', columns: ['id', 'name', 'name_zh as "nameZh"', 'created_at as "createdAt"'] },
  ingredients: { table: 'ingredients', columns: ['id', 'name', 'category', 'created_at as "createdAt"'] },
  cuisineRegions: { table: 'cuisine_regions', columns: ['id', 'name'] },
  cuisineCategories: { table: 'cuisine_categories', columns: ['id', 'name'] },
  cookingMethods: { table: 'cooking_methods', columns: ['id', 'name'] },
  cookTimeRanges: { table: 'cook_time_ranges', columns: ['id', 'label', 'min_minutes as "minMinutes"', 'max_minutes as "maxMinutes"'] }
};

// Check usage of reference items in recipes
async function checkUsageInRecipes(type: ReferenceType, id: string): Promise<Array<{ id: string; name: string }>> {
  let query: string;
  
  switch (type) {
    case 'units':
      query = `
        SELECT DISTINCT r.id, r.name 
        FROM recipes r 
        JOIN recipe_ingredients ri ON r.id = ri.recipe_id 
        WHERE ri.unit_id = $1 AND r.deleted_at IS NULL
      `;
      break;
    case 'ingredients':
      query = `
        SELECT DISTINCT r.id, r.name 
        FROM recipes r 
        JOIN recipe_ingredients ri ON r.id = ri.recipe_id 
        WHERE ri.ingredient_id = $1 AND r.deleted_at IS NULL
      `;
      break;
    case 'cuisineRegions':
      query = `
        SELECT DISTINCT r.id, r.name 
        FROM recipes r 
        JOIN recipe_regions rr ON r.id = rr.recipe_id 
        WHERE rr.region_id = $1 AND r.deleted_at IS NULL
      `;
      break;
    case 'cuisineCategories':
      query = `
        SELECT DISTINCT r.id, r.name 
        FROM recipes r 
        JOIN recipe_categories rc ON r.id = rc.recipe_id 
        WHERE rc.category_id = $1 AND r.deleted_at IS NULL
      `;
      break;
    case 'cookingMethods':
      query = `
        SELECT DISTINCT r.id, r.name 
        FROM recipes r 
        JOIN recipe_methods rm ON r.id = rm.recipe_id 
        WHERE rm.method_id = $1 AND r.deleted_at IS NULL
      `;
      break;
    case 'cookTimeRanges':
      query = `
        SELECT DISTINCT r.id, r.name 
        FROM recipes r 
        WHERE r.cook_time_range_id = $1 AND r.deleted_at IS NULL
      `;
      break;
    default:
      return [];
  }

  const result = await db.query(query, [id]);
  return result.rows as Array<{ id: string; name: string }>;
}

// GET /api/reference/all - Get all reference data
router.get('/all', asyncHandler(async (_req, res) => {
  const [units, ingredients, regions, categories, methods, timeRanges] = await Promise.all([
    db.query(`SELECT ${tableMap.units.columns.join(', ')} FROM units ORDER BY name`),
    db.query(`SELECT ${tableMap.ingredients.columns.join(', ')} FROM ingredients ORDER BY category, name`),
    db.query(`SELECT ${tableMap.cuisineRegions.columns.join(', ')} FROM cuisine_regions ORDER BY name`),
    db.query(`SELECT ${tableMap.cuisineCategories.columns.join(', ')} FROM cuisine_categories ORDER BY name`),
    db.query(`SELECT ${tableMap.cookingMethods.columns.join(', ')} FROM cooking_methods ORDER BY name`),
    db.query(`SELECT ${tableMap.cookTimeRanges.columns.join(', ')} FROM cook_time_ranges ORDER BY min_minutes`)
  ]);

  const data: ReferenceData = {
    units: units.rows as unknown as Unit[],
    ingredients: ingredients.rows as unknown as Ingredient[],
    cuisineRegions: regions.rows as unknown as CuisineRegion[],
    cuisineCategories: categories.rows as unknown as CuisineCategory[],
    cookingMethods: methods.rows as unknown as CookingMethod[],
    cookTimeRanges: timeRanges.rows as unknown as CookTimeRange[]
  };

  return res.json({ success: true, data });
}));

// GET /api/reference/:type - Get items of a specific type
router.get('/:type', asyncHandler(async (req, res) => {
  const type = req.params.type as ReferenceType;
  const tableInfo = tableMap[type];

  if (!tableInfo) {
    throw new AppError('INVALID_TYPE', '无效的类型', 400);
  }

  const result = await db.query(
    `SELECT ${tableInfo.columns.join(', ')} FROM ${tableInfo.table} ORDER BY name`
  );

  return res.json({ success: true, data: result.rows });
}));

// GET /api/reference/:type/:id/usage - Check if item is used in any recipes
router.get('/:type/:id/usage', asyncHandler(async (req, res) => {
  const type = req.params.type as ReferenceType;
  const id = req.params.id as string;

  if (!tableMap[type]) {
    throw new AppError('INVALID_TYPE', '无效的类型', 400);
  }

  const recipes = await checkUsageInRecipes(type, id);
  return res.json({ success: true, data: { recipes, isUsed: recipes.length > 0 } });
}));

// POST /api/reference/:type - Create new reference item
router.post('/:type', asyncHandler(async (req, res) => {
  const type = req.params.type as ReferenceType;
  const tableInfo = tableMap[type];

  if (!tableInfo) {
    throw new AppError('INVALID_TYPE', '无效的类型', 400);
  }

  const { name, nameZh, category, label, minMinutes, maxMinutes } = req.body;

  if (type === 'cookTimeRanges') {
    if (!label) {
      throw new AppError('MISSING_LABEL', '标签不能为空', 400);
    }
    const result = await db.query(
      `INSERT INTO cook_time_ranges (label, min_minutes, max_minutes) VALUES ($1, $2, $3)
       RETURNING ${tableInfo.columns.join(', ')}`,
      [label, minMinutes ?? null, maxMinutes ?? null]
    );
    return res.status(201).json({ success: true, data: result.rows[0] });
  }

  if (!name) {
    throw new AppError('MISSING_NAME', '名称不能为空', 400);
  }

  let result;
  if (type === 'units') {
    result = await db.query(
      `INSERT INTO units (name, name_zh) VALUES ($1, $2)
       RETURNING ${tableInfo.columns.join(', ')}`,
      [name, nameZh || null]
    );
  } else if (type === 'ingredients') {
    result = await db.query(
      `INSERT INTO ingredients (name, category) VALUES ($1, $2)
       RETURNING ${tableInfo.columns.join(', ')}`,
      [name, category || null]
    );
  } else {
    result = await db.query(
      `INSERT INTO ${tableInfo.table} (name) VALUES ($1)
       RETURNING ${tableInfo.columns.join(', ')}`,
      [name]
    );
  }

  return res.status(201).json({ success: true, data: result.rows[0] });
}));

// PUT /api/reference/:type/:id - Update reference item
router.put('/:type/:id', asyncHandler(async (req, res) => {
  const type = req.params.type as ReferenceType;
  const id = req.params.id as string;
  const tableInfo = tableMap[type];

  if (!tableInfo) {
    throw new AppError('INVALID_TYPE', '无效的类型', 400);
  }

  const { name, nameZh, category, label, minMinutes, maxMinutes } = req.body;

  let result;
  if (type === 'units') {
    result = await db.query(
      `UPDATE units SET name = COALESCE($1, name), name_zh = COALESCE($2, name_zh)
       WHERE id = $3 RETURNING ${tableInfo.columns.join(', ')}`,
      [name, nameZh, id]
    );
  } else if (type === 'ingredients') {
    result = await db.query(
      `UPDATE ingredients SET name = COALESCE($1, name), category = COALESCE($2, category)
       WHERE id = $3 RETURNING ${tableInfo.columns.join(', ')}`,
      [name, category, id]
    );
  } else if (type === 'cookTimeRanges') {
    result = await db.query(
      `UPDATE cook_time_ranges SET label = COALESCE($1, label), min_minutes = COALESCE($2, min_minutes), max_minutes = COALESCE($3, max_minutes)
       WHERE id = $4 RETURNING ${tableInfo.columns.join(', ')}`,
      [label, minMinutes, maxMinutes, id]
    );
  } else {
    result = await db.query(
      `UPDATE ${tableInfo.table} SET name = COALESCE($1, name)
       WHERE id = $2 RETURNING ${tableInfo.columns.join(', ')}`,
      [name, id]
    );
  }

  if (result.rows.length === 0) {
    throw new AppError('NOT_FOUND', '未找到该项', 404);
  }

  return res.json({ success: true, data: result.rows[0] });
}));

// DELETE /api/reference/:type/:id - Delete reference item
router.delete('/:type/:id', asyncHandler(async (req, res) => {
  const type = req.params.type as ReferenceType;
  const id = req.params.id as string;
  const tableInfo = tableMap[type];

  if (!tableInfo) {
    throw new AppError('INVALID_TYPE', '无效的类型', 400);
  }

  // Check if item is used in any recipes
  const usedInRecipes = await checkUsageInRecipes(type, id);
  
  if (usedInRecipes.length > 0) {
    const recipeLinks = usedInRecipes.map(r => ({ id: r.id, name: r.name }));
    return res.status(400).json({
      success: false,
      error: {
        code: 'IN_USE',
        message: `该项正在被 ${usedInRecipes.length} 个菜谱使用，无法删除`,
        recipes: recipeLinks
      }
    });
  }

  const result = await db.query(
    `DELETE FROM ${tableInfo.table} WHERE id = $1 RETURNING id`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError('NOT_FOUND', '未找到该项', 404);
  }

  return res.json({ success: true, data: { deleted: true } });
}));

export default router;
