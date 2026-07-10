require('dotenv').config();
const fs = require('fs');
const path = require('path');

// ===== 配置 =====
const ADMIN_BUILDING = { lat: 30.5370, lng: 114.3671 };
const MAX_DISTANCE_KM = 1.5;

// 街道中心坐标 (from streets.ts)
const STREET_CENTERS = [
  { id: 'guangbalu',    name: '广八路',     lat: 30.531, lng: 114.358 },
  { id: 'bayilu',       name: '八一路',     lat: 30.537, lng: 114.365 },
  { id: 'donghuxincun', name: '东湖新村',   lat: 30.546, lng: 114.370 },
  { id: 'luoshibeilu',  name: '珞狮北路',   lat: 30.539, lng: 114.351 },
  { id: 'weilaicheng',  name: '未来城夜市', lat: 30.525, lng: 114.356 },
  { id: 'xiaonei',      name: '校内',       lat: 30.537, lng: 114.368 },
];

// ===== 工具函数 =====

/** Haversine 距离计算 (km) */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** 标准化名称用于匹配 */
function normalizeName(name) {
  return name
    .trim()
    .replace(/\s+/g, '')       // 去空格
    .replace(/[（(]/g, '(')    // 统一括号
    .replace(/[）)]/g, ')')
    .replace(/[：:]/g, ':')
    .toLowerCase();
}

/** 计算两个字符串的相似度 (简单包含判断) */
function namesMatch(name1, name2) {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  if (n1 === n2) return true;
  // 一个包含另一个 (长度差不超过5个字)
  if (n1.length > 4 && n2.length > 4) {
    if (n1.includes(n2) || n2.includes(n1)) return true;
  }
  return false;
}

/** Amap type → CuisineCategory 映射 */
function mapCuisine(typeStr) {
  const t = (typeStr || '').toLowerCase();
  // 细分菜系优先匹配
  if (t.includes('四川菜') || t.includes('川菜')) return '川菜';
  if (t.includes('湖南菜') || t.includes('湘菜')) return '中餐';
  if (t.includes('湖北菜') || t.includes('鄂菜')) return '湖北菜';
  if (t.includes('东北菜')) return '东北菜';
  if (t.includes('广东菜') || t.includes('粤菜')) return '中餐';
  if (t.includes('西北菜')) return '西北菜';
  if (t.includes('新疆')) return '新疆菜';
  if (t.includes('山东菜') || t.includes('鲁菜')) return '鲁菜';

  // 外国料理
  if (t.includes('日本料理') || t.includes('日料') || t.includes('寿司')) return '日料';
  if (t.includes('韩国料理') || t.includes('韩料')) return '韩料';
  if (t.includes('西餐') || t.includes('牛扒') || t.includes('牛排') || t.includes('披萨')) return '西餐';
  if (t.includes('外国餐厅') || t.includes('印度') || t.includes('泰国') || t.includes('越南') || t.includes('俄国') || t.includes('土耳其') || t.includes('意大利') || t.includes('西班牙') || t.includes('墨西哥')) return '西餐';

  // 大类别
  if (t.includes('火锅')) return '火锅';
  if (t.includes('烧烤')) return '烧烤';
  if (t.includes('面食') || t.includes('面馆') || t.includes('粉面')) return '面食';
  if (t.includes('快餐厅') || t.includes('快餐') || t.includes('汉堡') || t.includes('炸鸡')) return '快餐';
  if (t.includes('冷饮店') || t.includes('咖啡厅') || t.includes('糕饼店') || t.includes('茶艺馆') || t.includes('休闲餐饮') || t.includes('甜品')) return '甜品饮品';
  if (t.includes('清真') || t.includes('新疆')) return '新疆菜';

  // 中餐厅 / 特色
  if (t.includes('中餐厅') || t.includes('特色') || t.includes('地方风味')) return '中餐';
  if (t.includes('餐饮相关') || t.includes('小吃')) return '小吃';

  return '其他';
}

/** 根据经纬度分配到最近的街道 */
function assignStreet(lat, lng) {
  let minDist = Infinity;
  let bestStreet = 'xiaonei'; // 默认校内

  for (const street of STREET_CENTERS) {
    const dist = haversineKm(lat, lng, street.lat, street.lng);
    if (dist < minDist) {
      minDist = dist;
      bestStreet = street.id;
    }
  }

  // 如果离所有街道中心都超过 3km，归为校内（说明可能不在预设区域内）
  if (minDist > 3) return 'xiaonei';
  return bestStreet;
}

