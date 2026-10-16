# 坑：续火花云端抖音重复 cron、旧登录态与浏览器模式（2026-10-07）

## 已验证症状与原因

- 同目录 root 和 ubuntu 各有 09:00 抖音入口。旧入口读取 9/28 父目录 storage-state.json，新登录则写到 9/30 引擎目录 storage-state.json；两任务抢独占锁，通知状态由 root 以 600 写入导致 ubuntu PermissionError。
- 旧导航 goto 遇 ERR_NETWORK_CHANGED 立即失败；旧 O_EXCL 文件锁在异常退出后可能残留。
- 正式入口指定完整 Chromium 的 headless 模式：可搜索但右侧聊天不挂载。相同登录态、同 revision Headless Shell 对照可打开聊天，正式入口修复后的 6 位好友 dry-run 全通过，未发送消息。

## 铁律与修复

1. 两处 crontab 都查，同一解压目录只保留一个调度用户。迁移只清理该目录的抖音入口；不碰 QQ 与其他业务 cron。私有文件保留 600，不能用 chmod 644 掩盖混用用户问题。
2. 权威登录态是登录脚本保存的引擎目录文件；统一入口优先读取它，仅不存在时兼容父目录旧版。
3. 登录使用完整 Chromium，定时用 Chromium Headless Shell。按当前 venv 的 Playwright revision 查找，不按缓存目录最大版本选择。浏览器路径只存本机，排除公开分发。
4. 仅在尚未发送前对临时导航网络错误做有限重试；登录/安全验证错误不重试，消息发送与不确定结果不自动重发。
5. Linux 使用内核 flock，保留锁 inode；锁文件存在不代表运行中，不能删活跃锁。异常退出、SIGKILL、重启会自动释放。
6. 必须以实际 cron 用户、实际入口 dry-run 验收，临时探针通过不代表正式入口通过。演练通过不等于消息已送达。

## 验证与回滚

- 修复版源码：lyzbcy/xuhuohua v0.14.1；云端包排除登录态、好友配置与通知凭证。
- 独立回归 baseline：3 failed, 1 passed；修复后全引擎测试：221 passed；部署/通知/打包单测：52 passed。
- 正式入口 dry-run：成功 6，失败 0，消息发送 0；计划仍为北京时间每日 09:00，QQ cron 保持原样。
- 服务器私有备份与测试：/home/ubuntu/xuhuohua-repair-20261007；ROLLBACK.sh 支持 --test-copy，不影响正式修复。恢复副本 SHA-256 与基线一致，原故障回归复现；生产保持修复状态。

## 真实发送与回填验收（2026-10-07）

- 用户明确允许实测后，正式入口以原 cron 用户 root 于 11:52:37–11:57:10 执行一次。6 位好友全部成功，12 条文字消息发送成功，失败 0；未重复执行发送。
- 使用新的独立 Headless Shell 浏览器重新打开这 6 个聊天，只读取各自最新 2 条本人消息，与私有实测结果正文逐条匹配并检查无 pending/retry 标记，12 条持久化消息全部确认。回读不发送消息。
- 原 WSHOTO 地址的 xuhuohua 详情已增加 v0.14.1 Skill 下载、SHA-256 文件和 Prompt 复制按钮。保留 19 个项目、原 Windows 下载与其他项；仅上传单份 HTML，不上传日志、截图或任何私有状态。
- 原始地址（无查询参数）公网回读与候选全文字节一致，HTML SHA-256 为 `314750b56abb70296f8cdd4de94bdad7963f9f5043faee76548d196eaa032060`。浏览器原深链验证云端区、下载链接、复制按钮及无横向溢出通过。
- 原计划每天北京时间 09:00 保留，同目录 root 唯一入口，ubuntu 旧抖音入口为 0；QQ cron 未改。今日实测不代表对所有未来运行作保证，后续结果由原定时任务与通知记录给出。

## 2026-10-16 authentication audit

续火花云端登录失效分析（2026-10-16）

