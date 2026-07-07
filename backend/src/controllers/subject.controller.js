import { SubjectModel } from '../models/subject.model.js';

export const SubjectController = {
  async getAll(req, res, next) {
    try {
      const subjects = await SubjectModel.findAll(req.user.school_id);
      res.json(subjects);
    } catch (err) { next(err); }
  },

  async getById(req, res, next) {
    try {
      const subject = await SubjectModel.findById(req.params.id, req.user.school_id);
      if (!subject) return res.status(404).json({ error: 'Subject not found.' });
      res.json(subject);
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const subject = await SubjectModel.create({ ...req.body, school_id: req.user.school_id });
      res.status(201).json(subject);
    } catch (err) { next(err); }
  },

  async update(req, res, next) {
    try {
      const subject = await SubjectModel.update(req.params.id, req.user.school_id, req.body);
      if (!subject) return res.status(404).json({ error: 'Subject not found.' });
      res.json(subject);
    } catch (err) { next(err); }
  },

  async delete(req, res, next) {
    try {
      const result = await SubjectModel.delete(req.params.id, req.user.school_id);
      if (!result) return res.status(404).json({ error: 'Subject not found.' });
      res.json({ message: 'Subject deleted.' });
    } catch (err) { next(err); }
  }
};
