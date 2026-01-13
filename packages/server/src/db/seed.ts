import { db } from './client.js';

async function seed() {
  console.log('Starting database seed...');

  await db.transaction(async (client) => {
    // Seed Units
    const units = [
      { name: 'g', nameZh: '克' },
      { name: 'kg', nameZh: '千克' },
      { name: 'ml', nameZh: '毫升' },
      { name: 'L', nameZh: '升' },
      { name: 'cup', nameZh: '杯' },
      { name: 'tbsp', nameZh: '大勺' },
      { name: 'tsp', nameZh: '小勺' },
      { name: 'bunch', nameZh: '把' },
      { name: 'piece', nameZh: '个/块' },
      { name: 'slice', nameZh: '片' },
      { name: 'clove', nameZh: '瓣' },
      { name: 'drop', nameZh: '滴' },
      { name: 'pinch', nameZh: '撮' },
      { name: 'dozen', nameZh: '打' },
      { name: 'root', nameZh: '根' },
      { name: 'head', nameZh: '头' },
      { name: 'stalk', nameZh: '棵' },
      { name: 'bowl', nameZh: '碗' },
      { name: 'handful', nameZh: '抓' },
    ];

    for (const unit of units) {
      await client.query(
        `INSERT INTO units (name, name_zh) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`,
        [unit.name, unit.nameZh]
      );
    }
    console.log(`Seeded ${units.length} units`);

    // Seed Ingredients (grouped by category)
    const ingredients = [
      // 蔬菜
      { name: '大蒜', category: '蔬菜' },
      { name: '蒜苗', category: '蔬菜' },
      { name: '生姜', category: '蔬菜' },
      { name: '葱', category: '蔬菜' },
      { name: '小葱', category: '蔬菜' },
      { name: '洋葱', category: '蔬菜' },
      { name: '土豆', category: '蔬菜' },
      { name: '番茄', category: '蔬菜' },
      { name: '黄瓜', category: '蔬菜' },
      { name: '青椒', category: '蔬菜' },
      { name: '红椒', category: '蔬菜' },
      { name: '辣椒', category: '蔬菜' },
      { name: '茄子', category: '蔬菜' },
      { name: '白菜', category: '蔬菜' },
      { name: '大白菜', category: '蔬菜' },
      { name: '小白菜', category: '蔬菜' },
      { name: '菠菜', category: '蔬菜' },
      { name: '芹菜', category: '蔬菜' },
      { name: '胡萝卜', category: '蔬菜' },
      { name: '白萝卜', category: '蔬菜' },
      { name: '西兰花', category: '蔬菜' },
      { name: '花菜', category: '蔬菜' },
      { name: '蘑菇', category: '蔬菜' },
      { name: '香菇', category: '蔬菜' },
      { name: '金针菇', category: '蔬菜' },
      { name: '平菇', category: '蔬菜' },
      { name: '杏鲍菇', category: '蔬菜' },
      { name: '木耳', category: '蔬菜' },
      { name: '银耳', category: '蔬菜' },
      { name: '豆芽', category: '蔬菜' },
      { name: '黄豆芽', category: '蔬菜' },
      { name: '绿豆芽', category: '蔬菜' },
      { name: '韭菜', category: '蔬菜' },
      { name: '莴笋', category: '蔬菜' },
      { name: '油麦菜', category: '蔬菜' },
      { name: '生菜', category: '蔬菜' },
      { name: '空心菜', category: '蔬菜' },
      { name: '豆角', category: '蔬菜' },
      { name: '四季豆', category: '蔬菜' },
      { name: '荷兰豆', category: '蔬菜' },
      { name: '玉米', category: '蔬菜' },
      { name: '南瓜', category: '蔬菜' },
      { name: '冬瓜', category: '蔬菜' },
      { name: '丝瓜', category: '蔬菜' },
      { name: '苦瓜', category: '蔬菜' },
      { name: '黄花菜', category: '蔬菜' },
      { name: '竹笋', category: '蔬菜' },
      { name: '莲藕', category: '蔬菜' },
      { name: '山药', category: '蔬菜' },
      { name: '芋头', category: '蔬菜' },
      { name: '红薯', category: '蔬菜' },
      { name: '紫薯', category: '蔬菜' },
      // 肉类
      { name: '五花肉', category: '肉类' },
      { name: '猪肉', category: '肉类' },
      { name: '猪肉末', category: '肉类' },
      { name: '猪里脊', category: '肉类' },
      { name: '猪排骨', category: '肉类' },
      { name: '猪蹄', category: '肉类' },
      { name: '猪肝', category: '肉类' },
      { name: '猪肚', category: '肉类' },
      { name: '牛肉', category: '肉类' },
      { name: '牛肉末', category: '肉类' },
      { name: '牛腩', category: '肉类' },
      { name: '牛排', category: '肉类' },
      { name: '牛腱子', category: '肉类' },
      { name: '鸡肉', category: '肉类' },
      { name: '鸡胸肉', category: '肉类' },
      { name: '鸡腿', category: '肉类' },
      { name: '鸡翅', category: '肉类' },
      { name: '鸡爪', category: '肉类' },
      { name: '鸡翅中', category: '肉类' },
      { name: '鸡翅根', category: '肉类' },
      { name: '整鸡', category: '肉类' },
      { name: '鸭肉', category: '肉类' },
      { name: '鸭腿', category: '肉类' },
      { name: '羊肉', category: '肉类' },
      { name: '羊排', category: '肉类' },
      { name: '羊腿', category: '肉类' },
      { name: '培根', category: '肉类' },
      { name: '火腿', category: '肉类' },
      { name: '香肠', category: '肉类' },
      { name: '腊肉', category: '肉类' },
      // 海鲜
      { name: '虾', category: '海鲜' },
      { name: '大虾', category: '海鲜' },
      { name: '虾仁', category: '海鲜' },
      { name: '鱼', category: '海鲜' },
      { name: '鲈鱼', category: '海鲜' },
      { name: '草鱼', category: '海鲜' },
      { name: '带鱼', category: '海鲜' },
      { name: '鳕鱼', category: '海鲜' },
      { name: '三文鱼', category: '海鲜' },
      { name: '金枪鱼', category: '海鲜' },
      { name: '蛤蜊', category: '海鲜' },
      { name: '螃蟹', category: '海鲜' },
      { name: '鱿鱼', category: '海鲜' },
      { name: '章鱼', category: '海鲜' },
      { name: '墨鱼', category: '海鲜' },
      { name: '贝类', category: '海鲜' },
      { name: '扇贝', category: '海鲜' },
      { name: '牡蛎', category: '海鲜' },
      { name: '海参', category: '海鲜' },
      { name: '海带', category: '海鲜' },
      { name: '紫菜', category: '海鲜' },
      // 调料
      { name: '盐', category: '调料' },
      { name: '酱油', category: '调料' },
      { name: '生抽', category: '调料' },
      { name: '老抽', category: '调料' },
      { name: '醋', category: '调料' },
      { name: '陈醋', category: '调料' },
      { name: '米醋', category: '调料' },
      { name: '料酒', category: '调料' },
      { name: '蚝油', category: '调料' },
      { name: '豆瓣酱', category: '调料' },
      { name: '甜面酱', category: '调料' },
      { name: '番茄酱', category: '调料' },
      { name: '辣椒酱', category: '调料' },
      { name: '白糖', category: '调料' },
      { name: '冰糖', category: '调料' },
      { name: '红糖', category: '调料' },
      { name: '蜂蜜', category: '调料' },
      { name: '味精', category: '调料' },
      { name: '鸡精', category: '调料' },
      { name: '花椒', category: '调料' },
      { name: '花椒粉', category: '调料' },
      { name: '八角', category: '调料' },
      { name: '桂皮', category: '调料' },
      { name: '香叶', category: '调料' },
      { name: '干辣椒', category: '调料' },
      { name: '辣椒粉', category: '调料' },
      { name: '辣椒面', category: '调料' },
      { name: '小米辣', category: '调料' },
      { name: '朝天椒', category: '调料' },
      { name: '胡椒', category: '调料' },
      { name: '白胡椒', category: '调料' },
      { name: '黑胡椒', category: '调料' },
      { name: '五香粉', category: '调料' },
      { name: '十三香', category: '调料' },
      { name: '孜然', category: '调料' },
      { name: '咖喱粉', category: '调料' },
      { name: '芝麻', category: '调料' },
      { name: '白芝麻', category: '调料' },
      { name: '黑芝麻', category: '调料' },
      { name: '芝麻酱', category: '调料' },
      { name: '芝麻油', category: '调料' },
      { name: '香油', category: '调料' },
      { name: '辣椒油', category: '调料' },
      { name: '花生油', category: '调料' },
      { name: '菜籽油', category: '调料' },
      { name: '橄榄油', category: '调料' },
      { name: '葱油', category: '调料' },
      { name: '豆豉', category: '调料' },
      { name: '腐乳', category: '调料' },
      { name: '酒酿', category: '调料' },
      { name: '味噌', category: '调料' },
      { name: '鱼露', category: '调料' },
      { name: '柠檬汁', category: '调料' },
      { name: '香菜', category: '调料' },
      { name: '薄荷', category: '调料' },
      { name: '罗勒', category: '调料' },
      { name: '迷迭香', category: '调料' },
      { name: '百里香', category: '调料' },
      { name: '月桂叶', category: '调料' },
      { name: '咖喱块', category: '调料' },
      // 其他
      { name: '鸡蛋', category: '蛋奶' },
      { name: '鸭蛋', category: '蛋奶' },
      { name: '皮蛋', category: '蛋奶' },
      { name: '咸蛋', category: '蛋奶' },
      { name: '牛奶', category: '蛋奶' },
      { name: '奶油', category: '蛋奶' },
      { name: '黄油', category: '蛋奶' },
      { name: '奶酪', category: '蛋奶' },
      { name: '淡奶油', category: '蛋奶' },
      { name: '豆腐', category: '豆制品' },
      { name: '嫩豆腐', category: '豆制品' },
      { name: '老豆腐', category: '豆制品' },
      { name: '豆腐皮', category: '豆制品' },
      { name: '豆腐干', category: '豆制品' },
      { name: '腐竹', category: '豆制品' },
      { name: '豆浆', category: '豆制品' },
      { name: '面粉', category: '主食' },
      { name: '高筋面粉', category: '主食' },
      { name: '低筋面粉', category: '主食' },
      { name: '淀粉', category: '主食' },
      { name: '玉米淀粉', category: '主食' },
      { name: '红薯淀粉', category: '主食' },
      { name: '米饭', category: '主食' },
      { name: '大米', category: '主食' },
      { name: '糯米', category: '主食' },
      { name: '小米', category: '主食' },
      { name: '面条', category: '主食' },
      { name: '挂面', category: '主食' },
      { name: '米粉', category: '主食' },
      { name: '河粉', category: '主食' },
      { name: '粉丝', category: '主食' },
      { name: '年糕', category: '主食' },
      { name: '馒头', category: '主食' },
      { name: '面包', category: '主食' },
      { name: '吐司', category: '主食' },
      { name: '饺子皮', category: '主食' },
      { name: '馄饨皮', category: '主食' },
      // 坚果干果
      { name: '花生', category: '坚果' },
      { name: '核桃', category: '坚果' },
      { name: '杏仁', category: '坚果' },
      { name: '腰果', category: '坚果' },
      { name: '松子', category: '坚果' },
      { name: '瓜子', category: '坚果' },
      { name: '栗子', category: '坚果' },
      { name: '红枣', category: '干果' },
      { name: '枸杞', category: '干果' },
      { name: '葡萄干', category: '干果' },
      { name: '桂圆', category: '干果' },
      // 水果
      { name: '苹果', category: '水果' },
      { name: '梨', category: '水果' },
      { name: '橙子', category: '水果' },
      { name: '柠檬', category: '水果' },
      { name: '香蕉', category: '水果' },
      { name: '芒果', category: '水果' },
      { name: '菠萝', category: '水果' },
      { name: '草莓', category: '水果' },
      { name: '蓝莓', category: '水果' },
      // 其他常用
      { name: '高汤', category: '其他' },
      { name: '清水', category: '其他' },
      { name: '冰块', category: '其他' },
      { name: '泡打粉', category: '其他' },
      { name: '酵母', category: '其他' },
      { name: '吉利丁', category: '其他' },
      { name: '可可粉', category: '其他' },
      { name: '抹茶粉', category: '其他' },
    ];

    for (const ingredient of ingredients) {
      await client.query(
        `INSERT INTO ingredients (name, category) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`,
        [ingredient.name, ingredient.category]
      );
    }
    console.log(`Seeded ${ingredients.length} ingredients`);

    // Seed Cuisine Regions
    const regions = [
      '川菜', '湘菜', '粤菜', '东北菜', '云南菜', '浙菜', '西北菜',
      '日料', '韩料', '东南亚菜', '法式', '西班牙菜', '美式', '融合', '其他'
    ];
    for (const name of regions) {
      await client.query(
        `INSERT INTO cuisine_regions (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [name]
      );
    }
    console.log(`Seeded ${regions.length} cuisine regions`);

    // Seed Cuisine Categories
    const categories = [
      '凉菜', '正餐', '甜点', '早餐', '减脂餐', '快手菜', '辅食', '炫技菜'
    ];
    for (const name of categories) {
      await client.query(
        `INSERT INTO cuisine_categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [name]
      );
    }
    console.log(`Seeded ${categories.length} cuisine categories`);

    // Seed Cooking Methods
    const methods = [
      '炒', '蒸', '煲汤', '烤箱', '空气炸锅', '炸'
    ];
    for (const name of methods) {
      await client.query(
        `INSERT INTO cooking_methods (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [name]
      );
    }
    console.log(`Seeded ${methods.length} cooking methods`);

    // Seed Cook Time Ranges
    const timeRanges = [
      { label: '<15分钟', minMinutes: 0, maxMinutes: 15 },
      { label: '15-30分钟', minMinutes: 15, maxMinutes: 30 },
      { label: '30-60分钟', minMinutes: 30, maxMinutes: 60 },
      { label: '>60分钟', minMinutes: 60, maxMinutes: null },
    ];
    for (const range of timeRanges) {
      await client.query(
        `INSERT INTO cook_time_ranges (label, min_minutes, max_minutes)
         SELECT $1, $2, $3
         WHERE NOT EXISTS (SELECT 1 FROM cook_time_ranges WHERE label = $1)`,
        [range.label, range.minMinutes, range.maxMinutes]
      );
    }
    console.log(`Seeded ${timeRanges.length} cook time ranges`);
  });

  console.log('Seed complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
