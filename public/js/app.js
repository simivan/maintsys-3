// public/js/app.js – Glavni orkestrater aplikacije
// Odgovoran za: inicijalizaciju, navigaciju i učitavanje podataka

import { state, can } from './state.js';
import { api }        from './api.js';
import { esc, showToast } from './utils.js';
import { renderSidebar, updateOtpisanaBadge } from './sidebar.js';
import { renderDashboard, bindFilters }       from './dashboard.js';

// ─── START ────────────────────────────────────────────────────────────────────
export async function startApp() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('app').style.display       = 'flex';

  // Topbar korisnik
  const roleNames = { admin: 'Administrator', menadzer: 'Menadžer', operater: 'Operater', gost: 'Gost' };
  document.getElementById('tbUser').innerHTML = `
    <div class="user-avatar">${(state.user?.full_name ?? '?').charAt(0).toUpperCase()}</div>
    <div>
      <div class="user-name">${esc(state.user?.full_name ?? '')}</div>
      <div class="user-role">${roleNames[state.user?.role] ?? state.user?.role}</div>
    </div>`;

  // Admin dugme
  document.getElementById('tbAdminBtn').style.display = can.admin() ? 'block' : 'none';

  // Verzija
  const vr = await api.version();
  if (vr) document.getElementById('tbVer').textContent = 'Verzija ' + vr.version;

  // Učitaj reference podatke
  await loadRefData();

  // Učitaj listu opreme
  await loadEquipment();

  // Prikaži sidebar i dashboard
  renderSidebar();
  renderDashboard();
  bindFilters();

  // Otpisana badge (za menadžera i admina)
  if (can.viewOtpisana()) {
    document.getElementById('sbOtpisana').style.display = 'block';
    refreshOtpisanaBadge();
  }
}

// ─── REFERENCE DATA ───────────────────────────────────────────────────────────
export async function loadRefData() {
  const [t, l, cfg] = await Promise.all([
    api.types(),
    api.locations(),
    api.configs(),
  ]);
  if (t)   state.types   = t;
  if (l)   state.locs    = l;
  if (cfg) state.configs = cfg;
}

// ─── EQUIPMENT LIST ───────────────────────────────────────────────────────────
export async function loadEquipment() {
  const params = {};
  if (state.filterTypeId) params.typeId     = state.filterTypeId;
  if (state.filterLocId)  params.locationId = state.filterLocId;
  const r = await api.equipList(params);
  if (r) state.allEq = r;
}

// ─── NAVIGATION ──────────────────────────────────────────────────────────────
export async function goDashboard() {
  state.view    = 'dashboard';
  state.equipId = null;
  await loadEquipment();
  renderSidebar();
  renderDashboard();
  bindFilters();
}

export async function goEquipment(id) {
  state.view    = 'equipment';
  state.equipId = id;
  renderSidebar();
  const { loadEquipmentDetail } = await import('./equipment.js');
  await loadEquipmentDetail(id);
}

export async function goAdmin() {
  state.view    = 'admin';
  state.equipId = null;
  state.users   = await api.users() ?? [];
  const { renderAdmin } = await import('./admin.js');
  renderAdmin();
}

export async function goOtpisana() {
  state.view    = 'otpisana';
  state.equipId = null;
  renderSidebar();
  const { loadOtpisanaView } = await import('./otpisana.js');
  await loadOtpisanaView();
}

async function refreshOtpisanaBadge() {
  const { refreshOtpisanaBadge: fn } = await import('./otpisana.js');
  fn();
}

// ─── TOPBAR BUTTONS (globalni event listeneri, postavljaju se jednom) ─────────
export function bindTopbarEvents() {
  document.getElementById('btnLogout')?.addEventListener('click', async () => {
    const { performLogout } = await import('./auth.js');
    await performLogout(true);
  });
  document.getElementById('btnAdmin')?.addEventListener('click', goAdmin);
  document.getElementById('sbSearch')?.addEventListener('input', renderSidebar);
}
