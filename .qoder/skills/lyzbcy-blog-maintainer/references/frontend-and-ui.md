# Frontend & UI 参考

## 适用场景
当任务涉及以下内容时读取本文件：
- 页面交互异常
- 加密文章前端逻辑
- Reveal.js / Web PPT 页面适配
- 样式或局部遮罩行为修改

---

## 1. 局部加密不要复用全局滚动锁逻辑

### 问题
原始 `encrypted-post.js` 偏向“整篇文章加密”模型，常见做法是：
- 全屏遮罩
- `100vw / 100vh`
- 对 `body` 加 `overflow: hidden`

如果直接把这套逻辑用于“局部加密”或“页面中的某一块加密”，会导致：
- 输入错误密码后整页无法正常滚动
- 用户看不到页面其他内容
- 页面交互体验被锁死

### 正确做法
局部加密应单独实现局部遮罩逻辑：
- 遮罩基于局部容器定位，不要默认 `position: fixed`
- 不要顺手给 `body` 上全局滚动锁
- 让未解锁时的影响范围仅限目标内容块

### 接手建议
看见“部分内容加密”的需求时，不要偷懒复用整页加密脚本；优先局部实现。

---

## 2. Reveal.js 页面要显式处理超长内容滚动

### 问题
把普通 HTML 内容塞进 Reveal.js slide 时，超长内容容易被截断，因为默认不是给单页内容做纵向滚动设计的。

### 正确做法
对 slide 容器增加类似：
- `max-height: 95vh;`
- `overflow-y: auto !important;`

并避免注入会拦截滚动或触摸事件的脚本。

### 接手建议
只要是 Web PPT / Reveal.js 改版，先检查内容溢出和滚动行为，再谈视觉优化。

---

## 3. 修改 HTML / Liquid / JS 混合文件时，先看完整上下文

### 风险
这个项目里有一些文件会混合：
- HTML
- Liquid 模板语法
- JS
- YAML front matter

如果不看上下文就替换，很容易出现：
- 标签不闭合
- 引号损坏
- Liquid 语法被破坏
- JS 字符串被误改

### 正确做法
- 先读取目标片段上下文
- 尽量做精确修改，不做大范围模糊替换
- 如果只是加一个小特性，优先局部插入，不要重写整页

---

## 4. 中文内容文件要特别注意编码

### 风险
这个仓库大量内容是中文文章。如果用不合适的脚本或 shell 回写，很容易出现：
- 中文乱码
- 文本正常显示在某工具里，但实际文件字节已损坏
- front matter 与正文同时被污染

### 正确做法
- 修改前确认文件原本编码
- 回写时显式指定 UTF-8
- 如果怀疑文件已经损坏，优先从 git 历史恢复，再做最小改动

### 接手建议
如果只是改一个字段，不要用高风险批量回写链路；能精确改单行就别重写整文件。

---

## 5. 文章正文里的内联 `<script>` 会被 Jekyll 构建链静默丢弃 —— 一律抽成外部 JS

### 现象（真实踩坑，2026-07-30）
`_posts/2026-07-29-抖音数据看板.md` 在 `</style>` 后写了一大段内联 `<script>…800 行交互逻辑…</script>`（排序 / 详情面板 / 多作品对比）。源码里完整存在，GitHub Actions 构建也 `success`，但 **gh-pages 部署产物里整段 `<script>` 连同它后面紧邻的部分 HTML（如 `dy-detail-panel` 的子元素）一起消失**，导致这三个功能线上完全失效，且**没有任何构建报错或 warning**。

### 根因
不是 kramdown 单独渲染的问题（用 kramdown 2.5.2 + GFM input 单独渲染该 markdown，`<script>` 完整保留）。是 **Jekyll 完整构建链（Ruby 3.3 + jekyll 4.4.1 + Chirpy + 插件 + Liquid 二次处理）** 的某个环节把它丢了。具体环节未能本地完全复现（本地 Ruby 2.6 跑不起 jekyll 4.x），但**实证确凿**：源码有 → gh-pages 产物无。

### 危险信号（看到要立刻警觉）
- 文章 markdown 里写了内联 `<script>…</script>`，尤其块内有：空行分隔的多段 JS、JS 字符串里含 HTML 标签（如 `html += '<div>…'`）、正文中间出现裸 `---`（markdown 分隔符/YAML 边界歧义）。
- 线上某功能"点了没反应"，但源码里明明写了事件绑定。
- gh-pages 产物里某段 HTML 结构"莫名其妙不闭合"（如 `<div class="x-inner"></main>` 这种 div 没闭合就被外层闭合）。

### 正确做法（仓库既有惯例）
- **永远不要在文章正文里写大段内联 `<script>`。** 一律抽成独立 JS 文件放进 `assets/lib-custom/`（仓库已有 supplement-tier.js / canteen-tier.js / love-tier.js / noodle-tier.js / **douyin-board.js** 等先例）。
- 文章里只用一行引用：`<script defer src="/assets/lib-custom/xxx.js"></script>`。`defer` + 外部文件 = 不受 markdown 解析影响。
- 外部 JS 用 IIFE 包裹 + `document.readyState` 判断，兼容任何加载位置（见 douyin-board.js 的 `init()` 写法）。

### 验证方法
- 改完不要只看源码，**必须核对 gh-pages 分支的实际部署产物**：`git show FETCH_HEAD:posts/<slug>/index.html | grep -c "<script"`，确认外部引用在线上真实存在。
- 或部署后 `curl` 线上页面 grep 关键 JS 函数名。

### 接手建议
只要任务涉及"给文章加交互"，默认就是"新建 assets/lib-custom/xxx.js + 文章里 `<script src>` 引用"，不要写内联 script。这是这个仓库绕开 Jekyll script 吞噬问题的唯一稳妥姿势。
