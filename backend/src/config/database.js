import pg from 'pg';
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || process.env.PG_CONNECTION;

if (!connectionString) {
  throw new Error('DATABASE_URL or PG_CONNECTION environment variable is required');
}

const pool = new Pool({
  connectionString,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: parseInt(process.env.PG_MAX_CLIENTS || '10', 10),
  idleTimeoutMillis: 30000,
});

export default pool;
