import * as cheerio from 'cheerio';
import type { RecipeExtractor } from './types.js';

// Xiachufang mobile site - parse rendered HTML directly
export const extractXiachufang: RecipeExtractor = async (html: string) => {
  try {
    const $ = cheerio.load(html);

    // Extract recipe name
    const name = $('.recipe-name').first().text().trim() || undefined;

    // Extract ingredients from the ingredient list
    const ingredients: Array<{ name: string; amount?: string }> = [];
    $('.recipe-ingredient .ing-line').each((_, el) => {
      const ingName = $(el).find('.ing-name').text().trim();
      const ingAmount = $(el).find('.ing-amount').text().trim();
      if (ingName) {
        ingredients.push({
          name: ingName,
          amount: ingAmount || undefined
        });
      }
    });

    // Extract steps with images
    const steps: Array<{ text: string; imageUrl?: string }> = [];
    $('.step.step').each((_, el) => {
      const text = $(el).find('.step-text').text().trim();

      // Get image from background-image style
      const bgStyle = $(el).find('.step-cover').attr('style') || '';
      const imgMatch = bgStyle.match(/url\(([^)]+)\)/);
      let imageUrl: string | undefined;

      if (imgMatch) {
        imageUrl = imgMatch[1];
      } else {
        // Try getting from img src
        const imgSrc = $(el).find('.step-cover img').attr('src');
        if (imgSrc) {
          imageUrl = imgSrc;
        }
      }

      if (text) {
        steps.push({
          text: text.replace(/；$/, '').replace(/。$/, ''), // Remove trailing punctuation
          imageUrl
        });
      }
    });

    // If no steps found via HTML, the page structure might be different
    if (steps.length === 0) {
      return null;
    }

    return {
      name,
      ingredients,
      steps
    };
  } catch {
    return null;
  }
};
