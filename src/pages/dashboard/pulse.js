// ============================================
// pages/dashboard/pulse.js
// Pulse — analytics hub. Real data from GET /api/pulse?range=
// ============================================

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;
const authHeaders = () => {
  const t = typeof window !== 'undefined' ? localStorage.getItem('swarmreply_token') : '';
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const REPORTS = [
  { id: 'overview',  label: 'Overview',        icon: '✦' },
  { id: 'ratings',   label: 'Ratings',         icon: '⭐' },
  { id: 'sentiment', label: 'Sentiment',       icon: '💭' },
  { id: 'velocity',  label: 'Velocity',        icon: '📈' },
  { id: 'requests',  label: 'Review Requests', icon: '↑'  },
  { id: 'nps',       label: 'NPS & Surveys',   icon: '📊' },
  { id: 'reply',     label: 'Reply Quality',   icon: '✍'  },
  { id: 'sms',       label: 'SMS Campaigns',   icon: '📣' },
  { id: 'aivis',     label: 'AI Visibility',   icon: '🔍' },
];

const RANGES = [
  { id: '7d',  label: '7 days'   },
  { id: '30d', label: '30 days'  },
  { id: '90d', label: '90 days'  },
  { id: '12m', label: '12 months' },
];

const GREEN = '#1a6b45', GOLD = '#d4a515', RED = '#c0392b', AMBER = '#f59e0b', INK = '#0a0a0a';

function Card({ children, style = {} }) {
  return <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, ...style }}>{children}</div>;
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 12, padding: '16px 18px', borderTop: accent ? `3px solid ${accent}` : undefined }}>
      <div style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.8rem', fontWeight: 900, color: accent || INK }}>{value}</div>
      {sub && <div style={{ fontSize: '.75rem', color: '#7a7670', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Bar({ pct, color = INK, height = 8 }) {
  return (
    <div style={{ flex: 1, height, background: '#f0eeea', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', background: color, borderRadius: 4 }} />
    </div>
  );
}

// Vertical bar chart from an array of numbers. `scaleMax` overrides the auto max.
function MiniBars({ values, color = INK, height = 80, scaleMax, labels }) {
  if (!values || !values.length) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b8b4ac', fontSize: '.8rem' }}>No data in this period yet</div>;
  }
  const max = scaleMax || Math.max(...values, 1);
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height }}>
        {values.map((v, i) => (
          <div key={i} title={String(v)} style={{ flex: 1, height: `${Math.max(2, (v / max) * 100)}%`, background: i === values.length - 1 ? '#f5c842' : color, borderRadius: '3px 3px 0 0' }} />
        ))}
      </div>
      {labels && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '.62rem', color: '#7a7670' }}>
          {labels.map((l, i) => <span key={i}>{l}</span>)}
        </div>
      )}
    </>
  );
}

