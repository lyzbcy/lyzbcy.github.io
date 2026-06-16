import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

export const SPHERE_RADIUS = 25;

export function createTerrain() {
  const noise2D = createNoise2D();
  const geometry = new THREE.SphereGeometry(SPHERE_RADIUS, 96, 96);

  const positions = geometry.attributes.position;
  const normals = geometry.attributes.normal;
  const colors = new Float32Array(positions.count * 3);

  // Bright, cheerful fairy-tale palette
  const grassColor   = new THREE.Color(0x7fb958); // fresh vivid meadow grass
  const meadowColor  = new THREE.Color(0xa7d76f); // sunlit lighter grass
  const dirtColor    = new THREE.Color(0xc4a878); // warm earthy dirt
  const sandColor    = new THREE.Color(0xf2e0ac); // warm golden sand
  const darkGrass    = new THREE.Color(0x5a8f3c); // deeper rolling hills
  const cliffColor   = new THREE.Color(0xa89c84); // soft warm stone
  const plazaColor   = new THREE.Color(0xe8dcc0); // warm cream plaza stone

  for (let i = 0; i < positions.count; i++) {
    const nx = normals.getX(i);
    const ny = normals.getY(i);
    const nz = normals.getZ(i);

    // Multi-octave noise displacement
    let displacement = 0;
    displacement += noise2D(nx * 3.0, nz * 3.0) * 1.5;
    displacement += noise2D(nx * 6.0, ny * 6.0) * 0.7;
    displacement += noise2D(ny * 10.0, nz * 10.0) * 0.3;

    // Flatten north pole for building plaza
    const northPoleFactor = 1.0 - smoothstep(0.75, 0.95, ny);
    displacement *= northPoleFactor;

    // Flatten south pole
    const southPoleFactor = 1.0 - smoothstep(0.75, 0.95, -ny);
    displacement *= southPoleFactor;

    displacement = Math.max(0.3, displacement + 1.5);

    const newRadius = SPHERE_RADIUS + displacement;
    positions.setXYZ(i, nx * newRadius, ny * newRadius, nz * newRadius);

    // Region-based coloring using angle around Y axis
    const angle = Math.atan2(nz, nx); // -PI to PI
    const color = new THREE.Color();

    // Base height coloring — beach → meadow → hills → cliffs
    if (displacement < 0.9) {
      color.copy(sandColor);
    } else if (displacement < 1.9) {
      color.lerpColors(sandColor, grassColor, (displacement - 0.9) / 1.0);
    } else if (displacement < 3.0) {
      color.lerpColors(grassColor, darkGrass, (displacement - 1.9) / 1.1);
    } else {
      color.lerpColors(darkGrass, cliffColor, Math.min(1, (displacement - 3.0) / 1.8));
    }

    // Region tinting: sunlit meadow patches vs. warmer dirt patches
    const regionNoise = noise2D(angle * 0.8, ny * 2.0);
    if (regionNoise > 0.2) {
      color.lerp(meadowColor, regionNoise * 0.35);   // brighter sunlit grass
    } else if (regionNoise < -0.2) {
      color.lerp(dirtColor, Math.abs(regionNoise) * 0.22); // warm earthy patches
    }

    // Flower-field blush: rare warm pink/yellow wildflower zones
    const flowerNoise = noise2D(nx * 8.0, nz * 8.0);
    if (flowerNoise > 0.62 && displacement > 1.0 && displacement < 2.5) {
      const blush = (flowerNoise - 0.62) * 2.5;
      // alternate warm pink and soft yellow based on a second noise
      const warm = noise2D(ny * 5.0, nz * 5.0) > 0;
      color.lerp(warm ? new THREE.Color(0xf4b8c4) : new THREE.Color(0xf6e08a), blush * 0.28);
    }

    // Plaza area near north pole: warm cream stone, smooth and inviting
    const plazaDist = 1.0 - smoothstep(0.86, 0.96, ny);
    if (plazaDist < 0.45) {
      color.lerp(plazaColor, (1.0 - plazaDist / 0.45) * 0.75);
    }

    // Subtle noise variation for natural texture
    const colorNoise = noise2D(nx * 15.0, nz * 15.0) * 0.03;
    color.r = Math.max(0, Math.min(1, color.r + colorNoise * 0.5));
    color.g = Math.max(0, Math.min(1, color.g + colorNoise * 0.8));
    color.b = Math.max(0, Math.min(1, color.b + colorNoise * 0.4));

    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    side: THREE.FrontSide,
    roughness: 0.92,
    metalness: 0.04
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  return { mesh, noise2D };
}

export function getTerrainRadiusAt(noise2D, dirX, dirY, dirZ) {
  const nx = dirX, ny = dirY, nz = dirZ;
  let displacement = 0;
  displacement += noise2D(nx * 3.0, nz * 3.0) * 1.5;
  displacement += noise2D(nx * 6.0, ny * 6.0) * 0.7;
  displacement += noise2D(ny * 10.0, nz * 10.0) * 0.3;
  const northPoleFactor = 1.0 - smoothstep(0.75, 0.95, ny);
  displacement *= northPoleFactor;
  const southPoleFactor = 1.0 - smoothstep(0.75, 0.95, -ny);
  displacement *= southPoleFactor;
  displacement = Math.max(0.3, displacement + 1.5);
  return SPHERE_RADIUS + displacement;
}

export function getSpherePosition(angle, distFromPole, noise2D) {
  const phi = distFromPole / SPHERE_RADIUS;
  const dir = new THREE.Vector3(
    Math.sin(phi) * Math.cos(angle),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(angle)
  ).normalize();
  const radius = getTerrainRadiusAt(noise2D, dir.x, dir.y, dir.z);
  return { position: dir.clone().multiplyScalar(radius), normal: dir.clone() };
}

export function placeOnSphere(object, angle, distFromPole, noise2D, heightOffset = 0) {
  const { position, normal } = getSpherePosition(angle, distFromPole, noise2D);
  object.position.copy(position).addScaledVector(normal, heightOffset);
  const up = new THREE.Vector3(0, 1, 0);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normal);
  object.quaternion.copy(quaternion);
  return { position: object.position.clone(), normal: normal.clone() };
}

export function getTerrainHeightAtPosition(noise2D, x, y, z) {
  const len = Math.sqrt(x * x + y * y + z * z);
  if (len < 0.001) return SPHERE_RADIUS + 1.5;
  const nx = x / len, ny = y / len, nz = z / len;
  return getTerrainRadiusAt(noise2D, nx, ny, nz);
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
