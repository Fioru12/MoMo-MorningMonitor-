import { showToast, state } from '../state.js';
import { LAYOUT_KEY } from './grid.js';

const WIDGET_DEFS = [
  { id: 'weather', label: '🌤️ Meteo', desc: 'Temperatura & previsioni' },
  { id: 'system', label: '💻 Sistema', desc: 'CPU/RAM live' },
  { id: 'focus', label: '🎯 Focus', desc: 'Obiettivo del giorno' },
  { id: 'todo', label: '✅ Todo', desc: 'Task giornalieri' },
  { id: 'news', label: '📰 Briefing', desc: 'Notizie del mondo' },
  { id: 'notes', label: '📝 Note', desc: 'Note veloci' },
  { id: 'bookmarks', label: '🔖 Bookmarks', desc: 'Link rapidi' },
  { id: 'snippets', label: '📋 Snippets', desc: 'Comandi CLI' },
  { id: 'calendar', label: '📅 Calendario', desc: 'Mese corrente' },
  { id: 'network', label: '🌐 Rete', desc: 'IP & interfacce' },
  { id: 'storage', label: '💾 Storage', desc: 'Dischi' },
  { id: 'services', label: '⚙️ Servizi', desc: 'Systemctl' },
  { id: 'github', label: '🐙 GitHub', desc: 'Repo & profilo' },
  { id: 'crypto', label: '₿ Crypto', desc: 'BTC/ETH/SOL' },
  { id: 'markets', label: '📈 Borsa', desc: 'S&P 500, Nasdaq, FTSE MIB' },
  { id: 'etf', label: '📈 ETF', desc: 'QQQ, SPY, VWCE' },
  { id: 'timer', label: '⏱️ Pomodoro', desc: '25 min timer' },
];

const PROFILES = {
  morning: ['system', 'notes', 'bookmarks', 'snippets', 'calendar', 'network', 'storage', 'services', 'github', 'crypto', 'timer'],
  work: ['calendar', 'crypto', 'timer'],
  evening: ['services', 'network', 'storage', 'github'],
};

function getHidden() {
  try {
    return JSON.parse(localStorage.getItem('momo-hidden-widgets') || '[]');
  } catch {
    return [];
  }
}

function applyHidden() {
  const hidden = new Set(getHidden());
  WIDGET_DEFS.forEach((d) => {
    const el = document.querySelector(`.grid-stack-item[gs-id="${d.id}"]`);
    if (el) el.style.display = hidden.has(d.id) ? 'none' : '';
  });
  if (state.grid) {
    try {
      state.grid.compact();
    } catch {}
  }
}

export function initWidgetManager() {
  const overlay = document.getElementById('widgetManagerOverlay');
  const grid = document.getElementById('wmGrid');
  const btn = document.getElementById('widgetManagerBtn');
  const closeBtn = document.getElementById('wmClose');
  const doneBtn = document.getElementById('wmDone');
  const showAllBtn = document.getElementById('wmShowAll');

  function setHidden(arr) {
    localStorage.setItem('momo-hidden-widgets', JSON.stringify(arr));
    applyHidden();
  }

  function render() {
    if (!grid) return;
    const hidden = new Set(getHidden());
    grid.innerHTML = WIDGET_DEFS.map(
      (d) => `
      <label class="wm-item ${hidden.has(d.id) ? 'off' : ''}">
        <input type="checkbox" ${hidden.has(d.id) ? '' : 'checked'} data-id="${d.id}" />
        <span><div>${d.label}</div><div style="font-size:0.72rem;color:var(--text-tertiary);font-weight:500">${d.desc}</div></span>
      </label>
    `
    ).join('');
    grid.querySelectorAll('input').forEach((inp) => {
      inp.addEventListener('change', () => {
        const id = inp.getAttribute('data-id');
        let hiddenArr = getHidden();
        if (inp.checked) hiddenArr = hiddenArr.filter((x) => x !== id);
        else if (!hiddenArr.includes(id)) hiddenArr.push(id);
        setHidden(hiddenArr);
        render();
      });
    });
  }

  if (overlay && grid && btn) {
    const open = () => {
      render();
      overlay.classList.add('visible');
    };
    const close = () => overlay.classList.remove('visible');

    btn.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (doneBtn) doneBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    if (showAllBtn) {
      showAllBtn.addEventListener('click', () => {
        setHidden([]);
        render();
      });
    }
  }

  applyHidden();

  // Profili Mattina/Lavoro/Sera
  const profileBtns = document.querySelectorAll('.profile-btn');
  function applyProfile(name) {
    const hidden = PROFILES[name] || [];
    localStorage.setItem('momo-hidden-widgets', JSON.stringify(hidden));
    localStorage.setItem('momo-profile', name);
    profileBtns.forEach((b) => b.classList.toggle('active', b.dataset.profile === name));
    applyHidden();

    // Meteo occupa tutta la riga se Sistema è nascosto, altrimenti metà
    const weatherEl = document.querySelector('.grid-stack-item[gs-id="weather"]');
    if (weatherEl && state.grid) {
      try {
        state.grid.update(weatherEl, { w: hidden.includes('system') ? 12 : 6 });
      } catch {}
    }
  }
  profileBtns.forEach((b) => b.addEventListener('click', () => applyProfile(b.dataset.profile)));
  const savedProfile = localStorage.getItem('momo-profile');
  applyProfile(savedProfile && PROFILES[savedProfile] ? savedProfile : 'morning');

  initBackupRestore();
}

