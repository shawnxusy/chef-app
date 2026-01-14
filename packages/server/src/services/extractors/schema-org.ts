import * as cheerio from 'cheerio';
import type { ExtractedRecipe } from './types.js';

// Schema.org Recipe types
interface SchemaRecipe {
  '@type': string;
  name?: string;
  recipeIngredient?: string[];
  recipeInstructions?: Array<string | { text?: string; image?: string | { url?: string } }>;
}

interface SchemaGraph {
  '@graph'?: SchemaRecipe[];
}

// Extract Recipe data from JSON-LD or microdata
export function extractSchemaRecipe(html: string): ExtractedRecipe | null {
  const $ = cheerio.load(html);

  // Try JSON-LD first
  const jsonLdScripts = $('script[type="application/ld+json"]').toArray();

  for (const script of jsonLdScripts) {
    try {
      const content = $(script).html();
      if (!content) continue;

      const parsed = JSON.parse(content) as SchemaRecipe | SchemaGraph | SchemaRecipe[];

      // Handle different JSON-LD structures
      let recipe: SchemaRecipe | undefined;

      if (Array.isArray(parsed)) {
        // Array of items
        recipe = parsed.find(item => item['@type'] === 'Recipe');
      } else if ('@type' in parsed && parsed['@type'] === 'Recipe') {
        // Direct Recipe object
        recipe = parsed as SchemaRecipe;
      } else if ('@graph' in parsed && parsed['@graph']) {
        // Graph with multiple items
        recipe = parsed['@graph'].find(
          item => item['@type'] === 'Recipe'
        );
      }

      if (recipe) {
        return convertSchemaRecipe(recipe);
      }
    } catch {
      // Continue to next script
    }
  }

  // Try microdata as fallback (itemprop="recipeInstructions")
  const microdataRecipe = $('[itemtype*="schema.org/Recipe"]');
  if (microdataRecipe.length > 0) {
    const name = microdataRecipe.find('[itemprop="name"]').first().text().trim();
    const ingredients = microdataRecipe
      .find('[itemprop="recipeIngredient"]')
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean);

    const instructions = microdataRecipe
      .find('[itemprop="recipeInstructions"]')
      .map((_, el) => {
        const text = $(el).text().trim();
        const img = $(el).find('img').first().attr('src');
        return { text, imageUrl: img };
      })
      .get()
      .filter(item => item.text);

    if (instructions.length > 0) {
      return {
        name: name || undefined,
        ingredients: ingredients.map(name => ({ name })),
        steps: instructions
      };
    }
  }

  return null;
}

function convertSchemaRecipe(recipe: SchemaRecipe): ExtractedRecipe {
  const ingredients = (recipe.recipeIngredient || []).map(ing => ({
    name: ing
  }));

  const steps = (recipe.recipeInstructions || []).map(instruction => {
    if (typeof instruction === 'string') {
      return { text: instruction };
    }
    return {
      text: instruction.text || '',
      imageUrl: typeof instruction.image === 'string'
        ? instruction.image
        : instruction.image?.url
    };
  }).filter(step => step.text);

  return {
    name: recipe.name,
    ingredients,
    steps
  };
}
