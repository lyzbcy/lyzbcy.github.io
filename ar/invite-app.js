// site-dev/ar/invite-app.js
// AR 邀请函：AR.js NFT 图像追踪 + 3D 童话邀请动画（星球浮起/光环/粒子/飘字）。
// 技术：three 0.169 + AR.js ar-threex（ESM importmap）。
// 兜底：NFT 识别不到时 demo 模式手动播放动画。
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { ArToolkitSource, ArToolkitContext, ArMarkerControls } from 'threex';
import {showToast, injectCameraSelector} from './shared/fairy-ui.js';
import {BaseGame} from './shared/game-state.js';

const game = new BaseGame('invite_best');
game.setMode('boot');
const video = document.getElementById('video');
const permission = document.getElementById('permission');
const panel = document.getElementById('panel');
const scanHint = document.getElementById('scan-hint');
const enterBtn = document.getElementById('enter-btn-ar');
const fallbackBar = document.getElementById('fallback-bar');

// ---------- Three.js 场景 ----------
// 使用更稳的 marker-root 结构：
//   - 用 PerspectiveCamera（非裸 Camera），ctx init 后 copy AR 投影矩阵
//   - ArMarkerControls 控制 markerRoot，内容挂在 markerRoot 下
//   - markerRoot.visible 直接代表“是否识别到图”，避免 camera.visible / scene.visible 的歧义
// 之前的坑：裸 THREE.Camera() 无投影矩阵、sourceElement 无效、matrixAutoUpdate=false 后改 position 不 updateMatrix。
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(0.8 * 180 / Math.PI, 640 / 480);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({antialias:true, alpha:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.domElement.style.position='fixed'; renderer.domElement.style.inset='0';
renderer.domElement.style.width='100%'; renderer.domElement.style.height='100%';
document.body.appendChild(renderer.domElement);

const DEBUG_AR = new URLSearchParams(location.search).has('debug');
function getARViewportSize(){
  const w = Math.max(640, Math.round(innerWidth));
  const h = Math.max(480, Math.round(innerHeight));
  return {w, h};
}
function forceFullBleed(){
  const allVideos = Array.from(document.querySelectorAll('video')).filter(el => el.id !== 'video');
  const els = [arToolkitSource?.domElement, document.getElementById('arjs-video'), ...allVideos, renderer.domElement].filter(Boolean);
  for(const el of els){
    el.style.position = 'fixed';
    el.style.left = '0';
    el.style.top = '0';
    el.style.width = '100vw';
    el.style.height = '100vh';
    el.style.maxWidth = 'none';
    el.style.maxHeight = 'none';
    el.style.objectFit = 'cover';
  }
  renderer.domElement.style.inset = '0';
  renderer.domElement.style.zIndex = '1';
  renderer.setSize(innerWidth, innerHeight, false);
}

scene.add(new THREE.AmbientLight(0xffffff, 0.9));
const dir = new THREE.DirectionalLight(0xfff0d0, 1.0); dir.position.set(1,2,2); scene.add(dir);

// ---------- 邀请函 3D 内容组 ----------
// markerRoot 被 AR.js 写入姿态矩阵；内容组使用毫米单位（NFT 坐标系是毫米，marker 约 188mm 宽）。
const markerRoot = new THREE.Group(); // raw AR.js tracking root，只接收识别矩阵
markerRoot.visible = false;
scene.add(markerRoot);

const stableRoot = new THREE.Group(); // 展示 root：复制并平滑 markerRoot，降低抖动
stableRoot.visible = false;
scene.add(stableRoot);

const inviteGroup = new THREE.Group();
stableRoot.add(inviteGroup);

const surface = new THREE.Mesh(
  new THREE.CircleGeometry(56, 64),
  new THREE.MeshBasicMaterial({color:0xffe7aa, transparent:true, opacity:0.055, side:THREE.DoubleSide})
);
surface.rotation.x = -Math.PI / 2;
surface.position.y = -2;
surface.visible = false; // 灰色大圆盘会造成整屏发雾，正式/验证都关闭
inviteGroup.add(surface);

const mascotRoot = new THREE.Group();
mascotRoot.position.set(0, 0, 48);
inviteGroup.add(mascotRoot);
let mascotMixer = null;
let mascotReady = false;

// 全套森林场景（多点散布）：Tree×3 + Flower×3 + Mushroom×2 + Grass×2 + Rock×1
// 来源：D:/Unity_test/fire/Assets/【湖边场景】SimpleLowPolyNature/Models/
// FBX 无贴图，按类型程序着色（flatShading 低多边形童话风）。
// 每个模型归一化到基准尺寸，散布在 marker 周围（圆周分布 + 随机偏移）。
const fbxLoader = new FBXLoader();
// 模型清单：[文件, 颜色, 目标尺寸mm, 散布半径范围(mm), 散布数量]
const FOREST_SPEC = [
  { file:'Tree1',     color:0x4a8f3d, size:200, rMin:60, rMax:90, count:1 },  // 主树（大）
  { file:'Tree2',     color:0x3d7a4f, size:120, rMin:70, rMax:95, count:1 },  // 副树
  { file:'Tree3',     color:0x5fa84c, size:140, rMin:50, rMax:85, count:1 },  // 副树
  { file:'Flower1',   color:0xe85d8f, size:32,  rMin:30, rMax:75, count:2 },  // 粉花
  { file:'Flower2',   color:0xf2c94c, size:32,  rMin:30, rMax:75, count:2 },  // 黄花
  { file:'Flower3',   color:0xc77dff, size:32,  rMin:30, rMax:75, count:2 },  // 紫花
  { file:'Mushroom1', color:0xd64545, size:30,  rMin:25, rMax:70, count:1 },  // 红蘑菇
  { file:'Mushroom2', color:0xe8a060, size:30,  rMin:25, rMax:70, count:1 },  // 橙蘑菇
  { file:'Grass1',    color:0x7bc66e, size:24,  rMin:15, rMax:80, count:3 },  // 草丛
  { file:'Grass2',    color:0x6bb55c, size:24,  rMin:15, rMax:80, count:3 },  // 草丛
  { file:'Rock1',     color:0x8a8a8a, size:30,  rMin:35, rMax:75, count:1 },  // 石头
];

function paintModel(model, color){
  model.traverse((obj)=>{
    if(obj.isMesh){
      obj.frustumCulled = false;
      obj.material = new THREE.MeshStandardMaterial({
        color, flatShading:true, roughness:0.85, metalness:0.0, side:THREE.DoubleSide
      });
    }
  });
}
function placeAndScale(model, targetSize, rMin, rMax){
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3(), center = new THREE.Vector3();
  box.getSize(size); box.getCenter(center);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  model.scale.setScalar(targetSize / maxDim);
  // FBX 从 Unity 导出上下颠倒（树根朝上）。绕 Z 轴翻 180° 让树冠朝上，
  // 同时保持正面朝向用户（绕X翻会导致背面朝用户，即"正反反了"）。
  model.rotation.z = Math.PI;
  // 居中：减去中心。翻转后用 box 重新算居中
  const box2 = new THREE.Box3().setFromObject(model);
  const c2 = new THREE.Vector3(); box2.getCenter(c2);
  model.position.sub(c2);
  // 圆周随机散布
  const ang = Math.random() * Math.PI * 2;
  const r = rMin + Math.random() * (rMax - rMin);
  model.position.x += Math.cos(ang) * r;
  model.position.z += Math.sin(ang) * r;
  model.rotation.y = Math.random() * Math.PI * 2;  // 随机朝向
}

let forestLoaded = 0, forestTotal = 0;
FOREST_SPEC.forEach(s => forestTotal += s.count);
FOREST_SPEC.forEach(spec => {
  for(let i=0; i<spec.count; i++){
    fbxLoader.load(`./models/${spec.file}.fbx`, (model)=>{
      paintModel(model, spec.color);
      placeAndScale(model, spec.size, spec.rMin, spec.rMax);
      mascotRoot.add(model);
      if(model.animations?.length && !mascotMixer){
        mascotMixer = new THREE.AnimationMixer(model);
        mascotMixer.clipAction(model.animations[0]).play();
      }
      forestLoaded++;
      if(forestLoaded >= forestTotal){
        mascotReady = true;
        planet.visible = false;
        LOG(`森林场景加载完成（${forestLoaded}个模型）`);
      }
    }, undefined, (err)=>{
      forestLoaded++;  // 失败也计数，避免卡住
      LOG(`${spec.file}.fbx 加载失败`, err?.message || err);
    });
  }
});

// 可见性锚点：多轴、多平面、大尺寸。只要 markerRoot 的模型矩阵有效，
// 至少会有一部分出现在画面里，用来把“已识别但看不见”的风险降到最低。
const visibilityAnchor = new THREE.Group();
const anchorCore = new THREE.Mesh(
  new THREE.SphereGeometry(24, 32, 20),
  new THREE.MeshBasicMaterial({color:0xffd45a, depthTest:false, depthWrite:false})
);
anchorCore.renderOrder = 999;
visibilityAnchor.add(anchorCore);
const anchorMat = new THREE.MeshBasicMaterial({color:0xfff0a8, transparent:true, opacity:1, side:THREE.DoubleSide, depthTest:false, depthWrite:false});
for(const rot of [[0,0,0], [Math.PI/2,0,0], [0,Math.PI/2,0]]){
  const halo = new THREE.Mesh(new THREE.TorusGeometry(34, 1.4, 12, 80), anchorMat.clone());
  halo.rotation.set(...rot);
  visibilityAnchor.add(halo);
}
const spikeMat = new THREE.MeshStandardMaterial({color:0x7bd5ff, emissive:0x2bbcff, emissiveIntensity:0.9, roughness:0.35});
const spikeY = new THREE.Mesh(new THREE.ConeGeometry(6, 32, 20), spikeMat);
spikeY.position.y = 30;
visibilityAnchor.add(spikeY);
const spikeZ = new THREE.Mesh(new THREE.ConeGeometry(6, 32, 20), spikeMat.clone());
spikeZ.rotation.x = Math.PI / 2;
spikeZ.position.z = 30;
visibilityAnchor.add(spikeZ);
const directionDots = [
  {name:'z+', color:0x35d7ff, pos:[0,0,78]},
  {name:'z-', color:0xff4fa3, pos:[0,0,-78]},
  {name:'y+', color:0x8cff6a, pos:[0,78,0]},
  {name:'x+', color:0xffffff, pos:[78,0,0]}
];
for(const d of directionDots){
  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(7, 16, 12),
    new THREE.MeshBasicMaterial({color:d.color, depthTest:false, depthWrite:false})
  );
  dot.position.set(...d.pos);
  dot.renderOrder = 1000;
  dot.visible = DEBUG_AR;
  dot.userData.label = d.name;
  visibilityAnchor.add(dot);
}
visibilityAnchor.traverse((obj)=>{
  if(obj.material){ obj.material.depthTest = false; obj.material.depthWrite = false; }
  obj.renderOrder = Math.max(obj.renderOrder || 0, 999);
});
visibilityAnchor.visible = DEBUG_AR;
inviteGroup.add(visibilityAnchor);

// 1. 程序生成星球（半径 25mm，约 marker 的 1/7，从图中央浮起）
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
  new THREE.SphereGeometry(28, 36, 28),
  new THREE.MeshBasicMaterial({map:makePlanetTexture(), depthTest:false, depthWrite:false})
);
planet.position.set(0, 0, 42); planet.renderOrder = 1001; planet.scale.setScalar(0.001);
inviteGroup.add(planet);

