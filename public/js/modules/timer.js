import { state, showToast, playSound } from '../state.js';
import { sendNotification } from './notifications.js';

export function initTimer() {
  restoreTimerState();

  document.querySelectorAll('.timer-preset').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (state.timerRunning) return;
      document.querySelectorAll('.timer-preset').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.timerSeconds = parseInt(btn.dataset.minutes) * 60;
      updateTimerDisplay();
    });
  });

  const startBtn = document.getElementById('timerStart');
  const pauseBtn = document.getElementById('timerPause');
  const resetBtn = document.getElementById('timerReset');

  if (startBtn) {
    startBtn.addEventListener('click', () => {
      if (state.timerRunning) return;

      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }

      state.timerRunning = true;
      playSound('click');
      state.timerInterval = setInterval(() => {
        if (state.timerSeconds > 0) {
          state.timerSeconds--;
          updateTimerDisplay();
          saveTimerState();
        } else {
          clearInterval(state.timerInterval);
          state.timerRunning = false;
          saveTimerState();
          playSound('todo');
          showToast('⏰ Timer completato!');

          sendNotification('⏰ MoMo — Pomodoro Completato', {
            body: 'Complimenti! Il tuo ciclo di lavoro è terminato. Ora fai una pausa!',
            icon: '/icon-192.png',
          });

          // Track pomodoro completions
          try {
            const today = new Date().toISOString().slice(0, 10);
            const pomData = JSON.parse(localStorage.getItem('momo-pomodoro') || '{}');
            if (pomData.date !== today) {
              pomData.date = today;
              pomData.count = 0;
            }
            pomData.count++;
            localStorage.setItem('momo-pomodoro', JSON.stringify(pomData));
          } catch {}
        }
      }, 1000);
    });
  }

  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      clearInterval(state.timerInterval);
      state.timerRunning = false;
      saveTimerState();
      playSound('click');
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      clearInterval(state.timerInterval);
      state.timerRunning = false;
      const activePreset = document.querySelector('.timer-preset.active');
      state.timerSeconds = parseInt(activePreset?.dataset.minutes || 25) * 60;
      updateTimerDisplay();
      saveTimerState();
      playSound('click');
    });
  }
}

function saveTimerState() {
  try {
    localStorage.setItem(
      'momo-timer',
      JSON.stringify({ seconds: state.timerSeconds, running: state.timerRunning })
    );
  } catch {}
}

function restoreTimerState() {
  try {
    const saved = JSON.parse(localStorage.getItem('momo-timer') || 'null');
    if (saved && typeof saved.seconds === 'number') {
      state.timerSeconds = saved.seconds;
      updateTimerDisplay();
    }
  } catch {}
}

function updateTimerDisplay() {
  const display = document.getElementById('timerDisplay');
  if (!display) return;
  const mins = Math.floor(state.timerSeconds / 60);
  const secs = state.timerSeconds % 60;
  display.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
