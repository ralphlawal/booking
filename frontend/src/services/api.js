import axios from 'axios';

// Local dev: Vite proxy handles /api → localhost:5001
// Production: /api/proxy/* → Vercel edge function → Render (same-origin, no CORS)
const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : import.meta.env.PROD
  ? '/api/proxy'
  : '/api';

const api = axios.create({
  baseURL: BASE,
  timeout: 30000,
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('fbToken');
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
  firebaseSync: (idToken, displayName) => api.post('/auth/firebase-sync', { idToken, displayName }),
  me: () => api.get('/auth/me'),
  deleteAccount: () => api.delete('/auth/account'),
  verifyEmail: (token) => api.get('/auth/verify-email', { params: { token } }),
};

export const businessAPI = {
  get: () => api.get('/business/me'),
  create: (data) => api.post('/business', data),
  update: (data) => api.put('/business/me', data),
  updateLogoUrl: (logo_url) => api.put('/business/me', { logo_url }),
  uploadLogo: (file, onProgress) => {
    const formData = new FormData();
    formData.append('logo', file);
    return api.post('/business/me/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress && onProgress(Math.round((e.loaded / e.total) * 100)),
    });
  },
  getPublic: (slug) => api.get(`/business/${slug}`),
  checkSlug: (slug) => api.get(`/business/${slug}/check`),
  getQR: () => api.get('/business/me/qr'),
  getAnalytics: () => api.get('/bookings/analytics'),
  requestVerification: () => api.post('/business/me/request-verification'),
  submitVerificationDetails: (data) => api.post('/business/me/verification-details', data),
  saveBankDetails: (data) => api.put('/business/me/bank-details', data),
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
  getPublicHours: (slug) => api.get(`/availability/public/${slug}/hours`),
  getBlocked: () => api.get('/availability/blocked'),
  block: (data) => api.post('/availability/blocked', data),
  unblock: (id) => api.delete(`/availability/blocked/${id}`),
};

export const bookingsAPI = {
  create: (slug, data) => api.post(`/bookings/public/${slug}`, data),
  getByRef: (ref) => api.get(`/bookings/ref/${ref}`),
  lookup: (reference_id, email) => api.post('/bookings/lookup', { reference_id, email }),
  list: (params) => api.get('/bookings', { params }),
  getById: (id) => api.get(`/bookings/${id}`),
  updateStatus: (id, status, cancelled_reason, no_show) =>
    api.put(`/bookings/${id}/status`, { status, cancelled_reason, no_show: !!no_show }),
  reschedule: (id, data) => api.put(`/bookings/${id}/reschedule`, data),
  getAnalytics: () => api.get('/bookings/analytics'),
};

export const customersAPI = {
  list: () => api.get('/customers'),
  getBookings: (id) => api.get(`/customers/${id}/bookings`),
  updateNotes: (id, notes) => api.put(`/customers/${id}/notes`, { notes }),
};

export const exportBookingsCsv = () => {
  const token = localStorage.getItem('fbToken');
  const base = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : import.meta.env.PROD ? '/api/proxy' : '/api';
  const url = `${base}/bookings/export/csv`;
  const a = document.createElement('a');
  a.href = url;
  a.rel = 'noopener';
  // Use fetch so we can add the auth header, then trigger download
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.blob())
    .then(blob => {
      const blobUrl = URL.createObjectURL(blob);
      a.href = blobUrl;
      a.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    });
};

const CONSUMER_TOKEN_KEY = 'customerToken';

