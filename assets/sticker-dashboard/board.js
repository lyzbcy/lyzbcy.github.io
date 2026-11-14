(() => {
  'use strict';
  const root = document.getElementById('sticker-board');
  if (!root) return;
  const $ = id => root.querySelector(id.startsWith('#') ? id : '#' + id);
  const node = (tag, text, cls) => { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (cls) e.className = cls; return e; };
  const fmt = n => n === null || n === undefined ? '—' : Number(n).toLocaleString('zh-CN');
  const image = (src, alt) => {const img=node('img'); img.src=src; img.alt=alt; img.loading='lazy'; img.decoding='async'; img.width=240; img.height=240; img.addEventListener('error',()=>{img.replaceWith(node('p','预览暂不可用','sb-muted'));}); return img;};
  let data, filtered=[], page=1;
  const size=20;
  const previewUrl = src => {
    if(typeof src!=='string')return null;
    if(src.startsWith('/assets/sticker-dashboard/previews/'))return src;
    try {const u=new URL(src);if(u.protocol==='https:'&&u.hostname==='sticker.weixin.qq.com'&&u.pathname==='/cgi-bin/mmemoticon-bin/getmedia'&&[...u.searchParams.keys()].every(k=>k==='fileid'))return src;}catch{}
    return null;
  };
  const checkedDistribution = {
    stiker_1781253203d704c6e5fdc1beba:'抖音「星星布丁甜蜜贴贴」精选8张 · 已上线（2026-11-03核查）',
    stiker_1789092224aea6b0315728a9eb:'抖音「星星布丁贴贴日常」16张 · 已上线（2026-11-03核查）'
  };
  let dialogRequest=0;
  async function show(a, focusIndex) {
    const request=++dialogRequest;
    if(!$('#sb-dialog').open)$('#sb-dialog').showModal();
    $('#sb-dialog-title').textContent=a.name;
    const body=$('#sb-dialog-body'); body.replaceChildren();
    if(!a.stickers.length && a.detail_url){
      body.append(node('p','正在读取本套单图数据…','sb-muted'));
      try {
        if(!/^\/assets\/data\/sticker-albums\/[A-Za-z0-9_-]+\.json$/.test(a.detail_url))throw new Error('invalid detail');
        const response=await fetch(a.detail_url+'?at='+encodeURIComponent(data.captured_at),{credentials:'omit'});
        if(!response.ok)throw new Error('detail unavailable');
        const detail=await response.json();
        if(detail.id!==a.id||!Array.isArray(detail.stickers))throw new Error('detail mismatch');
        a.stickers=detail.stickers;
        a.wechat_url=detail.wechat_url;
      } catch {if(request===dialogRequest)body.replaceChildren(node('p','单图档案暂时无法加载，请关闭后重试。','sb-empty'));return;}
      if(request!==dialogRequest)return;
      body.replaceChildren();
    }
    body.append(node('p',`累计发送 ${fmt(a.sends)} · 累计下载 ${fmt(a.downloads)} · 每次下载对应 ${fmt(a.ratio)} 次发送。微信状态：${a.status}；上架日期：${a.opened_at||'未提供'}。`,'sb-dialog-meta'));
    if (checkedDistribution[a.id]) body.append(node('p',checkedDistribution[a.id],'sb-distribution'));
    if (a.wechat_url && /^https?:\/\/weixin\.qq\.com\/jumpemoticonstore\?token=/.test(a.wechat_url)) {
      const link=node('a','在微信中打开此套表情 ↗'); link.href=a.wechat_url.replace(/^http:/,'https:'); link.target='_blank'; link.rel='noopener noreferrer'; body.append(link);
    }
    if (a.change_since) body.append(node('p',`较 ${a.change_since.slice(0,10)}：发送增加 ${fmt(a.send_change)}，下载增加 ${fmt(a.download_change)}。`,'sb-muted'));
    if (!a.stickers.length) body.append(node('p','本套已收录统计；暂未加载逐图档案。','sb-empty'));
    else {
      body.append(node('p',a.preview_count ? '以下为压缩静态预览。单图次数是平台当日报告，日期逐图列出。' : '以下为单图发送档案；本套未缓存图片，以原始序号和含义定位。','sb-muted'));
      const grid=node('div',undefined,'sb-stickers');
      [...a.stickers].sort((x,y)=>(y.daily_sends??-1)-(x.daily_sends??-1)||x.index-y.index).forEach(s=>{const cell=node('div',undefined,'sb-sticker'); const src=previewUrl(s.preview); if(src) cell.append(image(src,s.meaning)); cell.append(node('span',String(s.index).padStart(2,'0')+' · '+(s.meaning||'未提供含义'))); if(s.daily_records?.length) s.daily_records.forEach(m=>cell.append(node('small',`${m.date} 发送 ${fmt(m.sends)} 次`)));else cell.append(node('small',s.daily_date ? `${s.daily_date} 发送 ${fmt(s.daily_sends)} 次`:'单图日报：—')); if(s.index===focusIndex){cell.classList.add('sb-selected');cell.dataset.focus='true';}grid.append(cell);});
      body.append(grid);
      if(focusIndex)grid.querySelector('[data-focus]')?.scrollIntoView({block:'center'});
    }
  }
  let singleRows=[],singleFiltered=[],singlePage=1;
  const albumMap=new Map();
  function renderSingles(){
    const date=$('#sb-single-date').value,q=$('#sb-single-search').value.trim().toLowerCase(),min=Math.max(0,Number($('#sb-single-min').value)||0),direction=$('#sb-single-sort').value==='asc'?1:-1;
    singleFiltered=singleRows.filter(r=>r[3]===date&&r[4]>=min&&(!q||(r[2]+' '+(albumMap.get(r[0])?.name||'')).toLowerCase().includes(q))).sort((a,b)=>direction*(a[4]-b[4])||a[0].localeCompare(b[0])||a[1]-b[1]);
    const pages=Math.max(1,Math.ceil(singleFiltered.length/size));singlePage=Math.min(singlePage,pages);
    $('#sb-single-rows').replaceChildren();
    singleFiltered.slice((singlePage-1)*size,singlePage*size).forEach((r,i)=>{const tr=node('tr'),album=albumMap.get(r[0]);tr.append(node('td',`${(singlePage-1)*size+i+1}. ${r[2]||'未提供含义'} · ${String(r[1]).padStart(2,'0')}`),node('td',fmt(r[4])),node('td',album?.name||'未知套装'));const td=node('td'),btn=node('button','查看套装');btn.type='button';btn.addEventListener('click',()=>show(album,r[1]));td.append(btn);tr.append(td);$('#sb-single-rows').append(tr);});
    if(!singleFiltered.length){const tr=node('tr'),td=node('td','没有匹配的单图记录。','sb-empty');td.colSpan=4;tr.append(td);$('#sb-single-rows').append(tr);}
    $('#sb-single-results').textContent=`统计日 ${date} · ${fmt(singleFiltered.length)} 张 · 发送合计 ${fmt(singleFiltered.reduce((s,r)=>s+r[4],0))} 次（当前筛选范围，非累计）`;
    $('#sb-single-page').textContent=`${singlePage} / ${pages}`;$('#sb-single-prev').disabled=singlePage===1;$('#sb-single-next').disabled=singlePage===pages;
  }
  async function loadSingles(){
    const btn=$('#sb-single-load');btn.disabled=true;btn.textContent='正在读取单图数据…';
    try {const response=await fetch(data.single_metrics.url+'?at='+encodeURIComponent(data.captured_at),{credentials:'omit'});if(!response.ok)throw new Error('unavailable');const result=await response.json();if(result.schema!==1||result.period_kind!=='platform_daily'||result.captured_at!==data.captured_at)throw new Error('mismatch');singleRows=result.rows.map(r=>[result.album_ids[r[0]],r[1],r[2],result.date_labels[r[3]],r[4],r[5]]);Object.keys(result.dates).sort((a,b)=>result.dates[b]-result.dates[a]).forEach(date=>{const option=node('option',date);option.value=date;$('#sb-single-date').append(option);});$('#sb-single-panel').hidden=false;btn.hidden=true;renderSingles();}catch{btn.disabled=false;btn.textContent='单图数据暂未加载，点击重试';}
  }
  function renderRevenue(){
    const section=$('#sb-revenue-section'), rev=data.revenue;
    if(!rev||!rev.leaderboard||!rev.leaderboard.length){section.hidden=false;$('#sb-rev-note').textContent='收益数据尚未采集或本次快照缺失；保留上次榜单。';return;}
    section.hidden=false;
    $('#sb-rev-note').textContent=`口径：收入 = 赞赏(元) + 热度(豆)/10 × 0.9。收益截至 ${rev.captured_at} 采集；总收入 ${rev.total_yuan} 元 = 赞赏 ${rev.reward_yuan} + 热度收益 ${rev.heat_income_yuan}；产生收入的套装 ${rev.albums_with_income} 套。`;
    const rows=$('#sb-rev-rows'); rows.innerHTML='';
    rev.leaderboard.forEach((r,i)=>{const tr=node('tr');
      tr.append(node('td',String(i+1)),node('td',r.name),node('td',fmt(r.reward)),node('td',fmt(r.hot)),node('td',fmt(r.revenue)));
      rows.append(tr);});
  }
  function renderRows() {
    const pages=Math.max(1,Math.ceil(filtered.length/size)); page=Math.min(page,pages);
    const rows=$('#sb-rows'); rows.replaceChildren();
    filtered.slice((page-1)*size,page*size).forEach((a,i)=>{
      const tr=node('tr'); const title=node('td'); title.append(node('span',`${(page-1)*size+i+1}. ${a.name}`)); if(a.change_since) title.append(node('small',`较上次发送 +${fmt(a.send_change)}`)); tr.append(title);
      [a.sends,a.downloads,a.ratio].forEach(n=>tr.append(node('td',fmt(n)))); const status=node('td'); status.append(node('span',a.status,'sb-status')); tr.append(status);
      const action=node('td'),btn=node('button','查看'); btn.type='button';btn.setAttribute('aria-label','查看'+a.name);btn.addEventListener('click',()=>show(a));action.append(btn);tr.append(action);rows.append(tr);
    });
    if(!filtered.length){const tr=node('tr'),td=node('td','没有匹配的套装。','sb-empty');td.colSpan=6;tr.append(td);rows.append(tr);}
    $('#sb-results').textContent=`找到 ${fmt(filtered.length)} 套 · 每页最多 ${size} 套 · 排序不代表人工评分`;
    $('#sb-page').textContent=`${page} / ${pages}`;$('#sb-prev').disabled=page===1;$('#sb-next').disabled=page===pages;
  }
  function filter() {
    const q=$('#sb-search').value.trim().toLowerCase(),status=$('#sb-status').value,minimum=Math.max(0,Number($('#sb-min').value)||0),sort=$('#sb-sort').value;
    filtered=data.albums.filter(a=>(!q||a.name.toLowerCase().includes(q))&&(!status||a.status===status)&&(a.downloads!==null?a.downloads>=minimum:minimum===0));
    filtered.sort((a,b)=>(b[sort]??-Infinity)-(a[sort]??-Infinity)||(b.sends??0)-(a.sends??0)||a.name.localeCompare(b.name,'zh-CN'));
    page=1;renderRows();
  }
  function render() {
    $('#sb-freshness').textContent=`更新于 ${data.captured_at.replace('T',' ').replace('+08:00','')}（北京时间） · 手动刷新快照`;
    const s=data.summary;
    data.albums.forEach(a=>albumMap.set(a.id,a));
    renderRevenue();
    if(data.single_metrics){$('#sb-single-coverage').textContent=`已读取 ${fmt(data.single_metrics.albums)} / ${fmt(data.single_metrics.scope)} 套已上架作品，${fmt(data.single_metrics.records)} 条单图日报记录。点击后加载数字索引，不下载全库图片。`;$('#sb-single-load').addEventListener('click',loadSingles);}else{$('#sb-single-load').hidden=true;$('#sb-single-coverage').textContent='单图日报正在补录。';}
    [['累计发送',s.sends],['累计下载',s.downloads],['已上架套装',s.statuses['已上架']||0],['有发送记录',s.used_albums]].forEach(([label,value])=>{const card=node('div',undefined,'sb-stat');card.append(node('strong',fmt(value)),node('span',label));$('#sb-summary').append(card);});
    const picks=data.albums.filter(a=>a.status==='已上架').slice(0,3),max=picks[0]?.sends||1;
    picks.forEach((a,i)=>{const card=node('article',undefined,'sb-pick'),src=previewUrl(a.stickers.find(s=>s.preview)?.preview);if(src)card.append(image(src,a.name+'预览'));card.append(node('span','候选 '+String(i+1).padStart(2,'0'),'sb-rank'),node('h4',a.name),node('p',`发送 ${fmt(a.sends)} · 下载 ${fmt(a.downloads)}\n每次下载对应 ${fmt(a.ratio)} 次发送`));const bar=node('div',undefined,'sb-bar'),fill=node('i');fill.style.width=Math.max(1,a.sends/max*100)+'%';bar.append(fill);card.append(bar);const btn=node('button','查看套装');btn.type='button';btn.addEventListener('click',()=>show(a));card.append(btn);$('#sb-picks').append(card);});
    Object.keys(s.statuses).filter(x=>x!=='已上架').forEach(x=>{const o=node('option',x+' · '+s.statuses[x]);o.value=x;$('#sb-status').append(o);});
    $('#sb-coverage').textContent=`平台共 ${s.total} 套；下载与发送覆盖 ${s.download_coverage}/${s.send_coverage} 套。`;
    $('#sb-media-note').textContent=`本次 ${data.media.preview_albums} 套候选共 ${data.media.preview_images} 张预览，其中公开直链 ${data.media.direct_images||0} 张、压缩缓存 ${data.media.cached_images||0} 张；其余套装不传输图片。`;
    ['sb-search','sb-min'].forEach(id=>$(id).addEventListener('input',filter));$('#sb-status').addEventListener('change',filter);$('#sb-sort').addEventListener('change',()=>{if($('#sb-sort').value==='ratio'&&Number($('#sb-min').value)<20)$('#sb-min').value='20';filter();});
    $('#sb-prev').addEventListener('click',()=>{page--;renderRows();});$('#sb-next').addEventListener('click',()=>{page++;renderRows();});filter();
  }
  $('#sb-close').addEventListener('click',()=>$('#sb-dialog').close());
  ['sb-single-search','sb-single-min','sb-single-date','sb-single-sort'].forEach(id=>$(id).addEventListener(id.includes('search')||id.includes('min')?'input':'change',()=>{singlePage=1;renderSingles();}));
  $('#sb-single-prev').addEventListener('click',()=>{singlePage--;renderSingles();});$('#sb-single-next').addEventListener('click',()=>{singlePage++;renderSingles();});
  fetch(root.dataset.source,{credentials:'omit'}).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}).then(d=>{if(d.schema!==1||!Array.isArray(d.albums))throw new Error('快照格式不匹配');data=d;render();}).catch(()=>{$('#sb-freshness').textContent='快照暂未加载';$('#sb-error').hidden=false;$('#sb-error').textContent='数据暂时无法读取，请稍后刷新页面。';});
})();
