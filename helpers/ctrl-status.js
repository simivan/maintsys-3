'use strict';
// helpers/ctrl-status.js – Računanje statusa kontrolne operacije
// Vraća: 'ok' | 'uskoro' | 'kasni' | 'none'

function ctrlStatus(ctrl, currentOpHours) {
  const unit      = ctrl.interval_unit;
  const nextVal   = ctrl.next_value;
  const interval  = parseFloat(ctrl.interval_value) || 0;

  if (!nextVal || nextVal === '0') return 'none';

  // Sati-bazirana logika (hrad = radni sati)
  if (unit === 'hrad') {
    const next    = parseFloat(nextVal) || 0;
    if (!next) return 'none';
    const opH     = parseFloat(currentOpHours) || 0;
    const thresh  = interval * 0.15;
    if (opH >= next)          return 'kasni';
    if ((next - opH) <= thresh) return 'uskoro';
    return 'ok';
  }

  // Datum-bazirana logika (dan, god)
  const todayMs = new Date().setHours(0, 0, 0, 0);
  const nextMs  = new Date(nextVal).setHours(0, 0, 0, 0);
  if (isNaN(nextMs)) return 'none';

  const diffDays   = (nextMs - todayMs) / 86_400_000;
  const intervalDays = unit === 'god' ? interval * 365 : interval;
  const threshDays   = intervalDays * 0.15;

  if (diffDays <= 0)           return 'kasni';
  if (diffDays <= threshDays)  return 'uskoro';
  return 'ok';
}

module.exports = { ctrlStatus };
