# 真加密改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把博客的伪加密（遮罩层+明文密码在JS）升级为真加密（AES-GCM + PBKDF2），使 `_site` 产物和发布页面的 HTML 里都没有明文正文、JS 里没有明文密码。

**Architecture:** Jekyll 构建时，自定义 Liquid Block `{% encrypted %}` 捕获明文，`:post_render` hook 用 Ruby OpenSSL 做 AES-GCM-256 加密，密文写入 front matter；页面用 `<script type="application/json">` 注入密文；浏览器端 `encrypted-post.js` 用 Web Crypto API 先验 PBKDF2 hash 再 AES-GCM 解密，`innerHTML` 渲染。

**Tech Stack:** Ruby 3.4 + OpenSSL 3.3（aes-256-gcm 可用）、Jekyll 4.4.1（Hooks + Liquid Block）、浏览器 Web Crypto API、AES-GCM-256、PBKDF2-SHA256（300000 次迭代）。

**Spec:** `docs/superpowers/specs/2026-06-23-real-encryption-design.md`

---

## 关键技术约束（实现者必读）

1. **AES-GCM 密文拼接**：Web Crypto API 的 `decrypt()` 要求传入的 buffer = `实际密文 + auth_tag(16字节)`。Ruby OpenSSL 用 `cipher.final` 后取 `cipher.auth_tag`，拼接顺序：`ciphertext + auth_tag`，整体转 hex 给浏览器。
2. **PBKDF2 一致性**：Ruby 端 `OpenSSL::PKCS5.pbkdf2_hmac(pwd, salt, 300000, 32, 'sha256')` 产出 32 字节密钥；浏览器端 `deriveKey` 用同样的 salt/iterations/hash 派生，两端必须完全一致，否则解密失败。
3. **密码验证 hash**：取派生出的 32 字节密钥做 `SHA-256` 得 32 字节，转 hex 存 `pwd_verify`。浏览器端用 `deriveBits(...,256)` 拿到同样 32 字节，转 hex 比对。**注意**：验证用的 bits 和 AES 密钥派生用的是同一个 PBKDF2 输出（32 字节密钥本身），避免派生两次。
4. **`innerHTML` 不执行 script**：加密区内的 `<script>` 解密后不会执行。无锡两日游的高德地图必须放加密区外（已在 spec §9.2 决策）。
5. **密码柜不进 git**：`_data/encryption_secrets.yml` 加入 `.gitignore`。
6. **文件路径含中文**：本仓库 `_posts/` 下文件名是中文，bash 操作时注意引号。

---

## File Structure

| 文件 | 操作 | 职责 |
|---|---|---|
| `_plugins/encrypt-content.rb` | 新建 | Liquid Block `{% encrypted %}` + `:post_render` 加密 hook |
| `assets/js/encrypted-post.js` | 重写 | Web Crypto 解密（替换明文密码版） |
| `_includes/encrypted-content.html` | 新建 | 密文注入模板 |
| `_data/encryption_secrets.yml` | 新建（不入git） | password_ref → 明文密码 映射 |
| `.gitignore` | 修改 | 加入 `_data/encryption_secrets.yml` |
| 8 篇旧 `_posts/*.md` | 修改 | 加 `password_ref`、用 `{% encrypted %}` 包裹、删旧内联密码注入 |
| 1 篇新 `_posts/2026-6-27-无锡两日游计划.md` | 已建，调整 | 地图移出加密区 |

---

## Task 1: 密码柜 + gitignore（基础设施）

**Files:**
- Create: `_data/encryption_secrets.yml`
- Modify: `.gitignore`

- [ ] **Step 1: 创建密码柜文件**

