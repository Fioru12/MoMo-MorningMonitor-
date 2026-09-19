import { playSound } from '../state.js';
import { loadWeather } from './widgets/weatherWidget.js';
import { loadSystem } from './widgets/systemWidget.js';
import { loadNotes } from './widgets/notesWidget.js';
import { loadBookmarks } from './widgets/bookmarksWidget.js';
import { loadCalendar } from './widgets/calendarWidget.js';
import { loadNetwork } from './widgets/networkWidget.js';
import { loadStorage } from './widgets/storageWidget.js';
import { loadServices } from './widgets/servicesWidget.js';
import { loadGitHub } from './widgets/githubWidget.js';
import { loadCryptoMarkets, loadMarkets, loadEtf } from './widgets/marketsWidget.js';

export function initKeyboardShortcuts() {
  const shortcutHint = document.getElementById('shortcutHint');
  const themeToggle = document.getElementById('themeToggle');
  const colorPopup = document.getElementById('colorPopup');
  let hintTimeout;

  function showShortcutHint() {
    if (!shortcutHint) return;
    shortcutHint.classList.add('visible');
    clearTimeout(hintTimeout);
    hintTimeout = setTimeout(() => shortcutHint.classList.remove('visible'), 4000);
  }

  if (!localStorage.getItem('momo-hint-seen')) {
    setTimeout(showShortcutHint, 2000);
    localStorage.setItem('momo-hint-seen', 'true');
  }

  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key.toLowerCase()) {
      case 't':
        e.preventDefault();
        document.getElementById('todoInput')?.focus();
        break;
      case 'r':
        e.preventDefault();
        loadWeather();
        loadSystem();
        loadNotes();
        loadBookmarks();
        loadCalendar();
        loadNetwork();
        loadStorage();
        loadServices();
        loadGitHub();
        loadCryptoMarkets();
        loadMarkets();
        loadEtf();
        playSound('click');
        break;
      case 'd':
        e.preventDefault();
        themeToggle?.click();
        break;
      case 'c':
        e.preventDefault();
        colorPopup?.classList.toggle('visible');
        break;
      case '?':
        e.preventDefault();
        if (shortcutHint?.classList.contains('visible')) {
          shortcutHint.classList.remove('visible');
        } else {
          showShortcutHint();
        }
        break;
    }
  });

  document.addEventListener('click', (e) => {
    if (shortcutHint && !shortcutHint.contains(e.target)) {
      shortcutHint.classList.remove('visible');
    }
  });
}
