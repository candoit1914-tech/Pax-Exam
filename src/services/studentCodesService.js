import api from './api';

export const studentCodesService = {
  async generateCode(studentId) {
    const { data } = await api.post('/student-codes/generate', { studentId });
    return data;
  },

  async generateBulkCodes(params) {
    const { data } = await api.post('/student-codes/generate-bulk', params);
    return data;
  },

  async getStudentCodes(params = {}) {
    const { data } = await api.get('/student-codes', { params });
    return data;
  },

  async regenerateCode(studentId) {
    const { data } = await api.put(`/student-codes/${studentId}/regenerate`);
    return data;
  }
};
