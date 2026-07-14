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

  async getReportByCode(code, term, academicYear) {
    let url = `${api.defaults.baseURL}/portal/report/${code}`;
    const params = new URLSearchParams();
    if (term) params.append('term', term);
    if (academicYear) params.append('academic_year', academicYear);
    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error((await res.json()).error || 'Invalid code');
    return res.json();
  },

  async getAvailableTerms(code) {
    const res = await fetch(`${api.defaults.baseURL}/portal/terms/${code}`);
    if (!res.ok) throw new Error('Failed to fetch terms');
    return res.json();
  },

  async redeemCode(code) {
    const { data } = await api.post('/portal/redeem-code', { code });
    return data;
  }
};
