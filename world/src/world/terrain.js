import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

export function createTerrain() {
  const noise2D = createNoise2D();
  const size = 120;
  const segments = 80;
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);

  const grassColor = new THREE.Color(0x4a7c3f);
  const dirtColor = new THREE.Color(0x8b6d4a);
  const sandColor = new THREE.Color(0xc4a95a);

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);

    // Multi-octave noise for natural terrain
    let height = 0;
    height += noise2D(x * 0.02, z * 0.02) * 3.0;
    height += noise2D(x * 0.05, z * 0.05) * 1.2;
    height += noise2D(x * 0.1, z * 0.1) * 0.4;

    // Flatten center area for the building plaza
    const distFromCenter = Math.sqrt(x * x + z * z);
    const flattenFactor = Math.max(0, 1 - Math.exp(-distFromCenter * 0.06));
    height *= flattenFactor;

    // Island shape - lower edges
    const edgeFalloff = Math.max(0, 1 - distFromCenter / (size * 0.45));
    height = height * edgeFalloff - (1 - edgeFalloff) * 2;

    positions.setY(i, height);

    // Vertex coloring based on height
    const color = new THREE.Color();
    if (height < -0.5) {
      color.copy(sandColor);
    } else if (height < 1.5) {
      color.lerpColors(sandColor, grassColor, (height + 0.5) / 2);
    } else {
      color.lerpColors(grassColor, dirtColor, Math.min(1, (height - 1.5) / 3));
    }

    // Add slight noise variation to color
    const colorNoise = noise2D(x * 0.3, z * 0.3) * 0.05;
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
 * Get terrain height at a given (x, z) position
 */
export function getTerrainHeight(noise2D, x, z) {
  const size = 120;
  let height = 0;
  height += noise2D(x * 0.02, z * 0.02) * 3.0;
  height += noise2D(x * 0.05, z * 0.05) * 1.2;
  height += noise2D(x * 0.1, z * 0.1) * 0.4;

  const distFromCenter = Math.sqrt(x * x + z * z);
  const flattenFactor = Math.max(0, 1 - Math.exp(-distFromCenter * 0.06));
  height *= flattenFactor;

  const edgeFalloff = Math.max(0, 1 - distFromCenter / (size * 0.45));
  height = height * edgeFalloff - (1 - edgeFalloff) * 2;

  return height;
}
