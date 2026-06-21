// ============================================
// src/pages/dashboard/locations/index.js
// All locations — status, finish-setup nudge for unconnected
// Google profiles, and activate/deactivate (billing adjusts
// automatically through the backend sync).
// ============================================

import { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import { useAuth } from '../../../hooks/useAuth';
import { getLocations, getGoogleAuthUrl, setLocationActive } from '../../../utils/api';

const TYPE_LABELS = {
  restaurant: 'Restaurant / Food & Beverage',
  dental: 'Dental Practice',
  medical: 'Medical Practice',
  gym: 'Gym / Fitness Studio',
  medspa: 'Med Spa / Salon',
  auto: 'Auto Shop / Services',
  hotel: 'Hotel / Hospitality',
  other: 'Other'
};

export default function Locations() {
  const { customer } = useAuth();
  const [locations, setLocations] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  async function load() {
    try {
      const locs = await getLocations(customer?.id);
      setLocations(locs);
    } catch {
      setError('Could not load your locations. Please refresh the page.');
      setLocations([]);
    }
  }

  useEffect(() => {
    if (customer) load();
  }, [customer]);

  async function handleToggleActive(loc) {
    const deactivating = loc.is_active;
    const msg = deactivating
      ? `Deactivate ${loc.business_name}? SwarmReply will stop monitoring its reviews and your subscription will be reduced automatically (prorated credit).`
      : `Reactivate ${loc.business_name}? It will be added back to your subscription at the standard per-location rate.`;
    if (!confirm(msg)) return;

    setBusyId(loc.id);
    setError('');
    try {
      await setLocationActive(loc.id, !loc.is_active);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update the location. Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleFinishSetup(loc) {
    window.location.href = await getGoogleAuthUrl(loc.id);
  }

  const badge = (text, color, bg) => (
    <span style={{
      fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.04em',
      color, background: bg, borderRadius: 50, padding: '4px 10px'
    }}>{text}</span>
  );

  return (
    <DashboardLayout>
      <div style={{ padding: '40px 32px', maxWidth: 760 }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-end', marginBottom: 28, gap: 16, flexWrap: 'wrap'
        }}>
          <div>
            <h1 style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: '2rem', fontWeight: 700
            }}>Locations</h1>
            <p style={{ color: 'var(--taupe, #7a7670)', marginTop: 8 }}>
              Each active location is monitored by SwarmReply and billed on your subscription.
            </p>
          </div>
          <a href="/dashboard/locations/add" style={{
            background: 'var(--ink, #0a0a0a)', color: 'white', textDecoration: 'none',
            borderRadius: 50, padding: '12px 22px', fontSize: '0.9rem',
            fontWeight: 600, fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap'
          }}>+ Add location</a>
        </div>

        {error && (
          <div style={{
            background: 'var(--danger-bg, #fee2e2)', border: '1px solid #fca5a5',
            borderRadius: 10, padding: '12px 16px',
            fontSize: '0.875rem', color: 'var(--danger, #c0392b)', marginBottom: 20
          }}>{error}</div>
        )}

        {/* Loading */}
        {locations === null && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--taupe, #7a7670)', fontSize: '0.85rem' }}>
            Loading locations…
          </div>
        )}

        {/* Empty state */}
        {locations && locations.length === 0 && !error && (
          <div style={{
            background: 'white', border: '1.5px solid var(--line, #e4e0d8)',
            borderRadius: 16, padding: 48, textAlign: 'center'
          }}>
            <img src="/bee-logo.png" alt="" style={{ width: 56, height: 56, objectFit: 'contain', marginBottom: 12, opacity: .92 }} />
            <h3 style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: '1.3rem', fontWeight: 700, marginBottom: 8
            }}>No locations yet</h3>
            <p style={{ color: 'var(--taupe, #7a7670)', fontSize: '0.9rem', marginBottom: 24 }}>
              Add your first business location to start collecting and replying to reviews.
            </p>
            <a href="/dashboard/locations/add" style={{
              display: 'inline-block', background: 'var(--ink, #0a0a0a)', color: 'white',
              textDecoration: 'none', borderRadius: 50, padding: '14px 28px',
              fontSize: '0.95rem', fontWeight: 600, fontFamily: 'DM Sans, sans-serif'
            }}>Add a location →</a>
          </div>
        )}

        {/* Location cards */}
        {locations && locations.map(loc => (
          <div key={loc.id} style={{
            background: 'white', border: '1.5px solid var(--line, #e4e0d8)',
            borderRadius: 14, padding: '20px 24px', marginBottom: 14,
            opacity: loc.is_active ? 1 : 0.65
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-start', gap: 16, flexWrap: 'wrap'
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{loc.business_name}</h3>
                  {loc.is_active
                    ? badge('Active', '#1d7a4f', '#e7f5ee')
                    : badge('Inactive', 'var(--taupe, #7a7670)', '#f0ede6')}
                  {loc.is_active && (loc.google_connected
                    ? badge('Google connected', '#1d7a4f', '#e7f5ee')
                    : badge('Setup incomplete', '#a16207', '#fef9c3'))}
                  {loc.is_active && loc.billing_synced === false &&
                    badge('Billing updating…', 'var(--taupe, #7a7670)', '#f0ede6')}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--taupe, #7a7670)' }}>
                  {TYPE_LABELS[loc.business_type] || loc.business_type || '—'}
                  {loc.created_at && <> · added {new Date(loc.created_at).toLocaleDateString()}</>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {loc.is_active && !loc.google_connected && (
                  <button
                    onClick={() => handleFinishSetup(loc)}
                    style={{
                      background: 'var(--ink, #0a0a0a)', color: 'white', border: 'none',
                      borderRadius: 50, padding: '9px 18px', fontSize: '0.82rem',
                      fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif'
                    }}
                  >Finish setup →</button>
                )}
                <button
                  onClick={() => handleToggleActive(loc)}
                  disabled={busyId === loc.id}
                  style={{
                    background: 'transparent', color: 'var(--taupe, #7a7670)',
                    border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 50,
                    padding: '9px 18px', fontSize: '0.82rem', fontWeight: 600,
                    cursor: busyId === loc.id ? 'wait' : 'pointer',
                    fontFamily: 'DM Sans, sans-serif'
                  }}
                >
                  {busyId === loc.id ? 'Updating…' : (loc.is_active ? 'Deactivate' : 'Reactivate')}
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Footer note */}
        {locations && locations.length > 0 && (
          <p style={{ fontSize: '0.78rem', color: 'var(--taupe, #7a7670)', marginTop: 18, lineHeight: 1.6 }}>
            Deactivating a location stops review monitoring and automatically reduces your
            subscription with a prorated credit. You can reactivate at any time.
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
