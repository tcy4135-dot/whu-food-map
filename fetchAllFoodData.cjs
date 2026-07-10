require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

const AMAP_KEY = process.env.AMAP_KEY;
if (!AMAP_KEY) {
  console.error('❌ 请在 .env 文件中设置 AMAP_KEY');
  process.exit(1);
}

const TYPES = '050000'; // 餐饮服务
const PAGE_SIZE = 25;

// ===== 工具函数 =====
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ===== 1. 周边搜索：以武大行政楼为中心，半径2000米 =====
const ADMIN_BUILDING = '114.3671,30.5370'; // 武大行政楼

async function fetchAroundPage(location, radius, page) {
  const response = await axios.get('https://restapi.amap.com/v3/place/around', {
    params: {
      location,
      radius,
      types: TYPES,
      key: AMAP_KEY,
      offset: PAGE_SIZE,
      page,
      extensions: 'all', // v3 返回 biz_ext (rating/cost/open_time), tel, business_area, photos
    },
  });
  return response.data;
}

async function fetchAllAround() {
  console.log('🔍 [周边搜索] 以武大行政楼为中心，半径2000米...');
  const allPois = [];

  const page1 = await fetchAroundPage(ADMIN_BUILDING, 2000, 1);

  if (page1.status !== '1') {
    console.log(`   ⚠️ 请求失败：${page1.info}`);
    return allPois;
  }

  const total = parseInt(page1.count, 10);
  allPois.push(...(page1.pois || []));

  // 2000米范围可能结果较多
  const totalPages = Math.min(Math.ceil(total / PAGE_SIZE), 10);
  for (let p = 2; p <= totalPages; p++) {
    await sleep(300);
    const pageData = await fetchAroundPage(ADMIN_BUILDING, 2000, p);
    if (pageData.status === '1' && pageData.pois) {
      allPois.push(...pageData.pois);
    }
  }

  console.log(`   📊 周边搜索返回 ${allPois.length} 条 (API 总计 ${total} 条)`);
  return allPois;
}

// ===== 2. 关键词搜索：多种组合覆盖不同角度 =====
const KEYWORD_SEARCHES = [
  { keywords: '武汉大学', region: '武汉市' },
  { keywords: '武汉大学 美食', region: '武汉市' },
  { keywords: '武汉大学 餐厅', region: '武汉市' },
  { keywords: '武汉大学 小吃', region: '武汉市' },
  { keywords: '街道口 美食', region: '武汉市' },
  { keywords: '广八路 美食', region: '武汉市' },
  { keywords: '八一路 美食', region: '武汉市' },
  { keywords: '东湖新村 美食', region: '武汉市' },
];

async function fetchTextPage(keywords, region, page) {
  const response = await axios.get('https://restapi.amap.com/v3/place/text', {
    params: {
      keywords,
      region,
      types: TYPES,
      key: AMAP_KEY,
      offset: PAGE_SIZE,
      page,
      extensions: 'all', // v3 返回 rich fields
    },
  });
  return response.data;
}

async function fetchOneTextSearch(search) {
  const allPois = [];
  console.log(`   🔍 关键词：「${search.keywords}」(${search.region})`);

  const page1 = await fetchTextPage(search.keywords, search.region, 1);

  if (page1.status !== '1') {
    console.log(`      ⚠️ 请求失败：${page1.info}`);
    return allPois;
  }

  const total = parseInt(page1.count, 10);
  allPois.push(...(page1.pois || []));

  const totalPages = Math.min(Math.ceil(total / PAGE_SIZE), 5);
  for (let p = 2; p <= totalPages; p++) {
    await sleep(300);
    const pageData = await fetchTextPage(search.keywords, search.region, p);
    if (pageData.status === '1' && pageData.pois) {
      allPois.push(...pageData.pois);
    }
  }

  console.log(`      📊 返回 ${allPois.length} 条 (API 总计 ${total} 条)`);
  return allPois;
}

async function fetchAllTextSearches() {
  console.log('\n🔍 [关键词搜索] 多种关键词组合...');
  const allPois = [];

  for (let i = 0; i < KEYWORD_SEARCHES.length; i++) {
    const search = KEYWORD_SEARCHES[i];
    const pois = await fetchOneTextSearch(search);
    // 标记来源，便于统计
    pois.forEach((p) => (p._source = search.keywords));
    allPois.push(...pois);

    if (i < KEYWORD_SEARCHES.length - 1) {
      await sleep(500); // 搜索之间间隔，避免 QPS 超限
    }
  }

  console.log(`   📊 关键词搜索合计：${allPois.length} 条`);
  return allPois;
}

