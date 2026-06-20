// site-dev/ar/shared/gesture-dict.js
// 常用手势词判定规则库（手语桥用）。
// 基于手指伸展状态 + 关节角度 + 双手相对位置的规则匹配（无需训练模型）。
// 输入 hands: [{landmarks:[21点]}]，21点：0腕 4拇指尖 8食指尖 12中指尖 16无名指尖 20小指尖
// 5拇指根 6食指中节 9中指根 10中指中节 13无名根 14无名中节 17小指根 18小指中节

// 手指是否伸直：指尖到腕距离 > 中节到腕距离 × 1.1
function fe(lm, tip, pip){
  if(!lm[tip]||!lm[pip]||!lm[0]) return false;
  return Math.hypot(lm[tip].x-lm[0].x, lm[tip].y-lm[0].y) > Math.hypot(lm[pip].x-lm[0].x, lm[pip].y-lm[0].y)*1.1;
}
// [食,中,无名,小] 伸展状态
function fingersUp(lm){
  if(!lm||lm.length<21) return [false,false,false,false];
  return [fe(lm,8,6), fe(lm,12,10), fe(lm,16,14), fe(lm,20,18)];
}
// 拇指是否伸直（横向比较，拇指特殊）
function thumbUp(lm){
  if(!lm||lm.length<21) return false;
  return Math.hypot(lm[4].x-lm[0].x, lm[4].y-lm[0].y) > Math.hypot(lm[2].x-lm[0].x, lm[2].y-lm[0].y)*1.1;
}
function lm(h){ return h && (h.landmarks||h); }
function dist(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); }

// 每条规则：test(hands) 返回 bool。hands 是双手数组
export const GESTURE_DICT=[
  // 双手词优先（高区分度）
  {word:'爱', test:h=>{ // 双手比心：两手食指尖相触 + 拇指尖相触
    if(!h[0]||!h[1]) return false; const a=lm(h[0]),b=lm(h[1]);
    return dist(a[8],b[8])<0.08 && dist(a[4],b[4])<0.1; }},
  {word:'帮助', test:h=>{ // 双手合十：两掌心相对靠近
    if(!h[0]||!h[1]) return false; const a=lm(h[0]),b=lm(h[1]);
    return dist(a[9],b[9])<0.1 && dist(a[12],b[12])<0.1; }},
  {word:'家', test:h=>{ // 双手搭屋顶：两食指尖斜相触成三角
    if(!h[0]||!h[1]) return false; const a=lm(h[0]),b=lm(h[1]);
    return dist(a[8],b[8])<0.1 && a[8].y<a[5].y && b[8].y<b[5].y; }},
  {word:'朋友', test:h=>{ // 两食指勾在一起
    if(!h[0]||!h[1]) return false; const a=lm(h[0]),b=lm(h[1]); const fa=fingersUp(a),fb=fingersUp(b);
    return fa[0]&&!fa[1]&&fb[0]&&!fb[1] && dist(a[8],b[8])<0.12; }},
  // 单手词
  {word:'我', test:h=>{ // 食指指自己胸口（食指伸直向下）
    if(!h[0]) return false; const a=lm(h[0]); const f=fingersUp(a);
    return f[0]&&!f[1]&&!f[2]&&!f[3] && a[8].y>a[5].y; }},
  {word:'你', test:h=>{ // 食指指向前方（伸直向上）
    if(!h[0]) return false; const a=lm(h[0]); const f=fingersUp(a);
    return f[0]&&!f[1]&&!f[2]&&!f[3] && a[8].y<a[5].y; }},
  {word:'好', test:h=>{ // 竖大拇指
    if(!h[0]) return false; const a=lm(h[0]); const f=fingersUp(a);
    return !f[0]&&!f[1]&&!f[2]&&!f[3] && thumbUp(a) && a[4].y<a[2].y; }},
  {word:'加油', test:h=>{ // 握拳高举（拇指在上）
    if(!h[0]) return false; const a=lm(h[0]); const f=fingersUp(a);
    return !f[0]&&!f[1]&&!f[2]&&!f[3] && thumbUp(a) && a[0].y<0.3; }},
  {word:'谢谢', test:h=>{ // 五指全开（含拇指）
    if(!h[0]) return false; const a=lm(h[0]); const f=fingersUp(a);
    return f[0]&&f[1]&&f[2]&&f[3] && thumbUp(a); }},
  {word:'是', test:h=>{ // 食指中指 V 字
    if(!h[0]) return false; const a=lm(h[0]); const f=fingersUp(a);
    return f[0]&&f[1]&&!f[2]&&!f[3]; }},
  {word:'漂亮', test:h=>{ // OK 手势：拇指食指成环，中无名小伸直
    if(!h[0]) return false; const a=lm(h[0]); const f=fingersUp(a);
    return dist(a[4],a[8])<0.07 && f[1] && f[2]; }},
  {word:'吃饭', test:h=>{ // 三指捏（拇指食指中指尖聚拢）
    if(!h[0]) return false; const a=lm(h[0]);
    return dist(a[4],a[8])<0.09 && dist(a[8],a[12])<0.1 && !fingersUp(a)[2]; }},
  {word:'学习', test:h=>{ // 食指指太阳穴（画面上部）
    if(!h[0]) return false; const a=lm(h[0]); const f=fingersUp(a);
    return f[0]&&!f[1]&&!f[2]&&!f[3] && a[8].y<0.3; }},
  {word:'对不起', test:h=>{ // 握拳在画面中部（胸前）
    if(!h[0]) return false; const a=lm(h[0]); const f=fingersUp(a);
    return !f[0]&&!f[1]&&!f[2]&&!f[3] && a[0].y>0.35 && a[0].y<0.65; }},
  {word:'否', test:h=>{ // 握拳（低位置）
    if(!h[0]) return false; const a=lm(h[0]); const f=fingersUp(a);
    return !f[0]&&!f[1]&&!f[2]&&!f[3] && !thumbUp(a); }},
  {word:'再见', test:h=>{ // 五指张开（无拇指，挥手）
    if(!h[0]) return false; const a=lm(h[0]); const f=fingersUp(a);
    return f[0]&&f[1]&&f[2]&&f[3] && !thumbUp(a); }},
];

// 识别：返回 {word, confidence, ambiguous?} 或 null
export function recognize(hands){
  if(!hands||hands.length===0) return null;
  const hits=[];
  for(const g of GESTURE_DICT){
    try{ if(g.test(hands)) hits.push(g.word); }catch(e){}
  }
  if(hits.length===0) return null;
  return { word:hits[0], confidence: hits.length===1?0.9:0.6, ambiguous: hits.length>1?hits:null };
}
