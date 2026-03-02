'use strict';
/**
 * configs/cng-kompresor.js
 * Konfiguracija za tip opreme: CNG kompresor
 *
 * layout: 'cng'  →  poseban UI (2-kolona info + redovi kontrola, horizontalni brojači)
 * Sve vrednosti su čitane od strane front-enda koji ih dobija kroz /api/configs
 */
module.exports = {
  typeName: 'CNG kompresor',
  layout:   'cng',

  // UI paneli koji se prikazuju (redosled = redosled prikaza)
  panels: ['basicInfo', 'controls', 'counters', 'logs', 'serviceOrders'],

  // Mogući statusi opreme – boja i logika
  statusOptions: [
    { value: 'U radu',    label: 'U radu',    color: 'green'  },
    { value: 'Zastoj',    label: 'Zastoj',    color: 'red',    autoSrv: true  },
    { value: 'Neaktivan', label: 'Neaktivan', color: 'blue',   freezeControls: true, freezeCounters: true },
    { value: 'Otpisan',   label: 'Otpisan',   color: 'gray',   freezeAll: true, hideFromMain: true },
  ],

  // Polja Osnovnih informacija (redosled = redosled u UI)
  basicInfoFields: [
    { key: 'name',               label: 'Naziv',                    type: 'text',     required: true },
    { key: 'equipment_type_name',label: 'Tip opreme',               type: 'readonly'  },
    { key: 'location',           label: 'Lokacija',                 type: 'location', required: true },
    { key: 'manufacturer',       label: 'Proizvođač',               type: 'text'      },
    { key: 'serial_number',      label: 'Serijski broj',            type: 'text'      },
    { key: 'asset_number',       label: 'Asset broj',               type: 'text'      },
    { key: 'year',               label: 'Godina proiz.',            type: 'year'      },
    { key: 'purchase_date',      label: 'Datum nabavke',            type: 'date'      },
    { key: 'compressor_type',    label: 'Tip kompresora',           type: 'text'      },
    { key: 'cooling_type',       label: 'Hlađenje',                 type: 'text'      },
    { key: 'motor_power',        label: 'Snaga motora (kW)',        type: 'text'      },
    { key: 'max_stage',          label: 'Stepen kompresije',        type: 'number'    },
    { key: 'max_capacity',       label: 'Max. kapacitet (Nm³/h)',   type: 'text'      },
    { key: 'min_inlet_pressure', label: 'Min. ulazni pritisak (bar)',type: 'text'     },
    { key: 'max_inlet_pressure', label: 'Max. ulazni pritisak (bar)',type: 'text'     },
    { key: 'priority_panel',     label: 'Priority panel',           type: 'text'      },
    { key: 'notes',              label: 'Napomene',                 type: 'textarea'  },
  ],

  // Brojači – redosled je redosled prikaza
  counters: [
    { name: 'Vreme upotrebe',      unit: '',    type: 'computed', computeFrom: 'purchase_date', readonly: true },
    { name: 'Radni sati',          unit: 'h',   type: 'decimal'  },
    { name: 'Ulazni pritisak',     unit: 'bar', type: 'decimal'  },
    { name: 'Potrošnja energije',  unit: 'kWh', type: 'decimal'  },
    { name: 'Proizvodnja gasa',    unit: 'm³',  type: 'decimal'  },
    { name: 'Startovi kompresora', unit: '',    type: 'integer'  },
  ],

  // Kontrolne operacije
  controls: [
    { name: 'Redovni servis',               intervalValue: 500,  intervalUnit: 'hrad' },
    { name: 'Servis XX',                    intervalValue: 1000, intervalUnit: 'hrad' },
    { name: 'Servis YY',                    intervalValue: 2000, intervalUnit: 'hrad' },
    { name: 'Izmena ulja',                  intervalValue: 500,  intervalUnit: 'hrad' },
    { name: 'Odvlaživanje',                 intervalValue: 168,  intervalUnit: 'hrad' },
    { name: 'Čišćenje kompresora',          intervalValue: 720,  intervalUnit: 'hrad' },
    { name: 'Čišćenje stanice',             intervalValue: 720,  intervalUnit: 'hrad' },
    { name: 'Provera remena',               intervalValue: 500,  intervalUnit: 'hrad' },
    { name: 'Vizuelni pregled',             intervalValue: 168,  intervalUnit: 'hrad' },
    { name: 'Pritisak – stepen I',          intervalValue: 168,  intervalUnit: 'hrad' },
    { name: 'Pritisak – stepen II',         intervalValue: 168,  intervalUnit: 'hrad' },
    { name: 'Pritisak – stepen III',        intervalValue: 168,  intervalUnit: 'hrad' },
    { name: 'Pritisak – stepen IV',         intervalValue: 168,  intervalUnit: 'hrad' },
  ],

  // Kolone u listi opreme kada je filter = CNG kompresor
  listColumnsVariant: 'cng-extended',
};
