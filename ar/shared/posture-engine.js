// site-dev/ar/shared/posture-engine.js
// 姿态引擎：关节角度计算 + 动作状态机 + 坐姿检测。
// 从 fitness-coach 抽取并增强，供护脊官 posture.html 复用。
// MediaPipe Pose 33点：0鼻 7/8耳 11/12肩 13/14肘 15/16腕 23/24髋 25/26膝 27/28踝

const RAD2DEG = 180 / Math.PI;

// 三点求夹角（度），b 是顶点
export function calcAngle(a, b, c){
  const ab = { x:a.x-b.x, y:a.y-b.y };
  const cb = { x:c.x-b.x, y:c.y-b.y };
  const dot = ab.x*cb.x + ab.y*cb.y;
  const mag = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y);
  return Math.acos(Math.max(-1, Math.min(1, dot/(mag||1)))) * RAD2DEG;
}

// 计算关键关节角度（度）。输入 MediaPipe Pose 33 点 landmarks（归一化坐标）
export function getAngles(lm){
  if(!lm || lm.length < 33) return null;
  return {
    kneeL: calcAngle(lm[23], lm[25], lm[27]),   // 左膝
    kneeR: calcAngle(lm[24], lm[26], lm[28]),   // 右膝
    elbowL: calcAngle(lm[11], lm[13], lm[15]),  // 左肘
    elbowR: calcAngle(lm[12], lm[14], lm[16]),  // 右肘
    hipL: calcAngle(lm[11], lm[23], lm[25]),    // 左髋
    hipR: calcAngle(lm[12], lm[24], lm[26]),    // 右髋
    // 头前倾：耳(7/8)相对肩(11/12)的水平前移量（归一化×100）
    headTilt: ((lm[7].x + lm[8].x)/2 - (lm[11].x + lm[12].x)/2) * 100,
    // 驼背：肩连线相对髋连线的前倾
    slouch: ((lm[11].x + lm[12].x)/2 - (lm[23].x + lm[24].x)/2) * 100,
    // 耸肩：肩到耳的距离（归一化，越小越耸）
    shrugL: Math.hypot(lm[7].x - lm[11].x, lm[7].y - lm[11].y),
    shrugR: Math.hypot(lm[8].x - lm[12].x, lm[8].y - lm[12].y),
  };
}

// 健身动作状态机：深蹲/俯卧撑/弯举计数。
// state: {phase:'up'|'down', count}。action: 'squat'|'pushup'|'curl'
// 返回 {rep:bool, quality:'good'|'ok'|null}
export function runFSM(angles, state, action){
  if(!angles) return {rep:false};
  if(action === 'squat'){
    const knee = (angles.kneeL + angles.kneeR) / 2;
    if(state.phase === 'up' && knee < 95){ state.phase = 'down'; }
    else if(state.phase === 'down' && knee > 160){ state.phase = 'up'; state.count++; return {rep:true, quality: knee>170 ? 'good' : 'ok'}; }
  } else if(action === 'pushup'){
    const elbow = (angles.elbowL + angles.elbowR) / 2;
    if(state.phase === 'up' && elbow < 90){ state.phase = 'down'; }
    else if(state.phase === 'down' && elbow > 160){ state.phase = 'up'; state.count++; return {rep:true, quality: elbow>170 ? 'good' : 'ok'}; }
  } else if(action === 'curl'){
    const elbow = angles.elbowR;
    if(state.phase === 'down' && elbow < 50){ state.phase = 'up'; }
    else if(state.phase === 'up' && elbow > 140){ state.phase = 'down'; state.count++; return {rep:true}; }
  }
  return {rep:false};
}

// 坐姿检测：返回 {headForward, slouching, shrugging, score(0-100), tips:[]}
export function checkPosture(angles){
  if(!angles) return null;
  const headForward = angles.headTilt > 8;
  const slouching = angles.slouch > 6;
  const shrugging = (angles.shrugL + angles.shrugR) / 2 < 0.08;
  let score = 100;
  const tips = [];
  if(headForward){ score -= 30; tips.push('头有些前倾，收下巴'); }
  if(slouching){ score -= 30; tips.push('肩膀有点驼，挺直背部'); }
  if(shrugging){ score -= 20; tips.push('肩膀紧张，放松下沉'); }
  return { headForward, slouching, shrugging, score, tips };
}

// 健身动作纠错提示：基于角度偏离阈值
export function correctAction(angles, action){
  if(!angles) return null;
  const tips = [];
  if(action === 'squat'){
    const knee = (angles.kneeL + angles.kneeR) / 2;
    if(knee > 95 && knee < 160) tips.push('蹲得再深一点');
    if(angles.hipL < 100) tips.push('膝盖不要超过脚尖');
  } else if(action === 'pushup'){
    const elbow = (angles.elbowL + angles.elbowR) / 2;
    if(elbow > 90 && elbow < 160) tips.push('再向下压一点');
  }
  return tips.length ? tips : null;
}
