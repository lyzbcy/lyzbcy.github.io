/* AI Coding 比赛看板 — 渲染与交互
 * 数据: /assets/data/aicoding.json(每日 tools/aicoding/update-aicoding.mjs 生成)
 * 全部用 DOM API 构建节点,零 HTML 字符串拼接 —— 免疫构建链改写(见 docs/pitfalls/jekyll-build.md)
 */
(function () {
  'use strict';

  var TYPE_LABEL = { ai_coding: 'AI Coding', pure_coding: '纯Coding', dev: '开发者向' };
  var sortMode = 'deadline';

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function daysLeft(endsAt) {
    if (!endsAt) return null;
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var end = new Date(endsAt + 'T23:59:59');
    return Math.round((end - today) / 86400000);
  }

  function fmtCountdown(c) {
    var d = daysLeft(c.endsAt);
    var wrap = el('div', 'aic-countdown');
    if (d == null) {
      wrap.appendChild(el('span', 'aic-dl-text', '截止时间待定 · ' + (c.deadlineText || '')));
      return wrap;
    }
    if (d < 0) { wrap.appendChild(el('span', 'aic-days urgent', '已截止')); return wrap; }
    var cls = d <= 3 ? 'urgent' : d <= 7 ? 'soon' : 'ok';
    var txt = d === 0 ? '今天截止!' : d === 1 ? '剩 1 天' : '剩 ' + d + ' 天';
    wrap.appendChild(el('span', 'aic-days ' + cls, txt));
    wrap.appendChild(el('span', 'aic-dl-text', c.deadlineText || ('≈ ' + c.endsAt)));
    return wrap;
  }

  function card(c) {
    var box = el('div', 'aic-card' + (c.stale ? ' stale' : ''));

    var top = el('div', 'aic-card-top');
    var h = el('h3');
    var a = el('a', null, c.title);
    a.href = c.url; a.target = '_blank'; a.rel = 'noopener';
    h.appendChild(a);
    top.appendChild(h);
    top.appendChild(el('span', 'aic-type ' + c.type, TYPE_LABEL[c.type] || c.type));
    box.appendChild(top);

    var meta = el('div', 'aic-meta');
    if (c.prize && !/luma/i.test(c.prize)) meta.appendChild(el('span', 'aic-chip prize', '💰 ' + c.prize));
    var loc = el('span', 'aic-chip' + (/online|remote|线上/i.test(c.location || '') ? ' online' : ''), (c.location || '') + (c.teams ? ' · ' + c.teams.toLocaleString() + ' 队' : ''));
    meta.appendChild(loc);
    (c.tags || []).slice(0, 3).forEach(function (t) { meta.appendChild(el('span', 'aic-chip', t)); });
    box.appendChild(meta);

    box.appendChild(fmtCountdown(c));

    var foot = el('div', 'aic-foot');
    foot.appendChild(el('span', null, '来源:' + (c.platform || '综合') + (c.stale ? ' · 近期榜单未见,或已临近结束' : '')));
    box.appendChild(foot);
    return box;
  }

  function render(data) {
    var list = (data && data.competitions) || [];
    var main = list.filter(function (c) { return c.type !== 'dev'; });
    var dev = list.filter(function (c) { return c.type === 'dev'; });

    /* 统计条 */
    var totalPrize = list.reduce(function (s, c) { return s + (c.prizeValue || 0); }, 0);
    var stats = document.getElementById('aic-stats');
    stats.innerHTML = '';
    [[list.length, '进行中比赛'], [main.length, 'AI Coding 精选'], [dev.length, '开发者向'],
     [totalPrize >= 1000 ? '$' + Math.round(totalPrize / 1000) + 'K+' : (totalPrize ? '$' + totalPrize : '—'), '总奖金池']]
      .forEach(function (p) {
        var s = el('div', 'aic-stat');
        s.appendChild(el('b', null, String(p[0])));
        s.appendChild(el('span', null, p[1]));
        stats.appendChild(s);
      });

    var upd = document.getElementById('aic-updated');
    if (data && data.updatedAt) {
      var t = new Date(data.updatedAt);
      upd.textContent = '更新于 ' + t.toLocaleString('zh-CN', { hour12: false }) + ' · 扫描 ' + (data.totalScanned || '?') + ' 场';
    } else { upd.textContent = ''; }

    /* 排序 */
    var byDeadline = function (x, y) { return (x.endsAt || '9999') < (y.endsAt || '9999') ? -1 : 1; };
    var byPrize = function (x, y) { return (y.prizeValue || 0) - (x.prizeValue || 0) || byDeadline(x, y); };
    main.sort(sortMode === 'prize' ? byPrize : byDeadline);
    dev.sort(sortMode === 'prize' ? byPrize : byDeadline);

    var gridMain = document.getElementById('aic-main');
    var gridDev = document.getElementById('aic-dev');
    var moreWrap = document.getElementById('aic-more-wrap');
    var empty = document.getElementById('aic-empty');
    gridMain.innerHTML = ''; gridDev.innerHTML = '';
    main.forEach(function (c) { gridMain.appendChild(card(c)); });
    dev.forEach(function (c) { gridDev.appendChild(card(c)); });
    empty.style.display = main.length ? 'none' : 'block';
    moreWrap.style.display = dev.length ? '' : 'none';
  }

  function boot() {
    var root = document.getElementById('aic-stats');
    if (!root) return;

    document.querySelectorAll('.aic-sort-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        sortMode = btn.dataset.sort;
        document.querySelectorAll('.aic-sort-btn').forEach(function (b) { b.classList.toggle('active', b === btn); });
        if (boot._data) render(boot._data);
      });
    });

    fetch('/assets/data/aicoding.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) { boot._data = data; render(data); })
      .catch(function (e) {
        document.getElementById('aic-updated').textContent = '数据加载失败:' + e.message;
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
})();
