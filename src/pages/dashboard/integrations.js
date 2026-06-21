// ============================================
// pages/dashboard/integrations.js
// All 6 integrations + existing Google/Facebook
// ============================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import BrandLogo from '../../components/BrandLogo';
import { SkeletonCard } from '../../components/Skeleton';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;

function authH() {
  const t = typeof window !== 'undefined' ? localStorage.getItem('swarmreply_token') : '';
  return t ? { Authorization: `Bearer ${t}` } : {};
}

const INTEGRATIONS = [
  {
    id:          'google',
    name:        'Google Business Profile',
    icon:        '🔍',
    color:       '#4285F4',
    category:    'Reviews',
    description: 'Sync reviews, listings, and Google Posts.',
    trigger:     'Monitors reviews automatically',
    authType:    'oauth',
  },
  {
    id:          'facebook',
    name:        'Facebook Reviews',
    icon:        '📘',
    color:       '#1877F2',
    category:    'Reviews',
    description: 'Monitor Facebook page reviews in your dashboard.',
    trigger:     'Monitors reviews automatically',
    authType:    'oauth',
  },
  {
    id:          'stripe_trigger',
    name:        'Stripe',
    icon:        '💳',
    color:       '#635BFF',
    category:    'Payments',
    description: 'Send a review request after every successful payment.',
    trigger:     'After successful charge',
    authType:    'toggle',
    delay:       60,
  },
  {
    id:          'square',
    name:        'Square',
    icon:        '⬛',
    color:       'var(--ink, #0a0a0a)',
    category:    'Payments',
    description: 'Trigger review requests when a customer completes a Square payment.',
    trigger:     'After completed payment',
    authType:    'oauth',
    delay:       60,
  },
  {
    id:          'hubspot',
    name:        'HubSpot',
    icon:        '🟠',
    color:       '#FF7A59',
    category:    'CRM',
    description: 'Automatically request reviews when a deal is marked Closed Won.',
    trigger:     'Deal closed / won',
    authType:    'oauth',
    delay:       30,
  },
  {
    id:          'shopify',
    name:        'Shopify',
    icon:        '🛍',
    color:       '#96BF48',
    category:    'E-commerce',
    description: 'Send review requests when an order is fulfilled.',
    trigger:     'Order fulfilled',
    authType:    'oauth',
    delay:       120,
    extraField:  { label: 'Your Shopify store URL', placeholder: 'mystore.myshopify.com', key: 'shop' },
  },
  {
    id:          'mindbody',
    name:        'Mindbody',
    icon:        '🧘',
    color:       '#00A4E4',
    category:    'Fitness & Wellness',
    description: 'Request reviews after class check-ins and appointments.',
    trigger:     'Appointment or class completed',
    authType:    'credentials',
    fields: [
      { label: 'Site ID',         key: 'siteId',        type: 'text',     placeholder: '-99'        },
      { label: 'Staff username',  key: 'staffUsername', type: 'text',     placeholder: 'staff@...'  },
      { label: 'Staff password',  key: 'staffPassword', type: 'password', placeholder: '••••••••'   },
    ],
  },
  {
    id:          'calendly',
    name:        'Calendly',
    icon:        '📅',
    color:       '#006BFF',
    category:    'Appointments',
    description: 'Send review requests when an invitee books an appointment.',
    trigger:     'Appointment booked',
    authType:    'oauth',
    delay:       0,
  },
  {
    id:          'acuity',
    name:        'Acuity Scheduling',
    icon:        '🗓',
    color:       '#0C0038',
    category:    'Appointments',
    description: 'Trigger review requests after appointments are scheduled.',
    trigger:     'Appointment scheduled',
    authType:    'credentials',
    fields: [
      { label: 'User ID',  key: 'userId',  type: 'text',     placeholder: 'Your Acuity User ID'  },
      { label: 'API key',  key: 'apiKey',  type: 'password', placeholder: 'Your Acuity API key'  },
    ],
  },
  {
    id:          'jobber',
    name:        'Jobber',
    icon:        '🔧',
    color:       '#F5A623',
    category:    'Field Service',
    description: 'Send review requests automatically when a Jobber job is completed.',
    trigger:     'Job completed',
    authType:    'oauth',
    delay:       60,
  },
];

