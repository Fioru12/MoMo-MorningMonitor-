
// ==================== WebSocket Client ====================
let ws = null;
function connectWebSocket() {
    ws = new WebSocket('ws://' + window.location.hostname + ':3002');
    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'system') {
                updateSystemWidget(data.data);
            }
        } catch(e) {}
    };
    ws.onclose = () => setTimeout(connectWebSocket, 5000);
    ws.onerror = () => setTimeout(connectWebSocket, 5000);
}
setTimeout(connectWebSocket, 1000);

// ==================== LANDING PAGE ====================
const landingOverlay = document.getElementById('landingOverlay');
const landingBtn = document.getElementById('landingBtn');

function hideLanding() {
  if (landingOverlay) {
    landingOverlay.classList.add('hidden');
    localStorage.setItem('devdash-landing-seen', 'true');
  }
}

if (landingBtn) {
  landingBtn.addEventListener('click', hideLanding);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && landingOverlay && !landingOverlay.classList.contains('hidden')) {
    hideLanding();
  }
});

// ==================== THEME TOGGLE ====================
const themeToggle = document.getElementById('themeToggle');

function getPreferredTheme() {
  const saved = localStorage.getItem('devdash-theme');
  if (saved) return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('devdash-theme', theme);
}

setTheme(getPreferredTheme());

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  setTheme(current === 'dark' ? 'light' : 'dark');
  playSound('theme');
});

// ==================== HEADER DATE ====================
function updateHeaderDate() {
  const now = new Date();
  const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  const day = dayNames[now.getDay()];
  const date = now.getDate();
  const month = monthNames[now.getMonth()];
  const year = now.getFullYear();
  document.getElementById('headerDate').textContent = `${day} ${date} ${month} ${year}`;
}
updateHeaderDate();

// ==================== COLOR PICKER ====================
const colorPickerBtn = document.getElementById('colorPickerBtn');
const colorPopup = document.getElementById('colorPopup');
const colorPopupClose = document.getElementById('colorPopupClose');
const colorOptions = document.querySelectorAll('.color-opt');

function getAccentRGB(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

function setAccentColor(hex) {
  const root = document.documentElement;
  root.style.setProperty('--accent', hex);
  root.style.setProperty('--accent-rgb', getAccentRGB(hex));
  root.style.setProperty('--accent-light', hex);
  root.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${hex}, ${hex})`);
  localStorage.setItem('devdash-accent', hex);

  colorOptions.forEach(opt => opt.classList.remove('active'));
  const activeOpt = document.querySelector(`.color-opt[data-color="${hex}"]`);
  if (activeOpt) activeOpt.classList.add('active');
}

const savedAccent = localStorage.getItem('devdash-accent');
if (savedAccent) setAccentColor(savedAccent);

colorPickerBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  colorPopup.classList.toggle('visible');
});

colorPopupClose.addEventListener('click', () => {
  colorPopup.classList.remove('visible');
});

document.addEventListener('click', (e) => {
  if (!colorPopup.contains(e.target) && e.target !== colorPickerBtn) {
    colorPopup.classList.remove('visible');
  }
});

colorOptions.forEach(opt => {
  opt.addEventListener('click', () => {
    const color = opt.dataset.color;
    setAccentColor(color);
    playSound('theme');
  });
});

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key.toLowerCase() === 'c') {
    e.preventDefault();
    colorPopup.classList.toggle('visible');
  }
});

// ==================== SOUND EFFECTS ====================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    switch (type) {
      case 'todo':
        osc.frequency.value = 800;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
        break;
      case 'delete':
        osc.frequency.value = 400;
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
        break;
      case 'refresh':
        osc.frequency.value = 600;
        osc.type = 'triangle';
        gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
        break;
      case 'theme':
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(600, audioCtx.currentTime + 0.1);
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
        break;
    }
  } catch {
    // Silently fail
  }
}

// ==================== PARTICLE CANVAS ====================
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');
let particles = [];
const PARTICLE_COUNT = window.innerWidth < 768 ? 10 : 30;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

class Particle {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 1.5 + 0.5;
    this.speedX = (Math.random() - 0.5) * 0.3;
    this.speedY = (Math.random() - 0.5) * 0.3;
    this.opacity = Math.random() * 0.3 + 0.1;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;

    if (this.x < 0) this.x = canvas.width;
    if (this.x > canvas.width) this.x = 0;
    if (this.y < 0) this.y = canvas.height;
    if (this.y > canvas.height) this.y = 0;
  }

  draw() {
    const accentColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent-rgb')
      .trim() || '0, 113, 227';

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${accentColor}, ${this.opacity})`;
    ctx.fill();
  }
}

