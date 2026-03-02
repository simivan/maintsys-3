// public/js/dashboard.js – Dashboard prikaz (kartice + lista opreme)
import { state, can, isCNGFilter } from './state.js';
import { esc, fmtNum, statusPillCls, soPillCls, openBig } from './utils.js';
import { api } from './api.js';

export function renderDashboard() {
  const stats  = computeStats(state.allEq);
  const soTot  = stats.soOpen + stats.soInprog + stats.soClosed;
  const pOpen  = soTot ? Math.round(stats.soOpen  / soTot * 100) : 0;
  const pInp   = soTot ? Math.round(stats.soInprog / soTot * 100) : 0;
  const pCls   = 100 - pOpen - pInp;

  document.getElementById('content').innerHTML = `
    <div class="flex-col" style="flex:1;overflow:hidden;">
      ${renderFiltersBar()}
      <div class="dash-cards">
        <div class="dash-card">
          <div class="dc-label">Ukupno opreme</div>
          <div class="dc-num">${stats.total}</div>
          <div class="dc-sub">Prikazano u listi</div>
        </div>
        <div class="dash-card">
          <div class="dc-label">Status opreme</div>
          <div class="dc-status">
            <div><div class="dc-s-num" style="color:var(--green)">${stats.active}</div><div class="dc-s-lbl">U radu</div></div>
            <div style="width:1px;background:var(--border);margin:0 4px;"></div>
            <div><div class="dc-s-num" style="color:var(--blue)">${stats.neaktivan}</div><div class="dc-s-lbl">Neaktivni</div></div>
            <div style="width:1px;background:var(--border);margin:0 4px;"></div>
            <div><div class="dc-s-num" style="color:var(--red)">${stats.zastoj}</div><div class="dc-s-lbl">Zastoj</div></div>
          </div>
        </div>
        <div class="dash-card clickable" id="dashSrvCard">
          <div class="dc-label flex" style="justify-content:space-between">
            Servisni nalozi <span style="font-size:10px;color:var(--acc)">↗ Otvori listu</span>
          </div>
          <div class="dc-bar" style="margin-top:14px">
            <div class="dc-bar-seg" style="width:${pOpen}%;background:var(--acc)"></div>
            <div class="dc-bar-seg" style="width:${pInp}%;background:var(--orange)"></div>
            <div class="dc-bar-seg" style="width:${pCls}%;background:var(--green)"></div>
          </div>
          <div class="dc-legend">
            <div class="dc-leg-item"><div class="dc-leg-dot" style="background:var(--acc)"></div>${stats.soOpen} Otvoreni</div>
            <div class="dc-leg-item"><div class="dc-leg-dot" style="background:var(--orange)"></div>${stats.soInprog} U obradi</div>
            <div class="dc-leg-item"><div class="dc-leg-dot" style="background:var(--green)"></div>${stats.soClosed} Zatvoreni</div>
          </div>
        </div>
        <div class="dash-card">
          <div class="dc-label">Ukupno naloga</div>
          <div class="dc-num">${soTot}</div>
          <div class="dc-sub">${stats.soOpen} otvorenih · ${stats.soInprog} u obradi</div>
        </div>
      </div>
      <div class="eq-list-wrap">
        ${renderEquipTable()}
      </div>
    </div>`;

  document.getElementById('dashSrvCard')?.addEventListener('click', openAllSrvsModal);

  document.querySelectorAll('.status-pill-btn').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      const { eid, status, tid } = el.dataset;
      import('./dialogs/status.js').then(m =>
        m.openStatusDialog(parseInt(eid), status, parseInt(tid))
      );
    });
  });

  document.querySelectorAll('.eq-row').forEach(el => {
    el.addEventListener('click', () => {
      import('./app.js').then(m => m.goEquipment(parseInt(el.dataset.eid)));
    });
  });
}

