import * as THREE from 'three';

// Use Clock (r170+ Timer lacks elapsedTime, breaking movement & shaders)
const ClockClass = THREE.Clock;
import { createTerrain, SPHERE_RADIUS } from './world/terrain.js';
import { createWater } from './world/water.js';
import { createSky, createFireflies } from './world/sky.js';
import { createDecorations } from './world/decorations.js';
import { createTower } from './building/tower.js';
import { createAllNPCs } from './npc/npc-factory.js';
import { NPCDialog } from './npc/npc-dialog.js';
import { ArticleViewer } from './article-viewer.js';
import { PlayerControls } from './player/controls.js';
import { InteractionManager } from './player/camera.js';
import posts from './data/posts.json';

// --- Setup ---
const canvas = document.getElementById('canvas');
const loadBar = document.getElementById('load-bar');
const loadingScreen = document.getElementById('loading');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x07101b, 0.0052);

const camera = new THREE.PerspectiveCamera(
  70, window.innerWidth / window.innerHeight, 0.1, 500
);

// --- Loading progress simulation ---
let loadProgress = 0;
function updateLoadProgress(target) {
  loadProgress = target;
  loadBar.style.width = `${loadProgress}%`;
}

// --- Build scene ---
updateLoadProgress(10);

// Lighting
const hemiLight = new THREE.HemisphereLight(0x6d89a8, 0x112030, 0.52);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xfff2d7, 0.9);
sunLight.position.set(26, 42, 14);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 1024;
sunLight.shadow.mapSize.height = 1024;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 120;
sunLight.shadow.camera.left = -40;
sunLight.shadow.camera.right = 40;
sunLight.shadow.camera.top = 40;
sunLight.shadow.camera.bottom = -40;
scene.add(sunLight);

// Moon light (subtle blue fill)
const moonLight = new THREE.DirectionalLight(0x4c84b8, 0.38);
moonLight.position.set(-18, 24, -20);
scene.add(moonLight);

const ambientFill = new THREE.AmbientLight(0x122338, 0.45);
scene.add(ambientFill);

updateLoadProgress(20);

// Terrain (sphere)
const { mesh: terrain, noise2D } = createTerrain();
scene.add(terrain);
updateLoadProgress(35);

// Water (sphere shell below terrain)
const { mesh: water, material: waterMat } = createWater();
scene.add(water);
updateLoadProgress(45);

// Sky
const { mesh: sky, material: skyMat } = createSky();
scene.add(sky);

// Fireflies
const { points: fireflies, phases: fireflyPhases } = createFireflies();
scene.add(fireflies);
updateLoadProgress(55);

// Signature screen tower (placed at north pole)
const { group: tower, screenData: towerScreens } = createTower(noise2D, posts);
scene.add(tower);
updateLoadProgress(75);

// Decorations (trees, rocks, lamps, paths on sphere)
const decorations = createDecorations(noise2D);
scene.add(decorations);
updateLoadProgress(85);

// NPCs (2D sprites on sphere)
const npcs = createAllNPCs(noise2D, posts);
scene.add(npcs);
updateLoadProgress(95);

// --- Player controls ---
const controls = new PlayerControls(camera, noise2D, canvas);

// --- Article Viewer (in-world reading window) ---
ArticleViewer.injectStyles();
const articleViewer = new ArticleViewer();

// --- Dialog system ---
const dialog = new NPCDialog(articleViewer);

// --- Interaction system ---
const allInteractables = [
  ...towerScreens,
  ...npcs.userData.interactables
];
const interaction = new InteractionManager(camera, canvas, allInteractables, dialog);
let worldEntered = Boolean(window.__WORLD_STATE?.entered);
let worldPaused = false;

window.addEventListener('world:enter', () => {
  worldEntered = true;
});

// Pause world when article viewer is open
window.addEventListener('article-viewer:open', () => {
  worldPaused = true;
});

window.addEventListener('article-viewer:close', () => {
  worldPaused = false;
});

