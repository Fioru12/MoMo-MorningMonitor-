import { escapeHtml, playSound } from '../state.js';

export function initMomoGreeting() {
  const title = document.getElementById('greetingTitle');
  const sub = document.getElementById('greetingSubtitle');
  if (!title) return;

  const h = new Date().getHours();
  let greet = 'Buongiorno ☀️';
  let msg = 'Pronto per una grande giornata?';
  if (h < 6) {
    greet = 'Buona notte 🌙';
    msg = 'Dormi bene, domani è un altro giorno.';
  } else if (h < 12) {
    greet = 'Buongiorno ☀️';
    msg = 'Inizia con il tuo Focus #1.';
  } else if (h < 18) {
    greet = 'Buon pomeriggio 🌤️';
    msg = 'Mantieni il ritmo, sei a metà!';
  } else if (h < 22) {
    greet = 'Buonasera 🌅';
    msg = 'Chiudi in bellezza la giornata.';
  } else {
    greet = 'Buona notte 🌙';
    msg = 'Ricarica le energie.';
  }
  title.textContent = greet;
  if (sub) sub.textContent = msg;

  const focusText = document.getElementById('greetingFocusText');
  const focusCheck = document.getElementById('greetingFocusCheck');

  function renderGreetingFocus() {
    if (!focusText || !focusCheck) return;
    const data = JSON.parse(localStorage.getItem('momo-focus') || 'null');
    if (!data || !data.text) {
      focusText.textContent = '';
      focusText.classList.remove('done');
      focusCheck.textContent = '☐';
      return;
    }
    focusText.textContent = data.text;
    focusText.classList.toggle('done', !!data.done);
    focusCheck.textContent = data.done ? '☑' : '☐';
  }

  if (focusText) {
    focusText.addEventListener('blur', () => {
      const text = focusText.textContent.trim();
      if (!text) return;
      const existing = JSON.parse(localStorage.getItem('momo-focus') || 'null');
      localStorage.setItem(
        'momo-focus',
        JSON.stringify({ text, done: existing?.done || false, date: new Date().toISOString().slice(0, 10) })
      );
      const focusInput = document.getElementById('focusInput');
      const focusDisplay = document.getElementById('focusDisplay');
      if (focusDisplay) {
        focusDisplay.textContent = text;
        focusDisplay.style.textDecoration = 'none';
        focusDisplay.style.opacity = '1';
        if (focusInput) focusInput.style.display = 'none';
        const checkBtn = document.getElementById('focusCheck');
        if (checkBtn) {
          checkBtn.textContent = '☐';
          checkBtn.classList.remove('done');
        }
      }
    });
    focusText.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        focusText.blur();
      }
    });
  }

  if (focusCheck) {
    focusCheck.addEventListener('click', () => {
      const data = JSON.parse(localStorage.getItem('momo-focus') || 'null');
      if (!data) return;
      data.done = !data.done;
      localStorage.setItem('momo-focus', JSON.stringify(data));
      renderGreetingFocus();
      const checkBtn = document.getElementById('focusCheck');
      const focusDisplay = document.getElementById('focusDisplay');
      if (checkBtn) {
        checkBtn.textContent = data.done ? '☑' : '☐';
        checkBtn.classList.toggle('done', data.done);
      }
      if (focusDisplay) {
        focusDisplay.style.textDecoration = data.done ? 'line-through' : 'none';
        focusDisplay.style.opacity = data.done ? '0.6' : '1';
      }
      playSound('click');
    });
  }
  renderGreetingFocus();

  const summaryEl = document.getElementById('greetingSummary');
  fetch('/api/briefing')
    .then((r) => r.json())
    .then((d) => {
      const el = document.getElementById('briefingBullets');
      if (el && d.bullets) el.innerHTML = d.bullets.map((b) => `<div class="briefing-bullet">${escapeHtml(b)}</div>`).join('');
      if (summaryEl && d.news) {
        const pomData = JSON.parse(localStorage.getItem('momo-pomodoro') || '{}');
        const today = new Date().toISOString().slice(0, 10);
        const pomCount = pomData.date === today ? pomData.count || 0 : 0;
        summaryEl.innerHTML = [
          d.weather ? `<span class="greeting-summary-item"><span class="gs-icon">🌤️</span><span class="gs-value">${d.weather.temp}°C</span></span>` : '',
          d.pending != null ? `<span class="greeting-summary-item"><span class="gs-icon">✅</span><span class="gs-value">${d.pending} todo</span></span>` : '',
          d.news && d.news.length ? `<span class="greeting-summary-item"><span class="gs-icon">📰</span><span class="gs-value">${d.news.length} news</span></span>` : '',
          `<span class="greeting-summary-item"><span class="gs-icon">🍅</span><span class="gs-value">${pomCount} pomodoro</span></span>`,
        ]
          .filter(Boolean)
          .join('');
      }
    })
    .catch(() => {});

  fetch('/api/quote')
    .then((r) => r.json())
    .then((d) => {
      const qt = document.querySelector('#greetingQuote .quote-text');
      const qa = document.querySelector('#greetingQuote .quote-author');
      if (qt) qt.textContent = '"' + d.content + '"';
      if (qa) qa.textContent = '— ' + d.author;
    })
    .catch(() => {});

  const sunEl = document.getElementById('greetingSun');
  if (sunEl) {
    sunEl.textContent = '🌅 ' + (localStorage.getItem('momo-sunrise') || '06:42') + ' • 🌇 ' + (localStorage.getItem('momo-sunset') || '20:15');
  }
}
