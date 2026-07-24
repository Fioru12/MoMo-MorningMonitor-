const express = require('express');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(compression());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Troppe richieste, riprova più tardi'
});
app.use(limiter);
// ==================== WebSocket ====================
const { WebSocketServer } = require('ws');
const wss = new WebSocketServer({ port: 3002 });
const clients = new Set();
wss.on('connection', (ws) => {
    clients.add(ws);
    ws.on('close', () => clients.delete(ws));
});
function broadcast(data) {
    for (const client of clients) {
        if (client.readyState === 1) client.send(JSON.stringify(data));
    }
}
setInterval(async () => {
    try {
        const r = await fetch('http://localhost:'+PORT+'/api/system');
        broadcast({ type: 'system', data: await r.json() });
    } catch(e) {}
}, 5000);

app.use(express.static(path.join(__dirname, 'public')));

// ==================== Health Check ====================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '2.1.0',
  });
});

// ==================== API ====================

// --- Meteo ---
const WEATHER_API = 'https://wttr.in';

app.get('/api/weather', async (req, res) => {
  try {
    const city = req.query.city || '';
    const url = city
      ? `${WEATHER_API}/${encodeURIComponent(city)}?format=j1`
      : `${WEATHER_API}?format=j1`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      return res.json({ error: 'Città non trovata' });
    }

    const current = data.current_condition?.[0];
    const location = data.nearest_area?.[0]?.areaName?.[0]?.value || 'Sconosciuta';

    // Previsioni 3 giorni
    const forecast = (data.weather || []).slice(0, 3).map((day) => ({
      date: day.date,
      tempMax: day.maxtempC,
      tempMin: day.mintempC,
      desc: day.hourly?.[0]?.weatherDesc?.[0]?.value || '',
      icon: day.hourly?.[0]?.weatherIconUrl?.[0]?.value || '',
    }));

    res.json({
      city: location,
      temp: current?.temp_C || 'N/A',
      feelsLike: current?.FeelsLikeC || 'N/A',
      humidity: current?.humidity || 'N/A',
      windSpeed: current?.windspeedKmph || 'N/A',
      desc: current?.weatherDesc?.[0]?.value || 'N/A',
      icon: current?.weatherIconUrl?.[0]?.value || '',
      forecast,
    });
  } catch (err) {
    res.json({ error: 'Impossibile recuperare il meteo' });
  }
});

// --- Notizie (HackerNews) ---
app.get('/api/news', async (req, res) => {
  try {
    const idsRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
    const ids = await idsRes.json();
    const topIds = ids.slice(0, 15);

    const stories = await Promise.all(
      topIds.map(async (id) => {
        try {
          const storyRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
          const story = await storyRes.json();
          return {
            id: story.id,
            title: story.title,
            url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
            score: story.score || 0,
            author: story.by || 'anonymous',
            time: story.time || 0,
            comments: story.descendants || 0,
          };
        } catch {
          return null;
        }
      })
    );

    const validStories = stories.filter((s) => s !== null);
    res.json(validStories);
  } catch (err) {
    res.json([]);
  }
});

// --- Citazione ---
const QUOTES_API = 'https://api.quotable.io/random';

app.get('/api/quote', async (req, res) => {
  try {
    const response = await fetch(QUOTES_API);
    const data = await response.json();
    res.json({
      content: data.content || 'La vita è ciò che accende mentre fai altri piani.',
      author: data.author || 'John Lennon',
    });
  } catch {
    res.json({
      content: 'La vita è ciò che accende mentre fai altri piani.',
      author: 'John Lennon',
    });
  }
});

// --- Monitor Sistema ---
app.get('/api/system', (req, res) => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;

  cpus.forEach((cpu) => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });

  const cpuUsage = Math.round((1 - totalIdle / totalTick) * 100);

  res.json({
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    cpu: {
      model: cpus[0]?.model || 'N/A',
      usage: cpuUsage,
      cores: cpus.length,
    },
    memory: {
      total: formatBytes(totalMem),
      used: formatBytes(usedMem),
      free: formatBytes(freeMem),
      percent: Math.round((usedMem / totalMem) * 100),
    },
    uptime: formatUptime(os.uptime()),
    loadAvg: os.loadavg().map((v) => v.toFixed(2)),
  });
});

// --- Todo List ---
const TODOS_FILE = path.join(__dirname, 'data', 'todos.json');

