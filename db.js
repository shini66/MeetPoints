const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
const { app } = require('electron');

const DEFAULT_ITEMS = [
];

let db = null;
let dbPath = null;

async function initDb() {
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(__dirname, 'node_modules', 'sql.js', 'dist', file)
  });

  dbPath = path.join(app.getPath('userData'), 'meetpoints.sqlite');

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
    migrateDb();
  } else {
    db = new SQL.Database();
    db.run(`
      CREATE TABLE items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        checked INTEGER NOT NULL DEFAULT 0,
        position INTEGER NOT NULL
      );
    `);
    DEFAULT_ITEMS.forEach((item, i) => {
      db.run('INSERT INTO items (title, description, checked, position) VALUES (?, ?, 0, ?)', [item.title, item.description, i]);
    });
    persist();
  }
}

function migrateDb() {
  const tableInfo = db.exec('PRAGMA table_info(items)');
  const columns = new Set((tableInfo[0]?.values || []).map((row) => row[1]));

  let changed = false;

  if (!columns.has('title')) {
    db.run("ALTER TABLE items ADD COLUMN title TEXT NOT NULL DEFAULT ''");
    changed = true;
  }

  if (!columns.has('description')) {
    db.run("ALTER TABLE items ADD COLUMN description TEXT NOT NULL DEFAULT ''");
    changed = true;
  }

  if (changed) {
    persist();
  }
}

function persist() {
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

function getState() {
  const items = [];
  const itemsRes = db.exec('SELECT id, title, description, checked FROM items ORDER BY position ASC, id ASC');
  if (itemsRes[0]) {
    itemsRes[0].values.forEach((row) => {
      items.push({
        id: row[0],
        title: row[1],
        description: row[2],
        checked: !!row[3]
      });
    });
  }

  return { items };
}

function addItem(title, description = '') {
  const posRes = db.exec('SELECT COALESCE(MAX(position), -1) + 1 FROM items');
  const position = posRes[0].values[0][0];
  db.run('INSERT INTO items (title, description, checked, position) VALUES (?, ?, 0, ?)', [title, description, position]);
  persist();
  return getState();
}

function deleteItem(id) {
  db.run('DELETE FROM items WHERE id = ?', [id]);
  persist();
  return getState();
}

function toggleItem(id, checked) {
  db.run('UPDATE items SET checked = ? WHERE id = ?', [checked ? 1 : 0, id]);
  persist();
  return getState();
}

function resetInterview() {
  db.run('UPDATE items SET checked = 0');
  persist();
  return getState();
}

module.exports = {
  initDb,
  getState,
  addItem,
  deleteItem,
  toggleItem,
  resetInterview
};
