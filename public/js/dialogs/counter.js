// public/js/dialogs/counter.js – Dialog za ažuriranje brojača
import { state } from '../state.js';
import { api } from '../api.js';
import { showToast, openDlg, closeDlg, fmtNum } from '../utils.js';

export function openCounterDialog(counterId, name, currentVal, unit) {
  state.pendingCounter = { counterId, name, currentVal, unit };
  document.getElementById('dlgCntTitle').textContent = 'Ažuriranje: ' + name;
  document.getElementById('dlgCntInfo').textContent  = `Unesite novu vrednost za "${name}". Jedinica: ${unit || '—'}.`;
  document.getElementById('dlgCntCur').value  = `${fmtNum(parseFloat(currentVal) || 0)} ${unit ?? ''}`;
  document.getElementById('dlgCntVal').value  = '';
  openDlg('dlgCounter');
  setTimeout(() => document.getElementById('dlgCntVal')?.focus(), 120);
}

export async function submitCounter() {
  const { counterId } = state.pendingCounter;
  const val = parseFloat(document.getElementById('dlgCntVal').value);
  if (isNaN(val)) { showToast('Unesite valjanu vrednost.', 'err'); return; }

  const r = await api.counterUpdate(state.equipId, counterId, val);
  if (!r) return;
  closeDlg('dlgCounter');
  showToast('Brojač ažuriran.', 'ok');
  import('../equipment.js').then(m => m.refreshDetail());
}
