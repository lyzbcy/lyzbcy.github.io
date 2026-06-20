import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const ClockClass = THREE.Clock;
import { createTerrain, SPHERE_RADIUS, getSpherePosition } from './world/terrain.js';
import { createWater } from './world/water.js';
import { createSky, createFireflies, SUN_DIRECTION } from './world/sky.js';
import { createDecorations } from './world/decorations.js';
import { createTower } from './building/tower.js';
import { createArcadeBuilding } from './building/arcade.js';
import { createLandmarks } from './building/landmarks.js';
import { createAllNPCs } from './npc/npc-factory.js';
import { updateNPC3DIdle } from './npc/npc-3d-builder.js';
import { createNPCScenery } from './npc/npc-scenery.js';
import { NPCLife } from './npc/npc-life.js';
import { NPCDialog } from './npc/npc-dialog.js';
import { ArticleViewer } from './article-viewer.js';
import { PlayerControls } from './player/controls.js';
import { InteractionManager } from './player/camera.js';
import { CollectibleSystem } from './world/collectibles.js';
import { Minimap } from './ui/minimap.js';
import posts from './data/posts.json';

// --- Setup ---
const canvas = document.getElementById('canvas');
const loadBar = document.getElementById('load-bar');

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
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
// Soft warm daylight haze that fades into the bright sky horizon
scene.fog = new THREE.FogExp2(0xc8dde4, 0.0042);

const camera = new THREE.PerspectiveCamera(
  70, window.innerWidth / window.innerHeight, 0.1, 500
);

// --- Post-processing ---
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Bloom for glow effects — gentle in daylight, only for sun/screens
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.32,  // strength — soft, not neon
  0.55,  // radius
  0.92   // threshold — only bright highlights bloom
);
composer.addPass(bloomPass);

