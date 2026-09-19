import { playSound } from '../../state.js';

export function initFocusWidget() {
  const input = document.getElementById('focusInput');
  const display = document.getElementById('focusDisplay');
  const check = document.getElementById('focusCheck');
  const clear = document.getElementById('focusClear');
  if (!input || !display) return;

  function syncGreeting() {
    const greetingText = document.getElementById('greetingFocusText');
    const greetingCheck = document.getElementById('greetingFocusCheck');
    const data = JSON.parse(localStorage.getItem('momo-focus') || 'null');
    if (greetingText) {
      greetingText.textContent = data?.text || '';
      greetingText.classList.toggle('done', !!data?.done);
    }
    if (greetingCheck) greetingCheck.textContent = data?.done ? '☑' : '☐';
  }

  function render() {
    const data = JSON.parse(localStorage.getItem('momo-focus') || 'null');
    if (!data || !data.text) {
      display.innerHTML = '<span class="focus-empty">Scrivi il tuo focus e premi Invio ✨</span>';
      input.style.display = '';
      if (check) {
        check.textContent = '☐';
        check.classList.remove('done');
      }
      syncGreeting();
      return;
    }
    input.style.display = 'none';
    display.textContent = data.text;
    display.style.textDecoration = data.done ? 'line-through' : 'none';
    display.style.opacity = data.done ? '0.6' : '1';
    if (check) {
      check.textContent = data.done ? '☑' : '☐';
      check.classList.toggle('done', !!data.done);
    }
    syncGreeting();
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
      localStorage.setItem('momo-focus', JSON.stringify({ text: input.value.trim(), done: false, date: new Date().toISOString().slice(0, 10) }));
      input.value = '';
      render();
      playSound('click');
    }
  });
  if (check) {
    check.addEventListener('click', () => {
      const d = JSON.parse(localStorage.getItem('momo-focus') || 'null');
      if (!d) return;
      d.done = !d.done;
      localStorage.setItem('momo-focus', JSON.stringify(d));
      render();
      playSound('click');
    });
  }
  if (clear) {
    clear.addEventListener('click', () => {
      localStorage.removeItem('momo-focus');
      render();
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const saved = JSON.parse(localStorage.getItem('momo-focus') || 'null');
  if (saved && saved.date && saved.date !== today && saved.done) {
    localStorage.removeItem('momo-focus');
  }

  render();
}