// ===== 3. 合并去重：按店铺名 + 地址精确去重 =====
function dedupKey(poi) {
  const name = (poi.name || '').trim();
  const addr = (poi.address || '').trim();
  return `${name}||${addr}`;
}

function deduplicate(pois) {
  const seen = new Set();
  const result = [];

  for (const poi of pois) {
    const key = dedupKey(poi);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(poi);
  }

  return { unique: result, removed: pois.length - result.length };
}

// ===== 4. 提取丰富字段（v3 API biz_ext） =====
function extractRichFields(poi) {
  const bizExt = poi.biz_ext || {};

  // 评分：biz_ext.rating（字符串，如 "4.5"）
  const rating = bizExt.rating || '';

  // 人均消费：biz_ext.cost（字符串，如 "18.00"）
  const cost = bizExt.cost || '';

  // 营业时间：biz_ext.open_time 或 opentime2，可能是字符串或数组
  let openTime = '';
  if (Array.isArray(bizExt.open_time)) {
    openTime = bizExt.open_time.filter(Boolean).join('; ');
  } else if (typeof bizExt.open_time === 'string') {
    openTime = bizExt.open_time;
  }
  const openTime2 = Array.isArray(bizExt.opentime2)
    ? bizExt.opentime2.filter(Boolean).join('; ')
    : (typeof bizExt.opentime2 === 'string' ? bizExt.opentime2 : '');
  const finalOpenTime = openTime || openTime2;

  // 电话：v3 中 tel 可能是字符串或数组
  let tel = '';
  if (Array.isArray(poi.tel) && poi.tel.length > 0) {
    tel = poi.tel.join('; ');
  } else if (typeof poi.tel === 'string') {
    tel = poi.tel;
  }

  // 商圈
  const businessArea = poi.business_area || '';

  // 照片
  const photos = Array.isArray(poi.photos) ? poi.photos : [];

  return {
    name: poi.name || '',
    address: poi.address || '',
    location: poi.location || '',
    tel,
    type: poi.type || '',
    typecode: poi.typecode || '',
    rating,
    cost,
    open_time: finalOpenTime,
    business_area: businessArea,
    pname: poi.pname || '',
    cityname: poi.cityname || '',
    adname: poi.adname || '',
    photos,
    // 保留原始 id 和高德 POI ID
    id: poi.id || '',
  };
}

