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

  bellBtn.addEventListener('click', () => {
    playSound('click');
    if ('Notification' in window && Notification.permission === 'granted') {
      showToast('🔔 Le notifiche sono già attive');
    } else {
      requestNotificationPermission();
    }
  });
}