/** 获取街道的下一个 ID 编号 */
function getNextId(streetId, existingIds) {
  const prefix = streetId + '-';
  const used = existingIds
    .filter((id) => id.startsWith(prefix))
    .map((id) => parseInt(id.replace(prefix, ''), 10))
    .filter((n) => !isNaN(n));
  const maxNum = used.length > 0 ? Math.max(...used) : 0;
  return `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
}

// ===== 1. 读取 rawRestaurantsFull.json =====
console.log('📖 读取 rawRestaurantsFull.json ...');
const fullData = JSON.parse(fs.readFileSync('src/data/rawRestaurantsFull.json', 'utf-8'));
const allRestaurants = fullData.restaurants || [];
console.log(`   共 ${allRestaurants.length} 家店铺`);

// ===== 2. 按距离过滤 =====
console.log(`\n📍 按距离过滤（武大行政楼 ${MAX_DISTANCE_KM}km 范围）...`);
const nearby = [];

for (const r of allRestaurants) {
  const [lng, lat] = (r.location || '').split(',').map(Number);
  if (isNaN(lat) || isNaN(lng)) continue;

  const dist = haversineKm(ADMIN_BUILDING.lat, ADMIN_BUILDING.lng, lat, lng);
  if (dist <= MAX_DISTANCE_KM) {
    nearby.push({ ...r, _lat: lat, _lng: lng, _dist: dist });
  }
}

// 按距离排序
nearby.sort((a, b) => a._dist - b._dist);
console.log(`   保留 ${nearby.length} 家（过滤掉 ${allRestaurants.length - nearby.length} 家）`);

// ===== 3. 解析现有 restaurants.ts =====
console.log('\n📖 解析现有 restaurants.ts ...');
const tsContent = fs.readFileSync('src/data/restaurants.ts', 'utf-8');

// 提取所有现有 restaurant 对象
// 每个对象以 { 开头，以 }, 结尾
function parseExistingRestaurants(content) {
  const results = [];
  // 匹配每个 restaurant 对象块
  const blockRegex = /\{\s*\n\s*id:\s*'([^']+)',\s*\n\s*name:\s*'([^']+)',\s*\n\s*streetId:\s*'([^']+)',\s*\n\s*cuisine:\s*'([^']+)',\s*\n\s*signatureDish:\s*'([^']*)',\s*\n\s*avgPrice:\s*(\d+),\s*\n\s*description:\s*'([^']*)',\s*\n\s*latLng:\s*\[([^\]]+)\],\s*\n\s*tags:\s*(\[[^\]]*\])(.*?)\s*\},/gs;

  let match;
  while ((match = blockRegex.exec(content)) !== null) {
    const [, id, name, streetId, cuisine, signatureDish, avgPrice, description, latLngStr, tags, extra] = match;

    // 解析 extra 部分看是否有 rating/cost/tel/openTime
    const extraFields = {};
    if (extra) {
      const ratingM = extra.match(/rating:\s*'([^']*)'/);
      const costM = extra.match(/cost:\s*'([^']*)'/);
      const telM = extra.match(/tel:\s*'([^']*)'/);
      const openTimeM = extra.match(/openTime:\s*'([^']*)'/);
      if (ratingM) extraFields.rating = ratingM[1];
      if (costM) extraFields.cost = costM[1];
      if (telM) extraFields.tel = telM[1];
      if (openTimeM) extraFields.openTime = openTimeM[1];
    }

    // 解析 latLng
    const latLngParts = latLngStr.split(',').map((s) => parseFloat(s.trim()));

    results.push({
      id,
      name,
      streetId,
      cuisine,
      signatureDish,
      avgPrice: parseInt(avgPrice, 10),
      description,
      latLng: latLngParts,
      tags: tags,
      ...extraFields,
      _blockStart: match.index,
      _blockEnd: match.index + match[0].length,
      _fullMatch: match[0],
    });
  }
  return results;
}

const existingList = parseExistingRestaurants(tsContent);
console.log(`   解析到 ${existingList.length} 家现有店铺`);

// 构建匹配索引
const existingByName = new Map();
for (const e of existingList) {
  existingByName.set(normalizeName(e.name), e);
}

// ===== 4. 匹配和分类 =====
console.log('\n🔄 匹配店铺...');
const enriched = [];   // 匹配到 → 需要补充字段
const brandNew = [];   // 未匹配 → 需要新增

for (const r of nearby) {
  // 尝试精确匹配
  let match = existingByName.get(normalizeName(r.name));

  // 尝试模糊匹配
  if (!match) {
    for (const e of existingList) {
      if (namesMatch(r.name, e.name)) {
        // 额外验证：地址也要部分匹配
        const rawAddr = normalizeName(r.address || '');
        // 如果名字匹配且坐标接近 (< 200m)，认为是同一家
        const coordDist = haversineKm(r._lat, r._lng, e.latLng[0], e.latLng[1]);
        if (coordDist < 0.2) {
          match = e;
          break;
        }
      }
    }
  }

  if (match) {
    enriched.push({ raw: r, existing: match });
  } else {
    brandNew.push(r);
  }
}

console.log(`   匹配成功：${enriched.length} 家（将补充评分/人均/电话/营业时间）`);
console.log(`   新增店铺：${brandNew.length} 家（将添加到对应街道分组）`);

// ===== 5. 查看匹配详情 =====
console.log('\n📋 匹配详情（前15条）：');
enriched.slice(0, 15).forEach(({ raw, existing }, i) => {
  const rating = raw.rating ? `⭐${raw.rating}` : '';
  const cost = raw.cost && raw.cost !== '0' ? `¥${raw.cost}` : '';
  console.log(`  ${String(i + 1).padStart(2)}. ${existing.name.slice(0, 28).padEnd(28)} → ${rating} ${cost}`);
});

// ===== 6. 生成新的 restaurants.ts 内容 =====
console.log('\n📝 生成新的 restaurants.ts ...');

// 先收集所有现有 ID 以便分配新 ID
const allExistingIds = existingList.map((e) => e.id);

// 为新店铺分配街道和 ID
const newEntriesByStreet = {};
for (const r of brandNew) {
  const streetId = assignStreet(r._lat, r._lng);
  if (!newEntriesByStreet[streetId]) newEntriesByStreet[streetId] = [];
  newEntriesByStreet[streetId].push(r);
}

// 为每个新店铺分配 ID
for (const [streetId, entries] of Object.entries(newEntriesByStreet)) {
  for (const entry of entries) {
    const newId = getNextId(streetId, allExistingIds);
    entry._assignedId = newId;
    entry._assignedStreet = streetId;
    allExistingIds.push(newId);
  }
}

// 构建需要插入到文件中的丰富字段文本
function buildExtraFields(raw) {
  const parts = [];
  if (raw.rating && raw.rating !== '0') parts.push(`rating: '${raw.rating}'`);
  if (raw.cost && raw.cost !== '0') parts.push(`cost: '${raw.cost}'`);
  if (raw.tel) parts.push(`tel: '${String(raw.tel).replace(/'/g, "\\'")}'`);
  const ot = typeof raw.open_time === 'string' ? raw.open_time
    : (Array.isArray(raw.open_time) ? raw.open_time.filter(Boolean).join('; ') : '');
  if (ot) parts.push(`openTime: '${ot.replace(/'/g, "\\'")}'`);
  // 不带前导逗号，逗号由调用方处理
  return parts.join(',\n    ');
}

