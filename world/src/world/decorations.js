import * as THREE from 'three';
import { placeOnSphere, SPHERE_RADIUS } from './terrain.js';

export function createDecorations(noise2D) {
  const group = new THREE.Group();
  group.name = 'decorations';

  // --- Trees ---
  const treeCount = 30;
  let placed = 0;
  const attempts = 200;

  for (let i = 0; i < attempts && placed < treeCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distFromPole = 8 + Math.random() * 30;

    // Skip trees too close to the north pole (tower area)
    if (distFromPole < 10) continue;

    const tree = createTree();
    placeOnSphere(tree, angle, distFromPole, noise2D, 0);

    // Random scale
    const scale = 0.6 + Math.random() * 0.6;
    tree.scale.set(scale, scale, scale);

    // Random rotation around local Y (normal)
    tree.rotateY(Math.random() * Math.PI * 2);

    group.add(tree);
    placed++;
  }

  // --- Rocks ---
  const rockCount = 20;
  let rockPlaced = 0;
  for (let i = 0; i < 150 && rockPlaced < rockCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distFromPole = 6 + Math.random() * 35;

    const rock = createRock();
    placeOnSphere(rock, angle, distFromPole, noise2D, 0);

    const scale = 0.3 + Math.random() * 0.8;
    rock.scale.set(scale, scale * (0.5 + Math.random() * 0.5), scale);
    rock.rotateY(Math.random() * Math.PI * 2);

    group.add(rock);
    rockPlaced++;
  }

  // --- Street Lamps in a ring around the tower ---
  const lampCount = 8;
  for (let i = 0; i < lampCount; i++) {
    const angle = (i / lampCount) * Math.PI * 2;
    const distFromPole = 8;

    const lamp = createLamp();
    placeOnSphere(lamp, angle, distFromPole, noise2D, 0);
    group.add(lamp);
  }

  // --- Paths (flat strips on sphere surface) ---
  // Create paths from tower toward NPC clusters
  const pathCount = 6;
  for (let i = 0; i < pathCount; i++) {
    const angle = (i / pathCount) * Math.PI * 2;
    createPathSegment(group, angle, noise2D);
  }

  return group;
}

function createTree() {
  const g = new THREE.Group();

  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.22, 1.8, 8);
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x4a3529,
    roughness: 0.94
  });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 0.9;
  trunk.castShadow = true;
  g.add(trunk);

  const foliageMat = new THREE.MeshStandardMaterial({
    color: 0x254233,
    roughness: 0.96
  });

  const canopyBottom = new THREE.Mesh(new THREE.ConeGeometry(1.15, 1.9, 8), foliageMat);
  canopyBottom.position.y = 2.1;
  canopyBottom.castShadow = true;
  g.add(canopyBottom);

  const canopyTop = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.5, 8), foliageMat);
  canopyTop.position.y = 3.1;
  canopyTop.castShadow = true;
  g.add(canopyTop);

  return g;
}

function createRock() {
  const geo = new THREE.DodecahedronGeometry(0.5, 0);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x5c6368,
    roughness: 0.98,
    metalness: 0.02
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.2;
  mesh.castShadow = true;
  const g = new THREE.Group();
  g.add(mesh);
  return g;
}

function createLamp() {
  const g = new THREE.Group();

  // Pole
  const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 3, 6);
  const poleMat = new THREE.MeshStandardMaterial({
    color: 0x243241,
    metalness: 0.45,
    roughness: 0.52
  });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.y = 1.5;
  pole.castShadow = true;
  g.add(pole);

  // Light bulb
  const bulbGeo = new THREE.SphereGeometry(0.2, 8, 8);
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xffee88,
    emissive: 0xffdd44,
    emissiveIntensity: 2.4
  });
  const bulb = new THREE.Mesh(bulbGeo, bulbMat);
  bulb.position.y = 3.1;
  g.add(bulb);

  // Point light
  const light = new THREE.PointLight(0xffd88b, 3.8, 12, 2);
  light.position.y = 3.1;
  g.add(light);

  return g;
}

/**
 * Create a path segment from near the tower outward on the sphere
 */
function createPathSegment(group, angle, noise2D) {
  const pathMat = new THREE.MeshStandardMaterial({
    color: 0x6d6253,
    roughness: 0.96,
    metalness: 0.02
  });
  const segmentCount = 6;

  for (let s = 0; s < segmentCount; s++) {
    const distFromPole = 5 + s * 2.7;
    const pathPiece = new THREE.Group();

    const geo = new THREE.BoxGeometry(1.85, 0.05, 2.6);
    const mesh = new THREE.Mesh(geo, pathMat);
    mesh.position.y = 0.03;
    mesh.receiveShadow = true;
    pathPiece.add(mesh);

    const lightStrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.03, 2.2),
      new THREE.MeshStandardMaterial({
        color: 0xa8dfff,
        emissive: 0x7ecdf9,
        emissiveIntensity: 1.2
      })
    );
    lightStrip.position.y = 0.065;
    pathPiece.add(lightStrip);

    placeOnSphere(pathPiece, angle, distFromPole, noise2D, 0);
    group.add(pathPiece);
  }
}
