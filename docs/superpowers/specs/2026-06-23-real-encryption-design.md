# 真加密改造设计文档

**日期**：2026-06-23
**状态**：待用户审阅
**涉及仓库**：lyzbcy/lyzbcy.github.io

---

## 1. 背景与目标

### 1.1 当前问题
博客的"加密文章"目前是**伪加密**，存在三个安全漏洞：

1. **密码明文暴露在 JS 中**：`assets/js/encrypted-post.js:16` 硬编码 `var correctPassword = window.CORRECT_PASSWORD || '180628';`，发布后任何人访问该 JS 文件 URL 即可看到密码。
2. **内容是"预渲染 + 遮罩"**：加密文章正文早已渲染成 HTML 存在 DOM 里，仅用 `display:none` + 全屏遮罩盖住。F12 → Elements 几秒可见全部明文。
3. **`password_hash` 字段是装饰**：front matter 的 `password_hash` 实际存的是明文密码，且部分文章直接通过 Liquid `{{ page.password_hash }}` 注入页面，等于明文公布。

### 1.2 目标
把伪加密升级为**真正的端到端前端加密**，满足：
- 文章正文用 **AES-GCM 256** 加密，`_site` 构建产物和发布后的页面里**只有密文**，F12 看不到明文。
- 密码不进 JS、不进 HTML。用户输入密码后，浏览器用 **PBKDF2** 派生密钥，**先比对验证 hash，再 AES-GCM 解密**。
- 输错密码提示"密码不对"，不解密。
- 保留现有粉白恋爱风 UI 和解锁动画。
- 写作体验不变：作者照常用 markdown 写明文，构建时自动加密。

### 1.3 非目标
- 不做服务端加密（本项目是纯静态 GitHub Pages，无后端）。
- 不做密码强度强制（用户已明确接受保留弱密码的风险，见 §6）。
- 不改变现有公开文章（非加密文章）的任何行为。

---

## 2. 方案选型

**采用：方案 B —— Jekyll 插件构建时加密**

加密发生在本地 `jekyll build` 时（本项目无 GitHub Actions，本地构建后推 gh-pages，见 `git-readme.md`）。Jekyll 插件读取 markdown 明文 → 加密成密文 → 写入 front matter，正文明文被替换。

**为什么不是其他方案**：
- 方案 A（纯前端 JS 加密）：构建产物 `_site` 里仍是明文渲染后的 HTML，只是发布前要手动清理，易出错且 gh-pages 历史里可能残留。
- 方案 C（本地脚本手动加密）：作者每篇要多跑一步脚本，体验差。

方案 B 的优势：源码（`_posts/`）和构建产物（`_site/`）**都不含明文**，最干净。

---

## 3. 架构

### 3.1 数据流

```
作者写 _posts/xxx.md（明文 markdown，用 {% encrypted %} 标签包裹敏感部分）
        │
        ▼  jekyll build（本地）
_plugins/encrypt-content.rb 拦截 encrypted:true 的文章
   ├─ 读取 {% encrypted %}...{% endencrypted %} 内的 markdown 明文
   ├─ 从 _data/encryption_secrets.yml 取密码（password_ref 映射）
   ├─ 生成随机 salt(16B) + iv(12B)
   ├─ PBKDF2(密码, salt, 300000次) → AES-GCM 密钥
   ├─ AES-GCM 加密 markdown → 密文
   ├─ PBKDF2(密码, salt, 300000次) → SHA-256 → 验证 hash（hex）
   └─ 把密文/iv/salt/hash 写回 front matter，删除正文明文
        │
        ▼
_site/xxx.html：只有密文 + 公开参数（salt/iv/hash），无明文
        │
        ▼  发布 gh-pages
浏览器加载页面：只拿到密文
        │
        ▼  用户输密码
assets/js/encrypted-post.js：
   Web Crypto API → PBKDF2 派生 → 比 hash → 对则 AES-GCM 解密 → innerHTML 渲染
```

### 3.2 核心组件（3 个文件 + 1 个数据文件）

| 文件 | 类型 | 作用 |
|---|---|---|
| `_plugins/encrypt-content.rb` | 新增（Jekyll Generator） | 构建时加密，产出密文 |
| `assets/js/encrypted-post.js` | 重写 | 浏览器端解密 |
| `_includes/encrypted-content.html` | 新增 | Liquid 模板，把密文注入页面 |
| `_data/encryption_secrets.yml` | 新增（**不提交 git**） | 密码柜：`password_ref → 明文密码` 映射 |

---

## 4. 详细设计

### 4.1 加密算法与参数

