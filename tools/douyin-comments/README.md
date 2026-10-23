部署、验证、回滚和研究依据见 [维护记录](../../docs/pitfalls/douyin-comments-30days-api.md)。本目录不包含任何账号凭据、作品缓存或实际评论。

## 2026-10-23 连续卡住与浏览器锁修复

实证：09:07与11:07任务运行约15分钟后被外层SIGTERM终止；11:07遗留xvfb/npm/node/Chromium完整采集子树，直到排查时仍占用douyin-profile。09:23回复明确报ProcessSingleton冲突，09:24清理后重跑成功2条。调度表last_run_status=ok仅表示Agent回合正常结束，其summary仍可能是业务失败，不得以该字段宣布评论任务成功。

风险点：ensureCommentPageReady在页面入口不可见后调用promptForEnter，旧版cron无TTY也会等待输入；采集pending响应和其他子步骤也可能停滞。历史stdout被capture_output缓存且外层终止后丢失，无法确证每次卡住的最内层位置。已封堵非TTY交互等待、并给每阶段设置硬超时；主进程收SIGTERM/SIGINT或阶段超时，都清理独立进程组（含孙进程），不再只杀Python。采集上限480秒，其他阶段默认180秒；stdin为DEVNULL。整轮flock互斥避免重叠。START/STAGE与flush阶段输出帮助定位。collector顶层错误非零退出，原始异常尾部与超时输出记录日志；修复日志清理naive/aware时区比较问题。

超时只能报结果未确认，不得推断采集数/已发送数为0；不因未知结果盲目重发旧计划。重试仍走run-check.py重新读取当前未回复评论。INTERACTIVE_REQUIRED表示页面入口/人工处理问题，不能直接认定登录失效。

验证：7项Python测试（原2项+进程组超时/父信号/互斥/stdin/返回码），16项接口/日期Node测试，非TTY交互立即拒绝检查，均通过。正式--collect-only验证13个近30天作品全部API成功，发现1条当前未回复，不调用LLM、不发送、未改变检查时间戳。09:24历史成功2条不代表本轮。备份在ubuntu私有state目录douyin-comments-backup-20261023。保留profile、persona与业务频率配置。
