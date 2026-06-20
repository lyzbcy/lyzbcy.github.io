// site-dev/ar/invite-app.js
// AR 邀请函：AR.js NFT 图像追踪 + 3D 魔性动画（星球浮起/光环/粒子/飘字）。
// 技术：three 0.169 + AR.js ar-threex（ESM importmap）。
// 兜底：NFT 识别不到时 demo 模式手动播放动画。
import * as THREE from 'three';
import { ArToolkitSource, ArToolkitContext, ArMarkerControls } from 'threex';
import {showToast, injectCameraSelector, getUserCameraStream} from './shared/fairy-ui.js';
import {BaseGame} from './shared/game-state.js';

const game = new BaseGame('invite_best');
game.setMode('boot');
const video = document.getElementById('video');
const permission = document.getElementById('permission');
const panel = document.getElementById('panel');
const scanHint = document.getElementById('scan-hint');
const enterBtn = document.getElementById('enter-btn-ar');

// ---------- Three.js 场景 ----------
const scene = new THREE.Scene();
scene.visible = false;  // 看到图才显示
const camera = new THREE.Camera();
scene.add(camera);

const renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.domElement.style.position='fixed'; renderer.domElement.style.inset='0';
renderer.domElement.style.width='100%'; renderer.domElement.style.height='100%';
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.9));
const dir = new THREE.DirectionalLight(0xfff0d0, 1.0); dir.position.set(1,2,2); scene.add(dir);

// ---------- 邀请函 3D 内容组 ----------
const inviteGroup = new THREE.Group();
scene.add(inviteGroup);

// 1. 程序生成星球
function makePlanetTexture(){
  const c=document.createElement('canvas'); c.width=512;c.height=256; const x=c.getContext('2d');
  const g=x.createLinearGradient(0,0,0,256); g.addColorStop(0,'#5ab0d8'); g.addColorStop(1,'#3a7aa8');
  x.fillStyle=g; x.fillRect(0,0,512,256);
  x.fillStyle='#6fa84c';
  for(let i=0;i<14;i++){ x.beginPath(); x.ellipse(Math.random()*512,Math.random()*256,20+Math.random()*40,15+Math.random()*25,Math.random()*Math.PI,0,Math.PI*2); x.fill(); }
  x.fillStyle='rgba(255,255,255,0.4)';
  for(let i=0;i<8;i++){ x.beginPath(); x.ellipse(Math.random()*512,Math.random()*256,30+Math.random()*30,8+Math.random()*8,0,0,Math.PI*2); x.fill(); }
  return new THREE.CanvasTexture(c);
}
const planet = new THREE.Mesh(
  new THREE.SphereGeometry(0.8, 32, 32),
  new THREE.MeshStandardMaterial({map:makePlanetTexture(), roughness:0.8, metalness:0.1, emissive:0x112233, emissiveIntensity:0.2})
);
planet.position.y = 0.5; planet.scale.setScalar(0.001);
inviteGroup.add(planet);

// 2. 光环
const ring = new THREE.Mesh(
  new THREE.TorusGeometry(1.1, 0.04, 12, 48),
  new THREE.MeshStandardMaterial({color:0xffdf8c, emissive:0xaa7733, emissiveIntensity:0.6, metalness:0.7, roughness:0.3})
);
ring.position.y = 0.5; ring.rotation.x = Math.PI/2.6; ring.scale.setScalar(0.001);
inviteGroup.add(ring);

// 3. 粒子绽放
const PARTICLE_COUNT=120;
const particleGeo = new THREE.BufferGeometry();
const pPos=new Float32Array(PARTICLE_COUNT*3), pVel=new Float32Array(PARTICLE_COUNT*3);
for(let i=0;i<PARTICLE_COUNT;i++){
  pPos[i*3]=0; pPos[i*3+1]=0.5; pPos[i*3+2]=0;
  const a=Math.random()*Math.PI*2, s=0.3+Math.random()*0.5;
  pVel[i*3]=Math.cos(a)*s; pVel[i*3+1]=0.5+Math.random()*0.4; pVel[i*3+2]=Math.sin(a)*s;
}
particleGeo.setAttribute('position', new THREE.BufferAttribute(pPos,3));
const particles = new THREE.Points(particleGeo, new THREE.PointsMaterial({color:0xffdf8c, size:0.06, transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false}));
inviteGroup.add(particles);

