const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const db = require('./db');

let mainWindow;

async function createWindow() {
  await db.initDb();

  mainWindow = new BrowserWindow({
    width: 480,
    height: 760,
    minWidth: 380,
    minHeight: 500,
    title: 'MeetPoints',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('get-state', () => db.getState());
ipcMain.handle('add-item', (_e, title, description) => db.addItem(title, description));
ipcMain.handle('delete-item', (_e, id) => db.deleteItem(id));
ipcMain.handle('toggle-item', (_e, id, checked) => db.toggleItem(id, checked));
ipcMain.handle('reset-interview', () => db.resetInterview());
