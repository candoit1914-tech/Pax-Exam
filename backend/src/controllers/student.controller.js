import { StudentModel } from '../models/student.model.js';
import { ScoreModel } from '../models/score.model.js';
import { rankStudents, calculateAverage, calculateTotal, getGrade } from '../services/ranking.service.js';

export const StudentController = {
  async getAll(req, res, next) {
    try {
      const { status, class_id, search } = req.query;
      const students = await StudentModel.findAll(req.user.school_id, { status, class_id, search });
      res.json(students);
    } catch (err) { next(err); }
  },

  async getById(req, res, next) {
    try {
      const student = await StudentModel.findById(req.params.id, req.user.school_id);
      if (!student) return res.status(404).json({ error: 'Student not found.' });
      res.json(student);
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const student = await StudentModel.create({ ...req.body, school_id: req.user.school_id });
      res.status(201).json(student);
    } catch (err) { next(err); }
  },

  async update(req, res, next) {
    try {
      const student = await StudentModel.update(req.params.id, req.user.school_id, req.body);
      if (!student) return res.status(404).json({ error: 'Student not found.' });
      res.json(student);
    } catch (err) { next(err); }
  },

  async delete(req, res, next) {
    try {
      const result = await StudentModel.delete(req.params.id, req.user.school_id);
      if (!result) return res.status(404).json({ error: 'Student not found.' });
      res.json({ message: 'Student and associated scores deleted.' });
    } catch (err) { next(err); }
  },

  async bulkDelete(req, res, next) {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({ error: 'ids array required.' });
      }
      await StudentModel.bulkDelete(ids, req.user.school_id);
      res.json({ message: `${ids.length} students deleted.` });
    } catch (err) { next(err); }
  },

  async getRanking(req, res, next) {
    try {
      const { class_id, term, academic_year } = req.query;
      if (!class_id || !term || !academic_year) {
        return res.status(400).json({ error: 'class_id, term, and academic_year required.' });
      }
      const scores = await ScoreModel.getClassTermScores(class_id, term, academic_year, req.user.school_id);
      const students = await StudentModel.findAll(req.user.school_id, { class_id });

      const ranked = students.map(s => {
        const sScores = scores.filter(sc => sc.student_id === s.id);
        const avg = calculateAverage(sScores);
        const examTotal = sScores.reduce((sum, sc) => sum + (parseFloat(sc.exam_score) || 0), 0) * 2;
        return { id: s.id, name: s.name, average: avg, rankScore: examTotal };
      });

      res.json(rankStudents(ranked));
    } catch (err) { next(err); }
  },

  async getStudentProfile(req, res, next) {
    try {
      const student = await StudentModel.findById(req.params.id, req.user.school_id);
      if (!student) return res.status(404).json({ error: 'Student not found.' });

      const scores = await ScoreModel.findAll(req.user.school_id, { student_id: req.params.id });
      const classStudents = await StudentModel.findAll(req.user.school_id, { class_id: student.class_id });

      res.json({ student, scores, classStudentCount: classStudents.length });
    } catch (err) { next(err); }
  },

  async transition(req, res, next) {
    try {
      const { studentId, targetAction, targetClassId } = req.body;
      if (!studentId) return res.status(400).json({ error: 'studentId required.' });

      if (targetAction === 'complete') {
        const result = await StudentModel.update(studentId, req.user.school_id, { status: 'completed' });
        return res.json(result);
      }
      if (targetClassId) {
        const result = await StudentModel.update(studentId, req.user.school_id, { class_id: targetClassId, status: 'active' });
        return res.json(result);
      }
      res.json({ message: 'No action taken.' });
    } catch (err) { next(err); }
  },

  async bulkTransition(req, res, next) {
    try {
      const { fromClassId, toClassId, exceptions } = req.body;
      if (!fromClassId || !toClassId) {
        return res.status(400).json({ error: 'fromClassId and toClassId required.' });
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
      res.json({ message: `${results.length} students transitioned.` });
    } catch (err) { next(err); }
  }
};
