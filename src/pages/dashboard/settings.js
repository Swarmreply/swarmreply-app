// ============================================
// pages/dashboard/settings.js
// Settings hub — AI Replies / Webchat / Integrations / Account / Billing / API
// ============================================

import { useState, useEffect } from 'react';
import axios from 'axios';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import { getLocations, updateLocationSettings } from '../../utils/api';
import Link from 'next/link';

const TABS = [
  { id: 'ai',           label: 'AI Replies'       },
  { id: 'webchat',      label: 'Webchat & AI Agent'},
  { id: 'integrations', label: 'Integrations'     },
  { id: 'account',      label: 'Account'          },
  { id: 'team',         label: 'Team'             },
  { id: 'billing',      label: 'Billing'          },
];

const TONES = [
  { id: 'warm',         label: 'Warm & Friendly', desc: 'Personal, caring, uses customer\'s name' },
  { id: 'professional', label: 'Professional',     desc: 'Polished, clear, respectful'            },
  { id: 'casual',       label: 'Casual',            desc: 'Relaxed, short sentences, conversational'},
  { id: 'empathetic',   label: 'Empathetic',        desc: 'Acknowledges feelings first, patient'  },
];

function Card({ children, style = {} }) {
  return <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, ...style }}>{children}</div>;
}

function Toggle({ on, onChange }) {
  return (
    <div onClick={() => onChange(!on)} style={{ width: 42, height: 24, background: on ? '#0a0a0a' : '#e4e0d8', borderRadius: 50, position: 'relative', cursor: 'pointer', transition: 'background .2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 18, height: 18, background: 'white', borderRadius: '50%', transition: 'left .2s' }} />
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: '.67rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

const inp = { width: '100%', padding: '9px 12px', border: '1.5px solid #e4e0d8', borderRadius: 9, fontSize: '.875rem', fontFamily: 'inherit', outline: 'none' };
const btn = (primary) => ({ padding: '10px 22px', borderRadius: 50, border: primary ? 'none' : '1.5px solid #e4e0d8', background: primary ? '#0a0a0a' : 'transparent', color: primary ? 'white' : '#7a7670', cursor: 'pointer', fontSize: '.875rem', fontWeight: 700, fontFamily: 'inherit' });

function AITab() {
  const { customer } = useAuth();
  const [locations, setLocations] = useState([]);
  const [selected, setSelected]   = useState(null);
  const [tone, setTone]           = useState('warm');
  const [autoReply, setAutoReply] = useState(true);
  const [alwaysInclude, setAlways]= useState('');
  const [neverInclude, setNever]  = useState('');
  const [saved, setSaved]         = useState(false);

  useEffect(() => { if (customer) load(); }, [customer]);

  async function load() {
    const locs = await getLocations(customer.id).catch(() => []);
    setLocations(locs);
    if (locs[0]) { setSelected(locs[0]); setTone(locs[0].tone || 'warm'); }
  }

  async function save() {
    if (!selected) return;
    await updateLocationSettings(selected.id, { tone, auto_reply: autoReply, always_include: alwaysInclude, never_include: neverInclude }).catch(() => {});
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Card style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 14 }}>Reply tone</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {TONES.map(t => (
              <label key={t.id} onClick={() => setTone(t.id)} style={{ border: tone === t.id ? '2px solid #0a0a0a' : '1.5px solid #e4e0d8', borderRadius: 11, padding: '12px 14px', cursor: 'pointer', display: 'flex', gap: 11, alignItems: 'center', background: tone === t.id ? '#f8f7f4' : 'white', transition: 'all .15s' }}>
                <input type="radio" name="tone" checked={tone === t.id} onChange={() => setTone(t.id)} style={{ accentColor: '#0a0a0a' }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '.875rem' }}>{t.label}</div>
                  <div style={{ fontSize: '.74rem', color: '#7a7670' }}>{t.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </Card>
        <Card style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 14 }}>Reply preferences</div>
          <Field label="Always include"><input style={inp} value={alwaysInclude} onChange={e => setAlways(e.target.value)} placeholder="e.g. family-owned, since 2012" /></Field>
          <Field label="Never include"><input style={inp} value={neverInclude} onChange={e => setNever(e.target.value)} placeholder="e.g. competitor names, discounts" /></Field>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid #f0eeea' }}>
            <div>
              <div style={{ fontSize: '.875rem', fontWeight: 500 }}>Auto-reply enabled</div>
              <div style={{ fontSize: '.74rem', color: '#7a7670' }}>AI replies automatically within hours</div>
            </div>
            <Toggle on={autoReply} onChange={setAutoReply} />
          </div>
          {saved && <div style={{ background: '#e8f5ef', border: '1px solid #bbf7d0', borderRadius: 9, padding: '9px 12px', fontSize: '.82rem', color: '#1a6b45', marginBottom: 10 }}>✓ Saved</div>}
          <button onClick={save} style={{ ...btn(true), width: '100%', padding: 12, marginTop: 8 }}>Save AI settings</button>
        </Card>
      </div>
      <Card style={{ padding: 20, height: 'fit-content' }}>
        <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 8 }}>How AI replies work</div>
        <div style={{ fontSize: '.8rem', color: '#7a7670', lineHeight: 1.7, marginBottom: 14 }}>SwarmReply reads every new review and generates a reply that sounds like you — in your tone, with your business personality.</div>
        {[['Response time','Within 1 business day of the review being posted'],['Review flagging','Negative reviews (1–2 stars) are sent to alerts first'],['Edit before posting','Turn on Approval mode to review AI replies before they go live']].map(([t,d]) => (
          <div key={t} style={{ background: '#f8f7f4', borderRadius: 10, padding: 13, marginBottom: 8 }}>
            <div style={{ fontSize: '.78rem', fontWeight: 600, marginBottom: 3 }}>{t}</div>
            <div style={{ fontSize: '.78rem', color: '#7a7670' }}>{d}</div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function WebchatTab() {
  const [agentOn, setAgentOn] = useState(false);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
      <Card style={{ padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 6 }}>Webchat widget</div>
        <div style={{ fontSize: '.8rem', color: '#7a7670', marginBottom: 14, lineHeight: 1.6 }}>Embed a chat bubble on your website. Visitors start a conversation — their number is captured and moves to SMS.</div>
        <Field label="Greeting title"><input style={inp} defaultValue="Chat with us" /></Field>
        <Field label="Welcome message"><input style={inp} defaultValue="Hi! 👋 How can we help you today?" /></Field>
        <div style={{ fontWeight: 600, fontSize: '.875rem', margin: '14px 0 10px' }}>Embed code</div>
        <div style={{ background: '#0a0a0a', color: '#f5c842', borderRadius: 10, padding: 12, fontFamily: 'monospace', fontSize: '.72rem', lineHeight: 1.8, marginBottom: 8 }}>
          {'<script\n  src="https://swarmreply.com/chat-widget.js"\n  data-token="wc_tok_..."\n></script>'}
        </div>
        <button style={{ ...btn(false), width: '100%', textAlign: 'center' }}>Copy embed code</button>
      </Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Card style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 600, fontSize: '.875rem' }}>AI Chat Agent</div>
            <Toggle on={agentOn} onChange={setAgentOn} />
          </div>
          <Field label="Agent mode">
            <select style={{ ...inp }}>
              <option>After hours only</option><option>First reply only</option><option selected>Always on</option><option>Off</option>
            </select>
          </Field>
          <Field label="Agent name"><input style={inp} defaultValue="AI Assistant" /></Field>
        </Card>
        <Card style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 14 }}>Notifications</div>
          <Field label="Alert email"><input style={inp} type="email" /></Field>
          <Field label="Alert SMS"><input style={inp} type="tel" /></Field>
          <button style={{ ...btn(true), width: '100%', padding: 11 }}>Save settings</button>
        </Card>
      </div>
    </div>
  );
}

function IntegrationsTab() {
  return (
    <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 11 }}>
      {[
        ['🔍','Google Business Profile','Reviews synced · AI replies · Listings · Google Posts','#4285F4','Connected'],
        ['📘','Facebook Reviews','AI replies enabled','#1877F2','Connected'],
        ['⭐','Yelp','Add your review link for routing','#D32323',null],
        ['⚡','Zapier','7,000+ apps · connect via Zapier dashboard','#f5c842',null],
      ].map(([icon, name, desc, color, status]) => (
        <Card key={name} style={{ padding: 18, borderLeft: `4px solid ${color}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0eeea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>{icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '.9rem', marginBottom: 3 }}>{name}</div>
              <div style={{ fontSize: '.78rem', color: '#7a7670' }}>{desc}</div>
            </div>
            {status ? (
              <span style={{ background: '#e8f5ef', color: '#1a6b45', fontSize: '.67rem', fontWeight: 700, padding: '3px 9px', borderRadius: 50 }}>✓ {status}</span>
            ) : (
              <button style={{ ...btn(false), fontSize: '.8rem', padding: '6px 14px' }}>Connect →</button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

function AccountTab() {
  const { customer } = useAuth();
  return (
    <div style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card style={{ padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 14 }}>Business details</div>
        <Field label="Business name"><input style={inp} defaultValue={customer?.name || ''} /></Field>
        <Field label="Contact email"><input style={inp} type="email" defaultValue={customer?.email || ''} /></Field>
        <button style={{ ...btn(true), width: '100%', padding: 12 }}>Save changes</button>
      </Card>
      <Card style={{ padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 14 }}>Alert preferences</div>
        {[['Negative review alerts (1–2★)',true],['All new review alerts',false],['Weekly digest email',true]].map(([label, on]) => {
          const [val, setVal] = useState(on);
          return (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0eeea' }}>
              <span style={{ fontSize: '.875rem', fontWeight: 500 }}>{label}</span>
              <Toggle on={val} onChange={setVal} />
            </div>
          );
        })}
      </Card>
    </div>
  );
}

function BillingTab() {
  const { customer } = useAuth();
  return (
    <div style={{ maxWidth: 700 }}>
      <Card style={{ padding: 20, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.5rem', fontWeight: 900, marginBottom: 4 }}>
              {customer?.plan || 'Starter'} <span style={{ background: '#e8f5ef', color: '#1a6b45', fontSize: '.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 50, fontFamily: 'inherit' }}>Active</span>
            </div>
            <div style={{ fontSize: '.875rem', color: '#7a7670' }}>Month-to-month · No contracts</div>
          </div>
          <Link href="/dashboard/billing" style={{ ...btn(false), textDecoration: 'none' }}>Manage billing →</Link>
        </div>
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {[['Starter','$99/mo','1 location','https://buy.stripe.com/dRm9AT3CD3e1cDgeHqbfO07'],['Growth','$199/mo','Up to 5 locations','https://buy.stripe.com/bJe9AT3CD6qd5aO7eYbfO08'],['Agency','Custom','Unlimited','mailto:hello@swarmreply.com']].map(([plan, price, desc, link]) => (
          <div key={plan} onClick={() => window.open(link)} style={{ border: plan === (customer?.plan || 'starter') ? '2px solid #0a0a0a' : '1.5px solid #e4e0d8', borderRadius: 13, padding: '16px 18px', cursor: 'pointer', background: plan === (customer?.plan || 'starter') ? '#f8f7f4' : 'white' }}>
            <div style={{ fontWeight: 700, fontSize: '.875rem', marginBottom: 5 }}>{plan}</div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.5rem', fontWeight: 900, marginBottom: 3 }}>{price}</div>
            <div style={{ fontSize: '.74rem', color: '#7a7670' }}>{desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function APITab() {
  const [show, setShow] = useState(false);
  return (
    <div style={{ maxWidth: 580, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card style={{ padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 5 }}>Your API key</div>
        <div style={{ fontSize: '.8rem', color: '#7a7670', marginBottom: 12 }}>Use this key to authenticate requests to the SwarmReply API and Zapier.</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type={show ? 'text' : 'password'} defaultValue="sr_live_••••••••••••" style={{ ...inp, flex: 1, fontFamily: 'monospace' }} readOnly />
          <button onClick={() => setShow(!show)} style={{ ...btn(false), padding: '9px 14px' }}>{show ? 'Hide' : 'Show'}</button>
          <button style={{ ...btn(false), padding: '9px 14px' }}>Copy</button>
        </div>
      </Card>
      <Card style={{ padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 14 }}>Zapier integration</div>
        {[['Triggers','New review · New negative review'],['Actions','Send review request · Add contact'],['Searches','Find customer · Get stats']].map(([k,v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0eeea', fontSize: '.875rem' }}>
            <span style={{ color: '#7a7670' }}>{k}</span><span style={{ fontWeight: 600 }}>{v}</span>
          </div>
        ))}
        <a href="https://zapier.com/apps/swarmreply" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', marginTop: 14, ...btn(true), textDecoration: 'none' }}>Connect on Zapier →</a>
      </Card>
    </div>
  );
}


// ── ROLE DEFINITIONS ──────────────────────────────────────────────────────────
const ROLES = {
  admin: {
    label: 'Admin', color: '#f5c842', textColor: '#0a0a0a',
    description: 'Full access including billing and team management',
    access: ['Reviews','Inbox','AI Visibility','Grow','Campaigns','Pulse','All settings','Billing','Team management'],
  },
  manager: {
    label: 'Manager', color: '#0a0a0a', textColor: '#fff',
    description: 'Full platform access — no billing or team management',
    access: ['Reviews','Inbox','AI Visibility','Grow','Campaigns','Pulse','AI & Webchat settings','Integrations','API'],
  },
  staff: {
    label: 'Staff', color: '#7c3aed', textColor: '#fff',
    description: 'Operational access only',
    access: ['Reviews','Inbox','AI Visibility','Grow','Campaigns'],
  },
};

function RoleBadge({ role }) {
  const r = ROLES[role] || ROLES.staff;
  return <span style={{ background: r.color, color: r.textColor, fontSize: '.7rem', fontWeight: 700, padding: '2px 9px', borderRadius: 50 }}>{r.label}</span>;
}

function StatusBadge({ status }) {
  const styles = {
    active:    ['#e8f5ef','#1a6b45','Active'],
    invited:   ['#fff8e8','#92690a','Invite sent'],
    suspended: ['#fee2e2','#c0392b','Suspended'],
  };
  const [bg, color, label] = styles[status] || styles.invited;
  return <span style={{ background: bg, color, fontSize: '.67rem', fontWeight: 700, padding: '2px 8px', borderRadius: 50 }}>{label}</span>;
}

function TeamTab() {
  const { customer } = useAuth();
  const [members, setMembers]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('staff');
  const [sending, setSending]       = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [error, setError]           = useState('');
  const [changingRole, setChangingRole] = useState(null);

  const API = process.env.NEXT_PUBLIC_API_URL;
  function authH() {
    const t = typeof window !== 'undefined' ? localStorage.getItem('swarmreply_token') : '';
    return t ? { Authorization: `Bearer ${t}` } : {};
  }

  useEffect(() => { loadMembers(); }, []);

  async function loadMembers() {
    try {
      const res = await axios.get(`${API}/team`, { headers: authH() });
      setMembers(res.data.members || []);
    } catch (e) {
      // Demo fallback
      setMembers([
        { id:'1', name:'Nick Torres', email:'nick@swarmreply.com', role:'admin',   status:'active',  last_login_at: new Date().toISOString() },
        { id:'2', name:'Sarah Chen',  email:'sarah@example.com',   role:'manager', status:'active',  last_login_at: new Date(Date.now()-86400000*2).toISOString() },
        { id:'3', name:'James Park',  email:'james@example.com',   role:'staff',   status:'invited', invite_sent_at: new Date(Date.now()-86400000).toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function sendInvite() {
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    setSending(true); setError('');
    try {
      await axios.post(`${API}/team/invite`, { name: inviteName, email: inviteEmail, role: inviteRole }, { headers: authH() });
      setInviteSent(true);
      setInviteName(''); setInviteEmail(''); setInviteRole('staff');
      setTimeout(() => { setInviteSent(false); setShowInvite(false); }, 2500);
      loadMembers();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to send invite.');
    } finally {
      setSending(false);
    }
  }

  async function changeRole(memberId, newRole) {
    setChangingRole(memberId);
    try {
      await axios.patch(`${API}/team/${memberId}/role`, { role: newRole }, { headers: authH() });
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to update role.');
    } finally {
      setChangingRole(null);
    }
  }

  async function toggleSuspend(member) {
    const suspend = member.status !== 'suspended';
    try {
      await axios.patch(`${API}/team/${member.id}/suspend`, { suspend }, { headers: authH() });
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, status: suspend ? 'suspended' : 'active' } : m));
    } catch (e) { setError(e.response?.data?.error || 'Failed to update member.'); }
  }

  async function removeMember(id) {
    if (!confirm('Remove this team member? They will lose access immediately.')) return;
    try {
      await axios.delete(`${API}/team/${id}`, { headers: authH() });
      setMembers(prev => prev.filter(m => m.id !== id));
    } catch (e) { setError(e.response?.data?.error || 'Failed to remove member.'); }
  }

  const planLimits = { starter: 3, growth: 10, agency: '∞' };
  const planLimit  = planLimits[customer?.plan || 'starter'];
  const activeCount = members.filter(m => m.status !== 'suspended').length;

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Plan limit bar */}
      <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 3 }}>Team members</div>
          <div style={{ fontSize: '.78rem', color: '#7a7670' }}>
            {activeCount} of {planLimit} used on {customer?.plan || 'Starter'} plan
            {planLimit !== '∞' && activeCount >= planLimit && (
              <span style={{ color: '#c0392b', fontWeight: 600 }}> — limit reached</span>
            )}
          </div>
        </div>
        <button onClick={() => setShowInvite(true)} disabled={planLimit !== '∞' && activeCount >= planLimit}
          style={{ padding: '9px 20px', borderRadius: 50, background: '#0a0a0a', color: 'white', border: 'none', cursor: 'pointer', fontSize: '.875rem', fontWeight: 700, fontFamily: 'inherit', opacity: planLimit !== '∞' && activeCount >= planLimit ? .4 : 1 }}>
          + Invite member
        </button>
      </div>

      {error && <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: '.82rem', color: '#c0392b', marginBottom: 12 }}>{error}</div>}

      {/* Members table */}
      <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#7a7670' }}>Loading team…</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.84rem' }}>
            <thead>
              <tr style={{ background: '#f8f7f4' }}>
                {['Member','Role','Status','Last active',''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '.65rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', borderBottom: '1px solid #e4e0d8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid #f8f7f4', opacity: m.status === 'suspended' ? .5 : 1 }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f0eeea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '.8rem', flexShrink: 0 }}>
                        {m.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{m.name}</div>
                        <div style={{ fontSize: '.73rem', color: '#7a7670' }}>{m.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <RoleBadge role={m.role} />
                      {m.role !== 'admin' && (
                        <select
                          value={m.role}
                          disabled={changingRole === m.id}
                          onChange={e => changeRole(m.id, e.target.value)}
                          style={{ border: 'none', background: 'transparent', fontSize: '.72rem', color: '#7a7670', cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}
                        >
                          <option value="manager">Manager</option>
                          <option value="staff">Staff</option>
                        </select>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}><StatusBadge status={m.status} /></td>
                  <td style={{ padding: '12px 16px', color: '#7a7670', fontSize: '.78rem' }}>
                    {m.status === 'invited'
                      ? `Invite sent ${new Date(m.invite_sent_at).toLocaleDateString()}`
                      : m.last_login_at
                        ? new Date(m.last_login_at).toLocaleDateString()
                        : '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {m.role !== 'admin' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => toggleSuspend(m)} style={{ padding: '4px 10px', borderRadius: 50, border: '1.5px solid #e4e0d8', background: 'transparent', cursor: 'pointer', fontSize: '.72rem', fontWeight: 600, fontFamily: 'inherit', color: '#7a7670' }}>
                          {m.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                        </button>
                        <button onClick={() => removeMember(m.id)} style={{ padding: '4px 10px', borderRadius: 50, border: '1.5px solid #fecaca', background: 'transparent', cursor: 'pointer', fontSize: '.72rem', fontWeight: 600, fontFamily: 'inherit', color: '#c0392b' }}>
                          Remove
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Role breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {Object.entries(ROLES).map(([key, role]) => (
          <div key={key} style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: '18px 20px', borderTop: `3px solid ${role.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <RoleBadge role={key} />
              <span style={{ fontSize: '.75rem', color: '#7a7670' }}>{role.description}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {role.access.map(a => (
                <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '.78rem', color: '#3a3a38' }}>
                  <span style={{ color: '#1a6b45', fontWeight: 700, fontSize: '.7rem' }}>✓</span> {a}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 480, boxShadow: '0 24px 80px rgba(0,0,0,.2)' }}>
            <div style={{ padding: '22px 28px', borderBottom: '1px solid #e4e0d8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', fontWeight: 900 }}>Invite a team member</div>
              <button onClick={() => setShowInvite(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#7a7670' }}>✕</button>
            </div>
            <div style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {inviteSent && <div style={{ background: '#e8f5ef', border: '1px solid #bbf7d0', borderRadius: 9, padding: '10px 13px', fontSize: '.84rem', color: '#1a6b45' }}>✓ Invite sent! They will receive an email with a link to set up their account.</div>}
              {error && <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 9, padding: '10px 13px', fontSize: '.84rem', color: '#c0392b' }}>{error}</div>}
              {[['Full name','text',inviteName,setInviteName],['Email address','email',inviteEmail,setInviteEmail]].map(([label,type,val,set]) => (
                <div key={label}>
                  <label style={{ display: 'block', fontSize: '.67rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 5 }}>{label}</label>
                  <input type={type} value={val} onChange={e => set(e.target.value)}
                    style={{ width: '100%', padding: '10px 13px', border: '1.5px solid #e4e0d8', borderRadius: 10, fontSize: '.9rem', fontFamily: 'inherit', outline: 'none' }} />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: '.67rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 8 }}>Role</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.entries(ROLES).map(([key, role]) => (
                    <label key={key} onClick={() => setInviteRole(key)} style={{ border: inviteRole === key ? '2px solid #0a0a0a' : '1.5px solid #e4e0d8', borderRadius: 11, padding: '11px 14px', cursor: 'pointer', display: 'flex', gap: 11, alignItems: 'flex-start', background: inviteRole === key ? '#f8f7f4' : 'white', transition: 'all .15s' }}>
                      <input type="radio" name="inviteRole" checked={inviteRole === key} onChange={() => setInviteRole(key)} style={{ marginTop: 2, accentColor: '#0a0a0a' }} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}><RoleBadge role={key} /><span style={{ fontWeight: 600, fontSize: '.875rem' }}>{role.label}</span></div>
                        <div style={{ fontSize: '.76rem', color: '#7a7670' }}>{role.description}</div>
                        <div style={{ fontSize: '.72rem', color: '#7a7670', marginTop: 4 }}>Access: {role.access.join(' · ')}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ padding: '14px 28px 22px', display: 'flex', gap: 10, borderTop: '1px solid #e4e0d8' }}>
              <button onClick={() => setShowInvite(false)} style={{ flex: 1, padding: 11, borderRadius: 50, background: 'transparent', color: '#7a7670', border: '1.5px solid #e4e0d8', cursor: 'pointer', fontSize: '.875rem', fontWeight: 600, fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={sendInvite} disabled={sending || !inviteName.trim() || !inviteEmail.trim()} style={{ flex: 2, padding: 11, borderRadius: 50, background: '#0a0a0a', color: 'white', border: 'none', cursor: 'pointer', fontSize: '.875rem', fontWeight: 700, fontFamily: 'inherit', opacity: !inviteName.trim() || !inviteEmail.trim() ? .5 : 1 }}>
                {sending ? 'Sending invite…' : 'Send invite →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const [tab, setTab] = useState('ai');

  const tabContent = { ai: <AITab />, webchat: <WebchatTab />, integrations: <IntegrationsTab />, account: <AccountTab />, team: <TeamTab />, billing: <BillingTab /> };

  return (
    <DashboardLayout title="Settings">
      <div style={{ background: 'white', borderBottom: '1px solid #e4e0d8', padding: '0 24px', display: 'flex', gap: 2, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '14px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '.84rem', fontWeight: tab === t.id ? 700 : 500, fontFamily: 'inherit', color: tab === t.id ? '#0a0a0a' : '#7a7670', borderBottom: tab === t.id ? '2px solid #0a0a0a' : '2px solid transparent', whiteSpace: 'nowrap', transition: 'all .15s' }}>{t.label}</button>
        ))}
      </div>
      <div style={{ padding: 24 }}>
        {tabContent[tab]}
      </div>
    </DashboardLayout>
  );
}
