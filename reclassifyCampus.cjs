const fs = require('fs');

// 校内圈坐标范围 (经度, 纬度) + 中心点(用于回退匹配)
const CAMPUS_ZONES = [
  { id: 'gongxue',  name: '工学部圈', lngMin: 114.358, lngMax: 114.363, latMin: 30.539, latMax: 30.543, clng: 114.3605, clat: 30.541 },
  { id: 'hubin',    name: '湖滨圈',   lngMin: 114.360, lngMax: 114.365, latMin: 30.538, latMax: 30.542, clng: 114.3625, clat: 30.540 },
  { id: 'fengyuan', name: '枫园圈',   lngMin: 114.369, lngMax: 114.374, latMin: 30.535, latMax: 30.539, clng: 114.3715, clat: 30.537 },
  { id: 'meiyuan',  name: '梅园圈',   lngMin: 114.364, lngMax: 114.368, latMin: 30.533, latMax: 30.537, clng: 114.366,  clat: 30.535 },
  { id: 'guiyuan',  name: '桂园圈',   lngMin: 114.355, lngMax: 114.360, latMin: 30.535, latMax: 30.539, clng: 114.3575, clat: 30.537 },
  { id: 'xinxi',    name: '信部圈',   lngMin: 114.350, lngMax: 114.358, latMin: 30.528, latMax: 30.534, clng: 114.354,  clat: 30.531 },
];

// 旧街道映射
const STREET_MAP = {
  guangbalu: 'guangba', bayilu: 'bayi', donghuxincun: 'donghu',
  luoshibeilu: 'luoshi', weilaicheng: 'weilai',
};

console.log('📖 读取 restaurants.ts ...');
let content = fs.readFileSync('src/data/restaurants.ts', 'utf-8');

// ===== 步骤1：映射校外街道 =====
console.log('\n🔀 街道 ID 映射...');
for (const [oldId, newId] of Object.entries(STREET_MAP)) {
  const reStreet = new RegExp(`'${oldId}'`, 'g');
  const reId = new RegExp(`'${oldId}-`, 'g');
  const sc = (content.match(reStreet) || []).length;
  content = content.replace(reStreet, `'${newId}'`);
  content = content.replace(reId, `'${newId}-`);
  console.log(`  ${oldId} → ${newId}  (${sc} 处)`);
}

// ===== 步骤2：按坐标分类校内店铺 =====
console.log('\n📍 按坐标分配校内圈...');

const entryRegex = /\{[\s\S]*?streetId:\s*'xiaonei'[\s\S]*?\},/g;
const entries = [];
let match;
while ((match = entryRegex.exec(content)) !== null) {
  const block = match[0];
  const cm = block.match(/latLng:\s*\[([\d.]+),\s*([\d.]+)\]/);
  if (!cm) continue;
  entries.push({ block, lat: parseFloat(cm[1]), lng: parseFloat(cm[2]) });
}

console.log(`  找到 ${entries.length} 个待分配店铺`);

// 计算两点距离（度）
function distKm(a, b) {
  const dlat = a.lat - b.lat;
  const dlng = a.lng - b.lng;
  return Math.sqrt(dlat * dlat + dlng * dlng) * 111; // ~111 km/degree
}

function findZoneStrict(lat, lng) {
  for (const zone of CAMPUS_ZONES) {
    if (lng >= zone.lngMin && lng <= zone.lngMax && lat >= zone.latMin && lat <= zone.latMax) {
      return zone;
    }
  }
  return null;
}

function findZoneNearest(lat, lng) {
  let best = null, bestDist = Infinity;
  for (const zone of CAMPUS_ZONES) {
    const d = distKm({ lat, lng }, { lat: zone.clat, lng: zone.clng });
    if (d < bestDist) { bestDist = d; best = zone; }
  }
  return { zone: best, dist: bestDist };
}

const counts = {};
CAMPUS_ZONES.forEach(z => counts[z.id] = { strict: 0, fallback: 0 });
counts['unmatched'] = 0;
const unmatched = [];

for (const entry of entries) {
  let zone = findZoneStrict(entry.lat, entry.lng);
  let method = 'strict';

  if (!zone) {
    // 回退：找最近的圈（1.5km 以内）
    const nearest = findZoneNearest(entry.lat, entry.lng);
    if (nearest.zone && nearest.dist < 1.5) {
      zone = nearest.zone;
      method = 'fallback';
    }
  }

  if (zone) {
    let newBlock = entry.block
      .replace(/streetId:\s*'xiaonei'/, `streetId: '${zone.id}'`)
      .replace(/id:\s*'xiaonei-/, `id: '${zone.id}-`);
    content = content.replace(entry.block, newBlock);
    counts[zone.id][method]++;
  } else {
    counts['unmatched']++;
    unmatched.push(entry);
  }
}

fs.writeFileSync('src/data/restaurants.ts', content, 'utf-8');
console.log('\n📁 已保存到 src/data/restaurants.ts');

// ===== 统计 =====
console.log('\n' + '━'.repeat(55));
console.log('📊 校内圈分配结果：');
console.log('━'.repeat(55));
console.log('  圈名         ID          严格匹配   回退匹配   合计');
console.log('  ' + '─'.repeat(50));

let total = 0;
for (const zone of CAMPUS_ZONES) {
  const c = counts[zone.id];
  const sum = c.strict + c.fallback;
  total += sum;
  const s = String(c.strict).padStart(5);
  const f = c.fallback > 0 ? String(c.fallback).padStart(7) : '      -';
  console.log(`  ${zone.name.padEnd(12)} ${zone.id.padEnd(10)} ${s}   ${f}   ${String(sum).padStart(4)} 家`);
}
console.log('  ' + '─'.repeat(50));
console.log('  ' + '合计'.padEnd(34) + String(total).padStart(4) + ' 家');

if (counts['unmatched'] > 0) {
  console.log(`\n⚠️  未匹配：${counts['unmatched']} 家（距离最近圈 > 1.5km）`);
  unmatched.forEach(e => console.log(`    [${e.lat}, ${e.lng}]`));
}

// ===== 验证 =====
console.log('\n🔍 验证：');
CAMPUS_ZONES.forEach(z => {
  const re = new RegExp(`streetId: '${z.id}'`, 'g');
  console.log(`  ${z.id}: ${(content.match(re) || []).length} 条`);
});

console.log('\n✅ 完成！');
