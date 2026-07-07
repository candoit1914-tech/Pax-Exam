import api from './api';

export const teacherService = {
  async getAll() {
    const { data } = await api.get('/teachers');
    return data;
  },

  async create(teacher) {
    const { data } = await api.post('/teachers', teacher);
    return data;
  },

  async update(id, teacher) {
    const { data } = await api.put(`/teachers/${id}`, teacher);
    return data;
  },

  async delete(id) {
    const { data } = await api.delete(`/teachers/${id}`);
    return data;
  }
};
