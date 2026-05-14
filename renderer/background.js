(function () {
  let canvas;
  let ctx;
  let stars = [];
  let comets = [];
  let ships = [];
  let customImage = null;
  let lastTime = 0;

  function init() {
    canvas = document.getElementById('background-canvas');
    ctx = canvas.getContext('2d');
    window.addEventListener('resize', resize);
    resize();
    requestAnimationFrame(animate);
  }

  function resize() {
    if (!canvas) return;
    canvas.width = Math.max(1, Math.floor(window.innerWidth * devicePixelRatio));
    canvas.height = Math.max(1, Math.floor(window.innerHeight * devicePixelRatio));
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    buildStars();
    render();
  }

  function buildStars() {
    const settings = state.getSettings().background;
    const count = Math.floor(160 + 520 * settings.starDensity);
    stars = Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.35 + Math.random() * 1.4,
      a: 0.35 + Math.random() * 0.65,
      layer: 0.2 + Math.random() * 0.8
    }));
  }

  function setCustomImage(src) {
    if (!src) {
      customImage = null;
      render();
      return;
    }
    customImage = new Image();
    customImage.onload = render;
    customImage.src = src;
  }

  function render() {
    if (!ctx) return;
    const settings = state.getSettings().background;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!settings.enabled) return;
    ctx.save();
    ctx.globalAlpha = settings.opacity;
    const gradient = ctx.createRadialGradient(canvas.width * 0.5, canvas.height * 0.5, 0, canvas.width * 0.5, canvas.height * 0.5, canvas.width * 0.75);
    gradient.addColorStop(0, '#1b2230');
    gradient.addColorStop(0.5, '#101421');
    gradient.addColorStop(1, '#06070b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (customImage) {
      ctx.globalAlpha = settings.opacity * 0.75;
      ctx.drawImage(customImage, 0, 0, canvas.width, canvas.height);
    } else {
      drawNebula(settings.nebulaIntensity);
    }

    ctx.globalAlpha = settings.opacity;
    stars.forEach(star => {
      ctx.globalAlpha = settings.opacity * star.a;
      ctx.fillStyle = '#f8fbff';
      ctx.beginPath();
      ctx.arc(star.x * canvas.width, star.y * canvas.height, star.r * devicePixelRatio, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function animate(time) {
    const dt = Math.min(50, time - lastTime || 16);
    lastTime = time;
    maybeSpawnComet(dt);
    maybeSpawnShip(dt);
    updateComets(dt);
    updateShips(dt);
    render();
    drawComets();
    drawShips();
    requestAnimationFrame(animate);
  }

  function maybeSpawnComet(dt) {
    const settings = state.getSettings().background;
    if (!settings.enabled || !settings.cometsEnabled) return;
    const chance = (settings.cometFrequency || 0) * dt / 9000;
    if (Math.random() > chance || comets.length > 3) return;
    const fromLeft = Math.random() > 0.5;
    const y = Math.random() * canvas.height * 0.45;
    comets.push({
      x: fromLeft ? -80 : canvas.width + 80,
      y,
      vx: (fromLeft ? 1 : -1) * (0.55 + Math.random() * 0.45) * devicePixelRatio,
      vy: (0.18 + Math.random() * 0.28) * devicePixelRatio,
      life: 0,
      maxLife: 1800 + Math.random() * 900,
      length: 140 + Math.random() * 180
    });
  }

  function updateComets(dt) {
    comets.forEach(comet => {
      comet.life += dt;
      comet.x += comet.vx * dt;
      comet.y += comet.vy * dt;
    });
    comets = comets.filter(comet => comet.life < comet.maxLife && comet.x > -400 && comet.x < canvas.width + 400 && comet.y < canvas.height + 400);
  }

  function maybeSpawnShip(dt) {
    const settings = state.getSettings();
    if (!settings.background.enabled || !settings.effects.shipsEnabled) return;
    const chance = (settings.effects.shipFrequency || 0) * dt / 14000;
    if (Math.random() > chance || ships.length > 2) return;
    const fromLeft = Math.random() > 0.5;
    const y = canvas.height * (0.16 + Math.random() * 0.68);
    const scale = (0.7 + Math.random() * 0.8) * devicePixelRatio;
    ships.push({
      x: fromLeft ? -90 : canvas.width + 90,
      y,
      vx: (fromLeft ? 1 : -1) * (0.12 + Math.random() * 0.2) * devicePixelRatio,
      vy: (-0.03 + Math.random() * 0.06) * devicePixelRatio,
      scale,
      hue: Math.random() > 0.5 ? '#a3e635' : '#67e8f9',
      fromLeft
    });
  }

  function updateShips(dt) {
    ships.forEach(ship => {
      ship.x += ship.vx * dt;
      ship.y += ship.vy * dt;
    });
    ships = ships.filter(ship => ship.x > -160 && ship.x < canvas.width + 160 && ship.y > -120 && ship.y < canvas.height + 120);
  }

  function drawComets() {
    const settings = state.getSettings().background;
    if (!settings.enabled || !settings.cometsEnabled) return;
    ctx.save();
    comets.forEach(comet => {
      const fade = Math.sin(Math.PI * comet.life / comet.maxLife);
      const mag = Math.hypot(comet.vx, comet.vy) || 1;
      const tx = -comet.vx / mag * comet.length;
      const ty = -comet.vy / mag * comet.length;
      const gradient = ctx.createLinearGradient(comet.x, comet.y, comet.x + tx, comet.y + ty);
      gradient.addColorStop(0, `rgba(255,255,255,${0.85 * settings.cometBrightness * fade})`);
      gradient.addColorStop(0.2, `rgba(163,230,255,${0.35 * settings.cometBrightness * fade})`);
      gradient.addColorStop(1, 'rgba(163,230,255,0)');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2.2 * devicePixelRatio;
      ctx.beginPath();
      ctx.moveTo(comet.x, comet.y);
      ctx.lineTo(comet.x + tx, comet.y + ty);
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawShips() {
    const settings = state.getSettings();
    if (!settings.background.enabled || !settings.effects.shipsEnabled) return;
    ctx.save();
    ships.forEach(ship => {
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.scale(ship.fromLeft ? ship.scale : -ship.scale, ship.scale);
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = 'rgba(231,236,239,0.9)';
      ctx.strokeStyle = ship.hue;
      ctx.lineWidth = 1.2 * devicePixelRatio;
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-15, -8);
      ctx.lineTo(-8, 0);
      ctx.lineTo(-15, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = ship.hue;
      ctx.beginPath();
      ctx.moveTo(-16, -4);
      ctx.lineTo(-34, 0);
      ctx.lineTo(-16, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
    ctx.restore();
  }

  function drawNebula(intensity) {
    const patches = [
      ['#5b7cfa', 0.22, 0.28, 0.18],
      ['#f472b6', 0.72, 0.38, 0.22],
      ['#22d3ee', 0.52, 0.68, 0.2]
    ];
    patches.forEach(([color, x, y, r]) => {
      const grd = ctx.createRadialGradient(canvas.width * x, canvas.height * y, 0, canvas.width * x, canvas.height * y, canvas.width * r);
      grd.addColorStop(0, color);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = intensity * 0.22;
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    });
  }

  function refresh() {
    buildStars();
    render();
  }

  window.background = { init, refresh, render, setCustomImage };
}());
