import { api } from './client.js';

export const ownerApi = {
  dashboard: () => api.get('/owner/dashboard').then((r) => r.data),
  ratings: (params) => api.get('/owner/ratings', { params }).then((r) => r.data),
};
