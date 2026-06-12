// ============================================
// pages/dashboard/settings.js
// Settings hub — AI Replies / Webchat / Integrations / Account / Billing / API
// ============================================

import { useState, useEffect } from 'react';
import { FEATURES } from '../../utils/featureFlags';
import SetupProgressCard from '../../components/SetupProgressCard';
import axios from 'axios';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import { getLocations, updateLocationSettings, getAccount, updateAccount } from '../../utils/api';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { RepWidgetPanel } from './reputation-widget';

const TABS = [
  { id: 'ai',           label: 'AI Replies',      flag: 'autoReply' }, // hidden until Q3 launch
  { id: 'webchat',      label: 'Webchat & AI Agent'},
  { id: 'integrations', label: 'Social Posting Accounts', flag: 'socialPosting' },
  { id: 'reviewlinks',  label: 'Review Links'     },
  { id: 'widget',       label: 'Rep Widget'       },
  { id: 'setup',        label: 'Setup Wizard'     },
  { id: 'account',      label: 'Account'          },
  { id: 'team',         label: 'Team'             },
  { id: 'billing',      label: 'Billing'          },
].filter(t => !t.flag || FEATURES[t.flag]);

const TONES = [
  { id: 'warm',         label: 'Warm & Friendly', desc: 'Personal, caring, uses customer\'s name' },
  { id: 'professional', label: 'Professional',     desc: 'Polished, clear, respectful'            },
  { id: 'casual',       label: 'Casual',            desc: 'Relaxed, short sentences, conversational'},
  { id: 'empathetic',   label: 'Empathetic',        desc: 'Acknowledges feelings first, patient'  },
];

function Card({ children, style = {} }) {
  return <div style={{ background: 'white', border: '1.5px solid #e4e0d8', borderRadius: 14, ...style }}>{children}</div>;
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
const btn = (primary) => ({ padding: '10px 22px', borderRadius: 50, border: primary ? 'none' : '1.5px solid #e4e0d8', background: primary ? '#0a0a0a' : 'transparent', color: primary ? 'white' : '#4a4a48', cursor: 'pointer', fontSize: '.875rem', fontWeight: 700, fontFamily: 'inherit' });

function AITab() {
  const { customer } = useAuth();
  const [locations, setLocations] = useState([]);
  const [selected, setSelected]   = useState(null);
  const [tone, setTone]           = useState('warm');
  const [autoReply, setAutoReply] = useState(true);
  const [alwaysInclude, setAlways]= useState('');
  const [neverInclude, setNever]  = useState('');
  const [saved, setSaved]         = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving]       = useState(false);

  useEffect(() => { if (customer) load(); }, [customer]);

  async function load() {
    const locs = await getLocations(customer.id).catch(() => []);
    setLocations(Array.isArray(locs) ? locs : []);
    if (locs[0]) pickLocation(locs[0]);
  }

  // Populate the form from a location's saved settings
  function pickLocation(loc) {
    setSelected(loc);
    setTone(loc.tone || 'warm');
    setAlways(loc.always_include || '');
    setNever(loc.never_include || '');
    setAutoReply(loc.auto_reply !== false); // default on; respects an explicit false
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    setSaveError(null);
    try {
      // Field names must be camelCase to match the backend (PUT /locations/:id/settings).
      const res = await updateLocationSettings(selected.id, { tone, alwaysInclude, neverInclude, autoReply });
      if (res && res.success === false) throw new Error(res.error || 'Save failed');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaveError(err?.response?.data?.error || err?.message || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="m-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {locations.length > 1 && (
          <Card style={{ padding: 20 }}>
            <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 10 }}>Location</div>
            <select
              style={inp}
              value={selected?.id || ''}
              onChange={e => {
                const loc = locations.find(l => l.id === e.target.value);
                if (loc) pickLocation(loc);
              }}
            >
              {locations.map(l => (
                <option key={l.id} value={l.id}>{l.business_name || 'Location'}</option>
              ))}
            </select>
          </Card>
        )}
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
          {FEATURES.autoReply && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid #f0eeea' }}>
            <div>
              <div style={{ fontSize: '.875rem', fontWeight: 500 }}>Auto-reply enabled</div>
              <div style={{ fontSize: '.74rem', color: '#7a7670' }}>AI replies automatically within hours</div>
            </div>
            <Toggle on={autoReply} onChange={setAutoReply} />
          </div>
          )}
          {saved && <div style={{ background: '#e8f5ef', border: '1px solid #bbf7d0', borderRadius: 9, padding: '9px 12px', fontSize: '.82rem', color: '#1a6b45', marginBottom: 10 }}>✓ Saved</div>}
          {saveError && <div style={{ background: '#fdecea', border: '1px solid #f5c6cb', borderRadius: 9, padding: '9px 12px', fontSize: '.82rem', color: '#a4282a', marginBottom: 10 }}>{saveError}</div>}
          <button onClick={save} disabled={saving} style={{ ...btn(true), width: '100%', padding: 12, marginTop: 8, opacity: saving ? .6 : 1 }}>{saving ? 'Saving…' : 'Save AI settings'}</button>
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

      <Card style={{ padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 6 }}>Setup wizard</div>
        <div style={{ fontSize: '.8rem', color: '#7a7670', marginBottom: 14 }}>
          Walk through connecting your first location and generating your first reviews.
        </div>
        <button
          onClick={() => {
            localStorage.removeItem('onboarding_skipped');
            window.location.reload();
          }}
          style={{ ...btn(false), padding: '10px 18px', fontSize: '.84rem' }}
        >
          Open setup wizard
        </button>
      </Card>
    </div>
  );
}

