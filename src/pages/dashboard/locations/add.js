// src/pages/dashboard/locations/add.js
// Add a location — focused slide-over over the dashboard.
//   • Live billing meter: current → new monthly, plus the prorated charge today
//   • Searchable 45-industry field (same list as signup)
//   • Reply tone removed — new locations default to "Warm & Friendly" (changed in Settings)
//   • Card on file bills the proration on confirm (works today).
//   • PAYMENT SEAM: entering a NEW card inline (Stripe Payment Element / SetupIntent)
//     lands in the Stripe build. Until then "Change / Add a card" uses the Stripe portal.
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../../components/DashboardLayout';
import {
  createLocation,
  getLocationBillingPreview,
  getBillingPortalUrl,
  getGoogleAuthUrl,
} from '../../../utils/api';

const INDUSTRIES = [
  'Restaurant / Food', 'Cafe / Coffee Shop', 'Bar / Brewery', 'Grocery / Convenience',
  'Home Services (general)', 'HVAC / Plumbing / Electrical', 'Cleaning Services',
  'Landscaping / Lawn Care', 'Roofing / Construction', 'Moving / Storage', 'Pest Control',
  'Retail / Shop', 'E-commerce',
  'Healthcare / Medical', 'Dental', 'Veterinary', 'Chiropractic', 'Mental Health / Therapy', 'Optometry',
  'Professional Services', 'Legal', 'Accounting / Tax', 'Real Estate', 'Insurance',
  'Financial Services', 'Marketing / Agency', 'IT / Tech Services',
  'Beauty / Salon / Spa', 'Barber Shop', 'Nail Salon', 'Tattoo / Piercing',
  'Automotive', 'Auto Repair', 'Car Dealership', 'Car Wash / Detailing',
  'Fitness / Wellness', 'Gym / Personal Training', 'Yoga / Pilates Studio',
  'Education / Tutoring', 'Childcare / Daycare',
  'Hotel / Hospitality', 'Event Services', 'Photography', 'Pet Services / Grooming',
  'Other',
].filter(x => x !== 'Other').sort((a, b) => a.localeCompare(b)).concat(['Other']);

// Map the rich industry label to the businessType code the API already accepts,
// so nothing breaks server-side. The backend pass can consume the full `industry`
// label directly and drop this mapping.
function industryToType(label) {
  const l = (label || '').toLowerCase();
  if (/restaurant|cafe|coffee|bar|brewery|grocery|food/.test(l)) return 'restaurant';
  if (/dental/.test(l)) return 'dental';
  if (/health|medical|veterinary|chiro|therapy|optometry|mental/.test(l)) return 'medical';
  if (/salon|spa|beauty|barber|nail|tattoo/.test(l)) return 'medspa';
  if (/gym|fitness|yoga|pilates|wellness/.test(l)) return 'gym';
  if (/auto|car wash|dealership|automotive|repair/.test(l)) return 'auto';
  if (/hotel|hospitality|event/.test(l)) return 'hotel';
  return 'other';
}

