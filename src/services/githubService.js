const { getCache, setCache } = require('./cacheService');

async function getGithubData(username = 'Fioru12') {
  const cleanUser = username.trim();
  const cacheKey = `github_${cleanUser.toLowerCase()}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const userRes = await fetch(`https://api.github.com/users/${cleanUser}`, {
    signal: AbortSignal.timeout(5000),
    headers: { 'User-Agent': 'MoMo-App' },
  });
  const data = await userRes.json();

  const reposRes = await fetch(
    `https://api.github.com/users/${cleanUser}/repos?sort=updated&per_page=5`,
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
  return result;
}

module.exports = {
  getGithubData,
};
