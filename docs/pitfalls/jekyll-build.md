# 坑:博客构建管线会改写 include 里的 JS(最阴的一族)

> 适用:任何放进 `lyzbcy.github.io` 的 `_includes/*.html`、post 内联 `<script>`。
> 2026-08-24 周报组件连中四枪,调试半天,全部记录于此。

博客开了 `compress_html`(_config.yml)+ Chirky 主题插件,它们**不认识"这是 JS 字符串"**,只认 HTML 模式。

## 坑 1:换行被压掉,`//` 注释吞掉同行代码

构建后整个 script 变成 0 换行单行。任何 `// xxx` 行注释会把**同一行后面的全部代码**注释掉——症状是 script"完全不执行"。

**铁律:include 的 script 里禁止 `//` 注释**(包括 URL 里的!见坑 5)。要用注释就 `/* */` 且不含敏感标签。

## 坑 2:JS 字符串里的 `</tag>` 被当 HTML 结束标签吃掉

`"</td>"`、`"</span>"` 等在压缩后**直接消失**(`endings: all`)。

**铁律:字符串里闭合标签一律写 `<\/td>`**(JS 里 `\/` 等价 `/`,浏览器正常,压缩器看不见)。批量:`js.replace("</", "<\\/")`。

## 坑 3:Chirky 插件改写 `<img` 和 `<table`

- 字符串里出现 `<img src="` → 图片灯箱插件把它包成 `<a class="popup img-link shimmer">...`,双引号**撕开你的字符串**
- 字符串里出现 `<table` → 表格包装器往前面插 `<div class="table-wrapper">`(带双引号),同样撕裂

**铁律:拆开写** `'<im' + 'g src="...`、`"<ta" + "ble class=..."`。kramdown 还会把正则字符类里的 `<>` 转义成 `&lt;`——esc 函数用 `\u003c` unicode 写法。

## 坑 4:我自己的批量正则误伤

用 `re.sub(r'//[^\n]*', '', js)` 清注释时把 URL `"https://giscus.app/..."` 里的 `//` 也清了。

**铁律:对代码做批量正则时,先数命中数,改完必须语法检查**(服务器有 node:`/home/ubuntu/.nvm/versions/node/v22.23.1/bin/node --check 文件`)。

## 坑 5:URL 里的 `//`

同上,压缩后 URL 里的 `//` 一般没事(压缩器不处理字符串内 //),但**自己清注释时会误伤**。URL 写 `https:\/\/...` 转义形式最稳。

## 标准自检流程(改 include 后)

```bash
# 1. 部署前:本地提取 script 过 node 语法检查
python3 -c "import re; open('/tmp/c.js','w').write(re.search(r'<script>(.*?)</script>', open('组件.html').read(), re.S).group(1))"
# 2. scp 到服务器跑: node --check /tmp/c.js
# 3. 部署 push 后,从线上 curl 提取 script 再 node --check 一次(验证经过构建管线后仍合法)
# 4. 服务器无头 chromium 实测渲染(playwright 现成):
#    pg.click("#组件id summary") → 读 DOM 文本 → 截图
```

**别信 IAB/浏览器 count()**——ARIA 树缓存会返回 0(按钮明明在)。读 `textContent` 或用服务器无头浏览器。
