// ============================================
// src/pages/dashboard/keywords.js
// Review keyword tracker dashboard
// Shows frequency, sentiment per keyword,
// categories, trending, and keyword search
// ============================================

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import { getLocations } from '../../utils/api';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const CATEGORIES = [
  { value: null, label: 'All' },
  { value: 'food', label: 'Food' },
  { value: 'drink', label: 'Drink' },
  { value: 'service', label: 'Service' },
  { value: 'staff', label: 'Staff' },
  { value: 'atmosphere', label: 'Atmosphere' },
  { value: 'price', label: 'Price' },
  { value: 'quality', label: 'Quality' },
  { value: 'cleanliness', label: 'Cleanliness' },
  { value: 'other', label: 'Other' },
];

const SENTIMENT_COLORS = {
  positive: { bg: '#e8f5ef', text: '#1a6b45', bar: '#1a6b45' },
  neutral: { bg: '#fef3cd', text: '#92690a', bar: '#f59e0b' },
  negative: { bg: '#fee2e2', text: '#c0392b', bar: '#c0392b' },
};

// Single keyword row in the main table
function KeywordRow({ kw, maxMentions, onSearch }) {
  const total = parseInt(kw.total_mentions);
  const pos = parseInt(kw.positive_count);
  const neu = parseInt(kw.neutral_count);
  const neg = parseInt(kw.negative_count);
  const barWidth = Math.round((total / maxMentions) * 100);

  const dominantSentiment = pos >= neg && pos >= neu ? 'positive'
    : neg > pos && neg >= neu ? 'negative' : 'neutral';
  const sc = SENTIMENT_COLORS[dominantSentiment];

  return (
    <tr
      onClick={() => onSearch(kw.keyword)}
      style={{ cursor: 'pointer', transition: 'background 0.1s' }}
      onMouseEnter={e => e.currentTarget.style.background = '#f8f7f4'}
      onMouseLeave={e => e.currentTarget.style.background = 'white'}
    >
      <td style={{ padding: '12px 16px', fontSize: '0.875rem', fontWeight: 500 }}>
        {kw.keyword}
      </td>
      <td style={{ padding: '12px 8px' }}>
        <span style={{
          background: sc.bg, color: sc.text,
          fontSize: '0.7rem', fontWeight: 700,
          padding: '2px 8px', borderRadius: 50,
          textTransform: 'capitalize'
        }}>{kw.category}</span>
      </td>
      <td style={{ padding: '12px 16px', width: '30%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            flex: 1, height: 6, background: '#f0eeea',
            borderRadius: 50, overflow: 'hidden'
          }}>
            <div style={{
              height: '100%', width: `${barWidth}%`,
              background: sc.bar, borderRadius: 50,
              transition: 'width 0.5s ease'
            }} />
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, minWidth: 20 }}>{total}</span>
        </div>
      </td>
      <td style={{ padding: '12px 8px' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {pos > 0 && (
            <span style={{ fontSize: '0.7rem', color: '#1a6b45', fontWeight: 600 }}>
              +{pos}
            </span>
          )}
          {neu > 0 && (
            <span style={{ fontSize: '0.7rem', color: '#7a7670', fontWeight: 600 }}>
              ~{neu}
            </span>
          )}
          {neg > 0 && (
            <span style={{ fontSize: '0.7rem', color: '#c0392b', fontWeight: 600 }}>
              -{neg}
            </span>
          )}
        </div>
      </td>
      <td style={{ padding: '12px 16px', fontSize: '0.75rem', color: '#7a7670' }}>
        {kw.last_seen ? new Date(kw.last_seen).toLocaleDateString() : '—'}
      </td>
      <td style={{ padding: '12px 16px' }}>
        <span style={{ fontSize: '0.75rem', color: '#7a7670' }}>View →</span>
      </td>
    </tr>
  );
}

// Search result review card
function SearchReviewCard({ review }) {
  const stars = '★'.repeat(review.star_rating) + '☆'.repeat(5 - review.star_rating);
  return (
    <div style={{
      background: 'white', border: '1px solid #e4e0d8',
      borderRadius: 12, padding: 20, marginBottom: 12
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: '#f0eeea', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#7a7670'
        }}>
          {review.reviewer_name?.charAt(0) || '?'}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
            {review.reviewer_name || 'Anonymous'}
          </div>
          <div style={{
            fontSize: '0.78rem',
            color: review.star_rating >= 4 ? '#f59e0b' : '#e53e3e'
          }}>{stars}</div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#7a7670' }}>
          {review.review_date ? new Date(review.review_date).toLocaleDateString() : ''}
        </div>
      </div>
      {review.review_text && (
        <p style={{
          fontSize: '0.875rem', color: '#0d0d0d',
          lineHeight: 1.65, marginBottom: 10, fontStyle: 'italic'
        }}>"{review.review_text}"</p>
      )}
      {review.posted_reply && (
        <div style={{
          background: '#f8f7f4', borderLeft: '3px solid #0d0d0d',
          padding: '8px 12px', borderRadius: '0 6px 6px 0',
          fontSize: '0.8rem', color: '#7a7670', lineHeight: 1.6
        }}>
          <strong style={{ color: '#0d0d0d', fontWeight: 600 }}>Your reply: </strong>
          {review.posted_reply.substring(0, 150)}
          {review.posted_reply.length > 150 ? '...' : ''}
        </div>
      )}
    </div>
  );
}

