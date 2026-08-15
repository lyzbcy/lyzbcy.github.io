/**
 * noodle-tier-extras.js — 《方便面从夯到拉排名》增强补丁
 * 页面顶部嵌入设计版「方便面一图流」PNG（含星星布丁表情包 + 捞鱼水印，已烘焙进图片）。
 * PNG 由 generate_posters.py 渲染，更新 noodle-tier.js 数据后需重新生成。
 */
(function () {
  'use strict';
  var CSS = [
    '.cte-poster{margin:2.5em 0;}',
    '.cte-poster img{width:100%;height:auto;display:block;border-radius:16px;',
    '  box-shadow:0 8px 30px rgba(0,0,0,.18);}',
    '.cte-poster__hint{margin-top:.5em;text-align:center;font-size:.85em;color:#b3a07a;}'
  ].join('');
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }
  ready(function () {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    var anchor = document.querySelector('.tier-list-container');
    if (!anchor) return;
    var wrap = document.createElement('div');
    wrap.className = 'cte-poster';
    var a = document.createElement('a');
    a.href = '/assets/img/posters/poster-noodle.png'; a.target = '_blank'; a.rel = 'noopener';
    var img = document.createElement('img');
    img.src = '/assets/img/posters/poster-noodle.png';
    img.alt = '方便面从夯到拉一图流'; img.loading = 'lazy';
    a.appendChild(img); wrap.appendChild(a);
    var p = document.createElement('p');
    p.className = 'cte-poster__hint';
    p.textContent = '方便面一图流 · 点击查看大图，长按可直接保存分享';
    wrap.appendChild(p);
    anchor.parentNode.insertBefore(wrap, anchor);
  });
})();
