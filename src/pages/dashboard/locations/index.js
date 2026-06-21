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
import { Card, Button, EmptyState } from '../../../components/ui';

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
      fontSize: 'var(--fs-xs, 0.75rem)', fontWeight: 600, letterSpacing: '0.04em',
      color, background: bg, borderRadius: 'var(--r-pill, 999px)', padding: '4px 10px'
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
              fontSize: 'var(--fs-3xl, 2rem)', fontWeight: 700
            }}>Locations</h1>
            <p style={{ color: 'var(--taupe, #7a7670)', marginTop: 8 }}>
              Each active location is monitored by SwarmReply and billed on your subscription.
            </p>
          </div>
          <Button href="/dashboard/locations/add" variant="dark">+ Add location</Button>
        </div>

        {error && (
          <div style={{
            background: 'var(--danger-bg, #fee2e2)', border: '1px solid #fca5a5',
            borderRadius: 'var(--r-sm, 10px)', padding: '12px 16px',
            fontSize: 'var(--fs-base, 0.875rem)', color: 'var(--danger, #c0392b)', marginBottom: 20
          }}>{error}</div>
        )}

        {/* Loading */}
        {locations === null && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--taupe, #7a7670)', fontSize: 'var(--fs-base, 0.875rem)' }}>
            Loading locations…
          </div>
        )}

        {/* Empty state */}
        {locations && locations.length === 0 && !error && (
          <Card pad={0}>
            <EmptyState
              title="No locations yet"
              body="Add your first business location to start collecting and replying to reviews."
              actionLabel="Add a location →"
              href="/dashboard/locations/add"
            />
          </Card>
        )}

        {/* Location cards */}
        {locations && locations.map(loc => (
          <Card key={loc.id} pad="20px 24px" style={{ marginBottom: 14, opacity: loc.is_active ? 1 : 0.65 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-start', gap: 16, flexWrap: 'wrap'
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                  <h3 style={{ fontSize: 'var(--fs-lg, 1rem)', fontWeight: 700 }}>{loc.business_name}</h3>
                  {loc.is_active
                    ? badge('Active', '#1d7a4f', '#e7f5ee')
                    : badge('Inactive', 'var(--taupe, #7a7670)', '#f0ede6')}
                  {loc.is_active && (loc.google_connected
                    ? badge('Google connected', '#1d7a4f', '#e7f5ee')
                    : badge('Setup incomplete', '#a16207', '#fef9c3'))}
                  {loc.is_active && loc.billing_synced === false &&
                    badge('Billing updating…', 'var(--taupe, #7a7670)', '#f0ede6')}
                </div>
                <div style={{ fontSize: 'var(--fs-sm, 0.8125rem)', color: 'var(--taupe, #7a7670)' }}>
                  {TYPE_LABELS[loc.business_type] || loc.business_type || '—'}
                  {loc.created_at && <> · added {new Date(loc.created_at).toLocaleDateString()}</>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {loc.is_active && !loc.google_connected && (
                  <Button onClick={() => handleFinishSetup(loc)} variant="dark" size="sm">Finish setup →</Button>
                )}
                <Button
                  onClick={() => handleToggleActive(loc)}
                  disabled={busyId === loc.id}
                  variant="ghost"
                  size="sm"
                >
                  {busyId === loc.id ? 'Updating…' : (loc.is_active ? 'Deactivate' : 'Reactivate')}
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {/* Footer note */}
        {locations && locations.length > 0 && (
          <p style={{ fontSize: 'var(--fs-xs, 0.75rem)', color: 'var(--taupe, #7a7670)', marginTop: 18, lineHeight: 1.6 }}>
            Deactivating a location stops review monitoring and automatically reduces your
            subscription with a prorated credit. You can reactivate at any time.
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
