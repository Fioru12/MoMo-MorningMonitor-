const ical = require('node-ical');
const dbService = require('../../data/db');
const { getCache, setCache } = require('./cacheService');

const SETTING_KEY = 'momo-calendar-ics';

// Gli eventi del mese corrente (più i primi giorni del successivo) dal calendario iCal salvato.
// Google: Impostazioni calendario › "Indirizzo segreto in formato iCal". Outlook: Pubblica calendario › ICS.
async function getCalendarEvents() {
  const settings = await dbService.getSettings();
  const url = (settings[SETTING_KEY] || '').trim();
  if (!url) return { configured: false, events: [] };

  const cached = getCache('calendar_events');
  if (cached && cached.url === url) return cached.data;

  const res = await fetch(url.replace(/^webcal:/i, 'https:'), { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const parsed = ical.sync.parseICS(await res.text());

  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 7);
  const events = [];
  for (const ev of Object.values(parsed)) {
    if (ev.type !== 'VEVENT' || !ev.start) continue;
    let instances;
    try {
      instances = ical.expandRecurringEvent(ev, { from, to, expandOngoing: true });
    } catch {
      continue;
    }
    for (const inst of instances) {
      events.push({
        title: String(inst.summary || ev.summary || 'Evento'),
        start: inst.start.toISOString(),
        end: inst.end ? inst.end.toISOString() : null,
        allDay: Boolean(inst.isFullDay),
        location: ev.location ? String(ev.location) : '',
      });
    }
  }
  events.sort((a, b) => a.start.localeCompare(b.start));

  const data = { configured: true, events };
  setCache('calendar_events', { url, data }, 10 * 60 * 1000);
  return data;
}

// Eventi di oggi (in ora locale), inclusi quelli di più giorni in corso.
function eventsOnDay(events, day = new Date()) {
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return events.filter((e) => {
    const s = new Date(e.start);
    const f = e.end ? new Date(e.end) : s;
    return s < end && (f > start || s >= start);
  });
}

module.exports = { getCalendarEvents, eventsOnDay, SETTING_KEY };
