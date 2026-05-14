const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const vault = require('./src/main/vault');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#101214',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('vault:create', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose a folder for your IdeaScape vault',
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return vault.createVault(result.filePaths[0]);
});

ipcMain.handle('vault:open', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open an IdeaScape vault',
    properties: ['openDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return vault.openVault(result.filePaths[0]);
});

ipcMain.handle('vault:save', async (_event, payload) => vault.saveVault(payload));
ipcMain.handle('vault:chooseAsset', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import image or GIF',
    properties: ['openFile'],
    filters: [
      { name: 'Images and GIFs', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] }
    ]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});
ipcMain.handle('vault:chooseBackground', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose a background image',
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'] }
    ]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});
ipcMain.handle('vault:chooseSkinAsset', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose a node skin sprite',
    properties: ['openFile'],
    filters: [
      { name: 'Tintable sprites', extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg'] }
    ]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});
ipcMain.handle('vault:importAsset', async (_event, payload) => vault.importAsset(payload));
ipcMain.handle('vault:importSkinAsset', async (_event, payload) => vault.importSkinAsset(payload));
ipcMain.handle('export:png', async (_event, payload) => vault.writeExport(payload, 'png'));
ipcMain.handle('export:gif', async (_event, payload) => vault.writeExport(payload, 'gif'));
