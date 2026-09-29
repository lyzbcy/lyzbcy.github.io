# 江南大学外卖从夯到拉排名 — 更新细则

对应文章:`_posts/2026-08-15-江南大学外卖从夯到拉排名.md`
状态:已核对数据、评分与统一一图流入口。

## 页面架构

1. 数据:`assets/lib-custom/takeout-tier.js` 的 `stalls`；`takeout-tier-extras.js` 管疑似歇业与海报入口
2. 隐藏文本:文章底部
3. 海报:`assets/img/posters/poster-takeout.png` 和 `poster-takeout.audit.json`

原始评分优先取 `tierLabel` 的「店铺得分」或「评分」。例如螺判官标签为 3.83，
旧 `rating` 为 3.8，必须显示 **3.83**。保留原始小数和「估」标记；标签无数字才取 rating。

## 通用规矩(与 noodle-tier 一致)

- 档位/星级/评价 = 用户原话,禁止修改/降档/润色,不确定就问
- 新增条目格式照抄相邻条目；外卖当前条目无必填商品图，不套用方便面图片规范
- 改数据后同步隐藏文本，运行 `python tools/generate_posters.py --all` 和 `--all --check`

依赖安装、看图验收、提交文件清单见 [统一一图流 skill](../../lyzbcy-tier-posters/SKILL.md)。
