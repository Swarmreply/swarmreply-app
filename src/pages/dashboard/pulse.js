// ============================================
// pages/dashboard/insights.js
// Insights — Analytics / Listings / Competitors / Google Posts / Reports
// ============================================

import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';

const TABS = [
  { id: 'analytics',  label: 'Analytics'     },
  { id: 'listings',   label: 'Listings'      },
  { id: 'competitors',label: 'Competitors'   },
  { id: 'posts',      label: 'Google Posts'  },
  { id: 'reports',    label: '📊 Reports'    },
];

const REPORTS = [
  { id: 'sentiment',  label: 'Sentiment',        icon: '💭' },
  { id: 'velocity',   label: 'Velocity',          icon: '📈' },
  { id: 'ratings',    label: 'Ratings',           icon: '⭐' },
  { id: 'keywords',   label: 'Keywords',          icon: '🔑' },
  { id: 'requests',   label: 'Review Requests',   icon: '↑'  },
  { id: 'nps',        label: 'NPS & Surveys',     icon: '📊' },
  { id: 'reply',      label: 'Reply Quality',     icon: '✍'  },
  { id: 'competitors',label: 'Competitors',       icon: '🏆' },
  { id: 'sms',        label: 'SMS Campaigns',     icon: '📣' },
  { id: 'aivis',      label: 'AI Visibility',     icon: '✦'  },
];

const RANGES = ['7d','30d','90d','12m'];

