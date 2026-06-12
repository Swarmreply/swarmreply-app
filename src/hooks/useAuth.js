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

        // Cross-origin login handoff from the marketing site (swarmreply.com).
        // The token arrives in the URL hash so it is never sent to the server
        // or written to access logs, then we strip it from the URL immediately.
        if (window.location.hash && window.location.hash.indexOf('token=') !== -1) {
          const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
          const handoff = hashParams.get('token');
          if (handoff) {
            localStorage.setItem('swarmreply_token', handoff);
            const cleanUrl = window.location.pathname + window.location.search;
            window.history.replaceState({}, '', cleanUrl);
          }
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

      // For impersonated sessions, customerId may be same as id
      const customerId = payload.customerId || payload.id;

      // Set identity from the token immediately — this is always valid if the
      // token decoded and isn't expired. Don't make the session depend on billing.
      setMember({
        id:         payload.memberId || payload.id,
        name:       payload.name,
        email:      payload.email,
        role:       payload.role,
        customerId: customerId,
      });

      // Try to refresh plan/status info. A failure here should NOT log the user out.
      let billing = null;
      try {
        const res = await axios.get(`${API}/billing/status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        billing = res.data.billing;
      } catch (billErr) {
        // If the token itself is rejected (401), clear it. Otherwise keep the session.
        if (billErr.response?.status === 401) {
          localStorage.removeItem('swarmreply_token');
          setMember(null);
          setCustomer(null);
          setLoading(false);
          return;
        }
        console.warn('Could not refresh billing status:', billErr.message);
      }

      setCustomer({
        id:     customerId,
        name:   payload.name,
        email:  payload.email,
        plan:   String(billing?.plan || payload.plan || 'starter'),
        status: billing?.status || 'active',
        role:   payload.role,
        is_demo: payload.is_demo || false,
        impersonated_by: payload.impersonated_by || null,
      });

    } catch (err) {
      // Token couldn't even be decoded — it's genuinely invalid.
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
        plan:   String(memberData.plan || 'starter'),
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
    // Hard navigation to the canonical login — wipes all in-memory state
    // and doesn't depend on any auth-guard effect re-firing.
    window.location.href = 'https://swarmreply.com/login';
  }

  return { customer, member, loading, error, login, logout, reload: loadAuth };
}
