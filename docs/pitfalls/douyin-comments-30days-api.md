# 抖音评论检查：近30天范围与接口优先（2026-10-19）

## 行为与边界

以 Asia/Shanghai 的今天及前29个自然日筛选全部作品。2026-10-19 的范围为 2026-09-20 至 2026-10-19；不再固定检查前10个，也不因置顶老作品提前终止。日期未知/未来日期不猜测，单独计入报告。每个作品仍保留最多50条评论的原有限额；API 分页达到限额时记录 truncated。

原脚本 run-check.py 传 --max-works 8，但 scripts/collect-comments.js 没透传参数，真实执行始终落到采集器默认10个。现代理完整透传，正式入口改为 --days 30，没有默认作品数量上限。

## 接口与可靠性

本账号创作者中心实际 GET 路径：/web/api/third_party/aweme/api/comment/read/aweme/v1/web/comment/list/select/；服务端未回复筛选 comment_select_options=0,not_replied。这属于已登录网页内部接口，不是开放平台 OAuth 接口。首次通过原页面建立请求模板和作品ID关联，随后复用本轮浏览器登录上下文及请求头直接 GET、按游标分页，不反推签名、不调用第三方服务。

HTTP/2 的 :authority/:method 等伪头不能传给 APIRequestContext，须剔除；Cookie 由上下文管理。请求模板与请求头只留本轮内存，作品ID缓存只含标题/发布时间/ID。非200、登录失效、业务错误、结构变化、作品ID不匹配、游标不前进均不能当空评论；普通API异常本轮熔断后回退到原生未回复页面采集。旧作品缺筛选仍跳过。报告单独列实际覆盖、不支持、失败、日期不明，不把跳过当作0条。

## 入口、验证与token

唯一正式入口仍是 /home/openclaw-shared/skills/lyzbcy-douyin-comment-check/run-check.py。--collect-only 为排障入口：不生成计划、不调用 LLM、不发评论、不改频率时间戳。真实空跑的逐作品日志保存 comments-output/collection-latest.log（600），定时 Agent 仅接收范围/结果摘要。LLM 只在确有待回复评论时由既有 process-comments.py 调用；OpenClaw 调度 Agent 自身的 token 尚存在，不能宣称整套cron零token。

服务器18项测试通过（16项Node、2项Python）；2026-10-19 实测97个作品中9个在范围内、88个过期，9个全部API读取成功、无回退，35秒完成，只读无发送。非空评论、翻页和去重由单元测试覆盖；未为测试制造或发送评论。

## GitHub调查（2026-10-19查询）

- NanmiCoder/MediaCrawler：67177 stars；开源版基于 Playwright 会话与请求封装，抖音评论走 /aweme/v1/web/comment/list/，是公开评论，不等价于作者未回复。
- Evil0ctal/Douyin_TikTok_Download_API：20782 stars；提供结构化评论/子评论API，同样以公开评论为主。
- JoeanAmier/TikTokDownloader：16970 stars；支持评论数据采集，不能据此推断支持本账号作者未回复过滤。
- pen9un/douyin-chatgpt-bot：388 stars；README 明确视频评论自动回复服务自2025-03-31暂停，不适合作为替换方案。
- wenyg/douyin_comments：2 stars；当前工具的同类 Playwright 方案，README 对未回复筛选不可用时直接报错，解释了历史故障记忆。

官方 item.comment/video.comment 接口要求能力权限和用户授权；现有网页登录Cookie不能直接当OAuth token。现阶段保留薄适配层、接口优先+页面回退，比替换为通用公开评论爬虫更符合业务。

## 文件与回滚

版本化源码在 tools/douyin-comments/。creator/ 覆盖 /home/ubuntu/.openclaw/douyin-creator-tools/ 中对应路径；skill/ 覆盖 /home/openclaw-shared/skills/lyzbcy-douyin-comment-check/ 对应文件。保留原项目依赖、persona.json、频率状态、登录profile和评论数据。仅以ubuntu部署。改造前备份：/home/ubuntu/.local/state/douyin-comments-backup-20261019/。测试命令：node --test test/recent-works.test.mjs test/comment-api.test.mjs（creator根目录）；python3 -m unittest test_run_check.py（skill根目录）。
