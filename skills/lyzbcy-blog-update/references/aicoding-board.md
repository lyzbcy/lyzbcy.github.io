# AI Coding 比赛看板 — 更新细则

状态:✅ 首版上线 2026-08-25。数据源、筛选口径、部署链路均在此,改前必读。

## 一句话

每天 9:30 自动抓取 [AI赛事通](https://www.competehub.dev) 的进行中比赛,
筛出「纯 AI Coding / 纯 Coding / 开发者向」三级,生成 `assets/data/aicoding.json`,
push 后 Pages 自动重新构建,博客 `/aicoding/` 看板即更新。

## 文件地图(改哪个读哪个)

| 文件 | 作用 |
|---|---|
| `tools/aicoding/update-aicoding.mjs` | 抓取+解析+筛选+落盘(唯一数据入口,**禁止手改 JSON**) |
| `assets/data/aicoding.json` | 生成产物(勿手改,见 dashboards.md 通用规矩) |
| `assets/lib-custom/aicoding-board.js` | 前端渲染(纯 DOM API,勿引入 HTML 字符串拼接) |
| `_includes/aicoding-board.html` | 页面骨架+CSS(`<script src>` 外链,勿改内联) |
| `_tabs/aicoding.md` | 导航入口(icon: fa-trophy) |
| `tools/aicoding/run-daily.sh` | 服务器 cron 入口脚本 |

## 三级筛选口径(用户拍板的严口径)

1. `ai_coding` — vibe coding / Cursor/Copilot/Claude Code 等 AI 辅助编程赛(**主区精选**)
2. `pure_coding` — 传统编程/算法赛(ICPC、code golf 等)(**主区精选**)
3. `dev` — 开发者向构建赛(Shipaton、通用 hackathon)(**折叠区**)

正则白名单/黑名单都在 `update-aicoding.mjs` 的 `AI_CODING_STRONG` / `PURE_CODING_STRONG` /
`DEV_PATTERNS` / `NEGATIVE` 四个常量里。**改口径只改这里,别在 JSON 上打补丁。**

## 数据源合规(重要)

- 只抓 `competehub.dev` 的公开列表页(robots `Allow: /`),**禁止碰 `/api/`、`/_next/`**(robots Disallow)
- 每天最多 1 次,`--pages 6` 以内;页面卡片自带分类/奖金/倒计时,无需进详情页
- 看板页脚已标注来源;每条数据附原文链接(slug 可溯源:devpost123=Devpost, luma…=Luma)

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

- 2026-08-25 卡片解析:teams 字段**可缺失**,必须从右往左按槽位解析(deadline→prize→location→teams),
  从左找数字会整体错位(曾把 "Cybersecurity" 当成地点)
- 2026-08-25 CompeteHub 列表页翻页**重复率高**(首页+默认+hot 三个入口互补才凑齐),
  且内容会波动 → 旧 JSON 里未过期条目要保留(标 `stale` 降权展示)
- 2026-08-25 本地(Windows)直连 push 偶发 Connection reset,**重试即可**;
  服务器链路稳定(见 howto/push-pipeline.md)
- "Already Closed" 是它的已结束文案,parseDeadline/槽位判断都要含 `closed`
