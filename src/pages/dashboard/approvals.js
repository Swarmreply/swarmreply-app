// pages/dashboard/approvals.js — Item 12
// Review reply approval queue
import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { Skeleton } from '../../components/Skeleton';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;

function authH() {
  const t = typeof window !== 'undefined' ? localStorage.getItem('swarmreply_token') : '';
  return t ? { Authorization: `Bearer ${t}` } : {};
}

const STARS = n => '★'.repeat(n) + '☆'.repeat(5 - n);

// Loading placeholder matching an approval card.
function ApprovalCardSkeleton() {
  return (
    <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, marginBottom: 12, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0eeea' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <Skeleton width={150} height={13} />
          <Skeleton width={70} height={10} />
        </div>
        <Skeleton width="100%" height={10} style={{ marginBottom: 6 }} />
        <Skeleton width="85%" height={10} />
      </div>
      <div style={{ padding: '14px 20px', background: '#f8f7f4', borderBottom: '1px solid #f0eeea' }}>
        <Skeleton width={90} height={9} style={{ marginBottom: 12 }} />
        <Skeleton width="100%" height={10} style={{ marginBottom: 6 }} />
        <Skeleton width="70%" height={10} />
      </div>
      <div style={{ padding: '12px 20px', display: 'flex', gap: 10 }}>
        <Skeleton width={130} height={34} radius={50} />
        <Skeleton width={80} height={34} radius={50} />
      </div>
    </div>
  );
}

