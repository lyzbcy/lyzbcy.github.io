# 📚 项目知识库 INDEX(唯一入口 · 渐进式披露第一层)

> **用法(所有 AI 必读)**:
> 1. 动手做任何改动**之前**,先扫下方"坑速查"和相关分类条目——命中就读对应文档再动手
> 2. 踩到新坑 / 建立新认知 / 新增组件 → **当场记入对应文档**(不要等,会话结束就忘)
> 3. 本页保持"薄":每条一行摘要,细节在子文档里

---

## 🔥 坑速查(高危,动手前必扫)

| 场景 | 一句话 | 详情 |
|---|---|---|
| 改博客 include/内联 JS | 构建管线会**改写你的 JS**:吞 `//` 注释、吃 `</tag>`、改 `<img>`、包 `<table>` | [pitfalls/jekyll-build.md](pitfalls/jekyll-build.md) |
| 调 LLM(ws-claw-corp) | `max_tokens` <2000 = 思维链烧光→空回复;别信"超时"报错 | [pitfalls/llm.md](pitfalls/llm.md) |
| 去重/缓存 ID | Python `hash()` 有随机盐,**跨进程必失配**;用 md5 | [pitfalls/python.md](pitfalls/python.md) |
| 日期对齐(周/日) | `timedelta(days=6,hours=23)` 连加会**越界跳到下周**;先归周一再 replace | [pitfalls/python.md](pitfalls/python.md) |
| pkill/pgrep | 匹配串会出现在自己的命令行里→**自杀**;用 ps+grep -v bash 取 PID | [pitfalls/ops.md](pitfalls/ops.md) |
| 改远端文件 | 本地副本可能落后远端数周,**先取远端最新再改**,否则覆盖丢内容 | [pitfalls/ops.md](pitfalls/ops.md) |
| push 到 GitHub | 本地直连常卡死;**走服务器 push**(链路已验证) | [howto/push-pipeline.md](howto/push-pipeline.md) |
| Playwright(Python) | `page.evaluate` 只收**一个** arg,多参数打包成对象 | [pitfalls/ops.md](pitfalls/ops.md) |
| 抓抖音数据 | `item_performance` API 对新视频**延迟~1天**→假ID无封面,次日自愈 | [pitfalls/ops.md](pitfalls/ops.md) |
| 线上验证 404/旧内容 | Pages 构建排队+CDN 传播慢,**等 90s 再验**,别急着判失败 | [pitfalls/ops.md](pitfalls/ops.md) |
| Agent 更新博客 | AGENTS.md 写了规则 ≠ 会执行:flash 模型循环打转+指令过载+记忆误导;关键规范必须做成独立 skill(仓库 skills/lyzbcy-blog-update/) | [pitfalls/agent-context.md](pitfalls/agent-context.md) |

## 🖥️ 技术栈与架构

- [stack/server.md](stack/server.md) — 腾讯云全景:双用户结构/root vs ubuntu/服务/cron 全景/网络端口
- [stack/skills.md](stack/skills.md) — 所有 skill 清单、入口、健康状态
- [stack/data.md](stack/data.md) — 数据资产地图:SQLite/JSON/登录态/凭证位置

## 📖 操作手册(howto)

- [howto/novnc-login.md](howto/novnc-login.md) — noVNC 人工登录浏览器(多道风控关卡都能过)
- [howto/push-pipeline.md](howto/push-pipeline.md) — 博客/skill 推送链路(为什么及如何走服务器推)

## 📅 大事记(为什么是现在这样)

- 2026-08-02 openclaw 从 root 迁移到 ubuntu(漏迁抖音看板 cron 等,详见 `未决问题-迁移清单.md`)
- 2026-08-17 小红书评论自动回复上线(开源 xhs-auto-reply 移植+强化)
- 2026-08-24 抖音/小红书评论回复改打包调用;周报系统 v2(看板内折叠组件);本知识库建立
- 2026-08-26 营养身体趋势 v3:跨年年份标注+12月减脂期历史合并+胸/腿/臂围度(见 `specs/2026-08-26-nutrition-body-trend-v3.md`)
