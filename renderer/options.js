(function () {
  const { ipcRenderer } = require('electron');
  const { pathToFileURL } = require('url');

  function init() {
    document.getElementById('toggle-options').addEventListener('click', open);
    document.getElementById('close-options').addEventListener('click', close);
    document.getElementById('import-palette').addEventListener('click', importPalette);
    document.getElementById('save-palette').addEventListener('click', savePalette);
    document.getElementById('use-palette').addEventListener('click', usePalette);
    document.getElementById('delete-palette').addEventListener('click', deletePalette);
    document.getElementById('save-theme').addEventListener('click', saveTheme);
    document.getElementById('apply-theme').addEventListener('click', applyTheme);
    document.getElementById('delete-theme').addEventListener('click', deleteTheme);
    document.getElementById('export-theme').addEventListener('click', () => exportTheme().catch(error => interactions.toast(error.message)));
    document.getElementById('import-theme').addEventListener('click', () => importTheme().catch(error => interactions.toast(error.message)));
    document.getElementById('import-custom-skin').addEventListener('click', () => importCustomSkin().catch(error => interactions.toast(error.message)));
    document.getElementById('apply-custom-skin').addEventListener('click', applyCustomSkin);
    document.getElementById('delete-custom-skin').addEventListener('click', deleteCustomSkin);
    document.getElementById('choose-background').addEventListener('click', chooseBackground);
    document.getElementById('reset-background').addEventListener('click', resetBackground);

    ['background-enabled', 'star-density', 'nebula-intensity', 'background-opacity', 'comets-enabled', 'comet-frequency', 'comet-brightness', 'ships-enabled', 'ship-frequency', 'connector-kinetics', 'orbit-enabled', 'orbit-idle', 'screensaver-enabled', 'screensaver-idle', 'skin-mode', 'skin-detail', 'skin-rings', 'tint-custom-skins', 'evolution-enabled', 'evolve-rocky', 'evolve-gas', 'evolve-star', 'evolve-black-hole']
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
    document.getElementById('comets-enabled').checked = settings.background.cometsEnabled;
    document.getElementById('comet-frequency').value = settings.background.cometFrequency;
    document.getElementById('comet-brightness').value = settings.background.cometBrightness;
    document.getElementById('ships-enabled').checked = settings.effects.shipsEnabled;
    document.getElementById('ship-frequency').value = settings.effects.shipFrequency;
    document.getElementById('connector-kinetics').checked = settings.effects.connectorKinetics;
    document.getElementById('orbit-enabled').checked = settings.orbit.enabled;
    document.getElementById('orbit-idle').value = settings.orbit.idleSeconds;
    document.getElementById('screensaver-enabled').checked = settings.screensaver.enabled;
    document.getElementById('screensaver-idle').value = settings.screensaver.idleSeconds;
    document.getElementById('skin-mode').value = settings.skins.mode;
    document.getElementById('skin-detail').value = settings.skins.detail;
    document.getElementById('skin-rings').value = settings.skins.rings;
    document.getElementById('tint-custom-skins').checked = settings.skins.tintCustom;
    document.getElementById('custom-skin-name').value = '';
    document.getElementById('custom-skins').innerHTML = settings.skins.customLibrary
      .map(item => `<option value="${item.id}">${escapeHtml(item.name)}</option>`)
      .join('');
    document.getElementById('evolution-enabled').checked = settings.skins.evolutionEnabled;
    document.getElementById('evolve-rocky').value = settings.skins.evolutionThresholds.rocky;
    document.getElementById('evolve-gas').value = settings.skins.evolutionThresholds.gasGiant;
    document.getElementById('evolve-star').value = settings.skins.evolutionThresholds.star;
    document.getElementById('evolve-black-hole').value = settings.skins.evolutionThresholds.blackHole;
    document.getElementById('palette-name').value = settings.palette.name || '';
    document.getElementById('saved-palettes').innerHTML = settings.palette.library
      .map(item => `<option value="${item.id}"${item.id === settings.palette.activeId ? ' selected' : ''}>${escapeHtml(item.name)}</option>`)
      .join('');
    document.getElementById('theme-name').value = '';
    document.getElementById('saved-themes').innerHTML = settings.themes.library
      .map(item => `<option value="${item.id}"${item.id === settings.themes.activeId ? ' selected' : ''}>${escapeHtml(item.name)}${item.builtIn ? ' (built-in)' : ''}</option>`)
      .join('');
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
        opacity: Number(document.getElementById('background-opacity').value),
        cometsEnabled: document.getElementById('comets-enabled').checked,
        cometFrequency: Number(document.getElementById('comet-frequency').value),
        cometBrightness: Number(document.getElementById('comet-brightness').value)
      },
      orbit: {
        enabled: document.getElementById('orbit-enabled').checked,
        idleSeconds: Number(document.getElementById('orbit-idle').value)
      },
      screensaver: {
        enabled: document.getElementById('screensaver-enabled').checked,
        idleSeconds: Number(document.getElementById('screensaver-idle').value)
      },
      effects: {
        shipsEnabled: document.getElementById('ships-enabled').checked,
        shipFrequency: Number(document.getElementById('ship-frequency').value),
        connectorKinetics: document.getElementById('connector-kinetics').checked
      },
      skins: {
        mode: document.getElementById('skin-mode').value,
        detail: document.getElementById('skin-detail').value,
        rings: document.getElementById('skin-rings').value,
        tintCustom: document.getElementById('tint-custom-skins').checked,
        evolutionEnabled: document.getElementById('evolution-enabled').checked,
        evolutionThresholds: {
          rocky: Number(document.getElementById('evolve-rocky').value),
          gasGiant: Number(document.getElementById('evolve-gas').value),
          star: Number(document.getElementById('evolve-star').value),
          blackHole: Number(document.getElementById('evolve-black-hole').value)
        }
      }
    });
    background.refresh();
    skins.clearCache();
    graph.render();
    interactions.resetActivityTimers();
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

  function savePalette() {
    const name = document.getElementById('palette-name').value.trim();
    const saved = state.savePalette(name, state.getSettings().palette.colors);
    if (!saved) {
      interactions.toast('Palette needs a name and colours');
      return;
    }
    render();
    interactions.toast(`Saved palette: ${saved.name}`);
  }

  function usePalette() {
    const id = document.getElementById('saved-palettes').value;
    const paletteState = state.useSavedPalette(id, document.getElementById('apply-palette-existing').checked);
    if (!paletteState) return;
    render();
    graph.render();
    interactions.toast(`Using palette: ${paletteState.name}`);
  }

  function deletePalette() {
    const id = document.getElementById('saved-palettes').value;
    if (state.deleteSavedPalette(id)) {
      render();
      graph.render();
      interactions.toast('Palette deleted');
    }
  }

  function saveTheme() {
    const name = document.getElementById('theme-name').value.trim();
    const saved = state.saveTheme(name);
    if (!saved) {
      interactions.toast('Theme needs a name');
      return;
    }
    render();
    interactions.toast(`Saved theme: ${saved.name}`);
  }

  function applyTheme() {
    const id = document.getElementById('saved-themes').value;
    const theme = state.applyTheme(id);
    if (!theme) return;
    render();
    skins.clearCache();
    background.refresh();
    graph.render();
    interactions.resetActivityTimers();
    interactions.toast(`Applied theme: ${theme.name}`);
  }

  function deleteTheme() {
    const id = document.getElementById('saved-themes').value;
    if (state.deleteTheme(id)) {
      render();
      interactions.toast('Theme deleted');
    }
  }

  async function importCustomSkin() {
    const vaultPath = await ensureVault();
    if (!vaultPath) return;
    const sourcePath = await ipcRenderer.invoke('vault:chooseSkinAsset');
    if (!sourcePath) return;
    const relPath = await ipcRenderer.invoke('vault:importSkinAsset', { vaultPath, sourcePath });
    const fallback = sourcePath.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') || 'Custom sprite';
    const name = document.getElementById('custom-skin-name').value.trim() || fallback;
    const saved = state.saveCustomSkin(name, relPath);
    render();
    interactions.toast(`Imported sprite: ${saved.name}`);
  }

  function applyCustomSkin() {
    const skinId = document.getElementById('custom-skins').value;
    const ids = selectedOrFocusedNodeIds();
    if (!skinId || !ids.length) {
      interactions.toast('Select one or more nodes first');
      return;
    }
    ids.forEach(id => state.applyCustomSkin(id, skinId));
    skins.clearCache();
    graph.render();
    interactions.toast(`Applied sprite to ${ids.length} node${ids.length === 1 ? '' : 's'}`);
  }

  function deleteCustomSkin() {
    const skinId = document.getElementById('custom-skins').value;
    if (!skinId) return;
    if (!state.deleteCustomSkin(skinId)) {
      interactions.toast('Sprite is still used by a node');
      return;
    }
    render();
    interactions.toast('Sprite deleted');
  }

  function selectedOrFocusedNodeIds() {
    const selected = [...(interactions.getSelectedIds?.() || [])];
    if (selected.length) return selected;
    const focused = interactions.getFocusedId?.();
    return focused ? [focused] : [];
  }

  async function exportTheme() {
    const vaultPath = await ensureVault();
    if (!vaultPath) return;
    const id = document.getElementById('saved-themes').value;
    const pack = state.exportThemePack(id);
    if (!pack) {
      interactions.toast('Choose a theme to export');
      return;
    }
    const saved = await ipcRenderer.invoke('theme:export', { vaultPath, pack });
    interactions.toast(`Theme exported: ${saved}`);
  }

  async function importTheme() {
    const pack = await ipcRenderer.invoke('vault:chooseThemePack');
    if (!pack) return;
    const theme = state.importThemePack(pack);
    if (!theme) {
      interactions.toast('That theme pack could not be imported');
      return;
    }
    render();
    interactions.toast(`Imported theme: ${theme.name}`);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
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
