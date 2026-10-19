#!/usr/bin/env node
/**
 * collect-unreplied.mjs — 逐作品采集抖音未回复评论
 *
 * 用法：
 *   node src/collect-unreplied.mjs [options]
 *
 * 选项：
 *   --works <path>    作品列表 JSON 路径（默认 comments-output/list-works.json）
 *   --out <path>      输出文件路径（默认 comments-output/unreplied-latest.json）
 *   --limit <n>       每个作品最多采集条数（默认 50）
 *   --max-works <n>   可选调试上限（默认不限）
 *   --days <n>        近 n 个上海自然日（默认 30，含今天）
 *   --headless        无头模式运行（默认启用）
 *   --no-headless     显示浏览器窗口（调试用）
 *
 * 输出：
 *   - stdout：逐作品采集进度
 *   - 文件：JSON 格式的未回复评论列表
 *
 * 退出码：
 *   0  正常完成
 *   1  参数错误或文件系统错误
 *   2  登录态失效（需手动登录）
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { selectRecentWorks } from './lib/recent-works.mjs';
import { COMMENT_LIST_PATH, fetchUnrepliedViaApi, requestHeadersForApi } from './lib/comment-api.mjs';
import { launchPersistentPage, DEFAULT_COMMENT_PAGE_URL, DEFAULT_USER_DATA_DIR } from './douyin-browser.mjs';
import { ensureCommentPageReady } from './lib/comment-page.mjs';
import { findTargetWorkWithRetry } from './lib/works-panel.mjs';
import { collectComments, hasCommentStatusFilter, applyUnrepliedCommentsFilter } from './lib/comment-ops.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Parse CLI args
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = { headless: true, limit: 50, maxWorks: null, days: 30 };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--works') args.worksPath = argv[++i];
    else if (arg === '--out') args.outPath = argv[++i];
    else if (arg === '--days') args.days = Number(argv[++i]);
    else if (arg === '--diagnostic-out') args.diagnosticPath = argv[++i];
    else if (arg === '--dom-only') args.domOnly = true;
    else if (arg === '--select-only') args.selectOnly = true;
    else if (arg === '--limit') args.limit = parseInt(argv[++i], 10);
    else if (arg === '--max-works') args.maxWorks = parseInt(argv[++i], 10);
    else if (arg === '--headless') args.headless = true;
    else if (arg === '--no-headless') args.headless = false;
    else if (arg === '--help' || arg === '-h') {
      console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf-8').match(/\/\*\*([\s\S]*?)\*\//)[1].replace(/^ \* ?/gm, ''));
      process.exit(0);
    }
  }
  args.worksPath = args.worksPath || path.join(PROJECT_ROOT, 'comments-output', 'list-works.json');
  args.outPath = args.outPath || path.join(PROJECT_ROOT, 'comments-output', 'unreplied-latest.json');
  return args;
}

// ---------------------------------------------------------------------------
// Login check — detect Mode A / Mode B expiration
// ---------------------------------------------------------------------------
function isLoginExpired(pageUrl) {
  return /login|passport/i.test(pageUrl);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv);

  // Validate works file
  if (!fs.existsSync(args.worksPath)) {
    console.error(`ERROR: 作品列表不存在: ${args.worksPath}`);
    console.error('请先运行: npm run works -- --headless');
    process.exit(1);
  }

  const worksData = JSON.parse(fs.readFileSync(args.worksPath, 'utf-8'));
  const selection = selectRecentWorks(worksData.works || [], { days: args.days, maxWorks: args.maxWorks });
  const works = selection.works;
  const checkCount = works.length;

  console.log('SCOPE: ' + JSON.stringify(selection.meta));
  if (args.selectOnly) return;
  const workResults = [];
  const saveOutput = (comments, extra = {}) => {
    fs.mkdirSync(path.dirname(args.outPath), {recursive: true});
    fs.writeFileSync(args.outPath, JSON.stringify({count: comments.length, comments, selection: selection.meta, workResults, ...extra}, null, 2));
  };
  if (!checkCount) { saveOutput([]); return; }

  const { context, page } = await launchPersistentPage({
    userDataDir: DEFAULT_USER_DATA_DIR,
    headless: args.headless,
  });

  const allUnreplied = [];
  const trace = [];
  const pending = new Set();
  const cachePath = path.join(PROJECT_ROOT, 'data', 'comment-work-id-cache.json');
  let cache = {};
  try { cache = JSON.parse(fs.readFileSync(cachePath, 'utf8')).ids || {}; } catch {}
  let activeWorkKey = null;
  let templateUrl = null;
  let templateHeaders = {};
  let apiDisabled = false;
  const requestKeys = new WeakMap();
  const observations = new Map();
  page.on('request', request => requestKeys.set(request, activeWorkKey));
  page.on('response', response => {
    const u = new URL(response.url());
    if (u.origin !== 'https://creator.douyin.com' || !u.pathname.includes('comment')) return;
    const task = (async () => {
      try {
        const body = await response.json();
        const key = requestKeys.get(response.request());
        if (u.pathname === COMMENT_LIST_PATH && body.status_code === 0) {
          const id = u.searchParams.get('aweme_id');
          if (key && /^\d+$/.test(id || '')) {
            const ids = observations.get(key) || new Set();ids.add(id);observations.set(key, ids);
          }
          const template = new URL(response.url());
          template.searchParams.set('comment_select_options', '0,not_replied');
          templateUrl = template.href;
          templateHeaders = requestHeadersForApi(await response.request().allHeaders());
        }
        if (args.diagnosticPath) trace.push({path:u.pathname, method:response.request().method(), workKey:key, query:Object.fromEntries([...u.searchParams].filter(([k])=>!/token|signature|bogus|verify/i.test(k))), body});
      } catch {}
    })();
    pending.add(task);task.finally(()=>pending.delete(task));
  });
  let loginExpired = false;

  try {
    await ensureCommentPageReady(page, DEFAULT_COMMENT_PAGE_URL, {
      navigationTimeoutMs: 60000,
      uiTimeoutMs: 30000,
    });

    // Check login status after navigation
    if (isLoginExpired(page.url())) {
      console.error('LOGIN_EXPIRED: 登录态已失效，请手动登录');
      loginExpired = true;
      return;
    }

    for (let i = 0; i < checkCount; i++) {
      const title = works[i].title || '';
      const short = title.length > 25 ? title.slice(0, 25) + '...' : title;
      process.stdout.write(`[${i + 1}/${checkCount}] ${short}: `);

      const workKey = JSON.stringify([title, works[i].publishText || works[i].publish_time || '']);
      activeWorkKey = workKey;
      try {
        let result = null;
        const tryApi = async () => {
          if (args.domOnly || apiDisabled || !templateUrl || !cache[workKey]) return null;
          try {
            return await fetchUnrepliedViaApi(context.request, templateUrl, cache[workKey], {limit:args.limit, headers:templateHeaders});
          } catch (error) {
            if (/LOGIN_EXPIRED/.test(error.message)) throw error;
            apiDisabled = true;
            console.log('[API fallback] ' + error.message.slice(0, 120));
            return null;
          }
        };
        result = await tryApi();
        if (!result) {
          await findTargetWorkWithRetry(page, {
            workTitle: title, workPublishText: works[i].publishText,
            selectWhenMatched: true, timeoutMs:25000, idleMs:2000, uiTimeoutMs:15000,
          });
          await page.waitForTimeout(1500);
          const filterAvailable = await hasCommentStatusFilter(page, {timeoutMs:30000,uiTimeoutMs:8000});
          if (!filterAvailable) {
            workResults.push({title,status:'unsupported_filter'});
            console.log('跳过(旧作品不支持未回复筛选)');
            continue;
          }
          const applied = await applyUnrepliedCommentsFilter(page, {timeoutMs:30000,uiTimeoutMs:8000});
          if (!applied.applied) throw Error('未回复筛选未确认生效，禁止采集全部评论');
          await Promise.allSettled([...pending]);
          const ids = observations.get(workKey);
          if (ids?.size === 1) cache[workKey] = [...ids][0];
          else if (ids?.size > 1) delete cache[workKey];
          result = await tryApi();
        }
        const comments = result ? result.comments : await collectComments(page, {
          limit:args.limit,timeoutMs:30000,idleMs:3000,uiTimeoutMs:8000,
        });
        workResults.push({title,status:'checked',source:result?'api':'dom',count:comments.length,truncated:Boolean(result?.truncated)});
        if (comments.length > 0) {
          console.log(`${comments.length}条未回复`);
          for (const c of comments) {
            const text = (c.commentText || '').slice(0, 50);
            allUnreplied.push({
              commentId: c.commentId,
              workId: c.workId,
              username: c.username,
              commentText: c.commentText,
              work: short,
              workFull: title,
            });
            console.log(`    @${c.username}: ${text}`);
          }
        } else {
          console.log('✅ 无未回复');
        }
      } catch (e) {
        // Check for login expiration in error messages
        if (/StatusCode.*8|用户未登录|login/i.test(e.message)) {
          console.error('LOGIN_EXPIRED: 登录态已失效');
          loginExpired = true;
          break;
        }
        workResults.push({title,status:'error',reason:e.message.slice(0,160)});
        console.log(`跳过(${e.message.slice(0, 40)})`);
      } finally { activeWorkKey = null; }
    }

    console.log('\n=== 汇总 ===');
    console.log(`未回复评论: ${allUnreplied.length} 条`);

    saveOutput(allUnreplied);
    console.log('COVERAGE: ' + JSON.stringify(workResults));
  } catch (e) {
    if (/StatusCode.*8|用户未登录|login/i.test(e.message)) {
      console.error('LOGIN_EXPIRED: 登录态已失效，请手动登录');
      loginExpired = true;
    } else {
      console.error('ERROR:', e.message);
    }
  } finally {
    await Promise.allSettled([...pending]);
    if (args.diagnosticPath) {fs.mkdirSync(path.dirname(args.diagnosticPath),{recursive:true,mode:0o700});fs.writeFileSync(args.diagnosticPath,JSON.stringify(trace),{mode:0o600});}
    fs.mkdirSync(path.dirname(cachePath), {recursive:true});
    const selectedKeys = new Set(works.map(w => JSON.stringify([w.title || '', w.publishText || w.publish_time || ''])));
    const ids = Object.fromEntries(Object.entries(cache).filter(([key]) => selectedKeys.has(key)));
    fs.writeFileSync(cachePath, JSON.stringify({updatedAt:new Date().toISOString(),ids}), {mode:0o600});
    fs.chmodSync(cachePath,0o600);
    await context.close();
    if (loginExpired) process.exit(2);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(e=>{console.error(e.message);process.exitCode=1;});
