const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
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

function createWindowOrQuit() {
  createWindow().catch((err) => {
    console.error('Failed to start app:', err);
    dialog.showErrorBox(
      'MeetPoints',
      'No se pudo iniciar la aplicación. Los datos guardados podrían estar dañados.'
    );
    app.quit();
  });
}

app.whenReady().then(createWindowOrQuit);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindowOrQuit();
});

function handle(channel, handler) {
  ipcMain.handle(channel, async (...args) => {
    try {
      return await handler(...args);
    } catch (err) {
      console.error(`IPC "${channel}" failed:`, err);
      throw new Error(`ipc-failed:${channel}`);
    }
  });
}

handle('get-state', () => db.getState());
handle('add-item', (_e, title, description) => db.addItem(title, description));
handle('delete-item', (_e, id) => db.deleteItem(id));
handle('toggle-item', (_e, id, checked) => db.toggleItem(id, checked));
handle('reset-interview', () => db.resetInterview());

function csvEscape(value) {
  const str = String(value ?? '');
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function toCsv(items) {
  const header = 'title,description,checked';
  const rows = items.map((item) =>
    [item.title, item.description, item.checked ? '1' : '0'].map(csvEscape).join(',')
  );
  return [header, ...rows].join('\n');
}

handle('export-data', async () => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Exportar checklist',
    defaultPath: 'meetpoints-checklist.json',
    filters: [
      { name: 'JSON', extensions: ['json'] },
      { name: 'CSV', extensions: ['csv'] }
    ]
  });

  if (canceled || !filePath) {
    return { exported: false };
  }

  const { items } = db.getState();
  const content = filePath.toLowerCase().endsWith('.csv')
    ? toCsv(items)
    : JSON.stringify(items, null, 2);

  fs.writeFileSync(filePath, content, 'utf-8');
  return { exported: true, filePath };
});
