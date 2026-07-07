import pool from '../config/database.js';

export const SchoolModel = {
  async findAll() {
    const result = await pool.query('SELECT * FROM schools ORDER BY name');
    return result.rows;
  },

  async findById(id) {
    const result = await pool.query('SELECT * FROM schools WHERE id = $1', [id]);
    return result.rows[0];
  },

  async create(data) {
    const { name, address, location, phone, email, logo, principal_signature } = data;
    const result = await pool.query(
      `INSERT INTO schools (name, address, location, phone, email, logo, principal_signature)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, address, location, phone, email, logo, principal_signature]
    );
    return result.rows[0];
  },

  async update(id, data) {
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
    values.push(id);
    const result = await pool.query(
      `UPDATE schools SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0];
  }
};
