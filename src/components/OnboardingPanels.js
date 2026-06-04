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
const suggestBtn = {
  background: '#fdf6e3', color: '#92690a', border: '1px solid #f5e4b8', borderRadius: 50,
  padding: '4px 11px', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', fontSize: '.74rem',
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

// ── STEP: Keywords (rank tracking) ───────────────────────────────────────────
const MAX_KEYWORDS = 15;
function KeywordsPanel({ onDone }) {
  const [list, setList] = useState([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [err, setErr] = useState(null);

  async function suggest() {
    setSuggesting(true);
    try {
      const res = await axios.get(`${API}/onboarding/suggestions`, { headers: authHeaders() });
      const have = new Set(list.map(k => (k.keyword || k.term || '').toLowerCase()));
      const fresh = (res.data.keywords || []).filter(k => !have.has(k.toLowerCase()));
      setDraft(prev => [prev.trim(), ...fresh].filter(Boolean).join('\n'));
    } catch (e) { /* leave draft as-is */ } finally { setSuggesting(false); }
  }

  async function refresh() {
    try {
      const res = await axios.get(`${API}/rank`, { headers: authHeaders() });
      setList(res.data.keywords || res.data || []);
    } catch (e) { /* none yet */ }
  }
  useEffect(() => { refresh(); }, []);

  async function add() {
    const items = draft.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
    if (!items.length) return;
    setBusy(true); setErr(null);
    try {
      for (const kw of items) {
        if (list.length >= MAX_KEYWORDS) break;
        await axios.post(`${API}/rank/keywords`, { keyword: kw }, { headers: authHeaders() });
      }
      setDraft('');
      await refresh();
      onDone();
    } catch (e) {
      setErr(e.response?.data?.error || 'Could not add. Please try again.');
    } finally { setBusy(false); }
  }

  async function remove(id) {
    try { await axios.delete(`${API}/rank/keywords/${id}`, { headers: authHeaders() }); await refresh(); onDone(); }
    catch (e) { /* ignore */ }
  }

  return (
    <div>
      <p style={{ fontSize: '.84rem', color: '#7a7670', margin: '0 0 12px', lineHeight: 1.5 }}>
        Track where you rank on Google for the searches your customers actually use. Add up to {MAX_KEYWORDS}.
      </p>
      {list.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 12 }}>
          {list.map(k => (
            <span key={k.id} style={{ background: '#f0eeea', borderRadius: 50, padding: '4px 10px', fontSize: '.78rem', color: '#0a0a0a', display: 'flex', alignItems: 'center', gap: 6 }}>
              {k.keyword || k.term}
              <button onClick={() => remove(k.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7a7670', fontSize: '.9rem', lineHeight: 1, padding: 0 }}>×</button>
            </span>
          ))}
        </div>
      )}
      {list.length < MAX_KEYWORDS && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <label style={{ ...labelStyle, margin: 0 }}>Add keywords (one per line, or comma-separated)</label>
            <button onClick={suggest} disabled={suggesting} style={suggestBtn}>✨ {suggesting ? 'Thinking…' : 'Suggest for me'}</button>
          </div>
          <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={3} style={{ ...fieldStyle, resize: 'vertical' }}
            placeholder={'emergency plumber Austin\nwater heater repair Austin'} />
          {err && <Note tone="error">{err}</Note>}
          <div style={{ marginTop: 12 }}>
            <button onClick={add} disabled={busy} style={{ ...primaryBtn, opacity: busy ? .6 : 1 }}>
              {busy ? 'Adding…' : 'Add keywords'}
            </button>
          </div>
        </>
      )}
      <HelpBox title="What makes a good keyword?">
        Use the exact phrases customers type into Google, and include your city. Examples:
        <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
          <li><strong>Plumber:</strong> “emergency plumber [city]”, “water heater repair [city]”</li>
          <li><strong>Dentist:</strong> “teeth whitening [city]”, “emergency dentist [city]”</li>
          <li><strong>Restaurant:</strong> “best brunch [city]”, “patio dining [city]”</li>
        </ul>
      </HelpBox>
    </div>
  );
}

// ── STEP: AI search criteria (AI Visibility queries) ─────────────────────────
function AiCriteriaPanel({ onDone }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [err, setErr] = useState(null);

  async function suggest() {
    setSuggesting(true);
    try {
      const res = await axios.get(`${API}/onboarding/suggestions`, { headers: authHeaders() });
      const existing = text.split('\n').map(s => s.trim()).filter(Boolean);
      const have = new Set(existing.map(s => s.toLowerCase()));
      const fresh = (res.data.aiQueries || []).filter(q => !have.has(q.toLowerCase()));
      setText([...existing, ...fresh].join('\n'));
    } catch (e) { /* leave as-is */ } finally { setSuggesting(false); }
  }

  useEffect(() => { (async () => {
    try {
      const res = await axios.get(`${API}/llm/queries`, { headers: authHeaders() });
      setText((res.data.customQueries || []).join('\n'));
    } catch (e) { /* blank */ }
  })(); }, []);

  async function save() {
    const queries = text.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 15);
    if (!queries.length) { setErr('Add at least one question.'); return; }
    setSaving(true); setErr(null);
    try {
      await axios.put(`${API}/llm/queries`, { customQueries: queries }, { headers: authHeaders() });
      onDone();
    } catch (e) {
      setErr(e.response?.data?.error || 'Could not save. Please try again.');
    } finally { setSaving(false); }
  }

  return (
    <div>
      <p style={{ fontSize: '.84rem', color: '#7a7670', margin: '0 0 12px', lineHeight: 1.5 }}>
        These are the <strong>questions</strong> customers ask AI assistants like ChatGPT. We check whether
        your business gets recommended. Up to 15, one per line.
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <label style={{ ...labelStyle, margin: 0 }}>Your AI search questions</label>
        <button onClick={suggest} disabled={suggesting} style={suggestBtn}>✨ {suggesting ? 'Thinking…' : 'Suggest for me'}</button>
      </div>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={5} style={{ ...fieldStyle, resize: 'vertical' }}
        placeholder={'best plumber near me\nwho fixes water heaters in Austin\nmost reliable emergency plumber Austin'} />
      {err && <Note tone="error">{err}</Note>}
      <div style={{ marginTop: 12 }}>
        <button onClick={save} disabled={saving} style={{ ...primaryBtn, opacity: saving ? .6 : 1 }}>
          {saving ? 'Saving…' : 'Save AI criteria'}
        </button>
      </div>
      <HelpBox title="How is this different from keywords?">
        Keywords are short search terms (“plumber Austin”). AI criteria are full <strong>questions</strong> a
        person would ask an assistant (“who's the best emergency plumber in Austin?”). AI tools answer in
        sentences, so we phrase these as natural questions.
      </HelpBox>
    </div>
  );
}

// ── STEP: Review platforms (Yelp + Facebook) ─────────────────────────────────
function ReviewPlatformsPanel({ onDone }) {
  const [loc, setLoc] = useState(null);
  const [yelp, setYelp] = useState('');
  const [fb, setFb] = useState('');
  const [google, setGoogle] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => { (async () => {
    try {
      const res = await axios.get(`${API}/locations/review-urls`, { headers: authHeaders() });
      const rows = res.data.locations || res.data || [];
      const first = Array.isArray(rows) ? rows[0] : null;
      if (first) { setLoc(first); setYelp(first.yelp_review_url || ''); setFb(first.facebook_review_url || ''); setGoogle(first.google_review_url || null); }
    } catch (e) { /* blank */ }
  })(); }, []);

  async function save() {
    if (!yelp.trim() && !fb.trim()) { setErr('Add at least one platform link.'); return; }
    if (!loc?.id) { setErr('Add your business details first.'); return; }
    setSaving(true); setErr(null);
    try {
      await axios.put(`${API}/locations/${loc.id}/review-urls`, {
        googleReviewUrl: google, facebookReviewUrl: fb.trim() || null, yelpReviewUrl: yelp.trim() || null,
      }, { headers: authHeaders() });
      onDone();
    } catch (e) {
      setErr(e.response?.data?.error || 'Could not save. Please try again.');
    } finally { setSaving(false); }
  }

  return (
    <div>
      <p style={{ fontSize: '.84rem', color: '#7a7670', margin: '0 0 12px', lineHeight: 1.5 }}>
        Add the other places customers review you, so detractor feedback can be routed and your presence tracked.
      </p>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Yelp page URL</label>
        <input value={yelp} onChange={e => setYelp(e.target.value)} style={fieldStyle} placeholder="https://www.yelp.com/biz/your-business" />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Facebook page URL</label>
        <input value={fb} onChange={e => setFb(e.target.value)} style={fieldStyle} placeholder="https://www.facebook.com/yourbusiness" />
      </div>
      {err && <Note tone="error">{err}</Note>}
      <div style={{ marginTop: 12 }}>
        <button onClick={save} disabled={saving} style={{ ...primaryBtn, opacity: saving ? .6 : 1 }}>
          {saving ? 'Saving…' : 'Save platforms'}
        </button>
      </div>
      <HelpBox>
        <strong>Yelp:</strong> open your business page on <a href="https://www.yelp.com" target="_blank" rel="noopener noreferrer" style={{ color: '#1a4baa' }}>yelp.com</a> and
        copy the URL from the address bar — it looks like <code>yelp.com/biz/your-business</code>.<br /><br />
        <strong>Facebook:</strong> go to your Facebook Page and copy its URL — the part after <code>facebook.com/</code> is your page.
      </HelpBox>
    </div>
  );
}

