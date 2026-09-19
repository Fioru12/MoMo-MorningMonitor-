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

  // Refresh periodici
  setInterval(loadWeather, 60000);
  setInterval(() => {
    if (!isWebSocketOpen()) loadSystem();
  }, 5000);
  setInterval(loadNews, 120000);
  setInterval(loadNotes, 30000);
  setInterval(loadBookmarks, 30000);
  setInterval(loadCalendar, 60000);
  setInterval(loadNetwork, 5000);
  setInterval(loadStorage, 30000);
  setInterval(loadServices, 10000);
  setInterval(loadGitHub, 300000);
  setInterval(loadCryptoMarkets, 120000);
  setInterval(loadMarkets, 120000);
  setInterval(loadEtf, 120000);
  setInterval(updateHeaderWeather, 300000);
});
