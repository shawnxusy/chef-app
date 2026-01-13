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

// POST /api/reference/:type - Create new reference item
router.post('/:type', asyncHandler(async (req, res) => {
  const type = req.params.type as ReferenceType;
  const tableInfo = tableMap[type];

  if (!tableInfo) {
    throw new AppError('INVALID_TYPE', '无效的类型', 400);
  }

  const { name, nameZh, category } = req.body;

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
  const { id } = req.params;
  const tableInfo = tableMap[type];

  if (!tableInfo) {
    throw new AppError('INVALID_TYPE', '无效的类型', 400);
  }

  const { name, nameZh, category, label } = req.body;

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
      `UPDATE cook_time_ranges SET label = COALESCE($1, label)
       WHERE id = $2 RETURNING ${tableInfo.columns.join(', ')}`,
      [label, id]
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
  const { id } = req.params;
  const tableInfo = tableMap[type];

  if (!tableInfo) {
    throw new AppError('INVALID_TYPE', '无效的类型', 400);
  }

  // Don't allow deleting cook time ranges (they are system-defined)
  if (type === 'cookTimeRanges') {
    throw new AppError('CANNOT_DELETE', '不能删除时间范围', 400);
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
