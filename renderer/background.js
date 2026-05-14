(function () {
  let canvas;
  let ctx;
  let stars = [];
  let customImage = null;

  function init() {
    canvas = document.getElementById('background-canvas');
    ctx = canvas.getContext('2d');
    window.addEventListener('resize', resize);
    resize();
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
