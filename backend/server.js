import 'dotenv/config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import app from './src/app.js';
import pool from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

async function runMigrations() {
  const sql = fs.readFileSync(path.join(__dirname, 'migrations', '001_initial_schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('Schema migration applied');
}

async function seedAdmin() {
  const email = process.env.DEFAULT_ADMIN_EMAIL || 'admin@school.com';
  const password = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@12345';

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) return;

  const school = await pool.query('SELECT id FROM schools LIMIT 1');
  const schoolId = school.rows[0]?.id || 1;

  const hash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO users (school_id, email, password_hash, role, name)
     VALUES ($1, $2, $3, 'super_admin', 'Default Admin')`,
    [schoolId, email, hash]
  );
  console.log('Default admin user seeded');
}

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log('Connected to Postgres');

    await runMigrations();
    await seedAdmin();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'production'} mode`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
