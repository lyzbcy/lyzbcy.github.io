# 抖音采集维护（2026-10-16）

这里保存服务器实际部署源码，避免修复仅留在未受版本控制的运行目录。

- scrape-video-stats.mjs → /home/ubuntu/.openclaw/douyin-creator-tools/src/scrape-video-stats.mjs（保留原项目 lib/db.mjs 与 node_modules）
- collect.sh → /home/openclaw-shared/skills/lyzbcy-douyin-dashboard/scripts/collect.sh
- 以 ubuntu 身份部署；改之前备份并确认定时采集未运行。
- Node 22 语法检查：node --check scrape-video-stats.mjs
- 匹配回归：node test-work-matching.mjs /home/ubuntu/.openclaw/douyin-creator-tools/src/scrape-video-stats.mjs
- 聚合回归：python3 -m unittest discover -s tests -p 'test_douyin*.py'
- 完整验证：以 ubuntu 身份运行实际 collect.sh，核对日志、GitHub Actions 成功和线上时间/指标。

采集必须等待有效 item_performance 响应，再切到投稿列表导出作品明细。投稿分析的同名按钮导出一行汇总，禁止当成作品数据。导出失败或无作品明细时终止该轮，不覆盖为零互动数据。每步最多 3 次、单次 180 秒，间隔 20/40 秒，失败不冒充成功。

聚合从原始每日作品快照重算，不手改数据库或历史快照。唯一正式 ID 的发布时间分钟可关联旧 xlsx 占位记录；存在多个正式 ID 时保留，避免误并。同一作品增量、移入播放、移出播放分别展示。因缺采集日或平台窗口变化产生的差异不能标成昨日增长或删除。
