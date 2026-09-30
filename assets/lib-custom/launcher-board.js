(() => {
  'use strict';
  const root = document.getElementById('launcher-board');
  if (!root) return;
  const find = id => document.getElementById(id);
  const el = (tag, text, cls) => { const n = document.createElement(tag); if (text != null) n.textContent = text; if (cls) n.className = cls; return n; };
  const number = n => n == null ? '—' : n.toLocaleString('zh-CN');
  const change = g => {
    if (!g || g.absolute == null) return '采集覆盖不足，暂不可比较';
    const absolute = `${g.absolute > 0 ? '+' : ''}${g.absolute} 个`;
    return g.percent == null ? `${absolute} · 基数为 0，无百分比` : `${absolute} (${g.percent > 0 ? '+' : ''}${g.percent}%)`;
  };
  function table(host, headers, rows) {
    const wrap = el('div', null, 'lb-scroll'), t = el('table'), head = el('thead'), tr = el('tr');
    headers.forEach(x => tr.append(el('th', x))); head.append(tr); t.append(head);
    const body = el('tbody'); rows.forEach(row => { const r = el('tr'); row.forEach(x => r.append(el('td', x))); body.append(r); });
    t.append(body); wrap.append(t); host.replaceChildren(wrap);
  }
  function chart(data, range) {
    const rows = data.days.slice(-range), host = find('lb-chart'); host.replaceChildren();
    if (!rows.length) { host.append(el('p', '尚无日活记录', 'lb-empty')); return; }
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', '0 0 760 240'); svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `${rows[0].day} 至 ${rows.at(-1).day} 活跃安装数趋势`);
    const add = (tag, attrs, text) => { const n = document.createElementNS(ns, tag); Object.entries(attrs).forEach(([k,v]) => n.setAttribute(k, v)); if(text != null)n.textContent=text; svg.append(n); return n; };
    const max = Math.max(1, ...rows.map(r => r.dau));
    const x = i => rows.length === 1 ? 396 : 44 + i * 688 / (rows.length - 1), y = v => 196 - v / max * 164;
    [0,.5,1].forEach(f => { add('line',{x1:44,y1:y(max*f),x2:732,y2:y(max*f),class:'lb-grid'}); add('text',{x:8,y:y(max*f)+4},number(Math.round(max*f*10)/10)); });
    add('path',{d:rows.map((r,i)=>`${i?'L':'M'}${x(i)},${y(r.dau)}`).join(' '),class:'lb-path'});
    rows.forEach((r,i) => { const dot = add('circle',{cx:x(i),cy:y(r.dau),r:rows.length>90?2:4,class:'lb-dot',opacity:r.complete?1:.45}); const title=document.createElementNS(ns,'title'); title.textContent=`${r.day} · ${r.dau} 个${r.complete?'':' · 当日未结束'}`; dot.append(title); });
    add('text',{x:44,y:226},rows[0].day); add('text',{x:732,y:226,'text-anchor':'end'},rows.at(-1).day); host.append(svg);
  }
  async function load() {
    const response = await fetch(root.dataset.source, {cache:'no-cache'}); if (!response.ok) throw Error('快照读取失败');
    const d = await response.json(); if(d.schema_version !== 2) throw Error('快照格式不兼容');
    const stamp = new Date(d.updated_at), stale = Date.now()-stamp.getTime()>26*3600000;
    find('lb-status').textContent = `快照更新：${stamp.toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false})}${stale?' · 更新已延迟，请稍后再看':''}`;
    if(stale)find('lb-status').classList.add('lb-warning');
    const cards = [
      ['昨日 DAU',d.yesterday,`${d.yesterday_date} · 完整日`,change(d.daily_growth)],
      ['本月 MAU',d.current_month?.mau,`${d.current_month?.month || '—'} · ${d.current_month?.coverage_full?'当月累计':'部分时间覆盖'}`,change(d.month_to_date_growth)],
      ['近 7 日均值',d.seven_day_average,`基于 ${d.seven_day_covered_days} 个已采集完整日`,'不包含今日'],
      ['今日 DAU',d.today,`${d.today_date} · 当日未结束`,'仅截至快照更新时间']
    ];
    find('lb-cards').replaceChildren(...cards.map(([label,value,note,g]) => {const c=el('div',null,'lb-card');c.append(el('div',label,'lb-card-label'),el('div',number(value),'lb-value'),el('div',note,'lb-card-note'),el('div',g,'lb-card-note'));return c;}));
    [7,30,90,365].forEach(n => { const b=el('button',`${n}天`); b.type='button';b.setAttribute('aria-pressed',String(n===30)); b.onclick=()=>{find('lb-range').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));chart(d,n);};find('lb-range').append(b); }); chart(d,30);
    table(find('lb-months'),['月份','MAU','覆盖 / 增长'],[...d.months].reverse().map(r=>[r.month,number(r.mau),!r.coverage_full?'启用后部分覆盖':!r.closed?'当月累计':change(r.growth)]));
    table(find('lb-days'),['日期','DAU','状态'],[...d.days].reverse().map(r=>[r.day,number(r.dau),r.complete?'完整日':'截至快照']));
    find('lb-coverage').textContent = `${d.definition} 日活始于 ${d.daily_started_on}；月活启用于 ${new Date(d.monthly_started_at).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false})}。${d.coverage_note}`;
    find('lb-export').onclick=()=>{const csv='\uFEFF日期,活跃安装数,完整日\r\n'+d.days.map(r=>`${r.day},${r.dau},${r.complete?'是':'否'}`).join('\r\n');const u=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=el('a');a.href=u;a.download=`软件中心日活-${d.today_date}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
  }
  load().catch(() => { find('lb-status').textContent='统计快照暂时未能载入，请刷新页面重试。'; });
})();
