# 🧠 AI 开发错题本与经验蒸馏 (AI Mistake Book)

> **架构初衷**：
> 这是一个用于指导 AI 代理（如我）进行自查、反思和复用的“错题本”。
> \- **开发前**：AI 应先主动检阅此文档，避免踩坑。
> \- **开发后**：AI 应复盘错误与解决思路，将新经验补充至此。
> \- **定期蒸馏**：对繁杂的流水账进行抽象总结，提炼为通用的 Skill 或系统级 Prompt。

---

## 🔖 目录 (Index)
1. [前端与 UI 开发 (Frontend & UI)](#1)
2. [后端与构建部署 (Backend & Deploy)](#2)
3. [Jekyll与博客架构 (Jekyll & Blog)](#3)
4. [AI 代理通用工作流 (AI Agent Workflow)](#4)

---

<br>

<h2 id="1">1. 前端与 UI 开发 (Frontend & UI)</h2>

### 📌 局部加密的滚动死锁问题
* **情形描述**：博客原生的 `encrypted-post.js` 采用全屏遮罩 `100vw/100vh` 且给 `body` 增加 `overflow: hidden` 来锁定滚动。当需求变为“部分加密”（行内加密）时，如果重用原本 JS 逻辑，会导致用户一旦输入错误或未解锁，整个页面被锁死无法滚动阅读其他内容。
* **正确解法**：不要在部分加密时复用全局逻辑，应内联或单独编写针对该特定区块的 JS 遮罩层逻辑（如将 `position: fixed` 改为 `position: relative/absolute`，并移除滚动锁定逻辑）。

### 📌 Web PPT (Reveal.js) 垂直滚动适配
* **情形描述**：普通的网页转 Reveal.js 容易遇到单页内容过长直接被截断的问题，因为 Reveal.js 默认不支持单 slide 内部纵向滚动。
* **正确解法**：赋予 `.reveal .slides section` CSS 属性：`max-height: 95vh; overflow-y: auto !important;`，并且避免在页面内嵌入禁止滚动的触控事件劫持代码。

---

<br>

<h2 id="2">2. 后端与构建部署 (Backend & Deploy)</h2>

### 📌 GitHub Actions Node 20 弃用警告
* **情形描述**：`actions/checkout@v4`、`actions/configure-pages@v4` 等基于 Node.js 20，2026年6月2日之后会强制 Node 24 且报错。
* **正确解法**：在 Workflow 文件的最顶层或 Job 层级加入环境变量 `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true`，以提前适配并消除警告。

---

<br>

<h2 id="3">3. Jekyll 与博客架构 (Jekyll & Blog)</h2>

### 📌 加密博文密码获取
* **情形描述**：Jekyll 博客文章的 YAML frontmatter 属性（如 `password_hash`），无法直接被外部的 `.js` 脚本拿到。
* **正确解法**：必须通过 Liquid 渲染（例如 `{{ page.password_hash }}`）内联注入到 HTML 的 `<script>` 环境配置中（如 `window.CORRECT_PASSWORD = '...';`），外部脚本才能取值判断。

---

<br>

<h2 id="4">4. AI 代理通用工作流 (AI Agent Workflow)</h2>

### 📌 破坏性文件修改防范工作流
* **反思**：在编辑文件尤其是结构敏感文件（如 HTML / YAML / JS）时，如果没有看全上下文就贸然用正则或大块替换，极大概率会造成括号不匹配或破坏原有语法。
* **正确解法**：
  1. 先用 `view_file` 看清楚相关代码块及其上下文缩进。
  2. 若修改篇幅小，优先运用 `replace_file_content` 精准定位 `StartLine` 和 `EndLine`。
  3. 任何新建的“特性”，能不修改原全局文件（以防影响其他没留意的业务），就用 inline 的方式隔离。

---

> **📝 维护指北**：
> 亲爱的 AI：下次接手任何核心修改任务前，请用 `grep_search` 或是直接 `view_file` 查阅这个文档。遇到新的坑，请在任务结束后按照如上格式把坑和解决方案补进来。保持精简，拒绝废话。
