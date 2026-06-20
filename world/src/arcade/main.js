import * as THREE from 'three';
import { createArcadeVisitors } from './arcade-visitors.js';

const canvas = document.getElementById('arcade-canvas');
const crosshair = document.getElementById('crosshair');
const panel = document.getElementById('machine-panel');
const titleEl = document.getElementById('machine-title');
const descEl = document.getElementById('machine-desc');
const linkEl = document.getElementById('machine-link');
const closeBtn = document.getElementById('panel-close');
const hud = document.getElementById('hud');
const arWindow = document.getElementById('ar-window');
const arFrame = document.getElementById('ar-frame');
const arTitle = document.getElementById('ar-title');
const arClose = document.getElementById('ar-close');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x172431);
scene.fog = new THREE.Fog(0x172431, 18, 42);

const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 120);
camera.position.set(0, 2.1, 5.4);

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
raycaster.far = 15;

const keys = { w: false, a: false, s: false, d: false, shift: false, space: false };
const velocity = new THREE.Vector3();
let yaw = Math.PI;
let pitch = -0.04;
let jumpVelocity = 0;
let jumpHeight = 0;
let selectedMachine = null;
let activePanelMachine = null;
let isLocked = false;
let exitDoor = null;
let isAROpen = false;

const machines = [
  {
    title: 'AR 试戴间',
    desc: '戴上虚拟眼镜、帽子、耳环，转头实时试戴，自动测瞳距推荐尺寸——网购配饰不再盲买退货。',
    arPath: 'tryon.html',
    color: 0xb99df2,
    accent: 0xffdf8c,
    position: [0, 0, -3.4],
    rotation: 0
  },
  {
    title: 'AR 手语桥',
    desc: '做手势识别成常用词，拼成句子还能语音朗读。面向听障沟通的公益无障碍作品。',
    arPath: 'signbridge.html',
    color: 0x7bd5ff,
    accent: 0xffdf8c,
    position: [-4.5, 0, -6.0],
    rotation: 0.4
  },
  {
    title: 'AR 护脊官',
    desc: '办公模式监测头前倾、驼背、耸肩提醒坐直；健身模式纠正深蹲、俯卧撑动作防受伤。',
    arPath: 'posture.html',
    color: 0xf2c978,
    accent: 0xe8920c,
    position: [4.5, 0, -6.0],
    rotation: -0.4
  }
];

buildRoom();
const machineMeshes = machines.map(createMachine);
// 游戏厅访客 NPC：会自由进出、玩街机、冒心声（初心要求）
const machinePositions = machines.map(m => ({x:m.position[0], z:m.position[2]}));
const arcadeVisitors = createArcadeVisitors(scene, machinePositions);
const obstacleRects = [
  ...machines.map((machine) => ({
    x: machine.position[0],
    z: machine.position[2],
    halfX: 1.15,
    halfZ: 0.95
  })),
  { x: 0, z: 8.2, halfX: 2.85, halfZ: 0.82 }
];
createDecor();
bindInput();
resize();
setTimeout(() => showPanel(machines[0]), 650);
animate();

function buildRoom() {
  scene.add(new THREE.HemisphereLight(0xc8e9ff, 0xb8895d, 0.62));

  const sun = new THREE.DirectionalLight(0xffe7c5, 1.35);
  sun.position.set(3, 8, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -14;
  sun.shadow.camera.right = 14;
  sun.shadow.camera.top = 14;
  sun.shadow.camera.bottom = -14;
  scene.add(sun);

  const floorMat = new THREE.MeshStandardMaterial({ color: 0xc08a55, roughness: 0.82 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xe4d3ad, roughness: 0.9 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x8b5d38, roughness: 0.82 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(22, 24), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(22, 7.5, 0.35), wallMat);
  backWall.position.set(0, 3.75, -10);
  backWall.receiveShadow = true;
  scene.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.35, 7.5, 24), wallMat);
  leftWall.position.set(-11, 3.75, 0);
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  const rightWall = leftWall.clone();
  rightWall.position.x = 11;
  scene.add(rightWall);

  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(22, 0.28, 24), new THREE.MeshStandardMaterial({ color: 0x6d4b34, roughness: 0.86 }));
  ceiling.position.set(0, 7.55, 0);
  scene.add(ceiling);

  for (let z = -8; z <= 8; z += 4) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(22, 0.35, 0.32), trimMat);
    beam.position.set(0, 7.18, z);
    beam.castShadow = true;
    scene.add(beam);
  }

  for (let x = -8; x <= 8; x += 4) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 24), new THREE.MeshStandardMaterial({ color: 0xa77447, roughness: 0.9 }));
    plank.position.set(x, 0.012, 0);
    scene.add(plank);
  }

  const rug = new THREE.Mesh(new THREE.CircleGeometry(3.1, 48), new THREE.MeshStandardMaterial({ color: 0x6fa0a5, roughness: 0.78 }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.03, 1.35);
  scene.add(rug);
}

