import Anthropic from '@anthropic-ai/sdk';
import { db } from '../db/client.js';
import type { ParsedRecipeData, ParseRecipeInput } from '@chef-app/shared';

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

    const systemPrompt = `你是一个专业的菜谱解析助手。请从提供的内容中提取菜谱的食材和步骤。

输出格式要求（JSON）：
{
  "ingredients": [
    {
      "name": "食材中文名称",
      "count": 数量（数字，如果是"适量"则为null）,
      "unit": "单位英文名称"
    }
  ],
  "steps": ["步骤1", "步骤2", ...]
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

    const messages: Anthropic.MessageParam[] = [];

    if (input.url) {
      // Fetch URL content
      try {
        const response = await fetch(input.url);
        const html = await response.text();
        // Extract text content (simple approach)
        const textContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        messages.push({
          role: 'user',
          content: `请从以下网页内容中提取菜谱信息：\n\n${textContent.slice(0, 10000)}`
        });
      } catch (error) {
        throw new Error('无法获取链接内容');
      }
    } else if (input.images && input.images.length > 0) {
      // Process images
      const imageContent: Anthropic.ImageBlockParam[] = input.images.map(base64 => ({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: base64.replace(/^data:image\/\w+;base64,/, '')
        }
      }));

      messages.push({
        role: 'user',
        content: [
          ...imageContent,
          {
            type: 'text',
            text: '请从这些图片中提取菜谱信息（食材和步骤）'
          }
        ]
      });
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages
    });

    // Parse response
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('无法解析响应');
    }

    let parsed: { ingredients: Array<{ name: string; count: number | null; unit: string | null }>; steps: string[] };
    try {
      // Extract JSON from response (might be wrapped in markdown code blocks)
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
      steps: parsed.steps
    };

    return result;
  }
}

export const llmService = new LLMService();