function Card({ children, style = {} }) {
  return <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, ...style }}>{children}</div>;
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 12, padding: '16px 18px', borderTop: accent ? `3px solid ${accent}` : undefined }}>
      <div style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.8rem', fontWeight: 900, color: accent || '#0a0a0a' }}>{value}</div>
      {sub && <div style={{ fontSize: '.75rem', color: '#7a7670', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Bar({ pct, color = '#0a0a0a', height = 8 }) {
  return (
    <div style={{ flex: 1, height, background: '#f0eeea', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4 }} />
    </div>
  );
}

function AnalyticsTab() {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label="Avg rating" value="4.8★" sub="↑ +0.3 over period" accent="#d4a515" />
        <StatCard label="Total reviews" value="247" sub="↑ +14 this month" />
        <StatCard label="Sentiment score" value="91%" sub="↑ +3% positive" accent="#1a6b45" />
        <StatCard label="Reply rate" value="100%" sub="AI handles all replies" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
        <Card style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 14 }}>Rating over time</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
            {[75,77,75,80,78,80,78,83,83,86,86,90].map((h, i) => (
              <div key={i} style={{ flex: 1, height: `${h}%`, background: i === 11 ? '#f5c842' : '#0a0a0a', borderRadius: '3px 3px 0 0' }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '.62rem', color: '#7a7670' }}><span>Jun 2025 · 4.5</span><span>May 2026 · 4.8</span></div>
        </Card>
        <Card style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 14 }}>Top keywords</div>
          {[['food quality','#1a6b45',91],['service','#1a6b45',84],['atmosphere','#1a6b45',78],['wait time','#c0392b',38]].map(([k,c,p]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ width: 88, fontSize: '.8rem', fontWeight: 500 }}>{k}</span>
              <Bar pct={p} color={c} />
              <span style={{ fontSize: '.75rem', fontWeight: 600, color: c, width: 32 }}>{p}%</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function ListingsTab() {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label="Platforms synced" value="3" sub="Google · Apple · Bing" />
        <StatCard label="Issues found" value="1" sub="Phone mismatch on Bing" accent="#f59e0b" />
        <StatCard label="Last sync" value="2h ago" sub="All platforms checked" />
      </div>
      <Card style={{ overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e4e0d8', fontWeight: 600, fontSize: '.875rem' }}>Listing health</div>
        {[['🔍 Google Business Profile','Name · Address · Phone · Hours — all match','#1a6b45','✓ Synced'],['🍎 Apple Maps','Name · Address · Phone · Hours — all match','#1a6b45','✓ Synced'],['🔷 Bing Places','Phone mismatch — (555) 421-8833 vs (555) 421-8832','#c0392b','⚠ 1 issue']].map(([platform, detail, color, status]) => (
          <div key={platform} style={{ padding: '14px 20px', borderBottom: '1px solid #f8f7f4', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: '#f0eeea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>{platform.split(' ')[0]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '.84rem', marginBottom: 2 }}>{platform.slice(2)}</div>
              <div style={{ fontSize: '.73rem', color }}>{ detail}</div>
            </div>
            <span style={{ fontSize: '.67rem', fontWeight: 700, padding: '2px 9px', borderRadius: 50, background: color === '#1a6b45' ? '#e8f5ef' : '#fff8e8', color }}>{status}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

function CompetitorsTab() {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label="Your rating" value="4.8★" accent="#1a6b45" sub="#1 in area" />
        <StatCard label="Area average" value="4.3★" sub="5 competitors tracked" />
        <StatCard label="Review lead" value="+58" sub="More reviews than avg" />
        <StatCard label="Market rank" value="#1 of 6" accent="#1a6b45" sub="3 months running" />
      </div>
      <Card style={{ overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e4e0d8', fontWeight: 600, fontSize: '.875rem' }}>Competitor comparison</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.84rem' }}>
          <thead><tr style={{ background: '#f8f7f4' }}>
            {['#','Business','Rating','Reviews','Trend'].map(h => <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: '.65rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', borderBottom: '1px solid #e4e0d8' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {[[1,'You','4.8★',247,'Rising','#1a6b45'],[2,'Competitor A','4.5★',189,'Stable','#7a7670'],[3,'Competitor B','4.4★',312,'Falling','#c0392b'],[4,'Competitor C','4.2★',98,'Stable','#7a7670'],[5,'Competitor D','4.1★',76,'Falling','#c0392b']].map(([rank,name,rating,reviews,trend,c]) => (
              <tr key={rank} style={{ borderBottom: '1px solid #f8f7f4', background: rank === 1 ? 'rgba(245,200,66,.06)' : undefined }}>
                <td style={{ padding: '10px 16px', fontWeight: rank === 1 ? 700 : 400, color: rank === 1 ? '#1a6b45' : '#7a7670' }}>{rank}</td>
                <td style={{ padding: '10px 16px', fontWeight: rank === 1 ? 700 : 400 }}>{name}</td>
                <td style={{ padding: '10px 16px', fontWeight: rank === 1 ? 700 : 400, color: rank === 1 ? '#1a6b45' : undefined }}>{rating}</td>
                <td style={{ padding: '10px 16px' }}>{reviews}</td>
                <td style={{ padding: '10px 16px' }}><span style={{ fontSize: '.67rem', fontWeight: 700, padding: '2px 9px', borderRadius: 50, background: trend === 'Rising' ? '#e8f5ef' : trend === 'Falling' ? '#fee2e2' : '#f0eeea', color: c }}>{trend}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function PostsTab() {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label="Posts published" value="8" sub="Last 30 days" />
        <StatCard label="Total views" value="1.4K" sub="From Google Maps" />
        <StatCard label="Clicks" value="89" sub="To your website" />
      </div>
      <Card style={{ overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e4e0d8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontSize: '.875rem' }}>Recent posts</span>
          <button style={{ padding: '7px 16px', borderRadius: 50, background: '#0a0a0a', color: 'white', border: 'none', cursor: 'pointer', fontSize: '.8rem', fontWeight: 700, fontFamily: 'inherit' }}>+ New Post</button>
        </div>
        {[['Weekend Special — Wood-fired pizza','May 20','342 views · 18 clicks'],['Mother\'s Day Brunch','May 10','891 views · 47 clicks']].map(([title, date, stats]) => (
          <div key={title} style={{ padding: '14px 20px', borderBottom: '1px solid #f8f7f4', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 9, background: '#f0eeea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>📮</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '.84rem', marginBottom: 2 }}>{title}</div>
              <div style={{ fontSize: '.73rem', color: '#7a7670' }}>Published {date} · {stats}</div>
            </div>
            <span style={{ background: '#e8f5ef', color: '#1a6b45', fontSize: '.67rem', fontWeight: 700, padding: '2px 9px', borderRadius: 50 }}>Live</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

function ReportsTab() {
  const [range, setRange]   = useState('90d');
  const [report, setReport] = useState('sentiment');

  return (
    <div style={{ padding: 24 }}>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 0, border: '1.5px solid #e4e0d8', borderRadius: 50, overflow: 'hidden', background: 'white' }}>
          {RANGES.map(r => (
            <button key={r} onClick={() => setRange(r)} style={{ padding: '6px 13px', border: 'none', background: range === r ? '#0a0a0a' : 'transparent', color: range === r ? 'white' : '#7a7670', fontSize: '.77rem', fontWeight: range === r ? 600 : 500, cursor: 'pointer', fontFamily: 'inherit', borderRadius: range === r ? 50 : 0, transition: 'all .15s' }}>{r}</button>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {REPORTS.map(r => (
            <button key={r.id} onClick={() => setReport(r.id)} style={{ padding: '6px 14px', borderRadius: 50, border: '1.5px solid', borderColor: report === r.id ? '#0a0a0a' : '#e4e0d8', background: report === r.id ? '#0a0a0a' : 'white', color: report === r.id ? 'white' : '#7a7670', fontSize: '.77rem', fontWeight: report === r.id ? 600 : 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
              {r.icon} {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Report content */}
      {report === 'sentiment' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
            <StatCard label="Sentiment score" value="78" accent="#1a6b45" sub="↑ +4 pts vs prior period" />
            <StatCard label="Positive" value="198" sub="82% of reviews" />
            <StatCard label="Neutral" value="37" sub="15% of reviews" />
            <StatCard label="Negative" value="12" accent="#c0392b" sub="3 unresolved" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16, marginBottom: 16 }}>
            <Card style={{ padding: 20 }}>
              <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 14 }}>8-week trend</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
                {[70,65,72,55,75,76,74,78].map((h,i) => <div key={i} style={{ flex: 1, height: `${h}%`, background: i === 7 ? '#f5c842' : h < 65 ? '#f59e0b' : '#1a6b45', borderRadius: '3px 3px 0 0' }} />)}
              </div>
            </Card>
            <Card style={{ padding: 20 }}>
              <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 14 }}>Top topics</div>
              {[['food quality',91,'#1a6b45'],['staff',84,'#1a6b45'],['atmosphere',78,'#1a6b45'],['wait time',38,'#c0392b'],['parking',29,'#c0392b']].map(([k,p,c]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                  <span style={{ width: 88, fontSize: '.82rem', fontWeight: 500 }}>{k}</span>
                  <Bar pct={p} color={c} />
                  <span style={{ fontSize: '.75rem', fontWeight: 700, color: c, width: 32 }}>{p}%</span>
                </div>
              ))}
            </Card>
          </div>
          <Card style={{ padding: 20 }}>
            <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 12 }}>Star rating breakdown</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
              {[[143,'5 stars','58%','#e8f5ef','#1a6b45'],[55,'4 stars','22%','#e8f5ef','#66bb6a'],[30,'3 stars','12%','#fff8e8','#f59e0b'],[11,'2 stars','4%','#fee2e2','#c0392b'],[8,'1 star','3%','#fee2e2','#c0392b']].map(([n,label,pct,bg,color]) => (
                <div key={label} style={{ textAlign: 'center', padding: 12, background: bg, borderRadius: 11 }}>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.5rem', fontWeight: 900, color }}>{n}</div>
                  <div style={{ fontSize: '.72rem', color, margin: '2px 0' }}>{label}</div>
                  <div style={{ fontSize: '.68rem', color: '#7a7670' }}>{pct}</div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {report === 'velocity' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
            <StatCard label="Total reviews" value="247" sub="In selected period" />
            <StatCard label="Weekly average" value="7.4" sub="↑ +2.1 vs prior" />
            <StatCard label="Last 4 weeks" value="34" sub="vs 26 prior" />
            <StatCard label="Acceleration" value="+31%" accent="#1a6b45" sub="Strong growth" />
          </div>
          <Card style={{ padding: 20 }}>
            <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 14 }}>Weekly volume — 12 weeks</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
              {[39,48,44,57,48,62,57,66,71,71,80,100].map((h,i) => <div key={i} style={{ flex: 1, height: `${h}%`, background: i === 11 ? '#f5c842' : i >= 8 ? '#0a0a0a' : '#e4e0d8', borderRadius: '3px 3px 0 0' }} />)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '.62rem', color: '#7a7670' }}><span>W1</span><span>W6</span><span>W12 (now)</span></div>
          </Card>
        </>
      )}

      {report === 'ratings' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
            <StatCard label="Current rating" value="4.8★" accent="#d4a515" sub="↑ +0.3 over period" />
            <StatCard label="Period start" value="4.5★" sub="12 months ago" />
            <StatCard label="Total reviews" value="247" sub="In period" />
            <StatCard label="Trajectory" value="Rising" accent="#1a6b45" sub="Consistent growth" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
            <Card style={{ padding: 20 }}>
              <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 14 }}>Rating — 12 months</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
                {[75,77,75,80,78,80,78,83,83,86,86,90].map((h,i) => <div key={i} style={{ flex: 1, height: `${h}%`, background: i === 11 ? '#f5c842' : '#d4a515', borderRadius: '3px 3px 0 0' }} />)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '.62rem', color: '#7a7670' }}><span>Jun 2025 · 4.5</span><span>May 2026 · 4.8</span></div>
            </Card>
            <Card style={{ padding: 20 }}>
              <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 14 }}>By platform</div>
              {[['Google','4.8★','#4285F4',92],['Facebook','4.7★','#1877F2',88]].map(([p,r,c,pct]) => (
                <div key={p} style={{ border: '1px solid #e4e0d8', borderRadius: 11, padding: '13px 16px', marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: '.875rem' }}>{p}</span>
                    <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, color: c }}>{r}</span>
                  </div>
                  <div style={{ height: 6, background: '#f0eeea', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: c, borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </Card>
          </div>
        </>
      )}

      {['keywords','requests','nps','reply','competitors','sms','aivis'].includes(report) && (
        <div style={{ textAlign: 'center', padding: 60, color: '#7a7670' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>{REPORTS.find(r => r.id === report)?.icon}</div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.3rem', fontWeight: 900, color: '#0a0a0a', marginBottom: 8 }}>
            {REPORTS.find(r => r.id === report)?.label} Report
          </div>
          <div style={{ fontSize: '.875rem', marginBottom: 20, lineHeight: 1.7 }}>
            Data loads from your connected Google Business Profile and platform integrations.<br />
            Selected period: <strong>{range}</strong>
          </div>
          <div style={{ display: 'inline-flex', gap: 8 }}>
            {REPORTS.filter(r => !['keywords','requests','nps','reply','competitors','sms','aivis'].includes(r.id) || r.id !== report).slice(0,3).map(r => (
              <button key={r.id} onClick={() => setReport(r.id)} style={{ padding: '8px 16px', borderRadius: 50, border: '1.5px solid #e4e0d8', background: 'white', cursor: 'pointer', fontSize: '.82rem', fontFamily: 'inherit', color: '#0a0a0a' }}>View {r.label}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Pulse() {
  const [tab, setTab] = useState('analytics');

  return (
    <DashboardLayout title="Pulse">
      <div style={{ background: 'white', borderBottom: '1px solid #e4e0d8', padding: '0 24px', display: 'flex', gap: 2 }} className="tabs-scrollable">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '14px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '.84rem', fontWeight: tab === t.id ? 700 : 500, fontFamily: 'inherit', color: tab === t.id ? '#0a0a0a' : '#7a7670', borderBottom: tab === t.id ? '2px solid #0a0a0a' : '2px solid transparent', transition: 'all .15s' }}>{t.label}</button>
        ))}
      </div>
      {tab === 'analytics'   && <AnalyticsTab />}
      {tab === 'listings'    && <ListingsTab />}
      {tab === 'competitors' && <CompetitorsTab />}
      {tab === 'posts'       && <PostsTab />}
      {tab === 'reports'     && <ReportsTab />}
    </DashboardLayout>
  );
}
