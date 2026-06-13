import * as THREE from 'three';
import { placeOnSphere } from '../world/terrain.js';
import { NPC_DATA } from './npc-data.js';
import { generateNPCSprite } from './npc-sprites.js';

/**
 * Create all NPCs and place them on the spherical world
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

    // Place on sphere using angle and radius from config
    const angle = npcConfig.position.angle;
    const distFromPole = npcConfig.position.radius;
    placeOnSphere(npc, angle, distFromPole, noise2D, 0);

    // Make NPC face toward the north pole (toward the tower)
    const pos = npc.position.clone();
    const normal = pos.clone().normalize();

    // Forward direction: tangent toward north pole
    const northPole = new THREE.Vector3(0, 1, 0);
    const forward = northPole.clone()
      .sub(normal.clone().multiplyScalar(northPole.dot(normal)))
      .normalize();

    // If near the pole, pick an arbitrary forward
    if (forward.length() < 0.1) {
      forward.set(0, 0, -1);
    }

    const right = new THREE.Vector3().crossVectors(forward, normal).normalize();
    const correctedForward = new THREE.Vector3().crossVectors(normal, right).normalize();

    const lookMat = new THREE.Matrix4().makeBasis(right, normal, correctedForward);
    npc.quaternion.setFromRotationMatrix(lookMat);

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
    label.position.set(0, 3.5, 0);
    npc.add(label);
  });

  return group;
}

/**
 * Create a single NPC as a Sprite with 2D illustration
 */
function createSingleNPC(config) {
  const group = new THREE.Group();

  // Generate sprite texture
  const spriteTexture = generateNPCSprite(config);

  // Main character sprite
  const spriteMat = new THREE.SpriteMaterial({
    map: spriteTexture,
    transparent: true,
    depthWrite: false,
    sizeAttenuation: true
  });

  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(3, 3, 1);
  sprite.position.y = 1.5;
  sprite.name = 'npc-sprite';
  group.add(sprite);

  return group;
}

/**
 * Create a floating name label above the NPC
 */
function createNameLabel(name, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  // Background pill
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
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