// GLB 加载失败时的兜底“微型童话星球”：给球体加小屋/塔/旗子，避免只剩廉价贴图球。
const fallbackDecor = new THREE.Group();
fallbackDecor.renderOrder = 1004;
const decorMats = {
  wall: new THREE.MeshBasicMaterial({color:0xffe3a8, depthTest:false, depthWrite:false}),
  roof: new THREE.MeshBasicMaterial({color:0xe85d75, depthTest:false, depthWrite:false}),
  flag: new THREE.MeshBasicMaterial({color:0x7bd5ff, depthTest:false, depthWrite:false}),
  tree: new THREE.MeshBasicMaterial({color:0x77c66e, depthTest:false, depthWrite:false})
};
function addTower(x,z,h=18){
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.8, h, 10), decorMats.wall);
  tower.position.set(x, 18 + h/2, z); tower.renderOrder = 1004; fallbackDecor.add(tower);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(5.2, 9, 12), decorMats.roof);
  roof.position.set(x, 18 + h + 5, z); roof.renderOrder = 1005; fallbackDecor.add(roof);
}
addTower(-9, 3, 18); addTower(8, -3, 14);
const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.7,0.7,24,6), decorMats.flag);
flagPole.position.set(0, 48, 0); flagPole.renderOrder = 1005; fallbackDecor.add(flagPole);
const flag = new THREE.Mesh(new THREE.ConeGeometry(5, 10, 3), decorMats.flag);
flag.rotation.z = -Math.PI/2; flag.position.set(6, 56, 0); flag.renderOrder = 1006; fallbackDecor.add(flag);
for(const [x,z] of [[-17,-8],[16,8]]){
  const tree = new THREE.Mesh(new THREE.ConeGeometry(5, 13, 10), decorMats.tree);
  tree.position.set(x, 23, z); tree.renderOrder = 1004; fallbackDecor.add(tree);
}
fallbackDecor.scale.setScalar(0.9);
planet.add(fallbackDecor);

