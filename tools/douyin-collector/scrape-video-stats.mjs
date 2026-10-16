/**
 * scrape-video-stats.mjs
 *
 * 从抖音创作者中心抓取作品表现数据。
 *
 * 方案（v2，黄金 API）：
 *   导航到数据中心 → 点"投稿列表" → 拦截 item_performance API 响应。
 *   该 API 的每个 item 同时含 item_id + play_count + cover + 完播率/跳出率等，
 *   天然对齐，无需文本匹配，彻底消除封面错配。
 *
 * 产出：
 *   - data/douyin-creator.db 的 video_stats 表（按 item_id 去重，取最新一批）
 *   - data/covers-by-id.json（{item_id: 封面URL}，供 download_covers.py 用）
 *
 * Usage:
 *   npm run scrape:stats [-- --headless]
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { getDb, closeDb } from "./lib/db.mjs";

// ── Configuration ──────────────────────────────────────────────────────────

const DATA_CENTER_URL = "https://creator.douyin.com/creator-micro/data-center/content";
const USER_DATA_DIR = path.resolve(".playwright/douyin-profile");
const GARFISH_LOAD_TIMEOUT_MS = 20000;
const DOWNLOAD_TIMEOUT_MS = 60000;

const HEADLESS = process.argv.includes("--headless");

// 导出数据 = 23548, 20986, 25968, 25454
const CHAR_CODES_EXPORT_DATA = [23548, 20986, 25968, 25454];

// charCode helpers for finding UI elements by Chinese text
function charCodesMatch(text, codes) {
  if (!text) return false;
  const chars = [...text.trim()];
  if (chars.length < codes.length) return false;
  for (let i = 0; i <= chars.length - codes.length; i++) {
    let match = true;
    for (let j = 0; j < codes.length; j++) {
      if (chars[i + j].charCodeAt(0) !== codes[j]) { match = false; break; }
    }
    if (match) return true;
  }
  return false;
}

// 投稿列表 / 刷新数据 的 charCode
const CHAR_CODES_SUBMISSION_LIST = [25237, 31295, 21015, 34920];
const CHAR_CODES_REFRESH_DATA = [21047, 26032, 25968, 25454];

/**
 * 优先匹配最具体（文本最短、子元素最少）的可见元素并点击。
 */
async function clickElementByCharCodes(page, charCodes, label, timeoutMs = 10000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const clicked = await page.evaluate((codes) => {
      const elements = document.querySelectorAll("div, button, span, a, li, tab, label");
      const candidates = [];
      for (const el of elements) {
        if (!el.offsetParent) continue;
        const text = (el.textContent || "").trim();
        if (!text) continue;
        const chars = [...text];
        let match = false;
        for (let i = 0; i <= chars.length - codes.length; i++) {
          let ok = true;
          for (let j = 0; j < codes.length; j++) {
            if (chars[i + j].charCodeAt(0) !== codes[j]) { ok = false; break; }
          }
          if (ok) { match = true; break; }
        }
        if (match) {
          candidates.push({ el, textLen: text.length, childCount: el.children.length, text: text.slice(0, 40) });
        }
      }
      if (candidates.length === 0) return null;
      candidates.sort((a, b) => a.textLen - b.textLen || a.childCount - b.childCount);
      candidates[0].el.click();
      return candidates[0].text;
    }, charCodes).catch(() => null);

    if (clicked) {
      console.log(`[scrape] Clicked "${label}": "${clicked}"`);
      return true;
    }
    await page.waitForTimeout(500);
  }
  console.warn(`[scrape] Could not find "${label}" within ${timeoutMs}ms`);
  return false;
}

async function waitForGarfishLoad(page, timeoutMs = GARFISH_LOAD_TIMEOUT_MS) {
  console.log("[scrape] Waiting for Garfish micro-frontend to load...");
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const loaded = await page.evaluate(() => {
      const garfishContainers = document.querySelectorAll("[id*='garfish']");
      for (const c of garfishContainers) {
        if ((c.innerText || "").length > 200) return true;
      }
      const tabs = document.querySelectorAll('[role="tab"], .semi-tabs-tab');
      if (tabs.length >= 2) return true;
      return false;
    }).catch(() => false);
    if (loaded) {
      console.log("[scrape] Garfish loaded successfully");
      return true;
    }
    await page.waitForTimeout(500);
  }
  const bodyLen = await page.evaluate(() => document.body.innerText.length).catch(() => 0);
  if (bodyLen < 200) {
    throw new Error("Garfish did not load — login session may be expired. Re-login via: npm run auth");
  }
  console.warn(`[scrape] Garfish load timeout (${timeoutMs}ms), proceeding anyway...`);
  return false;
}

