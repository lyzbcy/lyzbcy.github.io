// site-dev/ar/posture-app.js
// 旗舰③ AR 护脊官：办公坐姿监测 + 健身动作纠错。
// 痛点：久坐驼背/颈椎病 + 健身动作错误伤身。
// AI：MediaPipe PoseLandmarker 33 点 + posture-engine（角度/状态机/坐姿检测）。
import * as THREE from 'three';
import {createPoseLandmarker} from './shared/mediapipe-loader.js';
import {getAngles, runFSM, checkPosture, correctAction} from './shared/posture-engine.js';
import {showToast, injectCameraSelector, getUserCameraStream} from './shared/fairy-ui.js';
import {BaseGame} from './shared/game-state.js';

const game = new BaseGame('posture_best');
game.setMode('boot');
const video = document.getElementById('video');
const canvas = document.getElementById('scene');
const permission = document.getElementById('permission');
const panel = document.getElementById('panel');
const hudScore = document.getElementById('hud-score');
const hudTip = document.getElementById('hud-tip');
const hudLabel = document.getElementById('hud-label');
const postureHud = document.getElementById('posture-hud');
const repsStat = document.getElementById('reps-stat');
const fitnessControls = document.getElementById('fitness-controls');

// ---------- Three.js 场景：画身体骨骼 ----------
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
camera.position.z = 5;
scene.add(new THREE.AmbientLight(0xffffff, 1));

const POSE_CONNECTIONS = [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28]];
const skeletonGroup = new THREE.Group(); scene.add(skeletonGroup);

let poseLandmarker = null, mode = 'boot', appMode = 'office';
let fitnessAction = 'squat';
const fsm = {phase:'up', count:0};
let badPostureTimer = 0;
let lastWarnTime = 0;
let goodPostureStreak = 0;

async function startCamera(){
  try{
    game.setCameraAttempted('true');
    const cardEl = document.querySelector('#permission .perm-card');
    const sel = (cardEl && cardEl.__camSelector) ? cardEl.__camSelector.getSel() : {facingMode:'user'};
    const stream = await getUserCameraStream(sel);
    video.srcObject = stream; await video.play();
    game.setCameraReady('true');
    poseLandmarker = await createPoseLandmarker();
    game.setMode('camera'); mode='camera';
    permission.classList.add('hidden'); panel.style.display='none';
    postureHud.style.display='block';
    hideCursorWhilePlaying();
    showToast('全身入镜，开始监测体态', 2000);
    game.start(); loop();
  }catch(e){
    game.setError(e); game.setMode('fallback');
    showToast('摄像头不可用，进入演示模式', 2000);
    startDemo();
  }
}
function startDemo(){
  mode='demo'; game.setMode('mouse');
  permission.classList.add('hidden'); panel.style.display='none';
  postureHud.style.display='block';
  hudScore.classList.remove('bad');
  game.start(); loop();
  showToast('演示模式：回放体态监测闭环', 2000);
}

let _cursorTimer=null;
function hideCursorWhilePlaying(){
  document.body.style.cursor='none';
  addEventListener('mousemove',()=>{ document.body.style.cursor='auto'; clearTimeout(_cursorTimer); _cursorTimer=setTimeout(()=>{document.body.style.cursor='none';},1500); });
}

function drawSkeleton(lm, badJoints=new Set()){
  skeletonGroup.clear();
  const lineMat = new THREE.LineBasicMaterial({color:0xf2c978, transparent:true, opacity:0.85});
  const badMat = new THREE.LineBasicMaterial({color:0xe74c3c, transparent:true, opacity:0.9});
  const goodDot = new THREE.MeshBasicMaterial({color:0xfff0c0});
  const badDot = new THREE.MeshBasicMaterial({color:0xe74c3c});
  POSE_CONNECTIONS.forEach(([a,b])=>{
    if(!lm[a]||!lm[b]) return;
    const bad = badJoints.has(a)||badJoints.has(b);
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3((1-lm[a].x)*2-1, -lm[a].y*2+1, 0),
      new THREE.Vector3((1-lm[b].x)*2-1, -lm[b].y*2+1, 0)
    ]);
    skeletonGroup.add(new THREE.Line(g, bad?badMat:lineMat));
  });
  lm.forEach((p,i)=>{
    if(!p) return;
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.015,8,8), badJoints.has(i)?badDot:goodDot);
    d.position.set((1-p.x)*2-1, -p.y*2+1, 0);
    skeletonGroup.add(d);
  });
}

