import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/api/client';
import { useReference } from '@/context/ReferenceContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { RecipeCard } from '@/components/RecipeCard';
import { FilterBar } from '@/components/FilterBar';
import type { Meal, RecipeListItem, PaginatedResponse } from '@chef-app/shared';

export function MealBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const { data: refData } = useReference();

  const [meal, setMeal] = useState<Meal | null>(null);
  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [regionIds, setRegionIds] = useState<string[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [methodIds, setMethodIds] = useState<string[]>([]);
  const [cookTimeRangeId, setCookTimeRangeId] = useState('');

  // Load meal
  useEffect(() => {
    async function fetchMeal() {
      if (!id) return;
      try {
        const data = await api.get<Meal>(`/meals/${id}`);
        setMeal(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      }
    }
    fetchMeal();
  }, [id]);

  // Load recipes
  const fetchRecipes = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (regionIds.length) params.set('regionIds', regionIds.join(','));
      if (categoryIds.length) params.set('categoryIds', categoryIds.join(','));
      if (methodIds.length) params.set('methodIds', methodIds.join(','));
      if (cookTimeRangeId) params.set('cookTimeRangeId', cookTimeRangeId);
      params.set('pageSize', '100');

      const result = await api.get<PaginatedResponse<RecipeListItem>>(
        `/recipes?${params.toString()}`
      );
      setRecipes(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setIsLoading(false);
    }
  }, [search, regionIds, categoryIds, methodIds, cookTimeRangeId]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const addDishToMeal = async (recipeId: string) => {
    if (!id) return;
    setIsSaving(true);
    try {
      const updated = await api.post<Meal>(`/meals/${id}/dishes`, { recipeId });
      setMeal(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加失败');
    } finally {
      setIsSaving(false);
    }
  };

  const removeDishFromMeal = async (dishId: string) => {
    if (!id) return;
    setIsSaving(true);
    try {
      const updated = await api.delete<Meal>(`/meals/${id}/dishes/${dishId}`);
      setMeal(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedRecipeIds = new Set(meal?.dishes?.map((d) => d.recipeId) || []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link to="/cook" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
            ← 返回餐单列表
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{meal?.name || '加载中...'}</h1>
          <p className="text-gray-500 mt-1">选择要烹饪的菜品</p>
        </div>
        {meal && meal.dishes && meal.dishes.length > 0 && (
          <Link to={`/cook/${id}/prepare`} className="btn-primary">
            开始准备 ({meal.dishes.length})
          </Link>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Selected Dishes */}
      {meal && meal.dishes && meal.dishes.length > 0 && (
        <div className="card p-4">
          <h2 className="font-semibold text-gray-900 mb-3">
            已选菜品 ({meal.dishes.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {meal.dishes.map((dish) => (
              <div
                key={dish.id}
                className="flex items-center gap-2 bg-primary-50 text-primary-700 px-3 py-1 rounded-full"
              >
                <span>{dish.recipe.name}</span>
                <button
                  onClick={() => removeDishFromMeal(dish.id)}
                  disabled={isSaving}
                  className="hover:text-red-500 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索菜名或食材..."
          className="input pl-10"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Filters */}
      {refData && (
        <FilterBar
          regions={refData.cuisineRegions}
          categories={refData.cuisineCategories}
          methods={refData.cookingMethods}
          timeRanges={refData.cookTimeRanges}
          selectedRegionIds={regionIds}
          selectedCategoryIds={categoryIds}
          selectedMethodIds={methodIds}
          selectedTimeRangeId={cookTimeRangeId}
          onRegionChange={setRegionIds}
          onCategoryChange={setCategoryIds}
          onMethodChange={setMethodIds}
          onTimeRangeChange={setCookTimeRangeId}
        />
      )}

      {/* Recipe Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">没有找到菜谱</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              selected={selectedRecipeIds.has(recipe.id)}
              showAddButton={!selectedRecipeIds.has(recipe.id)}
              onAdd={() => addDishToMeal(recipe.id)}
              onClick={() => {
                if (selectedRecipeIds.has(recipe.id)) {
                  const dish = meal?.dishes?.find((d) => d.recipeId === recipe.id);
                  if (dish) removeDishFromMeal(dish.id);
                } else {
                  addDishToMeal(recipe.id);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
