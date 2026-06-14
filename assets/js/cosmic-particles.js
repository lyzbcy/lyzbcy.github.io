/**
 * Cosmic Particle Background - Three.js GPU Particle System (Optimized)
 * 仅在 AR 页面按需加载，具备完整生命周期管理
 * - IntersectionObserver：canvas 离开视口时暂停 rAF
 * - visibilitychange：标签页隐藏时暂停
 * - resize debounce：防止频繁重建
 * - 清理方法：window._cosmicParticlesCleanup()
 */
(function () {
  'use strict';

  function init() {
    if (typeof THREE === 'undefined') {
      console.warn('[CosmicParticles] Three.js not loaded, skipping.');
      return;
    }

    // === 设备性能检测（降低粒子数上限） ===
    var cores = navigator.hardwareConcurrency || 4;
    var isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
    var PARTICLE_COUNT;
    if (isMobile) {
      PARTICLE_COUNT = cores >= 8 ? 8000 : 5000;
    } else {
      PARTICLE_COUNT = cores >= 8 ? 25000 : cores >= 4 ? 15000 : 8000;
    }

    // === 创建 canvas 容器 ===
    var container = document.createElement('div');
    container.id = 'cosmic-particles';
    container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;overflow:hidden;';
    document.body.prepend(container);

    // === Three.js 初始化 ===
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 1;

    var renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // === 粒子数据 ===
    var positions = new Float32Array(PARTICLE_COUNT * 3);
    var velocities = new Float32Array(PARTICLE_COUNT * 3);
    var sizes = new Float32Array(PARTICLE_COUNT);
    var colors = new Float32Array(PARTICLE_COUNT * 3);
    var phases = new Float32Array(PARTICLE_COUNT);

    var palette = [
      [0.40, 0.60, 1.00], [0.60, 0.40, 1.00], [0.30, 0.80, 1.00],
      [1.00, 0.85, 0.60], [1.00, 0.50, 0.70], [0.90, 0.90, 1.00], [0.50, 0.90, 0.80]
    ];

    for (var i = 0; i < PARTICLE_COUNT; i++) {
      var i3 = i * 3;
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.acos(2 * Math.random() - 1);
      var r = Math.pow(Math.random(), 0.5) * 2.0;

      positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.4;
      positions[i3 + 2] = r * Math.cos(phi) - 1.0;

      var speed = 0.01 + Math.random() * 0.03;
      velocities[i3] = -Math.sin(theta) * speed + (Math.random() - 0.5) * 0.005;
      velocities[i3 + 1] = (Math.random() - 0.3) * 0.008;
      velocities[i3 + 2] = Math.cos(theta) * speed * 0.5 + (Math.random() - 0.5) * 0.005;

      sizes[i] = Math.random() < 0.05 ? 3.0 + Math.random() * 4.0 : 0.5 + Math.random() * 2.0;

      var c = palette[Math.floor(Math.random() * palette.length)];
      var brightness = 0.6 + Math.random() * 0.4;
      colors[i3] = c[0] * brightness;
      colors[i3 + 1] = c[1] * brightness;
      colors[i3 + 2] = c[2] * brightness;

      phases[i] = Math.random() * Math.PI * 2;
    }

    // === 着色器 ===
    var vertexShader = [
      'attribute float aSize;',
      'attribute vec3 aColor;',
      'attribute float aPhase;',
      'uniform float uTime;',
      'uniform float uPixelRatio;',
      'varying vec3 vColor;',
      'varying float vAlpha;',
      '',
      'void main() {',
      '  vColor = aColor;',
      '  float pulse = 0.7 + 0.3 * sin(uTime * 0.8 + aPhase);',
      '  vAlpha = pulse;',
      '  float twinkle = step(0.92, sin(uTime * 3.0 + aPhase * 10.0));',
      '  vAlpha += twinkle * 0.5;',
      '  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);',
      '  gl_Position = projectionMatrix * mvPosition;',
      '  gl_PointSize = aSize * pulse * uPixelRatio * (300.0 / -mvPosition.z);',
      '  gl_PointSize = max(gl_PointSize, 0.5);',
      '}'
    ].join('\n');

    var fragmentShader = [
      'varying vec3 vColor;',
      'varying float vAlpha;',
      '',
      'void main() {',
      '  vec2 center = gl_PointCoord - 0.5;',
      '  float dist = length(center);',
      '  if (dist > 0.5) discard;',
      '  float alpha = smoothstep(0.5, 0.0, dist) * vAlpha;',
      '  float core = smoothstep(0.15, 0.0, dist) * 0.5;',
      '  vec3 finalColor = vColor + vec3(core);',
      '  gl_FragColor = vec4(finalColor, alpha * 0.8);',
      '}'
    ].join('\n');

    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    var material = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false
    });

    var particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // === 生命周期控制 ===
    var clock = new THREE.Clock();
    var rafId = null;
    var isVisible = true;       // visibilitychange
    var isInViewport = true;    // IntersectionObserver
    var frameCount = 0;
    var destroyed = false;

    function shouldAnimate() {
      return isVisible && isInViewport && !destroyed;
    }

    function animate() {
      if (destroyed) return;
      rafId = requestAnimationFrame(animate);

      if (!shouldAnimate()) return;

      var elapsed = clock.getElapsedTime();
      material.uniforms.uTime.value = elapsed;

      particles.rotation.y = elapsed * 0.02;
      particles.rotation.x = Math.sin(elapsed * 0.01) * 0.05;

      var posAttr = geometry.attributes.position;
      var posArray = posAttr.array;

      // 每 2 帧更新一次位置（减少 CPU 开销）
      frameCount++;
      if (frameCount % 2 === 0) {
        for (var i = 0; i < PARTICLE_COUNT; i++) {
          var i3 = i * 3;
          posArray[i3] += velocities[i3] * 0.3;
          posArray[i3 + 1] += velocities[i3 + 1] * 0.3;
          posArray[i3 + 2] += velocities[i3 + 2] * 0.3;

          var x = posArray[i3], y = posArray[i3 + 1], z = posArray[i3 + 2];
          if (x * x + y * y + z * z > 6.0) {
            var theta = Math.random() * Math.PI * 2;
            var r2 = Math.pow(Math.random(), 0.5) * 0.3;
            posArray[i3] = r2 * Math.cos(theta);
            posArray[i3 + 1] = (Math.random() - 0.5) * 0.2;
            posArray[i3 + 2] = r2 * Math.sin(theta) - 1.0;
          }
        }
        posAttr.needsUpdate = true;
      }

      renderer.render(scene, camera);
    }

    animate();

    // === IntersectionObserver：canvas 不在视口时暂停 ===
    var observer = null;
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(function (entries) {
        isInViewport = entries[0].isIntersecting;
        if (isInViewport) clock.getDelta(); // 重置 delta 防止跳帧
      }, { threshold: 0.01 });
      observer.observe(container);
    }

    // === visibilitychange：标签页隐藏时暂停 ===
    function onVisibilityChange() {
      isVisible = !document.hidden;
      if (isVisible) clock.getDelta();
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

    // === resize debounce（200ms） ===
    var resizeTimer = null;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (destroyed) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
      }, 200);
    }
    window.addEventListener('resize', onResize);

    // === 清理方法 ===
    window._cosmicParticlesCleanup = function () {
      destroyed = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (observer) observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('resize', onResize);
      clearTimeout(resizeTimer);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (container.parentNode) container.parentNode.removeChild(container);
      console.log('[CosmicParticles] Cleaned up');
    };

    console.log('[CosmicParticles] Initialized with ' + PARTICLE_COUNT + ' particles (AR page only)');
  }

  // 等待 DOM 和 Three.js 就绪
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    requestAnimationFrame(init);
  }
})();
