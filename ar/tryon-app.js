// site-dev/ar/tryon-app.js
// 旗舰① AR 试戴间：3D眼镜/帽子/耳环贴合人脸 + 瞳距测量 + 截图。
// 痛点：网购配饰无法试戴，退货率高。
// AI：MediaPipe FaceLandmarker 468 关键点 + facialTransformationMatrixes 头部位姿。
import * as THREE from 'three';
import {createFaceLandmarker} from './shared/mediapipe-loader.js';
import {TRYON_PROPS} from './shared/tryon-props.js';
import {showToast, injectCameraSelector, getUserCameraStream} from './shared/fairy-ui.js';
import {BaseGame} from './shared/game-state.js';

const game = new BaseGame('tryon_best');
game.setMode('boot');
const video = document.getElementById('video');
const canvas = document.getElementById('scene');
const permission = document.getElementById('permission');
const panel = document.getElementById('panel');
const curPropEl = document.getElementById('cur-prop');
const pdDisplay = document.getElementById('pd-display');
const pdValue = document.getElementById('pd-value');
const pdTip = document.getElementById('pd-tip');
const propSelector = document.getElementById('prop-selector');

let currentPropIdx = 0;

// ---------- Three.js 场景（正交相机，归一化坐标贴配饰）----------
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
camera.position.z = 5;
scene.add(new THREE.AmbientLight(0xffffff, 0.9));
const keyLight = new THREE.DirectionalLight(0xfff0d0, 1.0); keyLight.position.set(1,1,2); scene.add(keyLight);

const propContainer = new THREE.Group(); scene.add(propContainer);
let currentProp = null;

function loadProp(idx){
  propContainer.clear();
  const def = TRYON_PROPS[idx];
  currentProp = def.make();
  propContainer.add(currentProp.group);
  curPropEl.textContent = def.name;
  document.body.dataset.currentProp = def.name;
  [...propSelector.children].forEach((b,i)=>b.classList.toggle('active', i===idx));
}

TRYON_PROPS.forEach((def, idx)=>{
  const btn = document.createElement('button');
  btn.className = 'prop-btn' + (idx===0?' active':'');
  btn.textContent = def.name;
  btn.onclick = ()=>{ currentPropIdx=idx; loadProp(idx); };
  propSelector.appendChild(btn);
});
loadProp(0);

// ---------- 摄像头 + FaceLandmarker ----------
let faceLandmarker = null, mode = 'boot';
let lastPd = 0;

