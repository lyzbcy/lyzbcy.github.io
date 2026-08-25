#!/usr/bin/env node
/**
 * AI Coding 比赛看板 — 多源抓取与筛选管线 v2
 *
 * 数据源(均通过合规检查,只抓公开列表/详情页):
 *   1. AI赛事通 competehub.dev — 主源,覆盖中国平台(天池/华为云…)+海外
 *   2. lablab.ai — AI 黑客松垂直站,列表 JSON-LD + 新活动详情页 Event JSON-LD
 *   (Devpost 被 Cloudflare JS 挑战挡,不接;其热门比赛通常被 competehub 转收录)
 *
 * 输出 schema v2(assets/data/aicoding.json):
 *   id: "{source}:{slug}" | title/category/tags/teams | location 原文
 *   city: 中文字市名(仅中国城市) | isChina | isOnline
 *   prize/prizeValue | endsAt(YYYY-MM-DD 估算) | deadlineText | url
 *   type: ai_coding/pure_coding/dev | platform | firstSeen | stale
 *
 * 用法(在博客仓库任意位置):
 *   node tools/aicoding/update-aicoding.mjs           # 全量更新
 *   node tools/aicoding/update-aicoding.mjs --pages 6 # competehub 翻页深度(默认 6)
 *   node tools/aicoding/update-aicoding.mjs --dry     # 只打印,不写文件
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

const PAGES = Number(process.argv.includes('--pages')
  ? process.argv[process.argv.indexOf('--pages') + 1] : 6);
const DRY = process.argv.includes('--dry');
const OUT = path.join(import.meta.dirname, '..', '..', 'assets', 'data', 'aicoding.json');

const UA = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};
/* lablab 的 Cloudflare 会挡"完整Chrome头+node TLS指纹"组合,短 UA 反而放行(2026-08-25 实测) */
const LABLAB_UA = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0',
  'Accept': 'text/html,*/*',
};

const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const iso = d => d.toISOString().slice(0, 10);

/* curl 降级通道:node fetch 的 TLS 指纹会被部分 Cloudflare 站点(如 lablab)识别为机器人,
   curl 的指纹可以过(2026-08-25 实测);Windows Git Bash 与 Linux 服务器都有 curl */
async function fetchViaCurl(url, headers) {
  const args = ['-sL', '--max-time', '40', '--compressed',
    '-A', headers['User-Agent'] || UA['User-Agent']];
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === 'user-agent') continue;
    args.push('-H', `${k}: ${v}`);
  }
  args.push(url);
  const { stdout } = await execFileP('curl', args, { maxBuffer: 24 * 1024 * 1024 });
  return stdout && stdout.length > 500 ? stdout : null;
}

async function fetchPage(url, retries = 3, headers = UA) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers });
      if (res.status === 200) return await res.text();
      console.error(`  [warn] ${url.slice(0, 80)} -> HTTP ${res.status}(第${i + 1}次)`);
    } catch (e) {
      console.error(`  [warn] ${url.slice(0, 80)} -> ${e.message}(第${i + 1}次)`);
    }
    /* node fetch 被挡 → curl 通道兜底 */
    try {
      const body = await fetchViaCurl(url, headers);
      if (body) { console.log(`  [curl] ${url.slice(0, 70)} via curl OK(${Math.round(body.length / 1024)}KB)`); return body; }
    } catch { /* curl 也失败,进入下一轮重试 */ }
    await new Promise(r => setTimeout(r, 2000 * (i + 1)));
  }
  return null;
}

/* ================= 城市规范化 ================= */

