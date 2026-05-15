(function () {
  const { ipcRenderer } = require('electron');
  const { GIFEncoder, quantize, applyPalette } = require('gifenc');

  async function exportPng() {
    const vaultPath = await ensureVaultPath();
    if (!vaultPath) return;
    const saved = await withExportChromeHidden(() => ipcRenderer.invoke('export:capture-png', { vaultPath }));
    interactions.toast(`PNG exported to exports: ${saved}`);
  }

  async function exportGif() {
    const vaultPath = await ensureVaultPath();
    if (!vaultPath) return;
    const dataUrl = await withExportChromeHidden(async () => {
      const frame = await captureFrame();
      return encodeGif([frame], 1400);
    });
    const saved = await ipcRenderer.invoke('export:gif', { vaultPath, dataUrl });
    interactions.toast(`GIF exported to exports: ${saved}`);
  }

  async function exportReplayGif() {
    const vaultPath = await ensureVaultPath();
    if (!vaultPath) return;
    const steps = state.sampledReplaySteps(80);
    if (!steps.length) throw new Error('No replay timeline to export');
    interactions.toast(`Rendering replay GIF (${steps.length} frames)`);
    const wasReplayOpen = replay.isOpen();
    const previousStep = replay.currentStep();
    const frames = [];
    try {
      for (const step of steps) {
        graph.setReplayFilter({ nodeIds: step.nodeIds, edgeIds: step.edgeIds });
        await nextFrame();
        frames.push(await withExportChromeHidden(captureFrame));
      }
    } finally {
      restoreReplayView(wasReplayOpen, previousStep);
    }
    const dataUrl = encodeGif(frames, replay.delay());
    const saved = await ipcRenderer.invoke('export:gif', { vaultPath, dataUrl });
    interactions.toast(`Replay GIF exported to exports: ${saved}`);
  }

  async function ensureVaultPath() {
    if (state.getVaultPath()) return state.getVaultPath();
    const result = await vaultClient.saveVault();
    return result?.vaultPath || null;
  }

  function restoreReplayView(wasReplayOpen, previousStep) {
    if (wasReplayOpen && previousStep) {
      replay.showStep(previousStep, false);
      return;
    }
    graph.setReplayFilter(null);
  }

  function nextFrame() {
    return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  async function withExportChromeHidden(fn) {
    document.body.classList.add('exporting');
    await nextFrame();
    try {
      return await fn();
    } finally {
      document.body.classList.remove('exporting');
    }
  }

  async function captureFrame() {
    const dataUrl = await ipcRenderer.invoke('export:capture-frame');
    return imageDataUrlToFrame(dataUrl);
  }

  function imageDataUrlToFrame(dataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
      };
      image.onerror = () => reject(new Error('Could not read captured export frame.'));
      image.src = dataUrl;
    });
  }

  function encodeGif(frames, delay) {
    const gif = GIFEncoder();
    frames.forEach(frame => {
      const palette = quantize(frame.data, 256);
      const index = applyPalette(frame.data, palette);
      gif.writeFrame(index, frame.width, frame.height, { palette, delay });
    });
    gif.finish();
    const bytes = gif.bytes();
    const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
    return `data:image/gif;base64,${btoa(binary)}`;
  }

  function init() {
    document.getElementById('export-png').addEventListener('click', () => exportPng().catch(error => interactions.toast(error.message)));
    document.getElementById('export-gif').addEventListener('click', () => exportGif().catch(error => interactions.toast(error.message)));
  }

  window.exporter = { init, exportPng, exportGif, exportReplayGif };
}());
