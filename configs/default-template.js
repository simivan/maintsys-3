'use strict';
/**
 * configs/default-template.js
 * Podrazumevani konfig koji se primenjuje na sve tipove opreme
 * koji nemaju sopstveni konfig fajl.
 *
 * Novi tip kreiran u Admin panelu automatski dobija ovaj template.
 */
module.exports = {
  typeName: '__default__',
  layout:   'standard',
  panels:   ['basicInfo', 'counters', 'controls', 'logs', 'serviceOrders'],

  statusOptions: [
    { value: 'U radu',    label: 'U radu',    color: 'green'  },
    { value: 'Zastoj',    label: 'Zastoj',    color: 'red',    autoSrv: true  },
    { value: 'Neaktivan', label: 'Neaktivan', color: 'blue',   freezeControls: true, freezeCounters: true },
    { value: 'Otpisan',   label: 'Otpisan',   color: 'gray',   freezeAll: true, hideFromMain: true },
  ],

  basicInfoFields: [
    { key: 'name',               label: 'Naziv',          type: 'text',     required: true },
    { key: 'equipment_type_name',label: 'Tip opreme',     type: 'readonly'  },
    { key: 'location',           label: 'Lokacija',       type: 'location', required: true },
    { key: 'manufacturer',       label: 'Proizvođač',     type: 'text'      },
    { key: 'serial_number',      label: 'Serijski broj',  type: 'text'      },
    { key: 'asset_number',       label: 'Asset broj',     type: 'text'      },
    { key: 'year',               label: 'Godina proiz.',  type: 'year'      },
    { key: 'purchase_date',      label: 'Datum nabavke',  type: 'date'      },
    { key: 'notes',              label: 'Napomene',       type: 'textarea'  },
  ],

  counters: [
    {
      name: 'Vreme upotrebe', unit: '', type: 'computed',
      computeFrom: 'purchase_date', readonly: true,
      help: 'Prikazuje se automatski od datuma nabavke.',
    },
  ],

  // Datum-bazirane kontrole (interval_unit: 'dan' | 'god')
  controls: [
    {
      name: 'Redovni servis',
      intervalValue: 1, intervalUnit: 'god',
      help: 'Godišnji servis. Unosom se potvrđuje da je servis urađen.',
    },
    {
      name: 'Čišćenje',
      intervalValue: 10, intervalUnit: 'dan',
      help: 'Interval 10 dana. Odbrojava dane do sledećeg čišćenja.',
    },
    {
      name: 'Vizuelni pregled',
      intervalValue: 1, intervalUnit: 'dan',
      help: 'Dnevni pregled (24h).',
    },
  ],

  listColumnsVariant: 'default',
};
