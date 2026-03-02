'use strict';
// routes/controls.js – Unos rezultata kontrolnih operacija

const router = require('express').Router({ mergeParams: true });
const { query, queryOne } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { canWrite } = require('../middleware/roles');
const { getConfig } = require('../configs');
const { today, addDays, addYears } = require('../helpers/dates');
const { nextOrderNumber } = require('../helpers/serial');

async function checkFrozen(equipId) {
  const eq = await queryOne(
    `SELECT e.status, et.name AS type_name
       FROM equipment e
       LEFT JOIN equipment_types et ON et.id = e.equipment_type_id
      WHERE e.id = ?`,
    [equipId]
  );
  if (!eq) return { notFound: true };
  const cfg = getConfig(eq.type_name || '');
  const opt = cfg.statusOptions?.find(o => o.value === eq.status);
  return { frozen: opt?.freezeAll || opt?.freezeControls || false, status: eq.status };
}

// PUT /api/equipment/:equipId/controls/:id
router.put('/:id', requireAuth, canWrite, async (req, res) => {
  const { equipId, id: ctrlId } = req.params;
  const { confirmation, notes, value } = req.body;

  if (!confirmation) return res.status(400).json({ error: 'Potvrda (OK/NOK) je obavezna.' });

  const { frozen, notFound } = await checkFrozen(equipId);
  if (notFound) return res.status(404).json({ error: 'Oprema nije pronađena.' });
  if (frozen)   return res.status(403).json({ error: 'Kontrole su zamrznute za trenutni status opreme.' });

  const ctrl = await queryOne(
    'SELECT * FROM control_operations WHERE id = ? AND equipment_id = ?', [ctrlId, equipId]
  );
  if (!ctrl) return res.status(404).json({ error: 'Kontrola nije pronađena.' });

  // Računanje last/next vrednosti zavisno od tipa intervala
  let lastVal, nextVal;
  const unit = ctrl.interval_unit;

  if (unit === 'dan') {
    lastVal = today();
    nextVal = addDays(today(), parseFloat(ctrl.interval_value));
  } else if (unit === 'god') {
    lastVal = today();
    nextVal = addYears(today(), parseFloat(ctrl.interval_value));
  } else {
    // hrad – vrednost je radni sat
    const numVal = parseFloat(value) || 0;
    lastVal = String(numVal);
    nextVal = String(numVal + parseFloat(ctrl.interval_value));
  }

  await query(
    'UPDATE control_operations SET last_value = ?, next_value = ?, last_updated = NOW() WHERE id = ?',
    [lastVal, nextVal, ctrlId]
  );

  const opH = (await queryOne(
    "SELECT value FROM counters WHERE equipment_id = ? AND name = 'Radni sati'", [equipId]
  ))?.value || 0;

  await query(
    `INSERT INTO logs
       (equipment_id, operating_hours, operator_name, action_type, action_name, value, next_value, confirmation, notes)
     VALUES (?, ?, ?, 'Kontrola', ?, ?, ?, ?, ?)`,
    [equipId, opH, req.user.full_name, ctrl.name, lastVal, nextVal, confirmation, notes || '']
  );

  // NOK → automatski servisni nalog
  let orderNumber = null;
  if (confirmation === 'NOK') {
    orderNumber = await nextOrderNumber();
    await query(
      `INSERT INTO service_orders
         (equipment_id, order_number, date, operator_name, operating_hours, service_note, status)
       VALUES (?, ?, ?, ?, ?, ?, 'Otvoren')`,
      [equipId, orderNumber, today(), req.user.full_name, opH,
       `${ctrl.name}: ${notes || 'NOK'}`]
    );
  }

  res.json({ success: true, next_value: nextVal, order_number: orderNumber });
});

module.exports = router;
