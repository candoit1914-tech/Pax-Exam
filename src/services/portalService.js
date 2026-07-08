import api from './api';

export const portalService = {
  async generateCode(studentId, purpose = 'report') {
    const { data } = await api.post('/portal/generate-code', { studentId, purpose });
    return data;
  },

  async getCodes() {
    const { data } = await api.get('/portal/codes');
    return data;
  },

  async getReportByCode(code) {
    const res = await fetch(`${api.defaults.baseURL}/portal/report/${code}`);
    if (!res.ok) throw new Error((await res.json()).error || 'Invalid code');
    return res.json();
  },

  async redeemCode(code) {
    const { data } = await api.post('/portal/redeem-code', { code });
    return data;
  }
};
