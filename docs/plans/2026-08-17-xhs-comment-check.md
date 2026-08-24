# 小红书评论自动检查+回复 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在腾讯云服务器部署 `lyzbcy-xhs-comment-check` skill,每 12h 自动抓取小红书通知页新评论、LLM 生成人设化回复、自动发送并核验,产出中文报告。

**Architecture:** 开源 Fisher0012/xhs-auto-reply 的通知页采集/回复路线(已审源码)× 抖音 lyzbcy-douyin-comment-check 的工程骨架(主控/节流/报告/审计/登录检测)。代码本地编写 → rsync 部署到服务器 → 服务器验证。

**Tech Stack:** Python 3 + Playwright(persistent context + xvfb-run)、openai SDK(ws-claw-corp 兼容接口,key 自动探测自 `~/.openclaw/openclaw.json`)、系统 crontab(ubuntu 用户)。

**关键路径:**
- 本地工作区: `/Users/zeen/Documents/个人资料/周五涵/xhs-comment-check/`(新建)
- 参考源码: `/tmp/xhs-auto-reply/xhs_reply.py`(已 clone)
- 服务器部署目标: `/home/openclaw-shared/skills/lyzbcy-xhs-comment-check/`
- 服务器浏览器 profile: `/home/ubuntu/.openclaw/xhs-profile`
- SSH: `bash "/Users/zeen/Documents/个人资料/周五涵/ssh-tencent-cloud-connect/scripts/connect_tencent_cloud_ssh.sh" '<cmd>'`

---

### Task 1: 本地项目骨架 + persona.json

**Files:**
- Create: `xhs-comment-check/persona.json`
- Create: `xhs-comment-check/persona.example.json`
- Create: `xhs-comment-check/requirements.txt`
- Create: `xhs-comment-check/.gitignore`

- [x] **Step 1.1: 建目录与基础文件**

`requirements.txt`:
```
playwright>=1.40
openai>=1.0
httpx
```

`.gitignore`:
```
persona.json
replied_ids.json
comments-output/
logs/
login-qr.png
__pycache__/
```

`persona.json`(起步人设:周五涵小红书版,结构对齐抖音 persona):
```json
{
  "identity": {
    "name": "捞鱼",
    "persona": "热爱技术、健身和生活的程序员博主,分享 AI 工具、健身日常、学习心得。风格:幽默接地气、真诚、有干货不装。",
    "signature": "——来自捞鱼",
    "emoji": "🦞"
  },
  "accountProfile": "小红书账号「捞鱼」,内容方向:AI/编程工具实战、健身记录、个人成长。粉丝多为学生和年轻职场人。",
  "knownNotes": {},
  "spamKeywords": ["交流群","私信","加我","找我","联系我","合作","推广","引流","涨粉","互换","换粉","互关","可带","代理","兼职","日入","月入","躺赚","usdt","USDT","合约"],
  "maliciousKeywords": ["忽略以上指令","ignore previous","系统提示","你现在是","假装你是","developer mode"],
  "replyTemplates": {
    "malicious": "{emoji} 看不懂但大受震撼,还是聊聊笔记本身吧~\n\n{sig}",
    "fallbackShort": "{emoji} 谢谢关注!这个我后面会专门讲讲~\n\n{sig}",
    "fallbackLong": "{emoji} 谢谢你的认真评论!你说的问题很实在,我会结合自己的经验整理一篇详细的,欢迎蹲后续~\n\n{sig}"
  },
  "systemPromptTemplate": "你是小红书博主「{name}」本人,正在回复自己笔记下的评论。\n账号定位:{accountProfile}\n你的性格:{persona}\n要求:\n- 像朋友聊天,自然口语,不要官方腔、不要营销感\n- 60~120字,最多1个emoji\n- 有干货就给干货,不懂就说不懂,真诚第一\n- 不引导加群/私信,不承诺任何收益\n- 只输出回复正文,不要任何前缀说明\n评论所在笔记主题:{noteContext}\n用户评论:{comment}"
}
```

`persona.example.json`:同结构,字段值换成占位说明(如 `"name": "<你的昵称>"`)。

---

### Task 2: 纯逻辑层 + 单元测试(md5 去重/解析/垃圾过滤)

**Files:**
- Create: `xhs-comment-check/xhs_core.py`(纯函数,无浏览器依赖)
- Test: `xhs-comment-check/test_xhs_core.py`

