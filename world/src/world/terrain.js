import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

export const SPHERE_RADIUS = 25;

export function createTerrain() {
  const noise2D = createNoise2D();
  const geometry = new THREE.SphereGeometry(SPHERE_RADIUS, 80, 80);

  const positions = geometry.attributes.position;
  const normals = geometry.attributes.normal;
  const colors = new Float32Array(positions.count * 3);

  const grassColor = new THREE.Color(0x4a7c3f);
  const dirtColor = new THREE.Color(0x8b6d4a);
  const sandColor = new THREE.Color(0xc4a95a);
  const darkGrass = new THREE.Color(0x3a6830);

  for (let i = 0; i < positions.count; i++) {
    const nx = normals.getX(i);
    const ny = normals.getY(i);
    const nz = normals.getZ(i);

    // Get the undisplaced position on the sphere surface
    const px = positions.getX(i);
    const py = positions.getY(i);
    const pz = positions.getZ(i);

    // Multi-octave noise displacement along normal
    let displacement = 0;
    displacement += noise2D(nx * 3.0, nz * 3.0) * 1.5;
    displacement += noise2D(nx * 6.0, ny * 6.0) * 0.7;
    displacement += noise2D(ny * 10.0, nz * 10.0) * 0.3;

    // Flatten the north pole area for the building plaza
    // ny=1 is north pole; smoothstep flattens near top
    const northPoleFactor = 1.0 - smoothstep(0.75, 0.95, ny);
    displacement *= northPoleFactor;

    // Slightly flatten south pole too for visual balance
    const southPoleFactor = 1.0 - smoothstep(0.75, 0.95, -ny);
    displacement *= southPoleFactor;

    // Ensure displacement is always positive (terrain above water)
    displacement = Math.max(0.3, displacement + 1.5);

    // Apply displacement along normal
    const newRadius = SPHERE_RADIUS + displacement;
    positions.setXYZ(i, nx * newRadius, ny * newRadius, nz * newRadius);

    // Vertex coloring based on displacement height
    const color = new THREE.Color();
    if (displacement < 0.8) {
      color.copy(sandColor);
    } else if (displacement < 1.8) {
      color.lerpColors(sandColor, grassColor, (displacement - 0.8) / 1.0);
    } else if (displacement < 2.8) {
      color.lerpColors(grassColor, darkGrass, (displacement - 1.8) / 1.0);
    } else {
      color.lerpColors(darkGrass, dirtColor, Math.min(1, (displacement - 2.8) / 2.0));
    }

    // Add slight noise variation to color
    const colorNoise = noise2D(nx * 15.0, nz * 15.0) * 0.04;
    color.r = Math.max(0, Math.min(1, color.r + colorNoise));
    color.g = Math.max(0, Math.min(1, color.g + colorNoise));
    color.b = Math.max(0, Math.min(1, color.b + colorNoise));

    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshToonMaterial({
    vertexColors: true,
    side: THREE.FrontSide
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  return { mesh, noise2D };
}

/**
 * Get terrain surface distance from sphere center at a given direction.
 * dirX, dirY, dirZ should be a normalized direction vector from origin.
 */
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

/**
 * Get terrain surface position for a given angle and distance from north pole.
 * angle: radians around Y axis (0 to 2*PI)
 * distFromPole: arc length distance from the north pole along the surface
 * Returns { position: Vector3, normal: Vector3 }
 */
export function getSpherePosition(angle, distFromPole, noise2D) {
  const phi = distFromPole / SPHERE_RADIUS;
  const dir = new THREE.Vector3(
    Math.sin(phi) * Math.cos(angle),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(angle)
  ).normalize();

  const radius = getTerrainRadiusAt(noise2D, dir.x, dir.y, dir.z);
  return {
    position: dir.clone().multiplyScalar(radius),
    normal: dir.clone()
  };
}

/**
 * Place an Object3D on the sphere surface at given angle and distance from pole.
 * The object's local Y axis aligns with the sphere normal (outward).
 */
export function placeOnSphere(object, angle, distFromPole, noise2D, heightOffset = 0) {
  const { position, normal } = getSpherePosition(angle, distFromPole, noise2D);

  object.position.copy(position).addScaledVector(normal, heightOffset);

  // Orient: make local Y axis point along the normal (outward from sphere)
  const up = new THREE.Vector3(0, 1, 0);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normal);
  object.quaternion.copy(quaternion);

  return { position: object.position.clone(), normal: normal.clone() };
}

/**
 * Get terrain height (radius from center) at a world position.
 * Used by player controls to snap to terrain surface.
 */
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