function EmptyReport({ icon, title, message }) {
  return (
    <div style={{ textAlign: 'center', padding: 60, color: '#7a7670' }}>
      <div style={{ fontSize: '2rem', marginBottom: 12 }}>{icon}</div>
      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.3rem', fontWeight: 900, color: INK, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: '.875rem', lineHeight: 1.7, maxWidth: 420, margin: '0 auto' }}>{message}</div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 14 }}>{children}</div>;
}

export default function Pulse() {
  const { customer } = useAuth();
  const [range, setRange]     = useState('90d');
  const [report, setReport]   = useState('overview');
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => { if (customer) load(); /* eslint-disable-next-line */ }, [customer, range]);

  async function load() {
    setLoading(true); setError(false);
    try {
      const res = await axios.get(`${API}/pulse?range=${range}`, { headers: authHeaders() });
      setData(res.data);
    } catch (e) {
      setError(true); setData(null);
    } finally {
      setLoading(false);
    }
  }

  const hasReviews = data && data.overview && data.overview.totalReviews > 0;
  const noReviewMsg = 'No review data yet. Connect your Google Business Profile (and other platforms) in Integrations — your reviews, ratings and sentiment populate here automatically as they sync.';

  function renderReport() {
    if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#7a7670' }}>Loading analytics…</div>;
    if (error || !data) return <EmptyReport icon="⚠" title="Couldn't load analytics" message="Something went wrong fetching your data. Please refresh — if it keeps happening, try again shortly." />;

    const { overview, sentiment, velocity, ratings, requests, nps, reply, sms, aivis } = data;

    if (report === 'overview') {
      return (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
            <StatCard label="Avg rating"      value={overview.avgRating ? `${overview.avgRating}★` : '—'} accent={GOLD} />
            <StatCard label="Total reviews"   value={overview.totalReviews} sub="In selected period" />
            <StatCard label="Sentiment score" value={`${overview.sentimentScore}%`} accent={GREEN} sub="Positive reviews" />
            <StatCard label="Reply rate"      value={`${overview.replyRate}%`} sub={`${reply.replied} of ${reply.total} replied`} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
            <Card style={{ padding: 20 }}>
              <SectionTitle>Rating over time</SectionTitle>
              <MiniBars values={ratings.trend.map(t => t.value)} color={GOLD} scaleMax={5}
                labels={ratings.trend.length ? [ratings.trend[0].label, ratings.trend[ratings.trend.length - 1].label] : null} />
            </Card>
            <Card style={{ padding: 20 }}>
              <SectionTitle>Sentiment split</SectionTitle>
              {[['Positive', sentiment.positive, GREEN], ['Neutral', sentiment.neutral, AMBER], ['Negative', sentiment.negative, RED]].map(([k, n, c]) => {
                const tot = sentiment.positive + sentiment.neutral + sentiment.negative;
                return (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span style={{ width: 70, fontSize: '.8rem', fontWeight: 500 }}>{k}</span>
                    <Bar pct={tot ? (n / tot) * 100 : 0} color={c} />
                    <span style={{ fontSize: '.75rem', fontWeight: 700, color: c, width: 30 }}>{n}</span>
                  </div>
                );
              })}
              {!hasReviews && <div style={{ fontSize: '.75rem', color: '#b8b4ac', marginTop: 8 }}>{noReviewMsg}</div>}
            </Card>
          </div>
        </>
      );
    }

    if (report === 'ratings') {
      if (!hasReviews) return <EmptyReport icon="⭐" title="Ratings" message={noReviewMsg} />;
      return (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
            <StatCard label="Current rating" value={`${ratings.current}★`} accent={GOLD} />
            <StatCard label="Total reviews" value={overview.totalReviews} sub="In period" />
            <StatCard label="Platforms" value={ratings.byPlatform.length} sub="With reviews" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16, marginBottom: 16 }}>
            <Card style={{ padding: 20 }}>
              <SectionTitle>Rating — last 12 months</SectionTitle>
              <MiniBars values={ratings.trend.map(t => t.value)} color={GOLD} scaleMax={5}
                labels={ratings.trend.length ? [ratings.trend[0].label, ratings.trend[ratings.trend.length - 1].label] : null} />
            </Card>
            <Card style={{ padding: 20 }}>
              <SectionTitle>By platform</SectionTitle>
              {ratings.byPlatform.length ? ratings.byPlatform.map(p => (
                <div key={p.platform} style={{ border: '1px solid #e4e0d8', borderRadius: 11, padding: '11px 14px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600, fontSize: '.84rem', textTransform: 'capitalize' }}>{p.platform}</span>
                    <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, color: GOLD }}>{p.avg}★</span>
                  </div>
                  <div style={{ fontSize: '.72rem', color: '#7a7670', marginTop: 2 }}>{p.count} review{p.count !== 1 ? 's' : ''}</div>
                </div>
              )) : <div style={{ fontSize: '.8rem', color: '#b8b4ac' }}>No platform data yet</div>}
            </Card>
          </div>
          <Card style={{ padding: 20 }}>
            <SectionTitle>Star rating breakdown</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
              {ratings.distribution.map(d => {
                const bg = d.stars >= 4 ? '#e8f5ef' : d.stars === 3 ? '#fff8e8' : '#fee2e2';
                const c = d.stars >= 4 ? GREEN : d.stars === 3 ? AMBER : RED;
                return (
                  <div key={d.stars} style={{ textAlign: 'center', padding: 12, background: bg, borderRadius: 11 }}>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.5rem', fontWeight: 900, color: c }}>{d.count}</div>
                    <div style={{ fontSize: '.72rem', color: c, margin: '2px 0' }}>{d.stars} star{d.stars !== 1 ? 's' : ''}</div>
                    <div style={{ fontSize: '.68rem', color: '#7a7670' }}>{d.pct}%</div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      );
    }

    if (report === 'sentiment') {
      if (!hasReviews) return <EmptyReport icon="💭" title="Sentiment" message={noReviewMsg} />;
      const tot = sentiment.positive + sentiment.neutral + sentiment.negative;
      return (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
            <StatCard label="Positive" value={sentiment.positive} accent={GREEN} sub={tot ? `${Math.round(sentiment.positive / tot * 100)}% of reviews` : null} />
            <StatCard label="Neutral"  value={sentiment.neutral} accent={AMBER} sub={tot ? `${Math.round(sentiment.neutral / tot * 100)}%` : null} />
            <StatCard label="Negative" value={sentiment.negative} accent={RED} sub={tot ? `${Math.round(sentiment.negative / tot * 100)}%` : null} />
          </div>
          <Card style={{ padding: 20 }}>
            <SectionTitle>Positive sentiment — last 8 weeks</SectionTitle>
            <MiniBars values={sentiment.trend} color={GREEN} scaleMax={100} />
            <div style={{ fontSize: '.7rem', color: '#7a7670', marginTop: 8 }}>Share of 4–5★ reviews each week. Derived from star ratings.</div>
          </Card>
        </>
      );
    }

    if (report === 'velocity') {
      if (!hasReviews) return <EmptyReport icon="📈" title="Velocity" message={noReviewMsg} />;
      const accel = velocity.prior4 ? Math.round((velocity.last4 - velocity.prior4) / velocity.prior4 * 100) : 0;
      return (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
            <StatCard label="Total reviews" value={overview.totalReviews} sub="In period" />
            <StatCard label="Weekly average" value={velocity.weeklyAvg} sub="Last 12 weeks" />
            <StatCard label="Last 4 weeks" value={velocity.last4} sub={`vs ${velocity.prior4} prior`} />
            <StatCard label="Acceleration" value={`${accel >= 0 ? '+' : ''}${accel}%`} accent={accel >= 0 ? GREEN : RED} sub={accel >= 0 ? 'Growing' : 'Slowing'} />
          </div>
          <Card style={{ padding: 20 }}>
            <SectionTitle>Weekly volume — last 12 weeks</SectionTitle>
            <MiniBars values={velocity.trend} color={INK} labels={['12 wks ago', 'Now']} />
          </Card>
        </>
      );
    }

    if (report === 'requests') {
      return (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
            <StatCard label="Requests sent" value={requests.sent} sub="In selected period" />
            <StatCard label="Completed" value={requests.completed} accent={GREEN} sub="Survey finished" />
            <StatCard label="Response rate" value={`${requests.responseRate}%`} accent={requests.responseRate >= 30 ? GREEN : AMBER} />
          </div>
          <Card style={{ padding: 20 }}>
            <SectionTitle>Requests sent — last 12 weeks</SectionTitle>
            <MiniBars values={requests.trend} color={INK} labels={['12 wks ago', 'Now']} />
          </Card>
          {requests.sent === 0 && <div style={{ fontSize: '.8rem', color: '#7a7670', marginTop: 14, textAlign: 'center' }}>No requests sent in this period. Send review requests from <strong>Grow</strong>.</div>}
        </>
      );
    }

    if (report === 'nps') {
      if (!nps.total) return <EmptyReport icon="📊" title="NPS & Surveys" message="No survey responses in this period yet. As customers complete the NPS survey from your review requests, their scores and your Net Promoter Score appear here." />;
      return (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
            <StatCard label="NPS score" value={nps.score} accent={nps.score >= 30 ? GREEN : nps.score >= 0 ? AMBER : RED} sub="Promoters − Detractors" />
            <StatCard label="Promoters" value={nps.promoters} accent={GREEN} sub="Score 9–10" />
            <StatCard label="Passives" value={nps.passives} accent={AMBER} sub="Score 7–8" />
            <StatCard label="Detractors" value={nps.detractors} accent={RED} sub="Score 0–6" />
          </div>
          <Card style={{ padding: 20 }}>
            <SectionTitle>Response breakdown — {nps.total} response{nps.total !== 1 ? 's' : ''}</SectionTitle>
            <div style={{ display: 'flex', height: 28, borderRadius: 8, overflow: 'hidden', border: '1px solid #e4e0d8' }}>
              {[['Promoters', nps.promoters, GREEN], ['Passives', nps.passives, AMBER], ['Detractors', nps.detractors, RED]].map(([k, n, c]) => (
                n > 0 ? <div key={k} title={`${k}: ${n}`} style={{ width: `${(n / nps.total) * 100}%`, background: c }} /> : null
              ))}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: '.75rem', color: '#7a7670' }}>
              <span><span style={{ color: GREEN }}>●</span> Promoters</span>
              <span><span style={{ color: AMBER }}>●</span> Passives</span>
              <span><span style={{ color: RED }}>●</span> Detractors</span>
              <span style={{ marginLeft: 'auto' }}>Avg score: <strong>{nps.avg}</strong></span>
            </div>
          </Card>
        </>
      );
    }

    if (report === 'reply') {
      if (!hasReviews) return <EmptyReport icon="✍" title="Reply Quality" message={noReviewMsg} />;
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          <StatCard label="Reviews replied" value={reply.replied} sub={`of ${reply.total} total`} />
          <StatCard label="Reply rate" value={`${reply.replyRate}%`} accent={reply.replyRate >= 90 ? GREEN : AMBER} />
          <StatCard label="Avg response time" value={reply.avgHours ? `${reply.avgHours}h` : '—'} sub="From review to reply" />
        </div>
      );
    }

    if (report === 'sms') {
      const pct = sms.limit ? Math.round((sms.sent / sms.limit) * 100) : 0;
      return (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
            <StatCard label="SMS sent" value={sms.sent} sub="This billing period" />
            <StatCard label="Monthly limit" value={sms.limit} />
            <StatCard label="Quota used" value={`${pct}%`} accent={pct >= 80 ? RED : GREEN} />
          </div>
          <Card style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #e4e0d8', fontWeight: 600, fontSize: '.875rem' }}>Recent campaigns</div>
            {sms.campaigns.length ? sms.campaigns.map((c, i) => (
              <div key={i} style={{ padding: '12px 20px', borderBottom: '1px solid #f8f7f4', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, fontWeight: 600, fontSize: '.84rem' }}>{c.name}</div>
                <div style={{ fontSize: '.73rem', color: '#7a7670' }}>{c.sent || 0}/{c.recipients || 0} sent</div>
                <span style={{ fontSize: '.67rem', fontWeight: 700, padding: '2px 9px', borderRadius: 50, background: '#f0eeea', color: '#7a7670', textTransform: 'capitalize' }}>{c.status}</span>
              </div>
            )) : <div style={{ padding: 24, textAlign: 'center', color: '#b8b4ac', fontSize: '.82rem' }}>No campaigns yet. Create one in <strong>Campaigns</strong>.</div>}
          </Card>
        </>
      );
    }

    if (report === 'aivis') {
      if (!aivis.visibilityScore && !aivis.competitors.length) return <EmptyReport icon="🔍" title="AI Visibility" message="No AI visibility scan yet. Run a scan from the AI Visibility page to see how often AI assistants mention your business." />;
      return (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 16 }}>
            <StatCard label="Visibility score" value={`${aivis.visibilityScore}%`} accent={aivis.visibilityScore >= 60 ? GREEN : AMBER} sub="Across AI assistants" />
            <StatCard label="Total mentions" value={aivis.mentions} sub="In latest scan" />
          </div>
          <Card style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #e4e0d8', fontWeight: 600, fontSize: '.875rem' }}>Competitor mentions</div>
            {aivis.competitors.length ? aivis.competitors.map((c, i) => (
              <div key={i} style={{ padding: '12px 20px', borderBottom: '1px solid #f8f7f4', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ flex: 1, fontSize: '.84rem', fontWeight: 500 }}>{c.competitor}</span>
                <span style={{ fontSize: '.78rem', fontWeight: 700, color: '#7a7670' }}>{c.mentions} mentions</span>
              </div>
            )) : <div style={{ padding: 24, textAlign: 'center', color: '#b8b4ac', fontSize: '.82rem' }}>No competitor data in the latest scan.</div>}
          </Card>
        </>
      );
    }

    return null;
  }

  return (
    <DashboardLayout title="Pulse">
      {/* Report selector */}
      <div style={{ background: 'white', borderBottom: '1px solid #e4e0d8', padding: '0 24px', display: 'flex', gap: 2, overflowX: 'auto' }} className="tabs-scrollable">
        {REPORTS.map(r => (
          <button key={r.id} onClick={() => setReport(r.id)} style={{ padding: '14px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '.84rem', fontWeight: report === r.id ? 700 : 500, fontFamily: 'inherit', color: report === r.id ? INK : '#7a7670', borderBottom: report === r.id ? '2px solid #0a0a0a' : '2px solid transparent', whiteSpace: 'nowrap', transition: 'all .15s' }}>
            <span style={{ marginRight: 6 }}>{r.icon}</span>{r.label}
          </button>
        ))}
      </div>

      {/* Range selector */}
      <div style={{ padding: '16px 24px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '.75rem', color: '#7a7670', fontWeight: 600 }}>Period:</span>
        {RANGES.map(rg => (
          <button key={rg.id} onClick={() => setRange(rg.id)} style={{ padding: '6px 14px', borderRadius: 50, border: `1.5px solid ${range === rg.id ? INK : '#e4e0d8'}`, background: range === rg.id ? INK : 'white', color: range === rg.id ? 'white' : '#7a7670', cursor: 'pointer', fontSize: '.78rem', fontFamily: 'inherit', fontWeight: 600 }}>{rg.label}</button>
        ))}
      </div>

      <div style={{ padding: 24 }}>{renderReport()}</div>
    </DashboardLayout>
  );
}