// ── xlsx 导出（补充互动数据：点赞/评论/收藏/转发/分享/新增粉丝）─────────────
// item_performance API 不返回互动字段，通过抖音创作者中心的"导出数据"按钮
// 下载 xlsx，里面含完整互动数据，按 title 与 API 数据合并。

function normalizeNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const wanMatch = value.match(/([\d.]+)\s*万/);
    if (wanMatch) return Math.round(parseFloat(wanMatch[1]) * 10000);
    const cleaned = value.replace(/[,%]/g, "").trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

function normalizePercent(value) {
  // xlsx 完播率/跳出率可能是 "38.4%" 或 0.384，统一转成 0~1 的小数
  if (typeof value === "number") {
    return value > 1 ? value / 100 : value;
  }
  if (typeof value === "string") {
    const cleaned = value.replace(/%/g, "").trim();
    const num = parseFloat(cleaned);
    if (isNaN(num)) return 0;
    return num > 1 ? num / 100 : num;
  }
  return 0;
}

async function interceptExportDownload(page, triggerClick) {
  console.log("[scrape] Waiting for export download...");
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: DOWNLOAD_TIMEOUT_MS }),
    triggerClick(),
  ]);
  const suggestedName = download.suggestedFilename();
  console.log(`[scrape] Download triggered: ${suggestedName}`);
  // 登录失效时抖音可能返回 JSON 错误而非 xlsx
  if (suggestedName.endsWith(".json") || suggestedName.endsWith(".txt")) {
    const tmpPath = await download.path();
    if (tmpPath) {
      try {
        const content = fs.readFileSync(tmpPath, "utf8");
        const parsed = JSON.parse(content);
        if (parsed?.BaseResp?.StatusCode === 8) {
          throw new Error("Login session expired (JSON error response). Please re-login.");
        }
      } catch (parseErr) {
        if (parseErr.message.includes("Login session expired")) throw parseErr;
      }
    }
    throw new Error(`Expected xlsx download but got: ${suggestedName}`);
  }
  const savePath = path.resolve("data/latest-export.xlsx");
  await download.saveAs(savePath);
  console.log(`[scrape] Saved download to: ${savePath}`);
  return savePath;
}

