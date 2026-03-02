'use strict';
/**
 * configs/rezervni-delovi.js
 * Rezervni delovi – samo 3 UI panela: Osnovne info, Dnevnik, Servisni nalozi.
 * Nema brojača ni kontrola.
 */
module.exports = {
  typeName: 'Rezervni delovi',
  layout:   'rezervni',
  panels:   ['basicInfo', 'logs', 'serviceOrders'],

  statusOptions: [
    { value: 'Dostupan',    label: 'Dostupan',    color: 'green' },
    { value: 'Nedostupan',  label: 'Nedostupan',  color: 'yellow' },
    { value: 'Otpisan',     label: 'Otpisan',     color: 'gray',  freezeAll: true, hideFromMain: true },
  ],

  basicInfoFields: [
    { key: 'name',          label: 'Naziv',         type: 'text',     required: true },
    { key: 'location',      label: 'Lokacija',      type: 'location', required: true },
    { key: 'manufacturer',  label: 'Proizvođač',    type: 'text'      },
    { key: 'serial_number', label: 'Serijski broj', type: 'text'      },
    { key: 'asset_number',  label: 'Asset broj',    type: 'text'      },
    { key: 'year',          label: 'Godina proiz.', type: 'year'      },
    { key: 'purchase_date', label: 'Datum nabavke', type: 'date'      },
    { key: 'notes',         label: 'Napomena',      type: 'textarea'  },
  ],

  counters: [],
  controls: [],
  listColumnsVariant: 'default',
};
