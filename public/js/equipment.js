// public/js/equipment.js – Orkestrira prikaz detalja opreme

import { state, can, getEquipCfg, isEquipFrozen } from './state.js';
import { esc, showToast, fmtNum, fmtDate, fmtCtrlVal, soPillCls, tagCls, statusPillCls } from './utils.js';
import { api } from './api.js';
import { renderSidebar } from './sidebar.js';

export async function loadEquipmentDetail(id) {
  const [eq, logs, srvs] = await Promise.all([
    api.equipOne(id),
    api.logs(id, 500),
    api.srvForEq(id),
  ]);
  if (!eq) return;
  state.detail   = eq;
  state.logs     = logs  ?? [];
  state.services = srvs  ?? [];
  renderEquipmentView();
}

export function renderEquipmentView() {
  const eq  = state.detail;
  const cfg = getEquipCfg(eq.type_name ?? '');

  document.getElementById('content').innerHTML = `
    <div class="eq-view">
      ${renderBreadcrumb(eq, cfg)}
      <div id="eqBody" style="flex:1;display:flex;flex-direction:column;overflow:hidden;">
        ${renderEquipBody(eq, cfg)}
      </div>
    </div>`;

  bindEquipmentEvents();
}

// ─── BREADCRUMB ───────────────────────────────────────────────────────────────
function renderBreadcrumb(eq, cfg) {
  const frozen = isEquipFrozen(eq);
  const ctrl   = overallCtrlStatus(eq);
  const ctrlCls = { ok: 'pill-ok', warn: 'pill-warn', bad: 'pill-bad' };
  const ctrlLbl = { ok: 'Ispravno', warn: 'Proveriti uskoro', bad: 'Kasni servis!' };

  return `
    <div class="bc-bar">
      <div class="bc">
        <span class="bc-link" id="bcHome">Pregled opreme</span>
        <span class="bc-sep">›</span>
        <span>${esc(eq.location_name ?? '—')}</span>
        <span class="bc-sep">›</span>
        <span>${esc(eq.type_name ?? '—')}</span>
        <span class="bc-sep">›</span>
        <span class="bc-cur">${esc(eq.name)}</span>
      </div>
      <div class="bc-right">
        ${ctrl !== 'none' ? `<span class="pill ${ctrlCls[ctrl]}">${ctrlLbl[ctrl]}</span>` : ''}
        ${can.admin() ? `<button class="tb-btn danger" id="btnDelEq">🗑 Obriši</button>` : ''}
      </div>
    </div>`;
}

function overallCtrlStatus(eq) {
  if (!eq.controls?.length) return 'none';
  if (eq.controls.some(c => c.status === 'kasni'))  return 'bad';
  if (eq.controls.some(c => c.status === 'uskoro')) return 'warn';
  return 'ok';
}

// ─── BODY ROUTING PO LAYOUTU ─────────────────────────────────────────────────
function renderEquipBody(eq, cfg) {
  const layout = cfg.layout ?? 'standard';
  if (layout === 'cng')      return renderCNGBody(eq, cfg);
  if (layout === 'rezervni') return renderStdBody(eq, cfg); // rezervni = standard bez counters/controls
  return renderStdBody(eq, cfg);
}

