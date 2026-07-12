import { ClassModel } from '../models/class.model.js';

export const ClassController = {
  async getAll(req, res, next) {
    try {
      const classes = await ClassModel.findAll(req.user.school_id);
      res.json(classes);
    } catch (err) { next(err); }
  },

  async getMyClasses(req, res, next) {
    try {
      const classes = await ClassModel.findByTeacherUserId(req.user.id, req.user.school_id);
      res.json(classes);
    } catch (err) { next(err); }
  },

  async getById(req, res, next) {
    try {
      const cls = await ClassModel.findById(req.params.id, req.user.school_id);
      if (!cls) return res.status(404).json({ error: 'Class not found.' });
      res.json(cls);
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const cls = await ClassModel.create({ ...req.body, school_id: req.user.school_id });
      res.status(201).json(cls);
    } catch (err) { next(err); }
  },

  async update(req, res, next) {
    try {
      const cls = await ClassModel.update(req.params.id, req.user.school_id, req.body);
      if (!cls) return res.status(404).json({ error: 'Class not found.' });
      res.json(cls);
    } catch (err) { next(err); }
  },

  async delete(req, res, next) {
    try {
      const result = await ClassModel.delete(req.params.id, req.user.school_id);
      if (!result) return res.status(404).json({ error: 'Class not found.' });
      res.json({ message: 'Class deleted.' });
    } catch (err) { next(err); }
  }
};
