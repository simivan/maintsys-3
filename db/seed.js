'use strict';
// db/seed.js – Demo podaci (ubacuju se samo ako je baza prazna)

const { query, queryOne, execute } = require('./pool');
const { getConfig } = require('../configs');
const { hashPassword } = require('../helpers/auth');
const { today } = require('../helpers/dates');

async function seed() {
  const userCount = (await queryOne('SELECT COUNT(*) AS c FROM users'))?.c ?? 0;
  if (userCount > 0) return; // Baza već ima podatke

  console.log('  ⏳  Ubacivanje demo podataka...');

  // ── Korisnici ──────────────────────────────────────────────────────────────
  await query(`INSERT INTO users (username, password_hash, full_name, role) VALUES
    ('admin',    '${hashPassword('admin123')}',    'Administrator',     'admin'),
    ('menadzer', '${hashPassword('menadzer123')}', 'Petar Petrović',    'menadzer'),
    ('operater', '${hashPassword('operater123')}', 'Marko Marković',    'operater'),
    ('gost',     '${hashPassword('gost123')}',     'Gost Korisnik',     'gost')`);

  // ── Tipovi opreme ──────────────────────────────────────────────────────────
  const typeNames = [
    'CNG kompresor', 'CNG dispanzer', 'CNG merači', 'CNG skladište',
    'Rezervoari tehničkih gasova', 'Pumpe tehničkih gasova',
    'TNG rezervoari', 'TNG pumpe',
    'Rezervoari tečnih goriva', 'Dispenzeri',
    'Ostala oprema', 'Rezervni delovi',
  ];
  for (let i = 0; i < typeNames.length; i++)
    await query('INSERT INTO equipment_types (name, sort_order) VALUES (?, ?)', [typeNames[i], i + 1]);

  // ── Lokacije ───────────────────────────────────────────────────────────────
  const locNames = ['Beograd Sever', 'Beograd Jug', 'Novi Sad', 'Niš', 'Kragujevac'];
  for (let i = 0; i < locNames.length; i++)
    await query('INSERT INTO locations (name, sort_order) VALUES (?, ?)', [locNames[i], i + 1]);

  // ── Pomoćne funkcije za seed ───────────────────────────────────────────────
  const tid = async n => (await queryOne('SELECT id FROM equipment_types WHERE name = ?', [n]))?.id;
  const lid = async n => (await queryOne('SELECT id FROM locations WHERE name = ?', [n]))?.id;

  let srvCounter = 0;
  const nextSrv  = () => 'SRV' + String(++srvCounter).padStart(5, '0');

  async function addEquipment(data) {
    const r = await execute(
      `INSERT INTO equipment (name, equipment_type_id, location_id, manufacturer,
         serial_number, asset_number, year, purchase_date, compressor_type, cooling_type,
         motor_power, max_stage, max_capacity, min_inlet_pressure, max_inlet_pressure,
         priority_panel, notes, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        data.name, data.typeId, data.locId, data.mfr ?? null, data.serial ?? null,
        data.asset ?? null, data.year ?? null, data.purchaseDate ?? null,
        data.ctype ?? null, data.cooling ?? null, data.power ?? null, data.stage ?? null,
        data.maxCap ?? null, data.minP ?? null, data.maxP ?? null, data.panel ?? null,
        data.notes ?? null, data.status ?? 'U radu',
      ]
    );
    const id = r.insertId;

    // Kreiranje brojača i kontrola iz konfiga
    const cfg = getConfig(data.typeName ?? '');
    for (const c of cfg.counters) {
      if (c.type === 'computed') continue;
      const val = data.counters?.[c.name] ?? 0;
      await query('INSERT INTO counters (equipment_id, name, value, unit) VALUES (?,?,?,?)',
        [id, c.name, String(val), c.unit]);
    }
    for (const ctrl of cfg.controls) {
      const ov = data.ctrlOv?.[ctrl.name] ?? {};
      await query(
        `INSERT INTO control_operations
           (equipment_id, name, interval_value, interval_unit, last_value, next_value)
         VALUES (?,?,?,?,?,?)`,
        [id, ctrl.name, ctrl.intervalValue, ctrl.intervalUnit, ov.last ?? '0', ov.next ?? '0']
      );
    }

    // Servisni nalozi
    for (const s of data.srvOrders ?? []) {
      await query(
        `INSERT INTO service_orders
           (equipment_id, order_number, date, operator_name, operating_hours,
            service_note, status, technician, resolution, completion_date)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [id, nextSrv(), s.date, s.op, s.hours ?? 0, s.note,
         s.status ?? 'Otvoren', s.tech ?? '', s.res ?? '', s.comp ?? null]
      );
    }

    // Logovi
    for (const l of data.logs ?? []) {
      await query(
        `INSERT INTO logs
           (equipment_id, operating_hours, operator_name, action_type, action_name, value, confirmation, notes)
         VALUES (?,?,?,?,?,?,?,?)`,
        [id, l.h ?? 0, l.op, l.type, l.action, l.val, l.conf ?? 'OK', l.notes ?? '']
      );
    }
    return id;
  }

  // ── Demo oprema ────────────────────────────────────────────────────────────
  const cngT = await tid('CNG kompresor');
  const cngD = await tid('CNG dispanzer');
  const tngR = await tid('TNG rezervoari');
  const tngP = await tid('TNG pumpe');
  const resT = await tid('Rezervoari tečnih goriva');
  const disT = await tid('Dispenzeri');
  const rdT  = await tid('Rezervni delovi');
  const bs   = await lid('Beograd Sever');
  const bj   = await lid('Beograd Jug');
  const ns   = await lid('Novi Sad');
  const ni   = await lid('Niš');
  const kg   = await lid('Kragujevac');

  await addEquipment({
    name: 'Atlas Copco NGP8+', typeName: 'CNG kompresor', typeId: cngT, locId: bs,
    mfr: 'Atlas Copco', serial: 'AC-NGP8-190432', asset: 'ACC-2024-0042',
    year: 2021, purchaseDate: '2021-03-15',
    ctype: 'Klip, 3-stepeni', cooling: 'Vazdušno', power: '22 kW',
    stage: 3, maxCap: '480', minP: '1.0', maxP: '6.0', panel: 'A',
    counters: { 'Radni sati': 14832, 'Potrošnja energije': 126440, 'Proizvodnja gasa': 1982310, 'Ulazni pritisak': 4.2, 'Startovi kompresora': 2840 },
    ctrlOv: { 'Redovni servis': { last: '14000', next: '14500' }, 'Servis XX': { last: '14000', next: '15000' }, 'Izmena ulja': { last: '14000', next: '14500' } },
    srvOrders: [{ date: '2025-06-17', op: 'P. Petrović', hours: 14820, note: 'Povećana buka – provera ležajeva', status: 'U obradi', tech: 'T. Knežević' }],
    logs: [
      { h: 14832, op: 'M. Marković', type: 'Brojač', action: 'Radni sati', val: '14832', conf: 'OK' },
      { h: 14820, op: 'P. Petrović', type: 'Kontrola', action: 'Redovni servis', val: '14820', conf: 'NOK', notes: 'Buka pri radu' },
    ],
  });

  await addEquipment({
    name: 'Bauer K-MAX 15', typeName: 'CNG kompresor', typeId: cngT, locId: bj,
    mfr: 'Bauer Compressors', serial: 'BK15-221107', asset: 'BAU-2022-0019',
    year: 2022, purchaseDate: '2022-07-10', ctype: 'Klip', cooling: 'Vodeno',
    power: '37 kW', stage: 4, maxCap: '900', minP: '0.5', maxP: '7.0', panel: 'B',
    counters: { 'Radni sati': 9214, 'Potrošnja energije': 84200, 'Proizvodnja gasa': 890000, 'Ulazni pritisak': 5.1, 'Startovi kompresora': 1780 },
    srvOrders: [{ date: '2025-05-10', op: 'M. Marković', hours: 9000, note: 'Redovan godišnji servis', status: 'Zatvoren', tech: 'T. Knežević', res: 'Servis završen uspešno', comp: '2025-05-12' }],
    logs: [{ h: 9214, op: 'M. Marković', type: 'Brojač', action: 'Radni sati', val: '9214', conf: 'OK' }],
  });

  await addEquipment({
    name: 'Galileo NGV-C200', typeName: 'CNG kompresor', typeId: cngT, locId: ns,
    mfr: 'Galileo Technologies', serial: 'GN200-233301', asset: 'GAL-2023-0007',
    year: 2023, purchaseDate: '2023-01-20', ctype: 'Klip', cooling: 'Vazdušno',
    power: '15 kW', stage: 3, maxCap: '350', minP: '1.0', maxP: '5.5', panel: 'C', status: 'Zastoj',
    counters: { 'Radni sati': 4280, 'Potrošnja energije': 38100, 'Proizvodnja gasa': 412000, 'Ulazni pritisak': 3.8, 'Startovi kompresora': 820 },
    ctrlOv: { 'Redovni servis': { last: '4000', next: '4500' } },
    srvOrders: [{ date: '2025-06-15', op: 'M. Marković', hours: 4280, note: 'Kvar – zakazati servis', status: 'Otvoren' }],
    logs: [],
  });

  await addEquipment({
    name: 'Galileo NGV-C100 (Otpisan)', typeName: 'CNG kompresor', typeId: cngT, locId: ni,
    mfr: 'Galileo Technologies', serial: 'GN100-200001', asset: 'GAL-2020-0001',
    year: 2018, purchaseDate: '2018-05-01', status: 'Otpisan',
    notes: 'Otpisan zbog dotrajalosti – 2025-01-10',
    counters: { 'Radni sati': 32450, 'Potrošnja energije': 320000, 'Proizvodnja gasa': 4200000, 'Ulazni pritisak': 0, 'Startovi kompresora': 12300 },
    logs: [],
  });

  await addEquipment({
    name: 'CNG Dispanzer SB-1', typeName: 'CNG dispanzer', typeId: cngD, locId: bs,
    mfr: 'Scheidt & Bachmann', serial: 'SB-CNG1-230001', asset: 'SB-2023-0001',
    year: 2023, purchaseDate: '2023-06-01',
  });
  await addEquipment({
    name: 'TNG Rezervoar R-1', typeName: 'TNG rezervoari', typeId: tngR, locId: bj,
    mfr: 'Vanzetti Engineering', serial: 'VE-TNG-220101', asset: 'VE-2022-0001',
    year: 2022, purchaseDate: '2022-04-10',
    srvOrders: [{ date: '2025-05-10', op: 'M. Marković', hours: 0, note: 'Godišnji pregled', status: 'Zatvoren', tech: 'T. Knežević', res: 'Sve u redu', comp: '2025-05-12' }],
  });
  await addEquipment({
    name: 'TNG Pumpa P-1', typeName: 'TNG pumpe', typeId: tngP, locId: ns,
    mfr: 'Corken', serial: 'COR-P1-230501', asset: 'COR-2023-0001', year: 2023, purchaseDate: '2023-05-15',
  });
  await addEquipment({
    name: 'Rezervoar D-500 Niš', typeName: 'Rezervoari tečnih goriva', typeId: resT, locId: ni,
    mfr: 'Emiliana Serbatoi', serial: 'ES-D500-210301', asset: 'ES-2021-0003', year: 2021, purchaseDate: '2021-09-15',
  });
  await addEquipment({
    name: 'Dispanzer FMT-5 Kragujevac', typeName: 'Dispenzeri', typeId: disT, locId: kg,
    mfr: 'Gilbarco Veeder-Root', serial: 'GVR-FMT5-220501', asset: 'GVR-2022-0005',
    year: 2022, purchaseDate: '2022-08-20',
    srvOrders: [{ date: '2025-06-20', op: 'P. Petrović', hours: 0, note: 'Kalibracija merača', status: 'Otvoren' }],
  });
  await addEquipment({
    name: 'Klip kompresor 22kW (rezervni)', typeName: 'Rezervni delovi', typeId: rdT, locId: bs,
    mfr: 'Atlas Copco', serial: 'SP-KLIP-001', asset: 'SP-2023-0001',
    year: 2023, purchaseDate: '2023-11-01', status: 'Dostupan',
    notes: 'Rezervni klip za NGP8+',
  });

  console.log('  ✅  Demo podaci uspešno ubačeni.');
}

module.exports = { seed };