const CATEGORIES = ['All', 'Reviews', 'Payments', 'CRM', 'E-commerce', 'Fitness & Wellness', 'Appointments'];

function StatusBadge({ status }) {
  if (!status || status === 'disconnected') return null;
  const styles = {
    connected: ['var(--green-bg, #e8f5ef)', 'var(--green, #1a6b45)', 'Connected'],
    error:     ['var(--danger-bg, #fee2e2)', 'var(--danger, #c0392b)', 'Error'],
  };
  const [bg, color, label] = styles[status] || styles.connected;
  return (
    <span style={{ background: bg, color, fontSize: '.67rem', fontWeight: 700,
      padding: '2px 9px', borderRadius: 50 }}>
      {label}
    </span>
  );
}

// ── Send timing control ──
// The customer decides how long after the trigger the review request goes out.
// Scheduling tools (Calendly / Acuity) anchor to the appointment END, so the
// delay there counts from when the visit finishes — not when it was booked.
const TIMING_ANCHORS = {
  jobber:   'after the job is completed',
  square:   'after the sale',
  shopify:  'after the order',
  stripe_trigger: 'after the payment',
  hubspot:  'after the deal closes',
  mindbody: 'after the visit',
  calendly: 'after the appointment ends',
  acuity:   'after the appointment ends',
};

function toValueUnit(minutes) {
  const m = Number(minutes) || 0;
  if (m > 0 && m % 1440 === 0) return { value: m / 1440, unit: 'days' };
  if (m > 0 && m % 60 === 0)   return { value: m / 60,   unit: 'hours' };
  return { value: m, unit: 'minutes' };
}
function toMinutes(value, unit) {
  const v = Math.max(0, Number(value) || 0);
  return unit === 'days' ? v * 1440 : unit === 'hours' ? v * 60 : v;
}