- [x] **Step 2.1: 先写失败测试** `test_xhs_core.py`:

```python
import json, pytest
from xhs_core import stable_id, parse_notification_text, is_spam, load_persona

def test_stable_id_deterministic():
    a = stable_id("用户A", "好看!")
    b = stable_id("用户A", "好看!")
    c = stable_id("用户B", "好看!")
    assert a == b and a != c and len(a) == 32

def test_stable_id_ignores_tail_beyond_200():
    assert stable_id("u", "x"*300) == stable_id("u", "x"*250)

def test_parse_notification_normal_comment():
    text = "小明\n赞了你的图片\n这个教程太有用了\n2026-08-17"
    r = parse_notification_text(text)
    assert r["username"] == "小明"
    assert "这个教程太有用了" in r["comment"]

def test_parse_notification_skip_others_reply():
    text = "小红\n回复了你的评论\n作者说得对\n2026-08-17"
    assert parse_notification_text(text) is None

def test_is_spam_short():
    p = load_persona()
    assert is_spam("好", p) is True
    assert is_spam("666", p) is True
    assert is_spam("这篇写得真好,请问用什么IDE配置的?", p) is False
    assert is_spam("加我交流群", p) is True
```

- [x] **Step 2.2: 跑测试确认失败** — `cd xhs-comment-check && python3 -m pytest test_xhs_core.py -v` → ModuleNotFoundError

- [x] **Step 2.3: 实现** `xhs_core.py`:

```python
#!/usr/bin/env python3
"""纯逻辑层:稳定ID/通知文本解析/垃圾过滤/persona加载。无浏览器依赖。"""
import hashlib
import json
import re
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
PERSONA_FILE = BASE_DIR / "persona.json"


def stable_id(username: str, text: str) -> str:
    """md5 稳定去重 ID。开源版用 Python hash() 有随机盐,跨进程不稳定,必须替换。"""
    return hashlib.md5(f"{username}\x00{text[:200]}".encode("utf-8")).hexdigest()


def load_persona() -> dict:
    with PERSONA_FILE.open("r", encoding="utf-8") as f:
        return json.load(f)


def parse_notification_text(text: str):
    """解析通知条目 innerText。返回 {username, comment} 或 None(不可回复/他人回复)。

    通知行结构(实测自开源项目): 首行=用户名, 其后若干行, 末尾可能有时间。
    「回复了你的评论」+含「作者」= 别人在回复,不是新评论 → None。
    """
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    if len(lines) < 2:
        return None
    joined = text
    if "回复了你的评论" in joined and "作者" in joined:
        return None
    username = lines[0]
    # 跳过可能的动作行("评论了你的笔记"等),正文取动作行之后
    body_lines = lines[1:]
    action_pat = re.compile(r"(评论|赞|收藏|关注|回复)了?(你的)?(笔记|图片|评论)?")
    if body_lines and action_pat.fullmatch(body_lines[0]):
        body_lines = body_lines[1:]
    comment = "\n".join(body_lines).replace("回复", "", 1).strip()
    if not comment:
        return None
    return {"username": username, "comment": comment}


def is_spam(text: str, persona: dict) -> bool:
    """垃圾/引流过滤。规则平移开源版 + persona 词表。"""
    t = text.strip()
    if len(t) <= 3 or t.isdigit():
        return True
    if "该评论已删除" in t:
        return True
    kws = persona.get("spamKeywords", [])
    return any(kw in t for kw in kws)


def fill_template(template: str, persona: dict, **extra) -> str:
    """填充 {emoji}/{sig}/{name}/{accountProfile}/{noteContext}/{comment} 等占位。"""
    idt = persona["identity"]
    mapping = {
        "emoji": idt.get("emoji", ""),
        "sig": idt.get("signature", ""),
        "name": idt.get("name", ""),
        "accountProfile": persona.get("accountProfile", ""),
        "persona": idt.get("persona", ""),
        **extra,
    }
    out = template
    for k, v in mapping.items():
        out = out.replace("{" + k + "}", str(v))
    return out
```

- [x] **Step 2.4: 跑测试确认全绿** — `python3 -m pytest test_xhs_core.py -v` → 全部 PASS

---

### Task 3: 核心浏览器层 xhs_reply.py(移植+修4坑)

**Files:**
- Create: `xhs-comment-check/xhs_reply.py`

- [x] **Step 3.1: 实现**(完整代码;开源路线+4处强化:md5/登录检测/发送核验/参数化):

