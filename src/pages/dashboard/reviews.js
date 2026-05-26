// ============================================
// pages/dashboard/reviews.js
// Reviews page — All reviews / Alerts / AI Visibility tabs
// ============================================

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import { getReviews, getLocations } from '../../utils/api';

const TABS = [
  { id: 'all',    label: 'All reviews' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'aivis',  label: '✦ AI Visibility' },
];

const STARS = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

function ReviewCard({ review, onReply }) {
  return (
    <div style={{ padding: '18px 24px', borderBottom: '1px solid #e4e0d8' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 2 }}>{review.reviewer_name || 'Anonymous'}</div>
          <div style={{ color: '#f5c842', fontSize: '.875rem', letterSpacing: 1 }}>{STARS(review.star_rating)}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: '.72rem', color: '#7a7670' }}>
            {review.platform} · {new Date(review.review_date).toLocaleDateString()}
          </span>
          {review.status === 'replied' && (
            <span style={{ background: '#e8f5ef', color: '#1a6b45', fontSize: '.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 50 }}>Replied</span>
          )}
          {review.status === 'pending' && (
            <span style={{ background: '#fef3cd', color: '#92690a', fontSize: '.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 50 }}>Pending</span>
          )}
          {(review.status === 'processing' || !review.status) && (
            <span style={{ background: '#e8f0fe', color: '#1a4baa', fontSize: '.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 50 }}>Processing</span>
          )}
        </div>
      </div>
      {review.review_text && (
        <p style={{ fontSize: '.875rem', color: '#3a3a38', lineHeight: 1.7, marginBottom: review.reply_text ? 10 : 0 }}>
          {review.review_text}
        </p>
      )}
      {review.reply_text && (
        <div style={{ background: '#f8f7f4', borderRadius: 10, padding: '12px 14px', marginTop: 10, borderLeft: '3px solid #f5c842' }}>
          <div style={{ fontSize: '.68rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 5 }}>AI Reply</div>
          <p style={{ fontSize: '.84rem', color: '#3a3a38', lineHeight: 1.65 }}>{review.reply_text}</p>
        </div>
      )}
    </div>
  );
}

function AIVisibilityTab() {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, marginBottom: 18 }}>
        <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: '24px', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '3rem', fontWeight: 900, color: '#0a0a0a', lineHeight: 1 }}>73</div>
          <div style={{ fontSize: '.68rem', fontWeight: 700, color: '#7a7670', letterSpacing: '.1em', textTransform: 'uppercase', margin: '4px 0 8px' }}>/100 AI Visibility Score</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 11px', background: '#e8f5ef', borderRadius: 50 }}>
            <span style={{ color: '#1a6b45', fontWeight: 700, fontSize: '.78rem' }}>+8</span>
            <span style={{ fontSize: '.72rem', color: '#1a6b45' }}>this week</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {[['Queries run','32','4 AI models'],['Mentioned','24','73% rate'],['Positive','19','of mentions'],['Missed','8','not mentioned']].map(([l,v,s]) => (
              <div key={l} style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 6 }}>{l}</div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.6rem', fontWeight: 900 }}>{v}</div>
                <div style={{ fontSize: '.75rem', color: '#7a7670', marginTop: 3 }}>{s}</div>
              </div>
            ))}
          </div>
          <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: '.68rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 10 }}>Visibility by AI model</div>
            {[['ChatGPT','88%','#74aa9c'],['Gemini','75%','#e8453c'],['Perplexity','63%','#7c3aed'],['Claude','75%','#0a0a0a']].map(([name,pct,color]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: '.84rem', fontWeight: 600, width: 90 }}>{name}</span>
                <div style={{ flex: 1, height: 7, background: '#f0eeea', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: pct, height: '100%', background: color, borderRadius: 4 }} />
                </div>
                <span style={{ fontSize: '.8rem', fontWeight: 700, width: 36 }}>{pct}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ background: '#0a0a0a', borderRadius: 14, padding: '20px 24px' }}>
        <div style={{ fontSize: '.68rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', marginBottom: 12 }}>How to improve your score</div>
        {['Keep Google reviews coming — AI models weight rating and review volume heavily.','Publish Google Posts weekly — fresh content signals an active business.','Keep listings synced across Apple Maps, Bing, and other platforms.'].map((tip, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#f5c842', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.65rem', fontWeight: 800, color: '#0a0a0a', flexShrink: 0 }}>{i+1}</span>
            <div style={{ fontSize: '.8rem', color: 'rgba(255,255,255,.7)', lineHeight: 1.55 }}>{tip}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Reviews() {
  const { customer } = useAuth();
  const [tab, setTab]         = useState('all');
  const [reviews, setReviews] = useState([]);
  const [alerts, setAlerts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');

  useEffect(() => { if (customer) load(); }, [customer]);

  async function load() {
    try {
      const locs = await getLocations(customer.id);
      if (!locs.length) return;
      const data = await getReviews(locs[0].id, { limit: 50 });
      const all  = data.reviews || [];
      setReviews(all);
      setAlerts(all.filter(r => r.star_rating <= 2));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = tab === 'alerts' ? alerts : reviews.filter(r => {
    if (filter === 'positive') return r.star_rating >= 4;
    if (filter === 'negative') return r.star_rating <= 2;
    if (filter === 'unanswered') return r.status !== 'replied';
    return true;
  });

  return (
    <DashboardLayout title="Reviews">
      {/* Tabs */}
      <div style={{ background: 'white', borderBottom: '1px solid #e4e0d8', padding: '0 24px', display: 'flex', gap: 2 }} className="tabs-scrollable">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '14px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: '.84rem', fontWeight: tab === t.id ? 700 : 500,
            color: tab === t.id ? '#0a0a0a' : '#7a7670',
            borderBottom: tab === t.id ? '2px solid #0a0a0a' : '2px solid transparent',
            transition: 'all .15s', fontFamily: 'inherit',
          }}>
            {t.label}
            {t.id === 'alerts' && alerts.length > 0 && (
              <span style={{ marginLeft: 6, background: '#c0392b', color: 'white', fontSize: '.6rem', fontWeight: 700, padding: '1px 6px', borderRadius: 50 }}>{alerts.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'aivis' ? <AIVisibilityTab /> : (
        <div>
          {/* Filter bar */}
          {tab === 'all' && (
            <div style={{ padding: '12px 24px', background: 'white', borderBottom: '1px solid #e4e0d8', display: 'flex', gap: 8 }}>
              {[['all','All'],['positive','Positive'],['negative','Negative'],['unanswered','Unanswered']].map(([v,l]) => (
                <button key={v} onClick={() => setFilter(v)} style={{
                  padding: '6px 14px', borderRadius: 50, border: '1.5px solid', cursor: 'pointer',
                  borderColor: filter === v ? '#0a0a0a' : '#e4e0d8',
                  background: filter === v ? '#0a0a0a' : 'transparent',
                  color: filter === v ? 'white' : '#7a7670',
                  fontSize: '.8rem', fontWeight: 500, fontFamily: 'inherit',
                }}>{l}</button>
              ))}
            </div>
          )}

          <div style={{ background: 'white', margin: 24, borderRadius: 14, border: '1px solid #e4e0d8', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#7a7670' }}>Loading reviews…</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#7a7670' }}>
                {tab === 'alerts' ? 'No negative reviews — great work! 🐝' : 'No reviews found.'}
              </div>
            ) : (
              filtered.map(r => <ReviewCard key={r.id} review={r} />)
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
