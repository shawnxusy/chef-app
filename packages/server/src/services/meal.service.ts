import { db } from '../db/client.js';
import type {
  Meal,
  MealListItem,
  CreateMealInput,
  UpdateMealInput,
  ShoppingListResponse,
  ShoppingListItem,
  RecipeShoppingList
} from '@chef-app/shared';

class MealService {
  async listMeals(): Promise<MealListItem[]> {
    const result = await db.query<MealListItem>(
      `SELECT
        m.id,
        m.name,
        m.created_at as "createdAt",
        m.updated_at as "updatedAt",
        (SELECT COUNT(*) FROM meal_dishes WHERE meal_id = m.id) as "dishCount"
      FROM meals m
      ORDER BY m.updated_at DESC`
    );
    return result.rows.map(row => ({
      ...row,
      dishCount: parseInt(row.dishCount as unknown as string)
    }));
  }

  async getMeal(id: string): Promise<Meal | null> {
    const mealResult = await db.query<Meal>(
      `SELECT
        id,
        name,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM meals
      WHERE id = $1`,
      [id]
    );

    if (mealResult.rows.length === 0) {
      return null;
    }

    const meal = mealResult.rows[0];

    // Get dishes with recipe info
    const dishesResult = await db.query(
      `SELECT
        md.id,
        md.recipe_id as "recipeId",
        md.sort_order as "sortOrder",
        json_build_object(
          'id', r.id,
          'name', r.name,
          'alternativeName', r.alternative_name,
          'thumbnailUrl', (SELECT file_path FROM recipe_images WHERE recipe_id = r.id ORDER BY sort_order LIMIT 1),
          'ingredientCount', (SELECT COUNT(*) FROM recipe_ingredients WHERE recipe_id = r.id),
          'createdAt', r.created_at,
          'cookTimeRange', COALESCE(
            (SELECT json_build_object('id', ctr.id, 'label', ctr.label)
             FROM cook_time_ranges ctr WHERE ctr.id = r.cook_time_range_id),
            NULL
          ),
          'regions', COALESCE(
            (SELECT json_agg(json_build_object('id', cr.id, 'name', cr.name))
             FROM cuisine_regions cr
             JOIN recipe_regions rr ON cr.id = rr.region_id
             WHERE rr.recipe_id = r.id),
            '[]'
          ),
          'categories', COALESCE(
            (SELECT json_agg(json_build_object('id', cc.id, 'name', cc.name))
             FROM cuisine_categories cc
             JOIN recipe_categories rc ON cc.id = rc.category_id
             WHERE rc.recipe_id = r.id),
            '[]'
          ),
          'methods', COALESCE(
            (SELECT json_agg(json_build_object('id', cm.id, 'name', cm.name))
             FROM cooking_methods cm
             JOIN recipe_methods rm ON cm.id = rm.method_id
             WHERE rm.recipe_id = r.id),
            '[]'
          )
        ) as recipe
      FROM meal_dishes md
      JOIN recipes r ON md.recipe_id = r.id
      WHERE md.meal_id = $1
      ORDER BY md.sort_order`,
      [id]
    );

    return {
      ...meal,
      dishes: dishesResult.rows as Meal['dishes']
    };
  }

  async getShoppingList(mealId: string): Promise<ShoppingListResponse | null> {
    // Check meal exists
    const mealResult = await db.query<{ id: string; name: string }>(
      `SELECT id, name FROM meals WHERE id = $1`,
      [mealId]
    );

    if (mealResult.rows.length === 0) {
      return null;
    }

    const meal = mealResult.rows[0];

    // Get all ingredients by recipe
    const ingredientsResult = await db.query(
      `SELECT
        r.id as recipe_id,
        r.name as recipe_name,
        ri.ingredient_id,
        i.name as ingredient_name,
        i.category as ingredient_category,
        ri.count,
        ri.unit_id,
        u.name as unit_name,
        u.name_zh as unit_name_zh,
        md.sort_order
      FROM meal_dishes md
      JOIN recipes r ON md.recipe_id = r.id
      JOIN recipe_ingredients ri ON r.id = ri.recipe_id
      JOIN ingredients i ON ri.ingredient_id = i.id
      LEFT JOIN units u ON ri.unit_id = u.id
      WHERE md.meal_id = $1
      ORDER BY md.sort_order, ri.sort_order`,
      [mealId]
    );

    // Group by recipe for byRecipe view
    const byRecipeMap = new Map<string, RecipeShoppingList>();
    for (const row of ingredientsResult.rows) {
      if (!byRecipeMap.has(row.recipe_id)) {
        byRecipeMap.set(row.recipe_id, {
          recipeId: row.recipe_id,
          recipeName: row.recipe_name,
          ingredients: []
        });
      }
      byRecipeMap.get(row.recipe_id)!.ingredients.push({
        ingredientId: row.ingredient_id,
        ingredientName: row.ingredient_name,
        count: row.count ? parseFloat(row.count) : null,
        unitId: row.unit_id,
        unitName: row.unit_name,
        unitNameZh: row.unit_name_zh
      });
    }

    // Aggregate ingredients
    const aggregatedMap = new Map<string, ShoppingListItem>();
    for (const row of ingredientsResult.rows) {
      const key = row.ingredient_id;
      if (!aggregatedMap.has(key)) {
        aggregatedMap.set(key, {
          ingredientId: row.ingredient_id,
          ingredientName: row.ingredient_name,
          category: row.ingredient_category,
          quantities: [],
          totalCount: null,
          totalUnitId: null,
          totalUnitName: null,
          hasVariedUnits: false
        });
      }

      const item = aggregatedMap.get(key)!;

      // Find existing quantity with same unit
      const existingQty = item.quantities.find(q => q.unitId === row.unit_id);
      if (existingQty) {
        if (row.count !== null && existingQty.count !== null) {
          existingQty.count += parseFloat(row.count);
        }
        existingQty.recipeNames.push(row.recipe_name);
      } else {
        item.quantities.push({
          count: row.count ? parseFloat(row.count) : null,
          unitId: row.unit_id,
          unitName: row.unit_name,
          unitNameZh: row.unit_name_zh,
          recipeNames: [row.recipe_name]
        });
      }
    }

    // Calculate totals and check for varied units
    for (const item of aggregatedMap.values()) {
      if (item.quantities.length === 1) {
        item.totalCount = item.quantities[0].count;
        item.totalUnitId = item.quantities[0].unitId;
        item.totalUnitName = item.quantities[0].unitName;
        item.hasVariedUnits = false;
      } else {
        item.hasVariedUnits = true;
        // Can't aggregate different units
      }
    }

    return {
      mealId: meal.id,
      mealName: meal.name,
      byRecipe: Array.from(byRecipeMap.values()),
      aggregated: Array.from(aggregatedMap.values()).sort((a, b) => {
        // Sort by category then name
        if (a.category !== b.category) {
          return (a.category || '').localeCompare(b.category || '');
        }
        return a.ingredientName.localeCompare(b.ingredientName);
      })
    };
  }

