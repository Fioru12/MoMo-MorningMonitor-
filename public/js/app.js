import { initTheme } from './modules/theme.js';
import { initWebSocket, isWebSocketOpen } from './modules/websocket.js';
import { initNotificationButton } from './modules/notifications.js';
import { initTerminalWidget } from './modules/widgets/terminalWidget.js';
import { initSnippetsWidget } from './modules/widgets/snippetsWidget.js';
import { initTodosWidget } from './modules/widgets/todosWidget.js';
import { initTimer } from './modules/timer.js';
import { initHeaderClock } from './modules/headerClock.js';
import { initWeatherWidget, loadWeather, updateHeaderWeather } from './modules/widgets/weatherWidget.js';
import { initSystemWidget, updateSystemWidget, loadSystem } from './modules/widgets/systemWidget.js';
import { initNewsWidget, loadNews } from './modules/widgets/newsWidget.js';
import { initNotesWidget, loadNotes } from './modules/widgets/notesWidget.js';
import { initBookmarksWidget, loadBookmarks } from './modules/widgets/bookmarksWidget.js';
import { initCalendarWidget, loadCalendar } from './modules/widgets/calendarWidget.js';
import { initNetworkWidget, loadNetwork } from './modules/widgets/networkWidget.js';
import { initStorageWidget, loadStorage } from './modules/widgets/storageWidget.js';
import { initServicesWidget, loadServices } from './modules/widgets/servicesWidget.js';
import { initGithubWidget, loadGitHub } from './modules/widgets/githubWidget.js';
import { initMarketsWidget, loadMarkets, loadEtf, loadCryptoMarkets } from './modules/widgets/marketsWidget.js';
import { initFocusWidget } from './modules/widgets/focusWidget.js';
import { initMomoGrid } from './modules/grid.js';
import { initWidgetManager } from './modules/widgetManager.js';
import { initMomoGreeting } from './modules/greeting.js';
import { initWallpaper } from './modules/wallpaper.js';
import { initCommandPalette } from './modules/commandPalette.js';
import { initKeyboardShortcuts } from './modules/keyboardShortcuts.js';

document.addEventListener('DOMContentLoaded', () => {
  // Tema, Accent Color, Landing, Service Worker, Particle Canvas
  initTheme();

  // Griglia (deve inizializzarsi prima del widget manager/profili)
  initMomoGrid();
  initWidgetManager();
  initMomoGreeting();
  initFocusWidget();
  initWallpaper();
  initHeaderClock();

  // Notifiche Push
  initNotificationButton();

  // Web Terminal
  initTerminalWidget();

  // Widgets
  initSnippetsWidget();
  initTodosWidget();
  initTimer();
  initWeatherWidget();
  initSystemWidget();
  initNewsWidget();
  initNotesWidget();
  initBookmarksWidget();
  initCalendarWidget();
  initNetworkWidget();
  initStorageWidget();
  initServicesWidget();
  initGithubWidget();
  initMarketsWidget();

  initCommandPalette();
  initKeyboardShortcuts();

  // Connessione WebSocket per il monitoraggio in tempo reale
  initWebSocket((systemData) => updateSystemWidget(systemData));

  // Refresh periodici: in pausa quando la scheda è nascosta, recuperati al ritorno se scaduti
  const tasks = [];
  const every = (fn, ms) => {
    const task = { fn, ms, last: Date.now() };
    tasks.push(task);
    setInterval(() => {
      if (document.hidden) return;
      task.last = Date.now();
      fn();
    }, ms);
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    const now = Date.now();
    tasks.forEach((t) => {
      if (now - t.last >= t.ms) {
        t.last = now;
        t.fn();
      }
    });
  });

  every(loadWeather, 60000);
  every(() => {
    if (!isWebSocketOpen()) loadSystem();
  }, 5000);
  every(loadNews, 120000);
  every(loadNotes, 30000);
  every(loadBookmarks, 30000);
  every(loadCalendar, 60000);
  every(loadNetwork, 5000);
  every(loadStorage, 30000);
  every(loadServices, 10000);
  every(loadGitHub, 300000);
  every(loadCryptoMarkets, 120000);
  every(loadMarkets, 120000);
  every(loadEtf, 120000);
  every(updateHeaderWeather, 300000);
});
