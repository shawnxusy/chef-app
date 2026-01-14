import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/api/client';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { Meal, ShoppingListResponse, Recipe } from '@chef-app/shared';

type TabType = 'shopping' | 'recipes';
type ShoppingViewType = 'byRecipe' | 'aggregated';

export function PreparationPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('shopping');
  const [shoppingView, setShoppingView] = useState<ShoppingViewType>('aggregated');

  const [meal, setMeal] = useState<Meal | null>(null);
  const [shoppingList, setShoppingList] = useState<ShoppingListResponse | null>(null);
  const [fullRecipes, setFullRecipes] = useState<Record<string, Recipe>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recipeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Load data
  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      try {
        const [mealData, shoppingData] = await Promise.all([
          api.get<Meal>(`/meals/${id}`),
          api.get<ShoppingListResponse>(`/meals/${id}/shopping-list`),
        ]);
        setMeal(mealData);
        setShoppingList(shoppingData);

        // Fetch full recipe details for each dish
        const recipePromises = mealData.dishes?.map((dish) =>
          api.get<Recipe>(`/recipes/${dish.recipeId}`)
        ) || [];
        const recipes = await Promise.all(recipePromises);
        const recipeMap: Record<string, Recipe> = {};
        recipes.forEach((recipe) => {
          recipeMap[recipe.id] = recipe;
        });
        setFullRecipes(recipeMap);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [id]);

  // Reorder dishes
  const moveDish = async (index: number, direction: 'up' | 'down') => {
    if (!meal || !meal.dishes) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= meal.dishes.length) return;

    const newDishes = [...meal.dishes];
    [newDishes[index], newDishes[newIndex]] = [newDishes[newIndex], newDishes[index]];

    // Update locally first for responsiveness
    setMeal({ ...meal, dishes: newDishes });

    // Then persist
    try {
      await api.put(`/meals/${id}`, {
        dishes: newDishes.map((d, i) => ({ recipeId: d.recipeId, sortOrder: i })),
      });
    } catch (err) {
      // Revert on error
      setError(err instanceof Error ? err.message : '保存失败');
    }
  };

  const scrollToRecipe = (recipeId: string) => {
    const element = recipeRefs.current[recipeId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !meal) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error || '餐单不存在'}</p>
        <Link to="/cook" className="btn-secondary mt-4">
          返回列表
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link to={`/cook/${id}`} className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
            ← 返回编辑餐单
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{meal.name}</h1>
          <p className="text-gray-500 mt-1">{meal.dishes?.length || 0} 道菜</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('shopping')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'shopping'
              ? 'bg-white text-primary-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          购物清单
        </button>
        <button
          onClick={() => setActiveTab('recipes')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'recipes'
              ? 'bg-white text-primary-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          菜谱步骤
        </button>
      </div>

      {/* Shopping Tab */}
      {activeTab === 'shopping' && shoppingList && (
        <div className="space-y-4">
          {/* View Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setShoppingView('aggregated')}
              className={`px-3 py-1 rounded-full text-sm ${
                shoppingView === 'aggregated'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              汇总清单
            </button>
            <button
              onClick={() => setShoppingView('byRecipe')}
              className={`px-3 py-1 rounded-full text-sm ${
                shoppingView === 'byRecipe'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              按菜品
            </button>
          </div>

          {/* Aggregated View */}
          {shoppingView === 'aggregated' && (
            <div className="card p-4">
              <h2 className="font-semibold text-gray-900 mb-4">所需食材</h2>
              <div className="space-y-2">
                {shoppingList.aggregated.map((item) => (
                  <div
                    key={item.ingredientId}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <input type="checkbox" className="w-4 h-4 rounded text-primary-500" />
                      <span className="text-gray-900">{item.ingredientName}</span>
                      {item.category && (
                        <span className="text-xs text-gray-400">{item.category}</span>
                      )}
                    </div>
                    <div className="text-gray-500 text-sm">
                      {item.hasVariedUnits ? (
                        <span className="text-amber-600">多种单位</span>
                      ) : item.totalCount !== null ? (
                        `${item.totalCount} ${item.totalUnitName || ''}`
                      ) : (
                        '适量'
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* By Recipe View */}
          {shoppingView === 'byRecipe' && (
            <div className="space-y-4">
              {shoppingList.byRecipe.map((recipe) => (
                <div key={recipe.recipeId} className="card p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">{recipe.recipeName}</h3>
                  <div className="space-y-2">
                    {recipe.ingredients.map((ing) => (
                      <div
                        key={ing.ingredientId}
                        className="flex items-center justify-between py-1"
                      >
                        <div className="flex items-center gap-3">
                          <input type="checkbox" className="w-4 h-4 rounded text-primary-500" />
                          <span className="text-gray-700">{ing.ingredientName}</span>
                        </div>
                        <span className="text-gray-500 text-sm">
                          {ing.count !== null ? `${ing.count} ${ing.unitNameZh || ''}` : '适量'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recipes Tab */}
      {activeTab === 'recipes' && meal.dishes && (
        <div className="flex gap-6">
          {/* Quick Navigation */}
          <div className="hidden lg:block w-48 shrink-0">
            <div className="sticky top-24 card p-4">
              <h3 className="font-semibold text-gray-900 mb-3">快速导航</h3>
              <div className="space-y-2">
                {meal.dishes.map((dish, index) => (
                  <button
                    key={dish.id}
                    onClick={() => scrollToRecipe(dish.recipeId)}
                    className="w-full text-left text-sm text-gray-600 hover:text-primary-600 py-1 truncate"
                  >
                    {index + 1}. {dish.recipe.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Recipe List */}
          <div className="flex-1 space-y-6">
            {meal.dishes.map((dish, index) => {
              const recipe = fullRecipes[dish.recipeId];
              return (
                <div
                  key={dish.id}
                  ref={(el) => { recipeRefs.current[dish.recipeId] = el; }}
                  className="card p-6"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="text-sm text-primary-600 font-medium">
                        第 {index + 1} 道菜
                      </span>
                      <h2 className="text-xl font-bold text-gray-900">{dish.recipe.name}</h2>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveDish(index, 'up')}
                        disabled={index === 0}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => moveDish(index, 'down')}
                        disabled={index === meal.dishes!.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Ingredients */}
                  {recipe && (
                    <>
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">食材</h3>
                        <div className="flex flex-wrap gap-2">
                          {recipe.ingredients?.map((ing) => (
                            <span
                              key={ing.id}
                              className="bg-gray-100 px-2 py-1 rounded text-sm text-gray-700"
                            >
                              {ing.ingredient.name}
                              {ing.count !== null && ` ${ing.count}${ing.unit?.nameZh || ''}`}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Steps */}
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">步骤</h3>
                        <ol className="space-y-3">
                          {recipe.steps?.map((step, stepIndex) => (
                            <li key={stepIndex} className="space-y-2">
                              <div className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-medium">
                                  {stepIndex + 1}
                                </span>
                                <p className="text-gray-700 pt-0.5">{step.text}</p>
                              </div>
                              {step.imageUrl && (
                                <div className="ml-9">
                                  <img
                                    src={step.imageUrl}
                                    alt={`步骤 ${stepIndex + 1}`}
                                    className="max-w-xs aspect-[4/3] object-cover rounded-lg"
                                  />
                                </div>
                              )}
                            </li>
                          ))}
                        </ol>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
