// ============================================
// pages/dashboard/pulse.js
// Reports — eight insight reports built on the customer's own data
// (GET /api/reports/insights). Signature interaction: bars bounce while a
// report loads, then settle into place. Demo accounts render the same reports
// from their seeded data, so they look fully populated.
// ============================================

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { getInsights } from '../../utils/api';
import EmptyState from '../../components/EmptyState';
import { CountUp } from '../../components/ui';
import axios from 'axios';
import { useRouter } from 'next/router';

const API = process.env.NEXT_PUBLIC_API_URL;
function authHeaders() {
  const t = typeof window !== 'undefined' ? localStorage.getItem('swarmreply_token') : '';
  return t ? { Authorization: `Bearer ${t}` } : {};
}

const SERIF = "'Playfair Display', serif";
const C = {
  ink: '#0a0a0a', paper: '#faf8f3', page: '#ece8e1', line: '#e4e0d8',
  honey: '#f5c842', amber: '#d4a515', green: '#1a6b45', red: '#c0392b',
  amberSoft: '#fbf2d6', greenSoft: '#e8f5ef', redSoft: '#fbe9e7',
  taupe: '#7a7670', faint: '#a39e93', card: '#ffffff', soft: '#f8f7f4',
};

const RANGES = [
  { id: '30d', label: '30 days'  },
  { id: '90d', label: '90 days'  },
  { id: '12m', label: '12 months'},
  { id: 'all', label: 'All time' },
];

// ── Formatters ───────────────────────────────
const fmtInt   = (n) => (n == null ? '—' : Number(n).toLocaleString());
const fmtRating = (n) => (n == null ? '—' : Number(n).toFixed(1));
const fmtPct   = (n) => (n == null ? '—' : `${Math.round(n)}%`);
const fmtHours = (h) => {
  if (h == null) return '—';
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 48) return `${h % 1 === 0 ? h : h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
};
const monthLabel = (iso) => { const d = new Date(iso + 'T00:00:00'); return isNaN(d) ? iso : d.toLocaleDateString('en-US', { month: 'short' }); };
const weekLabel  = (iso) => { const d = new Date(iso + 'T00:00:00'); return isNaN(d) ? iso : d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }); };
const channelLabel = (c) => {
  const k = (c || '').toLowerCase();
  if (k === 'sms') return 'SMS';
  if (k === 'api') return 'API';
  if (k === 'gbp') return 'Google';
  return c ? c.charAt(0).toUpperCase() + c.slice(1) : 'Other';
};

// ── Injected styles (keyframes + responsive rail) ─────────────
function ReportStyles() {
  return (
    <style>{`
      @keyframes rbounce { 0%,100% { height: 20%; } 50% { height: 82%; } }
      @keyframes rfade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
      .rbar { will-change: height; }
      .rbar--bounce { animation: rbounce .85s ease-in-out infinite; }
      .rep-fade { animation: rfade .45s cubic-bezier(.2,.7,.3,1) both; }
      .rep-shell { display: grid; grid-template-columns: 212px 1fr; gap: 24px; padding: 24px 28px; align-items: start; }
      .rep-rail { display: flex; flex-direction: column; gap: 3px; position: sticky; top: 16px; }
      .rep-railbtn { display: flex; align-items: center; gap: 11px; padding: 10px 12px; border-radius: 11px; border: none; background: transparent; cursor: pointer; font-family: inherit; font-size: .85rem; font-weight: 500; color: ${C.taupe}; text-align: left; width: 100%; transition: background .15s, color .15s; }
      .rep-railbtn:hover { background: ${C.soft}; color: ${C.ink}; }
      .rep-railbtn--on { background: ${C.ink}; color: #fff; font-weight: 600; }
      .rep-railbtn--on:hover { background: ${C.ink}; color: #fff; }
      .rep-card { background: ${C.card}; border: 1.5px solid ${C.line}; border-radius: 16px; padding: 22px; }
      @media (max-width: 900px) {
        .rep-shell { grid-template-columns: 1fr; padding: 16px; gap: 16px; }
        .rep-rail { flex-direction: row; overflow-x: auto; position: static; gap: 6px; padding-bottom: 4px; -webkit-overflow-scrolling: touch; }
        .rep-railbtn { white-space: nowrap; width: auto; }
        .rep-railbtn span.rep-railtext { display: inline; }
      }
      @media (prefers-reduced-motion: reduce) {
        .rbar--bounce { animation: none !important; height: 48% !important; }
        .rbar, .rep-fill, .rep-ringfill { transition: none !important; }
        .rep-fade { animation: none !important; }
      }
    `}</style>
  );
}

// ── Small primitives ─────────────────────────
function Eyebrow({ children }) {
  return <div style={{ fontSize: '.68rem', fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase', color: C.faint }}>{children}</div>;
}

function Delta({ value, fmt = (v) => v, invert = false, suffix = '' }) {
  if (value == null || value === 0) return <span style={{ fontSize: '.72rem', color: C.taupe, fontWeight: 600 }}>no change</span>;
  const up = value > 0;
  const good = invert ? !up : up;
  const color = good ? C.green : C.red;
  return <span style={{ fontSize: '.72rem', color, fontWeight: 700, whiteSpace: 'nowrap' }}>{up ? '▲' : '▼'} {fmt(Math.abs(value))}{suffix}</span>;
}

function StatTile({ label, value, sub, delta }) {
  return (
    <div className="rep-card" style={{ padding: '16px 18px' }}>
      <Eyebrow>{label}</Eyebrow>
      <div style={{ fontFamily: SERIF, fontSize: '1.95rem', fontWeight: 700, color: C.ink, lineHeight: 1.05, letterSpacing: '-.01em', margin: '10px 0 7px' }}><CountUp value={value} /></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {delta}
        {sub && <span style={{ fontSize: '.74rem', color: C.taupe }}>{sub}</span>}
      </div>
    </div>
  );
}

function Insight({ children }) {
  return (
    <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start', background: C.amberSoft, border: `1px solid #f0e3b8`, borderRadius: 13, padding: '13px 16px', marginBottom: 22 }}>
      <div style={{ width: 7, height: 7, borderRadius: 50, background: C.amber, flexShrink: 0, marginTop: 7 }} />
      <div style={{ fontSize: '.86rem', color: '#5c5238', lineHeight: 1.55 }}>{children}</div>
    </div>
  );
}

