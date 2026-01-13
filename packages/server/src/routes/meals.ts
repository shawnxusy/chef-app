import { Router } from 'express';
import { asyncHandler, AppError } from '../middleware/error.js';
import { mealService } from '../services/meal.service.js';
import type { CreateMealInput, UpdateMealInput } from '@chef-app/shared';

const router = Router();

// GET /api/meals - List all meals
router.get('/', asyncHandler(async (_req, res) => {
  const meals = await mealService.listMeals();

  return res.json({ success: true, data: meals });
}));

// GET /api/meals/:id - Get meal with dishes
router.get('/:id', asyncHandler(async (req, res) => {
  const meal = await mealService.getMeal(req.params.id);

  if (!meal) {
    throw new AppError('NOT_FOUND', '未找到该餐单', 404);
  }

  return res.json({ success: true, data: meal });
}));

// GET /api/meals/:id/shopping-list - Get aggregated shopping list
router.get('/:id/shopping-list', asyncHandler(async (req, res) => {
  const shoppingList = await mealService.getShoppingList(req.params.id);

  if (!shoppingList) {
    throw new AppError('NOT_FOUND', '未找到该餐单', 404);
  }

  return res.json({ success: true, data: shoppingList });
}));

// POST /api/meals - Create meal
router.post('/', asyncHandler(async (req, res) => {
  const input: CreateMealInput = req.body;

  if (!input.name) {
    throw new AppError('MISSING_NAME', '餐单名不能为空', 400);
  }

  const meal = await mealService.createMeal(input);

  return res.status(201).json({ success: true, data: meal });
}));

// PUT /api/meals/:id - Update meal (name, dishes, order)
router.put('/:id', asyncHandler(async (req, res) => {
  const input: UpdateMealInput = { ...req.body, id: req.params.id };

  const meal = await mealService.updateMeal(input);

  if (!meal) {
    throw new AppError('NOT_FOUND', '未找到该餐单', 404);
  }

  return res.json({ success: true, data: meal });
}));

// DELETE /api/meals/:id - Delete meal
router.delete('/:id', asyncHandler(async (req, res) => {
  const result = await mealService.deleteMeal(req.params.id);

  if (!result) {
    throw new AppError('NOT_FOUND', '未找到该餐单', 404);
  }

  return res.json({ success: true, data: { deleted: true } });
}));

// POST /api/meals/:id/dishes - Add dish to meal
router.post('/:id/dishes', asyncHandler(async (req, res) => {
  const { recipeId } = req.body;

  if (!recipeId) {
    throw new AppError('MISSING_RECIPE', '请选择菜品', 400);
  }

  const meal = await mealService.addDishToMeal(req.params.id, recipeId);

  if (!meal) {
    throw new AppError('NOT_FOUND', '未找到该餐单', 404);
  }

  return res.json({ success: true, data: meal });
}));

// DELETE /api/meals/:id/dishes/:dishId - Remove dish from meal
router.delete('/:id/dishes/:dishId', asyncHandler(async (req, res) => {
  const meal = await mealService.removeDishFromMeal(req.params.id, req.params.dishId);

  if (!meal) {
    throw new AppError('NOT_FOUND', '未找到该餐单或菜品', 404);
  }

  return res.json({ success: true, data: meal });
}));

export default router;
