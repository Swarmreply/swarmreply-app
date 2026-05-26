// ============================================
// src/pages/dashboard/data.js
// Consolidated Data section
// Replaces: sentiment.js, keywords.js, calendar.js
// Adds: reply quality, velocity, rating history,
//       hour-of-day, survey trends
// ============================================

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const TABS = [
  { id: 'sentiment',    label: 'Sentiment'      },
  { id: 'keywords',     label: 'Keywords'       },
  { id: 'ratings',      label: 'Rating History' },
  { id: 'velocity',     label: 'Velocity'       },
  { id: 'quality',      label: 'Reply Quality'  },
  { id: 'timing',       label: 'Timing'         },
  { id: 'calendar',     label: 'Calendar'       },
  { id: 'surveys',      label: 'Survey Trends'  },
];

const PLATFORMS = { google: '🔍 Google', yelp: '⭐ Yelp', tripadvisor: '✈️ TripAdvisor' };
const PLATFORM_COLORS = { google: '#4285F4', yelp: '#d32323', tripadvisor: '#00af87' };
const DAYS_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const SENTIMENT_COLORS = {
  positive: { bg: '#e8f5ef', text: '#1a6b45', bar: '#1a6b45' },
  neutral:  { bg: '#fef3cd', text: '#92690a', bar: '#f59e0b' },
  negative: { bg: '#fee2e2', text: '#c0392b', bar: '#c0392b' },
};
const INTENSITY = ['#f0eeea','#c8e6c9','#81c784','#388e3c','#1b5e20'];

// ── Reusable components ──────────────────────

function SectionHeader({ title, sub }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.1rem', fontWeight: 700, color: '#0a0a0a', marginBottom: 3 }}>{title}</div>
      {sub && <div style={{ fontSize: '0.78rem', color: '#7a7670', lineHeight: 1.5 }}>{sub}</div>}
    </div>
  );
}

function StatCard({ label, value, sub, subColor, accent }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 12, padding: '16px 20px', borderTop: accent ? `3px solid ${accent}` : undefined }}>
      <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '2rem', fontWeight: 900, lineHeight: 1, color: accent || '#0a0a0a' }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: subColor || '#7a7670', marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

