import { initTheme } from './modules/theme.js';
import { initWebSocket } from './modules/websocket.js';
import { initNotificationButton } from './modules/notifications.js';
import { initTerminalWidget } from './modules/widgets/terminalWidget.js';
import { initSnippetsWidget } from './modules/widgets/snippetsWidget.js';
import { initTodosWidget } from './modules/widgets/todosWidget.js';
import { initTimer } from './modules/timer.js';

document.addEventListener('DOMContentLoaded', () => {
  // Inizializzazione Tema, Accent Color e Canvas
  initTheme();

  // Inizializzazione Notifiche Push
  initNotificationButton();

  // Inizializzazione Web Terminal
  initTerminalWidget();

  // Inizializzazione Widgets
  initSnippetsWidget();
  initTodosWidget();
  initTimer();

  // Inizializzazione Connessione WebSocket per il monitoraggio in tempo reale
  initWebSocket((systemData) => {
    const cpuVal = document.getElementById('cpuValue');
    const ramVal = document.getElementById('ramValue');
    const cpuBar = document.getElementById('cpuBar');
    const ramBar = document.getElementById('ramBar');

    if (cpuVal && systemData.cpu) {
      cpuVal.textContent = `${systemData.cpu.usage}%`;
      if (cpuBar) cpuBar.style.width = `${systemData.cpu.usage}%`;
    }
    if (ramVal && systemData.memory) {
      ramVal.textContent = `${systemData.memory.percent}%`;
      if (ramBar) ramBar.style.width = `${systemData.memory.percent}%`;
    }
  });
});
