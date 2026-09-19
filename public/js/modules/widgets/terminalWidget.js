import { showToast, playSound, escapeHtml } from '../../state.js';

export function initTerminalWidget() {
  const overlay = document.getElementById('terminalOverlay');
  const closeBtn = document.getElementById('terminalClose');
  const clearBtn = document.getElementById('terminalClear');
  const form = document.getElementById('terminalForm');
  const input = document.getElementById('terminalInput');

  if (!overlay) return;

  function close() {
    overlay.classList.remove('visible');
    overlay.setAttribute('aria-hidden', 'true');
  }

  if (closeBtn) closeBtn.addEventListener('click', close);
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('visible')) {
      close();
    }
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      const output = document.getElementById('terminalOutput');
      if (output) output.innerHTML = `<div class="term-line term-sys">☀️ MoMo Web Terminal • Digita un comando o esegui uno snippet</div>`;
    });
  }

  if (form && input) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const cmd = input.value.trim();
      if (!cmd) return;
      input.value = '';
      executeCommand(cmd);
    });
  }
}

export async function executeCommand(command) {
  const overlay = document.getElementById('terminalOverlay');
  const output = document.getElementById('terminalOutput');
  const input = document.getElementById('terminalInput');

  if (overlay) {
    overlay.classList.add('visible');
    overlay.setAttribute('aria-hidden', 'false');
    if (input) input.focus();
  }

  if (!output) return;

  // Append prompt line
  const cmdLine = document.createElement('div');
  cmdLine.className = 'term-line term-cmd';
  cmdLine.innerHTML = `<span class="term-prompt">momo@system:~$</span> <span class="term-text">${escapeHtml(command)}</span>`;
  output.appendChild(cmdLine);

  // Append loading line
  const loadingLine = document.createElement('div');
  loadingLine.className = 'term-line term-running';
  loadingLine.innerHTML = `<span class="term-spinner">⚡ Esecuzione in corso...</span>`;
  output.appendChild(loadingLine);
  output.scrollTop = output.scrollHeight;

  try {
    let pin = sessionStorage.getItem('momo-terminal-pin') || '';
    if (!pin) {
      pin = window.prompt('PIN del Web Terminal:') || '';
    }

    const response = await fetch('/api/snippets/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, pin }),
    });

    if (response.status === 401) {
      sessionStorage.removeItem('momo-terminal-pin');
      loadingLine.remove();
      const errLine = document.createElement('div');
      errLine.className = 'term-line term-error';
      errLine.textContent = '🔒 PIN errato o mancante. Riprova il comando.';
      output.appendChild(errLine);
      playSound('delete');
      output.scrollTop = output.scrollHeight;
      return;
    }

    sessionStorage.setItem('momo-terminal-pin', pin);
    const res = await response.json();

    loadingLine.remove();

    if (res.stdout) {
      const outLine = document.createElement('div');
      outLine.className = 'term-line term-stdout';
      outLine.textContent = res.stdout;
      output.appendChild(outLine);
    }

    if (res.stderr) {
      const errLine = document.createElement('div');
      errLine.className = 'term-line term-stderr';
      errLine.textContent = res.stderr;
      output.appendChild(errLine);
    }

    const infoLine = document.createElement('div');
    infoLine.className = `term-line ${res.ok ? 'term-success' : 'term-error'}`;
    infoLine.textContent = `[Processo terminato con codice ${res.exitCode} in ${res.durationMs}ms]`;
    output.appendChild(infoLine);

    if (res.ok) playSound('click');
    else playSound('delete');
  } catch (err) {
    loadingLine.remove();
    const errLine = document.createElement('div');
    errLine.className = 'term-line term-error';
    errLine.textContent = `⚠️ Impossibile eseguire il comando: ${err.message}`;
    output.appendChild(errLine);
    playSound('delete');
  }

  output.scrollTop = output.scrollHeight;
}
