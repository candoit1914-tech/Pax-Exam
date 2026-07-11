import pool from '../config/database.js';

function generateLoginCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const AdminStudentCodeController = {
  async generateCode(req, res, next) {
    try {
      const { studentId } = req.body;
      if (!studentId) {
        return res.status(400).json({ error: 'Student ID is required.' });
      }

      // Verify student belongs to the school
      const student = await pool.query(
        'SELECT id, name, login_code FROM students WHERE id = $1 AND school_id = $2',
        [studentId, req.user.school_id]
      );

      if (student.rows.length === 0) {
        return res.status(404).json({ error: 'Student not found.' });
      }

      // Generate new unique code
      let code;
      let isUnique = false;
      while (!isUnique) {
        code = generateLoginCode();
        const existing = await pool.query(
          'SELECT id FROM students WHERE login_code = $1 AND id != $2',
          [code, studentId]
        );
        isUnique = existing.rows.length === 0;
      }

      // Update student with new code
      await pool.query(
        'UPDATE students SET login_code = $1 WHERE id = $2',
        [code, studentId]
      );

      res.json({
        code,
        student: { id: student.rows[0].id, name: student.rows[0].name },
        message: 'Login code generated successfully.'
      });
    } catch (err) {
      next(err);
    }
  },

  async generateBulkCodes(req, res, next) {
    try {
      const { classId, studentIds } = req.body;

      let students;
      if (studentIds && Array.isArray(studentIds)) {
        // Generate for specific students
        const placeholders = studentIds.map((_, i) => `$${i + 2}`).join(',');
        students = await pool.query(
          `SELECT id, name FROM students 
           WHERE id IN (${placeholders}) AND school_id = $1`,
          [req.user.school_id, ...studentIds]
        );
      } else if (classId) {
        // Generate for all students in a class
        students = await pool.query(
          'SELECT id, name FROM students WHERE class_id = $1 AND school_id = $2 AND status = $3',
          [classId, req.user.school_id, 'active']
        );
      } else {
        // Generate for all active students in the school
        students = await pool.query(
          'SELECT id, name FROM students WHERE school_id = $1 AND status = $2',
          [req.user.school_id, 'active']
        );
      }

      if (students.rows.length === 0) {
        return res.status(404).json({ error: 'No students found.' });
      }

      const results = [];
      for (const student of students.rows) {
        let code;
        let isUnique = false;
        while (!isUnique) {
          code = generateLoginCode();
          const existing = await pool.query(
            'SELECT id FROM students WHERE login_code = $1 AND id != $2',
            [code, student.id]
          );
          isUnique = existing.rows.length === 0;
        }

        await pool.query(
          'UPDATE students SET login_code = $1 WHERE id = $2',
          [code, student.id]
        );

        results.push({ id: student.id, name: student.name, code });
      }

      res.json({
        codes: results,
        count: results.length,
        message: `${results.length} login codes generated successfully.`
      });
    } catch (err) {
      next(err);
    }
  },

  async getStudentCodes(req, res, next) {
    try {
      const { classId, search } = req.query;

      let sql = `SELECT s.id, s.name, s.login_code, s.status, c.name as class_name, s.user_id
                 FROM students s
                 LEFT JOIN classes c ON s.class_id = c.id
                 WHERE s.school_id = $1`;
      const params = [req.user.school_id];
      let idx = 2;

      if (classId) {
        sql += ` AND s.class_id = $${idx++}`;
        params.push(classId);
      }

      if (search) {
        sql += ` AND (s.name ILIKE $${idx} OR CAST(s.id AS TEXT) LIKE $${idx})`;
        params.push(`%${search}%`);
        idx++;
      }

      sql += ' ORDER BY s.name';

      const result = await pool.query(sql, params);
      res.json(result.rows);
    } catch (err) {
      next(err);
    }
  },

  async regenerateCode(req, res, next) {
    try {
      const { studentId } = req.params;

      const student = await pool.query(
        'SELECT id, name FROM students WHERE id = $1 AND school_id = $2',
        [studentId, req.user.school_id]
      );

      if (student.rows.length === 0) {
        return res.status(404).json({ error: 'Student not found.' });
      }

      let code;
      let isUnique = false;
      while (!isUnique) {
        code = generateLoginCode();
        const existing = await pool.query(
          'SELECT id FROM students WHERE login_code = $1 AND id != $2',
          [code, studentId]
        );
        isUnique = existing.rows.length === 0;
      }

      await pool.query(
        'UPDATE students SET login_code = $1 WHERE id = $2',
        [code, studentId]
      );

      res.json({
        code,
        student: { id: student.rows[0].id, name: student.rows[0].name },
        message: 'Login code regenerated successfully.'
      });
    } catch (err) {
      next(err);
    }
  }
};
