import * as THREE from 'three';
import skyVert from '../shaders/sky.vert?raw';
import skyFrag from '../shaders/sky.frag?raw';
import { SPHERE_RADIUS } from './terrain.js';

export const SUN_DIRECTION = new THREE.Vector3(0.45, 0.72, 0.52).normalize();

export function createSky() {
  const geometry = new THREE.SphereGeometry(200, 48, 32);

  const material = new THREE.ShaderMaterial({
    vertexShader: skyVert,
    fragmentShader: skyFrag,
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uSunDir: { value: SUN_DIRECTION.clone() }
    }
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'sky';
  mesh.frustumCulled = false;

  return { mesh, material };
}

/**
 * Cosmic dust particles floating around the world.
 * Soft blue-white glow with occasional warm tints.
 */
export function createFireflies(count = 120) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const drifts = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = SPHERE_RADIUS + 2 + Math.random() * 12;

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

    sizes[i] = 0.2 + Math.random() * 0.4;
    phases[i] = Math.random() * Math.PI * 2;

    drifts[i * 3] = (Math.random() - 0.5) * 0.3;
    drifts[i * 3 + 1] = (Math.random() - 0.3) * 0.2;
    drifts[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

  // Cosmic dust: soft blue-white
  const material = new THREE.PointsMaterial({
    color: 0x88bbff,
    size: 0.3,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
  });

  const points = new THREE.Points(geometry, material);
  points.name = 'fireflies';
  points.userData.drifts = drifts;
  points.userData.basePositions = positions.slice();

  return { points, phases };
}