function SectionTitle({ children, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <div style={{ fontWeight: 600, fontSize: '.9rem', color: C.ink }}>{children}</div>
      {right}
    </div>
  );
}

// Vertical bars — bounce while loading, settle when data arrives.
function BouncyBars({ values, loading, color = C.ink, height = 168, fmt = (v) => v, labelFor }) {
  const peak = Math.max(1, ...((values || []).map((v) => v.value)));
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    if (loading) { setGrown(false); return; }
    setGrown(false);
    let a, b;
    a = requestAnimationFrame(() => { b = requestAnimationFrame(() => setGrown(true)); });
    return () => { cancelAnimationFrame(a); cancelAnimationFrame(b); };
  }, [loading, values]);

  const items = loading ? Array.from({ length: 14 }) : values;
  const dense = items.length > 18;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: dense ? 3 : 7, height }}>
      {items.map((v, i) => {
        const pct = loading ? 0 : (v.value / peak) * 100;
        return (
          <div key={i} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
            {!loading && !dense && <div style={{ fontSize: '.6rem', color: C.taupe, opacity: grown ? 1 : 0, transition: 'opacity .5s .2s' }}>{fmt(v.value)}</div>}
            <div
              className={loading ? 'rbar rbar--bounce' : 'rbar'}
              style={{
                width: '100%',
                height: loading ? undefined : grown ? `max(${pct}%, 3px)` : '0%',
                background: color,
                borderRadius: dense ? '2px 2px 0 0' : '4px 4px 0 0',
                animationDelay: loading ? `${-(i * 0.13)}s` : undefined,
                transition: loading ? undefined : 'height .7s cubic-bezier(.34,1.56,.64,1)',
                transitionDelay: loading ? undefined : `${i * 0.028}s`,
              }}
            />
            {!loading && !dense && <div style={{ fontSize: '.58rem', color: C.faint }}>{labelFor ? labelFor(v, i) : v.label}</div>}
          </div>
        );
      })}
    </div>
  );
}

// Horizontal labelled bars (distribution, themes, channels, reasons).
function HBars({ rows, color = C.ink, max, trackBg = '#f0eeea' }) {
  const peak = max || Math.max(1, ...rows.map((r) => r.value));
  const [grown, setGrown] = useState(false);
  useEffect(() => { let a, b; a = requestAnimationFrame(() => { b = requestAnimationFrame(() => setGrown(true)); }); return () => { cancelAnimationFrame(a); cancelAnimationFrame(b); }; }, [rows]);
  return (
    <div>
      {rows.map((r, i) => {
        const col = typeof color === 'function' ? color(r) : color;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 11 }}>
            <span style={{ width: 116, fontSize: '.8rem', color: C.ink, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.label}</span>
            <div style={{ flex: 1, height: 11, background: trackBg, borderRadius: 50, overflow: 'hidden' }}>
              <div className="rep-fill" style={{ width: grown ? `${(r.value / peak) * 100}%` : '0%', height: '100%', background: col, borderRadius: 50, transition: `width .75s cubic-bezier(.3,1.1,.4,1) ${i * 0.04}s` }} />
            </div>
            <span style={{ width: 74, textAlign: 'right', fontSize: '.76rem', color: C.taupe, flexShrink: 0 }}>{r.sub != null ? r.sub : r.value}</span>
          </div>
        );
      })}
    </div>
  );
}

// Circular progress ring with a centered value.
function Ring({ value, max = 100, size = 132, stroke = 11, color = C.amber, children }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, (value || 0) / max));
  const [grown, setGrown] = useState(false);
  useEffect(() => { setGrown(false); let a, b; a = requestAnimationFrame(() => { b = requestAnimationFrame(() => setGrown(true)); }); return () => { cancelAnimationFrame(a); cancelAnimationFrame(b); }; }, [value]);
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#efece5" strokeWidth={stroke} />
        <circle className="rep-ringfill" cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - (grown ? pct : 0))}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1.05s cubic-bezier(.34,1.4,.6,1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>{children}</div>
    </div>
  );
}

// Segmented stacked bar (promoter/passive/detractor).
function SegBar({ segments, height = 16 }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const [grown, setGrown] = useState(false);
  useEffect(() => { let a, b; a = requestAnimationFrame(() => { b = requestAnimationFrame(() => setGrown(true)); }); return () => { cancelAnimationFrame(a); cancelAnimationFrame(b); }; }, [segments]);
  return (
    <div style={{ display: 'flex', height, borderRadius: 50, overflow: 'hidden', background: '#f0eeea' }}>
      {segments.map((s, i) => (
        <div key={i} title={`${s.label}: ${s.value}`} style={{ width: grown ? `${(s.value / total) * 100}%` : '0%', background: s.color, transition: `width .8s cubic-bezier(.3,1,.4,1) ${i * 0.1}s` }} />
      ))}
    </div>
  );
}

