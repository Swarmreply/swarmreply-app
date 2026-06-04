// ============================================
// src/pages/dashboard/index.js
// Main dashboard — stats, recent reviews, activity
// ============================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import { getStats, getReviews, getLocations } from '../../utils/api';
import SetupProgressCard from '../../components/SetupProgressCard';
import { Skeleton } from '../../components/Skeleton';

// Time-aware greeting for the daily-habit header.
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// Loading placeholder matching a stat card.
function StatSkeleton() {
  return (
    <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: '20px 24px' }}>
      <Skeleton width={90} height={11} style={{ marginBottom: 14 }} />
      <Skeleton width={70} height={26} radius={6} style={{ marginBottom: 10 }} />
      <Skeleton width={60} height={10} />
    </div>
  );
}

// Loading placeholder shaped like a review row.
function ReviewRowSkeleton() {
  return (
    <div style={{ padding: '16px 24px', borderBottom: '1px solid #f0ede7' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 9 }}>
        <Skeleton width={120} height={12} />
        <Skeleton width={64} height={12} />
      </div>
      <Skeleton width="100%" height={10} style={{ marginBottom: 6 }} />
      <Skeleton width="75%" height={10} />
    </div>
  );
}

// Stat card component
function StatCard({ label, value, sub, subColor = '#1a6b45', href, dest, accent }) {
  const router = useRouter();
  const clickable = !!(href || dest);

  function handleClick() {
    if (href)  router.push(href);
    if (dest)  router.push(dest);
  }

  return (
    <div
      onClick={clickable ? handleClick : undefined}
      style={{
        background: 'white', border: '1px solid #e4e0d8',
        borderRadius: 14, padding: '20px 24px',
        borderTop: accent ? `2px solid ${accent}` : undefined,
        cursor: clickable ? 'pointer' : 'default',
        transition: 'all .15s',
      }}
      onMouseEnter={e => { if (clickable) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = accent ? '0 6px 20px rgba(245,200,66,.18)' : '0 6px 20px rgba(0,0,0,.08)'; }}}
      onMouseLeave={e => { if (clickable) { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}}
    >
      <div style={{
        fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: '#7a7670', marginBottom: 10
      }}>{label}</div>
      <div style={{
        fontFamily: 'Playfair Display, serif',
        fontSize: '2rem', fontWeight: 700, lineHeight: 1
      }}>{value}</div>
      {sub && (
        <div style={{ fontSize: '0.75rem', color: '#7a7670', marginTop: 6 }}>
          <span style={{ color: subColor, fontWeight: 600 }}>{sub}</span>
        </div>
      )}
      {clickable && dest && (
        <div style={{ fontSize: '0.65rem', color: '#7a7670', marginTop: 8, display: 'flex', alignItems: 'center', opacity: .7 }}>
          <span style={{ flex: 1 }}>{dest.replace('/dashboard/','').replace('-',' ').replace(/\w/g, c => c.toUpperCase())}</span>
          <span>→</span>
        </div>
      )}
    </div>
  );
}

