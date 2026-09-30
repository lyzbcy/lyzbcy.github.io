# 项目更新入口

更新博客先读 `skills/lyzbcy-blog-update/SKILL.md`。
更新五六食堂、江南大学外卖、方便面、所有饮料和奶茶排名或一图流时，必须同时读
`skills/lyzbcy-tier-posters/SKILL.md`。四榜唯一生成入口为
`python tools/generate_posters.py --all`，交付前运行同命令加 `--check`。
评分及评价以用户原始数据为准；不取整、不按档位重新赋分。PNG 与 audit 一起提交。
外卖榜顶层只能录店铺；具体菜品必须录入该店铺的 `dishes` 数组。只有菜品信息、
没有真实店铺名/店铺评分/店铺评价时，先补问，禁止把菜名当店名加入榜单。

修改前检查工作区和远端最新内容，保留已有未提交工作。只暂存本次任务相关路径。
