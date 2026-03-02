// public/js/sidebar.js – Levi sidebar sa accordion listom opreme
import { state, can } from './state.js';
import { esc } from './utils.js';

export function renderSidebar() {
  const q     = document.getElementById('sbSearch')?.value?.toLowerCase() ?? '';
  const body  = document.getElementById('sbMain');
  if (!body) return;

  // Otpisana sekcija
  const otpisanaSection = document.getElementById('sbOtpisana');
  if (otpisanaSection) {
    otpisanaSection.style.display = can.viewOtpisana() ? 'block' : 'none';
  }

  let html = '';

  state.types.forEach(type => {
    // Sva oprema ovog tipa iz učitane liste
    const items = state.allEq.filter(e => e.equipment_type_id === type.id);
    if (!items.length) return;

    // Filter pretrage
    const filtered = q
      ? items.filter(e =>
          e.name.toLowerCase().includes(q) ||
          (e.location_name ?? '').toLowerCase().includes(q)
        )
      : items;

    const hasActive = items.some(e => e.id === state.equipId);
    const isOpen    = state.sbOpen[type.id] !== false; // default open

    html += `
      <div class="type-group">
        <div class="type-hdr ${hasActive ? 'active' : ''}" data-tid="${type.id}">
          <div class="type-hdr-l">
            <span class="type-arrow ${isOpen ? 'open' : ''}">▶</span>
            <span class="type-name">${esc(type.name)}</span>
          </div>
          <span class="type-badge">${items.length}</span>
        </div>
        <div class="type-items ${isOpen ? 'open' : ''}">
          ${filtered.map(e => `
            <div class="eq-item ${e.id === state.equipId ? 'active' : ''}" data-eid="${e.id}">
              <span class="eq-item-name">${esc(e.name)}</span>
              <span class="eq-dot ${dotClass(e)}"></span>
            </div>`).join('')}
        </div>
      </div>`;
  });

  body.innerHTML = html || '<div class="empty-state">Nema opreme</div>';

  // Delegirani event listeneri
  body.querySelectorAll('.type-hdr').forEach(el => {
    el.addEventListener('click', () => toggleTypeGroup(parseInt(el.dataset.tid)));
  });
  body.querySelectorAll('.eq-item').forEach(el => {
    el.addEventListener('click', () => {
      import('./app.js').then(m => m.goEquipment(parseInt(el.dataset.eid)));
    });
  });
}

function dotClass(e) {
  if (e.status === 'Zastoj')   return 'dot-bad';
  if (e.status === 'Neaktivan') return 'dot-blue';
  if ((e.so_open ?? 0) > 0 || (e.so_inprog ?? 0) > 0) return 'dot-warn';
  return 'dot-ok';
}

function toggleTypeGroup(tid) {
  state.sbOpen[tid] = !(state.sbOpen[tid] !== false);
  renderSidebar();
}

export function updateOtpisanaBadge(count) {
  const el = document.getElementById('sbOtBadge');
  if (el) el.textContent = count;
}
