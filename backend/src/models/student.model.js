import pool from '../config/database.js';

function sanitizeNullable(value) {
  if (value === undefined || value === null || value === '') return null;
  return value;
}

function sanitizeDob(value) {
  if (value === undefined || value === null || value === '') return null;
  const str = String(value).trim();
  if (!str) return null;
  const date = new Date(str);
  if (isNaN(date.getTime())) return null;
  return str;
}

export const StudentModel = {
  async findAll(schoolId, { status, class_id, search } = {}) {
    let sql = 'SELECT s.*, c.name as class_name FROM students s LEFT JOIN classes c ON s.class_id = c.id WHERE s.school_id = $1';
    const params = [schoolId];
    let idx = 2;
    if (status) { sql += ` AND s.status = $${idx++}`; params.push(status); }
    if (class_id) { sql += ` AND s.class_id = $${idx++}`; params.push(class_id); }
    if (search) { sql += ` AND (s.name ILIKE $${idx} OR CAST(s.id AS TEXT) LIKE $${idx})`; params.push(`%${search}%`); idx++; }
    sql += ' ORDER BY s.name';
    const result = await pool.query(sql, params);
    return result.rows;
  },

  async findById(id, schoolId) {
    const result = await pool.query(
      'SELECT s.*, c.name as class_name FROM students s LEFT JOIN classes c ON s.class_id = c.id WHERE s.id = $1 AND s.school_id = $2',
      [id, schoolId]
    );
    return result.rows[0];
  },

  async validateClassExists(classId, schoolId) {
    const result = await pool.query(
      'SELECT id FROM classes WHERE id = $1 AND school_id = $2',
      [classId, schoolId]
    );
    return result.rows.length > 0;
  },

  async create(data) {
    const { school_id, name, gender, class_id, parent_name, parent_phone, photo, admission_year, status, dob } = data;

    const cleanName = String(name || '').trim();
    if (!cleanName) {
      const err = new Error('Student name is required');
      err.status = 400;
      err.field = 'name';
      throw err;
    }

    const cleanGender = String(gender || '').trim() || 'Male';
    const validGenders = ['Male', 'Female', 'male', 'female', 'M', 'F', 'm', 'f'];
    const normalizedGender = validGenders.includes(cleanGender)
      ? (cleanGender.charAt(0).toUpperCase() + cleanGender.slice(1).toLowerCase())
      : cleanGender;

    const numericClassId = parseInt(class_id, 10);
    if (isNaN(numericClassId) || numericClassId <= 0) {
      const err = new Error('Valid class_id is required');
      err.status = 400;
      err.field = 'class_id';
      throw err;
    }

    const classExists = await this.validateClassExists(numericClassId, school_id);
    if (!classExists) {
      const err = new Error(`Class with id ${numericClassId} does not exist`);
      err.status = 400;
      err.field = 'class_id';
      throw err;
    }

    const cleanDob = sanitizeDob(dob);
    const cleanParentName = sanitizeNullable(parent_name);
    const cleanParentPhone = sanitizeNullable(parent_phone);
    const cleanPhoto = sanitizeNullable(photo);
    const cleanAdmissionYear = sanitizeNullable(admission_year);

    const result = await pool.query(
      `INSERT INTO students (school_id, name, gender, class_id, parent_name, parent_phone, photo, admission_year, status, dob)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, 'active'), $10) RETURNING *`,
      [school_id, cleanName, normalizedGender, numericClassId, cleanParentName, cleanParentPhone, cleanPhoto, cleanAdmissionYear, status || 'active', cleanDob]
    );
    return result.rows[0];
  },

  async update(id, schoolId, data) {
    const fields = [];
    const values = [];
    let idx = 1;
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        let sanitized = value;
        if (key === 'dob') sanitized = sanitizeDob(value);
        else if (key === 'parent_name' || key === 'parent_phone' || key === 'photo') sanitized = sanitizeNullable(value);
        else if (key === 'class_id') {
          sanitized = parseInt(value, 10);
          if (isNaN(sanitized) || sanitized <= 0) {
            const err = new Error('Invalid class_id');
            err.status = 400;
            err.field = 'class_id';
            throw err;
          }
          const classExists = await this.validateClassExists(sanitized, schoolId);
          if (!classExists) {
            const err = new Error(`Class with id ${sanitized} does not exist`);
            err.status = 400;
            err.field = 'class_id';
            throw err;
          }
        }
        fields.push(`${key} = $${idx++}`);
        values.push(sanitized);
      }
    }
    if (fields.length === 0) return;
    values.push(id, schoolId);
    const result = await pool.query(
      `UPDATE students SET ${fields.join(', ')} WHERE id = $${idx} AND school_id = $${idx + 1} RETURNING *`,
      values
    );
    return result.rows[0];
  },

  async delete(id, schoolId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM scores WHERE student_id = $1', [id]);
      await client.query('DELETE FROM report_cards WHERE student_id = $1', [id]);
      const result = await client.query('DELETE FROM students WHERE id = $1 AND school_id = $2 RETURNING id', [id, schoolId]);
      await client.query('COMMIT');
      return result.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async bulkDelete(ids, schoolId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM scores WHERE student_id = ANY($1::int[])', [ids]);
      await client.query('DELETE FROM report_cards WHERE student_id = ANY($1::int[])', [ids]);
      await client.query('DELETE FROM students WHERE id = ANY($1::int[]) AND school_id = $2', [ids, schoolId]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async updateByClass(fromClassId, toClassId, status, schoolId) {
    const result = await pool.query(
      `UPDATE students SET class_id = $1, status = COALESCE($2, 'active')
       WHERE class_id = $3 AND school_id = $4 RETURNING *`,
      [toClassId, status || 'active', fromClassId, schoolId]
    );
    return result.rows;
  },

  async count(schoolId) {
    const result = await pool.query('SELECT COUNT(*) FROM students WHERE school_id = $1', [schoolId]);
    return parseInt(result.rows[0].count);
  }
};
