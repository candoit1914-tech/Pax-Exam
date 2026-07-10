import { ScoreModel } from '../models/score.model.js';
import { calculateTotal, getGrade } from '../services/ranking.service.js';

function logRequest(endpoint, extra = {}) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), endpoint, ...extra }));
}

function logError(endpoint, err, extra = {}) {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    endpoint,
    error: err.message,
    code: err.code || null,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    ...extra,
  }));
}

export const ScoreController = {
  async getAll(req, res, next) {
    const start = Date.now();
    try {
      const { student_id, subject_id, term, academic_year, class_id } = req.query;
      const scores = await ScoreModel.findAll(req.user.school_id, {
        student_id, subject_id, term, academic_year, class_id
      });
      logRequest('GET /scores', { responseTime: Date.now() - start, count: scores.length });
      res.json(scores);
    } catch (err) {
      logError('GET /scores', err, { responseTime: Date.now() - start });
      next(err);
    }
  },

  async getDashboard(req, res, next) {
    const start = Date.now();
    try {
      const { class_id, academic_year } = req.query;
      const scores = await ScoreModel.findLightweight(req.user.school_id, { class_id, academic_year });
      logRequest('GET /scores/dashboard', { responseTime: Date.now() - start, count: scores.length });
      res.json(scores);
    } catch (err) {
      logError('GET /scores/dashboard', err, { responseTime: Date.now() - start });
      next(err);
    }
  },

  async getById(req, res, next) {
    const start = Date.now();
    try {
      const score = await ScoreModel.findById(req.params.id, req.user.school_id);
      if (!score) return res.status(404).json({ success: false, error: 'Score not found.' });
      logRequest('GET /scores/:id', { responseTime: Date.now() - start });
      res.json(score);
    } catch (err) {
      logError('GET /scores/:id', err, { responseTime: Date.now() - start });
      next(err);
    }
  },

  async upsert(req, res, next) {
    const start = Date.now();
    try {
      const { student_id, subject_id, class_score, exam_score, term, academic_year } = req.body;

      if (!student_id || !subject_id) {
        const missing = [];
        if (!student_id) missing.push('student_id');
        if (!subject_id) missing.push('subject_id');
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          field: missing.join(', '),
          message: `Missing required fields: ${missing.join(', ')}`,
        });
      }

      const cs = parseFloat(class_score);
      const es = parseFloat(exam_score);
      if (isNaN(cs) || isNaN(es)) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          field: 'class_score, exam_score',
          message: 'Scores must be valid numbers',
        });
      }
      if (cs < 0 || cs > 50 || es < 0 || es > 50) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          field: 'class_score, exam_score',
          message: 'Scores must be between 0 and 50',
        });
      }

      const grade = getGrade(cs + es);
      const score = await ScoreModel.upsert({
        school_id: req.user.school_id,
        student_id,
        subject_id,
        class_score: cs,
        exam_score: es,
        grade,
        term,
        academic_year
      });
      logRequest('POST /scores', { responseTime: Date.now() - start });
      res.status(200).json(score);
    } catch (err) {
      logError('POST /scores', err, { responseTime: Date.now() - start });
      next(err);
    }
  },

  async bulkUpsert(req, res, next) {
    const start = Date.now();
    try {
      const { scores } = req.body;
      if (!scores || !Array.isArray(scores)) {
        return res.status(400).json({ success: false, error: 'Validation failed', field: 'scores', message: 'scores array required.' });
      }
      const enriched = scores.map(s => ({
        ...s,
        grade: getGrade((parseFloat(s.class_score) || 0) + (parseFloat(s.exam_score) || 0))
      }));
      const results = await ScoreModel.bulkUpsert(enriched, req.user.school_id);
      logRequest('POST /scores/bulk', { responseTime: Date.now() - start, count: results.length });
      res.json(results);
    } catch (err) {
      logError('POST /scores/bulk', err, { responseTime: Date.now() - start });
      next(err);
    }
  },

  async delete(req, res, next) {
    const start = Date.now();
    try {
      const result = await ScoreModel.delete(req.params.id, req.user.school_id);
      if (!result) return res.status(404).json({ success: false, error: 'Score not found.' });
      logRequest('DELETE /scores/:id', { responseTime: Date.now() - start });
      res.json({ message: 'Score deleted.' });
    } catch (err) {
      logError('DELETE /scores/:id', err, { responseTime: Date.now() - start });
      next(err);
    }
  },

  async getTermReport(req, res, next) {
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
      logRequest('GET /scores/term-report', { responseTime: Date.now() - start, count: scores.length });
      res.json(scores);
    } catch (err) {
      logError('GET /scores/term-report', err, { responseTime: Date.now() - start });
      next(err);
    }
  }
};
