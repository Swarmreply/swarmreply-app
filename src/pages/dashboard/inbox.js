// ============================================
// pages/dashboard/inbox.js
// Webchat inbox — sessions, thread, reply, resolve
// ============================================

import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;

function authHeaders() {
  const t = typeof window !== 'undefined' ? localStorage.getItem('swarmreply_token') : '';
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function Avatar({ name, size = 32, bg = '#f0eeea', color = '#7a7670' }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.35, fontWeight: 700, color, flexShrink: 0 }}>
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  );
}

export default function Inbox() {
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
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', height: 'calc(100vh - 117px)', overflow: 'hidden' }}>

        {/* Session list */}
        <div style={{ borderRight: '1px solid #e4e0d8', display: 'flex', flexDirection: 'column', background: 'white', overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #e4e0d8', display: 'flex', gap: 4 }}>
            {['open','active','resolved','all'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                flex: 1, padding: '5px 0', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: '.72rem', fontWeight: 500, fontFamily: 'inherit',
                background: filter === f ? '#0a0a0a' : 'transparent',
                color: filter === f ? 'white' : '#7a7670',
              }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#7a7670', fontSize: '.84rem' }}>Loading…</div>
            ) : sessions.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#7a7670', fontSize: '.84rem' }}>No conversations</div>
            ) : sessions.map(s => (
              <div key={s.id} onClick={() => openSession(s)} style={{
                padding: '13px 15px', borderBottom: '1px solid #f8f7f4', cursor: 'pointer',
                background: active?.id === s.id ? '#f8f7f4' : 'white',
                borderLeft: active?.id === s.id ? '3px solid #0a0a0a' : '3px solid transparent',
                transition: 'all .12s',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <div style={{ fontWeight: 600, fontSize: '.84rem' }}>{s.visitor_name || 'Visitor'}</div>
                  <div style={{ fontSize: '.65rem', color: '#7a7670' }}>{timeAgo(s.last_message_at || s.created_at)}</div>
                </div>
                <div style={{ fontSize: '.77rem', color: '#7a7670', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>
                  {s.last_message || 'Started a conversation'}
                </div>
                <span style={{ fontSize: '.67rem', fontWeight: 600, padding: '1px 7px', borderRadius: 50, background: s.status === 'open' ? '#e8f0fe' : s.status === 'resolved' ? '#f0eeea' : '#e8f5ef', color: s.status === 'open' ? '#1a4baa' : s.status === 'resolved' ? '#7a7670' : '#1a6b45' }}>
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
              <div style={{ padding: '13px 20px', borderBottom: '1px solid #e4e0d8', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{active.visitor_name || 'Visitor'}</div>
                  <div style={{ fontSize: '.73rem', color: '#7a7670', marginTop: 1 }}>{active.visitor_phone || 'No phone'} · {active.status}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: '#e8f5ef', border: '1px solid #bbf7d0', borderRadius: 50, fontSize: '.72rem', fontWeight: 600, color: '#1a6b45' }}>📱 SMS bridge on</div>
                  {active.status !== 'resolved' && (
                    <button onClick={resolveSession} style={{ padding: '7px 16px', borderRadius: 50, border: '1.5px solid #e4e0d8', background: 'transparent', cursor: 'pointer', fontSize: '.82rem', fontWeight: 600, fontFamily: 'inherit', color: '#0a0a0a' }}>✓ Resolve</button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', background: '#f8f7f4', display: 'flex', flexDirection: 'column', gap: 11 }}>
                {messages.map((m, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: m.role === 'visitor' ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
                    <Avatar name={m.role === 'visitor' ? active.visitor_name : 'AI'} bg={m.role === 'visitor' ? '#e4e0d8' : '#f5c842'} color="#0a0a0a" size={26} />
                    <div style={{
                      background: m.role === 'visitor' ? '#0a0a0a' : 'white',
                      color: m.role === 'visitor' ? 'white' : '#0a0a0a',
                      padding: '9px 13px', borderRadius: m.role === 'visitor' ? '13px 4px 13px 13px' : '4px 13px 13px 13px',
                      fontSize: '.84rem', lineHeight: 1.55, maxWidth: '75%',
                      border: m.role !== 'visitor' ? '1px solid #e4e0d8' : 'none',
                    }}>
                      {m.content}
                      <div style={{ fontSize: '.62rem', color: m.role === 'visitor' ? 'rgba(255,255,255,.4)' : '#7a7670', marginTop: 3 }}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Compose */}
              <div style={{ padding: '11px 16px', background: 'white', borderTop: '1px solid #e4e0d8', display: 'flex', gap: 9, alignItems: 'flex-end', flexShrink: 0 }}>
                <textarea
                  value={reply} onChange={e => setReply(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); }}}
                  placeholder={active.status === 'resolved' ? 'This conversation is resolved' : 'Reply via webchat + SMS…'}
                  disabled={active.status === 'resolved' || sending}
                  rows={1} style={{
                    flex: 1, border: '1.5px solid #e4e0d8', borderRadius: 11, padding: '9px 13px',
                    fontSize: '.875rem', fontFamily: 'inherit', resize: 'none', outline: 'none',
                    minHeight: 40, maxHeight: 110, lineHeight: 1.5,
                    background: active.status === 'resolved' ? '#f8f7f4' : 'white',
                  }}
                />
                <button onClick={sendReply} disabled={!reply.trim() || sending || active.status === 'resolved'} style={{
                  padding: '9px 18px', borderRadius: 50, background: '#0a0a0a', color: 'white',
                  border: 'none', cursor: 'pointer', fontSize: '.875rem', fontWeight: 700, fontFamily: 'inherit',
                  opacity: !reply.trim() || sending || active.status === 'resolved' ? .4 : 1,
                }}>Send →</button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7a7670', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: '2rem' }}>💬</div>
              <div style={{ fontSize: '.875rem' }}>Select a conversation</div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
