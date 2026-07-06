const { app, BrowserWindow, ipcMain, dialog, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const db = require('./db');

let mainWindow;
let saveWindowStateTimeout;

const DEFAULT_WINDOW_BOUNDS = { width: 480, height: 760 };

function windowStatePath() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function loadWindowState() {
  try {
    return JSON.parse(fs.readFileSync(windowStatePath(), 'utf-8'));
  } catch {
    return null;
  }
}

function isOnScreen(x, y) {
  return screen.getAllDisplays().some(({ workArea }) =>
    x >= workArea.x && y >= workArea.y &&
    x < workArea.x + workArea.width && y < workArea.y + workArea.height
  );
}

function resolveWindowBounds() {
  const saved = loadWindowState();

  if (!saved || typeof saved.width !== 'number' || typeof saved.height !== 'number') {
    return DEFAULT_WINDOW_BOUNDS;
  }

  const bounds = { width: saved.width, height: saved.height };

  if (typeof saved.x === 'number' && typeof saved.y === 'number' && isOnScreen(saved.x, saved.y)) {
    bounds.x = saved.x;
    bounds.y = saved.y;
  }

  return bounds;
}

function saveWindowState() {
  if (!mainWindow) return;
  fs.writeFileSync(windowStatePath(), JSON.stringify(mainWindow.getBounds()));
}

function scheduleSaveWindowState() {
  clearTimeout(saveWindowStateTimeout);
  saveWindowStateTimeout = setTimeout(saveWindowState, 500);
}

async function createWindow() {
  await db.initDb();

  mainWindow = new BrowserWindow({
    ...resolveWindowBounds(),
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

  mainWindow.on('resize', scheduleSaveWindowState);
  mainWindow.on('move', scheduleSaveWindowState);
  mainWindow.on('close', saveWindowState);
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
handle('update-item', (_e, id, title, description) => db.updateItem(id, title, description));
handle('reorder-items', (_e, orderedIds) => db.reorderItems(orderedIds));

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

handle('import-data', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Importar checklist',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  });

  if (canceled || !filePaths[0]) {
    return { imported: false };
  }

  const raw = fs.readFileSync(filePaths[0], 'utf-8');
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error('invalid-format');
  }

  const items = parsed
    .map((item) => ({
      title: String(item.title ?? '').trim(),
      description: String(item.description ?? ''),
      checked: !!item.checked
    }))
    .filter((item) => item.title);

  const currentCount = db.getState().items.length;
  const { response } = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    buttons: ['Cancelar', 'Reemplazar'],
    defaultId: 0,
    cancelId: 0,
    message: `Esto va a reemplazar los ${currentCount} puntos actuales por los ${items.length} del archivo importado. ¿Continuar?`
  });

  if (response !== 1) {
    return { imported: false };
  }

  return { imported: true, state: db.replaceItems(items) };
});
