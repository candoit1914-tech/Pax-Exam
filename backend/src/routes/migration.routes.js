import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import pool from '../config/database.js';

const router = Router();

router.post('/run-003', authenticate, authorize('super_admin'), async (req, res, next) => {
  try {
    const results = [];

    try {
      await pool.query('ALTER TABLE students ADD COLUMN IF NOT EXISTS login_code VARCHAR(20) UNIQUE');
      results.push('Added login_code column');
    } catch (e) { results.push(`login_code: ${e.message}`); }

    try {
      await pool.query('ALTER TABLE students ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL');
      results.push('Added user_id column');
    } catch (e) { results.push(`user_id: ${e.message}`); }

    try {
      await pool.query('CREATE INDEX IF NOT EXISTS idx_students_login_code ON students(login_code) WHERE login_code IS NOT NULL');
      results.push('Created login_code index');
    } catch (e) { results.push(`login_code index: ${e.message}`); }

    try {
      await pool.query('CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id) WHERE user_id IS NOT NULL');
      results.push('Created user_id index');
    } catch (e) { results.push(`user_id index: ${e.message}`); }

    try {
      await pool.query("UPDATE students SET login_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8)) WHERE login_code IS NULL");
      results.push('Generated login codes for existing students');
    } catch (e) { results.push(`generate codes: ${e.message}`); }

    res.json({ message: 'Migration 003 complete', results });
  } catch (err) {
    next(err);
  }
});

export default router;
