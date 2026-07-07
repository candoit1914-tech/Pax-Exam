import pool from '../config/database.js';

export const UserModel = {
  async findByEmail(email) {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  },

  async findById(id) {
    const result = await pool.query(
      'SELECT id, school_id, email, role, name, is_active, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  async create({ school_id, email, password_hash, role, name }) {
    const result = await pool.query(
      `INSERT INTO users (school_id, email, password_hash, role, name)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, school_id, email, role, name, created_at`,
      [school_id, email, password_hash, role, name]
    );
    return result.rows[0];
  },

  async updateLastLogin(id) {
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [id]);
  },

  async findBySchool(schoolId) {
    const result = await pool.query(
      'SELECT id, school_id, email, role, name, is_active, created_at FROM users WHERE school_id = $1 ORDER BY name',
      [schoolId]
    );
    return result.rows;
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
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}`, values);
  }
};