| 参数 | 值 | 说明 |
|---|---|---|
| 对称加密 | **AES-GCM 256** | Web Crypto API 原生支持，带认证标签，篡改即失败 |
| 密钥派生 | **PBKDF2** | 从密码派生 AES 密钥 |
| 迭代次数 | **300000** | 高于常规 10 万，为弱密码提供缓冲（见 §6） |
| 哈希算法 | SHA-256 | PBKDF2 的 PRF |
| salt | 16 字节随机 | 每篇文章独立，公开存 front matter |
| iv | 12 字节随机（GCM 推荐） | 每次构建重新生成 |
| 密码验证 | PBKDF2 派生密钥的 SHA-256 hex | 与 front matter `pwd_verify` 比对 |

### 4.2 加密内容范围

**局部加密（用 `{% encrypted %}...{% endencrypted %}` 标签包裹）**。理由（详见 §9.2）：
- 无锡两日游文章的**高德地图脚本必须留在公开区**（`innerHTML` 注入的 script 不执行）。
- 用统一的标签机制，作者可灵活选择加密哪一部分。
- 8 篇旧文章迁移时，把整个正文用 `{% encrypted %}` 包起来，效果等同整篇加密。

**写作约定**：
```markdown
---
（front matter，encrypted: true）
---

公开区（不加密）：地图、行程概览等

{% encrypted %}
加密区：敏感的详细内容
{% endencrypted %}
```

### 4.3 写作流程（作者视角）

```markdown
---
layout: post
title: "无锡两日游计划"
date: 2026-6-27 11:00:00 +0800
categories: [星星布丁]
tags: [恋爱, 加密文件, 旅游攻略]
description: 数着日子盼着星星布丁来无锡啦        # 公开摘要，首页列表可见
encrypted: true
password_ref: "wuxi_trip"                      # 指向密码柜的键名
password_hint: "捞鱼和星星布丁认识的年月日（六位数）"
---

正文这里全部是明文 markdown，正常写。
构建时插件会把整个 {{ content }} 加密成密文。
```

配套，作者在 `_data/encryption_secrets.yml` 加一行（此文件不提交 git）：
```yaml
wuxi_trip: "180628"
```

### 4.4 构建产物 front matter（加密后）

插件会在构建时给加密文章注入/覆盖以下字段：

```yaml
encrypted: true
password_ref: "wuxi_trip"            # 原样保留（仅作者本地有意义）
password_hint: "..."                 # 原样保留，公开显示
enc_salt: "a1b2c3...（hex, 32字符）"  # 16字节salt的hex
enc_iv: "d4e5f6...（hex, 24字符）"    # 12字节iv的hex
enc_iterations: 300000
pwd_verify: "9f8e7d...（hex, 64字符）" # 验证hash
```

正文 `content` 被**完全清空**，替换为密文容器（见 4.5）。

### 4.5 页面 DOM 结构（`_includes/encrypted-content.html`）

```html
<!-- 密码输入遮罩（保留现有 UI） -->
<div id="password-overlay" class="password-overlay theme-romance">
  <div class="password-container">
    <div class="lock-icon">🔐</div>
    <h2>这是一篇加密文章</h2>
    <p class="password-hint">💡 密码提示: {{ page.password_hint }}</p>
    <div class="password-input-group">
      <input type="password" id="password-input" ...>
      <button id="submit-password" onclick="checkPassword()">解锁</button>
    </div>
    <p id="error-message" class="error-message"></p>
  </div>
</div>

<!-- 密文容器：JSON 形式注入，display:none，内含密文（非明文） -->
<script id="enc-payload" type="application/json">
{
  "ciphertext": "{{ page.enc_ciphertext }}",   /* hex 密文 */
  "iv":          "{{ page.enc_iv }}",
  "salt":        "{{ page.enc_salt }}",
  "iterations":  {{ page.enc_iterations }},
  "verify":      "{{ page.pwd_verify }}"
}
</script>

<!-- 解密后内容渲染处（初始为空） -->
<div id="protected-content" class="protected-content" style="display:none;"></div>
```

**关键安全点**：`<script type="application/json">` 里的内容浏览器**不会执行也不会渲染**，只是文本数据。密文在此，明文绝不出现在 HTML 里。

### 4.6 浏览器解密逻辑（重写 `encrypted-post.js`）

