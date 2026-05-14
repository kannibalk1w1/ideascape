const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ideascape', {
  createVault: () => ipcRenderer.invoke('vault:create'),
  openVault: () => ipcRenderer.invoke('vault:open'),
  saveVault: payload => ipcRenderer.invoke('vault:save', payload),
  importAsset: payload => ipcRenderer.invoke('vault:importAsset', payload),
  exportPng: payload => ipcRenderer.invoke('export:png', payload),
  exportGif: payload => ipcRenderer.invoke('export:gif', payload)
});
