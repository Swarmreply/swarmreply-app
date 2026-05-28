// ============================================
// src/hooks/useAuth.js
// JWT-based auth — stores token + member info
// ============================================

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;

export function useAuth() {
  const [customer, setCustomer] = useState(null);
  const [member,   setMember]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => { loadAuth(); }, []);

  async function loadAuth() {
    try {
      // Handle admin impersonation — token passed via URL param
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const impToken = params.get('impersonate_token');
        if (impToken) {
          localStorage.setItem('swarmreply_token', impToken);
          // Clean URL without reloading
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, '', cleanUrl);
          // Show impersonation banner
          sessionStorage.setItem('impersonating', params.get('customer_name') || 'Customer');
        }
      }

      const token = localStorage.getItem('swarmreply_token');
      if (!token) { setLoading(false); return; }

      // Decode token to get member + customerId (no extra API call needed)
      const payload = JSON.parse(atob(token.split('.')[1]));

      // Check expiry client-side (server still validates)
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        localStorage.removeItem('swarmreply_token');
        setLoading(false);
        return;
      }

      // Fetch fresh customer data
      const res = await axios.get(`${API}/billing/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMember({
        id:         payload.memberId,
        name:       payload.name,
        email:      payload.email,
        role:       payload.role,
        customerId: payload.customerId,
      });

      setCustomer({
        id:     payload.customerId,
        name:   payload.name,
        email:  payload.email,
        plan:   res.data.billing?.plan || payload.plan,
        status: res.data.billing?.status || 'active',
        role:   payload.role,
      });

    } catch (err) {
      // Token invalid or expired — clear it
      localStorage.removeItem('swarmreply_token');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function login(token, memberData) {
    localStorage.setItem('swarmreply_token', token);
    if (memberData) {
      setMember(memberData);
      setCustomer({
        id:     memberData.customerId,
        name:   memberData.name,
        email:  memberData.email,
        plan:   memberData.plan || 'starter',
        status: 'active',
        role:   memberData.role,
      });
    } else {
      loadAuth();
    }
  }

  async function logout() {
    const token = localStorage.getItem('swarmreply_token');
    if (token) {
      // Revoke token server-side
      await axios.post(`${API}/customers/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }
    localStorage.removeItem('swarmreply_token');
    setCustomer(null);
    setMember(null);
  }

  return { customer, member, loading, error, login, logout, reload: loadAuth };
}