const crown = new THREE.Group();
for(let i=0;i<7;i++){
  const star = new THREE.Mesh(
    new THREE.OctahedronGeometry(3 + (i%2)*1.2, 0),
    new THREE.MeshStandardMaterial({color:0xfff0b8, emissive:0xffb84d, emissiveIntensity:0.7, roughness:0.42})
  );
  const a = i / 7 * Math.PI * 2;
  star.position.set(Math.cos(a)*42, 48 + Math.sin(i)*3, Math.sin(a)*42);
  star.rotation.set(a, a*0.4, 0);
  crown.add(star);
}
crown.scale.setScalar(0.001);
inviteGroup.add(crown);

// 2. 光环（半径 35mm）
const ring = new THREE.Mesh(
  new THREE.TorusGeometry(34, 1.5, 12, 72),
  new THREE.MeshStandardMaterial({color:0xffdf8c, emissive:0xaa7733, emissiveIntensity:0.6, metalness:0.7, roughness:0.3})
);
ring.position.set(0, 0, 42); ring.rotation.x = Math.PI/2.6; ring.renderOrder = 1002; ring.scale.setScalar(0.001);
inviteGroup.add(ring);

// 3. 粒子绽放
const PARTICLE_COUNT=120;
const particleGeo = new THREE.BufferGeometry();
const pPos=new Float32Array(PARTICLE_COUNT*3), pVel=new Float32Array(PARTICLE_COUNT*3);
for(let i=0;i<PARTICLE_COUNT;i++){
  pPos[i*3]=0; pPos[i*3+1]=30; pPos[i*3+2]=0;
  const a=Math.random()*Math.PI*2, s=10+Math.random()*15;  // mm/s
  pVel[i*3]=Math.cos(a)*s; pVel[i*3+1]=15+Math.random()*12; pVel[i*3+2]=Math.sin(a)*s;
}
particleGeo.setAttribute('position', new THREE.BufferAttribute(pPos,3));
const particles = new THREE.Points(particleGeo, new THREE.PointsMaterial({color:0xffdf8c, size:2, transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false}));
inviteGroup.add(particles);