function ScoreGauge({ score, size = 110 }) {
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(100, Math.max(0, score)) / 100) * circ;
  const color = score >= 70 ? '#1a6b45' : score >= 45 ? '#f59e0b' : '#c0392b';
  const cx = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#f0eeea" strokeWidth={size * 0.07} />
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={size * 0.07}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cx})`} style={{ transition: 'stroke-dashoffset 1s ease' }} />
      <text x={cx} y={cx - 4} textAnchor="middle" fontSize={size * 0.18} fontWeight="700" fill={color}>{score}</text>
      <text x={cx} y={cx + 13} textAnchor="middle" fontSize={size * 0.09} fill="#7a7670">/100</text>
    </svg>
  );
}

function BarRow({ label, value, max, color, count }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
      <div style={{ width: 90, fontSize: '0.8rem', color: '#4a4a48', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
      <div style={{ flex: 1, height: 8, background: '#f0eeea', borderRadius: 50, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color || '#0a0a0a', borderRadius: 50, transition: 'width .6s ease' }} />
      </div>
      <div style={{ width: 32, textAlign: 'right', fontSize: '0.75rem', color: '#7a7670', flexShrink: 0 }}>{count ?? value}</div>
    </div>
  );
}

function Empty({ icon, msg }) {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center', color: '#b0aca6' }}>
      <div style={{ fontSize: '2rem', marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>{msg}</div>
    </div>
  );
}

function Tag({ label, bg, color }) {
  return <span style={{ padding: '2px 9px', borderRadius: 50, fontSize: '0.68rem', fontWeight: 700, background: bg, color }}>{label}</span>;
}

// ── Mini line chart (SVG) ────────────────────
function MiniLineChart({ data, valueKey, color, height = 60 }) {
  if (!data?.length) return null;
  const vals = data.map(d => parseFloat(d[valueKey]) || 0);
  const max = Math.max(...vals, 0.01);
  const min = Math.min(...vals);
  const range = max - min || 1;
  const w = 100 / (vals.length - 1 || 1);
  const points = vals.map((v, i) => {
    const x = i * w;
    const y = height - ((v - min) / range) * (height - 10) - 5;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: '100%', height: height, overflow: 'visible' }}>
      <polyline points={points} fill="none" stroke={color || '#0a0a0a'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {vals.map((v, i) => (
        <circle key={i} cx={i * w} cy={parseFloat(points.split(' ')[i]?.split(',')[1]) || 0}
          r="2.5" fill="white" stroke={color || '#0a0a0a'} strokeWidth="1.5" />
      ))}
    </svg>
  );
}

// ── SENTIMENT TAB ────────────────────────────
function SentimentTab({ locationId, days }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_URL}/sentiment/${locationId}?days=${days}`)
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [locationId, days]);

  if (loading) return <Empty icon="◎" msg="Loading sentiment..." />;
  if (!data)   return <Empty icon="◎" msg="No sentiment data yet." />;

  const weekly = data.weeklyScores || [];
  const maxBar = weekly.length > 0 ? Math.max(...weekly.map(w => w.averageScore || 0), 1) : 1;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24, background: 'white', border: '1px solid #e4e0d8', borderRadius: 16, padding: 24, marginBottom: 16, alignItems: 'center' }}>
        <ScoreGauge score={data.currentScore || 0} />
        <div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.1rem', fontWeight: 700, marginBottom: 6 }}>
            {data.currentScore >= 70 ? 'Strong positive sentiment' : data.currentScore >= 45 ? 'Mixed sentiment' : 'Needs attention'}
          </div>
          <div style={{ fontSize: '0.82rem', color: '#7a7670', lineHeight: 1.7, marginBottom: 12 }}>
            {data.insight || 'Sentiment is tracked across all reviews and updated daily.'}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { label: 'Positive', val: data.breakdown?.positive || 0, ...SENTIMENT_COLORS.positive },
              { label: 'Neutral',  val: data.breakdown?.neutral  || 0, ...SENTIMENT_COLORS.neutral  },
              { label: 'Negative', val: data.breakdown?.negative || 0, ...SENTIMENT_COLORS.negative },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '8px 14px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.3rem', fontWeight: 700, color: s.text }}>{s.val}</div>
                <div style={{ fontSize: '0.7rem', color: s.text }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 14 }}>Weekly trend</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 80 }}>
            {weekly.slice(-10).map((w, i) => {
              const h = w.averageScore ? Math.max(6, Math.round((w.averageScore / maxBar) * 80)) : 4;
              const c = !w.averageScore ? '#f0eeea' : w.averageScore >= 70 ? '#1a6b45' : w.averageScore >= 45 ? '#f59e0b' : '#c0392b';
              return <div key={i} style={{ flex: 1, height: `${h}px`, background: c, borderRadius: '3px 3px 0 0', cursor: 'pointer', title: `Score: ${w.averageScore}` }} />;
            })}
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 14 }}>Top topics</div>
          {(data.topics || []).slice(0, 6).map((t, i) => (
            <BarRow key={i} label={t.topic} value={t.count} max={(data.topics?.[0]?.count || 1)}
              color={t.sentiment === 'positive' ? '#1a6b45' : t.sentiment === 'negative' ? '#c0392b' : '#f59e0b'}
              count={t.count} />
          ))}
          {!data.topics?.length && <div style={{ color: '#b0aca6', fontSize: '0.82rem' }}>No topic data yet.</div>}
        </div>
      </div>
    </div>
  );
}

