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

async function logGeneration(record) {
  try {
    await pool.execute(
      `INSERT INTO \`${TABLE}\`
        (client_name, address, bc_number, system, substrate, structure, location, new_or_existing, ps3_generated, filename)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.client_name,
        record.address,
        record.bc_number || null,
        record.system,
        record.substrate,
        record.structure,
        record.location,
        record.new_or_existing,
        record.ps3_generated ? 1 : 0,
        record.filename
      ]
    );
  } catch (err) {
    console.error('DB log error:', err.message);
  }
}

async function getRecords(limit = 50) {
  const [rows] = await pool.execute(
    `SELECT * FROM \`${TABLE}\` ORDER BY created_at DESC LIMIT ?`,
    [limit]
  );
  return rows;
}

module.exports = { logGeneration, getRecords };
