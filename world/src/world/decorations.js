import * as THREE from 'three';
import { placeOnSphere } from './terrain.js';

/**
 * Cheerful fairy-tale decorations: round puffy trees, flower clusters,
 * rounded boulders, warm lamp posts and stone paths around the tower.
 */
export function createDecorations(noise2D) {
  const group = new THREE.Group();
  group.name = 'decorations';

  // --- Puffy round trees ---
  const treeCount = 36;
  let placed = 0;
  for (let i = 0; i < 250 && placed < treeCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distFromPole = 9 + Math.random() * 32;
    if (distFromPole < 11) continue; // keep plaza clear

    const tree = createPuffyTree();
    placeOnSphere(tree, angle, distFromPole, noise2D, 0);
    const scale = 0.7 + Math.random() * 0.7;
    tree.scale.set(scale, scale, scale);
    tree.rotateY(Math.random() * Math.PI * 2);
    group.add(tree);
    placed++;
  }

  // --- Flower clusters scattered across meadows ---
  for (let i = 0; i < 50; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distFromPole = 8 + Math.random() * 34;
    if (distFromPole < 10) continue;
    const patch = createFlowerPatch();
    placeOnSphere(patch, angle, distFromPole, noise2D, 0);
    patch.rotateY(Math.random() * Math.PI * 2);
    group.add(patch);
  }

  // --- Rounded boulders ---
  for (let i = 0; i < 22; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distFromPole = 7 + Math.random() * 36;
    const rock = createBoulder();
    placeOnSphere(rock, angle, distFromPole, noise2D, 0);
    const scale = 0.35 + Math.random() * 0.9;
    rock.scale.set(scale, scale * (0.6 + Math.random() * 0.4), scale);
    rock.rotateY(Math.random() * Math.PI * 2);
    group.add(rock);
  }

  // --- Warm lamp posts ringing the plaza ---
  const lampCount = 10;
  for (let i = 0; i < lampCount; i++) {
    const angle = (i / lampCount) * Math.PI * 2;
    const lamp = createLampPost();
    placeOnSphere(lamp, angle, 8.5, noise2D, 0);
    group.add(lamp);
  }

  // --- Stone paths radiating from the tower ---
  const pathCount = 8;
  for (let i = 0; i < pathCount; i++) {
    const angle = (i / pathCount) * Math.PI * 2;
    createPathSegment(group, angle, noise2D);
  }

  // --- Decorative plaza ring around the tower ---
  createPlazaRing(group, noise2D);

  return group;
}

/**
 * Rounded, low-poly "lollipop" tree: trunk + 2-3 puffy foliage spheres.
 */
function createPuffyTree() {
  const g = new THREE.Group();

  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x8a5a36, roughness: 0.95, metalness: 0.0
  });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 1.7, 8), trunkMat);
  trunk.position.y = 0.85;
  trunk.castShadow = true;
  g.add(trunk);

  // Vary green tone per tree for a lively meadow
  const hue = 0.28 + (Math.random() - 0.5) * 0.06;
  const sat = 0.45 + Math.random() * 0.2;
  const lit = 0.42 + Math.random() * 0.12;
  const foliageColor = new THREE.Color().setHSL(hue, sat, lit);
  const foliageMat = new THREE.MeshStandardMaterial({
    color: foliageColor, roughness: 0.9, flatShading: true
  });

  const canopy = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 1), foliageMat);
  canopy.position.y = 2.25;
  canopy.castShadow = true;
  g.add(canopy);

  const side = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 1), foliageMat);
  side.position.set(0.7, 1.95, 0.2);
  side.castShadow = true;
  g.add(side);

  const top = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 1), foliageMat);
  top.position.set(-0.25, 3.05, -0.1);
  top.castShadow = true;
  g.add(top);

  return g;
}

/**
 * A small patch of flowers: a few colored blooms on the grass.
 */
