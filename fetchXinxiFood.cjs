require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

const KEY = process.env.AMAP_KEY;
if (!KEY) { console.error('❌ 缺少 AMAP_KEY'); process.exit(1); }

const CENTER = '114.355,30.532';
const RADIUS = 300;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function normalize(n) { return (n || '').trim().replace(/\s+/g, ''); }

function mapCuisine(typeStr) {
  const t = (typeStr || '').toLowerCase();
  if (t.includes('快餐厅') || t.includes('快餐') || t.includes('汉堡') || t.includes('炸鸡')) return '快餐';
  if (t.includes('冷饮店') || t.includes('咖啡厅') || t.includes('糕饼店') || t.includes('茶艺馆') || t.includes('休闲餐饮') || t.includes('甜品')) return '甜品饮品';
  if (t.includes('火锅')) return '火锅';
  if (t.includes('烧烤')) return '烧烤';
  if (t.includes('面食') || t.includes('面馆')) return '面食';
  if (t.includes('日本料理') || t.includes('日料') || t.includes('寿司')) return '日料';
  if (t.includes('韩国料理') || t.includes('韩料')) return '韩料';
  if (t.includes('西餐') || t.includes('牛扒') || t.includes('牛排')) return '西餐';
  if (t.includes('外国餐厅') || t.includes('泰国') || t.includes('越南') || t.includes('印度')) return '西餐';
  if (t.includes('四川菜') || t.includes('川菜')) return '川菜';
  if (t.includes('湖北菜') || t.includes('鄂菜')) return '湖北菜';
  if (t.includes('东北菜')) return '东北菜';
  if (t.includes('新疆') || t.includes('清真')) return '新疆菜';
  if (t.includes('中餐厅') || t.includes('特色') || t.includes('地方风味')) return '中餐';
  if (t.includes('餐饮相关') || t.includes('小吃')) return '小吃';
  return '其他';
}

async function main() {
  // ===== 1. 周边搜索 =====
  console.log('🔍 高德周边搜索：信息学部CBD (114.355, 30.532), 300m...');
  let allPois = [];

  for (let page = 1; page <= 3; page++) {
    const res = await axios.get('https://restapi.amap.com/v3/place/around', {
      params: { location: CENTER, radius: RADIUS, types: '050000', key: KEY, offset: 25, page, extensions: 'all' }
    });
    if (res.data.status === '1' && res.data.pois) {
      allPois.push(...res.data.pois);
      if (page === 1) console.log('   API 总计: ' + res.data.count + ' 条');
    }
    if (!res.data.pois || res.data.pois.length < 25) break;
    await sleep(300);
  }

  console.log('   获取到: ' + allPois.length + ' 条');

  // ===== 2. 读取现有数据 =====
  let content = fs.readFileSync('src/data/restaurants.ts', 'utf-8');
  const existingNames = new Set();
  const nameRe = /name:\s*'([^']+)'/g;
  let m;
  while ((m = nameRe.exec(content)) !== null) {
    existingNames.add(normalize(m[1]));
  }

  // ===== 3. 去重 & 构建新条目 =====
  const newEntries = [];
  const skipped = [];
  const seen = new Set();

  for (const poi of allPois) {
    const name = poi.name || '';
    const nKey = normalize(name);
    if (existingNames.has(nKey) || seen.has(nKey)) {
      skipped.push(name);
      continue;
    }
    seen.add(nKey);

    const bizExt = poi.biz_ext || {};
    const [lng, lat] = (poi.location || '0,0').split(',').map(Number);
    const cost = bizExt.cost || '';

    newEntries.push({
      name,
      address: poi.address || '',
      lat: lat.toFixed(6),
      lng: lng.toFixed(6),
      cuisine: mapCuisine(poi.type || ''),
      cost,
      rating: bizExt.rating || '',
      tel: Array.isArray(poi.tel) ? poi.tel.join('; ') : (poi.tel || ''),
      openTime: typeof bizExt.open_time === 'string' ? bizExt.open_time
        : (Array.isArray(bizExt.open_time) ? bizExt.open_time.filter(Boolean).join('; ') : ''),
    });
  }

  console.log('   去重后新增: ' + newEntries.length + ' 家 (跳过 ' + skipped.length + ' 家已存在)');

  if (newEntries.length === 0) {
    console.log('\n✅ 没有新店铺，无需更新。');
    return;
  }

  // ===== 4. 生成条目文本 =====
  const existingIds = [];
  const idRe2 = /id:\s*'xinxi-(\d+)'/g;
  while ((m = idRe2.exec(content)) !== null) existingIds.push(parseInt(m[1]));
  let nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;

  const newBlocks = newEntries.map(r => {
    const id = 'xinxi-' + String(nextId++).padStart(3, '0');
    const safeName = r.name.replace(/'/g, "\\'");
    const avgPrice = r.cost && r.cost !== '0' ? Math.round(parseFloat(r.cost)) : 0;
    const extras = [];
    if (r.rating && r.rating !== '0') extras.push("rating: '" + r.rating + "'");
    if (r.cost && r.cost !== '0') extras.push("cost: '" + r.cost + "'");
    if (r.tel) extras.push("tel: '" + r.tel.replace(/'/g, "\\'") + "'");
    if (r.openTime) extras.push("openTime: '" + r.openTime.replace(/'/g, "\\'") + "'");
    const extraStr = extras.length > 0 ? ',\n    ' + extras.join(',\n    ') : '';

    return [
      '  {',
      "    id: '" + id + "',",
      "    name: '" + safeName + "',",
      "    streetId: 'xinxi',",
      "    cuisine: '" + r.cuisine + "',",
      "    signatureDish: '待补充',",
      "    avgPrice: " + avgPrice + ",",
      "    description: '待补充',",
      "    latLng: [" + r.lat + ", " + r.lng + "],",
      '    tags: ["待补充"]' + extraStr,
      '  },',
    ].join('\n');
  });

  // ===== 5. 插入到 xinxi 分组 =====
  let insertPoint = content.lastIndexOf('];');
  const lastXinxi = content.lastIndexOf("streetId: 'xinxi'");
  if (lastXinxi > 0) {
    const after = content.indexOf('},', lastXinxi);
    if (after > 0) insertPoint = after + 2;
  }

  const comment = '\n  // ============================================================\n  // 信息学部（新获取 ' + newEntries.length + ' 家）\n  // ============================================================\n';
  content = content.slice(0, insertPoint) + comment + newBlocks.join('\n') + content.slice(insertPoint);
  fs.writeFileSync('src/data/restaurants.ts', content, 'utf-8');

  // ===== 6. 输出 =====
  console.log('\n📋 新增 ' + newEntries.length + ' 家店铺：');
  newEntries.forEach((r, i) => {
    const rating = r.rating && r.rating !== '0' ? ' ⭐' + r.rating : '';
    const cost = r.cost && r.cost !== '0' ? ' ¥' + r.cost + '/人' : '';
    console.log('  ' + String(i + 1).padStart(2) + '. ' + r.name.slice(0, 32).padEnd(32) + r.cuisine.padEnd(8) + rating + cost);
  });

  const finalXinxi = (content.match(/streetId: 'xinxi'/g) || []).length;
  console.log('\n📊 信息学部 (xinxi) 总计：' + finalXinxi + ' 家');
  console.log('✅ 完成！');
}

main().catch(err => {
  console.error('❌ 错误：', err.message);
  if (err.response) console.error('   API:', err.response.status, JSON.stringify(err.response.data).slice(0, 300));
  process.exit(1);
});
