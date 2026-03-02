// public/js/auth.js – Prijava i odjava
import { state } from './state.js';
import { api }   from './api.js';

export async function loginSubmit() {
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  const errEl    = document.getElementById('loginErr');
  const btn      = document.getElementById('loginBtn');

  // Sakrij prethodnu grešku
  errEl.style.display = 'none';
  errEl.textContent   = '';

  if (!username || !password) {
    showLoginError('Unesite korisničko ime i lozinku.');
    return;
  }

  // Pokaži stanje učitavanja
  btn.disabled    = true;
  btn.textContent = 'Prijava...';

  const res = await api.login(username, password);

  btn.disabled    = false;
  btn.textContent = 'Prijavite se';

  // Greška – prikaži u formi (ne kao toast)
  if (!res || res._error) {
    showLoginError(res?._error || 'Greška pri prijavi. Pokušajte ponovo.');
    document.getElementById('loginPass').value = '';
    document.getElementById('loginPass').focus();
    return;
  }

  state.token = res.token;
  state.user  = res.user;
  localStorage.setItem('maintsys_token', state.token);
  localStorage.setItem('maintsys_user',  JSON.stringify(state.user));

  const { startApp } = await import('./app.js');
  await startApp();
}

function showLoginError(msg) {
  const el = document.getElementById('loginErr');
  el.textContent   = msg;
  el.style.display = 'block';
  // Kratka animacija treperenja da skrene pažnju
  el.style.animation = 'none';
  requestAnimationFrame(() => { el.style.animation = 'shake .3s ease'; });
}

export async function performLogout(callApi = true) {
  if (callApi && state.token) await api.logout().catch(() => {});
  state.token = null;
  state.user  = null;
  localStorage.removeItem('maintsys_token');
  localStorage.removeItem('maintsys_user');
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('app').style.display       = 'none';
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  document.getElementById('loginErr').style.display = 'none';
}

// Napomena: login dugme i Enter su vezani u index.html bootstrap skripti
