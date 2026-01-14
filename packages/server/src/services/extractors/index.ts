import { extractXiachufang } from './xiachufang.js';
import type { RecipeExtractor } from './types.js';

export * from './types.js';
export { extractSchemaRecipe } from './schema-org.js';

// Registry of domain -> extractor mappings
const EXTRACTORS: Record<string, RecipeExtractor> = {
  'xiachufang.com': extractXiachufang,
  'www.xiachufang.com': extractXiachufang,
  'm.xiachufang.com': extractXiachufang,
  // Add more extractors as needed:
  // 'meishij.net': extractMeishij,
  // 'douguo.com': extractDouguo,
};

export function getExtractor(hostname: string): RecipeExtractor | null {
  return EXTRACTORS[hostname] || null;
}
