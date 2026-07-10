import api from './api';

export const scoreService = {
  async getAll(params = {}) {
    const { data } = await api.get('/scores', { params });
    return data;
  },

  async getById(id) {
    const { data } = await api.get(`/scores/${id}`);
    return data;
  },

  async upsert(score) {
    const { data } = await api.post('/scores', score);
    return data;
  },

  async bulkUpsert(scores) {
    const { data } = await api.post('/scores/bulk', { scores });
    return data;
  },

  async delete(id) {
    const { data } = await api.delete(`/scores/${id}`);
    return data;
  },

  async getTermReport(params) {
    const { data } = await api.get('/scores/term-report', { params });
    return data;
  },

  async getDashboard(params = {}) {
    const { data } = await api.get('/scores/dashboard', { params });
    return data;
  }
};
