import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import pool from '../config/database.js';

const router = Router();

router.post('/generate-code', authenticate, authorize('super_admin', 'school_admin'), async (req, res, next) => {
  try {
    const { studentId, purpose } = req.body;
    if (!studentId) return res.status(400).json({ error: 'Student ID is required.' });

    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    await pool.query(
      `INSERT INTO access_codes (school_id, student_id, code, purpose, expires_at, created_by)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days', $5)`,
      [req.user.school_id, studentId, code, purpose || 'report', req.user.id]
    );

    res.status(201).json({ code, message: 'Access code generated. Valid for 7 days.' });
  } catch (err) {
    next(err);
  }
});

router.get('/report/:code', async (req, res, next) => {
  try {
    const { code } = req.params;
    const ac = await pool.query(
      `SELECT ac.*, s.name AS student_name, s.class_id, c.name AS class_name,
              s.gender, s.dob, s.admission_year, s.status, s.photo, s.parent_name
       FROM access_codes ac
       JOIN students s ON s.id = ac.student_id
       JOIN classes c ON c.id = s.class_id
       WHERE ac.code = $1 AND ac.is_used = false AND ac.expires_at > NOW()`,
      [code]
    );
    if (ac.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired access code.' });
    }

    const entry = ac.rows[0];
    const scores = await pool.query(
      `SELECT sub.name AS subject, sc.class_score, sc.exam_score, sc.total, sc.grade
       FROM scores sc JOIN subjects sub ON sub.id = sc.subject_id
       WHERE sc.student_id = $1 AND sc.term = $2 AND sc.academic_year = $3
       ORDER BY sub.name`,
      [entry.student_id, entry.purpose === 'transcript' ? null : 'Term 1', '2025']
    );

    const school = await pool.query('SELECT name FROM schools WHERE id = $1', [entry.school_id]);

    res.json({
      student: {
        id: entry.student_id,
        name: entry.student_name,
        class: entry.class_name,
        gender: entry.gender,
        dob: entry.dob,
        admission_year: entry.admission_year,
        status: entry.status,
        photo: entry.photo,
        parent_name: entry.parent_name,
        school_name: school.rows[0]?.name || ''
      },
      scores: scores.rows
    });
  } catch (err) {
    next(err);
  }
});

router.post('/redeem-code', async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Code is required.' });

    const result = await pool.query(
      `UPDATE access_codes SET is_used = true WHERE code = $1 AND is_used = false AND expires_at > NOW() RETURNING id`,
      [code]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired code.' });
    }
    res.json({ message: 'Code redeemed.' });
  } catch (err) {
    next(err);
  }
});

router.get('/codes', authenticate, authorize('super_admin', 'school_admin'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT ac.*, s.name AS student_name FROM access_codes ac
       JOIN students s ON s.id = ac.student_id
       WHERE ac.school_id = $1 ORDER BY ac.created_at DESC LIMIT 50`,
      [req.user.school_id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

export default router;
