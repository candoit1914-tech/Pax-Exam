import { SchoolModel } from '../models/school.model.js';

export const SchoolController = {
  async getProfile(req, res, next) {
    try {
      const school = await SchoolModel.findById(req.user.school_id);
      if (!school) return res.status(404).json({ error: 'School not found.' });
      res.json(school);
    } catch (err) { next(err); }
  },

  async updateProfile(req, res, next) {
    try {
      const allowed = ['name', 'address', 'location', 'phone', 'email', 'logo', 'principal_signature'];
      const updates = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }
      const school = await SchoolModel.update(req.user.school_id, updates);
      res.json(school);
    } catch (err) { next(err); }
  }
};
