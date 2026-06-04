// ============================================
// src/components/OnboardingPanels.js
// Inline step UIs + "where do I find this?" help for the Milestone-1 steps.
// Exported as STEP_PANELS, keyed by the engine's step id. The wizard renders a
// panel inline when present; steps without one fall back to a deep-link.
//
// The three data-backed steps (business_details, review_link, test_request) are
// DERIVED in the engine, so each panel just performs the real action and calls
// onDone() — the next status fetch flips the step complete and awards points.
// ============================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;
function authHeaders() {
  const t = typeof window !== 'undefined' ? localStorage.getItem('swarmreply_token') : null;
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// ── Shared bits ───────────────────────────────────────────────────────────────
const fieldStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e4e0d8',
  fontSize: '.88rem', fontFamily: 'inherit', color: '#0a0a0a', background: 'white', boxSizing: 'border-box',
};
const labelStyle = { fontSize: '.78rem', fontWeight: 700, color: '#0a0a0a', display: 'block', marginBottom: 5 };
const primaryBtn = {
  background: '#f5c842', color: '#0a0a0a', border: 'none', borderRadius: 8,
  padding: '10px 18px', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', fontSize: '.85rem',
};

function HelpBox({ title = 'Where do I find this?', children }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 12 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        background: 'transparent', border: 'none', color: '#1a4baa', cursor: 'pointer',
        fontSize: '.8rem', fontWeight: 600, fontFamily: 'inherit', padding: 0,
      }}>
        {open ? '▾' : '▸'} {title}
      </button>
      {open && (
        <div style={{ marginTop: 8, background: '#f8f7f4', border: '1px solid #e4e0d8', borderRadius: 10, padding: '12px 14px', fontSize: '.82rem', color: '#4a4a48', lineHeight: 1.6 }}>
          {children}
        </div>
      )}
    </div>
  );
}

function Note({ children, tone = 'info' }) {
  const palette = {
    info:    { bg: '#e8f0fe', bd: '#c5d8f7', fg: '#1a4baa' },
    warn:    { bg: '#fff8e6', bd: '#f5e4b8', fg: '#92690a' },
    success: { bg: '#e8f5ef', bd: '#cfe8da', fg: '#1a6b45' },
    error:   { bg: '#fdecea', bd: '#f3c9c3', fg: '#c0392b' },
  }[tone];
  return (
    <div style={{ background: palette.bg, border: `1px solid ${palette.bd}`, color: palette.fg, borderRadius: 8, padding: '9px 12px', fontSize: '.8rem', lineHeight: 1.5, marginTop: 10 }}>
      {children}
    </div>
  );
}

// ── STEP 1: Confirm business details ────────────────────────────────────────
const BUSINESS_TYPES = [
  'Restaurant / Food', 'Home Services', 'Retail / Shop', 'Healthcare / Medical',
  'Professional Services', 'Beauty / Salon / Spa', 'Automotive', 'Fitness / Wellness', 'Other',
];

