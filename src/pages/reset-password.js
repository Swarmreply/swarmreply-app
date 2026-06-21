// pages/reset-password.js
// Handles both:
//   - First-time setup from Stripe welcome email (temp password → set permanent)
//   - Regular forgot-password flow
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function ResetPassword() {
  const router  = useRouter();
  const { login } = useAuth();
  const { token } = router.query;

  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [tokenValid, setTokenValid] = useState(null); // null=checking, true, false
  const [done, setDone]           = useState(false);

  useEffect(() => {
    if (!token) return;
    // Quickly validate token exists without consuming it
    axios.get(`${API}/auth/reset-password/verify?token=${token}`)
      .then(res => setTokenValid(!!res.data?.valid))
      .catch(() => setTokenValid(false));
  }, [token]);

  const pwStrength = (() => {
    if (!password) return null;
    let s = 0;
    if (password.length >= 8)       s++;
    if (password.length >= 12)      s++;
    if (/[A-Z]/.test(password))     s++;
    if (/[0-9]/.test(password))     s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    if (s <= 1) return { label: 'Weak',   color: 'var(--danger, #c0392b)', pct: '25%'  };
    if (s <= 2) return { label: 'Fair',   color: '#f59e0b', pct: '50%'  };
    if (s <= 3) return { label: 'Good',   color: '#66bb6a', pct: '75%'  };
    return           { label: 'Strong', color: 'var(--green, #1a6b45)', pct: '100%' };
  })();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 8)     return setError('Password must be at least 8 characters.');
    if (password !== confirm)     return setError('Passwords do not match.');
    if (pwStrength?.label === 'Weak') {
      return setError('Please choose a stronger password — add uppercase letters, numbers, or symbols.');
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/reset-password`, { token, password });
      login(res.data.accessToken, res.data.member);
      setDone(true);
      setTimeout(() => router.push('/dashboard'), 1800);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const inp = { width: '100%', padding: '12px 14px',
    border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 'var(--r-sm, 10px)',
    fontSize: 'var(--fs-lg, 1rem)', fontFamily: 'inherit', outline: 'none' };

  return (
    <>
      <Head>
        <title>Set new password — SwarmReply</title>
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

          <div style={{ background: 'white', border: '1px solid var(--line, #e4e0d8)', borderRadius: 'var(--r-md, 16px)',
            boxShadow: '0 8px 40px rgba(0,0,0,.07)', overflow: 'hidden' }}>

            {/* Checking token */}
            {tokenValid === null && token && (
              <div style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--fs-3xl, 2rem)', marginBottom: 12 }}>🐝</div>
                <div style={{ color: 'var(--taupe, #7a7670)', fontSize: 'var(--fs-base, 0.875rem)' }}>Validating reset link...</div>
              </div>
            )}

            {/* Invalid token */}
            {tokenValid === false && (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: 'var(--r-full, 50%)', background: 'var(--danger-bg, #fee2e2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px', fontSize: 'var(--fs-2xl, 1.5rem)' }}>!</div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 'var(--fs-xl, 1.25rem)',
                  fontWeight: 900, marginBottom: 10 }}>Link expired</div>
                <p style={{ color: 'var(--taupe, #7a7670)', fontSize: 'var(--fs-base, 0.875rem)', lineHeight: 1.7, marginBottom: 20 }}>
                  This reset link has expired or already been used. Reset links are
                  valid for 1 hour.
                </p>
                <Link href="/forgot-password" style={{
                  display: 'inline-block', padding: '10px 24px', borderRadius: 'var(--r-pill, 999px)',
                  background: 'var(--ink, #0a0a0a)', color: 'white', textDecoration: 'none',
                  fontWeight: 700, fontSize: 'var(--fs-base, 0.875rem)' }}>
                  Request a new link →
                </Link>
              </div>
            )}

            {/* Success */}
            {done && (
              <div style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ width: 60, height: 60, borderRadius: 'var(--r-full, 50%)', background: 'var(--green-bg, #e8f5ef)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px', fontSize: 'var(--fs-2xl, 1.5rem)' }}>✓</div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 'var(--fs-xl, 1.25rem)',
                  fontWeight: 900, marginBottom: 8 }}>Password updated!</div>
                <p style={{ color: 'var(--taupe, #7a7670)', fontSize: 'var(--fs-base, 0.875rem)' }}>
                  Taking you to the dashboard...
                </p>
              </div>
            )}

            {/* Form */}
            {(tokenValid === true || tokenValid === null) && !done && (
              <>
                <div style={{ padding: '28px 32px 20px', borderBottom: '1px solid var(--cream-2, #f0eeea)' }}>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 'var(--fs-2xl, 1.5rem)',
                    fontWeight: 900, marginBottom: 6 }}>Set your password</div>
                  <p style={{ color: 'var(--taupe, #7a7670)', fontSize: 'var(--fs-base, 0.875rem)', lineHeight: 1.65, margin: 0 }}>
                    Choose a strong password for your SwarmReply account.
                  </p>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '24px 32px 28px' }}>
                  {/* New password */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 'var(--fs-2xs, 0.6875rem)', fontWeight: 700,
                      letterSpacing: '.08em', textTransform: 'uppercase',
                      color: 'var(--taupe, #7a7670)', marginBottom: 6 }}>New password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
                        autoComplete="new-password"
                        required
                        style={{ ...inp, paddingRight: 52 }}
                        onFocus={e => e.target.style.borderColor = 'var(--ink, #0a0a0a)'}
                        onBlur={e  => e.target.style.borderColor = 'var(--line, #e4e0d8)'}
                      />
                      <button type="button" onClick={() => setShowPw(v => !v)} style={{
                        position: 'absolute', right: 12, top: '50%',
                        transform: 'translateY(-50%)', background: 'none',
                        border: 'none', cursor: 'pointer', color: 'var(--taupe, #7a7670)', fontSize: 'var(--fs-sm, 0.8125rem)' }}>
                        {showPw ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    {pwStrength && (
                      <div style={{ marginTop: 7 }}>
                        <div style={{ height: 4, background: 'var(--cream-2, #f0eeea)', borderRadius: 'var(--r-pill, 999px)', overflow: 'hidden' }}>
                          <div style={{ width: pwStrength.pct, height: '100%',
                            background: pwStrength.color, borderRadius: 'var(--r-pill, 999px)',
                            transition: 'width .3s, background .3s' }} />
                        </div>
                        <div style={{ fontSize: 'var(--fs-2xs, 0.6875rem)', color: pwStrength.color,
                          fontWeight: 600, marginTop: 4 }}>{pwStrength.label}</div>
                      </div>
                    )}
                  </div>

                  {/* Confirm */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 'var(--fs-2xs, 0.6875rem)', fontWeight: 700,
                      letterSpacing: '.08em', textTransform: 'uppercase',
                      color: 'var(--taupe, #7a7670)', marginBottom: 6 }}>Confirm password</label>
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                      required
                      style={{ ...inp,
                        borderColor: confirm && password && confirm !== password
                          ? 'var(--danger, #c0392b)' : 'var(--line, #e4e0d8)' }}
                      onFocus={e => e.target.style.borderColor = 'var(--ink, #0a0a0a)'}
                      onBlur={e  => e.target.style.borderColor =
                        confirm && password !== confirm ? 'var(--danger, #c0392b)' : 'var(--line, #e4e0d8)'}
                    />
                    {confirm && password && confirm !== password && (
                      <div style={{ fontSize: 'var(--fs-xs, 0.75rem)', color: 'var(--danger, #c0392b)', marginTop: 4 }}>
                        Passwords don't match
                      </div>
                    )}
                  </div>

                  {error && (
                    <div style={{ background: 'var(--danger-bg, #fee2e2)', border: '1px solid #fecaca',
                      borderRadius: 'var(--r-xs, 8px)', padding: '10px 14px', fontSize: 'var(--fs-sm, 0.8125rem)',
                      color: 'var(--danger, #c0392b)', marginBottom: 16, lineHeight: 1.5 }}>
                      {error}
                    </div>
                  )}

                  <button type="submit" disabled={loading} style={{
                    width: '100%', padding: 13, borderRadius: 'var(--r-pill, 999px)',
                    background: 'var(--ink, #0a0a0a)', color: 'white', border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: 'var(--fs-lg, 1rem)', fontWeight: 700, fontFamily: 'inherit',
                    opacity: loading ? .6 : 1 }}>
                    {loading ? 'Updating password...' : 'Set new password →'}
                  </button>

                  <p style={{ textAlign: 'center', marginTop: 14,
                    fontSize: 'var(--fs-xs, 0.75rem)', color: 'var(--taupe, #7a7670)' }}>
                    Remember your password?{' '}
                    <Link href="/login" style={{ color: 'var(--ink, #0a0a0a)', fontWeight: 600 }}>
                      Log in
                    </Link>
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
