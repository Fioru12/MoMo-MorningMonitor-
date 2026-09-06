// ==================== SHARED CLIENT STATE & UTILITIES ====================

export const state = {
  grid: null,
  cpuChart: null,
  ramChart: null,
  hourlyChart: null,
  timerInterval: null,
  timerSeconds: 25 * 60,
  timerRunning: false,
  widgetTimestamps: {},
};

export async function fetchAPI(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

export function playSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    switch (type) {
      case 'todo':
      case 'click':
        osc.frequency.value = 800;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
        break;
      case 'delete':
        osc.frequency.value = 400;
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
        break;
      case 'refresh':
        osc.frequency.value = 600;
        osc.type = 'triangle';
        gain.gain.setValueAtTime(0.03, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
        break;
      case 'theme':
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.1);
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
        break;
    }
  } catch (e) {
    // AudioContext non supportato o bloccato dall'utente
  }
}

export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

export function emptyState(icon, text) {
  return `<div class="widget-empty"><span class="widget-empty-icon">${icon}</span>${escapeHtml(text)}</div>`;
}

export function timeAgo(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'adesso';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + 'm fa';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + 'h fa';
  return Math.floor(hours / 24) + 'g fa';
}

export function setWidgetTimestamp(id) {
  state.widgetTimestamps[id] = new Date();
  const el = document.getElementById(id + 'Timestamp');
  if (el) el.textContent = timeAgo(new Date());
}

export function refreshTimestamps() {
  Object.keys(state.widgetTimestamps).forEach(id => {
    const el = document.getElementById(id + 'Timestamp');
    if (el) el.textContent = timeAgo(state.widgetTimestamps[id]);
  });
}

export function formatBytes(bytes) {
  if (bytes == null || bytes === 0) return '0 B';
  if (typeof bytes === 'string' && /[BKMGT]/.test(bytes)) return bytes;
  const b = parseInt(bytes);
  if (isNaN(b)) return bytes;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return (b / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
}

export function parseDecimal(val) {
  if (val == null) return NaN;
  if (typeof val === 'number') return val;
  return parseFloat(String(val).replace(',', '.'));
}

export function formatPrice(val, currency = '€') {
  const num = parseDecimal(val);
  if (isNaN(num)) return val ?? '—';
  return currency + num.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatPercent(val) {
  const num = parseDecimal(val);
  if (isNaN(num)) return val ?? '—';
  return num.toFixed(1) + '%';
}

export function getWeatherIcon(desc) {
  if (!desc) return '🌤️';
  const d = desc.toLowerCase();
  if (d.includes('temporale') || d.includes('thunder')) return '⛈️';
  if (d.includes('neve') || d.includes('snow') || d.includes('nevic')) return '❄️';
  if (d.includes('pioggia') || d.includes('rain') || d.includes('piov') || d.includes('rovesc')) return '🌧️';
  if (d.includes('foschia') || d.includes('nebbia') || d.includes('mist')) return '🌫️';
  if (d.includes('nuvol') || d.includes('cloud') || d.includes('copert')) return '☁️';
  if (d.includes('parti') && (d.includes('nuvol') || d.includes('cloud'))) return '⛅';
  if (d.includes('sole') || d.includes('sun') || d.includes('sereno') || d.includes('chiaro')) return '☀️';
  if (d.includes('vento') || d.includes('wind')) return '💨';
  return '🌤️';
}

export function animateCounter(element, targetValue, suffix = '') {
  if (!element) return;
  const target = parseInt(targetValue);
  if (isNaN(target)) {
    element.textContent = targetValue + suffix;
    return;
  }

  const duration = 800;
  const startTime = performance.now();
  const startValue = parseInt(element.textContent) || 0;

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(startValue + (target - startValue) * easeProgress);
    element.textContent = current + suffix;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}
