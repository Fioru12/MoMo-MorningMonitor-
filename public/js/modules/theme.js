import { playSound } from '../state.js';

export function initTheme() {
  // --- Service Worker ---
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }

  // --- Landing Page ---
  const landingOverlay = document.getElementById('landingOverlay');
  const landingBtn = document.getElementById('landingBtn');

  function hideLanding() {
    if (landingOverlay) {
      landingOverlay.classList.add('hidden');
      localStorage.setItem('momo-landing-seen', 'true');
    }
  }

  if (landingBtn) {
    landingBtn.addEventListener('click', hideLanding);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && landingOverlay && !landingOverlay.classList.contains('hidden')) {
      hideLanding();
    }
  });

  // --- Theme Toggle ---
  const themeToggle = document.getElementById('themeToggle');

  function getPreferredTheme() {
    const saved = localStorage.getItem('momo-theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('momo-theme', theme);
  }

  setTheme(getPreferredTheme());

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      setTheme(current === 'dark' ? 'light' : 'dark');
      playSound('theme');
    });
  }

  // --- Color Accent Picker ---
  const colorPickerBtn = document.getElementById('colorPickerBtn');
  const colorPopup = document.getElementById('colorPopup');
  const colorPopupClose = document.getElementById('colorPopupClose');
  const colorOptions = document.querySelectorAll('.color-opt');

  function getAccentRGB(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
  }

  function setAccentColor(color) {
    const rgb = getAccentRGB(color);
    document.documentElement.style.setProperty('--accent', color);
    document.documentElement.style.setProperty('--accent-rgb', rgb);
    localStorage.setItem('momo-accent', color);

    colorOptions.forEach((opt) => {
      opt.classList.toggle('active', opt.dataset.color === color);
    });
  }

  const savedColor = localStorage.getItem('momo-accent') || '#0071e3';
  setAccentColor(savedColor);

  if (colorPickerBtn && colorPopup) {
    colorPickerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      colorPopup.classList.toggle('visible');
    });
    if (colorPopupClose) {
      colorPopupClose.addEventListener('click', () => colorPopup.classList.remove('visible'));
    }
    colorOptions.forEach((opt) => {
      opt.addEventListener('click', () => {
        setAccentColor(opt.dataset.color);
        colorPopup.classList.remove('visible');
        playSound('click');
      });
    });
    document.addEventListener('click', (e) => {
      if (!colorPopup.contains(e.target) && e.target !== colorPickerBtn) {
        colorPopup.classList.remove('visible');
      }
    });
  }

  // --- Particle Canvas Animation ---
  initParticleCanvas();
}

function initParticleCanvas() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = Array.from({ length: 35 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: Math.random() * 2 + 1,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    alpha: Math.random() * 0.5 + 0.2,
  }));

  function animate() {
    ctx.clearRect(0, 0, width, height);
    const accentRGB = getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim() || '0, 113, 227';
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${accentRGB}, ${p.alpha})`;
      ctx.fill();
    }
    requestAnimationFrame(animate);
  }
  animate();
}