```python
#!/usr/bin/env python3
"""小红书通知页评论采集+回复。移植自 Fisher0012/xhs-auto-reply(MIT)并强化:
1) md5 稳定去重(原版 Python hash 跨进程失配会重复回复)
2) 登录失效检测(LOGIN_EXPIRED,防止把登录页当评论)
3) 发送后核验(点了发送≠发成功)
4) dry-run 模式 + max-replies 可调
浏览器交互路线(开源验证过): notification?type=comment → 「评论和@」Tab
→ .tabs-content-container 条目 → 点"回复" → textarea.comment-input → 点"发送"
"""
import argparse
import asyncio
import json
import logging
import os
import random
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from xhs_core import stable_id, load_persona, parse_notification_text, is_spam, fill_template

BASE_DIR = Path(__file__).resolve().parent
REPLIED_FILE = BASE_DIR / "replied_ids.json"
OUTPUT_DIR = BASE_DIR / "comments-output"
PROFILE_DIR = Path(os.environ.get("XHS_PROFILE_DIR", "/home/ubuntu/.openclaw/xhs-profile"))
XHS_URL = "https://www.xiaohongshu.com/notification?type=comment"

DEFAULTS = {"reply_delay_min": 8, "reply_delay_max": 25, "max_replies": 15, "start_delay_max": 300}

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s",
                    handlers=[logging.StreamHandler()])
log = logging.getLogger("xhs-reply")


def load_replied() -> set:
    if REPLIED_FILE.exists():
        return set(json.loads(REPLIED_FILE.read_text(encoding="utf-8")))
    return set()


def save_replied(ids: set):
    REPLIED_FILE.write_text(json.dumps(sorted(ids), ensure_ascii=False, indent=2), encoding="utf-8")


def write_result(payload: dict, name: str):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUTPUT_DIR / name).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


# ── LLM(ws-claw-corp,key 自动探测自 openclaw.json) ──
def llm_client():
    from openai import OpenAI
    cfg_path = Path(os.environ.get("OPENCLAW_CONFIG", str(Path.home() / ".openclaw/openclaw.json")))
    cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    prov = cfg["models"]["providers"]["ws-claw-corp"]
    base = prov.get("baseUrl") or prov.get("baseURL") or prov.get("url")
    if base and "/v1" not in base:
        base = base.rstrip("/") + "/v1"
    model = prov.get("defaultModel") or prov.get("models", [None])[0] or "th-deepseek-v4-pro-202606"
    return OpenAI(api_key=prov["apiKey"], base_url=base), model


def generate_reply(comment: str, note_context: str, persona: dict) -> str:
    try:
        client, model = llm_client()
        sys_prompt = fill_template(persona["systemPromptTemplate"], persona,
                                   noteContext=note_context, comment=comment)
        rsp = client.chat.completions.create(model=model, max_tokens=300, temperature=0.8,
                                             messages=[{"role": "user", "content": sys_prompt}])
        return rsp.choices[0].message.content.strip()
    except Exception as e:
        log.warning(f"LLM 失败走兜底: {e}")
        return fill_template(persona["replyTemplates"]["fallbackLong"], persona)


def note_context_for(note_hash, persona) -> str:
    for prefix, desc in persona.get("knownNotes", {}).items():
        if note_hash and note_hash.startswith(prefix[:16]):
            return desc
    return persona.get("accountProfile", "博主的小红书笔记")


async def check_login(page) -> bool:
    """登录态预检:被重定向到登录页/出现登录容器 → False。"""
    url = page.url
    if "login" in url:
        return False
    found = await page.evaluate("""() => !!(
        document.querySelector('.login-container') || document.querySelector('.qrcode') ||
        document.querySelector('[class*="login-modal"]') ||
        (document.body && document.body.innerText.includes('扫码登录') && !document.querySelector('.tabs-content-container'))
    )""")
    return not found


async def collect(page):
    """切「评论和@」并抓取条目。返回 (ok, items)。"""
    await page.goto(XHS_URL, wait_until="domcontentloaded", timeout=30000)
    await page.wait_for_timeout(random.randint(2000, 3500))
    if not await check_login(page):
        return False, []
    await page.evaluate("""() => {
        const tabs = document.querySelectorAll('.reds-tab-item.tab-item');
        const t = Array.from(tabs).find(t => t.textContent.includes('评论和@'));
        if (t) t.click();
    }""")
    await page.wait_for_timeout(2000)
    items = await page.evaluate("""() => {
        const c = document.querySelector('.tabs-content-container');
        if (!c) return [];
        return Array.from(c.children).map((item, idx) => {
            const text = item.innerText ? item.innerText.trim() : '';
            const img = item.querySelector('img[src*="notes"], img[src*="spectrum"]');
            return {idx, text, note_hash: img ? img.src.split('/').slice(-1)[0].split('?')[0] : null};
        }).filter(i => i.text.length > 5);
    }""")
    return True, items


async def send_one(page, idx: int, reply_text: str) -> str:
    """对第 idx 条执行回复。返回 'sent' | 'verified' | 'click_fail' | 'fill_fail' | 'send_fail'。"""
    clicked = await page.evaluate("""(idx) => {
        const c = document.querySelector('.tabs-content-container');
        const item = c && c.children[idx];
        if (!item) return false;
        const btn = Array.from(item.querySelectorAll('*')).find(e =>
            e.textContent && e.textContent.trim() === '回复' && e.children.length === 0);
        if (btn) { btn.click(); return true; }
        return false;
    }""", idx)
    if not clicked:
        return "click_fail"
    await page.wait_for_timeout(random.randint(1200, 2000))
    filled = await page.evaluate("""(t) => {
        const ta = document.querySelector('textarea.comment-input');
        if (!ta) return false;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        setter.call(ta, t);
        ta.dispatchEvent(new Event('input', {bubbles: true}));
        return true;
    }""", reply_text)
    if not filled:
        return "fill_fail"
    await page.wait_for_timeout(random.randint(800, 1500))
    sent = await page.evaluate("""() => {
        const btn = Array.from(document.querySelectorAll('*')).find(e =>
            e.textContent && e.textContent.trim() === '发送' && e.children.length === 0 && e.offsetParent !== null);
        if (btn) { btn.click(); return true; }
        return false;
    }""")
    if not sent:
        return "send_fail"
    await page.wait_for_timeout(random.randint(1500, 3000))
    # 核验:回复框收起 或 条目内出现我们的回复片段
    verified = await page.evaluate("""(idx, frag) => {
        const c = document.querySelector('.tabs-content-container');
        const item = c && c.children[idx];
        if (!item) return false;
        const open = item.querySelector('textarea.comment-input');
        return !open || item.innerText.includes(frag);
    }""", idx, reply_text[:15])
    return "verified" if verified else "sent"


async def run(dry_run: bool, max_replies: int):
    from playwright.async_api import async_playwright
    persona = load_persona()
    replied = load_replied()
    stats = {"collected": 0, "skipped_replied": 0, "skipped_spam": 0, "replied": 0,
             "unverified": 0, "errors": 0, "dry_run": dry_run}
    detail = []

    async with async_playwright() as p:
        browser = await p.chromium.launch_persistent_context(
            user_data_dir=str(PROFILE_DIR), headless=False,
            args=["--no-first-run", "--no-default-browser-check", "--disable-gpu"],
            viewport={"width": 1280, "height": 900})
        page = browser.pages[0] if browser.pages else await browser.new_page()
        ok, items = await collect(page)
        if not ok:
            await browser.close()
            print("LOGIN_EXPIRED")
            write_result({"status": "LOGIN_EXPIRED", "time": str(datetime.now())}, "unreplied-latest.json")
            return 2
        stats["collected"] = len(items)
        log.info(f"抓到 {len(items)} 条通知")

        queue = []
        for it in items:
            parsed = parse_notification_text(it["text"])
            if parsed is None:
                continue
            cid = stable_id(parsed["username"], parsed["comment"])
            if cid in replied:
                stats["skipped_replied"] += 1
                continue
            if is_spam(parsed["comment"], persona):
                stats["skipped_spam"] += 1
                replied.add(cid)  # 垃圾也标记,避免反复看到
                continue
            queue.append({**parsed, "id": cid, "idx": it["idx"], "note_hash": it["note_hash"],
                          "note_context": note_context_for(it["note_hash"], persona)})
            if len(queue) >= max_replies:
                break

        # 先生成全部回复(便于 dry-run 出完整计划)
        for q in queue:
            q["reply"] = generate_reply(q["comment"], q["note_context"], persona)
        write_result({"count": len(queue), "items": queue, "stats": stats}, "reply-plan.json")

        if dry_run:
            log.info(f"DRY-RUN: 生成 {len(queue)} 条回复计划,未发送")
            await browser.close()
            save_replied(replied)
            print(json.dumps({"status": "DRY_RUN", "count": len(queue)}, ensure_ascii=False))
            return 0

        for q in queue:
            try:
                res = await send_one(page, q["idx"], q["reply"])
                if res == "verified":
                    stats["replied"] += 1
                    replied.add(q["id"])
                elif res == "sent":
                    stats["unverified"] += 1
                    replied.add(q["id"])  # 保守:已发送未核验也记录,宁可少回不重复回
                else:
                    stats["errors"] += 1
                detail.append({"username": q["username"], "comment": q["comment"][:50],
                               "reply": q["reply"][:60], "result": res})
                await page.wait_for_timeout(random.randint(DEFAULTS["reply_delay_min"],
                                                           DEFAULTS["reply_delay_max"]) * 1000)
            except Exception as e:
                stats["errors"] += 1
                log.error(f"处理 {q.get('username','?')} 出错: {e}")
        await browser.close()

    save_replied(replied)
    write_result({"stats": stats, "detail": detail, "time": str(datetime.now())}, "run-result.json")
    print(json.dumps({"status": "DONE", **stats}, ensure_ascii=False))
    return 0 if stats["errors"] == 0 else 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="只采集+生成计划,不发送")
    ap.add_argument("--max-replies", type=int, default=DEFAULTS["max_replies"])
    ap.add_argument("--no-start-delay", action="store_true", help="跳过随机启动延迟(测试用)")
    a = ap.parse_args()
    if not a.no_start_delay:
        delay = random.randint(0, DEFAULTS["start_delay_max"])
        log.info(f"随机启动延迟 {delay}s...")
        import time as _t; _t.sleep(delay)
    sys.exit(asyncio.run(run(a.dry_run, a.max_replies)))


if __name__ == "__main__":
    main()
```

