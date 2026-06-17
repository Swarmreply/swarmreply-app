// ============================================
// pages/dashboard/reviews.js
// Reviews page — All reviews / Alerts / AI Visibility tabs
// ============================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import { getReviews, getLocations, approveReply } from '../../utils/api';
import EmptyState from '../../components/EmptyState';
import { Button } from '../../components/ui';
import { Skeleton } from '../../components/Skeleton';
import { ApprovalsPanel } from './approvals';
import { FEATURES } from '../../utils/featureFlags';

const TABS = [
  { id: 'all',       label: 'All reviews' },
  { id: 'alerts',    label: 'Alerts' },
  { id: 'approvals', label: 'Approvals', flag: 'autoReply' }, // AI reply approvals — hidden until Q3 launch
].filter(t => !t.flag || FEATURES[t.flag]);

const STARS = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

// Loading placeholder shaped like a review row.
function ReviewSkeletonRow() {
  return (
    <div style={{ padding: '18px 24px', borderBottom: '1px solid #f0ede7' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <Skeleton width={130} height={12} style={{ marginBottom: 8 }} />
          <Skeleton width={90} height={10} />
        </div>
        <Skeleton width={70} height={22} radius={50} />
      </div>
      <Skeleton width="100%" height={10} style={{ marginBottom: 6 }} />
      <Skeleton width="80%" height={10} />
    </div>
  );
}

// Source badge per review platform — capitalized, colored, consistent with the
// Home page. Reviews come from Google and Facebook (both in the reviews table).
const PLATFORM_BADGE = {
  google:   { label: 'Google',   bg: '#eef1f5', fg: '#3c4043' },
  facebook: { label: 'Facebook', bg: '#e7f0ff', fg: '#1877F2' },
};
function platformBadge(p) {
  const key = (p || '').toLowerCase();
  return PLATFORM_BADGE[key]
    || { label: p ? p.charAt(0).toUpperCase() + p.slice(1) : 'Other', bg: '#f0eeea', fg: '#7a7670' };
}

function ReviewCard({ review, onApprove }) {
  const [approving, setApproving] = useState(false);
  const postedReply = review.posted_reply;
  const isPendingApproval = !postedReply && review.reply_status === 'pending_approval' && !!review.generated_reply;
  const replyLabel = FEATURES.autoReply ? 'AI Reply' : 'Reply';

  async function handleApprove() {
    if (!review.reply_id || approving) return;
    setApproving(true);
    try {
      await approveReply(review.reply_id);
      if (onApprove) await onApprove();
    } catch (e) {
      console.error(e);
      alert('Could not post the reply. Please try again.');
      setApproving(false);
    }
  }

  return (
    <div style={{ padding: '18px 24px', borderBottom: '1px solid #e4e0d8' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 2 }}>{review.reviewer_name || 'Anonymous'}</div>
          <div style={{ color: '#f5c842', fontSize: '.875rem', letterSpacing: 1 }}>{STARS(review.star_rating)}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {(() => { const b = platformBadge(review.platform); return (
            <span style={{ fontSize: '.65rem', fontWeight: 700, background: b.bg, color: b.fg, padding: '2px 8px', borderRadius: 50 }}>{b.label}</span>
          ); })()}
          <span style={{ fontSize: '.72rem', color: '#7a7670' }}>
            {new Date(review.review_date).toLocaleDateString()}
          </span>
          {review.status === 'replied' && (
            <span style={{ background: '#e8f5ef', color: '#1a6b45', fontSize: '.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 50 }}>Replied</span>
          )}
          {isPendingApproval && (
            <span style={{ background: '#fff3d4', color: '#9a6a00', fontSize: '.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 50 }}>Pending Approval</span>
          )}
          {review.status === 'pending' && !isPendingApproval && (
            <span style={{ background: '#fef3cd', color: '#92690a', fontSize: '.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 50 }}>Pending</span>
          )}
          {(review.status === 'processing' || !review.status) && (
            <span style={{ background: '#e8f0fe', color: '#1a4baa', fontSize: '.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 50 }}>Processing</span>
          )}
        </div>
      </div>
      {review.review_text && (
        <p style={{ fontSize: '.875rem', color: '#3a3a38', lineHeight: 1.7, marginBottom: (postedReply || isPendingApproval) ? 10 : 0 }}>
          {review.review_text}
        </p>
      )}

      {/* Reply that was posted */}
      {postedReply && (
        <div style={{ background: '#f8f7f4', borderRadius: 10, padding: '12px 14px', marginTop: 10, borderLeft: '3px solid #f5c842' }}>
          <div style={{ fontSize: '.68rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 5 }}>{replyLabel}</div>
          <p style={{ fontSize: '.84rem', color: '#3a3a38', lineHeight: 1.65 }}>{postedReply}</p>
        </div>
      )}

      {/* Drafted reply awaiting the customer's approval (Approve before posting) */}
      {isPendingApproval && (
        <div style={{ background: '#fffaf0', borderRadius: 10, padding: '12px 14px', marginTop: 10, borderLeft: '3px solid #d4a515' }}>
          <div style={{ fontSize: '.68rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#9a6a00', marginBottom: 5 }}>Suggested reply · awaiting approval</div>
          <p style={{ fontSize: '.84rem', color: '#3a3a38', lineHeight: 1.65, marginBottom: 12 }}>{review.generated_reply}</p>
          <button onClick={handleApprove} disabled={approving} style={{
            padding: '7px 16px', borderRadius: 50, background: '#1a6b45', color: 'white',
            border: 'none', cursor: approving ? 'default' : 'pointer', fontSize: '.8rem',
            fontWeight: 700, fontFamily: 'inherit', opacity: approving ? 0.6 : 1
          }}>
            {approving ? 'Posting…' : '✓ Approve & Post'}
          </button>
        </div>
      )}
    </div>
  );
}


export default function Reviews() {
  const { customer } = useAuth();
  const router = useRouter();
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
      const all  = Array.isArray(data) ? data : (data?.reviews || []);
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

      <div>
        {tab === 'approvals' ? (
          <ApprovalsPanel />
        ) : (
          <>
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

          {loading ? (
            <div style={{ background: 'white', margin: 24, borderRadius: 14, border: '1.5px solid #e4e0d8', overflow: 'hidden' }}>
              {Array.from({ length: 4 }).map((_, i) => <ReviewSkeletonRow key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ margin: 24 }}>
              {tab === 'alerts' ? (
                <EmptyState
                  icon="🎉"
                  title="No reviews need attention"
                  description="No negative reviews right now — nice work keeping customers happy."
                />
              ) : reviews.length === 0 ? (
                <EmptyState
                  icon="⭐"
                  title="No reviews yet"
                  description="Send your first review request and new reviews will appear here automatically."
                  action={<Button href="/dashboard/grow" size="sm">Send a review request</Button>}
                />
              ) : (
                <EmptyState
                  compact
                  icon="🔍"
                  title="No reviews match this filter"
                  description="Try a different filter above to see more."
                />
              )}
            </div>
          ) : (
            <div style={{ background: 'white', margin: 24, borderRadius: 14, border: '1.5px solid #e4e0d8', overflow: 'hidden' }}>
              {filtered.map(r => <ReviewCard key={r.id} review={r} onApprove={load} />)}
            </div>
          )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
