import Anthropic from '@anthropic-ai/sdk';
import * as cheerio from 'cheerio';
import { db } from '../db/client.js';
import type { ParsedRecipeData } from '@chef-app/shared';
import { INGREDIENT_CATEGORIES } from '@chef-app/shared';
import { getExtractor, extractSchemaRecipe, type ExtractedRecipe } from './extractors/index.js';

interface ParseRecipeInput {
  url?: string;
  images?: string[];
}

class LLMService {
  private client: Anthropic | null = null;

  private getClient(): Anthropic {
    if (!this.client) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY not configured');
      }
      this.client = new Anthropic({ apiKey });
    }
    return this.client;
  }

  async parseRecipe(input: ParseRecipeInput): Promise<ParsedRecipeData> {
    let result: ParsedRecipeData;

    if (input.url) {
      result = await this.parseFromUrl(input.url);
    } else if (input.images && input.images.length > 0) {
      result = await this.parseFromImages(input.images);
    } else {
      throw new Error('请提供链接或图片');
    }

    // Auto-create missing ingredients
    return await this.autoCreateMissingIngredients(result);
  }

  private async autoCreateMissingIngredients(result: ParsedRecipeData): Promise<ParsedRecipeData> {
    // Find ingredients that weren't matched
    const missingIngredients = result.ingredients
      .filter(ing => !ing.matchedIngredientId)
      .map(ing => ing.name);

    if (missingIngredients.length === 0) {
      return result;
    }

    // Call LLM to categorize missing ingredients
    const categorizedIngredients = await this.categorizeIngredients(missingIngredients);

    // Insert new ingredients into DB
    const newlyCreated: Array<{ name: string; category: string }> = [];

    for (const ing of categorizedIngredients) {
      try {
        const insertResult = await db.query<{ id: string }>(
          'INSERT INTO ingredients (name, category) VALUES ($1, $2) RETURNING id',
          [ing.name, ing.category]
        );
        const newId = insertResult.rows[0].id;

        // Update the result with the new ingredient ID
        const ingInResult = result.ingredients.find(i => i.name === ing.name);
        if (ingInResult) {
          ingInResult.matchedIngredientId = newId;
        }

        newlyCreated.push({ name: ing.name, category: ing.category });
      } catch (err) {
        // Ignore duplicates (might be created concurrently)
        console.warn(`Failed to create ingredient ${ing.name}:`, err);
      }
    }

    // Add newly created ingredients to result
    if (newlyCreated.length > 0) {
      result.newlyCreatedIngredients = newlyCreated;
    }

    return result;
  }

  private async categorizeIngredients(
    ingredientNames: string[]
  ): Promise<Array<{ name: string; category: string }>> {
    const client = this.getClient();

    const categoryList = INGREDIENT_CATEGORIES.join(', ');

    const prompt = `请为以下食材分配合适的分类。

食材列表:
${ingredientNames.map((name, i) => `${i + 1}. ${name}`).join('\n')}

可用的分类: ${categoryList}

输出JSON格式:
{
  "ingredients": [
    {"name": "食材名称", "category": "分类"}
  ]
}

规则:
1. 每个食材必须分配到最合适的一个分类
2. 分类必须从可用分类中选择
3. 如果不确定，使用"其他"
4. 只输出JSON`;

    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }]
      });

      const textContent = response.content.find(c => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        // Fallback: use "其他" for all
        return ingredientNames.map(name => ({ name, category: '其他' }));
      }

      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return ingredientNames.map(name => ({ name, category: '其他' }));
      }

      const parsed = JSON.parse(jsonMatch[0]) as {
        ingredients: Array<{ name: string; category: string }>;
      };

      // Validate categories and fallback to "其他" if invalid
      return parsed.ingredients.map(ing => ({
        name: ing.name,
        category: (INGREDIENT_CATEGORIES as readonly string[]).includes(ing.category)
          ? ing.category
          : '其他'
      }));
    } catch (err) {
      console.error('Failed to categorize ingredients:', err);
      // Fallback: use "其他" for all
      return ingredientNames.map(name => ({ name, category: '其他' }));
    }
  }

  private async parseFromUrl(url: string): Promise<ParsedRecipeData> {
    let html: string;
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ChefApp/1.0)'
        }
      });
      html = await response.text();
    } catch {
      throw new Error('无法获取链接内容');
    }

    const hostname = new URL(url).hostname;

    // Layer 1: Site-specific extractor
    const siteExtractor = getExtractor(hostname);
    if (siteExtractor) {
      const result = await siteExtractor(html);
      if (result && result.steps.length > 0) {
        return this.processExtractedRecipe(result);
      }
    }

    // Layer 2: Schema.org extraction (JSON-LD, microdata)
    const schemaResult = extractSchemaRecipe(html);
    if (schemaResult && schemaResult.steps.length > 0) {
      return this.processExtractedRecipe(schemaResult);
    }

    // Layer 3: Cheerio content extraction + LLM parsing
    const $ = cheerio.load(html);
    // Remove non-content elements
    $('script, style, nav, footer, header, aside, .nav, .footer, .header, .sidebar, .ad, .advertisement').remove();

    // Try to find main content
    const mainContent = $('article, main, .recipe, .recipe-content, [class*="recipe"]').first();
    const textContent = mainContent.length > 0
      ? mainContent.text()
      : $('body').text();

    // Clean up whitespace
    const cleanText = textContent.replace(/\s+/g, ' ').trim();

    // Layer 4: LLM parsing with increased limit
    return this.parseLLM(cleanText.slice(0, 15000));
  }

  private async processExtractedRecipe(recipe: ExtractedRecipe): Promise<ParsedRecipeData> {
    // Get existing units and ingredients for matching
    const [unitsResult, ingredientsResult] = await Promise.all([
      db.query<{ id: string; name: string; name_zh: string }>(
        'SELECT id, name, name_zh FROM units'
      ),
      db.query<{ id: string; name: string }>(
        'SELECT id, name FROM ingredients'
      )
    ]);

    const units = unitsResult.rows;
    const ingredients = ingredientsResult.rows;

    // Map steps with their image URLs (no downloading, just keep the URLs)
    const steps = recipe.steps.map((step) => ({
      text: step.text,
      imageUrl: step.imageUrl
    }));

    // Parse ingredients with amount strings using LLM
    const parsedIngredients = await this.parseIngredientsList(
      recipe.ingredients.map(ing =>
        ing.amount ? `${ing.name} ${ing.amount}` : ing.name
      ),
      units,
      ingredients
    );

    return {
      name: recipe.name,
      ingredients: parsedIngredients,
      steps
    };
  }

  private async parseIngredientsList(
    ingredientStrings: string[],
    units: Array<{ id: string; name: string; name_zh: string }>,
    ingredients: Array<{ id: string; name: string }>
  ): Promise<ParsedRecipeData['ingredients']> {
    if (ingredientStrings.length === 0) return [];

    const client = this.getClient();
    const unitList = units.map(u => `${u.name} (${u.name_zh})`).join(', ');

    const prompt = `请从以下食材列表中提取食材名称、数量和单位。

食材列表:
${ingredientStrings.map((s, i) => `${i + 1}. ${s}`).join('\n')}

可用的单位: ${unitList}

输出JSON格式:
{
  "ingredients": [
    {"name": "食材名称", "count": 数量或null, "unit": "单位英文名或null"}
  ]
}

规则:
1. 食材名称必须是中文
2. 数量为数字，如果是"适量"/"少许"等则为null
3. 单位用英文，从可用单位选择
4. 只输出JSON`;

    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }]
      });

      const textContent = response.content.find(c => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        return ingredientStrings.map(name => ({
          name, count: null, unit: null
        }));
      }

      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return ingredientStrings.map(name => ({
          name, count: null, unit: null
        }));
      }

      const parsed = JSON.parse(jsonMatch[0]) as {
        ingredients: Array<{ name: string; count: number | null; unit: string | null }>;
      };

      return parsed.ingredients.map(ing => {
        const matchedIngredient = ingredients.find(
          i => i.name === ing.name || i.name.includes(ing.name) || ing.name.includes(i.name)
        );
        const matchedUnit = ing.unit
          ? units.find(u => u.name.toLowerCase() === ing.unit?.toLowerCase())
          : null;

        return {
          name: ing.name,
          count: ing.count,
          unit: ing.unit,
          matchedIngredientId: matchedIngredient?.id,
          matchedUnitId: matchedUnit?.id
        };
      });
    } catch {
      return ingredientStrings.map(name => ({
        name, count: null, unit: null
      }));
    }
  }

  private async parseLLM(textContent: string): Promise<ParsedRecipeData> {
    const client = this.getClient();

    // Get existing units and ingredients for matching
    const [unitsResult, ingredientsResult] = await Promise.all([
      db.query<{ id: string; name: string; name_zh: string }>(
        'SELECT id, name, name_zh FROM units'
      ),
      db.query<{ id: string; name: string }>(
        'SELECT id, name FROM ingredients'
      )
    ]);

    const units = unitsResult.rows;
    const ingredients = ingredientsResult.rows;

    const unitList = units.map(u => `${u.name} (${u.name_zh})`).join(', ');
    const ingredientList = ingredients.map(i => i.name).join(', ');

    const systemPrompt = `你是一个专业的菜谱解析助手。请从提供的内容中提取菜谱的名称、食材和步骤。

输出格式要求（JSON）：
{
  "name": "菜谱名称",
  "ingredients": [
    {
      "name": "食材中文名称",
      "count": 数量（数字，如果是"适量"则为null）,
      "unit": "单位英文名称"
    }
  ],
  "steps": [
    {"text": "步骤1"},
    {"text": "步骤2"}
  ]
}

可用的单位（优先使用这些）: ${unitList}

已有的食材（尽量匹配这些）: ${ingredientList}

规则：
1. 食材名称必须是中文
2. 数量必须是数字，如果原文是"适量"、"少许"等，则设为null
3. 单位必须是英文，从可用单位中选择最接近的
4. 如果找不到合适的单位，使用 "piece" 作为默认
5. 步骤要完整清晰，每一步是一个独立的操作
6. 只输出JSON，不要其他内容`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `请从以下网页内容中提取菜谱信息：\n\n${textContent}`
      }]
    });

    // Parse response
    const responseText = response.content.find(c => c.type === 'text');
    if (!responseText || responseText.type !== 'text') {
      throw new Error('无法解析响应');
    }

    let parsed: {
      name?: string;
      ingredients: Array<{ name: string; count: number | null; unit: string | null }>;
      steps: Array<{ text: string }>;
    };
    try {
      const jsonMatch = responseText.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('未找到JSON内容');
      }
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error('无法解析菜谱内容');
    }

    // Match with existing ingredients and units
    const result: ParsedRecipeData = {
      name: parsed.name,
      ingredients: parsed.ingredients.map(ing => {
        const matchedIngredient = ingredients.find(
          i => i.name === ing.name || i.name.includes(ing.name) || ing.name.includes(i.name)
        );
        const matchedUnit = ing.unit
          ? units.find(u => u.name.toLowerCase() === ing.unit?.toLowerCase())
          : null;

        return {
          name: ing.name,
          count: ing.count,
          unit: ing.unit,
          matchedIngredientId: matchedIngredient?.id,
          matchedUnitId: matchedUnit?.id
        };
      }),
      steps: parsed.steps.map(s => ({ text: s.text }))
    };

    return result;
  }

  private async parseFromImages(images: string[]): Promise<ParsedRecipeData> {
    const client = this.getClient();

    // Get existing units and ingredients for matching
    const [unitsResult, ingredientsResult] = await Promise.all([
      db.query<{ id: string; name: string; name_zh: string }>(
        'SELECT id, name, name_zh FROM units'
      ),
      db.query<{ id: string; name: string }>(
        'SELECT id, name FROM ingredients'
      )
    ]);

    const units = unitsResult.rows;
    const ingredients = ingredientsResult.rows;

    const unitList = units.map(u => `${u.name} (${u.name_zh})`).join(', ');
    const ingredientList = ingredients.map(i => i.name).join(', ');

    const systemPrompt = `你是一个专业的菜谱解析助手。请从提供的图片中提取菜谱的食材和步骤。

输出格式要求（JSON）：
{
  "ingredients": [
    {
      "name": "食材中文名称",
      "count": 数量（数字，如果是"适量"则为null）,
      "unit": "单位英文名称"
    }
  ],
  "steps": [
    {"text": "步骤1"},
    {"text": "步骤2"}
  ]
}

可用的单位（优先使用这些）: ${unitList}

已有的食材（尽量匹配这些）: ${ingredientList}

规则：
1. 食材名称必须是中文
2. 数量必须是数字，如果原文是"适量"、"少许"等，则设为null
3. 单位必须是英文，从可用单位中选择最接近的
4. 如果找不到合适的单位，使用 "piece" 作为默认
5. 步骤要完整清晰，每一步是一个独立的操作
6. 只输出JSON，不要其他内容`;

    // Process images
    const imageContent: Anthropic.ImageBlockParam[] = images.map(base64 => ({
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/jpeg',
        data: base64.replace(/^data:image\/\w+;base64,/, '')
      }
    }));

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: [
          ...imageContent,
          {
            type: 'text',
            text: '请从这些图片中提取菜谱信息（食材和步骤）'
          }
        ]
      }]
    });

    // Parse response
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('无法解析响应');
    }

    let parsed: {
      ingredients: Array<{ name: string; count: number | null; unit: string | null }>;
      steps: Array<{ text: string }>;
    };
    try {
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('未找到JSON内容');
      }
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error('无法解析菜谱内容');
    }

    // Match with existing ingredients and units
    const result: ParsedRecipeData = {
      ingredients: parsed.ingredients.map(ing => {
        const matchedIngredient = ingredients.find(
          i => i.name === ing.name || i.name.includes(ing.name) || ing.name.includes(i.name)
        );
        const matchedUnit = ing.unit
          ? units.find(u => u.name.toLowerCase() === ing.unit?.toLowerCase())
          : null;

        return {
          name: ing.name,
          count: ing.count,
          unit: ing.unit,
          matchedIngredientId: matchedIngredient?.id,
          matchedUnitId: matchedUnit?.id
        };
      }),
      steps: parsed.steps.map(s => ({ text: s.text }))
    };

    return result;
  }
}

export const llmService = new LLMService();
