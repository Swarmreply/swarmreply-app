// ============================================
// pages/accept-invite.js
// Invite acceptance — set password + login
// Reached via emailed link:
//   /accept-invite?token=<64-char-hex>
// ============================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';

const API = process.env.NEXT_PUBLIC_API_URL;

const BEE = () => (
  <svg width="32" height="32" viewBox="0 0 100 100" fill="none">
    <ellipse cx="50" cy="60" rx="21" ry="26" fill="#0a0a0a"/>
    <rect x="29" y="52" width="42" height="8" rx="2" fill="#f5c842" opacity=".95"/>
    <rect x="29" y="65" width="42" height="7" rx="2" fill="#f5c842" opacity=".7"/>
    <circle cx="50" cy="31" r="15" fill="#0a0a0a"/>
    <circle cx="43.5" cy="29" r="4" fill="white"/>
    <circle cx="56.5" cy="29" r="4" fill="white"/>
    <circle cx="44.5" cy="29" r="2.2" fill="#0a0a0a"/>
    <circle cx="57.5" cy="29" r="2.2" fill="#0a0a0a"/>
    <path d="M44 36 Q50 41 56 36" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
    <ellipse cx="23" cy="46" rx="15" ry="7.5" fill="rgba(245,200,66,.55)" transform="rotate(-28 23 46)"/>
    <ellipse cx="77" cy="46" rx="15" ry="7.5" fill="rgba(245,200,66,.55)" transform="rotate(28 77 46)"/>
    <ellipse cx="50" cy="18" rx="21" ry="5" fill="#f5c842"/>
    <path d="M32 18 Q33 6 50 6 Q67 6 68 18 Z" fill="#f5c842"/>
  </svg>
);

const ROLE_META = {
  admin:   { label: 'Admin',   color: '#f5c842', text: '#0a0a0a', desc: 'Full platform access including billing and team management' },
  manager: { label: 'Manager', color: '#0a0a0a', text: '#fff',    desc: 'Full platform access — no billing or team management'       },
  staff:   { label: 'Staff',   color: '#7c3aed', text: '#fff',    desc: 'Operational access — Reviews, Inbox, Grow, Campaigns, AI Visibility' },
};

