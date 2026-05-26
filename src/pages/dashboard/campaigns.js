// ============================================
// pages/dashboard/campaigns.js
// SMS Campaigns — list / contacts / segments / compliance
// ============================================

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;
const TABS = [
  { id: 'list',       label: 'Campaigns'   },
  { id: 'contacts',   label: 'Contacts'    },
  { id: 'segments',   label: 'Segments'    },
  { id: 'compliance', label: 'Compliance'  },
];

function authHeaders() {
  const t = typeof window !== 'undefined' ? localStorage.getItem('swarmreply_token') : '';
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function Card({ children, style = {} }) {
  return <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, ...style }}>{children}</div>;
}

function StatCard({ label, value, sub }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.8rem', fontWeight: 900 }}>{value}</div>
      {sub && <div style={{ fontSize: '.75rem', color: '#7a7670', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function UsageMeter({ used = 634, limit = 2000 }) {
  const pct = Math.round((used / limit) * 100);
  const color = pct >= 100 ? '#c0392b' : pct >= 80 ? '#f59e0b' : '#1a6b45';
  return (
    <Card style={{ padding: 18, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 2 }}>Monthly SMS campaign limit</div>
          <div style={{ fontSize: '.75rem', color: '#7a7670' }}>Growth plan · resets June 1</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.4rem', fontWeight: 900 }}>{used.toLocaleString()}</div>
          <div style={{ fontSize: '.72rem', color: '#7a7670' }}>of {limit.toLocaleString()} used</div>
        </div>
      </div>
      <div style={{ height: 8, background: '#f0eeea', borderRadius: 50, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 50, transition: 'width .5s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.75rem', color: '#7a7670' }}>
        <span style={{ color, fontWeight: 600 }}>{(limit - used).toLocaleString()} remaining</span>
        <span>Starter: 500/mo · Growth: 2,000/mo · Agency: unlimited</span>
      </div>
    </Card>
  );
}

export default function Campaigns() {
  const { customer } = useAuth();
  const [tab, setTab]       = useState('list');
  const [campaigns, setCampaigns] = useState([]);
  const [usage, setUsage]   = useState({ used: 634, limit: 2000 });
  const [showModal, setShowModal] = useState(false);
  const [name, setName]     = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => { if (customer) loadData(); }, [customer]);

  async function loadData() {
    try {
      const [campRes, usageRes] = await Promise.all([
        axios.get(`${API}/campaigns`, { headers: authHeaders() }),
        axios.get(`${API}/campaigns/usage`, { headers: authHeaders() }),
      ]);
      setCampaigns(campRes.data.campaigns || []);
      if (usageRes.data.usage) setUsage(usageRes.data.usage);
    } catch (e) { console.error(e); }
  }

  async function launch() {
    if (!name.trim() || !message.trim()) return;
    setSending(true);
    try {
      await axios.post(`${API}/campaigns`, { name, message }, { headers: authHeaders() });
      setShowModal(false); setName(''); setMessage('');
      loadData();
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  }

  const statusColor = (s) => ({ sent: ['#e8f5ef','#1a6b45'], scheduled: ['#fff8e8','#92690a'], draft: ['#f0eeea','#7a7670'], sending: ['#e8f0fe','#1a4baa'] }[s] || ['#f0eeea','#7a7670']);

  return (
    <DashboardLayout title="SMS Campaigns">
      <div style={{ background: 'white', borderBottom: '1px solid #e4e0d8', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 2 }} className="tabs-scrollable">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '14px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '.84rem', fontWeight: tab === t.id ? 700 : 500, fontFamily: 'inherit', color: tab === t.id ? '#0a0a0a' : '#7a7670', borderBottom: tab === t.id ? '2px solid #0a0a0a' : '2px solid transparent' }}>{t.label}</button>
          ))}
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: '8px 18px', borderRadius: 50, background: '#0a0a0a', color: 'white', border: 'none', cursor: 'pointer', fontSize: '.82rem', fontWeight: 700, fontFamily: 'inherit', marginRight: 24 }}>+ New Campaign</button>
      </div>

      <div style={{ padding: 24 }}>
        {tab === 'list' && (
          <>
            <UsageMeter used={usage.used || usage.campaign_sms_sent || 634} limit={usage.limit || usage.sms_limit || 2000} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
              <StatCard label="Total sent" value="1,284" sub="Across all campaigns" />
              <StatCard label="Delivery rate" value="96%" sub="↑ +2% vs industry avg" />
              <StatCard label="Opt-out rate" value="0.4%" sub="Well below 2% threshold" />
              <StatCard label="Replies" value="47" sub="From last 3 campaigns" />
            </div>
            <Card style={{ overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #e4e0d8', fontWeight: 600, fontSize: '.875rem' }}>All campaigns</div>
              {campaigns.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#7a7670', fontSize: '.875rem' }}>
                  No campaigns yet — create your first one to start reaching customers.
                </div>
              ) : campaigns.map(c => {
                const [bg, color] = statusColor(c.status);
                return (
                  <div key={c.id} style={{ padding: '14px 20px', borderBottom: '1px solid #f8f7f4', display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 3 }}>{c.name}</div>
                      <div style={{ fontSize: '.75rem', color: '#7a7670' }}>{c.total_recipients ? `${c.total_recipients} recipients` : 'Draft'} · {new Date(c.created_at).toLocaleDateString()}</div>
                    </div>
                    <span style={{ background: bg, color, fontSize: '.67rem', fontWeight: 700, padding: '2px 9px', borderRadius: 50 }}>{c.status}</span>
                  </div>
                );
              })}
            </Card>
          </>
        )}

        {tab === 'contacts' && (
          <div style={{ textAlign: 'center', padding: 60, color: '#7a7670' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>📋</div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Contact management</div>
            <div style={{ fontSize: '.875rem' }}>Contacts are imported via CSV or collected automatically from surveys, webchat, and review requests.</div>
          </div>
        )}

        {tab === 'segments' && (
          <div style={{ textAlign: 'center', padding: 60, color: '#7a7670' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🎯</div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Audience segments</div>
            <div style={{ fontSize: '.875rem' }}>Create reusable filters to target specific customers — by tag, visit recency, or spend.</div>
          </div>
        )}

        {tab === 'compliance' && (
          <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Card style={{ padding: 20, borderLeft: '4px solid #1a6b45' }}>
              <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 12 }}>What SwarmReply handles automatically</div>
              {['STOP opt-outs processed instantly and permanently','Global opt-out registry — applies across all campaigns','Send window enforced — 9am–8pm in your timezone (TCPA)','Carrier opt-outs caught and recorded automatically','Re-opt-in via START reply supported'].map(item => (
                <div key={item} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: '.84rem', lineHeight: 1.6 }}>
                  <span style={{ color: '#1a6b45', fontWeight: 700, flexShrink: 0 }}>✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </Card>
            <Card style={{ padding: 20, borderLeft: '4px solid #f59e0b' }}>
              <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 12 }}>Your responsibility</div>
              {['Only send to customers who have given prior consent','Identify your business in every message','Keep a record of when and how each contact consented'].map(item => (
                <div key={item} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: '.84rem', lineHeight: 1.6 }}>
                  <span style={{ color: '#f59e0b', fontWeight: 700, flexShrink: 0 }}>!</span>
                  <span>{item}</span>
                </div>
              ))}
            </Card>
          </div>
        )}
      </div>

      {/* New campaign modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 520, boxShadow: '0 24px 80px rgba(0,0,0,.2)' }}>
            <div style={{ padding: '22px 28px', borderBottom: '1px solid #e4e0d8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', fontWeight: 900 }}>New SMS campaign</div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#7a7670' }}>✕</button>
            </div>
            <div style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '.67rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 5 }}>Campaign name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Weekend special" style={{ width: '100%', padding: '10px 13px', border: '1.5px solid #e4e0d8', borderRadius: 10, fontSize: '.9rem', fontFamily: 'inherit', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '.67rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 5 }}>
                  Message <span style={{ fontWeight: 400, color: message.length > 140 ? '#c0392b' : '#7a7670' }}>{message.length}/160</span>
                </label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} placeholder="Hi [name]! This weekend only..." style={{ width: '100%', padding: '10px 13px', border: '1.5px solid #e4e0d8', borderRadius: 10, fontSize: '.875rem', fontFamily: 'inherit', outline: 'none', resize: 'none', lineHeight: 1.6 }} />
                <div style={{ fontSize: '.73rem', color: '#7a7670', marginTop: 4 }}>Use [name] to personalise. Include "Reply STOP to unsubscribe."</div>
              </div>
            </div>
            <div style={{ padding: '16px 28px 22px', display: 'flex', gap: 10, borderTop: '1px solid #e4e0d8' }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: 11, borderRadius: 50, background: 'transparent', color: '#7a7670', border: '1.5px solid #e4e0d8', cursor: 'pointer', fontSize: '.875rem', fontWeight: 600, fontFamily: 'inherit' }}>Save draft</button>
              <button onClick={launch} disabled={sending || !name.trim() || !message.trim()} style={{ flex: 1, padding: 11, borderRadius: 50, background: '#0a0a0a', color: 'white', border: 'none', cursor: 'pointer', fontSize: '.875rem', fontWeight: 700, fontFamily: 'inherit', opacity: !name.trim() || !message.trim() ? .5 : 1 }}>
                {sending ? 'Sending…' : 'Send campaign →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
