// ============================================
// pages/dashboard/pulse.js
// Pulse — real analytics aggregated from the customer's own reviews.
// No mock data: the Analytics tab is driven by GET /api/reports/analytics.
// Tabs without an honest data source yet show a clear "coming soon" state
// rather than fabricated numbers.
// ============================================

import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { getAnalytics, getCompetitors, refreshCompetitors } from '../../utils/api';
import { Skeleton } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import { StatCard } from '../../components/ui';

const TABS = [
  { id: 'analytics',   label: 'Analytics'    },
  { id: 'competitors', label: 'Competitors'  },
];

const RANGES = [
  { id: '30d', label: '30 days'  },
  { id: '90d', label: '90 days'  },
  { id: '12m', label: '12 months'},
  { id: 'all', label: 'All time' },
];

function Card({ children, style = {} }) {
  return <div style={{ background: 'white', border: '1.5px solid #e4e0d8', borderRadius: 14, padding: 20, ...style }}>{children}</div>;
}


const monthLabel = (ym) => {
  const d = new Date(ym + '-01T00:00:00');
  return isNaN(d) ? ym : d.toLocaleDateString('en-US', { month: 'short' });
};

function AnalyticsTab({ data, loading }) {
  if (loading) {
    return (
      <div style={{ padding: '24px 32px' }}>
        <div className="grid-responsive-4" style={{ marginBottom: 20 }}>
          {[0,1,2,3].map(i => (
            <Card key={i} style={{ padding: '16px 18px' }}>
              <Skeleton width={90} height={11} style={{ marginBottom: 14 }} />
              <Skeleton width={70} height={26} radius={6} />
            </Card>
          ))}
        </div>
        <Card style={{ marginBottom: 20 }}>
          <Skeleton width={160} height={13} style={{ marginBottom: 18 }} />
          <Skeleton width="100%" height={140} radius={10} />
        </Card>
        <Card>
          <Skeleton width={140} height={13} style={{ marginBottom: 18 }} />
          {[0,1,2,3,4].map(i => <Skeleton key={i} width="100%" height={12} style={{ marginBottom: 12 }} />)}
        </Card>
      </div>
    );
  }

  const totals = data && data.totals;
  if (!totals || totals.totalReviews === 0) {
    return (
      <div style={{ padding: '40px 32px' }}>
        <EmptyState
          icon="📊"
          title="No review data yet"
          description="Once reviews start coming in, your ratings, trends, and platform breakdown will appear here automatically."
          action={
            <a href="/dashboard/grow" style={{
              display: 'inline-block', background: '#0a0a0a', color: 'white',
              padding: '10px 18px', borderRadius: 50, fontSize: '.85rem', fontWeight: 700, textDecoration: 'none',
            }}>Send a review request</a>
          }
        />
      </div>
    );
  }

  const byMonth = data.byMonth || [];
  const maxCount = Math.max(1, ...byMonth.map(m => m.count));
  const dist = data.distribution || [];
  const distTotal = dist.reduce((a, d) => a + d.count, 0) || 1;
  const platforms = data.byPlatform || [];

  return (
    <div style={{ padding: '24px 32px' }}>
      {/* Totals */}
      <div className="grid-responsive-4" style={{ marginBottom: 20 }}>
        <StatCard label="Total Reviews" value={totals.totalReviews} sub="All time" />
        <StatCard label="Avg Rating" value={`${totals.avgRating != null ? totals.avgRating : '–'} ★`} sub="All time" />
        <StatCard label="Response Rate" value={`${totals.responseRate}%`} sub={`${totals.replied} replied`} />
        <StatCard label="Last 30 Days" value={totals.reviews30d} sub="new reviews" />
      </div>

      {/* Volume by month */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 16 }}>Review volume by month</div>
        {byMonth.length === 0 ? (
          <div style={{ fontSize: '.82rem', color: '#7a7670', padding: '12px 0' }}>No reviews in this period.</div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 150 }}>
            {byMonth.map(m => (
              <div key={m.month} title={`${m.count} reviews · avg ${m.avg != null ? m.avg : '–'}★`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ fontSize: '.62rem', color: '#7a7670' }}>{m.count}</div>
                <div style={{ width: '100%', height: `${(m.count / maxCount) * 100}%`, minHeight: 2, background: '#0a0a0a', borderRadius: '3px 3px 0 0' }} />
                <div style={{ fontSize: '.6rem', color: '#7a7670' }}>{monthLabel(m.month)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="m-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Rating distribution */}
        <Card>
          <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 16 }}>Rating distribution</div>
          {dist.map(d => {
            const pct = Math.round((d.count / distTotal) * 100);
            return (
              <div key={d.stars} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                <span style={{ width: 34, fontSize: '.78rem', color: '#0a0a0a' }}>{d.stars}★</span>
                <div style={{ flex: 1, height: 10, background: '#f0eeea', borderRadius: 50, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: d.stars >= 4 ? '#1a6b45' : d.stars === 3 ? '#f59e0b' : '#c0392b', borderRadius: 50 }} />
                </div>
                <span style={{ width: 78, textAlign: 'right', fontSize: '.75rem', color: '#7a7670' }}>{d.count} · {pct}%</span>
              </div>
            );
          })}
        </Card>

        {/* By platform */}
        <Card>
          <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 8 }}>By platform</div>
          {platforms.length === 0 ? (
            <div style={{ fontSize: '.82rem', color: '#7a7670', padding: '12px 0' }}>No reviews in this period.</div>
          ) : platforms.map(p => (
            <div key={p.platform} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid #f0eeea' }}>
              <span style={{ textTransform: 'capitalize', fontSize: '.84rem', fontWeight: 500 }}>{p.platform}</span>
              <span style={{ fontSize: '.8rem', color: '#7a7670' }}>{p.count} reviews · {p.avg != null ? p.avg : '–'}★ avg</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function CompetitorsTab() {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefresh]= useState(false);
  const [err, setErr]           = useState('');
  const polls = useRef(0);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const d = await getCompetitors();
        if (!active) return;
        setData(d); setLoading(false);
        // A background scan is running and we don't have a benchmark yet — poll.
        if (d.scanning && !(d.benchmark && d.benchmark.hasData) && polls.current < 4) {
          polls.current += 1;
          setTimeout(load, 5000);
        }
      } catch (e) {
        if (!active) return;
        setErr('Could not load competitors.'); setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  async function refresh() {
    setRefresh(true); setErr('');
    try {
      const d = await refreshCompetitors();
      setData(prev => ({ ...(prev || {}), benchmark: d.benchmark }));
    } catch (e) {
      setErr((e && e.response && e.response.data && e.response.data.error) || 'Refresh failed.');
    } finally {
      setRefresh(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '24px 32px' }}>
        <Card style={{ marginBottom: 20 }}>
          <Skeleton width={180} height={13} style={{ marginBottom: 18 }} />
          {[0,1,2,3].map(i => <Skeleton key={i} width="100%" height={16} style={{ marginBottom: 12 }} />)}
        </Card>
      </div>
    );
  }

  const benchmark = data && data.benchmark;
  const ai = (data && data.aiCompetitors) || [];
  const scanning = data && data.scanning;
  const hasBenchmark = benchmark && benchmark.hasData;

  // Build the head-to-head rows (you + nearby competitors), most-reviewed first.
  let rows = [], gap = null, topName = '';
  if (hasBenchmark) {
    rows = [
      { name: benchmark.ours.name, rating: benchmark.ours.rating, reviews: benchmark.ours.totalReviews, isUs: true },
      ...benchmark.competitors.map(c => ({ name: c.name, rating: c.rating, reviews: c.reviewCount, address: c.address, isUs: false })),
    ].sort((a, b) => (b.rating - a.rating) || (b.reviews - a.reviews));
    const top = benchmark.competitors.reduce((m, c) => c.reviewCount > (m ? m.reviewCount : -1) ? c : m, null);
    if (top) { topName = top.name; gap = top.reviewCount - benchmark.ours.totalReviews; }
  }

  const fmtStars = (n) => `${n != null ? Number(n).toFixed(1) : '–'} ★`;

  return (
    <div style={{ padding: '24px 32px' }}>
      {err && <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 9, padding: '9px 12px', fontSize: '.8rem', color: '#c0392b', marginBottom: 14 }}>{err}</div>}

      {/* HEAD-TO-HEAD BENCHMARK */}
      {hasBenchmark ? (
        <>
          <div className="grid-responsive-4" style={{ marginBottom: 20 }}>
            <StatCard label="Your rank nearby" value={`#${benchmark.ours.rank}`} sub={`of ${benchmark.ours.total} businesses`} />
            <StatCard label="Your rating" value={fmtStars(benchmark.ours.rating)} sub={`${benchmark.ours.totalReviews} reviews`} />
            <StatCard label="Area average" value={fmtStars(benchmark.avgCompetitorRating)}
              sub={benchmark.ratingDiff >= 0 ? `You're +${benchmark.ratingDiff} above` : `You're ${benchmark.ratingDiff} below`} />
            <StatCard label="New this month" value={benchmark.ours.reviewsThisMonth}
              sub={benchmark.ratingTrend > 0 ? `Rating ↑ ${benchmark.ratingTrend}` : benchmark.ratingTrend < 0 ? `Rating ↓ ${Math.abs(benchmark.ratingTrend)}` : 'Rating steady'} />
          </div>

          {gap != null && (
            <Card style={{ marginBottom: 20, background: gap > 0 ? '#fff8e8' : '#e8f5ef', borderColor: gap > 0 ? '#fde68a' : '#bbf7d0' }}>
              <div style={{ fontSize: '.9rem', fontWeight: 600, color: gap > 0 ? '#92690a' : '#1a6b45' }}>
                {gap > 0
                  ? `You're ${gap} review${gap === 1 ? '' : 's'} behind ${topName}, the most-reviewed business nearby.`
                  : `You have more reviews than every competitor nearby. 🎉`}
              </div>
              {gap > 0 && (
                <div style={{ fontSize: '.8rem', color: '#7a7670', marginTop: 4 }}>
                  Closing that gap pushes you up the local rankings — send a batch of review requests from Grow to catch up faster.
                </div>
              )}
            </Card>
          )}

          <Card style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontWeight: 600, fontSize: '.875rem' }}>How you stack up nearby</div>
              <button onClick={refresh} disabled={refreshing}
                style={{ padding: '6px 12px', borderRadius: 50, border: '1.5px solid #e4e0d8', background: 'white', fontSize: '.75rem', fontWeight: 600, cursor: refreshing ? 'default' : 'pointer', fontFamily: 'inherit', color: '#4a4a48' }}>
                {refreshing ? 'Refreshing…' : '↻ Refresh'}
              </button>
            </div>
            {rows.map((r, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto auto', gap: 12, alignItems: 'center', padding: '11px 0', borderBottom: i < rows.length - 1 ? '1px solid #f0eeea' : 'none', background: r.isUs ? 'rgba(245,200,66,.07)' : undefined, borderRadius: r.isUs ? 8 : 0, paddingLeft: r.isUs ? 8 : 0, paddingRight: r.isUs ? 8 : 0 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: r.isUs ? '#f5c842' : '#f0eeea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.72rem', fontWeight: 800, color: r.isUs ? '#0a0a0a' : '#7a7670' }}>{i + 1}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: r.isUs ? 700 : 500, fontSize: '.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.name}{r.isUs && <span style={{ fontSize: '.66rem', fontWeight: 700, color: '#92690a', background: '#fef3c7', padding: '1px 7px', borderRadius: 50, marginLeft: 8 }}>You</span>}
                  </div>
                  {r.address && <div style={{ fontSize: '.7rem', color: '#7a7670', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.address}</div>}
                </div>
                <div style={{ textAlign: 'right', fontSize: '.82rem', fontWeight: 600 }}>{fmtStars(r.rating)}</div>
                <div style={{ textAlign: 'right', fontSize: '.78rem', color: '#7a7670', width: 90 }}>{r.reviews} reviews</div>
              </div>
            ))}
            {benchmark.lastUpdated && (
              <div style={{ fontSize: '.7rem', color: '#7a7670', marginTop: 12 }}>
                Nearby data from Google · updated {new Date(benchmark.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            )}
          </Card>
        </>
      ) : scanning ? (
        <Card style={{ marginBottom: 20, textAlign: 'center', padding: '32px 20px' }}>
          <div style={{ fontSize: '1.6rem', marginBottom: 8 }}>🔍</div>
          <div style={{ fontWeight: 600, fontSize: '.9rem', marginBottom: 4 }}>Finding businesses near you…</div>
          <div style={{ fontSize: '.8rem', color: '#7a7670' }}>We're pulling nearby competitors in your category. This refreshes automatically.</div>
        </Card>
      ) : (
        <Card style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, fontSize: '.9rem', marginBottom: 4 }}>Nearby benchmark unavailable</div>
          <div style={{ fontSize: '.8rem', color: '#7a7670', marginBottom: 12 }}>
            We couldn't pull nearby businesses yet — this needs your business name and city on file. You can still see who AI recommends below.
          </div>
          <button onClick={refresh} disabled={refreshing}
            style={{ padding: '8px 16px', borderRadius: 50, border: 'none', background: '#0a0a0a', color: 'white', fontSize: '.8rem', fontWeight: 700, cursor: refreshing ? 'default' : 'pointer', fontFamily: 'inherit' }}>
            {refreshing ? 'Scanning…' : 'Try scanning now'}
          </button>
        </Card>
      )}

      {/* WHO AI RECOMMENDS */}
      {ai.length > 0 && (
        <Card>
          <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 4 }}>Who AI recommends in your area</div>
          <div style={{ fontSize: '.73rem', color: '#7a7670', marginBottom: 14 }}>
            Businesses named when customers ask ChatGPT, Gemini, or Claude for the best in your category — from your latest visibility scan.
          </div>
          {ai.map((c, i) => (
            <div key={i} style={{ padding: '11px 0', borderBottom: i < ai.length - 1 ? '1px solid #f0eeea' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <span style={{ fontWeight: 600, fontSize: '.85rem' }}>{c.name}</span>
                {c.mentions != null && <span style={{ fontSize: '.72rem', color: '#7a7670', whiteSpace: 'nowrap' }}>{c.mentions} mention{c.mentions === 1 ? '' : 's'}</span>}
              </div>
              {c.reasons && c.reasons.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 7 }}>
                  {c.reasons.map((r, j) => (
                    <span key={j} style={{ fontSize: '.72rem', color: '#4a4a48', background: '#f8f7f4', border: '1px solid #f0eeea', borderRadius: 50, padding: '3px 9px' }}>{r}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </Card>
      )}

      {/* Nothing at all */}
      {!hasBenchmark && !scanning && ai.length === 0 && (
        <EmptyState icon="🏆" title="No competitor data yet"
          description="Run an AI visibility scan in Get Found, and connect your business details, and your local competitive picture will appear here." />
      )}
    </div>
  );
}

export default function Pulse() {
  const [tab, setTab]         = useState('analytics');
  const [range, setRange]     = useState('90d');
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getAnalytics(range)
      .then(d => { if (active) setData(d); })
      .catch(() => { if (active) setData(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [range]);

  return (
    <DashboardLayout title="Reports">
      {/* Tab bar */}
      <div style={{ background: 'white', borderBottom: '1px solid #e4e0d8', padding: '0 24px', display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'space-between' }} className="tabs-scrollable">
        <div style={{ display: 'flex', gap: 2 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '14px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '.84rem', fontWeight: tab === t.id ? 700 : 500, fontFamily: 'inherit', color: tab === t.id ? '#0a0a0a' : '#7a7670', borderBottom: tab === t.id ? '2px solid #0a0a0a' : '2px solid transparent', transition: 'all .15s' }}>{t.label}</button>
          ))}
        </div>
        {tab === 'analytics' && (
          <div style={{ display: 'flex', gap: 4 }}>
            {RANGES.map(r => (
              <button key={r.id} onClick={() => setRange(r.id)} style={{ padding: '5px 12px', borderRadius: 50, border: range === r.id ? '2px solid #0a0a0a' : '1.5px solid #e4e0d8', background: range === r.id ? '#f8f7f4' : 'transparent', fontSize: '.78rem', fontWeight: range === r.id ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit', color: '#0a0a0a' }}>{r.label}</button>
            ))}
          </div>
        )}
      </div>

      {tab === 'analytics' && <AnalyticsTab data={data} loading={loading} />}
      {tab === 'competitors' && <CompetitorsTab />}
    </DashboardLayout>
  );
}
