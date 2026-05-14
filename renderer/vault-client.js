(function () {
  const { ipcRenderer } = require('electron');
  const { pathToFileURL } = require('url');

  async function createVault() {
    const result = await ipcRenderer.invoke('vault:create');
    if (!result) return null;
    state.setVaultPath(result.vaultPath);
    return result;
  }

  async function openVault() {
    const result = await ipcRenderer.invoke('vault:open');
    if (!result) return null;
    state.setVaultPath(result.vaultPath);
    if (result.graph) state.loadGraph(result.graph);
    if (result.graph?.settings?.background?.imagePath) {
      const absolutePath = `${result.vaultPath}\\${result.graph.settings.background.imagePath.replace(/\//g, '\\')}`;
      background.setCustomImage(pathToFileURL(absolutePath).href);
    } else {
      background.setCustomImage(null);
      background.refresh();
    }
    return result;
  }

  async function saveVault() {
    let vaultPath = state.getVaultPath();
    if (!vaultPath) {
      const created = await createVault();
      if (!created) return null;
      vaultPath = created.vaultPath;
    }
    const result = await ipcRenderer.invoke('vault:save', { vaultPath, graph: state.cloneGraph() });
    if (result?.graph) state.loadGraph(result.graph);
    return result;
  }

  window.vaultClient = { createVault, openVault, saveVault };
}());
