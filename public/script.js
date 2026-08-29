
// ==================== WebSocket Client ====================
let ws = null;
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}`);
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
    localStorage.setItem('momo-landing-seen', 'true');
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
  const saved = localStorage.getItem('momo-theme');
  if (saved) return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('momo-theme', theme);
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

let accentRGB = '0, 113, 227';
function cacheAccent() {
  accentRGB = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent-rgb')
    .trim() || '0, 113, 227';
}

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
  localStorage.setItem('momo-accent', hex);
  cacheAccent();

  colorOptions.forEach(opt => opt.classList.remove('active'));
  const activeOpt = document.querySelector(`.color-opt[data-color="${hex}"]`);
  if (activeOpt) activeOpt.classList.add('active');
}

const savedAccent = localStorage.getItem('momo-accent');
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

cacheAccent();

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
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${accentRGB}, ${this.opacity})`;
    ctx.fill();
  }
}

for (let i = 0; i < PARTICLE_COUNT; i++) {
  particles.push(new Particle());
}

function drawConnections() {
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
        ctx.strokeStyle = `rgba(${accentRGB}, ${opacity})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }
}

let rafId = null;
function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  particles.forEach(p => {
    p.update();
    p.draw();
  });

  drawConnections();
  rafId = requestAnimationFrame(animateParticles);
}

function startParticles() {
  if (rafId) return;
  animateParticles();
}
function stopParticles() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopParticles();
  else startParticles();
});

startParticles();

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

function emptyState(icon, text) {
  return `<div class="widget-empty"><span class="widget-empty-icon">${icon}</span>${escapeHtml(text)}</div>`;
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

// ==================== SPARKLINE HISTORY ====================
const cpuHistory = [];
const ramHistory = [];
const MAX_HISTORY = 60;

// ==================== NEWS ====================
let newsData = [];

async function loadNews() {
  try {
    const stories = await fetchAPI('/api/news');
    newsData = stories;
    const list = document.getElementById('newsList');
    
    if (stories.length === 0) {
      list.innerHTML = emptyState('📰', 'Nessuna notizia disponibile');
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
    document.getElementById('newsList').innerHTML = emptyState('⚠️', 'Errore caricamento notizie');
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
    // hourly 24h + sunrise
    const sunEl = document.getElementById('greetingSun');
    if (sunEl && data.sunrise) {
      sunEl.textContent = `🌅 ${data.sunrise} • 🌇 ${data.sunset}`;
      localStorage.setItem('momo-sunrise', data.sunrise);
      localStorage.setItem('momo-sunset', data.sunset);
    }
    if (data.hourly && data.hourly.length) {
      let hourlyEl = document.getElementById('hourlyRow');
      if (!hourlyEl) {
        const wBody = document.getElementById('weatherBody');
        hourlyEl = document.createElement('div');
        hourlyEl.id = 'hourlyRow';
        hourlyEl.className = 'hourly-row';
        wBody.appendChild(hourlyEl);
      }
      hourlyEl.innerHTML = data.hourly.map(h => `<div class="hourly-item"><div class="hourly-time">${h.time.slice(0,2)}:${h.time.slice(2)}</div><div class="hourly-temp">${h.temp}°</div><div style="font-size:0.6rem;color:var(--text-tertiary)">${h.chanceRain}%</div></div>`).join('');
      // hourly mini chart
      try {
        const ctx = document.getElementById('hourlyChart');
        if (ctx && data.hourly.length > 2) {
          if (window.hourlyChart) window.hourlyChart.destroy();
          window.hourlyChart = new Chart(ctx, {
            type: 'line',
            data: {
              labels: data.hourly.map(h=> h.time.slice(0,2)+':'+h.time.slice(2)),
              datasets: [{ data: data.hourly.map(h=> parseInt(h.temp)), borderColor: '#0071e3', backgroundColor: 'rgba(0,113,227,0.12)', tension: 0.4, fill: true, pointRadius: 0, borderWidth: 2 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins:{legend:{display:false}}, scales:{x:{display:false}, y:{display:false}} }
          });
        }
      } catch {}
    }

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

function updateSystemWidget(data) {
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

  updateSystemSparkline(cpuPct, ramPct);
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
  } catch {
    // silently fail
  }
}

// ==================== WIDGET: TODO ====================
async function loadTodos() {
  try {
    const todos = await fetchAPI('/api/todos');
    const list = document.getElementById('todoList');
    const countEl = document.getElementById('todoCount');
    const pendingCount = todos.filter(t => !t.done).length;
    if (countEl) countEl.textContent = todos.length ? `(${pendingCount}/${todos.length})` : '';

    if (todos.length === 0) {
      list.innerHTML = emptyState('✅', 'Nessun task. Aggiungine uno!');
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

if (!localStorage.getItem('momo-hint-seen')) {
  setTimeout(showShortcutHint, 2000);
  localStorage.setItem('momo-hint-seen', 'true');
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

// ==================== THEME CHANGE REPAINT ====================
const observer = new MutationObserver(() => {
  cacheAccent();
  if (systemSparklineChart) systemSparklineChart.update('none');
});
observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

// ==================== WIDGET: NOTES ====================
async function loadNotes() {
  try {
    const notes = await fetchAPI('/api/notes');
    const list = document.getElementById('notesList');
    const countEl = document.getElementById('notesCount');
    if (countEl) countEl.textContent = notes.length ? `(${notes.length})` : '';
    if (notes.length === 0) {
      list.innerHTML = emptyState('📝', 'Nessuna nota. Aggiungine una!');
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
    const countEl = document.getElementById('bookmarksCount');
    if (countEl) countEl.textContent = bookmarks.length ? `(${bookmarks.length})` : '';
    if (bookmarks.length === 0) {
      list.innerHTML = emptyState('🔖', 'Nessun bookmark. Aggiungine uno!');
      return;
    }
    list.innerHTML = bookmarks.map(b => `
      <li class="bookmark-item" data-id="${b.id}">
        <a href="${b.url}" target="_blank" class="bookmark-link">
          <img src="${getFaviconUrl(b.url)}" alt="" class="bookmark-favicon" width="16" height="16" onerror="this.style.display='none'" />
          ${escapeHtml(b.name)}
        </a>
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
    playSound('todo');
    showToast('Bookmark aggiunto ✓');
    loadBookmarks();
  } catch {
    showToast('Errore aggiunta bookmark');
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

    // dots for todos by day
    let todoDays = new Set();
    try {
      const todos = await fetchAPI('/api/todos');
      todos.forEach(t => {
        const d = new Date(t.createdAt);
        if (d.getMonth()+1 === data.month && d.getFullYear() === data.year) todoDays.add(d.getDate());
      });
    } catch {}
    data.days.forEach(day => {
      const isToday = day.day === data.today;
      const hasTodo = todoDays.has(day.day);
      html += `<div class="calendar-day ${isToday ? 'today' : ''} ${hasTodo ? 'has-todo' : ''}" data-day="${day.day}" title="${hasTodo ? 'Hai task' : ''}">${day.day}${hasTodo ? '<span class="cal-dot"></span>' : ''}</div>`;
    });

    grid.innerHTML = html;
  } catch {
    document.getElementById('calendarGrid').innerHTML = emptyState('⚠️', 'Errore caricamento calendario');
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
    document.getElementById('networkInfo').innerHTML = emptyState('⚠️', 'Errore caricamento rete');
  }
}