async function parseXlsx(filePath) {
  // xlsx 是纯 CJS 包，.mjs 里用 createRequire 加载（import 会报 ERR_MODULE_NOT_FOUND）
  const { createRequire } = await import("node:module");
  const require = createRequire(import.meta.url);
  const XLSX = require("xlsx");
  const buf = fs.readFileSync(filePath);
  const workbook = XLSX.read(buf, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  console.log(`[scrape] Parsed ${rows.length} rows from sheet "${sheetName}"`);
  return rows;
}

/**
 * 把 xlsx 行映射成 {title, likes, comments, shares, favorites, ...}。
 * xlsx 列名可能随抖音版本变化，按常见命名兜底。
 */
function mapXlsxRowToInteraction(row) {
  const title = (row["作品名称"] || row["作品标题"] || row["标题"] || row["视频标题"] || row["title"] || "").toString();
  // title 在 xlsx 里可能是完整文案，取首行做匹配键（与 make_daily_snapshot 的 clean_title 口径一致）
  const matchKey = title.split(/[\n———————————————]+/)[0].trim().slice(0, 30);
  // xlsx 是抖音创作者中心导出的权威全量数据，含播放量/完播率/互动/涨粉等全部字段。
  // 实测 xlsx 数据比 item_performance API 更新更准（API 对新视频播放量有延迟，如江南大学
  // xlsx 显示 1.3万 而 API 只给 23），所以这里返回全量字段，优先级高于 API。
  return {
    matchKey,
    title,                                    // xlsx 原始标题（完整文案）
    publish_date: row["发布时间"] || row["发布日期"] || "",
    plays: normalizeNumber(row["播放量"] || row["播放数"] || row["plays"] || 0),
    avg_duration_sec: normalizeNumber(row["平均播放时长"] || row["平均播放时长(秒)"] || 0),
    completion_rate_5s: normalizePercent(row["5s完播率"] || row["5秒完播率"] || 0),
    bounce_rate_2s: normalizePercent(row["2s跳出率"] || 0),
    finish_rate: normalizePercent(row["完播率"] || 0),
    // 互动字段
    likes: normalizeNumber(row["点赞量"] || row["点赞数"] || row["点赞"] || row["likes"] || 0),
    comments: normalizeNumber(row["评论量"] || row["评论数"] || row["评论"] || row["comments"] || 0),
    shares: normalizeNumber(row["分享量"] || row["分享数"] || row["分享"] || row["shares"] || 0),
    favorites: normalizeNumber(row["收藏量"] || row["收藏数"] || row["收藏"] || row["favorites"] || 0),
    danmaku: normalizeNumber(row["弹幕数"] || row["弹幕"] || row["danmaku"] || 0),
    profile_visits: normalizeNumber(row["主页访问量"] || row["主页访问"] || 0),
    follower_gain: normalizeNumber(row["粉丝增量"] || row["新增粉丝"] || row["涨粉数"] || 0),
  };
}

/**
 * 从 xlsx 行构建 title→互动数据 的映射（用于与 API 数据按 title 合并）。
 */
export function buildInteractionMapFromXlsx(rows) {
  const map = new Map();
  for (const row of rows) {
    const inter = mapXlsxRowToInteraction(row);
    if (inter.matchKey) {
      // 同一 title 取互动数据总和最大的（避免覆盖）
      const existing = map.get(inter.publish_date + "|" + inter.matchKey);
      if (!existing || (inter.likes + inter.favorites) > (existing.likes + existing.favorites)) {
        map.set(inter.publish_date + "|" + inter.matchKey, inter);
      }
    }
  }
  return map;
}

/**
 * 把 API 的 title 转成与 xlsx 一致的匹配键。
 */
function titleToMatchKey(title) {
  return (title || "").toString().split(/[\n———————————————]+/)[0].trim().slice(0, 30);
}

export function matchInteraction(row, interactionMap) {
  if (!interactionMap) return null;
  const minute = value => String(value || "").replace("T", " ").slice(0, 16);
  const candidates = [...interactionMap.values()];
  const date = minute(row.publish_time);
  const dated = date ? candidates.filter(x => minute(x.publish_date) === date) : [];
  if (dated.length === 1) return dated[0];
  const titled = candidates.filter(x => x.matchKey === titleToMatchKey(row.title));
  return titled.length === 1 && (!date || !titled[0].publish_date || minute(titled[0].publish_date) === date) ? titled[0] : null;
}

// ── 数据存储 ────────────────────────────────────────────────────────────────

/**
 * 把黄金 API 的 items 存入 video_stats。
 * 按 item_id 去重，同一批次用相同 timestamp。
 * interactionMap（可选）：title匹配键→互动数据，用于补充点赞/收藏/转发等
 *   （item_performance API 不返回互动字段，需从 xlsx 导出补充）。
 */
function storeVideoStatsFromApi(items, batchTimestamp, interactionMap) {
  const db = getDb();
  const insert = db.prepare(`
    INSERT INTO video_stats
      (timestamp, title, publish_date, item_id, plays, avg_duration_sec, ctr, completion_rate_5s, bounce_rate_2s, finish_rate,
       likes, comments, shares, favorites, danmaku, status, profile_visits, follower_gain)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seen = new Set();
  let count = 0;
  let matchedInteraction = 0;
  let usedXlsxPlays = 0;
  const insertBatch = db.transaction((rows) => {
    for (const r of rows) {
      const iid = String(r.item_id);
      if (seen.has(iid)) continue;
      seen.add(iid);

      // 按 title 匹配键查找 xlsx 数据（含播放量/完播率/互动，权威度高于 API）
      const key = titleToMatchKey(r.title);
      const xlsx = matchInteraction(r, interactionMap);
      if (xlsx && (xlsx.likes || xlsx.favorites || xlsx.comments || xlsx.shares || xlsx.plays)) {
        matchedInteraction++;
      }
      // xlsx 播放量优先（API 对新视频有延迟，如江南大学 xlsx 1.3万 vs API 23）
      const plays = xlsx && xlsx.plays ? xlsx.plays : (parseInt(r.play_count, 10) || 0);
      if (xlsx && xlsx.plays && xlsx.plays !== (parseInt(r.play_count, 10) || 0)) usedXlsxPlays++;

      insert.run(
        batchTimestamp,
        (xlsx && xlsx.title) ? xlsx.title : (r.title || `作品${iid}`),
        (xlsx && xlsx.publish_date) ? xlsx.publish_date : (r.publish_time || ""),
        iid,
        plays,
        (xlsx && xlsx.avg_duration_sec) ? xlsx.avg_duration_sec : (parseFloat(r.average_play_duration) || 0),
        0, // ctr
        (xlsx && xlsx.completion_rate_5s) ? xlsx.completion_rate_5s : (parseFloat(r.completion_rate_5s) || 0),
        (xlsx && xlsx.bounce_rate_2s) ? xlsx.bounce_rate_2s : (parseFloat(r.bounce_rate_2s) || 0),
        (xlsx && xlsx.finish_rate) ? xlsx.finish_rate : (parseFloat(r.completion_rate_5s) || 0),
        xlsx ? xlsx.likes : 0,
        xlsx ? xlsx.comments : 0,
        xlsx ? xlsx.shares : 0,
        xlsx ? xlsx.favorites : 0,
        xlsx ? xlsx.danmaku : 0,
        "公开",
        xlsx ? xlsx.profile_visits : 0,
        xlsx ? xlsx.follower_gain : 0
      );
      count++;
    }

    // xlsx 里 API 没覆盖到的作品（API 只返回部分），也入库（item_id 用标题 hash 兜底）
    if (interactionMap) {
      for (const [key, xlsx] of interactionMap.entries()) {
        // 检查这个 xlsx 作品是否已被上面的 API 循环处理（按 title 键）
        const alreadyCovered = rows.some(r => matchInteraction(r, interactionMap) === xlsx);
        if (alreadyCovered) continue;
        // 只入有播放量的（避免空行）
        if (!xlsx.plays) continue;
        insert.run(
          batchTimestamp,
          xlsx.title || key,
          xlsx.publish_date || "",
          "xlsx_" + createHash("sha256").update(key).digest("hex").slice(0, 20), // 无 item_id，用前缀兜底（封面靠 make_daily_snapshot 的 cover map）
          xlsx.plays,
          xlsx.avg_duration_sec || 0,
          0,
          xlsx.completion_rate_5s || 0,
          xlsx.bounce_rate_2s || 0,
          xlsx.finish_rate || 0,
          xlsx.likes, xlsx.comments, xlsx.shares, xlsx.favorites,
          xlsx.danmaku, "公开", xlsx.profile_visits, xlsx.follower_gain
        );
        count++;
      }
    }
  });
  insertBatch(items);
  if (interactionMap) {
    console.log(`[scrape] xlsx 数据匹配: ${matchedInteraction}/${count} 作品, 其中 ${usedXlsxPlays} 个用 xlsx 播放量覆盖了 API`);
  }
  return count;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[scrape] Starting video stats scrape via golden API (headless: ${HEADLESS})`);

  fs.mkdirSync("data", { recursive: true });

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: HEADLESS,
    viewport: null,
    acceptDownloads: true,
  });

  const page = context.pages()[0] || await context.newPage();

  // 累积黄金 API 的所有 items（可能多次响应：默认范围 + 滚动/翻页触发）
  const collectedItems = new Map(); // item_id -> item（去重）
  const coversById = {}; // item_id -> 封面 URL

  page.on("response", async (response) => {
    const url = response.url();
    if (!url.includes("item_performance")) return;
    if (response.status() !== 200) return;
    try {
      const ct = response.headers()["content-type"] || "";
      if (!ct.includes("json")) return;
      const body = await response.json();
      if (body.status_code !== undefined && body.status_code !== 0) return;
      const items = Array.isArray(body.items) ? body.items : [];
      if (!items.length) return;
      for (const it of items) {
        if (!it.item_id) continue;
        collectedItems.set(String(it.item_id), it);
        const coverUrls = it?.cover?.url_list;
        if (coverUrls && coverUrls.length > 0) {
          coversById[String(it.item_id)] = coverUrls[0];
        }
      }
      console.log(`[scrape] 拦截 item_performance: +${items.length} (累计 ${collectedItems.size})`);
    } catch {
      // 响应已消费或非 JSON，忽略
    }
  });

  try {
    // 导航到数据中心
    console.log(`[scrape] Navigating to ${DATA_CENTER_URL}`);
    await page.goto(DATA_CENTER_URL, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Wait for validated data, not a micro-frontend shell or fixed sleep.
    const waitForItems = async timeoutMs => {
      const deadline = Date.now() + timeoutMs;
      while (!collectedItems.size && Date.now() < deadline) await page.waitForTimeout(500);
      return collectedItems.size > 0;
    };
    if (!await waitForItems(45000)) {
      const text = await page.locator("body").innerText();
      if (/扫码登录|验证码登录|登录抖音/.test(text) || /\/login(?:[/?]|$)/.test(page.url())) {
        throw new Error("LOGIN_EXPIRED: 登录页已确认，请重新登录创作者中心");
      }
      await clickElementByCharCodes(page, CHAR_CODES_SUBMISSION_LIST, "投稿列表", 10000);
      if (!await waitForItems(30000)) throw new Error("API_TIMEOUT: 已等待有效统计响应 75 秒，请检查页面或网络；未确认登录失效");
    }
    console.log("[scrape] Effective publication range: " + JSON.stringify(await page.locator('input[placeholder*=日期]').evaluateAll(es => es.map(e => e.value))));

    // The analysis tab exports a one-row overview, not per-work metrics.
    await page.getByText("投稿列表", { exact: true }).click({ timeout: 15000 });
    await page.getByText("刷新数据", { exact: true }).waitFor({ timeout: 30000 });
    await page.waitForTimeout(2000);

    // 滚动表格区域，尝试触发更多分页加载（若后台支持）
    for (let i = 0; i < 6; i++) {
      const before = collectedItems.size;
      await page.evaluate(() => {
        const scrollables = document.querySelectorAll("[class*=table-body], [class*=scroll], [class*=list-container]");
        for (const s of scrollables) {
          if (s.scrollHeight > s.clientHeight) { s.scrollTop = s.scrollHeight; break; }
        }
      });
      await page.waitForTimeout(2000);
      if (collectedItems.size === before) {
        // 连续两次无新增，认为已到底
        if (i >= 1) break;
      }
    }

    if (collectedItems.size === 0) {
      throw new Error("未拦截到 item_performance 数据（可能登录失效或页面结构变化）");
    }

    const allItems = [...collectedItems.values()];
    const batchTs = new Date().toISOString();

    // ── 额外：触发"导出数据"拿互动字段（点赞/收藏/转发/评论/分享/新增粉丝）──
    // item_performance API 不返回这些，必须从 xlsx 导出补充。失败不阻断主流程
    // （完播率等核心数据已拿到），只是互动字段为 0。
    let interactionMap = null;
    try {
      const xlsxPath = await interceptExportDownload(page, async () => {
        await clickElementByCharCodes(page, CHAR_CODES_EXPORT_DATA, "导出数据", 10000);
      });
      const xlsxRows = await parseXlsx(xlsxPath);
      interactionMap = buildInteractionMapFromXlsx(xlsxRows);
      if (!interactionMap.size) throw new Error("导出文件不含作品明细，拒绝写入空互动数据");
      console.log(`[scrape] xlsx 互动数据: ${interactionMap.size} 条`);
      try { fs.unlinkSync(xlsxPath); } catch { /* cleanup */ }
    } catch (exportErr) {
      throw new Error(`EXPORT_FAILED: ${exportErr.message}`);
    }

    const count = storeVideoStatsFromApi(allItems, batchTs, interactionMap);

    // 写封面映射（按 item_id）
    const coverCount = Object.keys(coversById).length;
    if (coverCount > 0) {
      fs.writeFileSync("data/covers-by-id.json", JSON.stringify(coversById, null, 2), "utf8");
    }

    console.log(`\n[scrape] ✅ Done! Stored ${count} video records (from ${allItems.length} API items).`);
    console.log(`[scrape] Covers: ${coverCount} URLs → data/covers-by-id.json`);
  } catch (error) {
    console.error(`\n[scrape] ❌ Failed: ${error.message}`);
    console.error("[scrape] Diagnostic: " + JSON.stringify({url: page.url(), text: (await page.locator("body").innerText().catch(() => "")).slice(0, 800)}));
    if (error.message.includes("expired") || error.message.includes("登录")) {
      console.error("[scrape] → Please re-login via: npm run auth");
    }
    process.exitCode = 1;
  } finally {
    await context.close();
    closeDb();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();