// 对每个匹配的条目，在原文件中插入额外字段
let updatedContent = tsContent;
let offset = 0; // 跟踪插入导致的偏移

for (const { raw, existing } of enriched) {
  // 查找这个 entry 在现有内容中的位置
  // 使用正则找到对应的块
  const nameEscaped = existing.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const blockPattern = new RegExp(
    `(\\{\\s*\\n\\s*id:\\s*'${existing.id}',\\s*\\n\\s*name:\\s*'${nameEscaped}',\\s*\\n\\s*streetId:\\s*'${existing.streetId}',\\s*\\n\\s*cuisine:\\s*'${existing.cuisine}',\\s*\\n\\s*signatureDish:\\s*'[^']*',\\s*\\n\\s*avgPrice:\\s*\\d+,\\s*\\n\\s*description:\\s*'[^']*',\\s*\\n\\s*latLng:\\s*\\[[^\\]]+\\],\\s*\\n\\s*tags:\\s*\\[[^\\]]*\\])([^}]*?)(\\s*\\},)`,
    'g'
  );

  // 只用第一个匹配（最准确的）
  let replaced = false;
  updatedContent = updatedContent.replace(blockPattern, (fullMatch, beforeExtra, oldExtra, closing) => {
    if (replaced) return fullMatch; // 已经替换过了
    replaced = true;

    // 构建新的 extra 字段
    const newExtra = buildExtraFields(raw);

    if (newExtra) {
      // tags 后面需要加逗号，然后接新字段
      return beforeExtra + ',\n    ' + newExtra + closing;
    } else {
      return beforeExtra + closing;
    }
  });

  if (!replaced) {
    console.log(`   ⚠️ 未能在文件中定位：${existing.name}`);
  }
}

