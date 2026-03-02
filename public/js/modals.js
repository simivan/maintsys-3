// public/js/modals.js – Prošireni prozori za Dnevnik rada i Servisne naloge
import { state, can } from './state.js';
import { esc, fmtNum, fmtDate, soPillCls, tagCls, showToast, openBig, closeBig, downloadCSV } from './utils.js';

// ─── LOGS MODAL ───────────────────────────────────────────────────────────────
export function openLogsModal() {
  document.getElementById('bigLogsTitle').textContent =
    `Dnevnik rada – ${state.detail?.name ?? ''}`;
  document.getElementById('logDateFrom').value = '';
  document.getElementById('logDateTo').value   = '';
  renderLogsTable();
  openBig('bigLogs');
}

export function renderLogsTable() {
  const from = document.getElementById('logDateFrom')?.value;
  const to   = document.getElementById('logDateTo')?.value;
  const { field: f, asc } = state.logSort;

  let data = [...state.logs];
  if (from) data = data.filter(l => (l.created_at ?? '').substring(0, 10) >= from);
  if (to)   data = data.filter(l => (l.created_at ?? '').substring(0, 10) <= to);
  data.sort((a, b) => {
    const va = a[f] ?? '', vb = b[f] ?? '';
    if (typeof va === 'number') return asc ? va - vb : vb - va;
    return asc ? String(va).localeCompare(vb, 'sr') : String(vb).localeCompare(va, 'sr');
  });

  const cols = [
    { k: 'created_at',      l: 'Datum/Vreme'   },
    { k: 'operating_hours', l: 'Radni sati'     },
    { k: 'operator_name',   l: 'Operater'       },
    { k: 'action_type',     l: 'Tip'            },
    { k: 'action_name',     l: 'Akcija'         },
    { k: 'value',           l: 'Vrednost'       },
    { k: 'next_value',      l: 'Sledeća vred.'  },
    { k: 'confirmation',    l: 'Status'         },
    { k: 'notes',           l: 'Napomena'       },
  ];

  document.getElementById('bigLogsBody').innerHTML = `
    <table class="mini-tbl">
      <thead><tr>
        ${cols.map(c => thSortHtml(c, f, asc)).join('')}
      </tr></thead>
      <tbody>
        ${data.length
          ? data.map(l => `<tr>
              <td class="ts">${fmtDate(l.created_at)}</td>
              <td class="num-fmt" style="font-weight:600">${fmtNum(l.operating_hours)}</td>
              <td>${esc(l.operator_name ?? '—')}</td>
              <td><span class="tag ${tagCls(l.action_type)}">${esc(l.action_type ?? '—')}</span></td>
              <td>${esc(l.action_name ?? '—')}</td>
              <td style="font-weight:600">${esc(l.value ?? '—')}</td>
              <td>${esc(l.next_value ?? '—')}</td>
              <td class="${l.confirmation === 'OK' ? 'conf-ok' : 'conf-nok'}">${l.confirmation ?? '—'}</td>
              <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.notes ?? '—')}</td>
            </tr>`).join('')
          : '<tr><td colspan="9" class="empty-state">Nema zapisa u odabranom periodu.</td></tr>'}
      </tbody>
    </table>`;

  bindSortCols('bigLogsBody', state.logSort, renderLogsTable);
}

export function resetLogFilter() {
  document.getElementById('logDateFrom').value = '';
  document.getElementById('logDateTo').value   = '';
  renderLogsTable();
}

export function exportLogsCSV() {
  const headers = ['Datum/Vreme','Radni sati','Operater','Tip','Akcija','Vrednost','Sledeća vred.','Status','Napomena'];
  const rows    = state.logs.map(l => [
    fmtDate(l.created_at), l.operating_hours, l.operator_name,
    l.action_type, l.action_name, l.value, l.next_value, l.confirmation, l.notes,
  ]);
  downloadCSV([headers, ...rows], `dnevnik_${state.detail?.name ?? 'oprema'}_${new Date().toISOString().slice(0,10)}.csv`);
  showToast('CSV preuzet.', 'ok');
}

// ─── SERVICE ORDERS MODAL (per equipment) ────────────────────────────────────
export function openSrvModal() {
  document.getElementById('bigSrvTitle').textContent =
    `Servisni nalozi – ${state.detail?.name ?? ''}`;
  document.getElementById('srvDateFrom').value = '';
  document.getElementById('srvDateTo').value   = '';
  renderSrvTable();
  openBig('bigSrv');
}

