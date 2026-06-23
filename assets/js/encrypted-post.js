/**
 * Encrypted Post —— 真加密解密脚本（AES-GCM + PBKDF2，Web Crypto API）
 *
 * 工作原理：
 * - 页面 HTML 里只有密文（存于 <script class="enc-payload" type="application/json">）
 * - 密码不在 JS 里。用户输入后，PBKDF2 派生密钥 → 先验 hash → AES-GCM 解密 → innerHTML
 * - 兼容两套入口：theme-romance 用 #password-overlay/#password-input；
 *   上饶攻略类用 #partial-overlay/#partial-password-input
 *
 * 安全特性：
 * - F12 看不到明文（HTML 里只有密文 JSON）
 * - JS 里没有任何明文密码
 * - 输错密码：PBKDF2 派生的 verify hash 对不上，不解密，只提示
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
  var encoder = new TextEncoder();
  function strToBuf(s) { return encoder.encode(s); }

  // ---------- 取密文 payload ----------
  // 支持两种容器选择器：新版 .enc-payload；兼容旧版 #enc-payload
  function getPayload() {
    var node = document.querySelector('script.enc-payload') ||
               document.getElementById('enc-payload');
    if (!node) return null;
    try { return JSON.parse(node.textContent); } catch (e) { return null; }
  }

  // ---------- PBKDF2 派生：返回 aesKey + verifyHex ----------
  async function derive(pwd, saltBytes, iterations) {
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
    var derived = await derive(pwd, salt, payload.iterations);

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
    // 加上 Chirpy 的 .content 类，让标题/表格/列表等正文样式生效
    target.classList.add('content');
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