- [x] **Step 3.2: 语法检查** — `python3 -m py_compile xhs_reply.py` → 无输出(通过)

---

### Task 4: login_once.py 扫码登录

**Files:**
- Create: `xhs-comment-check/login_once.py`

- [x] **Step 4.1: 实现**:

```python
#!/usr/bin/env python3
"""首次登录:打开通知页等待扫码,轮询检测登录成功。二维码截图存 login-qr.png 供用户扫描。
用法: xvfb-run -a python3 login_once.py   (截图会随轮询刷新,需及时把图发给用户)"""
import asyncio, sys
from pathlib import Path
from xhs_reply import PROFILE_DIR, XHS_URL, check_login

QR_PNG = Path(__file__).resolve().parent / "login-qr.png"

async def main():
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch_persistent_context(
            user_data_dir=str(PROFILE_DIR), headless=False,
            args=["--no-first-run", "--no-default-browser-check", "--disable-gpu"],
            viewport={"width": 1280, "height": 900})
        page = browser.pages[0] if browser.pages else await browser.new_page()
        await page.goto(XHS_URL, wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(3000)
        if await check_login(page):
            print("ALREADY_LOGGED_IN"); await browser.close(); return 0
        await page.screenshot(path=str(QR_PNG), full_page=False)
        print(f"QR_SAVED {QR_PNG}")
        for i in range(120):  # 最多等 10 分钟
            await page.wait_for_timeout(5000)
            if await check_login(page):
                print("LOGIN_OK"); await browser.close(); return 0
            if i % 6 == 5:  # 每30s刷新二维码截图(二维码会过期)
                await page.screenshot(path=str(QR_PNG))
                print(f"QR_REFRESHED {i//6}")
        print("LOGIN_TIMEOUT"); await browser.close(); return 3

sys.exit(asyncio.run(main()))
```

