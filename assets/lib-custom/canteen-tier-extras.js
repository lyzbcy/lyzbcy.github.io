/**
 * canteen-tier-extras.js — 《江南大学五六食堂从夯到拉排名》增强补丁
 *
 * 功能（2026-08-15 查证更新）：
 *   1. 店名纠正：按网络多方查证结果，自动修正语音转写造成的错别字（页面显示层）
 *   2. 歇业置灰：确认歇业的店铺变灰+"已成回忆"徽章；疑似歇业的半灰+"疑似歇业"徽章
 *   3. 外卖板块：新增"外卖从夯到拉排名"占位区（数据筹备中，不放样例数据）
 *   4. 一图流：页面顶部自动生成「堂食一图流」和「外卖一图流」两张大图，
 *      数据直接读取页面真实卡片，长图可截图/另存直接分享到抖音等平台
 *
 * 用法：本文件放在 /assets/lib-custom/canteen-tier-extras.js，
 *      并在文章 md 中 canteen-tier.js 引用之后加一行：
 *      <script defer src="/assets/lib-custom/canteen-tier-extras.js"></script>
 *
 * ★ 歇业名单是联网查证的推断，你人在现场，最清楚实情——
 *   直接改下面的 CLOSED / UNCERTAIN 数组即可增删。
 */
