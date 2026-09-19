import { fetchAPI, escapeHtml, emptyState, formatPrice, setWidgetTimestamp } from '../../state.js';

export function initMarketsWidget() {
  loadMarkets();
  loadEtf();
  loadCryptoMarkets();

  document.querySelectorAll('.widget-refresh[data-widget="markets"]').forEach((b) => b.addEventListener('click', loadMarkets));
  document.querySelectorAll('.widget-refresh[data-widget="etf"]').forEach((b) => b.addEventListener('click', loadEtf));
  document.querySelectorAll('.widget-refresh[data-widget="crypto"]').forEach((b) => b.addEventListener('click', loadCryptoMarkets));

  initFinanceView();
}

function sparklineSVG(data, up) {
  if (!data || data.length < 2) return '';
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 64,
    h = 24;
  const step = w / (data.length - 1);
  const points = data.map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / range) * (h - 4) - 2).toFixed(1)}`).join(' ');
  const color = up ? 'var(--success)' : 'var(--danger)';
  const gid = 'sg_' + Math.random().toString(36).slice(2, 8);
  return `<svg class="market-spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
    <defs>
      <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <polygon points="0,${h} ${points} ${w},${h}" fill="url(#${gid})"/>
    <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`;
}

export async function loadMarketWidget(type, listId, timestampId) {
  const list = document.getElementById(listId);
  try {
    const markets = await fetchAPI(`/api/markets?type=${encodeURIComponent(type)}`);
    if (!list) return;

    if (markets.length === 0) {
      list.innerHTML = emptyState('📈', 'Nessun dato');
      return;
    }

    list.innerHTML = markets
      .map((m) => {
        const changeClass = m.change >= 0 ? 'positive' : 'negative';
        const changeSymbol = m.change >= 0 ? '▲' : '▼';
        const spark = sparklineSVG(m.sparkline, m.change >= 0);
        return `
        <div class="market-item">
          <span class="market-name">${escapeHtml(m.name)}</span>
          <span class="market-spark-cell">${spark}</span>
          <span class="market-price">${formatPrice(m.price)}</span>
          <span class="market-change ${changeClass}">${changeSymbol} ${Math.abs(m.change).toFixed(2)}%</span>
        </div>
      `;
      })
      .join('');
    if (timestampId) setWidgetTimestamp(timestampId.replace('Timestamp', ''));
  } catch {
    if (list) list.innerHTML = emptyState('⚠️', 'Errore caricamento');
  }
}

export function loadMarkets() {
  return loadMarketWidget('indice', 'marketsList', 'marketsTimestamp');
}
export function loadEtf() {
  return loadMarketWidget('etf', 'etfList', 'etfTimestamp');
}
export function loadCryptoMarkets() {
  return loadMarketWidget('crypto', 'cryptoList', 'cryptoTimestamp');
}

function loadFinanceView() {
  loadMarketWidget('indice', 'finMarketsList', 'finMarketsTimestamp');
  loadMarketWidget('etf', 'finEtfList', 'finEtfTimestamp');
  loadMarketWidget('crypto', 'finCryptoList', 'finCryptoTimestamp');
}

function toggleFinanceView(show) {
  const overlay = document.getElementById('financeOverlay');
  if (!overlay) return;
  const visible = overlay.classList.contains('visible');
  const shouldShow = show !== undefined ? show : !visible;
  overlay.classList.toggle('visible', shouldShow);
  overlay.setAttribute('aria-hidden', String(!shouldShow));
  if (shouldShow) loadFinanceView();
}

function initFinanceView() {
  const finBtn = document.getElementById('financeViewBtn');
  const finClose = document.getElementById('financeClose');
  const finOverlay = document.getElementById('financeOverlay');
  if (finBtn) finBtn.addEventListener('click', () => toggleFinanceView());
  if (finClose) finClose.addEventListener('click', () => toggleFinanceView(false));
  if (finOverlay) {
    finOverlay.addEventListener('click', (e) => {
      if (e.target === finOverlay) toggleFinanceView(false);
    });
  }

  document.querySelectorAll('[data-finance]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-finance');
      const map = { markets: 'indice', etf: 'etf', crypto: 'crypto' };
      const tsMap = { markets: 'finMarketsTimestamp', etf: 'finEtfTimestamp', crypto: 'finCryptoTimestamp' };
      const listMap = { markets: 'finMarketsList', etf: 'finEtfList', crypto: 'finCryptoList' };
      if (map[type]) loadMarketWidget(map[type], listMap[type], tsMap[type]);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key.toLowerCase() === 'f') {
      e.preventDefault();
      toggleFinanceView();
    }
  });
}