export function renderSrvTable() {
  const from = document.getElementById('srvDateFrom')?.value;
  const to   = document.getElementById('srvDateTo')?.value;
  const { field: f, asc } = state.srvSort;

  let data = [...state.services];
  if (from) data = data.filter(s => (s.date ?? '') >= from);
  if (to)   data = data.filter(s => (s.date ?? '') <= to);
  data.sort((a, b) => {
    const va = a[f] ?? '', vb = b[f] ?? '';
    if (typeof va === 'number') return asc ? va - vb : vb - va;
    return asc ? String(va).localeCompare(vb, 'sr') : String(vb).localeCompare(va, 'sr');
  });

  const cols = [
    { k: 'date',            l: 'Datum'          },
    { k: 'order_number',    l: 'Br. naloga'     },
    { k: 'operator_name',   l: 'Operater'       },
    { k: 'operating_hours', l: 'Radni sati'     },
    { k: 'service_note',    l: 'Opis'           },
    { k: 'status',          l: 'Status'         },
    { k: 'technician',      l: 'Tehničar'       },
    { k: 'resolution',      l: 'Rešenje'        },
    { k: 'completion_date', l: 'Datum zatv.'    },
    { k: 'ticket_url',      l: 'Ticket'         },
  ];

  document.getElementById('bigSrvBody').innerHTML = `
    <table class="mini-tbl">
      <thead><tr>
        ${cols.map(c => thSortHtml(c, f, asc)).join('')}
      </tr></thead>
      <tbody>
        ${data.length
          ? data.map(s => `
            <tr class="${can.editSrv() ? 'clickable' : ''}" data-srvid="${s.id}">
              <td class="ts">${s.date ?? '—'}</td>
              <td class="srv-num">${esc(s.order_number)}</td>
              <td>${esc(s.operator_name ?? '—')}</td>
              <td class="num-fmt">${fmtNum(s.operating_hours)}</td>
              <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.service_note ?? '—')}</td>
              <td><span class="pill ${soPillCls(s.status)}">${esc(s.status)}</span></td>
              <td>${esc(s.technician ?? '—')}</td>
              <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.resolution ?? '—')}</td>
              <td class="ts">${s.completion_date ?? '—'}</td>
              <td>${s.ticket_url ? `<a class="ticket-link" href="${esc(s.ticket_url)}" target="_blank">🔗 Link</a>` : '—'}</td>
            </tr>`).join('')
          : '<tr><td colspan="10" class="empty-state">Nema servisnih naloga.</td></tr>'}
      </tbody>
    </table>`;

  bindSortCols('bigSrvBody', state.srvSort, renderSrvTable);

  if (can.editSrv()) {
    document.querySelectorAll('#bigSrvBody tr.clickable').forEach(row => {
      row.addEventListener('click', () => {
        import('./dialogs/service-order.js').then(m => {
          m.openEditSrvDialog(parseInt(row.dataset.srvid));
        });
      });
    });
  }
}

export function resetSrvFilter() {
  document.getElementById('srvDateFrom').value = '';
  document.getElementById('srvDateTo').value   = '';
  renderSrvTable();
}

export function exportSrvCSV() {
  const headers = ['Datum','Br. naloga','Operater','Radni sati','Opis','Status',
                   'Tehničar','Rešenje','Datum zatv.','Ticket'];
  const rows = state.services.map(s => [
    s.date, s.order_number, s.operator_name, s.operating_hours,
    s.service_note, s.status, s.technician, s.resolution, s.completion_date, s.ticket_url,
  ]);
  downloadCSV([headers, ...rows], `servisi_${state.detail?.name ?? 'oprema'}_${new Date().toISOString().slice(0,10)}.csv`);
  showToast('CSV preuzet.', 'ok');
}

// ─── Sortable th helper ────────────────────────────────────────────────────────
function thSortHtml(col, activeField, asc) {
  const cls = activeField === col.k
    ? `sort-th ${asc ? 'asc' : 'desc'}`
    : 'sort-th';
  return `<th class="${cls}" data-col="${col.k}">${col.l}</th>`;
}

function bindSortCols(bodyId, sortState, rerenderFn) {
  document.querySelectorAll(`#${bodyId} .sort-th`).forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      if (sortState.field === col) sortState.asc = !sortState.asc;
      else { sortState.field = col; sortState.asc = true; }
      rerenderFn();
    });
  });
}