function initBackupRestore() {
  const exportBtn = document.getElementById('wmExport');
  const importBtn = document.getElementById('wmImport');
  const importFile = document.getElementById('wmImportFile');

  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      try {
        const [todos, notes, bookmarks, snippets] = await Promise.all([
          fetch('/api/todos').then((r) => r.json()).catch(() => []),
          fetch('/api/notes').then((r) => r.json()).catch(() => []),
          fetch('/api/bookmarks').then((r) => r.json()).catch(() => []),
          fetch('/api/snippets').then((r) => r.json()).catch(() => []),
        ]);
        const backup = {
          version: 1,
          exportedAt: new Date().toISOString(),
          settings: {
            wallpaper: localStorage.getItem('momo-wallpaper'),
            theme: document.documentElement.getAttribute('data-theme'),
            accent: localStorage.getItem('momo-accent'),
            profile: localStorage.getItem('momo-profile'),
            hiddenWidgets: localStorage.getItem('momo-hidden-widgets'),
            layout: localStorage.getItem(LAYOUT_KEY),
          },
          data: { todos, notes, bookmarks, snippets },
        };
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `momo-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('💾 Backup esportato');
      } catch {
        showToast('⚠️ Errore esportazione');
      }
    });
  }

  if (importBtn && importFile) importBtn.addEventListener('click', () => importFile.click());
  if (importFile) {
    importFile.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const backup = JSON.parse(text);
        if (!backup.data || !backup.version) {
          showToast('⚠️ File non valido');
          return;
        }
        const { todos, notes, bookmarks, snippets } = backup.data;
        if (backup.settings) {
          const s = backup.settings;
          if (s.wallpaper) localStorage.setItem('momo-wallpaper', s.wallpaper);
          if (s.theme) document.documentElement.setAttribute('data-theme', s.theme);
          if (s.accent) localStorage.setItem('momo-accent', s.accent);
          if (s.profile) localStorage.setItem('momo-profile', s.profile);
          if (s.hiddenWidgets) localStorage.setItem('momo-hidden-widgets', s.hiddenWidgets);
          if (s.layout) localStorage.setItem(LAYOUT_KEY, s.layout);
        }
        for (const t of todos || []) {
          await fetch('/api/todos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: t.text, done: t.done }) }).catch(() => {});
        }
        for (const n of notes || []) {
          await fetch('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: n.text }) }).catch(() => {});
        }
        for (const b of bookmarks || []) {
          await fetch('/api/bookmarks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: b.name, url: b.url }) }).catch(() => {});
        }
        for (const s of snippets || []) {
          await fetch('/api/snippets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: s.title, command: s.command }) }).catch(() => {});
        }
        showToast('📂 Backup importato — ricarica');
        setTimeout(() => location.reload(), 1500);
      } catch {
        showToast('⚠️ File di backup non valido');
      }
      importFile.value = '';
    });
  }
}
