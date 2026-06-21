// ============================================
// pages/dashboard/grow.js
// Grow — Review Requests / Request Templates / Bulk Send / Import tabs
// ============================================

import { keyClick } from '../../utils/a11y';
import { useState, useEffect } from 'react';
import axios from 'axios';
import LogoUploader from '../../components/LogoUploader';

const API = process.env.NEXT_PUBLIC_API_URL;

function authHeaders() {
  const t = typeof window !== 'undefined' ? localStorage.getItem('swarmreply_token') : '';
  return t ? { Authorization: `Bearer ${t}` } : {};
}
import DashboardLayout from '../../components/DashboardLayout';
import { Card as KitCard, StatCard, Button as KitButton } from '../../components/ui';
import EmptyState from '../../components/EmptyState';
import { Skeleton } from '../../components/Skeleton';
import { useRouter } from 'next/router';

const TABS = [
  { id: 'requests',  label: 'Review Requests'   },
  { id: 'templates', label: 'Request Templates' },
  { id: 'bulk',      label: 'Bulk Send'         },
  { id: 'import',    label: 'Import Contacts'   },
];

function Card({ children, style = {} }) {
  return <KitCard pad={0} style={style}>{children}</KitCard>;
}


// ── Real Grow stats (replaces the old hardcoded numbers) ─────────────────────
function useGrowStats(days = 30) {
  const [growStats, setGrowStats] = useState(null);
  useEffect(() => {
    let cancelled = false;
    setGrowStats(null);
    axios.get(`${API}/grow/stats?days=${days}`, { headers: authHeaders() })
      .then(res => { if (!cancelled) setGrowStats(res.data); })
      .catch(() => { if (!cancelled) setGrowStats(null); });
    return () => { cancelled = true; };
  }, [days]);
  return growStats;
}

const deltaSub = (d, unit = '') =>
  d == null ? null : d > 0 ? `↑ +${d}${unit} vs previous period` : d < 0 ? `↓ ${d}${unit} vs previous period` : 'Same as previous period';

function RequestStatsRow() {
  const g = useGrowStats();
  const r = g?.requests;
  return (
    <div className="m-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
      <StatCard label="Sent this month" value={r ? r.sent : '—'} sub={r ? deltaSub(r.sentDelta) : 'Last 30 days'} />
      <StatCard label="Reviews generated" value={r ? r.completed : '—'} sub={r ? deltaSub(r.completedDelta) : 'Last 30 days'} />
      <StatCard label="Conversion rate" value={r && r.conversionRate != null ? `${r.conversionRate}%` : '—'} sub="Requests → reviews" />
      <StatCard label="Pending requests" value={r ? Math.max(0, r.sent - r.completed) : '—'} sub="Awaiting a review" />
    </div>
  );
}

function SurveyStatsRow({ g, label = 'Last 30 days' }) {
  const s = g?.surveys;
  return (
    <div className="m-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
      <StatCard label="Surveys sent" value={s ? s.sent : '—'} sub={label} />
      <StatCard label="Response rate" value={s && s.responseRate != null ? `${s.responseRate}%` : '—'} sub={s && s.responseRate != null ? 'Industry avg ~45%' : 'No surveys sent yet'} />
      <StatCard label="Avg NPS score" value={s && s.avgNps != null ? s.avgNps : '—'} sub={s ? deltaSub(s.avgNpsDelta) || label : label} />
      <StatCard label="Promoters routed" value={s ? s.promotersRouted : '—'} sub="To Google review page" />
    </div>
  );
}

