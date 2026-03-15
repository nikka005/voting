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
  getVotes: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/admin/votes?${queryString}`);
  },
  updateContestantStatus: (id, status) => 
    api.put(`/admin/contestants/${id}/status?status=${status}`),
  assignContestantRound: (id, roundName) => 
    api.put(`/admin/contestants/${id}/round?round_name=${roundName}`),
  deleteContestant: (id) => api.delete(`/admin/contestants/${id}`),
  seedAdmin: () => api.post('/seed/admin'),
  // Fraud detection
  getFraudLogs: () => api.get('/admin/fraud-logs'),
  blockIP: (ip, reason) => api.post(`/admin/block-ip?ip=${ip}&reason=${reason}`),
  blockEmail: (email, reason) => api.post(`/admin/block-email?email=${email}&reason=${reason}`),
  // Payment transactions
  getPaymentTransactions: () => api.get('/admin/payment-transactions'),
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
};

export default api;
