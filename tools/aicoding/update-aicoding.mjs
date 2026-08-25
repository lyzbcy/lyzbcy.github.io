#!/usr/bin/env node
/**
 * AI Coding 比赛看板 — 抓取与筛选管线
 * 数据源:AI赛事通 competehub.dev(robots 允许抓列表页;每条数据注明来源)
 * 零依赖,Node >= 20.11(import.meta.dirname;服务器 v22 已验证)
 *
 * 用法(在博客仓库任意位置):
 *   node tools/aicoding/update-aicoding.mjs           # 抓取+筛选,写 assets/data/aicoding.json
 *   node tools/aicoding/update-aicoding.mjs --pages 8 # 多翻几页(默认 6)
 *   node tools/aicoding/update-aicoding.mjs --dry     # 只打印,不写文件
 */

import fs from 'node:fs';
import path from 'node:path';

const BASE = 'https://www.competehub.dev';
const PAGES = Number(process.argv.includes('--pages')
  ? process.argv[process.argv.indexOf('--pages') + 1] : 6);
const DRY = process.argv.includes('--dry');
const OUT = path.join(import.meta.dirname, '..', '..', 'assets', 'data', 'aicoding.json');

const UA = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

/* ---------------- 抓取 ---------------- */

async function fetchPage(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: UA });
      if (res.status === 200) return await res.text();
      console.error(`  [warn] ${url} -> HTTP ${res.status}(第${i + 1}次)`);
    } catch (e) {
      console.error(`  [warn] ${url} -> ${e.message}(第${i + 1}次)`);
    }
    await new Promise(r => setTimeout(r, 2000 * (i + 1)));
  }
  return null;
}

/* ---------------- 解析 ---------------- */

