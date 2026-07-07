import { ScoreModel } from '../models/score.model.js';
import { calculateTotal, getGrade } from '../services/ranking.service.js';

export const ScoreController = {
  async getAll(req, res, next) {
    try {
      const { student_id, subject_id, term, academic_year, class_id } = req.query;
      const scores = await ScoreModel.findAll(req.user.school_id, {
        student_id, subject_id, term, academic_year, class_id
      });
      res.json(scores);
    } catch (err) { next(err); }
  },

  async getById(req, res, next) {
    try {
      const score = await ScoreModel.findById(req.params.id, req.user.school_id);
      if (!score) return res.status(404).json({ error: 'Score not found.' });
      res.json(score);
    } catch (err) { next(err); }
  },

  async upsert(req, res, next) {
    try {
      const { student_id, subject_id, class_score, exam_score, term, academic_year } = req.body;
      const total = calculateTotal(class_score, exam_score);
      const grade = getGrade(total);
      const score = await ScoreModel.upsert({
        school_id: req.user.school_id,
        student_id,
        subject_id,
        class_score,
        exam_score,
        total,
        grade,
        term,
        academic_year
      });
      res.status(200).json(score);
    } catch (err) { next(err); }
  },

  async bulkUpsert(req, res, next) {
    try {
      const { scores } = req.body;
      if (!scores || !Array.isArray(scores)) {
        return res.status(400).json({ error: 'scores array required.' });
      }
      const enriched = scores.map(s => ({
        ...s,
        total: calculateTotal(s.class_score, s.exam_score),
        grade: getGrade(calculateTotal(s.class_score, s.exam_score))
      }));
      const results = await ScoreModel.bulkUpsert(enriched, req.user.school_id);
      res.json(results);
    } catch (err) { next(err); }
  },

  async delete(req, res, next) {
    try {
      const result = await ScoreModel.delete(req.params.id, req.user.school_id);
      if (!result) return res.status(404).json({ error: 'Score not found.' });
      res.json({ message: 'Score deleted.' });
    } catch (err) { next(err); }
  },

  async getTermReport(req, res, next) {
    try {
      const { class_id, term, academic_year } = req.query;
      if (!class_id || !term || !academic_year) {
        return res.status(400).json({ error: 'class_id, term, academic_year required.' });
      }
      const scores = await ScoreModel.getClassTermScores(class_id, term, academic_year, req.user.school_id);
      res.json(scores);
    } catch (err) { next(err); }
  }
};
