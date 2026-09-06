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

module.exports = {
  getCache,
  setCache,
};