// 4. 飘字
function makeTextTexture(text){
  const c=document.createElement('canvas'); c.width=1024;c.height=128; const x=c.getContext('2d');
  x.font='bold 64px Georgia,"Microsoft YaHei",serif'; x.fillStyle='#ffdf8c';
  x.shadowColor='rgba(255,200,80,0.9)'; x.shadowBlur=24; x.textAlign='center'; x.textBaseline='middle';
  x.fillText(text, c.width/2, c.height/2);
  return new THREE.CanvasTexture(c);
}
const textSprite = new THREE.Sprite(new THREE.SpriteMaterial({map:makeTextTexture('欢迎来到捞鱼世界'), transparent:true}));
textSprite.scale.set(2.2,0.28,1); textSprite.position.y=2.0; textSprite.material.opacity=0;
inviteGroup.add(textSprite);

// 5. 光圈
const flashRing = new THREE.Mesh(
  new THREE.RingGeometry(0.1, 0.12, 48),
  new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, opacity:0, side:THREE.DoubleSide})
);
flashRing.rotation.x = -Math.PI/2; flashRing.position.y=0.01;
inviteGroup.add(flashRing);

// ---------- 动画状态机 ----------
let phase = 'idle';
let phaseTime = 0;
const particleStartPos = pPos.slice();

function startSequence(){
  phase='flash'; phaseTime=0;
  document.body.dataset.phase='flash';
  showToast('★ 捞鱼世界邀请你', 2000);
}
function updateAnimation(dt){
  phaseTime += dt;
  const t = phaseTime;
  if(phase==='flash'){
    flashRing.material.opacity = Math.max(0, 1 - t/0.5);
    flashRing.scale.setScalar(1 + t*4);
    if(t>0.5){ phase='rise'; phaseTime=0; document.body.dataset.phase='rise'; }
  } else if(phase==='rise'){
    const p = Math.min(1, t/1.0);
    const s = 1 - Math.pow(1-p, 3);
    planet.scale.setScalar(s);
    planet.rotation.y = t * 2;
    if(t>1.0){ phase='ring'; phaseTime=0; document.body.dataset.phase='ring'; }
  } else if(phase==='ring'){
    const p = Math.min(1, t/1.0);
    ring.scale.setScalar(1 - Math.pow(1-p,3));
    ring.rotation.z = t * 3;
    particles.material.opacity = Math.min(1, t*2) * Math.max(0, 1-(t-0.5)*1.5);
    const pos=particleGeo.attributes.position.array;
    for(let i=0;i<PARTICLE_COUNT;i++){
      pos[i*3] = particleStartPos[i*3] + pVel[i*3] * t;
      pos[i*3+1] = particleStartPos[i*3+1] + pVel[i*3+1]*t - 0.5*t*t;
      pos[i*3+2] = particleStartPos[i*3+2] + pVel[i*3+2] * t;
    }
    particleGeo.attributes.position.needsUpdate = true;
    if(t>1.0){ phase='text'; phaseTime=0; document.body.dataset.phase='text'; }
  } else if(phase==='text'){
    textSprite.material.opacity = Math.min(1, t/0.8);
    textSprite.position.y = 2.0 - Math.max(0, (0.8-t)/0.8)*0.5;
    if(t>1.0){ phase='hold'; phaseTime=0; document.body.dataset.phase='hold'; enterBtn.classList.add('show'); }
  } else if(phase==='hold'){
    planet.rotation.y += dt*0.5;
    ring.rotation.z += dt*0.8;
  }
}

