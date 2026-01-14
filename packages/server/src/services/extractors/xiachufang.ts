import type { ExtractedRecipe, RecipeExtractor } from './types.js';

// Xiachufang mobile site embeds recipe data in window.__NUXT__
// The data uses a minified function pattern with parameters
export const extractXiachufang: RecipeExtractor = async (html: string) => {
  try {
    // Try Schema.org JSON-LD first (more reliable)
    const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        if (jsonLd['@type'] === 'Recipe') {
          return extractFromSchemaOrg(jsonLd);
        }
      } catch {
        // Continue to __NUXT__ extraction
      }
    }

    // Try __NUXT__ data extraction
    const nuxtMatch = html.match(/window\.__NUXT__\s*=\s*\(function\([^)]*\)\s*\{return\s*(\{[\s\S]*?\})\}\([^)]*\)\)/);
    if (!nuxtMatch) {
      // Try alternative patterns
      const altMatch = html.match(/window\.__NUXT__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/);
      if (!altMatch) return null;
    }

    // The __NUXT__ format is complex and minified, so we'll use regex to extract key data
    // Extract recipe name
    const nameMatch = html.match(/"name"\s*:\s*"([^"]+)"/);

    // Extract ingredients - look for ings array
    const ingsMatch = html.match(/"ings"\s*:\s*\[([\s\S]*?)\]/);
    const ingredients: Array<{ name: string; amount?: string }> = [];
    if (ingsMatch) {
      const ingPattern = /"name"\s*:\s*"([^"]+)"[^}]*?"unit"\s*:\s*"([^"]*)"/g;
      let ingMatch;
      while ((ingMatch = ingPattern.exec(ingsMatch[1])) !== null) {
        ingredients.push({
          name: ingMatch[1],
          amount: ingMatch[2] || undefined
        });
      }
    }

    // Extract instructions with images
    const instructionMatch = html.match(/"instruction"\s*:\s*\[([\s\S]*?)\](?=\s*,\s*"[a-z])/i);
    const steps: Array<{ text: string; imageUrl?: string }> = [];

    if (instructionMatch) {
      // Match each instruction object
      const stepPattern = /\{[^{}]*"text"\s*:\s*"([^"]*)"[^{}]*(?:"image"\s*:\s*\{[^{}]*"ident"\s*:\s*"([^"]*)"[^{}]*\})?[^{}]*\}/g;
      let stepMatch;
      while ((stepMatch = stepPattern.exec(instructionMatch[1])) !== null) {
        const text = stepMatch[1];
        const imageIdent = stepMatch[2];
        if (text) {
          steps.push({
            text: text.replace(/\\n/g, '\n').replace(/；/g, ''),
            imageUrl: imageIdent
              ? `https://i2.chuimg.com/${imageIdent}`
              : undefined
          });
        }
      }
    }

    // If we couldn't extract steps via regex, try a different approach
    if (steps.length === 0) {
      // Look for step text directly
      const stepTexts = html.match(/"text"\s*:\s*"([^"]{5,})"/g);
      const stepImages = html.match(/"ident"\s*:\s*"([^"]+_\d+w_\d+h\.[a-z]+)"/g);

      if (stepTexts) {
        stepTexts.forEach((match, index) => {
          const textMatch = match.match(/"text"\s*:\s*"([^"]+)"/);
          if (textMatch && textMatch[1].length > 5) {
            let imageUrl: string | undefined;
            if (stepImages && stepImages[index]) {
              const imgMatch = stepImages[index].match(/"ident"\s*:\s*"([^"]+)"/);
              if (imgMatch) {
                imageUrl = `https://i2.chuimg.com/${imgMatch[1]}`;
              }
            }
            steps.push({
              text: textMatch[1].replace(/\\n/g, '\n').replace(/；/g, ''),
              imageUrl
            });
          }
        });
      }
    }

    if (steps.length === 0) return null;

    return {
      name: nameMatch?.[1],
      ingredients,
      steps
    };
  } catch {
    return null;
  }
};

// Helper to extract from Schema.org JSON-LD
function extractFromSchemaOrg(jsonLd: {
  name?: string;
  recipeIngredient?: string[];
  recipeInstructions?: Array<{ text?: string; image?: string | { url?: string } }> | string;
}): ExtractedRecipe {
  const ingredients = (jsonLd.recipeIngredient || []).map(ing => ({
    name: ing
  }));

  let steps: Array<{ text: string; imageUrl?: string }> = [];

  if (typeof jsonLd.recipeInstructions === 'string') {
    // Single string of instructions
    steps = jsonLd.recipeInstructions.split(/\n|。/).filter(s => s.trim()).map(text => ({ text: text.trim() }));
  } else if (Array.isArray(jsonLd.recipeInstructions)) {
    steps = jsonLd.recipeInstructions.map(instruction => {
      if (typeof instruction === 'string') {
        return { text: instruction };
      }
      return {
        text: instruction.text || '',
        imageUrl: typeof instruction.image === 'string'
          ? instruction.image
          : instruction.image?.url
      };
    }).filter(s => s.text);
  }

  return {
    name: jsonLd.name,
    ingredients,
    steps
  };
}
