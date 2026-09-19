import { fetchAPI, animateCounter, state } from '../../state.js';

const cpuHistory = [];
const ramHistory = [];
const MAX_HISTORY = 60;

export function initSystemWidget() {
  initSystemSparkline();
  loadSystem();

  const refreshBtn = document.querySelector('.widget-refresh[data-widget="system"]');
  if (refreshBtn) refreshBtn.addEventListener('click', loadSystem);
}

export function initSystemSparkline() {
  const canvas = document.getElementById('systemSparkline');
  if (!canvas || typeof Chart === 'undefined') return;

  state.cpuChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: Array(15).fill(''),
      datasets: [
        {
          label: 'CPU %',
          data: Array(15).fill(0),
          borderColor: '#0071e3',
          backgroundColor: 'rgba(0, 113, 227, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointRadius: 0,
        },
        {
          label: 'RAM %',
          data: Array(15).fill(0),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      scales: {
        x: { display: false },
        y: { display: false, min: 0, max: 100 },
      },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true },
      },
    },
  });
}

function updateSystemSparkline(cpuVal, ramVal) {
  if (!state.cpuChart) return;
  const cpuData = state.cpuChart.data.datasets[0].data;
  const ramData = state.cpuChart.data.datasets[1].data;
  cpuData.push(cpuVal);
  cpuData.shift();
  ramData.push(ramVal);
  ramData.shift();
  state.cpuChart.update('none');
}

export function updateSystemWidget(data) {
  const cpuPct = Math.min(data.cpu.usage, 100);
  const ramPct = Math.min(data.memory.percent, 100);

  animateCounter(document.getElementById('cpuValue'), cpuPct, '%');
  animateCounter(document.getElementById('ramValue'), ramPct, '%');

  setStyle('cpuBar', 'width', `${cpuPct}%`);
  setStyle('ramBar', 'width', `${ramPct}%`);
  setText('sysHostname', data.hostname);
  setText('sysPlatform', `${data.platform} (${data.arch})`);
  setText('sysUptime', data.uptime);
  setText('sysLoad', data.loadAvg.join(' / '));

  cpuHistory.push(cpuPct);
  ramHistory.push(ramPct);
  if (cpuHistory.length > MAX_HISTORY) cpuHistory.shift();
  if (ramHistory.length > MAX_HISTORY) ramHistory.shift();

  updateSystemSparkline(cpuPct, ramPct);
}

export async function loadSystem() {
  try {
    const data = await fetchAPI('/api/system');
    updateSystemWidget(data);
  } catch {
    // metriche di sistema — non critico
  }
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setStyle(id, prop, value) {
  const el = document.getElementById(id);
  if (el) el.style[prop] = value;
}
