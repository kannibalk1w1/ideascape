(function () {
  const { ipcRenderer } = require('electron');
  const { pathToFileURL } = require('url');

  function init() {
    document.getElementById('toggle-options').addEventListener('click', open);
    document.getElementById('close-options').addEventListener('click', close);
    document.getElementById('import-palette').addEventListener('click', importPalette);
    document.getElementById('choose-background').addEventListener('click', chooseBackground);
    document.getElementById('reset-background').addEventListener('click', resetBackground);

    ['background-enabled', 'star-density', 'nebula-intensity', 'background-opacity', 'orbit-enabled', 'orbit-idle']
      .forEach(id => document.getElementById(id).addEventListener('input', syncFromControls));

    render();
  }

  function open() {
    render();
    document.getElementById('options-panel').classList.remove('hidden');
  }

  function close() {
    document.getElementById('options-panel').classList.add('hidden');
  }

  function render() {
    const settings = state.getSettings();
    document.getElementById('background-enabled').checked = settings.background.enabled;
    document.getElementById('star-density').value = settings.background.starDensity;
    document.getElementById('nebula-intensity').value = settings.background.nebulaIntensity;
    document.getElementById('background-opacity').value = settings.background.opacity;
    document.getElementById('orbit-enabled').checked = settings.orbit.enabled;
    document.getElementById('orbit-idle').value = settings.orbit.idleSeconds;
    renderSwatches();
  }

  function renderSwatches() {
    document.getElementById('palette-swatches').innerHTML = state.getSettings().palette.colors
      .map(color => `<span class="swatch" title="${color}" style="background:${color}"></span>`)
      .join('');
  }

  function syncFromControls() {
    state.updateSettings({
      background: {
        enabled: document.getElementById('background-enabled').checked,
        starDensity: Number(document.getElementById('star-density').value),
        nebulaIntensity: Number(document.getElementById('nebula-intensity').value),
        opacity: Number(document.getElementById('background-opacity').value)
      },
      orbit: {
        enabled: document.getElementById('orbit-enabled').checked,
        idleSeconds: Number(document.getElementById('orbit-idle').value)
      }
    });
    background.refresh();
    interactions.resetIdleTimer();
  }

  function importPalette() {
    const parsed = palette.parsePalette(document.getElementById('palette-input').value);
    if (parsed.colors.length === 0) {
      interactions.toast('No hex colours found in palette text');
      return;
    }
    state.setPalette(parsed.name, parsed.colors, document.getElementById('apply-palette-existing').checked);
    renderSwatches();
    graph.render();
    interactions.toast(`Imported ${parsed.colors.length} colours`);
  }

  async function ensureVault() {
    if (state.getVaultPath()) return state.getVaultPath();
    const result = await vaultClient.saveVault();
    return result?.vaultPath || null;
  }

  async function chooseBackground() {
    const vaultPath = await ensureVault();
    if (!vaultPath) return;
    const sourcePath = await ipcRenderer.invoke('vault:chooseBackground');
    if (!sourcePath) return;
    const relPath = await ipcRenderer.invoke('vault:importAsset', { vaultPath, sourcePath });
    const absolutePath = `${vaultPath}\\${relPath.replace(/\//g, '\\')}`;
    state.updateSettings({ background: { mode: 'image', imagePath: relPath } });
    background.setCustomImage(pathToFileURL(absolutePath).href);
    interactions.toast('Background imported');
  }

  function resetBackground() {
    state.updateSettings({ background: { mode: 'universe', imagePath: null } });
    background.setCustomImage(null);
    background.refresh();
    interactions.toast('Universe background restored');
  }

  window.options = { init, open, close, render };
}());
