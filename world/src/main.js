import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

const ClockClass = THREE.Clock;
import { createTerrain, SPHERE_RADIUS, getSpherePosition } from './world/terrain.js';
import { createWater } from './world/water.js';
import { createSky, createFireflies, SUN_DIRECTION } from './world/sky.js';
import { createDecorations } from './world/decorations.js';
import { createGrass } from './world/grass.js';
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

// --- Post-processing --- //
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// SSAO — ambient occlusion for depth and contact shadows
const ssaoPass = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
ssaoPass.kernelRadius = 16;
ssaoPass.minDistance = 0.005;
ssaoPass.maxDistance = 0.1;
ssaoPass.output = SSAOPass.OUTPUT.Default;
composer.addPass(ssaoPass);

// Bloom for glow effects — gentle in daylight, only for sun/screens
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.32,  // strength — soft, not neon
  0.55,  // radius
  0.92   // threshold — only bright highlights bloom
);
composer.addPass(bloomPass);

// Color grading + Vignette (combined for performance)
const colorGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    brightness: { value: 0.02 },
    contrast: { value: 1.08 },
    saturation: { value: 1.12 },
    vignetteIntensity: { value: 0.28 },
    vignetteRoundness: { value: 0.8 }
  },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float brightness, contrast, saturation;
    uniform float vignetteIntensity, vignetteRoundness;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      // Brightness & contrast
      color.rgb += brightness;
      color.rgb = (color.rgb - 0.5) * contrast + 0.5;
      // Saturation
      float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      color.rgb = mix(vec3(gray), color.rgb, saturation);
      // Vignette
      vec2 uv = vUv * 2.0 - 1.0;
      float vig = 1.0 - dot(uv * vignetteRoundness, uv * vignetteRoundness);
      vig = clamp(pow(vig, 1.5), 0.0, 1.0);
      color.rgb *= mix(1.0 - vignetteIntensity, 1.0, vig);
      gl_FragColor = color;
    }
  `
};
const colorGradePass = new ShaderPass(colorGradeShader);
composer.addPass(colorGradePass);

// FXAA anti-aliasing (final pass — clean edges)
const fxaaPass = new ShaderPass(FXAAShader);
fxaaPass.material.uniforms['resolution'].value.set(
  1 / window.innerWidth,
  1 / window.innerHeight
);
composer.addPass(fxaaPass);

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
sunLight.shadow.mapSize.width = 4096;
sunLight.shadow.mapSize.height = 4096;
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

// PMREM generator for procedural environment maps (PBR reflections)
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

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

// Generate environment map from the sky shader for PBR reflections
if (skyMat.map) {
  const envRT = pmremGenerator.fromEquirectangular(skyMat.map);
  scene.environment = envRT.texture;
} else {
  // Fallback: create a gradient env map from scene fog color
  const envCanvas = document.createElement('canvas');
  envCanvas.width = 512; envCanvas.height = 256;
  const ctx = envCanvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#7eb8d4');
  grad.addColorStop(0.5, '#c8dde4');
  grad.addColorStop(1, '#c8b48a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);
  const envTex = new THREE.CanvasTexture(envCanvas);
  envTex.mapping = THREE.EquirectangularReflectionMapping;
  const envRT = pmremGenerator.fromEquirectangular(envTex);
  scene.environment = envRT.texture;
  envTex.dispose();
}
pmremGenerator.dispose();

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

// Grass — instanced blades + glow paths + dandelion spores
const grassField = createGrass(noise2D);
scene.add(grassField);
updateLoadProgress(88);

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
  // SSAO resize
  const w = window.innerWidth, h = window.innerHeight;
  ssaoPass.setSize(w, h);
  // FXAA resize
  fxaaPass.material.uniforms['resolution'].value.set(1 / w, 1 / h);
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

// Animate glow path dots and dandelion spores
function animateGrass(time) {
  grassField.traverse(child => {
    if (child.name === 'glow-paths') {
      child.children.forEach(dot => {
        const phase = dot.userData.phase || 0;
        const pulse = Math.sin(time * 1.5 + phase) * 0.3 + 0.7;
        if (dot.material) {
          dot.material.emissiveIntensity = 0.6 + pulse * 0.8;
        }
        if (dot.userData.baseY !== undefined) {
          dot.position.y = dot.userData.baseY + Math.sin(time * 0.8 + phase) * 0.06;
        }
      });
    }
    if (child.name === 'dandelion-spores' && child.isPoints) {
      const positions = child.geometry.attributes.position;
      const phases = child.userData.phases || [];
      for (let i = 0; i < positions.count; i++) {
        const py = positions.getY(i);
        const px = positions.getX(i);
        positions.setY(i, py + Math.sin(time * 0.3 + phases[i]) * 0.004);
        positions.setX(i, px + Math.cos(time * 0.2 + phases[i]) * 0.003);
      }
      positions.needsUpdate = true;
      child.material.opacity = 0.35 + Math.sin(time * 0.5) * 0.15;
    }
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
  animateGrass(elapsed);
  adaptDPR();

  // Render with post-processing
  composer.render();
}

animate();
