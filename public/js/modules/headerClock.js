export function initHeaderClock() {
  const clockSelect = document.getElementById('clockSelect');
  const headerClockTime = document.getElementById('headerClockTime');
  const headerClockDate = document.getElementById('headerClockDate');
  const footerYear = document.getElementById('footerYear');
  const headerDate = document.getElementById('headerDate');

  if (footerYear) footerYear.textContent = new Date().getFullYear();

  if (headerDate) {
    const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    const now = new Date();
    headerDate.textContent = `${dayNames[now.getDay()]} ${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`;
  }

  if (!clockSelect || !headerClockTime || !headerClockDate) return;

  function updateHeaderClock() {
    const zone = clockSelect.value;
    const now = new Date();
    headerClockTime.textContent = now.toLocaleTimeString('it-IT', {
      timeZone: zone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    headerClockDate.textContent = now.toLocaleDateString('it-IT', {
      timeZone: zone,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  updateHeaderClock();
  setInterval(updateHeaderClock, 1000);
  clockSelect.addEventListener('change', updateHeaderClock);
}
