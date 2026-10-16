import { api } from './client.js';

export const storesApi = {
  browse: (params) => api.get('/stores', { params }).then((r) => r.data),
  rate: (storeId, rating) => api.put(`/stores/${storeId}/rating`, { rating }).then((r) => r.data),
};