const consumerAxios = axios.create({ baseURL: BASE, timeout: 30000 });
consumerAxios.interceptors.request.use(config => {
  const token = localStorage.getItem(CONSUMER_TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
consumerAxios.interceptors.response.use(
  res => res.data,
  err => {
    const error = new Error(err.response?.data?.error || err.message || 'Something went wrong');
    error.status = err.response?.status;
    return Promise.reject(error);
  }
);

export const consumerAPI = {
  register: (data) => consumerAxios.post('/consumer/register', data),
  login: (email, password) => consumerAxios.post('/consumer/login', { email, password }),
  googleAuth: (idToken) => consumerAxios.post('/consumer/google-auth', { idToken }),
  forgotPassword: (email) => consumerAxios.post('/consumer/forgot-password', { email }),
  resetPassword: (token, password) => consumerAxios.post('/consumer/reset-password', { token, password }),
  changeEmail: (new_email, password) => consumerAxios.post('/consumer/change-email', { new_email, password }),
  changePassword: (current_password, new_password) => consumerAxios.post('/consumer/change-password', { current_password, new_password }),
  me: () => consumerAxios.get('/consumer/me'),
  updateMe: (data) => consumerAxios.put('/consumer/me', data),
  myBookings: () => consumerAxios.get('/consumer/bookings'),
  getPreferences: () => consumerAxios.get('/consumer/preferences'),
  savePreference: (data) => consumerAxios.post('/consumer/preferences', data),
  removePreference: (businessId) => consumerAxios.delete(`/consumer/preferences/${businessId}`),
  deleteAccount: () => consumerAxios.delete('/consumer/account'),
  getNotifications: () => consumerAxios.get('/consumer/notifications'),
  markNotificationsRead: () => consumerAxios.post('/consumer/notifications/read'),
  verifyEmail: (token) => consumerAxios.get('/consumer/verify-email', { params: { token } }),
  resendVerification: () => consumerAxios.post('/consumer/resend-verification'),
  cancelBooking: (ref) => consumerAxios.post(`/bookings/ref/${ref}/cancel`),
  confirmService: (ref, consumer_id) => consumerAxios.post(`/bookings/ref/${ref}/confirm-service`, { consumer_id }),
  raiseDispute: (ref, data) => consumerAxios.post(`/bookings/ref/${ref}/dispute`, data),
};

export const adminDisputesAPI = {
  getDisputes: () => {
    const token = localStorage.getItem('adminSupportToken');
    return axios.get(`${BASE}/bookings/admin/disputes`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.data);
  },
  resolveDispute: (id, data) => {
    const token = localStorage.getItem('adminSupportToken');
    return axios.post(`${BASE}/bookings/admin/disputes/${id}/resolve`, data, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.data);
  },
};

export const discoverAPI = {
  search: (params) => api.get('/discover', { params }),
  categories: () => api.get('/discover/categories'),
  match: (params) => api.get('/discover/match', { params }),
};

export const paymentsAPI = {
  createIntent: (data) => api.post('/payments/create-intent', data),
  getForBooking: (bookingId) => api.get(`/payments/booking/${bookingId}`),
};

export const reviewsAPI = {
  getForBusiness: (slug) => api.get(`/reviews/${slug}`),
  create: (data) => consumerAxios.post('/reviews', data),
  checkReviewable: (bookingId) => consumerAxios.get(`/reviews/check/${bookingId}`),
};

const ADMIN_TOKEN_KEY = 'adminSupportToken';
const adminAxios = axios.create({ baseURL: BASE, timeout: 30000 });
adminAxios.interceptors.request.use(config => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
adminAxios.interceptors.response.use(
  res => res.data,
  err => Promise.reject(new Error(err.response?.data?.error || err.message || 'Something went wrong'))
);

export const businessChatAPI = {
  getRooms: () => api.get('/chat/business/rooms'),
  createRoom: (data) => api.post('/chat/business/rooms', data),
  getMessages: (id, since) => api.get(`/chat/business/rooms/${id}/messages`, { params: since ? { since } : {} }),
  sendMessage: (id, content) => api.post(`/chat/business/rooms/${id}/messages`, { content }),
};

export const consumerChatAPI = {
  getRooms: () => consumerAxios.get('/chat/consumer/rooms'),
  createRoom: (data) => consumerAxios.post('/chat/consumer/rooms', data),
  getMessages: (id, since) => consumerAxios.get(`/chat/consumer/rooms/${id}/messages`, { params: since ? { since } : {} }),
  sendMessage: (id, content) => consumerAxios.post(`/chat/consumer/rooms/${id}/messages`, { content }),
};

export const broadcastAPI = {
  getActive: () => axios.get(`${BASE}/broadcasts/active`).then(r => r.data),
  list: () => adminAxios.get('/broadcasts'),
  create: (data) => adminAxios.post('/broadcasts', data),
  deactivate: (id) => adminAxios.patch(`/broadcasts/${id}/deactivate`),
};

export const referralAPI = {
  get: () => consumerAxios.get('/consumer/referral'),
};

export const adminPanelAPI = {
  getStats: () => adminAxios.get('/admin/stats'),
  getBusinesses: () => adminAxios.get('/admin/businesses'),
  verifyBusiness: (id) => adminAxios.patch(`/admin/businesses/${id}/verify`),
  rejectVerification: (id) => adminAxios.patch(`/admin/businesses/${id}/reject-verify`),
  suspendBusiness: (id, active) => adminAxios.patch(`/admin/businesses/${id}/suspend`, { active }),
  getConsumers: () => adminAxios.get('/admin/consumers'),
};

export const adminChatAPI = {
  login: (password) => adminAxios.post('/chat/admin/login', { password }),
  getRooms: () => adminAxios.get('/chat/admin/rooms'),
  createRoom: (data) => adminAxios.post('/chat/admin/rooms', data),
  getMessages: (id, since) => adminAxios.get(`/chat/admin/rooms/${id}/messages`, { params: since ? { since } : {} }),
  sendMessage: (id, content) => adminAxios.post(`/chat/admin/rooms/${id}/messages`, { content }),
  getUsers: () => adminAxios.get('/chat/admin/users'),
};

export default api;
