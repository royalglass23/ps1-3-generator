'use strict';

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306', 10),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 5
});

const TABLE = `${process.env.DB_PREFIX || 'wp_'}ps1_records`;

// Add new columns to existing installs without breaking anything
(async () => {
  const migrations = [
    'ALTER TABLE `' + TABLE + '` ADD COLUMN `thickness` VARCHAR(5) DEFAULT NULL',
    'ALTER TABLE `' + TABLE + '` ADD COLUMN `lot_description` VARCHAR(300) DEFAULT NULL',
  ];
  for (const sql of migrations) {
    try { await pool.execute(sql); } catch (_) { /* column already exists */ }
  }
})();

async function logGeneration(record) {
  try {
    await pool.execute(
      `INSERT INTO \`${TABLE}\`
        (client_name, address, bc_number, lot_description, system, substrate, structure, location, new_or_existing, thickness, ps3_generated, filename)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.client_name,
        record.address,
        record.bc_number    || null,
        record.lot_description || null,
        record.system,
        record.substrate,
        record.structure,
        record.location,
        record.new_or_existing,
        record.thickness    || null,
        record.ps3_generated ? 1 : 0,
        record.filename
      ]
    );
  } catch (err) {
    console.error('DB log error:', err.message);
  }
}

async function getRecords(limit = 20, offset = 0) {
  const [rows] = await pool.execute(
    `SELECT * FROM \`${TABLE}\` ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM \`${TABLE}\``
  );
  return { rows, total: Number(total) };
}

module.exports = { logGeneration, getRecords };