const inputStyle = { width: '100%', padding: '10px 13px', border: '1.5px solid #e4e0d8', borderRadius: 9, fontSize: '.86rem', fontFamily: 'DM Sans, sans-serif', color: '#0a0a0a', background: '#fff', outline: 'none' };
const labelStyle = { display: 'block', fontSize: '.68rem', fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 6 };
const primaryBtn = (disabled) => ({ width: '100%', padding: 13, borderRadius: 50, background: disabled ? '#d8d3c8' : '#0a0a0a', color: '#fff', border: 'none', fontSize: '.9rem', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' });
const ghostBtn = { width: '100%', padding: 12, borderRadius: 50, background: 'transparent', color: '#7a7670', border: '1.5px solid #e4e0d8', fontSize: '.86rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' };

const cap1 = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Card';
const CardIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="1.8" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>;
const LockIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>;

function Field({ label, children }) {
  return <div style={{ marginBottom: 14 }}><label style={labelStyle}>{label}</label>{children}</div>;
}
function Hint({ children }) {
  return <p style={{ fontSize: '.72rem', color: '#a39e95', margin: '6px 0 0' }}>{children}</p>;
}
function Notice({ title, body }) {
  return (
    <div style={{ background: '#f8f7f4', border: '1.5px solid #e4e0d8', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
      <div style={{ fontWeight: 600, fontSize: '.9rem', marginBottom: 6, color: '#0a0a0a' }}>{title}</div>
      <p style={{ fontSize: '.82rem', color: '#7a7670', lineHeight: 1.6, margin: 0 }}>{body}</p>
    </div>
  );
}
function ErrorBox({ children }) {
  return <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 9, padding: '11px 14px', fontSize: '.84rem', color: '#c0392b', margin: '0 0 14px' }}>{children}</div>;
}

function IndustryCombobox({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const matches = useMemo(
    () => INDUSTRIES.filter(i => i.toLowerCase().includes(q.toLowerCase())).slice(0, 8),
    [q]
  );
  return (
    <div style={{ position: 'relative' }}>
      <div onClick={() => setOpen(true)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1.5px solid ${open ? '#0a0a0a' : '#e4e0d8'}`, borderRadius: 9, padding: '10px 13px', background: '#fff', cursor: 'text' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7a7670" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        <input
          value={open ? q : (value || '')}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          placeholder={value ? '' : 'Search your industry…'}
          aria-label="Industry"
          style={{ border: 'none', outline: 'none', flex: 1, fontSize: '.86rem', fontFamily: 'DM Sans, sans-serif', color: '#0a0a0a', background: 'transparent' }}
        />
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1px solid #e4e0d8', borderRadius: 10, boxShadow: '0 12px 32px rgba(0,0,0,.10)', maxHeight: 220, overflowY: 'auto', zIndex: 50, padding: 5 }}>
          {matches.length === 0 && <div style={{ padding: '9px 11px', fontSize: '.84rem', color: '#a39e95' }}>No match</div>}
          {matches.map(opt => (
            <div key={opt}
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onChange(opt); setOpen(false); setQ(''); }}
              style={{ padding: '8px 11px', borderRadius: 7, fontSize: '.86rem', color: '#0a0a0a', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
              <span>{opt}</span>
              {value === opt && <span style={{ color: '#1a6b45' }}>✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BillingMeter({ current, next, delta, count, cycle }) {
  const cur = Math.round(current), nxt = Math.round(next), d = Math.round(delta);
  return (
    <div style={{ background: '#fff', border: '1px solid #e4e0d8', borderRadius: 12, padding: 14, marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 9 }}>
        <span style={{ fontSize: '.78rem', color: '#7a7670' }}>Monthly total</span>
        <span style={{ fontSize: '.68rem', fontWeight: 600, color: '#854f0b', background: '#faeeda', padding: '3px 9px', borderRadius: 20 }}>+${d}/mo</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: '.95rem', color: '#a39e95', textDecoration: 'line-through' }}>${cur}</span>
        <span style={{ color: '#7a7670' }}>→</span>
        <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: '1.55rem', color: '#0a0a0a', lineHeight: 1 }}>
          ${nxt}<span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400, fontSize: '.8rem', color: '#7a7670' }}>/mo{cycle === 'annual' ? ' · annual' : ''}</span>
        </span>
      </div>
      <div style={{ height: 7, borderRadius: 20, background: '#eceae4', display: 'flex', overflow: 'hidden' }}>
        <span style={{ flex: Math.max(cur, 1), background: '#0a0a0a' }} />
        <span style={{ flex: Math.max(d, 1), background: '#f5c842' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.72rem', color: '#a39e95', marginTop: 6 }}>
        <span>{count - 1} location{count - 1 === 1 ? '' : 's'}</span><span>{count} locations</span>
      </div>
    </div>
  );
}

function ObligationNote({ delta, next, proration, cycle }) {
  const d = Math.round(delta), nxt = Math.round(next), pr = proration != null ? Math.round(proration) : null;
  return (
    <div style={{ background: '#f3efe7', borderRadius: 9, padding: '11px 13px', margin: '14px 0', display: 'flex', gap: 9 }}>
      <span style={{ color: '#854f0b', flexShrink: 0, marginTop: 1, fontWeight: 600 }}>i</span>
      <span style={{ fontSize: '.78rem', color: '#5a4a2a', lineHeight: 1.5 }}>
        {pr > 0
          ? <>You'll be charged about <strong>${pr} today</strong>, prorated for the rest of this billing period, then </>
          : <>This adds <strong>${d}/mo</strong> — your new total is </>}
        <strong>${nxt}/mo</strong>{cycle === 'annual' ? ' (billed annually)' : ''}. No other locations change price.
      </span>
    </div>
  );
}

function SuccessBlock({ created, onConnect, onLater }) {
  return (
    <div>
      <div style={{ background: '#e7f1ea', color: '#1a6b45', width: 46, height: 46, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, fontSize: '1.3rem', fontWeight: 600 }}>✓</div>
      <p style={{ fontSize: '.9rem', color: '#3a3a38', lineHeight: 1.6, marginBottom: 8 }}>
        <strong style={{ color: '#0a0a0a' }}>{created.business_name || 'Your location'}</strong> is on your account and billing is updated.
      </p>
      <p style={{ fontSize: '.82rem', color: '#7a7670', lineHeight: 1.6, marginBottom: 20 }}>
        Connect its Google Business Profile so SwarmReply can read and reply to reviews — about 30 seconds.
      </p>
      <button onClick={onConnect} style={{ ...primaryBtn(false), marginBottom: 10 }}>Connect Google Business Profile →</button>
      <button onClick={onLater} style={ghostBtn}>I'll connect later</button>
    </div>
  );
}

export default function AddLocation() {
  const router = useRouter();
  const [idempotencyKey] = useState(() =>
    (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `loc_${Date.now()}_${Math.random().toString(36).slice(2)}`
  );
  const [form, setForm] = useState({ businessName: '', industry: '', contactEmail: '', isHealthcare: false });
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPreviewLoading(true);
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
  }, []);

  const close = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/dashboard/locations');
  };

  async function handleConfirm() {
    setLoading(true); setError('');
    try {
      const loc = await createLocation({
        businessName: form.businessName,
        businessType: industryToType(form.industry),
        industry: form.industry,
        tone: 'warm',
        contactEmail: form.contactEmail,
        isHealthcare: form.isHealthcare,
        platform: 'google',
        idempotencyKey,
      });
      setCreated(loc);
    } catch (err) {
      const code = err.response?.data?.code;
      setError(code === 'max_locations'
        ? err.response.data.error
        : 'Failed to add location. Retrying is safe and will not double-charge you.');
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenPortal() {
    setError('');
    try {
      const token = localStorage.getItem('swarmreply_token');
      const r = await getBillingPortalUrl(token);
      if (r?.url) window.location.href = r.url;
      else setError(r?.error || 'Could not open the billing portal. Please try again.');
    } catch (err) {
      setError(err?.message || 'Could not open the billing portal. Please try again.');
    }
  }

  async function handleConnectGoogle() {
    if (!created) return;
    window.location.href = await getGoogleAuthUrl(created.id);
  }

  const atMax = preview?.atMax;
  const noSub = preview && !preview.hasSubscription;
  const hasCard = preview && preview.hasPaymentMethod;
  const currentMonthly = preview ? (preview.next.monthly - preview.monthlyDelta) : null;
  const canConfirm = hasCard && !atMax && !noSub && form.businessName && form.industry && !loading;

  return (
    <DashboardLayout>
      <div onClick={close} style={{ position: 'fixed', inset: 0, background: 'rgba(10,8,4,.45)', zIndex: 90 }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(440px, 100%)', background: '#faf8f3', zIndex: 100, overflowY: 'auto', borderLeft: '1px solid #d9d4ca', fontFamily: 'DM Sans, sans-serif' }}>
        <div style={{ padding: '22px 22px 30px' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.3rem', fontWeight: 700, color: '#0a0a0a', margin: 0 }}>
              {created ? 'Location added' : 'Add a location'}
            </h1>
            <button onClick={close} aria-label="Close" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#7a7670', fontSize: '1.4rem', lineHeight: 1 }}>×</button>
          </div>

          {created ? (
            <SuccessBlock created={created} onConnect={handleConnectGoogle} onLater={() => router.push('/dashboard/locations')} />
          ) : (
            <>
              {previewLoading && (
                <div style={{ background: '#fff', border: '1px solid #e4e0d8', borderRadius: 12, padding: 14, marginBottom: 18, color: '#a39e95', fontSize: '.82rem' }}>
                  Loading your billing details…
                </div>
              )}

              {!previewLoading && atMax && (
                <Notice title={`You've reached ${preview.maxSelfServe} locations`}
                  body={<>Plans above {preview.maxSelfServe} locations use agency pricing. Email <a href="mailto:hello@swarmreply.com" style={{ color: '#0a0a0a' }}>hello@swarmreply.com</a> and we'll set you up.</>} />
              )}

              {!previewLoading && !atMax && noSub && (
                <Notice title="No active subscription yet"
                  body={<>Additional locations bill to your subscription. If you just signed up it may still be activating — try again shortly, or email <a href="mailto:hello@swarmreply.com" style={{ color: '#0a0a0a' }}>hello@swarmreply.com</a>.</>} />
              )}

              {!previewLoading && preview && !atMax && !noSub && (
                <>
                  <BillingMeter current={currentMonthly} next={preview.next.monthly} delta={preview.monthlyDelta} count={preview.newLocationNumber} cycle={preview.cycle} />

                  <Field label="Location name">
                    <input value={form.businessName} onChange={e => setForm({ ...form, businessName: e.target.value })} placeholder="e.g. Bright Smile Dental — Riverside" style={inputStyle} />
                  </Field>

                  <Field label="Industry">
                    <IndustryCombobox value={form.industry} onChange={v => setForm({ ...form, industry: v })} />
                    <Hint>Searchable · same 45 industries as signup</Hint>
                  </Field>

                  <Field label="Contact email (optional)">
                    <input type="email" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} placeholder="hello@yourbusiness.com" style={inputStyle} />
                    <Hint>Used to route unhappy customers to you privately</Hint>
                  </Field>

                  <label style={{ display: 'flex', gap: 9, alignItems: 'center', cursor: 'pointer', marginBottom: 16 }}>
                    <input type="checkbox" checked={form.isHealthcare} onChange={e => setForm({ ...form, isHealthcare: e.target.checked })} style={{ width: 15, height: 15 }} />
                    <span style={{ fontSize: '.82rem', color: '#3a3a38' }}>This is a healthcare business (HIPAA-compliant replies)</span>
                  </label>

                  <div style={{ height: 1, background: '#e4e0d8', margin: '4px 0 16px' }} />

                  <div style={labelStyle}>Payment</div>

                  {hasCard ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1.5px solid #e4e0d8', borderRadius: 9, padding: '10px 13px', background: '#fff', marginBottom: 7 }}>
                        <CardIcon />
                        <span style={{ fontSize: '.84rem', color: '#0a0a0a' }}>{cap1(preview.card?.brand)} ending {preview.card?.last4}</span>
                        <button onClick={handleOpenPortal} style={{ marginLeft: 'auto', border: 'none', background: 'transparent', fontSize: '.78rem', fontWeight: 600, color: '#0a0a0a', textDecoration: 'underline', cursor: 'pointer' }}>Change</button>
                      </div>

                      <ObligationNote delta={preview.monthlyDelta} next={preview.next.monthly} proration={preview.prorationEstimate} cycle={preview.cycle} />

                      {error && <ErrorBox>{error}</ErrorBox>}

                      <button onClick={handleConfirm} disabled={!canConfirm} style={{ ...primaryBtn(!canConfirm), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                        <LockIcon />
                        {loading ? 'Adding…' : (preview.prorationEstimate > 0 ? `Confirm & add · pay $${Math.round(preview.prorationEstimate)} today` : `Confirm & add · $${Math.round(preview.monthlyDelta)}/mo`)}
                      </button>
                      <p style={{ fontSize: '.7rem', color: '#a39e95', textAlign: 'center', margin: '9px 0 0' }}>Secured by Stripe · cancel anytime</p>
                    </>
                  ) : (
                    <div style={{ background: '#fff', border: '1.5px solid #e4e0d8', borderRadius: 9, padding: '13px', marginBottom: 7 }}>
                      <div style={{ fontSize: '.84rem', color: '#3a3a38', marginBottom: 10, lineHeight: 1.5 }}>
                        Add a card to continue — adding a location adjusts your subscription.
                      </div>
                      {error && <ErrorBox>{error}</ErrorBox>}
                      <button onClick={handleOpenPortal} style={{ ...primaryBtn(false), padding: 12 }}>Add a card →</button>
                    </div>
                  )}
                </>
              )}

              {!previewLoading && error && (atMax || noSub || !preview) && <ErrorBox>{error}</ErrorBox>}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
