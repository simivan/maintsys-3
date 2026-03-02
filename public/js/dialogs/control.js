// public/js/dialogs/control.js – Dialog za unos kontrolnih operacija
import { state } from '../state.js';
import { api } from '../api.js';
import { showToast, openDlg, closeDlg } from '../utils.js';

export function openControlDialog(controlId, name, opH, intervalUnit) {
  state.pendingControl = { controlId, name, opH, intervalUnit };

  document.getElementById('dlgCtrlTitle').textContent = 'Kontrola: ' + name;

  const isDateBased = intervalUnit === 'dan' || intervalUnit === 'god';
  const valWrap = document.getElementById('dlgCtrlValWrap');
  const valLbl  = document.getElementById('dlgCtrlValLbl');
  const valInp  = document.getElementById('dlgCtrlVal');

  if (isDateBased) {
    valWrap.style.display = 'none';
  } else {
    valWrap.style.display = '';
    valLbl.textContent = 'Vrednost (radni sati)';
    valInp.value = opH || '';
  }
  document.getElementById('dlgCtrlNote').value = '';
  document.getElementById('dlgCtrlInfo').textContent =
    isDateBased
      ? `Potvrdite da je kontrola "${name}" obavljena. Datum se unosi automatski.`
      : 'Unesite vrednost radnih sati i potvrdite rezultat.';

  openDlg('dlgCtrl');
  if (!isDateBased) setTimeout(() => valInp?.focus(), 120);
}

export function submitCtrl(confirmation) {
  const { intervalUnit } = state.pendingControl;
  const isDate = intervalUnit === 'dan' || intervalUnit === 'god';
  const value  = isDate ? null : document.getElementById('dlgCtrlVal').value;
  const notes  = document.getElementById('dlgCtrlNote').value.trim();

  state.pendingCtrlData = { value, notes };

  if (confirmation === 'NOK') {
    closeDlg('dlgCtrl');
    document.getElementById('dlgNOKReason').value = notes;
    openDlg('dlgNOK');
  } else {
    closeDlg('dlgCtrl');
    doSubmitControl('OK', notes);
  }
}

export async function submitNOK() {
  const reason = document.getElementById('dlgNOKReason').value.trim();
  closeDlg('dlgNOK');
  await doSubmitControl('NOK', reason);
}

async function doSubmitControl(confirmation, notes) {
  const { controlId, intervalUnit } = state.pendingControl;
  const { value } = state.pendingCtrlData;

  const body = { confirmation, notes };
  if (value !== null) body.value = value;

  const r = await api.controlUpdate(state.equipId, controlId, body);
  if (!r) return;

  if (confirmation === 'NOK' && r.order_number)
    showToast(`NOK – kreiran nalog ${r.order_number}`, 'err');
  else
    showToast('Kontrola zabeležena.', 'ok');

  state.pendingCtrl = null;
  import('../equipment.js').then(m => m.refreshDetail());
}