// Avg-rating line over the same periods (SVG).
function TrendLine({ points, height = 70 }) {
  const vals = points.map((p) => p.avg).filter((v) => v != null);
  if (vals.length < 2) return null;
  const min = Math.min(3, ...vals) - 0.2, max = 5.05;
  const W = 100, H = height;
  const xy = points.map((p, i) => {
    const x = points.length === 1 ? W / 2 : (i / (points.length - 1)) * W;
    const y = p.avg == null ? null : H - ((p.avg - min) / (max - min)) * H;
    return y == null ? null : `${x.toFixed(2)},${y.toFixed(2)}`;
  }).filter(Boolean);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
      <polyline points={xy.join(' ')} fill="none" stroke={C.amber} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {points.map((p, i) => {
        if (p.avg == null) return null;
        const x = points.length === 1 ? W / 2 : (i / (points.length - 1)) * W;
        const y = H - ((p.avg - min) / (max - min)) * H;
        return <circle key={i} cx={x} cy={y} r="1.6" fill={C.amber} vectorEffect="non-scaling-stroke" />;
      })}
    </svg>
  );
}

function NoData({ icon = '📊', title, body }) {
  return <div style={{ padding: '32px 8px' }}><EmptyState icon={icon} title={title} description={body} /></div>;
}

// ── Loading state (the signature bounce) ─────────────
function LoadingState() {
  return (
    <div>
      <div style={{ height: 46, background: C.soft, borderRadius: 12, marginBottom: 22, maxWidth: 460 }} />
      <div className="rep-card">
        <div style={{ width: 150, height: 12, background: C.soft, borderRadius: 6, marginBottom: 22 }} />
        <BouncyBars loading values={[]} height={180} />
      </div>
    </div>
  );
}

