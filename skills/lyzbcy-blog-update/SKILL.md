---
name: lyzbcy-blog-update
description: 更新 lyzbcy.github.io 博客(方便面排名、外卖排名、健身/营养看板、周报等任何页面)时必须使用。用户提到"方便面排名""从夯到拉""新增XX到排名""更新博客""改档位/星级""重绘一图流/海报"等,先读本 skill 再动手,禁止凭记忆直接改。
---

# lyzbcy-blog-update — 博客更新总入口

本 skill 的权威位置在 **lyzbcy.github.io 仓库 `skills/lyzbcy-blog-update/`**,
随仓库一起版本化,任何 AI(小龙虾/周五涵/ZCode)更新本博客前必读。

## 🔒 三条铁律(先记住再往下读)

1. **改哪个页面,就先读哪个页面的 `references/` 细则**,没读禁止动手。
   页面细则 = 数据在哪个文件、格式长什么样、图片怎么找、哪些是禁区。
2. **档位、星级、评价文案 = 用户原话,AI 无权修改/降档/润色**,
   即使觉得"太夸张"——那是用户的排名,不是 AI 的。拿不准就问用户,别猜。
3. **改了数据就必须同步重绘一图流海报**(跑仓库现成脚本),
   禁止自己新写渲染脚本/手 P 图。历史教训:劣质重绘毁排版(808KB→173KB 翻车)。

## 📖 页面细则目录(渐进式披露:改哪个读哪个)

| 页面 | 细则文件 | 数据源 |
|---|---|---|
| 方便面从夯到拉排名 | [references/noodle-tier.md](references/noodle-tier.md) | `assets/lib-custom/noodle-tier.js` |
| 外卖从夯到拉排名 | [references/takeout-tier.md](references/takeout-tier.md) | `assets/lib-custom/takeout-tier.js` |
| 健身/营养/抖音周报看板 | [references/dashboards.md](references/dashboards.md) | `tools/generate_*.py` |

## ✅ 通用更新流程

```
1. 读对应页面 references/ 细则
2. 拿到用户原话评价(查会话/直接问),禁止 AI 编写评价
3. 按细则改数据文件(格式照抄相邻条目)
4. 找图(按细则的图片来源/大小/命名/盲测核验要求)
5. 同步:文章底部隐藏文本 + 重绘一图流海报(跑现成脚本)
6. git add 本页相关文件(别全仓 add),commit 格式照细则,push
7. 等 ~90s(Pages 构建+CDN)再验证线上
```

## 🚫 绝对禁止

- ✗ 凭记忆/历史经验直接改,跳过 references 细则
- ✗ 修改/降档/润色用户评价文案
- ✗ 动本次任务之外的任何文章
- ✗ 自写渲染脚本、改脚本布局参数/颜色/字体
- ✗ 不确定时自作主张——先问用户

## 📚 相关知识

踩坑速查表与技术栈见仓库 `docs/INDEX.md`(必查坑速查,命中就读对应 pitfalls 文档)。
推送链路见 `docs/howto/push-pipeline.md`(铁律:走服务器 ubuntu 身份 push,别本地直连)。
