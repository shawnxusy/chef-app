// Ingredient categories - must match seed data
export const INGREDIENT_CATEGORIES = [
  '蔬菜',
  '肉类',
  '海鲜',
  '调料',
  '蛋奶',
  '豆制品',
  '主食',
  '坚果',
  '干果',
  '水果',
  '其他',
] as const;

export type IngredientCategory = typeof INGREDIENT_CATEGORIES[number];