// Vignette shader — very subtle in daylight
const vignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    offset: { value: 1.0 },
    darkness: { value: 0.45 }
  },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float offset;
    uniform float darkness;
    varying vec2 vUv;
    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec2 uv = (vUv - vec2(0.5)) * vec2(offset);
      float vig = clamp(1.0 - dot(uv, uv), 0.0, 1.0);
      texel.rgb *= mix(1.0, vig, darkness);
      gl_FragColor = texel;
    }
  `
};
const vignettePass = new ShaderPass(vignetteShader);
composer.addPass(vignettePass);

// --- Loading progress ---
let loadProgress = 0;
function updateLoadProgress(target) {
  loadProgress = target;
  loadBar.style.width = `${loadProgress}%`;
}

// --- Build scene ---
updateLoadProgress(10);

// Warm daylight hemisphere: soft cyan sky top, warm sandy ground bounce
const hemiLight = new THREE.HemisphereLight(0xbfe0e8, 0xc8b48a, 0.85);
scene.add(hemiLight);

// Main sunlight — warm white, aligned with the sky shader's sun direction
const sunLight = new THREE.DirectionalLight(0xfff2d8, 1.5);
sunLight.position.copy(SUN_DIRECTION).multiplyScalar(50);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 140;
sunLight.shadow.camera.left = -45;
sunLight.shadow.camera.right = 45;
sunLight.shadow.camera.top = 45;
sunLight.shadow.camera.bottom = -45;
sunLight.shadow.bias = -0.0004;
sunLight.shadow.normalBias = 0.02;
scene.add(sunLight);

// Cool sky fill from the opposite side (bounce light from the blue sky)
const skyFill = new THREE.DirectionalLight(0x9ec4d8, 0.35);
skyFill.position.copy(SUN_DIRECTION).multiplyScalar(-40);
scene.add(skyFill);

// Gentle warm ambient to lift shadows without flattening
const ambientFill = new THREE.AmbientLight(0xfff0e0, 0.25);
scene.add(ambientFill);

updateLoadProgress(20);

// Terrain
const { mesh: terrain, noise2D } = createTerrain();
scene.add(terrain);
updateLoadProgress(35);

// Water
const { mesh: water, material: waterMat } = createWater();
scene.add(water);
updateLoadProgress(40);

// Sky
const { mesh: sky, material: skyMat } = createSky();
scene.add(sky);

// Ambient particles (fireflies → cosmic dust)
const { points: fireflies, phases: fireflyPhases } = createFireflies();
scene.add(fireflies);
updateLoadProgress(50);

// Tower
const { group: tower, screenData: towerScreens } = createTower(noise2D, posts);
scene.add(tower);
updateLoadProgress(65);

// Arcade building
const { group: arcadeBuilding, interactable: arcadeDoor } = createArcadeBuilding(noise2D);
scene.add(arcadeBuilding);
updateLoadProgress(70);

// Landmarks
const landmarks = createLandmarks(noise2D);
scene.add(landmarks);
updateLoadProgress(75);

// Decorations
const decorations = createDecorations(noise2D);
scene.add(decorations);
updateLoadProgress(85);

// NPCs
const npcs = createAllNPCs(noise2D, posts);
scene.add(npcs);
updateLoadProgress(90);

// NPC homes / booths around the world
const npcScenery = createNPCScenery(npcs.userData.npcData, noise2D);
scene.add(npcScenery);

// --- Player controls ---
const controls = new PlayerControls(camera, noise2D, canvas);
const arcadeSpawn = getSpherePosition(Math.PI * 0.42, 19.0, noise2D);
if (new URLSearchParams(window.location.search).get('spawn') === 'arcade') {
  controls.position.copy(arcadeSpawn.position).addScaledVector(arcadeSpawn.normal, controls.playerHeight);
  controls.yaw = Math.PI * 0.9;
}
controls.setColliders([
  { centerDir: tower.position.clone().normalize(), radius: 3.9 },
  { centerDir: arcadeBuilding.position.clone().normalize(), radius: 4.9 },
  ...landmarks.children.map((landmark) => ({
    centerDir: landmark.position.clone().normalize(),
    radius: 2.7
  }))
]);
const debugJumpEl = ['127.0.0.1', 'localhost'].includes(window.location.hostname)
  ? document.body.appendChild(Object.assign(document.createElement('div'), {
      id: 'world-debug-jump',
      hidden: true
    }))
  : null;

// --- Article Viewer ---
ArticleViewer.injectStyles();
const articleViewer = new ArticleViewer();

// --- Dialog ---
const dialog = new NPCDialog(articleViewer);

// --- NPC life system (routines, mood bubbles, freeze-on-approach) ---
const npcLife = new NPCLife(npcs, camera, noise2D);

// --- Interaction ---
const allInteractables = [
  ...towerScreens,
  arcadeDoor,
  ...npcs.userData.interactables
];
const interaction = new InteractionManager(camera, canvas, allInteractables, dialog, {
  onInteract: (data) => beginArcadeTransition(data.destination)
});

// --- Collectibles ---
const collectibles = new CollectibleSystem(scene, noise2D, camera);

// --- Minimap ---
const minimap = new Minimap(npcs, landmarks);

let worldEntered = Boolean(window.__WORLD_STATE?.entered);
let worldPaused = false;
let arcadeTransitioning = false;

if (worldEntered) {
  collectibles.showUI();
  minimap.show();
}

function beginArcadeTransition(destination) {
  if (arcadeTransitioning || !destination) return;
  arcadeTransitioning = true;
  worldPaused = true;
  if (document.pointerLockElement) {
    document.exitPointerLock();
  }
  window.dispatchEvent(new CustomEvent('world:arcade-enter', {
    detail: { destination }
  }));
}

window.addEventListener('world:enter', () => {
  worldEntered = true;
  collectibles.showUI();
  minimap.show();
});

window.addEventListener('article-viewer:open', () => { worldPaused = true; });
window.addEventListener('article-viewer:close', () => {
  worldPaused = false;
  // Re-lock camera after the article book closes (wait out the closing animation)
  setTimeout(() => controls.requestLock(), 420);
});

// When the NPC dialog closes, snap the camera back into pointer-lock mode
// so the cursor doesn't linger and re-trigger a dialog by accident.
dialog.onClose = () => {
  setTimeout(() => controls.requestLock(), 80);
};

// --- Finish loading ---
updateLoadProgress(100);

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloomPass.resolution.set(window.innerWidth, window.innerHeight);
});

// --- Adaptive DPR ---
let frameCount = 0;
let lastFpsCheck = performance.now();
let currentDPR = Math.min(window.devicePixelRatio, 2);

function adaptDPR() {
  frameCount++;
  const now = performance.now();
  if (now - lastFpsCheck > 3000) {
    const fps = (frameCount * 1000) / (now - lastFpsCheck);
    frameCount = 0;
    lastFpsCheck = now;
    if (fps < 28 && currentDPR > 0.75) {
      currentDPR = Math.max(0.75, currentDPR - 0.25);
      renderer.setPixelRatio(currentDPR);
    } else if (fps > 50 && currentDPR < Math.min(window.devicePixelRatio, 2)) {
      currentDPR = Math.min(Math.min(window.devicePixelRatio, 2), currentDPR + 0.25);
      renderer.setPixelRatio(currentDPR);
    }
  }
}

// --- Animations ---
let npcAnimTime = 0;

function animateNPCs(delta) {
  // Sprite motion is now driven by the NPC life system; here we only keep the
  // name label gently pulsing for visibility.
  npcAnimTime += delta;
  npcs.userData.interactables.forEach((npc, i) => {
    const label = npc.getObjectByName('npc-label');
    if (label) {
      label.material.opacity = 0.78 + Math.sin(npcAnimTime * 1.0 + i * 0.5) * 0.15;
    }
  });
}

function animateFireflies(time) {
  const positions = fireflies.geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    const angle = time * 0.03 + fireflyPhases[i];
    const cos = Math.cos(0.0008);
    const sin = Math.sin(0.0008);
    const nx = x * cos - z * sin;
    const nz = x * sin + z * cos;
    const bobY = y + Math.sin(time * 0.4 + fireflyPhases[i]) * 0.008;
    positions.setXYZ(i, nx, bobY, nz);
  }
  positions.needsUpdate = true;
  fireflies.material.opacity = 0.45 + Math.sin(time * 1.5) * 0.25;
}

function animateTower(time) {
  // Weather vane slowly turns with the breeze
  const vaneArm = tower.getObjectByName('vane-arm');
  const vaneHead = tower.getObjectByName('vane-head');
  const vaneTail = tower.getObjectByName('vane-tail');
  if (vaneArm && vaneHead && vaneTail) {
    const spin = time * 0.25;
    vaneArm.rotation.y = spin;
    vaneHead.rotation.y = spin;
    vaneTail.rotation.y = spin;
  }
}

function animateLandmarks(time) {
  landmarks.children.forEach((lm, i) => {
    // Subtle floating animation for glow elements
    lm.traverse(child => {
      if (child.isMesh && child.geometry.type === 'TorusGeometry') {
        child.rotation.z = Math.sin(time * 0.8 + i) * 0.1;
        child.position.y = child.userData.baseY ??
          (child.userData.baseY = child.position.y);
        child.position.y = child.userData.baseY + Math.sin(time * 1.2 + i * 0.5) * 0.08;
      }
    });
  });
}

function updateIntroCamera(elapsed) {
  const orbitRadius = 38;
  const orbitHeight = 20 + Math.sin(elapsed * 0.3) * 2.5;
  const orbitAngle = elapsed * 0.1;
  camera.position.set(
    Math.cos(orbitAngle) * orbitRadius,
    orbitHeight,
    Math.sin(orbitAngle) * orbitRadius
  );
  camera.lookAt(0, 10, 0);
}

// --- Animation loop ---
const clock = new ClockClass();

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.1);
  const elapsed = clock.elapsedTime;

  waterMat.uniforms.uTime.value = elapsed;
  skyMat.uniforms.uTime.value = elapsed;

  if (worldEntered && !dialog.isOpen && !worldPaused) {
    controls.update(delta);
    if (debugJumpEl) {
      debugJumpEl.dataset.jumpHeight = controls.jumpHeight.toFixed(3);
      debugJumpEl.dataset.cameraY = camera.position.y.toFixed(3);
    }
    interaction.update();
    collectibles.update(delta, elapsed);
    minimap.update(camera, controls);
  } else if (!worldEntered) {
    updateIntroCamera(elapsed);
    interaction.crosshair.classList.remove('active');
  }

  // NPC daily life — runs whenever the world is active (even if dialog open,
  // so the talked-to NPC faces the player). Suppressed only during intro.
  npcLife.setDialogOpen(dialog.isOpen || worldPaused);
  if (worldEntered) {
    npcLife.update(delta, elapsed);
    // 更新 3D NPC 的 idle 动画（浮动+转头）
    const list = npcs.userData.interactables || [];
    for(let i=0;i<list.length;i++){
      const npc3d = list[i].getObjectByName('npc-3d');
      if(npc3d) updateNPC3DIdle(npc3d, elapsed, i);
    }
  }
  animateNPCs(delta);
  animateFireflies(elapsed);
  animateTower(elapsed);
  animateLandmarks(elapsed);
  adaptDPR();

  // Render with post-processing
  composer.render();
}

animate();