function createMachine(data, index) {
  const group = new THREE.Group();
  group.position.set(...data.position);
  group.rotation.y = data.rotation;
  group.userData.machine = data;

  const bodyMat = new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.68 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x253445, roughness: 0.72 });
  const screenMat = new THREE.MeshStandardMaterial({
    color: data.accent,
    emissive: data.accent,
    emissiveIntensity: 0.75,
    roughness: 0.35
  });

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.55, 2.35, 1.05), bodyMat);
  base.position.y = 1.18;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 1.15), bodyMat);
  top.position.y = 2.62;
  top.castShadow = true;
  group.add(top);

  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.16, 0.78), screenMat);
  screen.position.set(0, 1.65, 0.536);
  screen.userData.machine = data;
  group.add(screen);

  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.16, 0.18), darkMat);
  panel.position.set(0, 0.88, 0.56);
  panel.castShadow = true;
  group.add(panel);

  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.36, 10), new THREE.MeshStandardMaterial({ color: 0x423126, roughness: 0.65 }));
  stick.position.set(-0.32, 1.12, 0.62);
  stick.rotation.x = 0.28;
  group.add(stick);

  const buttonMat = new THREE.MeshStandardMaterial({ color: data.accent, emissive: data.accent, emissiveIntensity: 0.25 });
  for (let i = 0; i < 3; i++) {
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), buttonMat);
    btn.position.set(0.08 + i * 0.2, 0.98, 0.66);
    group.add(btn);
  }

  const label = createLabelTexture(String(index + 1).padStart(2, '0'), data.title);
  const labelMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.45, 0.38),
    new THREE.MeshStandardMaterial({ map: label, transparent: true, roughness: 0.5 })
  );
  labelMesh.position.set(0, 2.64, 0.59);
  group.add(labelMesh);

  const light = new THREE.PointLight(data.accent, 0.9, 5.2, 2);
  light.position.set(0, 2.0, 0.8);
  group.add(light);

  scene.add(group);
  return group;
}

function createLabelTexture(id, title) {
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 512;
  labelCanvas.height = 128;
  const ctx = labelCanvas.getContext('2d');
  ctx.fillStyle = '#fff7e7';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = 'rgba(118, 79, 38, 0.42)';
  ctx.lineWidth = 5;
  ctx.strokeRect(8, 8, 496, 112);
  ctx.fillStyle = '#7a4a24';
  ctx.font = 'bold 30px "Microsoft YaHei", sans-serif';
  ctx.fillText(id, 30, 52);
  ctx.font = 'bold 34px "Microsoft YaHei", sans-serif';
  ctx.fillText(title, 90, 72);
  ctx.font = '18px "Microsoft YaHei", sans-serif';
  ctx.fillStyle = 'rgba(122, 74, 36, 0.72)';
  ctx.fillText('AR CABINET', 92, 100);
  const texture = new THREE.CanvasTexture(labelCanvas);
  texture.needsUpdate = true;
  return texture;
}

