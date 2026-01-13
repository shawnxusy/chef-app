import type { Unit, Ingredient, CuisineRegion, CuisineCategory, CookingMethod, CookTimeRange } from './reference';

// Recipe ingredient with quantity
export interface RecipeIngredient {
  id: string;
  ingredientId: string;
  ingredient: Ingredient;
  unitId: string | null;
  unit: Unit | null;
  count: number | null;  // null = "适量" (to taste)
  sortOrder: number;
}

// Recipe image
export interface RecipeImage {
  id: string;
  filePath: string;
  sortOrder: number;
  createdAt: Date;
}

// Full recipe
export interface Recipe {
  id: string;
  name: string;
  alternativeName: string | null;
  cookTimeRangeId: string | null;
  cookTimeRange: CookTimeRange | null;
  ingredients: RecipeIngredient[];
  steps: string[];
  images: RecipeImage[];
  regions: CuisineRegion[];
  categories: CuisineCategory[];
  methods: CookingMethod[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// Recipe list item (lighter version for lists)
export interface RecipeListItem {
  id: string;
  name: string;
  alternativeName: string | null;
  cookTimeRange: CookTimeRange | null;
  regions: CuisineRegion[];
  categories: CuisineCategory[];
  methods: CookingMethod[];
  thumbnailUrl: string | null;
  ingredientCount: number;
  createdAt: Date;
}

// Input for creating/updating recipes
export interface RecipeIngredientInput {
  ingredientId: string;
  unitId: string | null;
  count: number | null;
}

export interface CreateRecipeInput {
  name: string;
  alternativeName?: string;
  cookTimeRangeId?: string;
  ingredients: RecipeIngredientInput[];
  steps: string[];
  imageIds?: string[];  // IDs of already uploaded images
  regionIds?: string[];
  categoryIds?: string[];
  methodIds?: string[];
}

export interface UpdateRecipeInput extends Partial<CreateRecipeInput> {
  id: string;
}

// Recipe filters for listing
export interface RecipeFilters {
  search?: string;           // Search by name or ingredient name
  regionIds?: string[];
  categoryIds?: string[];
  methodIds?: string[];
  cookTimeRangeId?: string;
}

// LLM parse result
export interface ParsedRecipeData {
  ingredients: Array<{
    name: string;           // Ingredient name (may be new)
    count: number | null;
    unit: string | null;    // Unit name
    matchedIngredientId?: string;  // If matched to existing
    matchedUnitId?: string;        // If matched to existing
  }>;
  steps: string[];
}
