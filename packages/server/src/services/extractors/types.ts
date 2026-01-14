// Types for recipe extraction from websites

export interface ExtractedIngredient {
  name: string;
  amount?: string;
}

export interface ExtractedStep {
  text: string;
  imageUrl?: string;
}

export interface ExtractedRecipe {
  name?: string;
  ingredients: ExtractedIngredient[];
  steps: ExtractedStep[];
}

export type RecipeExtractor = (html: string) => Promise<ExtractedRecipe | null>;
