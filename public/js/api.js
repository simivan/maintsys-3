// public/js/api.js – Sve API pozive prema backendu
import { state } from './state.js';
import { showToast } from './utils.js';

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

export const api = {
  get:    (url)         => request('GET',    url),
  post:   (url, body)   => request('POST',   url, body),
  put:    (url, body)   => request('PUT',    url, body),
  delete: (url)         => request('DELETE', url),

  // Auth
  login:  (u, p)    => request('POST', '/api/auth/login',  { username: u, password: p }),
  logout: ()        => request('POST', '/api/auth/logout'),

  // Reference
  version:   ()     => request('GET',  '/api/version'),
  configs:   ()     => request('GET',  '/api/configs'),
  types:     ()     => request('GET',  '/api/types'),
  locations: ()     => request('GET',  '/api/locations'),

  // Equipment
  equipList:   (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', '/api/equipment' + (q ? '?' + q : ''));
  },
  equipOne:    (id)           => request('GET',    `/api/equipment/${id}`),
  equipCreate: (body)         => request('POST',   '/api/equipment', body),
  equipUpdate: (id, body)     => request('PUT',    `/api/equipment/${id}`, body),
  equipDelete: (id)           => request('DELETE', `/api/equipment/${id}`),
  equipStatus: (id, body)     => request('PUT',    `/api/equipment/${id}/status`, body),

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
  srvForEq:    (eqId)          => request('GET',    `/api/equipment/${eqId}/service-orders`),
  srvCreate:   (eqId, body)    => request('POST',   `/api/equipment/${eqId}/service-orders`, body),
  srvUpdate:   (id, body)      => request('PUT',    `/api/service-orders/${id}`, body),
  srvDelete:   (id)            => request('DELETE', `/api/service-orders/${id}`),
  srvAll:      (params = {})   => {
    const q = new URLSearchParams(params).toString();
    return request('GET', '/api/service-orders' + (q ? '?' + q : ''));
  },

  // Types & Locations
  typeCreate: (name)       => request('POST',   '/api/types', { name }),
  typeUpdate: (id, name)   => request('PUT',    `/api/types/${id}`, { name }),
  typeDelete: (id)         => request('DELETE', `/api/types/${id}`),
  locCreate:  (name)       => request('POST',   '/api/locations', { name }),
  locUpdate:  (id, name)   => request('PUT',    `/api/locations/${id}`, { name }),
  locDelete:  (id)         => request('DELETE', `/api/locations/${id}`),

  // Users
  users:       ()           => request('GET',    '/api/users'),
  userCreate:  (body)       => request('POST',   '/api/users', body),
  userUpdate:  (id, body)   => request('PUT',    `/api/users/${id}`, body),
  userDelete:  (id)         => request('DELETE', `/api/users/${id}`),
};
