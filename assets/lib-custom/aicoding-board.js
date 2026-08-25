/* AI Coding 比赛看板 — 渲染与筛选 v2
 * 数据: /assets/data/aicoding.json(每日 tools/aicoding/update-aicoding.mjs 多源生成)
 * 筛选: 形式(线上/线下) × 截止时间 × 地点(中国城市/🚄无锡通勤圈)
 * 全部用 DOM API 构建节点,零 HTML 字符串拼接 —— 免疫构建链改写(docs/pitfalls/jekyll-build.md)
 */
(function () {
  'use strict';

  var TYPE_LABEL = { ai_coding: 'AI Coding', pure_coding: '纯Coding', dev: '开发者向' };

  /* 🚄 无锡通勤圈:无锡出发高铁二等座单程估算(元)。
   * 表外城市 = 超出通勤圈(广州/深圳/成都/重庆/昆明等)。数值为估算,以 12306 为准。 */
  var WUXI_COMMUTE = {
    '无锡': 0,
    '常州': 15, '苏州': 20, '上海': 40, '镇江': 35, '南通': 50,
    '扬州': 60, '湖州': 60, '嘉兴': 80, '马鞍山': 90, '泰州': 70,
    '南京': 70, '芜湖': 100, '盐城': 100, '滁州': 110, '杭州': 110,
    '淮安': 110, '绍兴': 120, '蚌埠': 130, '宿迁': 130, '铜陵': 130,
    '黄山': 150, '宁波': 150, '合肥': 150, '连云港': 150, '舟山': 160,
    '徐州': 160, '池州': 160, '义乌': 160, '淮南': 160, '安庆': 180,
    '金华': 180, '衢州': 200, '台州': 220, '丽水': 230, '温州': 250,
    '济南': 280, '郑州': 310, '武汉': 330, '南昌': 380, '石家庄': 420,
    '青岛': 420, '太原': 450, '长沙': 460, '天津': 470, '烟台': 500,
    '北京': 530, '西安': 540, '威海': 540, '福州': 550, '厦门': 600,
  };

  var state = { sort: 'deadline', mode: 'all', deadline: 'all', city: 'all' };

  /* URL hash 双向同步:#f=mode:online,city:wuxi600 —— 筛选状态可分享、可还原 */
  function parseHash() {
    var m = location.hash.match(/#f=([\w:,-]+)/);
    if (!m) return;
    m[1].split(',').forEach(function (kv) {
      var pair = kv.split(':');
      if (pair[0] in state && pair[1]) state[pair[0]] = pair[1];
    });
    /* 同步 chips 激活态 */
    Object.keys(state).forEach(function (k) {
      var sel = '[data-' + (k === 'sort' ? 'sort' : k) + '="' + state[k] + '"]';
      var btn = document.querySelector('#aic-toolbar ' + sel);
      if (btn) {
        var group = btn.parentElement;
        Array.prototype.forEach.call(group.querySelectorAll('.aic-chip-btn'), function (x) {
          x.classList.toggle('active', x === btn);
        });
      }
    });
  }

  function writeHash() {
    var parts = [];
    if (state.mode !== 'all') parts.push('mode:' + state.mode);
    if (state.deadline !== 'all') parts.push('deadline:' + state.deadline);
    if (state.city !== 'all') parts.push('city:' + state.city);
    if (state.sort !== 'deadline') parts.push('sort:' + state.sort);
    var h = parts.length ? '#f=' + parts.join(',') : ' ';
    history.replaceState(null, '', parts.length ? h : location.pathname);
  }

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

  /* ---------- 筛选 ---------- */

  function passFilters(c) {
    if (state.mode === 'online' && !c.isOnline) return false;
    if (state.mode === 'offline' && c.isOnline) return false;
    if (state.deadline !== 'all') {
      var d = daysLeft(c.endsAt);
      if (d == null || d > Number(state.deadline)) return false;
    }
    if (state.city === 'wuxi600') {
      if (!c.isChina || !c.city) return false;
      var fee = WUXI_COMMUTE[c.city];
      if (fee == null || fee > 600) return false;
    } else if (state.city !== 'all') {
      if (c.city !== state.city) return false;
    }
    return true;
  }

  /* ---------- 卡片 ---------- */

  function fmtCountdown(c) {
    var wrap = el('div', 'aic-countdown');
    var d = daysLeft(c.endsAt);
    if (d == null) {
      wrap.appendChild(el('span', 'aic-dl-text', '时间待定' + (c.deadlineText ? ' · ' + c.deadlineText : '')));
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
    if (c.isOnline) {
      meta.appendChild(el('span', 'aic-chip online', '🖥 线上' + (c.teams ? ' · ' + c.teams.toLocaleString() + ' 队' : '')));
    } else {
      var fee = c.isChina && c.city ? WUXI_COMMUTE[c.city] : null;
      meta.appendChild(el('span', 'aic-chip' + (c.isChina ? ' cn' : ''), '🏙 ' + (c.city || c.location || '线下')));
      if (fee != null && fee > 0 && fee <= 600) meta.appendChild(el('span', 'aic-chip commute', '🚄 ≈¥' + fee));
    }
    (c.tags || []).slice(0, 3).forEach(function (t) { meta.appendChild(el('span', 'aic-chip', t)); });
    box.appendChild(meta);
    box.appendChild(fmtCountdown(c));

    var foot = el('div', 'aic-foot');
    foot.appendChild(el('span', null, '来源:' + (c.platform || c.source || '') + (c.stale ? ' · 近期榜单未见' : '')));
    box.appendChild(foot);
    return box;
  }

  /* ---------- 渲染 ---------- */

  var DATA = null;

  function render() {
    var list = (DATA && DATA.competitions) || [];
    /* 已结束的直接不渲染(用户规则:不要已截止的比赛;endsAt 是估算值,到期即隐藏) */
    list = list.filter(function (c) {
      var d = daysLeft(c.endsAt);
      return d == null || d >= 0;
    });
    var filtered = list.filter(passFilters);
    var main = filtered.filter(function (c) { return c.type !== 'dev'; });
    var dev = filtered.filter(function (c) { return c.type === 'dev'; });

    var totalPrize = list.reduce(function (s, c) { return s + (c.prizeValue || 0); }, 0);
    var wuxiCount = list.filter(function (c) {
      return c.isChina && c.city && WUXI_COMMUTE[c.city] != null && WUXI_COMMUTE[c.city] <= 600;
    }).length;
    var stats = document.getElementById('aic-stats');
    stats.innerHTML = '';
    [[list.length, '进行中比赛'], [list.filter(function (c) { return c.type !== 'dev'; }).length, 'AI Coding 精选'],
     [list.filter(function (c) { return c.isOnline; }).length, '线上'], [wuxiCount, '🚄 无锡通勤圈'],
     [totalPrize >= 1000 ? '$' + Math.round(totalPrize / 1000) + 'K+' : (totalPrize ? '$' + totalPrize : '—'), '总奖金池']]
      .forEach(function (p) {
        var s = el('div', 'aic-stat');
        s.appendChild(el('b', null, String(p[0])));
        s.appendChild(el('span', null, p[1]));
        stats.appendChild(s);
      });

    var upd = document.getElementById('aic-updated');
    if (DATA && DATA.updatedAt) {
      var t = new Date(DATA.updatedAt);
      upd.textContent = '更新于 ' + t.toLocaleString('zh-CN', { hour12: false });
    } else { upd.textContent = ''; }

    var byDeadline = function (x, y) { return (x.endsAt || '9999') < (y.endsAt || '9999') ? -1 : 1; };
    var byPrize = function (x, y) { return (y.prizeValue || 0) - (x.prizeValue || 0) || byDeadline(x, y); };
    main.sort(state.sort === 'prize' ? byPrize : byDeadline);
    dev.sort(state.sort === 'prize' ? byPrize : byDeadline);

    var gridMain = document.getElementById('aic-main');
    var gridDev = document.getElementById('aic-dev');
    var moreWrap = document.getElementById('aic-more-wrap');
    var empty = document.getElementById('aic-empty');
    var matchCount = document.getElementById('aic-match-count');
    gridMain.innerHTML = ''; gridDev.innerHTML = '';
    main.forEach(function (c) { gridMain.appendChild(card(c)); });
    dev.forEach(function (c) { gridDev.appendChild(card(c)); });
    empty.style.display = filtered.length ? 'none' : 'block';
    moreWrap.style.display = dev.length ? '' : 'none';
    matchCount.textContent = filtered.length === list.length
      ? '共 ' + list.length + ' 场' : filtered.length + ' / ' + list.length + ' 场匹配';
    writeHash();
  }

  /* ---------- 城市筛选chips(数据驱动,只列数据中出现的中国城市) ---------- */

  function buildCityChips() {
    var wrap = document.getElementById('aic-city-chips');
    if (!wrap || !DATA) return;
    var counts = {};
    (DATA.competitions || []).forEach(function (c) {
      if (!c.isOnline && c.isChina && c.city) counts[c.city] = (counts[c.city] || 0) + 1;
    });
    var cities = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
    /* 保留静态的两个(全部/无锡圈),清掉旧的城市 chips */
    Array.prototype.slice.call(wrap.children).forEach(function (n) {
      if (n.dataset.city !== 'all' && n.dataset.city !== 'wuxi600') wrap.removeChild(n);
    });
    cities.forEach(function (city) {
      var b = el('button', 'aic-chip-btn' + (state.city === city ? ' active' : ''), city + ' ' + counts[city]);
      b.type = 'button';
      b.dataset.city = city;
      b.addEventListener('click', function () {
        state.city = city;
        Array.prototype.forEach.call(wrap.querySelectorAll('.aic-chip-btn'), function (x) {
          x.classList.toggle('active', x === b);
        });
        render();
      });
      wrap.appendChild(b);
    });
  }

  /* ---------- 启动 ---------- */

  function bindGroup(attr, key) {
    document.querySelectorAll('[data-' + attr + ']').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state[key] = btn.dataset[attr];
        var group = btn.parentElement;
        Array.prototype.forEach.call(group.querySelectorAll('.aic-chip-btn'), function (x) {
          x.classList.toggle('active', x === btn);
        });
        render();
      });
    });
  }

  function boot() {
    if (!document.getElementById('aic-stats')) return;
    parseHash();
    bindGroup('sort', 'sort');
    bindGroup('mode', 'mode');
    bindGroup('deadline', 'deadline');
    /* 地点组含动态 chips,静态两个单独绑 */
    document.querySelectorAll('#aic-city-chips [data-city]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.city = btn.dataset.city;
        Array.prototype.forEach.call(document.querySelectorAll('#aic-city-chips .aic-chip-btn'), function (x) {
          x.classList.toggle('active', x === btn);
        });
        render();
      });
    });

    fetch('/assets/data/aicoding.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) { DATA = data; buildCityChips(); render(); })
      .catch(function (e) {
        document.getElementById('aic-updated').textContent = '数据加载失败:' + e.message;
      });

    /* 同页面 hash 变化(分享链接/浏览器后退)也要重新应用筛选 */
    window.addEventListener('hashchange', function () {
      if (!DATA) return;
      parseHash();
      render();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
})();
