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
