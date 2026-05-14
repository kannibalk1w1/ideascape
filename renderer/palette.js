(function () {
  function parsePalette(input) {
    const text = String(input || '').trim();
    const colors = [];

    const lospec = text.match(/lospec\.com\/palette-list\/([a-z0-9-]+)/i);
    const name = lospec ? lospec[1].replace(/-/g, ' ') : 'Imported palette';

    const hexMatches = text.match(/#?[0-9a-f]{6}\b/gi) || [];
    hexMatches.forEach(match => colors.push(normaliseHex(match)));

    text.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') && !/^#[0-9a-f]{6}$/i.test(trimmed)) return;
      const gpl = trimmed.match(/^\d+\s+\d+\s+\d+\s*/);
      if (gpl) {
        const parts = trimmed.split(/\s+/).slice(0, 3).map(Number);
        if (parts.every(n => Number.isInteger(n) && n >= 0 && n <= 255)) {
          colors.push(`#${parts.map(n => n.toString(16).padStart(2, '0')).join('')}`);
        }
      }
    });

    return { name, colors: [...new Set(colors)] };
  }

  function normaliseHex(value) {
    return `#${value.replace('#', '').toLowerCase()}`;
  }

  if (typeof module !== 'undefined') module.exports = { parsePalette };
  window.palette = { parsePalette };
}());