function BusinessDetailsPanel({ customer, onDone }) {
  const [name, setName] = useState(customer?.name || '');
  const [type, setType] = useState('Restaurant / Food');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  async function save() {
    if (!name.trim()) { setErr('Please enter your business name.'); return; }
    setSaving(true); setErr(null);
    try {
      await axios.post(`${API}/locations`, {
        customerId: customer.id,
        businessName: name.trim(),
        businessType: type,
        platform: 'google',
        contactEmail: customer.email,
        tone: 'warm',
      }, { headers: authHeaders() });
      onDone();
    } catch (e) {
      setErr(e.response?.data?.error || 'Could not save. Please try again.');
    } finally { setSaving(false); }
  }

  return (
    <div>
      <p style={{ fontSize: '.84rem', color: '#7a7670', margin: '0 0 14px', lineHeight: 1.5 }}>
        We pre-filled what we know from your signup — just confirm it's right.
      </p>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Business name</label>
        <input value={name} onChange={e => setName(e.target.value)} style={fieldStyle} placeholder="e.g. Bella's Kitchen" />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Business type</label>
        <select value={type} onChange={e => setType(e.target.value)} style={fieldStyle}>
          {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      {err && <Note tone="error">{err}</Note>}
      <div style={{ marginTop: 14 }}>
        <button onClick={save} disabled={saving} style={{ ...primaryBtn, opacity: saving ? .6 : 1 }}>
          {saving ? 'Saving…' : 'Save & continue'}
        </button>
      </div>
      <HelpBox title="Why do we need this?">
        Your business name and type let us personalize review replies and generate the right
        local keywords and AI search queries for you later in setup.
      </HelpBox>
    </div>
  );
}

// ── STEP 2: Connect Google Business Profile (OAuth — deep-link) ──────────────
function ConnectGooglePanel() {
  const router = useRouter();
  return (
    <div>
      <p style={{ fontSize: '.84rem', color: '#7a7670', margin: '0 0 6px', lineHeight: 1.55 }}>
        Connecting your Google Business Profile lets SwarmReply read your reviews and post
        replies automatically — the core of how it works.
      </p>
      <Note tone="warn">
        Google requires app approval for review access, which can take a few weeks. You can start
        the connection now; it activates automatically once approved.
      </Note>
      <div style={{ marginTop: 14 }}>
        <button onClick={() => router.push('/dashboard/integrations')} style={primaryBtn}>
          Go to connect Google →
        </button>
      </div>
      <HelpBox>
        You'll need to be an <strong>owner or manager</strong> of the listing. Manage access at{' '}
        <a href="https://business.google.com" target="_blank" rel="noopener noreferrer" style={{ color: '#1a4baa' }}>business.google.com</a>.
        If someone else manages your Google listing, ask them to add you, or have them complete this step.
      </HelpBox>
    </div>
  );
}

// ── STEP 3: Set your review link ─────────────────────────────────────────────
function ReviewLinkPanel({ onDone }) {
  const [loc, setLoc] = useState(null);
  const [url, setUrl] = useState('');
  const [existing, setExisting] = useState({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => { (async () => {
    try {
      const res = await axios.get(`${API}/locations/review-urls`, { headers: authHeaders() });
      const rows = res.data.locations || res.data || [];
      const first = Array.isArray(rows) ? rows[0] : null;
      if (first) {
        setLoc(first);
        setUrl(first.google_review_url || '');
        setExisting({ facebookReviewUrl: first.facebook_review_url || null, yelpReviewUrl: first.yelp_review_url || null });
      }
    } catch (e) { /* leave blank */ }
  })(); }, []);

  async function save() {
    if (!url.trim()) { setErr('Please paste your Google review link.'); return; }
    if (!loc?.id) { setErr('Add your business details first.'); return; }
    setSaving(true); setErr(null);
    try {
      await axios.put(`${API}/locations/${loc.id}/review-urls`, {
        googleReviewUrl: url.trim(),
        facebookReviewUrl: existing.facebookReviewUrl,
        yelpReviewUrl: existing.yelpReviewUrl,
      }, { headers: authHeaders() });
      onDone();
    } catch (e) {
      setErr(e.response?.data?.error || 'Could not save. Please try again.');
    } finally { setSaving(false); }
  }

  return (
    <div>
      <p style={{ fontSize: '.84rem', color: '#7a7670', margin: '0 0 14px', lineHeight: 1.5 }}>
        This is where happy customers go to leave you a 5-star Google review.
      </p>
      <label style={labelStyle}>Google review link</label>
      <input value={url} onChange={e => setUrl(e.target.value)} style={fieldStyle} placeholder="https://g.page/r/..." />
      {err && <Note tone="error">{err}</Note>}
      <div style={{ marginTop: 14 }}>
        <button onClick={save} disabled={saving} style={{ ...primaryBtn, opacity: saving ? .6 : 1 }}>
          {saving ? 'Saving…' : 'Save review link'}
        </button>
      </div>
      <HelpBox>
        <strong>To find your Google review link:</strong>
        <ol style={{ margin: '8px 0 0', paddingLeft: 18 }}>
          <li>Sign in at <a href="https://business.google.com" target="_blank" rel="noopener noreferrer" style={{ color: '#1a4baa' }}>business.google.com</a>.</li>
          <li>Open your business, then click <strong>“Ask for reviews”</strong> (or “Get more reviews”).</li>
          <li>Copy the short link Google shows — it looks like <code>https://g.page/r/…</code>.</li>
          <li>Paste it above.</li>
        </ol>
      </HelpBox>
    </div>
  );
}

// ── STEP 4: Send yourself a test review request ──────────────────────────────
function TestRequestPanel({ customer, onDone }) {
  const [name, setName] = useState(customer?.name || '');
  const [email, setEmail] = useState(customer?.email || '');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState(null);

  async function send() {
    if (!email.trim()) { setErr('Please enter an email.'); return; }
    setSending(true); setErr(null);
    try {
      await axios.post(`${API}/review-requests/send`, { name: name.trim(), email: email.trim() }, { headers: authHeaders() });
      setSent(true);
      onDone();
    } catch (e) {
      setErr(e.response?.data?.error || 'Could not send. Please try again.');
    } finally { setSending(false); }
  }

  if (sent) return <Note tone="success">Sent! Check <strong>{email}</strong> to see exactly what your customers receive.</Note>;

  return (
    <div>
      <p style={{ fontSize: '.84rem', color: '#7a7670', margin: '0 0 14px', lineHeight: 1.5 }}>
        Send a real request to <strong>yourself</strong> first, so you can see what customers get.
      </p>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Your name</label>
        <input value={name} onChange={e => setName(e.target.value)} style={fieldStyle} placeholder="Your name" />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Your email</label>
        <input value={email} onChange={e => setEmail(e.target.value)} style={fieldStyle} placeholder="you@business.com" />
      </div>
      {err && <Note tone="error">{err}</Note>}
      <div style={{ marginTop: 14 }}>
        <button onClick={send} disabled={sending} style={{ ...primaryBtn, opacity: sending ? .6 : 1 }}>
          {sending ? 'Sending…' : 'Send test request'}
        </button>
      </div>
      <HelpBox title="What happens when I click this?">
        We email a real review request to the address above — the same message your customers
        would get. Using your own email lets you preview the full experience before going live.
      </HelpBox>
    </div>
  );
}

export const STEP_PANELS = {
  business_details: BusinessDetailsPanel,
  connect_google:   ConnectGooglePanel,
  review_link:      ReviewLinkPanel,
  test_request:     TestRequestPanel,
};
