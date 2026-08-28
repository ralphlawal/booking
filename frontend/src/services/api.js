import axios from 'axios';
import { apiBaseUrl } from '../config/platform';
import { shareCsvFile } from './nativeBridge';

// Local dev: Vite proxy handles /api → localhost:5001.
// Production: /api/* is handled by a Vercel edge catch-all and forwarded to Render.
const BASE = apiBaseUrl;

// Kick the backend out of sleep on app load through the configured API route.
// This avoids hardcoding an old Render URL and works through the Vercel proxy too.
if (import.meta.env.PROD) {
  fetch(`${BASE}/health`).catch(() => {});
}

const RETRY_DELAY_MS = 3000;

const isNetworkError = (err) => err.message === 'Network Error' || !err.response;
const isTimeoutError = (err) =>
  err.code === 'ECONNABORTED'
  || err.message?.includes('timeout')
  || err.response?.status === 504;

function userFacingApiMessage(err, fallback = 'Something went wrong') {
  if (err.response?.status === 401) return 'Your session has expired. Please sign in again.';
  if (err.response?.status === 403) return 'You don’t have permission to do that.';
  if (isNetworkError(err)) {
    return typeof navigator !== 'undefined' && navigator.onLine === false
      ? 'You appear to be offline. Check your internet connection and try again.'
      : 'Could not connect to BookAm. Please try again in a moment.';
  }
  if (err.response?.status === 500 || err.response?.status === 502 || err.response?.status === 503 || err.response?.status === 504) {
    return 'BookAm is temporarily unavailable. Please try again shortly.';
  }
  if (err.response?.status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  const candidate = err.response?.data?.error || err.message || fallback;
  // Never surface raw server/database errors to customers or businesses.
  if (/\b(500|502|503|504|internal server|postgres|sqlite|stack|exception)\b/i.test(candidate)) return 'Something went wrong. Please try again.';
  return candidate;
}

const api = axios.create({
  baseURL: BASE,
  timeout: 30000,
});

let businessSessionRefresher = null;
let consumerSessionRefresher = null;

// Auth contexts register these once they have mounted. Keeping the recovery
// here means an expired access JWT is renewed for every request, not just when
// the app first opens.
export const registerBusinessSessionRefresher = (refresh) => { businessSessionRefresher = refresh; };
export const registerConsumerSessionRefresher = (refresh) => { consumerSessionRefresher = refresh; };

api.interceptors.request.use(config => {
  const token = localStorage.getItem('bam_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res.data,
  async err => {
    // Auto-retry GET requests once after a delay when the server is cold-starting
    const config = err.config;
    const isNetwork = isNetworkError(err);
    const isTimeout = isTimeoutError(err);
    const isGet = config?.method === 'get';
    if (err.response?.status === 401 && !config?._sessionRetried && !String(config?.url || '').includes('/auth/refresh') && businessSessionRefresher) {
      config._sessionRetried = true;
      try {
        await businessSessionRefresher();
        return api(config);
      } catch {
        // The context will decide whether a failed refresh should log out or
        // retain a cached offline session.
      }
    }
    if (isGet && (isTimeout || isNetwork) && !config._retried) {
      config._retried = true;
      return new Promise(resolve =>
        setTimeout(() => resolve(api(config)), RETRY_DELAY_MS)
      );
    }
    const message = userFacingApiMessage(err);
    const error = new Error(message);
    error.status = err.response?.status;
    error.code = err.response?.data?.code || err.response?.data?.hint;
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (email, password, full_name) => api.post('/auth/register', { email, password, full_name }),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  me: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  changePassword: (currentPassword, newPassword) => api.post('/auth/change-password', { currentPassword, newPassword }),
  sendLoginOtp: (email) => api.post('/auth/send-login-otp', { email }),
  verifyEmailOtp: (email, otp) => api.post('/auth/verify-email-otp', { email, otp }),
  sendPhoneOtp: (phone) => api.post('/auth/send-phone-otp', { phone }),
  verifyPhoneOtp: (phone, otp, full_name) => api.post('/auth/verify-phone-otp', { phone, otp, full_name }),
  deleteAccount: () => api.delete('/auth/account'),
  verifyEmail: (token) => api.get('/auth/verify-email', { params: { token } }),
  resendVerification: () => api.post('/auth/resend-verification'),
  registerPushToken: (token, userType) => api.post('/auth/push-token', { token, userType }),
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
  reorder: (ordered_ids) => api.put('/services/reorder', { ordered_ids }),
};

export const resourcesAPI = {
  list: () => api.get('/resources'),
  create: (data) => api.post('/resources', data),
  update: (id, data) => api.put(`/resources/${id}`, data),
  remove: (id) => api.delete(`/resources/${id}`),
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
  reassignStaff: (id, staff_member_id) => api.patch(`/bookings/${id}/staff`, { staff_member_id }),
};

export const customersAPI = {
  list: () => api.get('/customers'),
  create: (data) => api.post('/customers', data),
  getBookings: (id) => api.get(`/customers/${id}/bookings`),
  updateNotes: (id, notes) => api.put(`/customers/${id}/notes`, { notes }),
};

export const exportBookingsCsv = async () => {
  const token = localStorage.getItem('bam_token');
  const base = BASE;
  const url = `${base}/bookings/export/csv`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error('Could not create booking export');
  const contents = await response.text();
  await shareCsvFile({
    filename: `bookings-${new Date().toISOString().slice(0, 10)}.csv`,
    contents,
    title: 'BookAm bookings export',
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
  async err => {
    const config = err.config;
    const isNetwork = isNetworkError(err);
    const isTimeout = isTimeoutError(err);
    if (err.response?.status === 401 && !config?._sessionRetried && !String(config?.url || '').includes('/consumer/refresh') && consumerSessionRefresher) {
      config._sessionRetried = true;
      try {
        await consumerSessionRefresher();
        return consumerAxios(config);
      } catch {
        // Fall through to the normal human-readable error.
      }
    }
    if (config?.method === 'get' && (isTimeout || isNetwork) && !config._retried) {
      config._retried = true;
      return new Promise(resolve => setTimeout(() => resolve(consumerAxios(config)), RETRY_DELAY_MS));
    }
    const error = new Error(userFacingApiMessage(err));
    error.status = err.response?.status;
    error.code = err.response?.data?.code;
    return Promise.reject(error);
  }
);

export const consumerAPI = {
  register: (data) => consumerAxios.post('/consumer/register', data),
  login: (email, password) => consumerAxios.post('/consumer/login', { email, password }),
  refresh: (refreshToken) => consumerAxios.post('/consumer/refresh', { refreshToken }),
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
  registerPushToken: (token, userType) => consumerAxios.post('/consumer/push-token', { token, userType }),
  getNotifications: () => consumerAxios.get('/consumer/notifications'),
  markNotificationsRead: () => consumerAxios.post('/consumer/notifications/read'),
  verifyEmail: (token) => consumerAxios.get('/consumer/verify-email', { params: { token } }),
  resendVerification: () => consumerAxios.post('/consumer/resend-verification'),
  getLoyalty: () => consumerAxios.get('/consumer/loyalty'),
  getFamilyMembers: () => consumerAxios.get('/consumer/family-members'),
  addFamilyMember: (data) => consumerAxios.post('/consumer/family-members', data),
  updateFamilyMember: (id, data) => consumerAxios.put(`/consumer/family-members/${id}`, data),
  deleteFamilyMember: (id) => consumerAxios.delete(`/consumer/family-members/${id}`),
  cancelBooking: (ref) => consumerAxios.post(`/bookings/ref/${ref}/cancel`),
  confirmService: (ref) => consumerAxios.post(`/bookings/ref/${ref}/confirm-service`),
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
  getEligible: (slug) => consumerAxios.get(`/reviews/eligible/${slug}`),
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
    const isNetwork = isNetworkError(err);
    const isTimeout = isTimeoutError(err);
    if (config?.method === 'get' && (isTimeout || isNetwork) && !config._retried) {
      config._retried = true;
      return new Promise(resolve => setTimeout(() => resolve(adminAxios(config)), RETRY_DELAY_MS));
    }
    return Promise.reject(new Error(userFacingApiMessage(err)));
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
  getAuditLogs: () => adminAxios.get('/admin/audit-logs'),
  triggerAutoRelease: () => adminAxios.post('/bookings/admin/auto-release'),
  reconcilePayments: () => adminAxios.post('/admin/reconcile-payments'),
};

export const staffAPI = {
  list: () => api.get('/staff'),
  listPublic: (slug) => api.get(`/staff/public/${slug}`),
  create: (data) => api.post('/staff', data),
  update: (id, data) => api.put(`/staff/${id}`, data),
  remove: (id) => api.delete(`/staff/${id}`),
  report: (params) => api.get('/staff/report', { params }),
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

export const aiAPI = {
  reviewSummary: (slug) => api.get(`/ai/review-summary/${slug}`),
  noshowRisk: (bookingId) => api.get(`/ai/noshow-risk/${bookingId}`),
  rebookTiming: (consumerId, slug) => api.get(`/ai/rebook-timing/${consumerId}/${slug}`),
  matchService: (q) => api.post('/ai/match-service', { q }),
  chatBooking: (slug, messages, bookingState) => api.post(`/ai/chat-booking/${slug}`, { messages, bookingState }),
  generateDescription: () => api.post('/ai/generate-description'),
  gapSuggestions: () => api.get('/ai/gap-suggestions'),
  reassignSuggestion: (bookingId) => api.get(`/ai/reassign-suggestion/${bookingId}`),
  personaliseMessage: (data) => api.post('/ai/personalise-message', data),
};

export const growthAPI = {
  integrations:  () => api.get('/growth/integrations'),
  intelligence:  () => api.get('/growth/intelligence'),
  audienceCount: (audience) => api.get('/growth/audience-count', { params: { audience } }),
  campaigns:     () => api.get('/growth/campaigns'),
  createCampaign: (data) => api.post('/growth/campaigns', data),
  sendCampaign:  (id) => api.patch(`/growth/campaigns/${id}/send`),
  deleteCampaign: (id) => api.delete(`/growth/campaigns/${id}`),
  automations:   () => api.get('/growth/automations'),
  toggleAutomation: (trigger_type, data) => api.patch(`/growth/automations/${trigger_type}/toggle`, data),
  loyalty:       () => api.get('/growth/loyalty'),
  reviews:       () => api.get('/growth/reviews'),
};

/* ── Loyalty ─────────────────────────────────────────────────────────────── */
export const loyaltyAPI = {
  getProgram:     () => api.get('/loyalty/program'),
  upsertProgram:  (data) => api.put('/loyalty/program', data),
  listRewards:    () => api.get('/loyalty/rewards'),
  createReward:   (data) => api.post('/loyalty/rewards', data),
  updateReward:   (id, data) => api.patch(`/loyalty/rewards/${id}`, data),
  deleteReward:   (id) => api.delete(`/loyalty/rewards/${id}`),
  customerPoints: (customerId) => api.get(`/loyalty/customer/${customerId}`),
  adjustPoints:   (data) => api.post('/loyalty/adjust', data),
  listRedemptions:() => api.get('/loyalty/redemptions'),
};

/* ── Memberships ─────────────────────────────────────────────────────────── */
export const membershipAPI = {
  listPlans:        () => api.get('/memberships/plans'),
  createPlan:       (data) => api.post('/memberships/plans', data),
  updatePlan:       (id, data) => api.patch(`/memberships/plans/${id}`, data),
  deletePlan:       (id) => api.delete(`/memberships/plans/${id}`),
  listSubscribers:  () => api.get('/memberships/subscribers'),
  cancelSub:        (id) => api.post(`/memberships/subscribers/${id}/cancel`),
};

/* ── Service packages ────────────────────────────────────────────────────── */
export const packagesAPI = {
  list:             () => api.get('/packages'),
  create:           (data) => api.post('/packages', data),
  update:           (id, data) => api.patch(`/packages/${id}`, data),
  remove:           (id) => api.delete(`/packages/${id}`),
  listCustomers:    () => api.get('/packages/customers'),
};

/* ── Gift cards ──────────────────────────────────────────────────────────── */
export const giftCardsAPI = {
  list:      () => api.get('/gift-cards'),
  create:    (data) => api.post('/gift-cards', data),
  deactivate:(id) => api.patch(`/gift-cards/${id}/deactivate`),
  validate:  (code, slug) => api.get('/gift-cards/validate', { params: { code, slug } }),
};

/* ── Reviews (public token) ──────────────────────────────────────────────── */
export const reviewTokenAPI = {
  get:    (token) => api.get(`/reviews/token/${token}`),
  submit: (token, data) => api.post(`/reviews/token/${token}`, data),
};

/* ── Financial operations / POS ─────────────────────────────────────────── */
export const operationsAPI = {
  products:          () => api.get('/operations/products'),
  createProduct:     (data) => api.post('/operations/products', data),
  updateProduct:     (id, data) => api.patch(`/operations/products/${id}`, data),
  adjustStock:       (id, data) => api.post(`/operations/products/${id}/stock`, data),
  inventoryMovements:(productId) => api.get('/operations/inventory/movements', { params: productId ? { product_id: productId } : {} }),
  quote:             (data) => api.post('/operations/checkout/quote', data),
  createPosSale:     (data) => api.post('/operations/pos/sales', data),
  report:            (params) => api.get('/operations/report', { params }),
  tax:               () => api.get('/operations/tax'),
  saveTax:           (data) => api.put('/operations/tax', data),
};

export const inboxAPI = {
  conversations: () => api.get('/inbox/conversations'),
  createConversation: (data) => api.post('/inbox/conversations', data),
  detail: (id) => api.get(`/inbox/conversations/${id}`),
  send: (id, data) => api.post(`/inbox/conversations/${id}/messages`, data),
  staffPermissions: () => api.get('/inbox/staff-permissions'),
  saveStaffPermissions: (id, permissions) => api.put(`/inbox/staff-permissions/${id}`, { permissions }),
};
export const intelligenceAPI = { overview: () => api.get('/intelligence') };

export default api;