// ── KEYWORDS TAB ─────────────────────────────
function KeywordsTab({ locationId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('total_mentions');

  useEffect(() => {
    axios.get(`${API_URL}/keywords/${locationId}`)
      .then(r => setData(r.data.keywords || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [locationId]);

  const filtered = data
    .filter(k => k.keyword.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => parseInt(b[sort]) - parseInt(a[sort]));

  const max = filtered[0] ? parseInt(filtered[0].total_mentions) : 1;

  if (loading) return <Empty icon="#" msg="Loading keywords..." />;

  return (
    <div>
      <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ padding: '13px 18px', borderBottom: '1px solid #e4e0d8', display: 'flex', gap: 10, alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search keywords..."
            style={{ flex: 1, padding: '8px 12px', border: '1.5px solid #e4e0d8', borderRadius: 8, fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit' }} />
          <select value={sort} onChange={e => setSort(e.target.value)}
            style={{ padding: '8px 12px', border: '1.5px solid #e4e0d8', borderRadius: 8, fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none', background: 'white' }}>
            <option value="total_mentions">Sort: Mentions</option>
            <option value="positive_count">Sort: Positive</option>
            <option value="negative_count">Sort: Negative</option>
          </select>
        </div>
        {!filtered.length ? <Empty icon="#" msg="No keywords match your search." /> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Keyword','Sentiment','Mentions','Positive','Negative','Volume'].map(h => (
                <th key={h} style={{ padding: '9px 14px', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#7a7670', textAlign: 'left', borderBottom: '1px solid #e4e0d8', background: '#f8f7f4' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {filtered.slice(0, 25).map((kw, i) => {
                const total = parseInt(kw.total_mentions);
                const pos = parseInt(kw.positive_count);
                const neg = parseInt(kw.negative_count);
                const dom = pos >= neg ? 'positive' : neg > pos ? 'negative' : 'neutral';
                const sc = SENTIMENT_COLORS[dom];
                return (
                  <tr key={i} style={{ cursor: 'default' }}
                    onMouseEnter={e => e.currentTarget.style.background='#f8f7f4'}
                    onMouseLeave={e => e.currentTarget.style.background='white'}>
                    <td style={{ padding: '11px 14px', fontSize: '0.875rem', fontWeight: 500 }}>{kw.keyword}</td>
                    <td style={{ padding: '11px 8px' }}><Tag label={dom} bg={sc.bg} color={sc.text} /></td>
                    <td style={{ padding: '11px 14px', fontFamily: "'Playfair Display',serif", fontWeight: 700 }}>{total}</td>
                    <td style={{ padding: '11px 14px', color: '#1a6b45', fontWeight: 500 }}>{pos}</td>
                    <td style={{ padding: '11px 14px', color: '#c0392b', fontWeight: 500 }}>{neg}</td>
                    <td style={{ padding: '11px 14px', width: 120 }}>
                      <div style={{ height: 7, background: '#f0eeea', borderRadius: 50, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.round((total / max) * 100)}%`, height: '100%', background: sc.bar, borderRadius: 50, transition: 'width .4s' }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── RATING HISTORY TAB ───────────────────────
function RatingsTab({ locationId, newData }) {
  const d = newData?.ratingHistory;
  if (!d) return <Empty icon="★" msg="Loading rating history..." />;

  const overall = d.overall || [];
  const byPlatform = {};
  for (const row of (d.byPlatform || [])) {
    if (!byPlatform[row.platform]) byPlatform[row.platform] = [];
    byPlatform[row.platform].push(row);
  }

  const delta = d.ratingDelta;
  const deltaColor = delta > 0 ? '#1a6b45' : delta < 0 ? '#c0392b' : '#7a7670';

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
        <StatCard label="Current rating" value={d.lastRating ? `${d.lastRating}★` : '—'} accent="#f5c842" />
        <StatCard label="12-month change"
          value={delta !== null ? `${delta > 0 ? '+' : ''}${delta}` : '—'}
          subColor={deltaColor}
          sub={delta > 0 ? '↑ Improving' : delta < 0 ? '↓ Declining' : 'Stable'} />
        <StatCard label="Starting rating" value={d.firstRating ? `${d.firstRating}★` : '—'} />
      </div>

      {/* Overall trend line */}
      <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: 20, marginBottom: 14 }}>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 16 }}>Overall rating over time</div>
        {overall.length > 1 ? (
          <>
            <div style={{ padding: '0 4px' }}>
              <MiniLineChart data={overall} valueKey="avg_rating" color="#f5c842" height={70} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              {overall.slice(0, 1).concat(overall.slice(-1)).map((m, i) => (
                <div key={i} style={{ fontSize: '0.72rem', color: '#7a7670' }}>
                  {new Date(m.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                </div>
              ))}
            </div>
          </>
        ) : <Empty icon="★" msg="Not enough data yet — needs at least 2 months of reviews." />}
      </div>

      {/* By platform */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
        {Object.entries(byPlatform).map(([platform, rows]) => {
          const latest = rows[rows.length - 1];
          const first  = rows[0];
          const diff   = latest && first ? Math.round((parseFloat(latest.avg_rating) - parseFloat(first.avg_rating)) * 10) / 10 : null;
          const color  = PLATFORM_COLORS[platform] || '#0a0a0a';
          return (
            <div key={platform} style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{PLATFORMS[platform] || platform}</div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.3rem', fontWeight: 700, color }}>
                  {latest ? parseFloat(latest.avg_rating).toFixed(1) : '—'}★
                </div>
              </div>
              {rows.length > 1 && <MiniLineChart data={rows} valueKey="avg_rating" color={color} height={44} />}
              {diff !== null && (
                <div style={{ fontSize: '0.72rem', color: diff >= 0 ? '#1a6b45' : '#c0392b', marginTop: 6 }}>
                  {diff > 0 ? `↑ +${diff}` : diff < 0 ? `↓ ${diff}` : '→ No change'} over {rows.length} months
                </div>
              )}
            </div>
          );
        })}
        {Object.keys(byPlatform).length === 0 && <Empty icon="★" msg="No platform breakdown data yet." />}
      </div>
    </div>
  );
}

// ── VELOCITY TAB ─────────────────────────────
function VelocityTab({ newData }) {
  const d = newData?.velocity;
  if (!d) return <Empty icon="↑" msg="Loading velocity data..." />;

  const weeks = d.weeks || [];
  const max = Math.max(...weeks.map(w => w.total), 1);
  const acc = d.acceleration;
  const accColor = acc > 0 ? '#1a6b45' : acc < 0 ? '#c0392b' : '#7a7670';

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
        <StatCard label="This week" value={d.thisWeek} sub="reviews" />
        <StatCard label="Weekly average" value={d.avgPerWeek} sub="over 12 weeks" />
        <StatCard label="Last 4 weeks" value={d.last4} sub="vs prior 4 weeks" />
        <StatCard label="Acceleration"
          value={acc !== null ? `${acc > 0 ? '+' : ''}${acc}%` : '—'}
          sub={acc > 0 ? '↑ Picking up' : acc < 0 ? '↓ Slowing' : 'Steady'}
          subColor={accColor} accent={acc > 0 ? '#1a6b45' : acc < 0 ? '#c0392b' : undefined} />
      </div>

      <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: 20, marginBottom: 14 }}>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 16 }}>Weekly review volume</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 90 }}>
          {weeks.slice(-16).map((w, i) => {
            const h = Math.max(4, Math.round((w.total / max) * 90));
            const isRecent = i >= weeks.slice(-16).length - 4;
            return (
              <div key={i} style={{ flex: 1, height: `${h}px`, background: isRecent ? '#0a0a0a' : '#e4e0d8', borderRadius: '3px 3px 0 0', transition: 'height .4s', position: 'relative' }}
                title={`${w.total} reviews`} />
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.65rem', color: '#b0aca6' }}>
          <span>{weeks[0] ? new Date(weeks[0].week).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : ''}</span>
          <span style={{ color: '#7a7670', fontWeight: 600 }}>← last 4 weeks darker</span>
          <span>{weeks[weeks.length-1] ? new Date(weeks[weeks.length-1].week).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : ''}</span>
        </div>
      </div>

      {/* Platform breakdown */}
      {weeks.length > 0 && Object.keys(weeks[0].byPlatform || {}).length > 1 && (
        <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 14 }}>Platform breakdown — last 12 weeks</div>
          {Object.entries(
            weeks.reduce((acc, w) => {
              Object.entries(w.byPlatform || {}).forEach(([p, c]) => { acc[p] = (acc[p] || 0) + c; });
              return acc;
            }, {})
          ).sort(([,a],[,b]) => b-a).map(([platform, count]) => (
            <BarRow key={platform} label={PLATFORMS[platform] || platform} value={count}
              max={Math.max(...Object.values(weeks.reduce((a,w) => { Object.entries(w.byPlatform||{}).forEach(([p,c]) => a[p]=(a[p]||0)+c); return a; }, {})))}
              color={PLATFORM_COLORS[platform]} count={count} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── REPLY QUALITY TAB ────────────────────────
function QualityTab({ newData }) {
  const d = newData?.replyQuality;
  if (!d) return <Empty icon="✓" msg="Loading reply quality data..." />;

  const speed = d.speedBreakdown || {};
  const totalSpeed = Object.values(speed).reduce((a,b) => a+b, 0) || 1;
  const speedBars = [
    { label: 'Under 2h',  val: speed.under2h || 0, color: '#1a6b45' },
    { label: '2 – 6h',    val: speed.h2to6   || 0, color: '#66bb6a' },
    { label: '6 – 12h',   val: speed.h6to12  || 0, color: '#f59e0b' },
    { label: '12 – 24h',  val: speed.h12to24 || 0, color: '#ef8c2a' },
    { label: 'Over 24h',  val: speed.over24h || 0, color: '#c0392b' },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24, background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: 22, marginBottom: 14, alignItems: 'center' }}>
        <ScoreGauge score={d.qualityScore || 0} />
        <div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1rem', fontWeight: 700, marginBottom: 8 }}>
            {d.qualityScore >= 70 ? 'Replies are performing well' : d.qualityScore >= 45 ? 'Room to improve' : 'Needs attention'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[
              { label: 'Total replies',  val: d.totalReplies },
              { label: 'Avg length',     val: d.avgReplyLength ? `${d.avgReplyLength} chars` : '—' },
              { label: 'Avg response',   val: d.avgResponseHours ? `${d.avgResponseHours}h` : '—' },
              { label: 'Edit rate',      val: d.editRate !== undefined ? `${d.editRate}%` : '—', sub: 'staff edited' },
            ].map(s => (
              <div key={s.label} style={{ background: '#f8f7f4', borderRadius: 8, padding: '8px 12px' }}>
                <div style={{ fontSize: '0.68rem', color: '#7a7670', fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.1rem', fontWeight: 700 }}>{s.val ?? '—'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 14 }}>Response time distribution</div>
        {speedBars.map(b => (
          <BarRow key={b.label} label={b.label} value={b.val} max={totalSpeed}
            color={b.color} count={`${Math.round((b.val / totalSpeed) * 100)}%`} />
        ))}
      </div>
    </div>
  );
}

// ── TIMING TAB ───────────────────────────────
function TimingTab({ newData }) {
  const d = newData?.hourAnalysis;
  if (!d) return <Empty icon="⏰" msg="Loading timing data..." />;

  const byHour = d.byHour || [];
  const byDow  = d.byDow  || [];

  // Aggregate hours across platforms
  const hourTotals = Array(24).fill(0);
  for (const row of byHour) {
    hourTotals[row.hour] = (hourTotals[row.hour] || 0) + parseInt(row.count);
  }
  const maxHour = Math.max(...hourTotals, 1);

  const maxDow = Math.max(...byDow.map(r => parseInt(r.count)), 1);

  const fmtHour = h => h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h-12}pm`;

  return (
    <div>
      {(d.peakHourLabel || d.bestDayForRequests) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          {d.peakHourLabel && (
            <div style={{ background: '#f8f7f4', border: '1px solid #e4e0d8', borderRadius: 12, padding: '14px 18px' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 6 }}>Peak review hour</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.6rem', fontWeight: 900 }}>{d.peakHourLabel}</div>
              <div style={{ fontSize: '0.75rem', color: '#7a7670', marginTop: 3 }}>When most reviews arrive</div>
            </div>
          )}
          {d.bestDayForRequests && (
            <div style={{ background: '#e8f5ef', border: '1px solid #bbf7d0', borderRadius: 12, padding: '14px 18px' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#1a6b45', marginBottom: 6 }}>Best day for review requests</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.6rem', fontWeight: 900, color: '#1a6b45' }}>{d.bestDayForRequests}</div>
              <div style={{ fontSize: '0.75rem', color: '#1a6b45', marginTop: 3 }}>Highest avg rating on this day</div>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 14 }}>Hour of day</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 80 }}>
            {hourTotals.map((v, h) => {
              const height = Math.max(2, Math.round((v / maxHour) * 80));
              const isDay = h >= 8 && h <= 20;
              return (
                <div key={h} title={`${fmtHour(h)}: ${v} reviews`}
                  style={{ flex: 1, height: `${height}px`, background: v > 0 ? (isDay ? '#0a0a0a' : '#c8c4bc') : '#f0eeea', borderRadius: '2px 2px 0 0', cursor: 'pointer' }} />
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: '0.62rem', color: '#b0aca6' }}>
            <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 14 }}>Day of week</div>
          {byDow.map(row => (
            <BarRow key={row.dow} label={DAYS_LABELS[row.dow]}
              value={parseInt(row.count)} max={maxDow} color="#0a0a0a"
              count={`${row.count} (${row.avg_rating}★)`} />
          ))}
          {!byDow.length && <div style={{ color: '#b0aca6', fontSize: '0.82rem' }}>No data yet.</div>}
        </div>
      </div>
    </div>
  );
}

// ── CALENDAR TAB ─────────────────────────────
function CalendarTab({ locationId }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  useEffect(() => {
    axios.get(`${API_URL}/calendar/${locationId}?months=12`)
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [locationId]);

  if (loading) return <Empty icon="▦" msg="Loading calendar..." />;
  if (!data?.cells?.length) return <Empty icon="▦" msg="No calendar data yet." />;

  const maxDaily = Math.max(...data.cells.map(c => c.count), 1);
  const cells    = data.cells || [];

  // Build weeks
  const weeks = [];
  let week = [];
  cells.forEach((cell, i) => {
    if (i === 0) for (let d = 0; d < cell.dayOfWeek; d++) week.push(null);
    week.push(cell);
    if (week.length === 7) { weeks.push(week); week = []; }
  });
  if (week.length) { while (week.length < 7) week.push(null); weeks.push(week); }

  const getColor = count => {
    if (!count) return INTENSITY[0];
    const level = Math.ceil((count / maxDaily) * 4);
    return INTENSITY[Math.min(level, 4)];
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
        <StatCard label="Total reviews" value={data.summary?.totalReviews} sub="this year" />
        <StatCard label="Most active day" value={data.summary?.busiestDay} sub="most reviews in a day" accent="#f5c842" />
        <StatCard label="Most active month" value={data.summary?.busiestMonth ? MONTHS_SHORT[parseInt(data.summary.busiestMonth)-1] : '—'} />
        <StatCard label="Avg per week" value={data.summary?.avgPerWeek} sub="reviews" />
      </div>

      <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 14 }}>Review activity — last 12 months</div>
        <div style={{ display: 'flex', gap: 3, overflowX: 'auto' }}>
          {weeks.map((wk, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {wk.map((cell, di) => (
                <div key={di} title={cell ? `${cell.date}: ${cell.count} reviews` : ''}
                  style={{ width: 14, height: 14, borderRadius: 3, background: cell ? getColor(cell.count) : 'transparent', cursor: cell ? 'pointer' : 'default' }} />
              ))}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 10, fontSize: '0.72rem', color: '#7a7670' }}>
          <span>Less</span>
          {INTENSITY.map((c, i) => <div key={i} style={{ width: 12, height: 12, borderRadius: 2, background: c }} />)}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

// ── SURVEY TRENDS TAB ────────────────────────
function SurveyTrendsTab({ newData }) {
  const d = newData?.surveyTrends;
  if (!d) return <Empty icon="📊" msg="Loading survey trends..." />;
  if (!d.hasData) return (
    <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: 40, textAlign: 'center', color: '#7a7670' }}>
      <div style={{ fontSize: '2rem', marginBottom: 12 }}>📊</div>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>No survey data yet</div>
      <div style={{ fontSize: '0.82rem', lineHeight: 1.6 }}>Enable surveys and send your first one to start seeing NPS trends here.</div>
    </div>
  );

  const weekly = d.weekly || [];
  const maxResponses = Math.max(...weekly.map(w => parseInt(w.responses)), 1);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 16 }}>NPS score trend</div>
          {weekly.length > 1 ? (
            <>
              <div style={{ padding: '0 4px' }}>
                <MiniLineChart data={weekly} valueKey="avg_score" color="#0a0a0a" height={70} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                {[weekly[0], weekly[weekly.length-1]].map((w, i) => (
                  <div key={i} style={{ fontSize: '0.72rem', color: '#7a7670' }}>
                    {new Date(w.week).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
                  </div>
                ))}
              </div>
            </>
          ) : <div style={{ color: '#b0aca6', fontSize: '0.82rem' }}>Need at least 2 weeks of data.</div>}
        </div>

        <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 14 }}>Weekly response volume</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 70 }}>
            {weekly.map((w, i) => {
              const h = Math.max(4, Math.round((parseInt(w.responses) / maxResponses) * 70));
              const score = parseFloat(w.avg_score) || 0;
              const c = score >= 8 ? '#1a6b45' : score >= 6 ? '#f59e0b' : '#c0392b';
              return <div key={i} style={{ flex: 1, height: `${h}px`, background: c, borderRadius: '2px 2px 0 0' }} title={`${w.responses} responses, avg ${w.avg_score}`} />;
            })}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Promoter/passive/detractor breakdown */}
        <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 14 }}>Score breakdown — all time</div>
          {(() => {
            const totP = weekly.reduce((s,w) => s+parseInt(w.promoters||0),0);
            const totN = weekly.reduce((s,w) => s+parseInt(w.passives||0),0);
            const totD = weekly.reduce((s,w) => s+parseInt(w.detractors||0),0);
            const tot  = totP+totN+totD || 1;
            return [
              { label: 'Promoters',  val: totP, pct: Math.round(totP/tot*100), color: '#1a6b45', bg: '#e8f5ef' },
              { label: 'Passives',   val: totN, pct: Math.round(totN/tot*100), color: '#92690a', bg: '#fef3cd' },
              { label: 'Detractors', val: totD, pct: Math.round(totD/tot*100), color: '#c0392b', bg: '#fee2e2' },
            ].map(r => (
              <div key={r.label} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                <div style={{ width:80, fontSize:'0.8rem', fontWeight:500 }}>{r.label}</div>
                <div style={{ flex:1, height:8, background:'#f0eeea', borderRadius:50, overflow:'hidden' }}>
                  <div style={{ width:`${r.pct}%`, height:'100%', background:r.color, borderRadius:50, transition:'width .5s' }} />
                </div>
                <span style={{ fontSize:'0.72rem', color:r.color, fontWeight:600, width:38, textAlign:'right' }}>{r.pct}%</span>
                <span style={{ fontSize:'0.72rem', color:'#7a7670', width:20, textAlign:'right' }}>{r.val}</span>
              </div>
            ));
          })()}
        </div>

        {/* Top detractor words */}
        <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 14 }}>
            Top words in private feedback
          </div>
          {d.topWords?.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {d.topWords.map((w, i) => {
                const size = 0.72 + (w.count / d.topWords[0].count) * 0.26;
                return (
                  <span key={i} style={{
                    fontSize: `${size}rem`, fontWeight: w.count > d.topWords[0].count * 0.6 ? 600 : 400,
                    padding: '3px 9px', borderRadius: 50,
                    background: '#f8f7f4', color: '#4a4a48',
                    border: '1px solid #e4e0d8'
                  }}>
                    {w.word}
                  </span>
                );
              })}
            </div>
          ) : <div style={{ color: '#b0aca6', fontSize: '0.82rem' }}>No private feedback yet.</div>}
        </div>
      </div>
    </div>
  );
}

// ── MAIN PAGE ────────────────────────────────
export default function DataPage() {
  const { customer }              = useAuth();
  const [locations, setLocations] = useState([]);
  const [locationId, setLocId]    = useState(null);
  const [days, setDays]           = useState(30);
  const [activeTab, setActiveTab] = useState('sentiment');
  const [newData, setNewData]     = useState(null);
  const [newLoading, setNewLoading] = useState(true);

  useEffect(() => { if (customer) loadLocations(); }, [customer]);
  useEffect(() => { if (locationId) loadNewData(locationId); }, [locationId, days]);

  async function loadLocations() {
    try {
      const res = await axios.get(`${API_URL}/locations/${customer.id}`);
      const locs = res.data.locations || [];
      setLocations(locs);
      if (locs.length > 0) setLocId(locs[0].id);
    } catch (err) { console.error(err); }
  }

  async function loadNewData(locId) {
    setNewLoading(true);
    try {
      const res = await axios.get(`${API_URL}/data/${locId}?days=${days}&weeks=12&months=12`);
      setNewData(res.data);
    } catch (err) { console.error(err); }
    finally { setNewLoading(false); }
  }

  const fi = { padding:'8px 12px', border:'1.5px solid #e4e0d8', borderRadius:8, fontSize:'0.82rem', fontFamily:'DM Sans,sans-serif', outline:'none', background:'white', color:'#1a1a18' };

  return (
    <DashboardLayout>
      {/* Topbar */}
      <div style={{ background:'white', borderBottom:'1px solid #e4e0d8', padding:'16px 32px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h2 style={{ fontSize:'1rem', fontWeight:600 }}>Data</h2>
          <p style={{ fontSize:'0.78rem', color:'#7a7670', marginTop:1 }}>Sentiment · Keywords · Ratings · Velocity · Quality · Timing · Calendar · Surveys</p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <select value={days} onChange={e => setDays(parseInt(e.target.value))} style={fi}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          {locations.length > 1 && (
            <select value={locationId || ''} onChange={e => setLocId(e.target.value)} style={fi}>
              {locations.map(l => <option key={l.id} value={l.id}>{l.business_name}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background:'white', borderBottom:'1px solid #e4e0d8', padding:'0 32px', display:'flex', overflowX:'auto' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding:'12px 18px', border:'none', cursor:'pointer', fontFamily:'DM Sans,sans-serif',
            fontSize:'0.83rem', fontWeight: activeTab === tab.id ? 600 : 500, whiteSpace:'nowrap',
            background:'transparent', color: activeTab === tab.id ? '#0a0a0a' : '#7a7670',
            borderBottom: activeTab === tab.id ? '2px solid #0a0a0a' : '2px solid transparent',
            transition:'all .15s', flexShrink:0
          }}>{tab.label}</button>
        ))}
      </div>

      <div style={{ padding:'24px 32px', maxWidth:960 }}>
        {!locationId ? <Empty icon="⊞" msg="No locations connected yet." /> : (
          <>
            {activeTab === 'sentiment' && <SentimentTab locationId={locationId} days={days} />}
            {activeTab === 'keywords'  && <KeywordsTab  locationId={locationId} />}
            {activeTab === 'ratings'   && <RatingsTab   locationId={locationId} newData={newData} />}
            {activeTab === 'velocity'  && <VelocityTab  newData={newData} />}
            {activeTab === 'quality'   && <QualityTab   newData={newData} />}
            {activeTab === 'timing'    && <TimingTab    newData={newData} />}
            {activeTab === 'calendar'  && <CalendarTab  locationId={locationId} />}
            {activeTab === 'surveys'   && <SurveyTrendsTab newData={newData} />}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
