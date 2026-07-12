import pool from '../config/database.js';

export const ClassModel = {
  async findAll(schoolId) {
    const result = await pool.query(
      'SELECT c.*, (SELECT COUNT(*) FROM students WHERE class_id = c.id) as student_count FROM classes c WHERE c.school_id = $1 ORDER BY c.name',
      [schoolId]
    );
    return result.rows;
  },

  async findById(id, schoolId) {
    const result = await pool.query(
      'SELECT * FROM classes WHERE id = $1 AND school_id = $2',
      [id, schoolId]
    );
    return result.rows[0];
  },

  async create(data) {
    const { school_id, name, teacher_name } = data;
    const result = await pool.query(
      'INSERT INTO classes (school_id, name, teacher_name) VALUES ($1, $2, $3) RETURNING *',
      [school_id, name, teacher_name || 'Not Assigned']
    );
    return result.rows[0];
  },

  async update(id, schoolId, data) {
    const fields = [];
    const values = [];
    let idx = 1;
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(value);
      }
    }
    if (fields.length === 0) return;
    values.push(id, schoolId);
    const result = await pool.query(
      `UPDATE classes SET ${fields.join(', ')} WHERE id = $${idx} AND school_id = $${idx + 1} RETURNING *`,
      values
    );
    return result.rows[0];
  },

  async delete(id, schoolId) {
    const result = await pool.query('DELETE FROM classes WHERE id = $1 AND school_id = $2 RETURNING id', [id, schoolId]);
    return result.rows[0];
  },

  async count(schoolId) {
    const result = await pool.query('SELECT COUNT(*) FROM classes WHERE school_id = $1', [schoolId]);
    return parseInt(result.rows[0].count);
  },

  async findByTeacherUserId(userId, schoolId) {
    const result = await pool.query(
      `SELECT c.*, (SELECT COUNT(*) FROM students WHERE class_id = c.id) as student_count
       FROM classes c
       WHERE c.school_id = $2
         AND (
           c.teacher_id IN (SELECT id FROM teachers WHERE user_id = $1)
           OR LOWER(TRIM(c.teacher_name)) = LOWER(TRIM((SELECT name FROM users WHERE id = $1)))
         )
       ORDER BY c.name`,
      [userId, schoolId]
    );
    return result.rows;
  }
};
