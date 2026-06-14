/* Tech Effects - Apple Style & Romance Mode (Optimized) */

document.addEventListener('DOMContentLoaded', function() {
    // 0. Check for Romance Mode
    var isRomance = window.isRomance || false;
    if (isRomance) {
        document.body.classList.add('romance-mode');
    }

    // 1. 粒子背景已由 CSS 星空 (css-starfield.css) 替代全局效果
    //    Three.js 宇宙粒子仅在 AR 页面按需加载

    // 1.5 Spotlight Effect
    var spotlight = document.createElement('div');
    spotlight.id = 'cursor-spotlight';
    document.body.appendChild(spotlight);

    document.addEventListener('mousemove', function(e) {
        spotlight.style.left = e.clientX + 'px';
        spotlight.style.top = e.clientY + 'px';
        spotlight.style.opacity = '1';
    });

    document.addEventListener('mouseleave', function() {
        spotlight.style.opacity = '0';
    });

    // 2. Parallax Background Effect (Apple Style)
    // rAF 节流：避免每帧都触发布局计算
    var parallaxRafPending = false;
    document.addEventListener('mousemove', function(e) {
        if (parallaxRafPending) return;
        parallaxRafPending = true;

        requestAnimationFrame(function() {
            parallaxRafPending = false;
            var x = e.clientX / window.innerWidth;
            var y = e.clientY / window.innerHeight;

            // CSS 星空伪元素通过 body data 属性传递鼠标位置（可选）
            // 不再直接操作 particles 容器的 transform
        });
    });

    // 3. Typing Effect - 延迟启动（requestIdleCallback 或 setTimeout 降级）
    function startTypingEffect() {
        var taglineElement = document.querySelector('.site-subtitle') || document.querySelector('#subtitle') || document.querySelector('p.tagline');
        if (!taglineElement) return;

        var text = taglineElement.innerText;
        if (!text) return;

        taglineElement.innerText = '';
        var i = 0;
        var speed = 80;

        function typeWriter() {
            if (i < text.length) {
                taglineElement.innerText += text.charAt(i);
                i++;
                setTimeout(typeWriter, speed);
            }
        }
        typeWriter();
    }

    // 使用 requestIdleCallback 延迟启动，避免阻塞首屏渲染
    if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(startTypingEffect, { timeout: 2000 });
    } else {
        setTimeout(startTypingEffect, 300);
    }

    // 4. Footer Stats
    var footer = document.querySelector('footer');
    if (footer && !document.getElementById('tech-stats')) {
        var statsDiv = document.createElement('div');
        statsDiv.id = 'tech-stats';
        footer.appendChild(statsDiv);
        var startDate = new Date("2023-01-01");
        
        function updateUptime() {
            var now = new Date();
            var diff = now - startDate;
            var days = Math.floor(diff / (1000 * 60 * 60 * 24));
            statsDiv.innerHTML = "Running for " + days + " days";
        }
        updateUptime();
    }
});
