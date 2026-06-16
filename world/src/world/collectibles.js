import * as THREE from 'three';
import { placeOnSphere } from './terrain.js';

/**
 * Collectible orbs scattered around the world.
 * Collecting them reveals lore snippets and tracks discovery.
 */
export class CollectibleSystem {
  constructor(scene, noise2D, camera) {
    this.scene = scene;
    this.camera = camera;
    this.orbs = [];
    this.collected = 0;
    this.total = 0;
    this.onCollect = null; // callback

    this._createOrbs(noise2D);
    this._createUI();
  }

  _createOrbs(noise2D) {
    const orbCount = 20;
    const geometry = new THREE.SphereGeometry(0.15, 12, 12);

    const hues = [0.55, 0.6, 0.65, 0.7, 0.12, 0.08]; // blues, cyans, golds

    for (let i = 0; i < orbCount; i++) {
      const angle = (i / orbCount) * Math.PI * 2 + Math.random() * 0.5;
      const distFromPole = 8 + Math.random() * 28;
      const hue = hues[i % hues.length];

      const color = new THREE.Color().setHSL(hue, 0.7, 0.6);
      const material = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 2.5,
        transparent: true,
        opacity: 0.9,
        roughness: 0.1,
        metalness: 0.2
      });

      const orb = new THREE.Mesh(geometry, material);

      // Glow ring around orb
      const ringGeo = new THREE.TorusGeometry(0.25, 0.02, 6, 12);
      const ringMat = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 2.0,
        transparent: true,
        opacity: 0.6
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      orb.add(ring);

      placeOnSphere(orb, angle, distFromPole, noise2D, 1.5);

      orb.userData = {
        collected: false,
        baseY: orb.position.y,
        phase: Math.random() * Math.PI * 2,
        index: i
      };

      this.scene.add(orb);
      this.orbs.push(orb);
    }

    this.total = orbCount;
  }

  _createUI() {
    this.counterEl = document.createElement('div');
    this.counterEl.id = 'collectible-counter';
    this.counterEl.style.cssText = `
      position: fixed; top: 18px; right: 18px; z-index: 20;
      padding: 8px 14px; border-radius: 999px;
      background: rgba(6, 12, 20, 0.6); border: 1px solid rgba(132, 215, 255, 0.16);
      backdrop-filter: blur(10px); color: rgba(237, 244, 248, 0.8);
      font-size: 0.82rem; letter-spacing: 0.08em;
      display: none;
    `;
    this.counterEl.textContent = `✦ ${this.collected} / ${this.total}`;
    document.body.appendChild(this.counterEl);
  }

  showUI() {
    this.counterEl.style.display = 'block';
  }

  update(deltaTime, elapsed) {
    const playerPos = this.camera.position;

    this.orbs.forEach((orb) => {
      if (orb.userData.collected) return;

      // Float animation
      const float = Math.sin(elapsed * 2 + orb.userData.phase) * 0.15;
      // Move along local normal (upward on sphere)
      const normal = orb.position.clone().normalize();
      const basePos = orb.position.clone().sub(normal.clone().multiplyScalar(float));
      orb.position.copy(basePos).addScaledVector(normal, float);

      // Rotate ring
      if (orb.children[0]) {
        orb.children[0].rotation.x += deltaTime * 1.5;
        orb.children[0].rotation.y += deltaTime * 0.8;
      }

      // Pulse opacity
      orb.material.emissiveIntensity = 2.0 + Math.sin(elapsed * 3 + orb.userData.phase) * 0.8;

      // Check collection
      const dist = playerPos.distanceTo(orb.position);
      if (dist < 2.5) {
        this._collectOrb(orb);
      }
    });
  }

  _collectOrb(orb) {
    orb.userData.collected = true;
    this.collected++;

    // Collection animation: scale up and fade out
    const startScale = orb.scale.x;
    const startTime = performance.now();
    const animate = () => {
      const t = Math.min(1, (performance.now() - startTime) / 500);
      const ease = 1 - Math.pow(1 - t, 3);
      orb.scale.setScalar(startScale * (1 + ease * 2));
      orb.material.opacity = 0.9 * (1 - ease);
      if (orb.children[0]) orb.children[0].material.opacity = 0.6 * (1 - ease);
      if (t < 1) requestAnimationFrame(animate);
      else {
        this.scene.remove(orb);
        orb.geometry?.dispose();
        orb.material?.dispose();
      }
    };
    animate();

    this.counterEl.textContent = `✦ ${this.collected} / ${this.total}`;

    if (this.onCollect) this.onCollect(this.collected, this.total);
  }
}