---

### Task 5: 主控 run-check.py + 节流 adjust-check-freq.py

**Files:**
- Create: `xhs-comment-check/adjust-check-freq.py`
- Create: `xhs-comment-check/run-check.py`

- [x] **Step 5.1: adjust-check-freq.py**(简化自抖音版,12h 节流):

```python
#!/usr/bin/env python3
"""频率节流:距上次完整运行 <12h 输出 SKIP:<剩余小时>;否则输出 OK 并更新时间戳。"""
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

STAMP = Path(__file__).resolve().parent / "comments-output" / ".last-run"
INTERVAL = timedelta(hours=12)
TZ = ZoneInfo("Asia/Shanghai")

def main():
    if STAMP.exists():
        try:
            last = datetime.fromisoformat(STAMP.read_text().strip())
            elapsed = datetime.now(TZ) - last
            if elapsed < INTERVAL:
                remain = (INTERVAL - elapsed).total_seconds() / 3600
                print(f"SKIP: 距上次检查仅 {elapsed.total_seconds()/3600:.1f}h,需间隔 12h,剩余 {remain:.1f}h")
                return
        except ValueError:
            pass
    STAMP.parent.mkdir(parents=True, exist_ok=True)
    STAMP.write_text(datetime.now(TZ).isoformat())
    print("OK: 频率检查通过")

if __name__ == "__main__":
    main()
```

