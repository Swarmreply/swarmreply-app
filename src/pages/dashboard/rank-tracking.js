// pages/dashboard/rank-tracking.js — Item 13
import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;
function authH() {
  const t = typeof window !== 'undefined' ? localStorage.getItem('swarmreply_token') : '';
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function TrendBadge({ trend, delta }) {
  if (!trend || trend === 'stable') return <span style={{ fontSize: '.72rem', color: '#7a7670' }}>—</span>;
  const up = trend === 'up';
  return (
    <span style={{ fontSize: '.72rem', fontWeight: 700, color: up ? '#1a6b45' : '#c0392b', background: up ? '#e8f5ef' : '#fee2e2', padding: '2px 7px', borderRadius: 50 }}>
      {up ? '↑' : '↓'} {Math.abs(delta)} pos
    </span>
  );
}

function PositionBadge({ position, inLocalPack, packPosition }) {
  if (!position && !inLocalPack) {
    return <span style={{ fontSize: '.8rem', color: '#7a7670' }}>Not found</span>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
      {position && (
        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.4rem', fontWeight: 900, color: position <= 3 ? '#1a6b45' : position <= 10 ? '#f59e0b' : '#7a7670', lineHeight: 1 }}>
          #{position}
        </span>
      )}
      {inLocalPack && (
        <span style={{ fontSize: '.67rem', fontWeight: 700, background: '#e8f5ef', color: '#1a6b45', padding: '2px 7px', borderRadius: 50 }}>
          Map pack #{packPosition}
        </span>
      )}
    </div>
  );
}

function MiniChart({ history }) {
  if (!history?.length) return <div style={{ fontSize: '.72rem', color: '#7a7670' }}>No data yet</div>;
  const positions = history.filter(h => h.position).map(h => h.position);
  if (!positions.length) return <div style={{ fontSize: '.72rem', color: '#7a7670' }}>Not ranked</div>;
  const max = Math.max(...positions);
  const min = Math.min(...positions);
  const range = max - min || 1;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 36 }}>
      {history.slice(0, 8).reverse().map((h, i) => {
        const pct = h.position ? ((max - h.position) / range) * 80 + 20 : 5;
        const color = !h.position ? '#f0eeea' : h.inLocalPack ? '#1a6b45' : h.position <= 3 ? '#66bb6a' : h.position <= 10 ? '#f59e0b' : '#e4e0d8';
        return (
          <div key={i} title={h.position ? `#${h.position}${h.inLocalPack ? ' (pack)' : ''}` : 'Not ranked'}
            style={{ width: 10, height: `${pct}%`, background: color, borderRadius: '2px 2px 0 0', flexShrink: 0 }} />
        );
      })}
    </div>
  );
}

