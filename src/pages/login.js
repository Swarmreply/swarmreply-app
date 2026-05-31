// ============================================
// src/pages/login.js
// Simple email-based login
// Customer enters email → we look them up
// ============================================

import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/customers/login`,
        { email, password }
      );
      login(res.data.accessToken, res.data.member);
      router.push('/dashboard');
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Invalid email or password.');
      } else if (err.response?.status === 429) {
        setError('Too many failed attempts. Please wait 15 minutes.');
      } else if (err.response?.status === 403) {
        setError(err.response?.data?.error || 'Account access denied.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#f8f7f4',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'DM Sans, sans-serif', padding: 24
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <a href="/" style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: '1.8rem', fontWeight: 900,
            color: '#0d0d0d', textDecoration: 'none',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 10
          }}>
            <span>🐝</span> SwarmReply
          </a>
          <p style={{ color: '#7a7670', marginTop: 8, fontSize: '0.925rem' }}>
            Sign in to your dashboard
          </p>
        </div>

        <div style={{
          background: 'white', border: '1px solid #e4e0d8',
          borderRadius: 20, padding: 36
        }}>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'block', fontSize: '0.78rem', fontWeight: 600,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                color: '#7a7670', marginBottom: 8
              }}>Email Address</label>
              <input
                type="email"
                placeholder="you@yourbusiness.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{
                  width: '100%', padding: '14px 16px',
                  border: '1.5px solid #e4e0d8', borderRadius: 12,
                  fontSize: '1rem', outline: 'none',
                  fontFamily: 'DM Sans, sans-serif'
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'block', fontSize: '0.78rem', fontWeight: 600,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                color: '#7a7670', marginBottom: 8
              }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%', padding: '14px 16px',
                    border: '1.5px solid #e4e0d8', borderRadius: 12,
                    fontSize: '1rem', outline: 'none',
                    fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  style={{
                    position: 'absolute', right: 14, top: '50%',
                    transform: 'translateY(-50%)', background: 'none',
                    border: 'none', cursor: 'pointer', fontSize: '0.8rem',
                    color: '#7a7670', padding: 4
                  }}
                >{showPw ? 'Hide' : 'Show'}</button>
              </div>
            </div>

            {error && (
              <div style={{
                background: '#fee2e2', border: '1px solid #fca5a5',
                borderRadius: 10, padding: '12px 16px',
                fontSize: '0.875rem', color: '#c0392b', marginBottom: 16
              }}>{error}</div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              style={{
                width: '100%', padding: 16, borderRadius: 50,
                background: loading || !email || !password ? '#c8c4bc' : '#0d0d0d',
                color: 'white', border: 'none', fontSize: '1rem',
                fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'DM Sans, sans-serif'
              }}
            >
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>

          <div style={{
            marginTop: 24, textAlign: 'center',
            fontSize: '0.875rem', color: '#7a7670'
          }}>
            <a href="/reset-password" style={{ color: '#7a7670' }}>
              Forgot password?
            </a>
            <span style={{ margin: '0 10px' }}>·</span>
            Don't have an account?{' '}
            <a href="https://swarmreply.com/signup.html" style={{ color: '#0d0d0d', fontWeight: 600 }}>
              Get started →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
