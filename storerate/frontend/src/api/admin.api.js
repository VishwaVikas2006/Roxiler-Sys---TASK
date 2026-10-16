import { api } from './client.js';

export const adminApi = {
  dashboard: () => api.get('/admin/dashboard').then((r) => r.data),
  listUsers: (params) => api.get('/admin/users', { params }).then((r) => r.data),
  createUser: (payload) => api.post('/admin/users', payload).then((r) => r.data),
  getUser: (id) => api.get(`/admin/users/${id}`).then((r) => r.data),
  listStores: (params) => api.get('/admin/stores', { params }).then((r) => r.data),
  createStore: (payload) => api.post('/admin/stores', payload).then((r) => r.data),
  unassignedOwners: () =>
    api
      .get('/admin/users', { params: { unassignedOwners: true, limit: 100, sortBy: 'name' } })
      .then((r) => r.data),
};