// ==================== WIDGET: STORAGE ====================
async function loadStorage() {
  try {
    const data = await fetchAPI('/api/storage');
    const info = document.getElementById('storageInfo');
    
    if (data.usage.length === 0) {
      info.innerHTML = emptyState('💾', 'Nessun dispositivo di storage');
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
    document.getElementById('storageInfo').innerHTML = emptyState('⚠️', 'Errore caricamento storage');
  }
}

// ==================== WIDGET: SERVICES ====================
async function loadServices() {
  try {
    const services = await fetchAPI('/api/services');
    const list = document.getElementById('servicesList');
    
    if (services.length === 0) {
      list.innerHTML = emptyState('⚙️', 'Nessun servizio');
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
    document.getElementById('servicesList').innerHTML = emptyState('⚠️', 'Errore caricamento servizi');
  }
}

// ==================== WIDGET: GITHUB ====================
async function loadGitHub() {
  try {
    const data = await fetchAPI('/api/github');
    const userEl = document.getElementById('githubUser');
    const reposEl = document.getElementById('githubRepos');

    if (!data.user) {
      userEl.innerHTML = emptyState('⚠️', 'Errore caricamento GitHub');
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
      reposEl.innerHTML = emptyState('🐙', 'Nessun repository');
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
    document.getElementById('githubUser').innerHTML = emptyState('⚠️', 'Errore caricamento GitHub');
  }
}

// ==================== WIDGET: CRYPTO ====================
async function loadCrypto() {
  try {
    const cryptos = await fetchAPI('/api/crypto');
    const list = document.getElementById('cryptoList');
    
    if (cryptos.length === 0) {
      list.innerHTML = emptyState('₿', 'Nessun dato crypto');
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
    document.getElementById('cryptoList').innerHTML = emptyState('⚠️', 'Errore caricamento crypto');
  }
}

// ==================== FAVICON FOR BOOKMARKS ====================
function getFaviconUrl(url) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return 'https://www.google.com/s2/favicons?domain=example.com&sz=32';
  }
}

// ==================== SPARKLINE CHART FOR SYSTEM ====================
let systemSparklineChart = null;

function initSystemSparkline() {
  const canvas = document.getElementById('systemSparkline');
  if (!canvas || typeof Chart === 'undefined') return;

  const ctx = canvas.getContext('2d');
  systemSparklineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: Array(15).fill(''),
      datasets: [
        {
          label: 'CPU %',
          data: Array(15).fill(0),
          borderColor: '#0071e3',
          backgroundColor: 'rgba(0, 113, 227, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointRadius: 0,
        },
        {
          label: 'RAM %',
          data: Array(15).fill(0),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointRadius: 0,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      scales: {
        x: { display: false },
        y: { display: false, min: 0, max: 100 }
      },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true }
      }
    }
  });
}