function renderFiltersBar() {
  return `
    <div class="filters-bar">
      <span class="filter-label">Filter:</span>
      <select class="filter-sel" id="fType">
        <option value="">Svi tipovi opreme</option>
        ${state.types.map(t => `<option value="${t.id}" ${state.filterTypeId == t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}
      </select>
      <select class="filter-sel" id="fLoc">
        <option value="">Sve lokacije</option>
        ${state.locs.map(l => `<option value="${l.id}" ${state.filterLocId == l.id ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}
      </select>
      ${(state.filterTypeId || state.filterLocId) ? `<button class="filter-reset" id="fReset">✕ Poništi</button>` : ''}
      <span class="ml-auto" style="font-size:var(--fs-sm);color:var(--sec)">Prikazano: <strong>${state.allEq.length}</strong></span>
      ${can.admin() ? `<button class="tb-btn accent" id="btnAddEq">+ Dodaj opremu</button>` : ''}
    </div>`;
}

export function bindFilters() {
  document.getElementById('fType')?.addEventListener('change', async e => {
    state.filterTypeId = e.target.value;
    await reloadAndRender();
  });
  document.getElementById('fLoc')?.addEventListener('change', async e => {
    state.filterLocId = e.target.value;
    await reloadAndRender();
  });
  document.getElementById('fReset')?.addEventListener('click', async () => {
    state.filterTypeId = '';
    state.filterLocId  = '';
    await reloadAndRender();
  });
  document.getElementById('btnAddEq')?.addEventListener('click', () => {
    import('./dialogs/edit.js').then(m => m.openAddEqDialog());
  });
}

async function reloadAndRender() {
  const { loadEquipment } = await import('./app.js');
  await loadEquipment();
  const { renderSidebar } = await import('./sidebar.js');
  renderSidebar();
  renderDashboard();
  bindFilters();
}

function renderEquipTable() {
  if (!state.allEq.length)
    return '<div class="empty-state" style="margin-top:20px">Nema opreme. Promenite filtere ili dodajte novu opremu.</div>';
  return isCNGFilter() ? renderCNGTable() : renderDefaultTable();
}

function renderDefaultTable() {
  return `
    <table class="eq-tbl">
      <thead><tr>
        <th>Lokacija</th><th>Naziv</th><th>Tip opreme</th><th>Proizvođač</th>
        <th>Serijski broj</th><th>Godina</th><th>Status</th><th>Servisni nalozi</th>
      </tr></thead>
      <tbody>
        ${state.allEq.map(e => `
          <tr class="eq-row" data-eid="${e.id}">
            <td style="color:var(--sec)">${esc(e.location_name ?? '—')}</td>
            <td><span class="eq-name">${esc(e.name)}</span></td>
            <td><span class="eq-tag">${esc(e.type_name ?? '—')}</span></td>
            <td class="eq-mfr">${esc(e.manufacturer ?? '—')}</td>
            <td style="font-size:var(--fs-xs);color:var(--sec)">${esc(e.serial_number ?? '—')}</td>
            <td>${e.year ?? '—'}</td>
            <td>${statusPillHtml(e)}</td>
            <td>${soPillsHtml(e)}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function renderCNGTable() {
  return `
    <table class="eq-tbl">
      <thead><tr>
        <th>Lokacija</th><th>Naziv</th><th>Proizvođač</th><th>Tip kompresora</th>
        <th>Snaga (kW)</th><th>Stepen</th><th>Max kap. (Nm³/h)</th>
        <th>Ul. pritisak Min–Max (bar)</th><th>God.</th><th>Panel</th>
        <th>Radni sati</th><th>Sledeći servis</th><th>Status</th><th>Servisni nalozi</th>
      </tr></thead>
      <tbody>
        ${state.allEq.map(e => {
          const hrs    = parseFloat(e.radni_sati)       || 0;
          const ns     = parseFloat(e.next_service_val) || 0;
          const hrsCls = !ns       ? 'hrs-ok'
            : hrs >= ns            ? 'hrs-bad'
            : hrs >= ns * 0.85     ? 'hrs-warn'
            : 'hrs-ok';
          return `
          <tr class="eq-row" data-eid="${e.id}">
            <td style="color:var(--sec)">${esc(e.location_name ?? '—')}</td>
            <td><span class="eq-name">${esc(e.name)}</span></td>
            <td class="eq-mfr">${esc(e.manufacturer ?? '—')}</td>
            <td style="font-size:var(--fs-xs)">${esc(e.compressor_type ?? '—')}</td>
            <td>${esc(e.motor_power ?? '—')}</td>
            <td style="text-align:center">${e.max_stage ?? '—'}</td>
            <td>${esc(e.max_capacity ?? '—')}</td>
            <td style="white-space:nowrap">${esc(e.min_inlet_pressure ?? '—')} – ${esc(e.max_inlet_pressure ?? '—')}</td>
            <td>${e.year ?? '—'}</td>
            <td style="text-align:center;font-weight:700">${esc(e.priority_panel ?? '—')}</td>
            <td><span class="${hrsCls} num-fmt">${fmtNum(hrs)}</span></td>
            <td><span class="num-fmt ${ns && hrs >= ns ? 'hrs-bad' : ''}">${ns ? fmtNum(ns) : '—'}</span></td>
            <td>${statusPillHtml(e)}</td>
            <td>${soPillsHtml(e)}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

function statusPillHtml(e) {
  const cls      = statusPillCls(e.status);
  const clickable = can.changeStatus() && e.status !== 'Otpisan';
  return `<span class="pill ${cls}${clickable ? ' clickable status-pill-btn' : ''}"
    ${clickable ? `data-eid="${e.id}" data-status="${esc(e.status)}" data-tid="${e.equipment_type_id}"` : ''}
  >${esc(e.status)}</span>`;
}

function soPillsHtml(e) {
  let h = '';
  if (e.so_open   > 0) h += `<span class="pill pill-so-open" style="margin-right:3px">${e.so_open} Otv.</span>`;
  if (e.so_inprog > 0) h += `<span class="pill pill-so-inprog">${e.so_inprog} U obradi</span>`;
  return h || `<span style="color:var(--dim);font-size:var(--fs-xs)">—</span>`;
}

function computeStats(eqs) {
  return {
    total:     eqs.length,
    active:    eqs.filter(e => e.status === 'U radu').length,
    zastoj:    eqs.filter(e => e.status === 'Zastoj').length,
    neaktivan: eqs.filter(e => e.status === 'Neaktivan').length,
    soOpen:    eqs.reduce((s, e) => s + (e.so_open   ?? 0), 0),
    soInprog:  eqs.reduce((s, e) => s + (e.so_inprog ?? 0), 0),
    soClosed:  eqs.reduce((s, e) => s + (e.so_closed ?? 0), 0),
  };
}

// ─── ALL SERVICE ORDERS MODAL ─────────────────────────────────────────────────
async function openAllSrvsModal() {
  const params = {};
  if (state.filterTypeId) params.typeId     = state.filterTypeId;
  if (state.filterLocId)  params.locationId = state.filterLocId;
  const r = await api.srvAll(params);
  if (!r) return;
  state.allSrvs = r;

  const parts = [];
  if (state.filterTypeId) { const t = state.types.find(x => x.id == state.filterTypeId); if (t) parts.push(t.name); }
  if (state.filterLocId)  { const l = state.locs.find(x  => x.id == state.filterLocId);  if (l) parts.push(l.name); }
  document.getElementById('bigAllSrvTitle').textContent =
    'Servisni nalozi' + (parts.length ? ' – ' + parts.join(', ') : '');

  renderAllSrvsTable();
  openBig('bigAllSrv');
}

export function renderAllSrvsTable() {
  const { field: f, asc } = state.allSrvSort;
  const sorted = [...state.allSrvs].sort((a, b) => {
    const va = a[f] ?? '', vb = b[f] ?? '';
    if (typeof va === 'number') return asc ? va - vb : vb - va;
    return asc ? String(va).localeCompare(vb, 'sr') : String(vb).localeCompare(va, 'sr');
  });
  const cols = [
    { k: 'location_name', l: 'Lokacija'   },
    { k: 'eq_name',       l: 'Oprema'     },
    { k: 'date',          l: 'Datum'      },
    { k: 'order_number',  l: 'Br. naloga' },
    { k: 'operator_name', l: 'Operater'   },
    { k: 'service_note',  l: 'Opis'       },
    { k: 'status',        l: 'Status'     },
    { k: 'technician',    l: 'Tehničar'   },
    { k: 'ticket_url',    l: 'Ticket'     },
  ];
  const thHtml = cols.map(c => {
    const cls = f === c.k ? (asc ? 'sort-th asc' : 'sort-th desc') : 'sort-th';
    return `<th class="${cls}" data-col="${c.k}">${c.l}</th>`;
  }).join('');

  document.getElementById('bigAllSrvBody').innerHTML = `
    <table class="mini-tbl">
      <thead><tr>${thHtml}</tr></thead>
      <tbody>
        ${sorted.length
          ? sorted.map(s => `
            <tr class="${can.editSrv() ? 'clickable' : ''}" data-srvid="${s.id}" data-eqid="${s.equipment_id}">
              <td style="color:var(--sec)">${esc(s.location_name ?? '—')}</td>
              <td style="font-weight:600">${esc(s.eq_name ?? '—')}</td>
              <td class="ts">${s.date ?? '—'}</td>
              <td class="srv-num">${esc(s.order_number)}</td>
              <td>${esc(s.operator_name ?? '—')}</td>
              <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.service_note ?? '—')}</td>
              <td><span class="pill ${soPillCls(s.status)}">${esc(s.status)}</span></td>
              <td>${esc(s.technician ?? '—')}</td>
              <td>${s.ticket_url ? `<a class="ticket-link" href="${esc(s.ticket_url)}" target="_blank">🔗 Link</a>` : '—'}</td>
            </tr>`).join('')
          : '<tr><td colspan="9" class="empty-state">Nema servisnih naloga.</td></tr>'}
      </tbody>
    </table>`;

  document.querySelectorAll('#bigAllSrvBody .sort-th').forEach(el => {
    el.addEventListener('click', () => {
      const col = el.dataset.col;
      if (state.allSrvSort.field === col) state.allSrvSort.asc = !state.allSrvSort.asc;
      else { state.allSrvSort.field = col; state.allSrvSort.asc = true; }
      renderAllSrvsTable();
    });
  });

  if (can.editSrv()) {
    document.querySelectorAll('#bigAllSrvBody tr.clickable').forEach(el => {
      el.addEventListener('click', () => {
        import('./dialogs/service-order.js').then(m => {
          state.equipId  = parseInt(el.dataset.eqid);
          state.services = state.allSrvs.filter(s => s.equipment_id === state.equipId);
          const srvId    = parseInt(el.dataset.srvid);
          if (state.services.find(s => s.id === srvId)) m.openEditSrvDialog(srvId);
        });
      });
    });
  }
}
