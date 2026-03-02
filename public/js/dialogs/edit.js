// public/js/dialogs/edit.js – Izmena i dodavanje opreme
import { state, getEquipCfg } from '../state.js';
import { api } from '../api.js';
import { showToast, openDlg, closeDlg, esc, todayStr } from '../utils.js';

// ── DODAJ NOVU OPREMU ─────────────────────────────────────────────────────────
export function openAddEqDialog() {
  fillTypeLocSelects('aType', 'aLoc');
  fillAddStatusOptions('aStatus');
  document.getElementById('aN').value       = '';
  document.getElementById('aMfr').value     = '';
  document.getElementById('aSer').value     = '';
  document.getElementById('aAsset').value   = '';
  document.getElementById('aYear').value    = '';
  document.getElementById('aPurchase').value = '';
  openDlg('dlgAddEq');
  setTimeout(() => document.getElementById('aN')?.focus(), 120);
}

export async function submitAddEq() {
  const name = document.getElementById('aN').value.trim();
  if (!name) { showToast('Naziv je obavezan.', 'err'); return; }

  const r = await api.equipCreate({
    name,
    equipment_type_id: document.getElementById('aType').value    || null,
    location_id:       document.getElementById('aLoc').value     || null,
    manufacturer:      document.getElementById('aMfr').value     || null,
    serial_number:     document.getElementById('aSer').value     || null,
    asset_number:      document.getElementById('aAsset').value   || null,
    year:              document.getElementById('aYear').value     || null,
    purchase_date:     document.getElementById('aPurchase').value || null,
    status:            document.getElementById('aStatus').value,
  });
  if (!r) return;
  closeDlg('dlgAddEq');
  showToast(`Oprema "${name}" uspešno dodana.`, 'ok');
  // goDashboard osvezava listu, sidebar I poziva bindFilters
  import('../app.js').then(m => m.goDashboard());
}

// ── IZMENI POSTOJEĆU OPREMU ───────────────────────────────────────────────────
export function openEditEqDialog() {
  const eq = state.detail;
  if (!eq) return;
  const cfg = getEquipCfg(eq.type_name ?? '');
  buildEditForm(eq, cfg);
  openDlg('dlgEdit');
}

function buildEditForm(eq, cfg) {
  const body = document.getElementById('dlgEditBody');
  if (!body) return;

  const fields  = cfg.basicInfoFields ?? [];
  const rows    = [];
  let   pending = null;

  for (const f of fields) {
    if (f.key === 'equipment_type_name') continue; // readonly – tip se ne menja ovde

    const input = buildFieldInput(f, eq);
    if (!input) continue;

    if (!pending) {
      pending = input;
    } else {
      rows.push(`<div class="frow">${pending}${input}</div>`);
      pending = null;
    }
  }
  if (pending) rows.push(pending);

  body.innerHTML = rows.join('') || '<p style="color:var(--dim);padding:8px 0">Nema polja za izmenu.</p>';
}

function buildFieldInput(f, eq) {
  const rawVal = f.key === 'location' ? (eq.location_id ?? '') : (eq[f.key] ?? '');

  switch (f.type) {
    case 'readonly': return null;
    case 'location':
      return `<div class="field"><label>${esc(f.label)}</label>
        <select id="ef_${f.key}">
          <option value="">—</option>
          ${state.locs.map(l => `<option value="${l.id}"${l.id == rawVal ? ' selected' : ''}>${esc(l.name)}</option>`).join('')}
        </select></div>`;
    case 'year':
      return `<div class="field"><label>${esc(f.label)}</label>
        <input type="number" id="ef_${f.key}" min="1900" max="2100" value="${esc(String(rawVal))}"></div>`;
    case 'date':
      return `<div class="field"><label>${esc(f.label)}</label>
        <input type="date" id="ef_${f.key}" value="${esc(String(rawVal))}"></div>`;
    case 'number':
      return `<div class="field"><label>${esc(f.label)}</label>
        <input type="number" id="ef_${f.key}" value="${esc(String(rawVal))}"></div>`;
    case 'textarea':
      return `<div class="field"><label>${esc(f.label)}</label>
        <textarea id="ef_${f.key}" rows="2">${esc(String(rawVal))}</textarea></div>`;
    default:
      return `<div class="field"><label>${esc(f.label)}</label>
        <input type="text" id="ef_${f.key}" value="${esc(String(rawVal))}"></div>`;
  }
}

export async function submitEdit() {
  const eq  = state.detail;
  const cfg = getEquipCfg(eq.type_name ?? '');

  const body = { name: document.getElementById('ef_name')?.value?.trim() };
  if (!body.name) { showToast('Naziv je obavezan.', 'err'); return; }

  (cfg.basicInfoFields ?? []).forEach(f => {
    if (f.key === 'equipment_type_name' || f.key === 'location') return;
    const el = document.getElementById(`ef_${f.key}`);
    if (el) body[f.key] = el.value || null;
  });

  const locEl = document.getElementById('ef_location');
  if (locEl) body.location_id = locEl.value || null;

  body.equipment_type_id = eq.equipment_type_id;

  const r = await api.equipUpdate(eq.id, body);
  if (!r) return;
  closeDlg('dlgEdit');
  showToast('Podaci sačuvani.', 'ok');
  import('../equipment.js').then(m => m.refreshDetail());
}

// ── Pomoćne ───────────────────────────────────────────────────────────────────
function fillTypeLocSelects(typeSelId, locSelId) {
  const tSel = document.getElementById(typeSelId);
  const lSel = document.getElementById(locSelId);
  if (tSel) tSel.innerHTML = `<option value="">— Odaberi tip —</option>` +
    state.types.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('');
  if (lSel) lSel.innerHTML = `<option value="">— Odaberi lokaciju —</option>` +
    state.locs.map(l => `<option value="${l.id}">${esc(l.name)}</option>`).join('');
}

function fillAddStatusOptions(selId) {
  const sel = document.getElementById(selId);
  if (!sel) return;
  sel.innerHTML = [
    { v: 'U radu',    l: 'U radu'    },
    { v: 'Neaktivan', l: 'Neaktivan' },
  ].map(o => `<option value="${o.v}">${o.l}</option>`).join('');
}
