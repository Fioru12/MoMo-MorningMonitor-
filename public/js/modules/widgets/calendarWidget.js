import { fetchAPI, emptyState, escapeHtml, showToast } from '../../state.js';

let events = [];
let selectedDay = null;

export function initCalendarWidget() {
  const btn = document.getElementById('calendarSettingsBtn');
  const form = document.getElementById('calendarSettings');
  const input = document.getElementById('calendarIcsInput');
  const remove = document.getElementById('calendarIcsRemove');

  btn?.addEventListener('click', async () => {
    form.hidden = !form.hidden;
    if (!form.hidden) {
      const settings = await fetchAPI('/api/settings').catch(() => ({}));
      input.value = settings['momo-calendar-ics'] || '';
      input.focus();
    }
  });
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = input.value.trim();
    if (!/^(https?|webcal):\/\//i.test(url)) return showToast('Inserisci un URL iCal valido');
    await saveIcs(url);
    showToast('📅 Calendario collegato');
  });
  remove?.addEventListener('click', async () => {
    input.value = '';
    await saveIcs(null);
    showToast('Calendario scollegato');
  });
  document.getElementById('calendarGrid')?.addEventListener('click', (e) => {
    const cell = e.target.closest('.calendar-day[data-day]');
    if (!cell) return;
    const day = Number(cell.dataset.day);
    selectedDay = selectedDay === day ? null : day;
    renderEvents();
  });

  loadCalendar();
}

async function saveIcs(value) {
  await fetch('/api/settings/momo-calendar-ics', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  });
  document.getElementById('calendarSettings').hidden = true;
  loadCalendar();
}

// Eventi che toccano il giorno indicato del mese corrente (anche quelli di più giorni).
function eventsOn(day) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), day);
  const end = new Date(now.getFullYear(), now.getMonth(), day + 1);
  const iso = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const todos = dueTodos.filter((t) => t.dueDate === iso).map((t) => ({ title: t.text, todo: true, location: '' }));
  return events.filter((e) => {
    const s = new Date(e.start);
    const f = e.end ? new Date(e.end) : s;
    return s < end && (f > start || s >= start);
  }).concat(todos);
}

let dueTodos = [];

let lastInfo = {};

function renderEvents(info = lastInfo) {
  lastInfo = info;
  const box = document.getElementById('calendarEvents');
  if (!box) return;
  document.querySelectorAll('.calendar-day.selected').forEach((c) => c.classList.remove('selected'));
  if (selectedDay) document.querySelector(`.calendar-day[data-day="${selectedDay}"]`)?.classList.add('selected');

  const warn = info.error ? `<div class="calendar-events-empty">⚠️ ${escapeHtml(info.error)}</div>` : '';
  if (info.configured === false && !eventsOn(selectedDay || new Date().getDate()).length) {
    box.innerHTML = '<div class="calendar-events-empty">Collega Google o Outlook con ⚙ per vedere i tuoi impegni</div>';
    return;
  }
  const today = new Date().getDate();
  const day = selectedDay || today;
  const list = eventsOn(day);
  const label = day === today ? 'Oggi' : `${day}/${new Date().getMonth() + 1}`;
  if (!list.length) {
    box.innerHTML = warn + `<div class="calendar-events-empty">${label}: nessun impegno</div>`;
    return;
  }
  box.innerHTML = warn + `<div class="calendar-events-title">${label}</div>` + list.map((e) => {
    const time = e.todo ? 'Todo' : e.allDay ? 'Giorno' : new Date(e.start).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    return `<div class="calendar-event"><span class="calendar-event-time${e.todo ? ' todo' : ''}">${time}</span><span class="calendar-event-title" title="${escapeHtml(e.location)}">${escapeHtml(e.title)}</span></div>`;
  }).join('');
}

export async function loadCalendar() {
  try {
    const [data, cal, todos] = await Promise.all([
      fetchAPI('/api/calendar'),
      fetchAPI('/api/calendar/events').catch(() => ({ configured: false, events: [] })),
      fetchAPI('/api/todos').catch(() => []),
    ]);
    events = cal.events || [];
    dueTodos = todos.filter((t) => t.dueDate && !t.done);
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

    data.days.forEach((day) => {
      const isToday = day.day === data.today;
      const hasEvent = eventsOn(day.day).length > 0;
      html += `<div class="calendar-day ${isToday ? 'today' : ''} ${hasEvent ? 'has-todo' : ''}" data-day="${day.day}">${day.day}${hasEvent ? '<span class="cal-dot"></span>' : ''}</div>`;
    });

    grid.innerHTML = html;
    renderEvents(cal);
  } catch {
    const grid = document.getElementById('calendarGrid');
    if (grid) grid.innerHTML = emptyState('⚠️', 'Errore caricamento calendario');
  }
}