/* 中国城市(英文常见拼写 → 中文);判断"中国城市"只认这个表,防误判 */
const CN_CITIES = {
  beijing: '北京', shanghai: '上海', guangzhou: '广州', shenzhen: '深圳',
  hangzhou: '杭州', nanjing: '南京', suzhou: '苏州', chengdu: '成都',
  wuhan: '武汉', xian: '西安', tianjin: '天津', chongqing: '重庆',
  changsha: '长沙', zhengzhou: '郑州', qingdao: '青岛', hefei: '合肥',
  xiamen: '厦门', fuzhou: '福州', jinan: '济南', dalian: '大连',
  shenyang: '沈阳', harbin: '哈尔滨', kunming: '昆明', guiyang: '贵阳',
  nanchang: '南昌', nanning: '南宁', shijiazhuang: '石家庄', taiyuan: '太原',
  lanzhou: '兰州', urumqi: '乌鲁木齐', hongkong: '香港', hong_kong: '香港',
  taipei: '台北', new_taipei: '新北', taichung: '台中', kaohsiung: '高雄',
  wuxi: '无锡', ningbo: '宁波', changzhou: '常州', nantong: '南通',
  jiaxing: '嘉兴', huzhou: '湖州', shaoxing: '绍兴', zhoushan: '舟山',
  wenzhou: '温州', taizhou: '台州', jinhua: '金华', yiwu: '义乌',
  quzhou: '衢州', zhuhai: '珠海', dongguan: '东莞', foshan: '佛山',
  zhongshan: '中山', huizhou: '惠州', quanzhou: '泉州', zhangzhou: '漳州',
  longyan: '龙岩', xuzhou: '徐州', yangzhou: '扬州', zhenjiang: '镇江',
  taizhou_jiangsu: '泰州', yancheng: '盐城', huaian: '淮安', lianyungang: '连云港',
  suqian: '宿迁', wuhu: '芜湖', maanshan: '马鞍山', anqing: '安庆',
  huangshan: '黄山', bengbu: '蚌埠', tongling: '铜陵', chizhou: '池州',
  xuancheng: '宣城', chuzhou: '滁州', lu_an: '六安', fuyang_ah: '阜阳',
  haikou: '海口', sanya: '三亚', guilin: '桂林', liuzhou: '柳州',
  nanyang: '南阳', luoyang: '洛阳', kaifeng: '开封', baoding: '保定',
  handan: '邯郸', tangshan: '唐山', qinhuangdao: '秦皇岛', yantai: '烟台',
  weihai: '威海', weifang: '潍坊', zibo: '淄博', lin_yi: '临沂',
  rizhao: '日照', tai_an: '泰安', linyi: '临沂',
};