// 检查成功更新了多少
const ratingInFile = (updatedContent.match(/rating:\s*'/g) || []).length;
const costInFile = (updatedContent.match(/cost:\s*'/g) || []).length;
console.log(`   文件中现有 rating 字段：${ratingInFile} 处`);
console.log(`   文件中现有 cost 字段：${costInFile} 处`);

// ===== 7. 插入新店铺 =====
console.log('\n📋 新增店铺列表：');

const streetOrder = ['guangbalu', 'bayilu', 'donghuxincun', 'luoshibeilu', 'weilaicheng', 'xiaonei'];
const streetNames = {
  guangbalu: '广八路', bayilu: '八一路', donghuxincun: '东湖新村',
  luoshibeilu: '珞狮北路', weilaicheng: '未来城夜市', xiaonei: '校内',
};

// 统计每个街道新增数量
const streetCounts = {};
for (const r of brandNew) {
  const sid = r._assignedStreet;
  streetCounts[sid] = (streetCounts[sid] || 0) + 1;
}

// 显示统计
for (const sid of streetOrder) {
  const count = streetCounts[sid] || 0;
  if (count > 0) {
    console.log(`   ${streetNames[sid]} (${sid})：${count} 家`);
  }
}

// 构建新条目的文本
function buildNewEntry(r) {
  const cuisine = mapCuisine(r.type || '');
  const lat = r._lat.toFixed(6);
  const lng = r._lng.toFixed(6);
  const safeName = (r.name || '未知店铺').replace(/'/g, "\\'");
  const safeAddr = (r.address || '').replace(/'/g, "\\'");
  const extraFields = buildExtraFields(r);

  const lines = [
    `  {`,
    `    id: '${r._assignedId}',`,
    `    name: '${safeName}',`,
    `    streetId: '${r._assignedStreet}',`,
    `    cuisine: '${cuisine}',`,
    `    signatureDish: '待补充',`,
    `    avgPrice: ${r.cost && r.cost !== '0' ? Math.round(parseFloat(r.cost)) : 0},`,
    `    description: '待补充',`,
    `    latLng: [${lat}, ${lng}],`,
    `    tags: ["待补充"]${extraFields ? ',' : ''}`,
  ];

  if (extraFields) {
    lines.push(`    ${extraFields}`);
  }

  lines.push(`  },`);
  return lines.join('\n');
}

// 策略：找到每个街道分组的注释标记，在最后一个条目之后插入新条目
// 如果没有对应的街道分组，在最后插入

// 先找到各街道分组的位置
function findStreetInsertPoint(content, streetId) {
  // 找到该街道分组的所有条目
  const escapedId = streetId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`streetId:\\s*'${escapedId}'`, 'g');

  let lastMatchEnd = -1;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    // 从这个 streetId 位置往后找最近的 `},` 作为条目结束位置
    const afterMatch = content.indexOf('},', match.index);
    if (afterMatch > lastMatchEnd) {
      lastMatchEnd = afterMatch + 2; // 包括 },
    }
  }

  return lastMatchEnd;
}

// 从后往前插入，避免位置偏移
const insertions = [];
for (const sid of streetOrder) {
  const entries = newEntriesByStreet[sid] || [];
  if (entries.length === 0) continue;

  // 找到该街道的注释标题位置（如果有的话）
  let insertPoint = -1;
  const commentPatterns = [
    new RegExp(`//\\s*={10,}\\s*\\n\\s*//\\s*${streetNames[sid].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\n]*\\n\\s*//\\s*={10,}`),
    new RegExp(`//\\s*${streetNames[sid].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\n]*\\n`),
  ];

  for (const pattern of commentPatterns) {
    const m = updatedContent.match(pattern);
    if (m) {
      insertPoint = m.index + m[0].length;
      break;
    }
  }

  if (insertPoint === -1) {
    // 找到该街道最后一个条目的结束位置
    insertPoint = findStreetInsertPoint(updatedContent, sid);
  }

  if (insertPoint === -1) {
    console.log(`   ⚠️ 找不到街道「${streetNames[sid]}」的插入位置，将添加到末尾`);
    insertPoint = updatedContent.lastIndexOf('];');
  }

  // 构建插入文本
  const entriesText = entries
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    .map((r) => buildNewEntry(r))
    .join('\n');

  insertions.push({ pos: insertPoint, text: '\n' + entriesText, sid });
}

// 按位置从大到小排序，从后往前插入
insertions.sort((a, b) => b.pos - a.pos);

for (const ins of insertions) {
  updatedContent = updatedContent.slice(0, ins.pos) + ins.text + updatedContent.slice(ins.pos);
}

// ===== 8. 更新 avgPrice =====
// 对匹配到的店铺，如果有 cost 数据，更新 avgPrice
console.log('\n💰 更新人均消费...');
let priceUpdatedCount = 0;
for (const { raw, existing } of enriched) {
  if (raw.cost && raw.cost !== '0') {
    const newPrice = Math.round(parseFloat(raw.cost));
    if (newPrice > 0 && existing.avgPrice === 0) {
      // 更新 avgPrice
      const nameEscaped = existing.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pricePattern = new RegExp(
        `(name:\\s*'${nameEscaped}',\\s*\\n\\s*streetId:\\s*'${existing.streetId}',\\s*\\n\\s*cuisine:\\s*'${existing.cuisine}',\\s*\\n\\s*signatureDish:\\s*'[^']*',\\s*\\n\\s*avgPrice:\\s*)0(,)`,
        'g'
      );
      const before = updatedContent;
      updatedContent = updatedContent.replace(pricePattern, `$1${newPrice}$2`);
      if (updatedContent !== before) {
        priceUpdatedCount++;
      }
    }
  }
}
console.log(`   更新了 ${priceUpdatedCount} 家的 avgPrice`);

// ===== 9. 写入文件 =====
fs.writeFileSync('src/data/restaurants.ts', updatedContent, 'utf-8');
console.log('\n📁 已保存到 src/data/restaurants.ts');

// ===== 10. 最终统计 =====
const finalContent = fs.readFileSync('src/data/restaurants.ts', 'utf-8');
const finalNameMatches = finalContent.match(/name:\s*'/g);
const finalRatingMatches = finalContent.match(/rating:\s*'/g);
const finalCostMatches = finalContent.match(/cost:\s*'/g);
const finalTelMatches = finalContent.match(/tel:\s*'/g);
const finalOpenTimeMatches = finalContent.match(/openTime:\s*'/g);

console.log(`\n${'━'.repeat(60)}`);
console.log('📊 最终统计：');
console.log(`   原始店铺数：${existingList.length} 家`);
console.log(`   距离过滤后：${nearby.length} 家`);
console.log(`   匹配成功：${enriched.length} 家`);
console.log(`   新增店铺：${brandNew.length} 家`);
console.log(`   文件总店铺：约 ${(finalNameMatches || []).length} 家`);
console.log(`   含 rating 字段：${(finalRatingMatches || []).length} 家`);
console.log(`   含 cost 字段：${(finalCostMatches || []).length} 家`);
console.log(`   含 tel 字段：${(finalTelMatches || []).length} 家`);
console.log(`   含 openTime 字段：${(finalOpenTimeMatches || []).length} 家`);

// 列出新增店铺详情
if (brandNew.length > 0) {
  console.log(`\n📋 新增店铺详情：`);
  for (const sid of streetOrder) {
    const entries = (newEntriesByStreet[sid] || []);
    if (entries.length === 0) continue;
    console.log(`\n  ── ${streetNames[sid]} (${sid}) +${entries.length}家 ──`);
    entries
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .forEach((r) => {
        const rating = r.rating && r.rating !== '0' ? ` ⭐${r.rating}` : '';
        const cost = r.cost && r.cost !== '0' ? ` ¥${r.cost}/人` : '';
        console.log(`    ${r._assignedId}  ${(r.name || '未知').slice(0, 30).padEnd(30)} ${(r.address || '').slice(0, 36)}${rating}${cost}`);
      });
  }
}

console.log('\n✅ 完成！');
