// public/js/otpisana.js – Prikaz otpisane opreme
import { state } from './state.js';
import { api } from './api.js';
import { esc, statusPillCls, showToast } from './utils.js';
import { updateOtpisanaBadge } from './sidebar.js';

export async function loadOtpisanaView() {
  const data = await api.equipList({ otpisana: 1 });
  if (!data) return;
  updateOtpisanaBadge(data.length);
  renderOtpisanaList(data);
}

function renderOtpisanaList(eqs) {
  document.getElementById('content').innerHTML = `
    <div style="flex:1;display:flex;flex-direction:column;overflow:hidden;">
      <div class="bc-bar">
        <div class="bc">
          <span class="bc-link" id="bcOtpHome">Pregled opreme</span>
          <span class="bc-sep">›</span>
          <span class="bc-cur">📦 Otpisana oprema</span>
        </div>
        <div class="bc-right">
          <span style="font-size:var(--fs-sm);color:var(--sec)">${eqs.length} stavki</span>
        </div>
      </div>
      <div style="flex:1;overflow-y:auto;padding:16px;">
        <table class="eq-tbl">
          <thead><tr>
            <th>Naziv</th><th>Tip opreme</th><th>Lokacija</th><th>Proizvođač</th>
            <th>Serijski broj</th><th>Asset broj</th><th>Godina</th><th>Status</th><th>Napomene</th>
          </tr></thead>
          <tbody>
            ${eqs.length
              ? eqs.map(e => `
                <tr class="eq-row" data-eid="${e.id}">
                  <td><span class="eq-name">${esc(e.name)}</span></td>
                  <td><span class="eq-tag">${esc(e.type_name ?? '—')}</span></td>
                  <td style="color:var(--sec)">${esc(e.location_name ?? '—')}</td>
                  <td class="eq-mfr">${esc(e.manufacturer ?? '—')}</td>
                  <td style="font-size:var(--fs-xs);color:var(--sec)">${esc(e.serial_number ?? '—')}</td>
                  <td style="font-size:var(--fs-xs);color:var(--sec)">${esc(e.asset_number ?? '—')}</td>
                  <td>${e.year ?? '—'}</td>
                  <td><span class="pill pill-off">Otpisan</span></td>
                  <td style="font-size:var(--fs-xs);color:var(--sec);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(e.notes ?? '—')}</td>
                </tr>`).join('')
              : '<tr><td colspan="9" class="empty-state">Nema otpisane opreme.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;

  document.getElementById('bcOtpHome')?.addEventListener('click', () => {
    import('./app.js').then(m => m.goDashboard());
  });

  document.querySelectorAll('.eq-row').forEach(row => {
    row.addEventListener('click', () => {
      import('./app.js').then(m => m.goEquipment(parseInt(row.dataset.eid)));
    });
  });
}

// Ažurira badge sa brojem otpisane opreme (poziva se pri startu i nakon promene)
export async function refreshOtpisanaBadge() {
  const data = await api.equipList({ otpisana: 1 });
  if (data) updateOtpisanaBadge(data.length);
}
