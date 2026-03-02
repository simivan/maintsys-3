'use strict';
// db/schema.js – Kreiranje šeme i migracije
// Idempotentno: može se pokrenuti više puta bez grešaka.

const { query } = require('./pool');

async function initSchema() {
  // UTF8MB4 za svu srpsku dijakritiku
  await query(`CREATE TABLE IF NOT EXISTS users (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    username     VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name    VARCHAR(200) NOT NULL,
    role         ENUM('admin','menadzer','operater','gost') NOT NULL,
    active       TINYINT(1) DEFAULT 1,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await query(`CREATE TABLE IF NOT EXISTS sessions (
    token      VARCHAR(100) PRIMARY KEY,
    user_id    INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await query(`CREATE TABLE IF NOT EXISTS equipment_types (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(200) UNIQUE NOT NULL,
    sort_order INT DEFAULT 0
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await query(`CREATE TABLE IF NOT EXISTS locations (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(200) UNIQUE NOT NULL,
    sort_order INT DEFAULT 0
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await query(`CREATE TABLE IF NOT EXISTS equipment (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    name                VARCHAR(200) NOT NULL,
    equipment_type_id   INT,
    location_id         INT,
    manufacturer        VARCHAR(200),
    serial_number       VARCHAR(200),
    asset_number        VARCHAR(200),
    year                SMALLINT,
    purchase_date       DATE,
    compressor_type     VARCHAR(200),
    cooling_type        VARCHAR(200),
    motor_power         VARCHAR(100),
    max_stage           TINYINT,
    max_capacity        VARCHAR(100),
    min_inlet_pressure  VARCHAR(50),
    max_inlet_pressure  VARCHAR(50),
    priority_panel      VARCHAR(10),
    notes               TEXT,
    status              VARCHAR(50) NOT NULL DEFAULT 'U radu',
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (equipment_type_id),
    INDEX (location_id),
    INDEX (status),
    FOREIGN KEY (equipment_type_id) REFERENCES equipment_types(id),
    FOREIGN KEY (location_id)       REFERENCES locations(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await query(`CREATE TABLE IF NOT EXISTS counters (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    equipment_id INT NOT NULL,
    name         VARCHAR(200) NOT NULL,
    value        VARCHAR(100) DEFAULT '0',
    unit         VARCHAR(50),
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX (equipment_id),
    FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await query(`CREATE TABLE IF NOT EXISTS control_operations (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    equipment_id   INT NOT NULL,
    name           VARCHAR(200) NOT NULL,
    interval_value DECIMAL(10,2) DEFAULT 0,
    interval_unit  VARCHAR(20)   DEFAULT 'hrad',
    last_value     VARCHAR(100)  DEFAULT '0',
    next_value     VARCHAR(100)  DEFAULT '0',
    last_updated   DATETIME,
    INDEX (equipment_id),
    FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await query(`CREATE TABLE IF NOT EXISTS logs (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    equipment_id   INT NOT NULL,
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    operating_hours DECIMAL(12,2) DEFAULT 0,
    operator_name  VARCHAR(200),
    action_type    VARCHAR(100),
    action_name    VARCHAR(200),
    value          TEXT,
    next_value     TEXT,
    confirmation   VARCHAR(10) DEFAULT 'OK',
    notes          TEXT,
    INDEX (equipment_id),
    INDEX (created_at),
    FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await query(`CREATE TABLE IF NOT EXISTS service_orders (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    equipment_id    INT NOT NULL,
    order_number    VARCHAR(20) UNIQUE NOT NULL,
    date            DATE,
    operator_name   VARCHAR(200),
    operating_hours DECIMAL(12,2) DEFAULT 0,
    service_note    TEXT,
    status          VARCHAR(20) DEFAULT 'Otvoren',
    technician      VARCHAR(200),
    resolution      TEXT,
    completion_date DATE,
    ticket_url      TEXT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (equipment_id),
    INDEX (status),
    FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await runMigrations();
}

// Migracioni patch-evi za postojeće baze – idempotentni
async function runMigrations() {
  const addColIfMissing = async (table, col, definition) => {
    try { await query(`ALTER TABLE ${table} ADD COLUMN ${col} ${definition}`); }
    catch(_) {} // kolona već postoji – ignorisati grešku
  };
  await addColIfMissing('equipment',       'purchase_date',    'DATE AFTER year');
  await addColIfMissing('service_orders',  'ticket_url',       'TEXT AFTER completion_date');
  await addColIfMissing('service_orders',  'operating_hours',  'DECIMAL(12,2) DEFAULT 0 AFTER operator_name');
}

module.exports = { initSchema };
