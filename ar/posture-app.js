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
  game.start(); loop();
  showToast('演示模式：模拟体态数据', 2000);
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
    const score = Math.round(70 + Math.sin(t*0.001)*25);
    hudLabel.textContent = '体态评分（演示）';
    hudScore.textContent = score;
    hudScore.classList.toggle('bad', score<70);
    hudTip.textContent = score<70 ? '检测到驼背，请挺直' : '坐姿良好，继续保持';
    document.body.dataset.postureScore = score;
  }
  renderer.render(scene, camera);
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
