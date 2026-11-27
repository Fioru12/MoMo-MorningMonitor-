import { showToast, playSound } from '../state.js';

export function requestNotificationPermission() {
  if (!('Notification' in window)) {
    showToast('⚠️ Notifiche non supportate dal browser');
    return Promise.resolve(false);
  }

  return Notification.requestPermission().then((permission) => {
    updateNotificationBell(permission === 'granted');
    if (permission === 'granted') {
      showToast('🔔 Notifiche attivate!');
      sendNotification('☀️ MoMo', {
        body: 'Le notifiche push sono attive! Riceverai avvisi per Pomodoro e Focus.',
        icon: '/icon-192.png',
      });
      return true;
    } else {
      showToast('🔕 Notifiche disattivate');
      return false;
    }
  });
}

export function sendNotification(title, options = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const defaultOptions = {
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    ...options,
  };

  try {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, defaultOptions);
      });
    } else {
      new Notification(title, defaultOptions);
    }
  } catch (e) {
    try {
      new Notification(title, defaultOptions);
    } catch (err) {}
  }
}

export function updateNotificationBell(isGranted) {
  const bellBtn = document.getElementById('notificationToggle');
  if (!bellBtn) return;
  bellBtn.classList.toggle('active', isGranted);
  bellBtn.title = isGranted ? 'Notifiche attive (🔔)' : 'Attiva notifiche (🔕)';
}

export function initNotificationButton() {
  const bellBtn = document.getElementById('notificationToggle');
  if (!bellBtn) return;

  const isGranted = 'Notification' in window && Notification.permission === 'granted';
  updateNotificationBell(isGranted);

  const popup = document.getElementById('notifyPopup');
  bellBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    playSound('click');
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      if (!(await requestNotificationPermission())) return;
    }
    popup?.classList.toggle('visible');
  });
  document.getElementById('notifyPopupClose')?.addEventListener('click', () => popup.classList.remove('visible'));
  document.addEventListener('click', (e) => {
    if (popup && !popup.contains(e.target) && e.target !== bellBtn) popup.classList.remove('visible');
  });

  initMorningNotification();
}

// --- Notifica del mattino: all'orario scelto manda il briefing (una volta al giorno) ---
const MORNING_KEY = 'momo-morning-notify';

function getMorningConfig() {
  try {
    return { enabled: false, time: '08:00', ...JSON.parse(localStorage.getItem(MORNING_KEY) || '{}') };
  } catch {
    return { enabled: false, time: '08:00' };
  }
}

async function sendMorningBriefing() {
  const data = await fetch('/api/briefing').then((r) => r.json());
  const tmp = document.createElement('div');
  const lines = (data.bullets || []).map((b) => {
    tmp.innerHTML = b; // i bullet arrivano già escapati dal server: qui li riportiamo a testo
    return tmp.textContent;
  });
  sendNotification('☀️ Buongiorno da MoMo', { body: lines.join('\n'), tag: 'momo-morning' });
}

function initMorningNotification() {
  const enabled = document.getElementById('morningNotifyEnabled');
  const time = document.getElementById('morningNotifyTime');
  const test = document.getElementById('morningNotifyTest');
  const cfg = getMorningConfig();
  if (enabled) enabled.checked = cfg.enabled;
  if (time) time.value = cfg.time;

  const save = () => {
    localStorage.setItem(MORNING_KEY, JSON.stringify({ enabled: enabled.checked, time: time.value || '08:00' }));
    if (enabled.checked) showToast(`🔔 Riassunto ogni giorno alle ${time.value}`);
  };
  enabled?.addEventListener('change', save);
  time?.addEventListener('change', save);
  test?.addEventListener('click', () => sendMorningBriefing().catch(() => showToast('⚠️ Briefing non disponibile')));

  const check = () => {
    const { enabled: on, time: at } = getMorningConfig();
    if (!on || Notification.permission !== 'granted') return;
    const now = new Date();
    const today = now.toDateString();
    const [h, m] = at.split(':').map(Number);
    const due = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
    // Finestra di 2 ore: se il PC si accende alle 8:20 la notifica delle 8:00 arriva comunque.
    if (now >= due && now - due < 2 * 60 * 60 * 1000 && localStorage.getItem('momo-morning-sent') !== today) {
      localStorage.setItem('momo-morning-sent', today);
      sendMorningBriefing().catch(() => {});
    }
  };
  check();
  setInterval(check, 30 * 1000);
}