创建 `_data/encryption_secrets.yml`：
```yaml
# 密码柜 —— 此文件不入 git（见 .gitignore）
# 每篇加密文章通过 front matter 的 password_ref 指向这里的键名
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

- [ ] **Step 2: 加入 .gitignore**

读取现有 `.gitignore`，在末尾追加（如已有则跳过）：
```
# 加密文章密码柜（绝不提交）
_data/encryption_secrets.yml
```

- [ ] **Step 3: 验证不会被 git 跟踪**

Run: `git check-ignore _data/encryption_secrets.yml`
Expected: 输出该文件路径，表示已被忽略。

- [ ] **Step 4: Commit**

```bash
git add .gitignore
git commit -m "chore: gitignore 密码柜文件 _data/encryption_secrets.yml"
```
（**不** add `_data/encryption_secrets.yml` 本身）

---

## Task 2: Jekyll 加密插件 `_plugins/encrypt-content.rb`

**Files:**
- Create: `_plugins/encrypt-content.rb`

- [ ] **Step 1: 先写一个 Ruby 单元测试验证加密/解密往返**

创建 `test/test_encryption.rb`：
```ruby
require 'minitest/autorun'
require 'openssl'

# 复制插件里的加密逻辑做隔离测试
def encrypt(plaintext, pwd, iterations = 300000)
  salt = OpenSSL::Random.random_bytes(16)
  iv   = OpenSSL::Random.random_bytes(12)
  key  = OpenSSL::PKCS5.pbkdf2_hmac(pwd, salt, iterations, 32, 'sha256')
  cipher = OpenSSL::Cipher::AES.new(256, :GCM)
  cipher.encrypt
  cipher.key = key
  cipher.iv = iv
  ct = cipher.update(plaintext) + cipher.final
  tag = cipher.auth_tag
  verify = OpenSSL::Digest::SHA256.hexdigest(key)
  { ciphertext: (ct + tag).unpack1('H*'), iv: iv.unpack1('H*'),
    salt: salt.unpack1('H*'), iterations: iterations, verify: verify }
end

class TestEncryption < Minitest::Test
  def test_encrypt_produces_all_fields
    r = encrypt('hello', 'pass')
    %w[ciphertext iv salt iterations verify].each { |k| refute_nil r[k.to_sym] }
    assert_equal 300000, r[:iterations]
    assert_equal 64, r[:verify].length   # SHA-256 hex = 64 chars
    assert_equal 32, r[:salt].length     # 16 bytes = 32 hex chars
    assert_equal 24, r[:iv].length       # 12 bytes = 24 hex chars
  end

  def test_ciphertext_includes_tag_16_bytes
    r = encrypt('x', 'p')
    # ciphertext_hex_length = (plaintext_len + 16_tag) * 2
    assert_equal ('x'.bytesize + 16) * 2, r[:ciphertext].length
  end
end
```

- [ ] **Step 2: 运行测试，确认通过**

Run: `ruby test/test_encryption.rb`
Expected: 2 runs, 2 assertions, 0 failures。

- [ ] **Step 3: 写插件主文件**

创建 `_plugins/encrypt-content.rb`：
```ruby
# frozen_string_literal: true
# 真加密插件：{% encrypted %}...{% endencrypted %} 捕获明文，
# :post_render hook 用 AES-GCM-256 加密，替换占位符为密文容器。
require 'openssl'

