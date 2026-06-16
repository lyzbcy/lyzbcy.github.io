import * as THREE from 'three';
import { SPHERE_RADIUS } from './terrain.js';
import { SUN_DIRECTION } from './sky.js';
import waterVert from '../shaders/water.vert?raw';
import waterFrag from '../shaders/water.frag?raw';

// Water sits just above the lowest terrain so beaches poke through
const WATER_RADIUS = SPHERE_RADIUS + 0.3;

export function createWater() {
  const geometry = new THREE.SphereGeometry(WATER_RADIUS, 96, 96);

  const material = new THREE.ShaderMaterial({
    vertexShader: waterVert,
    fragmentShader: waterFrag,
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      // Warm teal-turquoise fairy-tale water
      uDeepColor: { value: new THREE.Color(0x3a9bb0) },    // deeper teal
      uShallowColor: { value: new THREE.Color(0x8fd6e0) }, // bright shallow aqua
      uSunDir: { value: SUN_DIRECTION.clone() }
    }
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'water';
  mesh.frustumCulled = false;

  return { mesh, material };
}
