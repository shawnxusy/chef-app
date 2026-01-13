import type { Recipe, RecipeListItem } from './recipe';

// Meal dish (recipe in a meal with order)
export interface MealDish {
  id: string;
  recipeId: string;
  recipe: RecipeListItem;
  sortOrder: number;
}

// Meal with dishes
export interface Meal {
  id: string;
  name: string;
  dishes: MealDish[];
  createdAt: Date;
  updatedAt: Date;
}

// Meal list item
export interface MealListItem {
  id: string;
  name: string;
  dishCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Input for creating/updating meals
export interface CreateMealInput {
  name: string;
}

export interface UpdateMealInput {
  id: string;
  name?: string;
  dishes?: Array<{
    recipeId: string;
    sortOrder: number;
  }>;
}

// Shopping list item (aggregated ingredient)
export interface ShoppingListItem {
  ingredientId: string;
  ingredientName: string;
  category: string | null;
  quantities: Array<{
    count: number | null;
    unitId: string | null;
    unitName: string | null;
    unitNameZh: string | null;
    recipeNames: string[];  // Which recipes need this
  }>;
  // Combined quantity if same unit
  totalCount: number | null;
  totalUnitId: string | null;
  totalUnitName: string | null;
  hasVariedUnits: boolean;  // true if different units used
}

// Shopping list grouped by recipe
export interface RecipeShoppingList {
  recipeId: string;
  recipeName: string;
  ingredients: Array<{
    ingredientId: string;
    ingredientName: string;
    count: number | null;
    unitId: string | null;
    unitName: string | null;
    unitNameZh: string | null;
  }>;
}

// Full shopping list response
export interface ShoppingListResponse {
  mealId: string;
  mealName: string;
  byRecipe: RecipeShoppingList[];
  aggregated: ShoppingListItem[];
}
