const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getState: () => ipcRenderer.invoke('get-state'),
  addItem: (title, description) => ipcRenderer.invoke('add-item', title, description),
  deleteItem: (id) => ipcRenderer.invoke('delete-item', id),
  toggleItem: (id, checked) => ipcRenderer.invoke('toggle-item', id, checked),
  resetInterview: () => ipcRenderer.invoke('reset-interview')
});
