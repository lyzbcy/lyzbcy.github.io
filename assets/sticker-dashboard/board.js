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
  function show(a) {
    $('#sb-dialog-title').textContent=a.name;
    const body=$('#sb-dialog-body'); body.replaceChildren();
    body.append(node('p',`累计发送 ${fmt(a.sends)} · 累计下载 ${fmt(a.downloads)} · 每次下载对应 ${fmt(a.ratio)} 次发送。微信状态：${a.status}；上架日期：${a.opened_at||'未提供'}。`,'sb-dialog-meta'));
    if (checkedDistribution[a.id]) body.append(node('p',checkedDistribution[a.id],'sb-distribution'));
    if (a.wechat_url && /^https?:\/\/weixin\.qq\.com\/jumpemoticonstore\?token=/.test(a.wechat_url)) {
      const link=node('a','在微信中打开此套表情 ↗'); link.href=a.wechat_url.replace(/^http:/,'https:'); link.target='_blank'; link.rel='noopener noreferrer'; body.append(link);
    }
    if (a.change_since) body.append(node('p',`较 ${a.change_since.slice(0,10)}：发送增加 ${fmt(a.send_change)}，下载增加 ${fmt(a.download_change)}。`,'sb-muted'));
    if (!a.stickers.length) body.append(node('p','本套已收录统计；暂未加载逐图档案。','sb-empty'));
    else {
      body.append(node('p',a.preview_count ? '以下为压缩静态预览。单图次数是平台当日报告，日期逐图列出。' : '本套已记录含义；当前未缓存图片预览。','sb-muted'));
      const grid=node('div',undefined,'sb-stickers');
      a.stickers.forEach(s=>{const cell=node('div',undefined,'sb-sticker'); const src=previewUrl(s.preview); if(src) cell.append(image(src,s.meaning)); cell.append(node('span',String(s.index).padStart(2,'0')+' · '+(s.meaning||'未提供含义'))); cell.append(node('small',s.daily_date ? `${s.daily_date} 发送 ${fmt(s.daily_sends)} 次`:'单图日报：—')); grid.append(cell);});
      body.append(grid);
    }
    $('#sb-dialog').showModal();
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
  fetch(root.dataset.source,{credentials:'omit'}).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}).then(d=>{if(d.schema!==1||!Array.isArray(d.albums))throw new Error('快照格式不匹配');data=d;render();}).catch(()=>{$('#sb-freshness').textContent='快照暂未加载';$('#sb-error').hidden=false;$('#sb-error').textContent='数据暂时无法读取，请稍后刷新页面。';});
})();