已确认：
1. root 唯一抖音 cron 09:00，ubuntu 无重复抖音发送入口；当前统一脚本读取引擎目录 storage-state.json，使用 Headless Shell。10/07 修复的重复调度和旧路径问题本次未复发。
2. cron.log：10/08—10/13 每日成功 6、失败 0；10/14—10/16 进入私信页即 AuthenticationError，未发出消息。
3. 引擎目录登录态最后修改于 09/30 16:00:58 +08:00；父目录兼容文件为 09/28 18:23。核心 sessionid 等 Cookie 标注到期 11/29，当前不是这些字段的本地到期时间已过。
4. 续火花 desktop-logs 中 noVNC 连接记录止于 09/30 16:00，随后关闭；这与引擎快照时间相符。未发现本目录近期再次登录并更新快照的证据。服务器其他抖音业务拥有各自独立 profile，不能据其登录成功推断续火花已更新。
5. 使用正式运行的 root、Headless Shell、同一登录快照，只读访问 /chat：visible_login=[text=登录后]，无风险标记、无好友搜索框。支持实际认证不可用。
6. app/browser.py open_douyin：launch + new_context(storage_state=...)，finally 直接 context.close；没有 context.storage_state(...) 写回。定时任务持续使用静态旧快照，运行中会话更新不持久化，是明确的维护缺口。

边界：
Cookie 标注到期日不等于服务端承诺有效期。当前不能从文件和页面证明服务端撤销的具体原因（其他端登录、风控、会话更新等），也不能仅凭时间相关性断言未写回就是 10/14 失效的唯一触发原因。
9/30 当时的保存有效，10/08—10/13 成功日志可作证；保存成功不等于后续自动续期。若用户在其他日期通过 noVNC 再次登录，当前资料不足以定位那次桌面对应的业务。

建议：
统一人工登录与 cron 的认证位置；仅在私信页验证通过时原子保存最新 storage_state，保留最后有效备份，认证失败绝不覆盖；登录后关闭原浏览器，再以真实 cron 用户/入口做只读演练。后续评估完整持久化 profile 与 Headless Shell 的兼容性，不能直接替换已验证的浏览器模式。单次重新扫码只能恢复当前会话，不能修复维护机制。

本次只读诊断，没有重发消息、覆盖登录态或修改业务代码/定时任务。

## 2026-10-16 v0.14.2 会话维护修复部署

- 源码与标签：lyzbcy/xuhuohua v0.14.2，fb8fbffecb9c73837cd3f350f946a8617cc35112。版本发布状态见 GitHub Release，不把标签推送当资产已发布。
- 服务器正式安装目录 /home/ubuntu/xuhuohua-deploy 已部署认证引擎与 Skill；原 root 09:00 调度保持不变，root/ubuntu crontab 与 Cookie、config、发送 history 的摘要在部署前后完全一致。未补发消息。
- 变更：app/auth_state.py 在私信验证后与正常结束时保存更新，原子替换、600、旧快照备份、保留 owner、拒绝覆盖其他进程的新登录。认证或风险失败不写回。人工登录与任务共用 run.lock；登录验证真实私信页，关闭完整浏览器后用统一 Headless Shell 入口独立演练。
- 老用户：Skill 静默更新只改说明/脚本，不改执行引擎。用同版本校验 ZIP 执行 upgrade-douyin-auth.py，只更新 app/auth_state.py、app/main.py、scripts/login.py，备份放原目录 auth-upgrade-backups。工具取得任务锁并支持写入失败回滚；QQ、cron、私有状态不覆盖。
- 证据 /home/ubuntu/xuhuohua-auth-fix-20261016：engine-tests.log 230 passed；deployment.json；离线真实 Headless Shell 的 Cookie/localStorage 写回后全新浏览器恢复通过；本地软件/部署单测 56 passed、Skill 结构与云端包隐私门禁通过。
- 现场默认 :99 已由其他业务的 ubuntu Xvfb 占用，root x11vnc 发生 MIT-SHM BadAccess。恢复登录使用本次独立的 :98、仅回环 5901/6089，并通过 SSH 隧道；不停止其他业务 :99，不操作评论/创作者 profile。本次桌面 PID 在上述工作目录，关闭时只停止准确 PID。
- 旧认证会话已失效，代码升级不能恢复；扫码及独立演练状态见工作目录 status.json / 本机 verification/20261016-auth-fix-status.json。不要在未扫码时宣称明早已恢复发送。
- 已创建本聊天单次 heartbeat，计划 2026-10-17 09:15 北京时间只读核查 09:00 实际定时结果、会话写回和通知。不得自动补发或把演练当真实送达。