// ============================================================
// REPORT 1 — Overview / Reputation Scorecard
// ============================================================
function ReportOverview({ d }) {
  const s = d.scorecard;
  if (!d.hasData) return <NoData title="No reviews yet" body="Your reputation scorecard fills in as reviews arrive. Send a few requests to get started." />;
  const score = s.reputationScore;
  const scoreColor = score == null ? C.taupe : score >= 80 ? C.green : score >= 60 ? C.amber : C.red;
  const grade = score == null ? '' : score >= 85 ? 'Excellent' : score >= 70 ? 'Strong' : score >= 55 ? 'Fair' : 'Needs work';
  const trend = d.trend.points.map((p) => ({ value: p.count, label: d.trend.bucket === 'month' ? monthLabel(p.period) : weekLabel(p.period) }));

  return (
    <div className="rep-fade">
      <Insight>
        Your reputation scores <strong>{score ?? '—'}/100</strong>{grade ? ` (${grade.toLowerCase()})` : ''}, on a {fmtRating(s.avgRating)}★ average across {fmtInt(s.totalReviews)} reviews.
        {s.responseRateDelta != null && s.responseRateDelta !== 0 ? ` Your response rate is ${s.responseRateDelta > 0 ? 'up' : 'down'} ${Math.abs(s.responseRateDelta)} points vs. the prior period.` : ''}
      </Insight>

      <div className="rep-card" style={{ display: 'flex', gap: 28, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <Ring value={score || 0} color={scoreColor}>
          <div style={{ fontFamily: SERIF, fontSize: '2.5rem', fontWeight: 700, color: C.ink, lineHeight: 1 }}><CountUp value={score ?? '—'} /></div>
          <div style={{ fontSize: '.62rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: C.faint, marginTop: 3 }}>Score</div>
        </Ring>
        <div style={{ flex: 1, minWidth: 220 }}>
          <Eyebrow>Reputation score</Eyebrow>
          <div style={{ fontFamily: SERIF, fontSize: '1.4rem', fontWeight: 700, color: scoreColor, margin: '6px 0 4px' }}>{grade}</div>
          <div style={{ marginBottom: 10 }}><Delta value={s.reputationScoreDelta} suffix=" pts" /></div>
          <div style={{ fontSize: '.82rem', color: C.taupe, lineHeight: 1.55 }}>A blend of your rating, response rate, customer loyalty, and review momentum.</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
        <StatTile label="Avg rating" value={`${fmtRating(s.avgRating)} ★`} delta={<Delta value={s.avgRatingDelta} fmt={(v) => v.toFixed(1)} />} />
        <StatTile label="Reviews" value={fmtInt(s.totalReviews)} delta={<Delta value={s.reviewsDelta} fmt={fmtInt} />} sub="this period" />
        <StatTile label="Response rate" value={fmtPct(s.responseRate)} delta={<Delta value={s.responseRateDelta} suffix=" pts" />} />
        <StatTile label="NPS" value={s.nps == null ? '—' : s.nps} delta={<Delta value={s.npsDelta} />} sub={s.nps == null ? 'no surveys yet' : ''} />
      </div>

      <div className="rep-card">
        <SectionTitle>Review momentum</SectionTitle>
        {trend.length ? <BouncyBars values={trend} color={C.ink} fmt={fmtInt} /> : <div style={{ color: C.taupe, fontSize: '.82rem' }}>No reviews in this period.</div>}
      </div>
    </div>
  );
}

// ============================================================
// REPORT 2 — Ratings Trend
// ============================================================
function ReportRatings({ d }) {
  if (!d.hasData) return <NoData icon="⭐" title="No rating data yet" body="Once reviews come in, you'll see how your rating moves over time." />;
  const pts = d.trend.points;
  const bars = pts.map((p) => ({ value: p.count, label: d.trend.bucket === 'month' ? monthLabel(p.period) : weekLabel(p.period) }));
  const first = pts.find((p) => p.avg != null)?.avg;
  const last = [...pts].reverse().find((p) => p.avg != null)?.avg;
  const dir = first != null && last != null ? +(last - first).toFixed(1) : null;
  const dist = d.distribution;
  const distTotal = dist.reduce((a, x) => a + x.count, 0) || 1;

  return (
    <div className="rep-fade">
      <Insight>
        {dir == null ? 'Your average rating holds steady this period.' : dir > 0 ? `Your average rating climbed ${dir}★ over this period — momentum is in your favor.` : dir < 0 ? `Your average rating slipped ${Math.abs(dir)}★ over this period. Worth a closer look at recent reviews.` : 'Your average rating held steady this period.'}
      </Insight>

      <div className="rep-card" style={{ marginBottom: 20 }}>
        <SectionTitle right={<span style={{ fontSize: '.74rem', color: C.amber, fontWeight: 700 }}>— avg rating</span>}>Volume &amp; rating over time</SectionTitle>
        <BouncyBars values={bars} color={C.ink} fmt={fmtInt} />
        <div style={{ marginTop: 10, paddingTop: 14, borderTop: `1px solid ${C.line}` }}><TrendLine points={pts} /></div>
      </div>

      <div className="rep-card">
        <SectionTitle>Rating distribution</SectionTitle>
        <HBars
          rows={dist.map((x) => ({ label: `${x.stars} ★`, value: x.count, sub: `${x.count} · ${Math.round((x.count / distTotal) * 100)}%` }))}
          color={(r) => { const st = parseInt(r.label); return st >= 4 ? C.green : st === 3 ? C.amber : C.red; }}
        />
      </div>
    </div>
  );
}

// ============================================================
// REPORT 3 — Review Velocity & Goal
// ============================================================
function ReportVelocity({ d }) {
  if (!d.hasData) return <NoData icon="🚀" title="No reviews yet" body="Set the pace — send review requests and watch your velocity build here." />;
  const pts = d.trend.points;
  const bars = pts.map((p) => ({ value: p.count, label: d.trend.bucket === 'month' ? monthLabel(p.period) : weekLabel(p.period) }));
  const total = pts.reduce((a, p) => a + p.count, 0);
  const perBucket = pts.length ? total / pts.length : 0;
  const monthly = d.trend.bucket === 'month' ? perBucket : perBucket * 4.33;
  const GOAL = 25; // monthly target
  const goalPct = Math.min(100, Math.round((monthly / GOAL) * 100));

  return (
    <div className="rep-fade">
      <Insight>
        You're averaging about <strong>{monthly.toFixed(0)} reviews/month</strong>{GOAL ? `, ${goalPct >= 100 ? 'ahead of' : `${goalPct}% of`} a ${GOAL}/month goal.` : '.'} Keep requests flowing to hold the pace.
      </Insight>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
        <StatTile label="Reviews this period" value={fmtInt(total)} />
        <StatTile label="Pace" value={`${monthly.toFixed(0)}/mo`} />
        <StatTile label="Last 30 days" value={fmtInt(d.scorecard.reviews30d)} sub="new reviews" />
      </div>

      <div className="rep-card" style={{ marginBottom: 20 }}>
        <SectionTitle right={<span style={{ fontSize: '.74rem', color: C.taupe }}>{goalPct}% of goal</span>}>Monthly goal</SectionTitle>
        <div style={{ height: 14, background: '#f0eeea', borderRadius: 50, overflow: 'hidden' }}>
          <div className="rep-fill" style={{ width: `${goalPct}%`, height: '100%', background: goalPct >= 100 ? C.green : C.amber, borderRadius: 50, transition: 'width .8s cubic-bezier(.3,1.1,.4,1)' }} />
        </div>
      </div>

      <div className="rep-card">
        <SectionTitle>New reviews per {d.trend.bucket === 'month' ? 'month' : 'week'}</SectionTitle>
        <BouncyBars values={bars} color={C.amber} fmt={fmtInt} />
      </div>
    </div>
  );
}

// ============================================================
// REPORT 4 — Response Performance
// ============================================================
function ReportResponse({ d }) {
  if (!d.hasData) return <NoData icon="⚡" title="No reviews to respond to yet" body="When reviews arrive, you'll see how quickly and how often you reply." />;
  const r = d.response;
  const longer = Math.max(0, r.repliedCount - r.within48);
  return (
    <div className="rep-fade">
      <Insight>
        You reply to <strong>{fmtPct(r.responseRate)}</strong> of reviews{r.repliedCount ? `, typically within ${fmtHours(r.medianHours)}.` : '.'} {r.repliedCount ? `${r.within24Pct}% get a response inside 24 hours.` : ''}
      </Insight>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 20 }}>
        <StatTile label="Response rate" value={fmtPct(r.responseRate)} delta={<Delta value={d.scorecard.responseRateDelta} suffix=" pts" />} />
        <StatTile label="Median time" value={fmtHours(r.medianHours)} />
        <StatTile label="Average time" value={fmtHours(r.avgHours)} delta={<Delta value={d.scorecard.responseHoursDelta} fmt={(v) => fmtHours(v)} invert />} />
        <StatTile label="Within 24h" value={fmtPct(r.within24Pct)} sub={`${fmtInt(r.within24)} replies`} />
      </div>

      <div className="rep-card">
        <SectionTitle>How fast you reply</SectionTitle>
        {r.repliedCount ? (
          <HBars
            color={(row) => row.label.includes('24') ? C.green : row.label.includes('48') ? C.amber : C.taupe}
            rows={[
              { label: 'Within 24h', value: r.within24, sub: `${r.within24Pct}%` },
              { label: '24–48h', value: Math.max(0, r.within48 - r.within24), sub: `${Math.max(0, r.within48Pct - r.within24Pct)}%` },
              { label: 'Over 48h', value: longer, sub: `${r.repliedCount ? Math.round((longer / r.repliedCount) * 100) : 0}%` },
            ]}
            max={r.repliedCount}
          />
        ) : <div style={{ color: C.taupe, fontSize: '.82rem' }}>No replies posted in this period yet.</div>}
      </div>
    </div>
  );
}

// ============================================================
// REPORT 5 — Sentiment & Themes
// ============================================================
function ReportSentiment({ d }) {
  if (!d.hasData) return <NoData icon="💬" title="No reviews to analyze yet" body="As reviews come in, recurring praise and complaints surface here." />;
  const s = d.sentiment;
  const top = s.complaintThemes[0];
  const topPraise = s.praiseThemes[0];
  return (
    <div className="rep-fade">
      <Insight>
        {topPraise ? <>Customers most often praise <strong>{topPraise.theme.toLowerCase()}</strong>.</> : 'Sentiment is mostly positive.'}{' '}
        {top ? <>The most common complaint theme is <strong>{top.theme.toLowerCase()}</strong> — a clear place to focus.</> : 'No recurring complaints stand out.'}
      </Insight>

      <div className="rep-card" style={{ marginBottom: 20 }}>
        <SectionTitle>Sentiment mix</SectionTitle>
        <SegBar segments={[
          { label: 'Positive', value: s.positive, color: C.green },
          { label: 'Neutral', value: s.neutral, color: C.amber },
          { label: 'Negative', value: s.negative, color: C.red },
        ]} />
        <div style={{ display: 'flex', gap: 18, marginTop: 12, flexWrap: 'wrap' }}>
          {[['Positive', s.positive, C.green], ['Neutral', s.neutral, C.amber], ['Negative', s.negative, C.red]].map(([l, v, c]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '.8rem', color: C.taupe }}>
              <span style={{ width: 9, height: 9, borderRadius: 50, background: c }} />{l} · <strong style={{ color: C.ink }}>{v}</strong>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="m-grid-1">
        <div className="rep-card">
          <SectionTitle>What customers love</SectionTitle>
          {s.praiseThemes.length ? <HBars rows={s.praiseThemes.map((t) => ({ label: t.theme, value: t.count }))} color={C.green} /> : <div style={{ color: C.taupe, fontSize: '.82rem' }}>No themes detected yet.</div>}
          {topPraise?.example && <div style={{ marginTop: 12, fontSize: '.8rem', color: C.taupe, fontStyle: 'italic', lineHeight: 1.5, borderLeft: `3px solid ${C.green}`, paddingLeft: 11 }}>“{topPraise.example}”</div>}
        </div>
        <div className="rep-card">
          <SectionTitle>What to improve</SectionTitle>
          {s.complaintThemes.length ? <HBars rows={s.complaintThemes.map((t) => ({ label: t.theme, value: t.count }))} color={C.red} /> : <div style={{ color: C.taupe, fontSize: '.82rem' }}>No recurring complaints — nice work.</div>}
          {top?.example && <div style={{ marginTop: 12, fontSize: '.8rem', color: C.taupe, fontStyle: 'italic', lineHeight: 1.5, borderLeft: `3px solid ${C.red}`, paddingLeft: 11 }}>“{top.example}”</div>}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// REPORT 6 — Location Leaderboard
// ============================================================
function ReportLocations({ d }) {
  const rows = (d.leaderboard || []).filter((l) => l.reviews > 0);
  if (rows.length === 0) return <NoData icon="📍" title="No location data yet" body="Reviews tied to each location will rank here once they arrive." />;
  const single = d.locations.length <= 1;
  const best = rows[0];
  const maxRev = Math.max(1, ...rows.map((l) => l.reviews));

  return (
    <div className="rep-fade">
      <Insight>
        {single ? <>Showing performance for <strong>{best.name}</strong>.</> : <><strong>{best.name}</strong> leads on rating ({fmtRating(best.avgRating)}★). {rows.length} locations ranked below.</>}
      </Insight>

      <div className="rep-card" style={{ padding: 0, overflow: 'hidden' }}>
        {rows.map((l, i) => (
          <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '15px 20px', borderBottom: i < rows.length - 1 ? `1px solid ${C.line}` : 'none' }}>
            {!single && <div style={{ fontFamily: SERIF, fontSize: '1.1rem', fontWeight: 700, color: i === 0 ? C.amber : C.faint, width: 22 }}>{i + 1}</div>}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '.86rem', color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.name}</div>
              <div style={{ height: 7, background: '#f0eeea', borderRadius: 50, overflow: 'hidden', marginTop: 7, maxWidth: 260 }}>
                <div className="rep-fill" style={{ width: `${(l.reviews / maxRev) * 100}%`, height: '100%', background: C.ink, borderRadius: 50, transition: `width .7s cubic-bezier(.3,1.1,.4,1) ${i * 0.05}s` }} />
              </div>
            </div>
            <div style={{ textAlign: 'right', minWidth: 64 }}>
              <div style={{ fontFamily: SERIF, fontSize: '1.05rem', fontWeight: 700, color: C.ink }}>{fmtRating(l.avgRating)}★</div>
              <div style={{ fontSize: '.68rem', color: C.faint }}>rating</div>
            </div>
            <div style={{ textAlign: 'right', minWidth: 58 }}>
              <div style={{ fontFamily: SERIF, fontSize: '1.05rem', fontWeight: 700, color: C.ink }}>{l.reviews}</div>
              <div style={{ fontSize: '.68rem', color: C.faint }}>reviews</div>
            </div>
            <div style={{ textAlign: 'right', minWidth: 58 }}>
              <div style={{ fontFamily: SERIF, fontSize: '1.05rem', fontWeight: 700, color: l.responseRate >= 70 ? C.green : C.ink }}>{l.responseRate}%</div>
              <div style={{ fontSize: '.68rem', color: C.faint }}>replied</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// REPORT 7 — Request → Review Funnel
// ============================================================
function ReportFunnel({ d }) {
  const f = d.funnel;
  if (!f.sent) return <NoData icon="🔁" title="No requests sent yet" body="Send review requests from Grow and the conversion funnel will appear here." />;
  const clickPct = f.sent ? Math.round((f.clicked / f.sent) * 100) : 0;
  const compPct = f.sent ? Math.round((f.completed / f.sent) * 100) : 0;
  const steps = [
    { label: 'Requests sent', value: f.sent, pct: 100, color: C.ink },
    { label: 'Links clicked', value: f.clicked, pct: clickPct, color: C.amber },
    { label: 'Reviews completed', value: f.completed, pct: compPct, color: C.green },
  ];
  return (
    <div className="rep-fade">
      <Insight>
        Of <strong>{fmtInt(f.sent)}</strong> requests sent, <strong>{compPct}%</strong> turned into completed reviews{clickPct ? `, with ${clickPct}% clicking through.` : '.'}
      </Insight>

      <div className="rep-card" style={{ marginBottom: 20 }}>
        <SectionTitle>Conversion funnel</SectionTitle>
        {steps.map((st, i) => (
          <div key={st.label} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <span style={{ fontSize: '.82rem', color: C.ink, fontWeight: 500 }}>{st.label}</span>
              <span style={{ fontSize: '.8rem', color: C.taupe }}><strong style={{ color: C.ink, fontFamily: SERIF, fontSize: '1rem' }}>{fmtInt(st.value)}</strong> · {st.pct}%</span>
            </div>
            <div style={{ height: 13, background: '#f0eeea', borderRadius: 7, overflow: 'hidden' }}>
              <div className="rep-fill" style={{ width: `${st.pct}%`, height: '100%', background: st.color, borderRadius: 7, transition: `width .8s cubic-bezier(.34,1.4,.5,1) ${i * 0.12}s` }} />
            </div>
          </div>
        ))}
      </div>

      {f.byChannel.length > 0 && (
        <div className="rep-card">
          <SectionTitle>By channel</SectionTitle>
          <HBars rows={f.byChannel.map((c) => ({ label: channelLabel(c.channel), value: c.sent, sub: `${c.completed}/${c.sent} done` }))} color={C.ink} />
        </div>
      )}
    </div>
  );
}

// ============================================================
// REPORT 8 — NPS & Loyalty
// ============================================================
function ReportNps({ d, range }) {
  const n = d.nps;
  const [questions, setQuestions] = useState([]);
  useEffect(() => {
    let active = true;
    const days = ({ '30d': 30, '90d': 90, '12m': 365, all: 3650 })[range] || 90;
    axios.get(`${API}/reports/survey-questions?days=${days}`, { headers: authHeaders() })
      .then((r) => { if (active) setQuestions(r.data.questions || []); })
      .catch(() => {});
    return () => { active = false; };
  }, [range]);
  if (!n.total) return <NoData icon="💛" title="No survey responses yet" body="When customers complete NPS surveys, loyalty and the reasons behind it show here." />;
  const npsColor = n.score == null ? C.taupe : n.score >= 50 ? C.green : n.score >= 0 ? C.amber : C.red;
  return (
    <div className="rep-fade">
      <Insight>
        Your NPS is <strong>{n.score}</strong> from {fmtInt(n.total)} responses. <strong>{n.wouldReturnPct}%</strong> say they'd return.
      </Insight>

      <div className="rep-card" style={{ display: 'flex', gap: 28, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <Ring value={(n.score || 0) + 100} max={200} color={npsColor}>
          <div style={{ fontFamily: SERIF, fontSize: '2.3rem', fontWeight: 700, color: C.ink, lineHeight: 1 }}><CountUp value={n.score} /></div>
          <div style={{ fontSize: '.62rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: C.faint, marginTop: 3 }}>NPS</div>
        </Ring>
        <div style={{ flex: 1, minWidth: 240 }}>
          <Eyebrow>Promoters · Passives · Detractors</Eyebrow>
          <div style={{ margin: '12px 0' }}>
            <SegBar segments={[
              { label: 'Promoters', value: n.promoters, color: C.green },
              { label: 'Passives', value: n.passives, color: C.amber },
              { label: 'Detractors', value: n.detractors, color: C.red },
            ]} />
          </div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: '.8rem', color: C.taupe }}>
            <span><span style={{ color: C.green, fontWeight: 700 }}>{n.promoters}</span> promoters</span>
            <span><span style={{ color: C.amber, fontWeight: 700 }}>{n.passives}</span> passives</span>
            <span><span style={{ color: C.red, fontWeight: 700 }}>{n.detractors}</span> detractors</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
        <StatTile label="Would return" value={fmtPct(n.wouldReturnPct)} />
        <StatTile label="NPS change" value={n.scoreDelta == null ? '—' : (n.scoreDelta > 0 ? `+${n.scoreDelta}` : n.scoreDelta)} delta={<Delta value={n.scoreDelta} />} />
      </div>

      {n.reasons.length > 0 && (
        <div className="rep-card">
          <SectionTitle>Top reasons detractors gave</SectionTitle>
          <HBars rows={n.reasons.map((r) => ({ label: r.reason, value: r.count }))} color={C.red} />
        </div>
      )}

      {questions.length > 0 && (
        <div className="rep-card" style={{ marginTop: 20 }}>
          <SectionTitle>Survey question results</SectionTitle>
          {questions.map((qd, qi) => (
            <div key={qi} style={{ marginBottom: qi < questions.length - 1 ? 22 : 0, paddingBottom: qi < questions.length - 1 ? 22 : 0, borderBottom: qi < questions.length - 1 ? `1px solid ${C.line}` : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 10 }}>
                <div style={{ fontSize: '.88rem', fontWeight: 700, color: C.ink }}>{qd.question}</div>
                {qd.avg != null && <div style={{ fontSize: '.78rem', color: C.taupe, whiteSpace: 'nowrap' }}>avg <strong style={{ color: C.ink }}>{qd.avg}</strong></div>}
              </div>
              <HBars rows={qd.options.map((o) => ({ label: String(o.value), value: o.count }))} color={['rating', 'star', 'smiley', 'nps'].includes(qd.type) ? C.honey : C.green} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const REPORTS = [
  { id: 'overview', name: 'Overview',         icon: 'M3 13h4v6H3zM10 5h4v14h-4zM17 9h4v10h-4z',                         Comp: ReportOverview },
  { id: 'ratings',  name: 'Ratings trend',    icon: 'M3 17l5-5 4 3 7-8',                                                  Comp: ReportRatings  },
  { id: 'velocity', name: 'Review velocity',  icon: 'M13 3L4 14h6l-1 7 9-11h-6z',                                         Comp: ReportVelocity },
  { id: 'response', name: 'Response speed',   icon: 'M12 8v4l3 2M12 21a9 9 0 100-18 9 9 0 000 18z',                       Comp: ReportResponse },
  { id: 'sentiment',name: 'Sentiment',        icon: 'M21 12a9 9 0 11-9-9 7 7 0 009 9zM8 13s1.5 2 4 2 4-2 4-2',            Comp: ReportSentiment},
  { id: 'locations',name: 'Locations',        icon: 'M12 21s7-6 7-11a7 7 0 10-14 0c0 5 7 11 7 11zM12 12a2 2 0 100-4 2 2 0 000 4z', Comp: ReportLocations},
  { id: 'funnel',   name: 'Request funnel',   icon: 'M3 4h18l-7 8v7l-4 2v-9z',                                            Comp: ReportFunnel   },
  { id: 'nps',      name: 'NPS & loyalty',    icon: 'M12 21l-1.5-1.4C5 14.6 2 11.9 2 8.5 2 6 4 4 6.5 4c1.5 0 3 .8 3.5 2 .5-1.2 2-2 3.5-2C16 4 18 6 18 8.5c0 3.4-3 6.1-8.5 11.1z', Comp: ReportNps },
  { id: 'responses', name: 'Responses',      icon: 'M4 6h16M4 11h16M4 16h10', Comp: ReportResponses },
];

function RailIcon({ path, active }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : C.taupe} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d={path} />
    </svg>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{
      fontSize: '.8rem', padding: '6px 10px', border: `1.5px solid ${C.line}`, borderRadius: 9,
      background: '#fff', cursor: 'pointer', fontFamily: 'inherit', color: C.ink, maxWidth: 180,
    }}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function ReportResponses() {
  const router = useRouter();
  const [survey, setSurvey] = useState('all');
  const [surveyList, setSurveyList] = useState([]);
  const [cls, setCls] = useState('all');
  const [channel, setChannel] = useState('all');
  const [q, setQ] = useState('');
  const [days, setDays] = useState(90);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    axios.get(`${API}/survey-templates`, { headers: authHeaders() })
      .then((r) => setSurveyList(r.data.templates || [])).catch(() => {});
  }, []);

  // Honor /dashboard/pulse?cls=detractor deep links (e.g. from the Home queue).
  useEffect(() => {
    const c = router.query.cls;
    if (typeof c === 'string' && ['promoter', 'passive', 'detractor'].includes(c)) setCls(c);
  }, [router.query.cls]);

  useEffect(() => {
    let active = true; setLoading(true);
    const p = new URLSearchParams({ days: String(days) });
    if (survey !== 'all') p.set('templateId', survey);
    if (cls !== 'all') p.set('classification', cls);
    if (channel !== 'all') p.set('channel', channel);
    if (q.trim()) p.set('q', q.trim());
    axios.get(`${API}/reports/survey-responses?` + p.toString(), { headers: authHeaders() })
      .then((r) => { if (active) setRows(r.data.responses || []); })
      .catch(() => { if (active) setRows([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [survey, cls, channel, q, days]);

  function exportCsv() {
    const questions = [];
    rows.forEach((r) => (r.answers || []).forEach((a) => { if (a.question && !questions.includes(a.question)) questions.push(a.question); }));
    const head = ['Date', 'Contact', 'Email', 'Score', 'Classification', 'Channel', ...questions];
    const esc = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const lines = [head.map(esc).join(',')];
    rows.forEach((r) => {
      const byQ = {};
      (r.answers || []).forEach((a) => { byQ[a.question] = a.text != null ? a.text : (a.number != null ? a.number : (a.options || []).join('; ')); });
      lines.push([
        r.completedAt ? new Date(r.completedAt).toISOString().slice(0, 10) : '',
        r.contactName || '', r.contactEmail || '', r.score == null ? '' : r.score,
        r.classification || '', r.channel || '', ...questions.map((qq) => (byQ[qq] == null ? '' : byQ[qq])),
      ].map(esc).join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'survey-responses.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const tone = (c) => ({ promoter: C.green, passive: C.amber, detractor: C.red }[(c || '').toLowerCase()] || C.taupe);
  const toneBg = (c) => ({ promoter: C.greenSoft, passive: C.amberSoft, detractor: C.redSoft }[(c || '').toLowerCase()] || C.soft);

  return (
    <div className="rep-fade">
      <div className="rep-card" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        {surveyList.length > 1 && (
          <Select value={survey} onChange={setSurvey} options={[
            { value: 'all', label: 'All surveys' },
            ...surveyList.map((s) => ({ value: s.id, label: (s.name || 'Untitled') + (((s.config && s.config.type) === 'custom') ? ' (Custom)' : '') })),
          ]} />
        )}
        <Select value={cls} onChange={setCls} options={[
          { value: 'all', label: 'All sentiment' }, { value: 'promoter', label: 'Promoters' },
          { value: 'passive', label: 'Passives' }, { value: 'detractor', label: 'Detractors' },
        ]} />
        <Select value={channel} onChange={setChannel} options={[
          { value: 'all', label: 'All channels' }, { value: 'email', label: 'Email' }, { value: 'sms', label: 'SMS' },
        ]} />
        <Select value={String(days)} onChange={(v) => setDays(parseInt(v, 10))} options={[
          { value: '30', label: 'Last 30 days' }, { value: '90', label: 'Last 90 days' },
          { value: '365', label: 'Last 12 months' }, { value: '3650', label: 'All time' },
        ]} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search answers…" style={{
          flex: 1, minWidth: 160, padding: '7px 12px', border: `1.5px solid ${C.line}`, borderRadius: 9,
          fontSize: '.82rem', fontFamily: 'inherit', outline: 'none', color: C.ink,
        }} />
        <button onClick={exportCsv} disabled={!rows.length} style={{
          padding: '8px 16px', borderRadius: 9, border: 'none', cursor: rows.length ? 'pointer' : 'default',
          background: rows.length ? 'linear-gradient(135deg,#f5c842,#d4a515)' : C.soft, color: rows.length ? '#1a1408' : C.faint,
          fontWeight: 700, fontSize: '.8rem', fontFamily: 'inherit',
        }}>Export CSV</button>
      </div>

      {loading ? (
        <div className="rep-card" style={{ textAlign: 'center', color: C.taupe, padding: 40 }}>Loading responses…</div>
      ) : rows.length === 0 ? (
        <NoData icon="🗒️" title="No responses match" body="Try widening the date range or clearing filters. Responses appear here as customers complete your survey." />
      ) : (
        <>
          <div style={{ fontSize: '.78rem', color: C.taupe, margin: '0 0 10px' }}>{rows.length} response{rows.length === 1 ? '' : 's'}</div>
          <div className="rep-card" style={{ padding: 0, overflow: 'hidden' }}>
            {rows.map((r, idx) => {
              const isOpen = open === r.uid;
              return (
                <div key={r.uid || idx} style={{ borderTop: idx ? `1px solid ${C.line}` : 'none' }}>
                  <button onClick={() => setOpen(isOpen ? null : r.uid)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px',
                    background: isOpen ? C.soft : 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  }}>
                    <span style={{ fontSize: '.8rem', fontWeight: 700, color: C.ink, minWidth: 26 }}>{r.score == null ? '—' : r.score}</span>
                    <span style={{ fontSize: '.64rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', color: tone(r.classification), background: toneBg(r.classification), borderRadius: 50, padding: '3px 9px' }}>{r.classification || '—'}</span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: '.84rem', color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.contactName || r.contactEmail || 'Anonymous'}</span>
                    <span style={{ fontSize: '.74rem', color: C.faint }}>{r.completedAt ? new Date(r.completedAt).toLocaleDateString() : ''}</span>
                    <span style={{ color: C.faint, fontSize: '.85rem', display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>›</span>
                  </button>
                  {isOpen && (
                    <div style={{ padding: '4px 16px 16px 54px', background: C.soft }}>
                      {(r.answers || []).length === 0 ? (
                        <div style={{ fontSize: '.8rem', color: C.faint, fontStyle: 'italic' }}>No follow-up answers.</div>
                      ) : (
                        (r.answers || []).map((a, ai) => (
                          <div key={ai} style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: '.7rem', fontWeight: 700, color: C.taupe, marginBottom: 2 }}>{a.question || a.type}</div>
                            <div style={{ fontSize: '.84rem', color: C.ink }}>{a.text != null && a.text !== '' ? a.text : (a.number != null ? a.number : ((a.options || []).join(', ') || '—'))}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function Pulse() {
  const router = useRouter();
  const [reportId, setReportId] = useState('overview');
  const [range, setRange]       = useState('90d');
  const [locationId, setLoc]    = useState('all');
  const [platform, setPlatform] = useState('all');
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);

  // Honor deep links like /dashboard/pulse?report=responses (e.g. from the Home queue).
  useEffect(() => {
    const rep = router.query.report;
    if (typeof rep === 'string' && REPORTS.some((r) => r.id === rep)) setReportId(rep);
  }, [router.query.report]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getInsights({ range, locationId, platform })
      .then((d) => { if (active) setData(d); })
      .catch(() => { if (active) setData(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [range, locationId, platform]);

  const active = REPORTS.find((r) => r.id === reportId) || REPORTS[0];
  const ActiveComp = active.Comp;

  const locOptions = [{ value: 'all', label: 'All locations' }, ...((data?.locations || []).map((l) => ({ value: String(l.id), label: l.name })))];
  const platOptions = [{ value: 'all', label: 'All platforms' }, ...((data?.platforms || []).map((p) => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) })))];

  return (
    <DashboardLayout title="Reports">
      <ReportStyles />

      {/* Filter bar */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${C.line}`, padding: '12px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }} className="tabs-scrollable">
        <div style={{ display: 'flex', gap: 4, background: C.soft, padding: 3, borderRadius: 11 }}>
          {RANGES.map((r) => (
            <button key={r.id} onClick={() => setRange(r.id)} style={{
              padding: '6px 13px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: '.78rem', fontWeight: range === r.id ? 700 : 500,
              background: range === r.id ? '#fff' : 'transparent', color: range === r.id ? C.ink : C.taupe,
              boxShadow: range === r.id ? '0 1px 3px rgba(0,0,0,.08)' : 'none', transition: 'all .15s',
            }}>{r.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {locOptions.length > 2 && <Select value={locationId} onChange={setLoc} options={locOptions} />}
          {platOptions.length > 2 && <Select value={platform} onChange={setPlatform} options={platOptions} />}
        </div>
      </div>

      {/* Rail + report */}
      <div className="rep-shell">
        <nav className="rep-rail">
          {REPORTS.map((r) => (
            <button key={r.id} onClick={() => setReportId(r.id)} className={`rep-railbtn ${reportId === r.id ? 'rep-railbtn--on' : ''}`}>
              <RailIcon path={r.icon} active={reportId === r.id} />
              <span className="rep-railtext">{r.name}</span>
            </button>
          ))}
        </nav>

        <main style={{ minWidth: 0 }}>
          <div style={{ marginBottom: 18 }}>
            <Eyebrow>Report</Eyebrow>
            <h2 style={{ fontFamily: SERIF, fontSize: '1.6rem', fontWeight: 700, color: C.ink, margin: '4px 0 0', letterSpacing: '-.01em' }}>{active.name}</h2>
          </div>
          {loading || !data ? <LoadingState /> : <ActiveComp d={data} range={range} />}
        </main>
      </div>
    </DashboardLayout>
  );
}