// Loading placeholder matching a survey table row (5-column grid).
function SurveyRowSkeleton() {
  return (
    <div className="m-survey-row" style={{ display: 'grid', gridTemplateColumns: '1fr 180px 90px 80px 70px', padding: '12px 20px', borderBottom: '1px solid var(--cream, #f8f7f4)', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Skeleton width={30} height={30} radius={50} />
        <Skeleton width={110} height={11} />
      </div>
      <Skeleton className="hide-mobile" width={140} height={10} />
      <Skeleton width={60} height={18} radius={50} />
      <Skeleton className="hide-mobile" width={50} height={10} />
      <Skeleton className="hide-mobile" width={48} height={10} />
    </div>
  );
}

// Loading placeholder matching a bulk-send contact row.
function ContactRowSkeleton() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderBottom: '1px solid var(--cream, #f8f7f4)' }}>
      <Skeleton width={18} height={18} radius={5} />
      <div style={{ flex: 1 }}>
        <Skeleton width="40%" height={11} style={{ marginBottom: 7 }} />
        <Skeleton width="62%" height={9} />
      </div>
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
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [copied, setCopied] = useState(false);

  async function resendRequest() {
    if (!selected || resending || resent) return;
    setResending(true);
    try {
      await axios.post(`${API}/review-requests/send`,
        { name: selected.customer_name, email: selected.customer_email, phone: selected.customer_phone || null },
        { headers: authH() });
      setResent(true);
    } catch (e) {
      alert(e.response?.data?.error || 'Could not send \u2014 please try again.');
    } finally {
      setResending(false);
    }
  }

  function copyEmail() {
    if (navigator.clipboard && selected) {
      navigator.clipboard.writeText(selected.customer_email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }


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
      console.error('Failed to load surveys:', e.message);
      setSurveys([]);
    } finally {
      setLoadingSurveys(false);
    }
  }

  const [sendError, setSendError] = useState('');
  async function send() {
    if (!email.trim()) { setSendError('Email is required.'); return; }
    setSending(true);
    setSendError('');
    try {
      await axios.post(`${API}/review-requests/send`, { name, email, phone }, { headers: authH() });
      setSent(true);
      setName(''); setEmail(''); setPhone('');
      setTimeout(() => setSent(false), 4000);
    } catch (e) {
      setSendError(e.response?.data?.error || 'Failed to send. Please try again.');
      setTimeout(() => setSendError(''), 6000);
    } finally {
      setSending(false);
    }
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
      promoter:  { bg: '#dcfce7', color: 'var(--green, #1a6b45)', label: `Promoter · ${score}` },
      neutral:   { bg: '#fef9c3', color: 'var(--amber-tx, #92690a)', label: `Neutral · ${score}` },
      detractor: { bg: 'var(--danger-bg, #fee2e2)', color: 'var(--danger, #c0392b)', label: `Detractor · ${score}` },
    }[path] || { bg: 'var(--cream-2, #f0eeea)', color: 'var(--taupe, #7a7670)', label: score };
    return (
      <span style={{ background: cfg.bg, color: cfg.color, fontSize: 'var(--fs-2xs, 0.6875rem)', fontWeight: 700,
        padding: '3px 9px', borderRadius: 'var(--r-pill, 999px)', whiteSpace: 'nowrap' }}>
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
      <RequestStatsRow />

      <div className="m-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>

        {/* Survey results table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card>
            {/* Header + search + filter */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line, #e4e0d8)' }}>
              <div style={{ fontWeight: 700, fontSize: 'var(--fs-base, 0.875rem)', marginBottom: 12 }}>Completed surveys</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {/* Search */}
                <div style={{ flex: 1, position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--taupe, #7a7670)', fontSize: 'var(--fs-base, 0.875rem)' }}>🔍</span>
                  <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name or email…"
                    style={{ width: '100%', padding: '8px 12px 8px 30px', border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 'var(--r-xs, 8px)',
                      fontSize: 'var(--fs-sm, 0.8125rem)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                {/* Date filter */}
                <select value={dateFilter} onChange={e => setDateFilter(e.target.value)}
                  style={{ padding: '8px 12px', border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 'var(--r-xs, 8px)',
                    fontSize: 'var(--fs-sm, 0.8125rem)', fontFamily: 'inherit', outline: 'none', background: 'white', cursor: 'pointer' }}>
                  <option value="all">All time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 days</option>
                  <option value="month">Last 30 days</option>
                </select>
                <button onClick={loadSurveys} style={{ padding: '8px 14px', borderRadius: 'var(--r-xs, 8px)', background: 'var(--cream-2, #f0eeea)',
                  border: 'none', cursor: 'pointer', fontSize: 'var(--fs-sm, 0.8125rem)', color: 'var(--tx-2, #4a4a48)', fontFamily: 'inherit' }}>
                  ↻
                </button>
              </div>
            </div>

            {/* Table header */}
            <div className="m-survey-row" style={{ display: 'grid', gridTemplateColumns: '1fr 180px 90px 80px 70px',
              padding: '8px 20px', background: 'var(--cream, #f8f7f4)',
              fontSize: 'var(--fs-2xs, 0.6875rem)', fontWeight: 700, color: 'var(--taupe, #7a7670)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              <span>Customer</span>
              <span className="hide-mobile">Email</span>
              <span>Result</span>
              <span className="hide-mobile">Review</span>
              <span className="hide-mobile">Date</span>
            </div>

            {/* Rows */}
            {loadingSurveys ? (
              <>
                {Array.from({ length: 5 }).map((_, i) => <SurveyRowSkeleton key={i} />)}
              </>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 16 }}>
                <EmptyState compact
                  title={search ? 'No matches' : 'No completed surveys yet'}
                  body={search ? 'No surveys match your search — try different terms.' : 'Send your first request and completed surveys will land here.'} />
              </div>
            ) : filtered.map(s => (
              <div role="button" tabIndex={0} onKeyDown={keyClick} key={s.id}
                onClick={() => { setSelected(s); setResent(false); setCopied(false); }}
                className="m-survey-row" style={{ display: 'grid', gridTemplateColumns: '1fr 180px 90px 80px 70px',
                  padding: '12px 20px', borderBottom: '1px solid var(--cream, #f8f7f4)', cursor: 'pointer',
                  transition: 'background .1s', alignItems: 'center' }}
                onMouseEnter={e => e.currentTarget.style.background='#fafaf9'}
                onMouseLeave={e => e.currentTarget.style.background='white'}>
                {/* Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 'var(--r-full, 50%)', background: 'var(--cream-2, #f0eeea)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 'var(--fs-xs, 0.75rem)', flexShrink: 0, color: 'var(--tx-2, #4a4a48)' }}>
                    {s.customer_name?.[0] || '?'}
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 'var(--fs-sm, 0.8125rem)', color: 'var(--ink, #0a0a0a)',
                    textDecoration: 'underline', textDecorationColor: 'var(--mute-2, #c8c4bc)' }}>
                    {s.customer_name}
                  </span>
                </div>
                {/* Email */}
                <span className="hide-mobile" style={{ fontSize: 'var(--fs-xs, 0.75rem)', color: 'var(--taupe, #7a7670)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.customer_email}
                </span>
                {/* Path badge */}
                <span>{pathBadge(s.path, s.nps_score)}</span>
                {/* Left review */}
                <span className="hide-mobile" style={{ fontSize: 'var(--fs-xs, 0.75rem)', color: s.left_review ? 'var(--green, #1a6b45)' : 'var(--mute-2, #c8c4bc)', fontWeight: 600 }}>
                  {s.left_review ? '✓ Yes' : '— No'}
                </span>
                {/* Date */}
                <span className="hide-mobile" style={{ fontSize: 'var(--fs-xs, 0.75rem)', color: 'var(--taupe, #7a7670)' }}>{fmtDate(s.completed_at)}</span>
              </div>
            ))}

            {/* Footer count */}
            <div style={{ padding: '10px 20px', borderTop: '1px solid var(--line, #e4e0d8)', fontSize: 'var(--fs-xs, 0.75rem)', color: 'var(--taupe, #7a7670)' }}>
              {filtered.length} of {surveys.length} surveys
            </div>
          </Card>
        </div>

        {/* Send request panel */}
        <Card style={{ padding: 20, height: 'fit-content' }}>
          <div style={{ fontWeight: 600, fontSize: 'var(--fs-base, 0.875rem)', marginBottom: 14 }}>Send a review request</div>
          {sent && <div style={{ background: 'var(--green-bg, #e8f5ef)', border: '1px solid #bbf7d0', borderRadius: 'var(--r-xs, 8px)', padding: '9px 12px', fontSize: 'var(--fs-sm, 0.8125rem)', color: 'var(--green, #1a6b45)', marginBottom: 12 }}>✓ Review request sent!</div>}
          {sendError && <div style={{ background: 'var(--danger-bg, #fee2e2)', border: '1px solid #fca5a5', borderRadius: 'var(--r-xs, 8px)', padding: '9px 12px', fontSize: 'var(--fs-sm, 0.8125rem)', color: 'var(--danger, #c0392b)', marginBottom: 12 }}>✗ {sendError}</div>}
          {[['Customer name','text','Enter name… (optional)',name,setName],['Email *','email','customer@example.com',email,setEmail],['Phone (SMS, optional)','tel','+1 555 000 0000',phone,setPhone]].map(([l,t,p,v,s]) => (
            <div key={l} style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 'var(--fs-2xs, 0.6875rem)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--taupe, #7a7670)', marginBottom: 4 }}>{l}</label>
              <input type={t} value={v} onChange={e => s(e.target.value)} placeholder={p}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 'var(--r-xs, 8px)', fontSize: 'var(--fs-base, 0.875rem)', fontFamily: 'inherit', outline: 'none' }} />
            </div>
          ))}
          <KitButton onClick={send} disabled={sending} variant="dark" style={{ width: '100%', marginTop: 4 }}>
            {sending ? 'Sending…' : 'Send request →'}
          </KitButton>
        </Card>
      </div>

      {/* Survey detail slide-over */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex' }}>
          {/* Backdrop */}
          <div style={{ flex: 1, background: 'rgba(0,0,0,.35)' }} onClick={() => setSelected(null)} />
          {/* Panel */}
          <div style={{ width: 480, maxWidth: '100vw', background: 'white', height: '100%', overflowY: 'auto',
            boxShadow: '-4px 0 32px rgba(0,0,0,.12)', display: 'flex', flexDirection: 'column' }}>
            {/* Panel header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line, #e4e0d8)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 'var(--r-full, 50%)', background: 'var(--cream-2, #f0eeea)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 'var(--fs-lg, 1rem)', flexShrink: 0 }}>
                {selected.customer_name?.[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 'var(--fs-lg, 1rem)' }}>{selected.customer_name}</div>
                <div style={{ fontSize: 'var(--fs-xs, 0.75rem)', color: 'var(--taupe, #7a7670)', marginTop: 2 }}>{selected.customer_email}</div>
              </div>
              <button onClick={() => setSelected(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--fs-xl, 1.25rem)', color: 'var(--taupe, #7a7670)', padding: '4px 8px' }}>✕</button>
            </div>

            <div style={{ padding: 24, flex: 1 }}>
              {/* Score + path */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20 }}>
                <div style={{ width: 56, height: 56, borderRadius: 'var(--r-md, 16px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 'var(--fs-2xl, 1.5rem)', fontWeight: 800,
                  background: selected.path === 'promoter' ? '#dcfce7' : selected.path === 'detractor' ? 'var(--danger-bg, #fee2e2)' : '#fef9c3',
                  color: selected.path === 'promoter' ? 'var(--green, #1a6b45)' : selected.path === 'detractor' ? 'var(--danger, #c0392b)' : 'var(--amber-tx, #92690a)' }}>
                  {selected.nps_score}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--fs-base, 0.875rem)', textTransform: 'capitalize' }}>{selected.path}</div>
                  <div style={{ fontSize: 'var(--fs-xs, 0.75rem)', color: 'var(--taupe, #7a7670)', marginTop: 2 }}>{fmtDate(selected.completed_at)}</div>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: 'var(--fs-xs, 0.75rem)', fontWeight: 600,
                  color: selected.left_review ? 'var(--green, #1a6b45)' : 'var(--taupe, #7a7670)' }}>
                  {selected.left_review ? '✓ Left a review' : '✗ No review left'}
                </div>
              </div>

              {/* Detractor answers */}
              {selected.path === 'detractor' && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--fs-sm, 0.8125rem)', marginBottom: 14, color: 'var(--danger, #c0392b)' }}>Detractor feedback</div>
                  {selected.detractor_q1 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 'var(--fs-xs, 0.75rem)', fontWeight: 700, color: 'var(--taupe, #7a7670)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>What fell short</div>
                      <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 'var(--r-sm, 10px)', padding: '12px 14px', fontSize: 'var(--fs-base, 0.875rem)', color: 'var(--tx-3, #3a3a38)', lineHeight: 1.65 }}>
                        "{selected.detractor_q1}"
                      </div>
                    </div>
                  )}
                  {selected.detractor_q2 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 'var(--fs-xs, 0.75rem)', fontWeight: 700, color: 'var(--taupe, #7a7670)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>How to improve</div>
                      <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 'var(--r-sm, 10px)', padding: '12px 14px', fontSize: 'var(--fs-base, 0.875rem)', color: 'var(--tx-3, #3a3a38)', lineHeight: 1.65 }}>
                        "{selected.detractor_q2}"
                      </div>
                    </div>
                  )}
                  {!selected.detractor_q1 && !selected.detractor_q2 && (
                    <div style={{ color: 'var(--taupe, #7a7670)', fontSize: 'var(--fs-sm, 0.8125rem)' }}>No written feedback provided.</div>
                  )}
                </div>
              )}

              {/* Neutral path result */}
              {selected.path === 'neutral' && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--fs-sm, 0.8125rem)', marginBottom: 14, color: 'var(--amber-tx, #92690a)' }}>Neutral response</div>
                  <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 'var(--r-sm, 10px)', padding: '12px 14px', fontSize: 'var(--fs-base, 0.875rem)', color: 'var(--tx-3, #3a3a38)' }}>
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
                  <div style={{ fontWeight: 700, fontSize: 'var(--fs-sm, 0.8125rem)', marginBottom: 14, color: 'var(--green, #1a6b45)' }}>Promoter response</div>
                  <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 'var(--r-sm, 10px)', padding: '12px 14px', fontSize: 'var(--fs-base, 0.875rem)', color: 'var(--tx-3, #3a3a38)' }}>
                    {selected.left_review
                      ? '✓ Customer clicked through to leave a review.'
                      : 'Customer was shown the review prompt but did not click through.'}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
                <button
                  onClick={resendRequest} disabled={resending || resent}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 'var(--r-pill, 999px)',
                    background: resent ? 'var(--green, #1a6b45)' : 'linear-gradient(135deg,var(--honey, #f5c842),var(--amber, #d4a515))',
                    color: resent ? 'white' : '#1a1408',
                    border: 'none', cursor: resent ? 'default' : 'pointer', fontSize: 'var(--fs-sm, 0.8125rem)', fontWeight: 700,
                    fontFamily: 'inherit', opacity: resending ? .6 : 1 }}>
                  {resent ? 'Request sent ✓' : resending ? 'Sending…' : '⚡ Send another request'}
                </button>
                <button
                  onClick={copyEmail}
                  style={{ padding: '10px 16px', borderRadius: 'var(--r-pill, 999px)', background: 'white', color: 'var(--tx, #1a1a18)',
                    border: '1.5px solid var(--line, #e4e0d8)', cursor: 'pointer', fontSize: 'var(--fs-sm, 0.8125rem)', fontWeight: 600, fontFamily: 'inherit' }}>
                  {copied ? 'Copied ✓' : 'Copy email'}
                </button>
                <button onClick={() => setSelected(null)}
                  style={{ padding: '10px 18px', borderRadius: 'var(--r-pill, 999px)', background: 'white', color: 'var(--tx-2, #4a4a48)',
                    border: '1.5px solid var(--line, #e4e0d8)', cursor: 'pointer', fontSize: 'var(--fs-sm, 0.8125rem)', fontFamily: 'inherit' }}>
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
const SWARMREPLY_COLOR = 'var(--honey, #f5c842)';

