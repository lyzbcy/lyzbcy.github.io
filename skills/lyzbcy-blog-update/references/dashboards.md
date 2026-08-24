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
