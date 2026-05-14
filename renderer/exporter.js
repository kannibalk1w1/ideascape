(function () {
  const { ipcRenderer } = require('electron');
  const htmlToImage = require('html-to-image');
  const { GIFEncoder, quantize, applyPalette } = require('gifenc');

  async function exportPng() {
    const dataUrl = await htmlToImage.toPng(document.getElementById('canvas-shell'), {
      backgroundColor: '#101214',
      pixelRatio: 2,
      filter: node => !['editor-panel', 'context-menu', 'toast'].includes(node.id)
    });
    const saved = await ipcRenderer.invoke('export:png', { vaultPath: state.getVaultPath(), dataUrl });
    interactions.toast(`PNG exported: ${saved}`);
  }

  async function exportGif() {
    const canvas = await htmlToImage.toCanvas(document.getElementById('canvas-shell'), {
      backgroundColor: '#101214',
      pixelRatio: 1,
      filter: node => !['editor-panel', 'context-menu', 'toast'].includes(node.id)
    });
    const ctx = canvas.getContext('2d');
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const palette = quantize(frame.data, 256);
    const index = applyPalette(frame.data, palette);
    const gif = GIFEncoder();
    gif.writeFrame(index, canvas.width, canvas.height, { palette, delay: 1400 });
    gif.finish();
    const bytes = gif.bytes();
    const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
    const dataUrl = `data:image/gif;base64,${btoa(binary)}`;
    const saved = await ipcRenderer.invoke('export:gif', { vaultPath: state.getVaultPath(), dataUrl });
    interactions.toast(`GIF exported: ${saved}`);
  }

  function init() {
    document.getElementById('export-png').addEventListener('click', () => exportPng().catch(error => interactions.toast(error.message)));
    document.getElementById('export-gif').addEventListener('click', () => exportGif().catch(error => interactions.toast(error.message)));
  }

  window.exporter = { init, exportPng, exportGif };
}());
