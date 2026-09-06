const express = require('express');
const router = express.Router();
const { getWeatherData } = require('../services/weatherService');
const { getNewsData, getWorldNewsData } = require('../services/newsService');
const { getMarketsData } = require('../services/marketsService');
const { getGithubData } = require('../services/githubService');
const { getCache, setCache } = require('../services/cacheService');
const dbService = require('../../data/db');

const QUOTES_API = 'https://api.quotable.io/random';

// --- Weather ---
router.get('/weather', async (req, res) => {
  try {
    const result = await getWeatherData(req.query.city || '');
    res.json(result);
  } catch (err) {
    res.json({ error: 'Impossibile recuperare il meteo' });
  }
});

// --- News ---
router.get('/news', async (req, res) => {
  try {
    const stories = await getNewsData();
    res.json(stories);
  } catch (err) {
    res.json([]);
  }
});

// --- World News ---
router.get('/worldnews', async (req, res) => {
  try {
    const items = await getWorldNewsData();
    res.json(items);
  } catch (err) {
    res.json([]);
  }
});

// --- Briefing ---
router.get('/briefing', async (req, res) => {
  try {
    const cached = getCache('briefing');
    if (cached) return res.json(cached);

    const [weatherRes, newsRes, todos, quoteRes] = await Promise.allSettled([
      getWeatherData().catch(() => null),
      getWorldNewsData().catch(() => []),
      dbService.getTodos().catch(() => []),
      fetch(QUOTES_API, { signal: AbortSignal.timeout(2000) }).then((r) => r.json()).catch(() => null),
    ]);

    const weather = weatherRes.status === 'fulfilled' ? weatherRes.value : null;
    const news = newsRes.status === 'fulfilled' && Array.isArray(newsRes.value) ? newsRes.value.slice(0, 3) : [];
    const todosList = todos.status === 'fulfilled' ? todos.value : [];
    const quote = quoteRes.status === 'fulfilled' && quoteRes.value ? quoteRes.value : null;

    const pending = todosList.filter((t) => !t.done).length;
    const escapeStr = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const bullets = [
      weather && !weather.error ? `🌤️ ${escapeStr(weather.city)}: ${weather.temp}°C, ${escapeStr(weather.desc)} — tramonto ${escapeStr(weather.sunset)}` : '🌤️ Meteo non disponibile',
      news.length ? `📰 Top: "${escapeStr(news[0].title.slice(0, 70))}" — ${escapeStr(news[0].source)}` : '📰 Nessuna news',
      pending ? `✅ Hai ${pending} task aperti — focus su "${escapeStr(todosList.find((t) => !t.done)?.text.slice(0, 40) || 'inizia da uno piccolo')}"` : '✅ Tutto fatto! Aggiungi il focus del giorno',
    ];

    const result = {
      bullets,
      weather: weather ? { city: weather.city, temp: weather.temp, desc: weather.desc } : null,
      news: news.slice(0, 3),
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
router.get('/quote', async (req, res) => {
  try {
    const cached = getCache('quote_random');
    if (cached) return res.json(cached);

    const response = await fetch(QUOTES_API, { signal: AbortSignal.timeout(3000) });
    const data = await response.json();
    const result = {
      content: data.content || 'La vita è ciò che accade mentre fai altri piani.',
      author: data.author || 'John Lennon',
    };
    setCache('quote_random', result, 10 * 60 * 1000);
    res.json(result);
  } catch {
    res.json({
      content: 'La vita è ciò che accade mentre fai altri piani.',
      author: 'John Lennon',
    });
  }
});

// --- Markets ---
router.get('/markets', async (req, res) => {
  try {
    const markets = await getMarketsData(req.query.type || '');
    res.json(markets);
  } catch (err) {
    res.json([]);
  }
});

// --- GitHub ---
router.get('/github', async (req, res) => {
  try {
    const data = await getGithubData(req.query.username || 'Fioru12');
    res.json(data);
  } catch {
    res.json({ user: null, repos: [] });
  }
});

module.exports = router;
