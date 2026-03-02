'use strict';
// routes/users.js – Upravljanje korisnicima (samo admin)

const router  = require('express').Router();
const { query, queryOne, execute } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { adminOnly } = require('../middleware/roles');
const { hashPassword } = require('../helpers/auth');

router.get('/', requireAuth, adminOnly, async (_, res) =>
  res.json(await query(
    'SELECT id, username, full_name, role, active, created_at FROM users ORDER BY role, full_name'
  ))
);

router.post('/', requireAuth, adminOnly, async (req, res) => {
  const { username, password, full_name, role } = req.body;
  if (!username?.trim() || !password || !full_name?.trim() || !role)
    return res.status(400).json({ error: 'Popunite sva obavezna polja.' });
  if (password.length < 4)
    return res.status(400).json({ error: 'Lozinka mora imati najmanje 4 karaktera.' });
  try {
    const r = await execute(
      'INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
      [username.trim(), hashPassword(password), full_name.trim(), role]
    );
    res.json({ id: r.insertId });
  } catch {
    res.status(400).json({ error: 'Korisničko ime već postoji.' });
  }
});

router.put('/:id', requireAuth, adminOnly, async (req, res) => {
  const { full_name, role, active, password } = req.body;
  if (!full_name?.trim() || !role)
    return res.status(400).json({ error: 'Puno ime i uloga su obavezni.' });
  if (password) {
    await query(
      'UPDATE users SET full_name = ?, role = ?, active = ?, password_hash = ? WHERE id = ?',
      [full_name.trim(), role, active ?? 1, hashPassword(password), req.params.id]
    );
  } else {
    await query(
      'UPDATE users SET full_name = ?, role = ?, active = ? WHERE id = ?',
      [full_name.trim(), role, active ?? 1, req.params.id]
    );
  }
  res.json({ success: true });
});

router.delete('/:id', requireAuth, adminOnly, async (req, res) => {
  if (parseInt(req.params.id) === req.user.id)
    return res.status(400).json({ error: 'Ne možete obrisati sopstveni nalog.' });
  await query('DELETE FROM users WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