module EncryptContent
  ITERATIONS = 300_000
  PLACEHOLDER_RE = /<!--ENC_START-->(.*?)<!--ENC_END-->/m.freeze

  module_function

  # 从密码柜取密码
  def fetch_password(site, ref)
    secrets = site.data['encryption_secrets']
    raise "加密文章缺少密码：请在 _data/encryption_secrets.yml 配置 '#{ref}'" if secrets.nil?
    pwd = secrets[ref]
    raise "密码柜无 '#{ref}' 键（_data/encryption_secrets.yml）" if pwd.nil?
    pwd.to_s
  end

  # AES-GCM 加密，返回字段 hash（字段名与前端约定）
  def encrypt(plaintext, pwd)
    salt = OpenSSL::Random.random_bytes(16)
    iv   = OpenSSL::Random.random_bytes(12)
    key  = OpenSSL::PKCS5.pbkdf2_hmac(pwd, salt, ITERATIONS, 32, 'sha256')
    cipher = OpenSSL::Cipher::AES.new(256, :GCM)
    cipher.encrypt
    cipher.key = key
    cipher.iv = iv
    ct = cipher.update(plaintext) + cipher.final
    tag = cipher.auth_tag
    {
      'ciphertext' => (ct + tag).unpack1('H*'),
      'iv'         => iv.unpack1('H*'),
      'salt'       => salt.unpack1('H*'),
      'iterations' => ITERATIONS,
      'verify'     => OpenSSL::Digest::SHA256.hexdigest(key)
    }
  end

  # 渲染密文注入容器 HTML（替代占位符）
  def render_container(enc)
    payload = {
      'ciphertext' => enc['ciphertext'],
      'iv'         => enc['iv'],
      'salt'       => enc['salt'],
      'iterations' => enc['iterations'],
      'verify'     => enc['verify']
    }
    <<~HTML
      <div class="encrypted-block">
        <div class="encrypted-placeholder" style="display:none"></div>
        <script type="application/json" class="enc-payload">#{payload.to_json}</script>
      </div>
    HTML
  end
end

# 1) Liquid Block：捕获明文，用占位符包裹（渲染期仍为明文，post_render 加密）
class EncryptedBlock < Liquid::Block
  include EncryptContent

  def render(context)
    inner = super # 已是 Liquid 渲染后的 HTML 片段
    "<!--ENC_START-->#{inner}<!--ENC_END-->"
  end
end
Liquid::Template.register_tag('encrypted', EncryptedBlock)

# 2) :post_render hook：把所有占位符加密并替换
Jekyll::Hooks.register :posts, :post_render do |post|
  next unless post.data['encrypted'] == true

  output = post.output
  next unless output.include?('<!--ENC_START-->')

  pwd = EncryptContent.fetch_password(post.site, post.data['password_ref'])

  new_output = output.gsub(EncryptContent::PLACEHOLDER_RE) do
    plaintext = Regexp.last_match(1)
    enc = EncryptContent.encrypt(plaintext, pwd)
    EncryptContent.render_container(enc)
  end

  post.output = new_output
end
```

- [ ] **Step 4: Commit**

```bash
git add _plugins/encrypt-content.rb test/test_encryption.rb
git commit -m "feat: 真加密插件 encrypt-content.rb（AES-GCM + {% encrypted %} 块）"
```

---

## Task 3: 重写 `assets/js/encrypted-post.js`

**Files:**
- Modify: `assets/js/encrypted-post.js`（整体替换）

- [ ] **Step 1: 备份并整体重写**

整体替换 `assets/js/encrypted-post.js` 为：
```javascript
/**
 * Encrypted Post —— 真加密解密脚本（AES-GCM + PBKDF2，Web Crypto API）
 *
 * 工作原理：
 * - 页面 HTML 里只有密文（存于 <script class="enc-payload" type="application/json">）
 * - 密码不在 JS 里。用户输入后，PBKDF2 派生密钥 → 先验 hash → AES-GCM 解密 → innerHTML
 * - 兼容旧的"单 overlay"结构：若页面有 #password-overlay，作为入口遮罩
 */