function ApprovalCard({ item, onAction }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(item.reply_text);
  const [rejNote, setRejNote]   = useState('');
  const [showReject, setShowReject] = useState(false);
  const [loading, setLoading]   = useState(null);

  async function act(action, body = {}) {
    setLoading(action);
    try {
      await axios.post(`${API}/approvals/${item.reply_id}/${action}`, body, { headers: authH() });
      onAction();
    } catch (e) { console.error(e); }
    finally { setLoading(null); }
  }

  return (
    <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, marginBottom: 12, overflow: 'hidden' }}>
      {/* Review */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0eeea' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div>
            <span style={{ fontWeight: 700, fontSize: '.9rem' }}>{item.reviewer_name || 'Anonymous'}</span>
            <span style={{ color: '#f5c842', fontSize: '.875rem', marginLeft: 10 }}>{STARS(item.star_rating)}</span>
          </div>
          <span style={{ fontSize: '.72rem', color: '#7a7670' }}>{new Date(item.review_date).toLocaleDateString()}</span>
        </div>
        {item.review_text && (
          <p style={{ fontSize: '.875rem', color: '#3a3a38', lineHeight: 1.7, margin: 0 }}>{item.review_text}</p>
        )}
      </div>

      {/* AI Draft Reply */}
      <div style={{ padding: '14px 20px', background: '#f8f7f4', borderBottom: '1px solid #f0eeea' }}>
        <div style={{ fontSize: '.67rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>✦</span> AI Draft Reply
        </div>
        {editing ? (
          <textarea
            value={editText}
            onChange={e => setEditText(e.target.value)}
            rows={4}
            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #0a0a0a', borderRadius: 9, fontSize: '.875rem', fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.6 }}
          />
        ) : (
          <p style={{ fontSize: '.875rem', color: '#3a3a38', lineHeight: 1.7, margin: 0 }}>{item.reply_text}</p>
        )}
      </div>

      {/* Reject note field */}
      {showReject && (
        <div style={{ padding: '12px 20px', background: '#fff8f8', borderBottom: '1px solid #fecaca' }}>
          <textarea
            placeholder="Optional note — why are you rejecting this reply? (not shown to customer)"
            value={rejNote}
            onChange={e => setRejNote(e.target.value)}
            rows={2}
            style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #fecaca', borderRadius: 9, fontSize: '.84rem', fontFamily: 'inherit', resize: 'none', outline: 'none' }}
          />
        </div>
      )}

      {/* Actions */}
      <div style={{ padding: '12px 20px', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {!editing && !showReject && (
          <>
            <button onClick={() => act('approve')} disabled={!!loading} style={{ padding: '8px 20px', borderRadius: 50, background: '#1a6b45', color: 'white', border: 'none', cursor: 'pointer', fontSize: '.84rem', fontWeight: 700, fontFamily: 'inherit', opacity: loading === 'approve' ? .6 : 1 }}>
              {loading === 'approve' ? 'Posting...' : '✓ Approve & Post'}
            </button>
            <button onClick={() => setEditing(true)} style={{ padding: '8px 18px', borderRadius: 50, background: 'transparent', color: '#0a0a0a', border: '1.5px solid #e4e0d8', cursor: 'pointer', fontSize: '.84rem', fontWeight: 600, fontFamily: 'inherit' }}>
              Edit reply
            </button>
            <button onClick={() => setShowReject(true)} style={{ padding: '8px 18px', borderRadius: 50, background: 'transparent', color: '#c0392b', border: '1.5px solid #fecaca', cursor: 'pointer', fontSize: '.84rem', fontWeight: 600, fontFamily: 'inherit' }}>
              Reject
            </button>
          </>
        )}
        {editing && (
          <>
            <button onClick={() => act('edit', { replyText: editText })} disabled={!editText.trim() || !!loading} style={{ padding: '8px 20px', borderRadius: 50, background: '#1a6b45', color: 'white', border: 'none', cursor: 'pointer', fontSize: '.84rem', fontWeight: 700, fontFamily: 'inherit', opacity: !editText.trim() ? .5 : 1 }}>
              {loading === 'edit' ? 'Posting...' : 'Post edited reply →'}
            </button>
            <button onClick={() => setEditing(false)} style={{ padding: '8px 16px', borderRadius: 50, background: 'transparent', color: '#7a7670', border: '1.5px solid #e4e0d8', cursor: 'pointer', fontSize: '.84rem', fontFamily: 'inherit' }}>
              Cancel
            </button>
          </>
        )}
        {showReject && (
          <>
            <button onClick={() => act('reject', { note: rejNote })} disabled={!!loading} style={{ padding: '8px 20px', borderRadius: 50, background: '#c0392b', color: 'white', border: 'none', cursor: 'pointer', fontSize: '.84rem', fontWeight: 700, fontFamily: 'inherit' }}>
              {loading === 'reject' ? 'Rejecting...' : 'Confirm reject'}
            </button>
            <button onClick={() => setShowReject(false)} style={{ padding: '8px 16px', borderRadius: 50, background: 'transparent', color: '#7a7670', border: '1.5px solid #e4e0d8', cursor: 'pointer', fontSize: '.84rem', fontFamily: 'inherit' }}>
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function Approvals() {
  const { customer } = useAuth();
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [mode, setMode]           = useState('auto');
  const [savingMode, setSavingMode] = useState(false);

  useEffect(() => { if (customer) load(); }, [customer]);

  async function load() {
    try {
      const [apRes, setRes] = await Promise.all([
        axios.get(`${API}/approvals`,          { headers: authH() }),
        axios.get(`${API}/approvals/settings`, { headers: authH() }),
      ]);
      setItems(apRes.data.approvals || []);
      setMode(setRes.data.approvalMode || 'auto');
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function toggleMode(newMode) {
    setSavingMode(true);
    try {
      await axios.put(`${API}/approvals/settings`, { approvalMode: newMode }, { headers: authH() });
      setMode(newMode);
    } catch (e) { console.error(e); }
    finally { setSavingMode(false); }
  }

  return (
    <DashboardLayout title="Reply Approvals">
      <div className="page-padding" style={{ padding: 24, maxWidth: 760 }}>

        {/* Mode toggle */}
        <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: '18px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '.9rem', marginBottom: 4 }}>Reply mode</div>
            <div style={{ fontSize: '.8rem', color: '#7a7670', lineHeight: 1.6 }}>
              {mode === 'auto'
                ? 'AI is posting replies automatically — they go live without review.'
                : 'Approval mode on — AI drafts replies here and you post them manually.'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => toggleMode('auto')} disabled={savingMode} style={{ padding: '8px 18px', borderRadius: 50, border: '1.5px solid', borderColor: mode === 'auto' ? '#0a0a0a' : '#e4e0d8', background: mode === 'auto' ? '#0a0a0a' : 'transparent', color: mode === 'auto' ? 'white' : '#7a7670', fontSize: '.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: savingMode ? .5 : 1 }}>
              Auto-reply
            </button>
            <button onClick={() => toggleMode('approve')} disabled={savingMode} style={{ padding: '8px 18px', borderRadius: 50, border: '1.5px solid', borderColor: mode === 'approve' ? '#0a0a0a' : '#e4e0d8', background: mode === 'approve' ? '#0a0a0a' : 'transparent', color: mode === 'approve' ? 'white' : '#7a7670', fontSize: '.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: savingMode ? .5 : 1 }}>
              Approve before posting
            </button>
          </div>
        </div>

        {/* Queue */}
        {loading ? (
          <>
            <ApprovalCardSkeleton />
            <ApprovalCardSkeleton />
          </>
        ) : items.length === 0 ? (
          <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>{mode === 'auto' ? '🐝' : '🎉'}</div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', fontWeight: 900, marginBottom: 8 }}>
              {mode === 'auto' ? 'Auto-reply is on' : "You're all caught up"}
            </div>
            <div style={{ fontSize: '.875rem', color: '#7a7670', lineHeight: 1.7 }}>
              {mode === 'auto'
                ? 'Switch to "Approve before posting" above to review AI replies before they go live.'
                : 'No replies waiting — new AI drafts will appear here for you to review and post.'}
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: '.78rem', color: '#7a7670', marginBottom: 14 }}>
              {items.length} repl{items.length === 1 ? 'y' : 'ies'} waiting for your approval
            </div>
            {items.map(item => (
              <ApprovalCard key={item.reply_id} item={item} onAction={load} />
            ))}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