function updateSystemSparkline(cpuVal, ramVal) {
  if (!systemSparklineChart) return;
  const cpuData = systemSparklineChart.data.datasets[0].data;
  const ramData = systemSparklineChart.data.datasets[1].data;

  cpuData.push(cpuVal);
  cpuData.shift();

  ramData.push(ramVal);
  ramData.shift();

  systemSparklineChart.update('none');
}

// ==================== COMMAND PALETTE & SNIPPETS ====================
const cmdPaletteOverlay = document.getElementById('cmdPaletteOverlay');
const cmdPaletteInput = document.getElementById('cmdPaletteInput');

function toggleCmdPalette(open) {
  if (open) {
    cmdPaletteOverlay.classList.add('visible');
    cmdPaletteInput.value = '';
    cmdPaletteInput.focus();
    renderPalette('');
  } else {
    cmdPaletteOverlay.classList.remove('visible');
  }
}
function renderPalette(q) {
  const results = document.getElementById('cmdPaletteResults');
  if (!results || !q) {
    // show default actions when empty
    results.querySelectorAll('.cmd-palette-item').forEach(el=> el.style.display = '');
    return;
  }
  const query = q.toLowerCase();
  // fuzzy hide non-matching actions
  results.querySelectorAll('.cmd-palette-item').forEach(el=>{
    const txt = el.textContent.toLowerCase();
    el.style.display = txt.includes(query) ? '' : 'none';
  });
  // also inject dynamic results from todo/notes/bookmarks cache
  let dyn = document.getElementById('paletteDyn');
  if (!dyn) {
    dyn = document.createElement('div');
    dyn.id = 'paletteDyn';
    results.appendChild(dyn);
  }
  dyn.innerHTML = '';
  // async search in background
  Promise.all([fetch('/api/todos').then(r=>r.json()).catch(()=>[]), fetch('/api/notes').then(r=>r.json()).catch(()=>[]), fetch('/api/bookmarks').then(r=>r.json()).catch(()=>[])]).then(([todos, notes, bookmarks])=>{
    const items = [
      ...todos.map(t=>({label: '✅ '+t.text, text: t.text})),
      ...notes.map(n=>({label: '📝 '+n.text.slice(0,40), text: n.text})),
      ...bookmarks.map(b=>({label: '🔖 '+b.name, text: b.name+' '+b.url})),
    ].filter(i=> i.text.toLowerCase().includes(query)).slice(0,5);
    dyn.innerHTML = items.map(i=> `<div class="cmd-palette-item" style="color:var(--text-secondary)">${i.label}</div>`).join('');
  });
}
if (cmdPaletteInput) {
  cmdPaletteInput.addEventListener('input', ()=> renderPalette(cmdPaletteInput.value));
}

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    const isOpen = cmdPaletteOverlay.classList.contains('visible');
    toggleCmdPalette(!isOpen);
  } else if (e.key === 'Escape') {
    toggleCmdPalette(false);
  }
});

