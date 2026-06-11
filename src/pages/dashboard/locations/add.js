// ============================================
// src/pages/dashboard/locations/add.js
// Add a new business location — 3 steps:
//   1. Business details (nothing is created yet)
//   2. Confirm billing  (price + card on file shown BEFORE anything is charged)
//   3. Connect Google   (location now exists; "later" is a safe exit)
// ============================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../../components/DashboardLayout';
import { useAuth } from '../../../hooks/useAuth';
import {
  createLocation, getGoogleAuthUrl,
  getLocationBillingPreview, getBillingPortalUrl
} from '../../../utils/api';

export default function AddLocation() {
  const { customer } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1); // 1=form, 2=confirm billing, 3=connect Google
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [location, setLocation] = useState(null);

  // Billing preview state (step 2)
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // One key per wizard session — a retried create can never duplicate
  const [idempotencyKey] = useState(() =>
    (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `loc_${Date.now()}_${Math.random().toString(36).slice(2)}`
  );

  const [form, setForm] = useState({
    businessName: '',
    businessType: 'restaurant',
    tone: 'warm',
    contactEmail: '',
    isHealthcare: false
  });

  // Step 1 → 2: just advance and load the billing preview. Nothing is created.
  async function handleDetailsContinue(e) {
    e.preventDefault();
    setError('');
    setStep(2);
  }

  useEffect(() => {
    if (step !== 2) return;
    let cancelled = false;
    (async () => {
      setPreviewLoading(true);
      setError('');
      try {
        const p = await getLocationBillingPreview();
        if (!cancelled) setPreview(p);
      } catch (err) {
        if (!cancelled) setError('Could not load billing details. Please try again.');
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [step]);

  // Step 2 → 3: customer confirmed the price — NOW create the location.
  async function handleConfirmAndCreate() {
    setLoading(true);
    setError('');
    try {
      const newLocation = await createLocation({
        ...form,
        platform: 'google',
        idempotencyKey
      });
      setLocation(newLocation);
      setStep(3);
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === 'max_locations') {
        setError(err.response.data.error);
      } else {
        setError('Failed to create location. Please try again — retrying is safe and will not double-charge you.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenPortal() {
    setError('');
    try {
      const token = localStorage.getItem('swarmreply_token');
      const r = await getBillingPortalUrl(token);
      if (r?.url) {
        window.location.href = r.url;
      } else {
        // Show the backend's actual reason (e.g. "No billing account found…")
        setError(r?.error || 'Could not open the billing portal. Please try again.');
      }
    } catch (err) {
      setError(err?.message || 'Could not open the billing portal. Please try again.');
    }
  }

  async function handleConnectGoogle() {
    if (!location) return;
    const authUrl = await getGoogleAuthUrl(location.id);
    window.location.href = authUrl;
  }

  const inputStyle = {
    width: '100%', padding: '12px 16px',
    border: '1px solid #e4e0d8', borderRadius: 10,
    fontSize: '0.9rem', outline: 'none',
    fontFamily: 'DM Sans, sans-serif',
    background: 'white', color: '#0d0d0d'
  };

  const labelStyle = {
    display: 'block', fontSize: '0.78rem', fontWeight: 600,
    letterSpacing: '0.06em', textTransform: 'uppercase',
    color: '#7a7670', marginBottom: 8
  };

  const primaryBtn = (disabled) => ({
    width: '100%', padding: 16, borderRadius: 50,
    background: disabled ? '#c8c4bc' : '#0d0d0d',
    color: 'white', border: 'none', fontSize: '1rem',
    fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'DM Sans, sans-serif'
  });

  const ghostBtn = {
    width: '100%', padding: 14, borderRadius: 50,
    background: 'transparent', color: '#7a7670',
    border: '1px solid #e4e0d8', fontSize: '0.9rem',
    cursor: 'pointer', fontFamily: 'DM Sans, sans-serif'
  };

  const titles = {
    1: 'Add a location',
    2: 'Confirm billing',
    3: 'Connect Google Business'
  };
  const subtitles = {
    1: 'Tell us about your business — we\'ll set up your swarm.',
    2: 'Review the price before we add this location. Nothing is charged until you confirm.',
    3: 'Authorize SwarmReply to reply to your Google reviews.'
  };

  const cap = preview?.atMax;
  const noCard = preview && !preview.hasPaymentMethod;
  const noSub = preview && !preview.hasSubscription;
  const blocked = cap || noCard || noSub;

  return (
    <DashboardLayout>
      <div style={{ padding: '40px 32px', maxWidth: 600 }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <a href="/dashboard/locations" style={{
            fontSize: '0.825rem', color: '#7a7670',
            textDecoration: 'none', marginBottom: 12, display: 'block'
          }}>← Back to locations</a>
          <h1 style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: '2rem', fontWeight: 700
          }}>
            {titles[step]}
          </h1>
          <p style={{ color: '#7a7670', marginTop: 8 }}>
            {subtitles[step]}
          </p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              flex: 1, height: 4, borderRadius: 50,
              background: s <= step ? '#0d0d0d' : '#e4e0d8',
              transition: 'background 0.2s'
            }}></div>
          ))}
        </div>

        {/* Step 1 — Business details form (nothing is created yet) */}
        {step === 1 && (
          <form onSubmit={handleDetailsContinue}>
            <div style={{
              background: 'white', border: '1px solid #e4e0d8',
              borderRadius: 16, padding: 32
            }}>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Business Name *</label>
                <input
                  style={inputStyle}
                  type="text"
                  placeholder="Bella's Kitchen"
                  value={form.businessName}
                  onChange={e => setForm({ ...form, businessName: e.target.value })}
                  required
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Business Type</label>
                <select
                  style={inputStyle}
                  value={form.businessType}
                  onChange={e => setForm({ ...form, businessType: e.target.value })}
                >
                  <option value="restaurant">Restaurant / Food & Beverage</option>
                  <option value="dental">Dental Practice</option>
                  <option value="medical">Medical Practice</option>
                  <option value="gym">Gym / Fitness Studio</option>
                  <option value="medspa">Med Spa / Salon</option>
                  <option value="auto">Auto Shop / Services</option>
                  <option value="hotel">Hotel / Hospitality</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Reply Tone</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { value: 'warm', label: 'Warm & Friendly', desc: 'Personal and approachable' },
                    { value: 'professional', label: 'Professional', desc: 'Formal and polished' },
                    { value: 'casual', label: 'Casual & Fun', desc: 'Relaxed and conversational' },
                    { value: 'empathetic', label: 'Empathetic', desc: 'Caring and understanding' }
                  ].map(option => (
                    <div
                      key={option.value}
                      onClick={() => setForm({ ...form, tone: option.value })}
                      style={{
                        padding: '12px 14px',
                        border: `1.5px solid ${form.tone === option.value ? '#0d0d0d' : '#e4e0d8'}`,
                        borderRadius: 10, cursor: 'pointer',
                        background: form.tone === option.value ? '#f8f7f4' : 'white',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{option.label}</div>
                      <div style={{ fontSize: '0.75rem', color: '#7a7670', marginTop: 2 }}>{option.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Contact Email for Review Replies</label>
                <input
                  style={inputStyle}
                  type="email"
                  placeholder="hello@yourbusiness.com"
                  value={form.contactEmail}
                  onChange={e => setForm({ ...form, contactEmail: e.target.value })}
                />
                <div style={{ fontSize: '0.75rem', color: '#7a7670', marginTop: 6 }}>
                  Used in replies to direct unhappy customers to you privately
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.isHealthcare}
                    onChange={e => setForm({ ...form, isHealthcare: e.target.checked })}
                    style={{ width: 16, height: 16 }}
                  />
                  <span style={{ fontSize: '0.875rem' }}>
                    This is a healthcare business (enables HIPAA-compliant reply mode)
                  </span>
                </label>
              </div>

              {error && (
                <div style={{
                  background: '#fee2e2', border: '1px solid #fca5a5',
                  borderRadius: 10, padding: '12px 16px',
                  fontSize: '0.875rem', color: '#c0392b', marginBottom: 20
                }}>{error}</div>
              )}

              <button
                type="submit"
                disabled={!form.businessName}
                style={primaryBtn(!form.businessName)}
              >
                Continue →
              </button>
            </div>
          </form>
        )}

        {/* Step 2 — Billing confirmation (location is created only on confirm) */}
        {step === 2 && (
          <div style={{
            background: 'white', border: '1px solid #e4e0d8',
            borderRadius: 16, padding: 32
          }}>
            {previewLoading && (
              <div style={{ textAlign: 'center', color: '#7a7670', padding: '24px 0' }}>
                Loading your billing details…
              </div>
            )}

            {!previewLoading && preview && (
              <>
                {/* At the self-serve cap */}
                {cap && (
                  <div style={{
                    background: '#f8f7f4', border: '1px solid #e4e0d8',
                    borderRadius: 10, padding: '16px 18px', marginBottom: 20
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>You've reached {preview.maxSelfServe} locations</div>
                    <p style={{ fontSize: '0.85rem', color: '#7a7670', lineHeight: 1.6 }}>
                      Plans with more than {preview.maxSelfServe} locations are handled with agency
                      pricing. Email <a href="mailto:hello@swarmreply.com" style={{ color: '#0d0d0d' }}>hello@swarmreply.com</a> and
                      we'll set you up.
                    </p>
                  </div>
                )}

                {/* No subscription / no card — route through the billing portal first */}
                {!cap && noSub && (
                  <div style={{
                    background: '#f8f7f4', border: '1px solid #e4e0d8',
                    borderRadius: 10, padding: '16px 18px', marginBottom: 20
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>No active subscription found</div>
                    <p style={{ fontSize: '0.85rem', color: '#7a7670', lineHeight: 1.6 }}>
                      Additional locations are billed to your SwarmReply subscription, and this
                      account doesn't have one yet. If you've just signed up, your subscription
                      may still be activating — try again in a minute. Otherwise email{' '}
                      <a href="mailto:hello@swarmreply.com" style={{ color: '#0d0d0d' }}>hello@swarmreply.com</a>{' '}
                      and we'll get you set up.
                    </p>
                  </div>
                )}

                {!cap && !noSub && noCard && (
                  <div style={{
                    background: '#f8f7f4', border: '1px solid #e4e0d8',
                    borderRadius: 10, padding: '16px 18px', marginBottom: 20
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>No payment card on file</div>
                    <p style={{ fontSize: '0.85rem', color: '#7a7670', lineHeight: 1.6, marginBottom: 14 }}>
                      Adding a location adjusts your subscription, so we need a card on file first.
                      Add one in the secure Stripe billing portal, then come back here.
                    </p>
                    <button onClick={handleOpenPortal} style={primaryBtn(false)}>
                      Open billing portal →
                    </button>
                  </div>
                )}

                {/* Normal path: show the price and the card it bills to */}
                {!blocked && (
                  <>
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 10 }}>
                        Adding location #{preview.newLocationNumber} — {form.businessName}
                      </div>
                      <div style={{
                        border: '1px solid #e4e0d8', borderRadius: 12, overflow: 'hidden'
                      }}>
                        {preview.next.rows.map((row, i) => (
                          <div key={i} style={{
                            display: 'flex', justifyContent: 'space-between',
                            padding: '12px 16px', fontSize: '0.875rem',
                            borderBottom: '1px solid #f0ede6', background: 'white'
                          }}>
                            <span>{row.label} × {row.qty}</span>
                            <span style={{ fontWeight: 600 }}>${row.rate}/mo each</span>
                          </div>
                        ))}
                        <div style={{
                          display: 'flex', justifyContent: 'space-between',
                          padding: '14px 16px', fontSize: '0.95rem',
                          fontWeight: 700, background: '#f8f7f4'
                        }}>
                          <span>New total</span>
                          <span>${preview.next.monthly}/mo{preview.cycle === 'annual' ? ' (billed annually)' : ''}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{
                      background: '#f8f7f4', border: '1px solid #e4e0d8',
                      borderRadius: 10, padding: '14px 16px', marginBottom: 20,
                      fontSize: '0.85rem', color: '#7a7670', lineHeight: 1.7
                    }}>
                      This adds <strong style={{ color: '#0d0d0d' }}>${preview.monthlyDelta}/mo</strong> to
                      your subscription
                      {preview.card && (
                        <> — billed to your {preview.card.brand.charAt(0).toUpperCase() + preview.card.brand.slice(1)} ••••{preview.card.last4} on file</>
                      )}.
                      {preview.prorationEstimate !== null && preview.prorationEstimate > 0 && (
                        <> You'll be charged roughly <strong style={{ color: '#0d0d0d' }}>${preview.prorationEstimate}</strong> today,
                        prorated for the rest of your current billing period.</>
                      )}
                      {' '}No other locations change price.
                    </div>

                    {error && (
                      <div style={{
                        background: '#fee2e2', border: '1px solid #fca5a5',
                        borderRadius: 10, padding: '12px 16px',
                        fontSize: '0.875rem', color: '#c0392b', marginBottom: 20
                      }}>{error}</div>
                    )}

                    <button
                      onClick={handleConfirmAndCreate}
                      disabled={loading}
                      style={{ ...primaryBtn(loading), marginBottom: 12 }}
                    >
                      {loading ? 'Adding location…' : `Confirm — add for $${preview.monthlyDelta}/mo`}
                    </button>
                  </>
                )}

                {error && blocked && (
                  <div style={{
                    background: '#fee2e2', border: '1px solid #fca5a5',
                    borderRadius: 10, padding: '12px 16px',
                    fontSize: '0.875rem', color: '#c0392b', marginBottom: 20
                  }}>{error}</div>
                )}

                <button onClick={() => { setError(''); setStep(1); }} style={ghostBtn}>
                  ← Back to details
                </button>
              </>
            )}

            {!previewLoading && !preview && (
              <>
                {error && (
                  <div style={{
                    background: '#fee2e2', border: '1px solid #fca5a5',
                    borderRadius: 10, padding: '12px 16px',
                    fontSize: '0.875rem', color: '#c0392b', marginBottom: 20
                  }}>{error}</div>
                )}
                <button onClick={() => setStep(1)} style={ghostBtn}>← Back to details</button>
              </>
            )}
          </div>
        )}

        {/* Step 3 — Connect Google (location exists and billing is settled) */}
        {step === 3 && location && (
          <div style={{
            background: 'white', border: '1px solid #e4e0d8',
            borderRadius: 16, padding: 32, textAlign: 'center'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔍</div>
            <h3 style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: '1.4rem', fontWeight: 700, marginBottom: 12
            }}>Connect Google Business Profile</h3>
            <p style={{ color: '#7a7670', marginBottom: 8, lineHeight: 1.7 }}>
              Click below to authorize SwarmReply to read and reply to reviews
              for <strong>{location.business_name}</strong>.
            </p>
            <p style={{ color: '#7a7670', marginBottom: 32, fontSize: '0.875rem', lineHeight: 1.7 }}>
              You'll be taken to Google to approve access. This takes about 30 seconds.
            </p>

            {/* Security note */}
            <div style={{
              background: '#f8f7f4', border: '1px solid #e4e0d8',
              borderRadius: 10, padding: '14px 16px',
              marginBottom: 24, textAlign: 'left'
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span>🔒</span>
                <p style={{ fontSize: '0.8rem', color: '#7a7670', lineHeight: 1.6 }}>
                  SwarmReply only requests permission to manage your Google Business reviews.
                  We never access your email, calendar, or other Google data.
                  Your credentials are encrypted and stored securely.
                </p>
              </div>
            </div>

            <button
              onClick={handleConnectGoogle}
              style={{ ...primaryBtn(false), marginBottom: 12 }}
            >
              Connect Google Business Profile →
            </button>

            <button
              onClick={() => router.push('/dashboard/locations')}
              style={ghostBtn}
            >
              I'll connect later
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