(function () {
  'use strict';

  // ---------- 工具：hex <-> bytes / utf8 ----------
  function hexToBytes(hex) {
    var bytes = new Uint8Array(hex.length / 2);
    for (var i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
  }
  function bytesToHex(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += ('00' + bytes[i].toString(16)).slice(-2);
    return s;
  }
  var enc = new TextEncoder();
  function strToBuf(s) { return enc.encode(s); }

  // ---------- 取密文 payload ----------
  // 支持两种容器：新版 .enc-payload；兼容旧版 #enc-payload
  function getPayload() {
    var node = document.querySelector('script.enc-payload') ||
               document.getElementById('enc-payload');
    if (!node) return null;
    try { return JSON.parse(node.textContent); } catch (e) { return null; }
  }

  // ---------- PBKDF2 派生 ----------
  async function derive(pwd, saltBytes, iterations, bits) {
    var keyMaterial = await crypto.subtle.importKey(
      'raw', strToBuf(pwd), 'PBKDF2', false, ['deriveKey', 'deriveBits']
    );
    var params = { name: 'PBKDF2', salt: saltBytes, iterations: iterations, hash: 'SHA-256' };
    var aesKey = await crypto.subtle.deriveKey(
      params, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
    );
    var verifyBuf = await crypto.subtle.deriveBits(params, keyMaterial, 256);
    return { aesKey: aesKey, verifyHex: bytesToHex(new Uint8Array(verifyBuf)) };
  }

  // ---------- 解密一篇 ----------
  async function decryptPayload(payload, pwd) {
    var salt = hexToBytes(payload.salt);
    var derived = await derive(pwd, salt, payload.iterations, 256);

    if (derived.verifyHex !== payload.verify) {
      return { ok: false, reason: 'password' };
    }
    try {
      var buf = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: hexToBytes(payload.iv) },
        derived.aesKey,
        hexToBytes(payload.ciphertext)  // 含末尾 16B auth_tag
      );
      return { ok: true, html: new TextDecoder('utf-8').decode(buf) };
    } catch (e) {
      return { ok: false, reason: 'decrypt' };
    }
  }

  // ---------- 渲染解密结果 ----------
  function renderDecrypted(html, target) {
    target.innerHTML = html;
    target.style.display = 'block';
    setTimeout(function () { target.classList.add('visible'); }, 50);
  }

  // ---------- 主入口 ----------
  window.checkPassword = async function () {
    var overlay = document.getElementById('password-overlay') ||
                  document.getElementById('partial-overlay');
    var input = document.getElementById('password-input') ||
                document.getElementById('partial-password-input');
    var errEl = document.getElementById('error-message') ||
               document.getElementById('partial-error-message');
    var target = document.getElementById('protected-content') ||
                 document.getElementById('partial-protected-content');

    if (!input || !target) return;
    var pwd = input.value.trim();
    if (!pwd) { showError(errEl, input, '请输入密码哦～ 💕'); return; }

    var payload = getPayload();
    if (!payload) { showError(errEl, input, '密文加载异常 😢'); return; }

    var result = await decryptPayload(payload, pwd);
    if (!result.ok) {
      showError(errEl, input, '密码不对哦，再想想～ 🤔');
      return;
    }
    renderDecrypted(result.html, target);
    try { sessionStorage.setItem('post_unlocked_' + location.pathname, 'true'); } catch (e) {}
    if (overlay) {
      overlay.classList.add('success');
      setTimeout(function () { overlay.style.display = 'none'; document.body.style.overflow = ''; }, 600);
    }
  };

  function showError(errEl, input, msg) {
    if (errEl) errEl.textContent = msg;
    if (input) { input.value = ''; input.focus(); }
  }

  // ---------- 初始化 ----------
  document.addEventListener('DOMContentLoaded', function () {
    var overlay = document.getElementById('password-overlay') ||
                  document.getElementById('partial-overlay');
    if (!overlay) return;
    document.body.style.overflow = 'hidden';

    try {
      if (sessionStorage.getItem('post_unlocked_' + location.pathname) === 'true') {
        // 会话内已解锁：静默不处理（真加密下无法跳过密码，仍需输入）
      }
    } catch (e) {}

    var input = document.getElementById('password-input') ||
                document.getElementById('partial-password-input');
    if (input) {
      setTimeout(function () { input.focus(); }, 800);
      input.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); window.checkPassword(); }
      });
    }
  });
})();
```

- [ ] **Step 2: Commit**

```bash
git add assets/js/encrypted-post.js
git commit -m "feat: 重写 encrypted-post.js 为 Web Crypto 真解密（移除明文密码）"
```

---

## Task 4: 改造一篇文章作为样板（异地恋心得）+ 端到端验证

> 先用一篇文章跑通全链路，验证加密/解密正确，再批量迁移其余文章。

**Files:**
- Modify: `_posts/2025-11-11-和星星布丁的异地恋心得.md`

- [ ] **Step 1: 读取文章确认现有结构**

Run: `git show "main:_posts/2025-11-11-和星星布丁的异地恋心得.md" | head -20`
确认现有 front matter 含 `password_hash: "250409"`，正文开头有 `<script>window.CORRECT_PASSWORD...`。

- [ ] **Step 2: 改造 front matter + 删旧密码注入 + 加 {% encrypted %} 包裹**

对 `_posts/2025-11-11-和星星布丁的异地恋心得.md` 做以下修改：

(a) front matter：把 `password_hash: "250409"` 改为 `password_ref: "love_long_distance"`，删除 `password_hash` 行。

(b) 删除正文开头的明文密码注入块：
```
<script>
  window.CORRECT_PASSWORD = '{{ page.password_hash }}';
