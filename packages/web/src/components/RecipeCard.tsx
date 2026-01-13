import { Link } from 'react-router-dom';
import type { RecipeListItem } from '@chef-app/shared';

interface RecipeCardProps {
  recipe: RecipeListItem;
  onClick?: () => void;
  selected?: boolean;
  showAddButton?: boolean;
  onAdd?: () => void;
}

export function RecipeCard({ recipe, onClick, selected, showAddButton, onAdd }: RecipeCardProps) {
  const content = (
    <div
      className={`card overflow-hidden transition-all ${
        selected ? 'ring-2 ring-primary-500' : ''
      } ${onClick ? 'cursor-pointer hover:shadow-md' : ''}`}
      onClick={onClick}
    >
      {/* Image */}
      <div className="aspect-[4/3] bg-gray-100 relative">
        {recipe.thumbnailUrl ? (
          <img
            src={recipe.thumbnailUrl}
            alt={recipe.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl">🍳</span>
          </div>
        )}

        {/* Time badge */}
        {recipe.cookTimeRange && (
          <span className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs text-gray-600">
            {recipe.cookTimeRange.label}
          </span>
        )}

        {/* Add button */}
        {showAddButton && onAdd && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            className="absolute bottom-2 right-2 w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center hover:bg-primary-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-medium text-gray-900 truncate">{recipe.name}</h3>
        {recipe.alternativeName && (
          <p className="text-sm text-gray-500 truncate">{recipe.alternativeName}</p>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mt-2">
          {recipe.regions?.slice(0, 2).map((region) => (
            <span key={region.id} className="tag-primary">
              {region.name}
            </span>
          ))}
          {recipe.categories?.slice(0, 2).map((category) => (
            <span key={category.id} className="tag-gray">
              {category.name}
            </span>
          ))}
        </div>

        {/* Meta */}
        <p className="text-xs text-gray-400 mt-2">
          {recipe.ingredientCount} 种食材
        </p>
      </div>
    </div>
  );

  // If onClick is provided, don't wrap in Link
  if (onClick) {
    return content;
  }

  return (
    <Link to={`/manage/${recipe.id}`}>
      {content}
    </Link>
  );
}