// ─── CNG LAYOUT ───────────────────────────────────────────────────────────────
function renderCNGBody(eq, cfg) {
  const frozen = isEquipFrozen(eq);
  const opH    = parseFloat(eq.counters?.find(c => c.name === 'Radni sati')?.value) || 0;
  const fields = cfg.basicInfoFields ?? [];
  const mid    = Math.ceil(fields.length / 2);

  return `
    <!-- TOP: info + controls -->
    <div class="cng-top">
      <!-- Osnovne informacije -->
      <div class="panel-fixed">
        <div class="panel-title">
          Osnovne informacije
          ${statusPillBtn(eq)}
        </div>
        <div class="info-2col">
          <table class="info-col">${fields.slice(0, mid).map(f => infoRow(eq, f)).join('')}</table>
          <table class="info-col">${fields.slice(mid).map(f => infoRow(eq, f)).join('')}</table>
        </div>
        ${can.manage() && !frozen.all ? `<button class="panel-btn prim" id="btnEditEq" style="margin-top:10px">✏ Izmeni podatke</button>` : ''}
      </div>
      <!-- Status kontrola -->
      <div class="panel-fixed" style="overflow-y:auto">
        <div class="panel-title">Status kontrola</div>
        <table class="ctrl-tbl">
          <thead><tr><th>Kontrola</th><th>Interval</th><th>Poslednja</th><th>Sledeća</th><th></th></tr></thead>
          <tbody>
            ${(eq.controls ?? []).map(c => ctrlRow(c, opH, frozen.controls)).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <!-- BROJAČI (horizontalni red) -->
    <div class="cng-counters-bar">
      <div class="panel-title" style="margin-bottom:8px">Brojači</div>
      <div class="cng-ctr-grid">
        ${(cfg.counters ?? []).map(c => ctrCard(eq, c, frozen.counters)).join('')}
      </div>
    </div>
    ${renderLowerPanels(eq, cfg, frozen)}`;
}

