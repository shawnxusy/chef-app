import { useMemo } from 'react';
import type { RecipeIngredientInput, Ingredient, Unit } from '@chef-app/shared';
import { SearchableSelect } from './SearchableSelect';

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
  // Convert ingredients to searchable options with grouping
  const ingredientOptions = useMemo(() => {
    return availableIngredients.map((ing) => ({
      id: ing.id,
      label: ing.name,
      group: ing.category || '其他',
    }));
  }, [availableIngredients]);

  // Convert units to searchable options
  const unitOptions = useMemo(() => {
    return [
      { id: '', label: '适量' },
      ...availableUnits.map((unit) => ({
        id: unit.id,
        label: `${unit.nameZh} (${unit.name})`,
      })),
    ];
  }, [availableUnits]);

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

  return (
    <div className="space-y-3">
      {ingredients.map((ing, index) => (
        <div key={index} className="flex gap-2 items-start">
          {/* Ingredient - Searchable with autocomplete */}
          <div className="flex-1 min-w-0">
            <SearchableSelect
              options={ingredientOptions}
              value={ing.ingredientId}
              onChange={(value) => updateIngredient(index, { ingredientId: value })}
              placeholder="输入搜索食材..."
              groupBy
            />
          </div>

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
            className="input w-20"
            step="0.1"
          />

          {/* Unit */}
          <SearchableSelect
            options={unitOptions}
            value={ing.unitId || ''}
            onChange={(value) => updateIngredient(index, { unitId: value || null })}
            placeholder="单位"
            className="w-32"
          />

          {/* Remove */}
          <button
            type="button"
            onClick={() => removeIngredient(index)}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
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
        className="flex items-center text-primary-600 hover:text-primary-700 text-sm font-medium"
      >
        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        添加食材
      </button>
    </div>
  );
}
