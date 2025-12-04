/* Tech Effects - Apple Style & Romance Mode */

document.addEventListener('DOMContentLoaded', function() {
    // 0. Check for Romance Mode
    var isRomance = window.isRomance || false;
    if (isRomance) {
        document.body.classList.add('romance-mode');
    }

    // 1. Initialize Particles.js with Conditional Config
    if (!document.getElementById('particles-js')) {
        var particlesDiv = document.createElement('div');
        particlesDiv.id = 'particles-js';
        document.body.prepend(particlesDiv);
    }

    if (typeof particlesJS !== 'undefined') {
        var particleColor = isRomance ? ["#ff69b4", "#ffb6c1", "#ffffff"] : ["#a1c4fd", "#c2e9fb", "#e0e0e0"];
        var particleShape = isRomance ? "heart" : "circle"; // Particles.js might not support heart natively without SVG, fallback to circle if needed
        // Actually particles.js supports "circle", "edge", "triangle", "polygon", "star", "image". 
        // For heart we need "image" or just use circles with pink colors for simplicity first.
        // Let's stick to circles for stability but use pink colors.

        particlesJS('particles-js', {
            "particles": {
                "number": { "value": 25, "density": { "enable": true, "value_area": 800 } },
                "color": { "value": particleColor },
                "shape": { "type": "circle" }, // Keep simple for now
                "opacity": { "value": 0.4, "random": true },
                "size": { "value": isRomance ? 6 : 40, "random": true }, // Smaller hearts/dots or big bubbles
                "line_linked": { "enable": false },
                "move": { 
                    "enable": true, 
                    "speed": 1, 
                    "direction": "top", 
                    "random": true, 
                    "straight": false, 
                    "out_mode": "out", 
                    "bounce": false,
                    "attract": { "enable": true, "rotateX": 600, "rotateY": 1200 } // Slight attraction
                }
            },
            "interactivity": {
                "detect_on": "window",
                "events": {
                    "onhover": { "enable": true, "mode": "bubble" }, // Interaction!
                    "onclick": { "enable": true, "mode": "push" },
                    "resize": true
                },
                "modes": {
                    "bubble": { "distance": 200, "size": 10, "duration": 2, "opacity": 0.8, "speed": 3 },
                    "repulse": { "distance": 200, "duration": 0.4 }
                }
            },
            "retina_detect": true
        });
    }

    // 2. Parallax Background Effect (Apple Style)
    // Move the background slightly based on mouse position
    document.addEventListener('mousemove', function(e) {
        var x = e.clientX / window.innerWidth;
        var y = e.clientY / window.innerHeight;
        
        // Move particles container slightly
        var particles = document.getElementById('particles-js');
        if (particles) {
            particles.style.transform = 'translate(-' + x * 15 + 'px, -' + y * 15 + 'px)';
        }

        // Optional: Move cards slightly for 3D effect (Subtle!)
        // Only apply to visible cards to avoid performance hit
        // var cards = document.querySelectorAll('.post-preview, .card');
        // cards.forEach(function(card) {
        //     var rect = card.getBoundingClientRect();
        //     if (rect.top < window.innerHeight && rect.bottom > 0) {
        //         // Calculate relative to center of card
        //         // This can be expensive, let's stick to background parallax for now
        //     }
        // });
    });

    // 3. Typing Effect (Clean version)
    var taglineElement = document.querySelector('.site-subtitle') || document.querySelector('#subtitle') || document.querySelector('p.tagline');
    if (taglineElement) {
        var text = taglineElement.innerText;
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