// --- Finish loading ---
updateLoadProgress(100);
// Loading screen is now controlled by the "Enter" button in index.html

// --- Resize handler ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Adaptive DPR ---
let frameCount = 0;
let lastFpsCheck = performance.now();
let currentDPR = Math.min(window.devicePixelRatio, 2);

function adaptDPR() {
  frameCount++;
  const now = performance.now();
  if (now - lastFpsCheck > 2000) {
    const fps = (frameCount * 1000) / (now - lastFpsCheck);
    frameCount = 0;
    lastFpsCheck = now;

    if (fps < 30 && currentDPR > 0.75) {
      currentDPR = Math.max(0.75, currentDPR - 0.25);
      renderer.setPixelRatio(currentDPR);
    } else if (fps > 55 && currentDPR < Math.min(window.devicePixelRatio, 2)) {
      currentDPR = Math.min(Math.min(window.devicePixelRatio, 2), currentDPR + 0.25);
      renderer.setPixelRatio(currentDPR);
    }
  }
}

// --- NPC idle animation ---
let npcAnimTime = 0;

function animateNPCs(delta) {
  npcAnimTime += delta;
  npcs.userData.interactables.forEach((npc, i) => {
    // Gentle floating animation (along the NPC's local Y = sphere normal)
    const sprite = npc.getObjectByName('npc-sprite');
    if (sprite) {
      sprite.position.y = 1.5 + Math.sin(npcAnimTime * 1.5 + i * 0.7) * 0.1;
      // Subtle scale breathing
      const breathe = 1.0 + Math.sin(npcAnimTime * 2 + i * 1.1) * 0.03;
      sprite.scale.set(3 * breathe, 3 * breathe, 1);
    }

    const label = npc.getObjectByName('npc-label');
    if (label) {
      label.material.opacity = 0.68 + Math.sin(npcAnimTime * 1.25 + i * 0.5) * 0.14;
    }
  });
}

// --- Firefly animation ---
function animateFireflies(time) {
  const positions = fireflies.geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);

    // Orbit slowly around the sphere
    const angle = time * 0.05 + fireflyPhases[i];
    const cos = Math.cos(0.001);
    const sin = Math.sin(0.001);
    const nx = x * cos - z * sin;
    const nz = x * sin + z * cos;

    // Bob up and down
    const bobY = y + Math.sin(time * 0.5 + fireflyPhases[i]) * 0.01;

    positions.setXYZ(i, nx, bobY, nz);
  }
  positions.needsUpdate = true;

  // Pulse opacity
  fireflies.material.opacity = 0.5 + Math.sin(time * 2) * 0.3;
}

function animateTower(time) {
  tower.rotation.y = Math.sin(time * 0.18) * 0.03;

  tower.userData.screenFrames?.forEach((frame, index) => {
    frame.material.emissiveIntensity = 0.58 + Math.sin(time * 1.6 + index * 0.12) * 0.16;
  });

  tower.userData.lightRings?.forEach((ring, index) => {
    ring.material.emissiveIntensity = 1.15 + Math.sin(time * 1.2 + index * 0.6) * 0.22;
  });
}

function updateIntroCamera(elapsed) {
  const orbitRadius = 36;
  const orbitHeight = 18 + Math.sin(elapsed * 0.35) * 2.4;
  const orbitAngle = elapsed * 0.14;
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

  // Update water animation
  waterMat.uniforms.uTime.value = elapsed;

  // Update sky animation
  skyMat.uniforms.uTime.value = elapsed;

  // Update player movement (only if dialog and article viewer are not open)
  if (worldEntered && !dialog.isOpen && !worldPaused) {
    controls.update(delta);
    interaction.update();
  } else if (!worldEntered) {
    updateIntroCamera(elapsed);
    interaction.crosshair.classList.remove('active');
  }

  // NPC idle animation
  animateNPCs(delta);

  // Firefly animation
  animateFireflies(elapsed);
  animateTower(elapsed);

  // Adaptive performance
  adaptDPR();

  // Render
  renderer.render(scene, camera);
}

animate();
