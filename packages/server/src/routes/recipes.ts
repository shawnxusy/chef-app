import { Router } from 'express';
import { asyncHandler, AppError } from '../middleware/error.js';
import { db } from '../db/client.js';
import { recipeService } from '../services/recipe.service.js';
import { llmService } from '../services/llm.service.js';
import type { CreateRecipeInput, UpdateRecipeInput, RecipeFilters } from '@chef-app/shared';

const router = Router();

// GET /api/recipes - List recipes with filters
router.get('/', asyncHandler(async (req, res) => {
  const filters: RecipeFilters = {
    search: req.query.search as string,
    regionIds: req.query.regionIds ? (req.query.regionIds as string).split(',') : undefined,
    categoryIds: req.query.categoryIds ? (req.query.categoryIds as string).split(',') : undefined,
    methodIds: req.query.methodIds ? (req.query.methodIds as string).split(',') : undefined,
    cookTimeRangeId: req.query.cookTimeRangeId as string
  };

  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;

  const result = await recipeService.listRecipes(filters, page, pageSize);

  return res.json({ success: true, data: result });
}));

// GET /api/recipes/:id - Get single recipe
router.get('/:id', asyncHandler(async (req, res) => {
  const recipe = await recipeService.getRecipe(req.params.id);

  if (!recipe) {
    throw new AppError('NOT_FOUND', '未找到该菜谱', 404);
  }

  return res.json({ success: true, data: recipe });
}));

// POST /api/recipes - Create recipe
router.post('/', asyncHandler(async (req, res) => {
  const input: CreateRecipeInput = req.body;

  if (!input.name) {
    throw new AppError('MISSING_NAME', '菜名不能为空', 400);
  }

  const recipe = await recipeService.createRecipe(input);

  return res.status(201).json({ success: true, data: recipe });
}));

// PUT /api/recipes/:id - Update recipe
router.put('/:id', asyncHandler(async (req, res) => {
  const input: UpdateRecipeInput = { ...req.body, id: req.params.id };

  const recipe = await recipeService.updateRecipe(input);

  if (!recipe) {
    throw new AppError('NOT_FOUND', '未找到该菜谱', 404);
  }

  return res.json({ success: true, data: recipe });
}));

// DELETE /api/recipes/:id - Soft delete recipe
router.delete('/:id', asyncHandler(async (req, res) => {
  const result = await recipeService.deleteRecipe(req.params.id);

  if (!result) {
    throw new AppError('NOT_FOUND', '未找到该菜谱', 404);
  }

  return res.json({ success: true, data: { deleted: true } });
}));

// POST /api/recipes/parse - LLM parse recipe from URL or images
router.post('/parse', asyncHandler(async (req, res) => {
  const { url, images } = req.body;

  if (!url && (!images || images.length === 0)) {
    throw new AppError('MISSING_INPUT', '请提供链接或图片', 400);
  }

  const result = await llmService.parseRecipe({ url, images });

  return res.json({ success: true, data: result });
}));

export default router;
