'use strict';
// helpers/serial.js – Generisanje broja servisnog naloga (SRV00001...)

const { queryOne } = require('../db/pool');

async function nextOrderNumber() {
  const last = await queryOne(
    'SELECT order_number FROM service_orders ORDER BY id DESC LIMIT 1'
  );
  if (!last) return 'SRV00001';
  const num = parseInt(last.order_number.replace('SRV', ''), 10);
  return 'SRV' + String(num + 1).padStart(5, '0');
}

module.exports = { nextOrderNumber };
