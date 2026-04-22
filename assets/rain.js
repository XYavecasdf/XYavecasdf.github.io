const canvas = document.getElementById('rain-canvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  let drops = [];
  let running = false;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  window.addEventListener('resize', resize);
  resize();

  function init() {
    drops = [];
    const count = Math.floor(window.innerWidth / 12);
    for (let i = 0; i < count; i++) {
      drops.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        length: 8 + Math.random() * 12,
        speed: 2 + Math.random() * 2
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(30, 64, 175, 0.18)';
    ctx.lineWidth = 1;

    for (let d of drops) {
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x, d.y + d.length);
      ctx.stroke();

      d.y += d.speed;
      if (d.y > canvas.height) {
        d.y = -10;
        d.x = Math.random() * canvas.width;
      }
    }
  }

  function loop() {
    if (!running) return;
    draw();
    requestAnimationFrame(loop);
  }

  function start() {
    running = true;
    canvas.classList.add('active');
    loop();
  }

  function stop() {
    running = false;
    canvas.classList.remove('active');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  init();

  const btn = document.getElementById('rain-toggle-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      if (running) {
        stop();
        btn.textContent = 'Rain: off';
      } else {
        start();
        btn.textContent = 'Rain: on';
      }
    });
  }
}
