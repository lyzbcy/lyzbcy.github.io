/* Douyin Data Board - 抖音数据看板交互逻辑
 *
 * 本文件原为 _posts/2026-07-29-抖音数据看板.md 中的内联 <script>。
 * 因 Jekyll/kramdown 构建链会静默丢弃该文章正文中的内联 <script> 块
 * （连带丢失其后的 detail-panel 等结构），导致排序、详情面板、多作品对比
 * 三个功能在线上全部失效。抽成外部 JS 文件后，由 <script src> 引用，
 * 不再受 markdown 解析影响。
 *
 * 功能：
 *   1. 点击作品行展开详情面板
 *   2. 勾选多个作品生成对比柱状图
 *   3. 表头点击排序（发布/播放/完播率/质量分，每列双向）
 */
(function () {
  // 等 DOM 就绪（外部脚本在 <head> 或正文任意位置加载，元素可能尚未解析）
  function init() {
    var panel = document.getElementById('dy-detail-panel');
    var compareSec = document.getElementById('dy-compare-section');
    var tbody = document.getElementById('dy-works-tbody');
    if (!tbody) return;
    var rows = Array.prototype.slice.call(tbody.querySelectorAll('.dy-work-row'));

    // 点击行展开详情（行可聚焦、键盘可触发，与表头排序 a11y 对齐）
    rows.forEach(function (row) {
      row.setAttribute('tabindex', '0');
      row.setAttribute('role', 'button');
      var open = function (e) {
        // 点 checkbox / 链接 / 标签内部控件不触发展开
        if (e.target.closest('input, label, a, button')) return;
        showDetail(row);
      };
      row.addEventListener('click', open);
      row.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(e); }
      });
    });

    function showDetail(row) {
      var d = row.dataset;
      document.getElementById('dy-detail-title').textContent = d.title || '-';
      document.getElementById('dy-detail-desc').textContent = d.desc || '-';
      var cover = document.getElementById('dy-detail-cover');
      if (d.cover) { cover.src = d.cover; cover.alt = d.title || ''; cover.style.display = ''; } else { cover.style.display = 'none'; }
      document.getElementById('dy-d-play').textContent = d.play || '-';
      document.getElementById('dy-d-likes').textContent = d.likes || '0';
      document.getElementById('dy-d-favorites').textContent = d.favorites || '0';
      document.getElementById('dy-d-comments').textContent = d.comments || '0';
      document.getElementById('dy-d-shares').textContent = d.shares || '0';
      document.getElementById('dy-d-follow').textContent = '+' + (d.follow || '0');
      document.getElementById('dy-d-comp').textContent = (d.comp || '-') + (d.comp ? '%' : '');
      document.getElementById('dy-d-quality').textContent = d.quality || '-';
      document.getElementById('dy-d-value').textContent = d.value || '-';
      panel.hidden = false;
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // 关闭按钮（空值守卫：元素缺失不致整段崩溃）
    var closeBtn = document.getElementById('dy-detail-close');
    if (closeBtn) closeBtn.addEventListener('click', function () { panel.hidden = true; });

    // 勾选对比
    var selected = new Set();
    function updateSel() {
      var count = selected.size;
      document.getElementById('dy-sel-count').textContent = '已选 ' + count;
      rows.forEach(function (r) { r.classList.toggle('dy-selected', selected.has(r.dataset.itemId)); });
      if (count >= 2) { renderCompare(); } else { compareSec.hidden = true; }
    }

    function renderCompare() {
      var chosen = rows.filter(function (r) { return selected.has(r.dataset.itemId); });
      var maxPlay = Math.max.apply(null, chosen.map(function (r) { return parseInt(r.dataset.play, 10) || 0; })) || 1;
      var chart = document.getElementById('dy-compare-chart');
      // 用 DOM API 安全构建，避免 dataset.title（外部抓取内容）拼进 innerHTML 造成注入
      chart.textContent = ''; // 清空旧图
      chosen.forEach(function (r) {
        var play = parseInt(r.dataset.play, 10) || 0;
        var pct = Math.round(play / maxPlay * 100);
        var fullTitle = r.dataset.title || '';
        var bar = document.createElement('div');
        bar.className = 'dy-compare-bar';

        var val = document.createElement('span');
        val.className = 'dy-compare-bar-val';
        val.textContent = play;

        var fill = document.createElement('div');
        fill.className = 'dy-compare-bar-fill';
        fill.style.height = pct + '%';

        var label = document.createElement('span');
        label.className = 'dy-compare-bar-label';
        label.title = fullTitle;          // 属性赋值自动转义，安全
        label.textContent = fullTitle.slice(0, 8); // 文本赋值自动转义，安全

        bar.appendChild(val);
        bar.appendChild(fill);
        bar.appendChild(label);
        chart.appendChild(bar);
      });
      document.getElementById('dy-compare-count').textContent = '(' + chosen.length + ' 个作品 · 按播放量)';
      compareSec.hidden = false;
    }

    // 单行 checkbox —— 变更后同步两个"全选"框的勾选/半选状态
    function syncHeadCheckboxes() {
      var total = tbody.querySelectorAll('.dy-sel-cb').length;
      var count = selected.size;
      var allChecked = total > 0 && count === total;
      var noneChecked = count === 0;
      [toggleAll, headCb].forEach(function (cb) {
        if (!cb) return;
        cb.checked = allChecked;
        cb.indeterminate = !allChecked && !noneChecked; // 部分选中
      });
    }

    tbody.querySelectorAll('.dy-sel-cb').forEach(function (cb) {
      cb.addEventListener('change', function () {
        if (this.checked) selected.add(this.dataset.itemId); else selected.delete(this.dataset.itemId);
        updateSel();
        syncHeadCheckboxes();
      });
    });

    // 全选
    function setAll(checked) {
      tbody.querySelectorAll('.dy-sel-cb').forEach(function (cb) {
        cb.checked = checked;
        if (checked) selected.add(cb.dataset.itemId); else selected.delete(cb.dataset.itemId);
      });
      updateSel();
      syncHeadCheckboxes();
    }
    var toggleAll = document.getElementById('dy-toggle-all');
    var headCb = document.getElementById('dy-head-cb');
    if (toggleAll) toggleAll.addEventListener('change', function () { setAll(this.checked); });
    if (headCb) headCb.addEventListener('change', function () { setAll(this.checked); });

    // 清除（空值守卫）
    var clearBtn = document.getElementById('dy-clear-sel');
    if (clearBtn) clearBtn.addEventListener('click', function () {
      selected.clear();
      if (toggleAll) toggleAll.checked = false;
      if (headCb) headCb.checked = false;
      tbody.querySelectorAll('.dy-sel-cb').forEach(function (cb) { cb.checked = false; });
      updateSel();
    });

    // ── 表头点击排序 ──
    // 支持 4 列：发布(pub) / 播放(play) / 完播率(comp) / 质量分(score)
    // 每列点击切换 升序↗ ↔ 降序↘，初始播放列为降序（默认按播放量从高到低）
    var sortState = { key: 'play', dir: 'desc' }; // 初始：播放量降序（与 Liquid 默认排序一致）

    function sortValue(row, key) {
      var d = row.dataset;
      if (key === 'play') return parseInt(d.play, 10) || 0;
      if (key === 'comp') return parseFloat(d.comp) || 0;
      if (key === 'quality') return parseInt(d.quality, 10) || 0;
      if (key === 'value') return parseInt(d.value, 10) || 0;
      if (key === 'pub') {
        // publish_time 正常为 "YYYY-MM-DD HH:MM" 零填充格式，字典序即时间序。
        // 但数据来自自动抓取，为兼容非零填充（如 2026-6-3 9:05），优先用时间戳排序；
        // 解析失败（格式异常）则降级为字符串字典序，保证不报错、有确定顺序。
        var s = d.pub || '';
        var t = Date.parse(s.replace(/-/g, '/')); // iOS Safari 需要 / 分隔
        return isNaN(t) ? s : t;
      }
      return 0;
    }

    function applySort() {
      var sorted = rows.slice().sort(function (a, b) {
        var va = sortValue(a, sortState.key);
        var vb = sortValue(b, sortState.key);
        var cmp;
        if (typeof va === 'string' || typeof vb === 'string') {
          va = String(va); vb = String(vb);
          cmp = va < vb ? -1 : (va > vb ? 1 : 0);
        } else {
          cmp = va - vb;
        }
        return sortState.dir === 'desc' ? -cmp : cmp;
      });
      // 重新插入 DOM
      var frag = document.createDocumentFragment();
      sorted.forEach(function (r) { frag.appendChild(r); });
      tbody.appendChild(frag);
      // 重新计算名次（# 列）—— 排序后第 1/2/3 名要对应金/橙/黄色徽章
      sorted.forEach(function (r, i) {
        var rankCell = r.querySelector('.dy-rank');
        if (!rankCell) return;
        var idx = i + 1;
        rankCell.className = 'dy-rank ' + (idx === 1 ? 'r1' : idx === 2 ? 'r2' : idx === 3 ? 'r3' : 'rn');
        rankCell.textContent = idx;
      });
      // 更新表头箭头
      tbody.closest('table').querySelectorAll('.dy-sort-th').forEach(function (th) {
        var key = th.dataset.sortKey;
        var arrow = th.querySelector('.dy-sort-arrow');
        if (key === sortState.key) {
          th.classList.add('dy-sort-active');
          arrow.textContent = sortState.dir === 'desc' ? '↓' : '↑';
          // 无障碍：通告屏幕阅读器当前排序列与方向
          th.setAttribute('aria-sort', sortState.dir === 'desc' ? 'descending' : 'ascending');
        } else {
          th.classList.remove('dy-sort-active');
          arrow.textContent = '↕';
          th.setAttribute('aria-sort', 'none');
        }
      });
    }

    tbody.closest('table').querySelectorAll('.dy-sort-th').forEach(function (th) {
      var handler = function () {
        var key = th.dataset.sortKey;
        if (sortState.key === key) {
          // 同列：翻转方向
          sortState.dir = sortState.dir === 'desc' ? 'asc' : 'desc';
        } else {
          // 换列：播放/完播/质量默认降序（高的在前），发布默认降序（新的在前）
          sortState.key = key;
          sortState.dir = 'desc';
        }
        applySort();
      };
      th.addEventListener('click', handler);
      th.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); }
      });
    });

    // 初始排序（确保 DOM 顺序与默认状态一致）
    applySort();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
