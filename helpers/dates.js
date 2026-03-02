'use strict';
// helpers/dates.js – Pomoćne funkcije za datume

function today() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

function addDays(dateStr, days) {
  const d = new Date(dateStr || new Date());
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function addYears(dateStr, years) {
  const d = new Date(dateStr || new Date());
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().split('T')[0];
}

// Računa razliku od datuma nabavke do danas: "2 god, 3 mes" ili "5 mes"
function calcVremeUpotrebe(purchaseDate) {
  if (!purchaseDate) return null;
  const start = new Date(purchaseDate);
  const now   = new Date();
  const totalMonths = (now.getFullYear() - start.getFullYear()) * 12
                    + (now.getMonth() - start.getMonth());
  if (totalMonths < 0) return '< 1 mes';
  const years  = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (years === 0 && months === 0) return '< 1 mes';
  if (years === 0) return `${months} mes`;
  if (months === 0) return `${years} god`;
  return `${years} god, ${months} mes`;
}

module.exports = { today, addDays, addYears, calcVremeUpotrebe };
