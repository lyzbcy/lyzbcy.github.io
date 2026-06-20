import * as THREE from 'three';
import { placeOnSphere } from '../world/terrain.js';

export function createArcadeBuilding(noise2D) {
  const group = new THREE.Group();
  group.name = 'arcade-building';

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xf3e4c4,
    roughness: 0.9,
    metalness: 0.02
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0xa96f43,
    roughness: 0.82,
    metalness: 0.04
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0xcd7f52,
    roughness: 0.86,
    metalness: 0.03
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0xf0c978,
    emissive: 0xe9c26a,
    emissiveIntensity: 0.22,
    roughness: 0.45,
    metalness: 0.35
  });
  const signMat = new THREE.MeshStandardMaterial({
    color: 0xfff5df,
    emissive: 0xffe5aa,
    emissiveIntensity: 0.45,
    roughness: 0.55,
    metalness: 0.08
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 5.3, 1.2, 8), wallMat);
  base.position.y = 0.6;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.5, 5.4, 8), wallMat);
  body.position.y = 3.6;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(5.4, 3.8, 8), roofMat);
  roof.position.y = 8.1;
  roof.castShadow = true;
  group.add(roof);

  const roofRim = new THREE.Mesh(new THREE.TorusGeometry(4.55, 0.16, 10, 24), trimMat);
  roofRim.position.y = 6.7;
  roofRim.rotation.x = Math.PI / 2;
  group.add(roofRim);

  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.2, 0.4), woodMat);
  doorFrame.position.set(0, 2.4, 4.14);
  group.add(doorFrame);

  const doorInner = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.5), signMat);
  doorInner.position.set(0, 2.25, 4.36);
  doorInner.userData = {
    type: 'arcade',
    label: '童话游戏厅',
    summary: '推开这扇门，会进入一个放满 AR 街机的新地图。',
    destination: './arcade.html'
  };
  group.add(doorInner);

  const marquee = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.9, 0.35), trimMat);
  marquee.position.set(0, 4.7, 4.05);
  group.add(marquee);

  const signCanvas = document.createElement('canvas');
  signCanvas.width = 512;
  signCanvas.height = 128;
  const ctx = signCanvas.getContext('2d');
  ctx.fillStyle = '#fff7e8';
  ctx.fillRect(0, 0, signCanvas.width, signCanvas.height);
  ctx.strokeStyle = 'rgba(195, 140, 60, 0.55)';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, signCanvas.width - 20, signCanvas.height - 20);
  ctx.fillStyle = '#8b5428';
  ctx.font = 'bold 54px "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('童话游戏厅', signCanvas.width / 2, 74);
  ctx.font = '22px "Microsoft YaHei", sans-serif';
  ctx.fillStyle = 'rgba(139, 84, 40, 0.7)';
  ctx.fillText('AR ARCADE', signCanvas.width / 2, 106);
  const signTex = new THREE.CanvasTexture(signCanvas);
  const signBoard = new THREE.Mesh(
    new THREE.PlaneGeometry(3.1, 0.78),
    new THREE.MeshStandardMaterial({
      map: signTex,
      emissiveMap: signTex,
      emissive: 0xf8d486,
      emissiveIntensity: 0.3
    })
  );
  signBoard.position.set(0, 4.7, 4.24);
  group.add(signBoard);

  const windowGeo = new THREE.PlaneGeometry(1.15, 1.5);
  for (const x of [-2.25, 2.25]) {
    const window = new THREE.Mesh(windowGeo, signMat);
    window.position.set(x, 3.2, 3.98);
    group.add(window);
  }

  const path = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 0.12, 3.8),
    new THREE.MeshStandardMaterial({ color: 0xe4d4b7, roughness: 0.94 })
  );
  path.position.set(0, 0.08, 7.2);
  path.receiveShadow = true;
  group.add(path);

  const lanternOffsets = [-2.9, 2.9];
  lanternOffsets.forEach((x) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.8, 8), woodMat);
    pole.position.set(x, 1.5, 5.3);
    group.add(pole);

    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), signMat);
    lamp.position.set(x, 3.05, 5.3);
    group.add(lamp);

    const light = new THREE.PointLight(0xffd88c, 0.9, 7, 2);
    light.position.set(x, 3.05, 5.3);
    group.add(light);
  });

  const pennantMat = new THREE.MeshStandardMaterial({
    color: 0xf0a8b8,
    roughness: 0.95,
    side: THREE.DoubleSide
  });
  for (let i = 0; i < 5; i++) {
    const pennant = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.8, 3), pennantMat);
    pennant.rotation.z = Math.PI;
    pennant.position.set(-1.8 + i * 0.9, 5.75 + Math.sin(i) * 0.08, 4.45);
    group.add(pennant);
  }

  placeOnSphere(group, Math.PI * 0.42, 11.2, noise2D, 0);

  return { group, interactable: doorInner };
}
