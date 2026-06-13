import * as THREE from 'three';
import { SPHERE_RADIUS } from './terrain.js';
import waterVert from '../shaders/water.vert?raw';
import waterFrag from '../shaders/water.frag?raw';

// Water level: slightly below terrain surface so terrain pokes through
const WATER_RADIUS = SPHERE_RADIUS + 0.3;

export function createWater() {
  const geometry = new THREE.SphereGeometry(WATER_RADIUS, 64, 64);

  const material = new THREE.ShaderMaterial({
    vertexShader: waterVert,
    fragmentShader: waterFrag,
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uDeepColor: { value: new THREE.Color(0x0a2a4a) },
      uShallowColor: { value: new THREE.Color(0x1a5a7a) }
    }
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'water';

  return { mesh, material };
}