function SendTiming({ provider, currentMinutes, currentType, currentSurveyId, onSaved }) {
  const init = toValueUnit(currentMinutes ?? 60);
  const [value, setValue] = useState(init.value);
  const [unit, setUnit]   = useState(init.unit);
  const [followUpType, setFollowUpType] = useState(currentType === 'survey' ? 'survey' : 'review_request');
  const [surveyId, setSurveyId] = useState(currentSurveyId || '');
  const [surveys, setSurveys] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const anchor = TIMING_ANCHORS[provider] || 'after the trigger';
  const minutes = toMinutes(value, unit);

  useEffect(() => {
    axios.get(`${API}/survey-templates`, { headers: authH() })
      .then((r) => {
        const list = r.data.templates || [];
        setSurveys(list);
        setSurveyId((prev) => prev || (list.find((t) => t.is_default) || list[0] || {}).id || '');
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    setSaving(true); setSaved(false);
    try {
      await axios.put(`${API}/integrations/${provider}/settings`,
        { delayMinutes: minutes, followUpType, surveyTemplateId: followUpType === 'survey' ? (surveyId || null) : null },
        { headers: authH() });
      setSaved(true);
      onSaved && onSaved(minutes);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      alert(`Could not save — please try again. (${e.response?.data?.error || e.message})`);
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 9, padding: '7px 10px',
    fontSize: '.82rem', fontFamily: 'inherit', background: 'white', color: 'var(--tx, #1a1a18)',
  };

  const rowStyle = { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' };
  return (
    <div style={{
      borderTop: '1px solid var(--cream-2, #f0eeea)', padding: '12px 20px 14px',
      display: 'flex', flexDirection: 'column', gap: 10,
      background: '#fcfbf8',
    }}>
      <div style={rowStyle}>
        <span style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--tx, #1a1a18)' }}>Send:</span>
        <select value={followUpType} onChange={e => setFollowUpType(e.target.value)} style={inputStyle} aria-label="Follow-up type">
          <option value="review_request">a review request</option>
          <option value="survey">an NPS survey</option>
        </select>
        {followUpType === 'survey' && (
          <select value={surveyId} onChange={e => setSurveyId(e.target.value)} style={inputStyle} aria-label="Survey">
            {surveys.length === 0 && <option value="">default survey</option>}
            {surveys.map((t) => <option key={t.id} value={t.id}>{(t.name || 'Untitled survey') + ((t.config && t.config.type === 'custom') ? ' (Custom)' : ' (NPS)')}</option>)}
          </select>
        )}
        {followUpType === 'survey' && <span style={{ fontSize: '.74rem', color: 'var(--mute, #a8a39a)' }}>respondents are also invited to leave a review</span>}
      </div>
      <div style={rowStyle}>
        <span style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--tx, #1a1a18)' }}>Send timing:</span>
        <input type="number" min="0" max="999" value={value}
          onChange={e => setValue(e.target.value)}
          style={{ ...inputStyle, width: 64 }} aria-label="Delay amount" />
        <select value={unit} onChange={e => setUnit(e.target.value)}
          style={inputStyle} aria-label="Delay unit">
          <option value="minutes">minutes</option>
          <option value="hours">hours</option>
          <option value="days">days</option>
        </select>
        <span style={{ fontSize: '.78rem', color: 'var(--taupe, #7a7670)' }}>
          {minutes === 0 ? `immediately ${anchor}` : `${anchor}`}
        </span>
        <button onClick={save} disabled={saving} style={{
          marginLeft: 'auto', padding: '7px 16px', borderRadius: 50, border: 'none',
          background: saved ? 'var(--green, #1a6b45)' : 'var(--ink, #0a0a0a)', color: 'white', cursor: 'pointer',
          fontSize: '.78rem', fontWeight: 700, fontFamily: 'inherit',
          opacity: saving ? .6 : 1, transition: 'background .2s',
        }}>
          {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function IntegrationCard({ integration, connectedData, onConnect, onDisconnect }) {
  const [expanded, setExpanded]     = useState(false);
  const [fields, setFields]         = useState({});
  const [connecting, setConnecting]     = useState(false);
  const [locations, setLocations]         = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [error, setError]           = useState('');
  const connected = connectedData?.status === 'connected';

  async function handleConnect() {
    setConnecting(true); setError('');
    try {
      if (integration.authType === 'oauth') {
        // Google uses a different OAuth route
        if (integration.id === 'google') {
          if (!selectedLocation) {
            setError('Please select a location first.');
            setConnecting(false);
            return;
          }
          window.location.href = `${API}/auth/google?locationId=${selectedLocation}`;
          return;
        }
        // Other OAuth integrations — pass JWT as query param since browser redirects can't set headers
        const token = typeof window !== 'undefined' ? localStorage.getItem('swarmreply_token') : '';
        const params = new URLSearchParams({ ...fields, locationId: selectedLocation, token });
        window.location.href = `${API}/integrations/${integration.id}/connect?${params}`;
        return;
      }
      if (integration.authType === 'toggle') {
        await axios.post(`${API}/integrations/${integration.id}/enable`,
          { delayMinutes: integration.delay }, { headers: authH() });
      } else {
        // credentials
        await axios.post(`${API}/integrations/${integration.id}/connect`,
          fields, { headers: authH() });
      }
      onConnect();
      setExpanded(false);
    } catch (e) {
      setError(e.response?.data?.error || 'Connection failed. Please check your credentials.');
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm(`Disconnect ${integration.name}? Review request triggers from this source will stop.`)) return;
    try {
      await axios.delete(`${API}/integrations/${integration.id}`, { headers: authH() });
      onDisconnect();
    } catch (err) {
      alert(`Could not disconnect ${integration.name} — please try again. (${err.response?.data?.error || err.message})`);
    }
  }

  return (
    <div className="sr-card" style={{
      background: 'white', border: `1px solid ${connected ? 'var(--line, #e4e0d8)' : 'var(--line, #e4e0d8)'}`,
      borderRadius: 16, overflow: 'hidden',
      borderTop: connected ? `3px solid ${integration.color}` : '3px solid transparent',
      transition: 'all .15s',
    }}>
      <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Brand logo */}
        <BrandLogo provider={integration.id} name={integration.name} size={44} fallbackColor={integration.color} />

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontWeight: 700, fontSize: '.9rem' }}>{integration.name}</span>
            <StatusBadge status={connectedData?.status} />
          </div>
          <div style={{ fontSize: '.78rem', color: 'var(--taupe, #7a7670)', lineHeight: 1.5 }}>
            {integration.description}
          </div>
          {connected && (
            <div style={{ fontSize: '.72rem', color: 'var(--green, #1a6b45)', marginTop: 4, display: 'flex', gap: 12 }}>
              <span>Trigger: {integration.trigger}</span>
              {connectedData.triggers_received > 0 && (
                <span>{connectedData.requests_sent} requests sent</span>
              )}
            </div>
          )}
        </div>

        {/* Action */}
        <div style={{ flexShrink: 0, display: 'flex', gap: 8 }}>
          {connected ? (
            <>
              <button onClick={handleDisconnect} style={{
                padding: '7px 14px', borderRadius: 50, border: '1.5px solid var(--line, #e4e0d8)',
                background: 'transparent', cursor: 'pointer', fontSize: '.8rem',
                fontWeight: 600, color: 'var(--taupe, #7a7670)', fontFamily: 'inherit',
              }}>Disconnect</button>
            </>
          ) : (
            <button onClick={() => setExpanded(e => !e)} style={{
              padding: '8px 18px', borderRadius: 50,
              background: 'var(--ink, #0a0a0a)', color: 'white', border: 'none',
              cursor: 'pointer', fontSize: '.82rem', fontWeight: 700, fontFamily: 'inherit',
            }}>
              {expanded ? 'Cancel' : 'Connect →'}
            </button>
          )}
        </div>
      </div>

      {/* Send timing — connected trigger integrations only */}
      {connected && TIMING_ANCHORS[integration.id] && (
        <SendTiming
          provider={integration.id}
          currentMinutes={connectedData?.delay_minutes ?? integration.delay}
          currentType={connectedData?.follow_up_type}
          currentSurveyId={connectedData?.survey_template_id}
          onSaved={onConnect}
        />
      )}

      {/* Expanded connect form */}
      {expanded && !connected && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--cream-2, #f0eeea)' }}>
          {error && (
            <div style={{ background: 'var(--danger-bg, #fee2e2)', border: '1px solid #fecaca', borderRadius: 9,
              padding: '9px 13px', fontSize: '.82rem', color: 'var(--danger, #c0392b)', margin: '12px 0' }}>
              {error}
            </div>
          )}

          {integration.authType === 'oauth' && (
            <>
              {integration.extraField && (
                <div style={{ marginTop: 12 }}>
                  <label style={{ display: 'block', fontSize: '.67rem', fontWeight: 700,
                    letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--taupe, #7a7670)', marginBottom: 5 }}>
                    {integration.extraField.label}
                  </label>
                  <input
                    placeholder={integration.extraField.placeholder}
                    value={fields[integration.extraField.key] || ''}
                    onChange={e => setFields(f => ({ ...f, [integration.extraField.key]: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--line, #e4e0d8)',
                      borderRadius: 9, fontSize: '16px', fontFamily: 'inherit', outline: 'none' }}
                  />
                </div>
              )}
              <p style={{ fontSize: '.78rem', color: 'var(--taupe, #7a7670)', margin: '12px 0', lineHeight: 1.6 }}>
                You'll be redirected to {integration.name} to authorise SwarmReply. We only request
                read access to your {integration.trigger.toLowerCase()} data.
              </p>
            </>
          )}

          {(integration.authType === 'credentials' || integration.authType === 'toggle') && (
            integration.fields?.map(field => (
              <div key={field.key} style={{ marginTop: 12 }}>
                <label style={{ display: 'block', fontSize: '.67rem', fontWeight: 700,
                  letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--taupe, #7a7670)', marginBottom: 5 }}>
                  {field.label}
                </label>
                <input
                  type={field.type || 'text'}
                  placeholder={field.placeholder}
                  value={fields[field.key] || ''}
                  onChange={e => setFields(f => ({ ...f, [field.key]: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--line, #e4e0d8)',
                    borderRadius: 9, fontSize: '16px', fontFamily: 'inherit', outline: 'none' }}
                />
              </div>
            ))
          )}

          <div style={{ marginTop: 14, display: 'flex', gap: 9, alignItems: 'center' }}>
            <button onClick={handleConnect} disabled={connecting} style={{
              padding: '10px 22px', borderRadius: 50, background: 'var(--ink, #0a0a0a)',
              color: 'white', border: 'none', cursor: 'pointer', fontSize: '.875rem',
              fontWeight: 700, fontFamily: 'inherit', opacity: connecting ? .6 : 1,
            }}>
              {connecting ? 'Connecting…'
                : integration.authType === 'oauth' ? `Connect with ${integration.name} →`
                : 'Connect'}
            </button>
            <span style={{ fontSize: '.72rem', color: 'var(--taupe, #7a7670)' }}>
              Triggers: {integration.trigger.toLowerCase()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Integrations() {
  const { customer } = useAuth();
  const [integrations, setIntegrations] = useState([]);
  const [category, setCategory]         = useState('All');
  const [loading, setLoading]           = useState(true);

  useEffect(() => { if (customer) load(); }, [customer]);

  async function load() {
    try {
      const [integRes, locRes] = await Promise.all([
        axios.get(`${API}/integrations`, { headers: authH() }),
        axios.get(`${API}/locations`,    { headers: authH() }),
      ]);
      setIntegrations(integRes.data.integrations || []);
      const locs = locRes.data.locations || locRes.data || [];
      setLocations(locs);
      // Auto-select first location so OAuth connects immediately without extra step
      if (locs.length > 0 && !selectedLocation) {
        setSelectedLocation(locs[0].id);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  function getConnected(id) {
    return integrations.find(i => i.provider === id) || null;
  }

  const connectedCount = integrations.filter(i => i.status === 'connected').length;

  // ── Page tab + filters ──────────────────────────────────────────────────────
  const [pageTab, setPageTab]   = useState('integrations');
  const [search, setSearch]     = useState('');
  const [byName, setByName]     = useState('');

  const isConnected = (id) => {
    const c = getConnected(id);
    return c && c.status === 'connected';
  };

  const router = useRouter();
  const CHANNEL_IDS = ['google', 'facebook'];
  const [highlightId, setHighlightId] = useState(null);

  // Deep link from the setup wizard: /dashboard/integrations?connect=google
  useEffect(() => {
    const target = router.query?.connect;
    if (!target || loading) return;
    setHighlightId(String(target));
    const el = typeof document !== 'undefined' && document.getElementById(`int-${target}`);
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t = setTimeout(() => setHighlightId(null), 4000);
    return () => clearTimeout(t);
  }, [router.query?.connect, loading]);

  const filtered = INTEGRATIONS.filter(i => {
    // Jump-to-integration dropdown overrides the other filters
    if (byName) return i.id === byName;
    if (category === 'Connected' && !isConnected(i.id)) return false;
    if (category !== 'All' && category !== 'Connected' && i.category !== category) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const hay = `${i.name} ${i.subtitle || ''} ${i.category || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const selectStyle = {
    padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--line, #e4e0d8)',
    background: 'white', fontSize: '.84rem', fontFamily: 'inherit',
    color: 'var(--tx, #1a1a18)', cursor: 'pointer', outline: 'none', minWidth: 170,
  };

  return (
    <DashboardLayout title="Integrations">
      <div className="page-padding" style={{ padding: 24 }}>

        {/* Page tabs */}
        <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--line, #e4e0d8)', marginBottom: 20 }}>
          {[{ id: 'integrations', label: 'Integrations' }, { id: 'zapier', label: 'Zapier' }].map(t => (
            <button key={t.id} onClick={() => setPageTab(t.id)} style={{
              padding: '12px 18px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: '.875rem', fontWeight: pageTab === t.id ? 700 : 500, fontFamily: 'inherit',
              color: pageTab === t.id ? 'var(--ink, #0a0a0a)' : 'var(--taupe, #7a7670)',
              borderBottom: pageTab === t.id ? '2px solid var(--ink, #0a0a0a)' : '2px solid transparent',
            }}>{t.label}</button>
          ))}
        </div>

        {pageTab === 'integrations' && (
          <>
            {/* Search + filter dropdowns */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="search"
                placeholder="Search integrations…"
                value={search}
                onChange={e => { setSearch(e.target.value); setByName(''); }}
                style={{
                  flex: '1 1 220px', padding: '10px 16px', borderRadius: 10,
                  border: '1.5px solid var(--line, #e4e0d8)', fontSize: '.84rem',
                  fontFamily: 'inherit', outline: 'none', background: 'white',
                }}
              />
              <select
                value={category}
                onChange={e => { setCategory(e.target.value); setByName(''); }}
                style={selectStyle}
              >
                <option value="All">All categories</option>
                <option value="Connected">Connected ({connectedCount})</option>
                {CATEGORIES.filter(c => c !== 'All').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={byName}
                onChange={e => { setByName(e.target.value); setSearch(''); setCategory('All'); }}
                style={selectStyle}
              >
                <option value="">Jump to integration…</option>
                {[...INTEGRATIONS].sort((a, b) => a.name.localeCompare(b.name)).map(i => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
              {(search || byName || category !== 'All') && (
                <button
                  onClick={() => { setSearch(''); setByName(''); setCategory('All'); }}
                  style={{ padding: '10px 14px', borderRadius: 50, border: '1.5px solid var(--line, #e4e0d8)',
                    background: 'white', fontSize: '.78rem', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit', color: 'var(--taupe, #7a7670)' }}
                >Clear</button>
              )}
            </div>

            {/* Integration cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                : filtered.length === 0
                ? (
                  <div style={{ background: 'white', border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 16,
                    padding: 40, textAlign: 'center', color: 'var(--taupe, #7a7670)', fontSize: '.875rem' }}>
                    No integrations match — try a different search or category.
                  </div>
                )
                : (() => {
                  const channels = filtered.filter(i => CHANNEL_IDS.includes(i.id));
                  const triggers = filtered.filter(i => !CHANNEL_IDS.includes(i.id));
                  const header = (label, sub) => (
                    <div key={label} style={{ margin: '6px 0 2px' }}>
                      <div style={{ fontSize: '.7rem', fontWeight: 700, letterSpacing: '.09em',
                        textTransform: 'uppercase', color: '#a39e93' }}>{label}</div>
                      {sub && <div style={{ fontSize: '.78rem', color: 'var(--taupe, #7a7670)', marginTop: 2 }}>{sub}</div>}
                    </div>
                  );
                  const card = (integration) => (
                    <div key={integration.id} id={`int-${integration.id}`}
                      style={highlightId === integration.id
                        ? { borderRadius: 16, boxShadow: '0 0 0 3px var(--honey, #f5c842)', transition: 'box-shadow .3s' } : undefined}>
                      <IntegrationCard
                        integration={integration}
                        connectedData={getConnected(integration.id)}
                        onConnect={load}
                        onDisconnect={load}
                      />
                    </div>
                  );
                  return (
                    <>
                      {channels.length > 0 && header('Review channels',
                        'Where your reviews live. Powers review monitoring and AI replies — connect Google first.')}
                      {channels.map(card)}
                      {triggers.length > 0 && header('Trigger integrations',
                        'When to ask for reviews. Connect the tools you already use; each has its own send timing.')}
                      {triggers.map(card)}
                    </>
                  );
                })()}
            </div>
          </>
        )}

        {pageTab === 'zapier' && <ZapierTab />}
      </div>
    </DashboardLayout>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ZAPIER TAB — triggers/actions docs, setup steps, API key management
// ════════════════════════════════════════════════════════════════════════════

const ZAP_TRIGGERS = [
  { name: 'New Review', desc: 'Fires the moment a new review arrives on any of your connected platforms (Google, Facebook). Use it to post reviews to Slack, log them in a spreadsheet, or thank customers automatically.' },
  { name: 'New Negative Review (1–2 Stars)', desc: 'Fires immediately when a 1 or 2 star review arrives. Use it to alert your team, create urgent tasks, or trigger escalation workflows.' },
];

const ZAP_ACTIONS = [
  { name: 'Send Review Request', desc: 'Send a personalised email review request to a customer or patient. Works with any appointment, booking, or CRM system.' },
  { name: 'Create Contact', desc: "Register a customer or patient in SwarmReply. Tracked contacts won't receive duplicate review requests in future imports." },
  { name: 'Get Location Stats', desc: 'Pull the current reputation stats for a location: total reviews, average rating, response rate, and more. Pair with Schedule by Zapier to post weekly digests to Slack.' },
  { name: 'Find Location', desc: 'Find a SwarmReply location by name — use it to get the Location ID for other steps.' },
  { name: 'Find Contact', desc: 'Check whether a customer has already received a review request, so you never send duplicates.' },
];

function ZapierTab() {
  const [keyStatus, setKeyStatus] = useState(null); // { exists, hint, createdAt }
  const [newKey, setNewKey]       = useState('');
  const [busy, setBusy]           = useState(false);
  const [error, setError]         = useState('');
  const [copied, setCopied]       = useState(false);

  useEffect(() => { loadKey(); }, []);

  async function loadKey() {
    try {
      const res = await axios.get(`${API}/zapier/key`, { headers: authH() });
      setKeyStatus(res.data);
    } catch {
      setKeyStatus({ exists: false });
    }
  }

  async function generateKey(rotating) {
    if (rotating && !confirm('Rotate your API key? Your existing Zaps will stop working until you paste the new key into Zapier.')) return;
    setBusy(true); setError(''); setCopied(false);
    try {
      const res = await axios.post(`${API}/zapier/key`, {}, { headers: authH() });
      setNewKey(res.data.key);
      await loadKey();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not generate a key. Please try again.');
    } finally { setBusy(false); }
  }

  async function disconnect() {
    if (!confirm('Disconnect Zapier? Your API key will be revoked and all active Zap triggers will stop immediately.')) return;
    setBusy(true); setError('');
    try {
      await axios.delete(`${API}/zapier/key`, { headers: authH() });
      setNewKey('');
      await loadKey();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not disconnect. Please try again.');
    } finally { setBusy(false); }
  }

  function copyKey() {
    navigator.clipboard?.writeText(newKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  const sectionTitle = { fontWeight: 700, fontSize: '.9rem', marginBottom: 12 };
  const card = { background: 'white', border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 16, padding: 24, marginBottom: 16 };

  return (
    <div>
      {/* Intro */}
      <div style={{ ...card, background: 'var(--ink, #0a0a0a)', border: 'none' }}>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.15rem', fontWeight: 900, color: 'white', marginBottom: 6 }}>
          Connect SwarmReply to 7,000+ apps
        </div>
        <div style={{ fontSize: '.84rem', color: 'rgba(255,255,255,.55)', lineHeight: 1.7 }}>
          Zapier links SwarmReply with the tools you already use — Slack, Google Sheets, Mailchimp,
          QuickBooks, your CRM, and thousands more. Reviews flow out the moment they arrive, and
          review requests can be triggered from any app, no code required.
        </div>
      </div>

      {/* API key */}
      <div style={card}>
        <div style={sectionTitle}>Your API key</div>
        {error && (
          <div style={{ background: 'var(--danger-bg, #fee2e2)', border: '1px solid #fca5a5', borderRadius: 10,
            padding: '10px 14px', fontSize: '.82rem', color: 'var(--danger, #c0392b)', marginBottom: 12 }}>{error}</div>
        )}

        {newKey ? (
          <div style={{ background: '#fef9e7', border: '1.5px solid var(--honey, #f5c842)', borderRadius: 12, padding: '14px 16px', marginBottom: 4 }}>
            <div style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--amber-tx, #92690a)', marginBottom: 8 }}>
              Copy this key now — it won't be shown again
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <code style={{ flex: 1, fontFamily: 'monospace', fontSize: '.78rem', background: 'white',
                border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 8, padding: '8px 12px', color: 'var(--tx, #1a1a18)',
                overflowX: 'auto', whiteSpace: 'nowrap' }}>{newKey}</code>
              <button onClick={copyKey} style={{ padding: '8px 16px', borderRadius: 50,
                border: 'none', background: 'var(--ink, #0a0a0a)', color: 'white', fontSize: '.78rem',
                fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                {copied ? 'Copied ✓' : 'Copy'}
              </button>
            </div>
            <div style={{ fontSize: '.74rem', color: 'var(--amber-tx, #92690a)', marginTop: 8 }}>
              Paste it into Zapier when the SwarmReply app asks for your API key.
            </div>
          </div>
        ) : keyStatus === null ? (
          <div style={{ color: 'var(--taupe, #7a7670)', fontSize: '.84rem' }}>Loading…</div>
        ) : keyStatus.exists ? (
          <>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <code style={{ flex: 1, fontFamily: 'monospace', fontSize: '.78rem', background: 'var(--cream, #f8f7f4)',
                border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 8, padding: '8px 12px', color: 'var(--tx, #1a1a18)' }}>
                sr_live_••••••••••••{keyStatus.hint}
              </code>
            </div>
            <div style={{ fontSize: '.75rem', color: 'var(--taupe, #7a7670)', marginBottom: 14 }}>
              {keyStatus.createdAt ? `Created ${new Date(keyStatus.createdAt).toLocaleDateString()}. ` : ''}
              For security we only store a fingerprint — if you've lost the key, rotate it to get a new one.
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => generateKey(true)} disabled={busy} style={{ padding: '9px 18px',
                borderRadius: 50, border: '1.5px solid var(--line, #e4e0d8)', background: 'white', fontSize: '.8rem',
                fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Rotate key</button>
              <button onClick={disconnect} disabled={busy} style={{ padding: '9px 18px',
                borderRadius: 50, border: '1.5px solid #fca5a5', background: 'white', fontSize: '.8rem',
                fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--danger, #c0392b)' }}>Disconnect Zapier</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: '.84rem', color: 'var(--taupe, #7a7670)', lineHeight: 1.7, marginBottom: 14 }}>
              Generate an API key to connect Zapier. The key authenticates the SwarmReply Zapier app
              with your account — you'll paste it in once during Zap setup.
            </div>
            <button onClick={() => generateKey(false)} disabled={busy} style={{ padding: '11px 24px',
              borderRadius: 50, border: 'none', background: 'var(--ink, #0a0a0a)', color: 'white',
              fontSize: '.84rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {busy ? 'Generating…' : 'Generate API key'}
            </button>
          </>
        )}
      </div>

      {/* Setup steps */}
      <div style={card}>
        <div style={sectionTitle}>How to connect</div>
        {[
          ['1', 'Generate your API key above and copy it.'],
          ['2', 'In Zapier, create a new Zap and search for "SwarmReply" when choosing a trigger or action.'],
          ['3', 'When Zapier asks you to sign in to SwarmReply, paste your API key.'],
          ['4', "Build your Zap — pick a trigger or action below, map the fields, and turn it on."],
        ].map(([n, text]) => (
          <div key={n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--honey, #f5c842)', color: 'var(--ink, #0a0a0a)',
              fontSize: '.72rem', fontWeight: 800, display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0 }}>{n}</div>
            <div style={{ fontSize: '.84rem', color: 'var(--tx-3, #3a3a38)', lineHeight: 1.6 }}>{text}</div>
          </div>
        ))}
      </div>

      {/* Triggers */}
      <div style={card}>
        <div style={sectionTitle}>Triggers — when something happens in SwarmReply</div>
        {ZAP_TRIGGERS.map(t => (
          <div key={t.name} style={{ padding: '12px 0', borderBottom: '1px solid var(--cream-2, #f0eeea)' }}>
            <div style={{ fontSize: '.84rem', fontWeight: 700, marginBottom: 4 }}>⚡ {t.name}</div>
            <div style={{ fontSize: '.8rem', color: 'var(--taupe, #7a7670)', lineHeight: 1.6 }}>{t.desc}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={card}>
        <div style={sectionTitle}>Actions — make SwarmReply do something from another app</div>
        {ZAP_ACTIONS.map(a => (
          <div key={a.name} style={{ padding: '12px 0', borderBottom: '1px solid var(--cream-2, #f0eeea)' }}>
            <div style={{ fontSize: '.84rem', fontWeight: 700, marginBottom: 4 }}>▸ {a.name}</div>
            <div style={{ fontSize: '.8rem', color: 'var(--taupe, #7a7670)', lineHeight: 1.6 }}>{a.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
