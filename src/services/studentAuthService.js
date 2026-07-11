import api from './api';

export const studentAuthService = {
  async login(loginCode) {
    const { data } = await api.post('/student-auth/login', { loginCode });
    return data;
  },

  async refreshToken(refreshToken) {
    const { data } = await api.post('/student-auth/refresh', { refreshToken });
    return data;
  },

  async getMe() {
    const { data } = await api.get('/student-auth/me');
    return data;
  },

  async getStudentScores(studentId) {
    const { data } = await api.get(`/student-auth/scores/${studentId}`);
    return data;
  },

  async getStudentProfile(studentId) {
    const { data } = await api.get(`/student-auth/profile/${studentId}`);
    return data;
  },

  async logout() {
    try { await api.post('/auth/logout'); } catch { }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('auth');
    localStorage.removeItem('appVersion');
  }
};
