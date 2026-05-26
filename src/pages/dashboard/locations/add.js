// ============================================
// src/pages/dashboard/locations/add.js
// Add a new business location + connect Google
// ============================================

import { useState } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../../components/DashboardLayout';
import { useAuth } from '../../../hooks/useAuth';
import { createLocation, getGoogleAuthUrl } from '../../../utils/api';

export default function AddLocation() {
  const { customer } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1); // 1=form, 2=connect Google
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [location, setLocation] = useState(null);

  const [form, setForm] = useState({
    businessName: '',
    businessType: 'restaurant',
    tone: 'warm',
    contactEmail: '',
    isHealthcare: false
  });

  async function handleCreateLocation(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const newLocation = await createLocation({
        customerId: customer.id,
        ...form,
        platform: 'google'
      });
      setLocation(newLocation);
      setStep(2);
    } catch (err) {
      setError('Failed to create location. Please try again.');
    } finally {
      setLoading(false);
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
            {step === 1 ? 'Add a location' : 'Connect Google Business'}
          </h1>
          <p style={{ color: '#7a7670', marginTop: 8 }}>
            {step === 1
              ? 'Tell us about your business — we\'ll set up your swarm.'
              : 'Authorize SwarmReply to reply to your Google reviews.'}
          </p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
          {[1, 2].map(s => (
            <div key={s} style={{
              flex: 1, height: 4, borderRadius: 50,
              background: s <= step ? '#0d0d0d' : '#e4e0d8',
              transition: 'background 0.2s'
            }}></div>
          ))}
        </div>

        {/* Step 1 — Business details form */}
        {step === 1 && (
          <form onSubmit={handleCreateLocation}>
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
                disabled={loading || !form.businessName}
                style={{
                  width: '100%', padding: 16, borderRadius: 50,
                  background: loading || !form.businessName ? '#c8c4bc' : '#0d0d0d',
                  color: 'white', border: 'none', fontSize: '1rem',
                  fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'DM Sans, sans-serif'
                }}
              >
                {loading ? 'Creating...' : 'Continue →'}
              </button>
            </div>
          </form>
        )}

        {/* Step 2 — Connect Google */}
        {step === 2 && location && (
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
              style={{
                width: '100%', padding: 16, borderRadius: 50,
                background: '#0d0d0d', color: 'white', border: 'none',
                fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif', marginBottom: 12
              }}
            >
              Connect Google Business Profile →
            </button>

            <button
              onClick={() => router.push('/dashboard')}
              style={{
                width: '100%', padding: 14, borderRadius: 50,
                background: 'transparent', color: '#7a7670',
                border: '1px solid #e4e0d8', fontSize: '0.9rem',
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif'
              }}
            >
              I'll connect later
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
