// ============================================
// src/pages/login.js
// The canonical login lives on the marketing site (swarmreply.com/login),
// which hands the session back via the #token= URL-hash handoff.
// This page exists only so old links and in-app redirects still work.
// ============================================

import { useEffect } from 'react';

export default function Login() {
  useEffect(() => {
    window.location.replace('https://swarmreply.com/login');
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream, #f8f7f4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', fontWeight: 900, color: 'var(--ink, #0a0a0a)', marginBottom: 8 }}>SwarmReply</div>
        <div style={{ fontSize: '.9rem', color: 'var(--taupe, #7a7670)' }}>Taking you to the login page&hellip;</div>
      </div>
    </div>
  );
}
