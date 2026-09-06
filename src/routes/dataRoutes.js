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

router.post('/todos', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Testo valido richiesto' });
    }
    const todo = await dbService.addTodo(text);
    res.status(201).json(todo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/todos/:id', async (req, res) => {
  try {
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

module.exports = router;