for (let i = 0; i < PARTICLE_COUNT; i++) {
  particles.push(new Particle());
}

function drawConnections() {
  const accentColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent-rgb')
    .trim() || '0, 113, 227';

  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 120) {
        const opacity = (1 - dist / 120) * 0.08;
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.strokeStyle = `rgba(${accentColor}, ${opacity})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }
}

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  particles.forEach(p => {
    p.update();
    p.draw();
  });

  drawConnections();
  requestAnimationFrame(animateParticles);
}

animateParticles();

// ==================== HEADER CLOCK ====================
const clockSelect = document.getElementById('clockSelect');
const headerClockTime = document.getElementById('headerClockTime');
const headerClockDate = document.getElementById('headerClockDate');

function updateHeaderClock() {
  const zone = clockSelect.value;
  const now = new Date();
  const timeStr = now.toLocaleTimeString('it-IT', {
    timeZone: zone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const dateStr = now.toLocaleDateString('it-IT', {
    timeZone: zone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  headerClockTime.textContent = timeStr;
  headerClockDate.textContent = dateStr;
}
updateHeaderClock();
setInterval(updateHeaderClock, 1000);

clockSelect.addEventListener('change', updateHeaderClock);

// ==================== FOOTER YEAR ====================
document.getElementById('footerYear').textContent = new Date().getFullYear();

// ==================== API FETCH ====================
async function fetchAPI(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function showError(widgetId, message) {
  const el = document.getElementById(widgetId);
  if (!el) return;
  el.textContent = message;
  el.classList.add('visible');
}

function hideError(widgetId) {
  const el = document.getElementById(widgetId);
  if (!el) return;
  el.classList.remove('visible');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== ANIMATED COUNTER ====================
function animateCounter(element, targetValue, suffix = '') {
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

// ==================== SPARKLINE ====================
const cpuHistory = [];
const ramHistory = [];
const MAX_HISTORY = 60;

function drawSparkline(canvasId, data, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;

  const c = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const padding = 2;

  c.clearRect(0, 0, w, h);

  if (data.length < 2) return;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  // Draw fill
  c.beginPath();
  c.moveTo(0, h - padding);
  data.forEach((val, i) => {
    const x = (i / (data.length - 1)) * (w - padding * 2) + padding;
    const y = (h - padding) - ((val - min) / range) * (h - padding * 2);
    c.lineTo(x, y);
  });
  c.lineTo(w - padding, h - padding);
  c.closePath();

  const gradient = c.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, color.replace('0.', '0.15'));
  gradient.addColorStop(1, color.replace('0.', '0.01'));
  c.fillStyle = gradient;
  c.fill();

  // Draw line
  c.beginPath();
  data.forEach((val, i) => {
    const x = (i / (data.length - 1)) * (w - padding * 2) + padding;
    const y = (h - padding) - ((val - min) / range) * (h - padding * 2);
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  });
  c.strokeStyle = color;
  c.lineWidth = 1.5;
  c.stroke();
}

// ==================== NEWS ====================
let newsData = [];

async function loadNews() {
  try {
    const stories = await fetchAPI('/api/news');
    newsData = stories;
    const list = document.getElementById('newsList');
    
    if (stories.length === 0) {
      list.innerHTML = '<div style="color: var(--text-tertiary); text-align: center; padding: 20px;">Nessuna notizia disponibile</div>';
      return;
    }

    list.innerHTML = stories.map((story, i) => {
      const timeAgo = getTimeAgo(story.time);
      return `
        <a href="${story.url}" target="_blank" class="news-item" style="animation-delay: ${i * 0.05}s">
          <div class="news-score">
            <span>${story.score}</span>
            <span class="news-score-label">punti</span>
          </div>
          <div class="news-content">
            <div class="news-title">${escapeHtml(story.title)}</div>
            <div class="news-meta">
              <span>👤 ${story.author}</span>
              <span>💬 ${story.comments}</span>
              <span>🕐 ${timeAgo}</span>
            </div>
          </div>
        </a>
      `;
    }).join('');

    // Update ticker
    updateTicker(stories);
  } catch {
    document.getElementById('newsList').innerHTML = '<div style="color: var(--text-tertiary); text-align: center; padding: 20px;">Errore caricamento notizie</div>';
  }
}

function updateTicker(stories) {
  const track = document.getElementById('tickerTrack');
  if (stories.length === 0) {
    track.innerHTML = '<span class="ticker-text">Nessuna notizia al momento</span>';
    return;
  }
  // Create a long string with all titles separated by bullets
  const text = stories.map(s => s.title).join('  •  ') + '  •  ';
  track.innerHTML = `<span class="ticker-text">${escapeHtml(text)}</span>`;
}

function getTimeAgo(timestamp) {
  const seconds = Math.floor(Date.now() / 1000) - timestamp;
  if (seconds < 60) return 'ora';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m fa`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h fa`;
  const days = Math.floor(hours / 24);
  return `${days}g fa`;
}

// ==================== WIDGET: WEATHER ====================
async function loadWeather() {
  hideError('weatherError');
  const tempEl = document.getElementById('weatherTemp');
  tempEl.classList.add('loading');

  try {
    const data = await fetchAPI('/api/weather');

    if (data.error) {
      showError('weatherError', data.error);
      tempEl.classList.remove('loading');
      return;
    }

    tempEl.classList.remove('loading');
    document.getElementById('weatherTemp').textContent = `${data.temp}°`;
    document.getElementById('weatherDesc').textContent = data.desc;
    document.getElementById('weatherFeels').textContent = `${data.feelsLike}°`;
    document.getElementById('weatherHumidity').textContent = `${data.humidity}%`;
    document.getElementById('weatherWind').textContent = `${data.windSpeed} km/h`;
    document.getElementById('weatherCity').textContent = `📍 ${data.city}`;

    // Render forecast 3 giorni
    const forecastRow = document.getElementById('forecastRow');
    if (data.forecast && data.forecast.length > 0) {
      const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
      const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

      forecastRow.innerHTML = data.forecast.map(day => {
        const date = new Date(day.date + 'T00:00:00');
        const dayName = dayNames[date.getDay()];
        const month = monthNames[date.getMonth()];
        const dayNum = date.getDate();

        return `
          <div class="forecast-card">
            <div class="forecast-date">${dayName} ${dayNum} ${month}</div>
            <div class="forecast-icon">${day.icon ? '🌤️' : '🌡️'}</div>
            <div class="forecast-temps">
              <span class="forecast-temp-max">${day.tempMax}°</span>
              <span class="forecast-temp-min">${day.tempMin}°</span>
            </div>
          </div>
        `;
      }).join('');
    } else {
      forecastRow.innerHTML = '';
    }
  } catch (err) {
    tempEl.classList.remove('loading');
    showError('weatherError', 'Errore di connessione');
  }
}


// ==================== HEADER WEATHER ====================
async function updateHeaderWeather() {
  try {
    const data = await fetchAPI('/api/weather');
    if (!data.error) {
      document.getElementById('headerWeatherTemp').textContent = `${data.temp}°`;
      document.getElementById('headerWeatherIcon').textContent = data.desc.includes('nuvol') ? '☁️' : data.desc.includes('pioggia') ? '🌧️' : data.desc.includes('sole') ? '☀️' : '🌤️';
    }
  } catch {
    // silently fail
  }
}
updateHeaderWeather();
setInterval(updateHeaderWeather, 300000); // 5 min

// ==================== WIDGET: CLOCK ====================
async function loadClocks() {
  try {
    const times = await fetchAPI('/api/time');
    const list = document.getElementById('clockList');
    list.innerHTML = times.map(t => `
      <div class="clock-item">
        <span class="clock-label">${t.label}</span>
        <div>
          <span class="clock-time">${t.time}</span>
          <span class="clock-date">${t.date}</span>
        </div>
      </div>
    `).join('');
  } catch {
    document.getElementById('clockList').innerHTML = '<div class="clock-item">Errore caricamento orari</div>';
  }
}

// ==================== WIDGET: SYSTEM ====================
async function loadSystem() {
  try {
    const data = await fetchAPI('/api/system');
    const cpuPct = Math.min(data.cpu.usage, 100);
    const ramPct = Math.min(data.memory.percent, 100);

    animateCounter(document.getElementById('cpuValue'), cpuPct, '%');
    animateCounter(document.getElementById('ramValue'), ramPct, '%');

    document.getElementById('cpuBar').style.width = `${cpuPct}%`;
    document.getElementById('ramBar').style.width = `${ramPct}%`;
    document.getElementById('sysHostname').textContent = data.hostname;
    document.getElementById('sysPlatform').textContent = `${data.platform} (${data.arch})`;
    document.getElementById('sysUptime').textContent = data.uptime;
    document.getElementById('sysLoad').textContent = data.loadAvg.join(' / ');

    cpuHistory.push(cpuPct);
    ramHistory.push(ramPct);
    if (cpuHistory.length > MAX_HISTORY) cpuHistory.shift();
    if (ramHistory.length > MAX_HISTORY) ramHistory.shift();

    const accent = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent').trim() || '#0071e3';
    const success = '#34c759';

    drawSparkline('sparklineCpu', cpuHistory, accent);
    drawSparkline('sparklineRam', ramHistory, success);
  } catch {
    // silently fail
  }
}

// ==================== WIDGET: TODO ====================
async function loadTodos() {
  try {
    const todos = await fetchAPI('/api/todos');
    const list = document.getElementById('todoList');
    if (todos.length === 0) {
      list.innerHTML = '<div style="color: var(--text-tertiary); text-align: center; padding: 16px; font-size: 0.85rem; font-weight: 500;">Nessun task. Aggiungine uno! ✨</div>';
      return;
    }
    list.innerHTML = todos.map(t => `
      <li class="todo-item" data-id="${t.id}">
        <input type="checkbox" class="todo-check" ${t.done ? 'checked' : ''} />
        <span class="todo-text ${t.done ? 'done' : ''}">${escapeHtml(t.text)}</span>
        <button class="todo-delete" aria-label="Elimina">✕</button>
      </li>
    `).join('');

    list.querySelectorAll('.todo-check').forEach(cb => {
      cb.addEventListener('change', async (e) => {
        const li = e.target.closest('.todo-item');
        const id = li.dataset.id;
        await fetch(`/api/todos/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ done: e.target.checked }),
        });
        if (e.target.checked) playSound('todo');
        loadTodos();
      });
    });

    list.querySelectorAll('.todo-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const li = e.target.closest('.todo-item');
        li.classList.add('removing');
        playSound('delete');
        const id = li.dataset.id;
        setTimeout(async () => {
          await fetch(`/api/todos/${id}`, { method: 'DELETE' });
          loadTodos();
        }, 300);
      });
    });
  } catch {
    // silently fail
  }
}

