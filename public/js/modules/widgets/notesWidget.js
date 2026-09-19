import { fetchAPI, showToast, playSound, escapeHtml, emptyState } from '../../state.js';

export function initNotesWidget() {
  const form = document.getElementById('notesForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('notesInput');
      const text = input.value.trim();
      if (!text) return;

      try {
        await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        input.value = '';
        playSound('click');
        loadNotes();
      } catch {
        showToast('⚠️ Errore salvataggio nota');
      }
    });
  }

  loadNotes();
}

export async function loadNotes() {
  try {
    const notes = await fetchAPI('/api/notes');
    const list = document.getElementById('notesList');
    const countEl = document.getElementById('notesCount');
    if (!list) return;
    if (countEl) countEl.textContent = notes.length ? `(${notes.length})` : '';

    if (notes.length === 0) {
      list.innerHTML = emptyState('📝', 'Nessuna nota. Aggiungine una!');
      return;
    }

    list.innerHTML = notes
      .map(
        (n) => `
      <li class="note-item" data-id="${n.id}">
        <span class="note-text">${escapeHtml(n.text)}</span>
        <button class="note-delete" aria-label="Elimina">✕</button>
      </li>
    `
      )
      .join('');

    list.querySelectorAll('.note-delete').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const li = e.target.closest('.note-item');
        li.classList.add('removing');
        playSound('delete');
        const id = li.dataset.id;
        setTimeout(async () => {
          await fetch(`/api/notes/${id}`, { method: 'DELETE' });
          loadNotes();
        }, 300);
      });
    });
  } catch {
    showToast('⚠️ Errore caricamento note');
  }
}