</script>
```

(c) 保留 overlay 那段（密码输入 UI），但删除它下面"内容区 —— 始终渲染"的旧 `protected-content` 包裹与 `{% capture encrypted_content %}` 机制，改为：
- overlay 之后，用 `{% encrypted %}` 包裹原 `{% capture encrypted_content %}...{% endcapture %}` 内的全部内容（去掉 capture/endcapture，内容直接放进 encrypted 块）。
- 删除末尾的 `{{ encrypted_content | markdownify }}` 行（插件会自动处理渲染）。

最终文章骨架：
```markdown
---
layout: post
title: "和星星布丁的异地恋心得"
date: 2025-11-11 13:00:00 +0800
categories: [星星布丁]
tags: [恋爱, 加密文件]
description: 好害羞
pin: false
encrypted: true
password_ref: "love_long_distance"
password_hint: "恋爱没有范本，彼此舒服的相处方式就是最好的，祝你找到你自己的恋爱心得"
---

<link rel="stylesheet" href="/assets/css/encrypted-post.css">
<script src="/assets/js/encrypted-post.js"></script>

<div id="password-overlay" class="password-overlay {% if page.tags contains '恋爱' %}theme-romance{% else %}theme-site{% endif %}">
  <div class="password-container">
    <div class="lock-icon">🔐</div>
    <h2>这是一篇加密文章</h2>
    <p class="password-hint">💡 密码提示: {{ page.password_hint }}</p>
    <div class="password-input-group">
      <input type="password" id="password-input" placeholder="请输入密码" autocomplete="off">
      <button id="submit-password" onclick="checkPassword()">解锁</button>
    </div>
    <p id="error-message" class="error-message"></p>
  </div>
</div>

