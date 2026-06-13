import * as THREE from 'three';
import { getTerrainHeight } from '../world/terrain.js';
import { NPC_DATA } from './npc-data.js';

/**
 * Create all NPCs and place them in the world
 */
export function createAllNPCs(noise2D, posts) {
  const group = new THREE.Group();
  group.name = 'npcs';
  group.userData.interactables = [];

  // Index posts by category
  const postsByCategory = {};
  posts.forEach(post => {
    const cat = post.category || '未分类';
    if (!postsByCategory[cat]) postsByCategory[cat] = [];
    postsByCategory[cat].push(post);
  });

  NPC_DATA.forEach(npcConfig => {
    const npc = createSingleNPC(npcConfig);

    // Position NPC
    const x = Math.cos(npcConfig.position.angle) * npcConfig.position.radius;
    const z = Math.sin(npcConfig.position.angle) * npcConfig.position.radius;
    const y = getTerrainHeight(noise2D, x, z);
    npc.position.set(x, Math.max(0, y), z);

    // Face toward center
    npc.lookAt(0, npc.position.y, 0);

    // Store interaction data
    const categoryPosts = postsByCategory[npcConfig.category] || [];
    npc.userData = {
      type: 'npc',
      name: npcConfig.name,
      category: npcConfig.category,
      greeting: npcConfig.greeting,
      posts: categoryPosts
    };

    group.userData.interactables.push(npc);
    group.add(npc);

    // Name label floating above
    const label = createNameLabel(npcConfig.name, npcConfig.color);
    label.position.set(x, Math.max(0, y) + 3.2, z);
    group.add(label);
  });

  return group;
}

function createSingleNPC(config) {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshToonMaterial({ color: config.color });
  const skinMat = new THREE.MeshToonMaterial({ color: 0xfdd9b5 });
  const accessoryMat = new THREE.MeshToonMaterial({ color: config.accessoryColor });

  // Head
  const headGeo = new THREE.SphereGeometry(0.35, 8, 8);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.y = 2.4;
  head.castShadow = true;
  group.add(head);

  // Body (capsule-like with cylinder)
  const bodyGeo = new THREE.CapsuleGeometry(0.35, 0.8, 4, 8);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 1.5;
  body.castShadow = true;
  group.add(body);

  // Legs
  const legGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.8, 6);
  const legMat = new THREE.MeshToonMaterial({ color: 0x2c3e50 });
  const leftLeg = new THREE.Mesh(legGeo, legMat);
  leftLeg.position.set(-0.15, 0.4, 0);
  leftLeg.castShadow = true;
  group.add(leftLeg);
  const rightLeg = new THREE.Mesh(legGeo, legMat);
  rightLeg.position.set(0.15, 0.4, 0);
  rightLeg.castShadow = true;
  group.add(rightLeg);

  // Arms
  const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.7, 6);
  const leftArm = new THREE.Mesh(armGeo, bodyMat);
  leftArm.position.set(-0.5, 1.5, 0);
  leftArm.rotation.z = 0.3;
  leftArm.castShadow = true;
  group.add(leftArm);
  const rightArm = new THREE.Mesh(armGeo, bodyMat);
  rightArm.position.set(0.5, 1.5, 0);
  rightArm.rotation.z = -0.3;
  rightArm.castShadow = true;
  group.add(rightArm);

  // Accessory based on type
  addAccessory(group, config, accessoryMat);

  // Eyes (two small dark spheres)
  const eyeGeo = new THREE.SphereGeometry(0.05, 6, 6);
  const eyeMat = new THREE.MeshToonMaterial({ color: 0x1a1a1a });
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.12, 2.45, 0.3);
  group.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.12, 2.45, 0.3);
  group.add(rightEye);

  return group;
}

function addAccessory(group, config, mat) {
  switch (config.accessory) {
    case 'dumbbell': {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6), mat);
      bar.rotation.z = Math.PI / 2;
      bar.position.set(0.7, 1.5, 0.3);
      group.add(bar);
      const w1 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), mat);
      w1.position.set(0.4, 1.5, 0.3);
      group.add(w1);
      const w2 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), mat);
      w2.position.set(1.0, 1.5, 0.3);
      group.add(w2);
      break;
    }
    case 'hat': {
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 8), mat);
      brim.position.y = 2.75;
      group.add(brim);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.3, 8), mat);
      top.position.y = 2.9;
      group.add(top);
      break;
    }
    case 'glasses': {
      const frame = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.015, 6, 8), mat);
      frame.position.set(-0.12, 2.45, 0.32);
      frame.rotation.y = Math.PI / 2;
      group.add(frame);
      const frame2 = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.015, 6, 8), mat);
      frame2.position.set(0.12, 2.45, 0.32);
      frame2.rotation.y = Math.PI / 2;
      group.add(frame2);
      break;
    }
    case 'backpack': {
      const bp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.25), mat);
      bp.position.set(0, 1.6, -0.4);
      group.add(bp);
      break;
    }
    case 'book': {
      const book = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.05), mat);
      book.position.set(0.5, 1.3, 0.2);
      book.rotation.z = 0.3;
      group.add(book);
      break;
    }
    case 'sword': {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.8, 0.02), mat);
      blade.position.set(0.55, 1.8, 0);
      blade.rotation.z = -0.5;
      group.add(blade);
      break;
    }
    case 'heart': {
      const heart = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), mat);
      heart.position.set(0, 2.8, 0.2);
      group.add(heart);
      break;
    }
    case 'phone': {
      const phone = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.25, 0.02), mat);
      phone.position.set(0.45, 1.4, 0.3);
      group.add(phone);
      break;
    }
    case 'pen': {
      const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6), mat);
      pen.position.set(0.5, 1.5, 0.2);
      pen.rotation.z = -0.8;
      group.add(pen);
      break;
    }
    case 'notebook': {
      const nb = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 0.03), mat);
      nb.position.set(-0.5, 1.3, 0.2);
      nb.rotation.z = 0.2;
      group.add(nb);
      break;
    }
    case 'wrench': {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), mat);
      w.position.set(0.5, 1.4, 0.2);
      w.rotation.z = -0.6;
      group.add(w);
      break;
    }
    case 'cup': {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.2, 8), mat);
      cup.position.set(0.45, 1.3, 0.2);
      group.add(cup);
      break;
    }
    default:
      break;
  }
}

function createNameLabel(name, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  // Background pill
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  const radius = 16;
  ctx.beginPath();
  ctx.roundRect(20, 10, canvas.width - 40, canvas.height - 20, radius);
  ctx.fill();

  // Border
  const hexColor = '#' + new THREE.Color(color).getHexString();
  ctx.strokeStyle = hexColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(20, 10, canvas.width - 40, canvas.height - 20, radius);
  ctx.stroke();

  // Text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.5, 0.625, 1);
  sprite.name = 'npc-label';
  return sprite;
}
