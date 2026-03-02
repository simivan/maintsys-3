// public/js/api.js – Sve API pozive prema backendu
import { state } from './state.js';
import { showToast } from './utils.js';

// Generički zahtev (koristi se za sve rute osim login-a)
async function request(method, url, body) {
  try {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (state.token) opts.headers['Authorization'] = 'Bearer ' + state.token;
    if (body !== undefined) opts.body = JSON.stringify(body);

    const res  = await fetch(url, opts);
    const data = await res.json();

    if (res.status === 401) {
      // Sesija istekla – odjava
      await import('./auth.js').then(m => m.performLogout(false));
      return null;
    }
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  } catch (err) {
    showToast(err.message, 'err');
    return null;
  }
}

// Login koristi posebnu funkciju – greške se ne prikazuju kao toast
// nego vraćaju { error: '...' } da bi auth.js mogao prikazati u formi
async function loginRequest(username, password) {
  try {
    const res  = await fetch('/api/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) return { _error: data.error || 'Greška pri prijavi.' };
    return data;
  } catch {
    return { _error: 'Nije moguće povezati se sa serverom. Proverite mrežnu vezu.' };
  }
}

export const api = {
  // Auth
  login:  (u, p) => loginRequest(u, p),
  logout: ()     => request('POST', '/api/auth/logout'),

  // Reference
  version:   () => request('GET', '/api/version'),
  configs:   () => request('GET', '/api/configs'),
  types:     () => request('GET', '/api/types'),
  locations: () => request('GET', '/api/locations'),

  // Equipment
  equipList: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', '/api/equipment' + (q ? '?' + q : ''));
  },
  equipOne:    (id)       => request('GET',    `/api/equipment/${id}`),
  equipCreate: (body)     => request('POST',   '/api/equipment', body),
  equipUpdate: (id, body) => request('PUT',    `/api/equipment/${id}`, body),
  equipDelete: (id)       => request('DELETE', `/api/equipment/${id}`),
  equipStatus: (id, body) => request('PUT',    `/api/equipment/${id}/status`, body),

  // Counters
  counterUpdate: (eqId, cId, value) =>
    request('PUT', `/api/equipment/${eqId}/counters/${cId}`, { value }),

  // Controls
  controlUpdate: (eqId, cId, body) =>
    request('PUT', `/api/equipment/${eqId}/controls/${cId}`, body),

  // Logs
  logs: (eqId, limit = 500) =>
    request('GET', `/api/equipment/${eqId}/logs?limit=${limit}`),

  // Service orders – per equipment
  srvForEq: (eqId)       => request('GET',  `/api/equipment/${eqId}/service-orders`),
  srvCreate: (eqId, body) => request('POST', `/api/equipment/${eqId}/service-orders`, body),
  srvUpdate: (id, body)   => request('PUT',  `/api/service-orders/${id}`, body),
  srvDelete: (id)         => request('DELETE', `/api/service-orders/${id}`),
  srvAll:    (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', '/api/service-orders' + (q ? '?' + q : ''));
  },

  // Types & Locations
  typeCreate: (name)     => request('POST',   '/api/types', { name }),
  typeUpdate: (id, name) => request('PUT',    `/api/types/${id}`, { name }),
  typeDelete: (id)       => request('DELETE', `/api/types/${id}`),
  locCreate:  (name)     => request('POST',   '/api/locations', { name }),
  locUpdate:  (id, name) => request('PUT',    `/api/locations/${id}`, { name }),
  locDelete:  (id)       => request('DELETE', `/api/locations/${id}`),

  // Users
  users:      ()         => request('GET',    '/api/users'),
  userCreate: (body)     => request('POST',   '/api/users', body),
  userUpdate: (id, body) => request('PUT',    `/api/users/${id}`, body),
  userDelete: (id)       => request('DELETE', `/api/users/${id}`),
};
