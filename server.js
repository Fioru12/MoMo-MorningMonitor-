const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const os = require('os');
const si = require('systeminformation');
const { WebSocketServer } = require('ws');
const pkg = require('./package.json');

const dbService = require('./data/db');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3100;

// Initialize Database & Data Directory
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

dbService.initDB().catch((err) => console.error('DB Init Error:', err));

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'http:'],
        connectSrc: ["'self'", 'https:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
  })
);
app.use(compression());
app.use(express.json());

// Rate Limiting (applied to /api/ endpoints only)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Troppe richieste, riprova più tardi' },
});
app.use('/api/', limiter);

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// ==================== In-Memory Cache ====================
const cacheStore = new Map();

function getCache(key) {
  const item = cacheStore.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    cacheStore.delete(key);
    return null;
  }
  return item.data;
}

function setCache(key, data, ttlMs) {
  cacheStore.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// ==================== WebSocket Server ====================
const clients = new Set();
let shutdownTimer = null;
wss.on('connection', (ws) => {
  clients.add(ws);
  if (shutdownTimer) {
    clearTimeout(shutdownTimer);
    shutdownTimer = null;
  }

  ws.on('close', () => {
    clients.delete(ws);
    if (clients.size === 0) {
      shutdownTimer = setTimeout(() => {
        if (clients.size === 0) {
          console.log('Tutte le finestre chiuse. Spegnimento server MoMo...');
          process.exit(0);
        }
      }, 2000);
    }
  });

  // Immediate update on connect
  getSystemMetrics().then((data) => {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'system', data }));
    }
  });
});

function broadcast(data) {
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  }
}

// Periodic broadcast of system metrics (no local HTTP loopback fetch)
setInterval(async () => {
  if (clients.size > 0) {
    const data = await getSystemMetrics();
    broadcast({ type: 'system', data });
  }
}, 3000);

// ==================== System Metrics Helper ====================
async function getSystemMetrics() {
  try {
    const [cpuLoad, mem, osInfo] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.osInfo(),
    ]);

    const totalMem = mem.total || os.totalmem();
    const usedMem = mem.active || mem.used || (totalMem - (mem.free || os.freemem()));
    const freeMem = totalMem - usedMem;

    return {
      hostname: osInfo.hostname || os.hostname(),
      platform: osInfo.platform || os.platform(),
      arch: osInfo.arch || os.arch(),
      distro: osInfo.distro || '',
      cpu: {
        model: os.cpus()[0]?.model || 'N/A',
        usage: Math.round(cpuLoad.currentLoad || 0),
        cores: os.cpus().length,
      },
      memory: {
        total: formatBytes(totalMem),
        used: formatBytes(usedMem),
        free: formatBytes(freeMem),
        percent: Math.round((usedMem / totalMem) * 100),
      },
      uptime: formatUptime(os.uptime()),
      loadAvg: os.loadavg().map((v) => v.toFixed(2)),
    };
  } catch {
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

    return {
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
    };
  }
}

// ==================== API Endpoints ====================

// --- Health Check ---
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: pkg.version,
  });
});

// --- System ---
app.get('/api/system', async (req, res) => {
  const metrics = await getSystemMetrics();
  res.json(metrics);
});

// --- Weather (wttr.in) ---
const WEATHER_API = 'https://wttr.in';

