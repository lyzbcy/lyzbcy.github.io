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

## 2026-10-23 连续卡住与浏览器锁修复

实证：09:07与11:07任务运行约15分钟后被外层SIGTERM终止；11:07遗留xvfb/npm/node/Chromium完整采集子树，直到排查时仍占用douyin-profile。09:23回复明确报ProcessSingleton冲突，09:24清理后重跑成功2条。调度表last_run_status=ok仅表示Agent回合正常结束，其summary仍可能是业务失败，不得以该字段宣布评论任务成功。

风险点：ensureCommentPageReady在页面入口不可见后调用promptForEnter，旧版cron无TTY也会等待输入；采集pending响应和其他子步骤也可能停滞。历史stdout被capture_output缓存且外层终止后丢失，无法确证每次卡住的最内层位置。已封堵非TTY交互等待、并给每阶段设置硬超时；主进程收SIGTERM/SIGINT或阶段超时，都清理独立进程组（含孙进程），不再只杀Python。采集上限480秒，其他阶段默认180秒；stdin为DEVNULL。整轮flock互斥避免重叠。START/STAGE与flush阶段输出帮助定位。collector顶层错误非零退出，原始异常尾部与超时输出记录日志；修复日志清理naive/aware时区比较问题。

超时只能报结果未确认，不得推断采集数/已发送数为0；不因未知结果盲目重发旧计划。重试仍走run-check.py重新读取当前未回复评论。INTERACTIVE_REQUIRED表示页面入口/人工处理问题，不能直接认定登录失效。

验证：7项Python测试（原2项+进程组超时/父信号/互斥/stdin/返回码），16项接口/日期Node测试，非TTY交互立即拒绝检查，均通过。正式--collect-only验证13个近30天作品全部API成功，发现1条当前未回复，不调用LLM、不发送、未改变检查时间戳。09:24历史成功2条不代表本轮。备份在ubuntu私有state目录douyin-comments-backup-20261023。保留profile、persona与业务频率配置。

## 2026-10-28 虚拟显示器授权冲突
今天多轮在刷新作品列表时即失败，明确错误Authorization required / Missing X server，尚未进入登录态判断，不得误报Cookie掉线。根因：三处代理通过pgrep发现任意Xvfb后，就把DISPLAY强制改为:99；当:99由xvfb-run以私有Xauthority启动时，外层另分配的DISPLAY与授权配对被破坏。

修复scripts/works.js、collect-comments.js、reply-comments.js统一使用creator-display.js：用xdpyinfo实际探测继承的DISPLAY/XAUTHORITY，成功保留，失败或缺失则xvfb-run -a选择独立显示器。不会pkill全局Xvfb、放宽访问控制、重写Cookie或操作其他服务的显示器。新增四项mock覆盖可用、被拒、缺失、探测超时，原七项Python回归仍通过。只读验证不生成回复、不发评论、不改频率。


## 2026-11-02 作品切换超时与结果保护

实证：15:08的只读检查在前7个作品连续locator.click超时，15:16触发480秒阶段保护；没有登录失效提示。随后带诊断的独立重跑可正常读取官方未回复接口，说明不能直接认定Cookie掉线。具体遮挡/页面渲染瞬态未在恢复后的现场复现，不补造根因截图。

可确定的代码缺陷：作品扫描设置了25秒预算，但trigger/workCard.click与scrollIntoViewIfNeeded未传timeout，仍采用Playwright默认30秒；findTargetWorkWithRetry的第二轮又重新计时，串行处理全部作品把单次页面异常放大成整轮8分钟卡住。pending响应的Promise.allSettled也没有上限；stdout被capture_output缓存导致执行中看不到进度。

生产修复：creator 0.1.1、检查封装1.0.1。点击与滚动显式传UI超时，选择重试共享20秒总预算；读取页面失败后清空当前作品观察状态、重载评论页，只重试一次，仍失败停止本轮。该恢复只用于读取/切换，绝不用于发送回复。响应body与pending等待有上限；实时collection-latest.log权限600。collector返回complete与覆盖明细，封装再次校验；不完整/失败结果不能当EMPTY或进入LLM/回复，正常轮失败刷新ERROR报告。诊断参数可保留本机错误详情和页面截图，不能公开原评论/凭据/登录profile。

验证：29项Node采集/接口/日期/归一化测试、4项显示器测试、11项Python互斥/进程组/实时日志/覆盖测试，共44项通过。mock验证了首次点击失败恢复、永久失败停止、登录失效不重试、旧作品无筛选显式跳过、迟迟不结束的响应、超时日志和进程清理。部署后两次真实--collect-only在15:36:10和15:37:51完成，均18/18作品通过API检查、complete=true，发现1条待回复；未调用LLM、未发送。人设配置（persona.json）、回复数据库和频率配置哈希不变。

回滚：ubuntu私有state下douyin-comments-backup-20261102/original；部署只改对应源码/测试/版本字段，保留登录态和业务数据。定时入口仍为run-check.py，不增加任务、不重发旧计划。
