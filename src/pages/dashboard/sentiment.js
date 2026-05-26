// ============================================
// src/pages/dashboard/sentiment.js
// Sentiment analysis dashboard page
// Shows mood trends, topics, emotions, insights
// ============================================

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import { getLocations } from '../../utils/api';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Sentiment score gauge
function ScoreGauge({ score, label }) {
  const color = score >= 70 ? '#1a6b45' : score >= 45 ? '#f59e0b' : '#c0392b';
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div style={{ textAlign: 'center' }}>
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#f0eeea" strokeWidth="8" />
        <circle
          cx="50" cy="50" r="40"
          fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x="50" y="46" textAnchor="middle" fontSize="18" fontWeight="700" fill={color}>{score}</text>
        <text x="50" y="62" textAnchor="middle" fontSize="10" fill="#7a7670">/100</text>
      </svg>
      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#7a7670', marginTop: 4 }}>{label}</div>
    </div>
  );
}

// Topic pill
function TopicPill({ topic, count, total }) {
  const pct = Math.round((count / total) * 100);
  return (
    <div style={{
      background: 'white', border: '1px solid #e4e0d8',
      borderRadius: 10, padding: '10px 14px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    }}>
      <span style={{ fontSize: '0.875rem', fontWeight: 500, textTransform: 'capitalize' }}>{topic}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 60, height: 6, background: '#f0eeea', borderRadius: 50, overflow: 'hidden'
        }}>
          <div style={{ width: `${pct}%`, height: '100%', background: '#0d0d0d', borderRadius: 50 }} />
        </div>
        <span style={{ fontSize: '0.75rem', color: '#7a7670', minWidth: 20 }}>{count}</span>
      </div>
    </div>
  );
}