// 4. 飘字（70mm 宽，在星球上方 60mm）
function makeTextTexture(text){
  const c=document.createElement('canvas'); c.width=1024;c.height=128; const x=c.getContext('2d');
  x.font='bold 64px Georgia,"Microsoft YaHei",serif'; x.fillStyle='#ffdf8c';
  x.shadowColor='rgba(255,200,80,0.9)'; x.shadowBlur=24; x.textAlign='center'; x.textBaseline='middle';
  x.fillText(text, c.width/2, c.height/2);
  return new THREE.CanvasTexture(c);
}
const textSprite = new THREE.Sprite(new THREE.SpriteMaterial({map:makeTextTexture('欢迎来到捞鱼世界'), transparent:true}));
textSprite.scale.set(76,10,1); textSprite.position.set(0, -44, 58); textSprite.renderOrder = 1003; textSprite.material.depthTest=false; textSprite.material.depthWrite=false; textSprite.material.opacity=0;
inviteGroup.add(textSprite);

// 5. 光圈（marker 表面）
const flashRing = new THREE.Mesh(
  new THREE.RingGeometry(3, 4, 48),
  new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, opacity:0, side:THREE.DoubleSide})
);
flashRing.rotation.x = -Math.PI/2; flashRing.position.y=1;
inviteGroup.add(flashRing);

