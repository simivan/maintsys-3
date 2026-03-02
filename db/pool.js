'use strict';
// db/pool.js – MariaDB connection pool (singleton)
// Koristiti mysql2/promise za async/await podršku.

const mysql = require('mysql2/promise');

// Učitati .env ako postoji
try { require('fs').readFileSync('.env').toString().split('\n').forEach(line => {
  const [k, v] = line.split('='); if (k && v) process.env[k.trim()] = v.trim();
}); } catch(_) {}

const pool = mysql.createPool({
  host:             process.env.DB_HOST || 'localhost',
  port:             parseInt(process.env.DB_PORT) || 3306,
  user:             process.env.DB_USER || 'maintsys_user',
  password:         process.env.DB_PASS || 'maintsys_pass',
  database:         process.env.DB_NAME || 'maintsys_db',
  waitForConnections: true,
  connectionLimit:  15,
  queueLimit:       0,
  decimalNumbers:   true,
  dateStrings:      true,     // DATE i DATETIME dolaze kao string, ne JS Date
  timezone:         '+00:00',
  charset:          'utf8mb4',
});

// Kratki query helper-i – koristiti svugde umesto direktnog pool.query
async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] ?? null;
}

async function execute(sql, params = []) {
  const [result] = await pool.execute(sql, params);
  return result; // { insertId, affectedRows, ... }
}

module.exports = { pool, query, queryOne, execute };
