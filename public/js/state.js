// public/js/state.js – Centralni state aplikacije (reaktivni store)
// Sve promene stanja se vrše ISKLJUČIVO kroz exported setter funkcije.

export const state = {
  // Auth
  token: localStorage.getItem('ems_token'),
  user:  JSON.parse(localStorage.getItem('ems_user') || 'null'),

  // Reference data
  types:   [],
  locs:    [],
  configs: {},

  // Equipment list (filtrirano)
  allEq: [],
  filterTypeId: '',
  filterLocId:  '',

  // Current view: 'dashboard' | 'equipment' | 'admin' | 'otpisana'
  view:    'dashboard',
  equipId: null,

  // Equipment detail
  detail:   null,
  logs:     [],
  services: [],

  // Dashboard – svi servisni nalozi (za modal)
  allSrvs: [],

  // Sidebar state (koje type-grupe su otvorene)
  sbOpen: {},

  // Admin
  adminTab: 'users',
  users:    [],

  // Sort state za big modals
  logSort:    { field: 'id',   asc: false },
  srvSort:    { field: 'id',   asc: false },
  allSrvSort: { field: 'id',   asc: false },

  // Pending dialog data
  pendingCounter:  null,   // { counterId, name, value, unit }
  pendingControl:  null,   // { controlId, name, unit, opH }
  pendingCtrlData: null,   // { value, note } – privremeno dok čekamo NOK potvrdu
  pendingStatus:   null,   // { equipId, currentStatus, typeId }
  editSrvId:       null,
  editUserId:      null,
  addItemMode:     null,   // 'type' | 'location'
  editItemId:      null,   // id stavke koja se edituje (tip/lokacija)
};

// Prava pristupa – centralna logika
export const can = {
  write:        () => ['admin', 'menadzer', 'operater'].includes(state.user?.role),
  manage:       () => ['admin', 'menadzer'].includes(state.user?.role),
  admin:        () => state.user?.role === 'admin',
  createSrv:    () => ['admin', 'menadzer', 'operater'].includes(state.user?.role),
  editSrv:      () => ['admin', 'menadzer'].includes(state.user?.role),
  viewOtpisana: () => ['admin', 'menadzer'].includes(state.user?.role),
  changeStatus: () => ['admin', 'menadzer', 'operater'].includes(state.user?.role),
};

// Dohvata konfig za tip opreme po imenu
export function getEquipCfg(typeName) {
  return state.configs[typeName] ?? state.configs['_default'] ?? {
    panels: ['basicInfo', 'counters', 'controls', 'logs', 'serviceOrders'],
    layout: 'standard',
    statusOptions: [],
    basicInfoFields: [],
    counters: [],
    controls: [],
  };
}

// Dohvata konfig za opremu prema type_id
export function getEquipCfgById(typeId) {
  const t = state.types.find(x => x.id == typeId);
  return getEquipCfg(t?.name ?? '');
}

// Da li je aktivan filter za CNG kompresore
export function isCNGFilter() {
  if (!state.filterTypeId) return false;
  const t = state.types.find(x => x.id == state.filterTypeId);
  return t?.name === 'CNG kompresor';
}

// Zamrznutost opreme prema statusu
export function isEquipFrozen(eq) {
  const cfg = getEquipCfg(eq?.type_name ?? '');
  const opt = cfg.statusOptions?.find(o => o.value === eq?.status);
  return {
    all:      opt?.freezeAll      ?? false,
    controls: opt?.freezeAll || opt?.freezeControls ?? false,
    counters: opt?.freezeAll || opt?.freezeCounters ?? false,
  };
}
