import * as THREE from 'three';

// Polyfill: use Timer if available (r170+), fallback to Clock
const ClockClass = THREE.Timer || THREE.Clock;
import { createTerrain, SPHERE_RADIUS } from './world/terrain.js';
import { createWater } from './world/water.js';
import { createSky, createFireflies } from './world/sky.js';
import { createDecorations } from './world/decorations.js';
import { createTower } from './building/tower.js';
import { createScreens } from './building/screens.js';
import { createAllNPCs } from './npc/npc-factory.js';
import { NPCDialog } from './npc/npc-dialog.js';
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
renderer.toneMappingExposure = 1.2;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0a1a, 0.006);

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
const hemiLight = new THREE.HemisphereLight(0x4466aa, 0x332211, 0.6);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xffeedd, 1.0);
sunLight.position.set(30, 50, 20);
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
const moonLight = new THREE.DirectionalLight(0x4488cc, 0.3);
moonLight.position.set(-20, 30, -15);
scene.add(moonLight);

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

// Tower (placed at north pole)
const tower = createTower(noise2D);
scene.add(tower);
updateLoadProgress(65);

// Display screens on tower (children of tower group)
const screens = createScreens(posts, tower);
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

// --- Dialog system ---
const dialog = new NPCDialog();

// --- Interaction system ---
const allInteractables = [
  ...screens.userData.interactables,
  ...npcs.userData.interactables
];
const interaction = new InteractionManager(camera, canvas, allInteractables, dialog);

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

  // Update player movement (only if dialog is not open)
  if (!dialog.isOpen) {
    controls.update(delta);
    interaction.update();
  }

  // NPC idle animation
  animateNPCs(delta);

  // Firefly animation
  animateFireflies(elapsed);

  // Adaptive performance
  adaptDPR();

  // Render
  renderer.render(scene, camera);
}

animate();
