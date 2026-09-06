import { fetchAPI, showToast, playSound, escapeHtml, emptyState } from '../../state.js';
import { executeCommand } from './terminalWidget.js';

export function initSnippetsWidget() {
  const snippetsForm = document.getElementById('snippetsForm');
  if (snippetsForm) {
    snippetsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const titleInput = document.getElementById('snippetTitle');
      const cmdInput = document.getElementById('snippetCommand');
      const title = titleInput.value.trim();
      const command = cmdInput.value.trim();

      if (!title || !command) {
        showToast('Compila titolo e comando');
        return;
      }

      try {
        await fetch('/api/snippets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, command, category: 'CLI' }),
        });
        titleInput.value = '';
        cmdInput.value = '';
        playSound('todo');
        showToast('Snippet salvato ✓');
        loadSnippets();
      } catch {
        showToast('Errore salvataggio snippet');
      }
    });
  }

  loadSnippets();
}

export async function loadSnippets() {
  try {
    const snippets = await fetchAPI('/api/snippets');
    const list = document.getElementById('snippetsList');

    if (!list) return;

    if (snippets.length === 0) {
      list.innerHTML = emptyState('📋', 'Nessuno snippet salvato');
      return;
    }

    list.innerHTML = snippets
      .map(
        (s) => `
      <div class="snippet-item" data-id="${s.id}">
        <div class="snippet-info">
          <div class="snippet-title">${escapeHtml(s.title)} <span class="snippet-cat">${escapeHtml(s.category || 'CLI')}</span></div>
          <code class="snippet-cmd">${escapeHtml(s.command)}</code>
        </div>
        <div class="snippet-actions">
          <button class="snippet-btn snippet-exec" data-command="${escapeHtml(s.command)}" title="Esegui nel Web Terminal (▶️)">▶️</button>
          <button class="snippet-btn snippet-copy" data-command="${escapeHtml(s.command)}" title="Copia negli appunti (📋)">📋</button>
          <button class="snippet-btn snippet-del" data-id="${s.id}" title="Elimina snippet (✕)">✕</button>
        </div>
      </div>
    `
      )
      .join('');

    // Attach ▶️ Exec listeners
    list.querySelectorAll('.snippet-exec').forEach((btn) => {
      btn.addEventListener('click', () => {
        const command = btn.dataset.command;
        executeCommand(command);
      });
    });

    // Attach 📋 Copy listeners
    list.querySelectorAll('.snippet-copy').forEach((btn) => {
      btn.addEventListener('click', () => {
        const command = btn.dataset.command;
        navigator.clipboard.writeText(command).then(() => {
          playSound('click');
          showToast('Copiato negli appunti! 📋');
        }).catch(() => {
          showToast('Impossibile copiare');
        });
      });
    });

    // Attach ✕ Delete listeners
    list.querySelectorAll('.snippet-del').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        try {
          await fetch(`/api/snippets/${id}`, { method: 'DELETE' });
          playSound('delete');
          showToast('Snippet eliminato');
          loadSnippets();
        } catch {
          showToast('Errore eliminazione');
        }
      });
    });
  } catch {
    const list = document.getElementById('snippetsList');
    if (list) list.innerHTML = emptyState('⚠️', 'Errore caricamento snippet');
  }
}