  async createMeal(input: CreateMealInput): Promise<Meal> {
    const result = await db.query(
      `INSERT INTO meals (name) VALUES ($1) RETURNING id`,
      [input.name]
    );
    return this.getMeal(result.rows[0].id) as Promise<Meal>;
  }

  async updateMeal(input: UpdateMealInput): Promise<Meal | null> {
    return db.transaction(async (client) => {
      // Check meal exists
      const checkResult = await client.query(
        `SELECT id FROM meals WHERE id = $1`,
        [input.id]
      );
      if (checkResult.rows.length === 0) {
        return null;
      }

      // Update name if provided
      if (input.name !== undefined) {
        await client.query(
          `UPDATE meals SET name = $1, updated_at = NOW() WHERE id = $2`,
          [input.name, input.id]
        );
      }

      // Update dishes if provided
      if (input.dishes !== undefined) {
        // Delete existing dishes
        await client.query(
          `DELETE FROM meal_dishes WHERE meal_id = $1`,
          [input.id]
        );

        // Add new dishes
        for (const dish of input.dishes) {
          await client.query(
            `INSERT INTO meal_dishes (meal_id, recipe_id, sort_order) VALUES ($1, $2, $3)`,
            [input.id, dish.recipeId, dish.sortOrder]
          );
        }

        // Update meal timestamp
        await client.query(
          `UPDATE meals SET updated_at = NOW() WHERE id = $1`,
          [input.id]
        );
      }

      return this.getMeal(input.id);
    });
  }

  async deleteMeal(id: string): Promise<boolean> {
    const result = await db.query(
      `DELETE FROM meals WHERE id = $1 RETURNING id`,
      [id]
    );
    return result.rows.length > 0;
  }

  async addDishToMeal(mealId: string, recipeId: string): Promise<Meal | null> {
    // Check meal exists
    const mealCheck = await db.query(
      `SELECT id FROM meals WHERE id = $1`,
      [mealId]
    );
    if (mealCheck.rows.length === 0) {
      return null;
    }

    // Get max sort order
    const maxOrderResult = await db.query<{ max: number }>(
      `SELECT COALESCE(MAX(sort_order), -1) as max FROM meal_dishes WHERE meal_id = $1`,
      [mealId]
    );
    const nextOrder = (maxOrderResult.rows[0].max || 0) + 1;

    // Add dish
    await db.query(
      `INSERT INTO meal_dishes (meal_id, recipe_id, sort_order) VALUES ($1, $2, $3)`,
      [mealId, recipeId, nextOrder]
    );

    // Update meal timestamp
    await db.query(
      `UPDATE meals SET updated_at = NOW() WHERE id = $1`,
      [mealId]
    );

    return this.getMeal(mealId);
  }

  async removeDishFromMeal(mealId: string, dishId: string): Promise<Meal | null> {
    const result = await db.query(
      `DELETE FROM meal_dishes WHERE id = $1 AND meal_id = $2 RETURNING id`,
      [dishId, mealId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    // Update meal timestamp
    await db.query(
      `UPDATE meals SET updated_at = NOW() WHERE id = $1`,
      [mealId]
    );

    return this.getMeal(mealId);
  }
}

export const mealService = new MealService();
