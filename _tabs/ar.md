---
# AR 体验入口页
icon: fas fa-vr-cardboard
order: 7
---

<style>
.ar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  padding: 20px 0;
}
.ar-card {
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  padding: 32px 28px;
  text-decoration: none !important;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  border: 1px solid rgba(255,255,255,0.1);
  min-height: 220px;
}
.ar-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  text-decoration: none !important;
}
.ar-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  opacity: 0.15;
  z-index: 0;
  border-radius: 20px;
}
.ar-card > * { position: relative; z-index: 1; }

/* 各卡片主题色 */
.ar-card.face::before { background: linear-gradient(135deg, #667eea, #764ba2); }
.ar-card.face { background: linear-gradient(135deg, rgba(102,126,234,0.15), rgba(118,75,162,0.1)); }
.ar-card.face:hover { border-color: rgba(102,126,234,0.5); }

.ar-card.flower::before { background: linear-gradient(135deg, #f093fb, #f5576c); }
.ar-card.flower { background: linear-gradient(135deg, rgba(240,147,251,0.15), rgba(245,87,108,0.1)); }
.ar-card.flower:hover { border-color: rgba(240,147,251,0.5); }

.ar-card.gesture::before { background: linear-gradient(135deg, #4facfe, #00f2fe); }
.ar-card.gesture { background: linear-gradient(135deg, rgba(79,172,254,0.15), rgba(0,242,254,0.1)); }
.ar-card.gesture:hover { border-color: rgba(79,172,254,0.5); }

.ar-card.fitness::before { background: linear-gradient(135deg, #43e97b, #38f9d7); }
.ar-card.fitness { background: linear-gradient(135deg, rgba(67,233,123,0.15), rgba(56,249,215,0.1)); }
.ar-card.fitness:hover { border-color: rgba(67,233,123,0.5); }

.ar-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  display: block;
}
.ar-title {
  font-size: 1.4rem;
  font-weight: 700;
  margin-bottom: 8px;
  letter-spacing: -0.02em;
}
.ar-desc {
  font-size: 0.9rem;
  opacity: 0.7;
  line-height: 1.5;
  flex-grow: 1;
}
.ar-badge {
  display: inline-block;
  margin-top: 16px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  background: rgba(255,255,255,0.1);
  backdrop-filter: blur(10px);
}
.ar-hero {
  text-align: center;
  padding: 40px 20px 20px;
}
.ar-hero h1 {
  font-size: 2.2rem;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea, #f093fb, #4facfe, #43e97b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 12px;
}
.ar-hero p {
  font-size: 1.05rem;
  opacity: 0.6;
  max-width: 500px;
  margin: 0 auto;
}
.ar-note {
  text-align: center;
  padding: 20px;
  font-size: 0.85rem;
  opacity: 0.5;
}
</style>

<div class="ar-hero">
  <h1>AR 体验工坊</h1>
  <p>基于 MediaPipe + Three.js 的浏览器端增强现实应用，无需安装任何插件，打开摄像头即可体验</p>
</div>

<div class="ar-grid">
  <a href="{{ '/ar/face-deform.html' | relative_url }}" class="ar-card face">
    <span class="ar-icon">🫠</span>
    <div class="ar-title">捏脸 AR</div>
    <div class="ar-desc">实时人脸追踪与形变，拖拽屏幕即可捏脸。基于 468 个面部关键点的精准网格渲染。</div>
    <span class="ar-badge">Face Mesh</span>
  </a>

  <a href="{{ '/ar/hand-flower.html' | relative_url }}" class="ar-card flower">
    <span class="ar-icon">🌸</span>
    <div class="ar-title">手势生花</div>
    <div class="ar-desc">手指掠过之处绽放花海。实时手部追踪，食指指尖生成 3D 花朵，营造梦幻花海效果。</div>
    <span class="ar-badge">Hands Tracking</span>
  </a>

  <a href="{{ '/ar/gesture-game.html' | relative_url }}" class="ar-card gesture">
    <span class="ar-icon">✋</span>
    <div class="ar-title">手势魔法</div>
    <div class="ar-desc">用手势释放粒子魔法！拳头爆炸、张开手掌释放星尘、食指指向发射光束。</div>
    <span class="ar-badge">Gesture Recognition</span>
  </a>

  <a href="{{ '/ar/fitness-coach.html' | relative_url }}" class="ar-card fitness">
    <span class="ar-icon">🏋️</span>
    <div class="ar-title">AI 健身教练</div>
    <div class="ar-desc">视觉识别你的运动姿态，实时计算关节角度，判定动作是否标准，给出健身指导。</div>
    <span class="ar-badge">Pose Detection</span>
  </a>
</div>

<p class="ar-note">⚠️ 请使用 Chrome / Edge 浏览器，并允许摄像头访问权限以获得最佳体验</p>