(function () {
  'use strict';

  /* ================== ① 店名纠正表（substring 替换，幂等，查不到就不动） ================== */
  var NAME_FIXES = [
    { from: '半将', to: '拌将' },                                    // 拌将麻辣拌·麻辣烫
    { from: '七根大碗牛', to: '其根大碗牛' },                          // 大悦城B1，抖音探店证实
    { from: '旭先生', to: '胥先生' },                                 // 胥先生鸭血粉丝
    { from: '海城楼', to: '海成楼' },                                 // 海成楼东北饭店（中置信）
    { from: '寻花间', to: '觅花涧' },                                 // 梅里山下觅花涧·云南菜
    { from: '艾斯米', to: '爱斯米' },                                 // 快乐爱斯米牛排自助
    { from: '韩又悠', to: '韩右右' },                                 // 韩右右·和牛毛肚烤肉火锅自助（大悦城L3）
    { from: '张摊', to: '脏摊' },                                     // 味多多脏摊麻辣串
    { from: '心服口服', to: '心福口福' },                              // 心福口福里脊饼（中置信）
    { from: '肥汁四喜', to: '肥汁四囍' },                              // 官方写法用"囍"
    { from: '麻辣多多麻辣拌', to: '多多麻辣拌' },                        // 多多麻辣拌（星光店）
    { from: '阿珍味道', to: '阿臻味道' },                              // 阿臻味道新疆炒米粉（低中置信，如不对删掉这行即可）
    { from: '杨明宇', to: '杨铭宇' },                                 // 杨铭宇黄焖鸡米饭
    { from: '今年任', to: '金年任' },                                 // 金年任石锅拌饭年糕火锅
    { from: '福语记', to: '福宇记' }                                  // 福宇记黄焖鸡米饭
  ];
  /* 整名替换（处理"穆盛宴 / 穆罕默德"这类混乱写法） */
  var NAME_OVERRIDES = [
    { match: '穆盛宴', name: '穆罕默德清真餐厅' }                       // 星光广场1楼，蠡湖大道1800号
  ];

  /* ================== ② 歇业名单（按卡名字符串匹配，可自行增删） ================== */
  /* 确认歇业 → 变灰 + "已成回忆" */
  var CLOSED = [
    { match: '陈凤祥', label: '已成回忆' }                             // 点评商户页已关闭（2026-08 查证）
  ];
  /* 疑似歇业 → 半灰 + "疑似歇业" */
  var UNCERTAIN = [
    { match: '杨铭宇', label: '疑似歇业' },                            // Trip 页混址 + 品牌大规模关店
    { match: '张亮', label: '疑似歇业' },                              // 星光店已查不到
    { match: '李记重庆鸡公煲', label: '疑似歇业' },                     // 江大周边已无"李记"
    { match: '小姐姐', label: '疑似歇业' },                            // 原址现为螺宝宝螺蛳粉
    { match: '五花火锅鸡', label: '疑似歇业' }                         // 点评无匹配，疑已换牌
  ];

  /* ================== ③ 注入样式 ================== */
  var CSS = [
    '.cte-closed{filter:grayscale(1);opacity:.45;position:relative;}',
    '.cte-uncertain{filter:grayscale(.6);opacity:.7;position:relative;}',
    '.cte-closed .spot-card__name{text-decoration:line-through;}',
    '.cte-badge{position:absolute;top:2px;right:2px;font-size:10px;line-height:1;',
    '  padding:2px 4px;border-radius:4px;color:#fff;pointer-events:none;}',
    '.cte-badge--closed{background:#666;}',
    '.cte-badge--uncertain{background:#b8860b;}',
    /* 外卖板块 */
    '.cte-takeout{margin:2.2em 0;padding:1.2em 1.4em;border:2px dashed #d9a441;',
    '  border-radius:14px;background:linear-gradient(135deg,#fffdf5,#fff8e8);}',
    '.cte-takeout h2{margin:.1em 0 .4em;font-size:1.25em;}',
    '.cte-takeout p{color:#8a6d1d;margin:.2em 0;}',
    '.cte-takeout__empty{color:#b3a07a;font-size:.95em;}',
    /* 一图流 */
    '.cte-poster{position:relative;margin:2.5em 0;border-radius:16px;overflow:hidden;',
    '  box-shadow:0 8px 30px rgba(0,0,0,.18);font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;}',
    '.cte-poster+ .cte-poster{margin-top:1.2em;}',
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
    '.cte-poster__chip--closed{background:#eee;color:#999;border-color:#ddd;',
    '  text-decoration:line-through;}',
    '.cte-poster__chip--uncertain{background:#f7f0dd;color:#9b8a55;border-style:dashed;}',
    '.cte-poster__foot{padding:10px 24px 16px;background:#fffdf7;color:#b3a07a;font-size:12px;}',
    /* 全图水印：斜向平铺"捞鱼" */
    '.cte-watermark{position:absolute;inset:0;pointer-events:none;z-index:5;opacity:.07;',
    '  background-repeat:repeat;}',
    '.cte-poster--takeout .cte-poster__body{min-height:220px;display:flex;',
    '  flex-direction:column;align-items:center;justify-content:center;color:#c9b98d;}',
    '.cte-poster__empty{font-size:18px;letter-spacing:4px;}',
    '@media (max-width:600px){.cte-poster__title{font-size:22px}.cte-poster__tier{flex-basis:64px;font-size:14px}}'
  ].join('');

  var TIER_STYLES = {
    '夯': { bg: 'linear-gradient(135deg,#c0392b,#e74c3c)' },
    '顶级': { bg: 'linear-gradient(135deg,#d35400,#f39c12)' },
    '人上人': { bg: 'linear-gradient(135deg,#b7950b,#f1c40f)' },
    'NPC': { bg: 'linear-gradient(135deg,#7f8c8d,#bdc3c7)' },
    '拉完了': { bg: 'linear-gradient(135deg,#555,#888)' }
  };

  function fixName(name) {
    for (var i = 0; i < NAME_OVERRIDES.length; i++) {
      if (name.indexOf(NAME_OVERRIDES[i].match) !== -1) return NAME_OVERRIDES[i].name;
    }
    var out = name;
    NAME_FIXES.forEach(function (f) {
      out = out.split(f.from).join(f.to);
    });
    return out;
  }
  function findStatus(name) {
    var i;
    for (i = 0; i < CLOSED.length; i++) if (name.indexOf(CLOSED[i].match) !== -1) return 'closed';
    for (i = 0; i < UNCERTAIN.length; i++) if (name.indexOf(UNCERTAIN[i].match) !== -1) return 'uncertain';
    return null;
  }

  /* ================== ④ 卡片纠正 + 置灰 ================== */
  function decorateCards() {
    var cards = document.querySelectorAll('.spot-card');
    var data = [];
    cards.forEach(function (card) {
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
      data.push({ name: fixed, status: status, card: card });
    });
    /* 文字摘要区的标题同步纠正 */
    document.querySelectorAll('.content-section h3').forEach(function (h3) {
      h3.textContent = fixName(h3.textContent);
    });
    /* 弹窗标题同步纠正（弹窗内容按点击时数据生成） */
    var title = document.getElementById('modalTitle');
    if (title && title.textContent) title.textContent = fixName(title.textContent);
    return data;
  }

  /* ================== ⑤ 一图流（数据直接取自页面真实卡片） ================== */
  var WATERMARK_SVG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160">' +
    '<text x="20" y="90" font-size="26" fill="#333" ' +
    'font-family="PingFang SC, Microsoft YaHei, sans-serif" ' +
    'transform="rotate(-22 20 90)">捞鱼</text></svg>');
  function addWatermark(poster) {
    var wm = document.createElement('div');
    wm.className = 'cte-watermark';
    wm.style.backgroundImage = 'url("' + WATERMARK_SVG + '")';
    poster.insertBefore(wm, poster.firstChild);
  }
  function buildPoster(kind) {
    var wrap = document.createElement('div');
    wrap.className = 'cte-poster' + (kind === 'takeout' ? ' cte-poster--takeout' : '');
    var head = document.createElement('div');
    head.className = 'cte-poster__head';
    var isDine = kind === 'dine';
    head.innerHTML = isDine
      ? '<h2 class="cte-poster__title">江南大学五六食堂 · 堂食从夯到拉</h2>'
      + '<div class="cte-poster__sub">大悦城 × 星光广场 ｜ 夯 → 顶级 → 人上人 → NPC → 拉完了 全档位一览</div>'
      : '<h2 class="cte-poster__title">江南大学五六食堂 · 外卖从夯到拉</h2>'
      + '<div class="cte-poster__sub">大悦城 × 星光广场 ｜ 外卖档排名</div>';
    var body = document.createElement('div');
    body.className = 'cte-poster__body';
    wrap.appendChild(head); wrap.appendChild(body);

    if (isDine) {
      document.querySelectorAll('.tier-row').forEach(function (row) {
        var tierName = (row.querySelector('.tier-label') || {}).textContent || '';
        tierName = tierName.trim().split(/\s+/)[0];
        if (!TIER_STYLES[tierName]) return;
        var items = row.querySelectorAll('.spot-card');
        if (!items.length) return;
        var r = document.createElement('div'); r.className = 'cte-poster__row';
        var t = document.createElement('div'); t.className = 'cte-poster__tier';
        t.style.background = TIER_STYLES[tierName].bg; t.textContent = tierName;
        var chips = document.createElement('div'); chips.className = 'cte-poster__chips';
        items.forEach(function (card) {
          var nm = (card.querySelector('.spot-card__name') || card).textContent.trim();
          var st = card.classList.contains('cte-closed') ? 'closed'
                 : card.classList.contains('cte-uncertain') ? 'uncertain' : null;
          var c = document.createElement('span');
          c.className = 'cte-poster__chip' + (st ? ' cte-poster__chip--' + st : '');
          c.textContent = nm + (st === 'closed' ? ' 🕯' : st === 'uncertain' ? ' ?' : '');
          chips.appendChild(c);
        });
        r.appendChild(t); r.appendChild(chips); body.appendChild(r);
      });
      var foot = document.createElement('div'); foot.className = 'cte-poster__foot';
      foot.textContent = '🕯 灰色划线 = 已歇业（成为回忆）｜ ? = 疑似歇业待确认 ｜ 数据截至 2026-08 ｜ © 捞鱼 ｜ 完整版见博客';
      wrap.appendChild(foot);
    } else {
      body.innerHTML = '<div class="cte-poster__empty" style="font-size:18px;letter-spacing:4px;color:#c9b98d;"><a href="/posts/江南大学外卖从夯到拉排名/" style="color:#c0392b;">外卖篇已上线 👉 点这里看外卖从夯到拉排名</a></div>';
      var foot2 = document.createElement('div'); foot2.className = 'cte-poster__foot';
      foot2.textContent = '© 捞鱼 ｜ 完整版见博客';
      wrap.appendChild(foot2);
    }
    addWatermark(wrap);
    return wrap;
  }

  /* ================== ⑥ 外卖排名板块（占位，不放样例数据） ================== */
  function buildTakeoutSection() {
    var sec = document.createElement('div');
    sec.className = 'cte-takeout';
    sec.innerHTML = '<h2>🍱 外卖从夯到拉排名（筹备中）</h2>'
      + '<p>第二期外卖篇正在筹备，评分数据整理完成后上线。</p>'
      + '<!-- 外卖排名数据（tier / rating / description / pros / cons / note）整理好后在此填入，不放样例数据 -->';
    return sec;
  }

  /* ================== ⑦ 启动：等原始 tier 渲染完成后再加工 ================== */
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
      var populated = document.querySelectorAll('.tier-row .spot-card').length > 0;
      if (populated || ++tries > 50) {
        clearInterval(timer);
        decorateCards();
        var anchor = document.querySelector('.tier-list-container');
        if (anchor) {
          anchor.parentNode.insertBefore(buildPoster('takeout'), anchor); // 外卖一图流
          anchor.parentNode.insertBefore(buildPoster('dine'), anchor);    // 堂食一图流（最前）
        }
        var tierList = document.querySelector('.tier-list-container');
        if (tierList && tierList.nextSibling) {
          tierList.parentNode.insertBefore(buildTakeoutSection(), tierList.nextSibling);
        } else if (tierList) {
          tierList.parentNode.appendChild(buildTakeoutSection());
        }
        /* 弹窗打开时持续纠正标题 */
        var modal = document.getElementById('spotModal');
        if (modal) new MutationObserver(function () {
          var t = document.getElementById('modalTitle');
          if (t && t.textContent) {
            var fixed = fixName(t.textContent);
            if (fixed !== t.textContent) t.textContent = fixed;
          }
        }).observe(modal, { childList: true, subtree: true, characterData: true });
      }
    }, 100);
  });
})();
