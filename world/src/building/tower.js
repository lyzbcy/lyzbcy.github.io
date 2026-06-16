import * as THREE from 'three';
import { placeOnSphere } from '../world/terrain.js';

/**
 * Create a signature building made entirely of display screens.
 * A cylindrical ring of large vertical screens stacked in tiers,
 * forming a tower-like structure at the north pole.
 */
export function createTower(noise2D, posts) {
  const group = new THREE.Group();
  group.name = 'tower';
  group.userData.screenFrames = [];
  group.userData.lightRings = [];

  // Posts by category (used for screen content)
  const categories = {};
  posts.forEach(post => {
    const cat = post.category || '未分类';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(post);
  });

  const allPosts = posts;
  const latestPosts = [...allPosts].sort((a, b) => {
    const da = new Date(a.date || '2025-01-01');
    const db = new Date(b.date || '2025-01-01');
    return db - da;
  }).slice(0, 12);

  // Group latest posts by topic for different screen tiers
  const techPosts = allPosts.filter(p => ['Unity开发', '工具', '学习', '微信小游戏'].includes(p.category));
  const lifePosts = allPosts.filter(p => ['生活', '写作', '星星布丁', '美食', '旅游'].includes(p.category));
  const fitnessPosts = allPosts.filter(p => ['健身'].includes(p.category));
  // Screen tiers configuration: each tier is a ring of panels
  const screenTiers = [
    {
      height: 2.0,
      radius: 3.2,
      panelCount: 8,
      panelWidth: 2.2,
      panelHeight: 1.8,
      contentSets: [
        { label: '最新文章', summary: '按最近更新时间排列，适合第一次进入这个世界时快速浏览。', posts: latestPosts.slice(0, 4) },
        { label: '热门推荐', summary: '主观精选的高代表性内容，优先体现作者的气质和兴趣。', posts: latestPosts.slice(4, 8) },
        { label: '必读精选', summary: '适合作为认识站点主人的第一批文章。', posts: latestPosts.slice(8, 12) },
        { label: '健身指南', summary: '围绕训练与补剂经验的集中入口。', posts: fitnessPosts.slice(0, 4) },
        { label: '技术分享', summary: '偏开发、工具和实践方法的内容集合。', posts: techPosts.slice(0, 4) },
        { label: '生活随笔', summary: '更柔和、偏感受层面的文章。', posts: lifePosts.slice(0, 4) },
        { label: '社会体验', summary: '来自现实世界的观察、试错和记录。', posts: allPosts.filter(p => p.category === '社会体验报告').slice(0, 4) },
        { label: '就业规划', summary: '关于选择、路径和未来节奏的资料入口。', posts: allPosts.filter(p => p.category === '就业').slice(0, 4) }
      ]
    },
    {
      height: 6.0,
      radius: 2.8,
      panelCount: 8,
      panelWidth: 2.0,
      panelHeight: 1.8,
      contentSets: [
        { label: '健身', summary: '身体管理与训练方法。', posts: categories['健身'] || [] },
        { label: 'Unity开发', summary: '项目插件、工具链与开发沉淀。', posts: categories['Unity开发'] || [] },
        { label: '美食', summary: '烟火气与个人口味地图。', posts: categories['美食'] || [] },
        { label: '旅游', summary: '攻略、路线与城市体验。', posts: categories['旅游'] || [] },
        { label: '学习', summary: '围绕方法感与长期主义的资料区。', posts: categories['学习'] || [] },
        { label: '工具', summary: '提升表达和效率的武器库。', posts: categories['工具'] || [] },
        { label: '生活', summary: '记录愿望、安排和人生气味。', posts: categories['生活'] || [] },
        { label: '星星布丁', summary: '情感、纪念和私人叙事。', posts: categories['星星布丁'] || [] }
      ]
    },
    {
      height: 10.0,
      radius: 2.4,
      panelCount: 8,
      panelWidth: 1.8,
      panelHeight: 1.8,
      contentSets: [
        { label: '微信小游戏', summary: '轻量产品实验与开发随笔。', posts: categories['微信小游戏'] || [] },
        { label: '泰拉瑞亚', summary: '兴趣世界和游玩记忆的存放处。', posts: categories['泰拉瑞亚'] || [] },
        { label: '写作', summary: '更抽象、更私人，也更慢。', posts: categories['写作'] || [] },
        { label: '周三涵', summary: '像日记一样轻的记录。', posts: categories['周三涵'] || [] },
        { label: '社会体验', summary: '现实反馈与行动实验。', posts: categories['社会体验报告'] || [] },
        { label: '就业', summary: '未来议题的思考面板。', posts: categories['就业'] || [] },
        { label: '网站制作', summary: '关于网页和表达形式的搭建记录。', posts: categories['网站制作'] || [] },
        { label: '全部文章', summary: '直接打开整个站点的档案库。', posts: allPosts }
      ]
    },
    {
      height: 14.0,
      radius: 2.0,
      panelCount: 6,
      panelWidth: 1.8,
      panelHeight: 1.8,
      contentSets: [
        { label: '捞鱼的世界', summary: '从这里抬头，你能理解整个站点为何被做成一颗可以漫游的星球。', posts: allPosts },
        { label: '自由探索', summary: '如果你不想按顺序阅读，就随意走向任何一个节点。', posts: allPosts.slice(0, 4) },
        { label: '点击查看', summary: '主塔的屏幕会把复杂内容拆成更容易进入的入口。', posts: allPosts.slice(4, 8) },
        { label: '文章链接', summary: '所有屏幕都可以直接跳到原文继续深入。', posts: allPosts.slice(8, 12) },
        { label: 'Open Archive', summary: '适合当作站点入口总览的一组文章。', posts: allPosts.slice(12, 16) },
        { label: '新窗口', summary: '在新标签中延续阅读，不打断漫游。', posts: allPosts.slice(16, 20) }
      ]
    }
  ];

  // Collect all screens for interaction
  const allScreenData = [];

  // Warm wooden frame material — cozy fairy-tale look
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0xb88454,
    roughness: 0.85,
    metalness: 0.0
  });

  // Warm stone for the tower structure / base
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xe6d8bc,
    roughness: 0.92,
    metalness: 0.02
  });

  const darkFrameMat = new THREE.MeshStandardMaterial({
    color: 0xc9b894,
    roughness: 0.9,
    metalness: 0.02
  });

  // Soft warm trim ring between tiers (subtle, not neon)
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xd4a85a,
    emissive: 0xf0c878,
    emissiveIntensity: 0.35,
    metalness: 0.3,
    roughness: 0.5
  });

  screenTiers.forEach((tier, tierIndex) => {
    const panelCount = tier.panelCount;
    const angleStep = (Math.PI * 2) / panelCount;
    const r = tier.radius;

    for (let i = 0; i < panelCount; i++) {
      const angle = i * angleStep;
      const content = tier.contentSets[i] || tier.contentSets[0];

      // Create screen canvas
      const { canvas, texture } = createScreenCanvas(
        content.label,
        content.posts || []
      );

      // Screen panel geometry — soft warm-backlit panel
      const screenGeo = new THREE.PlaneGeometry(tier.panelWidth, tier.panelHeight);
      const screenMat = new THREE.MeshStandardMaterial({
        map: texture,
        emissive: 0xfff2dc,
        emissiveIntensity: 0.28,
        emissiveMap: texture,
        roughness: 0.5
      });

      const screen = new THREE.Mesh(screenGeo, screenMat);

      // Position on the cylinder surface
      screen.position.x = Math.cos(angle) * (r + 0.01);
      screen.position.z = Math.sin(angle) * (r + 0.01);
      screen.position.y = tier.height;

      // Rotate to face outward
      screen.rotation.y = angle + Math.PI;

      screen.userData = {
        type: 'screen',
        label: content.label,
        summary: content.summary,
        posts: content.posts || [],
        canvas,
        texture
      };

      allScreenData.push(screen);
      group.add(screen);

      // Frame around each screen
      const frameThickness = 0.04;
      const frameDepth = 0.04;
      const fw = tier.panelWidth + 0.06;
      const fh = tier.panelHeight + 0.06;

      const hBarGeo = new THREE.BoxGeometry(fw, frameThickness, frameDepth);
      const vBarGeo = new THREE.BoxGeometry(frameThickness, fh, frameDepth);

      // Top bar
      const topBar = new THREE.Mesh(hBarGeo, frameMat);
      topBar.position.copy(screen.position);
      topBar.position.y += tier.panelHeight / 2 + 0.03;
      topBar.rotation.y = screen.rotation.y;
      group.userData.screenFrames.push(topBar);
      group.add(topBar);

      // Bottom bar
      const botBar = new THREE.Mesh(hBarGeo, frameMat);
      botBar.position.copy(screen.position);
      botBar.position.y -= tier.panelHeight / 2 + 0.03;
      botBar.rotation.y = screen.rotation.y;
      group.userData.screenFrames.push(botBar);
      group.add(botBar);

      // Left bar
      const leftBar = new THREE.Mesh(vBarGeo, frameMat);
      leftBar.position.copy(screen.position);
      leftBar.position.x += Math.cos(angle + Math.PI / 2) * (tier.panelWidth / 2 + 0.03);
      leftBar.position.z += Math.sin(angle + Math.PI / 2) * (tier.panelWidth / 2 + 0.03);
      leftBar.rotation.y = screen.rotation.y;
      group.userData.screenFrames.push(leftBar);
      group.add(leftBar);

      // Right bar
      const rightBar = new THREE.Mesh(vBarGeo, frameMat);
      rightBar.position.copy(screen.position);
      rightBar.position.x -= Math.cos(angle + Math.PI / 2) * (tier.panelWidth / 2 + 0.03);
      rightBar.position.z -= Math.sin(angle + Math.PI / 2) * (tier.panelWidth / 2 + 0.03);
      rightBar.rotation.y = screen.rotation.y;
      group.userData.screenFrames.push(rightBar);
      group.add(rightBar);
    }

    // Light ring between tiers
    const ringGeo = new THREE.TorusGeometry(r, 0.08, 8, panelCount);
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = tier.height + tier.panelHeight / 2 + 0.2;
    ring.rotation.x = Math.PI / 2;
    group.userData.lightRings.push(ring);
    group.add(ring);

    // Soft warm lantern lights at each panel for a gentle glow
    for (let i = 0; i < panelCount; i++) {
      const lightAngle = i * angleStep;
      const light = new THREE.PointLight(0xffd896, 0.7, 5.5, 2);
      light.position.x = Math.cos(lightAngle) * r;
      light.position.z = Math.sin(lightAngle) * r;
      light.position.y = tier.height + tier.panelHeight / 2 + 0.3;
      group.add(light);
    }
  });

  // Central stone column — gives the tower solid fairy-tale structure
  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 2.0, 16, 16),
    stoneMat
  );
  column.position.y = 8;
  column.castShadow = true;
  column.receiveShadow = true;
  group.add(column);

  // Decorative stone bands around the column at each tier
  screenTiers.forEach(tier => {
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(1.75, 0.12, 8, 20),
      darkFrameMat
    );
    band.position.y = tier.height;
    band.rotation.x = Math.PI / 2;
    group.add(band);
  });

  // Warm stone spire cap (conical roof)
  const spire = new THREE.Mesh(
    new THREE.ConeGeometry(1.9, 3.2, 12),
    new THREE.MeshStandardMaterial({ color: 0xc06a3a, roughness: 0.85 })
  );
  spire.position.y = 17.6;
  spire.castShadow = true;
  group.add(spire);

  // Roof rim trim
  const roofRim = new THREE.Mesh(
    new THREE.TorusGeometry(1.9, 0.12, 8, 20),
    darkFrameMat
  );
  roofRim.position.y = 16.0;
  roofRim.rotation.x = Math.PI / 2;
  group.add(roofRim);

  // Golden weather vane pole
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf2c978, emissive: 0xf0c878, emissiveIntensity: 0.4,
    metalness: 0.8, roughness: 0.3
  });
  const vanePole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 1.8, 8), goldMat
  );
  vanePole.position.y = 20.0;
  group.add(vanePole);

  // Compass-direction cross arms
  const armNS = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.06, 1.4), goldMat
  );
  armNS.position.y = 20.3;
  armNS.name = 'vane-arm';
  group.add(armNS);

  // Arrowhead (N) and tail fin (S) for the weather vane
  const arrowHead = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.4, 4), goldMat);
  arrowHead.rotation.x = -Math.PI / 2;
  arrowHead.position.set(0, 20.3, 0.9);
  arrowHead.name = 'vane-head';
  group.add(arrowHead);

  const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.3), goldMat);
  tailFin.position.set(0, 20.3, -0.7);
  tailFin.name = 'vane-tail';
  group.add(tailFin);

  // Golden tip ball
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), goldMat);
  tip.position.y = 21.0;
  group.add(tip);

  // A soft warm point light at the top, like a friendly beacon in daylight
  const topLight = new THREE.PointLight(0xffe6b0, 1.2, 14, 2);
  topLight.position.y = 21;
  group.add(topLight);

  // Base platform ring — warm stone steps
  const platformGeo = new THREE.TorusGeometry(3.5, 0.22, 10, 28);
  const platform = new THREE.Mesh(platformGeo, stoneMat);
  platform.rotation.x = Math.PI / 2;
  platform.position.y = 0.3;
  platform.receiveShadow = true;
  platform.castShadow = true;
  group.add(platform);

  const innerPlatform = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 2.8, 0.4, 24),
    new THREE.MeshStandardMaterial({
      color: 0xe6d8bc,
      roughness: 0.92,
      metalness: 0.02
    })
  );
  innerPlatform.position.y = 0.2;
  innerPlatform.receiveShadow = true;
  innerPlatform.castShadow = true;
  group.add(innerPlatform);

  // Place at north pole on sphere
  if (noise2D) {
    placeOnSphere(group, 0, 0, noise2D, 0);
  }

  return { group, screenData: allScreenData };
}

