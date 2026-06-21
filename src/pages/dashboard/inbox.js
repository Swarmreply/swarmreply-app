// ============================================
// pages/dashboard/inbox.js
// Webchat inbox — sessions, thread, reply, resolve
// ============================================

import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { Button as KitButton } from '../../components/ui';
import EmptyState from '../../components/EmptyState';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';
import SmsGateBanner from '../../components/SmsGateBanner';
import { useSmsGate } from '../../hooks/useSmsGate';

const API = process.env.NEXT_PUBLIC_API_URL;

function authHeaders() {
  const t = typeof window !== 'undefined' ? localStorage.getItem('swarmreply_token') : '';
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function Avatar({ name, size = 32, bg = 'var(--cream-2, #f0eeea)', color = 'var(--taupe, #7a7670)' }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 'var(--r-full, 50%)', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.35, fontWeight: 700, color, flexShrink: 0 }}>
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  );
}

export default function Inbox() {
  const smsGate = useSmsGate();
  const { customer } = useAuth();
  const [sessions, setSessions]   = useState([]);
  const [active, setActive]       = useState(null);
  const [messages, setMessages]   = useState([]);
  const [reply, setReply]         = useState('');
  const [sending, setSending]     = useState(false);
  const [filter, setFilter]       = useState('open');
  const [loading, setLoading]     = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => { if (customer) loadSessions(); }, [customer, filter]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function loadSessions() {
    try {
      const res = await axios.get(`${API}/webchat/inbox`, {
        headers: authHeaders(),
        params: { status: filter }
      });
      const data = res.data.sessions || [];
      setSessions(data);
      if (data.length && !active) openSession(data[0]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function openSession(session) {
    setActive(session);
    try {
      const res = await axios.get(`${API}/webchat/session/${session.id}`, { headers: authHeaders() });
      setMessages(res.data.messages || []);
    } catch (e) { setMessages([]); }
  }

  async function sendReply() {
    if (!reply.trim() || !active) return;
    setSending(true);
    try {
      await axios.post(`${API}/webchat/session/${active.id}/reply`, { body: reply }, { headers: authHeaders() });
      setMessages(prev => [...prev, { role: 'agent', content: reply, created_at: new Date().toISOString() }]);
      setReply('');
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  }

  async function resolveSession() {
    if (!active) return;
    try {
      await axios.post(`${API}/webchat/session/${active.id}/resolve`, {}, { headers: authHeaders() });
      setActive(prev => ({ ...prev, status: 'resolved' }));
      setSessions(prev => prev.map(s => s.id === active.id ? { ...s, status: 'resolved' } : s));
    } catch (e) { console.error(e); }
  }

  const timeAgo = (d) => {
    const s = (Date.now() - new Date(d)) / 1000;
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
  };

  return (
    <DashboardLayout title="Inbox">
      <SmsGateBanner feature="Webchat text-back to visitors" enabled={smsGate.enabled} loading={smsGate.loading} liveDate={smsGate.liveDate} />
      <div className="m-inbox" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', height: 'calc(100vh - 117px)', overflow: 'hidden' }}>

        {/* Session list */}
        <div style={{ borderRight: '1px solid var(--line, #e4e0d8)', display: 'flex', flexDirection: 'column', background: 'white', overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--line, #e4e0d8)', display: 'flex', gap: 4 }}>
            {['open','active','resolved','all'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                flex: 1, padding: '5px 0', borderRadius: 'var(--r-xs, 8px)', border: 'none', cursor: 'pointer', fontSize: 'var(--fs-xs, 0.75rem)', fontWeight: 500, fontFamily: 'inherit',
                background: filter === f ? 'var(--ink, #0a0a0a)' : 'transparent',
                color: filter === f ? 'white' : 'var(--taupe, #7a7670)',
              }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--taupe, #7a7670)', fontSize: 'var(--fs-sm, 0.8125rem)' }}>Loading…</div>
            ) : sessions.length === 0 ? (
              <div style={{ padding: '24px 12px' }}>
                <EmptyState compact title="No conversations"
                  description="When website visitors chat with your AI agent, conversations land here." />
              </div>
            ) : sessions.map(s => (
              <div key={s.id} onClick={() => openSession(s)} style={{
                padding: '13px 15px', borderBottom: '1px solid var(--cream, #f8f7f4)', cursor: 'pointer',
                background: active?.id === s.id ? 'var(--cream, #f8f7f4)' : 'white',
                borderLeft: active?.id === s.id ? '3px solid var(--ink, #0a0a0a)' : '3px solid transparent',
                transition: 'all .12s',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <div style={{ fontWeight: 600, fontSize: 'var(--fs-sm, 0.8125rem)' }}>{s.visitor_name || 'Visitor'}</div>
                  <div style={{ fontSize: 'var(--fs-2xs, 0.6875rem)', color: 'var(--taupe, #7a7670)' }}>{timeAgo(s.last_message_at || s.created_at)}</div>
                </div>
                <div style={{ fontSize: 'var(--fs-xs, 0.75rem)', color: 'var(--taupe, #7a7670)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>
                  {s.last_message || 'Started a conversation'}
                </div>
                <span style={{ fontSize: 'var(--fs-2xs, 0.6875rem)', fontWeight: 600, padding: '1px 7px', borderRadius: 'var(--r-pill, 999px)', background: s.status === 'open' ? '#e8f0fe' : s.status === 'resolved' ? 'var(--cream-2, #f0eeea)' : 'var(--green-bg, #e8f5ef)', color: s.status === 'open' ? '#1a4baa' : s.status === 'resolved' ? 'var(--taupe, #7a7670)' : 'var(--green, #1a6b45)' }}>
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Thread */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {active ? (
            <>
              {/* Header */}
              <div style={{ padding: '13px 20px', borderBottom: '1px solid var(--line, #e4e0d8)', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--fs-base, 0.875rem)' }}>{active.visitor_name || 'Visitor'}</div>
                  <div style={{ fontSize: 'var(--fs-xs, 0.75rem)', color: 'var(--taupe, #7a7670)', marginTop: 1 }}>{active.visitor_phone || 'No phone'} · {active.status}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'var(--green-bg, #e8f5ef)', border: '1px solid #bbf7d0', borderRadius: 'var(--r-pill, 999px)', fontSize: 'var(--fs-xs, 0.75rem)', fontWeight: 600, color: 'var(--green, #1a6b45)' }}>📱 SMS bridge on</div>
                  {active.status !== 'resolved' && (
                    <button onClick={resolveSession} style={{ padding: '7px 16px', borderRadius: 'var(--r-pill, 999px)', border: '1.5px solid var(--line, #e4e0d8)', background: 'transparent', cursor: 'pointer', fontSize: 'var(--fs-sm, 0.8125rem)', fontWeight: 600, fontFamily: 'inherit', color: 'var(--ink, #0a0a0a)' }}>✓ Resolve</button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', background: 'var(--cream, #f8f7f4)', display: 'flex', flexDirection: 'column', gap: 11 }}>
                {messages.map((m, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: m.role === 'visitor' ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
                    <Avatar name={m.role === 'visitor' ? active.visitor_name : 'AI'} bg={m.role === 'visitor' ? 'var(--line, #e4e0d8)' : 'var(--honey, #f5c842)'} color="var(--ink, #0a0a0a)" size={26} />
                    <div style={{
                      background: m.role === 'visitor' ? 'var(--ink, #0a0a0a)' : 'white',
                      color: m.role === 'visitor' ? 'white' : 'var(--ink, #0a0a0a)',
                      padding: '9px 13px', borderRadius: m.role === 'visitor' ? '13px 4px 13px 13px' : '4px 13px 13px 13px',
                      fontSize: 'var(--fs-sm, 0.8125rem)', lineHeight: 1.55, maxWidth: '75%',
                      border: m.role !== 'visitor' ? '1px solid var(--line, #e4e0d8)' : 'none',
                    }}>
                      {m.content}
                      <div style={{ fontSize: 'var(--fs-2xs, 0.6875rem)', color: m.role === 'visitor' ? 'rgba(255,255,255,.4)' : 'var(--taupe, #7a7670)', marginTop: 3 }}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Compose */}
              <div style={{ padding: '11px 16px', background: 'white', borderTop: '1px solid var(--line, #e4e0d8)', display: 'flex', gap: 9, alignItems: 'flex-end', flexShrink: 0 }}>
                <textarea
                  value={reply} onChange={e => setReply(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); }}}
                  placeholder={active.status === 'resolved' ? 'This conversation is resolved' : 'Reply via webchat + SMS…'}
                  disabled={active.status === 'resolved' || sending}
                  rows={1} style={{
                    flex: 1, border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 'var(--r-md, 16px)', padding: '9px 13px',
                    fontSize: 'var(--fs-base, 0.875rem)', fontFamily: 'inherit', resize: 'none', outline: 'none',
                    minHeight: 40, maxHeight: 110, lineHeight: 1.5,
                    background: active.status === 'resolved' ? 'var(--cream, #f8f7f4)' : 'white',
                  }}
                />
                <KitButton onClick={sendReply} disabled={!reply.trim() || sending || active.status === 'resolved'} variant="dark" size="sm">Send →</KitButton>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--taupe, #7a7670)', flexDirection: 'column', gap: 10 }}>
              <img src="/bee-logo.png" alt="" style={{ width: 52, height: 52, objectFit: 'contain', opacity: .85 }} />
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 'var(--fs-lg, 1rem)', fontWeight: 700, color: 'var(--tx, #1a1a18)' }}>Select a conversation</div>
              <div style={{ fontSize: 'var(--fs-sm, 0.8125rem)' }}>Pick a chat from the list to read and reply</div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
