// ============================================
// src/pages/dashboard/google-posts.js
// Google Posts Auto-Publisher Dashboard
// ============================================

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const DAYS        = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const HOURS       = Array.from({ length: 24 }, (_, i) => ({
  val: i,
  label: i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`
}));
const CTA_TYPES   = [
  { id: 'LEARN_MORE',    label: 'Learn more' },
  { id: 'BOOK',          label: 'Book' },
  { id: 'ORDER',         label: 'Order online' },
  { id: 'SHOP',          label: 'Shop' },
  { id: 'SIGN_UP',       label: 'Sign up' },
  { id: 'CALL',          label: 'Call us' },
  { id: 'GET_DIRECTIONS',label: 'Get directions' },
];
const FREQUENCIES = [
  { id: 'weekly',   label: 'Weekly',     desc: 'Best for active businesses — 4 posts/month' },
  { id: 'biweekly', label: 'Bi-weekly',  desc: '2 posts/month' },
  { id: 'monthly',  label: 'Monthly',    desc: '1 post/month' },
];

const STATUS_STYLES = {
  published: { bg: '#e8f5ef', color: '#1a6b45', label: '✓ Published' },
  pending:   { bg: '#fef3cd', color: '#92690a', label: '⏳ Pending' },
  draft:     { bg: '#e8f0fe', color: '#1a4baa', label: '✏️ Draft' },
  failed:    { bg: '#fee2e2', color: '#c0392b', label: '✗ Failed' },
  expired:   { bg: '#f0eeea', color: '#7a7670', label: '○ Expired' },
  rejected:  { bg: '#fee2e2', color: '#c0392b', label: '✗ Rejected' },
  deleted:   { bg: '#f0eeea', color: '#7a7670', label: '— Deleted' },
};

// ─── SECTION HEADER ───────────────────────
function SectionHeader({ title, desc }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0a0a0a' }}>{title}</div>
      {desc && <div style={{ fontSize: '0.78rem', color: '#7a7670', marginTop: 2 }}>{desc}</div>}
    </div>
  );
}

// ─── TOGGLE ───────────────────────────────
function Toggle({ value, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      role="switch" aria-checked={value}
      disabled={disabled}
      style={{
        width: 46, height: 24, borderRadius: 50, position: 'relative',
        background: value ? '#0a0a0a' : '#e4e0d8',
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background .2s', flexShrink: 0, opacity: disabled ? 0.5 : 1
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: value ? 25 : 3,
        width: 18, height: 18, borderRadius: '50%', background: 'white',
        transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)'
      }} />
    </button>
  );
}

// ─── SETTING ROW ──────────────────────────
function SettingRow({ label, desc, children }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      alignItems: 'flex-start', padding: '14px 0',
      borderBottom: '1px solid #f0eeea'
    }}>
      <div style={{ flex: 1, paddingRight: 20 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{label}</div>
        {desc && <div style={{ fontSize: '0.78rem', color: '#7a7670', marginTop: 2, lineHeight: 1.5 }}>{desc}</div>}
      </div>
      {children}
    </div>
  );
}

// ─── POST CARD ────────────────────────────
function PostCard({ post, onApprove, onReject, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const st = STATUS_STYLES[post.status] || STATUS_STYLES.expired;
  const stars = '★'.repeat(post.review_stars || 0) + '☆'.repeat(5 - (post.review_stars || 0));

  return (
    <div style={{
      background: 'white', border: '1px solid #e4e0d8',
      borderRadius: 14, overflow: 'hidden'
    }}>
      {/* Header row */}
      <div style={{
        padding: '14px 18px', display: 'flex',
        alignItems: 'center', gap: 12, borderBottom: expanded ? '1px solid #f0eeea' : 'none',
        cursor: 'pointer'
      }} onClick={() => setExpanded(e => !e)}>
        <span style={{
          padding: '3px 10px', borderRadius: 50, fontSize: '0.7rem',
          fontWeight: 700, background: st.bg, color: st.color, flexShrink: 0
        }}>{st.label}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {post.post_summary || post.post_text?.substring(0, 60) + '…'}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#7a7670', marginTop: 2 }}>
            {post.published_at
              ? `Published ${new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
              : post.scheduled_for
              ? `Scheduled ${new Date(post.scheduled_for).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
              : new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            }
            {post.reviewer_name && ` · featuring ${post.reviewer_name.split(' ')[0]}`}
          </div>
        </div>
        {post.review_stars && (
          <span style={{ color: '#f5c842', fontSize: '0.78rem', flexShrink: 0, letterSpacing: 1 }}>{stars}</span>
        )}
        <span style={{ color: '#7a7670', fontSize: '0.9rem', flexShrink: 0 }}>
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: '16px 18px' }}>
          {/* Source review */}
          {post.review_excerpt && (
            <div style={{
              background: '#f8f7f4', border: '1px solid #e4e0d8',
              borderRadius: 10, padding: '12px 14px', marginBottom: 14
            }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 6 }}>
                Source review
              </div>
              <div style={{ fontSize: '0.82rem', fontStyle: 'italic', color: '#4a4a48', lineHeight: 1.65 }}>
                "{post.review_excerpt}"
              </div>
              {post.reviewer_name && (
                <div style={{ fontSize: '0.75rem', color: '#7a7670', marginTop: 6 }}>
                  — {post.reviewer_name}
                  {post.review_stars && (
                    <span style={{ color: '#f5c842', marginLeft: 6 }}>
                      {'★'.repeat(post.review_stars)}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Post text */}
          <div style={{
            background: '#0a0a0a', color: 'white',
            borderRadius: 10, padding: '16px 18px', marginBottom: 14
          }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
              <span>Google Post preview</span>
              <span>{post.post_text?.length || 0} / 1,500 chars</span>
            </div>
            <div style={{ fontSize: '0.875rem', lineHeight: 1.7, color: 'rgba(255,255,255,.85)', whiteSpace: 'pre-wrap' }}>
              {post.post_text}
            </div>
          </div>

          {/* CTA & performance */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            {post.cta_type && (
              <span style={{ background: '#e8f0fe', color: '#1a4baa', padding: '3px 10px', borderRadius: 50, fontSize: '0.72rem', fontWeight: 600 }}>
                CTA: {CTA_TYPES.find(c => c.id === post.cta_type)?.label || post.cta_type}
              </span>
            )}
            {post.views != null && (
              <span style={{ background: '#f0eeea', color: '#7a7670', padding: '3px 10px', borderRadius: 50, fontSize: '0.72rem', fontWeight: 600 }}>
                {post.views} views · {post.clicks || 0} clicks
              </span>
            )}
            {post.google_post_url && (
              <a href={post.google_post_url} target="_blank" rel="noopener noreferrer"
                style={{ background: '#f0eeea', color: '#0a0a0a', padding: '3px 10px', borderRadius: 50, fontSize: '0.72rem', fontWeight: 600, textDecoration: 'none' }}>
                View on Google ↗
              </a>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            {post.status === 'draft' && onApprove && (
              <button onClick={() => onApprove(post.id)} style={btnStyle('#f5c842', '#0a0a0a')}>
                ✓ Approve & Publish
              </button>
            )}
            {post.status === 'draft' && onReject && (
              <button onClick={() => onReject(post.id)} style={btnStyle('#fff5f5', '#c0392b', '#fecaca')}>
                ✗ Reject
              </button>
            )}
            {post.status === 'published' && onDelete && (
              <button onClick={() => onDelete(post.id)} style={btnStyle('#fff5f5', '#c0392b', '#fecaca')}>
                Delete from Google
              </button>
            )}
            {post.error_message && (
              <div style={{ fontSize: '0.75rem', color: '#c0392b', padding: '6px 10px', background: '#fee2e2', borderRadius: 8, flex: 1 }}>
                Error: {post.error_message}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function btnStyle(bg, color, border) {
  return {
    padding: '8px 18px', borderRadius: 50, fontSize: '0.82rem', fontWeight: 600,
    border: `1.5px solid ${border || bg}`, background: bg, color,
    cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'opacity .15s'
  };
}

// ─── MAIN PAGE ────────────────────────────
export default function GooglePostsPage() {
  const { customer }        = useAuth();
  const [locations, setLocations]   = useState([]);
  const [locationId, setLocationId] = useState(null);
  const [config, setConfig]         = useState(null);
  const [posts, setPosts]           = useState([]);
  const [preview, setPreview]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState(null);
  const [activeTab, setActiveTab]   = useState('setup');

  useEffect(() => { if (customer) loadLocations(); }, [customer]);

  async function loadLocations() {
    try {
      const res = await axios.get(`${API_URL}/locations/${customer.id}`);
      const locs = res.data.locations || [];
      setLocations(locs);
      if (locs.length > 0) {
        setLocationId(locs[0].id);
        await loadAll(locs[0].id);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function loadAll(locId) {
    try {
      const [cfgRes, postsRes] = await Promise.all([
        axios.get(`${API_URL}/google-posts/${locId}/config`),
        axios.get(`${API_URL}/google-posts/${locId}/history`)
      ]);
      setConfig(cfgRes.data.config);
      setPosts(postsRes.data.posts || []);
    } catch (err) { console.error(err); }
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function save(updates) {
    if (!locationId) return;
    setSaving(true);
    try {
      const res = await axios.put(
        `${API_URL}/google-posts/${locationId}/config`,
        { ...config, ...updates }
      );
      setConfig(res.data.config);
      showToast('Settings saved');
    } catch (err) {
      showToast('Save failed — ' + (err.response?.data?.error || err.message), 'error');
    } finally { setSaving(false); }
  }

  function update(key, value) {
    setConfig(prev => ({ ...prev, [key]: value }));
  }

  async function handleGeneratePreview() {
    setPreviewing(true);
    setPreview(null);
    try {
      const res = await axios.post(`${API_URL}/google-posts/${locationId}/preview`);
      setPreview(res.data.preview);
    } catch (err) {
      showToast(err.response?.data?.error || 'No suitable review found', 'error');
    } finally { setPreviewing(false); }
  }

  async function handlePublishNow() {
    if (!confirm('Publish a Google Post now? This will appear on your Google Business Profile immediately.')) return;
    setPublishing(true);
    try {
      await axios.post(`${API_URL}/google-posts/${locationId}/publish-now`);
      showToast('Post published to Google! 🎉');
      await loadAll(locationId);
      setActiveTab('history');
    } catch (err) {
      showToast(err.response?.data?.error || 'Publish failed', 'error');
    } finally { setPublishing(false); }
  }

  async function handleApprove(postId) {
    try {
      await axios.post(`${API_URL}/google-posts/posts/${postId}/approve`);
      showToast('Post approved and published');
      await loadAll(locationId);
    } catch (err) { showToast(err.response?.data?.error || 'Failed', 'error'); }
  }

  async function handleReject(postId) {
    const reason = prompt('Optional: why are you rejecting this post?') || 'Rejected by user';
    try {
      await axios.post(`${API_URL}/google-posts/posts/${postId}/reject`, { reason });
      showToast('Post rejected');
      await loadAll(locationId);
    } catch (err) { showToast('Failed', 'error'); }
  }

  async function handleDelete(postId) {
    if (!confirm('Delete this post from Google? This cannot be undone.')) return;
    try {
      await axios.delete(`${API_URL}/google-posts/posts/${postId}`);
      showToast('Post deleted from Google');
      await loadAll(locationId);
    } catch (err) { showToast(err.response?.data?.error || 'Failed', 'error'); }
  }

  const inputStyle = {
    padding: '10px 13px', border: '1.5px solid #e4e0d8', borderRadius: 10,
    fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', outline: 'none',
    color: '#1a1a18', background: 'white', width: '100%'
  };

  const pendingApproval = posts.filter(p => p.status === 'draft');
  const published       = posts.filter(p => p.status === 'published');

  if (loading) return (
    <DashboardLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, color: '#7a7670' }}>
        Loading Google Posts...
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: toast.type === 'error' ? '#c0392b' : '#0a0a0a',
          color: 'white', padding: '11px 18px', borderRadius: 12,
          fontSize: '0.875rem', fontWeight: 500,
          animation: 'fadeUp .3s ease both',
          boxShadow: '0 8px 24px rgba(0,0,0,.2)'
        }}>
          {toast.msg}
        </div>
      )}
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Topbar */}
      <div style={{
        background: 'white', borderBottom: '1px solid #e4e0d8',
        padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Google Posts Auto-Publisher</h2>
          <p style={{ fontSize: '0.78rem', color: '#7a7670', marginTop: 1 }}>
            Auto-post your best reviews to Google Business Profile weekly — improves local SEO
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {pendingApproval.length > 0 && (
            <span style={{
              background: '#fef3cd', color: '#92690a', padding: '5px 12px',
              borderRadius: 50, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer'
            }} onClick={() => setActiveTab('history')}>
              {pendingApproval.length} pending approval
            </span>
          )}
          {locations.length > 1 && (
            <select value={locationId || ''} onChange={e => { setLocationId(e.target.value); loadAll(e.target.value); }} style={{ ...inputStyle, width: 'auto' }}>
              {locations.map(l => <option key={l.id} value={l.id}>{l.business_name}</option>)}
            </select>
          )}
          {/* Master toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', background: config?.is_enabled ? '#e8f5ef' : '#f8f7f4', border: '1px solid #e4e0d8', borderRadius: 50 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: config?.is_enabled ? '#1a6b45' : '#7a7670' }}>
              {config?.is_enabled ? 'Auto-posting ON' : 'Auto-posting OFF'}
            </span>
            <Toggle
              value={config?.is_enabled || false}
              onChange={v => { update('is_enabled', v); save({ is_enabled: v }); }}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: 'white', borderBottom: '1px solid #e4e0d8', padding: '0 32px', display: 'flex', gap: 0 }}>
        {[
          { id: 'setup',   label: 'Setup & Schedule' },
          { id: 'preview', label: 'Preview & Publish' },
          { id: 'history', label: `History (${posts.length})` },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '13px 20px', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            fontSize: '0.85rem', fontWeight: activeTab === tab.id ? 600 : 500,
            background: 'transparent',
            color: activeTab === tab.id ? '#0a0a0a' : '#7a7670',
            borderBottom: activeTab === tab.id ? '2px solid #0a0a0a' : '2px solid transparent',
            transition: 'all .15s'
          }}>
            {tab.label}
            {tab.id === 'history' && pendingApproval.length > 0 && (
              <span style={{ marginLeft: 6, background: '#f5c842', color: '#0a0a0a', fontSize: '0.65rem', fontWeight: 800, padding: '1px 6px', borderRadius: 50 }}>
                {pendingApproval.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ padding: '28px 32px', maxWidth: 900 }}>

        {/* ─── SETUP TAB ─── */}
        {activeTab === 'setup' && config && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

            {/* Left — Schedule */}
            <div>
              <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 16, padding: 28, marginBottom: 20 }}>
                <SectionHeader title="Publishing schedule" desc="When SwarmReply automatically posts to your Google Business Profile" />

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 7 }}>Frequency</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {FREQUENCIES.map(f => (
                      <div key={f.id} onClick={() => update('frequency', f.id)} style={{
                        border: `1.5px solid ${config.frequency === f.id ? '#0a0a0a' : '#e4e0d8'}`,
                        borderRadius: 10, padding: '10px 14px', cursor: 'pointer',
                        background: config.frequency === f.id ? '#f8f7f4' : 'white',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all .15s'
                      }}>
                        <div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{f.label}</div>
                          <div style={{ fontSize: '0.75rem', color: '#7a7670' }}>{f.desc}</div>
                        </div>
                        {config.frequency === f.id && <span style={{ color: '#1a6b45', fontSize: '1rem' }}>✓</span>}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 7 }}>Post day</label>
                    <select value={config.post_day ?? 1} onChange={e => update('post_day', parseInt(e.target.value))} style={inputStyle}>
                      {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 7 }}>Post time</label>
                    <select value={config.post_hour ?? 9} onChange={e => update('post_hour', parseInt(e.target.value))} style={inputStyle}>
                      {HOURS.map(h => <option key={h.val} value={h.val}>{h.label}</option>)}
                    </select>
                  </div>
                </div>

                {config.next_post_at && (
                  <div style={{ background: '#f8f7f4', border: '1px solid #e4e0d8', borderRadius: 10, padding: '10px 14px', fontSize: '0.8rem', color: '#7a7670' }}>
                    Next post scheduled: <strong style={{ color: '#0a0a0a' }}>
                      {new Date(config.next_post_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      {' at '}
                      {new Date(config.next_post_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </strong>
                  </div>
                )}
              </div>

              {/* Stats */}
              {config.total_posts > 0 && (
                <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: '16px 20px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 12 }}>Publisher stats</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { label: 'Posts published', val: config.total_posts },
                      { label: 'Published today', val: published.length },
                      { label: 'Last post', val: config.last_post_at ? new Date(config.last_post_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Never' },
                      { label: 'Pending approval', val: pendingApproval.length },
                    ].map(s => (
                      <div key={s.label} style={{ background: '#f8f7f4', border: '1px solid #e4e0d8', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.3rem', fontWeight: 700, color: '#0a0a0a', lineHeight: 1 }}>{s.val}</div>
                        <div style={{ fontSize: '0.7rem', color: '#7a7670', marginTop: 3 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right — Content settings */}
            <div>
              <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 16, padding: 28, marginBottom: 20 }}>
                <SectionHeader title="Content settings" desc="How SwarmReply selects and writes each post" />

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 7 }}>Minimum star rating to feature</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[5, 4, 3].map(s => (
                      <button key={s} onClick={() => update('min_stars', s)} style={{
                        flex: 1, padding: '8px', borderRadius: 10, cursor: 'pointer',
                        fontFamily: 'DM Sans, sans-serif', fontSize: '0.82rem', fontWeight: 600,
                        border: `1.5px solid ${config.min_stars === s ? '#0a0a0a' : '#e4e0d8'}`,
                        background: config.min_stars === s ? '#f8f7f4' : 'white', transition: 'all .15s'
                      }}>{'★'.repeat(s)} {s}+</button>
                    ))}
                  </div>
                </div>

                <SettingRow
                  label="Require approval before posting"
                  desc="Generate posts as drafts — you review and approve before they go live on Google"
                >
                  <Toggle value={config.require_approval} onChange={v => update('require_approval', v)} />
                </SettingRow>

                <SettingRow label="Include CTA button" desc="Adds a call-to-action button to the post">
                  <Toggle value={config.include_cta} onChange={v => update('include_cta', v)} />
                </SettingRow>

                {config.include_cta && (
                  <>
                    <div style={{ marginTop: 14, marginBottom: 10 }}>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 7 }}>CTA button type</label>
                      <select value={config.cta_type || 'LEARN_MORE'} onChange={e => update('cta_type', e.target.value)} style={inputStyle}>
                        {CTA_TYPES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                      </select>
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 7 }}>CTA URL</label>
                      <input style={inputStyle} value={config.cta_url || ''} onChange={e => update('cta_url', e.target.value)} placeholder="https://yourbusiness.com/book" type="url" />
                    </div>
                  </>
                )}

                <div style={{ marginTop: 14 }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 7 }}>
                    Custom instructions for Claude (optional)
                  </label>
                  <textarea
                    style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
                    value={config.custom_prompt || ''}
                    onChange={e => update('custom_prompt', e.target.value)}
                    placeholder="e.g. Always mention our weekend brunch. Never mention parking. Focus on the dining experience."
                  />
                  <div style={{ fontSize: '0.72rem', color: '#7a7670', marginTop: 5 }}>
                    These instructions are passed directly to the AI when writing each post.
                  </div>
                </div>
              </div>

              <button
                onClick={() => save(config)}
                disabled={saving}
                style={{
                  width: '100%', padding: '13px', borderRadius: 50,
                  background: saving ? '#c8c4bc' : '#f5c842', color: '#0a0a0a',
                  border: 'none', fontSize: '0.95rem', fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif'
                }}
              >
                {saving ? 'Saving...' : 'Save settings'}
              </button>
            </div>
          </div>
        )}

        {/* ─── PREVIEW TAB ─── */}
        {activeTab === 'preview' && (
          <div style={{ maxWidth: 600 }}>
            <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 16, padding: 28, marginBottom: 20 }}>
              <SectionHeader
                title="Generate a preview"
                desc="See what the next post will look like before it goes live. This picks the best eligible review and writes a post — without publishing it."
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handleGeneratePreview}
                  disabled={previewing}
                  style={{
                    padding: '11px 28px', borderRadius: 50, background: previewing ? '#c8c4bc' : '#0a0a0a',
                    color: 'white', border: 'none', fontSize: '0.875rem', fontWeight: 700,
                    cursor: previewing ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif'
                  }}
                >
                  {previewing ? 'Generating...' : '✦ Generate preview'}
                </button>
                {preview && (
                  <button
                    onClick={handlePublishNow}
                    disabled={publishing}
                    style={{
                      padding: '11px 28px', borderRadius: 50, background: publishing ? '#c8c4bc' : '#f5c842',
                      color: '#0a0a0a', border: 'none', fontSize: '0.875rem', fontWeight: 700,
                      cursor: publishing ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif'
                    }}
                  >
                    {publishing ? 'Publishing...' : '→ Post to Google now'}
                  </button>
                )}
              </div>
            </div>

            {preview && (
              <>
                {/* Source review */}
                <div style={{ background: '#f8f7f4', border: '1px solid #e4e0d8', borderRadius: 14, padding: '18px 20px', marginBottom: 14 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 10 }}>
                    Source review
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e4e0d8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 700, color: '#7a7670', flexShrink: 0 }}>
                      {preview.sourceReview.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 5 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{preview.sourceReview.name?.split(' ')[0]}</span>
                        <span style={{ color: '#f5c842', fontSize: '0.78rem', letterSpacing: 1 }}>{'★'.repeat(preview.sourceReview.stars)}</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#4a4a48', fontStyle: 'italic', lineHeight: 1.65 }}>
                        "{preview.sourceReview.text}"
                      </div>
                    </div>
                  </div>
                </div>

                {/* Generated post */}
                <div style={{ background: '#0a0a0a', borderRadius: 14, padding: '20px 24px', marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)' }}>
                      Generated Google Post
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,.35)' }}>
                        {preview.charCount} / 1,500 chars
                      </span>
                      <div style={{
                        height: 5, width: 80, borderRadius: 50, background: 'rgba(255,255,255,.1)', overflow: 'hidden'
                      }}>
                        <div style={{ height: '100%', width: `${Math.min(100, (preview.charCount / 1500) * 100)}%`, background: preview.charCount > 1200 ? '#f87171' : '#f5c842', borderRadius: 50 }} />
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.95rem', lineHeight: 1.75, color: 'rgba(255,255,255,.85)', whiteSpace: 'pre-wrap' }}>
                    {preview.postText}
                  </div>
                  {preview.ctaType && (
                    <div style={{ marginTop: 16, display: 'inline-block', background: '#f5c842', color: '#0a0a0a', padding: '8px 20px', borderRadius: 50, fontSize: '0.82rem', fontWeight: 700 }}>
                      {CTA_TYPES.find(c => c.id === preview.ctaType)?.label || preview.ctaType}
                    </div>
                  )}
                </div>

                {/* SEO note */}
                <div style={{ background: '#e8f5ef', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px', fontSize: '0.8rem', color: '#1a6b45', lineHeight: 1.65 }}>
                  ✓ This post will appear on your Google Business Profile in Search and Maps results.
                  Posting regularly signals an active business to Google's local ranking algorithm.
                </div>
              </>
            )}

            {/* Why it matters */}
            {!preview && (
              <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 16, padding: 28 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 16 }}>Why Google Posts improve your ranking</div>
                {[
                  { icon: '📍', title: 'Signals an active business', desc: 'Google uses posting activity as a local ranking signal. Businesses that post regularly rank higher on Maps.' },
                  { icon: '⭐', title: 'Showcases your best reviews', desc: 'Turn your 5-star reviews into content that shows up when people search for your business.' },
                  { icon: '🔗', title: 'Drives clicks and actions', desc: 'Posts with CTA buttons generate bookings, calls, and website visits directly from Google search results.' },
                  { icon: '🆓', title: 'Completely free — built into your plan', desc: 'No ad spend. No extra cost. SwarmReply handles the content and the publishing automatically.' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
                    <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 3 }}>{item.title}</div>
                      <div style={{ fontSize: '0.8rem', color: '#7a7670', lineHeight: 1.6 }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── HISTORY TAB ─── */}
        {activeTab === 'history' && (
          <div>
            {pendingApproval.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Pending approval</div>
                  <span style={{ background: '#fef3cd', color: '#92690a', padding: '2px 9px', borderRadius: 50, fontSize: '0.72rem', fontWeight: 700 }}>
                    {pendingApproval.length}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pendingApproval.map(p => (
                    <PostCard key={p.id} post={p} onApprove={handleApprove} onReject={handleReject} />
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                All posts
                <span style={{ marginLeft: 8, fontWeight: 400, color: '#7a7670', fontSize: '0.82rem' }}>
                  {posts.length} total
                </span>
              </div>
            </div>

            {posts.length === 0 ? (
              <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 16, padding: 48, textAlign: 'center', color: '#7a7670' }}>
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>📮</div>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>No posts yet</div>
                <div style={{ fontSize: '0.825rem', lineHeight: 1.6 }}>
                  Enable auto-posting on the Setup tab or use "Generate preview" to create your first post.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {posts.filter(p => p.status !== 'draft').map(p => (
                  <PostCard key={p.id} post={p} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