```js
async function checkPassword() {
  const pwd = input.value.trim();
  const payload = JSON.parse(document.getElementById('enc-payload').textContent);

  // 1. PBKDF2 派生密钥
  const keyMaterial = await crypto.subtle.importKey('raw', utf8(pwd), 'PBKDF2', false, ['deriveKey','deriveBits']);
  const aesKey = await crypto.subtle.deriveKey(
    {name:'PBKDF2', salt:hex(payload.salt), iterations:payload.iterations, hash:'SHA-256'},
    keyMaterial, {name:'AES-GCM', length:256}, false, ['decrypt']
  );

  // 2. 验证 hash（先验后解，体验好）
  const verifyBits = await crypto.subtle.deriveBits(
    {name:'PBKDF2', salt:hex(payload.salt), iterations:payload.iterations, hash:'SHA-256'},
    keyMaterial, 256
  );
  const verifyHex = bytesToHex(new Uint8Array(verifyBits));
  if (verifyHex !== payload.verify) {
    showError('密码不对哦，再想想～ 🤔');  // 错误提示，不解密
    return;
  }

  // 3. AES-GCM 解密 → markdown 明文
  const plaintextBuf = await crypto.subtle.decrypt(
    {name:'AES-GCM', iv:hex(payload.iv)}, aesKey, hex(payload.ciphertext)
  );
  const markdown = utf8Decode(plaintextBuf);

  // 4. markdown → HTML 渲染（用 marked.js 或预渲染）
  document.getElementById('protected-content').innerHTML = renderMarkdown(markdown);
  // 隐藏遮罩，显示内容
}
```

**markdown 渲染问题**：当前架构是 Jekyll 在服务端把 markdown 渲染成 HTML。加密后浏览器拿到的是**原始 markdown**，需在浏览器端渲染。方案：
- 引入 `marked.js`（~30KB，CDN 加载）做客户端 markdown 渲染。
- 或：插件加密的明文**已经是 Jekyll 渲染后的 HTML**（而非原始 markdown），浏览器解密后直接 `innerHTML`，无需 markdown 库。✅ **采用此方案**——插件加密 `{{ content | markdownify }}` 的结果，更省事且保证样式一致。

### 4.7 Jekyll 插件设计（`encrypt-content.rb`）

```ruby
Jekyll::Hooks.register :posts, :post_render do |post|
  next unless post.data['encrypted'] == true

  secrets = post.site.data['encryption_secrets'] || {}
  pwd = secrets[post.data['password_ref']]
  raise "缺少密码: #{post.data['password_ref']}" if pwd.nil?

  plaintext = post.output  # 已 markdownify 的 HTML

  # 调用外部 OpenSSL（Ruby 自带）加密
  salt = OpenSSL::Random.random_bytes(16)
  iv   = OpenSSL::Random.random_bytes(12)
  key  = OpenSSL::PKCS5.pbkdf2_hmac(pwd, salt, 300000, 32, 'sha256')
  cipher = OpenSSL::Cipher::AES.new(256, :GCM)
  cipher.encrypt; cipher.key = key; cipher.iv = iv
  ciphertext = cipher.update(plaintext) + cipher.final
  tag = cipher.auth_tag

  # 验证 hash（密钥的 SHA-256 hex）
  verify = OpenSSL::Digest::SHA256.hexdigest(key)

  # 写回 front matter + 替换 output
  post.data['enc_ciphertext'] = (ciphertext + tag).unpack1('H*')
  post.data['enc_salt'] = salt.unpack1('H*')
  post.data['enc_iv']   = iv.unpack1('H*')
  post.data['enc_iterations'] = 300000
  post.data['pwd_verify'] = verify
  post.output = render_encrypted_template(post)  # 调用 _includes 模板
end
```

注意：AES-GCM 的密文需拼接 `auth_tag`（16字节）一起传给浏览器的 Web Crypto API（Web Crypto 要求 ciphertext = actual_ciphertext + tag 末尾拼接）。

---

## 5. 受影响文章清单与密码

共 8 篇现有加密文章 + 1 篇新建，全部用**原密码**重新加密：

| # | 文章 | password_ref | 密码 |
|---|---|---|---|
| 1 | 和星星布丁的异地恋心得 | love_long_distance | `250409` |
| 2 | 2025元旦·无锡之旅攻略 | wuxi_newyear | `180628` |
| 3 | 给星星布丁的100封情书 | love_letters_100 | `250429` |
| 4 | 写作尝试 | writing_try | `668` |
| 5 | 就业&考研&保研&技能计划书 | career_plan | `041217` |
| 6 | 21岁生日计划 | birthday_21 | `626` |
| 7 | 常态化应激状态心得 | stress_normal | `仙王的日常生活` |
| 8 | 上饶五一攻略书 | shangrao_mayday | `抖音` |
| 9（新）| 无锡两日游计划 | wuxi_trip | `180628` |

`_data/encryption_secrets.yml` 内容（不入 git）：
```yaml
love_long_distance: "250409"
wuxi_newyear: "180628"
love_letters_100: "250429"
writing_try: "668"
career_plan: "041217"
birthday_21: "626"
stress_normal: "仙王的日常生活"
shangrao_mayday: "抖音"
wuxi_trip: "180628"
```

---

## 6. 已知风险（用户已接受）

