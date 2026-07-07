import pool from '../config/database.js';

export const TeacherModel = {
  async findAll(schoolId) {
    const result = await pool.query('SELECT * FROM teachers WHERE school_id = $1 ORDER BY name', [schoolId]);
    return result.rows;
  },

  async findById(id, schoolId) {
    const result = await pool.query('SELECT * FROM teachers WHERE id = $1 AND school_id = $2', [id, schoolId]);
    return result.rows[0];
  },

  async create(data) {
    const { school_id, name, phone, email } = data;
    const result = await pool.query(
      'INSERT INTO teachers (school_id, name, phone, email) VALUES ($1, $2, $3, $4) RETURNING *',
      [school_id, name, phone, email]
    );
    return result.rows[0];
  },

  async update(id, schoolId, data) {
    const fields = [];
    const values = [];
    let idx = 1;
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) { fields.push(`${key} = $${idx++}`); values.push(value); }
    }
    if (fields.length === 0) return;
    values.push(id, schoolId);
    const result = await pool.query(
      `UPDATE teachers SET ${fields.join(', ')} WHERE id = $${idx} AND school_id = $${idx + 1} RETURNING *`,
      values
    );
    return result.rows[0];
  },

  async delete(id, schoolId) {
    const result = await pool.query('DELETE FROM teachers WHERE id = $1 AND school_id = $2 RETURNING id', [id, schoolId]);
    return result.rows[0];
  }
};
