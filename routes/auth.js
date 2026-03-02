'use strict';
// routes/auth.js – Prijava i odjava korisnika

const router  = require('express').Router();
const { queryOne, query } = require('../db/pool');
const { hashPassword, generateToken } = require('../helpers/auth');
const { requireAuth } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Unesite korisničko ime i lozinku.' });

  const user = await queryOne(
    'SELECT * FROM users WHERE username = ? AND active = 1', [username]
  );
  if (!user || user.password_hash !== hashPassword(password))
    return res.status(401).json({ error: 'Pogrešno korisničko ime ili lozinka.' });

  const token = generateToken();
  await query('INSERT INTO sessions (token, user_id) VALUES (?, ?)', [token, user.id]);

  res.json({
    token,
    user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role },
  });
});

// POST /api/auth/logout
router.post('/logout', requireAuth, async (req, res) => {
  await query('DELETE FROM sessions WHERE token = ?', [req.token]);
  res.json({ success: true });
});

module.exports = router;