/**
 * Create a canvas texture for a screen panel
 */
function createScreenCanvas(label, posts) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Warm parchment background
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#fbf3df');
  gradient.addColorStop(0.55, '#f5ead0');
  gradient.addColorStop(1, '#f0e2c4');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Inner panel
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.fillRect(16, 14, canvas.width - 32, canvas.height - 28);

  // Decorative border
  ctx.strokeStyle = 'rgba(180, 130, 60, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(16, 14, canvas.width - 32, canvas.height - 28);

  // Eyebrow
  ctx.fillStyle = 'rgba(140, 95, 40, 0.7)';
  ctx.font = '10px "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('WORLD NODE', 28, 30);

  // Label
  ctx.fillStyle = '#5a3a1a';
  ctx.font = 'bold 18px "Microsoft YaHei", sans-serif';
  ctx.fillText(label, 28, 54);

  // Count
  ctx.fillStyle = 'rgba(140, 95, 40, 0.7)';
  ctx.font = '10px "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${String(posts.length).padStart(2, '0')} ARTICLES`, canvas.width - 28, 30);

  // Divider
  ctx.strokeStyle = 'rgba(180, 130, 60, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(28, 66);
  ctx.lineTo(canvas.width - 28, 66);
  ctx.stroke();

  // Article list
  ctx.textAlign = 'left';
  const maxPosts = Math.min(posts.length, 6);
  for (let i = 0; i < maxPosts; i++) {
    const y = 92 + i * 24;
    ctx.fillStyle = 'rgba(200, 140, 50, 0.9)';
    ctx.fillRect(28, y - 7, 7, 1.5);

    ctx.fillStyle = '#4a3520';
    ctx.font = '11px "Microsoft YaHei", sans-serif';
    const title = posts[i].title.length > 17
      ? posts[i].title.slice(0, 17) + '...'
      : posts[i].title;
    ctx.fillText(title, 42, y);

    ctx.fillStyle = 'rgba(120, 80, 30, 0.7)';
    ctx.font = '10px "Microsoft YaHei", sans-serif';
    ctx.fillText(posts[i].category || '未分类', 42, y + 13);
  }

  if (posts.length === 0) {
    ctx.fillStyle = 'rgba(90, 60, 30, 0.5)';
    ctx.font = '14px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('暂无文章', canvas.width / 2, canvas.height / 2);
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(180, 110, 40, 0.7)';
  ctx.font = '10px "Microsoft YaHei", sans-serif';
  ctx.fillText('Click to open archive', 28, canvas.height - 24);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  return { canvas, texture };
}
