// public/js/admin.js – Admin panel (korisnici, lokacije, tipovi opreme)
import { state } from './state.js';
import { api } from './api.js';
import { esc, showToast, openDlg, closeDlg } from './utils.js';

// ─── RENDER ───────────────────────────────────────────────────────────────────
export function renderAdmin() {
  document.getElementById('content').innerHTML = `
    <div class="admin-view">
      <div class="bc-bar">
        <div class="bc">
          <span class="bc-link" id="bcAdminHome">Pregled opreme</span>
          <span class="bc-sep">›</span>
          <span class="bc-cur">⚙ Admin panel</span>
        </div>
      </div>
      <div class="admin-tabs">
        <div class="a-tab ${state.adminTab === 'users'     ? 'active' : ''}" data-tab="users">👥 Korisnici</div>
        <div class="a-tab ${state.adminTab === 'locations' ? 'active' : ''}" data-tab="locations">📍 Lokacije</div>
        <div class="a-tab ${state.adminTab === 'types'     ? 'active' : ''}" data-tab="types">🏷 Tipovi opreme</div>
      </div>
      <div class="admin-body" id="adminBody">
        ${renderTabContent()}
      </div>
    </div>`;

  document.getElementById('bcAdminHome')?.addEventListener('click', () => {
    import('./app.js').then(m => m.goDashboard());
  });
  document.querySelectorAll('.a-tab').forEach(tab => {
    tab.addEventListener('click', async () => {
      state.adminTab = tab.dataset.tab;
      await loadAdminTab(state.adminTab);
      renderAdmin();
    });
  });
  bindAdminActions();
}

function renderTabContent() {
  if (state.adminTab === 'users')     return renderUsersTab();
  if (state.adminTab === 'locations') return renderLocationsTab();
  if (state.adminTab === 'types')     return renderTypesTab();
  return '';
}

async function loadAdminTab(tab) {
  if (tab === 'users')                   { state.users = await api.users()     ?? []; }
  if (tab === 'locations' || tab === 'types') {
    const [t, l] = await Promise.all([api.types(), api.locations()]);
    if (t) state.types = t;
    if (l) state.locs  = l;
  }
}

// ─── USERS TAB ────────────────────────────────────────────────────────────────
function renderUsersTab() {
  const roleLabel = { admin: 'Administrator', menadzer: 'Menadžer', operater: 'Operater', gost: 'Gost' };
  const roleCls   = { admin: 'rb-admin', menadzer: 'rb-menadzer', operater: 'rb-operater', gost: 'rb-gost' };
  return `
    <div class="admin-sec">
      <div class="admin-sec-hdr">
        <h3>Korisnici sistema</h3>
        <button class="ra-btn acc" id="btnAddUser">+ Dodaj korisnika</button>
      </div>
      <table class="adm-tbl">
        <thead><tr><th>Kor. ime</th><th>Puno ime</th><th>Uloga</th><th>Status</th><th>Kreiran</th><th>Akcije</th></tr></thead>
        <tbody>
          ${state.users.length
            ? state.users.map(u => `
              <tr>
                <td style="font-weight:600;font-family:monospace">${esc(u.username)}</td>
                <td>${esc(u.full_name)}</td>
                <td><span class="role-badge ${roleCls[u.role] ?? ''}">${roleLabel[u.role] ?? u.role}</span></td>
                <td>${u.active
                  ? '<span class="pill pill-ok" style="font-size:11px">Aktivan</span>'
                  : '<span class="pill pill-off" style="font-size:11px">Deaktiviran</span>'}</td>
                <td class="ts">${(u.created_at ?? '').substring(0, 10)}</td>
                <td><div class="row-actions">
                  <button class="ra-btn user-edit-btn" data-uid="${u.id}">Izmeni</button>
                  ${u.id !== state.user?.id
                    ? `<button class="ra-btn danger user-del-btn" data-uid="${u.id}" data-name="${esc(u.username)}">Obriši</button>`
                    : `<span style="color:var(--dim);font-size:var(--fs-xs);padding:0 8px">Sopstveni nalog</span>`}
                </div></td>
              </tr>`).join('')
            : '<tr><td colspan="6" class="empty-state">Nema korisnika.</td></tr>'}
        </tbody>
      </table>
    </div>`;
}

// ─── LOCATIONS TAB ────────────────────────────────────────────────────────────
function renderLocationsTab() {
  return `
    <div class="admin-sec">
      <div class="admin-sec-hdr">
        <h3>Lokacije</h3>
        <button class="ra-btn acc" id="btnAddLoc">+ Dodaj lokaciju</button>
      </div>
      <table class="adm-tbl">
        <thead><tr><th>#</th><th>Naziv lokacije</th><th>Akcije</th></tr></thead>
        <tbody>
          ${state.locs.length
            ? state.locs.map((l, i) => `
              <tr>
                <td style="color:var(--dim);width:40px">${i + 1}</td>
                <td style="font-weight:600">${esc(l.name)}</td>
                <td><div class="row-actions">
                  <button class="ra-btn loc-edit-btn" data-id="${l.id}" data-name="${esc(l.name)}">Izmeni</button>
                  <button class="ra-btn danger loc-del-btn" data-id="${l.id}" data-name="${esc(l.name)}">Obriši</button>
                </div></td>
              </tr>`).join('')
            : '<tr><td colspan="3" class="empty-state">Nema lokacija.</td></tr>'}
        </tbody>
      </table>
    </div>`;
}

