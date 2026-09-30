# 健康评分刷新维护（2026-09-30）

此目录保存服务器已部署脚本的版本化源码。不要维护第二套评分公式。

部署目标：

- `health_score.py` → `/home/openclaw-shared/skills/lyzbcy-nutrition-tracker/scripts/health_score.py`
- `aggregate.py` → `/home/openclaw-shared/skills/starbudding-study-tracker/scripts/aggregate.py`
- 身体算法继续使用现役 nutrition skill 的 `body_composition.py`，不在这里复制。
- 博客营养生成器仍为仓库 `tools/generate_nutrition_data.py`。

## 更新步骤

1. 拉取服务器和 GitHub 最新代码，检查未提交修改。以 `ubuntu` 身份工作。
2. 修改标准原始记录：营养 `nutrition/YYYY-MM-DD.json`，训练 `fitness/records.jsonl`；不得直接修改生成的 `_data/*.json` 或健康分缓存。
3. 验证原始 JSON 格式。运行 `python3 health_score.py export`，它重新计算所有截至指定日期的记录，刷新本地和共享 SQLite，并输出近 14 个自然日。`--date YYYY-MM-DD` 可用于历史核对；无记录日期不生成分数。
4. 运行博客 `python3 tools/generate_nutrition_data.py`。运行 study skill 的 `bash scripts/cron_update.sh`，它聚合、生成并原子发布学习站。
5. 比对两个生成结果：同日期分数应一致，今日分数应与历史该日期一致；数据库不应存在 NULL 日期。午间分数只是当前已录入数据的暂时结果，晚间再次生成后自动刷新。
6. 只提交本任务相关路径，以 `ubuntu` 身份推送博客，等待 Pages 构建完成后核对线上。

改源码前，用 SQLite backup API 备份两个评分库及学习库，并备份上述脚本。部署源码必须归属 `ubuntu:ubuntu`。学习站刷新失败时停止发布，保留上一次完整网页，查看 cron 日志；不要用旧缓存冒充刷新成功。

## 验证

本目录 `python3 test_health_refresh.py` 验证日期默认值、NULL 拒绝和清理、历史补录、共享缓存、14 自然日、无记录与未来体脂过滤。
`python3 test_consumers.py` 验证学习端每次重新调用 export、刷新失败退出、体重字段兼容。

9 月 29 日：1801 kcal、10 组训练、88 分；9 月 22 日：77 分。这些是 2026-09-30 审计时原始记录的结果，后续补录后应以引擎重算为准，禁止硬编码。

备份位于 `/home/ubuntu/dashboard-health-fix-20260930/`。回滚先恢复脚本并重新生成网页；若需恢复数据库，须先检查备份之后的新录入，不能直接覆盖新数据。
