// site-dev/ar/shared/game-state.js
// AR 游戏状态机基类：管理 idle/playing/ended + body data 属性 + localStorage 最高分。
// body data 属性供自动化检测（playwright）判断当前模式与进度。
export class BaseGame{
  constructor(storageKey){
    this.state='idle';           // idle|playing|ended
    this.storageKey=storageKey;  // localStorage 最高分键
  }
  setMode(m){ document.body.dataset.arMode=m; }             // boot|camera|mouse|fallback
  setCameraAttempted(v){ document.body.dataset.cameraAttempted=v; }
  setCameraReady(v){ document.body.dataset.cameraReady=v; }
  setError(e){ document.body.dataset.lastError=String(e||'').slice(0,120); }
  mark(key,val){ document.body.dataset[key]=val; }          // 通用 data 写入
  start(){ this.state='playing'; }
  end(){ this.state='ended'; }
  getBest(){ return parseInt(localStorage.getItem(this.storageKey)||'0',10); }
  saveBest(score){ const b=this.getBest(); if(score>b) localStorage.setItem(this.storageKey,String(score)); return Math.max(b,score); }
}
