# 江南大学五六食堂排名

- 数据：`assets/lib-custom/canteen-tier.js` 的 `stalls`。
- 展示名称纠正和营业状态：`assets/lib-custom/canteen-tier-extras.js` 中 `NAME_FIXES`、`NAME_OVERRIDES`、`CLOSED`、`UNCERTAIN`；生成器同步读取，不维护第二份名单。
- 文章：`_posts/2025-11-26-江南大学第五六食堂（大悦城、星光）从夯到拉排名.md`。
- 海报：`assets/img/posters/poster-dine.png` 和 `poster-dine.audit.json`。
- 评分：`tierLabel` 明确包含数字星数时保留该值，否则用 `rating`；不把 3.9、4.3、4.5 变成整数，也不依据档位反推评分。

按用户原话修改数据；完成后执行 [统一一图流 skill](../../lyzbcy-tier-posters/SKILL.md) 中的生成、验收和提交步骤。引流关键词为「江大美食」。
