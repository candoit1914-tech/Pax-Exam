import { StudentModel } from '../models/student.model.js';
import { ScoreModel } from '../models/score.model.js';
import { rankStudents, calculateAverage, calculateTotal, getGrade } from '../services/ranking.service.js';
import pool from '../config/database.js';

function logRequest(endpoint, payload, extra = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    endpoint,
    ...extra,
  };
  if (payload) entry.payload = payload;
  console.log(JSON.stringify(entry));
}

function logError(endpoint, err, extra = {}) {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    endpoint,
    error: err.message,
    code: err.code || null,
    field: err.field || null,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    ...extra,
  }));
}

export const StudentController = {
  async getAll(req, res, next) {
    const start = Date.now();
    try {
      const { status, class_id, search } = req.query;
      const students = await StudentModel.findAll(req.user.school_id, { status, class_id, search });
      logRequest('GET /students', null, { responseTime: Date.now() - start, count: students.length });
      res.json(students);
    } catch (err) {
      logError('GET /students', err, { responseTime: Date.now() - start });
      next(err);
    }
  },

  async getById(req, res, next) {
    const start = Date.now();
    try {
      const student = await StudentModel.findById(req.params.id, req.user.school_id);
      if (!student) return res.status(404).json({ success: false, error: 'Not found', message: 'Student not found.' });
      logRequest('GET /students/:id', null, { responseTime: Date.now() - start });
      res.json(student);
    } catch (err) {
      logError('GET /students/:id', err, { responseTime: Date.now() - start });
      next(err);
    }
  },

  async create(req, res, next) {
    const start = Date.now();
    const payload = { ...req.body };
    if (payload.photo) payload.photo = '[base64 truncated]';
    try {
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          field: 'body',
          message: 'Request body is empty',
        });
      }

      const name = String(req.body.name || '').trim();
      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          field: 'name',
          message: 'Student name is required',
        });
      }

      const classId = parseInt(req.body.class_id, 10);
      if (isNaN(classId) || classId <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          field: 'class_id',
          message: 'Valid class_id is required (positive integer)',
        });
      }

      const student = await StudentModel.create({ ...req.body, school_id: req.user.school_id });
      logRequest('POST /students', payload, { responseTime: Date.now() - start, createdId: student.id });
      res.status(201).json(student);
    } catch (err) {
      logError('POST /students', err, { payload, responseTime: Date.now() - start });
      if (err.field) {
        return res.status(err.status || 400).json({
          success: false,
          error: 'Validation failed',
          field: err.field,
          message: err.message,
        });
      }
      if (err.code === '23503') {
        const detail = err.detail || err.message;
        const fieldMatch = detail.match(/\((\w+)\)/);
        return res.status(400).json({
          success: false,
          error: 'Foreign key constraint failed',
          field: fieldMatch ? fieldMatch[1] : 'unknown',
          message: `Referenced record not found: ${detail}`,
        });
      }
      if (err.code === '23505') {
        return res.status(409).json({
          success: false,
          error: 'Duplicate entry',
          message: 'This student already exists',
        });
      }
      if (err.code === '22P02') {
        return res.status(400).json({
          success: false,
          error: 'Invalid data format',
          field: 'dob',
          message: `Invalid date format: ${err.message}`,
        });
      }
      next(err);
    }
  },

  async update(req, res, next) {
    const start = Date.now();
    try {
      const student = await StudentModel.update(req.params.id, req.user.school_id, req.body);
      if (!student) return res.status(404).json({ success: false, error: 'Not found', message: 'Student not found.' });
      logRequest('PUT /students/:id', null, { responseTime: Date.now() - start });
      res.json(student);
    } catch (err) {
      logError('PUT /students/:id', err, { responseTime: Date.now() - start });
      if (err.field) {
        return res.status(err.status || 400).json({
          success: false,
          error: 'Validation failed',
          field: err.field,
          message: err.message,
        });
      }
      if (err.code === '23503') {
        const detail = err.detail || err.message;
        const fieldMatch = detail.match(/\((\w+)\)/);
        return res.status(400).json({
          success: false,
          error: 'Foreign key constraint failed',
          field: fieldMatch ? fieldMatch[1] : 'unknown',
          message: `Referenced record not found: ${detail}`,
        });
      }
      if (err.code === '23505') {
        return res.status(409).json({
          success: false,
          error: 'Duplicate entry',
          field: 'unique',
          message: 'This record already exists',
        });
      }
      if (err.code === '22P02') {
        return res.status(400).json({
          success: false,
          error: 'Invalid data format',
          field: 'dob',
          message: `Invalid date format: ${err.message}`,
        });
      }
      next(err);
    }
  },

  async delete(req, res, next) {
    const start = Date.now();
    try {
      const result = await StudentModel.delete(req.params.id, req.user.school_id);
      if (!result) return res.status(404).json({ success: false, error: 'Not found', message: 'Student not found.' });
      logRequest('DELETE /students/:id', null, { responseTime: Date.now() - start });
      res.json({ message: 'Student and associated scores deleted.' });
    } catch (err) {
      logError('DELETE /students/:id', err, { responseTime: Date.now() - start });
      next(err);
    }
  },

  async bulkDelete(req, res, next) {
    const start = Date.now();
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({ success: false, error: 'Validation failed', field: 'ids', message: 'ids array required.' });
      }
      await StudentModel.bulkDelete(ids, req.user.school_id);
      logRequest('DELETE /students/bulk', { count: ids.length }, { responseTime: Date.now() - start });
      res.json({ message: `${ids.length} students deleted.` });
    } catch (err) {
      logError('DELETE /students/bulk', err, { responseTime: Date.now() - start });
      next(err);
    }
  },

  async getRanking(req, res, next) {
    const start = Date.now();
    try {
      const { class_id, term, academic_year } = req.query;
      if (!class_id || !term || !academic_year) {
        const missing = [];
        if (!class_id) missing.push('class_id');
        if (!term) missing.push('term');
        if (!academic_year) missing.push('academic_year');
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          field: missing.join(', '),
          message: `Missing required query parameters: ${missing.join(', ')}`,
        });
      }
      const scores = await ScoreModel.getClassTermScores(class_id, term, academic_year, req.user.school_id);
      const students = await StudentModel.findAll(req.user.school_id, { class_id });

      const ranked = students.map(s => {
        const sScores = scores.filter(sc => sc.student_id === s.id);
        const avg = calculateAverage(sScores);
        const examTotal = sScores.reduce((sum, sc) => sum + (parseFloat(sc.exam_score) || 0), 0) * 2;
        return { id: s.id, name: s.name, average: avg, rankScore: examTotal };
      });

      logRequest('GET /students/ranking', null, { responseTime: Date.now() - start, count: ranked.length });
      res.json(rankStudents(ranked));
    } catch (err) {
      logError('GET /students/ranking', err, { responseTime: Date.now() - start });
      next(err);
    }
  },

  async getStudentProfile(req, res, next) {
    const start = Date.now();
    try {
      const student = await StudentModel.findById(req.params.id, req.user.school_id);
      if (!student) return res.status(404).json({ success: false, error: 'Not found', message: 'Student not found.' });

      const [scores, classStudents] = await Promise.all([
        ScoreModel.findAll(req.user.school_id, { student_id: req.params.id }),
        StudentModel.findAll(req.user.school_id, { class_id: student.class_id }),
      ]);

      logRequest('GET /students/:id/profile', null, { responseTime: Date.now() - start });
      res.json({ student, scores, classStudentCount: classStudents.length });
    } catch (err) {
      logError('GET /students/:id/profile', err, { responseTime: Date.now() - start });
      next(err);
    }
  },

  async transition(req, res, next) {
    const start = Date.now();
    try {
      const { studentId, targetAction, targetClassId } = req.body;
      if (!studentId) return res.status(400).json({ success: false, error: 'Validation failed', field: 'studentId', message: 'studentId required.' });

      if (targetAction === 'complete') {
        const result = await StudentModel.update(studentId, req.user.school_id, { status: 'completed' });
        logRequest('POST /students/transition', { studentId, targetAction }, { responseTime: Date.now() - start });
        return res.json(result);
      }
      if (targetClassId) {
        const result = await StudentModel.update(studentId, req.user.school_id, { class_id: targetClassId, status: 'active' });
        logRequest('POST /students/transition', { studentId, targetClassId }, { responseTime: Date.now() - start });
        return res.json(result);
      }
      res.json({ message: 'No action taken.' });
    } catch (err) {
      logError('POST /students/transition', err, { responseTime: Date.now() - start });
      next(err);
    }
  },

  async bulkTransition(req, res, next) {
    const start = Date.now();
    try {
      const { fromClassId, toClassId, exceptions } = req.body;
      if (!fromClassId || !toClassId) {
        const missing = [];
        if (!fromClassId) missing.push('fromClassId');
        if (!toClassId) missing.push('toClassId');
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          field: missing.join(', '),
          message: `Missing required fields: ${missing.join(', ')}`,
        });
      }

      const students = await StudentModel.findAll(req.user.school_id, { class_id: fromClassId });
      const results = [];
      for (const student of students) {
        const exception = exceptions?.[student.id];
        if (exception === 'skip') continue;
        if (exception === 'complete') {
          const r = await StudentModel.update(student.id, req.user.school_id, { status: 'completed' });
          results.push(r);
        } else {
          const dest = exception || toClassId;
          const r = await StudentModel.update(student.id, req.user.school_id, { class_id: parseInt(dest), status: 'active' });
          results.push(r);
        }
      }
      logRequest('POST /students/bulk-transition', { fromClassId, toClassId }, { responseTime: Date.now() - start, transitioned: results.length });
      res.json({ message: `${results.length} students transitioned.` });
    } catch (err) {
      logError('POST /students/bulk-transition', err, { responseTime: Date.now() - start });
      next(err);
    }
  }
};