function createFlowerPatch() {
  const g = new THREE.Group();
  const flowerColors = [0xf4b8c4, 0xf6e08a, 0xe8a8d8, 0xffffff, 0xf0936a];
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x5a8f3c, roughness: 0.9 });
  const count = 3 + Math.floor(Math.random() * 3);

  for (let i = 0; i < count; i++) {
    const fg = new THREE.Group();
    const ox = (Math.random() - 0.5) * 1.0;
    const oz = (Math.random() - 0.5) * 1.0;

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 4), stemMat);
    stem.position.set(ox, 0.18, oz);
    fg.add(stem);

    const bloomColor = flowerColors[Math.floor(Math.random() * flowerColors.length)];
    const bloomMat = new THREE.MeshStandardMaterial({
      color: bloomColor, roughness: 0.7, emissive: bloomColor, emissiveIntensity: 0.08
    });
    const bloom = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), bloomMat);
    bloom.position.set(ox, 0.4, oz);
    fg.add(bloom);

    g.add(fg);
  }
  return g;
}

/**
 * Soft rounded boulder.
 */
function createBoulder() {
  const g = new THREE.Group();
  const geo = new THREE.DodecahedronGeometry(0.5, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setX(i, pos.getX(i) + (Math.random() - 0.5) * 0.08);
    pos.setY(i, pos.getY(i) + (Math.random() - 0.5) * 0.08);
    pos.setZ(i, pos.getZ(i) + (Math.random() - 0.5) * 0.08);
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    color: 0x9c9684, roughness: 0.95, metalness: 0.02, flatShading: true
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return g;
}

/**
 * Cute cast-iron-style lamp post with a warm glowing lantern.
 */
function createLampPost() {
  const g = new THREE.Group();
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x3d4a40, roughness: 0.55, metalness: 0.5
  });

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 3, 8), metalMat);
  pole.position.y = 1.5;
  pole.castShadow = true;
  g.add(pole);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.25, 8), metalMat);
  base.position.y = 0.13;
  g.add(base);

  const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.4, 8), metalMat);
  housing.position.y = 3.1;
  g.add(housing);

  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xfff0c0, emissive: 0xffd070, emissiveIntensity: 1.6
  });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), bulbMat);
  bulb.position.y = 3.05;
  g.add(bulb);

  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.22, 8), metalMat);
  cap.position.y = 3.42;
  g.add(cap);

  const light = new THREE.PointLight(0xffd58a, 1.6, 9, 2);
  light.position.y = 3.05;
  g.add(light);

  return g;
}

/**
 * Stone path of warm stepping stones leading outward from the tower.
 */
function createPathSegment(group, angle, noise2D) {
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xd9c9a3, roughness: 0.95, metalness: 0.0, flatShading: true
  });
  const segmentCount = 6;

  for (let s = 0; s < segmentCount; s++) {
    const distFromPole = 4.5 + s * 2.6;
    const pathPiece = new THREE.Group();

    for (let k = -1; k <= 1; k += 2) {
      const stone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 0.7, 0.16, 8),
        stoneMat
      );
      stone.position.set(k * 0.55, 0.08, 0);
      stone.receiveShadow = true;
      stone.rotation.y = Math.random() * 0.6;
      pathPiece.add(stone);
    }

    placeOnSphere(pathPiece, angle, distFromPole, noise2D, 0);
    group.add(pathPiece);
  }
}

/**
 * Warm decorative ring around the tower plaza.
 */
function createPlazaRing(group, noise2D) {
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xe8dcc0, roughness: 0.9, metalness: 0.02
  });
  const ringGeo = new THREE.TorusGeometry(4.2, 0.18, 10, 48);
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.12;
  ring.receiveShadow = true;
  group.add(ring);

  const postMat = new THREE.MeshStandardMaterial({ color: 0xb8a888, roughness: 0.85 });
  const postCount = 12;
  for (let i = 0; i < postCount; i++) {
    const a = (i / postCount) * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.6, 8), postMat);
    placeOnSphere(post, a, 4.2, noise2D, 0);
    group.add(post);
  }
}