export default function KeywordTracker() {
  const { customer } = useAuth();
  const [locations, setLocations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [category, setCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // all | positive | negative | trending

  useEffect(() => {
    if (customer) loadLocations();
  }, [customer]);

  async function loadLocations() {
    const locs = await getLocations(customer.id);
    setLocations(locs);
    if (locs.length > 0) {
      setSelected(locs[0]);
      await loadKeywords(locs[0].id, period, null);
    }
  }

  async function loadKeywords(locationId, days, cat) {
    setLoading(true);
    setSearchResults(null);
    setSearchQuery('');
    try {
      const params = new URLSearchParams({ days });
      if (cat) params.append('category', cat);
      const res = await axios.get(`${API_URL}/keywords/${locationId}?${params}`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load keywords:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(keyword) {
    if (!selected || !keyword.trim()) return;
    setSearching(true);
    setSearchQuery(keyword);
    try {
      const res = await axios.get(
        `${API_URL}/keywords/${selected.id}/search?q=${encodeURIComponent(keyword)}`
      );
      setSearchResults(res.data);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  }

  function handleCategoryChange(cat) {
    setCategory(cat);
    if (selected) loadKeywords(selected.id, period, cat);
  }

  function handlePeriodChange(days) {
    setPeriod(days);
    if (selected) loadKeywords(selected.id, days, category);
  }

  // Get displayed keywords based on active tab
  const displayedKeywords = (() => {
    if (!data?.keywords) return [];
    switch (activeTab) {
      case 'positive': return data.topPositive || [];
      case 'negative': return data.topNegative || [];
      case 'trending': return [];
      default: return data.keywords || [];
    }
  })();

  const maxMentions = displayedKeywords.length > 0
    ? Math.max(...displayedKeywords.map(k => parseInt(k.total_mentions)), 1)
    : 1;

  return (
    <DashboardLayout>
      {/* Topbar */}
      <div style={{
        background: 'white', borderBottom: '1px solid #e4e0d8',
        padding: '16px 32px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50, flexWrap: 'wrap', gap: 12
      }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Keyword Tracker</h2>
          <p style={{ fontSize: '0.78rem', color: '#7a7670', marginTop: 1 }}>
            What customers talk about most — and how they feel about it
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => handlePeriodChange(d)} style={{
              padding: '6px 14px', borderRadius: 50, fontSize: '0.78rem',
              fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              border: '1px solid #e4e0d8',
              background: period === d ? '#0d0d0d' : 'white',
              color: period === d ? 'white' : '#7a7670', transition: 'all 0.15s'
            }}>{d}d</button>
          ))}
          {locations.length > 1 && (
            <select
              value={selected?.id || ''}
              onChange={e => {
                const loc = locations.find(l => l.id === e.target.value);
                if (loc) { setSelected(loc); loadKeywords(loc.id, period, category); }
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
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>🔍</div>
            Analyzing keywords...
          </div>
        ) : !data || data.totalKeywords === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#7a7670' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>💬</div>
            <div style={{ fontSize: '0.875rem' }}>No keyword data yet — reviews will be analyzed as they come in</div>
          </div>
        ) : (
          <>
            {/* Summary stats */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 16, marginBottom: 24
            }}>
              {[
                { label: 'Unique keywords', value: data.totalKeywords },
                { label: 'Total mentions', value: data.totalMentions },
                { label: 'Top positive', value: data.topPositive?.[0]?.keyword || '—' },
                { label: 'Top concern', value: data.topNegative?.[0]?.keyword || '—' }
              ].map((s, i) => (
                <div key={i} style={{
                  background: 'white', border: '1px solid #e4e0d8',
                  borderRadius: 14, padding: '18px 20px'
                }}>
                  <div style={{
                    fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: '#7a7670', marginBottom: 8
                  }}>{s.label}</div>
                  <div style={{
                    fontFamily: 'Playfair Display, serif',
                    fontSize: typeof s.value === 'number' ? '2rem' : '1.2rem',
                    fontWeight: 700, lineHeight: 1, textTransform: 'capitalize'
                  }}>{s.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>

              {/* Main keyword table */}
              <div>
                {/* Search bar */}
                <div style={{
                  background: 'white', border: '1px solid #e4e0d8',
                  borderRadius: 14, padding: '16px 20px', marginBottom: 16,
                  display: 'flex', gap: 10
                }}>
                  <input
                    type="text"
                    placeholder="Search a keyword to see all reviews mentioning it..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch(searchQuery)}
                    style={{
                      flex: 1, border: '1px solid #e4e0d8', borderRadius: 8,
                      padding: '10px 14px', fontSize: '0.875rem', outline: 'none',
                      fontFamily: 'DM Sans, sans-serif'
                    }}
                  />
                  <button
                    onClick={() => handleSearch(searchQuery)}
                    disabled={!searchQuery.trim() || searching}
                    style={{
                      padding: '10px 20px', borderRadius: 8,
                      background: '#0d0d0d', color: 'white', border: 'none',
                      fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                      fontFamily: 'DM Sans, sans-serif'
                    }}
                  >
                    {searching ? '...' : 'Search'}
                  </button>
                  {searchResults && (
                    <button
                      onClick={() => { setSearchResults(null); setSearchQuery(''); }}
                      style={{
                        padding: '10px 14px', borderRadius: 8,
                        background: '#f0eeea', color: '#7a7670', border: 'none',
                        fontSize: '0.875rem', cursor: 'pointer',
                        fontFamily: 'DM Sans, sans-serif'
                      }}
                    >Clear</button>
                  )}
                </div>

                {/* Search results */}
                {searchResults && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{
                      fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em',
                      textTransform: 'uppercase', color: '#7a7670', marginBottom: 12
                    }}>
                      {searchResults.reviews.length} reviews mentioning "{searchResults.keyword}"
                    </div>
                    {searchResults.reviews.length === 0 ? (
                      <div style={{
                        background: 'white', border: '1px solid #e4e0d8',
                        borderRadius: 12, padding: 24, textAlign: 'center',
                        color: '#7a7670', fontSize: '0.875rem'
                      }}>No reviews found for this keyword</div>
                    ) : (
                      searchResults.reviews.map(r => (
                        <SearchReviewCard key={r.id} review={r} />
                      ))
                    )}
                  </div>
                )}

                {/* Tab bar */}
                {!searchResults && (
                  <>
                    <div style={{ display: 'flex', gap: 2, marginBottom: 0 }}>
                      {[
                        { id: 'all', label: `All (${data.totalKeywords})` },
                        { id: 'positive', label: `Praised (${data.topPositive?.length || 0})` },
                        { id: 'negative', label: `Concerns (${data.topNegative?.length || 0})` },
                        { id: 'trending', label: `Trending (${data.trending?.length || 0})` }
                      ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                          padding: '8px 16px', fontSize: '0.8rem', fontWeight: 500,
                          border: '1px solid #e4e0d8',
                          borderBottom: activeTab === tab.id ? '1px solid white' : '1px solid #e4e0d8',
                          borderRadius: '8px 8px 0 0',
                          background: activeTab === tab.id ? 'white' : '#f8f7f4',
                          color: activeTab === tab.id ? '#0d0d0d' : '#7a7670',
                          cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                          marginBottom: activeTab === tab.id ? '-1px' : 0,
                          position: 'relative', zIndex: activeTab === tab.id ? 1 : 0
                        }}>{tab.label}</button>
                      ))}
                    </div>

                    {/* Keyword table */}
                    <div style={{
                      background: 'white', border: '1px solid #e4e0d8',
                      borderRadius: '0 8px 8px 8px', overflow: 'hidden'
                    }}>
                      {activeTab === 'trending' ? (
                        // Trending view
                        <div style={{ padding: 20 }}>
                          {data.trending?.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 24, color: '#7a7670', fontSize: '0.875rem' }}>
                              Not enough data yet to show trends — come back after a week
                            </div>
                          ) : data.trending?.map((t, i) => (
                            <div
                              key={t.keyword}
                              onClick={() => handleSearch(t.keyword)}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '12px 0', borderBottom: '1px solid #e4e0d8',
                                cursor: 'pointer'
                              }}
                            >
                              <div>
                                <span style={{ fontWeight: 500, fontSize: '0.875rem', textTransform: 'capitalize' }}>
                                  {t.keyword}
                                </span>
                                <div style={{ fontSize: '0.75rem', color: '#7a7670', marginTop: 2 }}>
                                  {t.prevCount} mentions last week → {t.recentCount} this week
                                </div>
                              </div>
                              <span style={{
                                background: '#e8f5ef', color: '#1a6b45',
                                padding: '4px 12px', borderRadius: 50,
                                fontSize: '0.78rem', fontWeight: 700
                              }}>↑ +{t.change}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        // All / Positive / Negative table
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: '#f8f7f4', borderBottom: '1px solid #e4e0d8' }}>
                              {['Keyword', 'Category', 'Frequency', 'Sentiment', 'Last seen', ''].map(h => (
                                <th key={h} style={{
                                  padding: '10px 16px', fontSize: '0.72rem', fontWeight: 700,
                                  letterSpacing: '0.06em', textTransform: 'uppercase',
                                  color: '#7a7670', textAlign: 'left'
                                }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {displayedKeywords.length === 0 ? (
                              <tr>
                                <td colSpan={6} style={{
                                  padding: 32, textAlign: 'center',
                                  color: '#7a7670', fontSize: '0.875rem'
                                }}>No keywords in this filter</td>
                              </tr>
                            ) : displayedKeywords.map(kw => (
                              <KeywordRow
                                key={kw.keyword}
                                kw={kw}
                                maxMentions={maxMentions}
                                onSearch={handleSearch}
                              />
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Right panel — category filter + top lists */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Category filter */}
                <div style={{
                  background: 'white', border: '1px solid #e4e0d8',
                  borderRadius: 14, padding: 20
                }}>
                  <div style={{
                    fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: '#7a7670', marginBottom: 12
                  }}>Filter by category</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {CATEGORIES.map(cat => (
                      <button
                        key={String(cat.value)}
                        onClick={() => handleCategoryChange(cat.value)}
                        style={{
                          padding: '5px 12px', borderRadius: 50, fontSize: '0.78rem',
                          fontWeight: 500, cursor: 'pointer',
                          fontFamily: 'DM Sans, sans-serif',
                          border: '1px solid #e4e0d8',
                          background: category === cat.value ? '#0d0d0d' : '#f8f7f4',
                          color: category === cat.value ? 'white' : '#7a7670',
                          transition: 'all 0.15s'
                        }}
                      >{cat.label}</button>
                    ))}
                  </div>
                </div>

                {/* Top praised */}
                <div style={{
                  background: '#f0fdf4', border: '1px solid #bbf7d0',
                  borderRadius: 14, padding: 20
                }}>
                  <div style={{
                    fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: '#1a6b45', marginBottom: 12
                  }}>Most praised</div>
                  {data.topPositive?.slice(0, 5).map((k, i) => (
                    <div
                      key={k.keyword}
                      onClick={() => handleSearch(k.keyword)}
                      style={{
                        display: 'flex', justifyContent: 'space-between',
                        padding: '8px 0', borderBottom: '1px solid #dcfce7',
                        cursor: 'pointer', fontSize: '0.85rem'
                      }}
                    >
                      <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{k.keyword}</span>
                      <span style={{ color: '#1a6b45', fontWeight: 700 }}>+{k.positive_count}</span>
                    </div>
                  ))}
                </div>

                {/* Top concerns */}
                {data.topNegative?.length > 0 && (
                  <div style={{
                    background: '#fff5f5', border: '1px solid #fecaca',
                    borderRadius: 14, padding: 20
                  }}>
                    <div style={{
                      fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em',
                      textTransform: 'uppercase', color: '#c0392b', marginBottom: 12
                    }}>Top concerns</div>
                    {data.topNegative?.slice(0, 5).map((k, i) => (
                      <div
                        key={k.keyword}
                        onClick={() => handleSearch(k.keyword)}
                        style={{
                          display: 'flex', justifyContent: 'space-between',
                          padding: '8px 0', borderBottom: '1px solid #fee2e2',
                          cursor: 'pointer', fontSize: '0.85rem'
                        }}
                      >
                        <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{k.keyword}</span>
                        <span style={{ color: '#c0392b', fontWeight: 700 }}>-{k.negative_count}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Category breakdown */}
                {Object.keys(data.byCategory || {}).length > 0 && (
                  <div style={{
                    background: 'white', border: '1px solid #e4e0d8',
                    borderRadius: 14, padding: 20
                  }}>
                    <div style={{
                      fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em',
                      textTransform: 'uppercase', color: '#7a7670', marginBottom: 12
                    }}>By category</div>
                    {Object.entries(data.byCategory).map(([cat, kws]) => (
                      <div
                        key={cat}
                        onClick={() => handleCategoryChange(cat)}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '8px 0', borderBottom: '1px solid #e4e0d8',
                          cursor: 'pointer'
                        }}
                      >
                        <span style={{
                          fontSize: '0.825rem', fontWeight: 500, textTransform: 'capitalize'
                        }}>{cat}</span>
                        <span style={{
                          background: '#f0eeea', color: '#7a7670',
                          fontSize: '0.72rem', fontWeight: 700,
                          padding: '2px 8px', borderRadius: 50
                        }}>{kws.length}</span>
                      </div>
                    ))}
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