if (cmdPaletteOverlay) {
  cmdPaletteOverlay.addEventListener('click', (e) => {
    if (e.target === cmdPaletteOverlay) toggleCmdPalette(false);
  });
}

document.querySelectorAll('.cmd-palette-item').forEach(item => {
  item.addEventListener('click', () => {
    const action = item.getAttribute('data-action');
    executeCmdAction(action);
    toggleCmdPalette(false);
  });
});

function executeCmdAction(action) {
  switch (action) {
    case 'theme':
      document.getElementById('themeToggle').click();
      break;
    case 'refresh':
      loadWeather(); loadSystem(); loadTodos(); loadNotes(); loadBookmarks(); loadNews();
      break;
    case 'export-todos':
      window.open('/api/export/todos', '_blank');
      break;
    case 'export-notes':
      window.open('/api/export/notes', '_blank');
      break;
    case 'export-bookmarks':
      window.open('/api/export/bookmarks', '_blank');
      break;
    case 'export-system':
      window.open('/api/export/system', '_blank');
      break;
    case 'new-todo':
      document.getElementById('todoInput').focus();
      break;
    case 'new-note':
      document.getElementById('notesInput').focus();
      break;
    case 'grid':
      if (window.momoSetEditing) {
        const grid = document.getElementById('momoGrid');
        const isEditing = grid.classList.contains('grid-editing');
        window.momoSetEditing(!isEditing);
      }
      break;
    case 'reset-layout':
      localStorage.removeItem('momo-grid-layout');
      location.reload();
      break;
    case 'focus':
      document.getElementById('focusInput').focus();
      break;
  }
}

// Snippets Loader & Manager
async function loadSnippets() {
  try {
    const res = await fetch('/api/snippets');
    const snippets = await res.json();
    const list = document.getElementById('snippetsList');
    if (!list) return;

    if (snippets.length === 0) {
      list.innerHTML = emptyState('📋', 'Nessun snippet');
      return;
    }

    list.innerHTML = snippets.map(s => `
      <div class="snippet-item">
        <div class="snippet-info">
          <div class="snippet-title">${s.title}</div>
          <code class="snippet-cmd" title="${s.command}">${s.command}</code>
        </div>
        <div class="snippet-actions">
          <button class="snippet-btn" onclick="copySnippet('${s.command.replace(/'/g, "\\'")}')" title="Copia negli appunti">📋</button>
          <button class="snippet-btn" onclick="deleteSnippet('${s.id}')" title="Elimina">✕</button>
        </div>
      </div>
    `).join('');
  } catch {}
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=> t.classList.remove('show'), 1800);
}
function copySnippet(cmd) {
  navigator.clipboard.writeText(cmd).then(() => {
    playSound('todo');
    showToast('Copiato ✓');
  });
}
function applyWallpaper(name) {
  document.body.setAttribute('data-wall', name);
  localStorage.setItem('momo-wallpaper', name);
  document.querySelectorAll('.wallpaper-opt').forEach(b=> b.classList.toggle('active', b.dataset.wall===name));
}
function initWallpaper() {
  const saved = localStorage.getItem('momo-wallpaper') || 'aurora';
  applyWallpaper(saved);
  document.querySelectorAll('.wallpaper-opt').forEach(b=> b.addEventListener('click', ()=> applyWallpaper(b.dataset.wall)));
}

async function deleteSnippet(id) {
  try {
    await fetch(`/api/snippets/${id}`, { method: 'DELETE' });
    playSound('delete');
    showToast('Snippet eliminato');
    loadSnippets();
  } catch {
    showToast('Errore eliminazione');
  }
}