document.getElementById('todoForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('todoInput');
  const text = input.value.trim();
  if (!text) return;

  try {
    await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    input.value = '';
    playSound('todo');
    loadTodos();
  } catch {
    // silently fail
  }
});

// ==================== REFRESH BUTTONS ====================
document.querySelectorAll('.widget-refresh').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const widget = e.target.dataset.widget;
    btn.classList.add('spinning');
    playSound('refresh');
    setTimeout(() => btn.classList.remove('spinning'), 600);

    switch (widget) {
      case 'weather': loadWeather(); break;
      case 'clock': loadClocks(); break;
      case 'system': loadSystem(); break;
      case 'network': loadNetwork(); break;
      case 'storage': loadStorage(); break;
      case 'services': loadServices(); break;
      case 'github': loadGitHub(); break;
      case 'crypto': loadCrypto(); break;
    }
  });
});

// ==================== KEYBOARD SHORTCUTS ====================
const shortcutHint = document.getElementById('shortcutHint');
let hintTimeout;

function showShortcutHint() {
  shortcutHint.classList.add('visible');
  clearTimeout(hintTimeout);
  hintTimeout = setTimeout(() => {
    shortcutHint.classList.remove('visible');
  }, 4000);
}

if (!localStorage.getItem('devdash-hint-seen')) {
  setTimeout(showShortcutHint, 2000);
  localStorage.setItem('devdash-hint-seen', 'true');
}

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;

  switch (e.key.toLowerCase()) {
    case 't':
      e.preventDefault();
      document.getElementById('todoInput').focus();
      break;
    case 'r':
      e.preventDefault();
      loadWeather();
      loadClocks();
      loadSystem();
      loadNotes();
      loadBookmarks();
      loadCalendar();
      loadNetwork();
      loadStorage();
      loadServices();
      loadGitHub();
      loadCrypto();
      playSound('refresh');
      break;
    case 'd':
      e.preventDefault();
      themeToggle.click();
      break;
    case 'c':
      e.preventDefault();
      colorPopup.classList.toggle('visible');
      break;
    case '?':
      e.preventDefault();
      if (shortcutHint.classList.contains('visible')) {
        shortcutHint.classList.remove('visible');
      } else {
        showShortcutHint();
      }
      break;
  }
});

