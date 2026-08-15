/**
 * takeout-tier-extras.js — 《江南大学外卖从夯到拉排名》增强补丁
 * 1. Black Burger 等疑似歇业店铺置灰 + 徽章
 * 2. 页面顶部嵌入设计版「外卖一图流」PNG（含星星布丁表情包 + 捞鱼水印，已烘焙进图片）
 * PNG 由 generate_posters.py 渲染，更新 takeout-tier.js 数据后需重新生成。
 */
(function () {
  'use strict';

  var UNCERTAIN = [
    { match: 'Black Burger' }
  ];

  var CSS = [
    '.cte-uncertain{filter:grayscale(.6);opacity:.7;position:relative;}',
    '.cte-badge{position:absolute;top:2px;right:2px;font-size:10px;line-height:1;',
    '  padding:2px 4px;border-radius:4px;color:#fff;pointer-events:none;background:#b8860b;}',
    '.cte-poster{margin:2.5em 0;}',
    '.cte-poster img{width:100%;height:auto;display:block;border-radius:16px;',
    '  box-shadow:0 8px 30px rgba(0,0,0,.18);}',
    '.cte-poster__hint{margin-top:.5em;text-align:center;font-size:.85em;color:#b3a07a;}'
  ].join('');

  function decorateCards() {
    document.querySelectorAll('.spot-card').forEach(function (card) {
      var nm = (card.querySelector('.spot-card__name') || card).textContent;
      for (var i = 0; i < UNCERTAIN.length; i++) {
        if (nm.indexOf(UNCERTAIN[i].match) !== -1) {
          card.classList.add('cte-uncertain');
          var b = document.createElement('span');
          b.className = 'cte-badge';
          b.textContent = '疑似歇业';
          card.appendChild(b);
          break;
        }
      }
    });
  }

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

    var tries = 0;
    var timer = setInterval(function () {
      if (document.querySelectorAll('.tier-row .spot-card').length > 0 || ++tries > 50) {
        clearInterval(timer);
        decorateCards();
      }
    }, 100);

    var wrap = document.createElement('div');
    wrap.className = 'cte-poster';
    var a = document.createElement('a');
    a.href = '/assets/img/posters/poster-takeout.png'; a.target = '_blank'; a.rel = 'noopener';
    var img = document.createElement('img');
    img.src = '/assets/img/posters/poster-takeout.png';
    img.alt = '江南大学外卖从夯到拉一图流'; img.loading = 'lazy';
    a.appendChild(img); wrap.appendChild(a);
    var p = document.createElement('p');
    p.className = 'cte-poster__hint';
    p.textContent = '外卖一图流 · 点击查看大图，长按可直接保存分享';
    wrap.appendChild(p);
    anchor.parentNode.insertBefore(wrap, anchor);
  });
})();