function loop(){
  requestAnimationFrame(loop);
  const t = performance.now();
  if(mode==='camera' && poseLandmarker && video.readyState>=2){
    const res = poseLandmarker.detectForVideo(video, t);
    const pose = res.landmarks && res.landmarks[0];
    if(pose){
      drawSkeleton(pose);
      const angles = getAngles(pose);
      if(appMode==='office') updateOfficeMode(angles, pose, t);
      else updateFitnessMode(angles, t);
    }
  } else if(mode==='demo'){
    // 演示回放脚本：用时间轴模拟"好姿势→变差→警告→纠正→恢复"完整闭环，
    // 让无摄像头环境也能讲清产品价值（而不是干看一个摆动的数字）。
    if(appMode==='office') updateOfficeDemo(t);
    else updateFitnessDemo(t);
  }
  renderer.render(scene, camera);
}

// 办公 demo：14 秒一个循环。脚本相位：
//   0-4s  良好(92) → 4-8s 渐差到驼背(58) → 8-9s 警告峰值 → 9-12s 纠正回升 → 12-14s 恢复良好
function updateOfficeDemo(t){
  const cycle = ((t % 14000) / 1000);
  let score, tip;
  if(cycle < 4){
    score = 92; tip = '坐姿良好，继续保持';
  } else if(cycle < 8){
    const p = (cycle - 4) / 4;
    score = Math.round(92 - p * 34);  // 92 → 58
    tip = '检测到逐渐驼背…';
  } else if(cycle < 9){
    score = 55; tip = '⚠ 头前倾+驼背，请挺直背部、收下巴';
  } else if(cycle < 12){
    const p = (cycle - 9) / 3;
    score = Math.round(55 + p * 37);  // 55 → 92
    tip = '正在纠正…继续保持';
  } else {
    score = 94; tip = '★ 已纠正，坐姿良好';
  }
  hudLabel.textContent = '体态评分（演示）';
  hudScore.textContent = score;
  hudScore.classList.toggle('bad', score < 70);
  hudTip.textContent = tip;
  repsStat.textContent = score;
  document.body.dataset.postureScore = score;
  // demo 也画一个示意骨骼（静态良好姿态），让画面不空
  drawDemoSkeleton(cycle);
}

// 健身 demo：每 2.5 秒完成一次深蹲/俯卧撑/弯举计数，演示 FSM 工作原理
function updateFitnessDemo(t){
  const period = fitnessAction === 'curl' ? 2000 : 2500;
  const phase = (t % period) / period;  // 0..1
  // 每 period 完成一次，fsm.count 累加
  const totalReps = Math.floor(t / period);
  if(fsm.count !== totalReps){
    fsm.count = totalReps;
    repsStat.textContent = fsm.count;
    document.body.dataset.reps = fsm.count;
    showToast('动作标准 +1（共' + fsm.count + '次）', 1000);
  }
  hudLabel.textContent = fitnessAction==='squat'?'深蹲（演示）':fitnessAction==='pushup'?'俯卧撑（演示）':'弯举（演示）';
  hudScore.textContent = fsm.count;
  hudScore.classList.remove('bad');
  // 用 phase 给动作进度提示
  if(phase < 0.4) hudTip.textContent = '下放阶段…';
  else if(phase < 0.6) hudTip.textContent = '到达最低点，准备发力';
  else hudTip.textContent = '发力上举…动作标准';
}

// demo 示意骨骼：画一个简化的良好姿态骨架，随 cycle 微动表示"在监测"
function drawDemoSkeleton(cycle){
  // 归一化的示意 landmark（正面站立良好姿态）
  const demoPose = [
    null,null,null,null,null,null,null,
    {x:0.46,y:0.12},{x:0.54,y:0.12},  // 7,8 耳
    null,null,
    {x:0.40,y:0.30},{x:0.60,y:0.30},  // 11,12 肩
    {x:0.38,y:0.48},{x:0.62,y:0.48},  // 13,14 肘
    {x:0.37,y:0.62},{x:0.63,y:0.62},  // 15,16 腕
    null,null,null,null,null,null,
    {x:0.44,y:0.62},{x:0.56,y:0.62},  // 23,24 髋
    {x:0.43,y:0.80},{x:0.57,y:0.80},  // 25,26 膝
    {x:0.43,y:0.95},{x:0.57,y:0.95}   // 27,28 踝
  ];
  // 驼背相位(4-9s)时头前倾：耳和肩 x 整体前移
  if(cycle >= 4 && cycle < 9){
    const fwd = Math.min(1, (cycle - 4) / 4) * 0.04;
    demoPose[7].x += fwd; demoPose[8].x += fwd;
  }
  const bad = (cycle >= 4 && cycle < 9) ? new Set([7,8,11,12]) : new Set();
  drawSkeleton(demoPose, bad);
}