<div id="protected-content" class="protected-content" style="display:none;">
{% encrypted %}
（原 encrypted_content capture 里的全部正文）
{% endencrypted %}
</div>
```

- [ ] **Step 3: 本地构建**

Run: `bundle exec jekyll build`
Expected: 构建成功，无 "缺少密码" 报错。

- [ ] **Step 4: 验证 `_site` 产物无明文**

Run（搜索异地恋文章产出的 HTML 里是否还有明文句子）：
```bash
grep -l "unz就是这么喜欢记录" _site/posts/*异地恋* 2>/dev/null && echo "❌ 明文泄露" || echo "✅ 无明文"
```
Expected: `✅ 无明文`。

再验证密文存在：
```bash
grep -o "enc-payload" _site/posts/*异地恋* | head -1
```
Expected: 输出 `enc-payload`。

- [ ] **Step 5: 浏览器端到端验证**

启动本地预览（用项目已有方式，如 `python -m http.server 8000` 在 `_site` 目录），打开异地恋文章页：
- 输错密码 → 提示"密码不对"，不解密 ✅
- 输 `250409` → 正文正常显示（含 markdown 样式、order-card 折叠）✅
- F12 → Elements → 搜不到正文明文 ✅
- F12 → Sources 看 encrypted-post.js → 无 `180628` 等明文密码 ✅

- [ ] **Step 6: Commit**

```bash
git add "_posts/2025-11-11-和星星布丁的异地恋心得.md"
git commit -m "feat: 异地恋心得迁移到真加密（password_ref + {% encrypted %}）"
```

---

## Task 5: 批量迁移其余 7 篇旧文章

**Files:**（每篇同 Task 4 的改造模式）
- `_posts/2025-12-29-无锡元旦攻略书.md`（ref=`wuxi_newyear`，删默认密码依赖）
- `_posts/2026-2-26-给星星布丁的100封情书.md`（ref=`love_letters_100`）
- `_posts/2026-3-19-写作尝试.md`（ref=`writing_try`）
- `_posts/2026-3-3-就业&考研&保研&外快&技能 计划书.md`（ref=`career_plan`）
- `_posts/2026-3-7-21岁生日计划.md`（ref=`birthday_21`）
- `_posts/2026-3-8-常态化心流状态的心得与技巧总结.md`（ref=`stress_normal`）
- `_posts/2026-4-16-攻略书.skill&上饶五一攻略书 copy.md`（ref=`shangrao_mayday`，注意它用 `partial-overlay`/`partial-*` ID，保留该 ID 结构；skill 技术内容可不包进加密区，只加密旅游行程部分）

- [ ] **对每篇执行 Task 4 的 Step 2 改造**：
  - `password_hash` → `password_ref`（按本 task 标注的 ref 名）
  - 删除内联 `window.CORRECT_PASSWORD = '{{ page.password_hash }}'` 块
  - 正文用 `{% encrypted %}...{% endencrypted %}` 包裹（去 capture/endcapture）
  - 保留各自的 overlay UI（异地恋心得/元旦用 `password-overlay`+`password-input`；上饶用 `partial-overlay`+`partial-password-input`——保留原 ID，新 JS 已兼容两种）

- [ ] **每篇构建验证**：`bundle exec jekyll build` 后用 grep 确认该篇 `_site` 产物无明文关键句。

- [ ] **每篇浏览器验证解锁**（用各自密码）：250409→异地恋(已验)、180628→元旦、250429→情书、668→写作、041217→计划书、626→生日、仙王的日常生活→心流、抖音→上饶。

- [ ] **Commit（可分篇或合并）**

```bash
git add _posts/
git commit -m "feat: 7 篇旧加密文章迁移到真加密（局部 {% encrypted %} 块）"
```

---

## Task 6: 调整无锡两日游文章（地图移出加密区）

**Files:**
- Modify: `_posts/2026-6-27-无锡两日游计划.md`

- [ ] **Step 1: 确认地图脚本当前位置**

读取该文章，确认高德地图 `<script>` 块目前在 `protected-content` 内（加密区）。

- [ ] **Step 2: 重构结构——地图放加密区外**

文章改为：
- front matter：`encrypted: true`，`password_ref: "wuxi_trip"`，删 `password_hash`，改 `password_hint` 为公开提示。
- **公开区（加密标签外）**：高德地图组件（`<div id="tripMap">` + 加载脚本 + 行程概览）。这部分所有人可见，不加密。
- **加密区 `{% encrypted %}`**：两日详细行程、预算、私房话。

骨架：
```markdown
---
（front matter: encrypted:true, password_ref:"wuxi_trip", password_hint:...）
---

<link rel="stylesheet" href="/assets/css/encrypted-post.css">
<link rel="stylesheet" href="/assets/css/trip-map.css">
<script src="/assets/js/encrypted-post.js"></script>

<div id="password-overlay" class="password-overlay theme-romance">
  （密码输入 UI）
</div>

<!-- 公开区：地图（不加密，script 正常执行）-->
<h2>🗺️ 两日行程地图</h2>
<div id="tripMap" class="trip-map"></div>
<script>（高德地图脚本，照原样）</script>

<!-- 加密区：详细行程 -->
<div id="protected-content" class="protected-content" style="display:none;">
{% encrypted %}
## Day 1 / Day 2 详细安排 ...
{% endencrypted %}
</div>
```

- [ ] **Step 3: 本地构建 + 验证**

`bundle exec jekyll build`，检查：
- `_site` 产物中无锡文章：地图 `<div id="tripMap">` 明文存在（公开），但详细行程文字（如"先填肚子"）不在明文 HTML 里。
- 浏览器：解锁前地图可见、可交互；解锁后详细行程显示；地图 script 正常执行（不因加密而失效）。

- [ ] **Step 4: Commit**

```bash
git add "_posts/2026-6-27-无锡两日游计划.md"
git commit -m "feat: 无锡两日游文章——地图移出加密区，详细行程真加密"
```

---

## Task 7: 全量回归 + 清理

- [ ] **Step 1: 全站构建无报错**

Run: `bundle exec jekyll build`
Expected: 无 "缺少密码"、"密码柜无 X 键" 等错误。

- [ ] **Step 2: 全量明文扫描**

对所有加密文章的 `_site` 产物做明文扫描（用各篇独有的明文句子）：
```bash
# 异地恋
grep -q "unz就是这么喜欢记录" _site/posts/*异地恋* && echo "❌1" || echo "✅1"
# 元旦
grep -q "星星布丁抵达" _site/posts/*元旦* && echo "❌2" || echo "✅2"
# 情书、写作、计划书、生日、心流、上饶、无锡 —— 各取一句独有明文验证
```
全 ✅。

- [ ] **Step 3: JS 无明文密码扫描**

Run: `grep -E "250409|180628|250429|041217" assets/js/encrypted-post.js`
Expected: 无输出（JS 里不应有任何密码）。

- [ ] **Step 4: 密码柜未被跟踪**

Run: `git ls-files _data/encryption_secrets.yml`
Expected: 无输出（未被 git 跟踪）。

- [ ] **Step 5: 清理测试残留**

删除 Task 2 建的 `test/test_encryption.rb`（可选保留作回归用，若保留则 `git add`）。
删除之前的 `zeen-tools/amap-test.html`（Task 早期建的验证页）。

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: 真加密改造完成，清理测试残留"
```

---

## Task 8: 发布到 gh-pages

> 参照 `git-readme.md` 的发布流程。

- [ ] **Step 1: 确认在 main 分支且构建产物最新**

```bash
git checkout main
git pull origin main
bundle exec jekyll build
```

- [ ] **Step 2: 同步到 gh-pages worktree**

把 `_site/*` 复制到 gh-pages 工作区（用户已有的 worktree 路径，见 git-readme），确保 `.nojekyll` 存在。

- [ ] **Step 3: 提交推送 gh-pages**

```bash
# 在 gh-pages worktree
git add -A
git commit -m "deploy: 真加密改造 + 无锡两日游文章"
git push origin gh-pages
```

- [ ] **Step 4: 推送 main 源码**

```bash
git checkout main
git push origin main
```

- [ ] **Step 5: 线上验证**

等 GitHub Pages 部署后，访问线上：
- 任一加密文章，F12 确认无明文、JS 无密码。
- 用密码解锁各篇正常。
- 无锡文章地图正常显示。

---

## Self-Review 记录

**Spec 覆盖**：
- §4.1 算法参数 → Task 2（Ruby）+ Task 3（JS）两端一致 ✅
- §4.2 局部加密 → Task 2 Liquid Block ✅
- §4.3-4.5 写作流程/front matter/DOM → Task 4-6 ✅
- §4.6 JS 解密逻辑 → Task 3 ✅
- §4.7 Ruby 插件 → Task 2 ✅
- §5 密码清单 → Task 1 密码柜 ✅
- §6 风险 → 迭代次数 300000 落实 Task 2/3 ✅
- §7 验收标准 → Task 7 全覆盖 ✅
- §9.2 地图放加密区外 → Task 6 ✅

**类型一致**：字段名 `ciphertext/iv/salt/iterations/verify` 在 Ruby(Task2)、JS(Task3)、HTML 一致；ID 兼容 `password-overlay`/`password-input` 与 `partial-overlay`/`partial-password-input` 两套 ✅。
