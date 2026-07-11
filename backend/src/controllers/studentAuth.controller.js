import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import { SchoolModel } from '../models/school.model.js';

function generateTokens(user) {
  const accessToken = jwt.sign(
    { userId: user.id, schoolId: user.school_id, role: user.role, studentId: user.student_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
  return { accessToken, refreshToken };
}

export const StudentAuthController = {
  async login(req, res, next) {
    try {
      const { loginCode } = req.body;
      if (!loginCode) {
        return res.status(400).json({ error: 'Login code is required.' });
      }

      const sanitizedCode = loginCode.toUpperCase().trim();

      // Find student by login code
      const studentResult = await pool.query(
        `SELECT s.*, c.name as class_name 
         FROM students s 
         LEFT JOIN classes c ON s.class_id = c.id 
         WHERE s.login_code = $1 AND s.status = 'active'`,
        [sanitizedCode]
      );

      if (studentResult.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid or inactive student code.' });
      }

      const student = studentResult.rows[0];

      // Check if student already has a user account
      let userId;
      let isNewLogin = false;

      if (student.user_id) {
        // Existing user account - login normally
        userId = student.user_id;
      } else {
        // First time login - create a user account
        isNewLogin = true;
        const email = `student${student.id}@${student.school_id}.school`;
        const tempPassword = student.login_code;
        const passwordHash = await bcrypt.hash(tempPassword, 12);

        const userResult = await pool.query(
          `INSERT INTO users (school_id, email, password_hash, role, name, is_active)
           VALUES ($1, $2, $3, 'student', $4, true)
           RETURNING id`,
          [student.school_id, email, passwordHash, student.name]
        );

        userId = userResult.rows[0].id;

        // Update student record with user_id
        await pool.query(
          'UPDATE students SET user_id = $1 WHERE id = $2',
          [userId, student.id]
        );
      }

      // Get user details
      const userResult = await pool.query(
        'SELECT id, email, role, name, school_id FROM users WHERE id = $1',
        [userId]
      );

      const user = userResult.rows[0];
      const school = await SchoolModel.findById(user.school_id);

      // Generate tokens
      const tokens = generateTokens({ ...user, student_id: student.id });

      // Store refresh token
      await pool.query(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'30 days\')',
        [user.id, tokens.refreshToken]
      );

      // Update last login
      await pool.query(
        'UPDATE users SET last_login = NOW() WHERE id = $1',
        [user.id]
      );

      res.json({
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
          school_id: user.school_id,
          school_name: school?.name || '',
          student_id: student.id,
          student_name: student.name,
          class_name: student.class_name,
          class_id: student.class_id
        },
        isNewLogin
      });
    } catch (err) {
      next(err);
    }
  },

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token required.' });
      }

      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
      const stored = await pool.query(
        'SELECT * FROM refresh_tokens WHERE token = $1 AND user_id = $2 AND expires_at > NOW()',
        [refreshToken, decoded.userId]
      );
      if (stored.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid or expired refresh token.' });
      }

      // Get user and student info
      const userResult = await pool.query(
        'SELECT id, email, role, name, school_id FROM users WHERE id = $1 AND is_active = true',
        [decoded.userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({ error: 'User not found.' });
      }

      const user = userResult.rows[0];

      // Get student info if user is a student
      let studentInfo = null;
      if (user.role === 'student') {
        const studentResult = await pool.query(
          `SELECT s.id as student_id, s.name as student_name, c.name as class_name, s.class_id
           FROM students s LEFT JOIN classes c ON s.class_id = c.id
           WHERE s.user_id = $1`,
          [user.id]
        );
        studentInfo = studentResult.rows[0];
      }

      const tokens = generateTokens({ ...user, student_id: studentInfo?.student_id });
      await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
      await pool.query(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'30 days\')',
        [user.id, tokens.refreshToken]
      );

      const school = await SchoolModel.findById(user.school_id);

      res.json({
        ...tokens,
        user: {
          ...user,
          school_name: school?.name || '',
          ...studentInfo
        }
      });
    } catch (err) {
      return res.status(401).json({ error: 'Invalid refresh token.' });
    }
  },

  async me(req, res, next) {
    try {
      const userResult = await pool.query(
        'SELECT id, email, role, name, school_id FROM users WHERE id = $1',
        [req.user.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found.' });
      }

      const user = userResult.rows[0];
      const school = await SchoolModel.findById(user.school_id);

      let studentInfo = null;
      if (user.role === 'student') {
        const studentResult = await pool.query(
          `SELECT s.id as student_id, s.name as student_name, c.name as class_name, s.class_id
           FROM students s LEFT JOIN classes c ON s.class_id = c.id
           WHERE s.user_id = $1`,
          [user.id]
        );
        studentInfo = studentResult.rows[0];
      }

      res.json({
        ...user,
        school_name: school?.name || '',
        ...studentInfo
      });
    } catch (err) {
      next(err);
    }
  },

  async getStudentScores(req, res, next) {
    try {
      const { studentId } = req.params;

      // Verify student belongs to the authenticated user
      const studentResult = await pool.query(
        'SELECT id FROM students WHERE id = $1 AND user_id = $2',
        [studentId, req.user.id]
      );

      if (studentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Student not found.' });
      }

      const scores = await pool.query(
        `SELECT sc.*, sub.name as subject_name
         FROM scores sc
         JOIN subjects sub ON sub.id = sc.subject_id
         WHERE sc.student_id = $1
         ORDER BY sc.academic_year DESC, sc.term DESC, sub.name`,
        [studentId]
      );

      res.json(scores.rows);
    } catch (err) {
      next(err);
    }
  },

  async getStudentProfile(req, res, next) {
    try {
      const { studentId } = req.params;

      // Verify student belongs to the authenticated user
      const studentResult = await pool.query(
        `SELECT s.*, c.name as class_name
         FROM students s
         LEFT JOIN classes c ON s.class_id = c.id
         WHERE s.id = $1 AND s.user_id = $2`,
        [studentId, req.user.id]
      );

      if (studentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Student not found.' });
      }

      res.json(studentResult.rows[0]);
    } catch (err) {
      next(err);
    }
  }
};
