// public/js/auth.js – Prijava i odjava
import { state } from './state.js';
import { api }   from './api.js';
import { showToast } from './utils.js';

export async function loginSubmit() {
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  const errEl    = document.getElementById('loginErr');
  errEl.style.display = 'none';

  if (!username || !password) {
    errEl.textContent = 'Unesite korisničko ime i lozinku.';
    errEl.style.display = 'block';
    return;
  }

  const res = await api.login(username, password);
  if (!res) return;

  state.token = res.token;
  state.user  = res.user;
  localStorage.setItem('ems_token', state.token);
  localStorage.setItem('ems_user',  JSON.stringify(state.user));

  // Startuj aplikaciju
  const { startApp } = await import('./app.js');
  await startApp();
}

export async function performLogout(callApi = true) {
  if (callApi && state.token) await api.logout().catch(() => {});
  state.token = null;
  state.user  = null;
  localStorage.removeItem('ems_token');
  localStorage.removeItem('ems_user');
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
}

// Napomena: login dugme i Enter su vezani u index.html bootstrap skripti
