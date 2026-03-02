'use strict';
// routes/equipment.js – CRUD za opremu

const router = require('express').Router();
const { query, queryOne, execute } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { canManage, adminOnly } = require('../middleware/roles');
const { getConfig } = require('../configs');
const { ctrlStatus } = require('../helpers/ctrl-status');
const { calcVremeUpotrebe } = require('../helpers/dates');
const { today } = require('../helpers/dates');
const { nextOrderNumber } = require('../helpers/serial');

// ── Pomoćna: dohvata tip opreme prema equipment_type_id ──────────────────────
async function getTypeName(typeId) {
  if (!typeId) return null;
  const row = await queryOne('SELECT name FROM equipment_types WHERE id = ?', [typeId]);
  return row?.name ?? null;
}

// ── Pomoćna: kreira potrebne brojače i kontrole za novu opremu ───────────────
async function provisionEquipment(equipId, typeName) {
  const cfg = getConfig(typeName || '');
  for (const c of cfg.counters) {
    if (c.type === 'computed') continue;
    await query(
      'INSERT INTO counters (equipment_id, name, value, unit) VALUES (?, ?, ?, ?)',
      [equipId, c.name, '0', c.unit]
    );
  }
  for (const ctrl of cfg.controls) {
    await query(
      `INSERT INTO control_operations
         (equipment_id, name, interval_value, interval_unit, last_value, next_value)
       VALUES (?, ?, ?, ?, '0', '0')`,
      [equipId, ctrl.name, ctrl.intervalValue, ctrl.intervalUnit]
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/equipment  – lista (filtrirana, isključuje Otpisane)
// GET /api/equipment?otpisana=1 – samo otpisana (admin/menadzer)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  const { typeId, locationId, otpisana } = req.query;

  // Otpisana: samo za menadžera i admina
  if (otpisana) {
    if (!['admin', 'menadzer'].includes(req.user.role))
      return res.status(403).json({ error: 'Nemate privilegije.' });
    const rows = await query(
      `SELECT e.*, et.name AS type_name, l.name AS location_name
         FROM equipment e
         LEFT JOIN equipment_types et ON et.id = e.equipment_type_id
         LEFT JOIN locations l        ON l.id  = e.location_id
        WHERE e.status = 'Otpisan'
        ORDER BY l.name, et.sort_order, e.name`
    );
    return res.json(rows);
  }

  // Uobičajena lista – isključuje Otpisane
  let sql = `
    SELECT e.*,
           et.name AS type_name,
           l.name  AS location_name,
           (SELECT COUNT(*) FROM service_orders WHERE equipment_id = e.id AND status = 'Otvoren')  AS so_open,
           (SELECT COUNT(*) FROM service_orders WHERE equipment_id = e.id AND status = 'U obradi') AS so_inprog,
           (SELECT COUNT(*) FROM service_orders WHERE equipment_id = e.id AND status = 'Zatvoren') AS so_closed,
           (SELECT CAST(c.value AS DECIMAL(14,2)) FROM counters c
             WHERE c.equipment_id = e.id AND c.name = 'Radni sati' LIMIT 1) AS radni_sati,
           (SELECT co.next_value FROM control_operations co
             WHERE co.equipment_id = e.id AND co.name = 'Redovni servis' LIMIT 1) AS next_service_val,
           (SELECT co.interval_value FROM control_operations co
             WHERE co.equipment_id = e.id AND co.name = 'Redovni servis' LIMIT 1) AS service_interval
      FROM equipment e
      LEFT JOIN equipment_types et ON et.id = e.equipment_type_id
      LEFT JOIN locations l        ON l.id  = e.location_id
     WHERE e.status != 'Otpisan'`;

  const params = [];
  if (typeId)     { sql += ' AND e.equipment_type_id = ?'; params.push(typeId);     }
  if (locationId) { sql += ' AND e.location_id = ?';       params.push(locationId); }
  sql += ' ORDER BY l.name, et.sort_order, e.name';

  res.json(await query(sql, params));
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/equipment/:id  – detalji jedne opreme
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  const eq = await queryOne(
    `SELECT e.*, et.name AS type_name, l.name AS location_name
       FROM equipment e
       LEFT JOIN equipment_types et ON et.id = e.equipment_type_id
       LEFT JOIN locations l        ON l.id  = e.location_id
      WHERE e.id = ?`,
    [req.params.id]
  );
  if (!eq) return res.status(404).json({ error: 'Oprema nije pronađena.' });

  // Otpisana je vidljiva samo menadžeru i adminu
  if (eq.status === 'Otpisan' && !['admin', 'menadzer'].includes(req.user.role))
    return res.status(403).json({ error: 'Nemate privilegije za pregled otpisane opreme.' });

  const counters = await query(
    'SELECT * FROM counters WHERE equipment_id = ? ORDER BY id', [req.params.id]
  );
  const opH = parseFloat(counters.find(c => c.name === 'Radni sati')?.value) || 0;

  const controls = (await query(
    'SELECT * FROM control_operations WHERE equipment_id = ? ORDER BY id', [req.params.id]
  )).map(c => ({ ...c, status: ctrlStatus(c, opH) }));

  res.json({
    ...eq,
    counters,
    controls,
    vreme_upotrebe: calcVremeUpotrebe(eq.purchase_date),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/equipment  – nova oprema (samo admin)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', requireAuth, adminOnly, async (req, res) => {
  const b = req.body;
  if (!b.name?.trim()) return res.status(400).json({ error: 'Naziv je obavezan.' });

  const result = await execute(
    `INSERT INTO equipment
       (name, equipment_type_id, location_id, manufacturer, serial_number, asset_number,
        year, purchase_date, compressor_type, cooling_type, motor_power, max_stage,
        max_capacity, min_inlet_pressure, max_inlet_pressure, priority_panel, notes, status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      b.name.trim(), b.equipment_type_id || null, b.location_id || null,
      b.manufacturer || null, b.serial_number || null, b.asset_number || null,
      b.year || null, b.purchase_date || null,
      b.compressor_type || null, b.cooling_type || null, b.motor_power || null,
      b.max_stage || null, b.max_capacity || null,
      b.min_inlet_pressure || null, b.max_inlet_pressure || null,
      b.priority_panel || null, b.notes || null,
      b.status || 'U radu',
    ]
  );
  const equipId = result.insertId;
  const typeName = await getTypeName(b.equipment_type_id);
  await provisionEquipment(equipId, typeName);

  res.json({ id: equipId });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/equipment/:id  – izmena podataka (menadžer+)
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', requireAuth, canManage, async (req, res) => {
  const b = req.body;
  if (!b.name?.trim()) return res.status(400).json({ error: 'Naziv je obavezan.' });

  await query(
    `UPDATE equipment SET
       name = ?, equipment_type_id = ?, location_id = ?,
       manufacturer = ?, serial_number = ?, asset_number = ?,
       year = ?, purchase_date = ?, compressor_type = ?, cooling_type = ?,
       motor_power = ?, max_stage = ?, max_capacity = ?,
       min_inlet_pressure = ?, max_inlet_pressure = ?,
       priority_panel = ?, notes = ?
     WHERE id = ?`,
    [
      b.name.trim(), b.equipment_type_id || null, b.location_id || null,
      b.manufacturer || null, b.serial_number || null, b.asset_number || null,
      b.year || null, b.purchase_date || null,
      b.compressor_type || null, b.cooling_type || null, b.motor_power || null,
      b.max_stage || null, b.max_capacity || null,
      b.min_inlet_pressure || null, b.max_inlet_pressure || null,
      b.priority_panel || null, b.notes || null,
      req.params.id,
    ]
  );

  const opH = (await queryOne(
    "SELECT value FROM counters WHERE equipment_id = ? AND name = 'Radni sati'",
    [req.params.id]
  ))?.value || 0;
  await query(
    `INSERT INTO logs (equipment_id, operating_hours, operator_name, action_type, action_name, value, confirmation)
     VALUES (?, ?, ?, 'Osnovno', 'Izmena podataka', '—', 'OK')`,
    [req.params.id, opH, req.user.full_name]
  );

  res.json({ success: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/equipment/:id/status  – promena statusa (operater/menadžer/admin)
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id/status', requireAuth, async (req, res) => {
  if (!['admin', 'menadzer', 'operater'].includes(req.user.role))
    return res.status(403).json({ error: 'Nemate privilegije.' });

  const { status, notes } = req.body;
  if (!status?.trim()) return res.status(400).json({ error: 'Status je obavezan.' });
  if (!notes?.trim())  return res.status(400).json({ error: 'Napomena je obavezna.' });

  const current = await queryOne('SELECT status FROM equipment WHERE id = ?', [req.params.id]);
  if (!current) return res.status(404).json({ error: 'Oprema nije pronađena.' });

  // Samo admin može promeniti status Otpisane opreme
  if (current.status === 'Otpisan' && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Samo admin može promeniti status otpisane opreme.' });

  await query('UPDATE equipment SET status = ? WHERE id = ?', [status, req.params.id]);

  const opH = (await queryOne(
    "SELECT value FROM counters WHERE equipment_id = ? AND name = 'Radni sati'",
    [req.params.id]
  ))?.value || 0;

  await query(
    `INSERT INTO logs (equipment_id, operating_hours, operator_name, action_type, action_name, value, confirmation, notes)
     VALUES (?, ?, ?, 'Status', 'Promena statusa', ?, 'OK', ?)`,
    [req.params.id, opH, req.user.full_name, status, notes]
  );

  // Zastoj → automatski servisni nalog
  let orderNumber = null;
  if (status === 'Zastoj') {
    orderNumber = await nextOrderNumber();
    await query(
      `INSERT INTO service_orders
         (equipment_id, order_number, date, operator_name, operating_hours, service_note, status)
       VALUES (?, ?, ?, ?, ?, ?, 'Otvoren')`,
      [req.params.id, orderNumber, today(), req.user.full_name, opH, notes]
    );
  }

  res.json({ success: true, order_number: orderNumber });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/equipment/:id  – brisanje (samo admin)
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', requireAuth, adminOnly, async (req, res) => {
  await query('DELETE FROM equipment WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