export default function RankTracking() {
  const { customer } = useAuth();
  const [data, setData]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [lastChecked, setLast]    = useState(null);
  const [checking, setChecking]   = useState(false);
  const [newKw, setNewKw]         = useState('');
  const [adding, setAdding]       = useState(false);
  const [error, setError]         = useState('');

  const MAX = 5;

  useEffect(() => { if (customer) load(); }, [customer]);

  async function load() {
    try {
      const res = await axios.get(`${API}/rank`, { headers: authH() });
      setData(res.data.keywords || []);
      setLast(res.data.lastChecked);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function runCheck() {
    setChecking(true);
    try {
      await axios.post(`${API}/rank/check`, {}, { headers: authH() });
      setTimeout(load, 8000); // Wait 8s then reload
    } catch (e) { console.error(e); }
    finally { setTimeout(() => setChecking(false), 8000); }
  }

  async function addKeyword() {
    if (!newKw.trim()) return;
    if (data.length >= MAX) return setError(`Maximum ${MAX} keywords reached`);
    setAdding(true); setError('');
    try {
      await axios.post(`${API}/rank/keywords`, { keyword: newKw.trim() }, { headers: authH() });
      setNewKw('');
      load();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to add keyword');
    } finally { setAdding(false); }
  }

  async function removeKeyword(id) {
    try {
      await axios.delete(`${API}/rank/keywords/${id}`, { headers: authH() });
      load();
    } catch (e) { console.error(e); }
  }

  const avgPosition = data.filter(k => k.position).length
    ? Math.round(data.filter(k => k.position).reduce((s, k) => s + k.position, 0) / data.filter(k => k.position).length)
    : null;
  const inPackCount = data.filter(k => k.inLocalPack).length;

  return (
    <DashboardLayout title="Rank Tracking">
      <div className="page-padding" style={{ padding: 24 }}>

        {/* Stats */}
        <div className="grid-responsive-4" style={{ marginBottom: 20 }}>
          {[
            ['Keywords tracked', data.length + '/' + MAX, 'active keywords'],
            ['Avg position', avgPosition ? '#' + avgPosition : '—', 'across all keywords'],
            ['In local pack', inPackCount, inPackCount === 1 ? 'keyword in map pack' : 'keywords in map pack'],
            ['Last checked', lastChecked ? new Date(lastChecked).toLocaleDateString() : 'Never', 'runs every Monday'],
          ].map(([label, value, sub]) => (
            <div key={label} style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 6 }}>{label}</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.7rem', fontWeight: 900, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: '.72rem', color: '#7a7670', marginTop: 4 }}>{sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>

          {/* Keyword results table */}
          <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #e4e0d8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '.875rem' }}>Keyword positions</span>
              <button onClick={runCheck} disabled={checking} style={{ padding: '7px 16px', borderRadius: 50, background: '#0a0a0a', color: 'white', border: 'none', cursor: 'pointer', fontSize: '.8rem', fontWeight: 700, fontFamily: 'inherit', opacity: checking ? .5 : 1 }}>
                {checking ? '↻ Checking...' : '↻ Check now'}
              </button>
            </div>

            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#7a7670' }}>Loading...</div>
            ) : data.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#7a7670' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 10 }}>📍</div>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>No keywords yet</div>
                <div style={{ fontSize: '.84rem' }}>Add keywords below to start tracking your Google positions.</div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.84rem' }}>
                <thead>
                  <tr style={{ background: '#f8f7f4' }}>
                    {['Keyword','Position','Trend','8-week chart',''].map(h => (
                      <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: '.65rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', borderBottom: '1px solid #e4e0d8' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map(kw => (
                    <tr key={kw.keyword} style={{ borderBottom: '1px solid #f8f7f4' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600 }}>{kw.keyword}</div>
                        {kw.isAuto && <span style={{ fontSize: '.65rem', color: '#7a7670', background: '#f0eeea', padding: '1px 6px', borderRadius: 50 }}>auto</span>}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <PositionBadge position={kw.position} inLocalPack={kw.inLocalPack} packPosition={kw.packPosition} />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <TrendBadge trend={kw.trend} delta={kw.trendDelta} />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <MiniChart history={kw.history} />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {!kw.isAuto && (
                          <button onClick={() => removeKeyword(kw.keywordId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7a7670', fontSize: '.9rem', padding: '2px 4px' }}>✕</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Add keyword + info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: 18 }}>
              <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 12 }}>Add keyword</div>
              {error && <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 9, padding: '8px 12px', fontSize: '.78rem', color: '#c0392b', marginBottom: 10 }}>{error}</div>}
              <input
                value={newKw} onChange={e => setNewKw(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addKeyword()}
                placeholder="e.g. best pizza Sacramento"
                disabled={data.length >= MAX}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e4e0d8', borderRadius: 9, fontSize: 16, fontFamily: 'inherit', outline: 'none', marginBottom: 10 }}
              />
              <button onClick={addKeyword} disabled={adding || !newKw.trim() || data.length >= MAX} style={{ width: '100%', padding: 10, borderRadius: 50, background: '#0a0a0a', color: 'white', border: 'none', cursor: 'pointer', fontSize: '.84rem', fontWeight: 700, fontFamily: 'inherit', opacity: !newKw.trim() || data.length >= MAX ? .4 : 1 }}>
                {adding ? 'Adding...' : 'Add keyword'}
              </button>
              <div style={{ fontSize: '.72rem', color: '#7a7670', marginTop: 8, textAlign: 'center' }}>{data.length}/{MAX} keywords used</div>
            </div>

            <div style={{ background: '#0a0a0a', borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: '.68rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', marginBottom: 10 }}>How to pick keywords</div>
              {['Include your city — "dentist Sacramento"','Think like a customer searching on Google','Brand queries show you against direct competitors','Category queries show your local SEO health','Local pack = top 3 map results = highest value'].map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: '.78rem', color: 'rgba(255,255,255,.6)', lineHeight: 1.5 }}>
                  <span style={{ color: '#f5c842', flexShrink: 0 }}>✦</span> {tip}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