// ── STEP: Auto-reply tone (manual) ───────────────────────────────────────────
const TONES = [
  { id: 'warm', label: 'Warm & friendly' },
  { id: 'professional', label: 'Professional' },
  { id: 'casual', label: 'Casual' },
  { id: 'grateful', label: 'Grateful & humble' },
];
function AutoReplyTonePanel({ onDone }) {
  const [loc, setLoc] = useState(null);
  const [tone, setTone] = useState('warm');
  const [always, setAlways] = useState('');
  const [never, setNever] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => { (async () => {
    try {
      const res = await axios.get(`${API}/locations`, { headers: authHeaders() });
      const first = (res.data.locations || [])[0];
      if (first) { setLoc(first); setTone(first.tone || 'warm'); setAlways(first.always_include || ''); setNever(first.never_include || ''); }
    } catch (e) { /* blank */ }
  })(); }, []);

  async function save() {
    if (!loc?.id) { setErr('Add your business details first.'); return; }
    setSaving(true); setErr(null);
    try {
      await axios.put(`${API}/locations/${loc.id}/settings`, {
        tone, alwaysInclude: always, neverInclude: never,
      }, { headers: authHeaders() });
      // Manual step — record completion so the wizard reflects it.
      await axios.post(`${API}/onboarding/step/auto_reply_config/complete`, {}, { headers: authHeaders() }).catch(() => {});
      onDone();
    } catch (e) {
      setErr(e.response?.data?.error || 'Could not save. Please try again.');
    } finally { setSaving(false); }
  }

  return (
    <div>
      <p style={{ fontSize: '.84rem', color: '#7a7670', margin: '0 0 12px', lineHeight: 1.5 }}>
        Set how your automatic review replies should sound. You can fine-tune this anytime in Settings.
      </p>
      <label style={labelStyle}>Reply tone</label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {TONES.map(t => (
          <button key={t.id} onClick={() => setTone(t.id)} style={{
            border: `1px solid ${tone === t.id ? '#0a0a0a' : '#e4e0d8'}`,
            background: tone === t.id ? '#0a0a0a' : 'white', color: tone === t.id ? 'white' : '#0a0a0a',
            borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: '.82rem', fontWeight: 600, fontFamily: 'inherit',
          }}>{t.label}</button>
        ))}
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Always mention (optional)</label>
        <input value={always} onChange={e => setAlways(e.target.value)} style={fieldStyle} placeholder="e.g. invite them back, mention our warranty" />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Never mention (optional)</label>
        <input value={never} onChange={e => setNever(e.target.value)} style={fieldStyle} placeholder="e.g. discounts, competitor names" />
      </div>
      {err && <Note tone="error">{err}</Note>}
      <div style={{ marginTop: 12 }}>
        <button onClick={save} disabled={saving} style={{ ...primaryBtn, opacity: saving ? .6 : 1 }}>
          {saving ? 'Saving…' : 'Save tone'}
        </button>
      </div>
      <HelpBox title="How does tone work?">
        Tone shapes how the AI writes replies to your reviews — same facts, different voice. “Warm” sounds
        personal and appreciative; “Professional” is more formal. The mention rules are applied to every reply.
      </HelpBox>
    </div>
  );
}