const snippetsForm = document.getElementById('snippetsForm');
if (snippetsForm) {
  snippetsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const titleInput = document.getElementById('snippetTitle');
    const cmdInput = document.getElementById('snippetCommand');
    const title = titleInput.value.trim();
    const command = cmdInput.value.trim();

    if (!title || !command) {
      showToast('Compila titolo e comando');
      return;
    }

    try {
      await fetch('/api/snippets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, command, category: 'CLI' }),
      });
      titleInput.value = '';
      cmdInput.value = '';
      playSound('todo');
      showToast('Snippet salvato ✓');
      loadSnippets();
    } catch {
      showToast('Errore salvataggio snippet');
    }
  });
}
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
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
  timerRunning = true;
  timerInterval = setInterval(() => {
    if (timerSeconds > 0) {
      timerSeconds--;
      updateTimerDisplay();
    } else {
      clearInterval(timerInterval);
      timerRunning = false;
      playSound('todo');
      showToast('⏰ Timer completato!');
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('MoMo — Timer', { body: 'Il tuo timer è scaduto! ⏰' });
        }
      } catch {}
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

// ==================== MoMo GRID ====================
let momoGrid = null;
function initMomoGrid() {
  const el = document.getElementById('momoGrid');
  if (!el || typeof GridStack === 'undefined') return;

  // v3 layout key - v2 had cramped weather/system rows, force reset to new defaults
  const LAYOUT_KEY = 'momo-grid-layout-v3';
  localStorage.removeItem('momo-grid-layout');
  localStorage.removeItem('momo-grid-layout-v2');
  const saved = localStorage.getItem(LAYOUT_KEY);
  let savedLayout = null;
  try { savedLayout = saved ? JSON.parse(saved) : null; } catch {}

  momoGrid = GridStack.init({
    column: 12,
    cellHeight: 88,
    margin: 8,
    float: false,
    animate: true,
    draggable: { handle: '.widget-header', scroll: true },
    resizable: { handles: 'se,e,sw,w' },
    disableDrag: true,
    disableResize: true,
    columnOpts: {
      breakpointForWindow: true,
      breakpoints: [
        { w: 768, c: 1 }
      ]
    },
  }, el);

  if (savedLayout) {
    try { momoGrid.load(savedLayout); } catch {}
  }

  function saveLayout() {
    const layout = momoGrid.save(false);
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  }

  momoGrid.on('change', saveLayout);
  momoGrid.on('dragstop', saveLayout);
  momoGrid.on('resizestop', saveLayout);

  const editBtn = document.getElementById('gridEditBtn');
  const resetBtn = document.getElementById('resetLayoutBtn');
  let editing = false;

  function setEditing(on) {
    editing = on;
    momoGrid.enableMove(on);
    momoGrid.enableResize(on);
    el.classList.toggle('grid-editing', on);
    if (editBtn) editBtn.classList.toggle('active', on);
  }

  if (editBtn) editBtn.addEventListener('click', () => setEditing(!editing));
  if (resetBtn) resetBtn.addEventListener('click', () => {
    localStorage.removeItem('momo-grid-layout');
    localStorage.removeItem('momo-grid-layout-v2');
    localStorage.removeItem(LAYOUT_KEY);
    location.reload();
  });

  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key.toLowerCase() === 'g') setEditing(!editing);
  });

  // also wire palette action
  window.momoSetEditing = setEditing;
}

