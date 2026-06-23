/**
 * world-banner.js
 * Injects an inviting fairy-tale banner at the very top of the blog home page
 * that links into the 3D world (/world/). Runs only on the home layout.
 *
 * The banner is a warm, cheerful strip with a tiny rotating planet, a short
 * headline, and a clear "enter the world" call-to-action button. It matches
 * the world's daytime fairy-tale palette.
 */
(function () {
  'use strict';

  // Only run on the blog home page
  var isHome =
    document.body.classList.contains('home') ||
    /\/(index\.html)?$/.test(location.pathname.replace(/\/+$/, '')) &&
    !/\/(posts|archives|categories|tags|about)\//.test(location.pathname);

  // Robust check: Chirpy home layout sets <body class="...home...">
  if (!/home/.test(document.body.className || '')) {
    // On gh-pages static output the body class may differ; also accept the
    // root path with the post list present.
    var hasPostList = document.querySelector('#post-list, .post-content dl, .taxonomy-index');
    var isRootPath = /^\/(?:index\.html)?$/.test(location.pathname);
    if (!(isRootPath && hasPostList)) return;
  }

  if (document.getElementById('world-entry-banner')) return;

  /* ---------- styles ---------- */
  var css = [
    '#world-entry-banner {',
    '  position: relative;',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 18px;',
    '  flex-wrap: wrap;',
    '  width: 100%;',
    '  box-sizing: border-box;',
    '  padding: 20px clamp(16px, 5vw, 48px);',
    '  margin: 0 0 28px;',
    '  overflow: hidden;',
    '  background:',
    '    radial-gradient(circle at 12% 30%, rgba(255, 224, 150, 0.42), transparent 45%),',
    '    radial-gradient(circle at 88% 20%, rgba(143, 214, 224, 0.4), transparent 42%),',
    '    linear-gradient(120deg, #e9f6ee 0%, #dceef0 50%, #f3ead0 100%);',
    '  border-bottom: 1px solid rgba(180, 130, 60, 0.22);',
    '  box-shadow: 0 6px 24px rgba(90, 60, 20, 0.08);',
    '  color: #5a3a1a;',
    '  font-family: "Microsoft YaHei", system-ui, sans-serif;',
    '}',
    '#world-entry-banner .wb-planet {',
    '  flex: 0 0 auto;',
    '  width: 58px; height: 58px;',
    '  border-radius: 50%;',
    '  background:',
    '    radial-gradient(circle at 32% 28%, #b8e890 0%, #7fb958 16%, transparent 20%),',
    '    radial-gradient(circle at 70% 45%, #9ad06a 0%, #7fb958 14%, transparent 18%),',
    '    radial-gradient(circle at 45% 72%, #a7d76f 0%, #6fa84c 13%, transparent 17%),',
    '    radial-gradient(circle at 38% 38%, #8fd6e0, #3a9bb0 70%, #2a7a8c 100%);',
    '  box-shadow: inset -7px -7px 14px rgba(20,60,80,0.4), inset 4px 4px 10px rgba(255,255,255,0.4), 0 0 22px rgba(255,220,150,0.45);',
    '  animation: wb-spin 6s linear infinite;',
    '}',
    '@keyframes wb-spin { from{ filter: hue-rotate(0deg);} to{ filter: hue-rotate(-12deg);} }',
    '#world-entry-banner .wb-text { flex: 1 1 280px; min-width: 220px; }',
    '#world-entry-banner .wb-eyebrow {',
    '  font-size: 0.72rem; letter-spacing: 0.22em; text-transform: uppercase;',
    '  color: #a8762a; margin-bottom: 4px;',
    '}',
    '#world-entry-banner .wb-title {',
    '  font-size: clamp(1.15rem, 2.4vw, 1.5rem); font-weight: 700;',
    '  color: #4a2a10; line-height: 1.4; margin: 0;',
    '}',
    '#world-entry-banner .wb-sub {',
    '  font-size: 0.88rem; color: #6a4a28; margin-top: 4px; line-height: 1.6;',
    '}',
    '#world-entry-banner .wb-btn {',
    '  flex: 0 0 auto;',
    '  display: inline-flex; align-items: center; gap: 8px;',
    '  padding: 11px 22px; border-radius: 999px;',
    '  background: linear-gradient(180deg, #ffcf6a, #f0a830);',
    '  color: #4a2a10; font-weight: 700; font-size: 0.95rem;',
    '  text-decoration: none; white-space: nowrap;',
    '  border: 1px solid rgba(180,120,40,0.4);',
    '  box-shadow: 0 4px 14px rgba(200,140,50,0.3);',
    '  transition: transform 0.2s ease, box-shadow 0.2s ease;',
    '}',
    '#world-entry-banner .wb-btn:hover {',
    '  transform: translateY(-2px);',
    '  box-shadow: 0 7px 20px rgba(200,140,50,0.42);',
    '}',
    '#world-entry-banner .wb-btn .wb-arrow { display:inline-block; transition: transform .2s; }',
    '#world-entry-banner .wb-btn:hover .wb-arrow { transform: translateX(3px); }',
    '@media (max-width: 560px) {',
    '  #world-entry-banner { gap: 12px; padding: 16px; }',
    '  #world-entry-banner .wb-planet { width: 44px; height: 44px; }',
    '  #world-entry-banner .wb-btn { width: 100%; justify-content: center; }',
    '}'
  ].join('\n');
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  /* ---------- banner markup ---------- */
  var banner = document.createElement('div');
  banner.id = 'world-entry-banner';
  banner.innerHTML =
    '<div class="wb-planet" aria-hidden="true"></div>' +
    '<div class="wb-text">' +
      '<div class="wb-eyebrow">World Entrance</div>' +
      '<h2 class="wb-title">捞鱼的世界 · 一个可以漫游的个人网站星球</h2>' +
      '<div class="wb-sub">走进 3D 世界，在主塔屏幕上读文章，和代表各个专栏的 NPC 对话。</div>' +
    '</div>' +
    '<a class="wb-btn" href="/world/">' +
      '进入世界 <span class="wb-arrow">→</span>' +
    '</a>';

  /* ---------- insert at the very top ---------- */
  // Prefer to sit above everything, right under the top nav if present.
  var main = document.getElementById('main') || document.querySelector('main') || document.body;
  var target = document.getElementById('core-wrapper') || main;
  if (target && target.parentNode) {
    target.parentNode.insertBefore(banner, target);
  } else {
    document.body.insertBefore(banner, document.body.firstChild);
  }
})();
