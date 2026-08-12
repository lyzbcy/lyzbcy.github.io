# Tracker Page Usability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复营养与健身追踪页的移动端宽表溢出、信息过密、评分提示不可触控和模板重复问题。

**Architecture:** 保持现有 Jekyll/Liquid 数据流不变，只调整两篇文章模板。使用原生 `details/summary` 管理次要内容，使用独立表格滚动容器控制移动端宽度，并用一段小型渐进增强脚本控制评分说明。

**Tech Stack:** Jekyll、Liquid、HTML、CSS、原生 JavaScript、Node.js 静态回归测试

---

### Task 1: 建立页面结构回归测试

**Files:**
- Create: `test/tracker-pages.test.js`
- Modify: `package.json`

- [ ] 编写测试，断言两个页面具备局部表格滚动、营养页具备折叠区与可访问评分按钮、历史记录过滤无效项且重复评分区已经删除。
- [ ] 运行 `npm test`，确认测试因上述结构尚不存在而失败。

### Task 2: 修复移动端宽表和小字号

**Files:**
- Modify: `_posts/2026-08-01-饮食营养追踪.md`
- Modify: `_posts/2026-07-12-健身训练追踪.md`

- [ ] 给所有表格容器增加局部横向滚动、焦点轮廓和最小表格宽度。
- [ ] 给裸露的食物库表增加同类容器。
- [ ] 提升两页移动端辅助文字字号，并优化健康评分卡的窄屏排列。
- [ ] 运行 `npm test`，确认表格相关断言通过。

### Task 3: 营养页信息分层与评分交互

**Files:**
- Modify: `_posts/2026-08-01-饮食营养追踪.md`

- [ ] 把食物库和详细历史趋势放入默认收起的原生折叠区。
- [ ] 将评分问号改为按钮，并增加点击、键盘、Escape、外部点击切换逻辑。
- [ ] 删除底部重复的今日评分卡和多余分隔线。
- [ ] 在 Liquid 渲染层过滤空日期与零分历史记录。
- [ ] 运行 `npm test`，确认全部结构测试通过。

### Task 4: 构建与真实页面验证

**Files:**
- Verify: `_posts/2026-08-01-饮食营养追踪.md`
- Verify: `_posts/2026-07-12-健身训练追踪.md`

- [ ] 使用项目可用的 Jekyll 环境完成构建，确认无 Liquid 或 HTML 结构错误。
- [ ] 在桌面视口检查首屏、折叠区和评分按钮。
- [ ] 在 390×844 视口确认页面无整体横向滚动、表格区域可单独滚动。
- [ ] 复查 `git diff`，确保没有修改用户无关文件。
