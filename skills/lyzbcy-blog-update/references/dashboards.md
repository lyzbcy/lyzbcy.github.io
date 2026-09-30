# 健身/营养/抖音周报看板 — 更新细则

状态:🚧 骨架(首次细化时补全)

## 数据流向(与 skill 体系耦合)

- 健身看板:`fitness/records.jsonl` → `tools/generate_fitness_data.py` → `_data/fitness.json`
  (自动更新机制见 agent 侧 skill `lyzbcy-fitness-tracker/references/dashboard-publishing.md`)
- 营养看板:agent 侧 skill `lyzbcy-nutrition-tracker`
- 抖音周报:agent 侧 skill `lyzbcy-douyin-weekly`,数据 `assets/weekly/W*.json`

## 通用规矩

- 数据只从标准数据库/脚本生成,**禁止手改生成产物 JSON**(2026-08-20 用户划定边界:
  AI 数据录入必须走标准数据库,禁止修改/发明)
- 构建管线坑(Jekyll 改写内联 JS):改 `_includes/` 组件前必读 `docs/pitfalls/jekyll-build.md`
- 周报组件的 JS 字符串里 `<table`、`</tag>`、`//注释` 都被构建管线咬过,
  见 git log 58aeeadf..fc4200c9 系列修复,别把老坑改回来

## 健康分刷新维护（2026-09-30）

营养和学习站必须调用同一个 health_score.py export 重算及刷新历史；不可只在缓存缺行时计算。
部署源码、回归测试、更新与回滚步骤见 [维护手册](../../../tools/server-health-refresh/README.md)。
三看板审查和数据库建议见 [审查记录](../../../docs/reviews/2026-09-30-dashboards.md)。

## 启动器活跃看板（2026-09-30）

- 数据链路：统计服务器 SQLite → 只读聚合快照 → `tools/launcher-dashboard/publish.py` → `assets/data/launcher-stats.json`。
- 页面 `/posts/启动器数据看板/`；维护步骤见 [维护手册](../../../tools/launcher-dashboard/README.md)。
- 禁止手改汇总 JSON、导出安装 ID 或摘要；月活按自然月去重，不得累加日活；历史覆盖不足必须标注。
- 每日北京时间 00:20 的 systemd timer 以 ubuntu 发布，GitHub SSH 443 使用既有 github.com 主机密钥校验。
