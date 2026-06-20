// site-dev/ar/shared/gesture-features.js
// 手势语义特征工程：从 MediaPipe Hands 21 个 landmark 计算手势类型 + 特征向量。
// 输出供魔法答案书（加权检索 + 评级）及未来 AR 复用。
// landmark 索引：0腕 5食指根 6食指中节 8食指尖 9中指根 10中指中节 12中指尖 14无名中节 16无名指尖 18小指中节 20小指尖
function dist(a,b){ return Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z); }
// 手指是否伸直：指尖到腕距离 > 中节到腕距离 × 1.1
function fingerExtended(lm, tip, pip){
  return dist(lm[tip],lm[0]) > dist(lm[pip],lm[0])*1.1;
}
// 输入 landmarks(21点数组) 和 history(历史 landmarks 数组，可为含 null 的稀疏数组)
// 返回 {type, openness, stability, entropy, fingerCount}
// type: open(张开) | fist(握拳) | point(食指指向) | unknown
export function classifyGesture(landmarks, history){
  if(!landmarks||landmarks.length<21) return {type:'unknown',openness:0,stability:0.5,entropy:0,fingerCount:0};
  const fingers=[
    fingerExtended(landmarks,8,6),    // 食指
    fingerExtended(landmarks,12,10),  // 中指
    fingerExtended(landmarks,16,14),  // 无名指
    fingerExtended(landmarks,20,18),  // 小指
  ];
  const fingerCount=fingers.filter(Boolean).length;
  // 张开度：四指指尖到掌心(中指根 9)的平均距离归一化
  const palm=landmarks[9];
  const openness=(dist(landmarks[8],palm)+dist(landmarks[12],palm)+dist(landmarks[16],palm)+dist(landmarks[20],palm))/4;
  // 稳定性：食指尖当前位置与 4 帧前位置的差异（越小越稳定）
  let stability=0.5;
  if(history&&history.length>3){
    const h=history[history.length-4];
    if(h&&h[8]){
      const dx=landmarks[8].x-h[8].x, dy=landmarks[8].y-h[8].y;
      stability=Math.max(0,Math.min(1,1-Math.hypot(dx,dy)*20));
    }
  }
  // 运动熵：最近若干帧位移的变异程度（越大越躁动）
  let entropy=0;
  if(history&&history.length>8){
    const moves=[];
    for(let i=1;i<history.length;i++){
      const p=history[i-1], c=history[i];
      if(p&&c&&p[8]&&c[8]) moves.push(Math.hypot(c[8].x-p[8].x,c[8].y-p[8].y));
    }
    if(moves.length){
      const mean=moves.reduce((a,b)=>a+b,0)/moves.length;
      entropy=Math.min(1, moves.reduce((a,b)=>a+Math.abs(b-mean),0)/moves.length*4);
    }
  }
  let type='unknown';
  if(fingerCount===0) type='fist';
  else if(fingerCount>=4) type='open';
  else if(fingerCount===1&&fingers[0]) type='point';
  return {type,openness:Math.min(1,openness*3),stability,entropy,fingerCount};
}
// 双手合十检测（许愿彩蛋）：两只手的食指尖距离很近
// hands: MediaPipe 返回的 landmarks 数组 或 detectForVideo 结果
export function detectPray(hands){
  if(!hands||hands.length<2) return false;
  const a=hands[0].landmarks?hands[0].landmarks:hands[0];
  const b=hands[1].landmarks?hands[1].landmarks:hands[1];
  if(!a||!b||!a[8]||!b[8]) return false;
  return dist(a[8],b[8])<0.08;
}
