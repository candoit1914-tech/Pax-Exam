import { TeacherModel } from '../models/teacher.model.js';

export const TeacherController = {
  async getAll(req, res, next) {
    try {
      const teachers = await TeacherModel.findAll(req.user.school_id);
      res.json(teachers);
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const teacher = await TeacherModel.create({ ...req.body, school_id: req.user.school_id });
      res.status(201).json(teacher);
    } catch (err) { next(err); }
  },

  async update(req, res, next) {
    try {
      const teacher = await TeacherModel.update(req.params.id, req.user.school_id, req.body);
      if (!teacher) return res.status(404).json({ error: 'Teacher not found.' });
      res.json(teacher);
    } catch (err) { next(err); }
  },

  async delete(req, res, next) {
    try {
      const result = await TeacherModel.delete(req.params.id, req.user.school_id);
      if (!result) return res.status(404).json({ error: 'Teacher not found.' });
      res.json({ message: 'Teacher deleted.' });
    } catch (err) { next(err); }
  }
};