1. **弱密码可被暴力破解**：`668`、`626` 是 3 位纯数字，即便 PBKDF2 30 万次迭代，字典攻击仍可在数秒内破解。`180628` 等生日格式同理。用户明确选择保留原密码，理解并接受此风险。
2. **密码柜文件丢失**：若 `_data/encryption_secrets.yml` 丢失且无备份，已发布的加密文章仍可正常展示（密文+密码不变），但**无法修改这些文章**（改了需重新加密，没有密码无法生成正确密文）。缓解：spec 要求作者备份此文件到密码管理器/网盘。
3. **新浏览器要求**：Web Crypto API 需 HTTPS（GitHub Pages 默认 HTTPS，OK）或 localhost。旧浏览器（< 2017）不支持，但 2026 年可忽略。

---

## 7. 验收标准

- [ ] F12 → Elements 看任意加密文章页面，**找不到任何明文正文**。
- [ ] F12 → Sources/Network 查看 `encrypted-post.js`，**找不到任何明文密码**。
- [ ] 输入正确密码 → 内容正常显示（含 markdown 样式、高德地图等）。
- [ ] 输入错误密码 → 提示"密码不对"，不解密、不显示乱码。
- [ ] 8 篇旧文章 + 1 篇新文章均能用各自原密码解锁。
- [ ] `_data/encryption_secrets.yml` 在 `.gitignore` 中，未提交 git。
- [ ] `git log` 提交历史中无明文密码（密码柜从未入库）。

---

## 8. 迁移步骤（实现阶段执行）

1. 在 `_plugins/` 新建 `encrypt-content.rb`，实现加密 Hook。
2. 重写 `assets/js/encrypted-post.js` 为真解密逻辑。
3. 新建 `_includes/encrypted-content.html` 模板。
4. 新建 `_data/encryption_secrets.yml`（本地，不入 git）。
5. 把 `_data/encryption_secrets.yml` 加入 `.gitignore`。
6. 改造 8 篇旧文章 front matter（加 `password_ref`，删除内联的明文密码注入代码如 `window.CORRECT_PASSWORD = '{{ page.password_hash }}'`）。
7. 新建的无锡两日游文章也按新格式写。
8. 本地 `jekyll build`，检查 `_site` 产物无明文。
9. 浏览器实测每篇解锁。
10. 提交 main + 构建发布 gh-pages。

---

## 9. 已决策的技术细节

### 9.1 markdown 渲染
§4.6 已决定**加密"Jekyll 渲染后的 HTML"**（而非原始 markdown），浏览器解密后直接 `innerHTML`，无需引入 marked.js。保证代码块、表格、order-card 等样式与现有一致。

### 9.2 含 `<script>` 的内容（高德地图）—— 地图放加密区外

**冲突**：`innerHTML` 注入的 `<script>` 标签浏览器**默认不执行**。无锡两日游文章里有高德地图脚本，若放进加密区，解密后地图加载不出来。

**决策（用户已确认）**：地图组件放在**加密区之外**——即文章 front matter 之后的公开部分（不进入 `encrypted:true` 的加密正文）。

**文章结构调整**：
```markdown
---
layout: post
encrypted: true
password_ref: "wuxi_trip"
description: ...   # 公开摘要
---

<!-- ========== 公开区（不加密）========== -->
地图组件 + 行程概览（让读者解锁前也能看到"这是一篇带地图的游记"）

<!-- ========== 加密区（整篇正文加密）========== -->
两日详细行程、预算、私房话等敏感内容
```

**实现方式**：插件需支持"部分加密"——只加密 `{% encrypted %}...{% endencrypted %}` 标签内的内容，标签外的明文保留。这意味着回到 §4.2 讨论过的"局部加密"模式。

**修正 §4.2 的决策**：从"整篇加密"改为"**局部加密（用 {% encrypted %} 标签包裹）**"。理由充分：无锡文章的地图必须留在公开区，整篇加密不可行。8 篇旧文章原本就是整篇需保护，迁移时把它们整个正文用 `{% encrypted %}` 包起来即可（对作者只是加两行标签，无额外负担）。

### 9.3 旧文章迁移的 `{% encrypted %}` 包裹
对 8 篇旧文章，迁移时在正文最外层加标签：
```markdown
---
（front matter）
---

{% encrypted %}
（原有全部正文）
{% endencrypted %}
```
效果等同于整篇加密，但复用同一套机制。

---

## 10. 开放问题（实现时验证，不阻塞设计批准）

- innerHTML 注入后，`<details>`/`<summary>`（order-card）的折叠交互是否正常（理论上正常，需实测）。
- 加密 HTML 体积：渲染后的 HTML 可能较大（无锡文章含地图数据），AES-GCM 加密后 base64/hex 体积膨胀，需关注单篇文章 front matter 大小（Jekyll 对超长 front matter 的处理）。如有问题，改用正文内 `<script type="application/json">` 存密文（见 §4.5 本就是此方案）。