const DEFAULT_TMPL = {
  brandColor: SWARMREPLY_COLOR,
  brandLogo: SWARMREPLY_LOGO,
  brandLogoPosition: 'left',
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

// Hoisted to module scope so they keep a stable identity across renders.
// (Defining TField inside TemplatesTab remounted every input on each keystroke,
// which dropped focus after a single character.)
const inp = { width: '100%', padding: '10px 13px', border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 'var(--r-xs, 8px)', fontSize: 'var(--fs-sm, 0.8125rem)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', resize: 'vertical' };
const lbl = { fontWeight: 600, fontSize: 'var(--fs-xs, 0.75rem)', color: 'var(--tx-2, #4a4a48)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6, display: 'block' };

function TField({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <span style={lbl}>{label}</span>
      {children}
      {hint && <div style={{ fontSize: 'var(--fs-xs, 0.75rem)', color: 'var(--taupe, #7a7670)', marginTop: 5, lineHeight: 1.5 }}>{hint}</div>}
    </div>
  );
}

function TemplatesTab() {
  const [section, setSection]         = useState('branding');
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

  useEffect(() => {
    axios.get(`${API}/templates`, { headers: authHeaders() })
      .then(r => {
        const t = r.data.template || {};
        setTmpl(prev => ({ ...prev, ...t }));
        if (t.promoterMin) setPromoterMin(t.promoterMin);
        if (t.neutralMin)  setNeutralMin(t.neutralMin);
        if (Array.isArray(t.platforms) && t.platforms.length) {
          setSlots([t.platforms[0] || '', t.platforms[1] || '', t.platforms[2] || '']);
        }
      })
      .catch(() => {});
  }, []);
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

  async function save() {
    try {
      await axios.put(`${API}/templates`, { template: {
        brandColor: tmpl.brandColor, brandLogo: tmpl.brandLogo, brandLogoPosition: tmpl.brandLogoPosition, buttonText: tmpl.buttonText,
        promoterMin, neutralMin,
        smsRequest: tmpl.smsRequest, emailSubject: tmpl.emailSubject, emailBody: tmpl.emailBody,
        npsQuestion: tmpl.npsQuestion, promoterMessage: tmpl.promoterMessage,
        neutralQuestion: tmpl.neutralQuestion, detractorOpening: tmpl.detractorOpening,
        detractorQ1: tmpl.detractorQ1, detractorQ2: tmpl.detractorQ2, detractorClosing: tmpl.detractorClosing,
        platforms: slots.filter(Boolean),
      }}, { headers: authHeaders() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      alert('Failed to save template: ' + (e.response?.data?.error || e.message));
    }
  }
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
    { id: 'branding',   label: '① Branding & message' },
    { id: 'platforms',  label: '② Review platforms'  },
    { id: 'locations',  label: '③ Locations'         },
  ];

  const sections = {
    branding: (
      <div style={{ maxWidth: 560 }}>
        <div style={{ fontSize: 'var(--fs-sm, 0.8125rem)', color: 'var(--taupe, #7a7670)', marginBottom: 20, lineHeight: 1.7 }}>
          Your brand color and logo appear in the email banner and footer of every review request sent to your customers.
        </div>

        <TField label="Brand color" hint="Used for the email banner, button, and footer background.">
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6 }}>
            <input type="color" value={tmpl.brandColor} onChange={e => updateTmpl('brandColor', e.target.value)}
              style={{ width: 48, height: 40, border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 'var(--r-xs, 8px)', cursor: 'pointer', padding: 2 }} />
            <input value={tmpl.brandColor} onChange={e => updateTmpl('brandColor', e.target.value)}
              style={{ ...inp, width: 120, resize: 'none' }} placeholder="var(--honey, #f5c842)" />
            <div style={{ display: 'flex', gap: 6 }}>
              {['var(--ink, #0a0a0a)','var(--honey, #f5c842)','#1877F2','#4285F4','#D32323','var(--green, #1a6b45)','#7c3aed','#ea580c'].map(c => (
                <button key={c} onClick={() => updateTmpl('brandColor', c)}
                  style={{ width: 24, height: 24, borderRadius: 'var(--r-full, 50%)', background: c, border: tmpl.brandColor === c ? '2px solid var(--ink, #0a0a0a)' : '2px solid transparent', cursor: 'pointer' }} />
              ))}
            </div>
          </div>
        </TField>

        <TField label="Business logo" hint="Drag in your logo (PNG, JPG, WEBP, or SVG). Shown in the email header — pick where it sits below.">
          <LogoUploader
            value={tmpl.brandLogo && tmpl.brandLogo !== SWARMREPLY_LOGO ? tmpl.brandLogo : null}
            position={tmpl.brandLogoPosition || 'left'}
            brandColor={tmpl.brandColor}
            onChange={({ url, position }) => { updateTmpl('brandLogo', url); updateTmpl('brandLogoPosition', position); }}
          />
        </TField>

        <TField label="Button text" hint="The call-to-action button in the email.">
          <input style={{ ...inp, resize: 'none' }} value={tmpl.buttonText}
            onChange={e => updateTmpl('buttonText', e.target.value)} />
        </TField>

        {/* Request message — merged in from the old standalone tab */}
        <div style={{ borderTop: '1px solid var(--cream-2, #f0eeea)', margin: '4px 0 18px' }} />
        <div style={{ fontWeight: 700, fontSize: 'var(--fs-lg, 1rem)', color: 'var(--ink, #0a0a0a)', marginBottom: 4 }}>Request message</div>
        <div style={{ fontSize: 'var(--fs-sm, 0.8125rem)', color: 'var(--taupe, #7a7670)', marginBottom: 18, lineHeight: 1.6 }}>
          The wording your customers receive. Use the variables <code>{'{name}'}</code>, <code>{'{business}'}</code> and <code>{'{link}'}</code> — they’re filled in automatically.
        </div>

        <TField label="Email subject">
          <input style={{ ...inp, resize: 'none' }} value={tmpl.emailSubject} onChange={e => updateTmpl('emailSubject', e.target.value)} />
        </TField>
        <TField label="Email body" hint="Variables: {name} {business} {link}">
          <textarea rows={8} style={inp} value={tmpl.emailBody} onChange={e => updateTmpl('emailBody', e.target.value)} />
        </TField>
        <TField label="SMS message" hint="Max 160 chars. Variables: {name} {business} {link}">
          <textarea rows={3} style={inp} maxLength={160} value={tmpl.smsRequest} onChange={e => updateTmpl('smsRequest', e.target.value)} />
          <div style={{ fontSize: 'var(--fs-2xs, 0.6875rem)', color: tmpl.smsRequest.length > 150 ? 'var(--danger, #c0392b)' : 'var(--taupe, #7a7670)', textAlign: 'right', marginTop: 4 }}>{tmpl.smsRequest.length}/160</div>
        </TField>

        {/* Live email preview */}
        <div style={{ marginTop: 8 }}>
          <span style={lbl}>Email preview</span>
          <div style={{ border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 'var(--r-md, 16px)', overflow: 'hidden', fontFamily: 'sans-serif' }}>
            {/* Banner */}
            <div style={{ background: tmpl.brandColor, padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: ({ left: 'flex-start', middle: 'center', right: 'flex-end' })[tmpl.brandLogoPosition] || 'flex-start' }}>
              {tmpl.brandLogo
                ? <img src={tmpl.brandLogo} alt="Logo" style={{ maxHeight: 48, maxWidth: 160, objectFit: 'contain' }} onError={e => e.target.style.display='none'} />
                : <div style={{ fontWeight: 800, fontSize: 'var(--fs-lg, 1rem)', color: 'var(--ink, #0a0a0a)', letterSpacing: '-.01em' }}>Your Business</div>
              }
            </div>
            {/* Body */}
            <div style={{ padding: '28px 32px', background: 'white' }}>
              <div style={{ fontWeight: 700, fontSize: 'var(--fs-lg, 1rem)', color: 'var(--ink, #0a0a0a)', marginBottom: 12 }}>{(tmpl.emailSubject || 'How did we do, {name}?').replace(/{name}/g, 'Test Customer').replace(/{business}/g, 'Your Business')}</div>
              <div style={{ fontSize: 'var(--fs-base, 0.875rem)', color: 'var(--tx-3, #3a3a38)', lineHeight: 1.7, marginBottom: 20, whiteSpace: 'pre-wrap' }}>
                {tmpl.emailBody.split('{link}')[0].replace(/{name}/g, 'Test Customer').replace(/{business}/g, 'Your Business')}
              </div>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ display: 'inline-block', background: tmpl.brandColor, color: 'var(--ink, #0a0a0a)', padding: '14px 28px', borderRadius: 'var(--r-pill, 999px)', fontWeight: 700, fontSize: 'var(--fs-base, 0.875rem)', cursor: 'pointer' }}>
                  {tmpl.buttonText || 'Share Your Feedback →'}
                </div>
              </div>
            </div>
            {/* Footer */}
            <div style={{ background: tmpl.brandColor, padding: '14px 32px', opacity: .85 }}>
              <div style={{ fontSize: 'var(--fs-xs, 0.75rem)', color: 'var(--ink, #0a0a0a)', opacity: .7, textAlign: 'center' }}>Sent by SwarmReply on behalf of Your Business</div>
            </div>
          </div>
        </div>
      </div>
    ),
    thresholds: (
      <div>
        <div style={{ fontSize: 'var(--fs-sm, 0.8125rem)', color: 'var(--taupe, #7a7670)', marginBottom: 20, lineHeight: 1.7 }}>
          Define what score range qualifies as Promoter, Neutral, or Detractor. This controls which follow-up path a customer is sent down after completing the NPS survey.
        </div>
        <div style={{ display: 'flex', borderRadius: 'var(--r-sm, 10px)', overflow: 'hidden', height: 40, marginBottom: 12 }}>
          <div style={{ flex: neutralMin - 1, background: 'var(--danger-bg, #fee2e2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--fs-xs, 0.75rem)', fontWeight: 700, color: 'var(--danger, #c0392b)' }}>Detractor · 1–{detractorMax}</div>
          <div style={{ flex: Math.max(1, promoterMin - neutralMin), background: '#fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--fs-xs, 0.75rem)', fontWeight: 700, color: 'var(--amber-tx, #92690a)' }}>Neutral · {neutralMin}–{neutralMax}</div>
          <div style={{ flex: 11 - promoterMin, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--fs-xs, 0.75rem)', fontWeight: 700, color: 'var(--green, #1a6b45)' }}>Promoter · {promoterMin}–10</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-2xs, 0.6875rem)', color: 'var(--taupe, #7a7670)', marginBottom: 20, padding: '0 2px' }}>
          {[1,2,3,4,5,6,7,8,9,10].map(n => <span key={n} style={{ fontWeight: 600 }}>{n}</span>)}
        </div>
        <div className="m-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <TField label="Neutral starts at" hint="Scores below this are Detractors (min 1, max 7)">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {[1,2,3,4,5,6,7].map(n => (
                <button key={n} onClick={() => n < promoterMin && setNeutralMin(n)}
                  style={{ width: 36, height: 36, borderRadius: 'var(--r-xs, 8px)', border: '1.5px solid', cursor: 'pointer', fontSize: 'var(--fs-sm, 0.8125rem)', fontWeight: 700, fontFamily: 'inherit',
                    borderColor: neutralMin === n ? 'var(--honey, #f5c842)' : 'var(--line, #e4e0d8)',
                    background: neutralMin === n ? 'var(--honey, #f5c842)' : 'white',
                    color: neutralMin === n ? 'var(--ink, #0a0a0a)' : 'var(--taupe, #7a7670)' }}>{n}</button>
              ))}
            </div>
          </TField>
          <TField label="Promoter starts at" hint="Scores at or above this are Promoters">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {[7,8,9,10].map(n => (
                <button key={n} onClick={() => n > neutralMin && setPromoterMin(n)}
                  style={{ width: 36, height: 36, borderRadius: 'var(--r-xs, 8px)', border: '1.5px solid', cursor: 'pointer', fontSize: 'var(--fs-sm, 0.8125rem)', fontWeight: 700, fontFamily: 'inherit',
                    borderColor: promoterMin === n ? '#22c55e' : 'var(--line, #e4e0d8)',
                    background: promoterMin === n ? '#dcfce7' : 'white',
                    color: promoterMin === n ? 'var(--green, #1a6b45)' : 'var(--taupe, #7a7670)' }}>{n}</button>
              ))}
            </div>
          </TField>
        </div>
        <div className="m-grid-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 8 }}>
          {[
            { label: 'Detractor', range: `1–${detractorMax}`, bg: 'var(--danger-bg, #fee2e2)', border: '#fca5a5', tc: 'var(--danger, #c0392b)', desc: 'Taken to a feedback form to share their experience.' },
            { label: 'Neutral', range: `${neutralMin}–${neutralMax}`, bg: '#fef9c3', border: '#fde68a', tc: 'var(--amber-tx, #92690a)', desc: 'Asked if they would return. Yes → Promoter. No → Detractor.' },
            { label: 'Promoter', range: `${promoterMin}–10`, bg: '#dcfce7', border: '#bbf7d0', tc: 'var(--green, #1a6b45)', desc: 'Asked to leave a review on your priority platform.' },
          ].map(p => (
            <div key={p.label} style={{ background: p.bg, border: `1px solid ${p.border}`, borderRadius: 'var(--r-md, 16px)', padding: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 'var(--fs-sm, 0.8125rem)', color: p.tc, marginBottom: 4 }}>{p.label} · {p.range}</div>
              <div style={{ fontSize: 'var(--fs-xs, 0.75rem)', color: p.tc, lineHeight: 1.55, opacity: .85 }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </div>
    ),

    platforms: (
      <div>
        <div style={{ fontSize: 'var(--fs-sm, 0.8125rem)', color: 'var(--taupe, #7a7670)', marginBottom: 20, lineHeight: 1.7 }}>
          Choose which review platforms to send Promoters to, and in what priority order. Slot 1 is shown first.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 460 }}>
          {slots.map((sv, idx) => {
            const platform = PLATFORMS.find(p => p.id === sv);
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 'var(--r-full, 50%)', background: 'var(--ink, #0a0a0a)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--fs-xs, 0.75rem)', fontWeight: 800, flexShrink: 0 }}>{idx+1}</div>
                {platform ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: 'white', border: `2px solid ${platform.color}`, borderRadius: 'var(--r-sm, 10px)', padding: '10px 14px' }}>
                    <span style={{ fontWeight: 700, fontSize: 'var(--fs-lg, 1rem)', color: platform.color }}>{platform.icon}</span>
                    <span style={{ fontWeight: 600, fontSize: 'var(--fs-base, 0.875rem)', flex: 1 }}>{platform.label}</span>
                    <button onClick={() => removeSlot(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mute-2, #c8c4bc)', fontSize: 'var(--fs-lg, 1rem)', padding: '2px 4px' }}
                      onMouseEnter={e => e.currentTarget.style.color='var(--danger, #c0392b)'}
                      onMouseLeave={e => e.currentTarget.style.color='var(--mute-2, #c8c4bc)'}>✕</button>
                  </div>
                ) : (
                  <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                    {PLATFORMS.map(p => (
                      <button key={p.id} onClick={() => setSlot(idx, p.id)} disabled={slots.includes(p.id)}
                        style={{ flex: 1, padding: '10px 8px', border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 'var(--r-sm, 10px)', background: 'white',
                          cursor: slots.includes(p.id) ? 'not-allowed' : 'pointer', opacity: slots.includes(p.id) ? .3 : 1,
                          fontSize: 'var(--fs-xs, 0.75rem)', fontWeight: 600, color: 'var(--ink, #0a0a0a)', fontFamily: 'inherit' }}>
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

    nps: (
      <div style={{ maxWidth: 560 }}>
        <TField label="Survey question" hint="Variables: {business}">
          <textarea rows={2} style={inp} value={tmpl.npsQuestion} onChange={e => updateTmpl('npsQuestion', e.target.value)} />
        </TField>
        <div style={{ background: 'var(--cream, #f8f7f4)', borderRadius: 'var(--r-md, 16px)', padding: 16, marginTop: 4 }}>
          <div style={{ fontSize: 'var(--fs-xs, 0.75rem)', fontWeight: 700, color: 'var(--taupe, #7a7670)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Live preview</div>
          <div style={{ fontSize: 'var(--fs-base, 0.875rem)', color: 'var(--ink, #0a0a0a)', fontWeight: 500, marginBottom: 14 }}>{tmpl.npsQuestion.replace(/{business}/g, 'Your Business')}</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <div key={n} style={{ width: 34, height: 34, borderRadius: 'var(--r-xs, 8px)', border: '1.5px solid var(--line, #e4e0d8)', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--fs-sm, 0.8125rem)', fontWeight: 600, color: 'var(--taupe, #7a7670)' }}>{n}</div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-2xs, 0.6875rem)', color: 'var(--taupe, #7a7670)', marginTop: 6 }}>
            <span>Not likely at all</span><span>Extremely likely</span>
          </div>
        </div>
      </div>
    ),

    promoter: (
      <div style={{ maxWidth: 560 }}>
        <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 'var(--r-sm, 10px)', padding: '10px 14px', fontSize: 'var(--fs-sm, 0.8125rem)', color: 'var(--green, #1a6b45)', marginBottom: 20 }}>
          Shown to customers who scored {promoterMin}–10
        </div>
        <TField label="Promoter message" hint="Shown after NPS score, before review platform buttons.">
          <textarea rows={4} style={inp} value={tmpl.promoterMessage} onChange={e => updateTmpl('promoterMessage', e.target.value)} />
        </TField>
        <div style={{ background: 'var(--cream, #f8f7f4)', borderRadius: 'var(--r-md, 16px)', padding: 16 }}>
          <div style={{ fontSize: 'var(--fs-xs, 0.75rem)', fontWeight: 700, color: 'var(--taupe, #7a7670)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Platform buttons preview</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {slots.filter(Boolean).map(sid => {
              const p = PLATFORMS.find(x => x.id === sid);
              return <div key={sid} style={{ padding: '9px 16px', borderRadius: 'var(--r-pill, 999px)', background: p.color, color: 'white', fontSize: 'var(--fs-sm, 0.8125rem)', fontWeight: 700 }}>{p.icon} Leave a review on {p.label}</div>;
            })}
            {!slots.some(Boolean) && <div style={{ fontSize: 'var(--fs-sm, 0.8125rem)', color: 'var(--taupe, #7a7670)' }}>No platforms selected — add them in Review Platforms.</div>}
          </div>
        </div>
      </div>
    ),

    neutral: (
      <div style={{ maxWidth: 560 }}>
        <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 'var(--r-sm, 10px)', padding: '10px 14px', fontSize: 'var(--fs-sm, 0.8125rem)', color: 'var(--amber-tx, #92690a)', marginBottom: 20 }}>
          Shown to customers who scored {neutralMin}–{neutralMax}
        </div>
        <TField label="Follow-up question" hint="Shown after NPS. Yes → Promoter path. No → Detractor path. Variables: {business}">
          <textarea rows={2} style={inp} value={tmpl.neutralQuestion} onChange={e => updateTmpl('neutralQuestion', e.target.value)} />
        </TField>
        <div style={{ background: 'var(--cream, #f8f7f4)', borderRadius: 'var(--r-md, 16px)', padding: 16 }}>
          <div style={{ fontSize: 'var(--fs-xs, 0.75rem)', fontWeight: 700, color: 'var(--taupe, #7a7670)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>Routing preview</div>
          <div style={{ fontSize: 'var(--fs-base, 0.875rem)', color: 'var(--ink, #0a0a0a)', marginBottom: 14 }}>{tmpl.neutralQuestion.replace(/{business}/g, 'Your Business')}</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1, padding: '10px 14px', borderRadius: 'var(--r-sm, 10px)', background: '#dcfce7', border: '1px solid #bbf7d0', fontSize: 'var(--fs-sm, 0.8125rem)', color: 'var(--green, #1a6b45)', fontWeight: 600, textAlign: 'center' }}>Yes → Promoter path</div>
            <div style={{ flex: 1, padding: '10px 14px', borderRadius: 'var(--r-sm, 10px)', background: 'var(--danger-bg, #fee2e2)', border: '1px solid #fca5a5', fontSize: 'var(--fs-sm, 0.8125rem)', color: 'var(--danger, #c0392b)', fontWeight: 600, textAlign: 'center' }}>No → Detractor path</div>
          </div>
        </div>
      </div>
    ),

    detractor: (
      <div style={{ maxWidth: 560 }}>
        <div style={{ background: 'var(--danger-bg, #fee2e2)', border: '1px solid #fca5a5', borderRadius: 'var(--r-sm, 10px)', padding: '10px 14px', fontSize: 'var(--fs-sm, 0.8125rem)', color: 'var(--danger, #c0392b)', marginBottom: 20 }}>
          Shown to customers who scored 1–{detractorMax}, or neutral customers who said they would not return
        </div>
        <TField label="Opening message"><textarea rows={2} style={inp} value={tmpl.detractorOpening} onChange={e => updateTmpl('detractorOpening', e.target.value)} /></TField>
        <TField label="Question 1 — What fell short" hint="Free text response"><input style={{ ...inp, resize: 'none' }} value={tmpl.detractorQ1} onChange={e => updateTmpl('detractorQ1', e.target.value)} /></TField>
        <TField label="Question 2 — How to improve" hint="Free text response"><input style={{ ...inp, resize: 'none' }} value={tmpl.detractorQ2} onChange={e => updateTmpl('detractorQ2', e.target.value)} /></TField>
        <TField label="Closing message"><textarea rows={3} style={inp} value={tmpl.detractorClosing} onChange={e => updateTmpl('detractorClosing', e.target.value)} /></TField>
      </div>
    ),

    locations: (
      <div style={{ maxWidth: 520 }}>
        <div style={{ fontSize: 'var(--fs-sm, 0.8125rem)', color: 'var(--taupe, #7a7670)', marginBottom: 20, lineHeight: 1.7 }}>
          Control whether this template is shared with or visible from other locations on your account.
        </div>
        {[
          { val: shareAll, setter: setShareAll, title: 'Share this template across all locations', desc: 'Other locations on your account can see and apply this template.', bg: shareAll ? '#dcfce7' : 'white', border: shareAll ? '#bbf7d0' : 'var(--line, #e4e0d8)' },
          { val: suppress, setter: setSuppress, title: 'Suppress templates from other locations', desc: 'Hide templates shared by other locations. Only your own templates will appear.', bg: suppress ? 'var(--cream, #f8f7f4)' : 'white', border: suppress ? 'var(--mute-2, #c8c4bc)' : 'var(--line, #e4e0d8)' },
        ].map((item, i) => (
          <div role="checkbox" tabIndex={0} onKeyDown={keyClick} aria-checked={item.val} key={i} onClick={() => item.setter(v => !v)}
            style={{ background: item.bg, border: `1.5px solid ${item.border}`, borderRadius: 'var(--r-md, 16px)', padding: '14px 16px', marginBottom: 12, display: 'flex', alignItems: 'flex-start', gap: 14, cursor: 'pointer', transition: 'all .15s' }}>
            <div style={{ width: 20, height: 20, borderRadius: 'var(--r-xs, 8px)', border: `2px solid ${item.val ? 'var(--ink, #0a0a0a)' : 'var(--mute-2, #c8c4bc)'}`, background: item.val ? 'var(--ink, #0a0a0a)' : 'white', flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {item.val && <span style={{ color: 'white', fontSize: 'var(--fs-2xs, 0.6875rem)', fontWeight: 900 }}>✓</span>}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 'var(--fs-base, 0.875rem)', color: 'var(--ink, #0a0a0a)', marginBottom: 3 }}>{item.title}</div>
              <div style={{ fontSize: 'var(--fs-xs, 0.75rem)', color: 'var(--taupe, #7a7670)', lineHeight: 1.55 }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
    ),
  };

  const titles = { branding:'Branding & message', thresholds:'Score thresholds', platforms:'Review platforms', nps:'NPS survey', promoter:'Promoter path', neutral:'Neutral path', detractor:'Detractor path', locations:'Location sharing' };

  return (
    <div style={{ padding: 24 }}>
      <div className="m-grid-1" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20 }}>
        <div>
          <div style={{ background: 'white', border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 'var(--r-md, 16px)', overflow: 'hidden' }}>
            {NAV.map(n => (
              <button key={n.id} onClick={() => setSection(n.id)}
                style={{ width: '100%', padding: '11px 14px', border: 'none', textAlign: 'left', background: section === n.id ? 'var(--ink, #0a0a0a)' : 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--fs-xs, 0.75rem)', fontWeight: section === n.id ? 700 : 500, color: section === n.id ? 'white' : 'var(--tx-2, #4a4a48)', borderBottom: '1px solid var(--cream-2, #f0eeea)', transition: 'all .12s' }}>
                {n.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Card style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 'var(--fs-lg, 1rem)' }}>{titles[section]}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowTest(v => !v)} style={{ padding: '8px 16px', borderRadius: 'var(--r-pill, 999px)', background: 'white', border: '1.5px solid var(--line, #e4e0d8)', cursor: 'pointer', fontSize: 'var(--fs-sm, 0.8125rem)', fontWeight: 600, fontFamily: 'inherit', color: 'var(--tx-2, #4a4a48)' }}>✉ Send test</button>
                <button onClick={save} style={{ padding: '8px 18px', borderRadius: 'var(--r-pill, 999px)', background: saved ? 'var(--green, #1a6b45)' : 'var(--ink, #0a0a0a)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 'var(--fs-sm, 0.8125rem)', fontWeight: 700, fontFamily: 'inherit', transition: 'background .2s' }}>
                  {saved ? '✓ Saved' : 'Save'}
                </button>
              </div>
            </div>
            {showTest && (
              <div style={{ background: 'var(--cream, #f8f7f4)', border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 'var(--r-sm, 10px)', padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 8 }}>
                <input placeholder="Your email or phone number..." value={testEmail} onChange={e => setTestEmail(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 'var(--r-xs, 8px)', fontSize: 'var(--fs-sm, 0.8125rem)', fontFamily: 'inherit', outline: 'none' }} />
                <button onClick={sendTest} disabled={sending} style={{ padding: '8px 16px', borderRadius: 'var(--r-pill, 999px)', background: 'linear-gradient(135deg,var(--honey, #f5c842),var(--amber, #d4a515))', color: '#1a1408', border: 'none', cursor: sending ? 'not-allowed' : 'pointer', fontSize: 'var(--fs-sm, 0.8125rem)', fontWeight: 700, fontFamily: 'inherit', opacity: sending ? .7 : 1 }}>{sending ? 'Sending…' : 'Send'}</button>
                <button onClick={() => setShowTest(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--taupe, #7a7670)', fontSize: 'var(--fs-lg, 1rem)' }}>✕</button>
              </div>
            )}
            {testSent && <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 'var(--r-xs, 8px)', padding: '9px 14px', marginBottom: 16, fontSize: 'var(--fs-sm, 0.8125rem)', color: 'var(--green, #1a6b45)', fontWeight: 600 }}>✓ Test sent to {testEmail} — check your inbox</div>}
            {testError && <div style={{ background: 'var(--danger-bg, #fee2e2)', border: '1px solid #fca5a5', borderRadius: 'var(--r-xs, 8px)', padding: '9px 14px', marginBottom: 16, fontSize: 'var(--fs-sm, 0.8125rem)', color: 'var(--danger, #c0392b)' }}>✗ {testError}</div>}
            {sections[section]}
          </Card>
        </div>
      </div>
    </div>
  );
}


function BulkSendTab() {
  const [contacts, setContacts]   = useState([]);
  const [segments, setSegments]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState([]);    // array of contact ids
  const [segment, setSegment]     = useState('all');
  const [search, setSearch]       = useState('');
  const [sending, setSending]     = useState(false);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState('');
  const [segName, setSegName]     = useState('');   // assign-to-segment input
  const [assigning, setAssigning] = useState(false);
  const [assignMsg, setAssignMsg] = useState('');
  const [menuFor, setMenuFor]     = useState(null);  // contact id with opt-out menu open
  const [optingId, setOptingId]   = useState(null);

  const API = process.env.NEXT_PUBLIC_API_URL;
  function authH() {
    const t = typeof window !== 'undefined' ? localStorage.getItem('swarmreply_token') : '';
    return t ? { Authorization: `Bearer ${t}` } : {};
  }

  useEffect(() => { loadContacts(); }, []);

  async function loadContacts() {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/contacts`, { headers: authH() });
      setContacts(res.data.contacts || []);
      setSegments(res.data.segments || []);
    } catch (e) {
      console.error('Failed to load contacts:', e.message);
      setContacts([]);
      setSegments([{ id: 'all', name: 'All contacts', count: 0 }]);
    } finally {
      setLoading(false);
    }
  }

  const filtered = contacts.filter(c => {
    const inSegment = segment === 'all' || c.segment === segment;
    const matchSearch = !search.trim() ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase());
    return inSegment && matchSearch;
  });

  function toggle(id) {
    const c = contacts.find(x => x.id === id);
    if (c?.opted_out) return;                       // opted-out contacts can't be selected
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }
  function toggleAll() {
    const ids = filtered.filter(c => !c.opted_out).map(c => c.id);
    const allSelected = ids.length > 0 && ids.every(id => selected.includes(id));
    if (allSelected) setSelected(prev => prev.filter(id => !ids.includes(id)));
    else setSelected(prev => [...new Set([...prev, ...ids])]);
  }

  async function optOut(contact, value) {
    setOptingId(contact.id); setError('');
    try {
      await axios.post(`${API}/contacts/${contact.id}/opt-out`, { opted_out: value }, { headers: authH() });
      setMenuFor(null);
      setSelected(prev => prev.filter(id => id !== contact.id));   // can't send to an opted-out contact
      await loadContacts();
    } catch (e) {
      setError(e.response?.data?.error || 'Could not update opt-out.');
    } finally {
      setOptingId(null);
    }
  }

  async function sendBulk() {
    if (selected.length === 0) { setError('Select at least one contact.'); return; }
    setSending(true);
    setError('');
    const targets = contacts.filter(c => selected.includes(c.id) && !c.opted_out);
    try {
      const res = await axios.post(`${API}/review-requests/bulk-send`,
        { contacts: targets.map(c => ({ name: c.name, email: c.email, phone: c.phone })) },
        { headers: authH() });
      setResult({ sent: res.data.sent ?? targets.length, failed: res.data.failed ?? 0, skipped: res.data.skipped ?? 0 });
      setSelected([]);
    } catch (e) {
      setError(e.response?.data?.error || 'Bulk send failed. Please try again.');
    } finally {
      setSending(false);
    }
  }

  const selectable = filtered.filter(c => !c.opted_out);
  const allFilteredSelected = selectable.length > 0 && selectable.every(c => selected.includes(c.id));

  async function assignSegment() {
    const seg = segName.trim();
    if (selected.length === 0) { setError('Select contacts to add to a segment.'); return; }
    if (!seg) { setError('Type a segment name.'); return; }
    setAssigning(true); setError(''); setAssignMsg('');
    try {
      const res = await axios.post(`${API}/contacts/segment`,
        { contactIds: selected, segment: seg },
        { headers: authH() });
      setAssignMsg(`Added ${res.data.updated ?? selected.length} to “${seg}”.`);
      setSegName('');
      await loadContacts();          // refresh so the new segment shows in the dropdown
    } catch (e) {
      setError(e.response?.data?.error || 'Could not assign segment.');
    } finally {
      setAssigning(false);
    }
  }

  if (result) return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 'var(--fs-4xl, 2.5rem)', marginBottom: 16 }}>📨</div>
      <div style={{ fontWeight: 700, fontSize: 'var(--fs-lg, 1rem)', marginBottom: 8 }}>Review requests sent!</div>
      <div style={{ fontSize: 'var(--fs-base, 0.875rem)', color: 'var(--taupe, #7a7670)', marginBottom: 24 }}>
        {result.sent} request{result.sent !== 1 ? 's' : ''} sent successfully{result.failed > 0 ? `, ${result.failed} failed` : ''}{result.skipped > 0 ? `, ${result.skipped} skipped (opted out)` : ''}.
      </div>
      <button onClick={() => setResult(null)} style={{ padding: '10px 24px', borderRadius: 'var(--r-pill, 999px)', background: 'var(--ink, #0a0a0a)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>Send more</button>
    </div>
  );

  return (
    <div style={{ padding: 24 }}>
      <div className="m-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
        {/* Contact list */}
        <Card>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line, #e4e0d8)' }}>
            <div style={{ fontWeight: 700, fontSize: 'var(--fs-base, 0.875rem)', marginBottom: 12 }}>Select contacts</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={segment} onChange={e => setSegment(e.target.value)}
                style={{ padding: '8px 12px', border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 'var(--r-xs, 8px)', fontSize: 'var(--fs-sm, 0.8125rem)', fontFamily: 'inherit', background: 'white', cursor: 'pointer' }}>
                {segments.map(s => <option key={s.id} value={s.id}>{s.name} ({s.count})</option>)}
              </select>
              <div style={{ flex: 1, position: 'relative' }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--taupe, #7a7670)', fontSize: 'var(--fs-base, 0.875rem)' }}>🔍</span>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email…"
                  style={{ width: '100%', padding: '8px 12px 8px 30px', border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 'var(--r-xs, 8px)', fontSize: 'var(--fs-sm, 0.8125rem)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
          </div>

          {/* Select all */}
          <div role="checkbox" tabIndex={0} onKeyDown={keyClick} aria-checked={allFilteredSelected} onClick={toggleAll} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', borderBottom: '1px solid var(--cream-2, #f0eeea)', cursor: 'pointer', background: 'var(--cream, #f8f7f4)' }}>
            <div style={{ width: 18, height: 18, borderRadius: 'var(--r-xs, 8px)', border: '2px solid', borderColor: allFilteredSelected ? 'var(--ink, #0a0a0a)' : 'var(--mute-2, #c8c4bc)', background: allFilteredSelected ? 'var(--ink, #0a0a0a)' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {allFilteredSelected && <span style={{ color: 'white', fontSize: 'var(--fs-2xs, 0.6875rem)', fontWeight: 900 }}>✓</span>}
            </div>
            <span style={{ fontSize: 'var(--fs-sm, 0.8125rem)', fontWeight: 600, color: 'var(--tx-2, #4a4a48)' }}>Select all ({selectable.length})</span>
          </div>

          {/* Rows */}
          <div style={{ maxHeight: 440, overflowY: 'auto' }}>
            {loading ? (
              <>
                {Array.from({ length: 6 }).map((_, i) => <ContactRowSkeleton key={i} />)}
              </>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 16 }}>
                <EmptyState compact
                  title="No contacts yet"
                  body="Import a CSV on the Import tab and your contacts will appear here, ready for bulk sending." />
              </div>
            ) : filtered.map(c => {
              const isSel = selected.includes(c.id);
              const isOut = !!c.opted_out;
              return (
                <div role="button" tabIndex={0} onKeyDown={keyClick} key={c.id} onClick={() => { if (menuFor === c.id) setMenuFor(null); else if (!isOut) toggle(c.id); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderBottom: '1px solid var(--cream, #f8f7f4)', cursor: isOut ? 'default' : 'pointer', background: isSel ? '#fafaf9' : 'white', opacity: isOut ? .6 : 1, position: 'relative' }}>
                  <div style={{ width: 18, height: 18, borderRadius: 'var(--r-xs, 8px)', border: '2px solid', borderColor: isOut ? 'var(--line, #e4e0d8)' : (isSel ? 'var(--ink, #0a0a0a)' : 'var(--mute-2, #c8c4bc)'), background: (isSel && !isOut) ? 'var(--ink, #0a0a0a)' : 'white', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isSel && !isOut && <span style={{ color: 'white', fontSize: 'var(--fs-2xs, 0.6875rem)', fontWeight: 900 }}>✓</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span role="button" tabIndex={0} onKeyDown={keyClick} onClick={e => { e.stopPropagation(); setMenuFor(menuFor === c.id ? null : c.id); }}
                      title="Click to opt out / re-enable"
                      style={{ fontWeight: 600, fontSize: 'var(--fs-sm, 0.8125rem)', color: 'var(--ink, #0a0a0a)', cursor: 'pointer', borderBottom: '1px dotted var(--mute-2, #c8c4bc)' }}>
                      {c.name || '(no name)'}
                    </span>
                    <div style={{ fontSize: 'var(--fs-xs, 0.75rem)', color: 'var(--taupe, #7a7670)' }}>{c.email}{c.phone ? ' · ' + c.phone : ''}</div>
                    {menuFor === c.id && (
                      <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', zIndex: 5, marginTop: 4, background: 'white', border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 'var(--r-sm, 10px)', boxShadow: '0 8px 28px rgba(0,0,0,.12)', padding: 6, minWidth: 210 }}>
                        {isOut ? (
                          <button onClick={() => optOut(c, false)} disabled={optingId === c.id}
                            style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '8px 10px', borderRadius: 'var(--r-xs, 8px)', cursor: 'pointer', fontSize: 'var(--fs-sm, 0.8125rem)', fontFamily: 'inherit', color: 'var(--green, #1a6b45)', fontWeight: 600 }}>
                            {optingId === c.id ? 'Saving…' : '↺ Re-enable review requests'}
                          </button>
                        ) : (
                          <button onClick={() => optOut(c, true)} disabled={optingId === c.id}
                            style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '8px 10px', borderRadius: 'var(--r-xs, 8px)', cursor: 'pointer', fontSize: 'var(--fs-sm, 0.8125rem)', fontFamily: 'inherit', color: 'var(--danger, #c0392b)', fontWeight: 600 }}>
                            {optingId === c.id ? 'Saving…' : '🚫 Opt out of review requests'}
                          </button>
                        )}
                        <button onClick={() => setMenuFor(null)}
                          style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '8px 10px', borderRadius: 'var(--r-xs, 8px)', cursor: 'pointer', fontSize: 'var(--fs-xs, 0.75rem)', fontFamily: 'inherit', color: 'var(--taupe, #7a7670)' }}>
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {isOut && <span style={{ fontSize: 'var(--fs-2xs, 0.6875rem)', color: 'var(--danger, #c0392b)', background: 'var(--danger-bg, #fee2e2)', padding: '2px 7px', borderRadius: 'var(--r-pill, 999px)', fontWeight: 700 }}>Opted out</span>}
                    {c.segment && c.segment !== 'all' && (
                      <span style={{ fontSize: 'var(--fs-2xs, 0.6875rem)', color: 'var(--tx-2, #4a4a48)', background: 'var(--cream-2, #f0eeea)', padding: '2px 7px', borderRadius: 'var(--r-pill, 999px)', textTransform: 'capitalize' }}>{c.segment}</span>
                    )}
                    {c.request_count > 0 && (
                      <span style={{ fontSize: 'var(--fs-2xs, 0.6875rem)', color: 'var(--amber-tx, #92690a)', background: '#fef9c3', padding: '2px 7px', borderRadius: 'var(--r-pill, 999px)', whiteSpace: 'nowrap' }}
                        title={`${c.request_count} review request${c.request_count === 1 ? '' : 's'} sent`}>
                        {c.request_count}× · last {new Date(c.last_request).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Send panel */}
        <Card style={{ padding: 20, height: 'fit-content' }}>
          <div style={{ fontWeight: 600, fontSize: 'var(--fs-base, 0.875rem)', marginBottom: 14 }}>Send review requests</div>
          <div style={{ background: 'var(--cream, #f8f7f4)', borderRadius: 'var(--r-sm, 10px)', padding: '14px 16px', marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--fs-3xl, 2rem)', fontWeight: 800, color: 'var(--ink, #0a0a0a)' }}>{selected.length}</div>
            <div style={{ fontSize: 'var(--fs-xs, 0.75rem)', color: 'var(--taupe, #7a7670)' }}>contact{selected.length !== 1 ? 's' : ''} selected</div>
          </div>
          {error && <div style={{ background: 'var(--danger-bg, #fee2e2)', border: '1px solid #fca5a5', borderRadius: 'var(--r-xs, 8px)', padding: '9px 12px', fontSize: 'var(--fs-sm, 0.8125rem)', color: 'var(--danger, #c0392b)', marginBottom: 12 }}>✗ {error}</div>}
          <div style={{ fontSize: 'var(--fs-xs, 0.75rem)', color: 'var(--taupe, #7a7670)', lineHeight: 1.6, marginBottom: 16 }}>
            Each contact will receive your branded review request email with a link to the NPS survey. Contacts without an email are skipped.
          </div>
          <KitButton onClick={sendBulk} disabled={sending || selected.length === 0} variant="dark" style={{ width: '100%' }}>
            {sending ? 'Sending…' : `Send ${selected.length || ''} request${selected.length !== 1 ? 's' : ''} →`}
          </KitButton>

          {/* Organize selected contacts into a shared segment (same field SMS Campaigns target) */}
          <div style={{ borderTop: '1px solid var(--cream-2, #f0eeea)', marginTop: 16, paddingTop: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 'var(--fs-sm, 0.8125rem)', marginBottom: 4 }}>Add to a segment</div>
            <div style={{ fontSize: 'var(--fs-xs, 0.75rem)', color: 'var(--taupe, #7a7670)', lineHeight: 1.5, marginBottom: 10 }}>
              Tag the selected contacts so you can target them here and in SMS Campaigns.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={segName} onChange={e => setSegName(e.target.value)} placeholder="e.g. vip, lapsed"
                list="bulk-segment-options"
                style={{ flex: 1, minWidth: 0, padding: '8px 11px', border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 'var(--r-xs, 8px)', fontSize: 'var(--fs-sm, 0.8125rem)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              <datalist id="bulk-segment-options">
                {segments.filter(s => s.id !== 'all').map(s => <option key={s.id} value={s.id} />)}
              </datalist>
              <KitButton onClick={assignSegment} disabled={assigning || selected.length === 0 || !segName.trim()} style={{ whiteSpace: 'nowrap' }}>
                {assigning ? '…' : 'Add'}
              </KitButton>
            </div>
            {assignMsg && <div style={{ fontSize: 'var(--fs-xs, 0.75rem)', color: 'var(--green, #1a6b45)', marginTop: 8 }}>✓ {assignMsg}</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}

const SURVEY_TIMEFRAMES = [
  { days: 7,   short: 'Last week', label: 'Last 7 days' },
  { days: 30,  short: 'Month',     label: 'Last 30 days' },
  { days: 90,  short: 'Quarter',   label: 'Last 90 days' },
  { days: 365, short: 'Year',      label: 'Last 365 days' },
];

function SurveysTab() {
  const [days, setDays] = useState(30);
  const g = useGrowStats(days);
  const tf = SURVEY_TIMEFRAMES.find(t => t.days === days) || SURVEY_TIMEFRAMES[1];
  const b = g?.surveys?.breakdown;
  const total = b?.total || 0;
  const pct = (n) => total ? Math.round((n / total) * 100) : 0;
  const rows = b ? [
    ['Promoters', b.promoters, 'var(--green, #1a6b45)'],
    ['Passives', b.passives, '#f59e0b'],
    ['Detractors', b.detractors, 'var(--danger, #c0392b)'],
  ] : [];

  return (
    <div style={{ padding: 24 }}>
      {/* Timeframe filter — drives every report on this tab */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {SURVEY_TIMEFRAMES.map(t => (
          <button key={t.days} onClick={() => setDays(t.days)}
            style={{ padding: '7px 14px', borderRadius: 'var(--r-pill, 999px)', border: '1.5px solid',
              borderColor: days === t.days ? 'var(--ink, #0a0a0a)' : 'var(--line, #e4e0d8)',
              background: days === t.days ? 'var(--ink, #0a0a0a)' : 'white',
              color: days === t.days ? 'white' : 'var(--tx-2, #4a4a48)',
              fontSize: 'var(--fs-sm, 0.8125rem)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {t.short} ({t.days} days)
          </button>
        ))}
      </div>
      <SurveyStatsRow g={g} label={tf.label} />
      <Card style={{ padding: 20, maxWidth: 560 }}>
        <div style={{ fontWeight: 600, fontSize: 'var(--fs-base, 0.875rem)', marginBottom: 4 }}>NPS breakdown</div>
        <div style={{ fontSize: 'var(--fs-xs, 0.75rem)', color: 'var(--taupe, #7a7670)', marginBottom: 14 }}>
          {total > 0 ? `From ${total} response${total === 1 ? '' : 's'} in the ${tf.label.toLowerCase()}` : tf.label}
        </div>
        {!g ? (
          <div style={{ padding: '6px 0' }}>
            {[0,1,2].map(i => <Skeleton key={i} width="100%" height={8} style={{ marginBottom: 14 }} />)}
          </div>
        ) : total === 0 ? (
          <EmptyState compact title="No responses yet"
            body="When customers answer your NPS surveys, their promoter / passive / detractor split shows up here." />
        ) : rows.map(([l, n, c]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
            <span style={{ width: 80, fontSize: 'var(--fs-sm, 0.8125rem)', fontWeight: 500 }}>{l}</span>
            <div style={{ flex: 1, height: 8, background: 'var(--cream-2, #f0eeea)', borderRadius: 'var(--r-xs, 8px)', overflow: 'hidden' }}>
              <div style={{ width: `${pct(n)}%`, height: '100%', background: c, borderRadius: 'var(--r-xs, 8px)', transition: 'width .4s ease' }} />
            </div>
            <span style={{ fontSize: 'var(--fs-sm, 0.8125rem)', fontWeight: 600, color: c, width: 64, textAlign: 'right' }}>{n} · {pct(n)}%</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

function ImportTab() {
  const [parsed, setParsed]   = useState([]);   // [{name,email,phone}]
  const [filename, setFilename] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState('');
  const [history, setHistory] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [autoSurvey, setAutoSurvey] = useState(false);
  const [surveyId, setSurveyId] = useState('');
  const [delayDays, setDelayDays] = useState(3);
  const [locations, setLocations] = useState([]);
  const [importLocationId, setImportLocationId] = useState('');

  const API = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => { loadHistory(); loadSurveys(); loadLocations(); }, []);

  async function loadLocations() {
    try { const r = await axios.get(`${API}/locations`, { headers: authHeaders() }); setLocations(r.data.locations || []); } catch (e) { /* single-location or unavailable */ }
  }

  async function loadSurveys() {
    try {
      const res = await axios.get(`${API}/survey-templates`, { headers: authHeaders() });
      const list = res.data.templates || [];
      setSurveys(list);
      setSurveyId(prev => prev || (list.find(t => t.is_default) || list[0] || {}).id || '');
    } catch (e) { /* no surveys yet */ }
  }

  async function loadHistory() {
    try {
      const res = await axios.get(`${API}/contacts/imports`, { headers: authHeaders() });
      setHistory(res.data.imports || []);
    } catch (e) { setHistory([]); }
  }

  function parseCsv(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (!lines.length) return [];
    // Detect header row
    const header = lines[0].toLowerCase();
    const hasHeader = /name|email|phone|segment/.test(header);
    let nameIdx = 0, emailIdx = 1, phoneIdx = 2, segIdx = 3, visitIdx = -1, locIdx = -1;
    if (hasHeader) {
      const cols = lines[0].split(',').map(c => c.trim().toLowerCase());
      nameIdx  = cols.findIndex(c => c.includes('name'));
      emailIdx = cols.findIndex(c => c.includes('email') || c.includes('e-mail'));
      phoneIdx = cols.findIndex(c => c.includes('phone') || c.includes('mobile') || c.includes('cell'));
      segIdx   = cols.findIndex(c => c.includes('segment') || c.includes('tag') || c.includes('group'));
      visitIdx = cols.findIndex(c => c.includes('visit') || c.includes('service date') || c.includes('appointment') || c.includes('completed') || c === 'date');
      locIdx = cols.findIndex(c => c.includes('location') || c.includes('store') || c.includes('branch') || c.includes('site'));
    }
    const dataLines = hasHeader ? lines.slice(1) : lines;
    return dataLines.map(line => {
      const cells = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      return {
        name:    nameIdx  >= 0 ? (cells[nameIdx]  || '') : '',
        email:   emailIdx >= 0 ? (cells[emailIdx] || '') : '',
        phone:   phoneIdx >= 0 ? (cells[phoneIdx] || '') : '',
        segment: segIdx   >= 0 ? (cells[segIdx]   || '') : '',
        visit_date: visitIdx >= 0 ? (cells[visitIdx] || '') : '',
        location: locIdx >= 0 ? (cells[locIdx] || '') : '',
      };
    }).filter(r => r.email);   // email is the only required field
  }

  function downloadTemplate() {
    const csv = [
      'Name,Email,Cell Phone,Segment,Visit Date',
      'Jane Smith,jane@example.com,555-123-4567,vip,2026-06-15',
      'John Doe,john@example.com,,,2026-06-18',
      'Maria Garcia,maria@example.com,555-987-6543,lapsed,',
    ].join('\n') + '\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'swarmreply-contacts-template.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function handleFile(file) {
    if (!file) return;
    setError(''); setResult(null);
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const rows = parseCsv(e.target.result);
        if (!rows.length) { setError('No valid rows found. Each contact needs an email — download the template if you’re unsure of the format.'); setParsed([]); return; }
        setParsed(rows);
      } catch (err) {
        setError('Could not read that file. Please upload a valid CSV.');
      }
    };
    reader.readAsText(file);
  }

  async function doImport() {
    if (!parsed.length) return;
    setImporting(true);
    setError('');
    try {
      const res = await axios.post(`${API}/contacts/import`,
        { rows: parsed, filename, importLocationId: importLocationId || null, autoSurvey: autoSurvey ? { enabled: true, surveyTemplateId: surveyId || null, delayDays: Number(delayDays) || 0 } : null },
        { headers: authHeaders() });
      setResult(res.data);
      setParsed([]);
      setFilename('');
      loadHistory();
    } catch (e) {
      setError(e.response?.data?.error || 'Import failed. Please try again.');
    } finally {
      setImporting(false);
    }
  }

  function fmtDate(iso) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  const selStyle = { border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 'var(--r-xs, 8px)', padding: '7px 10px', fontSize: 'var(--fs-sm, 0.8125rem)', fontFamily: 'inherit', background: 'white', color: 'var(--tx, #1a1a18)' };

  return (
    <div style={{ padding: 24 }}>
      <div className="m-grid-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
        {/* Import card */}
        <Card style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
            <div style={{ fontWeight: 600, fontSize: 'var(--fs-base, 0.875rem)' }}>Import contacts</div>
            <button onClick={downloadTemplate}
              style={{ background: 'none', border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 'var(--r-pill, 999px)', padding: '5px 12px', fontSize: 'var(--fs-xs, 0.75rem)', fontWeight: 600, color: 'var(--tx-2, #4a4a48)', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              ⬇ CSV template
            </button>
          </div>
          <div style={{ fontSize: 'var(--fs-sm, 0.8125rem)', color: 'var(--taupe, #7a7670)', marginBottom: 16, lineHeight: 1.6 }}>Upload a CSV from your PMS, CRM, or POS with <strong>Name, Email, Cell Phone, and Segment</strong> columns. Only email is required. Add an optional <strong>Visit Date</strong> column to automatically survey each contact a few days after their visit. Existing contacts with a matching email or phone are updated, not duplicated — and any mobile numbers are also added to your SMS audience in Campaigns › Contacts.</div>

          {result ? (
            <div style={{ background: 'var(--green-bg, #e8f5ef)', border: '1px solid #bbf7d0', borderRadius: 'var(--r-md, 16px)', padding: '16px 18px', marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 'var(--fs-base, 0.875rem)', color: 'var(--green, #1a6b45)', marginBottom: 4 }}>✓ Import complete</div>
              <div style={{ fontSize: 'var(--fs-sm, 0.8125rem)', color: 'var(--green, #1a6b45)' }}>
                {result.imported} new contact{result.imported !== 1 ? 's' : ''}
                {result.updated > 0 ? `, ${result.updated} updated` : ''}
                {result.skipped > 0 ? `, ${result.skipped} skipped (missing email)` : ''}.
                {result.smsImported > 0 ? ` ${result.smsImported} mobile number${result.smsImported !== 1 ? 's' : ''} added to Campaigns › Contacts.` : ''}
                {result.scheduledSurveys > 0 ? ` ${result.scheduledSurveys} survey${result.scheduledSurveys !== 1 ? 's' : ''} scheduled.` : ''}
              </div>
              <button onClick={() => setResult(null)} style={{ marginTop: 10, padding: '7px 16px', borderRadius: 'var(--r-pill, 999px)', background: 'white', border: '1.5px solid #bbf7d0', cursor: 'pointer', fontSize: 'var(--fs-xs, 0.75rem)', fontWeight: 600, fontFamily: 'inherit', color: 'var(--green, #1a6b45)' }}>Import another</button>
            </div>
          ) : (
            <>
              <div role="button" tabIndex={0} onKeyDown={keyClick} onClick={() => document.getElementById('csv-input').click()}
                style={{ border: '2px dashed var(--line, #e4e0d8)', borderRadius: 'var(--r-md, 16px)', padding: 32, textAlign: 'center', marginBottom: 14, cursor: 'pointer' }}>
                <div style={{ fontSize: 'var(--fs-2xl, 1.5rem)', marginBottom: 8 }}>⇪</div>
                <div style={{ fontWeight: 600, fontSize: 'var(--fs-base, 0.875rem)', marginBottom: 4 }}>
                  {filename ? filename : 'Drop CSV here or click to browse'}
                </div>
                <div style={{ fontSize: 'var(--fs-xs, 0.75rem)', color: 'var(--taupe, #7a7670)' }}>
                  {parsed.length ? `${parsed.length} contact${parsed.length !== 1 ? 's' : ''} ready to import` : 'CSV columns: Name, Email, Cell Phone, Segment, Visit Date (email required)'}
                </div>
                <input id="csv-input" type="file" accept=".csv,text/csv" style={{ display: 'none' }}
                  onChange={e => handleFile(e.target.files[0])} />
              </div>

              {error && <div style={{ background: 'var(--danger-bg, #fee2e2)', border: '1px solid #fca5a5', borderRadius: 'var(--r-xs, 8px)', padding: '9px 12px', fontSize: 'var(--fs-sm, 0.8125rem)', color: 'var(--danger, #c0392b)', marginBottom: 12 }}>✗ {error}</div>}

              {parsed.length > 0 && (
                <div style={{ marginBottom: 12, maxHeight: 140, overflowY: 'auto', border: '1px solid var(--cream-2, #f0eeea)', borderRadius: 'var(--r-xs, 8px)' }}>
                  {parsed.slice(0, 50).map((r, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '7px 12px', borderBottom: '1px solid var(--cream, #f8f7f4)', fontSize: 'var(--fs-xs, 0.75rem)' }}>
                      <span style={{ fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name || '(no name)'}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--taupe, #7a7670)', flexShrink: 0 }}>
                        {r.segment && <span style={{ fontSize: 'var(--fs-2xs, 0.6875rem)', background: 'var(--cream-2, #f0eeea)', color: 'var(--tx-2, #4a4a48)', padding: '1px 7px', borderRadius: 'var(--r-pill, 999px)', textTransform: 'capitalize' }}>{r.segment}</span>}
                        {r.email}
                      </span>
                    </div>
                  ))}
                  {parsed.length > 50 && <div style={{ padding: '7px 12px', fontSize: 'var(--fs-xs, 0.75rem)', color: 'var(--taupe, #7a7670)', textAlign: 'center' }}>+ {parsed.length - 50} more</div>}
                </div>
              )}

              {parsed.length > 0 && locations.length > 1 && (
                <div style={{ border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 'var(--r-md, 16px)', padding: 14, marginBottom: 12, background: '#fcfbf8' }}>
                  <label style={{ display: 'block', fontSize: 'var(--fs-sm, 0.8125rem)', fontWeight: 700, color: 'var(--tx, #1a1a18)', marginBottom: 8 }}>Assign these contacts to a location</label>
                  <select value={importLocationId} onChange={e => setImportLocationId(e.target.value)} style={{ ...selStyle, width: '100%', maxWidth: 340 }}>
                    <option value="">All locations (no specific location)</option>
                    {locations.map((l, i) => <option key={l.id} value={l.id}>{l.business_name || `Location ${i + 1}`}</option>)}
                  </select>
                  <p style={{ fontSize: 'var(--fs-xs, 0.75rem)', color: 'var(--mute, #a8a39a)', margin: '8px 0 0', lineHeight: 1.5 }}>Tags every imported contact with this location, so their surveys use that location&apos;s survey. A &quot;Location&quot; column in your CSV overrides this per row.</p>
                </div>
              )}

              {parsed.length > 0 && parsed.some(r => r.visit_date) && (
                <div style={{ border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 'var(--r-md, 16px)', padding: 14, marginBottom: 12, background: '#fcfbf8' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', fontSize: 'var(--fs-sm, 0.8125rem)', fontWeight: 700, color: 'var(--tx, #1a1a18)' }}>
                    <input type="checkbox" checked={autoSurvey} onChange={e => setAutoSurvey(e.target.checked)} />
                    Send a survey after each visit date
                  </label>
                  {autoSurvey && (
                    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 'var(--fs-sm, 0.8125rem)', color: 'var(--tx-2, #4a4a48)' }}>
                      <span>Send</span>
                      <select value={surveyId} onChange={e => setSurveyId(e.target.value)} style={selStyle}>
                        {surveys.length === 0 && <option value="">default survey</option>}
                        {surveys.map(t => <option key={t.id} value={t.id}>{(t.name || 'Untitled survey') + ((t.config && t.config.type === 'custom') ? ' (Custom)' : ' (NPS)')}</option>)}
                      </select>
                      <input type="number" min="0" max="365" value={delayDays} onChange={e => setDelayDays(e.target.value)} style={{ ...selStyle, width: 56 }} />
                      <span>day{Number(delayDays) === 1 ? '' : 's'} after each visit.</span>
                    </div>
                  )}
                  {autoSurvey && <p style={{ fontSize: 'var(--fs-xs, 0.75rem)', color: 'var(--mute, #a8a39a)', margin: '10px 0 0', lineHeight: 1.5 }}>Contacts whose visit was over 60 days ago are skipped; anyone whose window has already passed is surveyed shortly after import. Tracked in Surveys › Send survey › Scheduled sends.</p>}
                </div>
              )}

              <button onClick={doImport} disabled={!parsed.length || importing}
                style={{ width: '100%', padding: 11, borderRadius: 'var(--r-pill, 999px)', background: (!parsed.length || importing) ? 'var(--cream-2, #f0eeea)' : 'var(--ink, #0a0a0a)', color: (!parsed.length || importing) ? 'var(--mute-2, #c8c4bc)' : 'white', border: 'none', cursor: (!parsed.length || importing) ? 'not-allowed' : 'pointer', fontSize: 'var(--fs-base, 0.875rem)', fontWeight: 700, fontFamily: 'inherit' }}>
                {importing ? 'Importing…' : parsed.length ? `Import ${parsed.length} contact${parsed.length !== 1 ? 's' : ''}` : 'Import contacts'}
              </button>
            </>
          )}
        </Card>

        {/* Recent imports */}
        <Card style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 'var(--fs-base, 0.875rem)', marginBottom: 14 }}>Recent imports</div>
          {history.length === 0 ? (
            <div style={{ fontSize: 'var(--fs-sm, 0.8125rem)', color: 'var(--taupe, #7a7670)', textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 'var(--fs-2xl, 1.5rem)', marginBottom: 6, opacity: .5 }}>📥</div>
              No imports yet.
            </div>
          ) : history.map(imp => (
            <div key={imp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--cream, #f8f7f4)', borderRadius: 'var(--r-sm, 10px)', marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 'var(--fs-sm, 0.8125rem)' }}>{imp.filename}</div>
                <div style={{ fontSize: 'var(--fs-xs, 0.75rem)', color: 'var(--taupe, #7a7670)', marginTop: 2 }}>{imp.imported} imported{imp.skipped > 0 ? ` · ${imp.skipped} skipped` : ''} · {fmtDate(imp.created_at)}</div>
              </div>
              <span style={{ background: 'var(--green-bg, #e8f5ef)', color: 'var(--green, #1a6b45)', fontSize: 'var(--fs-2xs, 0.6875rem)', fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--r-pill, 999px)' }}>Complete</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

export default function Grow() {
  const router = useRouter();
  const [tab, setTab] = useState('requests');

  // Deep link: /dashboard/grow?tab=… lands on the right tab.
  // The retired "Surveys & NPS" tab now redirects to the dedicated survey builder.
  useEffect(() => {
    const t = router.query?.tab ? String(router.query.tab) : '';
    if (t === 'surveys') { router.replace('/dashboard/surveys'); return; }
    if (['requests', 'templates', 'bulk', 'import'].includes(t)) setTab(t);
  }, [router.query?.tab]);

  return (
    <DashboardLayout title="Grow">
      <div style={{ background: 'white', borderBottom: '1px solid var(--line, #e4e0d8)', padding: '0 24px', display: 'flex', gap: 2 }} className="tabs-scrollable">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '14px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: 'var(--fs-sm, 0.8125rem)', fontWeight: tab === t.id ? 700 : 500, fontFamily: 'inherit',
            color: tab === t.id ? 'var(--ink, #0a0a0a)' : 'var(--taupe, #7a7670)',
            borderBottom: tab === t.id ? '2px solid var(--ink, #0a0a0a)' : '2px solid transparent',
          }}>{t.label}</button>
        ))}
      </div>
      {tab === 'requests'  && <RequestsTab />}
      {tab === 'templates' && <TemplatesTab />}
      {tab === 'bulk'     && <BulkSendTab />}
      {tab === 'import'   && <ImportTab />}
    </DashboardLayout>
  );
}
