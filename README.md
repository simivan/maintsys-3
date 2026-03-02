# EMS – Evidencija i upravljanje tehničkom opremom

**Verzija 2.1** | Node.js + Express + MariaDB | Single-Page Application

---

## Struktura projekta

```
ems-final/
├── server.js                  ← Ulaz, routing, pokretanje
├── package.json
├── .env.example               ← Kopirati u .env
│
├── db/
│   ├── pool.js                ← MariaDB connection pool (singleton)
│   ├── schema.js              ← DDL – kreiranje tabela, migracije
│   └── seed.js                ← Demo podaci (ubacuju se jednom)
│
├── configs/
│   ├── index.js               ← Registar tipova → getConfig(typeName)
│   ├── cng-kompresor.js       ← Custom konfig za CNG kompresor
│   ├── default-template.js    ← Default za sve ostale tipove
│   └── rezervni-delovi.js     ← Poseban konfig za rezervne delove
│
├── helpers/
│   ├── auth.js                ← hashPassword, generateToken
│   ├── dates.js               ← today(), addDays(), calcVremeUpotrebe()
│   ├── ctrl-status.js         ← ctrlStatus() – ok/uskoro/kasni/none
│   └── serial.js              ← nextOrderNumber() – SRV00001...
│
├── middleware/
│   ├── auth.js                ← requireAuth – Bearer token provjera
│   └── roles.js               ← allow(), canWrite, canManage, adminOnly
│
├── routes/
│   ├── auth.js                ← POST /api/auth/login, /logout
│   ├── equipment.js           ← GET/POST/PUT/DELETE /api/equipment
│   ├── counters.js            ← PUT /api/equipment/:id/counters/:cid
│   ├── controls.js            ← PUT /api/equipment/:id/controls/:cid
│   ├── logs.js                ← GET /api/equipment/:id/logs
│   ├── serviceOrders.js       ← GET/PUT/DELETE /api/service-orders
│   ├── types.js               ← CRUD /api/types
│   ├── locations.js           ← CRUD /api/locations
│   └── users.js               ← CRUD /api/users
│
└── public/
    ├── index.html             ← SPA shell + svi dialozi + bootstrap
    ├── css/
    │   └── app.css            ← Kompletni CSS (font base 14.3px)
    └── js/
        ├── state.js           ← Centralni state + can.* privilegije
        ├── utils.js           ← esc, fmtNum, fmtDate, showToast, ...
        ├── api.js             ← Sve API pozive prema backendu
        ├── app.js             ← Orkestrater: startApp, navigacija
        ├── auth.js            ← loginSubmit, performLogout
        ├── sidebar.js         ← Accordion sidebar sa opremom
        ├── dashboard.js       ← Dashboard kartice + lista opreme
        ├── equipment.js       ← Detalji opreme (CNG/standard/rezervni)
        ├── modals.js          ← Prošireni prikazi (dnevnik, servisni)
        ├── admin.js           ← Admin panel (korisnici, tipovi, lokacije)
        ├── otpisana.js        ← Lista otpisane opreme
        └── dialogs/
            ├── counter.js     ← Dialog za ažuriranje brojača
            ├── control.js     ← Dialog za unos kontrolnih operacija
            ├── edit.js        ← Dialog za izmenu/dodavanje opreme
            ├── service-order.js ← Dialog za servisne naloge
            └── status.js      ← Dialog za promenu statusa opreme
```

---

## Podešavanje i pokretanje

### 1. Baza podataka (MariaDB / MySQL)

```sql
CREATE DATABASE ems_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ems_user'@'localhost' IDENTIFIED BY 'ems_password';
GRANT ALL PRIVILEGES ON ems_db.* TO 'ems_user'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Konfiguracija

```bash
cp .env.example .env
# Izmeniti .env prema vašim podešavanjima
```

`.env` fajl:
```
DB_HOST=localhost
DB_USER=ems_user
DB_PASS=ems_password
DB_NAME=ems_db
DB_PORT=3306
PORT=3000
```

### 3. Instalacija i pokretanje

```bash
npm install
npm start
```

Aplikacija kreira šemu i ubacuje demo podatke automatski pri prvom pokretanju.  
Pristup: **http://localhost:3000**

---

## Testni nalozi

| Korisnik    | Lozinka       | Uloga         |
|-------------|---------------|---------------|
| admin       | admin123      | Administrator |
| menadzer    | menadzer123   | Menadžer      |
| operater    | operater123   | Operater      |
| gost        | gost123       | Gost          |

---

## Uloge i privilegije

| Akcija                          | Gost | Operater | Menadžer | Admin |
|---------------------------------|------|----------|----------|-------|
| Pregled opreme i dnevnika       | ✓    | ✓        | ✓        | ✓     |
| Unos brojača i kontrola         |      | ✓        | ✓        | ✓     |
| Promena statusa opreme          |      | ✓        | ✓        | ✓     |
| Kreiranje servisnih naloga      |      | ✓        | ✓        | ✓     |
| Izmena servisnih naloga         |      |          | ✓        | ✓     |
| Izmena podataka o opremi        |      |          | ✓        | ✓     |
| Pregled otpisane opreme         |      |          | ✓        | ✓     |
| Vraćanje otpisane opreme        |      |          |          | ✓     |
| Dodavanje/brisanje opreme       |      |          |          | ✓     |
| Admin panel (kor./tip./lok.)    |      |          |          | ✓     |

---

## Dodavanje novog tipa opreme

1. Kreirati `configs/naziv-tipa.js` po uzoru na `configs/default-template.js`
2. Registrovati ga u `configs/index.js` → `TYPE_MAP`
3. Restartovati server

Tipovi bez sopstvenog konfiga automatski koriste `default-template.js`.

---

## API pregled

```
POST   /api/auth/login
POST   /api/auth/logout

GET    /api/equipment                    # lista (filter: typeId, locationId, otpisana)
GET    /api/equipment/:id                # detalji jedne opreme
POST   /api/equipment                    # nova oprema (admin)
PUT    /api/equipment/:id                # izmena podataka (menadžer+)
DELETE /api/equipment/:id                # brisanje (admin)
PUT    /api/equipment/:id/status         # promena statusa

PUT    /api/equipment/:id/counters/:cid  # ažuriranje brojača
PUT    /api/equipment/:id/controls/:cid  # unos kontrolne operacije
GET    /api/equipment/:id/logs           # dnevnik rada
GET    /api/equipment/:id/service-orders # servisni nalozi po opremi
POST   /api/equipment/:id/service-orders # novi nalog

GET    /api/service-orders               # svi nalozi (filter: typeId, locationId)
PUT    /api/service-orders/:id           # izmena naloga
DELETE /api/service-orders/:id           # brisanje (admin)

GET    /api/types         POST /api/types
PUT    /api/types/:id     DELETE /api/types/:id
GET    /api/locations     POST /api/locations
PUT    /api/locations/:id DELETE /api/locations/:id
GET    /api/users         POST /api/users
PUT    /api/users/:id     DELETE /api/users/:id

GET    /api/configs        # konfigi svih tipova (za frontend)
GET    /api/version
```
