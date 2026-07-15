import api from './api';

export const authService = {
  async login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },

  async logout() {
    try { await api.post('/auth/logout'); } catch { }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('auth');
    localStorage.removeItem('appVersion');
  },

  async register(userData) {
    const { data } = await api.post('/auth/register', userData);
    return data;
  },

  async refreshToken(refreshToken) {
    const { data } = await api.post('/auth/refresh', { refreshToken });
    return data;
  },

  async getMe() {
    const { data } = await api.get('/auth/me');
    return data;
  },

  async createTeacher(name, email) {
    const { data } = await api.post('/auth/create-teacher', { name, email });
    return data;
  },

  async resetTeacherPassword(id) {
    const { data } = await api.put(`/auth/teacher/${id}/reset-password`);
    return data;
  },

  async listTeachers() {
    const { data } = await api.get('/auth/teachers');
    return data;
  },

  async updateTeacher(id, name, email) {
    const { data } = await api.put(`/auth/teacher/${id}`, { name, email });
    return data;
  },

  async deleteTeacher(id) {
    const { data } = await api.delete(`/auth/teacher/${id}`);
    return data;
  },

  async updateProfile(name, email) {
    const { data } = await api.put('/auth/profile', { name, email });
    return data;
  },

  async changePassword(currentPassword, newPassword) {
    const { data } = await api.put('/auth/password', { currentPassword, newPassword });
    return data;
  }
};
