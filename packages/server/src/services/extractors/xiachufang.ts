import type { ExtractedRecipe, RecipeExtractor } from './types.js';

// Xiachufang embeds recipe data in JavaScript: window.__INITIAL_STATE__ = {...}
export const extractXiachufang: RecipeExtractor = async (html: string) => {
  try {
    // Look for the initial state JSON
    const match = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});?\s*(?:<\/script>|window\.)/);
    if (!match) {
      // Try alternative pattern - sometimes it's embedded differently
      const altMatch = html.match(/"recipe"\s*:\s*(\{[^}]+(?:\{[^}]*\}[^}]*)*\})/);
      if (!altMatch) return null;
    }

    const jsonStr = match?.[1];
    if (!jsonStr) return null;

    // Parse the JSON - it might have some issues, so we'll be careful
    let data: {
      recipe?: {
        name?: string;
        ings?: Array<{ name?: string; unit?: string }>;
        instruction?: Array<{
          step?: number;
          text?: string;
          img?: { ident?: string };
        }>;
      };
    };

    try {
      data = JSON.parse(jsonStr);
    } catch {
      // Try cleaning up the JSON string
      const cleanedJson = jsonStr
        .replace(/undefined/g, 'null')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');
      data = JSON.parse(cleanedJson);
    }

    if (!data.recipe) return null;

    const recipe = data.recipe;

    const result: ExtractedRecipe = {
      name: recipe.name,
      ingredients: (recipe.ings || []).map(ing => ({
        name: ing.name || '',
        amount: ing.unit || undefined
      })).filter(ing => ing.name),
      steps: (recipe.instruction || [])
        .sort((a, b) => (a.step || 0) - (b.step || 0))
        .map(step => ({
          text: step.text || '',
          imageUrl: step.img?.ident
            ? `https://i2.chuimg.com/${step.img.ident}?imageView2/1/w/800/h/600/q/75`
            : undefined
        }))
        .filter(step => step.text)
    };

    return result;
  } catch {
    return null;
  }
};
