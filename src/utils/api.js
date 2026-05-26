// ============================================
// src/utils/api.js
// All API calls to SwarmReply backend
// Centralised so every call has error handling
// ============================================

import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Create axios instance with defaults
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

// Add auth token to every request
api.interceptors.request.use((config) => {
  const customerId = localStorage.getItem('swarmreply_customer_id');
  if (customerId) {
    config.headers['x-customer-id'] = customerId;
  }
  return config;
});

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

export async function createLocation(data) {
  const res = await api.post('/locations', data);
  return res.data.location;
}

export async function updateLocationSettings(locationId, settings) {
  const res = await api.put(`/locations/${locationId}/settings`, settings);
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

// ============================================
// STATS
// ============================================

export async function getStats(customerId) {
  const res = await api.get('/stats', { params: { customerId } });
  return res.data.stats;
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

export async function upgradePlan(token, planId) {
  const res = await fetch(`${API_BASE}/billing/upgrade`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ planId })
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
