import * as THREE from 'three';
import { placeOnSphere } from '../world/terrain.js';
import { NPC_DATA } from './npc-data.js';
import { withLife } from './npc-life-data.js';
import { generateNPCSprite } from './npc-sprites.js';
import { buildNPC3D } from './npc-3d-builder.js';

// Merge life data (personality, schedule, home, face) onto each NPC
const NPC_DATA_WITH_LIFE = withLife(NPC_DATA);

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

  NPC_DATA_WITH_LIFE.forEach(npcConfig => {
    const npc = createSingleNPC(npcConfig);

    // Place on sphere using angle and radius from config
    const angle = npcConfig.position.angle;
    const distFromPole = npcConfig.position.radius;
    placeOnSphere(npc, angle, distFromPole, noise2D, 0);

    // Face outward in a pleasant default stance (life system will adjust)
    const pos = npc.position.clone();
    const normal = pos.clone().normalize();
    const northPole = new THREE.Vector3(0, 1, 0);
    let forward = northPole.clone()
      .sub(normal.clone().multiplyScalar(northPole.dot(normal)));
    if (forward.length() < 0.1) forward = new THREE.Vector3(0, 0, -1);
    forward.normalize();

    const right = new THREE.Vector3().crossVectors(forward, normal).normalize();
    const correctedForward = new THREE.Vector3().crossVectors(normal, right).normalize();
    const lookMat = new THREE.Matrix4().makeBasis(right, normal, correctedForward);
    npc.quaternion.setFromRotationMatrix(lookMat);

    // Store interaction + life data
    const categoryPosts = postsByCategory[npcConfig.category] || [];
    npc.userData = {
      type: 'npc',
      name: npcConfig.name,
      category: npcConfig.category,
      greeting: npcConfig.greeting,
      posts: categoryPosts,
      personality: npcConfig.personality,
      homeType: npcConfig.homeType,
      schedule: npcConfig.schedule,
      position: { ...npcConfig.position }
    };

    group.userData.interactables.push(npc);
    group.add(npc);

    // Name label floating above
    const label = createNameLabel(npcConfig.name, npcConfig.color);
    label.position.set(0, 3.5, 0);
    npc.add(label);
  });

  // Expose the life-merged data so scenery can be built from it
  group.userData.npcData = NPC_DATA_WITH_LIFE;

  return group;
}

/**
 * Create a single NPC as a Sprite with 2D illustration or sticker image.
 */
function createSingleNPC(config) {
  const group = new THREE.Group();

  // 3D 化：除星星布丁/周三涵（保留原2D精灵+表情包）外，其余用程序生成3D独特体型
  const keep2D = (config.name==='星星布丁' || config.name==='周三涵' || config.face==='image');
  let used3D = false;
  if(!keep2D && config.accessory && config.accessory!=='none' && config.accessory!=='heart'){
    try{
      const npc3d = buildNPC3D(config);
      npc3d.name = 'npc-3d';
      npc3d.position.y = 0;
      npc3d.userData.is3D = true;
      npc3d.userData.baseY = 0;
      group.add(npc3d);
      used3D = true;
    }catch(e){ console.warn('[npc] 3D build failed, fallback 2D:', config.name, e); }
  }

  const spriteMat = used3D ? new THREE.SpriteMaterial({transparent:true, opacity:0}) : new THREE.SpriteMaterial({
    map: null,
    transparent: true,
    depthWrite: false,
    sizeAttenuation: true
  });

  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(used3D ? 0.1 : 3.5, used3D ? 0.1 : 3.5, 1);
  sprite.position.y = 1.5;
  sprite.name = 'npc-sprite';
  group.add(sprite);

  // Load the face texture（3D模式跳过，用占位 sprite）
  if(!used3D){
    if (config.face === 'image' && config.faceImage) {
    const loader = new THREE.TextureLoader();
    loader.load(
      config.faceImage,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        sprite.material.map = tex;
        sprite.material.needsUpdate = true;
      }
    );
  } else {
    sprite.material.map = generateNPCSprite(config);
    sprite.material.needsUpdate = true;
  }
  } // end if(!used3D)

  // === Fairy-tale base props (warm, not neon) ===
  const propColor = new THREE.Color(config.color);

  // Soft themed ground ring (subtle, matte)
  const platform = new THREE.Mesh(
    new THREE.RingGeometry(0.85, 1.35, 20),
    new THREE.MeshStandardMaterial({
      color: propColor,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      roughness: 0.9
    })
  );
  platform.rotation.x = -Math.PI / 2;
  platform.position.y = 0.05;
  group.add(platform);

  // Two warm lamp posts flanking the NPC
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x3d4a40, roughness: 0.55, metalness: 0.4 });
  for (let side = -1; side <= 1; side += 2) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.3, 6), lampMat);
    post.position.set(side * 1.2, 0.65, 0);
    post.castShadow = true;
    group.add(post);

    const lantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 10, 10),
      new THREE.MeshStandardMaterial({
        color: 0xfff0c0, emissive: 0xffd070, emissiveIntensity: 1.2
      })
    );
    lantern.position.set(side * 1.2, 1.4, 0);
    group.add(lantern);
  }

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

  // Warm cream pill background
  ctx.fillStyle = 'rgba(255, 248, 230, 0.92)';
  const radius = 16;
  ctx.beginPath();
  ctx.roundRect(20, 10, canvas.width - 40, canvas.height - 20, radius);
  ctx.fill();

  // Theme-colored border
  const hexColor = '#' + new THREE.Color(color).getHexString();
  ctx.strokeStyle = hexColor;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(20, 10, canvas.width - 40, canvas.height - 20, radius);
  ctx.stroke();

  // Text (warm brown)
  ctx.fillStyle = '#5a3a1a';
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
