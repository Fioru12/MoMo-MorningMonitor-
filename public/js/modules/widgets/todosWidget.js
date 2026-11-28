import { showToast, playSound } from '../../state.js';
import { loadCalendar } from './calendarWidget.js';

const pad = (n) => String(n).padStart(2, '0');
const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// "Oggi", "Domani", "Scaduto da 2 gg", "12 dic"
export function dueLabel(dueDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = dueDate.split('-').map(Number);
  const due = new Date(y, m - 1, d);
  const diff = Math.round((due - today) / 86400000);
  if (diff === 0) return { text: 'Oggi', cls: 'today' };
  if (diff === 1) return { text: 'Domani', cls: '' };
  if (diff < 0) return { text: diff === -1 ? 'Scaduto ieri' : `Scaduto da ${-diff} gg`, cls: 'overdue' };
  return { text: due.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }), cls: '' };
}

export function initTodosWidget() {
  const todoForm = document.getElementById('todoForm');
  const todoInput = document.getElementById('todoInput');
  const priorityBtn = document.getElementById('todoPriorityBtn');
  const dueBtn = document.getElementById('todoDueBtn');
  const dueInput = document.getElementById('todoDueInput');

  const resetOptions = () => {
    priorityBtn?.setAttribute('aria-pressed', 'false');
    if (dueInput) dueInput.value = '';
    renderDueBtn();
  };
  function renderDueBtn() {
    if (!dueBtn) return;
    const v = dueInput.value;
    dueBtn.textContent = v ? dueLabel(v).text : '📅';
    dueBtn.classList.toggle('has-date', Boolean(v));
    dueBtn.title = v ? 'Scadenza (clic per cambiare, tasto destro per togliere)' : 'Scadenza';
  }

  priorityBtn?.addEventListener('click', () => {
    priorityBtn.setAttribute('aria-pressed', String(priorityBtn.getAttribute('aria-pressed') !== 'true'));
  });
  dueBtn?.addEventListener('click', () => {
    if (!dueInput.value) dueInput.value = isoDay(new Date());
    try {
      dueInput.showPicker();
    } catch {
      renderDueBtn();
    }
  });
  dueBtn?.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    dueInput.value = '';
    renderDueBtn();
  });
  dueInput?.addEventListener('change', renderDueBtn);

  if (todoForm) {
    todoForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = todoInput.value.trim();
      if (!text) return;

      try {
        await fetch('/api/todos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            dueDate: dueInput?.value || null,
            priority: priorityBtn?.getAttribute('aria-pressed') === 'true',
          }),
        });
        todoInput.value = '';
        resetOptions();
        playSound('click');
        loadTodos();
      } catch {
        showToast('⚠️ Errore salvataggio todo');
      }
    });
  }

  loadTodos();
}

async function updateTodo(id, body) {
  await fetch(`/api/todos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  loadTodos();
}

export async function loadTodos() {
  try {
    const res = await fetch('/api/todos');
    const todos = await res.json();
    const list = document.getElementById('todoList');
    const countEl = document.getElementById('todoCount');

    if (!list) return;

    const pendingCount = todos.filter((t) => !t.done).length;
    if (countEl) countEl.textContent = todos.length ? `(${pendingCount}/${todos.length})` : '';

    if (todos.length === 0) {
      list.innerHTML = `<div class="widget-empty"><span class="widget-empty-icon">✅</span>Nessun task. Aggiungine uno!</div>`;
      loadCalendar();
      return;
    }

    list.innerHTML = todos
      .map((t) => {
        const due = t.dueDate ? dueLabel(t.dueDate) : null;
        return `
      <li class="todo-item ${t.priority ? 'priority' : ''} ${t.done ? 'is-done' : ''}" data-id="${t.id}">
        <input type="checkbox" class="todo-check" ${t.done ? 'checked' : ''} aria-label="Completato" />
        <span class="todo-main"><span class="todo-text ${t.done ? 'done' : ''}">${escapeHtml(t.text)}</span>${due ? `<span class="todo-due ${t.done ? '' : due.cls}">${due.text}</span>` : ''}</span>
        <button class="todo-flag" aria-label="${t.priority ? 'Togli priorità' : 'Priorità alta'}" title="Priorità">!</button>
        <button class="todo-delete" aria-label="Elimina">✕</button>
      </li>
    `;
      })
      .join('');

    list.querySelectorAll('.todo-check').forEach((cb) => {
      cb.addEventListener('change', (e) => {
        const id = e.target.closest('.todo-item').dataset.id;
        if (e.target.checked) playSound('click');
        updateTodo(id, { done: e.target.checked });
      });
    });

    list.querySelectorAll('.todo-flag').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const li = e.target.closest('.todo-item');
        updateTodo(li.dataset.id, { priority: !li.classList.contains('priority') });
      });
    });

    list.querySelectorAll('.todo-delete').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const li = e.target.closest('.todo-item');
        li.classList.add('removing');
        playSound('click');
        const id = li.dataset.id;
        setTimeout(async () => {
          await fetch(`/api/todos/${id}`, { method: 'DELETE' });
          loadTodos();
        }, 200);
      });
    });

    // Le scadenze compaiono nel calendario: aggiornalo quando cambiano i todo.
    loadCalendar();
  } catch {
    showToast('⚠️ Errore caricamento todo');
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
