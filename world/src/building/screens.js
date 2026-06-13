import * as THREE from 'three';

/**
 * Create display screens on the tower showing article lists.
 * Screens are added as children of the tower group so they inherit its transform.
 */
export function createScreens(posts, towerGroup) {
  const group = new THREE.Group();
  group.name = 'screens';
  group.userData.interactables = [];

  // Group posts by category
  const categories = {};
  posts.forEach(post => {
    const cat = post.category || '未分类';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(post);
  });

  // Create 4 screens facing different directions on the tower
  const screenConfigs = [
    { rotY: 0, x: 0, z: 3.05, label: '最新文章', posts: posts.slice(0, 6) },
    { rotY: Math.PI / 2, x: 3.05, z: 0, label: '热门推荐', posts: posts.slice(6, 12) },
    { rotY: Math.PI, x: 0, z: -3.05, label: '技术文章', posts: posts.filter(p => ['Unity开发', '工具', '学习'].includes(p.category)).slice(0, 6) },
    { rotY: -Math.PI / 2, x: -3.05, z: 0, label: '生活随笔', posts: posts.filter(p => ['生活', '写作', '星星布丁', '旅游'].includes(p.category)).slice(0, 6) }
  ];

  screenConfigs.forEach((config) => {
    const { canvas, texture } = createScreenCanvas(config.label, config.posts);
    const screenGeo = new THREE.PlaneGeometry(4, 3);
    const screenMat = new THREE.MeshStandardMaterial({
      map: texture,
      emissive: 0x222244,
      emissiveIntensity: 0.3,
      emissiveMap: texture
    });

    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(config.x, 5, config.z);
    screen.rotation.y = config.rotY;
    screen.userData = {
      type: 'screen',
      label: config.label,
      posts: config.posts,
      canvas,
      texture
    };
    group.userData.interactables.push(screen);
    group.add(screen);

    // Glowing frame around screen
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x4fc3f7,
      emissive: 0x4fc3f7,
      emissiveIntensity: 1.2
    });

    const frameThickness = 0.06;
    const frameDepth = 0.05;

    const hBar = new THREE.BoxGeometry(4.1, frameThickness, frameDepth);
    const vBar = new THREE.BoxGeometry(frameThickness, 3.1, frameDepth);

    // Top bar
    const top = new THREE.Mesh(hBar, frameMat);
    top.position.set(config.x, 6.52, config.z);
    top.rotation.y = config.rotY;
    group.add(top);

    // Bottom bar
    const bottom = new THREE.Mesh(hBar, frameMat);
    bottom.position.set(config.x, 3.48, config.z);
    bottom.rotation.y = config.rotY;
    group.add(bottom);

    // Left bar
    const left = new THREE.Mesh(vBar, frameMat);
    left.position.set(config.x, 5, config.z);
    left.rotation.y = config.rotY;
    left.position.x += Math.cos(config.rotY + Math.PI / 2) * 2.03;
    left.position.z += Math.sin(config.rotY + Math.PI / 2) * 2.03;
    group.add(left);

    // Right bar
    const right = new THREE.Mesh(vBar, frameMat);
    right.position.set(config.x, 5, config.z);
    right.rotation.y = config.rotY;
    right.position.x -= Math.cos(config.rotY + Math.PI / 2) * 2.03;
    right.position.z -= Math.sin(config.rotY + Math.PI / 2) * 2.03;
    group.add(right);
  });

  // Add screens as children of the tower so they inherit its spherical placement
  if (towerGroup) {
    towerGroup.add(group);
  }

  return group;
}

function createScreenCanvas(label, posts) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');

  // Background
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#0a0a2e');
  gradient.addColorStop(1, '#1a1a3e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Scanline effect
  ctx.strokeStyle = 'rgba(79, 195, 247, 0.03)';
  for (let y = 0; y < canvas.height; y += 3) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Title
  ctx.fillStyle = '#4fc3f7';
  ctx.font = 'bold 28px "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, canvas.width / 2, 45);

  // Separator line
  ctx.strokeStyle = '#4fc3f7';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 60);
  ctx.lineTo(canvas.width - 40, 60);
  ctx.stroke();

  // Article list
  ctx.textAlign = 'left';
  ctx.font = '18px "Microsoft YaHei", sans-serif';

  posts.forEach((post, i) => {
    const y = 90 + i * 45;
    if (y > canvas.height - 30) return;

    // Bullet point
    ctx.fillStyle = '#4fc3f7';
    ctx.beginPath();
    ctx.arc(50, y - 5, 4, 0, Math.PI * 2);
    ctx.fill();

    // Title text
    ctx.fillStyle = '#e0e0e0';
    const title = post.title.length > 22 ? post.title.slice(0, 22) + '...' : post.title;
    ctx.fillText(title, 65, y);

    // Date
    ctx.fillStyle = '#666';
    ctx.font = '13px "Microsoft YaHei", sans-serif';
    ctx.fillText(post.date || '', 65, y + 18);
    ctx.font = '18px "Microsoft YaHei", sans-serif';
  });

  // No posts message
  if (posts.length === 0) {
    ctx.fillStyle = '#666';
    ctx.font = '20px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('暂无文章', canvas.width / 2, canvas.height / 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  return { canvas, texture };
}
