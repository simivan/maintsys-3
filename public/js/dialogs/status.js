// public/js/dialogs/status.js – Dialog za promenu statusa opreme
import { state, getEquipCfgById } from '../state.js';
import { api } from '../api.js';
import { showToast, openDlg, closeDlg, esc } from '../utils.js';

export function openStatusDialog(equipId, currentStatus, typeId) {
  state.pendingStatus = { equipId, currentStatus, typeId };
  const cfg     = getEquipCfgById(typeId);
  const options = cfg.statusOptions ?? [];

  document.getElementById('dlgStatusTitle').textContent = 'Promena statusa';
  document.getElementById('dlgStatusInfo').textContent  =
    `Trenutni status: ${currentStatus}. Odaberite novi status i unesite obaveznu napomenu.`;

  const sel = document.getElementById('dlgStatusSel');
  sel.innerHTML = options
    .filter(o => o.value !== currentStatus && o.value !== 'Otpisan' || state.user?.role === 'admin')
    .map(o => `<option value="${esc(o.value)}">${esc(o.label)}</option>`)
    .join('');

  document.getElementById('dlgStatusNote').value = '';
  updateStatusWarn();
  sel.addEventListener('change', updateStatusWarn);

  openDlg('dlgStatus');
  setTimeout(() => document.getElementById('dlgStatusNote')?.focus(), 120);
}

function updateStatusWarn() {
  const val  = document.getElementById('dlgStatusSel')?.value;
  const warn = document.getElementById('dlgStatusWarn');
  if (warn) warn.style.display = val === 'Zastoj' ? 'block' : 'none';
}

export async function submitStatusChange() {
  const { equipId } = state.pendingStatus;
  const status = document.getElementById('dlgStatusSel').value;
  const notes  = document.getElementById('dlgStatusNote').value.trim();

  if (!notes) { showToast('Napomena je obavezna.', 'err'); return; }

  const r = await api.equipStatus(equipId, { status, notes });
  if (!r) return;
  closeDlg('dlgStatus');

  const msg = r.order_number
    ? `Status promenjen u "${status}". Kreiran nalog ${r.order_number}.`
    : `Status promenjen u "${status}".`;
  showToast(msg, 'ok');

  // Osvežiti
  if (state.view === 'equipment' && state.equipId === equipId) {
    import('../equipment.js').then(m => m.refreshDetail());
  } else {
    import('../app.js').then(m => { m.loadEquipment(); });
    import('../dashboard.js').then(m => m.renderDashboard());
  }
}
