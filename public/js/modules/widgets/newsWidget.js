import { fetchAPI, escapeHtml, emptyState } from '../../state.js';

export function initNewsWidget() {
  loadNews();
  const refreshBtn = document.querySelector('.widget-refresh[data-widget="news"]');
  if (refreshBtn) refreshBtn.addEventListener('click', loadNews);
}

export async function loadNews() {
  const list = document.getElementById('newsList');
  try {
    const stories = await fetchAPI('/api/worldnews');
    if (!list) return;

    if (stories.length === 0) {
      list.innerHTML = emptyState('📰', 'Nessuna notizia disponibile');
      updateTicker([]);
      return;
    }

    list.innerHTML = stories
      .map(
        (story, i) => `
        <a href="${story.url}" target="_blank" class="news-item" style="animation-delay: ${i * 0.05}s">
          <div class="news-content">
            <div class="news-title">${escapeHtml(story.title)}</div>
            <div class="news-meta">
              <span>📰 ${escapeHtml(story.source)}</span>
              <span>🕐 ${getTimeAgo(story.time)}</span>
            </div>
          </div>
        </a>
      `
      )
      .join('');

    updateTicker(stories);
  } catch {
    if (list) list.innerHTML = emptyState('⚠️', 'Errore caricamento notizie');
  }
}

function updateTicker(stories) {
  const track = document.getElementById('tickerTrack');
  if (!track) return;
  if (stories.length === 0) {
    track.innerHTML = '<span class="ticker-text">Nessuna notizia al momento</span>';
    return;
  }
  const text = stories.map((s) => s.title).join('  •  ') + '  •  ';
  const duration = Math.max(45, Math.round(text.length / 6));
  track.innerHTML = `<span class="ticker-text" style="animation-duration: ${duration}s">${escapeHtml(text)}</span>`;
}

function getTimeAgo(timestamp) {
  const seconds = Math.floor(Date.now() / 1000) - timestamp;
  if (seconds < 60) return 'ora';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m fa`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h fa`;
  return `${Math.floor(hours / 24)}g fa`;
}
