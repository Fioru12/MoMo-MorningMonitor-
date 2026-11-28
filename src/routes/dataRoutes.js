const express = require('express');
const router = express.Router();
const dbService = require('../../data/db');

// --- Todos ---
router.get('/todos', async (req, res) => {
  try {
    const todos = await dbService.getTodos();
    res.json(todos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const validDue = (d) => d === undefined || d === null || (typeof d === 'string' && DATE_RE.test(d));

router.post('/todos', async (req, res) => {
  try {
    const { text, dueDate, priority } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Testo valido richiesto' });
    }
    if (!validDue(dueDate)) return res.status(400).json({ error: 'Scadenza non valida (YYYY-MM-DD)' });
    const todo = await dbService.addTodo(text, { dueDate: dueDate || null, priority: Boolean(priority) });
    res.status(201).json(todo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/todos/:id', async (req, res) => {
  try {
    if (!validDue(req.body.dueDate)) return res.status(400).json({ error: 'Scadenza non valida (YYYY-MM-DD)' });
    const todo = await dbService.updateTodo(req.params.id, req.body);
    if (!todo) return res.status(404).json({ error: 'Todo non trovato' });
    res.json(todo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/todos/:id', async (req, res) => {
  try {
    const deleted = await dbService.deleteTodo(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Todo non trovato' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Notes ---
router.get('/notes', async (req, res) => {
  try {
    const notes = await dbService.getNotes();
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/notes', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Testo valido richiesto' });
    }
    const note = await dbService.addNote(text);
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/notes/:id', async (req, res) => {
  try {
    const deleted = await dbService.deleteNote(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Nota non trovata' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Bookmarks ---
router.get('/bookmarks', async (req, res) => {
  try {
    const bookmarks = await dbService.getBookmarks();
    res.json(bookmarks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/bookmarks', async (req, res) => {
  try {
    const { name, url } = req.body;
    if (!name || !url || typeof name !== 'string' || typeof url !== 'string' || !name.trim() || !url.trim()) {
      return res.status(400).json({ error: 'Nome e URL validi richiesti' });
    }
    const bookmark = await dbService.addBookmark(name, url);
    res.status(201).json(bookmark);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/bookmarks/:id', async (req, res) => {
  try {
    const deleted = await dbService.deleteBookmark(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Bookmark non trovato' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Snippets ---
router.get('/snippets', async (req, res) => {
  try {
    const snippets = await dbService.getSnippets();
    res.json(snippets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/snippets', async (req, res) => {
  try {
    const { title, command, category } = req.body;
    if (!title || !command || typeof title !== 'string' || typeof command !== 'string' || !title.trim() || !command.trim()) {
      return res.status(400).json({ error: 'Titolo e comando validi richiesti' });
    }
    const snippet = await dbService.addSnippet(title, command, category);
    res.status(201).json(snippet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/snippets/:id', async (req, res) => {
  try {
    const deleted = await dbService.deleteSnippet(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Snippet non trovato' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Settings ---
const SETTING_KEYS = new Set([
  'momo-accent', 'momo-theme', 'momo-wallpaper', 'momo-profile',
  'momo-hidden-widgets', 'momo-grid-layout-v10', 'momo-focus', 'momo-pomodoro', 'momo-morning-notify', 'momo-calendar-ics',
]);

router.get('/settings', async (req, res) => {
  try {
    res.json(await dbService.getSettings());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    if (!SETTING_KEYS.has(key)) return res.status(400).json({ error: 'Chiave non valida' });
    if (value === null) {
      await dbService.deleteSetting(key);
      return res.json({ ok: true });
    }
    if (typeof value !== 'string' || value.length > 20000) return res.status(400).json({ error: 'Valore non valido' });
    await dbService.setSetting(key, value);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Backup configurazione (esporta / importa) ---
router.get('/backup/export', async (req, res) => {
  try {
    const data = await dbService.exportAll();
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="momo-backup-${date}.json"`);
    res.json({ app: 'momo', version: 1, exportedAt: new Date().toISOString(), ...data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/backup/import', async (req, res) => {
  try {
    const data = req.body;
    if (!data || data.app !== 'momo') return res.status(400).json({ error: 'Non è un file di backup di MoMo' });
    await dbService.importAll(data, SETTING_KEYS);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
