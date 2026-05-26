// ============================================
// src/pages/dashboard/billing.js
// Customer subscription management dashboard
// ============================================

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;

const PLAN_COLORS = {
  starter: '#1a6b45',
  growth:  '#1a4baa',
  agency:  '#92690a'
};

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
  const [upgrading, setUpgrading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
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

  async function handleUpgrade() {
    if (!selectedPlan) return;
    try {
      setUpgrading(true);
      const res = await axios.post(
        `${API}/billing/upgrade`,
        { planId: selectedPlan },
        { headers: authHeaders() }
      );
      showToast(res.data.message);
      setShowUpgradeModal(false);
      await loadBilling();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update plan', 'error');
    } finally {
      setUpgrading(false);
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

  const { plan, account, stripe, availablePlans } = billing || {};
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
                  : 'We'll retry automatically. Update your card to avoid interruption.'}
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
                {plan?.price ? `$${plan.price}/month` : 'Custom pricing'}
                {plan?.locations ? ` · ${plan.locations === 1 ? '1 location' : `Up to ${plan.locations} locations`}` : ' · Unlimited locations'}
              </div>
              {/* Features */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {plan?.features?.map(f => (
                  <span key={f} style={{
                    background: '#f8f7f4', border: '1px solid #e4e0d8',
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

        {/* ── PLAN SWITCHER ── */}
        <div style={cardStyle}>
          <div style={sectionLabel}>Change plan</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 14 }}>
            {availablePlans?.filter(p => p.id !== 'agency').map(p => (
              <div
                key={p.id}
                onClick={() => {
                  if (!p.current) { setSelectedPlan(p.id); setShowUpgradeModal(true); }
                }}
                style={{
                  border: p.current ? '2px solid #0a0a0a' : '1.5px solid #e4e0d8',
                  borderRadius: 14, padding: '18px 20px',
                  cursor: p.current ? 'default' : 'pointer',
                  background: p.current ? '#f8f7f4' : '#fff',
                  transition: 'all .15s',
                  opacity: cancelAtEnd && !p.current ? .6 : 1
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: '.9rem', color: '#0a0a0a' }}>{p.name}</div>
                  {p.current && (
                    <span style={{ background: '#0a0a0a', color: '#fff', fontSize: '.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: 50 }}>
                      Current
                    </span>
                  )}
                </div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.6rem', fontWeight: 900, color: '#0a0a0a', marginBottom: 4 }}>
                  ${p.price}<span style={{ fontSize: '.9rem', fontWeight: 400, color: '#7a7670' }}>/mo</span>
                </div>
                <div style={{ fontSize: '.75rem', color: '#7a7670', marginBottom: 12 }}>
                  {p.locations === 1 ? '1 location' : `Up to ${p.locations} locations`}
                </div>
                {!p.current && (
                  <div style={{
                    background: p.price > (plan?.price || 0) ? '#0a0a0a' : '#f8f7f4',
                    color:      p.price > (plan?.price || 0) ? '#fff' : '#0a0a0a',
                    border:     p.price > (plan?.price || 0) ? 'none' : '1.5px solid #e4e0d8',
                    borderRadius: 50, padding: '7px 14px', fontSize: '.78rem', fontWeight: 600,
                    textAlign: 'center'
                  }}>
                    {p.price > (plan?.price || 0) ? 'Upgrade →' : 'Downgrade'}
                  </div>
                )}
              </div>
            ))}
            {/* Agency card */}
            <div style={{
              border: plan?.id === 'agency' ? '2px solid #92690a' : '1.5px solid #e4e0d8',
              borderRadius: 14, padding: '18px 20px', background: '#fff'
            }}>
              <div style={{ fontWeight: 700, fontSize: '.9rem', marginBottom: 8 }}>Agency</div>
              <div style={{ fontWeight: 600, fontSize: '1rem', color: '#0a0a0a', marginBottom: 4 }}>Custom pricing</div>
              <div style={{ fontSize: '.75rem', color: '#7a7670', marginBottom: 12 }}>Unlimited locations</div>
              <a href="mailto:hello@swarmreply.com?subject=Agency Plan Inquiry" style={{
                display: 'block', background: '#f5c842', color: '#0a0a0a',
                borderRadius: 50, padding: '7px 14px', fontSize: '.78rem', fontWeight: 600,
                textAlign: 'center', textDecoration: 'none'
              }}>
                Contact sales →
              </a>
            </div>
          </div>
          <div style={{ fontSize: '.75rem', color: '#7a7670', marginTop: 12, lineHeight: 1.6 }}>
            Plan changes take effect immediately. Stripe prorates the difference automatically.
            No contracts — cancel anytime.
          </div>
        </div>

        {/* ── INVOICE HISTORY ── */}
        <div style={cardStyle}>
          <div style={{ ...sectionLabel, marginBottom: 14 }}>Invoice history</div>
          {invoices.length === 0 ? (
            <div style={{ fontSize: '.875rem', color: '#7a7670', padding: '16px 0' }}>No invoices yet.</div>
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

      {/* ── UPGRADE MODAL ── */}
      {showUpgradeModal && selectedPlan && (
        <div style={modalOverlay} onClick={() => setShowUpgradeModal(false)}>
          <div style={modalCard} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.3rem', fontWeight: 700, marginBottom: 8 }}>
              {availablePlans.find(p => p.id === selectedPlan)?.price > (plan?.price || 0)
                ? 'Upgrade your plan'
                : 'Downgrade your plan'}
            </div>
            <p style={{ fontSize: '.875rem', color: '#7a7670', marginBottom: 20, lineHeight: 1.65 }}>
              Switching from <strong>{plan?.name}</strong> to{' '}
              <strong>{availablePlans.find(p => p.id === selectedPlan)?.name}</strong>.
              Stripe will prorate the difference on your next invoice.
              Your new plan takes effect immediately.
            </p>
            <div style={{ background: '#f8f7f4', borderRadius: 11, padding: '14px 16px', marginBottom: 20 }}>
              <div style={{ fontSize: '.75rem', fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 8 }}>
                New plan
              </div>
              <div style={{ fontWeight: 600, fontSize: '.95rem' }}>
                {availablePlans.find(p => p.id === selectedPlan)?.name} — ${availablePlans.find(p => p.id === selectedPlan)?.price}/mo
              </div>
              <div style={{ fontSize: '.78rem', color: '#7a7670', marginTop: 2 }}>
                {availablePlans.find(p => p.id === selectedPlan)?.locations === 1 ? '1 location' : `Up to ${availablePlans.find(p => p.id === selectedPlan)?.locations} locations`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowUpgradeModal(false)}
                style={{ ...btnStyle('outline'), flex: 1 }}>Cancel</button>
              <button onClick={handleUpgrade} disabled={upgrading}
                style={{ ...btnStyle('primary'), flex: 1 }}>
                {upgrading ? 'Updating…' : 'Confirm change'}
              </button>
            </div>
          </div>
        </div>
      )}

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
  background: '#fff', border: '1px solid #e4e0d8', borderRadius: 16,
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
    gold:    { background: '#f5c842', color: '#0a0a0a' },
    outline: { background: 'transparent', border: '1.5px solid #e4e0d8', color: '#1a1a18' },
    red:     { background: '#fee2e2', color: '#c0392b', border: '1px solid #fecaca' },
    amber:   { background: '#fef3cd', color: '#92690a', border: '1px solid #fde68a' }
  };
  return { ...base, ...variants[variant] };
}
