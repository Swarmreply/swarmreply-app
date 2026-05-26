// pages/forgot-password.js
import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function ForgotPassword() {
  const [email, setEmail]       = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/auth/forgot-password`, { email });
    } catch (err) {
      // Intentional: always show success to prevent email enumeration
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  }

  const card = { background: 'white', border: '1px solid #e4e0d8', borderRadius: 20,
    boxShadow: '0 8px 40px rgba(0,0,0,.07)', overflow: 'hidden' };

  return (
    <>
      <Head>
        <title>Reset password — SwarmReply</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{ minHeight: '100vh', background: '#f8f7f4', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'DM Sans, sans-serif', padding: 20 }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <Link href="/" style={{ fontFamily: 'Playfair Display, serif',
              fontSize: '1.5rem', fontWeight: 900, color: '#0a0a0a',
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 9 }}>
              🐝 SwarmReply
            </Link>
          </div>

          <div style={card}>
            {!submitted ? (
              <>
                <div style={{ padding: '28px 32px 20px', borderBottom: '1px solid #f0eeea' }}>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem',
                    fontWeight: 900, marginBottom: 6 }}>Reset your password</div>
                  <p style={{ color: '#7a7670', fontSize: '.875rem', lineHeight: 1.65, margin: 0 }}>
                    Enter your email and we'll send you a reset link.
                  </p>
                </div>
                <form onSubmit={handleSubmit} style={{ padding: '24px 32px 28px' }}>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: '.67rem', fontWeight: 700,
                      letterSpacing: '.08em', textTransform: 'uppercase',
                      color: '#7a7670', marginBottom: 6 }}>Email address</label>
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@yourbusiness.com"
                      required autoFocus
                      style={{ width: '100%', padding: '12px 14px',
                        border: '1.5px solid #e4e0d8', borderRadius: 10,
                        fontSize: 16, fontFamily: 'inherit', outline: 'none' }}
                    />
                  </div>
                  <button type="submit" disabled={loading} style={{
                    width: '100%', padding: 13, borderRadius: 50,
                    background: '#0a0a0a', color: 'white', border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '.95rem', fontWeight: 700,
                    fontFamily: 'inherit', opacity: loading ? .6 : 1 }}>
                    {loading ? 'Sending...' : 'Send reset link →'}
                  </button>
                  <p style={{ textAlign: 'center', marginTop: 14,
                    fontSize: '.78rem', color: '#7a7670', margin: '14px 0 0' }}>
                    <Link href="/login" style={{ color: '#0a0a0a', fontWeight: 600 }}>
                      Back to login
                    </Link>
                  </p>
                </form>
              </>
            ) : (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%',
                  background: '#e8f5ef', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', margin: '0 auto 16px', fontSize: '1.3rem' }}>
                  ✓
                </div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.3rem',
                  fontWeight: 900, marginBottom: 10 }}>Check your email</div>
                <p style={{ color: '#7a7670', fontSize: '.875rem', lineHeight: 1.7, marginBottom: 24 }}>
                  If <strong>{email}</strong> has a SwarmReply account, a reset
                  link is on its way. Check your inbox and spam folder.
                </p>
                <Link href="/login" style={{ color: '#0a0a0a', fontWeight: 600, fontSize: '.875rem' }}>
                  Back to login →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
