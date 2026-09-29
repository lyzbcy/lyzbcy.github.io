---
name: lyzbcy-tier-posters
description: 更新 lyzbcy.github.io 的五六食堂、江南大学外卖、方便面从夯到拉排名及一图流时使用。统一刷新三张海报，保留原始小数评分、微信表情包与上下引流，并检查文字溢出。适用于小龙虾/OpenClaw 等代理。
---

# 从夯到拉：三榜一图流

本文件是仓库内维护的一图流更新规范。先进入 `lyzbcy.github.io` 仓库根目录；不要使用旧备份目录的 `generate_posters.py`。

## 最短执行流程

1. 先检查 `git status --short` 并取得最新主分支。已有未提交改动先保留；不要用过时本地副本覆盖远端。发布链路见 [push-pipeline](../../docs/howto/push-pipeline.md)。
2. 只按用户评价更新对应原始 JS、商品图片和文章隐藏文本。评分、档位、名称、评价不能自行改写。页面细则在 [博客 skill](../lyzbcy-blog-update/SKILL.md)。
3. 仓库根目录运行以下命令。已有环境可跳过安装。需要 **Python 3.10+、Node.js 18+**；Windows 的 `python3` 可替换为 `python`。

```bash
python3 -m venv .venv-posters
# Linux/macOS:
source .venv-posters/bin/activate
# Windows PowerShell 改用：.\.venv-posters\Scripts\Activate.ps1
python -m pip install -r tools/requirements-posters.txt
python tools/generate_posters.py --all
python tools/generate_posters.py --all --check
python -m unittest discover -s tests -p 'test_tier_posters.py'
```

4. 打开三张 PNG，查看顶部、各档位、最长名称/简介、小数评分和底部。`--check` 成功只代表数据/文件/边界检查通过，不能替代看图。
5. 提交本次数据、图片、文章及 **3 张 PNG + 3 份 `.audit.json`**。只暂存本任务相关文件。获准发布时推送，等 Pages 构建成功后核对线上海报；不要把本地成功当成已上线。

```bash
git add assets/img/posters/poster-dine.png assets/img/posters/poster-dine.audit.json
git add assets/img/posters/poster-takeout.png assets/img/posters/poster-takeout.audit.json
git add assets/img/posters/poster-noodle.png assets/img/posters/poster-noodle.audit.json
# 另按实际修改逐个 add 数据 JS、商品图和文章，再 commit/push。
```

## 数据与评分规则

| 榜单 | 数据源（assets/lib-custom/） | 海报（assets/img/posters/） | 原始评分来源 |
|---|---|---|---|
| 五六食堂 | canteen-tier.js 的 stalls | poster-dine.png | tierLabel 明确写「数字 星」时取该值，否则取 rating |
| 江大外卖 | takeout-tier.js 的 stalls | poster-takeout.png | tierLabel 的「店铺得分」或「评分」，没有数字才取 rating |
| 方便面 | noodle-tier.js 的 noodles | poster-noodle.png | tierLabel 中的数字爱心/星数；rating 是旧网页档位索引，不能当实际评分 |

- **5.8 就是 5.8，5.5 就是 5.5，3.83 就是 3.83，6 就是 6。** 不使用 `parseInt`、整数星数或按档位推断评分。标签中的尾随零保留，例如 4.90。
- 方便面原评「史」按定性原评展示，不能自行换成 1 星或 2 星。未知评分格式会报错，查源数据或问作者，不要猜。
- 食堂名称纠正、已歇业/疑似歇业从 `canteen-tier-extras.js` 读取；外卖疑似歇业从 `takeout-tier-extras.js` 读取。更新源名单，不在生成器复制名单。
- 名称完整换行，卡片高度随名称增长；简介最多三行，按真实字宽截断并加「…」，完整评价仍在文章中。不要为了塞进卡片缩写或润色评价。
- 食堂/外卖档内顺序跟随网页的 rating 降序（同分保留原数组次序），方便面保留原数组顺序；评分文字仍按上表取原始精确值。

## 只有一套生成实现

- **唯一入口：`tools/generate_posters.py --all`**。`--kind dine|takeout|noodle` 可用于单榜调试；交付前仍跑 `--all --check`。
- `tools/export_tier_data.cjs` 是入口调用的数据导出助手，不是另一套排版脚本。它支持单/双引号、拼接字符串、嵌套数组及带空格的路径。
- 历史命令 `tools/render_noodle_poster.py` 只转发到统一生成器，没有自己的排版。禁止恢复旧版，禁止再从成品 PNG 裁剪头尾。
- 字体（含许可）、Emoji 字体、七张精选微信表情包都在 `assets/img/posters/resources/`，无需访问个人电脑的表情包目录。
- 顶部与底部均包含完整测评入口。食堂/外卖回复「江大美食」，方便面回复「方便面」，公众号统一为「捞鱼的博客」。
- 用户明确要求改版时可修改这套实现并跑测试；普通数据更新只改源数据然后重绘。

## 报错怎么处理

| 报错 | 处理 |
|---|---|
| 找不到 node / Python 包 | 检查 Node 18+；用当前 Python 安装 requirements-posters.txt |
| 缺商品图 | 修复条目的 bgImage 和对应本地图片；不要用占位图掩盖 |
| 缺字体/表情包 | 从仓库恢复 resources 对应素材；不要关闭检查或无表情降级 |
| 无法唯一确定原始评分 | 看该条 tierLabel 和用户原评；不要退回取整或按档位赋分 |
| 字体缺字 / 文字溢出 | 检查新增字符和布局；保留原文，修字体或换行后重跑测试与三榜 |
| 输入已更新而海报未刷新 | 运行 `--all` 再运行 `--all --check`，一起提交 PNG 和 audit |
| 图片与验收记录不匹配 | 重新生成；不要手改 audit 哈希来跳过检查 |

## 小龙虾如何发现本 skill

仓库的 `skills/` 是权威副本，`lyzbcy-blog-update` 会引导到本文件。若 OpenClaw 的 skills 目录在 `/home/openclaw-shared/skills/`，可由维护者把 `lyzbcy-tier-posters` 链接到本仓库同名目录；以实际安装路径为准，不假设所有机器都一样。没有安装链接时，直接让代理读取仓库中的本文件也能执行。后续仓库更新后先重新读取，别沿用旧上下文中的脚本命令。