function WebchatTab() {
  const { customer } = useAuth();
  const API = process.env.NEXT_PUBLIC_API_URL;
  function authHeaders() {
    const t = typeof window !== 'undefined' ? localStorage.getItem('swarmreply_token') : '';
    return t ? { Authorization: `Bearer ${t}` } : {};
  }

  const [locations, setLocations] = useState([]);
  const [locationId, setLocationId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Widget settings (webchat_configs)
  const [greetingTitle, setGreetingTitle] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifySms, setNotifySms] = useState('');
  const [widgetToken, setWidgetToken] = useState('');

  // AI agent settings (webchat_ai_configs)
  const [agentOn, setAgentOn] = useState(false);
  const [agentMode, setAgentMode] = useState('always');
  const [agentName, setAgentName] = useState('AI Assistant');

  // UI state
  const [savingWidget, setSavingWidget] = useState(false);
  const [savingAI, setSavingAI] = useState(false);
  const [widgetMsg, setWidgetMsg] = useState(null);
  const [aiMsg, setAiMsg] = useState(null);
  const [copied, setCopied] = useState(false);
  const [genToken, setGenToken] = useState(false);

  useEffect(() => { if (customer) loadLocations(); }, [customer]);
  useEffect(() => { if (locationId) loadConfig(locationId); }, [locationId]);

  async function loadLocations() {
    const locs = await getLocations(customer.id).catch(() => []);
    const list = Array.isArray(locs) ? locs : [];
    setLocations(list);
    if (list[0]) setLocationId(list[0].id);
    else setLoading(false);
  }

  async function loadConfig(locId) {
    setLoading(true);
    setWidgetMsg(null); setAiMsg(null);
    try {
      const [cfgRes, aiRes] = await Promise.all([
        axios.get(`${API}/webchat/settings?locationId=${locId}`, { headers: authHeaders() }),
        axios.get(`${API}/webchat/ai/settings?locationId=${locId}`, { headers: authHeaders() }),
      ]);
      const c = cfgRes.data.config || {};
      setGreetingTitle(c.greeting_title || '');
      setWelcomeMessage(c.welcome_message || '');
      setNotifyEmail(c.notify_email || '');
      setNotifySms(c.notify_sms || '');
      setWidgetToken(c.widget_token || '');

      const ai = aiRes.data.config || {};
      setAgentOn(!!ai.is_enabled);
      setAgentMode(ai.mode || 'always');
      setAgentName(ai.agent_name || 'AI Assistant');
    } catch (err) {
      setWidgetMsg({ type: 'error', text: err?.response?.data?.error || 'Could not load webchat settings.' });
    } finally {
      setLoading(false);
    }
  }

  async function saveWidget() {
    if (!locationId) return;
    setSavingWidget(true); setWidgetMsg(null);
    try {
      await axios.put(`${API}/webchat/settings`, {
        locationId,
        greeting_title: greetingTitle,
        welcome_message: welcomeMessage,
        notify_email: notifyEmail,
        notify_sms: notifySms,
      }, { headers: authHeaders() });
      setWidgetMsg({ type: 'ok', text: '✓ Saved' });
      setTimeout(() => setWidgetMsg(null), 2000);
    } catch (err) {
      setWidgetMsg({ type: 'error', text: err?.response?.data?.error || 'Could not save. Please try again.' });
    } finally {
      setSavingWidget(false);
    }
  }

  async function saveAI() {
    if (!locationId) return;
    setSavingAI(true); setAiMsg(null);
    try {
      await axios.put(`${API}/webchat/ai/settings`, {
        locationId,
        is_enabled: agentOn,
        mode: agentMode,
        agent_name: agentName,
      }, { headers: authHeaders() });
      setAiMsg({ type: 'ok', text: '✓ Saved' });
      setTimeout(() => setAiMsg(null), 2000);
    } catch (err) {
      setAiMsg({ type: 'error', text: err?.response?.data?.error || 'Could not save. Please try again.' });
    } finally {
      setSavingAI(false);
    }
  }

  async function generateToken() {
    if (!locationId) return;
    setGenToken(true); setWidgetMsg(null);
    try {
      const res = await axios.post(`${API}/webchat/settings/rotate-token`, { locationId }, { headers: authHeaders() });
      setWidgetToken(res.data.widget_token || '');
    } catch (err) {
      setWidgetMsg({ type: 'error', text: err?.response?.data?.error || 'Could not generate token.' });
    } finally {
      setGenToken(false);
    }
  }

  const embedCode = widgetToken
    ? `<script src="https://swarmreply.com/chat-widget.js" data-token="${widgetToken}"></script>`
    : '';

  function copyEmbed() {
    if (!embedCode || typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  const msgStyle = (m) => ({
    background: m.type === 'error' ? '#fdecea' : '#e8f5ef',
    border: `1px solid ${m.type === 'error' ? '#f5c6cb' : '#bbf7d0'}`,
    color: m.type === 'error' ? '#a4282a' : '#1a6b45',
    borderRadius: 9, padding: '9px 12px', fontSize: '.82rem', marginBottom: 10,
  });

  if (loading && !locations.length) {
    return <div style={{ fontSize: '.85rem', color: '#7a7670', padding: 20 }}>Loading…</div>;
  }
  if (!locations.length) {
    return <div style={{ fontSize: '.85rem', color: '#7a7670', padding: 20 }}>Add a location first to set up webchat.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {locations.length > 1 && (
        <Card style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 10 }}>Location</div>
          <select style={inp} value={locationId || ''} onChange={e => setLocationId(e.target.value)}>
            {locations.map(l => <option key={l.id} value={l.id}>{l.business_name || 'Location'}</option>)}
          </select>
        </Card>
      )}

      <div className="m-grid-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
        <Card style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 6 }}>Webchat widget</div>
          <div style={{ fontSize: '.8rem', color: '#7a7670', marginBottom: 14, lineHeight: 1.6 }}>Embed a chat bubble on your website. Visitors start a conversation — their number is captured and moves to SMS.</div>
          <Field label="Greeting title"><input style={inp} value={greetingTitle} onChange={e => setGreetingTitle(e.target.value)} placeholder="Chat with us" /></Field>
          <Field label="Welcome message"><input style={inp} value={welcomeMessage} onChange={e => setWelcomeMessage(e.target.value)} placeholder="Hi! 👋 How can we help you today?" /></Field>

          <div style={{ fontWeight: 600, fontSize: '.875rem', margin: '14px 0 10px' }}>Embed code</div>
          {embedCode ? (
            <div style={{ background: '#0a0a0a', color: '#f5c842', borderRadius: 10, padding: 12, fontFamily: 'monospace', fontSize: '.72rem', lineHeight: 1.6, marginBottom: 8, wordBreak: 'break-all' }}>
              {embedCode}
            </div>
          ) : (
            <div style={{ fontSize: '.8rem', color: '#7a7670', marginBottom: 8 }}>No embed token yet — generate one to get your install snippet.</div>
          )}
          {embedCode
            ? <button onClick={copyEmbed} style={{ ...btn(false), width: '100%', textAlign: 'center' }}>{copied ? '✓ Copied' : 'Copy embed code'}</button>
            : <button onClick={generateToken} disabled={genToken} style={{ ...btn(false), width: '100%', textAlign: 'center', opacity: genToken ? .6 : 1 }}>{genToken ? 'Generating…' : 'Generate embed code'}</button>}

          {widgetMsg && <div style={{ ...msgStyle(widgetMsg), marginTop: 10 }}>{widgetMsg.text}</div>}
          <button onClick={saveWidget} disabled={savingWidget} style={{ ...btn(true), width: '100%', padding: 11, marginTop: 10, opacity: savingWidget ? .6 : 1 }}>{savingWidget ? 'Saving…' : 'Save widget settings'}</button>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontWeight: 600, fontSize: '.875rem' }}>AI Chat Agent</div>
              <Toggle on={agentOn} onChange={setAgentOn} />
            </div>
            <Field label="Agent mode">
              <select style={inp} value={agentMode} onChange={e => setAgentMode(e.target.value)} disabled={!agentOn}>
                <option value="always">Always on</option>
                <option value="after_hours">After hours only</option>
                <option value="first_reply">First reply only</option>
              </select>
            </Field>
            <Field label="Agent name"><input style={inp} value={agentName} onChange={e => setAgentName(e.target.value)} placeholder="AI Assistant" /></Field>
            {aiMsg && <div style={msgStyle(aiMsg)}>{aiMsg.text}</div>}
            <button onClick={saveAI} disabled={savingAI} style={{ ...btn(true), width: '100%', padding: 11, marginTop: 4, opacity: savingAI ? .6 : 1 }}>{savingAI ? 'Saving…' : 'Save AI agent'}</button>
          </Card>
          <Card style={{ padding: 20 }}>
            <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 14 }}>Notifications</div>
            <Field label="Alert email"><input style={inp} type="email" value={notifyEmail} onChange={e => setNotifyEmail(e.target.value)} placeholder="you@business.com" /></Field>
            <Field label="Alert SMS"><input style={inp} type="tel" value={notifySms} onChange={e => setNotifySms(e.target.value)} placeholder="+1 555 000 1234" /></Field>
            <div style={{ fontSize: '.72rem', color: '#7a7670' }}>Saved with “Save widget settings”.</div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function IntegrationsTab() {
  const [connecting, setConnecting] = useState(null);
  const [connected, setConnected]   = useState({});
  const [tooltip, setTooltip]       = useState(null);

  const API = process.env.NEXT_PUBLIC_API_URL;

  function authH() {
    const t = typeof window !== 'undefined' ? localStorage.getItem('swarmreply_token') : '';
    return t ? { Authorization: `Bearer ${t}` } : {};
  }

  // Load which platforms are actually connected (was never fetched before, so
  // connected accounts always showed "Connect"). Also runs after the OAuth
  // redirect back to ?connected=<platform>.
  useEffect(() => { loadConnections(); }, []);

  async function loadConnections() {
    try {
      const res = await axios.get(`${API}/social/connections`, { headers: authH() });
      const map = {};
      (res.data.platforms || []).forEach(p => { map[p] = true; });
      setConnected(map);
    } catch (e) {
      setConnected({});
    }
  }

  const PLATFORMS = [
    {
      id: 'meta',
      name: 'Meta',
      subtitle: 'Facebook & Instagram',
      icon: '📘',
      color: '#1877F2',
      description: 'Connect your Meta Business account to post to Facebook Pages and Instagram Business profiles.',
      authType: 'oauth',
      scopes: ['pages_manage_posts','instagram_content_publish','pages_read_engagement'],
      tooltip: 'You need a Facebook Business Page and/or Instagram Business account connected to Meta Business Suite. Personal accounts are not supported.',
      provides: ['Facebook Posts', 'Instagram Posts'],
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      subtitle: 'Company Pages',
      icon: '💼',
      color: '#0A66C2',
      description: 'Connect your LinkedIn Company Page to publish updates, articles, and media.',
      authType: 'oauth',
      tooltip: 'You need to be an admin of a LinkedIn Company Page. Personal LinkedIn profiles are not supported for posting via API.',
      provides: ['LinkedIn Posts'],
    },
    {
      id: 'google_posts',
      name: 'Google Business',
      subtitle: 'Google Posts',
      icon: '🔍',
      color: '#4285F4',
      description: 'Post updates, offers, and events directly to your Google Business Profile.',
      authType: 'oauth',
      tooltip: 'Connect the Google account that manages your Google Business Profile. You can find this at business.google.com.',
      provides: ['Google Posts'],
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      subtitle: 'Video posts',
      icon: '🎵',
      color: '#000000',
      description: 'Upload videos to TikTok. Posts go to your TikTok drafts for your final review before publishing.',
      authType: 'oauth',
      tooltip: 'TikTok requires you to review and approve each video post from within the TikTok app before it goes live. This is a TikTok API requirement.',
      provides: ['TikTok Videos'],
      note: 'Posts require approval in the TikTok app',
    },
  ];

  function connect(platform) {
    setConnecting(platform.id);
    const token = typeof window !== 'undefined' ? localStorage.getItem('swarmreply_token') : '';
    window.location.href = `${API}/social/connect/${platform.id}?token=${token}`;
  }

  async function disconnect(platformId) {
    if (!confirm(`Disconnect ${platformId}? Your post history will be kept.`)) return;
    try {
      await axios.post(`${API}/social/disconnect/${platformId}`, {}, { headers: authH() });
      setConnected(prev => ({ ...prev, [platformId]: false }));
    } catch (e) {
      alert('Failed to disconnect: ' + (e.response?.data?.error || e.message));
    }
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ fontSize: '.84rem', color: '#7a7670', marginBottom: 24, lineHeight: 1.7 }}>
        Connect your social media accounts to enable posting from the <strong>Social Posts</strong> section in Campaigns.
        Each connection is per-location — connect separately for each business location if needed.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {PLATFORMS.map(p => {
          const isConnected = connected[p.id];
          const isConnecting = connecting === p.id;
          return (
            <div key={p.id} style={{ background: 'white', border: `1.5px solid ${isConnected ? p.color : '#e4e0d8'}`,
              borderRadius: 14, padding: '18px 20px', transition: 'border-color .2s' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                {/* Icon */}
                <div style={{ width: 44, height: 44, borderRadius: 12, background: p.color + '18',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>
                  {p.icon}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: '.9rem' }}>{p.name}</span>
                    <span style={{ fontSize: '.73rem', color: '#7a7670' }}>{p.subtitle}</span>
                    {p.note && (
                      <span style={{ fontSize: '.67rem', background: '#fef9c3', color: '#92690a',
                        padding: '2px 7px', borderRadius: 50, fontWeight: 700 }}>
                        ⚠ {p.note}
                      </span>
                    )}
                    {isConnected && (
                      <span style={{ fontSize: '.67rem', background: '#dcfce7', color: '#1a6b45',
                        padding: '2px 7px', borderRadius: 50, fontWeight: 700 }}>✓ Connected</span>
                    )}
                  </div>
                  <div style={{ fontSize: '.8rem', color: '#7a7670', lineHeight: 1.6, marginBottom: 10 }}>
                    {p.description}
                  </div>

                  {/* What it unlocks */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                    {p.provides?.map(pr => (
                      <span key={pr} style={{ fontSize: '.67rem', background: '#f0eeea', color: '#4a4a48',
                        padding: '2px 8px', borderRadius: 50, fontWeight: 600 }}>{pr}</span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {isConnected ? (
                      <button onClick={() => disconnect(p.id)}
                        style={{ padding: '8px 16px', borderRadius: 50, background: 'white',
                          border: '1.5px solid #e4e0d8', cursor: 'pointer', fontSize: '.78rem',
                          fontWeight: 600, fontFamily: 'inherit', color: '#7a7670' }}>
                        Disconnect
                      </button>
                    ) : (
                      <button onClick={() => connect(p)}
                        disabled={isConnecting}
                        style={{ padding: '9px 20px', borderRadius: 50, background: isConnecting ? '#f0eeea' : p.color,
                          border: 'none', cursor: isConnecting ? 'not-allowed' : 'pointer',
                          fontSize: '.82rem', fontWeight: 700, fontFamily: 'inherit',
                          color: isConnecting ? '#7a7670' : 'white', transition: 'all .15s' }}>
                        {isConnecting ? 'Connecting…' : `Connect ${p.name}`}
                      </button>
                    )}

                    {/* How to get credentials tooltip */}
                    <button
                      onClick={() => setTooltip(tooltip === p.id ? null : p.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '.78rem', color: '#7a7670', padding: '4px 8px',
                        textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
                      How does this work?
                    </button>
                  </div>

                  {/* Tooltip */}
                  {tooltip === p.id && (
                    <div style={{ marginTop: 12, background: '#f8f7f4', border: '1.5px solid #e4e0d8',
                      borderRadius: 10, padding: '12px 14px', fontSize: '.8rem', color: '#4a4a48', lineHeight: 1.65 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>ℹ What you need</div>
                      {p.tooltip}
                      <div style={{ marginTop: 8, fontWeight: 600, color: '#0a0a0a' }}>
                        When you click "Connect {p.name}", you'll be taken to {p.name}'s login page to authorize SwarmReply. No credentials are stored — we only keep the access token {p.name} provides.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


function ReviewLinksTab() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(null);
  const [savedId, setSavedId]     = useState(null);

  const API = process.env.NEXT_PUBLIC_API_URL;
  function authH() {
    const t = typeof window !== 'undefined' ? localStorage.getItem('swarmreply_token') : '';
    return t ? { Authorization: `Bearer ${t}` } : {};
  }

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/locations/review-urls`, { headers: authH() });
      setLocations(res.data.locations || []);
    } catch (e) {
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }

  function update(id, field, value) {
    setLocations(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  }

  async function save(loc) {
    setSaving(loc.id);
    try {
      await axios.put(`${API}/locations/${loc.id}/review-urls`, {
        googleReviewUrl:   loc.google_review_url,
        facebookReviewUrl: loc.facebook_review_url,
        yelpReviewUrl:     loc.yelp_review_url,
      }, { headers: authH() });
      setSavedId(loc.id);
      setTimeout(() => setSavedId(null), 2500);
    } catch (e) {
      alert('Failed to save: ' + (e.response?.data?.error || e.message));
    } finally {
      setSaving(null);
    }
  }

  const inp = { width: '100%', padding: '9px 12px', border: '1.5px solid #e4e0d8', borderRadius: 9, fontSize: '.84rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
  const label = { display: 'block', fontSize: '.72rem', fontWeight: 700, color: '#7a7670', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 5 };

  const PLATFORMS = [
    { key: 'google_review_url',   name: 'Google',   color: '#4285F4', placeholder: 'https://g.page/r/...', hint: 'In your Google Business Profile, go to "Ask for reviews" to copy your short review link.' },
    { key: 'facebook_review_url', name: 'Facebook', color: '#1877F2', placeholder: 'https://facebook.com/YourPage/reviews', hint: 'Your Facebook Page URL followed by /reviews.' },
    { key: 'yelp_review_url',     name: 'Yelp',     color: '#D32323', placeholder: 'https://yelp.com/writeareview/biz/...', hint: 'On your Yelp business page, copy the "Write a Review" link.' },
  ];

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ fontSize: '.84rem', color: '#7a7670', marginBottom: 24, lineHeight: 1.7 }}>
        When a happy customer (a promoter) completes your survey, they'll be sent to these links to leave a public review. Only platforms with a link set will be shown to customers.
      </div>

      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: '#7a7670', fontSize: '.84rem' }}>Loading locations…</div>
      ) : locations.length === 0 ? (
        <Card style={{ padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: '.875rem', color: '#7a7670' }}>No locations yet. Add a location first to set up review links.</div>
        </Card>
      ) : locations.map(loc => (
        <Card key={loc.id} style={{ padding: 22, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: '.95rem', marginBottom: 18 }}>{loc.business_name || 'Location'}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {PLATFORMS.map(p => (
              <div key={p.key}>
                <label style={label}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: p.color, marginRight: 6 }} />
                  {p.name} review link
                </label>
                <input style={inp} type="url" placeholder={p.placeholder}
                  value={loc[p.key] || ''} onChange={e => update(loc.id, p.key, e.target.value)} />
                <div style={{ fontSize: '.72rem', color: '#a8a4a0', marginTop: 4 }}>{p.hint}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18 }}>
            <button onClick={() => save(loc)} disabled={saving === loc.id}
              style={{ padding: '9px 22px', borderRadius: 50, background: '#0a0a0a', color: 'white', border: 'none', cursor: saving === loc.id ? 'wait' : 'pointer', fontSize: '.82rem', fontWeight: 700, fontFamily: 'inherit' }}>
              {saving === loc.id ? 'Saving…' : 'Save links'}
            </button>
            {savedId === loc.id && <span style={{ fontSize: '.8rem', color: '#1a6b45', fontWeight: 600 }}>✓ Saved</span>}
          </div>
        </Card>
      ))}
    </div>
  );
}

function SetupTab() {
  return (
    <div style={{ maxWidth: 640 }}>
      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.15rem', fontWeight: 700, color: '#1a1a18', marginBottom: 6 }}>
        Setup wizard
      </h3>
      <p style={{ fontSize: '.85rem', color: '#7a7670', marginBottom: 16, lineHeight: 1.6 }}>
        The guided walkthrough that gets SwarmReply fully working — connect Google, set your review
        links, send a test request, and switch on AI replies. You can re-open it any time; your
        progress is saved.
      </p>
      <div style={{ margin: '0 -32px' }}>
        <SetupProgressCard />
      </div>
      <Link href="/onboarding" className="sr-btn sr-btn-gold" style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 16,
        background: 'linear-gradient(135deg,#f5c842,#d4a515)', color: '#1a1408',
        borderRadius: 50, padding: '11px 24px', fontSize: '.875rem', fontWeight: 700,
        textDecoration: 'none',
      }}>
        Open the setup wizard →
      </Link>
      <p style={{ fontSize: '.75rem', color: '#a39e93', marginTop: 12 }}>
        All set already? The wizard shows everything as complete — nothing will be changed by opening it.
      </p>
    </div>
  );
}

function AccountTab() {
  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const [prefs, setPrefs] = useState({ negative: true, all_reviews: false, weekly_digest: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState(null);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  async function load() {
    try {
      const a = await getAccount();
      setName(a.name || '');
      setEmail(a.email || '');
      if (a.notificationPrefs) setPrefs({ negative: true, all_reviews: false, weekly_digest: true, ...a.notificationPrefs });
    } catch (e) { /* leave blanks */ }
    finally { setLoading(false); }
  }
  async function save() {
    setSaving(true); setMsg(null);
    try {
      await updateAccount({ name, email, notificationPrefs: prefs });
      setMsg({ ok: true, text: 'Saved ✓' });
    } catch (e) {
      setMsg({ ok: false, text: e.response?.data?.error || 'Could not save changes.' });
    } finally { setSaving(false); }
  }

  const ALERTS = [
    ['negative',      'Negative review alerts (1–2★)'],
    ['all_reviews',   'All new review alerts'],
    ['weekly_digest', 'Weekly digest email'],
  ];

  return (
    <div style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card style={{ padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 14 }}>Business details</div>
        <Field label="Business name">
          <input style={inp} value={name} onChange={e => setName(e.target.value)} disabled={loading} placeholder={loading ? 'Loading…' : ''} />
        </Field>
        <Field label="Contact email">
          <input style={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
        </Field>
      </Card>
      <Card style={{ padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 14 }}>Alert preferences</div>
        {ALERTS.map(([key, label]) => (
          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0eeea' }}>
            <span style={{ fontSize: '.875rem', fontWeight: 500 }}>{label}</span>
            <Toggle on={!!prefs[key]} onChange={v => setPrefs(p => ({ ...p, [key]: v }))} />
          </div>
        ))}
      </Card>
      {msg && (
        <div style={{ fontSize: '.82rem', fontWeight: 600, color: msg.ok ? '#1a6b45' : '#c0392b' }}>{msg.text}</div>
      )}
      <button onClick={save} disabled={saving || loading} style={{ ...btn(true), width: '100%', padding: 12, opacity: (saving || loading) ? .6 : 1 }}>
        {saving ? 'Saving…' : 'Save changes'}
      </button>
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
              SwarmReply <span style={{ background: '#e8f5ef', color: '#1a6b45', fontSize: '.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 50, fontFamily: 'inherit' }}>Active</span>
            </div>
            <div style={{ fontSize: '.875rem', color: '#7a7670' }}>Month-to-month · No contracts</div>
          </div>
          <Link href="/dashboard/billing" style={{ ...btn(false), textDecoration: 'none' }}>Manage billing →</Link>
        </div>
      </Card>
      <Card style={{ padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 6 }}>How pricing works</div>
        <div style={{ fontSize: '.85rem', color: '#7a7670', lineHeight: 1.7 }}>
          You're billed per active location — $99/mo for your first location, $79/mo each for
          locations 2–5, and $69/mo each for 6–25. Your total updates automatically when you add
          or remove a location. See your current total and full breakdown on the{' '}
          <Link href="/dashboard/billing" style={{ color: '#0a0a0a', fontWeight: 600 }}>billing page</Link>.
        </div>
      </Card>
    </div>
  );
}

function APITab() {
  return (
    <div style={{ maxWidth: 580, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card style={{ padding: 28, textAlign: 'center' }}>
        <div style={{ fontSize: '1.8rem', marginBottom: 10 }}>🔌</div>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.3rem', fontWeight: 900, marginBottom: 8 }}>API &amp; Zapier — coming soon</div>
        <div style={{ fontSize: '.875rem', color: '#7a7670', lineHeight: 1.7, marginBottom: 18, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>
          A public API and Zapier integration are on the way — connect SwarmReply to thousands of apps, trigger automations on new reviews, and sync contacts both ways. Want to be first in line?
        </div>
        <a href="mailto:hello@swarmreply.com?subject=SwarmReply%20API%20early%20access" style={{ ...btn(true), textDecoration: 'none', display: 'inline-flex' }}>Request early access →</a>
      </Card>
      <Card style={{ padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 12 }}>What you'll be able to do</div>
        {[['Triggers', 'New review · New negative review'], ['Actions', 'Send review request · Add contact'], ['Searches', 'Find customer · Get stats']].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0eeea', fontSize: '.875rem' }}>
            <span style={{ color: '#7a7670' }}>{k}</span><span style={{ fontWeight: 600 }}>{v}</span>
          </div>
        ))}
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

  const activeCount = members.filter(m => m.status !== 'suspended').length;

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Team members bar */}
      <div style={{ background: 'white', border: '1.5px solid #e4e0d8', borderRadius: 14, padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 3 }}>Team members</div>
          <div style={{ fontSize: '.78rem', color: '#7a7670' }}>
            {activeCount} active {activeCount === 1 ? 'member' : 'members'}
          </div>
        </div>
        <button onClick={() => setShowInvite(true)}
          style={{ padding: '9px 20px', borderRadius: 50, background: '#0a0a0a', color: 'white', border: 'none', cursor: 'pointer', fontSize: '.875rem', fontWeight: 700, fontFamily: 'inherit' }}>
          + Invite member
        </button>
      </div>

      {error && <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: '.82rem', color: '#c0392b', marginBottom: 12 }}>{error}</div>}

      {/* Members table */}
      <div style={{ background: 'white', border: '1.5px solid #e4e0d8', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
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
      <div className="m-grid-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {Object.entries(ROLES).map(([key, role]) => (
          <div key={key} style={{ background: 'white', border: '1.5px solid #e4e0d8', borderRadius: 14, padding: '18px 20px', borderTop: `3px solid ${role.color}` }}>
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
  const [tab, setTab] = useState(TABS[0]?.id || 'account');

  const tabContent = { ai: <AITab />, webchat: <WebchatTab />, integrations: <IntegrationsTab />, reviewlinks: <ReviewLinksTab />, widget: <RepWidgetPanel />, setup: <SetupTab />, account: <AccountTab />, team: <TeamTab />, billing: <BillingTab /> };

  // Allow deep-linking to a tab, e.g. /dashboard/settings?tab=widget
  const router = useRouter();
  useEffect(() => {
    const qt = router.query.tab;
    if (qt && TABS.some(t => t.id === qt)) setTab(qt);
  }, [router.query.tab]);

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