// 用 NFT marker 的物理尺寸把内容移到 marker 几何中心（官方公式）
window.addEventListener('arjs-nft-init-data', (e)=>{
  const d = e.detail;
  if(d && d.width && d.dpi){
    // 像素→毫米，再除2移到中心
    const cx = (d.width / d.dpi * 2.54 * 10) / 2.0;
    const cy = (d.height / d.dpi * 2.54 * 10) / 2.0;
    // 居中：内容定位在 marker 几何中心（0,0,0 即可，因为 NFT 坐标原点就在 marker 中心）
    inviteGroup.position.set(0, 0, 0);
    LOG(`nft-init-data: marker尺寸 ${(cx*2).toFixed(1)}×${(cy*2).toFixed(1)}mm，内容居中 (0,0,0)`);
  }
});

// ---------- 动画状态机 ----------
let phase = 'idle';
let phaseTime = 0;
const particleStartPos = pPos.slice();

function startSequence(){
  phase='flash'; phaseTime=0;
  document.body.dataset.phase='flash';
  enterBtn.classList.remove('show');
  visibilityAnchor.visible = DEBUG_AR;
  visibilityAnchor.scale.setScalar(1);
  visibilityAnchor.traverse((obj)=>{ if(obj.material){ obj.material.opacity = obj.material.opacity ?? 1; } });
  planet.scale.setScalar(0.001);
  ring.scale.setScalar(0.001);
  crown.scale.setScalar(0.001);
  mascotRoot.scale.setScalar(0.001);
  mascotRoot.rotation.set(0,0,0);
  mascotRoot.position.set(0, 0, 48);
  textSprite.material.opacity = 0;
  particles.material.opacity = 0;
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
    crown.scale.setScalar(s);
    // house 模型随 rise 缩放进场（从 0 长到 1），并轻微上浮
    mascotRoot.scale.setScalar(s);
    mascotRoot.position.set(0, (1-s)*-15, 48);
    planet.rotation.y = t * 2;
    crown.rotation.y = -t * 1.6;
    if(t>1.0){ phase='ring'; phaseTime=0; document.body.dataset.phase='ring'; }
  } else if(phase==='ring'){
    const p = Math.min(1, t/1.0);
    ring.scale.setScalar(1 - Math.pow(1-p,3));
    ring.rotation.z = t * 3;
    particles.material.opacity = Math.min(1, t*2) * Math.max(0, 1-(t-0.5)*1.5);
    const pos=particleGeo.attributes.position.array;
    for(let i=0;i<PARTICLE_COUNT;i++){
      pos[i*3] = particleStartPos[i*3] + pVel[i*3] * t;
      pos[i*3+1] = particleStartPos[i*3+1] + pVel[i*3+1]*t - 20*t*t;  // 重力(mm单位)
      pos[i*3+2] = particleStartPos[i*3+2] + pVel[i*3+2] * t;
    }
    particleGeo.attributes.position.needsUpdate = true;
    if(t>1.0){ phase='text'; phaseTime=0; document.body.dataset.phase='text'; }
  } else if(phase==='text'){
    textSprite.material.opacity = Math.min(1, t/0.8);
    textSprite.position.y = -44 - Math.max(0, (0.8-t)/0.8)*12;  // marker中心上方飘字
    if(t>1.8){ phase='hold'; phaseTime=0; document.body.dataset.phase='hold'; enterBtn.classList.add('show'); }
  } else if(phase==='hold'){
    planet.rotation.y += dt*0.5;
    ring.rotation.z += dt*0.8;
    crown.rotation.y -= dt*0.65;
    // house 缓慢自转（没动画的静态建筑，给它一点生气）
    mascotRoot.rotation.y += dt*0.35;
    visibilityAnchor.rotation.y += dt*0.55;
    visibilityAnchor.rotation.z += dt*0.25;
    textSprite.position.y = -44 + Math.sin(performance.now()*0.002)*2.2;
  }
}

enterBtn.onclick = ()=>{ window.location.href='/world/'; };

// ---------- AR.js NFT ----------
let arToolkitSource=null, arToolkitContext=null, arControls=null;
let mode='boot', lastTracked=false;
const TRACKING_GRACE_MS = 3000;
const FALLBACK_HINT_MS = 8000;  // 识别 8 秒无果 → 弹兜底条，避免演示冷场
let lastTrackedAt = 0;
let cameraStartAt = 0;
let fallbackShown = false;
let stableHasPose = false;
const rawPos = new THREE.Vector3();
const rawQuat = new THREE.Quaternion();
const rawScale = new THREE.Vector3();

