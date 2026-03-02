'use strict';
// routes/counters.js – Ažuriranje vrednosti brojača

const router = require('express').Router({ mergeParams: true }); // nasleđuje :equipId
const { query, queryOne } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { canWrite } = require('../middleware/roles');
const { getConfig } = require('../configs');

// Proveri da li je unos za tu opremu zamrznut
async function checkFrozen(equipId) {
  const eq = await queryOne(
    `SELECT e.status, et.name AS type_name
       FROM equipment e
       LEFT JOIN equipment_types et ON et.id = e.equipment_type_id
      WHERE e.id = ?`,
    [equipId]
  );
  if (!eq) return { notFound: true };
  const cfg   = getConfig(eq.type_name || '');
  const opt   = cfg.statusOptions?.find(o => o.value === eq.status);
  return { frozen: opt?.freezeAll || opt?.freezeCounters || false, status: eq.status };
}

// PUT /api/equipment/:equipId/counters/:id
router.put('/:id', requireAuth, canWrite, async (req, res) => {
  const { equipId, id: counterId } = req.params;
  const { value } = req.body;

  if (value === undefined || value === null)
    return res.status(400).json({ error: 'Vrednost je obavezna.' });

  const { frozen, notFound } = await checkFrozen(equipId);
  if (notFound) return res.status(404).json({ error: 'Oprema nije pronađena.' });
  if (frozen)   return res.status(403).json({ error: 'Unos je onemogućen za trenutni status opreme.' });

  const counter = await queryOne(
    'SELECT * FROM counters WHERE id = ? AND equipment_id = ?', [counterId, equipId]
  );
  if (!counter) return res.status(404).json({ error: 'Brojač nije pronađen.' });

  await query(
    'UPDATE counters SET value = ? WHERE id = ?', [String(value), counterId]
  );

  const opH = (await queryOne(
    "SELECT value FROM counters WHERE equipment_id = ? AND name = 'Radni sati'", [equipId]
  ))?.value || 0;

  await query(
    `INSERT INTO logs (equipment_id, operating_hours, operator_name, action_type, action_name, value, confirmation)
     VALUES (?, ?, ?, 'Brojač', ?, ?, 'OK')`,
    [equipId, opH, req.user.full_name, counter.name, String(value)]
  );

  res.json({ success: true });
});

module.exports = router;
