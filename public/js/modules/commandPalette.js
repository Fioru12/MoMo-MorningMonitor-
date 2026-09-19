import { loadWeather } from './widgets/weatherWidget.js';
import { loadSystem } from './widgets/systemWidget.js';
import { loadTodos } from './widgets/todosWidget.js';
import { loadNotes } from './widgets/notesWidget.js';
import { loadBookmarks } from './widgets/bookmarksWidget.js';
import { loadNews } from './widgets/newsWidget.js';

export function initCommandPalette() {
  const cmdPaletteOverlay = document.getElementById('cmdPaletteOverlay');
  const cmdPaletteInput = document.getElementById('cmdPaletteInput');
  if (!cmdPaletteOverlay) return;

  function toggleCmdPalette(open) {
    if (open) {
      cmdPaletteOverlay.classList.add('visible');
      cmdPaletteInput.value = '';
      cmdPaletteInput.focus();
      renderPalette('');
    } else {
      cmdPaletteOverlay.classList.remove('visible');
    }
  }

  function renderPalette(q) {
    const results = document.getElementById('cmdPaletteResults');
    if (!results) return;
    if (!q) {
      results.querySelectorAll('.cmd-palette-item').forEach((el) => (el.style.display = ''));
      return;
    }
    const query = q.toLowerCase();
    results.querySelectorAll('.cmd-palette-item').forEach((el) => {
      el.style.display = el.textContent.toLowerCase().includes(query) ? '' : 'none';
    });

    let dyn = document.getElementById('paletteDyn');
    if (!dyn) {
      dyn = document.createElement('div');
      dyn.id = 'paletteDyn';
      results.appendChild(dyn);
    }
    dyn.innerHTML = '';
    Promise.all([
      fetch('/api/todos').then((r) => r.json()).catch(() => []),
      fetch('/api/notes').then((r) => r.json()).catch(() => []),
      fetch('/api/bookmarks').then((r) => r.json()).catch(() => []),
    ]).then(([todos, notes, bookmarks]) => {
      const items = [
        ...todos.map((t) => ({ label: '✅ ' + t.text, text: t.text })),
        ...notes.map((n) => ({ label: '📝 ' + n.text.slice(0, 40), text: n.text })),
        ...bookmarks.map((b) => ({ label: '🔖 ' + b.name, text: b.name + ' ' + b.url })),
      ]
        .filter((i) => i.text.toLowerCase().includes(query))
        .slice(0, 5);
      dyn.innerHTML = items.map((i) => `<div class="cmd-palette-item" style="color:var(--text-secondary)">${i.label}</div>`).join('');
    });
  }

  if (cmdPaletteInput) {
    let paletteDebounce;
    cmdPaletteInput.addEventListener('input', () => {
      clearTimeout(paletteDebounce);
      paletteDebounce = setTimeout(() => renderPalette(cmdPaletteInput.value), 250);
    });
  }

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      toggleCmdPalette(!cmdPaletteOverlay.classList.contains('visible'));
    } else if (e.key === 'Escape') {
      toggleCmdPalette(false);
    }
  });

  cmdPaletteOverlay.addEventListener('click', (e) => {
    if (e.target === cmdPaletteOverlay) toggleCmdPalette(false);
  });

  document.querySelectorAll('.cmd-palette-item').forEach((item) => {
    item.addEventListener('click', () => {
      executeCmdAction(item.getAttribute('data-action'));
      toggleCmdPalette(false);
    });
  });
}

function executeCmdAction(action) {
  switch (action) {
    case 'theme':
      document.getElementById('themeToggle')?.click();
      break;
    case 'refresh':
      loadWeather();
      loadSystem();
      loadTodos();
      loadNotes();
      loadBookmarks();
      loadNews();
      break;
    case 'export-todos':
      window.open('/api/export/todos', '_blank');
      break;
    case 'export-notes':
      window.open('/api/export/notes', '_blank');
      break;
    case 'export-bookmarks':
      window.open('/api/export/bookmarks', '_blank');
      break;
    case 'export-system':
      window.open('/api/export/system', '_blank');
      break;
    case 'new-todo':
      document.getElementById('todoInput')?.focus();
      break;
    case 'new-note':
      document.getElementById('notesInput')?.focus();
      break;
    case 'grid':
      if (window.momoSetEditing) {
        const grid = document.getElementById('momoGrid');
        window.momoSetEditing(!grid.classList.contains('grid-editing'));
      }
      break;
    case 'reset-layout':
      localStorage.removeItem('momo-grid-layout-v10');
      location.reload();
      break;
    case 'focus':
      document.getElementById('focusInput')?.focus();
      break;
  }
}