// 正式触发图：pinball 弹珠台图（NFT 描述符已下载到本地 data/invite/）
// ★ 根因修复：必须用完整绝对URL！AR.js NFT 是 Blob 内联 Worker（createObjectURL），
// 而 Blob Worker 的 self.origin="null"（MDN/Vite#17507 证实）。Worker 内部对相对路径
// 会做 I = self.origin + '/' + path = "null/./data/invite/..." → fetch 失败 →
// initWithDimensions().catch(console.error)（只在Worker console，主线程看不到）
// → 永不postMessage → NFT永不识别（systematic-debugging确认的根因，真机验证有效）。
const INVITE_BASE = location.origin + '/ar/data/invite';
const NFT_URL = INVITE_BASE + '/invite';
const CAMERA_PARA_URL = INVITE_BASE + '/camera_para.dat';
// 调试埋点：手机上没控制台，所以每条 LOG 同时进历史 → 显示到屏幕浮层，方便截图反馈
const dbgLog = [];
function LOG(...a){
  console.log('%c[AR-INVITE]', 'color:#e8920c;font-weight:bold', ...a);
  const msg = a.map(x => {
    if(x instanceof Error) return x.message;
    if(typeof x === 'object') { try { return JSON.stringify(x); } catch(_) { return String(x); } }
    return String(x);
  }).join(' ');
  dbgLog.push(msg);
  if(dbgLog.length > 60) dbgLog.shift();
}
window.__arInviteLog = () => dbgLog.join('\n');

async function startCamera(){
  LOG('startCamera 被点击');
  game.setCameraAttempted('true');
  game.setCameraReady('true'); game.setMode('camera'); mode='camera';
  permission.classList.add('hidden'); panel.style.display='none';
  statusEl.style.display = 'block';
  // 旧的 #video 现在不用了（AR.js 自己创建 #arjs-video），隐藏掉避免空镜像层遮挡
  video.style.display = 'none';
  // 不再自己 getUserMedia！交给 ArToolkitSource(sourceType:'webcam') 全权管理，
  // 否则两路 getUserMedia 会冲突（之前就是这里导致 NFT 永不识别）。
  // 用户选的摄像头通过 deviceId 传给 AR.js（{exact:deviceId}）。
  cameraStartAt = performance.now();
  fallbackShown = false;
  fallbackBar.classList.remove('show');
  initAR();
  showToast('对准邀请函图，星球会浮起', 2500);
  game.start();
}

// 用户在 permission 卡选择的 deviceId（null=让 AR.js 默认后置）
function getSelectedDeviceId(){
  const cardEl = document.querySelector('#permission .perm-card');
  const sel = (cardEl && cardEl.__camSelector) ? cardEl.__camSelector.getSel() : null;
  LOG('摄像头选择 sel=', sel);
  return (sel && sel.deviceId) ? sel.deviceId : null;
}