// ─── TYPES TAB ────────────────────────────────────────────────────────────────
function renderTypesTab() {
  return `
    <div class="admin-sec">
      <div class="admin-sec-hdr">
        <h3>Tipovi opreme</h3>
        <button class="ra-btn acc" id="btnAddType">+ Dodaj tip</button>
      </div>
      <p style="padding:8px 16px;font-size:var(--fs-xs);color:var(--sec)">
        Tipovi sa custom konfig fajlom imaju posebna polja, brojače i kontrole.<br>
        Novi tipovi automatski dobijaju standardni template (Osnovne informacije, Vreme upotrebe, 3 datum-kontrole).
      </p>
      <table class="adm-tbl">
        <thead><tr><th>#</th><th>Naziv tipa</th><th>Konfig</th><th>Akcije</th></tr></thead>
        <tbody>
          ${state.types.length
            ? state.types.map((t, i) => {
                const hasCfg = !!state.configs[t.name];
                return `
                <tr>
                  <td style="color:var(--dim);width:40px">${i + 1}</td>
                  <td style="font-weight:600">${esc(t.name)}</td>
                  <td>${hasCfg
                      ? `<span class="pill pill-ok" style="font-size:10px">Custom konfig</span>`
                      : `<span class="pill pill-off" style="font-size:10px">Default template</span>`}</td>
                  <td><div class="row-actions">
                    <button class="ra-btn type-edit-btn" data-id="${t.id}" data-name="${esc(t.name)}">Izmeni naziv</button>
                    <button class="ra-btn danger type-del-btn" data-id="${t.id}" data-name="${esc(t.name)}">Obriši</button>
                  </div></td>
                </tr>`;
              }).join('')
            : '<tr><td colspan="4" class="empty-state">Nema tipova opreme.</td></tr>'}
        </tbody>
      </table>
    </div>`;
}

// ─── EVENT BINDING ────────────────────────────────────────────────────────────
function bindAdminActions() {
  document.getElementById('btnAddUser')?.addEventListener('click', openAddUserDlg);
  document.querySelectorAll('.user-edit-btn').forEach(btn =>
    btn.addEventListener('click', () => openEditUserDlg(parseInt(btn.dataset.uid)))
  );
  document.querySelectorAll('.user-del-btn').forEach(btn =>
    btn.addEventListener('click', () => deleteUser(parseInt(btn.dataset.uid), btn.dataset.name))
  );

  document.getElementById('btnAddLoc')?.addEventListener('click', () => openItemDlg('location'));
  document.querySelectorAll('.loc-edit-btn').forEach(btn =>
    btn.addEventListener('click', () => openItemEditDlg('location', parseInt(btn.dataset.id), btn.dataset.name))
  );
  document.querySelectorAll('.loc-del-btn').forEach(btn =>
    btn.addEventListener('click', () => deleteItem('location', parseInt(btn.dataset.id), btn.dataset.name))
  );

  document.getElementById('btnAddType')?.addEventListener('click', () => openItemDlg('type'));
  document.querySelectorAll('.type-edit-btn').forEach(btn =>
    btn.addEventListener('click', () => openItemEditDlg('type', parseInt(btn.dataset.id), btn.dataset.name))
  );
  document.querySelectorAll('.type-del-btn').forEach(btn =>
    btn.addEventListener('click', () => deleteItem('type', parseInt(btn.dataset.id), btn.dataset.name))
  );
}

// ─── USER DIALOGS ─────────────────────────────────────────────────────────────
function openAddUserDlg() {
  state.editUserId = null;
  document.getElementById('dlgUserTitle').textContent   = '+ Dodaj korisnika';
  document.getElementById('uUsername').value            = '';
  document.getElementById('uUsername').readOnly         = false;
  document.getElementById('uFullName').value            = '';
  document.getElementById('uRole').value                = 'operater';
  document.getElementById('uPass').value                = '';
  document.getElementById('uPassLabel').textContent     = 'Lozinka *';
  document.getElementById('uActiveField').style.display = 'none'; // ne prikazuje se pri kreiranju
  openDlg('dlgAddUser');
  setTimeout(() => document.getElementById('uUsername')?.focus(), 120);
}

