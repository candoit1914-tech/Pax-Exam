import api from './api';

export const studentService = {
  async getAll(params = {}) {
    const { data } = await api.get('/students', { params });
    return data;
  },

  async getById(id) {
    const { data } = await api.get(`/students/${id}`);
    return data;
  },

  async getProfile(id) {
    const { data } = await api.get(`/students/${id}/profile`);
    return data;
  },

  async create(student) {
    const { data } = await api.post('/students', student);
    return data;
  },

  async update(id, student) {
    const { data } = await api.put(`/students/${id}`, student);
    return data;
  },

  async delete(id) {
    const { data } = await api.delete(`/students/${id}`);
    return data;
  },

  async bulkDelete(ids) {
    const { data } = await api.delete('/students/bulk', { data: { ids } });
    return data;
  },

  async getRanking(params) {
    const { data } = await api.get('/students/ranking', { params });
    return data;
  },

  async transition(studentId, targetAction, targetClassId) {
    const { data } = await api.post('/students/transition', { studentId, targetAction, targetClassId });
    return data;
  },

  async bulkTransition(fromClassId, toClassId, exceptions = {}) {
    const { data } = await api.post('/students/bulk-transition', { fromClassId, toClassId, exceptions });
    return data;
  }
};
