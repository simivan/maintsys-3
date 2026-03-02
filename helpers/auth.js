'use strict';
// helpers/auth.js – Heširanje lozinke i generisanje tokena

const crypto = require('crypto');

const SALT = 'ems_salt_v2_2025';

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + SALT).digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = { hashPassword, generateToken };
