import { useState } from 'react';
import type { RecipeIngredientInput, Ingredient, Unit } from '@chef-app/shared';

interface IngredientInputProps {
  ingredients: RecipeIngredientInput[];
  onChange: (ingredients: RecipeIngredientInput[]) => void;
  availableIngredients: Ingredient[];
  availableUnits: Unit[];
}

export function IngredientInput({
  ingredients,
  onChange,
  availableIngredients,
  availableUnits,
}: IngredientInputProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const addIngredient = () => {
    onChange([...ingredients, { ingredientId: '', unitId: null, count: null }]);
  };

  const updateIngredient = (index: number, updates: Partial<RecipeIngredientInput>) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = { ...newIngredients[index], ...updates };
    onChange(newIngredients);
  };

  const removeIngredient = (index: number) => {
    onChange(ingredients.filter((_, i) => i !== index));
  };

  const filteredIngredients = searchTerm
    ? availableIngredients.filter((ing) =>
        ing.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : availableIngredients;

  // Group ingredients by category
  const groupedIngredients = filteredIngredients.reduce((acc, ing) => {
    const category = ing.category || '其他';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(ing);
    return acc;
  }, {} as Record<string, Ingredient[]>);

  return (
    <div className="space-y-3">
      {ingredients.map((ing, index) => (
        <div key={index} className="flex gap-2 items-start">
          {/* Count */}
          <input
            type="number"
            value={ing.count ?? ''}
            onChange={(e) =>
              updateIngredient(index, {
                count: e.target.value ? parseFloat(e.target.value) : null,
              })
            }
            placeholder="数量"
            className="input w-24"
            step="0.1"
          />

          {/* Unit */}
          <select
            value={ing.unitId || ''}
            onChange={(e) =>
              updateIngredient(index, { unitId: e.target.value || null })
            }
            className="input w-28"
          >
            <option value="">适量</option>
            {availableUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.nameZh} ({unit.name})
              </option>
            ))}
          </select>

          {/* Ingredient */}
          <div className="flex-1 relative">
            <select
              value={ing.ingredientId}
              onChange={(e) =>
                updateIngredient(index, { ingredientId: e.target.value })
              }
              className="input w-full"
            >
              <option value="">选择食材</option>
              {Object.entries(groupedIngredients).map(([category, items]) => (
                <optgroup key={category} label={category}>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Remove */}
          <button
            type="button"
            onClick={() => removeIngredient(index)}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addIngredient}
        className="flex items-center text-primary-600 hover:text-primary-700 text-sm"
      >
        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        添加食材
      </button>

      {/* Quick search */}
      <div className="mt-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="搜索食材..."
          className="input text-sm"
        />
      </div>
    </div>
  );
}
