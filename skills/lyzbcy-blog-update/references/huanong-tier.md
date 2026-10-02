# 华农附近美食从夯到拉排名

- 文章：`_posts/2026-10-02-华农附近美食从夯到拉排名.md`
- 数据：`assets/lib-custom/huanong-tier.js` 的 `stalls`，卡片和详情沿用外卖篇结构。
- 海报入口：`assets/lib-custom/huanong-tier-extras.js`。
- 一图流：`assets/img/posters/poster-huanong.png` 与同名 `.audit.json`。
- 唯一生成器：`python tools/generate_posters.py --all`，交付前加 `--check` 验证全部榜单。

评分以作者确认为准：常规满分 5 星，特别好吃可给 6 星，麦当劳 2.5 星是口味比较基准，
并非 NPC 档的最低分守门员，因此不设 `anchor: true`。2026-10-02 确认：金马门夯 6 星，
龙哥夯 4.5 星，波波鱼人上人 3.1 星，舌尖大师人上人 3 星，麦当劳 NPC 2.5 星，毛辣果 NPC 2 星。

价格保留回忆价标记；未提供的价格、具体分店、鱼种、汤名不猜。具体菜品放 `dishes`。
海报上下入口直接展示博客地址；尚未配置公众号关键词自动回复，不得声称回复关键词可获取本篇。
原四张海报布局保持一致；生成器支持新榜单后要同步更新原四榜 audit 中的脚本哈希。
