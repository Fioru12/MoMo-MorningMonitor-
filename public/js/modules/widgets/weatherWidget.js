import { fetchAPI, showToast, setWidgetTimestamp, getWeatherIcon, state } from '../../state.js';

export function initWeatherWidget() {
  loadWeather();
  updateHeaderWeather();

  const refreshBtn = document.querySelector('.widget-refresh[data-widget="weather"]');
  if (refreshBtn) refreshBtn.addEventListener('click', loadWeather);
}

export async function loadWeather() {
  const tempEl = document.getElementById('weatherTemp');
  const errorEl = document.getElementById('weatherError');
  if (errorEl) errorEl.classList.remove('visible');
  if (tempEl) tempEl.classList.add('loading');

  try {
    const data = await fetchAPI('/api/weather');

    if (data.error) {
      if (errorEl) {
        errorEl.textContent = data.error;
        errorEl.classList.add('visible');
      }
      if (tempEl) tempEl.classList.remove('loading');
      return;
    }

    if (tempEl) {
      tempEl.classList.remove('loading');
      tempEl.textContent = `${data.temp}°`;
    }
    setText('weatherDesc', data.desc);
    setText('weatherFeels', `${data.feelsLike}°`);
    setText('weatherHumidity', `${data.humidity}%`);
    setText('weatherWind', `${data.windSpeed} km/h`);
    setText('weatherCity', `📍 ${data.city}`);

    const sunEl = document.getElementById('greetingSun');
    if (sunEl && data.sunrise) {
      sunEl.textContent = `🌅 ${data.sunrise} • 🌇 ${data.sunset}`;
      localStorage.setItem('momo-sunrise', data.sunrise);
      localStorage.setItem('momo-sunset', data.sunset);
    }

    if (data.hourly && data.hourly.length) {
      let hourlyEl = document.getElementById('hourlyRow');
      if (!hourlyEl) {
        const wBody = document.getElementById('weatherBody');
        if (wBody) {
          hourlyEl = document.createElement('div');
          hourlyEl.id = 'hourlyRow';
          hourlyEl.className = 'hourly-row';
          wBody.appendChild(hourlyEl);
        }
      }
      if (hourlyEl) {
        hourlyEl.innerHTML = data.hourly
          .map(
            (h) =>
              `<div class="hourly-item"><div class="hourly-time">${h.time.slice(0, 2)}:${h.time.slice(2)}</div><div class="hourly-temp">${h.temp}°</div><div style="font-size:0.6rem;color:var(--text-tertiary)">${h.chanceRain}%</div></div>`
          )
          .join('');
      }

      try {
        const ctx = document.getElementById('hourlyChart');
        if (ctx && data.hourly.length > 2 && typeof Chart !== 'undefined') {
          if (state.hourlyChart) state.hourlyChart.destroy();
          state.hourlyChart = new Chart(ctx, {
            type: 'line',
            data: {
              labels: data.hourly.map((h) => h.time.slice(0, 2) + ':' + h.time.slice(2)),
              datasets: [
                {
                  data: data.hourly.map((h) => parseInt(h.temp)),
                  borderColor: '#0071e3',
                  backgroundColor: 'rgba(0,113,227,0.12)',
                  tension: 0.4,
                  fill: true,
                  pointRadius: 0,
                  borderWidth: 2,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { x: { display: false }, y: { display: false } },
            },
          });
        }
      } catch {}
    }

    const forecastRow = document.getElementById('forecastRow');
    if (forecastRow) {
      if (data.forecast && data.forecast.length > 0) {
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
        const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

        forecastRow.innerHTML = data.forecast
          .map((day) => {
            const date = new Date(day.date + 'T00:00:00');
            return `
              <div class="forecast-card">
                <div class="forecast-date">${dayNames[date.getDay()]} ${date.getDate()} ${monthNames[date.getMonth()]}</div>
                <div class="forecast-icon">${getWeatherIcon(day.icon || day.desc)}</div>
                <div class="forecast-temps">
                  <span class="forecast-temp-max">${day.tempMax}°</span>
                  <span class="forecast-temp-min">${day.tempMin}°</span>
                </div>
              </div>
            `;
          })
          .join('');
      } else {
        forecastRow.innerHTML = '';
      }
    }

    setWidgetTimestamp('weather');
  } catch {
    if (tempEl) tempEl.classList.remove('loading');
    if (errorEl) {
      errorEl.textContent = 'Errore di connessione';
      errorEl.classList.add('visible');
    }
  }
}

export async function updateHeaderWeather() {
  try {
    const data = await fetchAPI('/api/weather');
    if (!data.error) {
      setText('headerWeatherTemp', `${data.temp}°`);
      setText('headerWeatherIcon', getWeatherIcon(data.desc));
    }
  } catch {
    // meteo header — non critico
  }
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