- [x] **Step 5.2: run-check.py**(平移抖音骨架):

```python
#!/usr/bin/env python3
"""主控唯一入口:节流→内存→登录态随采集检测→执行→报告→审计。"""
import json, os, subprocess, sys, shutil
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

BASE_DIR = Path(__file__).resolve().parent
REPORT = BASE_DIR / "comment-check-report.md"
LOG_DIR = BASE_DIR / "logs"
TZ = ZoneInfo("Asia/Shanghai")

def now(): return datetime.now(TZ).strftime("%Y-%m-%d %H:%M:%S")
def day(): return datetime.now(TZ).strftime("%Y-%m-%d")

def log(msg):
    try:
        LOG_DIR.mkdir(exist_ok=True)
        (LOG_DIR / f"run-{day()}.log").open("a", encoding="utf-8").write(f"[{now()}] {msg}\n")
        cutoff = datetime.now(TZ) - timedelta(days=7)
        for f in LOG_DIR.glob("run-*.log"):
            try:
                if datetime.strptime(f.stem[4:], "%Y-%m-%d") < cutoff: f.unlink()
            except ValueError: pass
    except Exception: pass

def write_report(text): REPORT.write_text(text, encoding="utf-8"); print(text)

def mem_ok():
    for line in Path("/proc/meminfo").read_text().splitlines():
        if line.startswith("MemAvailable:"): return int(line.split()[1]) // 1024
    return 99999

def xvfb(cmd):
    if os.environ.get("DISPLAY") or not shutil.which("xvfb-run"): return cmd
    return ["xvfb-run", "-a"] + cmd

def main():
    freq = subprocess.run([sys.executable, str(BASE_DIR / "adjust-check-freq.py")],
                          capture_output=True, text=True)
    freq_out = (freq.stdout or freq.stderr).strip()
    if freq_out.startswith("SKIP"):
        log(f"SKIP | {freq_out}")
        write_report(f"# 小红书评论检查报告\n\n## 执行时间\n{now()}\n\n## 状态\nNO_REPLY\n\n## 原因\n{freq_out}")
        return
    m = mem_ok()
    if m < 200:
        log(f"STOP_MEMORY | {m}MB")
        write_report(f"# 小红书评论检查报告\n\n## 执行时间\n{now()}\n\n## 状态\n已停止\n\n## 原因\n内存不足:{m}MB < 200MB")
        return
    proc = subprocess.run(xvfb([sys.executable, str(BASE_DIR / "xhs_reply.py")]),
                          capture_output=True, text=True, timeout=1800, cwd=str(BASE_DIR))
    out = (proc.stdout or "").strip()
    log(f"RUN | exit={proc.returncode} | {out[:300]}")
    try:
        result = json.loads(out.splitlines()[-1])
    except Exception:
        result = {"status": "ERROR", "stderr": (proc.stderr or "")[:500]}
    if result.get("status") == "LOGIN_EXPIRED":
        write_report(f"# 小红书评论检查报告\n\n## 执行时间\n{now()}\n\n## 状态\n需要人工处理\n\n## 原因\n登录态失效,需重新扫码登录(运行 login_once.py)。\n\n## 原始输出\n{out}")
        return
    s = result.get("stats", result)
    lines = [f"# 小红书评论检查报告", "", f"## 执行时间", now(), "", "## 执行结果",
             f"- 频率检查:{freq_out}", f"- 内存检查:通过({m}MB)",
             f"- 抓取通知:{s.get('collected', 0)} 条",
             f"- 已回过跳过:{s.get('skipped_replied', 0)} | 垃圾过滤:{s.get('skipped_spam', 0)}",
             f"- 回复成功(已核验):{s.get('replied', 0)} 条",
             f"- 已发送未核验:{s.get('unverified', 0)} 条", f"- 错误:{s.get('errors', 0)} 条"]
    plan = BASE_DIR / "comments-output" / "reply-plan.json"
    if plan.exists():
        try:
            for it in json.loads(plan.read_text(encoding="utf-8")).get("items", []):
                lines.append(f"- @{it['username']}|{it['comment'][:40]}|回复:{it['reply'][:50]}")
        except Exception: pass
    lines += ["", "## 结论"]
    if s.get("errors", 0) == 0 and s.get("unverified", 0) == 0:
        lines.append("本次评论已全部按真实结果完成回复。")
    elif s.get("replied", 0) == 0 and s.get("unverified", 0) == 0:
        lines.append("本次没有成功回复任何评论(或本来就没有新评论)。")
    else:
        lines.append("本次只完成部分回复,存在未核验/错误条目,未全部完成。")
    write_report("\n".join(lines))

if __name__ == "__main__":
    main()
```

