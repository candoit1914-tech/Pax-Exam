import api from './api';

export const reportService = {
  async studentReport(params) {
    const { data } = await api.get('/reports/student', { params });
    return data;
  },

  async classReport(params) {
    const { data } = await api.get('/reports/class', { params });
    return data;
  },

  async performanceTable(params) {
    const { data } = await api.get('/reports/performance-table', { params });
    return data;
  },

  async subjectAverages(params) {
    const { data } = await api.get('/reports/subject-averages', { params });
    return data;
  }
};