function initAR(){
  LOG('initAR 开始（markerRoot 模式）');
  try{
    const deviceId = getSelectedDeviceId();
    // ArToolkitSource 只认 sourceType:image/video/webcam，sourceElement 是无效参数。
    // 让 AR.js 自己创建 video 并 getUserMedia，传 deviceId 指定摄像头。
    const vp = getARViewportSize();
    const sourceParams = {sourceType:'webcam', sourceWidth:vp.w, sourceHeight:vp.h, displayWidth:vp.w, displayHeight:vp.h, deviceId};
    if(deviceId === null) delete sourceParams.deviceId;  // null 会让 {exact:null} 失败
    arToolkitSource = new ArToolkitSource(sourceParams);
    arToolkitSource.init(
      ()=>{ LOG('ArToolkitSource.init 成功 ready=', arToolkitSource.ready); onResize(); forceFullBleed(); },
      (e)=>{ LOG('ArToolkitSource.init 失败 ✗', e && e.message); }
    );

    LOG('ArToolkitContext 创建中 cameraPara=', CAMERA_PARA_URL);
    arToolkitContext = new ArToolkitContext({
      detectionMode:'mono',
      cameraParametersUrl: CAMERA_PARA_URL,
      canvasWidth:getARViewportSize().w, canvasHeight:getARViewportSize().h
    });
    let initRet;
    try{
      initRet = arToolkitContext.init(
        ()=>{
          LOG('ArToolkitContext.init 成功 ✓ arController=', !!(arToolkitContext.arController));
          // 关键：把 AR 投影矩阵 copy 给 camera（官方示例必须步骤，否则渲染错位）
          if(arToolkitContext.getProjectionMatrix){
            camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix());
            LOG('已 copy AR 投影矩阵到 camera.projectionMatrix');
          }
          onResize();
          forceFullBleed();
        },
        (err)=>{ LOG('ArToolkitContext.init 回调 err=', err); }
      );
    }catch(e){
      LOG('ArToolkitContext.init 同步抛错 ✗', e);
      throw e;
    }
    if(initRet && typeof initRet.then === 'function'){
      initRet.then(()=>LOG('ArToolkitContext.init Promise resolve ✓'))
             .catch(err=>LOG('ArToolkitContext.init Promise REJECT ✗', err));
    }

    // modelViewMatrix：markerRoot 被识别图驱动，内容作为 markerRoot 子物体稳定贴在触发图上。
    try{
      arControls = new ArMarkerControls(arToolkitContext, markerRoot, {
        type:'nft', descriptorsUrl:NFT_URL, changeMatrixMode:'modelViewMatrix'
      });
      LOG('ArMarkerControls(NFT) 创建成功 descriptorsUrl=', NFT_URL);
    }catch(e){
      LOG('ArMarkerControls 构造抛错 ✗', e);
      throw e;
    }
    LOG('initAR 完成，启动 animate 循环');
    animate();
  }catch(e){
    LOG('initAR 顶层抛错 ✗', e);
    game.setError(e);
  }
}

function onResize(){
  if(arToolkitSource && arToolkitSource.domElement){
    try{
      // 不再 copyElementSizeTo(renderer.domElement)：它会把 Three canvas 压成 AR.js source 尺寸，
      // 在 iframe/桌面窗口里造成下半屏黑区。只保留 arController 内部 canvas 同步。
      if(arToolkitSource.onResizeElement) arToolkitSource.onResizeElement();
      if(arToolkitContext && arToolkitContext.arController && arToolkitContext.canvasElement){
        arToolkitSource.copyElementSizeTo(arToolkitContext.canvasElement);
      }
    }catch(e){ LOG('onResize 内部异常（可忽略，AR.js 异步初始化中）', e.message); }
  }
  renderer.setSize(innerWidth, innerHeight, false);
  forceFullBleed();
}
addEventListener('resize', onResize);

// ---------- 动画主循环 ----------
let updateErrCount = 0;
let frameNo = 0;
// 屏幕状态指示（临时诊断：看清正式页到底有没有识别到 marker）
const statusEl = document.createElement('div');
statusEl.style.cssText = 'position:fixed;left:50%;top:16%;transform:translateX(-50%);z-index:50;font:700 15px Georgia,\"Microsoft YaHei\",serif;color:#fff7e8;text-shadow:0 2px 8px rgba(65,38,12,.55);pointer-events:none;text-align:center;background:linear-gradient(180deg,rgba(255,247,232,.9),rgba(242,201,120,.82));color:#593a20;border:1px solid rgba(255,223,140,.7);box-shadow:0 12px 28px rgba(0,0,0,.18);padding:8px 14px;border-radius:999px;display:none';
statusEl.textContent = '等待魔法图案点亮…';
document.body.appendChild(statusEl);

