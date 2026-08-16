/**
 * canteen-tier-extras.js — 《江南大学五六食堂从夯到拉排名》增强补丁
 *
 * 功能（2026-08-15）：
 *   1. 店名纠正：按网络多方查证结果修正语音转写错别字（页面显示层）
 *   2. 歇业置灰：确认歇业变灰+"已成回忆"；疑似歇业半灰+"疑似歇业"
 *   3. 外卖板块入口
 *   4. 一图流：顶部嵌入设计版 PNG 长图（含星星布丁表情包+捞鱼水印），点击可看大图保存
 *
 * 一图流 PNG 由 generate_posters.py 从数据源渲染，更新数据后需重新生成。
 */
(function () {
  'use strict';

  /* 店名纠正表（substring 替换，幂等） */
  var NAME_FIXES = [
    { from: '半将', to: '拌将' },
    { from: '七根大碗牛', to: '其根大碗牛' },
    { from: '旭先生', to: '胥先生' },
    { from: '海城楼', to: '海成楼' },
    { from: '寻花间', to: '觅花涧' },
    { from: '艾斯米', to: '爱斯米' },
    { from: '韩又悠', to: '韩右右' },
    { from: '张摊', to: '脏摊' },
    { from: '心服口服', to: '心福口福' },
    { from: '肥汁四喜', to: '肥汁四囍' },
    { from: '麻辣多多麻辣拌', to: '多多麻辣拌' },
    { from: '阿珍味道', to: '阿臻味道' },
    { from: '杨明宇', to: '杨铭宇' },
    { from: '今年任', to: '金年任' },
    { from: '福语记', to: '福宇记' }
  ];
  var NAME_OVERRIDES = [
    { match: '穆盛宴', name: '穆罕默德清真餐厅' }
  ];

  /* 歇业名单（按卡名字符串匹配，可自行增删） */
  var CLOSED = [
    { match: '陈凤祥' }, { match: '其根' }
  ];
  var UNCERTAIN = [
    { match: '杨铭宇' }, { match: '李记重庆鸡公煲' },
    { match: '小姐姐' }, { match: '摇滚炒鸡' }
  ];

  var CSS = [
    '.cte-closed{filter:grayscale(1);opacity:.45;position:relative;}',
    '.cte-uncertain{filter:grayscale(.6);opacity:.7;position:relative;}',
    '.cte-closed .spot-card__name{text-decoration:line-through;}',
    '.cte-badge{position:absolute;top:2px;right:2px;font-size:10px;line-height:1;',
    '  padding:2px 4px;border-radius:4px;color:#fff;pointer-events:none;}',
    '.cte-badge--closed{background:#666;}',
    '.cte-badge--uncertain{background:#b8860b;}',
    '.cte-takeout{margin:2.2em 0;padding:1.2em 1.4em;border:2px dashed #d9a441;',
    '  border-radius:14px;background:linear-gradient(135deg,#fffdf5,#fff8e8);}',
    '.cte-takeout h2{margin:.1em 0 .4em;font-size:1.25em;}',
    '.cte-takeout p{color:#8a6d1d;margin:.2em 0;}',
    '.cte-poster{margin:2.5em 0;}',
    '.cte-poster img{width:100%;height:auto;display:block;border-radius:16px;',
    '  box-shadow:0 8px 30px rgba(0,0,0,.18);}',
    '.cte-poster__hint{margin-top:.5em;text-align:center;font-size:.85em;color:#b3a07a;}'
  ].join('');

  function fixName(name) {
    for (var i = 0; i < NAME_OVERRIDES.length; i++) {
      if (name.indexOf(NAME_OVERRIDES[i].match) !== -1) return NAME_OVERRIDES[i].name;
    }
    var out = name;
    NAME_FIXES.forEach(function (f) { out = out.split(f.from).join(f.to); });
    return out;
  }
  function findStatus(name) {
    var i;
    for (i = 0; i < CLOSED.length; i++) if (name.indexOf(CLOSED[i].match) !== -1) return 'closed';
    for (i = 0; i < UNCERTAIN.length; i++) if (name.indexOf(UNCERTAIN[i].match) !== -1) return 'uncertain';
    return null;
  }

  function decorateCards() {
    document.querySelectorAll('.spot-card').forEach(function (card) {
      var el = card.querySelector('.spot-card__name') || card;
      var raw = (el.textContent || '').trim();
      var fixed = fixName(raw);
      if (fixed !== raw) { el.textContent = fixed; card.setAttribute('data-spot', fixed); }
      var status = findStatus(fixed) || findStatus(raw);
      if (status) {
        card.classList.add(status === 'closed' ? 'cte-closed' : 'cte-uncertain');
        var b = document.createElement('span');
        b.className = 'cte-badge cte-badge--' + status;
        b.textContent = status === 'closed' ? '已成回忆' : '疑似歇业';
        card.appendChild(b);
      }
    });
    document.querySelectorAll('.content-section h3').forEach(function (h3) {
      h3.textContent = fixName(h3.textContent);
    });
  }

  function imgPoster(src, href, hint) {
    var wrap = document.createElement('div');
    wrap.className = 'cte-poster';
    var a = document.createElement('a');
    a.href = href || src; a.target = '_blank'; a.rel = 'noopener';
    var img = document.createElement('img');
    img.src = src; img.alt = hint; img.loading = 'lazy';
    a.appendChild(img); wrap.appendChild(a);
    var p = document.createElement('p');
    p.className = 'cte-poster__hint';
    p.textContent = hint;
    wrap.appendChild(p);
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

    var anchor = document.querySelector('.tier-list-container');
    if (!anchor) return;

    var tries = 0;
    var timer = setInterval(function () {
      if (document.querySelectorAll('.tier-row .spot-card').length > 0 || ++tries > 50) {
        clearInterval(timer);
        decorateCards();
      }
    }, 100);

    anchor.parentNode.insertBefore(imgPoster('/assets/img/posters/poster-dine.png',
      '/assets/img/posters/poster-dine.png', '堂食一图流 · 点击查看大图，长按可直接保存分享'), anchor);

    var sec = document.createElement('div');
    sec.className = 'cte-takeout';
    sec.innerHTML = '<h2>🍱 外卖从夯到拉排名（已上线）</h2>'
      + '<p>第二期外卖篇已发布：<a href="/posts/江南大学外卖从夯到拉排名/">点这里看外卖从夯到拉排名</a></p>';
    anchor.parentNode.insertBefore(sec, anchor.nextSibling);

    var modal = document.getElementById('spotModal');
    if (modal) new MutationObserver(function () {
      var t = document.getElementById('modalTitle');
      if (t && t.textContent) {
        var fixed = fixName(t.textContent);
        if (fixed !== t.textContent) t.textContent = fixed;
      }
    }).observe(modal, { childList: true, subtree: true, characterData: true });
  });
})();
