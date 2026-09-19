import { fetchAPI, escapeHtml, emptyState } from '../../state.js';

export function initGithubWidget() {
  loadGitHub();
  const refreshBtn = document.querySelector('.widget-refresh[data-widget="github"]');
  if (refreshBtn) refreshBtn.addEventListener('click', loadGitHub);
}

export async function loadGitHub() {
  const userEl = document.getElementById('githubUser');
  const reposEl = document.getElementById('githubRepos');
  try {
    const data = await fetchAPI('/api/github');
    if (!userEl || !reposEl) return;

    if (!data.user) {
      userEl.innerHTML = emptyState('⚠️', 'Errore caricamento GitHub');
      return;
    }

    userEl.innerHTML = `
      <img src="${data.user.avatar}" alt="Avatar" class="github-avatar" />
      <div class="github-info">
        <div class="github-name">${escapeHtml(data.user.name || data.user.login)}</div>
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

    reposEl.innerHTML = data.repos
      .map(
        (repo) => `
      <a href="https://github.com/${data.user.login}/${repo.name}" target="_blank" class="github-repo">
        <div class="repo-name">${repo.name}</div>
        <div class="repo-desc">${repo.description || 'Nessuna descrizione'}</div>
        <div class="repo-meta">
          <span>⭐ ${repo.stars}</span>
          <span>🍴 ${repo.forks}</span>
          <span>💻 ${repo.language || 'N/A'}</span>
        </div>
      </a>
    `
      )
      .join('');
  } catch {
    if (userEl) userEl.innerHTML = emptyState('⚠️', 'Errore caricamento GitHub');
  }
}