function updateOfficeMode(angles, pose, t){
  const check = checkPosture(angles);
  if(!check) return;
  hudLabel.textContent = '体态评分';
  hudScore.textContent = check.score;
  hudScore.classList.toggle('bad', check.score<70);
  document.body.dataset.postureScore = check.score;
  repsStat.textContent = check.score;
  const bad = new Set();
  if(check.headForward){ bad.add(7); bad.add(8); }
  if(check.slouching){ bad.add(11); bad.add(12); }
  if(check.shrugging){ bad.add(11); bad.add(12); }
  drawSkeleton(pose, bad);
  if(check.score<70){
    badPostureTimer += 0.033;
    hudTip.textContent = check.tips[0] || '请调整坐姿';
    if(badPostureTimer>10 && t-lastWarnTime>15000){
      lastWarnTime = t;
      speak('请坐直，保护脊椎');
      showToast('已久坐不良姿势，起来活动一下', 3000);
      badPostureTimer = 0;
      goodPostureStreak = 0;
    }
  } else {
    badPostureTimer = 0;
    hudTip.textContent = '坐姿良好，继续保持';
    goodPostureStreak += 0.033/60;
    if(goodPostureStreak>=30){
      showToast('★ 成就解锁：护脊卫士（连续坐直30分钟）', 3000);
      goodPostureStreak = 0;
    }
  }
}

function updateFitnessMode(angles, t){
  const r = runFSM(angles, fsm, fitnessAction);
  if(r.rep){
    repsStat.textContent = fsm.count;
    document.body.dataset.reps = fsm.count;
    if(r.quality==='good') showToast('动作标准 +1（共'+fsm.count+'次）',1200);
    else showToast('完成 +1（共'+fsm.count+'次），注意动作幅度',1500);
  }
  hudLabel.textContent = fitnessAction==='squat'?'深蹲':fitnessAction==='pushup'?'俯卧撑':'弯举';
  hudScore.textContent = fsm.count;
  hudScore.classList.remove('bad');
  const tips = correctAction(angles, fitnessAction);
  hudTip.textContent = tips ? tips[0] : '动作进行中…';
}

function speak(text){
  if('speechSynthesis' in window){ const u=new SpeechSynthesisUtterance(text); u.lang='zh-CN'; speechSynthesis.speak(u); }
}

function setAppMode(m){
  appMode = m;
  document.body.dataset.mode = m;
  document.getElementById('mode-office').classList.toggle('active', m==='office');
  document.getElementById('mode-fitness').classList.toggle('active', m==='fitness');
  fitnessControls.classList.toggle('show', m==='fitness');
  fsm.count=0; fsm.phase='up'; repsStat.textContent='0';
  hudLabel.textContent = m==='office' ? '体态评分' : '深蹲';
}
document.getElementById('mode-office').onclick = ()=>setAppMode('office');
document.getElementById('mode-fitness').onclick = ()=>setAppMode('fitness');
fitnessControls.querySelectorAll('button').forEach(b=>{
  b.onclick = ()=>{
    fitnessAction = b.dataset.action;
    fitnessControls.querySelectorAll('button').forEach(x=>x.classList.toggle('active', x===b));
    fsm.count=0; fsm.phase='up';
    hudLabel.textContent = b.textContent;
  };
});

document.getElementById('camera').onclick = startCamera;
document.getElementById('cam2').onclick = startCamera;
document.getElementById('demo').onclick = startDemo;
document.getElementById('demo2').onclick = startDemo;
(async ()=>{ try{ const c=document.querySelector('#permission .perm-card'); if(c) c.__camSelector=await injectCameraSelector(c,'user'); }catch(e){} })();
addEventListener('resize', ()=>{ renderer.setSize(innerWidth,innerHeight); });
