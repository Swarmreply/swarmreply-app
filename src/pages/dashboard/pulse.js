// ============================================
// pages/dashboard/pulse.js
// Pulse — real analytics aggregated from the customer's own reviews.
// No mock data: the Analytics tab is driven by GET /api/reports/analytics.
// Tabs without an honest data source yet show a clear "coming soon" state
// rather than fabricated numbers.
// ============================================

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { getAnalytics } from '../../utils/api';
import { Skeleton } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import { StatCard } from '../../components/ui';

const TABS = [
  { id: 'analytics',   label: 'Analytics'    },
  { id: 'competitors', label: 'Competitors'  },
  { id: 'listings',    label: 'Listings'     },
  { id: 'posts',       label: 'Google Posts' },
];

const RANGES = [
  { id: '30d', label: '30 days'  },
  { id: '90d', label: '90 days'  },
  { id: '12m', label: '12 months'},
  { id: 'all', label: 'All time' },
];

function Card({ children, style = {} }) {
  return <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: 20, ...style }}>{children}</div>;
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

function ComingSoon({ icon, title, description }) {
  return (
    <div style={{ padding: '40px 32px' }}>
      <EmptyState icon={icon} title={title} description={description} />
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
      {tab === 'competitors' && (
        <ComingSoon icon="🏆" title="Competitor tracking is coming soon"
          description="This will benchmark your rating and review volume against nearby businesses in your category. It needs the competitor-tracking data source, which isn't connected yet." />
      )}
      {tab === 'listings' && (
        <ComingSoon icon="📍" title="Listing accuracy is coming soon"
          description="This will check your name, address, phone, and hours for mismatches across directories like Google, Apple Maps, and Bing — once listing sync is connected." />
      )}
      {tab === 'posts' && (
        <ComingSoon icon="📣" title="Google Posts analytics are coming soon"
          description="This will show views and clicks on the posts you publish to your Google Business Profile, once Google Posts reporting is wired up." />
      )}
    </DashboardLayout>
  );
}
