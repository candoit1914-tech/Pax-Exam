import { ScoreModel } from '../models/score.model.js';
import { StudentModel } from '../models/student.model.js';
import { SubjectModel } from '../models/subject.model.js';
import { rankStudents, calculateAverage } from '../services/ranking.service.js';

export const ReportController = {
  async studentReport(req, res, next) {
    try {
      const { student_id, term, academic_year } = req.query;
      if (!student_id || !term || !academic_year) {
        return res.status(400).json({ error: 'student_id, term, academic_year required.' });
      }

      const student = await StudentModel.findById(student_id, req.user.school_id);
      if (!student) return res.status(404).json({ error: 'Student not found.' });

      const scores = await ScoreModel.getStudentTermScores(student_id, term, academic_year, req.user.school_id);
      const classStudents = await StudentModel.findAll(req.user.school_id, { class_id: student.class_id });
      const classScores = await ScoreModel.getClassTermScores(student.class_id, term, academic_year, req.user.school_id);

      const subjectRankings = {};
      const subjects = await SubjectModel.findAll(req.user.school_id);
      subjects.forEach(sub => {
        const subScores = classScores.filter(s => s.subject_id === sub.id).sort((a, b) => b.total - a.total);
        let rank = 1;
        subScores.forEach((s, i) => {
          if (i > 0 && s.total < subScores[i - 1].total) rank = i + 1;
          subjectRankings[`${sub.id}_${s.student_id}`] = rank;
        });
      });

      const ranked = rankStudents(classStudents.map(s => {
        const ss = classScores.filter(sc => sc.student_id === s.id);
        const avg = calculateAverage(ss);
        const examTotal = ss.reduce((sum, sc) => sum + (parseFloat(sc.exam_score) || 0), 0) * 2;
        return { id: s.id, name: s.name, average: avg, rankScore: examTotal };
      }));

      const myRanking = ranked.find(r => r.id === parseInt(student_id));
      const enrichedScores = scores.map(s => ({
        ...s,
        subjectPosition: subjectRankings[`${s.subject_id}_${s.student_id}`] || null
      }));

      res.json({
        student,
        scores: enrichedScores,
        myRanking,
        totalInClass: classStudents.length,
        subjects
      });
    } catch (err) { next(err); }
  },

  async classReport(req, res, next) {
    try {
      const { class_id, term, academic_year } = req.query;
      if (!class_id || !term || !academic_year) {
        return res.status(400).json({ error: 'class_id, term, academic_year required.' });
      }

      const scores = await ScoreModel.getClassTermScores(class_id, term, academic_year, req.user.school_id);
      const students = await StudentModel.findAll(req.user.school_id, { class_id });

      const subjectRankings = {};
      const subjects = await SubjectModel.findAll(req.user.school_id);
      subjects.forEach(sub => {
        const subScores = scores.filter(s => s.subject_id === sub.id).sort((a, b) => b.total - a.total);
        let rank = 1;
        subScores.forEach((s, i) => {
          if (i > 0 && s.total < subScores[i - 1].total) rank = i + 1;
          subjectRankings[`${sub.id}_${s.student_id}`] = rank;
        });
      });

      const studentData = students.map(student => {
        const studentScores = scores.filter(s => s.student_id === student.id).map(s => ({
          ...s,
          subjectPosition: subjectRankings[`${s.subject_id}_${s.student_id}`] || null
        }));
        const avg = calculateAverage(studentScores);
        const examTotal = studentScores.reduce((sum, s) => sum + (parseFloat(s.exam_score) || 0), 0) * 2;
        return { student, scores: studentScores, average: avg, rankScore: examTotal };
      });

      const ranked = rankStudents(studentData);

      res.json({
        students: ranked,
        subjects,
        totalStudents: students.length
      });
    } catch (err) { next(err); }
  },

  async performanceTable(req, res, next) {
    try {
      const { class_id, academic_year } = req.query;
      if (!class_id || !academic_year) {
        return res.status(400).json({ error: 'class_id, academic_year required.' });
      }

      const students = await StudentModel.findAll(req.user.school_id, { class_id });
      const terms = ['Term 1', 'Term 2', 'Term 3'];

      const studentPerformance = await Promise.all(students.map(async student => {
        const termData = {};
        for (const term of terms) {
          const scores = await ScoreModel.getStudentTermScores(student.id, term, academic_year, req.user.school_id);
          termData[term] = scores.length > 0 ? calculateAverage(scores) : null;
        }
        const valid = [termData['Term 1'], termData['Term 2'], termData['Term 3']].filter(v => v !== null);
        const yearlyAvg = valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
        return { student, termAverages: termData, yearlyAverage: yearlyAvg };
      }));

      res.json({ students: studentPerformance, terms });
    } catch (err) { next(err); }
  },

  async subjectAverages(req, res, next) {
    try {
      const { class_id, term, academic_year } = req.query;
      if (!class_id || !term || !academic_year) {
        return res.status(400).json({ error: 'class_id, term, academic_year required.' });
      }

      const scores = await ScoreModel.getClassTermScores(class_id, term, academic_year, req.user.school_id);
      const subjects = await SubjectModel.findAll(req.user.school_id);

      const data = subjects.map(subject => {
        const subjectScores = scores.filter(s => s.subject_id === subject.id);
        const avg = subjectScores.length > 0
          ? subjectScores.reduce((sum, s) => sum + parseFloat(s.total), 0) / subjectScores.length
          : 0;
        return { subject_id: subject.id, subject: subject.name, average: parseFloat(avg.toFixed(1)) };
      }).filter(d => d.average > 0);

      res.json(data);
    } catch (err) { next(err); }
  }
};