function readTodos() {
  try {
    if (!fs.existsSync(TODOS_FILE)) return [];
    const data = fs.readFileSync(TODOS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeTodos(todos) {
  fs.writeFileSync(TODOS_FILE, JSON.stringify(todos, null, 2));
}

app.get('/api/todos', (req, res) => {
  res.json(readTodos());
});

app.post('/api/todos', (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Testo richiesto' });
  }

  const todos = readTodos();
  const todo = {
    id: Date.now().toString(),
    text: text.trim(),
    done: false,
    createdAt: new Date().toISOString(),
  };
  todos.push(todo);
  writeTodos(todos);
  res.status(201).json(todo);
});

app.put('/api/todos/:id', (req, res) => {
  const todos = readTodos();
  const idx = todos.findIndex((t) => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Todo non trovato' });

  if (req.body.done !== undefined) todos[idx].done = req.body.done;
  if (req.body.text) todos[idx].text = req.body.text.trim();

  writeTodos(todos);
  res.json(todos[idx]);
});

app.delete('/api/todos/:id', (req, res) => {
  let todos = readTodos();
  const before = todos.length;
  todos = todos.filter((t) => t.id !== req.params.id);
  if (todos.length === before) {
    return res.status(404).json({ error: 'Todo non trovato' });
  }
  writeTodos(todos);
  res.json({ ok: true });
});

// --- Time (mondiale) ---
app.get('/api/time', (req, res) => {
  const timezones = [
    { label: 'Roma', zone: 'Europe/Rome' },
    { label: 'New York', zone: 'America/New_York' },
    { label: 'Londra', zone: 'Europe/London' },
    { label: 'Tokyo', zone: 'Asia/Tokyo' },
    { label: 'Sydney', zone: 'Australia/Sydney' },
    { label: 'Mosca', zone: 'Europe/Moscow' },
  ];

  const times = timezones.map((tz) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('it-IT', {
      timeZone: tz.zone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const dateStr = now.toLocaleDateString('it-IT', {
      timeZone: tz.zone,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    return { label: tz.label, time: timeStr, date: dateStr };
  });

  res.json(times);
});

// ==================== Storage ====================
app.get('/api/storage', (req, res) => {
  try {
    const disks = fs.readdirSync('/dev').filter(f => f.startsWith('sd') || f.startsWith('nvme') || f.startsWith('disk'));
    const storage = disks.map(disk => {
      try {
        const stats = fs.statSync(`/dev/${disk}`);
        return {
          device: disk,
          size: formatBytes(stats.size),
        };
      } catch {
        return null;
      }
    }).filter(Boolean);

    // Get disk usage
    const usage = [];
    try {
      const df = require('child_process').execSync('df -h').toString();
      const lines = df.split('\n').slice(1);
      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 6 && parts[0].includes('/dev/')) {
          usage.push({
            device: parts[0],
            mount: parts[5],
            total: parts[1],
            used: parts[2],
            free: parts[3],
            percent: parts[4],
          });
        }
      });
    } catch {}

    res.json({ disks: storage, usage });
  } catch {
    res.json({ disks: [], usage: [] });
  }
});

// ==================== Network ====================
app.get('/api/network', (req, res) => {
  try {
    const interfaces = os.networkInterfaces();
    const netStats = Object.entries(interfaces).map(([name, addrs]) => {
      const ipv4 = addrs.find(a => a.family === 'IPv4');
      return {
        name,
        ip: ipv4 ? ipv4.address : 'N/A',
        mac: addrs[0]?.mac || 'N/A',
      };
    });

    // Get network stats
    let rxBytes = 0, txBytes = 0;
    try {
      const stats = fs.readFileSync('/sys/class/net/statistics/rx_bytes', 'utf-8');
      rxBytes = parseInt(stats.trim()) || 0;
    } catch {}
    try {
      const stats = fs.readFileSync('/sys/class/net/statistics/tx_bytes', 'utf-8');
      txBytes = parseInt(stats.trim()) || 0;
    } catch {}

    res.json({
      interfaces: netStats,
      rxBytes: formatBytes(rxBytes),
      txBytes: formatBytes(txBytes),
    });
  } catch {
    res.json({ interfaces: [], rxBytes: '0 B', txBytes: '0 B' });
  }
});

// ==================== Services ====================
app.get('/api/services', (req, res) => {
  try {
    const services = ['nginx', 'apache2', 'mysql', 'postgresql', 'redis', 'docker', 'ssh', 'cron'];
    const status = services.map(svc => {
      try {
        const result = require('child_process').execSync(`systemctl is-active ${svc} 2>&1`).toString().trim();
        return { name: svc, status: result === 'active' ? 'running' : 'stopped' };
      } catch {
        return { name: svc, status: 'not-found' };
      }
    });
    res.json(status);
  } catch {
    res.json([]);
  }
});

// ==================== Notes ====================
const NOTES_FILE = path.join(__dirname, 'data', 'notes.json');

function readNotes() {
  try {
    if (!fs.existsSync(NOTES_FILE)) return [];
    const data = fs.readFileSync(NOTES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeNotes(notes) {
  fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2));
}

app.get('/api/notes', (req, res) => {
  res.json(readNotes());
});

app.post('/api/notes', (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Testo richiesto' });
  }

  const notes = readNotes();
  const note = {
    id: Date.now().toString(),
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };
  notes.unshift(note);
  writeNotes(notes);
  res.status(201).json(note);
});

app.delete('/api/notes/:id', (req, res) => {
  let notes = readNotes();
  const before = notes.length;
  notes = notes.filter(n => n.id !== req.params.id);
  if (notes.length === before) {
    return res.status(404).json({ error: 'Nota non trovata' });
  }
  writeNotes(notes);
  res.json({ ok: true });
});

// ==================== Bookmarks ====================
const BOOKMARKS_FILE = path.join(__dirname, 'data', 'bookmarks.json');

function readBookmarks() {
  try {
    if (!fs.existsSync(BOOKMARKS_FILE)) return [];
    const data = fs.readFileSync(BOOKMARKS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeBookmarks(bookmarks) {
  fs.writeFileSync(BOOKMARKS_FILE, JSON.stringify(bookmarks, null, 2));
}

app.get('/api/bookmarks', (req, res) => {
  res.json(readBookmarks());
});

app.post('/api/bookmarks', (req, res) => {
  const { name, url } = req.body;
  if (!name || !url) {
    return res.status(400).json({ error: 'Nome e URL richiesti' });
  }

  const bookmarks = readBookmarks();
  const bookmark = {
    id: Date.now().toString(),
    name: name.trim(),
    url: url.trim(),
    createdAt: new Date().toISOString(),
  };
  bookmarks.push(bookmark);
  writeBookmarks(bookmarks);
  res.status(201).json(bookmark);
});

app.delete('/api/bookmarks/:id', (req, res) => {
  let bookmarks = readBookmarks();
  const before = bookmarks.length;
  bookmarks = bookmarks.filter(b => b.id !== req.params.id);
  if (bookmarks.length === before) {
    return res.status(404).json({ error: 'Bookmark non trovato' });
  }
  writeBookmarks(bookmarks);
  res.json({ ok: true });
});

// ==================== Timer/Pomodoro ====================
app.get('/api/timer', (req, res) => {
  res.json({ mode: 'pomodoro', duration: 25 * 60 });
});

// ==================== Crypto ====================
app.get('/api/crypto', async (req, res) => {
  try {
    const coins = ['bitcoin', 'ethereum', 'solana'];
    const promises = coins.map(coin =>
      fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd&include_24hr_change=true`)
        .then(r => r.json())
        .catch(() => null)
    );

    const results = await Promise.all(promises);
    const crypto = coins.map((coin, i) => {
      const data = results[i];
      if (!data || !data[coin]) return null;
      return {
        name: coin.charAt(0).toUpperCase() + coin.slice(1),
        price: data[coin].usd,
        change: data[coin].usd_24h_change || 0,
      };
    }).filter(Boolean);

    res.json(crypto);
  } catch (err) {
    console.error('Errore API crypto:', err);
    res.json([]);
  }
});

// ==================== GitHub ====================
app.get('/api/github', async (req, res) => {
  try {
    const username = req.query.username || 'Fioru12';
    const response = await fetch(`https://api.github.com/users/${username}`);
    const data = await response.json();

    const reposResponse = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=5`);
    const repos = await reposResponse.json();

    res.json({
      user: {
        login: data.login,
        name: data.name,
        avatar: data.avatar_url,
        repos: data.public_repos,
        followers: data.followers,
        following: data.following,
      },
      repos: repos.map(r => ({
        name: r.name,
        description: r.description,
        stars: r.stargazers_count,
        forks: r.forks_count,
        language: r.language,
        updated: r.updated_at,
      })),
    });
  } catch {
    res.json({ user: null, repos: [] });
  }
});

// ==================== Calendar ====================
app.get('/api/calendar', (req, res) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDay = firstDay.getDay();

  const days = [];
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      day: i,
      month: month + 1,
      year,
      weekday: new Date(year, month, i).getDay(),
    });
  }

  res.json({
    month: month + 1,
    year,
    days,
    today: now.getDate(),
  });
});

// ==================== SPA fallback (MUST BE LAST) ====================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==================== Start ====================

// ==================== Export CSV ====================
app.get('/api/export/:type', async (req, res) => {
    const type = req.params.type;
    try {
        if (type === 'todos' || type === 'notes') {
            const file = path.join(__dirname, 'data', type + '.json');
            const items = JSON.parse(fs.readFileSync(file, 'utf8'));
            const csv = items.map(i => Object.values(i).join(',')).join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.attachment(type + '.csv');
            res.send(csv);
        } else if (type === 'system') {
            const r = await fetch('http://localhost:'+PORT+'/api/system');
            const s = await r.json();
            const csv = 'metric,value\n'+Object.entries(s).map(e=>e.join(',')).join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.attachment('system.csv');
            res.send(csv);
        }
    } catch(e) { res.status(500).json({error: e.message}); }
});
app.get('/api/ws-status', (req, res) => {
    res.json({ connected: clients.size });
});

app.listen(PORT, () => {
  console.log(`✨ DevMonitor avviato su porta ${PORT}`);
  console.log(`🌐 Apri http://localhost:${PORT} nel browser`);
});

// ==================== Utilities ====================
function formatBytes(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < sizes.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(1)} ${sizes[i]}`;
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (days) parts.push(`${days}g`);
  if (hours) parts.push(`${hours}h`);
  parts.push(`${mins}m`);
  return parts.join(' ');
}