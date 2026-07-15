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
    const { term, academic_year } = req.query;

    const ac = await pool.query(
      `SELECT ac.*, s.name AS student_name, s.class_id, c.name AS class_name,
              s.gender, s.dob, s.admission_year, s.status, s.photo, s.parent_name, s.parent_phone
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

    // Get subjects that have scores for this student's class (scoped to school)
    const classSubjects = await pool.query(
      `SELECT DISTINCT sub.id, sub.name FROM subjects sub
       INNER JOIN scores sc ON sc.subject_id = sub.id
       INNER JOIN students st ON st.id = sc.student_id
       WHERE st.class_id = $1 AND sub.school_id = $2
       ORDER BY sub.name`,
      [entry.class_id, entry.school_id]
    );

    let scores;
    if (entry.purpose === 'transcript') {
      scores = await pool.query(
        `SELECT sc.subject_id, sub.name AS subject, sc.class_score, sc.exam_score, sc.total, sc.grade, sc.term, sc.academic_year
         FROM scores sc LEFT JOIN subjects sub ON sub.id = sc.subject_id
         WHERE sc.student_id = $1
         ORDER BY sc.academic_year DESC,
           CASE sc.term WHEN 'Term 3' THEN 3 WHEN 'Term 2' THEN 2 ELSE 1 END DESC,
           sub.name`,
        [entry.student_id]
      );
    } else if (term && academic_year) {
      scores = await pool.query(
        `SELECT sc.subject_id, sub.name AS subject, sc.class_score, sc.exam_score, sc.total, sc.grade
         FROM scores sc LEFT JOIN subjects sub ON sub.id = sc.subject_id
         WHERE sc.student_id = $1 AND sc.term = $2 AND sc.academic_year = $3
         ORDER BY sub.name`,
        [entry.student_id, term, academic_year]
      );
    } else {
      // Default: get latest term/year
      const latestResult = await pool.query(
        `SELECT term, academic_year FROM scores
         WHERE student_id = $1 AND term IS NOT NULL AND academic_year IS NOT NULL
         ORDER BY academic_year::text DESC,
           CASE term WHEN 'Term 3' THEN 3 WHEN 'Term 2' THEN 2 ELSE 1 END DESC
         LIMIT 1`,
        [entry.student_id]
      );
      const latest = latestResult.rows[0];

      if (latest) {
        scores = await pool.query(
          `SELECT sc.subject_id, sub.name AS subject, sc.class_score, sc.exam_score, sc.total, sc.grade
           FROM scores sc LEFT JOIN subjects sub ON sub.id = sc.subject_id
           WHERE sc.student_id = $1 AND sc.term = $2 AND sc.academic_year = $3
           ORDER BY sub.name`,
          [entry.student_id, latest.term, latest.academic_year]
        );
      } else {
        // No scores with term/year - get ALL scores for this student
        scores = await pool.query(
          `SELECT sc.subject_id, sub.name AS subject, sc.class_score, sc.exam_score, sc.total, sc.grade
           FROM scores sc LEFT JOIN subjects sub ON sub.id = sc.subject_id
           WHERE sc.student_id = $1
           ORDER BY sub.name`,
          [entry.student_id]
        );
      }
    }

    // If no scores found, return class-scoped subjects with zero values
    const scoresExist = scores.rows.length > 0;
    const finalScores = scoresExist
      ? scores.rows
      : classSubjects.rows.map((sub) => ({
          subject_id: sub.id,
          subject: sub.name,
          class_score: 0,
          exam_score: 0,
          total: 0,
          grade: '-'
        }));

    // Get available terms/years for this student
    const availableTerms = await pool.query(
      `SELECT DISTINCT term, academic_year FROM scores
       WHERE student_id = $1 AND term IS NOT NULL AND academic_year IS NOT NULL
       ORDER BY academic_year::text DESC,
         CASE term WHEN 'Term 3' THEN 3 WHEN 'Term 2' THEN 2 ELSE 1 END DESC`,
      [entry.student_id]
    );

    const school = await pool.query(
      'SELECT name, address, location, phone, email, logo FROM schools WHERE id = $1',
      [entry.school_id]
    );
    const sch = school.rows[0] || {};

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
        parent_phone: entry.parent_phone,
        school_name: sch.name || '',
        school_address: sch.address || '',
        school_location: sch.location || '',
        school_phone: sch.phone || '',
        school_email: sch.email || '',
        school_logo: sch.logo || ''
      },
      scores: finalScores,
      availableTerms: availableTerms.rows
    });
  } catch (err) {
    console.error('Portal report error:', err);
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