// ─── STANDARD / REZERVNI LAYOUT ──────────────────────────────────────────────
function renderStdBody(eq, cfg) {
  const frozen   = isEquipFrozen(eq);
  const panels   = cfg.panels ?? [];
  const opH      = parseFloat(eq.counters?.find(c => c.name === 'Radni sati')?.value) || 0;
  const hasCntrs = panels.includes('counters') && (cfg.counters?.length ?? 0) > 0;
  const hasCtrls = panels.includes('controls') && (cfg.controls?.length ?? 0) > 0;
  const cols     = 1 + (hasCntrs ? 1 : 0) + (hasCtrls ? 1 : 0);

  return `
    <div class="std-top" style="grid-template-columns:repeat(${cols},1fr)">
      <!-- Osnovne informacije -->
      <div class="panel">
        <div class="panel-title">Osnovne informacije ${statusPillBtn(eq)}</div>
        <table class="info-tbl">
          ${(cfg.basicInfoFields ?? []).map(f => infoRow(eq, f)).join('')}
        </table>
        ${can.manage() && !frozen.all ? `<button class="panel-btn prim" id="btnEditEq">✏ Izmeni podatke</button>` : ''}
      </div>
      ${hasCntrs ? `
      <!-- Brojači -->
      <div class="panel">
        <div class="panel-title">Brojači</div>
        <table class="ctrl-tbl">
          <thead><tr><th>Naziv</th><th>Vrednost</th><th></th></tr></thead>
          <tbody>
            ${(cfg.counters ?? []).map(c => {
              if (c.type === 'computed')
                return `<tr><td style="color:var(--sec)">${esc(c.name)}</td><td><span class="val-big">${eq.vreme_upotrebe ?? '—'}</span></td><td></td></tr>`;
              const dbC = eq.counters?.find(x => x.name === c.name);
              const v   = parseFloat(dbC?.value) || 0;
              return `<tr>
                <td style="color:var(--sec)">${esc(c.name)}</td>
                <td><span class="val-big num-fmt">${fmtNum(v, c.type === 'integer')}</span> <span style="color:var(--dim);font-size:var(--fs-xs)">${c.unit ?? ''}</span></td>
                <td>${dbC && !frozen.counters ? `<button class="upd-btn ctr-unos-btn" data-cid="${dbC.id}" data-name="${esc(c.name)}" data-val="${v}" data-unit="${c.unit ?? ''}">Un.</button>` : ''}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>` : ''}
      ${hasCtrls ? `
      <!-- Status kontrola -->
      <div class="panel" style="overflow-y:auto">
        <div class="panel-title">Status kontrola</div>
        <table class="ctrl-tbl">
          <thead><tr><th>Kontrola</th><th>Interval</th><th>Sledeća</th><th></th></tr></thead>
          <tbody>
            ${(eq.controls ?? []).map(c => ctrlRowShort(c, parseFloat(eq.counters?.find(x => x.name === 'Radni sati')?.value) || 0, frozen.controls)).join('')}
          </tbody>
        </table>
      </div>` : ''}
    </div>
    ${renderLowerPanels(eq, cfg, frozen)}`;
}

// ─── LOWER PANELS (Logs + Servisni nalozi) ───────────────────────────────────
function renderLowerPanels(eq, cfg, frozen) {
  const panels  = cfg.panels ?? [];
  const showLog = panels.includes('logs');
  const showSrv = panels.includes('serviceOrders');
  if (!showLog && !showSrv) return '';

  const logs20 = state.logs.slice(0, 20);
  const srvs20 = state.services.slice(0, 20);

  return `
    <div class="lower-panels ${!(showLog && showSrv) ? 'one' : ''}">
      ${showLog ? `
      <div class="lpanel">
        <div class="lp-hdr">
          <span class="lp-title">Dnevnik rada</span>
          <div class="lp-actions">
            <button class="lp-btn" id="btnLogsCSV">CSV</button>
            <button class="lp-btn" id="btnLogsExpand">⛶ Proširi</button>
          </div>
        </div>
        <div class="lp-body">${renderLogRows(logs20, state.logs.length)}</div>
      </div>` : ''}
      ${showSrv ? `
      <div class="lpanel">
        <div class="lp-hdr">
          <span class="lp-title">Servisni nalozi</span>
          <div class="lp-actions">
            ${can.createSrv() && !frozen.all ? `<button class="lp-btn acc" id="btnNewSrv">+ Novi nalog</button>` : ''}
            <button class="lp-btn" id="btnSrvExpand">⛶ Proširi</button>
          </div>
        </div>
        <div class="lp-body">${renderSrvRows(srvs20, state.services.length)}</div>
      </div>` : ''}
    </div>`;
}

// ─── ROW RENDERERS ────────────────────────────────────────────────────────────
function renderLogRows(logs, total) {
  if (!logs.length) return '<div class="empty-state">Nema zapisa u dnevniku.</div>';
  return `
    <table class="mini-tbl">
      <thead><tr>
        <th>Datum/Vreme</th><th>Rad. sati</th><th>Operater</th>
        <th>Tip</th><th>Akcija</th><th>Vrednost</th><th>Status</th>
      </tr></thead>
      <tbody>
        ${logs.map(l => `<tr>
          <td class="ts">${fmtDate(l.created_at)}</td>
          <td class="num-fmt" style="font-weight:600">${fmtNum(l.operating_hours)}</td>
          <td>${esc(l.operator_name ?? '—')}</td>
          <td><span class="tag ${tagCls(l.action_type)}">${esc(l.action_type ?? '—')}</span></td>
          <td>${esc(l.action_name ?? '—')}</td>
          <td style="font-weight:600">${esc(l.value ?? '—')}</td>
          <td class="${l.confirmation === 'OK' ? 'conf-ok' : 'conf-nok'}">${l.confirmation ?? '—'}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    ${total > logs.length ? `<div style="padding:6px 8px;font-size:var(--fs-xs);color:var(--sec);border-top:1px solid var(--border)">Prikazano poslednjih ${logs.length} od ${total}. ⛶ za ceo dnevnik.</div>` : ''}`;
}

function renderSrvRows(srvs, total) {
  if (!srvs.length) return '<div class="empty-state">Nema servisnih naloga.</div>';
  return `
    <table class="mini-tbl">
      <thead><tr>
        <th>Datum</th><th>Br. naloga</th><th>Rad. sati</th>
        <th>Opis</th><th>Status</th><th>Tehničar</th><th>Ticket</th>
      </tr></thead>
      <tbody>
        ${srvs.map(s => `<tr class="${can.editSrv() ? 'clickable srv-row' : ''}" data-srvid="${s.id}">
          <td class="ts">${s.date ?? '—'}</td>
          <td class="srv-num">${esc(s.order_number)}</td>
          <td class="num-fmt">${fmtNum(s.operating_hours)}</td>
          <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.service_note ?? '—')}</td>
          <td><span class="pill ${soPillCls(s.status)}">${esc(s.status)}</span></td>
          <td>${esc(s.technician ?? '—')}</td>
          <td>${s.ticket_url ? `<a class="ticket-link" href="${esc(s.ticket_url)}" target="_blank">🔗</a>` : '—'}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    ${total > srvs.length ? `<div style="padding:6px 8px;font-size:var(--fs-xs);color:var(--sec);border-top:1px solid var(--border)">Prikazano poslednjih ${srvs.length} od ${total}. ⛶ za sve.</div>` : ''}`;
}

// ─── COMPONENT HELPERS ────────────────────────────────────────────────────────
function statusPillBtn(eq) {
  const cls = statusPillCls(eq.status);
  const clickable = can.changeStatus() && eq.status !== 'Otpisan';
  return `<span class="pill ${cls}${clickable ? ' clickable' : ''}" id="eqStatusPill">${esc(eq.status)}</span>`;
}

function infoRow(eq, f) {
  let val;
  if (f.key === 'location')            val = eq.location_name;
  else if (f.key === 'equipment_type_name') val = eq.type_name;
  else                                  val = eq[f.key];
  const display = (val !== null && val !== undefined && val !== '')
    ? `<strong>${esc(String(val))}</strong>`
    : `<span style="color:var(--dim)">—</span>`;
  return `<tr><td>${esc(f.label)}</td><td>${display}</td></tr>`;
}

function ctrlRow(c, opH, frozen) {
  const st = c.status ?? 'none';
  return `<tr class="${st === 'kasni' ? 'row-kasni' : st === 'uskoro' ? 'row-uskoro' : ''}">
    <td style="color:var(--sec);font-size:var(--fs-xs)">${esc(c.name)}</td>
    <td style="color:var(--dim);font-size:var(--fs-xs);white-space:nowrap">${c.interval_value} ${c.interval_unit}</td>
    <td style="font-size:var(--fs-xs)">${fmtCtrlVal(c, 'last')}</td>
    <td class="ctrl-next ${st}">${fmtCtrlVal(c, 'next')}</td>
    <td><button class="upd-btn ctrl-unos-btn ${st === 'kasni' ? 'kasni' : ''}"
      data-cid="${c.id}" data-name="${esc(c.name)}" data-oph="${opH}" data-unit="${c.interval_unit}"
      ${frozen ? 'disabled' : ''}>${st === 'kasni' ? '⚠ ' : ''}Unos</button></td>
  </tr>`;
}

function ctrlRowShort(c, opH, frozen) {
  const st = c.status ?? 'none';
  return `<tr class="${st === 'kasni' ? 'row-kasni' : st === 'uskoro' ? 'row-uskoro' : ''}">
    <td style="color:var(--sec);font-size:var(--fs-xs)">${esc(c.name)}</td>
    <td style="color:var(--dim);font-size:var(--fs-xs)">${c.interval_value} ${c.interval_unit}</td>
    <td class="ctrl-next ${st}">${fmtCtrlVal(c, 'next')}</td>
    <td><button class="upd-btn ctrl-unos-btn ${st === 'kasni' ? 'kasni' : ''}"
      data-cid="${c.id}" data-name="${esc(c.name)}" data-oph="${opH}" data-unit="${c.interval_unit}"
      ${frozen ? 'disabled' : ''}>Unos</button></td>
  </tr>`;
}

function ctrCard(eq, c, frozen) {
  let val = '—', unit = c.unit ?? '';
  if (c.type === 'computed') {
    val  = eq.vreme_upotrebe ?? '—'; unit = '';
  } else {
    const dbC = eq.counters?.find(x => x.name === c.name);
    val  = dbC ? fmtNum(parseFloat(dbC.value) || 0, c.type === 'integer') : '0';
    unit = c.unit ?? '';
  }
  const dbC   = eq.counters?.find(x => x.name === c.name);
  const canIn = c.type !== 'computed' && dbC && !frozen;
  return `
    <div class="cng-ctr-item">
      <div class="cng-ctr-label">${esc(c.name)}</div>
      <div class="cng-ctr-val num-fmt">${val}</div>
      <div class="cng-ctr-unit">${unit}</div>
      ${canIn ? `<button class="upd-btn ctr-unos-btn" style="margin-top:5px"
        data-cid="${dbC.id}" data-name="${esc(c.name)}" data-val="${dbC.value}" data-unit="${unit}">Unos</button>` : ''}
    </div>`;
}

// ─── EVENT BINDING ────────────────────────────────────────────────────────────
export function bindEquipmentEvents() {
  const eq = state.detail;

  // Breadcrumb home
  document.getElementById('bcHome')?.addEventListener('click', () => {
    import('./app.js').then(m => m.goDashboard());
  });

  // Obriši
  document.getElementById('btnDelEq')?.addEventListener('click', async () => {
    if (!confirm(`Obrisati "${eq.name}"?\nOva akcija briše i sve logove i servisne naloge!`)) return;
    const r = await api.equipDelete(eq.id);
    if (!r) return;
    showToast('Oprema obrisana.', 'ok');
    import('./app.js').then(m => { m.loadEquipment(); m.goDashboard(); });
  });

  // Izmeni
  document.getElementById('btnEditEq')?.addEventListener('click', () => {
    import('./dialogs/edit.js').then(m => m.openEditEqDialog());
  });

  // Status pill
  document.getElementById('eqStatusPill')?.addEventListener('click', () => {
    if (!can.changeStatus() || eq.status === 'Otpisan') return;
    import('./dialogs/status.js').then(m => m.openStatusDialog(eq.id, eq.status, eq.equipment_type_id));
  });

  // Counters
  document.querySelectorAll('.ctr-unos-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      import('./dialogs/counter.js').then(m =>
        m.openCounterDialog(parseInt(btn.dataset.cid), btn.dataset.name, btn.dataset.val, btn.dataset.unit)
      );
    });
  });

  // Controls
  document.querySelectorAll('.ctrl-unos-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      import('./dialogs/control.js').then(m =>
        m.openControlDialog(parseInt(btn.dataset.cid), btn.dataset.name, parseFloat(btn.dataset.oph) || 0, btn.dataset.unit)
      );
    });
  });

  // Service order redovi
  if (can.editSrv()) {
    document.querySelectorAll('.srv-row').forEach(row => {
      row.addEventListener('click', () => {
        import('./dialogs/service-order.js').then(m => m.openEditSrvDialog(parseInt(row.dataset.srvid)));
      });
    });
  }

  // Novi nalog
  document.getElementById('btnNewSrv')?.addEventListener('click', () => {
    import('./dialogs/service-order.js').then(m => m.openNewSrvDialog());
  });

  // Prošireni prikazi
  document.getElementById('btnLogsExpand')?.addEventListener('click', () => {
    import('./modals.js').then(m => m.openLogsModal());
  });
  document.getElementById('btnSrvExpand')?.addEventListener('click', () => {
    import('./modals.js').then(m => m.openSrvModal());
  });
  document.getElementById('btnLogsCSV')?.addEventListener('click', () => {
    import('./modals.js').then(m => m.exportLogsCSV());
  });
}

// ─── REFRESH (poziva se iz dijaloga nakon promene) ────────────────────────────
export async function refreshDetail() {
  await loadEquipmentDetail(state.equipId);
  const { loadEquipment } = await import('./app.js');
  await loadEquipment();
  renderSidebar();
  // Otpisana badge
  if (can.viewOtpisana()) {
    const { refreshOtpisanaBadge } = await import('./otpisana.js');
    refreshOtpisanaBadge();
  }
}