// ==================== MoMo GREETING ====================
function initMomoGreeting() {
  const title = document.getElementById('greetingTitle');
  const sub = document.getElementById('greetingSubtitle');
  if (!title) return;
  const h = new Date().getHours();
  let greet = 'Buongiorno ☀️';
  let msg = 'Pronto per una grande giornata?';
  if (h < 6) { greet = 'Buona notte 🌙'; msg = 'Dormi bene, domani è un altro giorno.'; }
  else if (h < 12) { greet = 'Buongiorno ☀️'; msg = 'Inizia con il tuo Focus #1.'; }
  else if (h < 18) { greet = 'Buon pomeriggio 🌤️'; msg = 'Mantieni il ritmo, sei a metà!'; }
  else if (h < 22) { greet = 'Buonasera 🌅'; msg = 'Chiudi in bellezza la giornata.'; }
  else { greet = 'Buona notte 🌙'; msg = 'Ricarica le energie.'; }
  title.textContent = greet;
  if (sub) sub.textContent = msg;

  fetch('/api/quote').then(r=>r.json()).then(d=>{
    const qt = document.querySelector('#greetingQuote .quote-text');
    const qa = document.querySelector('#greetingQuote .quote-author');
    if (qt) qt.textContent = '"' + d.content + '"';
    if (qa) qa.textContent = '— ' + d.author;
  }).catch(()=>{});
  fetch('/api/briefing').then(r=>r.json()).then(d=>{
    const el = document.getElementById('briefingBullets');
    if (el && d.bullets) el.innerHTML = d.bullets.map(b=>`<div class="briefing-bullet">${b}</div>`).join('');
  }).catch(()=>{});
  const sunEl = document.getElementById('greetingSun');
  if (sunEl) {
    sunEl.textContent = '🌅 ' + (localStorage.getItem('momo-sunrise')||'06:42') + ' • 🌇 ' + (localStorage.getItem('momo-sunset')||'20:15');
  }
}

// ==================== FOCUS WIDGET ====================
function initFocusWidget() {
  const input = document.getElementById('focusInput');
  const display = document.getElementById('focusDisplay');
  const check = document.getElementById('focusCheck');
  const clear = document.getElementById('focusClear');
  if (!input || !display) return;

  function render() {
    const data = JSON.parse(localStorage.getItem('momo-focus')||'null');
    if (!data || !data.text) {
      display.innerHTML = '<span class="focus-empty">Scrivi il tuo focus e premi Invio ✨</span>';
      input.style.display = '';
      if (check) { check.textContent = '☐'; check.classList.remove('done'); }
      return;
    }
    input.style.display = 'none';
    display.textContent = data.text;
    display.style.textDecoration = data.done ? 'line-through' : 'none';
    display.style.opacity = data.done ? '0.6' : '1';
    if (check) {
      check.textContent = data.done ? '☑' : '☐';
      check.classList.toggle('done', !!data.done);
    }
  }

  input.addEventListener('keydown', (e)=>{
    if (e.key === 'Enter' && input.value.trim()) {
      localStorage.setItem('momo-focus', JSON.stringify({text: input.value.trim(), done: false, date: new Date().toISOString().slice(0,10)}));
      input.value = '';
      render();
      playSound('todo');
    }
  });
  if (check) check.addEventListener('click', ()=>{
    const d = JSON.parse(localStorage.getItem('momo-focus')||'null');
    if (!d) return;
    d.done = !d.done;
    localStorage.setItem('momo-focus', JSON.stringify(d));
    render();
    playSound('todo');
  });
  if (clear) clear.addEventListener('click', ()=>{
    localStorage.removeItem('momo-focus');
    render();
  });

  // reset daily at midnight
  const today = new Date().toISOString().slice(0,10);
  const saved = JSON.parse(localStorage.getItem('momo-focus')||'null');
  if (saved && saved.date && saved.date !== today) {
    // keep yesterday's focus but allow new one? Clear done status
    // For now clear if done, keep if not done
    if (saved.done) localStorage.removeItem('momo-focus');
  }

  render();
}

// ==================== WIDGET MANAGER ====================
const WIDGET_DEFS = [
  { id: 'weather', label: '🌤️ Meteo', desc: 'Temperatura & previsioni' },
  { id: 'system', label: '💻 Sistema', desc: 'CPU/RAM live' },
  { id: 'focus', label: '🎯 Focus', desc: 'Obiettivo del giorno' },
  { id: 'todo', label: '✅ Todo', desc: 'Task giornalieri' },
  { id: 'news', label: '📰 Briefing', desc: 'HackerNews' },
  { id: 'notes', label: '📝 Note', desc: 'Note veloci' },
  { id: 'bookmarks', label: '🔖 Bookmarks', desc: 'Link rapidi' },
  { id: 'snippets', label: '📋 Snippets', desc: 'Comandi CLI' },
  { id: 'calendar', label: '📅 Calendario', desc: 'Mese corrente' },
  { id: 'network', label: '🌐 Rete', desc: 'IP & interfacce' },
  { id: 'storage', label: '💾 Storage', desc: 'Dischi' },
  { id: 'services', label: '⚙️ Servizi', desc: 'Systemctl' },
  { id: 'github', label: '🐙 GitHub', desc: 'Repo & profilo' },
  { id: 'crypto', label: '₿ Crypto', desc: 'BTC/ETH/SOL' },
  { id: 'timer', label: '⏱️ Pomodoro', desc: '25 min timer' },
];

