const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Example API methods - you can add more as needed
  getVersion: () => process.versions.electron,
  platform: () => process.platform,
  
  // File operations (if needed later)
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (content) => ipcRenderer.invoke('dialog:saveFile', content),
  
  // App controls
  minimize: () => ipcRenderer.invoke('app:minimize'),
  maximize: () => ipcRenderer.invoke('app:maximize'),
  close: () => ipcRenderer.invoke('app:close'),
  
  // Event listeners
  onMenuAction: (callback) => ipcRenderer.on('menu-action', callback),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

// DOM Content Loaded listener
window.addEventListener('DOMContentLoaded', () => {
  console.log('Bloxd Codium is ready!');
});