'use strict';
/**
 * server.js – MAINTSYS Maintenance System v2.1
 */

const express = require('express');
const path    = require('path');

try {
  require('fs').readFileSync('.env','utf8').split('\n').forEach(line=>{
    const m=line.match(/^([^#=\s]+)\s*=\s*(.+)$/);
    if(m&&!process.env[m[1]])process.env[m[1]]=m[2].trim();
  });
} catch(_){}

const { initSchema } = require('./db/schema');
const { seed }       = require('./db/seed');
const { getAllConfigs } = require('./configs');
const { query, queryOne, execute } = require('./db/pool');
const { requireAuth } = require('./middleware/auth');

const APP_VERSION = '2.1';
const app = express();
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname,'public')));

// Rute
app.use('/api/auth',           require('./routes/auth'));
app.use('/api/types',          require('./routes/types'));
app.use('/api/locations',      require('./routes/locations'));
app.use('/api/users',          require('./routes/users'));
app.use('/api/service-orders', require('./routes/serviceOrders'));
app.use('/api/equipment',      require('./routes/equipment'));
app.use('/api/equipment/:equipId/counters', require('./routes/counters'));
app.use('/api/equipment/:equipId/controls', require('./routes/controls'));
app.use('/api/equipment/:equipId/logs',     require('./routes/logs'));

// Servisni nalozi po opremi
app.get('/api/equipment/:equipId/service-orders', requireAuth, async(req,res)=>{
  res.json(await query('SELECT * FROM service_orders WHERE equipment_id=? ORDER BY id DESC',[req.params.equipId]));
});

app.post('/api/equipment/:equipId/service-orders', requireAuth, async(req,res)=>{
  const equipId=req.params.equipId;
  if(!['admin','menadzer','operater'].includes(req.user.role)) return res.status(403).json({error:'Nemate privilegije.'});
  const eq=await queryOne(`SELECT e.status,et.name as type_name FROM equipment e LEFT JOIN equipment_types et ON et.id=e.equipment_type_id WHERE e.id=?`,[equipId]);
  if(!eq) return res.status(404).json({error:'Oprema nije pronađena.'});
  const cfg=require('./configs').getConfig(eq.type_name||'');
  const opt=cfg.statusOptions?.find(o=>o.value===eq.status);
  if(opt?.freezeAll) return res.status(403).json({error:'Kreiranje naloga je onemogućeno za otpisanu opremu.'});
  const b=req.body;
  if(!b.service_note?.trim()) return res.status(400).json({error:'Opis servisa je obavezan.'});
  const orderNumber=await require('./helpers/serial').nextOrderNumber();
  const r=await execute(`INSERT INTO service_orders(equipment_id,order_number,date,operator_name,operating_hours,service_note,status,technician,resolution,ticket_url)VALUES(?,?,?,?,?,?,?,?,?,?)`,[equipId,orderNumber,b.date||require('./helpers/dates').today(),req.user.full_name,b.operating_hours||0,b.service_note,b.status||'Otvoren',b.technician||'',b.resolution||'',b.ticket_url||null]);
  res.json({id:r.insertId,order_number:orderNumber});
});

// Configs + version
app.get('/api/configs', requireAuth, async(req,res)=>{
  const types=await query('SELECT name FROM equipment_types ORDER BY sort_order');
  res.json(getAllConfigs(types.map(t=>t.name)));
});
app.get('/api/version',(_,res)=>res.json({version:APP_VERSION}));

app.use((err,req,res,_)=>{
  console.error('[ERROR]',err.message);
  res.status(500).json({error:'Interna greška servera.'});
});

async function start(){
  await initSchema();
  await seed();
  const PORT=parseInt(process.env.PORT)||3000;
  app.listen(PORT,()=>{
    console.log(`\n  MAINTSYS v${APP_VERSION}  →  http://localhost:${PORT}`);
    console.log('  admin/admin123  menadzer/menadzer123  operater/operater123  gost/gost123\n');
  });
}
start().catch(err=>{
  console.error('Greška pri pokretanju:',err.message);
  console.error('Proverite MariaDB konekciju (.env fajl)');
  process.exit(1);
});
