const { getCache, setCache } = require('./cacheService');

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

function decodeHtmlEntities(str) {
  return String(str)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseRssItems(xml, limit = 12) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) && items.length < limit) {
    const block = match[1];
    const rawTitle = (block.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
    const link = (block.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '';
    const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || '';
    const source = (block.match(/<source[^>]*>([\s\S]*?)<\/source>/) || [])[1] || '';

    const cleanTitle = decodeHtmlEntities(rawTitle.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, ''));
    const cleanSource = decodeHtmlEntities(source);
    const title = cleanSource && cleanTitle.endsWith(` - ${cleanSource}`)
      ? cleanTitle.slice(0, -(cleanSource.length + 3))
      : cleanTitle;

    items.push({
      title,
      url: link.trim(),
      source: cleanSource || 'Google News',
      time: pubDate ? Math.floor(new Date(pubDate).getTime() / 1000) : Math.floor(Date.now() / 1000),
    });
  }
  return items;
}

const WORLD_NEWS_RSS = 'https://news.google.com/rss?hl=it&gl=IT&ceid=IT:it';

async function getWorldNewsData() {
  const cached = getCache('world_news');
  if (cached) return cached;

  const response = await fetch(WORLD_NEWS_RSS, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(8000),
  });
  const xml = await response.text();
  const items = parseRssItems(xml, 12);

  setCache('world_news', items, 10 * 60 * 1000); // 10 min cache
  return items;
}

module.exports = {
  getNewsData,
  getWorldNewsData,
};
