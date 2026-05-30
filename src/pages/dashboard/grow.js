// ============================================
// pages/dashboard/grow.js
// Grow — Review Requests / Surveys & NPS / Import tabs
// ============================================

import { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;

function authHeaders() {
  const t = typeof window !== 'undefined' ? localStorage.getItem('swarmreply_token') : '';
  return t ? { Authorization: `Bearer ${t}` } : {};
}
import DashboardLayout from '../../components/DashboardLayout';
import { useRouter } from 'next/router';

const TABS = [
  { id: 'requests',  label: 'Review Requests'   },
  { id: 'templates', label: 'Request Templates' },
  { id: 'surveys',   label: 'Surveys & NPS'     },
  { id: 'import',    label: 'Import Contacts'   },
];

function Card({ children, style = {} }) {
  return <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, ...style }}>{children}</div>;
}

function StatCard({ label, value, sub }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.8rem', fontWeight: 900 }}>{value}</div>
      {sub && <div style={{ fontSize: '.75rem', color: '#7a7670', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function RequestsTab() {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [phone, setPhone]       = useState('');
  const [sent, setSent]         = useState(false);
  const [sending, setSending]   = useState(false);

  // Survey results state
  const [surveys, setSurveys]       = useState([]);
  const [loadingSurveys, setLoadingSurveys] = useState(true);
  const [search, setSearch]         = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [selected, setSelected]     = useState(null);

  const API = process.env.NEXT_PUBLIC_API_URL;
  function authH() {
    const t = typeof window !== 'undefined' ? localStorage.getItem('swarmreply_token') : '';
    return t ? { Authorization: `Bearer ${t}` } : {};
  }

  useEffect(() => { loadSurveys(); }, []);

  async function loadSurveys() {
    setLoadingSurveys(true);
    try {
      const res = await axios.get(`${API}/surveys`, { headers: authH() });
      setSurveys(res.data.surveys || []);
    } catch (e) {
      // demo data while API is being built
      setSurveys([
        { id: '1', customer_name: 'Sarah Mitchell', customer_email: 'sarah@example.com', nps_score: 9, path: 'promoter', completed_at: new Date(Date.now()-2*60*60*1000).toISOString(), left_review: true },
        { id: '2', customer_name: 'James Torres',   customer_email: 'james@example.com', nps_score: 4, path: 'detractor', completed_at: new Date(Date.now()-24*60*60*1000).toISOString(), left_review: false, detractor_q1: 'The technician arrived 2 hours late with no communication.', detractor_q2: 'Better scheduling and communication when running behind.' },
        { id: '3', customer_name: 'Rachel Kim',     customer_email: 'rachel@example.com', nps_score: 7, path: 'neutral', completed_at: new Date(Date.now()-2*24*60*60*1000).toISOString(), left_review: false, would_return: true },
        { id: '4', customer_name: 'David Chen',     customer_email: 'david@example.com', nps_score: 2, path: 'detractor', completed_at: new Date(Date.now()-3*24*60*60*1000).toISOString(), left_review: false, detractor_q1: 'The work was not completed to the standard I expected.', detractor_q2: 'More attention to detail and a follow-up inspection.' },
        { id: '5', customer_name: 'Maria Garcia',   customer_email: 'maria@example.com', nps_score: 10, path: 'promoter', completed_at: new Date(Date.now()-5*24*60*60*1000).toISOString(), left_review: true },
        { id: '6', customer_name: 'Tom Wallace',    customer_email: 'tom@example.com', nps_score: 6, path: 'detractor', completed_at: new Date(Date.now()-7*24*60*60*1000).toISOString(), left_review: false, detractor_q1: 'Pricing was higher than quoted.', detractor_q2: 'Provide accurate upfront pricing with no surprises.' },
      ]);
    } finally {
      setLoadingSurveys(false);
    }
  }

  async function send() {
    if (!name.trim() || (!email.trim() && !phone.trim())) return;
    setSending(true);
    try {
      await axios.post(`${API}/review-requests/send`, { name, email, phone }, { headers: authH() });
    } catch (e) { console.error(e); }
    setSent(true);
    setSending(false);
    setTimeout(() => setSent(false), 3000);
    setName(''); setEmail(''); setPhone('');
  }

  // Filter logic
  const now = new Date();
  const filtered = surveys.filter(s => {
    const matchSearch = !search.trim() ||
      s.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.customer_email?.toLowerCase().includes(search.toLowerCase());
    const d = new Date(s.completed_at);
    const matchDate =
      dateFilter === 'all'   ? true :
      dateFilter === 'today' ? d.toDateString() === now.toDateString() :
      dateFilter === 'week'  ? (now - d) < 7*24*60*60*1000 :
      dateFilter === 'month' ? (now - d) < 30*24*60*60*1000 : true;
    return matchSearch && matchDate;
  });

  function pathBadge(path, score) {
    const cfg = {
      promoter:  { bg: '#dcfce7', color: '#1a6b45', label: `Promoter · ${score}` },
      neutral:   { bg: '#fef9c3', color: '#92690a', label: `Neutral · ${score}` },
      detractor: { bg: '#fee2e2', color: '#c0392b', label: `Detractor · ${score}` },
    }[path] || { bg: '#f0eeea', color: '#7a7670', label: score };
    return (
      <span style={{ background: cfg.bg, color: cfg.color, fontSize: '.67rem', fontWeight: 700,
        padding: '3px 9px', borderRadius: 50, whiteSpace: 'nowrap' }}>
        {cfg.label}
      </span>
    );
  }

  function fmtDate(iso) {
    const d = new Date(iso);
    const diff = (now - d) / 1000;
    if (diff < 3600) return Math.floor(diff/60) + 'm ago';
    if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff/86400) + 'd ago';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label="Sent this month" value="47" sub="↑ +12 vs last month" />
        <StatCard label="Open rate"        value="68%" sub="↑ +4% vs last month" />
        <StatCard label="Reviews generated" value="11" sub="↑ +3 vs last month" />
        <StatCard label="Conversion rate"   value="23%" sub="Industry avg 12%" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>

        {/* Survey results table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card>
            {/* Header + search + filter */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e4e0d8' }}>
              <div style={{ fontWeight: 700, fontSize: '.9rem', marginBottom: 12 }}>Completed surveys</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {/* Search */}
                <div style={{ flex: 1, position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#7a7670', fontSize: '.85rem' }}>🔍</span>
                  <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name or email…"
                    style={{ width: '100%', padding: '8px 12px 8px 30px', border: '1.5px solid #e4e0d8', borderRadius: 9,
                      fontSize: '.84rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                {/* Date filter */}
                <select value={dateFilter} onChange={e => setDateFilter(e.target.value)}
                  style={{ padding: '8px 12px', border: '1.5px solid #e4e0d8', borderRadius: 9,
                    fontSize: '.84rem', fontFamily: 'inherit', outline: 'none', background: 'white', cursor: 'pointer' }}>
                  <option value="all">All time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 days</option>
                  <option value="month">Last 30 days</option>
                </select>
                <button onClick={loadSurveys} style={{ padding: '8px 14px', borderRadius: 9, background: '#f0eeea',
                  border: 'none', cursor: 'pointer', fontSize: '.8rem', color: '#4a4a48', fontFamily: 'inherit' }}>
                  ↻
                </button>
              </div>
            </div>

            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 90px 80px 70px',
              padding: '8px 20px', background: '#f8f7f4',
              fontSize: '.67rem', fontWeight: 700, color: '#7a7670', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              <span>Customer</span>
              <span>Email</span>
              <span>Result</span>
              <span>Review</span>
              <span>Date</span>
            </div>

            {/* Rows */}
            {loadingSurveys ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#7a7670', fontSize: '.84rem' }}>Loading surveys…</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#7a7670', fontSize: '.84rem' }}>
                {search ? 'No surveys match your search.' : 'No completed surveys yet.'}
              </div>
            ) : filtered.map(s => (
              <div key={s.id}
                onClick={() => setSelected(s)}
                style={{ display: 'grid', gridTemplateColumns: '1fr 180px 90px 80px 70px',
                  padding: '12px 20px', borderBottom: '1px solid #f8f7f4', cursor: 'pointer',
                  transition: 'background .1s', alignItems: 'center' }}
                onMouseEnter={e => e.currentTarget.style.background='#fafaf9'}
                onMouseLeave={e => e.currentTarget.style.background='white'}>
                {/* Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#f0eeea',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '.78rem', flexShrink: 0, color: '#4a4a48' }}>
                    {s.customer_name?.[0] || '?'}
                  </div>
                  <span style={{ fontWeight: 600, fontSize: '.84rem', color: '#0a0a0a',
                    textDecoration: 'underline', textDecorationColor: '#c8c4bc' }}>
                    {s.customer_name}
                  </span>
                </div>
                {/* Email */}
                <span style={{ fontSize: '.78rem', color: '#7a7670', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.customer_email}
                </span>
                {/* Path badge */}
                <span>{pathBadge(s.path, s.nps_score)}</span>
                {/* Left review */}
                <span style={{ fontSize: '.78rem', color: s.left_review ? '#1a6b45' : '#c8c4bc', fontWeight: 600 }}>
                  {s.left_review ? '✓ Yes' : '— No'}
                </span>
                {/* Date */}
                <span style={{ fontSize: '.75rem', color: '#7a7670' }}>{fmtDate(s.completed_at)}</span>
              </div>
            ))}

            {/* Footer count */}
            <div style={{ padding: '10px 20px', borderTop: '1px solid #e4e0d8', fontSize: '.73rem', color: '#7a7670' }}>
              {filtered.length} of {surveys.length} surveys
            </div>
          </Card>
        </div>

        {/* Send request panel */}
        <Card style={{ padding: 20, height: 'fit-content' }}>
          <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 14 }}>Send a review request</div>
          {sent && <div style={{ background: '#e8f5ef', border: '1px solid #bbf7d0', borderRadius: 9, padding: '9px 12px', fontSize: '.82rem', color: '#1a6b45', marginBottom: 12 }}>✓ Sent successfully!</div>}
          {[['Customer name *','text','Enter name…',name,setName],['Email','email','customer@example.com',email,setEmail],['Phone (SMS)','tel','+1 555 000 0000',phone,setPhone]].map(([l,t,p,v,s]) => (
            <div key={l} style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: '.67rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 4 }}>{l}</label>
              <input type={t} value={v} onChange={e => s(e.target.value)} placeholder={p}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e4e0d8', borderRadius: 9, fontSize: '.875rem', fontFamily: 'inherit', outline: 'none' }} />
            </div>
          ))}
          <button onClick={send} disabled={sending}
            style={{ width: '100%', padding: 11, borderRadius: 50, background: '#0a0a0a', color: 'white', border: 'none', cursor: 'pointer', fontSize: '.875rem', fontWeight: 700, fontFamily: 'inherit', marginTop: 4, opacity: sending ? .6 : 1 }}>
            {sending ? 'Sending…' : 'Send request →'}
          </button>
        </Card>
      </div>

      {/* Survey detail slide-over */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex' }}>
          {/* Backdrop */}
          <div style={{ flex: 1, background: 'rgba(0,0,0,.35)' }} onClick={() => setSelected(null)} />
          {/* Panel */}
          <div style={{ width: 480, background: 'white', height: '100%', overflowY: 'auto',
            boxShadow: '-4px 0 32px rgba(0,0,0,.12)', display: 'flex', flexDirection: 'column' }}>
            {/* Panel header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e4e0d8', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#f0eeea',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '1rem', flexShrink: 0 }}>
                {selected.customer_name?.[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '.95rem' }}>{selected.customer_name}</div>
                <div style={{ fontSize: '.78rem', color: '#7a7670', marginTop: 2 }}>{selected.customer_email}</div>
              </div>
              <button onClick={() => setSelected(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#7a7670', padding: '4px 8px' }}>✕</button>
            </div>

            <div style={{ padding: 24, flex: 1 }}>
              {/* Score + path */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20 }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.5rem', fontWeight: 800,
                  background: selected.path === 'promoter' ? '#dcfce7' : selected.path === 'detractor' ? '#fee2e2' : '#fef9c3',
                  color: selected.path === 'promoter' ? '#1a6b45' : selected.path === 'detractor' ? '#c0392b' : '#92690a' }}>
                  {selected.nps_score}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '.9rem', textTransform: 'capitalize' }}>{selected.path}</div>
                  <div style={{ fontSize: '.75rem', color: '#7a7670', marginTop: 2 }}>{fmtDate(selected.completed_at)}</div>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: '.78rem', fontWeight: 600,
                  color: selected.left_review ? '#1a6b45' : '#7a7670' }}>
                  {selected.left_review ? '✓ Left a review' : '✗ No review left'}
                </div>
              </div>

              {/* Detractor answers */}
              {selected.path === 'detractor' && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: '.84rem', marginBottom: 14, color: '#c0392b' }}>Detractor feedback</div>
                  {selected.detractor_q1 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#7a7670', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>What fell short</div>
                      <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 14px', fontSize: '.875rem', color: '#3a3a38', lineHeight: 1.65 }}>
                        "{selected.detractor_q1}"
                      </div>
                    </div>
                  )}
                  {selected.detractor_q2 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#7a7670', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>How to improve</div>
                      <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 14px', fontSize: '.875rem', color: '#3a3a38', lineHeight: 1.65 }}>
                        "{selected.detractor_q2}"
                      </div>
                    </div>
                  )}
                  {!selected.detractor_q1 && !selected.detractor_q2 && (
                    <div style={{ color: '#7a7670', fontSize: '.84rem' }}>No written feedback provided.</div>
                  )}
                </div>
              )}

              {/* Neutral path result */}
              {selected.path === 'neutral' && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: '.84rem', marginBottom: 14, color: '#92690a' }}>Neutral response</div>
                  <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 14px', fontSize: '.875rem', color: '#3a3a38' }}>
                    Would return: <strong>{selected.would_return ? 'Yes' : 'No'}</strong>
                    {selected.would_return
                      ? ' — Customer was directed to leave a review.'
                      : ' — Customer was directed to the feedback form.'}
                  </div>
                </div>
              )}

              {/* Promoter path result */}
              {selected.path === 'promoter' && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: '.84rem', marginBottom: 14, color: '#1a6b45' }}>Promoter response</div>
                  <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 14px', fontSize: '.875rem', color: '#3a3a38' }}>
                    {selected.left_review
                      ? '✓ Customer clicked through to leave a review.'
                      : 'Customer was shown the review prompt but did not click through.'}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { window.location.href = 'mailto:' + selected.customer_email; }}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 50, background: '#0a0a0a', color: 'white',
                    border: 'none', cursor: 'pointer', fontSize: '.82rem', fontWeight: 700, fontFamily: 'inherit' }}>
                  ✉ Email customer
                </button>
                <button onClick={() => setSelected(null)}
                  style={{ padding: '10px 18px', borderRadius: 50, background: 'white', color: '#4a4a48',
                    border: '1.5px solid #e4e0d8', cursor: 'pointer', fontSize: '.82rem', fontFamily: 'inherit' }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


const PLATFORMS = [
  { id: 'google',   label: 'Google',   color: '#4285F4', icon: 'G' },
  { id: 'facebook', label: 'Facebook', color: '#1877F2', icon: 'f' },
  { id: 'yelp',     label: 'Yelp',     color: '#D32323', icon: 'Y' },
];

const SWARMREPLY_LOGO = 'https://app.swarmreply.com/bee-logo.png';
const SWARMREPLY_COLOR = '#f5c842';

const DEFAULT_TMPL = {
  brandColor: SWARMREPLY_COLOR,
  brandLogo: SWARMREPLY_LOGO,
  buttonText: 'Share Your Feedback →',
  smsRequest: "Hi {name}, thanks for choosing {business}! We'd love your feedback — it only takes 30 seconds. {link}",
  emailSubject: 'How did we do, {name}?',
  emailBody: "Hi {name},\n\nThank you for choosing {business}! Your experience matters to us.\n\nWe'd love to hear how we did — it only takes a moment.\n\nTap below to share your feedback:\n{link}\n\nThank you,\n{business} Team",
  npsQuestion: 'How likely are you to recommend {business} to a friend or family member?',
  promoterMessage: "We're so glad you had a great experience! Would you mind sharing it online? Your review helps other customers find us.",
  neutralQuestion: 'Would you consider using {business} again in the future?',
  detractorOpening: "We're sorry your experience didn't meet expectations. Your feedback helps us improve.",
  detractorQ1: 'What aspect of your experience fell short?',
  detractorQ2: 'What could we do better in the future?',
  detractorClosing: 'Thank you for sharing this with us. We take every piece of feedback seriously.',
};

function TemplatesTab() {
  const [section, setSection]         = useState('thresholds');
  const [saved, setSaved]             = useState(false);
  const [testSent, setTestSent]       = useState(false);
  const [testEmail, setTestEmail]     = useState('');
  const [showTest, setShowTest]       = useState(false);
  const [sending, setSending]         = useState(false);
  const [testError, setTestError]     = useState('');
  const [promoterMin, setPromoterMin] = useState(9);
  const [neutralMin, setNeutralMin]   = useState(7);
  const [slots, setSlots]             = useState(['google', '', '']);
  const [tmpl, setTmpl]               = useState(DEFAULT_TMPL);
  const [logoPreview, setLogoPreview]  = useState('');
  const [shareAll, setShareAll]       = useState(false);
  const [suppress, setSuppress]       = useState(false);

  const detractorMax = neutralMin - 1;
  const neutralMax   = promoterMin - 1;

  function updateTmpl(key, val) { setTmpl(prev => ({ ...prev, [key]: val })); }

  function setSlot(idx, val) {
    const next = [...slots];
    if (val && next.includes(val)) return;
    next[idx] = val;
    setSlots(next);
  }
  function removeSlot(idx) { const n=[...slots]; n[idx]=''; setSlots(n); }

  function save() { setSaved(true); setTimeout(() => setSaved(false), 2500); }
  async function sendTest() {
    if (!testEmail.trim()) return;
    setSending(true);
    try {
      await axios.post(`${API}/templates/test-send`, {
        destination: testEmail.trim(),
        template: {
          smsRequest:       tmpl.smsRequest,
          emailSubject:     tmpl.emailSubject,
          emailBody:        tmpl.emailBody,
          npsQuestion:      tmpl.npsQuestion,
          promoterMessage:  tmpl.promoterMessage,
          neutralQuestion:  tmpl.neutralQuestion,
          detractorOpening: tmpl.detractorOpening,
          brandColor:       tmpl.brandColor,
          brandLogo:        tmpl.brandLogo,
          buttonText:       tmpl.buttonText,
        },
        thresholds: { promoterMin, neutralMin },
        platforms:  slots.filter(Boolean),
      }, { headers: authHeaders() });
      setTestSent(true);
      setShowTest(false);
      setTimeout(() => setTestSent(false), 4000);
    } catch (e) {
      const msg = e.response?.data?.error || e.message || 'Send failed';
      setTestError(msg);
      setTimeout(() => setTestError(''), 6000);
    } finally {
      setSending(false);
    }
  }

  const NAV = [
    { id: 'branding',   label: '① Branding'          },
    { id: 'thresholds', label: '② Score thresholds' },
    { id: 'platforms',  label: '③ Review platforms'  },
    { id: 'request',    label: '④ Request message'   },
    { id: 'nps',        label: '⑤ NPS survey'        },
    { id: 'promoter',   label: '⑥ Promoter path'     },
    { id: 'neutral',    label: '⑦ Neutral path'      },
    { id: 'detractor',  label: '⑧ Detractor path'    },
    { id: 'locations',  label: '⑨ Locations'         },
  ];

  const inp = { width: '100%', padding: '10px 13px', border: '1.5px solid #e4e0d8', borderRadius: 9, fontSize: '.84rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', resize: 'vertical' };
  const lbl = { fontWeight: 600, fontSize: '.78rem', color: '#4a4a48', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6, display: 'block' };

  function TField({ label, hint, children }) {
    return (
      <div style={{ marginBottom: 18 }}>
        <span style={lbl}>{label}</span>
        {children}
        {hint && <div style={{ fontSize: '.73rem', color: '#7a7670', marginTop: 5, lineHeight: 1.5 }}>{hint}</div>}
      </div>
    );
  }

  const sections = {
    branding: (
      <div style={{ maxWidth: 560 }}>
        <div style={{ fontSize: '.84rem', color: '#7a7670', marginBottom: 20, lineHeight: 1.7 }}>
          Your brand color and logo appear in the email banner and footer of every review request sent to your customers.
        </div>

        <TField label="Brand color" hint="Used for the email banner, button, and footer background.">
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6 }}>
            <input type="color" value={tmpl.brandColor} onChange={e => updateTmpl('brandColor', e.target.value)}
              style={{ width: 48, height: 40, border: '1.5px solid #e4e0d8', borderRadius: 8, cursor: 'pointer', padding: 2 }} />
            <input value={tmpl.brandColor} onChange={e => updateTmpl('brandColor', e.target.value)}
              style={{ ...inp, width: 120, resize: 'none' }} placeholder="#f5c842" />
            <div style={{ display: 'flex', gap: 6 }}>
              {['#0a0a0a','#f5c842','#1877F2','#4285F4','#D32323','#1a6b45','#7c3aed','#ea580c'].map(c => (
                <button key={c} onClick={() => updateTmpl('brandColor', c)}
                  style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: tmpl.brandColor === c ? '2px solid #0a0a0a' : '2px solid transparent', cursor: 'pointer' }} />
              ))}
            </div>
          </div>
        </TField>

        <TField label="Business logo URL" hint="Paste a URL to your logo image (PNG or JPG). Shown in the email header. Recommended: 200×60px.">
          <input style={{ ...inp, resize: 'none' }} value={tmpl.brandLogo}
            onChange={e => updateTmpl('brandLogo', e.target.value)}
            placeholder="https://yourwebsite.com/logo.png" />
          {tmpl.brandLogo && (
            <div style={{ marginTop: 10, background: '#f8f7f4', borderRadius: 9, padding: 12, textAlign: 'center' }}>
              <img src={tmpl.brandLogo} alt="Logo preview" style={{ maxHeight: 60, maxWidth: 200, objectFit: 'contain' }}
                onError={e => { e.target.style.display='none'; }} />
            </div>
          )}
        </TField>

        <TField label="Button text" hint="The call-to-action button in the email.">
          <input style={{ ...inp, resize: 'none' }} value={tmpl.buttonText}
            onChange={e => updateTmpl('buttonText', e.target.value)} />
        </TField>

        {/* Live email preview */}
        <div style={{ marginTop: 8 }}>
          <span style={lbl}>Email preview</span>
          <div style={{ border: '1px solid #e4e0d8', borderRadius: 12, overflow: 'hidden', fontFamily: 'sans-serif' }}>
            {/* Banner */}
            <div style={{ background: tmpl.brandColor, padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {tmpl.brandLogo
                ? <img src={tmpl.brandLogo} alt="Logo" style={{ maxHeight: 48, maxWidth: 160, objectFit: 'contain' }} onError={e => e.target.style.display='none'} />
                : <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0a0a0a', letterSpacing: '-.01em' }}>Your Business</div>
              }
            </div>
            {/* Body */}
            <div style={{ padding: '28px 32px', background: 'white' }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#0a0a0a', marginBottom: 12 }}>How did we do, {'{name}'}?</div>
              <div style={{ fontSize: '.875rem', color: '#3a3a38', lineHeight: 1.7, marginBottom: 20, whiteSpace: 'pre-wrap' }}>
                {tmpl.emailBody.split('{link}')[0].replace(/{name}/g, 'Test Customer').replace(/{business}/g, 'Your Business')}
              </div>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ display: 'inline-block', background: tmpl.brandColor, color: '#0a0a0a', padding: '14px 28px', borderRadius: 50, fontWeight: 700, fontSize: '.9rem', cursor: 'pointer' }}>
                  {tmpl.buttonText || 'Share Your Feedback →'}
                </div>
              </div>
            </div>
            {/* Footer */}
            <div style={{ background: tmpl.brandColor, padding: '14px 32px', opacity: .85 }}>
              <div style={{ fontSize: '.72rem', color: '#0a0a0a', opacity: .7, textAlign: 'center' }}>Sent by SwarmReply on behalf of Your Business</div>
            </div>
          </div>
        </div>
      </div>
    ),
    thresholds: (
      <div>
        <div style={{ fontSize: '.84rem', color: '#7a7670', marginBottom: 20, lineHeight: 1.7 }}>
          Define what score range qualifies as Promoter, Neutral, or Detractor. This controls which follow-up path a customer is sent down after completing the NPS survey.
        </div>
        <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', height: 40, marginBottom: 12 }}>
          <div style={{ flex: neutralMin, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.72rem', fontWeight: 700, color: '#c0392b' }}>Detractor · 0–{detractorMax}</div>
          <div style={{ flex: Math.max(1, promoterMin - neutralMin), background: '#fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.72rem', fontWeight: 700, color: '#92690a' }}>Neutral · {neutralMin}–{neutralMax}</div>
          <div style={{ flex: 11 - promoterMin, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.72rem', fontWeight: 700, color: '#1a6b45' }}>Promoter · {promoterMin}–10</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.7rem', color: '#7a7670', marginBottom: 20, padding: '0 2px' }}>
          {[0,1,2,3,4,5,6,7,8,9,10].map(n => <span key={n} style={{ fontWeight: 600 }}>{n}</span>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <TField label="Neutral starts at" hint="Scores below this are Detractors (min 1, max 7)">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {[1,2,3,4,5,6,7].map(n => (
                <button key={n} onClick={() => n < promoterMin && setNeutralMin(n)}
                  style={{ width: 36, height: 36, borderRadius: 8, border: '1.5px solid', cursor: 'pointer', fontSize: '.84rem', fontWeight: 700, fontFamily: 'inherit',
                    borderColor: neutralMin === n ? '#f5c842' : '#e4e0d8',
                    background: neutralMin === n ? '#f5c842' : 'white',
                    color: neutralMin === n ? '#0a0a0a' : '#7a7670' }}>{n}</button>
              ))}
            </div>
          </TField>
          <TField label="Promoter starts at" hint="Scores at or above this are Promoters">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {[7,8,9,10].map(n => (
                <button key={n} onClick={() => n > neutralMin && setPromoterMin(n)}
                  style={{ width: 36, height: 36, borderRadius: 8, border: '1.5px solid', cursor: 'pointer', fontSize: '.84rem', fontWeight: 700, fontFamily: 'inherit',
                    borderColor: promoterMin === n ? '#22c55e' : '#e4e0d8',
                    background: promoterMin === n ? '#dcfce7' : 'white',
                    color: promoterMin === n ? '#1a6b45' : '#7a7670' }}>{n}</button>
              ))}
            </div>
          </TField>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 8 }}>
          {[
            { label: 'Detractor', range: `0–${detractorMax}`, bg: '#fee2e2', border: '#fca5a5', tc: '#c0392b', desc: 'Taken to a feedback form to share their experience.' },
            { label: 'Neutral', range: `${neutralMin}–${neutralMax}`, bg: '#fef9c3', border: '#fde68a', tc: '#92690a', desc: 'Asked if they would return. Yes → Promoter. No → Detractor.' },
            { label: 'Promoter', range: `${promoterMin}–10`, bg: '#dcfce7', border: '#bbf7d0', tc: '#1a6b45', desc: 'Asked to leave a review on your priority platform.' },
          ].map(p => (
            <div key={p.label} style={{ background: p.bg, border: `1px solid ${p.border}`, borderRadius: 12, padding: 14 }}>
              <div style={{ fontWeight: 700, fontSize: '.84rem', color: p.tc, marginBottom: 4 }}>{p.label} · {p.range}</div>
              <div style={{ fontSize: '.75rem', color: p.tc, lineHeight: 1.55, opacity: .85 }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </div>
    ),

    platforms: (
      <div>
        <div style={{ fontSize: '.84rem', color: '#7a7670', marginBottom: 20, lineHeight: 1.7 }}>
          Choose which review platforms to send Promoters to, and in what priority order. Slot 1 is shown first.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 460 }}>
          {slots.map((sv, idx) => {
            const platform = PLATFORMS.find(p => p.id === sv);
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0a0a0a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.72rem', fontWeight: 800, flexShrink: 0 }}>{idx+1}</div>
                {platform ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: 'white', border: `2px solid ${platform.color}`, borderRadius: 10, padding: '10px 14px' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: platform.color }}>{platform.icon}</span>
                    <span style={{ fontWeight: 600, fontSize: '.875rem', flex: 1 }}>{platform.label}</span>
                    <button onClick={() => removeSlot(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c8c4bc', fontSize: '1rem', padding: '2px 4px' }}
                      onMouseEnter={e => e.currentTarget.style.color='#c0392b'}
                      onMouseLeave={e => e.currentTarget.style.color='#c8c4bc'}>✕</button>
                  </div>
                ) : (
                  <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                    {PLATFORMS.map(p => (
                      <button key={p.id} onClick={() => setSlot(idx, p.id)} disabled={slots.includes(p.id)}
                        style={{ flex: 1, padding: '10px 8px', border: '1.5px solid #e4e0d8', borderRadius: 10, background: 'white',
                          cursor: slots.includes(p.id) ? 'not-allowed' : 'pointer', opacity: slots.includes(p.id) ? .3 : 1,
                          fontSize: '.78rem', fontWeight: 600, color: '#0a0a0a', fontFamily: 'inherit' }}>
                        {p.icon} {p.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    ),

    request: (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <TField label="SMS message" hint="Max 160 chars. Variables: {name} {business} {link}">
          <textarea rows={3} style={inp} maxLength={160} value={tmpl.smsRequest} onChange={e => updateTmpl('smsRequest', e.target.value)} />
          <div style={{ fontSize: '.7rem', color: tmpl.smsRequest.length > 150 ? '#c0392b' : '#7a7670', textAlign: 'right', marginTop: 4 }}>{tmpl.smsRequest.length}/160</div>
        </TField>
        <div>
          <TField label="Email subject">
            <input style={{ ...inp, resize: 'none' }} value={tmpl.emailSubject} onChange={e => updateTmpl('emailSubject', e.target.value)} />
          </TField>
          <TField label="Email body" hint="Variables: {name} {business} {link}">
            <textarea rows={8} style={inp} value={tmpl.emailBody} onChange={e => updateTmpl('emailBody', e.target.value)} />
          </TField>
        </div>
      </div>
    ),

    nps: (
      <div style={{ maxWidth: 560 }}>
        <TField label="Survey question" hint="Variables: {business}">
          <textarea rows={2} style={inp} value={tmpl.npsQuestion} onChange={e => updateTmpl('npsQuestion', e.target.value)} />
        </TField>
        <div style={{ background: '#f8f7f4', borderRadius: 12, padding: 16, marginTop: 4 }}>
          <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#7a7670', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Live preview</div>
          <div style={{ fontSize: '.9rem', color: '#0a0a0a', fontWeight: 500, marginBottom: 14 }}>{tmpl.npsQuestion.replace(/{business}/g, 'Your Business')}</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
              <div key={n} style={{ width: 34, height: 34, borderRadius: 8, border: '1.5px solid #e4e0d8', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.8rem', fontWeight: 600, color: '#7a7670' }}>{n}</div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.7rem', color: '#7a7670', marginTop: 6 }}>
            <span>Not likely at all</span><span>Extremely likely</span>
          </div>
        </div>
      </div>
    ),

    promoter: (
      <div style={{ maxWidth: 560 }}>
        <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', fontSize: '.8rem', color: '#1a6b45', marginBottom: 20 }}>
          Shown to customers who scored {promoterMin}–10
        </div>
        <TField label="Promoter message" hint="Shown after NPS score, before review platform buttons.">
          <textarea rows={4} style={inp} value={tmpl.promoterMessage} onChange={e => updateTmpl('promoterMessage', e.target.value)} />
        </TField>
        <div style={{ background: '#f8f7f4', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#7a7670', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Platform buttons preview</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {slots.filter(Boolean).map(sid => {
              const p = PLATFORMS.find(x => x.id === sid);
              return <div key={sid} style={{ padding: '9px 16px', borderRadius: 50, background: p.color, color: 'white', fontSize: '.8rem', fontWeight: 700 }}>{p.icon} Leave a review on {p.label}</div>;
            })}
            {!slots.some(Boolean) && <div style={{ fontSize: '.8rem', color: '#7a7670' }}>No platforms selected — add them in Review Platforms.</div>}
          </div>
        </div>
      </div>
    ),

    neutral: (
      <div style={{ maxWidth: 560 }}>
        <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', fontSize: '.8rem', color: '#92690a', marginBottom: 20 }}>
          Shown to customers who scored {neutralMin}–{neutralMax}
        </div>
        <TField label="Follow-up question" hint="Shown after NPS. Yes → Promoter path. No → Detractor path. Variables: {business}">
          <textarea rows={2} style={inp} value={tmpl.neutralQuestion} onChange={e => updateTmpl('neutralQuestion', e.target.value)} />
        </TField>
        <div style={{ background: '#f8f7f4', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#7a7670', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>Routing preview</div>
          <div style={{ fontSize: '.875rem', color: '#0a0a0a', marginBottom: 14 }}>{tmpl.neutralQuestion.replace(/{business}/g, 'Your Business')}</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1, padding: '10px 14px', borderRadius: 10, background: '#dcfce7', border: '1px solid #bbf7d0', fontSize: '.8rem', color: '#1a6b45', fontWeight: 600, textAlign: 'center' }}>Yes → Promoter path</div>
            <div style={{ flex: 1, padding: '10px 14px', borderRadius: 10, background: '#fee2e2', border: '1px solid #fca5a5', fontSize: '.8rem', color: '#c0392b', fontWeight: 600, textAlign: 'center' }}>No → Detractor path</div>
          </div>
        </div>
      </div>
    ),

    detractor: (
      <div style={{ maxWidth: 560 }}>
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', fontSize: '.8rem', color: '#c0392b', marginBottom: 20 }}>
          Shown to customers who scored 0–{detractorMax}, or neutral customers who said they would not return
        </div>
        <TField label="Opening message"><textarea rows={2} style={inp} value={tmpl.detractorOpening} onChange={e => updateTmpl('detractorOpening', e.target.value)} /></TField>
        <TField label="Question 1 — What fell short" hint="Free text response"><input style={{ ...inp, resize: 'none' }} value={tmpl.detractorQ1} onChange={e => updateTmpl('detractorQ1', e.target.value)} /></TField>
        <TField label="Question 2 — How to improve" hint="Free text response"><input style={{ ...inp, resize: 'none' }} value={tmpl.detractorQ2} onChange={e => updateTmpl('detractorQ2', e.target.value)} /></TField>
        <TField label="Closing message"><textarea rows={3} style={inp} value={tmpl.detractorClosing} onChange={e => updateTmpl('detractorClosing', e.target.value)} /></TField>
      </div>
    ),

    locations: (
      <div style={{ maxWidth: 520 }}>
        <div style={{ fontSize: '.84rem', color: '#7a7670', marginBottom: 20, lineHeight: 1.7 }}>
          Control whether this template is shared with or visible from other locations on your account.
        </div>
        {[
          { val: shareAll, setter: setShareAll, title: 'Share this template across all locations', desc: 'Other locations on your account can see and apply this template.', bg: shareAll ? '#dcfce7' : 'white', border: shareAll ? '#bbf7d0' : '#e4e0d8' },
          { val: suppress, setter: setSuppress, title: 'Suppress templates from other locations', desc: 'Hide templates shared by other locations. Only your own templates will appear.', bg: suppress ? '#f8f7f4' : 'white', border: suppress ? '#c8c4bc' : '#e4e0d8' },
        ].map((item, i) => (
          <div key={i} onClick={() => item.setter(v => !v)}
            style={{ background: item.bg, border: `1.5px solid ${item.border}`, borderRadius: 12, padding: '14px 16px', marginBottom: 12, display: 'flex', alignItems: 'flex-start', gap: 14, cursor: 'pointer', transition: 'all .15s' }}>
            <div style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${item.val ? '#0a0a0a' : '#c8c4bc'}`, background: item.val ? '#0a0a0a' : 'white', flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {item.val && <span style={{ color: 'white', fontSize: '.65rem', fontWeight: 900 }}>✓</span>}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '.875rem', color: '#0a0a0a', marginBottom: 3 }}>{item.title}</div>
              <div style={{ fontSize: '.78rem', color: '#7a7670', lineHeight: 1.55 }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
    ),
  };

  const titles = { thresholds:'Score thresholds', platforms:'Review platforms', request:'Request message', nps:'NPS survey', promoter:'Promoter path', neutral:'Neutral path', detractor:'Detractor path', locations:'Location sharing' };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20 }}>
        <div>
          <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 12, overflow: 'hidden' }}>
            {NAV.map(n => (
              <button key={n.id} onClick={() => setSection(n.id)}
                style={{ width: '100%', padding: '11px 14px', border: 'none', textAlign: 'left', background: section === n.id ? '#0a0a0a' : 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: '.78rem', fontWeight: section === n.id ? 700 : 500, color: section === n.id ? 'white' : '#4a4a48', borderBottom: '1px solid #f0eeea', transition: 'all .12s' }}>
                {n.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Card style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>{titles[section]}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowTest(v => !v)} style={{ padding: '8px 16px', borderRadius: 50, background: 'white', border: '1.5px solid #e4e0d8', cursor: 'pointer', fontSize: '.8rem', fontWeight: 600, fontFamily: 'inherit', color: '#4a4a48' }}>✉ Send test</button>
                <button onClick={save} style={{ padding: '8px 18px', borderRadius: 50, background: saved ? '#1a6b45' : '#0a0a0a', color: 'white', border: 'none', cursor: 'pointer', fontSize: '.8rem', fontWeight: 700, fontFamily: 'inherit', transition: 'background .2s' }}>
                  {saved ? '✓ Saved' : 'Save'}
                </button>
              </div>
            </div>
            {showTest && (
              <div style={{ background: '#f8f7f4', border: '1px solid #e4e0d8', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 8 }}>
                <input placeholder="Your email or phone number..." value={testEmail} onChange={e => setTestEmail(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', border: '1.5px solid #e4e0d8', borderRadius: 8, fontSize: '.84rem', fontFamily: 'inherit', outline: 'none' }} />
                <button onClick={sendTest} disabled={sending} style={{ padding: '8px 16px', borderRadius: 50, background: '#f5c842', color: '#0a0a0a', border: 'none', cursor: sending ? 'not-allowed' : 'pointer', fontSize: '.8rem', fontWeight: 700, fontFamily: 'inherit', opacity: sending ? .7 : 1 }}>{sending ? 'Sending…' : 'Send'}</button>
                <button onClick={() => setShowTest(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7a7670', fontSize: '1rem' }}>✕</button>
              </div>
            )}
            {testSent && <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 9, padding: '9px 14px', marginBottom: 16, fontSize: '.82rem', color: '#1a6b45', fontWeight: 600 }}>✓ Test sent to {testEmail} — check your inbox</div>}
            {testError && <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 9, padding: '9px 14px', marginBottom: 16, fontSize: '.82rem', color: '#c0392b' }}>✗ {testError}</div>}
            {sections[section]}
          </Card>
        </div>
      </div>
    </div>
  );
}


function SurveysTab() {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label="Surveys sent" value="128" sub="Last 30 days" />
        <StatCard label="Response rate" value="71%" sub="↑ Industry avg 45%" />
        <StatCard label="Avg NPS score" value="8.4" sub="↑ +0.3 vs last month" />
        <StatCard label="Promoters routed" value="43" sub="To Google review page" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
        <Card style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 14 }}>NPS breakdown</div>
          {[['Promoters','54%','#1a6b45'],['Passives','31%','#f59e0b'],['Detractors','15%','#c0392b']].map(([l,p,c]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
              <span style={{ width: 80, fontSize: '.8rem', fontWeight: 500 }}>{l}</span>
              <div style={{ flex: 1, height: 8, background: '#f0eeea', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: p, height: '100%', background: c, borderRadius: 4 }} />
              </div>
              <span style={{ fontSize: '.8rem', fontWeight: 600, color: c, width: 36 }}>{p}</span>
            </div>
          ))}
        </Card>
        <Card style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 14 }}>Survey settings</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0eeea' }}>
            <div>
              <div style={{ fontSize: '.875rem', fontWeight: 500 }}>Surveys enabled</div>
              <div style={{ fontSize: '.73rem', color: '#7a7670' }}>Sends automatically post-visit</div>
            </div>
            <div style={{ width: 40, height: 22, background: '#0a0a0a', borderRadius: 50, position: 'relative', cursor: 'pointer' }}>
              <div style={{ position: 'absolute', right: 2, top: 2, width: 18, height: 18, background: 'white', borderRadius: '50%' }} />
            </div>
          </div>
          <div style={{ padding: '10px 0' }}>
            <div style={{ fontSize: '.875rem', fontWeight: 500, marginBottom: 6 }}>Promoter destination</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['Google','Facebook','Yelp'].map((p, i) => (
                <button key={p} style={{ padding: '5px 12px', borderRadius: 50, border: i === 0 ? '2px solid #0a0a0a' : '1.5px solid #e4e0d8', background: i === 0 ? '#f8f7f4' : 'transparent', fontSize: '.8rem', fontWeight: i === 0 ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit' }}>{p}</button>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ImportTab() {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
        <Card style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 6 }}>Import contacts</div>
          <div style={{ fontSize: '.8rem', color: '#7a7670', marginBottom: 16, lineHeight: 1.6 }}>Upload a CSV from your PMS, CRM, or POS. We import names, emails, and phone numbers.</div>
          <div style={{ border: '2px dashed #e4e0d8', borderRadius: 12, padding: 32, textAlign: 'center', marginBottom: 14, cursor: 'pointer' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>⇪</div>
            <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 4 }}>Drop CSV here or click to browse</div>
            <div style={{ fontSize: '.78rem', color: '#7a7670' }}>CSV with name, email, phone columns</div>
          </div>
          <button style={{ width: '100%', padding: 11, borderRadius: 50, background: '#0a0a0a', color: 'white', border: 'none', cursor: 'pointer', fontSize: '.875rem', fontWeight: 700, fontFamily: 'inherit' }}>Import contacts</button>
        </Card>
        <Card style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 14 }}>Recent imports</div>
          {[['May import','142 contacts','May 15'],['April import','98 contacts','Apr 12']].map(([n,c,d]) => (
            <div key={n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8f7f4', borderRadius: 10, marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '.84rem' }}>{n}</div>
                <div style={{ fontSize: '.73rem', color: '#7a7670', marginTop: 2 }}>{c} · {d}</div>
              </div>
              <span style={{ background: '#e8f5ef', color: '#1a6b45', fontSize: '.67rem', fontWeight: 700, padding: '2px 8px', borderRadius: 50 }}>Complete</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

export default function Grow() {
  const [tab, setTab] = useState('requests');

  return (
    <DashboardLayout title="Grow">
      <div style={{ background: 'white', borderBottom: '1px solid #e4e0d8', padding: '0 24px', display: 'flex', gap: 2 }} className="tabs-scrollable">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '14px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: '.84rem', fontWeight: tab === t.id ? 700 : 500, fontFamily: 'inherit',
            color: tab === t.id ? '#0a0a0a' : '#7a7670',
            borderBottom: tab === t.id ? '2px solid #0a0a0a' : '2px solid transparent',
          }}>{t.label}</button>
        ))}
      </div>
      {tab === 'requests'  && <RequestsTab />}
      {tab === 'templates' && <TemplatesTab />}
      {tab === 'surveys'  && <SurveysTab />}
      {tab === 'import'   && <ImportTab />}
    </DashboardLayout>
  );
}
