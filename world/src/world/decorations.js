import * as THREE from 'three';
import { getTerrainHeight } from './terrain.js';

export function createDecorations(noise2D) {
  const group = new THREE.Group();
  group.name = 'decorations';

  // --- Trees (InstancedMesh) ---
  const treeCount = 25;
  const trunkGeo = new THREE.CylinderGeometry(0.15, 0.25, 1.5, 6);
  const trunkMat = new THREE.MeshToonMaterial({ color: 0x6b4226 });
  const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
  trunkMesh.castShadow = true;

  const foliageGeo = new THREE.ConeGeometry(1.2, 2.5, 6);
  const foliageMat = new THREE.MeshToonMaterial({ color: 0x2d6b30 });
  const foliageMesh = new THREE.InstancedMesh(foliageGeo, foliageMat, treeCount);
  foliageMesh.castShadow = true;

  const dummy = new THREE.Object3D();
  let placed = 0;
  const attempts = 200;

  for (let i = 0; i < attempts && placed < treeCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 12 + Math.random() * 35;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = getTerrainHeight(noise2D, x, z);

    // Only place trees on land above water
    if (y < 0.2) continue;

    const scale = 0.7 + Math.random() * 0.8;

    // Trunk
    dummy.position.set(x, y + 0.75 * scale, z);
    dummy.scale.set(scale, scale, scale);
    dummy.rotation.y = Math.random() * Math.PI;
    dummy.updateMatrix();
    trunkMesh.setMatrixAt(placed, dummy.matrix);

    // Foliage
    dummy.position.set(x, y + 2.5 * scale, z);
    dummy.updateMatrix();
    foliageMesh.setMatrixAt(placed, dummy.matrix);

    placed++;
  }

  trunkMesh.count = placed;
  foliageMesh.count = placed;
  trunkMesh.instanceMatrix.needsUpdate = true;
  foliageMesh.instanceMatrix.needsUpdate = true;
  group.add(trunkMesh, foliageMesh);

  // --- Rocks (InstancedMesh) ---
  const rockCount = 18;
  const rockGeo = new THREE.DodecahedronGeometry(0.5, 0);
  const rockMat = new THREE.MeshToonMaterial({ color: 0x7a7a7a });
  const rockMesh = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
  rockMesh.castShadow = true;

  let rockPlaced = 0;
  for (let i = 0; i < 150 && rockPlaced < rockCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 8 + Math.random() * 40;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = getTerrainHeight(noise2D, x, z);

    if (y < -0.3) continue;

    const scale = 0.4 + Math.random() * 1.0;
    dummy.position.set(x, y + 0.15 * scale, z);
    dummy.scale.set(scale, scale * (0.5 + Math.random() * 0.5), scale);
    dummy.rotation.set(Math.random(), Math.random(), Math.random());
    dummy.updateMatrix();
    rockMesh.setMatrixAt(rockPlaced, dummy.matrix);
    rockPlaced++;
  }

  rockMesh.count = rockPlaced;
  rockMesh.instanceMatrix.needsUpdate = true;
  group.add(rockMesh);

  // --- Street Lamps ---
  const lampCount = 8;
  for (let i = 0; i < lampCount; i++) {
    const angle = (i / lampCount) * Math.PI * 2;
    const radius = 10;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = getTerrainHeight(noise2D, x, z);

    const lamp = createLamp();
    lamp.position.set(x, Math.max(0, y), z);
    group.add(lamp);
  }

  // --- Paths (simple flat strips) ---
  const pathGeo = new THREE.PlaneGeometry(2, 18, 1, 1);
  pathGeo.rotateX(-Math.PI / 2);
  const pathMat = new THREE.MeshToonMaterial({ color: 0x9a8a6a });

  // Path from building toward NPCs
  for (let i = 0; i < 4; i++) {
    const path = new THREE.Mesh(pathGeo, pathMat);
    path.rotation.y = (i / 4) * Math.PI * 2;
    path.position.y = 0.02;
    path.position.x = Math.cos(path.rotation.y) * 9;
    path.position.z = Math.sin(path.rotation.y) * 9;
    path.receiveShadow = true;
    group.add(path);
  }

  return group;
}

function createLamp() {
  const group = new THREE.Group();

  // Pole
  const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 3, 6);
  const poleMat = new THREE.MeshToonMaterial({ color: 0x3a3a3a });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.y = 1.5;
  pole.castShadow = true;
  group.add(pole);

  // Light bulb
  const bulbGeo = new THREE.SphereGeometry(0.2, 8, 8);
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xffee88,
    emissive: 0xffdd44,
    emissiveIntensity: 2
  });
  const bulb = new THREE.Mesh(bulbGeo, bulbMat);
  bulb.position.y = 3.1;
  group.add(bulb);

  // Point light
  const light = new THREE.PointLight(0xffdd88, 3, 10, 2);
  light.position.y = 3.1;
  group.add(light);

  return group;
}
