const SYNCED_KEYS = new Set([
  'momo-accent', 'momo-theme', 'momo-wallpaper', 'momo-profile',
  'momo-hidden-widgets', 'momo-grid-layout-v10', 'momo-focus', 'momo-pomodoro',
]);

const originalSet = Storage.prototype.setItem;
const originalRemove = Storage.prototype.removeItem;
const pending = new Map();

function push(key, value) {
  clearTimeout(pending.get(key));
  pending.set(key, setTimeout(() => {
    pending.delete(key);
    fetch(`/api/settings/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
      keepalive: true,
    }).catch(() => {});
  }, 400));
}

// I moduli usano localStorage direttamente: intercettarlo evita di toccarli tutti.
function installHooks() {
  Storage.prototype.setItem = function (key, value) {
    const prev = this === localStorage ? this.getItem(key) : null;
    originalSet.call(this, key, value);
    if (this === localStorage && SYNCED_KEYS.has(key) && prev !== String(value)) push(key, String(value));
  };
  Storage.prototype.removeItem = function (key) {
    originalRemove.call(this, key);
    if (this === localStorage && SYNCED_KEYS.has(key)) push(key, null);
  };
}

export async function initSettingsSync() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch('/api/settings', { signal: controller.signal });
    clearTimeout(timer);
    const server = await res.json();
    for (const key of SYNCED_KEYS) {
      if (key in server) originalSet.call(localStorage, key, server[key]);
      else if (localStorage.getItem(key) !== null) push(key, localStorage.getItem(key));
    }
  } catch {
    // Server irraggiungibile: si prosegue con le impostazioni locali.
  }
  installHooks();
}