function openEditUserDlg(uid) {
  const u = state.users.find(x => x.id === uid);
  if (!u) return;
  state.editUserId = uid;
  document.getElementById('dlgUserTitle').textContent   = `Izmena korisnika – ${u.username}`;
  document.getElementById('uUsername').value            = u.username;
  document.getElementById('uUsername').readOnly         = true;
  document.getElementById('uFullName').value            = u.full_name;
  document.getElementById('uRole').value                = u.role;
  document.getElementById('uPass').value                = '';
  document.getElementById('uPassLabel').textContent     = 'Nova lozinka (prazno = bez promene)';
  document.getElementById('uActive').value              = String(u.active ?? 1);
  document.getElementById('uActiveField').style.display = ''; // prikazuje se pri izmeni
  openDlg('dlgAddUser');
  setTimeout(() => document.getElementById('uFullName')?.focus(), 120);
}

export async function submitUser() {
  const username  = document.getElementById('uUsername').value.trim();
  const full_name = document.getElementById('uFullName').value.trim();
  const role      = document.getElementById('uRole').value;
  const password  = document.getElementById('uPass').value;
  const active    = parseInt(document.getElementById('uActive')?.value ?? '1');

  if (!full_name || !role) { showToast('Puno ime i uloga su obavezni.', 'err'); return; }

  let r;
  if (state.editUserId) {
    const body = { full_name, role, active };
    if (password) body.password = password;
    r = await api.userUpdate(state.editUserId, body);
  } else {
    if (!username) { showToast('Korisničko ime je obavezno.', 'err'); return; }
    if (!password) { showToast('Lozinka je obavezna za novog korisnika.', 'err'); return; }
    if (password.length < 4) { showToast('Lozinka mora imati najmanje 4 karaktera.', 'err'); return; }
    r = await api.userCreate({ username, full_name, role, password });
  }
  if (!r) return;
  closeDlg('dlgAddUser');
  showToast(state.editUserId ? 'Korisnik ažuriran.' : 'Korisnik kreiran.', 'ok');
  state.users = await api.users() ?? [];
  renderAdmin();
}

async function deleteUser(uid, name) {
  if (!confirm(`Obrisati korisnika "${name}"?\nOva akcija je trajna.`)) return;
  const r = await api.userDelete(uid);
  if (!r) return;
  showToast('Korisnik obrisan.', 'ok');
  state.users = await api.users() ?? [];
  renderAdmin();
}

// ─── LOCATION / TYPE DIALOGS ──────────────────────────────────────────────────
function openItemDlg(mode) {
  state.addItemMode = mode;
  state.editItemId  = null;
  document.getElementById('dlgAddItemTitle').textContent =
    mode === 'type' ? '+ Novi tip opreme' : '+ Nova lokacija';
  document.getElementById('dlgAddItemLbl').textContent =
    mode === 'type' ? 'Naziv tipa opreme *' : 'Naziv lokacije *';
  document.getElementById('dlgAddItemVal').value = '';
  openDlg('dlgAddItem');
  setTimeout(() => document.getElementById('dlgAddItemVal')?.focus(), 120);
}

function openItemEditDlg(mode, id, name) {
  state.addItemMode = mode;
  state.editItemId  = id;
  document.getElementById('dlgAddItemTitle').textContent =
    mode === 'type' ? 'Izmena tipa opreme' : 'Izmena lokacije';
  document.getElementById('dlgAddItemLbl').textContent =
    mode === 'type' ? 'Naziv tipa *' : 'Naziv lokacije *';
  document.getElementById('dlgAddItemVal').value = name;
  openDlg('dlgAddItem');
  setTimeout(() => document.getElementById('dlgAddItemVal')?.select(), 120);
}

export async function submitAddItem() {
  const name = document.getElementById('dlgAddItemVal').value.trim();
  if (!name) { showToast('Naziv je obavezan.', 'err'); return; }
  const mode = state.addItemMode;
  const id   = state.editItemId;

  let r;
  if (mode === 'type') {
    r = id ? await api.typeUpdate(id, name) : await api.typeCreate(name);
  } else {
    r = id ? await api.locUpdate(id, name) : await api.locCreate(name);
  }
  if (!r) return;
  closeDlg('dlgAddItem');
  showToast(id ? 'Izmena sačuvana.' : 'Uspešno dodano.', 'ok');

  const [t, l] = await Promise.all([api.types(), api.locations()]);
  if (t) state.types = t;
  if (l) state.locs  = l;
  renderAdmin();
}

async function deleteItem(mode, id, name) {
  const noun = mode === 'type' ? 'tip opreme' : 'lokaciju';
  if (!confirm(`Obrisati ${noun} "${name}"?\nNije moguće ako se koristi u opremi.`)) return;
  const r = mode === 'type' ? await api.typeDelete(id) : await api.locDelete(id);
  if (!r) return;
  showToast('Obrisano.', 'ok');
  const [t, l] = await Promise.all([api.types(), api.locations()]);
  if (t) state.types = t;
  if (l) state.locs  = l;
  renderAdmin();
}
