(function () {
  const { pathToFileURL } = require('url');
  const cache = new Map();

  function skinUrl(node) {
    const skin = node.skin || { type: 'circle' };
    if (skin.type === 'custom' && skin.path) return customSkinUrl(skin.path);
    if (skin.type !== 'planet') return null;
    const key = `${skin.variant}:${skin.seed}:${node.color}:${state.getSettings().skins.detail}:${state.getSettings().skins.rings}`;
    if (!cache.has(key)) cache.set(key, makePlanetDataUrl(node, skin));
    return cache.get(key);
  }

  function customSkinUrl(path) {
    const vaultPath = state.getVaultPath();
    if (!vaultPath) return null;
    return pathToFileURL(`${vaultPath}\\${path.replace(/\//g, '\\')}`).href;
  }

  function makePlanetDataUrl(node, skin) {
    const rand = seeded(skin.seed || 1);
    const detail = state.getSettings().skins.detail;
    const rings = state.getSettings().skins.rings;
    const count = detail === 'high' ? 18 : detail === 'low' ? 7 : 12;
    const craters = Array.from({ length: count }, () => ({
      x: 24 + rand() * 80,
      y: 24 + rand() * 80,
      r: 3 + rand() * 10,
      a: 0.16 + rand() * 0.28
    }));
    const hasRing = skin.variant === 'ringed' || (rings === 'common' && rand() > 0.45) || (rings === 'rare' && rand() > 0.82);
    const tint = node.color || '#a3e635';
    if (skin.variant === 'star') return starDataUrl(tint, skin.seed || 1);
    if (skin.variant === 'blackHole') return blackHoleDataUrl(tint);
    const rough = skin.variant === 'asteroid';
    const radius = rough ? 43 : 45;
    const blob = rough
      ? 'M64 19 C85 14 108 34 107 60 C119 79 92 111 66 108 C45 121 18 96 22 67 C12 47 38 22 64 19 Z'
      : `M64 ${64 - radius} A${radius} ${radius} 0 1 1 63.9 ${64 - radius} Z`;
    const craterSvg = craters.map(c => `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${c.r.toFixed(1)}" fill="rgba(0,0,0,${c.a.toFixed(2)})"/>`).join('');
    const bands = skin.variant === 'marble' || skin.variant === 'icy'
      ? `<path d="M24 58 C45 46 84 72 105 54" stroke="rgba(255,255,255,.36)" stroke-width="7" fill="none"/><path d="M22 76 C48 89 83 56 107 78" stroke="rgba(0,0,0,.18)" stroke-width="5" fill="none"/>`
      : '';
    const ringSvg = hasRing ? `<ellipse cx="64" cy="68" rx="58" ry="17" fill="none" stroke="rgba(235,235,235,.64)" stroke-width="7" transform="rotate(-14 64 68)"/><ellipse cx="64" cy="68" rx="58" ry="17" fill="none" stroke="rgba(0,0,0,.24)" stroke-width="3" transform="rotate(-14 64 68)"/>` : '';
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
        <defs>
          <radialGradient id="shade" cx="35%" cy="28%" r="70%">
            <stop offset="0" stop-color="#fff"/>
            <stop offset=".46" stop-color="#9d9d9d"/>
            <stop offset="1" stop-color="#161616"/>
          </radialGradient>
          <filter id="soft"><feGaussianBlur stdDeviation=".45"/></filter>
        </defs>
        ${ringSvg}
        <path d="${blob}" fill="url(#shade)"/>
        <path d="${blob}" fill="${tint}" opacity=".58" style="mix-blend-mode:multiply"/>
        <g clip-path="path('${blob}')">${bands}${craterSvg}</g>
        <ellipse cx="48" cy="38" rx="19" ry="10" fill="rgba(255,255,255,.22)" filter="url(#soft)" transform="rotate(-28 48 38)"/>
      </svg>`;
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  }

  function starDataUrl(tint, seed) {
    const rand = seeded(seed);
    const spikes = Array.from({ length: 10 }, (_, i) => {
      const a = Math.PI * 2 * i / 10;
      const r = i % 2 ? 44 + rand() * 7 : 58 + rand() * 12;
      return `${64 + Math.cos(a) * r},${64 + Math.sin(a) * r}`;
    }).join(' ');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><radialGradient id="g"><stop offset="0" stop-color="#fff"/><stop offset=".42" stop-color="${tint}"/><stop offset="1" stop-color="#111"/></radialGradient><filter id="b"><feGaussianBlur stdDeviation="4"/></filter></defs><circle cx="64" cy="64" r="48" fill="${tint}" opacity=".28" filter="url(#b)"/><polygon points="${spikes}" fill="url(#g)"/><circle cx="64" cy="64" r="28" fill="#fff" opacity=".38"/></svg>`;
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  }

  function blackHoleDataUrl(tint) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><radialGradient id="hole"><stop offset="0" stop-color="#000"/><stop offset=".55" stop-color="#050505"/><stop offset="1" stop-color="#2d2d2d"/></radialGradient><linearGradient id="disk" x1="0" x2="1"><stop offset="0" stop-color="${tint}" stop-opacity=".05"/><stop offset=".5" stop-color="${tint}" stop-opacity=".9"/><stop offset="1" stop-color="${tint}" stop-opacity=".05"/></linearGradient></defs><ellipse cx="64" cy="70" rx="58" ry="15" fill="none" stroke="url(#disk)" stroke-width="11" transform="rotate(-10 64 70)"/><circle cx="64" cy="64" r="36" fill="url(#hole)"/><circle cx="64" cy="64" r="24" fill="#000"/></svg>`;
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  }

  function seeded(seed) {
    let value = seed % 2147483647;
    if (value <= 0) value += 2147483646;
    return () => {
      value = value * 16807 % 2147483647;
      return (value - 1) / 2147483646;
    };
  }

  function clearCache() {
    cache.clear();
  }

  if (typeof module !== 'undefined') module.exports = { seeded };
  window.skins = { skinUrl, clearCache };
}());