function animate(){
  requestAnimationFrame(animate);
  const dt = 0.016;
  frameNo++;
  if(frameNo % 30 === 0) forceFullBleed();
  if(mascotMixer) mascotMixer.update(dt);
  if(mode==='camera' && arToolkitContext){
    // 官方写法：arToolkitSource 未 ready 就跳过（避免喂空帧）
    if(arToolkitSource && arToolkitSource.ready!==false){
      try{ arToolkitContext.update(arToolkitSource.domElement); }
      catch(e){ updateErrCount++; if(updateErrCount<=3) LOG('update() 抛错', e.message); }
    }
    const tracked = markerRoot.visible;
    const now = performance.now();
    if(tracked){
      lastTrackedAt = now;
      markerRoot.updateMatrixWorld(true);
      markerRoot.matrix.decompose(rawPos, rawQuat, rawScale);
      if(!stableHasPose){
        stableRoot.position.copy(rawPos);
        stableRoot.quaternion.copy(rawQuat);
        stableRoot.scale.copy(rawScale);
        stableHasPose = true;
      }else{
        stableRoot.position.lerp(rawPos, 0.075);
        stableRoot.quaternion.slerp(rawQuat, 0.06);
        stableRoot.scale.lerp(rawScale, 0.075);
      }
      stableRoot.visible = true;
    }else{
      stableRoot.visible = stableHasPose && (now - lastTrackedAt < TRACKING_GRACE_MS);
    }
    document.body.dataset.tracking = (tracked || stableRoot.visible) ? 'true' : 'false';
    const sr = arToolkitSource ? arToolkitSource.ready : '?';
    statusEl.textContent = DEBUG_AR
      ? `src.ready=${sr} | ${tracked ? '★已识别' : '未识别'} | markerRoot`
      : (tracked ? '✨ 魔法图案已点亮，模型正在浮起' : (stableRoot.visible ? '✨ 魔法锁定中，慢慢移动手机' : '把弹珠台图放正 · 距离 20–40cm'));
    statusEl.style.opacity = tracked ? '0.82' : '0.78';
    if(tracked && !lastTracked){
      lastTracked=true; game.mark('tracking','true');
      scanHint.style.opacity = '0';
      // 已识别：隐藏兜底条（如果出现过）
      fallbackBar.classList.remove('show');
      LOG('★ 首次识别成功！开始播放动画');
      if(phase==='idle') startSequence();
    } else if(!tracked && lastTracked && !stableRoot.visible){
      lastTracked=false; game.mark('tracking','false');
      scanHint.style.opacity = '0.85';
      enterBtn.classList.remove('show');
    }
    // 兜底：从开摄像头算起，8 秒内仍未识别过一次 → 弹兜底条，引导看演示
    // （NFT 对光线/打印质量敏感，演示场景不该干等）
    if(!fallbackShown && cameraStartAt && !lastTracked &&
       (now - cameraStartAt) > FALLBACK_HINT_MS){
      fallbackShown = true;
      fallbackBar.classList.add('show');
      LOG('识别超时，弹兜底条引导演示');
    }
    if(phase!=='idle') updateAnimation(dt);
  } else if(mode==='demo'){
    stableRoot.visible = true;
    if(phase!=='idle') updateAnimation(dt);
  }
  renderer.render(scene, camera);
}

// ---------- demo 模式 ----------
function startDemo(){
  mode='demo'; game.setMode('mouse');
  permission.classList.add('hidden'); panel.style.display='none';
  scanHint.style.display = 'none';
  statusEl.style.display = 'none';
  fallbackBar.classList.remove('show');
  // demo 模式下 camera 固定在原点看 -Z，内容放前方（mm单位）
  camera.position.set(0, 42, 190);  // 站在 marker 前方 190mm 看
  camera.lookAt(0, 30, 0);
  stableRoot.position.set(0, 0, 0);
  stableRoot.visible = true;
  stableHasPose = true;
  inviteGroup.position.set(0, 0, 0);
  game.start(); animate();
  startSequence();
  showToast('演示模式：邀请函动画', 2000);
}

document.getElementById('camera').onclick = startCamera;
document.getElementById('cam2').onclick = startCamera;
document.getElementById('demo').onclick = startDemo;
document.getElementById('demo2').onclick = startDemo;
// 兜底条：点"看演示动画"直接进 demo；点"继续等"收起条再等 8 秒
document.getElementById('fb-yes').onclick = ()=>{ fallbackBar.classList.remove('show'); startDemo(); };
document.getElementById('fb-no').onclick = ()=>{ fallbackBar.classList.remove('show'); cameraStartAt = performance.now(); fallbackShown = false; };
// 页面加载时往 permission 卡注入摄像头选择器（应对多摄像头，默认后置对准邀请函图）
(async ()=>{ try{ const c=document.querySelector('#permission .perm-card'); if(c) c.__camSelector=await injectCameraSelector(c,'environment'); }catch(e){} })();
