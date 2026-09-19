import { fetchAPI, escapeHtml, emptyState, formatBytes } from '../../state.js';

export function initNetworkWidget() {
  loadNetwork();
  const refreshBtn = document.querySelector('.widget-refresh[data-widget="network"]');
  if (refreshBtn) refreshBtn.addEventListener('click', loadNetwork);
}

export async function loadNetwork() {
  const info = document.getElementById('networkInfo');
  try {
    const data = await fetchAPI('/api/network');
    if (!info) return;

    let html = data.interfaces
      .map(
        (iface) => `
        <div class="network-item">
          <span class="network-label">${escapeHtml(iface.name)}</span>
          <span class="network-value">${escapeHtml(iface.ip)}</span>
        </div>
      `
      )
      .join('');

    html += `
      <div class="network-item">
        <span class="network-label">⬇ Ricevuti</span>
        <span class="network-value">${formatBytes(data.rxBytes)}</span>
      </div>
      <div class="network-item">
        <span class="network-label">⬆ Trasferiti</span>
        <span class="network-value">${formatBytes(data.txBytes)}</span>
      </div>
    `;

    info.innerHTML = html;
  } catch {
    if (info) info.innerHTML = emptyState('⚠️', 'Errore caricamento rete');
  }
}
