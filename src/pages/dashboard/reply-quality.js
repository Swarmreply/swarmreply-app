// ============================================
// src/pages/dashboard/reply-quality.js
// Reply Variation Engine + Multi-Language stats
// Shows variation score, overused words,
// language breakdown of incoming reviews
// Growth & Agency only
// ============================================

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import { getLocations } from '../../utils/api';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Circular score gauge
function ScoreGauge({ score, label, size = 120 }) {
  const r = size * 0.38;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#1a6b45' : score >= 55 ? '#f59e0b' : '#c0392b';
  const cx = size / 2, cy = size / 2;

  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0eeea" strokeWidth={size * 0.07} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={size * 0.07}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={size * 0.18} fontWeight="700" fill={color}>{score}</text>
        <text x={cx} y={cy + size * 0.13} textAnchor="middle" fontSize={size * 0.09} fill="#7a7670">/100</text>
      </svg>
      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#7a7670', marginTop: 4 }}>{label}</div>
    </div>
  );
}

export default function ReplyQuality() {
  const { customer } = useAuth();
  const [locations, setLocations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [variationData, setVariationData] = useState(null);
  const [langData, setLangData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { if (customer) loadLocations(); }, [customer]);

  async function loadLocations() {
    const locs = await getLocations(customer.id);
    setLocations(locs);
    if (locs.length > 0) { setSelected(locs[0]); await loadData(locs[0].id); }
  }

  async function loadData(locationId) {
    setLoading(true); setError(null);
    try {
      const [varRes, langRes] = await Promise.allSettled([
        axios.get(`${API_URL}/variation/${locationId}/score`, { headers: { 'x-customer-id': customer.id } }),
        axios.get(`${API_URL}/reviews?locationId=${locationId}&limit=100`)
      ]);
      if (varRes.status === 'fulfilled') setVariationData(varRes.value.data);
      else if (varRes.reason?.response?.status === 403) { setError('upgrade'); return; }

      // Calculate language breakdown from reviews
      if (langRes.status === 'fulfilled') {
        const reviews = langRes.value.data.reviews || [];
        const langCounts = {};
        reviews.forEach(r => {
          const lang = r.language || 'en';
          langCounts[lang] = (langCounts[lang] || 0) + 1;
        });
        setLangData({ counts: langCounts, total: reviews.length });
      }
    } catch (err) {
      setError('Failed to load data');
    } finally { setLoading(false); }
  }

  const LANG_NAMES = { en: 'English', es: 'Spanish', zh: 'Chinese', fr: 'French', de: 'German', ja: 'Japanese', ko: 'Korean', pt: 'Portuguese', it: 'Italian', ar: 'Arabic', ru: 'Russian', vi: 'Vietnamese' };

  return (
    <DashboardLayout>
      <div style={{ background: 'white', borderBottom: '1px solid #e4e0d8', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Reply Quality & Languages</h2>
          <p style={{ fontSize: '0.78rem', color: '#7a7670', marginTop: 1 }}>Variation score, overused words, and multi-language reply coverage</p>
        </div>
        {locations.length > 1 && (
          <select value={selected?.id || ''} onChange={e => { const l = locations.find(x => x.id === e.target.value); if (l) { setSelected(l); loadData(l.id); } }}
            style={{ padding: '6px 12px', borderRadius: 8, fontSize: '0.78rem', border: '1px solid #e4e0d8', background: 'white', cursor: 'pointer' }}>
            {locations.map(l => <option key={l.id} value={l.id}>{l.business_name}</option>)}
          </select>
        )}
      </div>

      <div style={{ padding: '28px 32px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#7a7670' }}><div style={{ fontSize: '2rem', marginBottom: 12 }}>✦</div>Analysing reply quality...</div>
        ) : error === 'upgrade' ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>✦</div>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.5rem', marginBottom: 12 }}>Growth & Agency feature</h3>
            <p style={{ color: '#7a7670', marginBottom: 24 }}>Reply variation tracking and multi-language replies require the Growth or Agency plan.</p>
            <a href="/#pricing" style={{ background: '#0d0d0d', color: 'white', padding: '14px 32px', borderRadius: 50, textDecoration: 'none', fontWeight: 600 }}>Upgrade Plan →</a>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

              {/* Variation score */}
              <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: 28 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 20 }}>Reply variation score</div>
                {variationData ? (
                  <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                    <ScoreGauge score={variationData.score || 0} label="Variation" />
                    <div style={{ flex: 1 }}>
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: '0.825rem', color: '#7a7670', lineHeight: 1.65 }}>{variationData.insight}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                        <div>
                          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', fontWeight: 700 }}>{variationData.totalReplies}</div>
                          <div style={{ fontSize: '0.72rem', color: '#7a7670' }}>Total replies</div>
                        </div>
                        <div>
                          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', fontWeight: 700 }}>{variationData.uniqueOpenings}</div>
                          <div style={{ fontSize: '0.72rem', color: '#7a7670' }}>Unique openings</div>
                        </div>
                      </div>
                      {variationData.overusedWords?.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#c0392b', marginBottom: 6 }}>Overused words</div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {variationData.overusedWords.map(w => (
                              <span key={w} style={{ background: '#fee2e2', color: '#c0392b', padding: '3px 10px', borderRadius: 50, fontSize: '0.78rem', fontWeight: 600 }}>{w}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: 32, color: '#7a7670', fontSize: '0.875rem' }}>Not enough replies yet — variation tracking starts after 5+ replies</div>
                )}
              </div>

              {/* How variation works */}
              <div style={{ background: '#f8f7f4', border: '1px solid #e4e0d8', borderRadius: 14, padding: 28 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 16 }}>Why variation matters</div>
                {[
                  { icon: '🔍', title: 'Google flags templated responses', desc: 'If your replies always start the same way, Google may treat them as spam — reducing their positive ranking impact.' },
                  { icon: '💬', title: 'Customers notice repetition', desc: 'When multiple reviews get near-identical replies, it signals to readers that responses are automated and impersonal.' },
                  { icon: '✦', title: 'SwarmReply tracks this for you', desc: 'Our variation engine checks the last 10 replies before generating each new one — ensuring every response sounds unique.' }
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 3 }}>{item.title}</div>
                      <div style={{ fontSize: '0.8rem', color: '#7a7670', lineHeight: 1.55 }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Language breakdown */}
            <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: 28 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 20 }}>Multi-language reply coverage</div>
              {!langData || langData.total === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: '#7a7670', fontSize: '0.875rem' }}>No review language data yet</div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
                    {Object.entries(langData.counts)
                      .sort(([,a], [,b]) => b - a)
                      .map(([code, count]) => {
                        const pct = Math.round((count / langData.total) * 100);
                        return (
                          <div key={code} style={{ background: '#f8f7f4', borderRadius: 10, padding: '14px 16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{LANG_NAMES[code] || code.toUpperCase()}</span>
                              <span style={{ fontSize: '0.78rem', color: '#7a7670' }}>{pct}%</span>
                            </div>
                            <div style={{ height: 4, background: '#e4e0d8', borderRadius: 50, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: '#0d0d0d', borderRadius: 50 }} />
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#7a7670', marginTop: 6 }}>{count} review{count !== 1 ? 's' : ''}</div>
                          </div>
                        );
                      })}
                  </div>
                  <div style={{ background: '#e8f5ef', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px', fontSize: '0.825rem', color: '#1a6b45', lineHeight: 1.6 }}>
                    ✓ SwarmReply automatically detects the language of each review and replies in the same language. No setup needed.
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