function stripToSegments(inner) {
  return inner
    .replace(/<svg[\s\S]*?<\/svg>/g, ' ')
    .replace(/<img[^>]*>/g, ' ')
    .replace(/<[^>]+>/g, '\x01')
    .split('\x01')
    .map(s => s.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'")
      .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function parseDeadline(text, today) {
  /* 返回 { endsAt:'YYYY-MM-DD' | 'ended' | null } */
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

function parseCard(slug, inner, today) {
  /* 卡片槽位(从右往左,对字段缺失免疫):
     [...tags, (teamsNum,)? "teams", location, prize($/LUMA)?, deadline]
     注:teams 数字段可缺,Luma 活动无奖金只有 "LUMA" 标记 */
  const seg = stripToSegments(inner);
  if (seg.length < 4) return null;
  const category = seg[0];
  const title = seg[1];
  let i = seg.length - 1;

  /* 槽1:deadline(最后一段,可能没有) */
  let deadlineText = null;
  if (/left|ended|ends?\s|closed|tomorrow|today/i.test(seg[i])) deadlineText = seg[i--];
  /* 槽2:prize($ 开头或 LUMA;可能没有) */
  let prize = null;
  if (i >= 2 && (/^[$￥¥€£]/.test(seg[i]) || /^luma$/i.test(seg[i]))) prize = seg[i--];
  /* 槽3:location */
  let location = i >= 2 ? seg[i--] : null;
  /* 槽4:"teams" 词 + 数字 */
  let teams = null;
  if (i >= 2 && /^teams?$/i.test(seg[i])) {
    i--;
    if (i >= 2 && /^\d{1,3}(,\d{3})*$/.test(seg[i])) teams = Number(seg[i--].replace(/,/g, ''));
  }
  const tags = seg.slice(2, i + 1);

  const { endsAt } = parseDeadline(deadlineText, today);
  const { prize: pz, prizeValue } = parsePrize(prize);
  return {
    id: slug,
    title, category, tags, teams,
    location: location || 'Online',
    prize: pz, prizeValue,
    deadlineText: deadlineText || null,
    endsAt,
    url: `${BASE}/en/competitions/${slug}`,
  };
}

/* ---------------- 严口径筛选(纯 AI Coding + 纯 Coding) ---------------- */
/* 打分制:强信号直接分类;负信号(meetup/讲座类活动)直接毙 */

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
/* 负信号:线下活动/讲座/共创会,不是比赛 */
const NEGATIVE = [
  /meetup/i, /co[- ]working/i, /\btalk\b|lecture|seminar|panel/i, /conference|summit\b/i,
  /bootcamp|workshop(?!.*challenge)/i, /demo\s*day/i, /networking/i, /velocity\s+hacks?\b.*night/i,
];

/* 开发者向(宽口径二级区):不属严口径,但明显是"写代码/做产品"的比赛 */
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
function classify(comp) {
  const blob = [comp.title, comp.category, ...(comp.tags || [])].join(' | ');
  if (NEGATIVE.some(re => re.test(blob))) return null;
  /* 强信号里数组型 = [锚词, 语境词]:锚词命中后还须同串出现语境词(防 bolt/devgen 这类短词误伤) */
  const hit = pats => pats.some(p => {
    if (p instanceof RegExp) return p.test(blob);
    const [anchor, ctx] = p;
    /* 锚正则统一补 i 标志(防止 /\bcursor\b/ 匹配不了大写 Cursor 这类手滑) */
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

/* ---------------- 工具 ---------------- */

const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const iso = d => d.toISOString().slice(0, 10);

const PLATFORM_MAP = [
  [/^luma/, 'Luma 活动'], [/^devpost/, 'Devpost'], [/^tianchi/, '天池'],
  [/^kaggle/, 'Kaggle'], [/^huawei/, '华为云'], [/^baidu/, '百度AI Studio'],
  [/^datacastle/, 'DataCastle'], [/^lablab/, 'Lablab.ai'], [/^encode/, 'Encode Club'],
  [/^dora/, 'DoraHacks'], [/^mlh/, 'MLH'], [/^codalab/, 'CodaLab'], [/^zindi/, 'Zindi'],
];
const platformOf = slug => {
  const hit = PLATFORM_MAP.find(([re]) => re.test(slug));
  if (hit) return hit[1];
  /* 未识别且 slug 是长 hash → 显示通用名,别把原始 hash 露给用户 */
  return slug.length <= 20 ? slug.replace(/\d+$/, '') : '综合平台';
};

/* ---------------- 主流程 ---------------- */

async function main() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  /* 多入口抓取:列表页翻页重复率高,靠首页+默认排序+hottest 排序互补 */
  const entries = [
    { name: '首页', url: p => `${BASE}/en` },
    { name: '默认排序', url: p => `${BASE}/en/competitions?page=${p}` },
    { name: '热门排序', url: p => `${BASE}/en/competitions?page=${p}&sort=hottest` },
  ];
  const comps = new Map();
  const scanUrl = async (name, url) => {
    const html = await fetchPage(url);
    if (!html) return 0;
    const re = /<a class="block h-full" href="\/en\/competitions\/([a-z0-9]+)">([\s\S]*?)<\/a>/g;
    let m, n = 0;
    while ((m = re.exec(html)) !== null) {
      const c = parseCard(m[1], m[2], today);
      if (c && !comps.has(c.id)) { comps.set(c.id, c); n++; }
    }
    return n;
  };
  for (const e of entries) {
    let prev = -1;
    for (let p = 1; p <= PAGES && prev !== 0; p++) {
      prev = await scanUrl(e.name, e.url(p));
      console.log(`  [${e.name}] page ${p}: +${prev}(累计 ${comps.size})`);
      if (prev) await new Promise(r => setTimeout(r, 800));
    }
  }

  /* 筛选:未结束 + 分类(严口径/开发者向) */
  const todayIso = iso(today);
  const prevData = fs.existsSync(OUT) && !DRY
    ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null;
  const prevMap = new Map((prevData?.competitions || []).map(c => [c.id, c]));
  const seen = new Set();
  const kept = [], dropped = [];
  const keep = (c, stale = false) => { seen.add(c.id); kept.push({ ...c, stale }); };

  for (const c of comps.values()) {
    if (c.endsAt === 'ended' || (c.endsAt && c.endsAt < todayIso)) {
      dropped.push([c.title, '已结束']); continue;
    }
    const type = classify(c);
    if (!type) { dropped.push([c.title, `${c.category}/${c.tags[0] || '-'}`]); continue; }
    const old = prevMap.get(c.id);
    keep({
      ...c, type, platform: platformOf(c.id),
      firstSeen: old?.firstSeen || todayIso,
    });
  }
  /* 列表页内容会波动:旧库里未过期的比赛保留(标 stale,页面降权展示) */
  for (const old of prevMap.values()) {
    if (seen.has(old.id)) continue;
    if (old.endsAt && old.endsAt < todayIso) continue;
    keep(old, true);
  }
  kept.sort((a, b) => (a.endsAt || '9999') < (b.endsAt || '9999') ? -1 : 1);

  const typeLabel = { ai_coding: '🤖AI Coding', pure_coding: '⌨️ 纯Coding', dev: '🛠️ 开发者向' };
  console.log(`\n=== 筛选结果:命中 ${kept.length}(严口径 ${kept.filter(c => c.type !== 'dev').length}) / 总计 ${comps.size} ===`);
  for (const c of kept) {
    console.log(`  [${typeLabel[c.type]}${c.stale ? '/未再见' : ''}] ${c.title} | ${c.prize || '无奖金'} | ${c.deadlineText || '?'} | ${c.location}`);
  }
  console.log(`\n--- 落选示例(前 15) ---`);
  for (const [t, r] of dropped.slice(0, 15)) console.log(`  ✗ ${t} (${r})`);

  if (!DRY) {
    const out = {
      updatedAt: now.toISOString(),
      source: 'AI赛事通 (competehub.dev)',
      sourceUrl: BASE,
      license: '数据来源competehub.dev公开列表页,仅作引用聚合,每条附原文链接',
      totalScanned: comps.size,
      competitions: kept,
    };
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
    console.log(`\n写入 ${OUT}(${kept.length} 场)`);
  }
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
