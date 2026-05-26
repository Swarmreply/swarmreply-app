// ============================================
// src/pages/dashboard/competitors.js
// Competitor Review Benchmarking
// Growth & Agency only
// ============================================

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import { getLocations } from '../../utils/api';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function RatingBar({ name, rating, isUs, rank }) {
  const max = 5;
  const pct = (rating / max) * 100;
  const color = isUs ? '#0d0d0d' : rating >= 4.5 ? '#c0392b' : rating >= 4.0 ? '#f59e0b' : '#1a6b45';

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isUs && (
            <span style={{
              background: '#0d0d0d', color: 'white',
              fontSize: '0.68rem', fontWeight: 700,
              padding: '2px 8px', borderRadius: 50
            }}>YOU</span>
          )}
          <span style={{ fontSize: '0.875rem', fontWeight: isUs ? 700 : 500 }}>{name}</span>
          <span style={{ fontSize: '0.75rem', color: '#7a7670' }}>#{rank}</span>
        </div>
        <span style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: '1.1rem', fontWeight: 700, color
        }}>{rating > 0 ? `${rating}★` : 'N/A'}</span>
      </div>
      <div style={{ height: 8, background: '#f0eeea', borderRadius: 50, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: color, borderRadius: 50,
          transition: 'width 0.8s ease'
        }} />
      </div>
    </div>
  );
}

export default function Competitors() {
  const { customer } = useAuth();
  const [locations, setLocations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (customer) loadLocations();
  }, [customer]);

  async function loadLocations() {
    const locs = await getLocations(customer.id);
    setLocations(locs);
    if (locs.length > 0) { setSelected(locs[0]); await loadData(locs[0].id); }
  }

  async function loadData(locationId) {
    setLoading(true); setError(null);
    try {
      const res = await axios.get(`${API_URL}/competitors/${locationId}`,
        { headers: { 'x-customer-id': customer.id } });
      setData(res.data);
    } catch (err) {
      if (err.response?.status === 403) {
        setError('upgrade');
      } else {
        setError(err.response?.data?.error || 'Failed to load competitor data');
      }
    } finally { setLoading(false); }
  }

  async function handleRefresh() {
    if (!selected) return;
    setRefreshing(true);
    try {
      await axios.post(`${API_URL}/competitors/${selected.id}/refresh`,
        {}, { headers: { 'x-customer-id': customer.id } });
      await loadData(selected.id);
    } catch (err) {
      alert(err.response?.data?.error || 'Refresh failed — make sure your location has coordinates set');
    } finally { setRefreshing(false); }
  }

  const diffColor = data?.ratingDiff > 0 ? '#1a6b45' : data?.ratingDiff < 0 ? '#c0392b' : '#7a7670';
  const diffIcon = data?.ratingDiff > 0 ? '↑' : data?.ratingDiff < 0 ? '↓' : '→';

  return (
    <DashboardLayout>
      <div style={{ background: 'white', borderBottom: '1px solid #e4e0d8', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Competitor Benchmarking</h2>
          <p style={{ fontSize: '0.78rem', color: '#7a7670', marginTop: 1 }}>See how your ratings stack up against nearby competitors</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {locations.length > 1 && (
            <select value={selected?.id || ''} onChange={e => { const l = locations.find(x => x.id === e.target.value); if (l) { setSelected(l); loadData(l.id); } }}
              style={{ padding: '6px 12px', borderRadius: 8, fontSize: '0.78rem', border: '1px solid #e4e0d8', background: 'white', cursor: 'pointer' }}>
              {locations.map(l => <option key={l.id} value={l.id}>{l.business_name}</option>)}
            </select>
          )}
          <button onClick={handleRefresh} disabled={refreshing} style={{ padding: '10px 20px', borderRadius: 50, background: '#0d0d0d', color: 'white', border: 'none', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            {refreshing ? 'Refreshing...' : '↻ Refresh'}
          </button>
        </div>
      </div>

      <div style={{ padding: '28px 32px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#7a7670' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>🔍</div>Searching for competitors...
          </div>
        ) : error === 'upgrade' ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>📊</div>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.5rem', marginBottom: 12 }}>Growth & Agency feature</h3>
            <p style={{ color: '#7a7670', marginBottom: 24 }}>Competitor benchmarking is available on Growth ($99/mo) and Agency ($249/mo) plans.</p>
            <a href="/#pricing" style={{ background: '#0d0d0d', color: 'white', padding: '14px 32px', borderRadius: 50, textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem' }}>Upgrade Plan →</a>
          </div>
        ) : !data?.hasData ? (
          <div style={{ textAlign: 'center', padding: 60, background: 'white', border: '1px solid #e4e0d8', borderRadius: 16 }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>📍</div>
            <p style={{ color: '#7a7670', marginBottom: 16 }}>{data?.message || 'Click Refresh to find nearby competitors'}</p>
            <button onClick={handleRefresh} style={{ background: '#0d0d0d', color: 'white', padding: '12px 28px', borderRadius: 50, border: 'none', fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Find Competitors</button>
          </div>
        ) : (
          <>
            {/* Summary stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
              {[
                { label: 'Your rating', value: `${data.ours.rating}★`, sub: `vs ${data.avgCompetitorRating}★ avg competitor` },
                { label: 'Your rank', value: `#${data.ours.rank} of ${data.ours.total}`, sub: data.ours.rank === 1 ? '🏆 Top rated nearby!' : `${data.ours.total - data.ours.rank} ahead of you` },
                { label: 'Rating vs competitors', value: `${data.ratingDiff > 0 ? '+' : ''}${data.ratingDiff}`, sub: `${diffIcon} ${data.ratingDiff > 0 ? 'above' : data.ratingDiff < 0 ? 'below' : 'equal to'} local average`, color: diffColor },
                { label: 'Total reviews', value: data.ours.totalReviews, sub: `${data.ours.reviewsThisMonth} this month` }
              ].map((s, i) => (
                <div key={i} style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: '18px 20px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 8 }}>{s.label}</div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', fontWeight: 700, color: s.color || '#0d0d0d', lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: '0.75rem', color: '#7a7670', marginTop: 6 }}>{s.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
              {/* Rankings chart */}
              <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: 28 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 20 }}>Rating comparison</div>
                {data.rankings.map((r, i) => (
                  <RatingBar key={r.name} name={r.name} rating={r.rating} isUs={r.isUs} rank={i + 1} />
                ))}
                {data.lastUpdated && (
                  <div style={{ fontSize: '0.72rem', color: '#7a7670', marginTop: 16 }}>
                    Last updated: {new Date(data.lastUpdated).toLocaleDateString()}
                  </div>
                )}
              </div>

              {/* Competitor details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 4 }}>Nearby competitors</div>
                {data.competitors.map((c, i) => (
                  <div key={i} style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 4 }}>{c.name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.78rem', color: '#7a7670' }}>{c.reviewCount} reviews</div>
                      <div style={{ fontWeight: 700, color: c.rating >= data.ours.rating ? '#c0392b' : '#1a6b45' }}>{c.rating}★</div>
                    </div>
                    {c.address && <div style={{ fontSize: '0.72rem', color: '#7a7670', marginTop: 4 }}>{c.address}</div>}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
