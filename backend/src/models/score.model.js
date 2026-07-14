import pool from '../config/database.js';

export const ScoreModel = {
  async findAll(schoolId, { student_id, subject_id, term, academic_year, class_id } = {}) {
    let sql = `SELECT sc.*, st.name as student_name, sub.name as subject_name
               FROM scores sc
               JOIN students st ON sc.student_id = st.id
               JOIN subjects sub ON sc.subject_id = sub.id
               WHERE sc.school_id = $1`;
    const params = [schoolId];
    let idx = 2;
    if (student_id) {
      const ids = String(student_id).split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (ids.length === 1) {
        sql += ` AND sc.student_id = $${idx++}`;
        params.push(ids[0]);
      } else if (ids.length > 1) {
        sql += ` AND sc.student_id IN (${ids.map(() => `$${idx++}`).join(',')})`;
        params.push(...ids);
      }
    }
    if (subject_id) { sql += ` AND sc.subject_id = $${idx++}`; params.push(subject_id); }
    if (term) { sql += ` AND sc.term = $${idx++}`; params.push(term); }
    if (academic_year) { sql += ` AND sc.academic_year = $${idx++}`; params.push(academic_year); }
    if (class_id) {
      sql += ` AND st.class_id = $${idx++}`;
      params.push(class_id);
    }
    sql += ' ORDER BY sc.created_at DESC';
    const result = await pool.query(sql, params);
    return result.rows;
  },

  async findById(id, schoolId) {
    const result = await pool.query(
      `SELECT sc.*, st.name as student_name, sub.name as subject_name
       FROM scores sc JOIN students st ON sc.student_id = st.id
       JOIN subjects sub ON sc.subject_id = sub.id
       WHERE sc.id = $1 AND sc.school_id = $2`,
      [id, schoolId]
    );
    return result.rows[0];
  },

  async upsert(data) {
    const { school_id, student_id, subject_id, class_score, exam_score, grade, term, academic_year } = data;
    const existing = await pool.query(
      `SELECT id FROM scores
       WHERE school_id = $1 AND student_id = $2 AND subject_id = $3
       AND COALESCE(term, '') = COALESCE($4, '') AND COALESCE(academic_year, '') = COALESCE($5, '')`,
      [school_id, student_id, subject_id, term || '', academic_year || '']
    );
    if (existing.rows[0]) {
      const result = await pool.query(
        `UPDATE scores SET class_score = $1, exam_score = $2, grade = $3
         WHERE id = $4 RETURNING *`,
        [class_score, exam_score, grade, existing.rows[0].id]
      );
      return result.rows[0];
    }
    const result = await pool.query(
      `INSERT INTO scores (school_id, student_id, subject_id, class_score, exam_score, grade, term, academic_year)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [school_id, student_id, subject_id, class_score, exam_score, grade, term, academic_year]
    );
    return result.rows[0];
  },

  async bulkUpsert(scores, schoolId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const results = [];
      for (const score of scores) {
        const existing = await client.query(
          `SELECT id FROM scores WHERE school_id = $1 AND student_id = $2 AND subject_id = $3
           AND COALESCE(term, '') = COALESCE($4, '') AND COALESCE(academic_year, '') = COALESCE($5, '')`,
          [schoolId, score.student_id, score.subject_id, score.term || '', score.academic_year || '']
        );
        if (existing.rows[0]) {
          const r = await client.query(
            `UPDATE scores SET class_score = $1, exam_score = $2, grade = $3 WHERE id = $4 RETURNING *`,
            [score.class_score, score.exam_score, score.grade, existing.rows[0].id]
          );
          results.push(r.rows[0]);
        } else {
          const r = await client.query(
            `INSERT INTO scores (school_id, student_id, subject_id, class_score, exam_score, grade, term, academic_year)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [schoolId, score.student_id, score.subject_id, score.class_score, score.exam_score, score.grade, score.term, score.academic_year]
          );
          results.push(r.rows[0]);
        }
      }
      await client.query('COMMIT');
      return results;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async delete(id, schoolId) {
    const result = await pool.query('DELETE FROM scores WHERE id = $1 AND school_id = $2 RETURNING id', [id, schoolId]);
    return result.rows[0];
  },

  async getStudentTermScores(studentId, term, academicYear, schoolId) {
    const result = await pool.query(
      `SELECT sc.*, sub.name as subject_name FROM scores sc
       JOIN subjects sub ON sc.subject_id = sub.id
       WHERE sc.student_id = $1 AND sc.term = $2 AND sc.academic_year = $3 AND sc.school_id = $4`,
      [studentId, term, academicYear, schoolId]
    );
    return result.rows;
  },

  async getClassTermScores(classId, term, academicYear, schoolId) {
    const result = await pool.query(
      `SELECT sc.*, st.name as student_name, sub.name as subject_name
       FROM scores sc
       JOIN students st ON sc.student_id = st.id
       JOIN subjects sub ON sc.subject_id = sub.id
       WHERE st.class_id = $1 AND sc.term = $2 AND sc.academic_year = $3 AND sc.school_id = $4`,
      [classId, term, academicYear, schoolId]
    );
    return result.rows;
  },

  async count(schoolId) {
    const result = await pool.query('SELECT COUNT(*) FROM scores WHERE school_id = $1', [schoolId]);
    return parseInt(result.rows[0].count);
  },

  async findLightweight(schoolId, { class_id, academic_year } = {}) {
    let sql = `SELECT sc.student_id, sc.total, sc.exam_score, sc.subject_id
               FROM scores sc
               WHERE sc.school_id = $1`;
    const params = [schoolId];
    let idx = 2;
    if (class_id) {
      sql += ` AND sc.student_id IN (SELECT id FROM students WHERE class_id = $${idx++} AND school_id = $1)`;
      params.push(class_id);
    }
    if (academic_year) {
      sql += ` AND sc.academic_year = $${idx++}`;
      params.push(academic_year);
    }
    const result = await pool.query(sql, params);
    return result.rows;
  }
};
