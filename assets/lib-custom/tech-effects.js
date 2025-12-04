/* Tech Effects for Blog */

document.addEventListener('DOMContentLoaded', function() {
    // 1. Initialize Particles.js
    // Check if the container exists, if not create it
    if (!document.getElementById('particles-js')) {
        var particlesDiv = document.createElement('div');
        particlesDiv.id = 'particles-js';
        document.body.prepend(particlesDiv);
    }

    if (typeof particlesJS !== 'undefined') {
        particlesJS('particles-js', {
            "particles": {
                "number": { "value": 20, "density": { "enable": true, "value_area": 800 } },
                "color": { "value": ["#3498db", "#9b59b6", "#e74c3c"] }, // Colorful soft bubbles
                "shape": { "type": "circle" },
                "opacity": { "value": 0.3, "random": true },
                "size": { "value": 40, "random": true },
                "line_linked": { "enable": false },
                "move": { "enable": true, "speed": 1, "direction": "top", "random": true, "straight": false, "out_mode": "out", "bounce": false }
            },
            "interactivity": {
                "detect_on": "canvas",
                "events": {
                    "onhover": { "enable": true, "mode": "grab" },
                    "onclick": { "enable": true, "mode": "push" },
                    "resize": true
                },
                "modes": {
                    "grab": { "distance": 140, "line_linked": { "opacity": 1 } },
                    "push": { "particles_nb": 4 }
                }
            },
            "retina_detect": true
        });
    }

    // 2. Typing Effect for Tagline
    // Selector might need adjustment based on theme, usually .site-subtitle or #subtitle
    var taglineElement = document.querySelector('.site-subtitle') || document.querySelector('#subtitle') || document.querySelector('p.tagline');
    
    if (taglineElement) {
        var text = taglineElement.innerText;
        taglineElement.innerText = '';
        var i = 0;
        var speed = 100; // ms

        function typeWriter() {
            if (i < text.length) {
                taglineElement.innerText += text.charAt(i);
                i++;
                setTimeout(typeWriter, speed);
            }
        }
        typeWriter();
    }

    // 3. System Uptime Counter
    // Add to footer
    var footer = document.querySelector('footer');
    if (footer) {
        var statsDiv = document.createElement('div');
        statsDiv.id = 'tech-stats';
        footer.appendChild(statsDiv);

        // Set start date (approximate or hardcoded)
        var startDate = new Date("2023-01-01"); // Adjust as needed
        
        function updateUptime() {
            var now = new Date();
            var diff = now - startDate;
            
            var days = Math.floor(diff / (1000 * 60 * 60 * 24));
            var hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            var minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            var seconds = Math.floor((diff % (1000 * 60)) / 1000);

            statsDiv.innerHTML = "SYSTEM UPTIME: <span>" + days + "d " + hours + "h " + minutes + "m " + seconds + "s</span>";
        }
        
        setInterval(updateUptime, 1000);
        updateUptime();
    }
});
