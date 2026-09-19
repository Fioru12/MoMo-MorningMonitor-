import { fetchAPI, escapeHtml, emptyState, formatBytes } from '../../state.js';

export function initStorageWidget() {
  loadStorage();
  const refreshBtn = document.querySelector('.widget-refresh[data-widget="storage"]');
  if (refreshBtn) refreshBtn.addEventListener('click', loadStorage);
}

export async function loadStorage() {
  const info = document.getElementById('storageInfo');
  try {
    const data = await fetchAPI('/api/storage');
    if (!info) return;

    if (data.usage.length === 0) {
      info.innerHTML = emptyState('💾', 'Nessun dispositivo di storage');
      return;
    }

    info.innerHTML = data.usage
      .map((disk) => {
        const percent = parseInt(disk.percent) || 0;
        const barColor = percent > 90 ? 'var(--danger)' : percent > 70 ? 'var(--warning)' : '';
        return `
        <div class="storage-item">
          <div class="storage-header">
            <span class="storage-device">${escapeHtml(disk.device)}</span>
            <span class="storage-percent">${percent}%</span>
          </div>
          <div class="storage-bar">
            <div class="storage-bar-fill" style="width: ${percent}%; ${barColor ? 'background:' + barColor : ''}"></div>
          </div>
          <div class="storage-details">
            <span>Usato: ${formatBytes(disk.used)}</span>
            <span>Libero: ${formatBytes(disk.free)}</span>
          </div>
        </div>
      `;
      })
      .join('');
  } catch {
    if (info) info.innerHTML = emptyState('⚠️', 'Errore caricamento storage');
  }
}