// ── STEP: Connect a CRM / scheduling tool (OAuth — deep-link) ────────────────
function ConnectIntegrationPanel() {
  const router = useRouter();
  return (
    <div>
      <p style={{ fontSize: '.84rem', color: '#7a7670', margin: '0 0 8px', lineHeight: 1.55 }}>
        Connect the tool you already use to run jobs or appointments, and SwarmReply will automatically ask
        for a review after each completed job — no manual sending.
      </p>
      <div style={{ marginTop: 12 }}>
        <button onClick={() => router.push('/dashboard/integrations')} style={primaryBtn}>
          Browse integrations →
        </button>
      </div>
      <HelpBox title="What can I connect?">
        SwarmReply supports Jobber, Square, HubSpot, Shopify, Calendly, Mindbody, and Acuity. On the
        Integrations page, click your tool and sign in — you'll need admin access to that account.
      </HelpBox>
    </div>
  );
}

export const STEP_PANELS = {
  business_details:    BusinessDetailsPanel,
  connect_google:      ConnectGooglePanel,
  review_link:         ReviewLinkPanel,
  test_request:        TestRequestPanel,
  keywords:            KeywordsPanel,
  ai_criteria:         AiCriteriaPanel,
  review_platforms:    ReviewPlatformsPanel,
  auto_reply_config:   AutoReplyTonePanel,
  connect_integration: ConnectIntegrationPanel,
};
