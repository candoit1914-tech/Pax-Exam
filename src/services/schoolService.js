import api from './api';

export const schoolService = {
  async getProfile() {
    const { data } = await api.get('/schools/profile');
    return data;
  },

  async updateProfile(profile) {
    const { data } = await api.put('/schools/profile', profile);
    return data;
  }
};
