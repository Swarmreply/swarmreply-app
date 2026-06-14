// ============================================
// src/pages/dashboard/billing.js
// Customer subscription management dashboard
// ============================================

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import EmptyState from '../../components/EmptyState';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;

const STATUS_LABELS = {
  active:      { label: 'Active',          bg: '#e8f5ef', color: '#1a6b45' },
  cancelling:  { label: 'Cancels soon',    bg: '#fef3cd', color: '#92690a' },
  paused:      { label: 'Payment issue',   bg: '#fee2e2', color: '#c0392b' },
  cancelled:   { label: 'Cancelled',       bg: '#f0eeea', color: '#7a7670' },
  trialing:    { label: 'Trial',           bg: '#e8f0fe', color: '#1a4baa' }
};

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatCurrency(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

export default function Billing() {
  const { customer } = useAuth();
  const [billing, setBilling]   = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (customer) loadBilling();
  }, [customer]);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function loadBilling() {
    try {
      setLoading(true);
      const [billingRes, invoicesRes] = await Promise.all([
        axios.get(`${API}/billing/status`,   { headers: authHeaders() }),
        axios.get(`${API}/billing/invoices`, { headers: authHeaders() })
      ]);
      setBilling(billingRes.data.billing);
      setInvoices(invoicesRes.data.invoices || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load billing information');
    } finally {
      setLoading(false);
    }
  }

  function authHeaders() {
    const token = localStorage.getItem('swarmreply_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function openPortal() {
    try {
      setPortalLoading(true);
      const res = await axios.get(`${API}/billing/portal`, { headers: authHeaders() });
      window.location.href = res.data.url;
    } catch (err) {
      showToast(err.response?.data?.error || 'Could not open billing portal', 'error');
      setPortalLoading(false);
    }
  }

  async function handleCancel() {
    try {
      setCancelling(true);
      const res = await axios.post(
        `${API}/billing/cancel`,
        { reason: cancelReason },
        { headers: authHeaders() }
      );
      showToast(res.data.message);
      setShowCancelModal(false);
      await loadBilling();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to cancel', 'error');
    } finally {
      setCancelling(false);
    }
  }

  async function handleReactivate() {
    try {
      const res = await axios.post(
        `${API}/billing/reactivate`,
        {},
        { headers: authHeaders() }
      );
      showToast(res.data.message);
      await loadBilling();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to reactivate', 'error');
    }
  }

  if (loading) return (
    <DashboardLayout title="Billing">
      <div style={{ padding: 48, textAlign: 'center', color: '#7a7670', fontSize: '.9rem' }}>
        Loading billing information…
      </div>
    </DashboardLayout>
  );

  if (error) return (
    <DashboardLayout title="Billing">
      <div style={{ padding: 48, textAlign: 'center' }}>
        <div style={{ color: '#c0392b', marginBottom: 12 }}>{error}</div>
        <button onClick={loadBilling} style={btnStyle('outline')}>Retry</button>
      </div>
    </DashboardLayout>
  );

  const { plan, account, stripe, pricing, locationCount } = billing || {};
  const statusInfo = STATUS_LABELS[account?.status] || STATUS_LABELS.active;
  const cancelAtEnd = stripe?.cancelAtPeriodEnd;
  const hasPaymentIssue = account?.paymentFailed;

  return (
    <DashboardLayout title="Billing & Subscription">

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 80, right: 24, zIndex: 999,
          background: toast.type === 'error' ? '#c0392b' : '#0a0a0a',
          color: '#fff', padding: '12px 20px', borderRadius: 11,
          fontSize: '.875rem', fontWeight: 500, maxWidth: 380,
          boxShadow: '0 8px 32px rgba(0,0,0,.2)'
        }}>
          {toast.message}
        </div>
      )}

      <div style={{ padding: '24px 28px', maxWidth: 900 }}>

        {/* ── PAYMENT ISSUE BANNER ── */}
        {hasPaymentIssue && (
          <div style={{
            background: '#fee2e2', border: '1px solid #fecaca',
            borderRadius: 13, padding: '16px 20px',
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 20
          }}>
            <div>
              <div style={{ fontWeight: 700, color: '#c0392b', marginBottom: 4 }}>
                ⚠ Payment failed — update your card to keep your swarm running
              </div>
              <div style={{ fontSize: '.82rem', color: '#c0392b', opacity: .8 }}>
                {account?.failureCount > 1
                  ? `${account.failureCount} failed attempts. Your account may be paused.`
                  : "We'll retry automatically. Update your card to avoid interruption."}
              </div>
            </div>
            <button onClick={openPortal} style={{ ...btnStyle('red'), flexShrink: 0, marginLeft: 16 }}
              disabled={portalLoading}>
              {portalLoading ? 'Loading…' : 'Update card →'}
            </button>
          </div>
        )}

        {/* ── CANCELLATION BANNER ── */}
        {cancelAtEnd && (
          <div style={{
            background: '#fef3cd', border: '1px solid #fde68a',
            borderRadius: 13, padding: '16px 20px',
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 20
          }}>
            <div>
              <div style={{ fontWeight: 700, color: '#92690a', marginBottom: 4 }}>
                Your subscription ends {formatDate(stripe?.cancelAt)}
              </div>
              <div style={{ fontSize: '.82rem', color: '#92690a', opacity: .8 }}>
                You have full access until then. Changed your mind?
              </div>
            </div>
            <button onClick={handleReactivate} style={{ ...btnStyle('amber'), flexShrink: 0, marginLeft: 16 }}>
              Keep my subscription
            </button>
          </div>
        )}

        {/* ── CURRENT PLAN ── */}
        <div style={cardStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'start' }}>
            <div>
              <div style={sectionLabel}>Current plan</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
                <span style={{
                  fontFamily: 'Playfair Display, serif',
                  fontSize: '2rem', fontWeight: 900, color: '#0a0a0a'
                }}>{plan?.name}</span>
                <span style={{
                  background: '#f5c842', color: '#0a0a0a',
                  padding: '2px 10px', borderRadius: 50, fontSize: '.72rem', fontWeight: 700
                }}>
                  {statusInfo.label}
                </span>
              </div>
              <div style={{ fontSize: '1.1rem', color: '#7a7670', marginBottom: 16 }}>
                ${plan?.price}/month
                {` · ${locationCount === 1 ? '1 location' : `${locationCount} locations`}`}
                {billing?.billingCycle === 'annual' && ' · billed annually (10% off)'}
              </div>
              {/* Features */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {plan?.features?.map(f => (
                  <span key={f} style={{
                    background: '#f8f7f4', border: '1.5px solid #e4e0d8',
                    padding: '3px 10px', borderRadius: 50, fontSize: '.75rem', color: '#4a4a48'
                  }}>✓ {f}</span>
                ))}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {/* Next billing */}
              {stripe?.currentPeriodEnd && !cancelAtEnd && (
                <div style={{ marginBottom: 16 }}>
                  <div style={metaLabel}>Next billing date</div>
                  <div style={{ fontWeight: 600, fontSize: '.9rem' }}>
                    {formatDate(stripe.currentPeriodEnd)}
                  </div>
                </div>
              )}
              {/* Payment method */}
              {stripe?.defaultPaymentMethod && (
                <div style={{ marginBottom: 16 }}>
                  <div style={metaLabel}>Payment method</div>
                  <div style={{ fontWeight: 600, fontSize: '.9rem', textTransform: 'capitalize' }}>
                    {stripe.defaultPaymentMethod.brand} ···· {stripe.defaultPaymentMethod.last4}
                  </div>
                  <div style={{ fontSize: '.72rem', color: '#7a7670', marginTop: 2 }}>
                    Expires {stripe.defaultPaymentMethod.expMonth}/{stripe.defaultPaymentMethod.expYear}
                  </div>
                </div>
              )}
              <button onClick={openPortal} disabled={portalLoading}
                style={{ ...btnStyle('outline'), display: 'block', width: '100%', textAlign: 'center', marginBottom: 8 }}>
                {portalLoading ? 'Opening…' : 'Manage billing →'}
              </button>
            </div>
          </div>
        </div>

        {/* ── LOCATIONS & PRICING ── */}
        <div style={cardStyle}>
          <div style={sectionLabel}>Your locations & pricing</div>
          <p style={{ fontSize: '.82rem', color: '#7a7670', marginTop: 8, marginBottom: 16, lineHeight: 1.6 }}>
            Your price is based on how many active locations you have. It updates
            automatically when you add or remove a location — there is no plan to choose.
          </p>

          {/* Per-location breakdown */}
          <div style={{ border: '1.5px solid #e4e0d8', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
            {pricing?.rows?.map((row, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '11px 16px', fontSize: '.85rem',
                borderBottom: i < pricing.rows.length - 1 ? '1px solid #f0ede7' : 'none'
              }}>
                <span style={{ color: '#1a1a18' }}>
                  {row.label}
                  {row.qty > 1 && <span style={{ color: '#7a7670' }}>{` · ${row.qty} × $${row.rate}`}</span>}
                </span>
                <span style={{ fontWeight: 600 }}>${row.qty * row.rate}/mo</span>
              </div>
            ))}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 16px', background: '#f8f7f4', fontSize: '.9rem', fontWeight: 700
            }}>
              <span>Total{billing?.billingCycle === 'annual' ? ' (annual · 10% off)' : ''}</span>
              <span>${pricing?.monthly}/mo</span>
            </div>
          </div>

          <a href="/dashboard/locations/add" style={{
            display: 'inline-block', background: '#0a0a0a', color: '#fff',
            borderRadius: 50, padding: '9px 20px', fontSize: '.82rem', fontWeight: 700,
            textDecoration: 'none'
          }}>
            Add a location →
          </a>

          <div style={{ fontSize: '.75rem', color: '#7a7670', marginTop: 14, lineHeight: 1.6 }}>
            $99/mo each for your first two locations, $89/mo each for locations 3–25, and
            $79/mo each for 26–99. No contracts — cancel anytime.
          </div>
        </div>

        {/* ── INVOICE HISTORY ── */}
        <div style={cardStyle}>
          <div style={{ ...sectionLabel, marginBottom: 14 }}>Invoice history</div>
          {invoices.length === 0 ? (
            <div style={{ padding: '8px 0' }}>
              <EmptyState compact title="No invoices yet"
                description="Your invoices will appear here after your first billing cycle." />
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f7f4' }}>
                  {['Date', 'Period', 'Plan', 'Amount', 'Status', ''].map(h => (
                    <th key={h} style={{
                      padding: '9px 14px', fontSize: '.67rem', fontWeight: 700,
                      letterSpacing: '.07em', textTransform: 'uppercase',
                      color: '#7a7670', textAlign: 'left', borderBottom: '1px solid #e4e0d8'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #f0eeea' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8f7f4'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                    <td style={tdStyle}>{formatDate(inv.date)}</td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: '.78rem', color: '#7a7670' }}>
                        {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                      </span>
                    </td>
                    <td style={tdStyle}>{inv.plan}</td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{formatCurrency(inv.amount)}</td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '2px 9px', borderRadius: 50, fontSize: '.67rem', fontWeight: 700,
                        background: inv.status === 'paid' ? '#e8f5ef' : '#fee2e2',
                        color:      inv.status === 'paid' ? '#1a6b45' : '#c0392b'
                      }}>
                        {inv.status === 'paid' ? '✓ Paid' : inv.status}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {inv.pdfUrl && (
                        <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: '.78rem', color: '#0a0a0a', fontWeight: 600, textDecoration: 'none' }}>
                          PDF ↗
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── DANGER ZONE ── */}
        <div style={{ ...cardStyle, border: '1px solid #fecaca' }}>
          <div style={{ ...sectionLabel, color: '#c0392b' }}>Danger zone</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 4 }}>
                {cancelAtEnd ? 'Cancellation scheduled' : 'Cancel subscription'}
              </div>
              <div style={{ fontSize: '.8rem', color: '#7a7670', lineHeight: 1.6 }}>
                {cancelAtEnd
                  ? `Your subscription ends ${formatDate(stripe?.cancelAt)}. You have full access until then.`
                  : 'You\'ll keep access until the end of your current billing period. No refunds are issued for partial months.'}
              </div>
            </div>
            {cancelAtEnd ? (
              <button onClick={handleReactivate}
                style={{ ...btnStyle('outline'), flexShrink: 0, marginLeft: 16 }}>
                Undo cancellation
              </button>
            ) : (
              <button onClick={() => setShowCancelModal(true)}
                style={{ ...btnStyle('red'), flexShrink: 0, marginLeft: 16 }}>
                Cancel subscription
              </button>
            )}
          </div>
        </div>

      </div>

      {/* ── CANCEL MODAL ── */}
      {showCancelModal && (
        <div style={modalOverlay} onClick={() => setShowCancelModal(false)}>
          <div style={modalCard} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.3rem', fontWeight: 700, marginBottom: 8 }}>
              Cancel your subscription?
            </div>
            <p style={{ fontSize: '.875rem', color: '#7a7670', marginBottom: 16, lineHeight: 1.65 }}>
              You'll keep full access until <strong>{formatDate(stripe?.currentPeriodEnd)}</strong>.
              After that, your reviews will stop being replied to and your data will be saved for 30 days.
            </p>
            <div style={{ marginBottom: 20 }}>
              <label style={fieldLabel}>What made you decide to cancel? (optional)</label>
              <select
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                style={fieldStyle}
              >
                <option value="">Select a reason…</option>
                <option value="too_expensive">Too expensive</option>
                <option value="missing_features">Missing features I need</option>
                <option value="not_using">Not using it enough</option>
                <option value="switching">Switching to another tool</option>
                <option value="closing">Business is closing</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowCancelModal(false)}
                style={{ ...btnStyle('outline'), flex: 1 }}>Never mind</button>
              <button onClick={handleCancel} disabled={cancelling}
                style={{ ...btnStyle('red'), flex: 1 }}>
                {cancelling ? 'Cancelling…' : 'Yes, cancel subscription'}
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}

// ── STYLE HELPERS ─────────────────────────────────────────────────────────────

const cardStyle = {
  background: '#fff', border: '1.5px solid #e4e0d8', borderRadius: 16,
  padding: '22px 24px', marginBottom: 16
};

const sectionLabel = {
  fontSize: '.67rem', fontWeight: 700, letterSpacing: '.08em',
  textTransform: 'uppercase', color: '#7a7670', marginBottom: 2
};

const metaLabel = {
  fontSize: '.67rem', fontWeight: 700, letterSpacing: '.07em',
  textTransform: 'uppercase', color: '#7a7670', marginBottom: 3
};

const tdStyle = {
  padding: '11px 14px', fontSize: '.85rem', color: '#1a1a18', verticalAlign: 'middle'
};

const modalOverlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 200, padding: 20
};

const modalCard = {
  background: '#fff', borderRadius: 20, padding: '32px 36px',
  maxWidth: 440, width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,.18)'
};

const fieldLabel = {
  display: 'block', fontSize: '.67rem', fontWeight: 700,
  letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 5
};

const fieldStyle = {
  width: '100%', padding: '10px 13px', border: '1.5px solid #e4e0d8',
  borderRadius: 10, fontSize: '.875rem', color: '#1a1a18',
  outline: 'none', fontFamily: 'inherit', background: '#fff',
  cursor: 'pointer', appearance: 'none'
};

function btnStyle(variant) {
  const base = {
    padding: '9px 20px', borderRadius: 50, fontSize: '.82rem',
    fontWeight: 700, cursor: 'pointer', border: 'none',
    fontFamily: 'inherit', transition: 'all .15s', display: 'inline-flex',
    alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
  };
  const variants = {
    primary: { background: '#0a0a0a', color: '#fff' },
    gold:    { background: 'linear-gradient(135deg,#f5c842,#d4a515)', color: '#1a1408' },
    outline: { background: 'transparent', border: '1.5px solid #e4e0d8', color: '#1a1a18' },
    red:     { background: '#fee2e2', color: '#c0392b', border: '1px solid #fecaca' },
    amber:   { background: '#fef3cd', color: '#92690a', border: '1px solid #fde68a' }
  };
  return { ...base, ...variants[variant] };
}
