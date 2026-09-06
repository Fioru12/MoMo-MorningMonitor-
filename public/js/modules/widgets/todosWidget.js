import { showToast, playSound } from '../../state.js';

export function initTodosWidget() {
  const todoForm = document.getElementById('todoForm');
  const todoInput = document.getElementById('todoInput');

  if (todoForm) {
    todoForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = todoInput.value.trim();
      if (!text) return;

      try {
        await fetch('/api/todos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        todoInput.value = '';
        playSound('click');
        loadTodos();
      } catch {
        showToast('⚠️ Errore salvataggio todo');
      }
    });
  }

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
      return;
    }

    list.innerHTML = todos
      .map(
        (t) => `
      <li class="todo-item" data-id="${t.id}">
        <input type="checkbox" class="todo-check" ${t.done ? 'checked' : ''} />
        <span class="todo-text ${t.done ? 'done' : ''}">${escapeHtml(t.text)}</span>
        <button class="todo-delete" aria-label="Elimina">✕</button>
      </li>
    `
      )
      .join('');

    list.querySelectorAll('.todo-check').forEach((cb) => {
      cb.addEventListener('change', async (e) => {
        const li = e.target.closest('.todo-item');
        const id = li.dataset.id;
        await fetch(`/api/todos/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ done: e.target.checked }),
        });
        if (e.target.checked) playSound('click');
        loadTodos();
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
  } catch {
    showToast('⚠️ Errore caricamento todo');
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
