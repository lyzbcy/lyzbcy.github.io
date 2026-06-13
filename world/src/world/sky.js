import * as THREE from 'three';
import skyVert from '../shaders/sky.vert?raw';
import skyFrag from '../shaders/sky.frag?raw';

export function createSky() {
  const geometry = new THREE.SphereGeometry(200, 32, 32);

  const material = new THREE.ShaderMaterial({
    vertexShader: skyVert,
    fragmentShader: skyFrag,
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 }
    }
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'sky';

  return { mesh, material };
}

export function createFireflies(count = 80) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    // Scatter fireflies in a dome around the scene
    const angle = Math.random() * Math.PI * 2;
    const radius = 5 + Math.random() * 40;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = 1 + Math.random() * 8;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
    sizes[i] = 0.3 + Math.random() * 0.5;
    phases[i] = Math.random() * Math.PI * 2;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

  const material = new THREE.PointsMaterial({
    color: 0xffee88,
    size: 0.4,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
  });

  const points = new THREE.Points(geometry, material);
  points.name = 'fireflies';

  return { points, phases };
}
