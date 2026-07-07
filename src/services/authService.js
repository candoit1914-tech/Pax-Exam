import api from './api';

export const authService = {
  async login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },

  async logout() {
    try { await api.post('/auth/logout'); } catch { }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('auth');
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
  }
};
