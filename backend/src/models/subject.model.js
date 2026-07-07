import pool from '../config/database.js';

export const SubjectModel = {
  async findAll(schoolId) {
    const result = await pool.query('SELECT * FROM subjects WHERE school_id = $1 ORDER BY name', [schoolId]);
    return result.rows;
  },

  async findById(id, schoolId) {
    const result = await pool.query('SELECT * FROM subjects WHERE id = $1 AND school_id = $2', [id, schoolId]);
    return result.rows[0];
  },

  async create(data) {
    const { school_id, name } = data;
    const exists = await pool.query(
      'SELECT id FROM subjects WHERE school_id = $1 AND LOWER(name) = LOWER($2)',
      [school_id, name]
    );
    if (exists.rows[0]) throw Object.assign(new Error('Subject already exists'), { status: 409 });
    const result = await pool.query(
      'INSERT INTO subjects (school_id, name) VALUES ($1, $2) RETURNING *',
      [school_id, name]
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
      `UPDATE subjects SET ${fields.join(', ')} WHERE id = $${idx} AND school_id = $${idx + 1} RETURNING *`,
      values
    );
    return result.rows[0];
  },

  async delete(id, schoolId) {
    const result = await pool.query('DELETE FROM subjects WHERE id = $1 AND school_id = $2 RETURNING id', [id, schoolId]);
    return result.rows[0];
  },

  async count(schoolId) {
    const result = await pool.query('SELECT COUNT(*) FROM subjects WHERE school_id = $1', [schoolId]);
    return parseInt(result.rows[0].count);
  }
};
