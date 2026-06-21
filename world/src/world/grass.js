import * as THREE from 'three';
import { placeOnSphere, getSpherePosition, SPHERE_RADIUS } from './terrain.js';

/**
 * Instanced grass blades scattered across the sphere surface.
 * Uses InstancedMesh for performance — 5000+ blades in a single draw call.
 */
export function createGrass(noise2D) {
  const group = new THREE.Group();
  group.name = 'grass';

  // --- Grass blade geometry: a small bent triangular blade ---
  const bladeGeo = new THREE.PlaneGeometry(0.08, 0.5, 1, 3);
  // Taper the top
  const pos = bladeGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y > 0) {
      // Narrow towards top
      const taper = 1.0 - (y / 0.25) * 0.7;
      pos.setX(i, pos.getX(i) * taper);
    }
    // Slight forward bend
    pos.setZ(i, pos.getZ(i) + Math.max(0, y) * 0.15);
  }
  bladeGeo.computeVertexNormals();

  // --- Vertex colors for grass variation ---
  const bladeColors = new Float32Array(pos.count * 3);
  const baseGreen = new THREE.Color(0x6ba83a);
  const tipGreen = new THREE.Color(0x9dd55e);
  const dryGreen = new THREE.Color(0xc4b878);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = Math.max(0, y / 0.25);
    const c = baseGreen.clone().lerp(tipGreen, t);
    // Random dry variation
    if (Math.random() < 0.15) c.lerp(dryGreen, 0.3);
    bladeColors[i * 3] = c.r;
    bladeColors[i * 3 + 1] = c.g;
    bladeColors[i * 3 + 2] = c.b;
  }
  bladeGeo.setAttribute('color', new THREE.BufferAttribute(bladeColors, 3));

  const bladeMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    roughness: 0.85,
    metalness: 0.0,
    alphaTest: 0.5
  });

  // --- Place blades on sphere surface ---
  const BLADE_COUNT = 5000;
  const instancedGrass = new THREE.InstancedMesh(bladeGeo, bladeMat, BLADE_COUNT);

  const dummy = new THREE.Object3D();
  let placed = 0;

  for (let i = 0; i < BLADE_COUNT * 3 && placed < BLADE_COUNT; i++) {
    // Random position on sphere (avoiding poles)
    const angle = Math.random() * Math.PI * 2;
    const distFromPole = 6 + Math.random() * 38;
    if (distFromPole < 8) continue; // keep plaza clear

    const { position, normal } = getSpherePosition(angle, distFromPole, noise2D);

    // Skip if too close to a building (check Y — buildings are near north pole)
    if (position.y > SPHERE_RADIUS + 2.5) continue;

    dummy.position.copy(position).addScaledVector(normal, 0.25);

    // Orient blade to stand up from surface (align Y with normal)
    const up = new THREE.Vector3(0, 1, 0);
    dummy.quaternion.setFromUnitVectors(up, normal);

    // Random rotation around normal
    dummy.rotateY(Math.random() * Math.PI * 2);

    // Random scale
    const scale = 0.6 + Math.random() * 0.8;
    dummy.scale.set(scale, scale * (0.7 + Math.random() * 0.5), scale);

    dummy.updateMatrix();
    instancedGrass.setMatrixAt(placed, dummy.matrix);
    placed++;
  }

  instancedGrass.count = placed;
  instancedGrass.instanceMatrix.needsUpdate = true;
  instancedGrass.castShadow = false; // grass doesn't cast shadows (perf)
  instancedGrass.receiveShadow = true;
  group.add(instancedGrass);

  // --- Glowing path particles connecting tower to landmarks ---
  group.add(createGlowPaths(noise2D));

  // --- Firefly spawn points near grass ---
  group.add(createDandelionSpores(noise2D));

  return group;
}

/**
 * Glowing dotted paths that connect the tower plaza to key landmarks.
 * Small emissive spheres float just above the ground along curves.
 */
function createGlowPaths(noise2D) {
  const group = new THREE.Group();
  group.name = 'glow-paths';

  const pathColor = 0xffe4a0;
  const pathMat = new THREE.MeshStandardMaterial({
    color: pathColor,
    emissive: pathColor,
    emissiveIntensity: 1.2,
    roughness: 0.4,
    transparent: true,
    opacity: 0.85
  });

  const sphereGeo = new THREE.SphereGeometry(0.12, 8, 8);

  // 6 paths radiating from tower
  const pathCount = 6;
  for (let p = 0; p < pathCount; p++) {
    const baseAngle = (p / pathCount) * Math.PI * 2 + 0.3;
    const dotCount = 14;

    for (let d = 0; d < dotCount; d++) {
      const distFromPole = 5 + d * 2.2;
      // Add slight curve to path
      const wobble = Math.sin(d * 0.4) * 0.15;
      const angle = baseAngle + wobble;

      const { position, normal } = getSpherePosition(angle, distFromPole, noise2D);

      // Pulse opacity based on distance from center
      const pulse = 1.0 - (d / dotCount) * 0.4;
      const dotMat = pathMat.clone();
      dotMat.opacity = 0.4 + pulse * 0.4;
      dotMat.emissiveIntensity = 0.8 + pulse * 0.6;

      const dot = new THREE.Mesh(sphereGeo, dotMat);
      dot.position.copy(position).addScaledVector(normal, 0.25);
      dot.userData.baseY = dot.position.y;
      dot.userData.phase = d * 0.5 + p;

      group.add(dot);
    }
  }

  return group;
}

/**
 * Floating dandelion spore particles for atmosphere.
 */
function createDandelionSpores(noise2D) {
  const group = new THREE.Group();
  group.name = 'dandelion-spores';

  const sporeCount = 80;
  const sporeGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(sporeCount * 3);
  const phases = new Float32Array(sporeCount);

  for (let i = 0; i < sporeCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distFromPole = 6 + Math.random() * 35;
    const { position } = getSpherePosition(angle, distFromPole, noise2D);

    positions[i * 3] = position.x;
    positions[i * 3 + 1] = position.y + 1 + Math.random() * 3;
    positions[i * 3 + 2] = position.z;
    phases[i] = Math.random() * Math.PI * 2;
  }

  sporeGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const sporeMat = new THREE.PointsMaterial({
    color: 0xfff8dc,
    size: 0.15,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
  });

  const points = new THREE.Points(sporeGeo, sporeMat);
  points.userData.phases = phases;
  group.add(points);

  return group;
}
