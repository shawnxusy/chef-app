import { useState } from 'react';
import { INGREDIENT_CATEGORIES } from '@chef-app/shared';

interface CreateIngredientDialogProps {
  ingredientName: string;
  onConfirm: (category: string) => void;
  onCancel: () => void;
}

export function CreateIngredientDialog({
  ingredientName,
  onConfirm,
  onCancel,
}: CreateIngredientDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('其他');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(selectedCategory);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">创建新食材</h3>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              食材名称
            </label>
            <input
              type="text"
              value={ingredientName}
              readOnly
              className="input bg-gray-50"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择分类
            </label>
            <div className="grid grid-cols-3 gap-2">
              {INGREDIENT_CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    selectedCategory === category
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary"
            >
              取消
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              创建
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