function createDecor() {
  const counterMat = new THREE.MeshStandardMaterial({ color: 0x9d6840, roughness: 0.82 });
  const counter = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.05, 1.15), counterMat);
  counter.position.set(0, 0.55, 8.2);
  counter.castShadow = true;
  counter.receiveShadow = true;
  scene.add(counter);

  const doorGroup = new THREE.Group();
  doorGroup.position.set(0, 0, 11.72);
  doorGroup.rotation.y = Math.PI;
  doorGroup.userData.machine = {
    title: '回到游戏厅门口',
    desc: '推开这扇门，会回到主世界里游戏厅建筑的门口。',
    href: './index.html?spawn=arcade',
    isExit: true
  };

  const doorMat = new THREE.MeshStandardMaterial({
    color: 0x8a5a36,
    roughness: 0.78,
    metalness: 0.02
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xffedba,
    emissive: 0xffd27a,
    emissiveIntensity: 0.52,
    roughness: 0.46
  });
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.9, 3.4, 0.22), doorMat);
  door.position.y = 1.72;
  door.castShadow = true;
  doorGroup.add(door);

  const doorLight = new THREE.Mesh(new THREE.PlaneGeometry(2.15, 2.55), glowMat);
  doorLight.position.set(0, 1.76, -0.13);
  doorLight.userData.machine = doorGroup.userData.machine;
  doorGroup.add(doorLight);

  const exitLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 0.42),
    new THREE.MeshStandardMaterial({
      map: createLabelTexture('EXIT', '返回门口'),
      transparent: true,
      roughness: 0.5
    })
  );
  exitLabel.position.set(0, 3.65, -0.16);
  exitLabel.userData.machine = doorGroup.userData.machine;
  doorGroup.add(exitLabel);

  const portalLight = new THREE.PointLight(0xffd28a, 1.15, 7, 2);
  portalLight.position.set(0, 2.0, -0.45);
  doorGroup.add(portalLight);

  scene.add(doorGroup);
  exitDoor = doorGroup;

  const screenMat = new THREE.MeshStandardMaterial({
    color: 0xfff0c2,
    emissive: 0xffd98c,
    emissiveIntensity: 0.55,
    roughness: 0.42
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 1.2), screenMat);
  sign.position.set(0, 5.2, -9.78);
  scene.add(sign);

  const signTexture = createLabelTexture('AR', '童话游戏厅');
  sign.material.map = signTexture;
  sign.material.emissiveMap = signTexture;

  const pathMat = new THREE.MeshStandardMaterial({
    color: 0xffdf8c,
    emissive: 0xffc76f,
    emissiveIntensity: 0.28,
    roughness: 0.7,
    transparent: true,
    opacity: 0.64
  });
  for (let z = 7.2; z >= -1.2; z -= 1.7) {
    const marker = new THREE.Mesh(new THREE.CircleGeometry(0.22, 24), pathMat);
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(0, 0.055, z);
    scene.add(marker);
  }

  const lanternMat = new THREE.MeshStandardMaterial({ color: 0xffe7aa, emissive: 0xffc66d, emissiveIntensity: 0.5 });
  for (const x of [-7.5, -3.5, 3.5, 7.5]) {
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 18), lanternMat);
    lantern.position.set(x, 6.15, -8.8);
    scene.add(lantern);
    const light = new THREE.PointLight(0xffcf88, 0.75, 5.5, 2);
    light.position.copy(lantern.position);
    scene.add(light);
  }
}

function bindInput() {
  document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (key === 'shift') keys.shift = true;
    if (event.code === 'Space') {
      event.preventDefault();
      keys.space = true;
    }
    if (key in keys) keys[key] = true;
    if (event.key === 'Escape' && panel.classList.contains('visible')) hidePanel();
  });

  document.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();
    if (key === 'shift') keys.shift = false;
    if (event.code === 'Space') keys.space = false;
    if (key in keys) keys[key] = false;
  });

  document.addEventListener('pointerlockchange', () => {
    isLocked = document.pointerLockElement === canvas;
  });

  canvas.addEventListener('click', () => {
    if (selectedMachine) {
      showPanel(selectedMachine);
      return;
    }
    if (!isLocked && !panel.classList.contains('visible')) {
      canvas.requestPointerLock?.();
    }
  });

  document.addEventListener('mousemove', (event) => {
    if (!isLocked) return;
    yaw -= event.movementX * 0.0022;
    pitch -= event.movementY * 0.002;
    pitch = Math.max(-0.7, Math.min(0.5, pitch));
  });

  closeBtn.addEventListener('click', hidePanel);
  linkEl.addEventListener('click', (event) => {
    if (linkEl.dataset.exit === 'true') return;
    event.preventDefault();
    if (activePanelMachine) {
      openARWindow(activePanelMachine);
    }
  });
  arClose.addEventListener('click', closeARWindow);
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'ar:close') closeARWindow();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isAROpen) {
      closeARWindow();
    }
  });

  if ('ontouchstart' in window) {
    initTouch();
    hud.textContent = '左侧摇杆移动 · 右侧滑动转向 · 点击街机进入 AR · 身后金色门返回';
  }
}

