---
layout: home
title: Home
---

<canvas id="rain-canvas"></canvas>
<button id="rain-toggle-btn" class="rain-toggle">Rain: off</button>
<script>
(function () {
  const canvas = document.getElementById('rain-canvas');
  const btn = document.getElementById('rain-toggle-btn');
  if (!canvas || !btn) return;

  const ctx = canvas.getContext('2d');
  let drops = [];
  let running = false;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function initDrops() {
    drops = [];
    const count = Math.max(80, Math.floor(window.innerWidth / 10));
    for (let i = 0; i < count; i++) {
      drops.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        len: 10 + Math.random() * 18,
        speed: 2.5 + Math.random() * 3,
        drift: -0.3 + Math.random() * 0.6
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(37, 99, 235, 0.28)';

    for (const d of drops) {
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x + d.drift * 2, d.y + d.len);
      ctx.stroke();

      d.y += d.speed;
      d.x += d.drift;

      if (d.y > canvas.height + 20 || d.x < -20 || d.x > canvas.width + 20) {
        d.x = Math.random() * canvas.width;
        d.y = -20;
      }
    }
  }

  function tick() {
    if (!running) return;
    draw();
    requestAnimationFrame(tick);
  }

  function startRain() {
    running = true;
    canvas.classList.add('active');
    btn.textContent = 'Rain: on';
    tick();
  }

  function stopRain() {
    running = false;
    canvas.classList.remove('active');
    btn.textContent = 'Rain: off';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  resize();
  initDrops();
  window.addEventListener('resize', function () {
    resize();
    initDrops();
  });

  btn.addEventListener('click', function () {
    if (running) {
      stopRain();
    } else {
      startRain();
    }
  });
})();
</script>

# Xinjian Yang

Undergraduate Student in **Electrical Engineering and Physics**, with interests in **AI, Mathematics, Linguistics, and Computer Science**

I am interested in the mathematical structure of intelligent systems and in the use of rigorous analytical tools to study modern problems in computation, learning, and physics. My current interests lie at the intersection of **applied mathematics, machine learning, signal processing, and scientific computation**.

I am particularly drawn to problems where theory and practice genuinely constrain one another: partial differential equations, optimisation, dynamical systems, inverse problems, and the mathematical foundations of machine learning.

---

## Research Interests

- Mathematical foundations of machine learning
- Partial differential equations and scientific computing
- Signal processing and systems
- Computational physics and modelling
- Optimization, inverse problems, and dynamical systems

---

## Current Direction

At present, I am building a stronger foundation in probability, signals and systems, differential equations, and computational methods, while exploring how these areas connect to modern AI and data-driven modelling.

This site serves as a record of my projects, technical notes, and evolving research interests.

---

## Explore

- [About](./about.html)
- [Projects](./projects.html)
- [Blog](./blog.html)
- [Contact](./contact.html)
