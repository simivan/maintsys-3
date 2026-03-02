'use strict';
/**
 * configs/index.js – Centralni registar konfiguracija tipova opreme.
 *
 * Dodavanje novog tipa:
 *   1. Kreirati configs/naziv-tipa.js po uzoru na postojeće
 *   2. Registrovati ga u TYPE_MAP ispod
 *
 * Svi ostali tipovi automatski dobijaju DEFAULT_TEMPLATE.
 */

const cngKompresor   = require('./cng-kompresor');
const defaultTemplate = require('./default-template');
const rezervniDelovi = require('./rezervni-delovi');

// Mapa: naziv tipa (kako je u bazi) → konfig modul
const TYPE_MAP = {
  'CNG kompresor':   cngKompresor,
  'Rezervni delovi': rezervniDelovi,
};

/**
 * Vraća konfig za dati naziv tipa.
 * Ako tip nije registrovan, vraća defaultTemplate.
 */
function getConfig(typeName) {
  return TYPE_MAP[typeName] ?? defaultTemplate;
}

/**
 * Serializuje konfig za slanje frontendu.
 * Uklanja npr. require() reference koje ne prolaze kroz JSON.
 */
function serializeConfig(cfg) {
  return {
    typeName:         cfg.typeName,
    layout:           cfg.layout,
    panels:           cfg.panels,
    statusOptions:    cfg.statusOptions,
    basicInfoFields:  cfg.basicInfoFields,
    counters:         cfg.counters,
    controls:         cfg.controls,
    listColumnsVariant: cfg.listColumnsVariant,
  };
}

/**
 * Vraća mapu svih konfiga za listu tipova – koristi se pri inicijalizaciji frontenda.
 * @param {string[]} typeNames  - lista naziva tipova iz baze
 */
function getAllConfigs(typeNames) {
  const result = { _default: serializeConfig(defaultTemplate) };
  for (const name of typeNames) {
    result[name] = serializeConfig(getConfig(name));
  }
  return result;
}

module.exports = { getConfig, serializeConfig, getAllConfigs };