export default function AcceptInvite() {
  const router = useRouter();
  const { login } = useAuth();
  const { token } = router.query;

  const [step, setStep]         = useState('loading'); // loading | form | success | error
  const [inviteData, setInvite] = useState(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [submitting, setSub]    = useState(false);
  const [error, setError]       = useState('');
  const [showPw, setShowPw]     = useState(false);

  useEffect(() => {
    if (!token) return;
    validateToken(token);
  }, [token]);

  async function validateToken(t) {
    try {
      // Preview the invite without consuming it
      const res = await axios.get(`${API}/team/invite/preview?token=${t}`);
      setInvite(res.data);
      setStep('form');
    } catch (err) {
      const msg = err.response?.data?.error || '';
      if (msg.includes('expired') || msg.includes('invalid')) {
        setStep('error');
        setError('This invite link has expired or is invalid. Ask your admin to send a new one.');
      } else {
        setStep('form'); // assume valid if preview endpoint not implemented
        setInvite({ email: '', name: '', role: 'staff' });
      }
    }
  }

  const pwStrength = (() => {
    if (!password) return null;
    let score = 0;
    if (password.length >= 8)  score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 1) return { label: 'Weak',   color: '#c0392b', pct: '25%'  };
    if (score <= 2) return { label: 'Fair',   color: '#f59e0b', pct: '50%'  };
    if (score <= 3) return { label: 'Good',   color: '#66bb6a', pct: '75%'  };
    return               { label: 'Strong', color: '#1a6b45', pct: '100%' };
  })();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 8)       return setError('Password must be at least 8 characters.');
    if (password !== confirm)       return setError('Passwords do not match.');
    if (!pwStrength || pwStrength.label === 'Weak') {
      return setError('Please choose a stronger password — add uppercase letters, numbers, or symbols.');
    }

    setSub(true);
    try {
      const res = await axios.post(`${API}/team/accept`, { token, password });
      login(res.data.accessToken, res.data.member);
      setStep('success');
      setTimeout(() => router.push('/dashboard'), 1800);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setSub(false);
    }
  }

  const inp = {
    width: '100%', padding: '12px 14px',
    border: '1.5px solid #e4e0d8', borderRadius: 10,
    fontSize: 16, fontFamily: 'DM Sans, sans-serif',
    outline: 'none', transition: 'border-color .15s',
  };

  const role = inviteData?.role || 'staff';
  const rm   = ROLE_META[role] || ROLE_META.staff;

  return (
    <>
      <Head>
        <title>Accept invitation — SwarmReply</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={{
        minHeight: '100vh', background: '#f8f7f4',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'DM Sans, sans-serif', padding: 20,
      }}>
        <div style={{ width: '100%', maxWidth: 440 }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <a href="/" style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              fontFamily: 'Playfair Display, serif',
              fontSize: '1.5rem', fontWeight: 900, color: '#0a0a0a',
              textDecoration: 'none',
            }}>
              <BEE /> SwarmReply
            </a>
          </div>

          {/* Card */}
          <div style={{
            background: 'white', border: '1px solid #e4e0d8',
            borderRadius: 20, overflow: 'hidden',
            boxShadow: '0 8px 40px rgba(0,0,0,.07)',
          }}>

            {/* Loading */}
            {step === 'loading' && (
              <div style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>🐝</div>
                <div style={{ color: '#7a7670', fontSize: '.875rem' }}>Validating your invite...</div>
              </div>
            )}

            {/* Error */}
            {step === 'error' && (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fee2e2',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px', fontSize: '1.4rem' }}>!</div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.3rem',
                  fontWeight: 900, marginBottom: 10 }}>Link expired</div>
                <p style={{ color: '#7a7670', fontSize: '.875rem', lineHeight: 1.7, marginBottom: 24 }}>
                  {error}
                </p>
                <a href="/login" style={{ color: '#0a0a0a', fontWeight: 600, fontSize: '.875rem' }}>
                  Go to login →
                </a>
              </div>
            )}

            {/* Success */}
            {step === 'success' && (
              <div style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#e8f5ef',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px', fontSize: '1.5rem' }}>✓</div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.3rem', fontWeight: 900, marginBottom: 8 }}>
                  Welcome to the swarm!
                </div>
                <p style={{ color: '#7a7670', fontSize: '.875rem' }}>Taking you to the dashboard...</p>
              </div>
            )}

            {/* Form */}
            {step === 'form' && (
              <>
                {/* Header */}
                <div style={{ padding: '28px 32px 20px', borderBottom: '1px solid #f0eeea' }}>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem',
                    fontWeight: 900, marginBottom: 6 }}>
                    You've been invited
                  </div>
                  {inviteData?.name && (
                    <div style={{ fontSize: '.875rem', color: '#7a7670', lineHeight: 1.65 }}>
                      Hi <strong style={{ color: '#0a0a0a' }}>{inviteData.name}</strong> — set
                      your password to activate your SwarmReply account.
                    </div>
                  )}
                </div>

                {/* Role badge */}
                {inviteData?.role && (
                  <div style={{ padding: '14px 32px', background: '#f8f7f4',
                    borderBottom: '1px solid #f0eeea', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      background: rm.color, color: rm.text,
                      fontSize: '.7rem', fontWeight: 700,
                      padding: '3px 10px', borderRadius: 50,
                    }}>{rm.label}</span>
                    <span style={{ fontSize: '.78rem', color: '#7a7670' }}>{rm.desc}</span>
                  </div>
                )}

                {/* Form body */}
                <form onSubmit={handleSubmit} style={{ padding: '24px 32px 28px' }}>
                  {inviteData?.email && (
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: 'block', fontSize: '.67rem', fontWeight: 700,
                        letterSpacing: '.08em', textTransform: 'uppercase',
                        color: '#7a7670', marginBottom: 6 }}>Email</label>
                      <div style={{ ...inp, background: '#f8f7f4', color: '#7a7670',
                        cursor: 'default', border: '1.5px solid #f0eeea' }}>
                        {inviteData.email}
                      </div>
                    </div>
                  )}

                  {/* Password */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: '.67rem', fontWeight: 700,
                      letterSpacing: '.08em', textTransform: 'uppercase',
                      color: '#7a7670', marginBottom: 6 }}>Choose a password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
                        autoComplete="new-password"
                        required
                        style={{ ...inp, paddingRight: 48 }}
                        onFocus={e => e.target.style.borderColor = '#0a0a0a'}
                        onBlur={e  => e.target.style.borderColor = '#e4e0d8'}
                      />
                      <button type="button" onClick={() => setShowPw(v => !v)} style={{
                        position: 'absolute', right: 12, top: '50%',
                        transform: 'translateY(-50%)', background: 'none',
                        border: 'none', cursor: 'pointer', color: '#7a7670',
                        fontSize: '.8rem', padding: 4,
                      }}>{showPw ? 'Hide' : 'Show'}</button>
                    </div>
                    {/* Strength bar */}
                    {pwStrength && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ height: 4, background: '#f0eeea', borderRadius: 50, overflow: 'hidden' }}>
                          <div style={{ width: pwStrength.pct, height: '100%',
                            background: pwStrength.color, borderRadius: 50,
                            transition: 'width .3s, background .3s' }} />
                        </div>
                        <div style={{ fontSize: '.7rem', color: pwStrength.color,
                          fontWeight: 600, marginTop: 4 }}>{pwStrength.label}</div>
                      </div>
                    )}
                  </div>

                  {/* Confirm */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: '.67rem', fontWeight: 700,
                      letterSpacing: '.08em', textTransform: 'uppercase',
                      color: '#7a7670', marginBottom: 6 }}>Confirm password</label>
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                      required
                      style={{
                        ...inp,
                        borderColor: confirm && password && confirm !== password ? '#c0392b' : '#e4e0d8',
                      }}
                      onFocus={e => e.target.style.borderColor = '#0a0a0a'}
                      onBlur={e  => e.target.style.borderColor =
                        confirm && password !== confirm ? '#c0392b' : '#e4e0d8'}
                    />
                    {confirm && password && confirm !== password && (
                      <div style={{ fontSize: '.72rem', color: '#c0392b', marginTop: 4 }}>
                        Passwords don't match
                      </div>
                    )}
                  </div>

                  {/* Error */}
                  {error && (
                    <div style={{ background: '#fee2e2', border: '1px solid #fecaca',
                      borderRadius: 9, padding: '10px 14px', fontSize: '.82rem',
                      color: '#c0392b', marginBottom: 16, lineHeight: 1.5 }}>
                      {error}
                    </div>
                  )}

                  <button type="submit" disabled={submitting} style={{
                    width: '100%', padding: '13px 0', borderRadius: 50,
                    background: '#0a0a0a', color: 'white', border: 'none',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontSize: '.95rem', fontWeight: 700,
                    fontFamily: 'DM Sans, sans-serif',
                    opacity: submitting ? .6 : 1, transition: 'opacity .15s',
                  }}>
                    {submitting ? 'Setting up your account...' : 'Activate account →'}
                  </button>

                  <p style={{ textAlign: 'center', marginTop: 14,
                    fontSize: '.78rem', color: '#7a7670' }}>
                    Already have an account?{' '}
                    <a href="/login" style={{ color: '#0a0a0a', fontWeight: 600 }}>Log in</a>
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
