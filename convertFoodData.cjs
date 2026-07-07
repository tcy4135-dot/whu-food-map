/**
 * 将高德 rawRestaurants.json 转换为项目 restaurants.ts
 */
const fs = require('fs');

// ===== 街道中心坐标 =====
const STREET_CENTERS = [
  { id: 'guangbalu',     name: '广八路',     lng: 114.363, lat: 30.535 },
  { id: 'bayilu',        name: '八一路',     lng: 114.360, lat: 30.534 },
  { id: 'donghuxincun',  name: '东湖新村',   lng: 114.357, lat: 30.530 },
  { id: 'luoshibeilu',   name: '珞狮北路',   lng: 114.353, lat: 30.536 },
  { id: 'weilaicheng',   name: '未来城夜市', lng: 114.348, lat: 30.532 },
];

const MAX_DISTANCE = 0.005; // 约 500m（经纬度简化计算）

// ===== 菜系映射 =====
function mapCuisine(typeStr) {
  // 处理复合类型如 "商务住宅;住宅区;住宅小区|餐饮服务;中餐厅;中餐厅"
  const parts = typeStr.split('|');
  let foodType = parts[0];
  // 找到第一个 餐饮服务 部分
  for (const p of parts) {
    if (p.startsWith('餐饮服务')) {
      foodType = p;
      break;
    }
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

// ===== 坐标距离计算（简化的欧几里得距离） =====
function calcDist(lng1, lat1, lng2, lat2) {
  const dlng = lng1 - lng2;
  const dlat = lat1 - lat2;
  return Math.sqrt(dlng * dlng + dlat * dlat);
}

// ===== 分类街道 =====
function classifyStreet(lng, lat) {
  let bestId = 'xiaonei';
  let bestDist = Infinity;

  for (const st of STREET_CENTERS) {
    const d = calcDist(lng, lat, st.lng, st.lat);
    if (d < bestDist) {
      bestDist = d;
      bestId = st.id;
    }
  }

  // 超过阈值 → 校内
  if (bestDist > MAX_DISTANCE) {
    return 'xiaonei';
  }
  return bestId;
}

// ===== 主流程 =====
function main() {
  // 读取原始数据
  const raw = JSON.parse(fs.readFileSync('src/data/rawRestaurants.json', 'utf-8'));
  const pois = raw.pois;

  console.log(`📖 读取 ${pois.length} 条原始店铺数据\n`);

  // 转换
  const converted = pois.map((poi, i) => {
    const [lng, lat] = poi.location.split(',').map(Number);
    const streetId = classifyStreet(lng, lat);
    const cuisine = mapCuisine(poi.type || '');

    return {
      id: ``, // 稍后按分组重新编号
      name: poi.name || '未知店铺',
      streetId,
      cuisine,
      signatureDish: '待补充',
      avgPrice: 0,
      description: '待补充',
      latLng: [lat, lng], // Leaflet 格式：[纬度, 经度]
      tags: ['待补充'],
      // 暂存用于日志
      _addr: poi.address || '',
      _type: poi.type || '',
      _dist: calcDist(lng, lat, STREET_CENTERS[0].lng, STREET_CENTERS[0].lat).toFixed(4),
    };
  });

  // 按 streetId 分组
  const grouped = {};
  for (const item of converted) {
    if (!grouped[item.streetId]) grouped[item.streetId] = [];
    grouped[item.streetId].push(item);
  }

  // 每组内按 name 排序，重新编号
  const STREET_NAMES = {
    guangbalu: '广八路',
    bayilu: '八一路',
    donghuxincun: '东湖新村',
    luoshibeilu: '珞狮北路',
    weilaicheng: '未来城夜市',
    xiaonei: '校内',
  };

  const order = ['guangbalu', 'bayilu', 'donghuxincun', 'luoshibeilu', 'weilaicheng', 'xiaonei'];

  const allRestaurants = [];
  const stats = [];

  for (const streetId of order) {
    if (!grouped[streetId]) continue;
    const items = grouped[streetId];
    items.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
    items.forEach((item, i) => {
      item.id = `${streetId}-${String(i + 1).padStart(3, '0')}`;
      allRestaurants.push(item);
    });
    stats.push({ streetId, name: STREET_NAMES[streetId], count: items.length });
  }

  // 打印统计
  console.log('📊 分组统计：');
  for (const s of stats) {
    console.log(`  ${s.name.padEnd(12)} ${String(s.count).padStart(2)} 家`);
  }
  console.log(`  ${'合计'.padEnd(12)} ${String(allRestaurants.length).padStart(2)} 家\n`);

  // 打印每家店的分类结果
  console.log('📋 分类明细：');
  for (const item of allRestaurants) {
    const streetName = STREET_NAMES[item.streetId] || item.streetId;
    console.log(
      `  ${item.id.padEnd(16)} ${item.name.slice(0, 20).padEnd(22)} → ${streetName.padEnd(6)} │ ${item.cuisine.padEnd(6)} │ ${item._addr.slice(0, 28)}`
    );
  }

  // 生成 TypeScript 文件
  const lines = [];
  lines.push(`import type { Restaurant } from '../types';\n`);
  lines.push(`export const restaurants: Restaurant[] = [`);

  let currentStreet = '';
  for (const item of allRestaurants) {
    const streetName = STREET_NAMES[item.streetId] || item.streetId;

    // 分组注释
    if (item.streetId !== currentStreet) {
      currentStreet = item.streetId;
      const bar = '='.repeat(60);
      lines.push(`  // ${bar}`);
      lines.push(`  // ${streetName} (${grouped[currentStreet].length}家)`);
      lines.push(`  // ${bar}`);
    }

    // 清理临时字段
    const { _addr, _type, _dist, ...clean } = item;

    lines.push(`  {`);
    lines.push(`    id: '${clean.id}',`);
    lines.push(`    name: '${clean.name.replace(/'/g, "\\'")}',`);
    lines.push(`    streetId: '${clean.streetId}',`);
    lines.push(`    cuisine: '${clean.cuisine}',`);
    lines.push(`    signatureDish: '${clean.signatureDish}',`);
    lines.push(`    avgPrice: ${clean.avgPrice},`);
    lines.push(`    description: '${clean.description}',`);
    lines.push(`    latLng: [${clean.latLng[0].toFixed(6)}, ${clean.latLng[1].toFixed(6)}],`);
    lines.push(`    tags: ${JSON.stringify(clean.tags)},`);
    lines.push(`  },`);
  }

  lines.push(`];\n`);

  const output = lines.join('\n');
  fs.writeFileSync('src/data/restaurants.ts', output, 'utf-8');

  console.log(`\n✅ 已生成 src/data/restaurants.ts (${allRestaurants.length} 家店铺)`);
  console.log('⚠️  signatureDish、avgPrice、description、tags 均为占位值，请手动完善');
}

main();
