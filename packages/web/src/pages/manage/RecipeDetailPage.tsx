import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '@/api/client';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { Recipe } from '@chef-app/shared';

export function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    async function fetchRecipe() {
      try {
        const data = await api.get<Recipe>(`/recipes/${id}`);
        setRecipe(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setIsLoading(false);
      }
    }
    fetchRecipe();
  }, [id]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/recipes/${id}`);
      navigate('/manage');
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error || '菜谱不存在'}</p>
        <Link to="/manage" className="btn-secondary mt-4">
          返回列表
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link to="/manage" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
            ← 返回列表
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{recipe.name}</h1>
          {recipe.alternativeName && (
            <p className="text-gray-500">{recipe.alternativeName}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link to={`/manage/${id}/edit`} className="btn-secondary">
            编辑
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-danger"
          >
            删除
          </button>
        </div>
      </div>

      {/* Images */}
      {recipe.images && recipe.images.length > 0 && (
        <div className="card p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {recipe.images.map((image) => (
              <img
                key={image.id}
                src={image.filePath}
                alt={recipe.name}
                className="w-full aspect-[4/3] object-cover rounded-lg"
              />
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {recipe.cookTimeRange && (
          <span className="tag-gray">{recipe.cookTimeRange.label}</span>
        )}
        {recipe.regions?.map((region) => (
          <span key={region.id} className="tag-primary">{region.name}</span>
        ))}
        {recipe.categories?.map((category) => (
          <span key={category.id} className="tag-gray">{category.name}</span>
        ))}
        {recipe.methods?.map((method) => (
          <span key={method.id} className="tag-gray">{method.name}</span>
        ))}
      </div>

      {/* Ingredients */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">食材清单</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {recipe.ingredients?.map((ing) => (
            <div key={ing.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-gray-900">{ing.ingredient.name}</span>
              <span className="text-gray-500 text-sm">
                {ing.count !== null ? `${ing.count} ${ing.unit?.nameZh || ''}` : '适量'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Steps */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">烹饪步骤</h2>
        <ol className="space-y-4">
          {recipe.steps?.map((step, index) => (
            <li key={index} className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-medium">
                {index + 1}
              </span>
              <p className="text-gray-700 pt-1">{step}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
            <p className="text-gray-500 mb-4">
              确定要删除「{recipe.name}」吗？此操作无法撤销。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-secondary"
                disabled={isDeleting}
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="btn-danger"
                disabled={isDeleting}
              >
                {isDeleting ? <LoadingSpinner size="sm" /> : '删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
