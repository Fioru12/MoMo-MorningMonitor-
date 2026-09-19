import { fetchAPI, showToast, playSound, escapeHtml, emptyState } from '../../state.js';

export function initBookmarksWidget() {
  const form = document.getElementById('bookmarksForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('bookmarkName');
      const urlInput = document.getElementById('bookmarkUrl');
      const name = nameInput.value.trim();
      const url = urlInput.value.trim();
      if (!name || !url) {
        showToast('Compila nome e URL');
        return;
      }

      let normalized = url;
      if (!/^https?:\/\//i.test(normalized)) normalized = 'https://' + normalized;
      try {
        new URL(normalized);
      } catch {
        showToast('URL non valido');
        return;
      }

      try {
        await fetch('/api/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, url: normalized }),
        });
        nameInput.value = '';
        urlInput.value = '';
        playSound('click');
        showToast('Bookmark aggiunto ✓');
        loadBookmarks();
      } catch {
        showToast('Errore aggiunta bookmark');
      }
    });
  }

  const search = document.getElementById('bookmarksSearch');
  if (search) {
    search.addEventListener('input', () => {
      const q = search.value.toLowerCase();
      document.querySelectorAll('#bookmarksList .bookmark-item').forEach((el) => {
        el.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  }

  loadBookmarks();
}

export async function loadBookmarks() {
  try {
    const bookmarks = await fetchAPI('/api/bookmarks');
    const list = document.getElementById('bookmarksList');
    const countEl = document.getElementById('bookmarksCount');
    if (!list) return;
    if (countEl) countEl.textContent = bookmarks.length ? `(${bookmarks.length})` : '';

    if (bookmarks.length === 0) {
      list.innerHTML = emptyState('🔖', 'Nessun bookmark. Aggiungine uno!');
      return;
    }

    list.innerHTML = bookmarks
      .map(
        (b) => `
      <li class="bookmark-item" data-id="${b.id}">
        <a href="${b.url}" target="_blank" class="bookmark-link">
          <img src="${getFaviconUrl(b.url)}" alt="" class="bookmark-favicon" width="16" height="16" onerror="this.style.display='none'" />
          ${escapeHtml(b.name)}
        </a>
        <button class="bookmark-delete" aria-label="Elimina">✕</button>
      </li>
    `
      )
      .join('');

    list.querySelectorAll('.bookmark-delete').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const li = e.target.closest('.bookmark-item');
        li.classList.add('removing');
        playSound('delete');
        const id = li.dataset.id;
        setTimeout(async () => {
          await fetch(`/api/bookmarks/${id}`, { method: 'DELETE' });
          loadBookmarks();
        }, 300);
      });
    });
  } catch {
    showToast('⚠️ Errore caricamento bookmarks');
  }
}

function getFaviconUrl(url) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return 'https://www.google.com/s2/favicons?domain=example.com&sz=32';
  }
}
