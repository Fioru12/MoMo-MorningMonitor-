import { showToast } from '../state.js';

export function initBackup() {
  const btn = document.getElementById('importBackupBtn');
  const input = document.getElementById('importBackupInput');
  if (!btn || !input) return;

  btn.addEventListener('click', () => input.click());
  input.addEventListener('change', async () => {
    const file = input.files[0];
    input.value = '';
    if (!file) return;
    let data;
    try {
      data = JSON.parse(await file.text());
    } catch {
      return showToast('⚠️ File non valido');
    }
    if (!confirm('Importare questo backup? Impostazioni, todo, note, segnalibri e snippet attuali verranno sostituiti.')) return;
    const res = await fetch('/api/backup/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return showToast('⚠️ ' + (err.error || 'Importazione fallita'));
    }
    // Le preferenze locali sono copie: svuotandole, al ricaricamento vincono quelle importate.
    localStorage.clear();
    showToast('✅ Backup importato');
    setTimeout(() => location.reload(), 600);
  });
}
