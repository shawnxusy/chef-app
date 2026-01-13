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
  const id = req.params.id as string;
  const meal = await mealService.getMeal(id);

  if (!meal) {
    throw new AppError('NOT_FOUND', '未找到该餐单', 404);
  }

  return res.json({ success: true, data: meal });
}));

// GET /api/meals/:id/shopping-list - Get aggregated shopping list
router.get('/:id/shopping-list', asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const shoppingList = await mealService.getShoppingList(id);

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
  const id = req.params.id as string;
  const input: UpdateMealInput = { ...req.body, id };

  const meal = await mealService.updateMeal(input);

  if (!meal) {
    throw new AppError('NOT_FOUND', '未找到该餐单', 404);
  }

  return res.json({ success: true, data: meal });
}));

// DELETE /api/meals/:id - Delete meal
router.delete('/:id', asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const result = await mealService.deleteMeal(id);

  if (!result) {
    throw new AppError('NOT_FOUND', '未找到该餐单', 404);
  }

  return res.json({ success: true, data: { deleted: true } });
}));

// POST /api/meals/:id/dishes - Add dish to meal
router.post('/:id/dishes', asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const { recipeId } = req.body;

  if (!recipeId) {
    throw new AppError('MISSING_RECIPE', '请选择菜品', 400);
  }

  const meal = await mealService.addDishToMeal(id, recipeId);

  if (!meal) {
    throw new AppError('NOT_FOUND', '未找到该餐单', 404);
  }

  return res.json({ success: true, data: meal });
}));

// DELETE /api/meals/:id/dishes/:dishId - Remove dish from meal
router.delete('/:id/dishes/:dishId', asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const dishId = req.params.dishId as string;
  const meal = await mealService.removeDishFromMeal(id, dishId);

  if (!meal) {
    throw new AppError('NOT_FOUND', '未找到该餐单或菜品', 404);
  }

  return res.json({ success: true, data: meal });
}));

export default router;
