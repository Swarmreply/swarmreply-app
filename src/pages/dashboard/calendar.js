// ============================================
// src/pages/dashboard/calendar.js
// Review Volume Calendar
// GitHub-style heatmap + day/month analytics
// Growth & Agency only
// ============================================

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import { getLocations } from '../../utils/api';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const INTENSITY_COLORS = ['#f0eeea', '#c8e6c9', '#81c784', '#388e3c', '#1b5e20'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function Heatmap({ cells, maxDaily }) {
  const [tooltip, setTooltip] = useState(null);

  // Group cells by week
  const weeks = [];
  let week = [];
  cells.forEach((cell, i) => {
    if (i === 0) {
      // Pad first week with empty cells
      for (let d = 0; d < cell.dayOfWeek; d++) {
        week.push(null);
      }
    }
    week.push(cell);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  });
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  return (
    <div style={{ position: 'relative', overflowX: 'auto' }}>
      {/* Day labels */}
      <div style={{ display: 'flex', marginBottom: 4 }}>
        <div style={{ width: 28 }}></div>
        {DAYS.map(d => (
          <div key={d} style={{ width: 12, fontSize: '0.6rem', color: '#7a7670', textAlign: 'center', margin: '0 1px' }}>{d[0]}</div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 0 }}>
        {/* Month labels + columns */}
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Month label on first week of month */}
            <div style={{ height: 14, fontSize: '0.6rem', color: '#7a7670', width: 14 }}>
              {week[0] && new Date(week[0].date).getDate() <= 7
                ? MONTHS_SHORT[week[0].month]
                : ''}
            </div>
            {week.map((cell, di) => (
              <div
                key={di}
                style={{
                  width: 12, height: 12, borderRadius: 2, margin: 1,
                  background: cell ? INTENSITY_COLORS[cell.intensity] : 'transparent',
                  cursor: cell && cell.count > 0 ? 'pointer' : 'default',
                  position: 'relative'
                }}
                onMouseEnter={() => cell && cell.count > 0 && setTooltip({ cell, x: wi * 14, y: di * 14 })}
                onMouseLeave={() => setTooltip(null)}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'absolute', top: tooltip.y + 20, left: Math.min(tooltip.x, 400),
          background: '#0d0d0d', color: 'white', padding: '8px 12px',
          borderRadius: 8, fontSize: '0.78rem', pointerEvents: 'none', zIndex: 10,
          whiteSpace: 'nowrap'
        }}>
          {new Date(tooltip.cell.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}<br />
          {tooltip.cell.count} review{tooltip.cell.count !== 1 ? 's' : ''} · {tooltip.cell.avgRating > 0 ? `${tooltip.cell.avgRating}★ avg` : ''}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
        <span style={{ fontSize: '0.7rem', color: '#7a7670' }}>Less</span>
        {INTENSITY_COLORS.map((c, i) => (
          <div key={i} style={{ width: 12, height: 12, borderRadius: 2, background: c }} />
        ))}
        <span style={{ fontSize: '0.7rem', color: '#7a7670' }}>More</span>
      </div>
    </div>
  );
}

function DayBarChart({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => parseInt(d.count)), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80 }}>
      {data.map(d => {
        const h = Math.round((parseInt(d.count) / max) * 80);
        return (
          <div key={d.dow} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: '0.65rem', color: '#7a7670' }}>{d.count}</div>
            <div style={{ width: '100%', height: h || 3, background: '#0d0d0d', borderRadius: '4px 4px 0 0', minHeight: 3 }} />
            <div style={{ fontSize: '0.65rem', color: '#7a7670' }}>{d.dayName?.substring(0, 3)}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function ReviewCalendar() {
  const { customer } = useAuth();
  const [locations, setLocations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(12);
  const [error, setError] = useState(null);

  useEffect(() => { if (customer) loadLocations(); }, [customer]);

  async function loadLocations() {
    const locs = await getLocations(customer.id);
    setLocations(locs);
    if (locs.length > 0) { setSelected(locs[0]); await loadData(locs[0].id, 12); }
  }

  async function loadData(locationId, m) {
    setLoading(true); setError(null);
    try {
      const res = await axios.get(`${API_URL}/calendar/${locationId}?months=${m}`,
        { headers: { 'x-customer-id': customer.id } });
      setData(res.data);
    } catch (err) {
      setError(err.response?.status === 403 ? 'upgrade' : 'Failed to load calendar data');
    } finally { setLoading(false); }
  }

  return (
    <DashboardLayout>
      <div style={{ background: 'white', borderBottom: '1px solid #e4e0d8', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Review Volume Calendar</h2>
          <p style={{ fontSize: '0.78rem', color: '#7a7670', marginTop: 1 }}>See when customers leave reviews most — plan staffing and promotions accordingly</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[6, 12].map(m => (
            <button key={m} onClick={() => { setMonths(m); if (selected) loadData(selected.id, m); }} style={{ padding: '6px 14px', borderRadius: 50, fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', border: '1px solid #e4e0d8', background: months === m ? '#0d0d0d' : 'white', color: months === m ? 'white' : '#7a7670', transition: 'all 0.15s' }}>{m}mo</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '28px 32px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#7a7670' }}><div style={{ fontSize: '2rem', marginBottom: 12 }}>📅</div>Building calendar...</div>
        ) : error === 'upgrade' ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>📅</div>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.5rem', marginBottom: 12 }}>Growth & Agency feature</h3>
            <p style={{ color: '#7a7670', marginBottom: 24 }}>The review calendar is available on Growth and Agency plans.</p>
            <a href="/#pricing" style={{ background: '#0d0d0d', color: 'white', padding: '14px 32px', borderRadius: 50, textDecoration: 'none', fontWeight: 600 }}>Upgrade Plan →</a>
          </div>
        ) : !data || data.insights?.totalReviews === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#7a7670' }}><div style={{ fontSize: '2rem', marginBottom: 12 }}>📅</div>No review data yet in this period</div>
        ) : (
          <>
            {/* Insight cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
              {[
                { label: 'Total reviews', value: data.insights.totalReviews },
                { label: 'Busiest day', value: data.insights.peakDay?.name || '—', sub: `${data.insights.peakDay?.count || 0} reviews` },
                { label: 'Quietest day', value: data.insights.slowDay?.name || '—', sub: 'Consider promotions' },
                { label: 'Longest streak', value: `${data.insights.longestStreak}d`, sub: 'consecutive days with reviews' }
              ].map((s, i) => (
                <div key={i} style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: '18px 20px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 8 }}>{s.label}</div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', fontWeight: 700, lineHeight: 1, textTransform: 'capitalize' }}>{s.value}</div>
                  {s.sub && <div style={{ fontSize: '0.75rem', color: '#7a7670', marginTop: 6 }}>{s.sub}</div>}
                </div>
              ))}
            </div>

            {/* Heatmap */}
            <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: 28, marginBottom: 20 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 20 }}>Review activity heatmap</div>
              <Heatmap cells={data.heatmapCells} maxDaily={data.maxDaily} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Day of week */}
              <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: 24 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 20 }}>By day of week</div>
                <DayBarChart data={data.dayOfWeekData} />
              </div>

              {/* Monthly trend */}
              <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: 24 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 16 }}>Monthly breakdown</div>
                {data.monthlyData.slice(-6).map(m => {
                  const max = Math.max(...data.monthlyData.map(x => x.count), 1);
                  const pct = (m.count / max) * 100;
                  return (
                    <div key={m.month} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 36, fontSize: '0.75rem', color: '#7a7670' }}>{m.monthName?.substring(0,3)}</div>
                      <div style={{ flex: 1, height: 8, background: '#f0eeea', borderRadius: 50, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: '#0d0d0d', borderRadius: 50 }} />
                      </div>
                      <div style={{ width: 24, fontSize: '0.75rem', color: '#7a7670', textAlign: 'right' }}>{m.count}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
