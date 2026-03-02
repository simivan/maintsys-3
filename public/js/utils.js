// public/js/utils.js – Zajednički pomoćni utilities

// ─── HTML escaping ────────────────────────────────────────────────────────────
export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Formatiranje brojeva (razmaci kao separator hiljada) ────────────────────
export function fmtNum(n, isInteger = false) {
  const num = isInteger ? Math.round(parseFloat(n) || 0) : (parseFloat(n) || 0);
  if (isNaN(num)) return String(n ?? '0');
  if (isInteger || Number.isInteger(num)) return num.toLocaleString('sr-Latn-RS');
  return num % 1 === 0 ? num.toLocaleString('sr-Latn-RS') : num.toLocaleString('sr-Latn-RS', { maximumFractionDigits: 2 });
}

// ─── Formatiranje datuma iz ISO stringa ──────────────────────────────────────
export function fmtDate(s) {
  if (!s) return '—';
  return s.length >= 16 ? s.substring(0, 10) + ' ' + s.substring(11, 16) : s.substring(0, 10);
}

// ─── Danas u YYYY-MM-DD ──────────────────────────────────────────────────────
export function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// ─── CSS klase za status ─────────────────────────────────────────────────────
export function statusPillCls(status) {
  switch (status) {
    case 'U radu':      return 'pill-ok';
    case 'Zastoj':      return 'pill-bad';
    case 'Neaktivan':   return 'pill-blue';
    case 'Otpisan':     return 'pill-off';
    case 'Dostupan':    return 'pill-dostupan';
    case 'Nedostupan':  return 'pill-nedostupan';
    default:            return 'pill-off';
  }
}

export function soPillCls(status) {
  switch (status) {
    case 'Zatvoren': return 'pill-so-closed';
    case 'U obradi': return 'pill-so-inprog';
    default:         return 'pill-so-open';
  }
}

export function tagCls(actionType) {
  switch (actionType) {
    case 'Kontrola': return 'tag-ctrl';
    case 'Brojač':   return 'tag-cnt';
    case 'Status':   return 'tag-status';
    default:         return 'tag-basic';
  }
}

// ─── Formatiranje vrednosti kontrole za prikaz ───────────────────────────────
export function fmtCtrlVal(ctrl, which) {
  const raw = which === 'last' ? ctrl.last_value : ctrl.next_value;
  if (!raw || raw === '0') return '—';
  const unit = ctrl.interval_unit;
  // Datum-bazirana (god, dan)
  if (unit === 'god' || unit === 'dan') {
    return raw.substring(0, 10); // YYYY-MM-DD
  }
  // Sati
  return fmtNum(parseFloat(raw));
}

// ─── CSV download ────────────────────────────────────────────────────────────
export function downloadCSV(rows, filename) {
  const csv = rows.map(r =>
    r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

// ─── Toast notification ──────────────────────────────────────────────────────
export function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast show${type ? ' ' + type : ''}`;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.className = 'toast'; }, 4000);
}

// ─── Dialog helpers ──────────────────────────────────────────────────────────
export function openDlg(id)  { document.getElementById(id)?.classList.add('open');    }
export function closeDlg(id) { document.getElementById(id)?.classList.remove('open'); }
export function openBig(id)  { document.getElementById(id)?.classList.add('open');    }
export function closeBig(id) { document.getElementById(id)?.classList.remove('open'); }