// ===== 主流程 =====
async function main() {
  console.log('🔄 正在全方位获取武大周边美食数据（v3 API + 周边搜索 + 关键词搜索）...\n');
  console.log('━'.repeat(60));

  // ---- 步骤1：周边搜索 ----
  const aroundPois = await fetchAllAround();

  // ---- 步骤2：关键词搜索 ----
  const textPois = await fetchAllTextSearches();

  // ---- 步骤3：合并 ----
  const allPois = [...aroundPois, ...textPois];
  console.log(`\n${'━'.repeat(60)}`);
  console.log('📊 合并汇总：');
  console.log(`   周边搜索：${aroundPois.length} 条`);

  const sourceCounts = {};
  textPois.forEach((p) => {
    const src = p._source || 'unknown';
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  });
  Object.entries(sourceCounts).forEach(([src, count]) => {
    console.log(`   关键词「${src}」：${count} 条`);
  });
  console.log(`   合并前总计：${allPois.length} 条`);

  // ---- 步骤4：去重 ----
  const { unique: deduped, removed } = deduplicate(allPois);
  console.log(`   去重后保留：${deduped.length} 条 (移除 ${removed} 条重复)`);

  // ---- 步骤5：提取丰富字段 ----
  const restaurants = deduped.map(extractRichFields);

  // ---- 步骤6：保存 ----
  const output = {
    fetchTime: new Date().toISOString(),
    apiVersion: 'v3',
    searchConfig: {
      around: {
        center: ADMIN_BUILDING,
        centerDescription: '武大行政楼',
        radius: 2000,
        rawCount: aroundPois.length,
      },
      text: KEYWORD_SEARCHES.map((s) => ({
        keywords: s.keywords,
        region: s.region,
        rawCount: sourceCounts[s.keywords] || 0,
      })),
    },
    totalBeforeDedup: allPois.length,
    totalAfterDedup: deduped.length,
    restaurants,
  };

  const outPath = 'src/data/rawRestaurantsFull.json';
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\n📁 已保存到 ${outPath}`);
  console.log(`   (${JSON.stringify(output).length.toLocaleString()} 字节)`);

  // ---- 步骤7：对比原有 rawRestaurants.json ----
  console.log(`\n${'━'.repeat(60)}`);
  console.log('📊 对比原有数据 (rawRestaurants.json)：');

  const oldPath = 'src/data/rawRestaurants.json';
  if (fs.existsSync(oldPath)) {
    const oldData = JSON.parse(fs.readFileSync(oldPath, 'utf-8'));
    const oldPois = oldData.pois || [];
    const oldKeys = new Set(oldPois.map((p) => dedupKey(p)));

    const newRestaurants = restaurants.filter((r) => !oldKeys.has(dedupKey(r)));
    const stillExist = restaurants.filter((r) => oldKeys.has(dedupKey(r)));

    console.log(`   原有店铺：${oldPois.length} 家`);
    console.log(`   本次获取：${restaurants.length} 家`);
    console.log(`   新增店铺：${newRestaurants.length} 家 🆕`);
    console.log(`   重合店铺：${stillExist.length} 家`);

    if (newRestaurants.length > 0) {
      console.log(`\n📋 新增店铺列表：`);
      newRestaurants.forEach((r, i) => {
        const parts = [];
        if (r.rating) parts.push(`⭐${r.rating}`);
        if (r.cost && r.cost !== '0') parts.push(`💰¥${r.cost}`);
        const extras = parts.length > 0 ? '  ' + parts.join(' ') : '';
        const typeLabel = r.type.split(';').pop() || '未知';
        console.log(
          `  ${String(i + 1).padStart(2)}. ${r.name.slice(0, 26).padEnd(26)} │ ${typeLabel.slice(0, 16).padEnd(16)} │ ${r.address.slice(0, 40)}${extras}`
        );
      });
    }

    if (oldPois.length > restaurants.length) {
      const missing = oldPois.filter((p) => !restaurants.some((r) => dedupKey(r) === dedupKey(p)));
      console.log(`\n⚠️  原有数据中有 ${missing.length} 家本次未获取到：`);
      missing.forEach((p, i) => {
        console.log(`  ${String(i + 1).padStart(2)}. ${(p.name || '未知').slice(0, 28).padEnd(28)} │ ${(p.address || '').slice(0, 45)}`);
      });
    }
  } else {
    console.log('   (无原有数据文件可对比)');
  }

  // ---- 步骤8：丰富字段覆盖率统计 ----
  console.log(`\n${'━'.repeat(60)}`);
  console.log('📋 丰富字段覆盖率：');
  const stats = [
    { label: '评分 (rating)', field: 'rating', check: (v) => v && v !== '' && v !== '0' },
    { label: '人均消费 (cost)', field: 'cost', check: (v) => v && v !== '' && v !== '0' },
    { label: '电话 (tel)', field: 'tel', check: (v) => v && v !== '' },
    { label: '营业时间 (open_time)', field: 'open_time', check: (v) => v && v !== '' },
    { label: '商圈 (business_area)', field: 'business_area', check: (v) => v && v !== '' },
    { label: '照片 (photos)', field: 'photos', check: (v) => Array.isArray(v) && v.length > 0 },
  ];

  stats.forEach(({ label, field, check }) => {
    const count = restaurants.filter((r) => check(r[field])).length;
    const pct = ((count / restaurants.length) * 100).toFixed(1);
    console.log(`   ${label.padEnd(28)} ${String(count).padStart(3)}/${restaurants.length} (${pct}%)`);
  });

  // ---- 步骤9：预览前15条（含丰富字段） ----
  console.log(`\n📋 数据预览（前15条）：`);
  restaurants.slice(0, 15).forEach((r, i) => {
    const rating = r.rating ? ` ⭐${r.rating}` : '';
    const cost = r.cost && r.cost !== '0' ? ` ¥${r.cost}/人` : '';
    const typeLabel = r.type.split(';').pop() || '未知';
    console.log(
      `  ${String(i + 1).padStart(2)}. ${r.name.slice(0, 24).padEnd(24)} │ ${typeLabel.slice(0, 12).padEnd(12)} │ ${r.adname.padEnd(6)}${rating}${cost}`
    );
  });

  console.log(`\n✅ 完成！共获取 ${restaurants.length} 家店铺数据。`);
}

main().catch((err) => {
  console.error('❌ 执行出错：', err.message);
  if (err.response) {
    console.error('   API 响应状态：', err.response.status);
    console.error('   API 响应内容：', JSON.stringify(err.response.data, null, 2).slice(0, 500));
  }
  process.exit(1);
});
