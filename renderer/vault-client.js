(function () {
  const { ipcRenderer } = require('electron');

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
