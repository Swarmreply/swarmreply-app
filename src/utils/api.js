// ============================================
// src/utils/api.js
// All API calls to SwarmReply backend
// Centralised so every call has error handling
// ============================================

import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
// Some helpers below were written against API_BASE — alias it so they work.
const API_BASE = API_URL;

// Create axios instance with defaults
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

// Add auth token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('swarmreply_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  const customerId = localStorage.getItem('swarmreply_customer_id');
  if (customerId) {
    config.headers['x-customer-id'] = customerId;
  }
  return config;
});

// Any 401 means the session is dead (expired, revoked, or cleared) —
// stop showing cryptic errors and send the person to log in fresh.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('swarmreply_token');
      window.location.href = 'https://swarmreply.com/login';
      return new Promise(() => {}); // navigation is happening; don't surface the error
    }
    return Promise.reject(err);
  }
);

// Global error handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
);

// ============================================
// CUSTOMER
// ============================================

export async function createCustomer(data) {
  const res = await api.post('/customers', data);
  return res.data;
}

export async function getCustomer(customerId) {
  const res = await api.get(`/customers/${customerId}`);
  return res.data;
}

// ============================================
// LOCATIONS
// ============================================

export async function getLocations(customerId) {
  const res = await api.get('/locations', { params: { customerId } });
  return res.data.locations;
}

// Account (business details + notification preferences)
export async function getAccount() {
  const res = await api.get('/account');
  return res.data;
}

export async function updateAccount(data) {
  const res = await api.put('/account', data);
  return res.data;
}

// Action queue (dashboard home) — both fail soft so the home never breaks
export async function getOpenChatSessions() {
  try {
    const res = await api.get('/webchat/inbox', { params: { status: 'open' } });
    return res.data.sessions || [];
  } catch (e) { return []; }
}

export async function getIntegrationErrors() {
  try {
    const res = await api.get('/integrations');
    return (res.data.integrations || []).filter(i => i.status === 'error');
  } catch (e) { return []; }
}

export async function getSurveyHistory(locationId) {
  try {
    const res = await api.get(`/surveys/${locationId}/history`);
    return res.data.history || [];
  } catch (e) { return []; }
}

// Support — in-app support form (dashboard → Support)
export async function uploadBrandingLogo(dataUri) {
  const res = await api.post('/branding/logo', { dataUri });
  return res.data;
}

export async function disconnectGoogleListing(locationId) {
  const res = await api.post(`/locations/${locationId}/google/disconnect`);
  return res.data;
}

export async function disconnectMonitored(locationId, platform) {
  const res = await api.post(`/locations/${locationId}/${platform}/disconnect`);
  return res.data;
}

export async function getListings(locationId) {
  const res = await api.get(`/listings/${locationId}`);
  return res.data;
}

export async function saveListings(locationId, data) {
  const res = await api.put(`/listings/${locationId}`, data);
  return res.data;
}

export async function pushListings(locationId, platform = null) {
  const res = await api.post(`/listings/${locationId}/push`, platform ? { platform } : {});
  return res.data;
}

export async function scanListings(locationId) {
  const res = await api.post(`/listings/${locationId}/scan`, {});
  return res.data;
}

export async function setListingDirectory(locationId, directory, status, note = null) {
  const res = await api.put(`/listings/${locationId}/directories/${directory}`, { status, note });
  return res.data;
}

export async function sendQuickReviewRequest({ name, email, phone }) {
  const res = await api.post('/review-requests/send', { name, email, phone });
  return res.data;
}

export async function sendSupportRequest({ subject, message }) {
  const res = await api.post('/support', { subject, message });
  return res.data;
}

export async function createLocation(data) {
  const res = await api.post('/locations', data);
  return res.data.location;
}

export async function updateLocationSettings(locationId, settings) {
  const res = await api.put(`/locations/${locationId}/settings`, settings);
  return res.data;
}

export async function updateLocationProfile(locationId, { businessName, businessType } = {}) {
  const res = await api.put(`/locations/${locationId}/profile`, { businessName, businessType });
  return res.data;
}

// What adding one more location would cost (shown before creating it)
export async function getLocationBillingPreview() {
  const res = await api.get('/billing/location-preview');
  return res.data;
}

// Activate / deactivate a location — billing adjusts automatically
export async function setLocationActive(locationId, active) {
  const res = await api.put(`/locations/${locationId}/active`, { active });
  return res.data;
}

// Real Grow page stats (review requests + surveys, last 30 days)
export async function getGrowStats() {
  const res = await api.get('/grow/stats');
  return res.data;
}

export async function getGoogleAuthUrl(locationId) {
  return `${API_URL}/auth/google?locationId=${locationId}`;
}

// ============================================
// REVIEWS
// ============================================

export async function getReviews(locationId, params = {}) {
  const res = await api.get('/reviews', { params: { locationId, ...params } });
  return res.data.reviews;
}

// Approve a drafted reply (posts it) — used by the Pending Approval action
// on the Reviews page. For demo accounts the backend skips the real post.
export async function approveReply(replyId) {
  const res = await api.post(`/approvals/${replyId}/approve`);
  return res.data;
}

// ============================================
// STATS
// ============================================

export async function getStats(customerId) {
  const res = await api.get('/stats', { params: { customerId } });
  return res.data.stats;
}

// Real review-based analytics for the Pulse / Reports page.
export async function getAnalytics(range = '90d') {
  const res = await api.get('/reports/analytics', { params: { range } });
  return res.data;
}

// Comprehensive payload powering all eight reports on the Reports page.
export async function getInsights({ range = '90d', locationId = 'all', platform = 'all' } = {}) {
  const res = await api.get('/reports/insights', { params: { range, locationId, platform } });
  return res.data;
}

// Recent detractor survey responses across all locations, for the Home action queue.
// Returns each response with its per-question answers (open-text included).
export async function getRecentDetractors(days = 7) {
  try {
    const res = await api.get('/reports/survey-responses', { params: { classification: 'detractor', days, limit: 50 } });
    return res.data.responses || [];
  } catch (e) { return []; }
}

// ── BILLING ────────────────────────────────────────────────────────────────
export async function getBillingStatus(token) {
  const res = await fetch(`${API_BASE}/billing/status`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
}

export async function getBillingInvoices(token) {
  const res = await fetch(`${API_BASE}/billing/invoices`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
}

export async function getBillingPortalUrl(token) {
  const res = await fetch(`${API_BASE}/billing/portal`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
}


export async function cancelSubscription(token, reason) {
  const res = await fetch(`${API_BASE}/billing/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ reason })
  });
  return res.json();
}

export async function reactivateSubscription(token) {
  const res = await fetch(`${API_BASE}/billing/reactivate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
  });
  return res.json();
}

// ── ONBOARDING ────────────────────────────────────────────────────────────────
export async function getOnboardingStatus(token) {
  const res = await fetch(`${API_BASE}/onboarding/status`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
}

export async function completeOnboardingStep(token, step) {
  const res = await fetch(`${API_BASE}/onboarding/step/${step}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
  });
  return res.json();
}

export async function skipOnboarding(token) {
  const res = await fetch(`${API_BASE}/onboarding/skip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
  });
  return res.json();
}
