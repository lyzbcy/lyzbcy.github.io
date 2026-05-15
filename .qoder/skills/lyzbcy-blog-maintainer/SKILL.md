---
name: lyzbcy-blog-maintainer
description: Maintenance and handoff guide for the lyzbcy.github.io project. Use this skill whenever someone is asked to modify, debug, publish, or review this specific Jekyll/Chirpy blog repository, especially for posts, encrypted articles, GitHub Pages deployment, local preview, workflow troubleshooting, or project handoff. Also use it when a new maintainer needs to quickly understand common pitfalls, safe edit patterns, and repo-specific conventions.
---

# lyzbcy.github.io 项目维护 Skill

这个 Skill 不是通用的 Jekyll 教程，而是 **这个仓库自己的接手说明 + 易错点说明 + 安全维护流程**。

## 目标

在接手 `lyzbcy.github.io` 项目时：
- 快速理解仓库结构
- 优先避开已经踩过的坑
- 用更安全的方式修改内容
- 在需要时再逐步展开更细的参考文档

## 使用原则

1. **先识别任务类型，再读对应参考文件。** 不要一上来把所有参考文档都读完。
2. **优先最小修改。** 对已有文章、布局、脚本、workflow，尽量只改目标点位。
3. **修改前先看上下文。** 特别是 HTML、YAML front matter、Liquid、JS 混合区域，不能盲改。
4. **对中文内容和编码保持敏感。** 这个仓库包含大量中文文章与前端模板，任何批量替换、脚本回写、跨工具编辑前，都要先确认编码策略。
5. **先本地确认，再提交发布。** 涉及页面结构、加密文章、GitHub Pages workflow 时尤其如此。

## 推荐接手顺序

### 1) 先看仓库结构
重点关注：
- `_posts/`：博客文章
- `assets/`：样式、脚本、图片等资源
- `_config.yml`：站点配置、URL、permalink 等
- `.github/workflows/`：GitHub Pages 构建/部署
- `_includes/`、`_plugins/`：布局与行为扩展

### 2) 根据任务类型读取对应参考
- 如果是 **文章编辑 / 加密文章 / front matter** → 读 `references/content-and-posts.md`
- 如果是 **部署 / workflow / GitHub Pages** → 读 `references/deploy-and-workflow.md`
- 如果是 **前端交互 / 局部加密 / 页面行为** → 读 `references/frontend-and-ui.md`
- 如果是 **准备交接 / 总结经验 / 补充规则** → 读 `references/maintenance-rules.md`

### 3) 修改时遵循安全流程
1. 先读目标文件，不要凭猜测替换
2. 小步编辑，避免大块正则误伤
3. 涉及中文文件回写时，确认编码不被破坏
4. 涉及线上页面时，优先验证生成结果或 diff
5. 发布后记录新增坑点到对应 reference，而不是重新堆回单一“大杂烩文档”

## 输出要求

当你协助维护这个仓库时，输出应尽量包含：
- 改了什么
- 为什么这么改
- 是否有 repo-specific 风险
- 如果发现新坑，应该补到哪个 reference 文件里

## 维护规则

### 新经验怎么写
不要再往一个无限增长的“错题本”里堆流水账。
应按主题写入：
- `references/frontend-and-ui.md`
- `references/deploy-and-workflow.md`
- `references/content-and-posts.md`
- `references/maintenance-rules.md`

### 什么内容值得沉淀
只沉淀：
- 高复现概率的坑
- 这个仓库特有的约定
- 会导致破坏性结果的错误操作
- 对新人接手很关键的快速判断规则

不要沉淀：
- 一次性的闲聊记录
- 纯过程流水账
- 没有抽象价值的临时命令

## 快速决策提示

如果你只剩很少时间，至少先做这三件事：
1. 读取目标文件原文
2. 读取最相关的 reference 文件
3. 只做最小范围修改
