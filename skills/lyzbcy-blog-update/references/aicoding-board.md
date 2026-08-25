# AI Coding 比赛看板 — 更新细则

状态:✅ v2 上线 2026-08-25(多源+筛选+无锡通勤圈)。改前必读。

## 一句话

每天 9:30 自动多源抓取进行中比赛,筛出「纯 AI Coding / 纯 Coding / 开发者向」三级,
生成 `assets/data/aicoding.json`,push 后 Pages 自动重建,博客 `/aicoding/` 看板即更新。

## 文件地图(改哪个读哪个)

| 文件 | 作用 |
|---|---|
| `tools/aicoding/update-aicoding.mjs` | 多源抓取+解析+筛选+落盘(唯一数据入口,**禁止手改 JSON**) |
| `assets/data/aicoding.json` | 生成产物(勿手改,见 dashboards.md 通用规矩) |
| `assets/lib-custom/aicoding-board.js` | 前端渲染+筛选(含 WUXI_COMMUTE 通勤表;纯 DOM API) |
| `_includes/aicoding-board.html` | 页面骨架+CSS(`<script src>` 外链,勿改内联) |
| `_tabs/aicoding.md` | 导航入口(icon: fa-trophy) |
| `tools/aicoding/run-daily.sh` | 服务器 cron 入口脚本 |

## 数据源(v2 起多源)

| 源 | 方式 | 备注 |
|---|---|---|
| competehub.dev | 列表页 HTML 卡片(首页+默认排序+热门排序三入口) | 主源,覆盖中国平台;robots 禁 `/api/` `/_next/`,只抓列表页 |
| lablab.ai | 列表 JSON-LD ItemList + 新活动详情页 Event JSON-LD | AI 垂直;每天最多进 6 个详情页补日期/奖金,其余次日继续 |

- **已评估放弃**:Devpost(Cloudflare JS 挑战,服务端绕不过)、MLH(302+偏学生传统赛)、DoraHacks(API 404)
- 去重:competehub 优先(字段全),lablab 按标题规范比对剔除重复
- 想加新源:在 update-aicoding.mjs 里写 `fetchXxx()` 返回统一 schema,main() 里合并

## 三级筛选口径(2026-08-25 二次调整:用户反馈主区太少)

1. `ai_coding` — **主区精选**,包含:
   - vibe coding / Cursor/Copilot/Claude Code 等字面 AI 编程赛
   - **AI 构建类升级**:标题含 AI/Agent/LLM/GPT/Claude/Agentic 强信号的黑客松
     (2026 年 AI 黑客松的实际工作方式就是用 AI 编程构建;**只看标题不看 tags**,
     "Machine Learning/AI" 泛 tag 满天飞不能作为依据)
2. `pure_coding` — 传统编程/算法赛(ICPC、code golf 等)(**主区精选**)
3. `dev` — 其余开发者向构建赛(Shipaton、普通 hackathon)(**折叠区**)

正则白/黑名单在 `AI_CODING_STRONG` / `PURE_CODING_STRONG` / `DEV_PATTERNS` /
`NEGATIVE` / `AI_BUILD_IN_TITLE`。**改口径只改这里,别在 JSON 上打补丁。**

**已结束的比赛**:前端渲染直接剔除(daysLeft < 0 不显示),数据层每日更新时同样丢弃。

## 前端筛选(用户需求 v2)

- 形式:全部/🖥线上/🏙线下;截止:全部/7/30/90 天;地点:中国城市 chips + 🚄无锡通勤圈
- **筛选状态写 URL hash**(`#f=mode:online,city:wuxi600`),可分享、hashchange 响应
- WUXI_COMMUTE 表(无锡出发高铁二等座单程估算,≤600 圈约 50 城)在 aicoding-board.js;
  **数值为估算,接 12306 数据校准是待办**;超圈城市(广州/深圳/成都等)不入表即不命中

## 数据源合规(重要)

- 只抓各源公开页面(robots 均已查);competehub 禁 `/api/` `/_next/`
- 每天最多 1 次;看板页脚已标注来源;每条数据附原文链接

## 手动更新(服务器)

```bash
ssh ubuntu@111.231.25.152
bash /home/openclaw-shared/lyzbcy.github.io/tools/aicoding/run-daily.sh
```

## 每日 cron(ubuntu crontab)

```
30 9 * * * bash /home/openclaw-shared/lyzbcy.github.io/tools/aicoding/run-daily.sh >> /home/openclaw-shared/lyzbcy.github.io/tools/aicoding/cron.log 2>&1
```

## 踩坑记录

- 2026-08-25 **lablab 列表骨架会覆盖历史富数据**:列表只有 name+url,直接 spread 覆盖
  会把详情页补过的奖金/日期清空 —— 主循环做了字段级合并(null 时保留旧值);
  且详情页回填队列同时纳入"新活动 + 已知但缺字段的"(每天上限 6)
- 2026-08-25 **lablab 详情页奖金提取**:取**第一个 ≥500** 的 $ 金额;
  "$1/$100" 是页面杂音,首个大额通常才是主奖金(Alpaca $6,000/AMD $5,000 验证)
- 2026-08-25 **lablab 的 Cloudflare 挡 node fetch 的 TLS 指纹**(完整 Chrome 头反被识别),
  fetchPage 已内置 curl 子进程降级通道,Windows Git Bash/Linux 服务器均有 curl
- 2026-08-25 **id 迁移坑**:v1 裸 slug → v2 `source:slug`,prevMap 归一化时
  key 和**对象本身**都要改,只改 key 历史保留循环照样重复(真实踩过)
- 2026-08-25 卡片解析:teams 字段**可缺失**,必须从右往左按槽位解析(deadline→prize→location→teams)
- 2026-08-25 CompeteHub 列表翻页重复率高,三入口互补才凑齐;内容波动 → 旧 JSON 未过期条目保留(标 stale 降权)
- 2026-08-25 hash 解析正则要含冒号 `[\w:,-]+`,`mode:online` 否则截断成 "mode"
- 2026-08-25 "Already Closed" 是已结束文案;本地(Windows) push 偶发 reset,重试即过