function initTouch() {
  const zone = document.getElementById('joystick-zone');
  const base = document.getElementById('joystick-base');
  const thumb = document.getElementById('joystick-thumb');
  zone.style.display = 'block';

  let active = false;
  let center = { x: 0, y: 0 };
  let lastTouch = null;

  zone.addEventListener('touchstart', (event) => {
    event.preventDefault();
    active = true;
    const rect = base.getBoundingClientRect();
    center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, { passive: false });

  zone.addEventListener('touchmove', (event) => {
    event.preventDefault();
    if (!active) return;
    const touch = event.touches[0];
    const dx = THREE.MathUtils.clamp(touch.clientX - center.x, -42, 42);
    const dy = THREE.MathUtils.clamp(touch.clientY - center.y, -42, 42);
    keys.w = dy < -12;
    keys.s = dy > 12;
    keys.a = dx < -12;
    keys.d = dx > 12;
    thumb.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }, { passive: false });

  zone.addEventListener('touchend', () => {
    active = false;
    keys.w = keys.a = keys.s = keys.d = false;
    thumb.style.transform = 'translate(-50%, -50%)';
  });

  canvas.addEventListener('touchstart', (event) => {
    if (event.target.closest('#joystick-zone') || event.target.closest('#machine-panel')) return;
    lastTouch = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }, { passive: true });

  canvas.addEventListener('touchmove', (event) => {
    if (!lastTouch || event.target.closest('#joystick-zone') || event.target.closest('#machine-panel')) return;
    const touch = event.touches[0];
    yaw -= (touch.clientX - lastTouch.x) * 0.004;
    pitch -= (touch.clientY - lastTouch.y) * 0.003;
    pitch = Math.max(-0.7, Math.min(0.5, pitch));
    lastTouch = { x: touch.clientX, y: touch.clientY };
  }, { passive: true });

  canvas.addEventListener('touchend', () => {
    if (selectedMachine) showPanel(selectedMachine);
    lastTouch = null;
  }, { passive: true });
}

function showPanel(machine) {
  activePanelMachine = machine;
  titleEl.textContent = machine.title;
  descEl.textContent = machine.desc;
  linkEl.href = machine.isExit ? machine.href : '#';
  linkEl.textContent = machine.isExit ? '回到门口' : '打开 AR 窗口';
  linkEl.dataset.exit = machine.isExit ? 'true' : 'false';
  panel.classList.add('visible');
  if (document.pointerLockElement) document.exitPointerLock();
}

function hidePanel() {
  panel.classList.remove('visible');
}

function openARWindow(machine) {
  hidePanel();
  isAROpen = true;
  arTitle.textContent = machine.title;
  arFrame.src = getARUrl(machine.arPath);
  arWindow.classList.add('visible');
  if (document.pointerLockElement) document.exitPointerLock();
}

function closeARWindow() {
  arWindow.classList.remove('visible');
  arFrame.src = 'about:blank';
  isAROpen = false;
}

function getARUrl(fileName) {
  if (['127.0.0.1', 'localhost'].includes(window.location.hostname)) {
    return `./ar/${fileName}`;
  }
  return `/ar/${fileName}`;
}

function updateMovement(delta) {
  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const right = new THREE.Vector3(-forward.z, 0, forward.x);
  const move = new THREE.Vector3();
  if (keys.w) move.add(forward);
  if (keys.s) move.sub(forward);
  if (keys.d) move.add(right);
  if (keys.a) move.sub(right);

  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar((keys.shift ? 7.5 : 4.4) * delta);
    camera.position.copy(resolveIndoorPosition(camera.position.clone().add(move)));
  }

  camera.position.x = THREE.MathUtils.clamp(camera.position.x, -9.2, 9.2);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, -8.2, 10.85);

  const grounded = jumpHeight <= 0.001 && jumpVelocity <= 0;
  if (keys.space && grounded) jumpVelocity = 6.6;
  jumpVelocity -= 17 * delta;
  jumpHeight += jumpVelocity * delta;
  if (jumpHeight <= 0) {
    jumpHeight = 0;
    jumpVelocity = 0;
  }
  camera.position.y = 2.1 + jumpHeight;

  const lookDir = new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    Math.cos(yaw) * Math.cos(pitch)
  );
  camera.lookAt(camera.position.clone().add(lookDir));
}

function updateSelection(time) {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = raycaster.intersectObjects([...machineMeshes, exitDoor].filter(Boolean), true);
  const machine = hits.find((hit) => hit.object.userData.machine || hit.object.parent?.userData.machine);
  selectedMachine = machine
    ? machine.object.userData.machine || machine.object.parent.userData.machine
    : null;

  crosshair.classList.toggle('active', Boolean(selectedMachine));
  machineMeshes.forEach((group, index) => {
    const active = selectedMachine === group.userData.machine;
    group.position.y = Math.sin(time * 1.8 + index) * 0.035;
    group.scale.setScalar(active ? 1.06 : 1);
  });
  if (exitDoor) {
    exitDoor.scale.setScalar(selectedMachine?.isExit ? 1.04 : 1);
  }
}

function resolveIndoorPosition(position) {
  const resolved = position.clone();
  const playerRadius = 0.42;
  obstacleRects.forEach((rect) => {
    const dx = resolved.x - rect.x;
    const dz = resolved.z - rect.z;
    const overlapX = rect.halfX + playerRadius - Math.abs(dx);
    const overlapZ = rect.halfZ + playerRadius - Math.abs(dz);
    if (overlapX <= 0 || overlapZ <= 0) return;

    if (overlapX < overlapZ) {
      resolved.x += Math.sign(dx || 1) * overlapX;
    } else {
      resolved.z += Math.sign(dz || 1) * overlapZ;
    }
  });
  resolved.x = THREE.MathUtils.clamp(resolved.x, -9.2, 9.2);
  resolved.z = THREE.MathUtils.clamp(resolved.z, -8.2, 10.85);
  return resolved;
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.08);
  const time = clock.elapsedTime;
  if (!isAROpen) {
    updateMovement(delta);
    updateSelection(time);
    arcadeVisitors.update(delta, time);
  }
  renderer.render(scene, camera);
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', resize);
