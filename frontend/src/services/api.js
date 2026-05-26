import axios from 'axios';

// Local dev: Vite proxy handles /api → localhost:5001.
// Production: /api/* is handled by a Vercel edge catch-all and forwarded to Render.
const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : import.meta.env.PROD
  ? '/api'
  : '/api';

// Kick the backend out of sleep on app load through the configured API route.
// This avoids hardcoding an old Render URL and works through the Vercel proxy too.
if (import.meta.env.PROD) {
  fetch(`${BASE}/health`).catch(() => {});
}

const RETRY_DELAY_MS = 38000; // wait 38s then retry — Render typically wakes in 30-45s

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
    // Auto-retry GET requests once after a delay when the server is cold-starting
    const config = err.config;
    const isTimeout = err.code === 'ECONNABORTED'
      || err.message?.includes('timeout')
      || err.response?.status === 504;
    const isGet = config?.method === 'get';
    if (isGet && isTimeout && !config._retried) {
      config._retried = true;
      return new Promise(resolve =>
        setTimeout(() => resolve(api(config)), RETRY_DELAY_MS)
      );
    }
    const error = new Error(err.response?.data?.error || err.message || 'Something went wrong');
    error.status = err.response?.status;
    error.code = err.response?.data?.code;
    return Promise.reject(error);
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

export const stripeConnectAPI = {
  onboard: () => api.post('/business/me/stripe-connect/onboard'),
  status: () => api.get('/business/me/stripe-connect/status'),
  dashboard: () => api.post('/business/me/stripe-connect/dashboard'),
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
  createWalkin: (data) => api.post('/bookings/walkin', data),
};

export const customersAPI = {
  list: () => api.get('/customers'),
  getBookings: (id) => api.get(`/customers/${id}/bookings`),
  updateNotes: (id, notes) => api.put(`/customers/${id}/notes`, { notes }),
};

export const exportBookingsCsv = () => {
  const token = localStorage.getItem('fbToken');
  const base = BASE;
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
    const config = err.config;
    const isTimeout = err.code === 'ECONNABORTED'
      || err.message?.includes('timeout')
      || err.response?.status === 504;
    if (config?.method === 'get' && isTimeout && !config._retried) {
      config._retried = true;
      return new Promise(resolve => setTimeout(() => resolve(consumerAxios(config)), RETRY_DELAY_MS));
    }
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
  rescheduleRequest: (ref, data) => consumerAxios.post(`/bookings/ref/${ref}/reschedule-request`, data),
  uploadAvatar: (file) => {
    const form = new FormData();
    form.append('avatar', file);
    return consumerAxios.post('/consumer/me/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

// adminDisputesAPI defined below after adminAxios is created

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
  err => {
    const config = err.config;
    const status = err.response?.status;
    // Auth failure — clear stale token and signal the panel to show login again
    if (status === 401 || status === 403) {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      window.dispatchEvent(new CustomEvent('admin-auth-expired'));
      return Promise.reject(new Error('Session expired — please log in again'));
    }
    const isTimeout = err.code === 'ECONNABORTED'
      || err.message?.includes('timeout')
      || status === 504;
    if (config?.method === 'get' && isTimeout && !config._retried) {
      config._retried = true;
      return new Promise(resolve => setTimeout(() => resolve(adminAxios(config)), RETRY_DELAY_MS));
    }
    return Promise.reject(new Error(err.response?.data?.error || err.message || 'Something went wrong'));
  }
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

export const adminDisputesAPI = {
  getDisputes: () => adminAxios.get('/bookings/admin/disputes'),
  resolveDispute: (id, data) => adminAxios.post(`/bookings/admin/disputes/${id}/resolve`, data),
};

export const broadcastAPI = {
  getActive: () => api.get('/broadcasts/active'),
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
  editBusiness: (id, data) => adminAxios.put(`/admin/businesses/${id}`, data),
  getConsumers: () => adminAxios.get('/admin/consumers'),
  updateConsumer: (id, data) => adminAxios.put(`/admin/consumers/${id}`, data),
  notifyConsumer: (id, data) => adminAxios.post(`/admin/consumers/${id}/notify`, data),
  getPlatformBookings: (params) => adminAxios.get('/admin/bookings', { params }),
  updatePlatformBooking: (id, data) => adminAxios.patch(`/admin/bookings/${id}`, data),
  getFinancialReport: (period) => adminAxios.get('/admin/financial', { params: { period } }),
  getLaunchReadiness: () => adminAxios.get('/admin/launch-readiness'),
  getManualPayouts: () => adminAxios.get('/admin/manual-payouts'),
  markManualPaid: (businessId) => adminAxios.post(`/admin/manual-payouts/${businessId}/mark-paid`),
  triggerAutoRelease: () => adminAxios.post('/bookings/admin/auto-release'),
  reconcilePayments: () => adminAxios.post('/admin/reconcile-payments'),
};

export const staffAPI = {
  list: () => api.get('/staff'),
  listPublic: (slug) => api.get(`/staff/public/${slug}`),
  create: (data) => api.post('/staff', data),
  update: (id, data) => api.put(`/staff/${id}`, data),
  remove: (id) => api.delete(`/staff/${id}`),
};

export const photosAPI = {
  listPublic: (slug) => api.get(`/photos/public/${slug}`),
  list: () => api.get('/photos'),
  upload: (file, caption) => {
    const form = new FormData();
    form.append('photo', file);
    if (caption) form.append('caption', caption);
    return api.post('/photos', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  remove: (id) => api.delete(`/photos/${id}`),
  reorder: (order) => api.put('/photos/reorder', { order }),
};

export const waitlistAPI = {
  join: (slug, data) => api.post(`/waitlist/${slug}`, data),
  list: () => api.get('/waitlist'),
  update: (id, status) => api.patch(`/waitlist/${id}`, { status }),
  remove: (id) => api.delete(`/waitlist/${id}`),
};

export const promoAPI = {
  list: () => api.get('/promo'),
  create: (data) => api.post('/promo', data),
  update: (id, data) => api.patch(`/promo/${id}`, data),
  remove: (id) => api.delete(`/promo/${id}`),
  validate: (code, business_slug, order_amount) =>
    api.post('/promo/validate', { code, business_slug, order_amount }),
};

export const postsAPI = {
  create: (formData) => api.post('/posts', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  list: () => api.get('/posts'),
  getPublic: (slug) => api.get(`/posts/public/${slug}`),
  getFeed: (params) => api.get('/posts/feed', { params }),
  remove: (id) => api.delete(`/posts/${id}`),
  recordView: (id) => api.post(`/posts/${id}/view`),
  recordBookClick: (id) => api.post(`/posts/${id}/book-click`),
};

export const followsAPI = {
  follow: (slug) => consumerAxios.post(`/follows/${slug}`),
  unfollow: (slug) => consumerAxios.delete(`/follows/${slug}`),
  check: (slug) => consumerAxios.get(`/follows/check/${slug}`),
  count: (slug) => api.get(`/follows/count/${slug}`),
  feed: (params) => consumerAxios.get('/follows/feed', { params }),
};

export const intakeAPI = {
  getPublic: (slug) => api.get(`/intake/public/${slug}`),
  get: () => api.get('/intake'),
  save: (data) => api.put('/intake', data),
  listResponses: () => api.get('/intake/responses'),
  respond: (data) => api.post('/intake/respond', data),
};

export const reviewReplyAPI = {
  reply: (reviewId, reply_text) => api.post(`/reviews/${reviewId}/reply`, { reply_text }),
  deleteReply: (reviewId) => api.delete(`/reviews/${reviewId}/reply`),
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
