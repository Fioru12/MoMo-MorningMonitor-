import { fetchAPI, emptyState } from '../../state.js';

export function initServicesWidget() {
  loadServices();
  const refreshBtn = document.querySelector('.widget-refresh[data-widget="services"]');
  if (refreshBtn) refreshBtn.addEventListener('click', loadServices);
}

export async function loadServices() {
  const list = document.getElementById('servicesList');
  try {
    const services = await fetchAPI('/api/services');
    if (!list) return;

    if (services.length === 0) {
      list.innerHTML = emptyState('⚙️', 'Nessun servizio');
      return;
    }

    list.innerHTML = services
      .map(
        (svc) => `
      <div class="service-item">
        <span class="service-name">${svc.name}</span>
        <span class="service-status ${svc.status}">
          <span class="service-dot"></span>
          ${svc.status === 'running' ? 'Attivo' : svc.status === 'stopped' ? 'Fermo' : 'Non trovato'}
        </span>
      </div>
    `
      )
      .join('');
  } catch {
    if (list) list.innerHTML = emptyState('⚠️', 'Errore caricamento servizi');
  }
}
