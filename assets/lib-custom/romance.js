/* Romance falling animation: 布丁、星星、爱心、小狗 — only on pages tagged '恋爱' */
(function () {
  function onReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  }

  function prefersReducedMotion() {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (_) {
      return false;
    }
  }

  function createContainer() {
    var existing = document.querySelector('.romance-fall-container');
    if (existing) return existing;
    var container = document.createElement('div');
    container.className = 'romance-fall-container';
    // Inline styles so no CSS file is needed
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100vw';
    container.style.height = '100vh';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '2147483646'; // below modals/tooltips that may use max int
    container.style.overflow = 'hidden';
    document.body.appendChild(container);
    return container;
  }

  function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  function start() {
    if (!document.body) return;
    if (prefersReducedMotion()) return;

    var container = createContainer();

    // Keep it light
    var minInterval = 1000;
    var maxInterval = 1800;
    var minDuration = 6500;
    var maxDuration = 12000;
    var maxConcurrent = 14;

    // 布丁、星星、爱心、小狗
    var emojis = ['🍮', '⭐', '❤️', '🐶'];

    function spawn() {
      if (!container.isConnected) return;
      // Cap number of active items
      if (container.childElementCount >= maxConcurrent) {
        var nextInCap = randomBetween(minInterval, maxInterval);
        setTimeout(spawn, nextInCap);
        return;
      }

      var el = document.createElement('div');
      var emoji = emojis[Math.floor(Math.random() * emojis.length)];
      el.textContent = emoji;

      // Inline styles for each falling emoji
      el.style.position = 'absolute';
      el.style.top = '-10vh';
      el.style.left = '0'; // will set via transform X
      el.style.willChange = 'transform, opacity';
      el.style.pointerEvents = 'none';
      el.style.userSelect = 'none';
      el.style.lineHeight = '1';
      el.style.transform = 'translateY(-8vh) translateX(0)';
      el.style.filter = 'drop-shadow(0 2px 2px rgba(0,0,0,0.12))';

      var startLeft = Math.random() * 100; // vw
      var sizePx = randomBetween(18, 28); // keep small and subtle
      // Make hearts a touch larger for visibility
      if (emoji === '❤️') sizePx = randomBetween(22, 32);
      el.style.fontSize = sizePx + 'px';

      var sizeScale = randomBetween(0.9, 1.25);
      var duration = randomBetween(minDuration, maxDuration);
      var drift = randomBetween(-28, 28); // px
      var rotateBase = randomBetween(-20, 20); // deg
      var freq = randomBetween(0.8, 1.2) * Math.PI; // gentle sway

      el.style.left = startLeft + 'vw';
      el.style.transform = 'translateY(-8vh) translateX(0) rotate(' + rotateBase + 'deg) scale(' + sizeScale + ')';

      container.appendChild(el);

      var startAt = performance.now();
      var endY = window.innerHeight + 48;
      var startX = 0;

      function frame(now) {
        var t = Math.min(1, (now - startAt) / duration);
        var ease = 1 - Math.pow(1 - t, 3); // easeOutCubic
        var y = -48 + ease * (endY + 48);
        var x = startX + Math.sin(ease * freq) * drift;
        el.style.transform = 'translateY(' + y + 'px) translateX(' + x + 'px) rotate(' + (rotateBase + ease * 90) + 'deg) scale(' + sizeScale + ')';
        el.style.opacity = String(1 - t * 0.3);
        if (t < 1) {
          requestAnimationFrame(frame);
        } else {
          el.remove();
        }
      }

      requestAnimationFrame(frame);

      var nextIn = randomBetween(minInterval, maxInterval);
      setTimeout(spawn, nextIn);
    }

    // initial small burst
    for (var i = 0; i < 3; i += 1) {
      (function (delay) {
        setTimeout(spawn, delay);
      })(i * 180);
    }
    setTimeout(spawn, 1000);
  }

  onReady(start);
})();