// Weekly trend bar chart
function TrendChart({ weeklyScores }) {
  if (!weeklyScores || weeklyScores.length === 0) return null;
  const max = 100;
  const validWeeks = weeklyScores.filter(w => w.averageScore !== null);

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'flex-end',
        gap: 8, height: 80, marginBottom: 8
      }}>
        {weeklyScores.map((week, i) => {
          const height = week.averageScore ? Math.round((week.averageScore / max) * 80) : 0;
          const color = !week.averageScore ? '#f0eeea'
            : week.averageScore >= 70 ? '#1a6b45'
            : week.averageScore >= 45 ? '#f59e0b' : '#c0392b';
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ fontSize: '0.65rem', color: '#7a7670' }}>
                {week.averageScore || '–'}
              </div>
              <div style={{
                width: '100%', height: height || 4,
                background: color, borderRadius: '4px 4px 0 0',
                minHeight: 4, transition: 'height 0.5s ease'
              }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {weeklyScores.map((week, i) => (
          <div key={i} style={{
            flex: 1, textAlign: 'center',
            fontSize: '0.6rem', color: '#7a7670', whiteSpace: 'nowrap', overflow: 'hidden'
          }}>
            {week.weekLabel}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SentimentDashboard() {
  const { customer } = useAuth();
  const [locations, setLocations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [sentiment, setSentiment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    if (customer) loadLocations();
  }, [customer]);

  async function loadLocations() {
    const locs = await getLocations(customer.id);
    setLocations(locs);
    if (locs.length > 0) {
      setSelected(locs[0]);
      await loadSentiment(locs[0].id, period);
    }
  }

  async function loadSentiment(locationId, days) {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/sentiment/${locationId}?days=${days}`);
      setSentiment(res.data);
    } catch (err) {
      console.error('Failed to load sentiment:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePeriodChange(days) {
    setPeriod(days);
    if (selected) await loadSentiment(selected.id, days);
  }

  const trendColor = sentiment?.trend === 'improving' ? '#1a6b45'
    : sentiment?.trend === 'declining' ? '#c0392b' : '#7a7670';
  const trendIcon = sentiment?.trend === 'improving' ? '↑'
    : sentiment?.trend === 'declining' ? '↓' : '→';

  return (
    <DashboardLayout>
      {/* Topbar */}
      <div style={{
        background: 'white', borderBottom: '1px solid #e4e0d8',
        padding: '16px 32px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50
      }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Sentiment Analysis</h2>
          <p style={{ fontSize: '0.78rem', color: '#7a7670', marginTop: 1 }}>
            How customers really feel about your business
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Period selector */}
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => handlePeriodChange(d)} style={{
              padding: '6px 14px', borderRadius: 50, fontSize: '0.78rem',
              fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              border: '1px solid #e4e0d8',
              background: period === d ? '#0d0d0d' : 'white',
              color: period === d ? 'white' : '#7a7670',
              transition: 'all 0.15s'
            }}>{d}d</button>
          ))}
          {/* Location selector */}
          {locations.length > 1 && (
            <select
              value={selected?.id || ''}
              onChange={e => {
                const loc = locations.find(l => l.id === e.target.value);
                if (loc) { setSelected(loc); loadSentiment(loc.id, period); }
              }}
              style={{
                padding: '6px 12px', borderRadius: 8, fontSize: '0.78rem',
                border: '1px solid #e4e0d8', background: 'white', cursor: 'pointer'
              }}
            >
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.business_name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div style={{ padding: '28px 32px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#7a7670' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>🐝</div>
            Analyzing sentiment...
          </div>
        ) : !sentiment || sentiment.reviewCount === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#7a7670' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>📊</div>
            No reviews yet in this period
          </div>
        ) : (
          <>
            {/* Score overview */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'auto 1fr',
              gap: 24, background: 'white', border: '1px solid #e4e0d8',
              borderRadius: 14, padding: 28, marginBottom: 20
            }}>
              <ScoreGauge score={sentiment.averageScore || 0} label="Sentiment score" />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{
                    fontFamily: 'Playfair Display, serif',
                    fontSize: '1.8rem', fontWeight: 700
                  }}>{sentiment.averageScore}/100</span>
                  <span style={{
                    background: trendColor === '#1a6b45' ? '#e8f5ef' : trendColor === '#c0392b' ? '#fee2e2' : '#f0eeea',
                    color: trendColor, padding: '4px 12px', borderRadius: 50,
                    fontSize: '0.78rem', fontWeight: 700
                  }}>{trendIcon} {sentiment.trend}</span>
                </div>
                <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1a6b45' }}>{sentiment.positiveCount}</div>
                    <div style={{ fontSize: '0.72rem', color: '#7a7670' }}>Positive</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f59e0b' }}>{sentiment.neutralCount}</div>
                    <div style={{ fontSize: '0.72rem', color: '#7a7670' }}>Neutral</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#c0392b' }}>{sentiment.negativeCount}</div>
                    <div style={{ fontSize: '0.72rem', color: '#7a7670' }}>Negative</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{sentiment.reviewCount}</div>
                    <div style={{ fontSize: '0.72rem', color: '#7a7670' }}>Total</div>
                  </div>
                </div>
                <TrendChart weeklyScores={sentiment.weeklyScores} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              {/* Topics */}
              <div style={{
                background: 'white', border: '1px solid #e4e0d8',
                borderRadius: 14, padding: 24
              }}>
                <h3 style={{
                  fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: '#7a7670', marginBottom: 16
                }}>Most mentioned topics</h3>
                {sentiment.topTopics.length === 0 ? (
                  <p style={{ fontSize: '0.875rem', color: '#7a7670' }}>No topic data yet</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {sentiment.topTopics.map(t => (
                      <TopicPill key={t.topic} topic={t.topic} count={t.count} total={sentiment.reviewCount} />
                    ))}
                  </div>
                )}
              </div>

              {/* Emotions + Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Emotions */}
                <div style={{
                  background: 'white', border: '1px solid #e4e0d8',
                  borderRadius: 14, padding: 24
                }}>
                  <h3 style={{
                    fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: '#7a7670', marginBottom: 12
                  }}>Customer emotions</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {sentiment.topEmotions.length === 0 ? (
                      <p style={{ fontSize: '0.875rem', color: '#7a7670' }}>No emotion data yet</p>
                    ) : sentiment.topEmotions.map(e => (
                      <span key={e.emotion} style={{
                        background: '#f8f7f4', border: '1px solid #e4e0d8',
                        padding: '6px 14px', borderRadius: 50,
                        fontSize: '0.825rem', textTransform: 'capitalize'
                      }}>{e.emotion} ({e.count})</span>
                    ))}
                  </div>
                </div>

                {/* Action items */}
                {sentiment.actionableInsights.length > 0 && (
                  <div style={{
                    background: '#fffbeb', border: '1px solid #fcd34d',
                    borderRadius: 14, padding: 24
                  }}>
                    <h3 style={{
                      fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em',
                      textTransform: 'uppercase', color: '#92690a', marginBottom: 12
                    }}>Suggested actions</h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {sentiment.actionableInsights.map((insight, i) => (
                        <li key={i} style={{
                          fontSize: '0.825rem', color: '#0d0d0d',
                          padding: '6px 0', borderBottom: '1px solid #fde68a',
                          display: 'flex', gap: 8, lineHeight: 1.5
                        }}>
                          <span>→</span>{insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
