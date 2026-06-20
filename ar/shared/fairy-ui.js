// site-dev/ar/shared/fairy-ui.js
// 童话 UI 组件工厂：toast / 结算面板 / 返回展区。保证所有 AR 的交互 UI 一致。
export function showToast(text, ms=1400){
  let t=document.getElementById('toast');
  if(!t){ t=document.createElement('div'); t.id='toast'; document.body.appendChild(t); }
  t.textContent=text; t.classList.add('show');
  clearTimeout(t._timer); t._timer=setTimeout(()=>t.classList.remove('show'),ms);
}
// 返回游戏厅：iframe 内则 postMessage 通知父窗口关闭，独立访问则跳转 /ar/
export function backToArcade(){
  if(window.parent!==window){ window.parent.postMessage({type:'ar:close'},'*'); }
  else { window.location.href='/ar/'; }
}
// 结算面板：rank(S/A/B/C)、title、desc、best(历史最高)、onReplay(再玩一次回调)
export function showResult({rank, title, desc, best, onReplay}){
  let r=document.getElementById('result');
  if(!r){
    r=document.createElement('div'); r.id='result';
    r.innerHTML=`<div class="result-card">
      <div class="rank"></div><h2></h2><p class="desc"></p>
      <p class="best"></p>
      <div class="actions" style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        <button class="primary" id="result-replay">再来一次</button>
        <button class="ghost" id="result-back">返回展区</button>
      </div></div>`;
    document.body.appendChild(r);
  }
  r.querySelector('.rank').textContent=rank;
  r.querySelector('h2').textContent=title;
  r.querySelector('.desc').textContent=desc;
  r.querySelector('.best').textContent=best?('历史最高：'+best):'';
  r.classList.add('show');
  r.querySelector('#result-replay').onclick=()=>{ r.classList.remove('show'); onReplay&&onReplay(); };
  r.querySelector('#result-back').onclick=()=>{ r.classList.remove('show'); backToArcade(); };
}

// ---------- 摄像头设备选择（应对用户有多个摄像头的情况）----------
// 列出所有视频输入设备。注意：enumerateDevices 在未授权前 label 可能为空，
// 因此建议在首次 getUserMedia 成功后再调用，或提供"默认/前置/后置"的 facingMode 快捷选项。
export async function enumerateCameras(){
  try{
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cams = devices.filter(d=>d.kind==='videoinput');
    return cams.map((c,i)=>({deviceId:c.deviceId, label:c.label||(`摄像头 ${i+1}`)}));
  }catch(e){ return []; }
}
// 用指定 deviceId（或 facingMode 回退）获取流。sel 可为 {deviceId} 或 {facingMode}。
export async function getUserCameraStream(sel, constraintsExtra={}){
  const base = {video:{...constraintsExtra}};
  if(sel && sel.deviceId){ base.video.deviceId={exact:sel.deviceId}; }
  else if(sel && sel.facingMode){ base.video.facingMode=sel.facingMode; }
  else { base.video.facingMode='user'; }
  return navigator.mediaDevices.getUserMedia(base);
}
// 在 permission 卡内注入摄像头选择下拉（如果有多个设备）。
// 返回一个对象，含 getSel() 方法获取当前选择。容器是 permission 卡的 .perm-card。
export async function injectCameraSelector(cardEl, defaultFacing='user'){
  const cams = await enumerateCameras();
  const hasRealLabels = cams.some(c=>c.label && !c.label.startsWith('摄像头 '));
  let sel = {facingMode:defaultFacing};
  if(cams.length<=1 && !hasRealLabels){
    return { getSel:()=>sel }; // 单摄像头，无需选择
  }
  const wrap=document.createElement('div');
  wrap.style.cssText='margin-bottom:14px;display:flex;flex-direction:column;gap:6px;align-items:center';
  const lbl=document.createElement('span');
  lbl.style.cssText='font-size:.8rem;color:rgba(89,58,32,.7)';
  lbl.textContent='选择摄像头';
  const select=document.createElement('select');
  select.style.cssText='padding:8px 12px;border-radius:12px;border:1px solid rgba(232,201,138,.55);background:#fff;color:#593a20;font-size:.9rem;max-width:90%';
  if(hasRealLabels){
    cams.forEach((c,i)=>{
      const opt=document.createElement('option');
      opt.value='dev:'+i; opt.textContent=c.label; select.appendChild(opt);
    });
  }else{
    const front=document.createElement('option'); front.value='face:user'; front.textContent='前置摄像头'; select.appendChild(front);
    const back=document.createElement('option'); back.value='face:environment'; back.textContent='后置摄像头'; select.appendChild(back);
    if(defaultFacing==='environment') select.value='face:environment';
  }
  select.onchange=()=>{
    const v=select.value;
    if(v.startsWith('dev:')){ sel={deviceId:cams[parseInt(v.slice(4))].deviceId}; }
    else if(v.startsWith('face:')){ sel={facingMode:v.slice(5)}; }
  };
  wrap.appendChild(lbl); wrap.appendChild(select);
  cardEl.insertBefore(wrap, cardEl.querySelector('#actions'));
  return { getSel:()=>sel };
}
