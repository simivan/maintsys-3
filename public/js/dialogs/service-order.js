// public/js/dialogs/service-order.js – Servisni nalozi dialog
import { state, can } from '../state.js';
import { api } from '../api.js';
import { showToast, openDlg, closeDlg, esc, todayStr } from '../utils.js';

export function openNewSrvDialog() {
  state.editSrvId = null;
  document.getElementById('dlgSrvTitle').textContent = '+ Novi servisni nalog';
  document.getElementById('sDate').value  = todayStr();
  document.getElementById('sNum').value   = 'AUTO';
  document.getElementById('sOp').value    = state.user?.full_name ?? '';
  const opH = parseFloat(state.detail?.counters?.find(c => c.name === 'Radni sati')?.value) || 0;
  document.getElementById('sHrs').value   = opH;
  document.getElementById('sNote').value  = '';
  document.getElementById('sTech').value  = '';
  document.getElementById('sStat').value  = 'Otvoren';
  document.getElementById('sRes').value   = '';
  document.getElementById('sTicket').value = '';
  document.getElementById('sComp').value  = '';
  toggleCompDate();
  // Disable status za operatera
  document.getElementById('sStat').disabled = !can.manage();
  openDlg('dlgSrv');
}

export function openEditSrvDialog(srvId) {
  const s = state.services.find(x => x.id === srvId);
  if (!s) return;
  state.editSrvId = srvId;
  document.getElementById('dlgSrvTitle').textContent = 'Izmena naloga – ' + s.order_number;
  document.getElementById('sDate').value   = s.date ?? '';
  document.getElementById('sNum').value    = s.order_number;
  const opEl = document.getElementById('sOp');
  opEl.value    = s.operator_name ?? '';
  opEl.readOnly = false; // menadžer može menjati operatera
  document.getElementById('sHrs').value    = s.operating_hours ?? 0;
  document.getElementById('sNote').value   = s.service_note ?? '';
  document.getElementById('sTech').value   = s.technician ?? '';
  document.getElementById('sStat').value   = s.status ?? 'Otvoren';
  document.getElementById('sRes').value    = s.resolution ?? '';
  document.getElementById('sTicket').value = s.ticket_url ?? '';
  document.getElementById('sComp').value   = s.completion_date ?? '';
  document.getElementById('sStat').disabled = false;
  toggleCompDate();
  openDlg('dlgSrv');
}

export function toggleCompDate() {
  const stat = document.getElementById('sStat')?.value;
  const field = document.getElementById('sCompField');
  if (field) field.style.display = stat === 'Zatvoren' ? '' : 'none';
}

export async function submitSrv() {
  const note = document.getElementById('sNote').value.trim();
  if (!note) { showToast('Opis servisa je obavezan.', 'err'); return; }

  const body = {
    date:            document.getElementById('sDate').value,
    operator_name:   document.getElementById('sOp').value || state.user?.full_name,
    operating_hours: document.getElementById('sHrs').value || 0,
    service_note:    note,
    technician:      document.getElementById('sTech').value,
    status:          document.getElementById('sStat').value,
    resolution:      document.getElementById('sRes').value,
    ticket_url:      document.getElementById('sTicket').value || null,
    completion_date: document.getElementById('sComp').value  || null,
  };

  let r;
  if (state.editSrvId) {
    r = await api.srvUpdate(state.editSrvId, body);
  } else {
    r = await api.srvCreate(state.equipId, body);
  }
  if (!r) return;

  closeDlg('dlgSrv');
  const msg = state.editSrvId
    ? 'Nalog ažuriran.'
    : `Servisni nalog kreiran${r.order_number ? ' – ' + r.order_number : ''}.`;
  showToast(msg, 'ok');
  import('../equipment.js').then(m => m.refreshDetail());
}