async function startCamera(){
  try{
    game.setCameraAttempted('true');
    const cardEl = document.querySelector('#permission .perm-card');
    const sel = (cardEl && cardEl.__camSelector) ? cardEl.__camSelector.getSel() : {facingMode:'user'};
    const stream = await getUserCameraStream(sel);
    video.srcObject = stream; await video.play();
    game.setCameraReady('true');
    faceLandmarker = await createFaceLandmarker();
    game.setMode('camera'); mode='camera';
    permission.classList.add('hidden'); panel.style.display='none';
    pdDisplay.style.display='block';
    hideCursorWhilePlaying();
    showToast('把脸对准画面，转头试试看', 2000);
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
  game.start(); loop();
  showToast('演示模式：配饰在中央旋转', 2500);
}

let _cursorTimer=null;
function hideCursorWhilePlaying(){
  document.body.style.cursor='none';
  addEventListener('mousemove',()=>{ document.body.style.cursor='auto'; clearTimeout(_cursorTimer); _cursorTimer=setTimeout(()=>{document.body.style.cursor='none';},1500); });
}

function screenshot(){
  const tmp=document.createElement('canvas'); tmp.width=video.videoWidth||innerWidth; tmp.height=video.videoHeight||innerHeight;
  const tx=tmp.getContext('2d');
  if(video.videoWidth){ tx.drawImage(video,0,0,tmp.width,tmp.height); }
  tx.drawImage(canvas, 0,0, canvas.width, canvas.height, 0,0, tmp.width, tmp.height);
  const a=document.createElement('a'); a.download='ar-试戴-'+TRYON_PROPS[currentPropIdx].name+'.png';
  a.href=tmp.toDataURL('image/png'); a.click();
  showToast('已保存试戴截图', 1500);
}

// ---------- 主循环 ----------
function loop(){
  requestAnimationFrame(loop);
  const t = performance.now();
  if(mode==='camera' && faceLandmarker && video.readyState>=2){
    const res = faceLandmarker.detectForVideo(video, t);
    if(res.faceLandmarks && res.faceLandmarks[0]){
      const lm = res.faceLandmarks[0];
      positionPropByFace(lm, res.facialTransformationMatrixes);
      measurePupilDistance(lm);
    } else {
      propContainer.visible = false;
    }
  } else if(mode==='demo'){
    propContainer.visible = true;
    propContainer.rotation.y = Math.sin(t*0.0008)*0.5;
    propContainer.rotation.x = Math.cos(t*0.0006)*0.2;
    propContainer.position.set(0,0,0);
    propContainer.scale.setScalar(2.2);
  }
  renderer.render(scene, camera);
}

// 用 face mesh landmark 把配饰贴合到脸上（landmark 归一化0..1，video 镜像需 x 翻转）
// 平移/缩放/翻滚(z)：用 landmark 在正交相机屏幕坐标算（稳定、贴合脸部位置）
// 俯仰(x)/偏航(y)：用 facialTransformationMatrixes 的真实头部 6DoF 位姿
//   matrix.data 是 4×4 列主序，平移在第 4 列、旋转在前 3×3。
//   对正交相机来说 matrix 的平移分量无意义（我们用 landmark 平移），只取旋转分量。
function positionPropByFace(lm, transformMatrix){
  if(!currentProp) return;
  propContainer.visible = true;
  const a = currentProp.anchor;
  // 默认姿态（无 transformMatrix 时的兜底）
  let pitchX = 0, yawY = 0;
  if(transformMatrix && transformMatrix[0]){
    const m = transformMatrix[0].data;  // 列主序 4x4
    if(m && m.length >= 16){
      // 安全提取欧拉角（钳制防 NaN）：
      // pitch(x, 俯仰) = asin(-m[9])；yaw(y, 偏航) = atan2(m[1], m[5])
      pitchX = Math.asin(Math.max(-1, Math.min(1, -m[9])));
      yawY = Math.atan2(m[1], m[5]);
    }
  }
  if(a.leftEye !== undefined){
    const le = lm[a.leftEye], re = lm[a.rightEye];
    const cx = ((1-le.x) + (1-re.x))/2 * 2 - 1;
    const cy = -(le.y+re.y)/2 * 2 + 1;
    const eyeDist = Math.hypot((1-le.x)-(1-re.x), le.y-re.y);
    propContainer.position.set(cx, cy, 0);
    propContainer.scale.setScalar(eyeDist / 0.12 * a.scale * 2.5);
    // z 翻滚：双眼连线角度（屏幕内旋转）
    const rollZ = Math.atan2(re.y-le.y, (1-re.x)-(1-le.x));
    // x/y 轻量映射到 ±0.5rad，避免大幅头部转动时配饰飞出
    propContainer.rotation.set(pitchX*0.6, yawY*0.6, rollZ);
  } else if(a.top !== undefined){
    const top = lm[a.top];
    const cx = (1-top.x)*2-1, cy = -top.y*2+1;
    propContainer.position.set(cx, cy+0.05, 0);
    const headW = Math.hypot(lm[234].x-lm[454].x, lm[234].y-lm[454].y);
    propContainer.scale.setScalar(headW/0.15 * a.scale * 2.5);
    propContainer.rotation.set(pitchX*0.5, yawY*0.5, 0);
  } else if(a.leftEar !== undefined){
    const le = lm[a.leftEar], re = lm[a.rightEar];
    const cx = ((1-le.x)+(1-re.x))/2*2-1, cy = -(le.y+re.y)/2*2+1;
    propContainer.position.set(cx, cy-0.05, 0);
    const headW = Math.hypot(le.x-re.x, le.y-re.y);
    propContainer.scale.setScalar(headW/0.18 * a.scale * 2.5);
    propContainer.rotation.set(0, yawY*0.4, 0);
  }
}

// 瞳距测量：landmark 468(右瞳)/473(左瞳) 估算 mm（标注"参考瞳距"，精度有限）
function measurePupilDistance(lm){
  const rp = lm[468] || lm[33];
  const lp = lm[473] || lm[133];
  if(!rp||!lp) return;
  const normDist = Math.hypot(rp.x-lp.x, rp.y-lp.y);
  const pdMm = Math.round(normDist * 300);
  if(Math.abs(pdMm-lastPd)>=1){
    lastPd = pdMm;
    pdValue.textContent = pdMm + ' mm';
    let tip='参考瞳距';
    if(pdMm<58) tip='瞳距偏小，选窄框镜架';
    else if(pdMm>68) tip='瞳距偏大，选宽框镜架';
    else tip='瞳距适中，标准框都适合';
    pdTip.textContent = tip;
    document.body.dataset.pd = pdMm;
  }
}

// ---------- 事件 ----------
document.getElementById('camera').onclick = startCamera;
document.getElementById('cam2').onclick = startCamera;
document.getElementById('demo').onclick = startDemo;
document.getElementById('demo2').onclick = startDemo;
document.getElementById('screenshot').onclick = screenshot;
(async ()=>{ try{ const c=document.querySelector('#permission .perm-card'); if(c) c.__camSelector=await injectCameraSelector(c,'user'); }catch(e){} })();
addEventListener('keydown', e=>{ const n=parseInt(e.key); if(n>=1&&n<=9&&n<=TRYON_PROPS.length){ currentPropIdx=n-1; loadProp(currentPropIdx); } });
addEventListener('resize', ()=>{ renderer.setSize(innerWidth,innerHeight); });
