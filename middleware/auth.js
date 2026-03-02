'use strict';
// middleware/auth.js – Provera autentifikacije (Bearer token)

const { queryOne } = require('../db/pool');

async function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return res.status(401).json({ error: 'Pristup odbijen – prijavite se.' });

  const session = await queryOne(
    `SELECT s.token, u.id, u.username, u.full_name, u.role
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token = ? AND u.active = 1`,
    [token]
  );
  if (!session) return res.status(401).json({ error: 'Nevažeća sesija – prijavite se ponovo.' });

  req.user  = session;
  req.token = token;
  next();
}

module.exports = { requireAuth };
