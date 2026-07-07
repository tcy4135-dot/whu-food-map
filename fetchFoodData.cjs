require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

const AMAP_KEY = process.env.AMAP_KEY;
if (!AMAP_KEY) {
  console.error('❌ 请在 .env 文件中设置 AMAP_KEY');
  process.exit(1);
}

const TYPES = '050000'; // 餐饮服务

/** 延迟函数，避免触发 API QPS 限制 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 搜索区域定义
const REGIONS = [
  { name: '武大正门（大范围）', location: '114.3708,30.5364', radius: 1500 },
  { name: '广八路',             location: '114.363,30.535',  radius: 300 },
  { name: '八一路',             location: '114.360,30.534',  radius: 300 },
  { name: '东湖新村',           location: '114.357,30.530',  radius: 300 },
  { name: '珞狮北路',           location: '114.353,30.536',  radius: 300 },
  { name: '未来城夜市',         location: '114.348,30.532',  radius: 300 },
];

/**
 * 请求单页数据
 */
async function fetchPage(location, radius, page, offset) {
  const response = await axios.get('https://restapi.amap.com/v5/place/around', {
    params: { location, radius, types: TYPES, key: AMAP_KEY, offset, page },
  });
  return response.data;
}

/**
 * 获取指定区域的全部店铺（自动翻页）
 */
async function fetchRegion(region) {
  const OFFSET = 25; // 每页最多25条
  const allPois = [];

  console.log(`  🔍 搜索「${region.name}」...`);

  // 先请求第1页，获取总数
  const page1 = await fetchPage(region.location, region.radius, 1, OFFSET);

  if (page1.status !== '1') {
    console.log(`     ⚠️ 请求失败：${page1.info}`);
    return allPois;
  }

  const total = parseInt(page1.count, 10);
  allPois.push(...(page1.pois || []));

  // 如果超出1页，继续翻页
  const totalPages = Math.min(Math.ceil(total / OFFSET), 5); // 最多5页，避免请求过多
  for (let p = 2; p <= totalPages; p++) {
    await sleep(300); // 避免 QPS 超限
    const pageData = await fetchPage(region.location, region.radius, p, OFFSET);
    if (pageData.status === '1' && pageData.pois) {
      allPois.push(...pageData.pois);
    }
  }

  console.log(`     📊 返回 ${allPois.length} 条 (API 总计 ${total} 条)`);
  return allPois;
}

/**
 * 去重：名称完全相同 OR（名称相似 + 地址相同）
 */
function deduplicate(pois) {
  const seen = new Set();
  const result = [];

  for (const poi of pois) {
    // 去重 key：名称前4字 + 地址前10字
    const nameKey = poi.name.trim().slice(0, 6);
    const addrKey = (poi.address || '').trim().slice(0, 10);
    const key = `${nameKey}||${addrKey}`;

    if (seen.has(key)) continue;
    seen.add(key);
    result.push(poi);
  }

  return result;
}

// ===== 主流程 =====
async function main() {
  console.log('🔄 正在多区域搜索武大周边美食数据...\n');

  const regionResults = [];

  for (const region of REGIONS) {
    const pois = await fetchRegion(region);
    regionResults.push({ region, pois });
    // 区域之间间隔 500ms，避免连续请求触发 QPS 限制
    if (REGIONS.indexOf(region) < REGIONS.length - 1) {
      await sleep(500);
    }
  }

  console.log('\n📊 各区域搜索汇总：');
  const allPois = [];
  for (const { region, pois } of regionResults) {
    console.log(`  ${region.name.padEnd(18)} ${String(pois.length).padStart(3)} 条`);
    allPois.push(...pois);
  }

  console.log(`\n  合并前总计：${allPois.length} 条`);

  // 去重
  const deduped = deduplicate(allPois);
  console.log(`  去重后保留：${deduped.length} 条 (移除 ${allPois.length - deduped.length} 条重复)`);

  // 保存
  const output = {
    fetchTime: new Date().toISOString(),
    totalRegions: REGIONS.length,
    totalBeforeDedup: allPois.length,
    totalAfterDedup: deduped.length,
    regions: REGIONS.map((r) => r.name),
    pois: deduped,
  };

  fs.writeFileSync(
    'src/data/rawRestaurants.json',
    JSON.stringify(output, null, 2)
  );

  console.log(`\n📁 已保存到 src/data/rawRestaurants.json`);
  console.log(`📋 前 10 条示例：`);
  deduped.slice(0, 10).forEach((poi, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. ${(poi.name || '未知').slice(0, 16).padEnd(16)} │ ${(poi.type || '未知').split(';').pop().slice(0, 12).padEnd(12)} │ ${(poi.address || '').slice(0, 24)}`);
  });
}

main().catch((err) => console.error('❌ 执行出错：', err.message));
