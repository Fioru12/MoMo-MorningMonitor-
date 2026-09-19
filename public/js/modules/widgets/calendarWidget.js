import { fetchAPI, emptyState } from '../../state.js';

export function initCalendarWidget() {
  loadCalendar();
}

export async function loadCalendar() {
  try {
    const data = await fetchAPI('/api/calendar');
    const header = document.getElementById('calendarHeader');
    const grid = document.getElementById('calendarGrid');
    if (!header || !grid) return;

    const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    header.textContent = `${monthNames[data.month - 1]} ${data.year}`;

    const dayNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
    let html = dayNames.map((d) => `<div class="calendar-day-header">${d}</div>`).join('');

    const firstDay = new Date(data.year, data.month - 1, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < offset; i++) {
      html += '<div class="calendar-day other-month"></div>';
    }

    let todoDays = new Map();
    try {
      const todos = await fetchAPI('/api/todos');
      todos.forEach((t) => {
        const d = new Date(t.createdAt);
        if (d.getMonth() + 1 === data.month && d.getFullYear() === data.year) {
          todoDays.set(d.getDate(), (todoDays.get(d.getDate()) || 0) + 1);
        }
      });
    } catch {}

    data.days.forEach((day) => {
      const isToday = day.day === data.today;
      const hasTodo = (todoDays.get(day.day) || 0) > 0;
      html += `<div class="calendar-day ${isToday ? 'today' : ''} ${hasTodo ? 'has-todo' : ''}" data-day="${day.day}">${day.day}${hasTodo ? '<span class="cal-dot"></span>' : ''}</div>`;
    });

    grid.innerHTML = html;
  } catch {
    const grid = document.getElementById('calendarGrid');
    if (grid) grid.innerHTML = emptyState('⚠️', 'Errore caricamento calendario');
  }
}