async function getWeatherData(city = '') {
  const normalizedCity = city.trim();
  const cacheKey = `weather_${normalizedCity.toLowerCase()}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const url = normalizedCity
    ? `${WEATHER_API}/${encodeURIComponent(normalizedCity)}?format=j1&lang=it`
    : `${WEATHER_API}?format=j1&lang=it`;

  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  const data = await response.json();

  if (data.error) {
    return { error: 'Città non trovata' };
  }

  const desc = (entry) => entry?.lang_it?.[0]?.value || entry?.weatherDesc?.[0]?.value || '';

  const current = data.current_condition?.[0];
  const location = data.nearest_area?.[0]?.areaName?.[0]?.value || 'Sconosciuta';

  const forecast = (data.weather || []).slice(0, 3).map((day) => ({
    date: day.date,
    tempMax: day.maxtempC,
    tempMin: day.mintempC,
    desc: desc(day.hourly?.[0]),
    icon: day.hourly?.[0]?.weatherIconUrl?.[0]?.value || '',
  }));

  const astronomy = data.weather?.[0]?.astronomy?.[0] || {};
  const hourly = (data.weather?.[0]?.hourly || []).slice(0, 8).map((h) => ({
    time: h.time.padStart(4, '0'),
    temp: h.tempC,
    chanceRain: h.chanceofrain || '0',
    desc: desc(h),
  }));

  const result = {
    city: location,
    temp: current?.temp_C || 'N/A',
    feelsLike: current?.FeelsLikeC || 'N/A',
    humidity: current?.humidity || 'N/A',
    windSpeed: current?.windspeedKmph || 'N/A',
    desc: desc(current) || 'N/A',
    icon: current?.weatherIconUrl?.[0]?.value || '',
    sunrise: astronomy.sunrise || '06:42',
    sunset: astronomy.sunset || '20:15',
    hourly,
    forecast,
  };

  setCache(cacheKey, result, 5 * 60 * 1000); // 5 min cache
  return result;
}

app.get('/api/weather', async (req, res) => {
  try {
    const result = await getWeatherData(req.query.city || '');
    res.json(result);
  } catch (err) {
    res.json({ error: 'Impossibile recuperare il meteo' });
  }
});

// --- News (HackerNews) ---
async function getNewsData() {
  const cached = getCache('news_top');
  if (cached) return cached;

  const idsRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json', {
    signal: AbortSignal.timeout(5000),
  });
  const ids = await idsRes.json();
  const topIds = ids.slice(0, 15);

  const stories = await Promise.all(
    topIds.map(async (id) => {
      try {
        const storyRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
          signal: AbortSignal.timeout(3000),
        });
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
  setCache('news_top', validStories, 5 * 60 * 1000); // 5 min cache
  return validStories;
}

app.get('/api/news', async (req, res) => {
  try {
    const stories = await getNewsData();
    res.json(stories);
  } catch (err) {
    res.json([]);
  }
});

// --- Briefing mattutino ---
app.get('/api/briefing', async (req, res) => {
  try {
    const cached = getCache('briefing');
    if (cached) return res.json(cached);

    const [weatherRes, newsRes, todos, quoteRes] = await Promise.allSettled([
      getWeatherData().catch(() => null),
      getNewsData().catch(() => []),
      dbService.getTodos().catch(() => []),
      fetch(QUOTES_API, { signal: AbortSignal.timeout(2000) }).then((r) => r.json()).catch(() => null),
    ]);

    const weather = weatherRes.status === 'fulfilled' ? weatherRes.value : null;
    const news = newsRes.status === 'fulfilled' && Array.isArray(newsRes.value) ? newsRes.value.slice(0, 3) : [];
    const todosList = todos.status === 'fulfilled' ? todos.value : [];
    const quote = quoteRes.status === 'fulfilled' && quoteRes.value ? quoteRes.value : null;

    const pending = todosList.filter((t) => !t.done).length;
    const bullets = [
      weather && !weather.error ? `🌤️ ${weather.city}: ${weather.temp}°C, ${weather.desc} — tramonto ${weather.sunset}` : '🌤️ Meteo non disponibile',
      news.length ? `📰 Top: "${news[0].title.slice(0, 70)}..." (${news[0].score} punti)` : '📰 Nessuna news',
      pending ? `✅ Hai ${pending} task aperti — focus su "${todosList.find((t) => !t.done)?.text.slice(0, 40) || 'inizia da uno piccolo'}"` : '✅ Tutto fatto! Aggiungi il focus del giorno',
    ];

    const result = {
      bullets,
      weather: weather ? { city: weather.city, temp: weather.temp, desc: weather.desc } : null,
      news,
      quote,
      pending,
      generatedAt: new Date().toISOString(),
    };
    setCache('briefing', result, 5 * 60 * 1000);
    res.json(result);
  } catch (e) {
    res.json({ bullets: ['☀️ Buongiorno! Inizia con il tuo Focus #1'], pending: 0, generatedAt: new Date().toISOString() });
  }
});

// --- Quote ---
const QUOTES_API = 'https://api.quotable.io/random';

app.get('/api/quote', async (req, res) => {
  try {
    const cached = getCache('quote_random');
    if (cached) return res.json(cached);

    const response = await fetch(QUOTES_API, { signal: AbortSignal.timeout(3000) });
    const data = await response.json();
    const result = {
      content: data.content || 'La vita è ciò che accade mentre fai altri piani.',
      author: data.author || 'John Lennon',
    };
    setCache('quote_random', result, 10 * 60 * 1000); // 10 min cache
    res.json(result);
  } catch {
    res.json({
      content: 'La vita è ciò che accade mentre fai altri piani.',
      author: 'John Lennon',
    });
  }
});

// --- Todos ---
app.get('/api/todos', async (req, res) => {
  try {
    const todos = await dbService.getTodos();
    res.json(todos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/todos', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Testo richiesto' });
    }
    const todo = await dbService.addTodo(text);
    res.status(201).json(todo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/todos/:id', async (req, res) => {
  try {
    const todo = await dbService.updateTodo(req.params.id, req.body);
    if (!todo) return res.status(404).json({ error: 'Todo non trovato' });
    res.json(todo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/todos/:id', async (req, res) => {
  try {
    const deleted = await dbService.deleteTodo(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Todo non trovato' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Notes ---
app.get('/api/notes', async (req, res) => {
  try {
    const notes = await dbService.getNotes();
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notes', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Testo richiesto' });
    }
    const note = await dbService.addNote(text);
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/notes/:id', async (req, res) => {
  try {
    const deleted = await dbService.deleteNote(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Nota non trovata' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Bookmarks ---
app.get('/api/bookmarks', async (req, res) => {
  try {
    const bookmarks = await dbService.getBookmarks();
    res.json(bookmarks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bookmarks', async (req, res) => {
  try {
    const { name, url } = req.body;
    if (!name || !url) {
      return res.status(400).json({ error: 'Nome e URL richiesti' });
    }
    const bookmark = await dbService.addBookmark(name, url);
    res.status(201).json(bookmark);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/bookmarks/:id', async (req, res) => {
  try {
    const deleted = await dbService.deleteBookmark(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Bookmark non trovato' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Snippets ---
app.get('/api/snippets', async (req, res) => {
  try {
    const snippets = await dbService.getSnippets();
    res.json(snippets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/snippets', async (req, res) => {
  try {
    const { title, command, category } = req.body;
    if (!title || !command) {
      return res.status(400).json({ error: 'Titolo e comando richiesti' });
    }
    const snippet = await dbService.addSnippet(title, command, category);
    res.status(201).json(snippet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/snippets/:id', async (req, res) => {
  try {
    const deleted = await dbService.deleteSnippet(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Snippet non trovato' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Timezones ---
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

// --- Storage ---
app.get('/api/storage', async (req, res) => {
  try {
    const cached = getCache('storage_data');
    if (cached) return res.json(cached);

    const fsSizes = await si.fsSize();
    const usage = (fsSizes || []).map((fs) => ({
      device: fs.fs || fs.mount,
      mount: fs.mount,
      type: fs.type,
      total: formatBytes(fs.size),
      used: formatBytes(fs.used),
      free: formatBytes(fs.available || fs.size - fs.used),
      percent: Math.round(fs.use || 0) + '%',
    }));

    const result = {
      disks: usage.map((u) => ({ device: u.device, size: u.total })),
      usage,
    };

    setCache('storage_data', result, 10000);
    res.json(result);
  } catch {
    res.json({ disks: [], usage: [] });
  }
});

// --- Network ---
app.get('/api/network', async (req, res) => {
  try {
    const cached = getCache('network_data');
    if (cached) return res.json(cached);

    const [ifaces, stats] = await Promise.all([si.networkInterfaces(), si.networkStats()]);

    const ifaceArray = Array.isArray(ifaces) ? ifaces : ifaces ? [ifaces] : [];
    const interfacesList = ifaceArray.map((iface) => ({
      name: iface.iface,
      ip: iface.ip4 || 'N/A',
      mac: iface.mac || 'N/A',
      state: iface.operstate || 'active',
    }));

    let totalRx = 0;
    let totalTx = 0;
    if (Array.isArray(stats)) {
      stats.forEach((s) => {
        totalRx += s.rx_bytes || 0;
        totalTx += s.tx_bytes || 0;
      });
    }

    const result = {
      interfaces: interfacesList,
      rxBytes: formatBytes(totalRx),
      txBytes: formatBytes(totalTx),
    };

    setCache('network_data', result, 5000);
    res.json(result);
  } catch {
    res.json({ interfaces: [], rxBytes: '0 B', txBytes: '0 B' });
  }
});

// --- Services ---
app.get('/api/services', async (req, res) => {
  try {
    const defaultServices = ['nginx', 'apache2', 'mysql', 'postgresql', 'redis', 'docker', 'ssh', 'cron'];
    const serviceList = defaultServices.map((svc) => {
      try {
        const result = require('child_process')
          .execSync(`systemctl is-active ${svc} 2>&1`)
          .toString()
          .trim();
        return { name: svc, status: result === 'active' ? 'running' : 'stopped' };
      } catch {
        return { name: svc, status: 'not-found' };
      }
    });
    res.json(serviceList);
  } catch {
    res.json([]);
  }
});

// --- Docker Containers ---
app.get('/api/docker', async (req, res) => {
  try {
    const cached = getCache('docker_containers');
    if (cached) return res.json(cached);

    const containers = await si.dockerContainers();
    const result = (containers || []).map((c) => ({
      id: c.id ? c.id.substring(0, 12) : '',
      name: c.name,
      image: c.image,
      state: c.state,
      status: c.status,
    }));

    setCache('docker_containers', result, 10000);
    res.json(result);
  } catch {
    res.json([]);
  }
});

// --- Timer / Pomodoro ---
app.get('/api/timer', (req, res) => {
  res.json({ mode: 'pomodoro', duration: 25 * 60 });
});

// --- Crypto ---
app.get('/api/crypto', async (req, res) => {
  try {
    const cached = getCache('crypto_prices');
    if (cached) return res.json(cached);

    const coins = ['bitcoin', 'ethereum', 'solana'];
    const promises = coins.map((coin) =>
      fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd&include_24hr_change=true`,
        { signal: AbortSignal.timeout(5000) }
      )
        .then((r) => r.json())
        .catch(() => null)
    );

    const results = await Promise.all(promises);
    const crypto = coins
      .map((coin, i) => {
        const data = results[i];
        if (!data || !data[coin]) return null;
        return {
          name: coin.charAt(0).toUpperCase() + coin.slice(1),
          price: data[coin].usd,
          change: data[coin].usd_24h_change || 0,
        };
      })
      .filter(Boolean);

    setCache('crypto_prices', crypto, 2 * 60 * 1000); // 2 min cache
    res.json(crypto);
  } catch (err) {
    res.json([]);
  }
});