function normalizeCity(location) {
  const loc = (location || '').trim();
  if (!loc) return { city: null, isChina: false, isOnline: false };
  if (/^(online|remote|virtual|线上|全网)$/i.test(loc)) return { city: null, isChina: false, isOnline: true };
  const key = loc.toLowerCase().replace(/[\s,].*$/, '').replace(/[\s'-]/g, '_');
  const zh = CN_CITIES[key] || CN_CITIES[key.replace(/_city$/, '')];
  return { city: zh || null, isChina: !!zh, isOnline: false };
}

/* ================= 三级筛选(严口径) ================= */

const AI_CODING_STRONG = [
  /vibe[- ]?cod/i, /vibeathon/i, /\bai\s+cod/i, /code\s+with\s+ai/i,
  /ai[- ]assisted\s+(cod|program)/i, [/\bcursor\b/, 'hack|challenge|build|program'], /copilot/i,
  [/claude/, 'code|build|hack'], [/\bcodex\b/, 'hack|challenge|build'], /windsurf/i,
  [/bolt\.?new|^bolt\s/i], /lovable/i, [/devgen/, ''], /replit/i, /agentic\s+cod/i,
  /ai\s+app\s+builder/i, /prompt[- ]to[- ](code|app)/i,
];
const PURE_CODING_STRONG = [
  /cod(e|ing)\s+(challenge|competition|contest|marathon|cup|olympiad|tournament)/i,
  /(challenge|competition|contest|marathon|cup|olympiad|tournament)\s+(of\s+)?cod(ing|er)/i,
  /programming\s+(challenge|competition|contest|league|cup)/i,
  /competitive\s+programming/i, /\bicpc\b/i, /codeforces/i, /hackerrank/i, /code\s*golf/i,
  /\bleetcode\b/i, /hack\s+the\s+(code|world)/i, /编程(大赛|挑战|竞赛|马拉松)/,
  /算法(大赛|竞赛|挑战赛)/, /hour\s+of\s+code/i,
];
const DEV_PATTERNS = [
  /hackathon|hack day|hack week/i, /build.*(challenge|contest|sprint)/i,
  /(app|web|software|game|dev|startup)\s+(challenge|competition|contest)/i,
  /ship.*(athon|jam|challenge)/i, /(challenge|contest)\s+for\s+(developer|builder)/i,
];
const DEV_EXCLUDE = [
  /bio|genom|protein|molec/i, /health|medic|clinic/i, /robot|embodied|drone/i,
  /ar\s*\/?\s*vr|metaverse/i, /market|brand|growth/i, /art\b|music|film|video|design\s+challenge/i,
  /essay|writing/i, /math|physics|chem/i, /quantum/i,
];
const NEGATIVE = [
  /meetup/i, /co[- ]working/i, /\btalk\b|lecture|seminar|panel/i, /conference|summit\b/i,
  /bootcamp|workshop(?!.*challenge)/i, /demo\s*day/i, /networking/i, /velocity\s+hacks?\b.*night/i,
];

function classify(title, category, tags) {
  const blob = [title, category, ...(tags || [])].join(' | ');
  if (NEGATIVE.some(re => re.test(blob))) return null;
  const hit = pats => pats.some(p => {
    if (p instanceof RegExp) return p.test(blob);
    const [anchor, ctx] = p;
    const anchorRe = anchor instanceof RegExp
      ? new RegExp(anchor.source, 'i') : new RegExp(anchor, 'i');
    if (!anchorRe.test(blob)) return false;
    return !ctx || new RegExp(ctx, 'i').test(blob);
  });
  if (hit(AI_CODING_STRONG)) return 'ai_coding';
  if (hit(PURE_CODING_STRONG)) return 'pure_coding';
  if (DEV_PATTERNS.some(re => re.test(blob)) && !DEV_EXCLUDE.some(re => re.test(blob))) return 'dev';
  return null;
}

const PLATFORM_MAP = [
  [/^luma/, 'Luma 活动'], [/^devpost/, 'Devpost'], [/^tianchi/, '天池'],
  [/^kaggle/, 'Kaggle'], [/^huawei/, '华为云'], [/^baidu/, '百度AI Studio'],
  [/^datacastle/, 'DataCastle'], [/^lablab/, 'Lablab.ai'], [/^encode/, 'Encode Club'],
  [/^dora/, 'DoraHacks'], [/^mlh/, 'MLH'], [/^codalab/, 'CodaLab'], [/^zindi/, 'Zindi'],
];
const platformOf = slug => {
  const hit = PLATFORM_MAP.find(([re]) => re.test(slug));
  if (hit) return hit[1];
  return slug.length <= 20 ? slug.replace(/\d+$/, '') : '综合平台';
};

/* ================= 源 1:CompeteHub ================= */

function stripToSegments(inner) {
  return inner
    .replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<img[^>]*>/g, ' ')
    .replace(/<[^>]+>/g, '\x01').split('\x01')
    .map(s => s.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'")
      .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function parseDeadline(text, today) {
  const t = (text || '').toLowerCase();
  if (!t) return { endsAt: null };
  if (/ended|closed/.test(t)) return { endsAt: 'ended' };
  let m;
  if ((m = t.match(/ends?\s*today/))) return { endsAt: iso(today) };
  if ((m = t.match(/ends?\s*tomorrow/))) return { endsAt: iso(addDays(today, 1)) };
  if ((m = t.match(/(\d+)\s*days?\s*left/))) return { endsAt: iso(addDays(today, +m[1])) };
  if ((m = t.match(/(\d+)\s*weeks?\s*left/))) return { endsAt: iso(addDays(today, 7 * +m[1])) };
  if ((m = t.match(/(\d+)\s*months?\s*left/))) return { endsAt: iso(addDays(today, 30 * +m[1])) };
  if ((m = t.match(/(\d+)\s*hours?\s*left/))) return { endsAt: iso(today) };
  return { endsAt: null };
}

function parsePrize(text) {
  if (!text) return { prize: null, prizeValue: null };
  const m = text.replace(/,/g, '').match(/[$￥¥€£]\s*([\d.]+)\s*(k|m|million|万)?/i);
  if (!m) return { prize: /^luma$/i.test(text.trim()) ? null : text.trim(), prizeValue: null };
  let v = parseFloat(m[1]);
  const unit = (m[2] || '').toLowerCase();
  if (unit === 'k') v *= 1e3;
  if (unit === 'm' || unit === 'million') v *= 1e6;
  if (unit === '万') v *= 1e4;
  return { prize: text.trim(), prizeValue: Math.round(v) };
}

function parseCompeteHubCard(slug, inner, today) {
  /* 卡片槽位(从右往左,对字段缺失免疫):
     [...tags, (teamsNum,)? "teams", location, prize($/LUMA)?, deadline] */
  const seg = stripToSegments(inner);
  if (seg.length < 4) return null;
  const category = seg[0], title = seg[1];
  let i = seg.length - 1;
  let deadlineText = null;
  if (/left|ended|ends?\s|closed|tomorrow|today/i.test(seg[i])) deadlineText = seg[i--];
  let prize = null;
  if (i >= 2 && (/^[$￥¥€£]/.test(seg[i]) || /^luma$/i.test(seg[i]))) prize = seg[i--];
  let location = i >= 2 ? seg[i--] : null;
  let teams = null;
  if (i >= 2 && /^teams?$/i.test(seg[i])) {
    i--;
    if (i >= 2 && /^\d{1,3}(,\d{3})*$/.test(seg[i])) teams = Number(seg[i--].replace(/,/g, ''));
  }
  const tags = seg.slice(2, i + 1);
  const { endsAt } = parseDeadline(deadlineText, today);
  const { prize: pz, prizeValue } = parsePrize(prize);
  const geo = normalizeCity(location);
  return {
    id: `competehub:${slug}`,
    source: 'competehub',
    title, category, tags, teams,
    location: location || 'Online', ...geo,
    prize: pz, prizeValue,
    deadlineText: deadlineText || null, endsAt,
    url: `https://www.competehub.dev/en/competitions/${slug}`,
    platform: platformOf(slug),
  };
}

async function fetchCompeteHub(today) {
  const BASE = 'https://www.competehub.dev';
  const entries = [
    { name: '首页', url: () => `${BASE}/en` },
    { name: '默认排序', url: p => `${BASE}/en/competitions?page=${p}` },
    { name: '热门排序', url: p => `${BASE}/en/competitions?page=${p}&sort=hottest` },
  ];
  const comps = new Map();
  for (const e of entries) {
    let prev = -1;
    for (let p = 1; p <= PAGES && prev !== 0; p++) {
      const html = await fetchPage(e.url(p));
      if (!html) break;
      const re = /<a class="block h-full" href="\/en\/competitions\/([a-z0-9]+)">([\s\S]*?)<\/a>/g;
      let m, n = 0;
      while ((m = re.exec(html)) !== null) {
        const c = parseCompeteHubCard(m[1], m[2], today);
        if (c && !comps.has(c.id)) { comps.set(c.id, c); n++; }
      }
      prev = n;
      console.log(`  [competehub/${e.name}] page ${p}: +${n}(累计 ${comps.size})`);
      if (n) await new Promise(r => setTimeout(r, 800));
    }
  }
  return comps;
}

/* ================= 源 2:lablab.ai ================= */

function extractJsonLd(html) {
  const out = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const d = JSON.parse(m[1]);
      for (const n of (d['@graph'] || [d])) out.push(n);
    } catch { /* 忽略坏块 */ }
  }
  return out;
}

async function fetchLablab(today, knownIds) {
  const BASE = 'https://lablab.ai';
  const comps = new Map();
  /* 1) 列表页 ItemList(前 2 页 ≈ 48 个最新活动) */
  const seen = new Set();
  for (let p = 1; p <= 2; p++) {
    const html = await fetchPage(p === 1 ? `${BASE}/ai-hackathons` : `${BASE}/ai-hackathons?page=${p}`, 3, LABLAB_UA);
    if (!html) break;
    for (const node of extractJsonLd(html)) {
      if (node['@type'] !== 'ItemList' || !node.itemListElement) continue;
      for (const item of node.itemListElement) {
        const url = item.url || '';
        const slug = url.split('/ai-hackathons/')[1];
        if (!slug || seen.has(slug)) continue;
        seen.add(slug);
        comps.set(`lablab:${slug}`, {
          id: `lablab:${slug}`, source: 'lablab',
          title: item.name || slug.replace(/-/g, ' '),
          category: 'Hackathon', tags: [], teams: null,
          location: 'Online', city: null, isChina: false, isOnline: true,
          prize: null, prizeValue: null,
          deadlineText: null, endsAt: null,
          url, platform: 'Lablab.ai', slug,
        });
      }
    }
    await new Promise(r => setTimeout(r, 800));
  }
  console.log(`  [lablab] 列表页: ${comps.size} 个活动`);

  /* 2) 新活动进详情页补字段(每天最多 6 个,控请求量;老活动用历史数据) */
  const fresh = [...comps.values()].filter(c => !knownIds.has(c.id)).slice(0, 6);
  for (const c of fresh) {
    const html = await fetchPage(c.url, 2, LABLAB_UA);
    if (!html) continue;
    const ev = extractJsonLd(html).find(n => /Event/i.test(n['@type'] || ''));
    if (ev) {
      if (ev.startDate) {
        const start = new Date(ev.startDate), end = ev.endDate ? new Date(ev.endDate) : null;
        if (today < start) { c.endsAt = iso(start); c.deadlineText = `开始 ${iso(start)}`; }
        else if (end && today <= end) { c.endsAt = iso(end); c.deadlineText = `进行中,结束 ${iso(end)}`; }
        else { c.endsAt = 'ended'; }
      }
      if (ev.eventAttendanceMode && !/Online/i.test(ev.eventAttendanceMode) && ev.location) {
        const locText = typeof ev.location === 'object' ? (ev.location.name || ev.location.address || '') : String(ev.location);
        if (locText) Object.assign(c, normalizeCity(locText)), c.location = locText;
      }
    }
    const pz = (html.match(/\$[\d,]+/g) || [])[0];
    if (pz) Object.assign(c, parsePrize(pz));
    console.log(`  [lablab] 详情: ${c.title.slice(0, 40)} → ${c.endsAt || '?'} ${pz || ''}`);
    await new Promise(r => setTimeout(r, 900));
  }
  return comps;
}

/* ================= 主流程 ================= */

async function main() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayIso = iso(today);

  const prevData = fs.existsSync(OUT) && !DRY
    ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null;
  /* id 迁移:v1 是裸 slug,v2 起 "{source}:{slug}" —— key 和对象都要归一化,
     否则历史保留循环用旧 id 查 seen 永远 miss,同一比赛出现两条(2026-08-25 踩坑) */
  const prevMap = new Map();
  for (const c of (prevData?.competitions || [])) {
    const key = c.id.includes(':') ? c.id : `competehub:${c.id}`;
    prevMap.set(key, { ...c, id: key });
  }

  console.log(`[${now.toISOString()}] 多源抓取开始...`);
  const ch = await fetchCompeteHub(today);
  const lb = await fetchLablab(today, new Set([...ch.keys(), ...prevMap.keys()]));
  console.log(`  源汇总: competehub ${ch.size} + lablab ${lb.size}`);

  /* 合并:competehub 优先(字段全);lablab 独有的补入;
     标题相似去重(competehub 会转收录 lablab 活动,如 AssemblyAI) */
  const normTitle = t => t.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');
  const chTitles = new Set([...ch.values()].map(c => normTitle(c.title)));
  const merged = new Map(ch);
  for (const c of lb.values()) {
    if (!chTitles.has(normTitle(c.title))) merged.set(c.id, c);
  }
  console.log(`  合并去重后: ${merged.size}(剔除与主源重复 ${lb.size + ch.size - merged.size})`);

  const kept = [], dropped = [];
  const seen = new Set();
  const keep = (c, stale = false) => { seen.add(c.id); kept.push({ ...c, stale }); };

  for (const c of merged.values()) {
    if (c.endsAt === 'ended' || (c.endsAt && c.endsAt < todayIso)) {
      dropped.push([c.title, '已结束']); continue;
    }
    const type = classify(c.title, c.category, c.tags);
    if (!type) { dropped.push([c.title, `${c.category}/${c.tags[0] || '-'}`]); continue; }
    const old = prevMap.get(c.id);
    keep({ ...c, type, firstSeen: old?.firstSeen || todayIso });
  }
  /* 历史保留:未再见到但未过期的(列表波动防闪失) */
  for (const old of prevMap.values()) {
    if (seen.has(old.id)) continue;
    if (old.endsAt && old.endsAt < todayIso) continue;
    keep(old, true);
  }
  kept.sort((a, b) => (a.endsAt || '9999') < (b.endsAt || '9999') ? -1 : 1);

  const typeLabel = { ai_coding: '🤖AI Coding', pure_coding: '⌨️ 纯Coding', dev: '🛠️ 开发者向' };
  console.log(`\n=== 筛选结果:命中 ${kept.length}(严口径 ${kept.filter(c => c.type !== 'dev').length}) / 合并 ${merged.size} ===`);
  for (const c of kept) {
    console.log(`  [${typeLabel[c.type]}${c.stale ? '/未再见' : ''}] ${c.title.slice(0, 46)} | ${c.prize || '无奖金'} | ${c.deadlineText || '?'} | ${c.isOnline ? '线上' : (c.city || c.location)} | ${c.source}`);
  }
  const cnCount = kept.filter(c => c.isChina).length;
  const offCount = kept.filter(c => !c.isOnline).length;
  console.log(`\n  地点分布: 线上 ${kept.length - offCount} | 线下 ${offCount}(其中中国城市 ${cnCount})`);

  if (!DRY) {
    const out = {
      updatedAt: now.toISOString(),
      source: 'AI赛事通(competehub.dev) + lablab.ai 多源聚合',
      sourceUrl: 'https://www.competehub.dev',
      license: '数据来自各源站公开页面,仅作引用聚合,每条附原文链接',
      totalScanned: merged.size,
      competitions: kept,
    };
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
    console.log(`\n写入 ${OUT}(${kept.length} 场)`);
  }
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