// Review item component
function ReviewItem({ review }) {
  const stars = '★'.repeat(review.star_rating) + '☆'.repeat(5 - review.star_rating);
  const isReplied = review.status === 'replied';
  const isPending = review.status === 'pending' || review.status === 'processing';

  return (
    <div style={{
      padding: '18px 24px',
      borderBottom: '1px solid #e4e0d8',
      display: 'flex', gap: 14, alignItems: 'flex-start'
    }}>
      {/* Avatar */}
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: '#f0eeea', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: '0.78rem', fontWeight: 700,
        color: '#7a7670', flexShrink: 0
      }}>
        {review.reviewer_name?.charAt(0) || '?'}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
            {review.reviewer_name || 'Anonymous'}
          </span>
          <span style={{ color: review.star_rating >= 4 ? '#f59e0b' : '#e53e3e', fontSize: '0.78rem' }}>
            {stars}
          </span>
          <span style={{
            fontSize: '0.68rem', background: '#f0eeea',
            padding: '2px 8px', borderRadius: 50,
            color: '#7a7670', fontWeight: 600
          }}>Google</span>
        </div>

        {/* Review text */}
        {review.review_text && (
          <div style={{
            fontSize: '0.825rem', color: '#7a7670',
            lineHeight: 1.6, marginBottom: 8,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
          }}>
            "{review.review_text}"
          </div>
        )}

        {/* Reply preview */}
        {review.posted_reply && (
          <div style={{
            background: '#f8f7f4', borderLeft: '3px solid #0d0d0d',
            padding: '10px 14px', borderRadius: '0 8px 8px 0', marginBottom: 8
          }}>
            <div style={{ fontSize: '0.8rem', lineHeight: 1.6, color: '#0d0d0d' }}>
              {review.posted_reply.substring(0, 120)}
              {review.posted_reply.length > 120 ? '...' : ''}
            </div>
          </div>
        )}

        {/* Status badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isReplied && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: '#e8f5ef', color: '#1a6b45',
              padding: '3px 10px', borderRadius: 50,
              fontSize: '0.68rem', fontWeight: 700
            }}>✓ Replied</span>
          )}
          {isPending && (
            <span style={{
              background: '#fef3cd', color: '#92690a',
              padding: '3px 10px', borderRadius: 50,
              fontSize: '0.68rem', fontWeight: 700
            }}>⏳ Pending</span>
          )}
          {review.status === 'error' && (
            <span style={{
              background: '#fee2e2', color: '#c0392b',
              padding: '3px 10px', borderRadius: 50,
              fontSize: '0.68rem', fontWeight: 700
            }}>⚠ Error</span>
          )}
          <span style={{ fontSize: '0.72rem', color: '#7a7670' }}>
            {new Date(review.review_date).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { customer } = useAuth();
  const [stats, setStats] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState(null);

  useEffect(() => {
    if (customer) loadData();
  }, [customer]);

  async function loadData() {
    try {
      const [statsData, locsData] = await Promise.all([
        getStats(customer.id),
        getLocations(customer.id)
      ]);

      setStats(statsData);
      setLocations(locsData);

      // Load reviews for first location
      if (locsData.length > 0) {
        setSelectedLocation(locsData[0]);
        const reviewsData = await getReviews(locsData[0].id, { limit: 10 });
        setReviews(reviewsData);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function switchLocation(location) {
    setSelectedLocation(location);
    const reviewsData = await getReviews(location.id, { limit: 10 });
    setReviews(reviewsData);
  }

  const responseRate = stats
    ? stats.total_reviews > 0
      ? Math.round((stats.total_replied / stats.total_reviews) * 100)
      : 0
    : 0;

  return (
    <DashboardLayout>
      {/* Top bar */}
      <div style={{
        background: 'white', borderBottom: '1px solid #e4e0d8',
        padding: '16px 32px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50
      }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>
            {greeting()}{customer?.name ? `, ${customer.name.split(' ')[0]}` : ''}
          </h2>
          <p style={{ fontSize: '0.78rem', color: '#7a7670', marginTop: 1 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#e8f5ef', color: '#1a6b45',
            padding: '5px 12px', borderRadius: 50,
            fontSize: '0.72rem', fontWeight: 700
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#1a6b45'
            }}></span>
            Live & Running
          </div>
        </div>
      </div>

      {/* Non-blocking onboarding nudge */}
      <SetupProgressCard />

      <div style={{ padding: '28px 32px' }}>

        {/* Stats grid */}
        <div className="grid-responsive-4" style={{ marginBottom: 28 }}>
          {loading ? (
            <>
              <StatSkeleton /><StatSkeleton /><StatSkeleton /><StatSkeleton />
            </>
          ) : (
            <>
          <StatCard
            label="Avg Rating"
            value={`${stats?.avg_rating || '–'} ★`}
            sub="↑ All platforms"
            dest="/dashboard/reviews"
          />
          <StatCard
            label="Total Reviews"
            value={stats?.reviews_this_month || 0}
            sub="↑ This month"
            dest="/dashboard/reviews"
          />
          <StatCard
            label="✦ AI Visibility Score"
            value={stats?.ai_visibility_score ? `${stats.ai_visibility_score}/100` : '73/100'}
            sub="↑ vs last week"
            subColor="#0a0a0a"
            accent="#f5c842"
            dest="/dashboard/ai-visibility"
          />
          <StatCard
            dest="/dashboard/surveys"
            label="NPS Score"
            value={stats?.nps_score ? `+${stats.nps_score}` : '+62'}
            sub="↑ Excellent"
            subColor="#1a6b45"
            dest="/dashboard/grow"
          />
            </>
          )}
        </div>

        {/* Location selector + Reviews */}
        <div className="grid-responsive-2" style={{ marginBottom: 28 }}>
          {/* Reviews feed */}
          <div style={{
            background: 'white', border: '1px solid #e4e0d8',
            borderRadius: 14, overflow: 'hidden'
          }}>
            <div style={{
              padding: '18px 24px', borderBottom: '1px solid #e4e0d8',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                Recent Reviews & Replies
              </span>
              {locations.length > 1 && (
                <select
                  value={selectedLocation?.id || ''}
                  onChange={e => {
                    const loc = locations.find(l => l.id === e.target.value);
                    if (loc) switchLocation(loc);
                  }}
                  style={{
                    fontSize: '0.78rem', padding: '4px 10px',
                    border: '1px solid #e4e0d8', borderRadius: 8,
                    background: 'white', cursor: 'pointer'
                  }}
                >
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.business_name}</option>
                  ))}
                </select>
              )}
            </div>

            {loading ? (
              <>
                <ReviewRowSkeleton /><ReviewRowSkeleton /><ReviewRowSkeleton /><ReviewRowSkeleton />
              </>
            ) : reviews.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#7a7670' }}>
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>🐝</div>
                <div style={{ fontSize: '0.875rem', marginBottom: 16 }}>
                  No reviews yet — your swarm is ready and waiting.
                </div>
                <a href="/dashboard/grow" style={{
                  display: 'inline-block', background: '#0a0a0a', color: 'white',
                  padding: '9px 18px', borderRadius: 50,
                  fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none'
                }}>Send a review request</a>
              </div>
            ) : (
              reviews.map(review => (
                <ReviewItem key={review.id} review={review} />
              ))
            )}
          </div>

          {/* Locations panel */}
          <div style={{
            background: 'white', border: '1px solid #e4e0d8',
            borderRadius: 14, overflow: 'hidden'
          }}>
            <div style={{
              padding: '18px 24px', borderBottom: '1px solid #e4e0d8',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Your Locations</span>
              <a href="/dashboard/locations/add" style={{
                fontSize: '0.78rem', color: '#7a7670', textDecoration: 'none'
              }}>+ Add</a>
            </div>

            {loading ? (
              <>
                {[0, 1].map(i => (
                  <div key={i} style={{ padding: '14px 24px', borderBottom: '1px solid #f0ede7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <Skeleton width={140} height={12} style={{ marginBottom: 7 }} />
                      <Skeleton width={90} height={9} />
                    </div>
                    <Skeleton width={8} height={8} radius={50} />
                  </div>
                ))}
              </>
            ) : locations.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center' }}>
                <div style={{ fontSize: '0.875rem', color: '#7a7670', marginBottom: 16 }}>
                  No locations connected yet
                </div>
                <a href="/dashboard/locations/add" style={{
                  display: 'inline-block', background: '#0d0d0d', color: 'white',
                  padding: '10px 20px', borderRadius: 50,
                  fontSize: '0.825rem', fontWeight: 600, textDecoration: 'none'
                }}>Connect Google Business</a>
              </div>
            ) : (
              locations.map(loc => (
                <div key={loc.id} style={{
                  padding: '14px 24px', borderBottom: '1px solid #e4e0d8',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      {loc.business_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#7a7670', marginTop: 2, textTransform: 'capitalize' }}>
                      {loc.platform} · {loc.tone} tone
                    </div>
                  </div>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: loc.is_active ? '#1a6b45' : '#e53e3e'
                  }}></div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
