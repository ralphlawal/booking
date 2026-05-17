import axios from 'axios';

// In production: VITE_API_URL=https://bookly-api.onrender.com
// In local dev: Vite proxy handles /api → localhost:5001
const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

const api = axios.create({
  baseURL: BASE,
  timeout: 15000,
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res.data,
  err => {
    const message = err.response?.data?.error || err.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export const authAPI = {
  register: (email, password, full_name) => api.post('/auth/register', { email, password, full_name }),
  login: (email, password) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
};

export const businessAPI = {
  get: () => api.get('/business/me'),
  create: (data) => api.post('/business', data),
  update: (data) => api.put('/business/me', data),
  uploadLogo: (file) => {
    const form = new FormData();
    form.append('logo', file);
    return api.post('/business/me/logo', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  getPublic: (slug) => api.get(`/business/${slug}`),
  checkSlug: (slug) => api.get(`/business/${slug}/check`),
  getQR: () => api.get('/business/me/qr'),
};

export const servicesAPI = {
  list: () => api.get('/services'),
  listPublic: (slug) => api.get(`/business/${slug}/services`),
  create: (data) => api.post('/services', data),
  update: (id, data) => api.put(`/services/${id}`, data),
  delete: (id) => api.delete(`/services/${id}`),
};

export const availabilityAPI = {
  get: () => api.get('/availability'),
  save: (data) => api.post('/availability', data),
  getSlots: (slug, date, service_id) =>
    api.get(`/availability/public/${slug}/slots`, { params: { date, service_id } }),
  getBlocked: () => api.get('/availability/blocked'),
  block: (data) => api.post('/availability/blocked', data),
  unblock: (id) => api.delete(`/availability/blocked/${id}`),
};

export const bookingsAPI = {
  create: (slug, data) => api.post(`/bookings/public/${slug}`, data),
  getByRef: (ref) => api.get(`/bookings/ref/${ref}`),
  list: (params) => api.get('/bookings', { params }),
  getById: (id) => api.get(`/bookings/${id}`),
  updateStatus: (id, status, cancelled_reason) =>
    api.put(`/bookings/${id}/status`, { status, cancelled_reason }),
  reschedule: (id, data) => api.put(`/bookings/${id}/reschedule`, data),
};

export const customersAPI = {
  list: () => api.get('/customers'),
};

export default api;
