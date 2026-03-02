'use strict';
// routes/locations.js – Lokacije (CRUD samo za admin)

const router  = require('express').Router();
const { query, queryOne, execute } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roles');

router.get('/', requireAuth, async (_, res) =>
  res.json(await query('SELECT * FROM locations ORDER BY sort_order, name'))
);

router.post('/', requireAuth, adminOnly, async (req, res) => {
  const name = req.body.name?.trim();
  if (!name) return res.status(400).json({ error: 'Naziv je obavezan.' });
  const maxOrd = (await queryOne('SELECT COALESCE(MAX(sort_order),0) AS m FROM locations'))?.m ?? 0;
  const r = await execute('INSERT INTO locations (name, sort_order) VALUES (?, ?)', [name, maxOrd + 1]);
  res.json({ id: r.insertId });
});

router.put('/:id', requireAuth, adminOnly, async (req, res) => {
  const name = req.body.name?.trim();
  if (!name) return res.status(400).json({ error: 'Naziv je obavezan.' });
  await query('UPDATE locations SET name = ? WHERE id = ?', [name, req.params.id]);
  res.json({ success: true });
});

router.delete('/:id', requireAuth, adminOnly, async (req, res) => {
  const used = await queryOne(
    'SELECT COUNT(*) AS c FROM equipment WHERE location_id = ?', [req.params.id]
  );
  if (used.c > 0)
    return res.status(400).json({ error: `Lokacija se koristi na ${used.c} uređaja.` });
  await query('DELETE FROM locations WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