enterBtn.onclick = ()=>{ window.location.href='/world/'; };

// ---------- AR.js NFT ----------
let arToolkitSource=null, arToolkitContext=null, arControls=null;
let mode='boot', lastTracked=false;

// 正式触发图：pinball 弹珠台图（NFT 描述符已下载到本地 data/invite/）
const NFT_URL = './data/invite/invite';

async function startCamera(){
  try{
    game.setCameraAttempted('true');
    // 用用户在 permission 卡选择的摄像头（默认后置，对准邀请函图）
    const cardEl = document.querySelector('#permission .perm-card');
    const sel = (cardEl && cardEl.__camSelector) ? cardEl.__camSelector.getSel() : {facingMode:'environment'};
    const stream = await getUserCameraStream(sel);
    video.srcObject = stream; await video.play();
    game.setCameraReady('true'); game.setMode('camera'); mode='camera';
    permission.classList.add('hidden'); panel.style.display='none';
    initAR();
    showToast('对准邀请函图，星球会浮起', 2500);
    game.start();
  }catch(e){
    game.setError(e); game.setMode('fallback');
    showToast('摄像头不可用，进入演示模式', 2000);
    startDemo();
  }
}

function initAR(){
  arToolkitSource = new ArToolkitSource({sourceElement:video});
  arToolkitSource.init(()=>{ onResize(); }, ()=>onResize());
  arToolkitContext = new ArToolkitContext({
    detectionMode:'mono',
    cameraParametersUrl:'https://cdn.jsdelivr.net/npm/ar.js@3.4.5/data/data/camera_para.dat',
    canvasWidth:480, canvasHeight:640
  });
  arToolkitContext.init(()=>onResize());
  arControls = new ArMarkerControls(arToolkitContext, inviteGroup, {
    type:'nft', descriptorsUrl:NFT_URL, changeMatrixMode:'cameraTransformMatrix'
  });
  animate();
}

function onResize(){
  if(arToolkitSource && arToolkitSource.domElement){
    arToolkitSource.onResizeElement(); arToolkitSource.copyElementSizeTo(renderer.domElement);
    if(arToolkitContext && arToolkitContext.arController){ arToolkitSource.copyElementSizeTo(arToolkitContext.canvasElement); }
  }
  renderer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', onResize);

function animate(){
  requestAnimationFrame(animate);
  const dt = 0.016;
  if(mode==='camera' && arToolkitContext){
    if(arToolkitSource && arToolkitSource.ready!==false){
      try{ arToolkitContext.update(arToolkitSource.domElement); }catch(e){}
    }
    scene.visible = camera.visible;
    const tracked = camera.visible;
    if(tracked && !lastTracked){
      lastTracked=true; game.mark('tracking','true');
      if(phase==='idle') startSequence();
    } else if(!tracked && lastTracked){
      lastTracked=false; game.mark('tracking','false');
    }
    if(phase!=='idle') updateAnimation(dt);
  } else if(mode==='demo'){
    scene.visible = true;
    camera.visible = true;
    if(phase!=='idle') updateAnimation(dt);
  }
  renderer.render(scene, camera);
}

// ---------- demo 模式 ----------
function startDemo(){
  mode='demo'; game.setMode('mouse');
  permission.classList.add('hidden'); panel.style.display='none';
  scanHint.style.display='none';
  inviteGroup.position.set(0,0,-4);
  game.start(); animate();
  startSequence();
  showToast('演示模式：邀请函动画', 2000);
}

document.getElementById('camera').onclick = startCamera;
document.getElementById('cam2').onclick = startCamera;
document.getElementById('demo').onclick = startDemo;
document.getElementById('demo2').onclick = startDemo;
// 页面加载时往 permission 卡注入摄像头选择器（应对多摄像头，默认后置对准邀请函图）
(async ()=>{ try{ const c=document.querySelector('#permission .perm-card'); if(c) c.__camSelector=await injectCameraSelector(c,'environment'); }catch(e){} })();
