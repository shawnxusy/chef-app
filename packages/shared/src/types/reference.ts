// Reference data types - all stored in DB with UUIDs

export interface Unit {
  id: string;
  name: string;      // English: "g", "bunch", "tbsp"
  nameZh: string;    // Chinese: "克", "把", "大勺"
  createdAt: Date;
}

export interface Ingredient {
  id: string;
  name: string;      // Chinese: "大蒜", "五花肉"
  category: string | null;  // Optional grouping: "蔬菜", "肉类", "调料"
  createdAt: Date;
}

export interface CuisineRegion {
  id: string;
  name: string;      // "川菜", "粤菜", etc.
}

export interface CuisineCategory {
  id: string;
  name: string;      // "凉菜", "正餐", etc.
}

export interface CookingMethod {
  id: string;
  name: string;      // "炒", "蒸", etc.
}

export interface CookTimeRange {
  id: string;
  label: string;     // "<15分钟", "15-30分钟"
  minMinutes: number | null;
  maxMinutes: number | null;
}

// All reference data combined
export interface ReferenceData {
  units: Unit[];
  ingredients: Ingredient[];
  cuisineRegions: CuisineRegion[];
  cuisineCategories: CuisineCategory[];
  cookingMethods: CookingMethod[];
  cookTimeRanges: CookTimeRange[];
}

// For creating/updating reference items
export interface CreateUnitInput {
  name: string;
  nameZh: string;
}

export interface CreateIngredientInput {
  name: string;
  category?: string;
}

export interface CreateReferenceItemInput {
  name: string;
}

export type ReferenceType = 'units' | 'ingredients' | 'cuisineRegions' | 'cuisineCategories' | 'cookingMethods' | 'cookTimeRanges';
