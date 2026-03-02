'use strict';
// routes/logs.js – Dnevnik rada

const router = require('express').Router({ mergeParams: true });
const { query } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

// GET /api/equipment/:equipId/logs
router.get('/', requireAuth, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 500, 5000);
  res.json(await query(
    'SELECT * FROM logs WHERE equipment_id = ? ORDER BY id DESC LIMIT ?',
    [req.params.equipId, limit]
  ));
});

module.exports = router;
