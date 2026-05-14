(function () {
  const { ipcRenderer } = require('electron');
  const htmlToImage = require('html-to-image');
  const { GIFEncoder, quantize, applyPalette } = require('gifenc');

  async function exportPng() {
    const dataUrl = await htmlToImage.toPng(document.getElementById('canvas-shell'), {
      backgroundColor: '#101214',
      pixelRatio: 2,
      filter: exportFilter
    });
    const saved = await ipcRenderer.invoke('export:png', { vaultPath: state.getVaultPath(), dataUrl });
    interactions.toast(`PNG exported: ${saved}`);
  }

  async function exportGif() {
    const canvas = await htmlToImage.toCanvas(document.getElementById('canvas-shell'), {
      backgroundColor: '#101214',
      pixelRatio: 1,
      filter: exportFilter
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

  async function exportReplayGif() {
    const steps = state.sampledReplaySteps(80);
    if (!steps.length) throw new Error('No replay timeline to export');
    interactions.toast(`Rendering replay GIF (${steps.length} frames)`);
    const wasReplayOpen = replay.isOpen();
    const previousStep = replay.currentStep();
    const gif = GIFEncoder();
    let width = 0;
    let height = 0;
    try {
      for (const step of steps) {
        graph.setReplayFilter({ nodeIds: step.nodeIds, edgeIds: step.edgeIds });
        await nextFrame();
        const canvas = await htmlToImage.toCanvas(document.getElementById('canvas-shell'), {
          backgroundColor: '#101214',
          pixelRatio: 1,
          filter: exportFilter
        });
        width = canvas.width;
        height = canvas.height;
        const frame = canvas.getContext('2d').getImageData(0, 0, width, height);
        const palette = quantize(frame.data, 256);
        const index = applyPalette(frame.data, palette);
        gif.writeFrame(index, width, height, { palette, delay: replay.delay() });
      }
    } finally {
      restoreReplayView(wasReplayOpen, previousStep);
    }
    gif.finish();
    const bytes = gif.bytes();
    const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
    const dataUrl = `data:image/gif;base64,${btoa(binary)}`;
    const saved = await ipcRenderer.invoke('export:gif', { vaultPath: state.getVaultPath(), dataUrl });
    interactions.toast(`Replay GIF exported: ${saved}`);
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

  function exportFilter(node) {
    return !['editor-panel', 'context-menu', 'toast', 'options-panel', 'replay-panel'].includes(node.id);
  }

  function init() {
    document.getElementById('export-png').addEventListener('click', () => exportPng().catch(error => interactions.toast(error.message)));
    document.getElementById('export-gif').addEventListener('click', () => exportGif().catch(error => interactions.toast(error.message)));
  }

  window.exporter = { init, exportPng, exportGif, exportReplayGif };
}());
