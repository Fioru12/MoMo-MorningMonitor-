export function applyWallpaper(name) {
  document.body.setAttribute('data-wall', name);
  localStorage.setItem('momo-wallpaper', name);
  document.querySelectorAll('.wallpaper-opt').forEach((b) => b.classList.toggle('active', b.dataset.wall === name));
}

export function initWallpaper() {
  const saved = localStorage.getItem('momo-wallpaper') || 'aurora';
  applyWallpaper(saved);
  document.querySelectorAll('.wallpaper-opt').forEach((b) => b.addEventListener('click', () => applyWallpaper(b.dataset.wall)));
}
