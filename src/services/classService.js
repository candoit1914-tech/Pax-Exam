import api from './api';

export const classService = {
  async getAll() {
    const { data } = await api.get('/classes');
    return data;
  },

  async getById(id) {
    const { data } = await api.get(`/classes/${id}`);
    return data;
  },

  async create(cls) {
    const { data } = await api.post('/classes', cls);
    return data;
  },

  async update(id, cls) {
    const { data } = await api.put(`/classes/${id}`, cls);
    return data;
  },

  async delete(id) {
    const { data } = await api.delete(`/classes/${id}`);
    return data;
  }
};
