const { getCache, setCache } = require('./cacheService');

const MARKET_SYMBOLS = [
  { symbol: '^GSPC', name: 'S&P 500', type: 'Indice' },
  { symbol: '^IXIC', name: 'Nasdaq', type: 'Indice' },
  { symbol: 'FTSEMIB.MI', name: 'FTSE MIB', type: 'Indice' },
  { symbol: 'QQQ', name: 'Invesco QQQ ETF', type: 'ETF' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', type: 'ETF' },
  { symbol: 'VWCE.DE', name: 'Vanguard All-World ETF', type: 'ETF' },
  { symbol: 'BTC-USD', name: 'Bitcoin', type: 'Crypto' },
  { symbol: 'ETH-USD', name: 'Ethereum', type: 'Crypto' },
  { symbol: 'SOL-USD', name: 'Solana', type: 'Crypto' },
];

async function getMarketsData(typeFilter = '') {
  const filter = typeFilter.toLowerCase();
  const cached = getCache('markets_all');
  if (cached) {
    if (!filter) return cached;
    return cached.filter((m) => (m.type || '').toLowerCase() === filter);
  }

  const results = await Promise.all(
    MARKET_SYMBOLS.map(({ symbol, name, type }) =>
      fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1mo&interval=1d`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(7000),
      })
        .then((r) => r.json())
        .then((data) => {
          const res0 = data?.chart?.result?.[0];
          const meta = res0?.meta;
          if (!meta || typeof meta.regularMarketPrice !== 'number') return null;
          const closes = res0?.indicators?.quote?.[0]?.close?.filter((v) => v != null) || [];
          return {
            name,
            type,
            price: meta.regularMarketPrice,
            change: meta.regularMarketChangePercent || 0,
            sparkline: closes.slice(-30),
          };
        })
        .catch(() => null)
    )
  );

  const markets = results.filter(Boolean);
  setCache('markets_all', markets, 3 * 60 * 1000); // 3 min cache
  if (!filter) return markets;
  return markets.filter((m) => (m.type || '').toLowerCase() === filter);
}

module.exports = {
  getMarketsData,
};
