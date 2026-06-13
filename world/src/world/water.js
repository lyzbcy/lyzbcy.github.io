import * as THREE from 'three';
import waterVert from '../shaders/water.vert?raw';
import waterFrag from '../shaders/water.frag?raw';

export function createWater() {
  const geometry = new THREE.PlaneGeometry(130, 130, 60, 60);
  geometry.rotateX(-Math.PI / 2);

  const material = new THREE.ShaderMaterial({
    vertexShader: waterVert,
    fragmentShader: waterFrag,
    transparent: true,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uDeepColor: { value: new THREE.Color(0x0a2a4a) },
      uShallowColor: { value: new THREE.Color(0x1a5a7a) }
    }
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = -0.8;
  mesh.name = 'water';

  return { mesh, material };
}
