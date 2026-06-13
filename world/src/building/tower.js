import * as THREE from 'three';
import { placeOnSphere } from '../world/terrain.js';

export function createTower(noise2D) {
  const group = new THREE.Group();
  group.name = 'tower';

  const baseMat = new THREE.MeshToonMaterial({ color: 0x2a2a3e });
  const accentMat = new THREE.MeshToonMaterial({ color: 0x3a3a5e });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0x4fc3f7,
    emissive: 0x4fc3f7,
    emissiveIntensity: 1.5
  });

  // Base platform
  const baseGeo = new THREE.CylinderGeometry(5, 5.5, 0.5, 8);
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = 0.25;
  base.receiveShadow = true;
  group.add(base);

  // Main tower body - stacked boxes getting smaller
  const levels = [
    { w: 6, h: 4, d: 6, y: 2.5 },
    { w: 5, h: 3, d: 5, y: 6 },
    { w: 4, h: 3, d: 4, y: 9 },
    { w: 3, h: 2, d: 3, y: 11.5 },
    { w: 2, h: 2, d: 2, y: 13.5 }
  ];

  levels.forEach((lv, i) => {
    const geo = new THREE.BoxGeometry(lv.w, lv.h, lv.d);
    const mat = i % 2 === 0 ? baseMat : accentMat;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = lv.y;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    // Glowing edge strips between levels
    if (i < levels.length - 1) {
      const stripGeo = new THREE.BoxGeometry(lv.w + 0.1, 0.08, lv.d + 0.1);
      const strip = new THREE.Mesh(stripGeo, glowMat);
      strip.position.y = lv.y + lv.h / 2;
      group.add(strip);
    }
  });

  // Antenna on top
  const antennaGeo = new THREE.CylinderGeometry(0.05, 0.08, 3, 6);
  const antenna = new THREE.Mesh(antennaGeo, glowMat);
  antenna.position.y = 16;
  group.add(antenna);

  // Antenna tip glow
  const tipGeo = new THREE.SphereGeometry(0.2, 8, 8);
  const tip = new THREE.Mesh(tipGeo, glowMat);
  tip.position.y = 17.5;
  group.add(tip);

  // Spotlight from top
  const spotLight = new THREE.SpotLight(0x4fc3f7, 5, 30, Math.PI / 6, 0.5);
  spotLight.position.set(0, 17, 0);
  spotLight.target.position.set(0, 0, 8);
  group.add(spotLight);
  group.add(spotLight.target);

  // Place tower at north pole on sphere
  if (noise2D) {
    placeOnSphere(group, 0, 0, noise2D, 0);
  }

  return group;
}
