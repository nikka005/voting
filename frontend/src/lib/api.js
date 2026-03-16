import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lumina_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('lumina_token');
      localStorage.removeItem('lumina_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Categories API
export const categoriesAPI = {
  getAll: (activeOnly = false) => api.get(`/categories?active_only=${activeOnly}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

// Rounds API
export const roundsAPI = {
  getAll: () => api.get('/rounds'),
  create: (data) => api.post('/rounds', data),
  update: (id, data) => api.put(`/rounds/${id}`, data),
  activate: (id) => api.post(`/rounds/${id}/activate`),
};

// Contestants API
export const contestantsAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/contestants?${queryString}`);
  },
  getById: (id) => api.get(`/contestants/${id}`),
  getBySlug: (year, slug) => api.get(`/contestants/slug/${year}/${slug}`),
  getMyProfile: () => api.get('/contestants/me/profile'),
  updateMyProfile: (data) => api.put('/contestants/me/profile', data),
  uploadPhoto: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/contestants/me/photos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deletePhoto: (index) => api.delete(`/contestants/me/photos/${index}`),
};

// Admin API
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getDashboardStats: () => api.get('/admin/dashboard-stats'),
  getVotes: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/admin/votes?${queryString}`);
  },
  updateContestantStatus: (id, status) => 
    api.put(`/admin/contestants/${id}/status?status=${status}`),
  assignContestantRound: (id, roundName) => 
    api.put(`/admin/contestants/${id}/round?round_name=${roundName}`),
  deleteContestant: (id) => api.delete(`/admin/contestants/${id}`),
  editContestant: (id, data) => api.put(`/admin/contestants/${id}/edit`, data),
  seedAdmin: () => api.post('/seed/admin'),
  // User management
  getUsers: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/admin/users?${queryString}`);
  },
  suspendUser: (id) => api.put(`/admin/users/${id}/suspend`),
  activateUser: (id) => api.put(`/admin/users/${id}/activate`),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  // Fraud detection
  getFraudLogs: () => api.get('/admin/fraud-logs'),
  blockIP: (ip, reason) => api.post(`/admin/block-ip?ip=${ip}&reason=${reason}`),
  blockEmail: (email, reason) => api.post(`/admin/block-email?email=${email}&reason=${reason}`),
  // Payment management
  getPayments: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/admin/payments?${queryString}`);
  },
  approvePayment: (id) => api.post(`/admin/payments/${id}/approve`),
  rejectPayment: (id, reason) => api.post(`/admin/payments/${id}/reject`, { reason }),
  refundPayment: (id, reason) => api.post(`/admin/payments/${id}/refund`, { transaction_id: id, reason }),
  getPaymentTransactions: () => api.get('/admin/payment-transactions'),
  // Contestant badges
  updateContestantBadges: (id, badges) => {
    const params = new URLSearchParams(badges).toString();
    return api.put(`/admin/contestants/${id}/badges?${params}`);
  },
  // Analytics
  getAnalytics: (days = 30) => api.get(`/admin/analytics?days=${days}`),
  // Fraud analysis
  getFraudAnalysis: (contestantId) => api.get(`/admin/fraud-analysis/${contestantId}`),
};

// Contest Management API
export const contestsAPI = {
  getActive: () => api.get('/contests/active'),
  getAll: () => api.get('/admin/contests'),
  create: (data) => api.post('/admin/contests', data),
  update: (id, data) => api.put(`/admin/contests/${id}`, data),
  startVoting: (id) => api.post(`/admin/contests/${id}/start-voting`),
  stopVoting: (id) => api.post(`/admin/contests/${id}/stop-voting`),
  complete: (id) => api.post(`/admin/contests/${id}/complete`),
};

// Entry Fee Payment API
export const entryFeeAPI = {
  createCheckout: (contestId, originUrl) => api.post('/payments/entry-fee', { contest_id: contestId, origin_url: originUrl }),
  verifyPayment: (sessionId) => api.get(`/payments/entry-fee/verify/${sessionId}`),
  getMyStatus: () => api.get('/payments/my-status'),
};

// Voting API
export const votingAPI = {
  requestOTP: (data) => api.post('/vote/request-otp', data),
  verifyAndVote: (data) => api.post('/vote/verify', data),
  // Paid voting
  getVotePackages: () => api.get('/vote-packages'),
  createCheckout: (data) => api.post('/checkout/create', data),
  getCheckoutStatus: (sessionId) => api.get(`/checkout/status/${sessionId}`),
};

// Leaderboard API
export const leaderboardAPI = {
  get: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/leaderboard?${queryString}`);
  },
  getFiltered: (filterType, params = {}) => {
    const queryParams = { filter_type: filterType, ...params };
    const queryString = new URLSearchParams(queryParams).toString();
    return api.get(`/leaderboard/filtered?${queryString}`);
  },
};

// Highlights API
export const highlightsAPI = {
  get: () => api.get('/contestants/highlights'),
};

// Search API
export const searchAPI = {
  search: (query, searchType = 'all', limit = 20) => 
    api.get(`/search?q=${query}&search_type=${searchType}&limit=${limit}`),
};

// Contest Timeline API
export const timelineAPI = {
  get: () => api.get('/contest/timeline'),
};

// Contest Settings API
export const contestSettingsAPI = {
  get: () => api.get('/contest/settings'),
  create: (data) => api.post('/admin/contest/settings', data),
  update: (data) => api.put('/admin/contest/settings', data),
};

// Competition Management API
export const competitionAPI = {
  setup: () => api.post('/admin/competition/setup'),
  advanceRound: () => api.post('/admin/competition/advance-round'),
  complete: () => api.post('/admin/competition/complete'),
  getStatus: () => api.get('/admin/competition/status'),
  getWinners: () => api.get('/competition/winners'),
};

// Analytics Tracking
export const analyticsAPI = {
  trackPageView: (page) => api.post(`/analytics/pageview?page=${page}`),
};

export default api;