document.addEventListener('click', (e) => {
  if (!shortcutHint.contains(e.target)) {
    shortcutHint.classList.remove('visible');
  }
});

// ==================== THEME CHANGE SPARKLINE REPAINT ====================
const observer = new MutationObserver(() => {
  if (cpuHistory.length > 0) {
    const accent = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent').trim() || '#0071e3';
    drawSparkline('sparklineCpu', cpuHistory, accent);
  }
});
observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

// ==================== WIDGET: NOTES ====================
async function loadNotes() {
  try {
    const notes = await fetchAPI('/api/notes');
    const list = document.getElementById('notesList');
    if (notes.length === 0) {
      list.innerHTML = '<div style="color: var(--text-tertiary); text-align: center; padding: 16px; font-size: 0.85rem; font-weight: 500;">Nessuna nota. Aggiungine una! ✨</div>';
      return;
    }
    list.innerHTML = notes.map(n => `
      <li class="note-item" data-id="${n.id}">
        <span class="note-text">${escapeHtml(n.text)}</span>
        <button class="note-delete" aria-label="Elimina">✕</button>
      </li>
    `).join('');

    list.querySelectorAll('.note-delete').forEach(btn => {
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
    // silently fail
  }
}

document.getElementById('notesForm').addEventListener('submit', async (e) => {
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
    playSound('todo');
    loadNotes();
  } catch {
    // silently fail
  }
});

// ==================== WIDGET: BOOKMARKS ====================
async function loadBookmarks() {
  try {
    const bookmarks = await fetchAPI('/api/bookmarks');
    const list = document.getElementById('bookmarksList');
    if (bookmarks.length === 0) {
      list.innerHTML = '<div style="color: var(--text-tertiary); text-align: center; padding: 16px; font-size: 0.85rem; font-weight: 500;">Nessun bookmark. Aggiungine uno! 🔖</div>';
      return;
    }
    list.innerHTML = bookmarks.map(b => `
      <li class="bookmark-item" data-id="${b.id}">
        <a href="${b.url}" target="_blank" class="bookmark-link">${escapeHtml(b.name)}</a>
        <button class="bookmark-delete" aria-label="Elimina">✕</button>
      </li>
    `).join('');

    list.querySelectorAll('.bookmark-delete').forEach(btn => {
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
    // silently fail
  }
}

document.getElementById('bookmarksForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nameInput = document.getElementById('bookmarkName');
  const urlInput = document.getElementById('bookmarkUrl');
  const name = nameInput.value.trim();
  const url = urlInput.value.trim();
  if (!name || !url) return;

  try {
    await fetch('/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, url }),
    });
    nameInput.value = '';
    urlInput.value = '';
    playSound('todo');
    loadBookmarks();
  } catch {
    // silently fail
  }
});

// ==================== WIDGET: CALENDAR ====================
async function loadCalendar() {
  try {
    const data = await fetchAPI('/api/calendar');
    const header = document.getElementById('calendarHeader');
    const grid = document.getElementById('calendarGrid');
    
    const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    header.textContent = `${monthNames[data.month - 1]} ${data.year}`;

    const dayNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
    let html = dayNames.map(d => `<div class="calendar-day-header">${d}</div>`).join('');

    const firstDay = new Date(data.year, data.month - 1, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;

    for (let i = 0; i < offset; i++) {
      html += '<div class="calendar-day other-month"></div>';
    }

    data.days.forEach(day => {
      const isToday = day.day === data.today;
      html += `<div class="calendar-day ${isToday ? 'today' : ''}">${day.day}</div>`;
    });

    grid.innerHTML = html;
  } catch {
    document.getElementById('calendarGrid').innerHTML = '<div style="color: var(--text-tertiary); text-align: center; padding: 20px;">Errore caricamento calendario</div>';
  }
}

// ==================== WIDGET: NETWORK ====================
async function loadNetwork() {
  try {
    const data = await fetchAPI('/api/network');
    const info = document.getElementById('networkInfo');
    
    let html = '';
    data.interfaces.forEach(iface => {
      html += `
        <div class="network-item">
          <span class="network-label">${iface.name}</span>
          <span class="network-value">${iface.ip}</span>
        </div>
      `;
    });

    html += `
      <div class="network-item">
        <span class="network-label">RX</span>
        <span class="network-value">${data.rxBytes}</span>
      </div>
      <div class="network-item">
        <span class="network-label">TX</span>
        <span class="network-value">${data.txBytes}</span>
      </div>
    `;

    info.innerHTML = html;
  } catch {
    document.getElementById('networkInfo').innerHTML = '<div style="color: var(--text-tertiary); text-align: center; padding: 20px;">Errore caricamento rete</div>';
  }
}

// ==================== WIDGET: STORAGE ====================
async function loadStorage() {
  try {
    const data = await fetchAPI('/api/storage');
    const info = document.getElementById('storageInfo');
    
    if (data.usage.length === 0) {
      info.innerHTML = '<div style="color: var(--text-tertiary); text-align: center; padding: 20px;">Nessun dispositivo di storage</div>';
      return;
    }

    info.innerHTML = data.usage.map(disk => {
      const percent = parseInt(disk.percent) || 0;
      return `
        <div class="storage-item">
          <div class="storage-header">
            <span class="storage-device">${disk.device}</span>
            <span class="storage-percent">${disk.percent}</span>
          </div>
          <div class="storage-bar">
            <div class="storage-bar-fill" style="width: ${percent}%"></div>
          </div>
          <div class="storage-details">
            <span>Usato: ${disk.used}</span>
            <span>Libero: ${disk.free}</span>
          </div>
        </div>
      `;
    }).join('');
  } catch {
    document.getElementById('storageInfo').innerHTML = '<div style="color: var(--text-tertiary); text-align: center; padding: 20px;">Errore caricamento storage</div>';
  }
}

// ==================== WIDGET: SERVICES ====================
async function loadServices() {
  try {
    const services = await fetchAPI('/api/services');
    const list = document.getElementById('servicesList');
    
    if (services.length === 0) {
      list.innerHTML = '<div style="color: var(--text-tertiary); text-align: center; padding: 20px;">Nessun servizio</div>';
      return;
    }

    list.innerHTML = services.map(svc => `
      <div class="service-item">
        <span class="service-name">${svc.name}</span>
        <span class="service-status ${svc.status}">
          <span class="service-dot"></span>
          ${svc.status === 'running' ? 'Attivo' : svc.status === 'stopped' ? 'Fermo' : 'Non trovato'}
        </span>
      </div>
    `).join('');
  } catch {
    document.getElementById('servicesList').innerHTML = '<div style="color: var(--text-tertiary); text-align: center; padding: 20px;">Errore caricamento servizi</div>';
  }
}

// ==================== WIDGET: GITHUB ====================
async function loadGitHub() {
  try {
    const data = await fetchAPI('/api/github');
    const userEl = document.getElementById('githubUser');
    const reposEl = document.getElementById('githubRepos');

    if (!data.user) {
      userEl.innerHTML = '<div style="color: var(--text-tertiary); text-align: center; padding: 20px;">Errore caricamento GitHub</div>';
      return;
    }

    userEl.innerHTML = `
      <img src="${data.user.avatar}" alt="Avatar" class="github-avatar" />
      <div class="github-info">
        <div class="github-name">${data.user.name || data.user.login}</div>
        <div class="github-stats">
          <span>📦 ${data.user.repos}</span>
          <span>👥 ${data.user.followers}</span>
          <span>👤 ${data.user.following}</span>
        </div>
      </div>
    `;

    if (data.repos.length === 0) {
      reposEl.innerHTML = '<div style="color: var(--text-tertiary); text-align: center; padding: 12px; font-size: 0.85rem;">Nessun repository</div>';
      return;
    }

    reposEl.innerHTML = data.repos.map(repo => `
      <a href="https://github.com/${data.user.login}/${repo.name}" target="_blank" class="github-repo">
        <div class="repo-name">${repo.name}</div>
        <div class="repo-desc">${repo.description || 'Nessuna descrizione'}</div>
        <div class="repo-meta">
          <span>⭐ ${repo.stars}</span>
          <span>🍴 ${repo.forks}</span>
          <span>💻 ${repo.language || 'N/A'}</span>
        </div>
      </a>
    `).join('');
  } catch {
    document.getElementById('githubUser').innerHTML = '<div style="color: var(--text-tertiary); text-align: center; padding: 20px;">Errore caricamento GitHub</div>';
  }
}

// ==================== WIDGET: CRYPTO ====================
async function loadCrypto() {
  try {
    const cryptos = await fetchAPI('/api/crypto');
    const list = document.getElementById('cryptoList');
    
    if (cryptos.length === 0) {
      list.innerHTML = '<div style="color: var(--text-tertiary); text-align: center; padding: 20px;">Nessun dato crypto</div>';
      return;
    }

    list.innerHTML = cryptos.map(crypto => {
      const changeClass = crypto.change >= 0 ? 'positive' : 'negative';
      const changeSymbol = crypto.change >= 0 ? '▲' : '▼';
      return `
        <div class="crypto-item">
          <span class="crypto-name">${crypto.name}</span>
          <span class="crypto-price">$${crypto.price.toLocaleString()}</span>
          <span class="crypto-change ${changeClass}">${changeSymbol} ${Math.abs(crypto.change).toFixed(2)}%</span>
        </div>
      `;
    }).join('');
  } catch {
    document.getElementById('cryptoList').innerHTML = '<div style="color: var(--text-tertiary); text-align: center; padding: 20px;">Errore caricamento crypto</div>';
  }
}

// ==================== WIDGET: TIMER ====================
let timerInterval = null;
let timerSeconds = 25 * 60;
let timerRunning = false;

function updateTimerDisplay() {
  const mins = Math.floor(timerSeconds / 60);
  const secs = timerSeconds % 60;
  document.getElementById('timerDisplay').textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

document.getElementById('timerStart').addEventListener('click', () => {
  if (timerRunning) return;
  timerRunning = true;
  timerInterval = setInterval(() => {
    if (timerSeconds > 0) {
      timerSeconds--;
      updateTimerDisplay();
    } else {
      clearInterval(timerInterval);
      timerRunning = false;
      playSound('todo');
    }
  }, 1000);
});

document.getElementById('timerPause').addEventListener('click', () => {
  clearInterval(timerInterval);
  timerRunning = false;
});

document.getElementById('timerReset').addEventListener('click', () => {
  clearInterval(timerInterval);
  timerRunning = false;
  timerSeconds = 25 * 60;
  updateTimerDisplay();
});

// ==================== DRAG & DROP ====================
let draggedWidget = null;
let draggedElement = null;

function initDragAndDrop() {
  const widgets = document.querySelectorAll('.widget');
  
  widgets.forEach(widget => {
    widget.setAttribute('draggable', 'true');
    
    widget.addEventListener('dragstart', (e) => {
      draggedWidget = widget;
      widget.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', widget.id);
    });
    
    widget.addEventListener('dragend', () => {
      widget.classList.remove('dragging');
      draggedWidget = null;
      saveWidgetOrder();
    });
    
    widget.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      
      if (draggedWidget && draggedWidget !== widget) {
        const rect = widget.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        
        if (e.clientY < midY) {
          widget.style.borderTop = '3px solid var(--accent)';
          widget.style.borderBottom = '';
        } else {
          widget.style.borderTop = '';
          widget.style.borderBottom = '3px solid var(--accent)';
        }
      }
    });
    
    widget.addEventListener('dragleave', () => {
      widget.style.borderTop = '';
      widget.style.borderBottom = '';
    });
    
    widget.addEventListener('drop', (e) => {
      e.preventDefault();
      widget.style.borderTop = '';
      widget.style.borderBottom = '';
      
      if (draggedWidget && draggedWidget !== widget) {
        const rect = widget.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const insertBefore = e.clientY < midY;
        
        const parent = widget.parentNode;
        const allWidgets = Array.from(parent.querySelectorAll('.widget'));
        const draggedIndex = allWidgets.indexOf(draggedWidget);
        const targetIndex = allWidgets.indexOf(widget);
        
        if (insertBefore) {
          if (draggedIndex < targetIndex) {
            parent.insertBefore(draggedWidget, widget);
          } else {
            parent.insertBefore(draggedWidget, widget);
          }
        } else {
          if (draggedIndex < targetIndex) {
            parent.insertBefore(draggedWidget, widget.nextSibling);
          } else {
            parent.insertBefore(draggedWidget, widget);
          }
        }
      }
    });
  });
}

function saveWidgetOrder() {
  const rows = document.querySelectorAll('.main-row, .news-row, .tools-row, .info-row');
  const order = {};
  
  rows.forEach(row => {
    const rowId = row.classList[0];
    const widgets = Array.from(row.querySelectorAll('.widget')).map(w => w.id);
    order[rowId] = widgets;
  });
  
  localStorage.setItem('devdash-widget-order', JSON.stringify(order));
}

function loadWidgetOrder() {

// ==================== Charts ====================
let cpuChart = null;
let ramChart = null;

function initCharts() {
    const ctx1 = document.getElementById('cpuChart');
    const ctx2 = document.getElementById('ramChart');
    if (!ctx1 || !ctx2) return;
    
    cpuChart = new Chart(ctx1, {
        type: 'line',
        data: {
            labels: Array(20).fill(''),
            datasets: [{
                label: 'CPU %',
                data: Array(20).fill(0),
                borderColor: '#0071e3',
                tension: 0.4,
                fill: false
            }]
        },
        options: {
            responsive: true,
            animation: { duration: 300 },
            scales: { y: { min: 0, max: 100 } }
        }
    });
    
    ramChart = new Chart(ctx2, {
        type: 'line',
        data: {
            labels: Array(20).fill(''),
            datasets: [{
                label: 'RAM %',
                data: Array(20).fill(0),
                borderColor: '#10b981',
                tension: 0.4,
                fill: false
            }]
        },
        options: {
            responsive: true,
            animation: { duration: 300 },
            scales: { y: { min: 0, max: 100 } }
        }
    });
}

function updateCharts(cpu, ram) {
    if (!cpuChart || !ramChart) return;
    cpuChart.data.datasets[0].data.push(cpu);
    cpuChart.data.datasets[0].data.shift();
    cpuChart.update();
    
    ramChart.data.datasets[0].data.push(ram);
    ramChart.data.datasets[0].data.shift();
    ramChart.update();
}


  const saved = localStorage.getItem('devdash-widget-order');
  if (!saved) return;
  
  try {
    const order = JSON.parse(saved);
    
    Object.entries(order).forEach(([rowId, widgetIds]) => {
      const row = document.querySelector(`.${rowId}`);
      if (!row) return;
      
      const widgets = Array.from(row.querySelectorAll('.widget'));
      const widgetMap = new Map(widgets.map(w => [w.id, w]));
      
      widgetIds.forEach(id => {
        const widget = widgetMap.get(id);
        if (widget) {
          row.appendChild(widget);
        }
      });
    });
  } catch {
    // silently fail
  }
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  // Check if landing page was already seen
  const landingSeen = localStorage.getItem('devdash-landing-seen');
  if (landingSeen) {
    hideLanding();
  }
  
  loadWidgetOrder();
  initDragAndDrop();
  
  loadWeather();
  loadSystem();
  loadTodos();
  loadNotes();
  loadBookmarks();
  loadNews();
  loadCalendar();
  loadNetwork();
  loadStorage();
  loadServices();
  loadGitHub();
  loadCrypto();
  updateHeaderWeather();
  updateHeaderClock();

  setInterval(loadWeather, 60000);
  setInterval(loadSystem, 2000);
  setInterval(loadClocks, 10000);
  setInterval(loadNews, 120000);
  setInterval(loadNotes, 30000);
  setInterval(loadBookmarks, 30000);
  setInterval(loadCalendar, 60000);
  setInterval(loadNetwork, 5000);
  setInterval(loadStorage, 30000);
  setInterval(loadServices, 10000);
  setInterval(loadGitHub, 300000);
  setInterval(loadCrypto, 60000);
  setInterval(updateHeaderWeather, 300000);
});
