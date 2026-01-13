import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { MealListItem } from '@chef-app/shared';

export function MealListPage() {
  const navigate = useNavigate();
  const [meals, setMeals] = useState<MealListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewMealModal, setShowNewMealModal] = useState(false);
  const [newMealName, setNewMealName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fetchMeals = useCallback(async () => {
    try {
      const data = await api.get<MealListItem[]>('/meals');
      setMeals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  const handleCreateMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMealName.trim()) return;

    setIsCreating(true);
    try {
      const meal = await api.post<{ id: string }>('/meals', { name: newMealName.trim() });
      navigate(`/cook/${meal.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
      setIsCreating(false);
    }
  };

  const handleDeleteMeal = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('确定要删除这个餐单吗？')) return;

    try {
      await api.delete(`/meals/${id}`);
      setMeals((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">烹饪模式</h1>
          <p className="text-gray-500 mt-1">规划你的下一顿饭</p>
        </div>
        <button onClick={() => setShowNewMealModal(true)} className="btn-primary">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新建餐单
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Meal List */}
      {meals.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <span className="text-3xl">🍽️</span>
          </div>
          <p className="text-gray-500">还没有创建餐单</p>
          <button
            onClick={() => setShowNewMealModal(true)}
            className="btn-primary mt-4"
          >
            创建第一个餐单
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {meals.map((meal) => (
            <Link
              key={meal.id}
              to={`/cook/${meal.id}`}
              className="card p-4 flex items-center justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <h3 className="font-medium text-gray-900">{meal.name}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {meal.dishCount} 道菜 · 更新于 {new Date(meal.updatedAt).toLocaleDateString('zh-CN')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/cook/${meal.id}/prepare`}
                  className="btn-secondary text-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  准备
                </Link>
                <button
                  onClick={(e) => handleDeleteMeal(meal.id, e)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* New Meal Modal */}
      {showNewMealModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">新建餐单</h3>
            <form onSubmit={handleCreateMeal}>
              <input
                type="text"
                value={newMealName}
                onChange={(e) => setNewMealName(e.target.value)}
                placeholder="例如：新年宴席"
                className="input mb-4"
                autoFocus
              />
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewMealModal(false);
                    setNewMealName('');
                  }}
                  className="btn-secondary"
                  disabled={isCreating}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isCreating || !newMealName.trim()}
                >
                  {isCreating ? <LoadingSpinner size="sm" /> : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
