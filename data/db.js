const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const dataDir = __dirname;
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'devmonitor.sqlite');
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Initialize tables
async function initDB() {
  await run(`
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      done INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS snippets (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      command TEXT NOT NULL,
      category TEXT DEFAULT 'CLI',
      createdAt TEXT NOT NULL
    )
  `);

  await migrateFromJSON();
  await seedDefaultSnippets();
}

async function migrateFromJSON() {
  // Migrate Todos
  const todosFile = path.join(dataDir, 'todos.json');
  if (fs.existsSync(todosFile)) {
    try {
      const todos = JSON.parse(fs.readFileSync(todosFile, 'utf8'));
      for (const t of todos) {
        await run(
          'INSERT OR IGNORE INTO todos (id, text, done, createdAt) VALUES (?, ?, ?, ?)',
          [t.id || Date.now().toString(), t.text, t.done ? 1 : 0, t.createdAt || new Date().toISOString()]
        );
      }
    } catch (e) {
      console.error('Migration error todos.json:', e.message);
    }
  }

  // Migrate Notes
  const notesFile = path.join(dataDir, 'notes.json');
  if (fs.existsSync(notesFile)) {
    try {
      const notes = JSON.parse(fs.readFileSync(notesFile, 'utf8'));
      for (const n of notes) {
        await run(
          'INSERT OR IGNORE INTO notes (id, text, createdAt) VALUES (?, ?, ?)',
          [n.id || Date.now().toString(), n.text, n.createdAt || new Date().toISOString()]
        );
      }
    } catch (e) {
      console.error('Migration error notes.json:', e.message);
    }
  }

  // Migrate Bookmarks
  const bookmarksFile = path.join(dataDir, 'bookmarks.json');
  if (fs.existsSync(bookmarksFile)) {
    try {
      const bookmarks = JSON.parse(fs.readFileSync(bookmarksFile, 'utf8'));
      for (const b of bookmarks) {
        await run(
          'INSERT OR IGNORE INTO bookmarks (id, name, url, createdAt) VALUES (?, ?, ?, ?)',
          [b.id || Date.now().toString(), b.name, b.url, b.createdAt || new Date().toISOString()]
        );
      }
    } catch (e) {
      console.error('Migration error bookmarks.json:', e.message);
    }
  }
}

async function seedDefaultSnippets() {
  const countRow = await get('SELECT COUNT(*) as count FROM snippets');
  if (countRow && countRow.count === 0) {
    const defaults = [
      { title: 'Docker Clean', command: 'docker system prune -af --volumes', category: 'Docker' },
      { title: 'Git Status', command: 'git status && git log --oneline -n 5', category: 'Git' },
      { title: 'Port Check (3100)', command: 'lsof -i :3100 || netstat -ano | findstr 3100', category: 'Network' },
      { title: 'NPM Dev Server', command: 'npm run dev', category: 'Node' },
    ];
    for (const d of defaults) {
      await run(
        'INSERT INTO snippets (id, title, command, category, createdAt) VALUES (?, ?, ?, ?, ?)',
        [Date.now().toString() + Math.random().toString(36).substring(2, 5), d.title, d.command, d.category, new Date().toISOString()]
      );
    }
  }
}

function generateId() {
  return Date.now().toString() + '-' + Math.random().toString(36).substring(2, 7);
}

// DB Helper methods
const dbService = {
  initDB,

  // Todos
  async getTodos() {
    const rows = await all('SELECT * FROM todos ORDER BY createdAt DESC');
    return rows.map((r) => ({ ...r, done: Boolean(r.done) }));
  },
  async addTodo(text) {
    const item = {
      id: generateId(),
      text: text.trim(),
      done: 0,
      createdAt: new Date().toISOString(),
    };
    await run('INSERT INTO todos (id, text, done, createdAt) VALUES (?, ?, ?, ?)', [
      item.id,
      item.text,
      item.done,
      item.createdAt,
    ]);
    return { ...item, done: false };
  },
  async updateTodo(id, updates) {
    const current = await get('SELECT * FROM todos WHERE id = ?', [id]);
    if (!current) return null;
    const text = updates.text !== undefined ? updates.text.trim() : current.text;
    const done = updates.done !== undefined ? (updates.done ? 1 : 0) : current.done;
    await run('UPDATE todos SET text = ?, done = ? WHERE id = ?', [text, done, id]);
    return { id, text, done: Boolean(done), createdAt: current.createdAt };
  },
  async deleteTodo(id) {
    const res = await run('DELETE FROM todos WHERE id = ?', [id]);
    return res.changes > 0;
  },

  // Notes
  async getNotes() {
    return await all('SELECT * FROM notes ORDER BY createdAt DESC');
  },
  async addNote(text) {
    const item = {
      id: generateId(),
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };
    await run('INSERT INTO notes (id, text, createdAt) VALUES (?, ?, ?)', [
      item.id,
      item.text,
      item.createdAt,
    ]);
    return item;
  },
  async deleteNote(id) {
    const res = await run('DELETE FROM notes WHERE id = ?', [id]);
    return res.changes > 0;
  },

  // Bookmarks
  async getBookmarks() {
    return await all('SELECT * FROM bookmarks ORDER BY createdAt DESC');
  },
  async addBookmark(name, url) {
    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }
    const item = {
      id: generateId(),
      name: name.trim(),
      url: formattedUrl,
      createdAt: new Date().toISOString(),
    };
    await run('INSERT INTO bookmarks (id, name, url, createdAt) VALUES (?, ?, ?, ?)', [
      item.id,
      item.name,
      item.url,
      item.createdAt,
    ]);
    return item;
  },
  async deleteBookmark(id) {
    const res = await run('DELETE FROM bookmarks WHERE id = ?', [id]);
    return res.changes > 0;
  },

  // Snippets
  async getSnippets() {
    return await all('SELECT * FROM snippets ORDER BY category, title');
  },
  async addSnippet(title, command, category = 'CLI') {
    const item = {
      id: generateId(),
      title: title.trim(),
      command: command.trim(),
      category: (category || 'CLI').trim(),
      createdAt: new Date().toISOString(),
    };
    await run('INSERT INTO snippets (id, title, command, category, createdAt) VALUES (?, ?, ?, ?, ?)', [
      item.id,
      item.title,
      item.command,
      item.category,
      item.createdAt,
    ]);
    return item;
  },
  async deleteSnippet(id) {
    const res = await run('DELETE FROM snippets WHERE id = ?', [id]);
    return res.changes > 0;
  },
};


module.exports = dbService;
