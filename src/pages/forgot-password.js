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
  const [error, setError]       = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await axios.post(`${API}/auth/forgot-password`, { email });
      setSubmitted(true);
    } catch (err) {
      if (err.response && err.response.status >= 500) {
        // Genuine server error (e.g. email provider or DB issue). A 500 is not an
        // enumeration signal, so it's safe to tell the user it failed.
        setError(err.response.data?.error || 'Something went wrong on our end. Please try again shortly.');
      } else {
        // Network/other error: still show success to prevent email enumeration.
        setSubmitted(true);
      }
    } finally {
      setLoading(false);
    }
  }

  const card = { background: 'white', border: '1px solid var(--line, #e4e0d8)', borderRadius: 'var(--r-md, 16px)',
    boxShadow: '0 8px 40px rgba(0,0,0,.07)', overflow: 'hidden' };

  return (
    <>
      <Head>
        <title>Reset password — SwarmReply</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{ minHeight: '100vh', background: 'var(--cream, #f8f7f4)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'DM Sans, sans-serif', padding: 20 }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <a href="https://swarmreply.com" style={{ fontFamily: 'Playfair Display, serif',
              fontSize: 'var(--fs-2xl, 1.5rem)', fontWeight: 900, color: 'var(--ink, #0a0a0a)',
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 9 }}>
              🐝 SwarmReply
            </a>
          </div>

          <div style={card}>
            {!submitted ? (
              <>
                <div style={{ padding: '28px 32px 20px', borderBottom: '1px solid var(--cream-2, #f0eeea)' }}>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 'var(--fs-2xl, 1.5rem)',
                    fontWeight: 900, marginBottom: 6 }}>Reset your password</div>
                  <p style={{ color: 'var(--taupe, #7a7670)', fontSize: 'var(--fs-base, 0.875rem)', lineHeight: 1.65, margin: 0 }}>
                    Enter your email and we'll send you a reset link.
                  </p>
                </div>
                <form onSubmit={handleSubmit} style={{ padding: '24px 32px 28px' }}>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 'var(--fs-2xs, 0.6875rem)', fontWeight: 700,
                      letterSpacing: '.08em', textTransform: 'uppercase',
                      color: 'var(--taupe, #7a7670)', marginBottom: 6 }}>Email address</label>
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@yourbusiness.com"
                      required autoFocus
                      style={{ width: '100%', padding: '12px 14px',
                        border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 'var(--r-sm, 10px)',
                        fontSize: 'var(--fs-lg, 1rem)', fontFamily: 'inherit', outline: 'none' }}
                    />
                  </div>
                  {error && (
                    <div style={{ background: 'var(--danger-bg, #fee2e2)', color: 'var(--danger, #c0392b)', border: '1px solid #f5c6c6',
                      borderRadius: 'var(--r-sm, 10px)', padding: '10px 12px', fontSize: 'var(--fs-sm, 0.8125rem)', marginBottom: 12 }}>
                      {error}
                    </div>
                  )}
                  <button type="submit" disabled={loading} style={{
                    width: '100%', padding: 13, borderRadius: 'var(--r-pill, 999px)',
                    background: 'var(--ink, #0a0a0a)', color: 'white', border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: 'var(--fs-lg, 1rem)', fontWeight: 700,
                    fontFamily: 'inherit', opacity: loading ? .6 : 1 }}>
                    {loading ? 'Sending...' : 'Send reset link →'}
                  </button>
                  <p style={{ textAlign: 'center', marginTop: 14,
                    fontSize: 'var(--fs-xs, 0.75rem)', color: 'var(--taupe, #7a7670)', margin: '14px 0 0' }}>
                    <Link href="/login" style={{ color: 'var(--ink, #0a0a0a)', fontWeight: 600 }}>
                      Back to login
                    </Link>
                  </p>
                </form>
              </>
            ) : (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: 'var(--r-full, 50%)',
                  background: 'var(--green-bg, #e8f5ef)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', margin: '0 auto 16px', fontSize: 'var(--fs-xl, 1.25rem)' }}>
                  ✓
                </div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 'var(--fs-xl, 1.25rem)',
                  fontWeight: 900, marginBottom: 10 }}>Check your email</div>
                <p style={{ color: 'var(--taupe, #7a7670)', fontSize: 'var(--fs-base, 0.875rem)', lineHeight: 1.7, marginBottom: 24 }}>
                  If <strong>{email}</strong> has a SwarmReply account, a reset
                  link is on its way. Check your inbox and spam folder.
                </p>
                <Link href="/login" style={{ color: 'var(--ink, #0a0a0a)', fontWeight: 600, fontSize: 'var(--fs-base, 0.875rem)' }}>
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
