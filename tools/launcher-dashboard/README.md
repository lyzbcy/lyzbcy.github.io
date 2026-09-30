# 启动器活跃看板

数据源为统计服务器 SQLite，只由 `export_blog.py` 只读生成汇总快照，再由本目录 `publish.py` 白名单校验并发布 `assets/data/launcher-stats.json`。禁止手改 JSON，禁止导出安装 ID、摘要、IP 或密钥。

页面：`/posts/启动器数据看板/`。组件：`_includes/launcher-board.html` 与 `assets/lib-custom/launcher-board.{js,css}`。JS 使用外部文件，避免 Jekyll 压缩器改写。

服务器使用 `laoyu-launcher-dashboard.timer` 每日北京时间 00:20（随机延后最多 2 分钟）触发：snapshot 服务以统计账户读取数据库；dashboard 服务以 ubuntu 身份提交本任务唯一数据文件并推送。没有新增常驻服务。失败会保留旧页面，页面超过 26 小时显示更新延迟。

检查：`systemctl status laoyu-launcher-dashboard.timer`，`journalctl -u laoyu-launcher-dashboard.service -n 20`。手动刷新：`sudo systemctl start laoyu-launcher-dashboard.service`。停用：`sudo systemctl disable --now laoyu-launcher-dashboard.timer`。

月活按自然月独立 HMAC 去重，明细保留当前与上月，汇总约 400 天。首月为部分覆盖，禁止把日活求和当作月活。日活不包含采集开始前的伪零值。当前日和当前月未结束，不宣称完整统计。
