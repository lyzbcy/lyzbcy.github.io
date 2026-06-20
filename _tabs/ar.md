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

.ar-card.rescue::before { background: linear-gradient(135deg, #ffdf8c, #7bd5ff, #b99df2); }
.ar-card.rescue { background: linear-gradient(135deg, rgba(255,223,140,0.2), rgba(123,213,255,0.12), rgba(185,157,242,0.12)); }
.ar-card.rescue:hover { border-color: rgba(255,223,140,0.62); }
.ar-card.featured {
  grid-column: 1 / -1;
  min-height: 260px;
  border-color: rgba(255,223,140,0.32);
}
.ar-card.featured .ar-title {
  font-size: 1.8rem;
}
.ar-card.featured .ar-desc {
  max-width: 760px;
  font-size: 1rem;
}

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
  <a href="{{ '/ar/star-rescue.html' | relative_url }}" class="ar-card rescue featured">
    <span class="ar-icon">🌟</span>
    <div class="ar-title">星愿救援局</div>
    <div class="ar-desc">主打原创 AR 游戏：摄像头识别手指，把现实画面变成救援现场。玩家用手指救回发光星星、躲开污染云、冲击连击评级，完整覆盖“实物、虚拟物体、交互方式、手机/平板端实现”的作业要求。</div>
    <span class="ar-badge">Featured · Hand AI · AR Game</span>
  </a>

  <a href="{{ '/ar/face-deform.html' | relative_url }}" class="ar-card face">
    <span class="ar-icon">🫠</span>
    <div class="ar-title">幻镜变形屋</div>
    <div class="ar-desc">实时人脸追踪与童话镜屋形变，展示基于面部关键点的可控虚实叠加。</div>
    <span class="ar-badge">Face Mesh</span>
  </a>

  <a href="{{ '/ar/hand-flower.html' | relative_url }}" class="ar-card flower">
    <span class="ar-icon">🌸</span>
    <div class="ar-title">掌心花园</div>
    <div class="ar-desc">用手势在身体区域唤出水彩花园，偏治愈和美术展示。</div>
    <span class="ar-badge">Hands Tracking</span>
  </a>

  <a href="{{ '/ar/gesture-game.html' | relative_url }}" class="ar-card gesture">
    <span class="ar-icon">✋</span>
    <div class="ar-title">咒语试炼机</div>
    <div class="ar-desc">用手指组合触发不同咒语，把手势识别包装成可演示的魔法试炼。</div>
    <span class="ar-badge">Gesture Recognition</span>
  </a>

  <a href="{{ '/ar/fitness-coach.html' | relative_url }}" class="ar-card fitness">
    <span class="ar-icon">🏋️</span>
    <div class="ar-title">动作教练台</div>
    <div class="ar-desc">视觉识别运动姿态，实时计算关节角度，强调“解决常见痛点”的实用型 AR。</div>
    <span class="ar-badge">Pose Detection</span>
  </a>
</div>

<p class="ar-note">⚠️ 请使用 Chrome / Edge 浏览器，并允许摄像头访问权限以获得最佳体验</p>