function initWidgetManager() {
  const overlay = document.getElementById('widgetManagerOverlay');
  const grid = document.getElementById('wmGrid');
  const btn = document.getElementById('widgetManagerBtn');
  const closeBtn = document.getElementById('wmClose');
  const doneBtn = document.getElementById('wmDone');
  const showAllBtn = document.getElementById('wmShowAll');
  if (!overlay || !grid || !btn) return;

  function getHidden() {
    try { return JSON.parse(localStorage.getItem('momo-hidden-widgets') || '[]'); } catch { return []; }
  }
  function setHidden(arr) {
    localStorage.setItem('momo-hidden-widgets', JSON.stringify(arr));
    applyHidden();
  }
  function applyHidden() {
    const hidden = new Set(getHidden());
    WIDGET_DEFS.forEach(d => {
      const el = document.querySelector(`.grid-stack-item[gs-id="${d.id}"]`);
      if (el) el.style.display = hidden.has(d.id) ? 'none' : '';
    });
    if (window.momoGrid) try { window.momoGrid.compact(); } catch {}
  }

  function render() {
    const hidden = new Set(getHidden());
    grid.innerHTML = WIDGET_DEFS.map(d => `
      <label class="wm-item ${hidden.has(d.id) ? 'off' : ''}">
        <input type="checkbox" ${hidden.has(d.id) ? '' : 'checked'} data-id="${d.id}" />
        <span><div>${d.label}</div><div style="font-size:0.72rem;color:var(--text-tertiary);font-weight:500">${d.desc}</div></span>
      </label>
    `).join('');
    grid.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('change', () => {
        const id = inp.getAttribute('data-id');
        let hiddenArr = getHidden();
        if (inp.checked) hiddenArr = hiddenArr.filter(x => x !== id);
        else if (!hiddenArr.includes(id)) hiddenArr.push(id);
        setHidden(hiddenArr);
        render();
      });
    });
  }

  function open() { render(); overlay.classList.add('visible'); }
  function close() { overlay.classList.remove('visible'); }

  btn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  doneBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  showAllBtn.addEventListener('click', () => { setHidden([]); render(); });

  window.momoApplyHidden = applyHidden;
  applyHidden();
  window.momoGrid = momoGrid;

  // Profili Mattina/Lavoro/Sera
  const PROFILES = {
    morning: [],
    work: ['calendar','crypto','timer'],
    evening: ['services','network','storage','github'],
  };
  const profileBtns = document.querySelectorAll('.profile-btn');
  function applyProfile(name) {
    const hidden = PROFILES[name] || [];
    localStorage.setItem('momo-hidden-widgets', JSON.stringify(hidden));
    localStorage.setItem('momo-profile', name);
    profileBtns.forEach(b=>b.classList.toggle('active', b.dataset.profile===name));
    applyHidden();
  }
  profileBtns.forEach(b=>b.addEventListener('click', ()=>applyProfile(b.dataset.profile)));
  const savedProfile = localStorage.getItem('momo-profile');
  if (savedProfile && PROFILES[savedProfile]) {
    profileBtns.forEach(b=>b.classList.toggle('active', b.dataset.profile===savedProfile));
  }
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  // Check if landing page was already seen
  const landingSeen = localStorage.getItem('momo-landing-seen');
  if (landingSeen) {
    hideLanding();
  }
  
  // MoMo Grid
  initMomoGrid();
  initMomoGreeting();
  initFocusWidget();
  initWidgetManager();
  initWallpaper();
  initSystemSparkline();
  // clock blink
  const ct = document.getElementById('headerClockTime');
  if (ct) ct.innerHTML = ct.textContent.replace(':', '<span class="clock-blink">:</span>');
  loadSnippets();
  
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
  // System metrics via WebSocket (every 3s). HTTP poll as fallback when WS is down.
  setInterval(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN) loadSystem();
  }, 5000);
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