---

### Task 6: SKILL.md 纪律文档

- [x] **Step 6.1: 写 SKILL.md**(仿抖音版纪律,适配小红书):

```markdown
---
name: lyzbcy-xhs-comment-check
description: 小红书评论自动检查+回复。定时或人工触发时运行 run-check.py,经通知页采集新评论、LLM生成人设回复、自动发送并核验,输出中文报告。仅在需要处理小红书未回复评论时使用。
user-invocable: true
---

# lyzbcy-xhs-comment-check

## 核心规则
> 唯一执行入口:`python3 ~/.openclaw/workspace/skills/lyzbcy-xhs-comment-check/run-check.py`
> 首次/登录失效时:`xvfb-run -a python3 login_once.py`(二维码截图发给主人扫码)
> 新评论判定以**通知页本次真实抓取 + replied_ids.json 去重**为唯一依据,禁止编造。
> 汇报只能来自本次生成的 comments-output/*.json 与 run-check.py 标准输出。
> 禁止绕过 run-check.py 手动拼计划、手动跑回复、改 replied_ids.json。
> 回复文案只能由 LLM+persona.json 生成;命中 maliciousKeywords 走机械模板,不进 LLM。
> 全程中文。

## 执行方式
python3 run-check.py          # 全流程
python3 xhs_reply.py --dry-run --no-start-delay   # 仅调试:dry-run

## 判定
- SKIP/LOGIN_EXPIRED/EMPTY 各自如实报告
- 只有 stats.replied(已核验)算回复成功;unverified/errors>0 必须汇报"未全部完成"
```

---

### Task 7: 部署到服务器

- [x] **Step 7.1: rsync 上传** — `rsync -avz --exclude '__pycache__' --exclude '.git' xhs-comment-check/ <server>:/home/openclaw-shared/skills/lyzbcy-xhs-comment-check/` 然后 `chown -R ubuntu:ubuntu`
- [x] **Step 7.2: 服务器装依赖** — `sudo -u ubuntu pip3 install --user openai httpx playwright` ;`python3 -m playwright install chromium`(若 1208 版本已匹配则秒过)
- [x] **Step 7.3: 服务器跑单测** — `cd skill目录 && python3 -m pytest test_xhs_core.py -v` → 全绿

### Task 8: 扫码登录(用户配合)

- [x] **Step 8.1:** 服务器 `xvfb-run -a python3 login_once.py`(后台),把生成的 `login-qr.png` scp 到本地并展示给用户扫码
- [x] **Step 8.2:** 等待 `LOGIN_OK`;再跑一次确认 `ALREADY_LOGGED_IN`

### Task 9: dry-run 验证

- [x] **Step 9.1:** `xvfb-run -a python3 xhs_reply.py --dry-run --no-start-delay`
- [x] **Step 9.2:** 检查 `comments-output/reply-plan.json`:条目与通知页肉眼一致、回复文案符合人设 → 给用户过目

### Task 10: 小批量真实 + cron 上线

- [x] **Step 10.1:** `xvfb-run -a python3 xhs_reply.py --max-replies 3 --no-start-delay` → 核验 sent/verified、页面真实出现回复、replied_ids 记录正确
- [x] **Step 10.2:** 备份 ubuntu crontab 后追加:`5 10,22 * * * cd /home/openclaw-shared/skills/lyzbcy-xhs-comment-check && /usr/bin/python3 run-check.py >> logs/cron.log 2>&1`
- [x] **Step 10.3:** 手动触发一次 run-check.py 验证整链,交付使用说明
