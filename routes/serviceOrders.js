'use strict';
// routes/serviceOrders.js – Servisni nalozi (globalni endpoint)
// Napomena: per-equipment GET i POST su u server.js (nested route)

const router = require('express').Router();
const { query, execute } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { canManage, adminOnly } = require('../middleware/roles');

// GET /api/service-orders  – svi nalozi (za dashboard modal, filtriranje po type/location)
router.get('/', requireAuth, async (req, res) => {
  const { typeId, locationId } = req.query;
  let sql = `
    SELECT so.*, e.name AS eq_name, l.name AS location_name, et.name AS type_name
      FROM service_orders so
      JOIN equipment e             ON e.id  = so.equipment_id
      LEFT JOIN locations l        ON l.id  = e.location_id
      LEFT JOIN equipment_types et ON et.id = e.equipment_type_id
     WHERE e.status != 'Otpisan'`;
  const params = [];
  if (typeId)     { sql += ' AND e.equipment_type_id = ?'; params.push(typeId);     }
  if (locationId) { sql += ' AND e.location_id = ?';       params.push(locationId); }
  sql += ' ORDER BY so.id DESC';
  res.json(await query(sql, params));
});

// PUT /api/service-orders/:id  – izmena naloga (menadžer+)
router.put('/:id', requireAuth, canManage, async (req, res) => {
  const b = req.body;
  if (!b.service_note?.trim())
    return res.status(400).json({ error: 'Opis servisa je obavezan.' });

  await query(
    `UPDATE service_orders SET
       date = ?, operator_name = ?, operating_hours = ?,
       service_note = ?, status = ?, technician = ?,
       resolution = ?, completion_date = ?, ticket_url = ?
     WHERE id = ?`,
    [
      b.date, b.operator_name, b.operating_hours || 0,
      b.service_note, b.status || 'Otvoren', b.technician || '',
      b.resolution || '', b.completion_date || null, b.ticket_url || null,
      req.params.id,
    ]
  );
  res.json({ success: true });
});

// DELETE /api/service-orders/:id  – brisanje (samo admin)
router.delete('/:id', requireAuth, adminOnly, async (req, res) => {
  await query('DELETE FROM service_orders WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
