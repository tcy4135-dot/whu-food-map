require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

const AMAP_KEY = process.env.AMAP_KEY;
if (!AMAP_KEY) {
  console.error('❌ 请在 .env 文件中设置 AMAP_KEY');
  process.exit(1);
}

const TYPES = '050000'; // 餐饮服务

// 校内食堂搜索区域
const CANTEENS = [
  { name: '枫园食堂', location: '114.371,30.537', radius: 200 },
  { name: '梅园食堂', location: '114.366,30.535', radius: 200 },
  { name: '湖滨食堂', location: '114.362,30.539', radius: 200 },
  { name: '桂园食堂', location: '114.358,30.537', radius: 200 },
  { name: '工学部食堂', location: '114.360,30.541', radius: 200 },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(location, radius, page, offset) {
  const response = await axios.get('https://restapi.amap.com/v5/place/around', {
    params: { location, radius, types: TYPES, key: AMAP_KEY, offset, page },
  });
  return response.data;
}

async function fetchCanteen(canteen) {
  const OFFSET = 25;
  const allPois = [];
  console.log(`  🔍 搜索「${canteen.name}」...`);

  const page1 = await fetchPage(canteen.location, canteen.radius, 1, OFFSET);
  if (page1.status !== '1') {
    console.log(`     ⚠️ 请求失败：${page1.info}`);
    return allPois;
  }

  const total = parseInt(page1.count, 10);
  allPois.push(...(page1.pois || []));

  const totalPages = Math.min(Math.ceil(total / OFFSET), 3);
  for (let p = 2; p <= totalPages; p++) {
    await sleep(300);
    const pageData = await fetchPage(canteen.location, canteen.radius, p, OFFSET);
    if (pageData.status === '1' && pageData.pois) {
      allPois.push(...pageData.pois);
    }
  }

  console.log(`     📊 返回 ${allPois.length} 条 (API 总计 ${total} 条)`);
  return allPois;
}

// 菜系映射
function mapCuisine(typeStr) {
  const parts = typeStr.split('|');
  let foodType = parts[0];
  for (const p of parts) {
    if (p.startsWith('餐饮服务')) { foodType = p; break; }
  }
  if (foodType.includes('快餐厅')) return '快餐';
  if (foodType.includes('冷饮店')) return '甜品饮品';
  if (foodType.includes('咖啡厅')) return '甜品饮品';
  if (foodType.includes('糕饼店')) return '甜品饮品';
  if (foodType.includes('茶艺馆')) return '甜品饮品';
  if (foodType.includes('韩国料理')) return '韩料';
  if (foodType.includes('外国餐厅')) return '其他';
  if (foodType.includes('中餐厅') || foodType.includes('特色')) return '中餐';
  if (foodType.includes('餐饮相关')) return '小吃';
  return '其他';
}

// 去重 key
function dedupKey(poi) {
  const name = (poi.name || '').trim().slice(0, 8);
  const addr = (poi.address || '').trim().slice(0, 12);
  return `${name}||${addr}`;
}

async function main() {
  console.log('🔄 搜索武大校内五大食堂周边美食...\n');

  // 1. 搜索所有食堂
  const allNewPois = [];
  for (const canteen of CANTEENS) {
    const pois = await fetchCanteen(canteen);
    allNewPois.push(...pois);
    if (CANTEENS.indexOf(canteen) < CANTEENS.length - 1) {
      await sleep(500);
    }
  }

  console.log(`\n📊 搜索合并：${allNewPois.length} 条 (去重前)`);

  // 2. 新数据内部去重
  const seen = new Set();
  const newDeduped = [];
  for (const poi of allNewPois) {
    const key = dedupKey(poi);
    if (seen.has(key)) continue;
    seen.add(key);
    newDeduped.push(poi);
  }
  console.log(`  内部去重后：${newDeduped.length} 条`);

  // 3. 读取现有 restaurants.ts，提取已有店铺名和坐标
  const existingContent = fs.readFileSync('src/data/restaurants.ts', 'utf-8');
  const existingNames = new Set();
  const existingCoords = new Set();

  // 提取现有的 name 和 latLng
  const nameRegex = /name: '([^']+)'/g;
  const coordRegex = /latLng: \[([\d.]+), ([\d.]+)\]/g;
  let m;
  while ((m = nameRegex.exec(existingContent)) !== null) {
    existingNames.add(m[1].trim());
  }
  while ((m = coordRegex.exec(existingContent)) !== null) {
    existingCoords.add(`${parseFloat(m[1]).toFixed(4)},${parseFloat(m[2]).toFixed(4)}`);
  }

  console.log(`  现有店铺：${existingNames.size} 家`);

  // 4. 找出真正新增的店铺
  const trulyNew = [];
  for (const poi of newDeduped) {
    const name = (poi.name || '').trim();
    const [lng, lat] = (poi.location || '0,0').split(',').map(Number);
    const coordKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;

    // 检查：名称完全相同 OR 坐标几乎一致
    const nameExists = existingNames.has(name);
    const coordExists = existingCoords.has(coordKey);

    if (!nameExists && !coordExists) {
      trulyNew.push(poi);
    }
  }

  console.log(`  真正新增：${trulyNew.length} 家\n`);

  if (trulyNew.length === 0) {
    console.log('✅ 没有新店铺，数据已是最新。');
    return;
  }

  // 5. 打印新增列表
  console.log('📋 新增店铺列表：');
  trulyNew.forEach((poi, i) => {
    const cuisine = mapCuisine(poi.type || '');
    console.log(`  ${i + 1}. ${poi.name} | ${cuisine} | ${poi.address || ''}`);
  });

  // 6. 转换为 Restaurant 格式并追加到 restaurants.ts
  const nowId = existingNames.size;
  const newRestaurants = trulyNew.map((poi, i) => {
    const [lng, lat] = (poi.location || '0,0').split(',').map(Number);
    const cuisine = mapCuisine(poi.type || '');
    return {
      id: `xiaonei-${String(nowId + i + 1).padStart(3, '0')}`,
      name: poi.name || '未知店铺',
      streetId: 'xiaonei',
      cuisine,
      signatureDish: '待补充',
      avgPrice: 0,
      description: '待补充',
      latLng: [lat, lng],
      tags: ['待补充'],
    };
  });

  // 在倒数第二行 (];) 之前插入新数据
  const insertPos = existingContent.lastIndexOf('];');
  const indent = '  ';
  const newBlock = newRestaurants.map((r) => {
    return [
      `${indent}{`,
      `${indent}  id: '${r.id}',`,
      `${indent}  name: '${r.name.replace(/'/g, "\\'")}',`,
      `${indent}  streetId: '${r.streetId}',`,
      `${indent}  cuisine: '${r.cuisine}',`,
      `${indent}  signatureDish: '${r.signatureDish}',`,
      `${indent}  avgPrice: ${r.avgPrice},`,
      `${indent}  description: '${r.description}',`,
      `${indent}  latLng: [${r.latLng[0].toFixed(6)}, ${r.latLng[1].toFixed(6)}],`,
      `${indent}  tags: ${JSON.stringify(r.tags)},`,
      `${indent}},`,
    ].join('\n');
  }).join('\n');

  const updated = existingContent.slice(0, insertPos) + newBlock + '\n' + existingContent.slice(insertPos);
  fs.writeFileSync('src/data/restaurants.ts', updated, 'utf-8');

  console.log(`\n✅ 已追加 ${trulyNew.length} 家店铺到 restaurants.ts`);
  console.log('⚠️  请手动调整 ID 编号和分组排序，完善 signatureDish/avgPrice/description/tags');
}

main().catch((err) => console.error('❌ 执行出错：', err.message));