// --- GitHub ---
app.get('/api/github', async (req, res) => {
  try {
    const username = (req.query.username || 'Fioru12').trim();
    const cacheKey = `github_${username.toLowerCase()}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const userRes = await fetch(`https://api.github.com/users/${username}`, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'MoMo-App' },
    });
    const data = await userRes.json();

    const reposRes = await fetch(
      `https://api.github.com/users/${username}/repos?sort=updated&per_page=5`,
      {
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'MoMo-App' },
      }
    );
    const repos = await reposRes.json();

    const result = {
      user: {
        login: data.login,
        name: data.name || data.login,
        avatar: data.avatar_url,
        repos: data.public_repos || 0,
        followers: data.followers || 0,
        following: data.following || 0,
      },
      repos: (Array.isArray(repos) ? repos : []).map((r) => ({
        name: r.name,
        description: r.description,
        stars: r.stargazers_count,
        forks: r.forks_count,
        language: r.language,
        updated: r.updated_at,
      })),
    };

    setCache(cacheKey, result, 10 * 60 * 1000); // 10 min cache
    res.json(result);
  } catch {
    res.json({ user: null, repos: [] });
  }
});

// --- Calendar ---
app.get('/api/calendar', (req, res) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

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

// --- Export CSV ---
app.get('/api/export/:type', async (req, res) => {
  const type = req.params.type;
  try {
    let items = [];
    if (type === 'todos') items = await dbService.getTodos();
    else if (type === 'notes') items = await dbService.getNotes();
    else if (type === 'bookmarks') items = await dbService.getBookmarks();
    else if (type === 'snippets') items = await dbService.getSnippets();

    if (['todos', 'notes', 'bookmarks', 'snippets'].includes(type)) {
      if (!items.length) {
        return res.status(400).json({ error: 'Nessun elemento da esportare' });
      }
      const headers = Object.keys(items[0]);
      const csvRows = [headers.join(',')];
      for (const item of items) {
        const row = headers.map((h) => {
          const val = item[h] !== undefined && item[h] !== null ? String(item[h]) : '';
          return `"${val.replace(/"/g, '""')}"`;
        });
        csvRows.push(row.join(','));
      }
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.attachment(`${type}.csv`);
      return res.send(csvRows.join('\n'));
    }

    if (type === 'system') {
      const sysData = await getSystemMetrics();
      const csvLines = [
        'Metric,Value',
        `Hostname,"${sysData.hostname}"`,
        `Platform,"${sysData.platform}"`,
        `Arch,"${sysData.arch}"`,
        `CPU Usage,"${sysData.cpu.usage}%"`,
        `CPU Cores,"${sysData.cpu.cores}"`,
        `RAM Used,"${sysData.memory.used}"`,
        `RAM Total,"${sysData.memory.total}"`,
        `RAM Percent,"${sysData.memory.percent}%"`,
        `Uptime,"${sysData.uptime}"`,
      ];
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.attachment('system.csv');
      return res.send(csvLines.join('\n'));
    }

    res.status(400).json({ error: 'Tipo di export non valido' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- WebSocket Status ---
app.get('/api/ws-status', (req, res) => {
  res.json({ connected: clients.size });
});

// ==================== SPA Fallback (MUST BE LAST) ====================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==================== Start Server ====================
server.listen(PORT, () => {
  console.log(`✨ MoMo avviato su porta ${PORT}`);
  console.log(`🌐 Apri http://localhost:${PORT} nel browser`);
});

// ==================== Utilities ====================
function formatBytes(bytes) {
  if (!bytes || isNaN(bytes)) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
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
  return parts.join(' ') || '0m';
}
