import 'dotenv/config';
import app from './src/app.js';
import pool from './src/config/database.js';

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log('Connected to Neon PostgreSQL database');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'production'} mode`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
