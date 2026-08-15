/**
 * takeout-tier-extras.js — 《江南大学外卖从夯到拉排名》增强补丁
 *
 * 功能：
 *   1. 页面顶部自动生成「外卖一图流」长图（数据直接读取页面真实卡片）
 *   2. 疑似歇业店铺变灰 + 徽章（Black Burger 海岸城店）
 *   3. 全图斜向平铺"捞鱼"水印 + 页脚版权
 *
 * 用法：放在 /assets/lib-custom/takeout-tier-extras.js，
 *      外卖文章 md 中 takeout-tier.js 引用之后加一行 script 引用。
 */
(function () {
  'use strict';

  /* 疑似歇业名单（按卡名字符串匹配，可自行增删） */
  var UNCERTAIN = [
    { match: 'Black Burger', label: '疑似歇业' }
  ];

  var CSS = [
    '.cte-uncertain{filter:grayscale(.6);opacity:.7;position:relative;}',
    '.cte-badge{position:absolute;top:2px;right:2px;font-size:10px;line-height:1;',
    '  padding:2px 4px;border-radius:4px;color:#fff;pointer-events:none;background:#b8860b;}',
    '.cte-poster{position:relative;margin:2.5em 0;border-radius:16px;overflow:hidden;',
    '  box-shadow:0 8px 30px rgba(0,0,0,.18);font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;}',
    '.cte-poster__head{padding:26px 24px 18px;color:#fff;background:linear-gradient(135deg,#c0392b,#e74c3c 55%,#f39c12);}',
    '.cte-poster__title{font-size:30px;font-weight:800;letter-spacing:2px;margin:0;}',
    '.cte-poster__sub{font-size:14px;opacity:.9;margin-top:6px;}',
    '.cte-poster__body{padding:8px 24px 24px;background:#fffdf7;}',
    '.cte-poster__row{display:flex;align-items:flex-start;gap:12px;padding:10px 0;',
    '  border-bottom:1px dashed #eadfc8;}',
    '.cte-poster__row:last-child{border-bottom:none;}',
    '.cte-poster__tier{flex:0 0 86px;text-align:center;font-weight:800;font-size:17px;',
    '  color:#fff;border-radius:10px;padding:8px 0;margin-top:2px;}',
    '.cte-poster__chips{display:flex;flex-wrap:wrap;gap:8px;}',
    '.cte-poster__chip{font-size:14px;padding:5px 10px;border-radius:8px;background:#f4ecd9;',
    '  border:1px solid #e3d6b8;color:#4a3f2a;}',
    '.cte-poster__chip--uncertain{background:#f7f0dd;color:#9b8a55;border-style:dashed;}',
    '.cte-poster__foot{padding:10px 24px 16px;background:#fffdf7;color:#b3a07a;font-size:12px;}',
    '.cte-watermark{position:absolute;inset:0;pointer-events:none;z-index:5;opacity:.07;',
    '  background-repeat:repeat;}',
    '@media (max-width:600px){.cte-poster__title{font-size:22px}.cte-poster__tier{flex-basis:64px;font-size:14px}}'
  ].join('');

  var TIER_STYLES = {
    '夯': 'linear-gradient(135deg,#c0392b,#e74c3c)',
    '顶级': 'linear-gradient(135deg,#d35400,#f39c12)',
    '人上人': 'linear-gradient(135deg,#b7950b,#f1c40f)',
    'NPC': 'linear-gradient(135deg,#7f8c8d,#bdc3c7)',
    '拉完了': 'linear-gradient(135deg,#555,#888)'
  };

  var WATERMARK_SVG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160">' +
    '<text x="20" y="90" font-size="26" fill="#333" ' +
    'font-family="PingFang SC, Microsoft YaHei, sans-serif" ' +
    'transform="rotate(-22 20 90)">捞鱼</text></svg>');

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

  function buildPoster() {
    var wrap = document.createElement('div');
    wrap.className = 'cte-poster';
    var head = document.createElement('div');
    head.className = 'cte-poster__head';
    head.innerHTML = '<h2 class="cte-poster__title">江南大学外卖从夯到拉</h2>'
      + '<div class="cte-poster__sub">店铺得分 = 50% 菜品均分 + 50% 最高分 ｜ 夯 → 顶级 → 人上人 → NPC → 拉完了</div>';
    var body = document.createElement('div');
    body.className = 'cte-poster__body';
    wrap.appendChild(head); wrap.appendChild(body);

    document.querySelectorAll('.tier-row').forEach(function (row) {
      var tierName = ((row.querySelector('.tier-label') || {}).textContent || '').trim().split(/\s+/)[0];
      if (!TIER_STYLES[tierName]) return;
      var items = row.querySelectorAll('.spot-card');
      if (!items.length) return;
      var r = document.createElement('div'); r.className = 'cte-poster__row';
      var t = document.createElement('div'); t.className = 'cte-poster__tier';
      t.style.background = TIER_STYLES[tierName]; t.textContent = tierName;
      var chips = document.createElement('div'); chips.className = 'cte-poster__chips';
      items.forEach(function (card) {
        var nm = (card.querySelector('.spot-card__name') || card).textContent.trim();
        var st = card.classList.contains('cte-uncertain') ? 'uncertain' : null;
        var c = document.createElement('span');
        c.className = 'cte-poster__chip' + (st ? ' cte-poster__chip--' + st : '');
        c.textContent = nm + (st ? ' ?' : '');
        chips.appendChild(c);
      });
      r.appendChild(t); r.appendChild(chips); body.appendChild(r);
    });
    var foot = document.createElement('div'); foot.className = 'cte-poster__foot';
    foot.textContent = '? = 疑似歇业待确认 ｜ 数据截至 2026-08 ｜ © 捞鱼 ｜ 完整版见博客';
    wrap.appendChild(foot);

    var wm = document.createElement('div');
    wm.className = 'cte-watermark';
    wm.style.backgroundImage = 'url("' + WATERMARK_SVG + '")';
    wrap.insertBefore(wm, wrap.firstChild);
    return wrap;
  }

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }
  ready(function () {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    var tries = 0;
    var timer = setInterval(function () {
      if (document.querySelectorAll('.tier-row .spot-card').length > 0 || ++tries > 50) {
        clearInterval(timer);
        decorateCards();
        var anchor = document.querySelector('.tier-list-container');
        if (anchor) anchor.parentNode.insertBefore(buildPoster(), anchor);
      }
    }, 100);
  });
})();
