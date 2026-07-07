import api from './api';

export const subjectService = {
  async getAll() {
    const { data } = await api.get('/subjects');
    return data;
  },

  async create(subject) {
    const { data } = await api.post('/subjects', subject);
    return data;
  },

  async update(id, subject) {
    const { data } = await api.put(`/subjects/${id}`, subject);
    return data;
  },

  async delete(id) {
    const { data } = await api.delete(`/subjects/${id}`);
    return data;
  }
};
