// ============================================
// pages/dashboard/integrations.js
// All 6 integrations + existing Google/Facebook
// ============================================

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
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
    description: 'Sync reviews, AI replies, listings, and Google Posts.',
    trigger:     'Monitors reviews automatically',
    authType:    'oauth',
  },
  {
    id:          'facebook',
    name:        'Facebook Reviews',
    icon:        '📘',
    color:       '#1877F2',
    category:    'Reviews',
    description: 'Monitor and reply to Facebook page reviews.',
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
    color:       '#0a0a0a',
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
    connected: ['#e8f5ef', '#1a6b45', 'Connected'],
    error:     ['#fee2e2', '#c0392b', 'Error'],
  };
  const [bg, color, label] = styles[status] || styles.connected;
  return (
    <span style={{ background: bg, color, fontSize: '.67rem', fontWeight: 700,
      padding: '2px 9px', borderRadius: 50 }}>
      {label}
    </span>
  );
}

function IntegrationCard({ integration, connectedData, locations, selectedLocation, setSelectedLocation, onConnect, onDisconnect }) {
  const [expanded, setExpanded]     = useState(false);
  const [fields, setFields]         = useState({});
  const [connecting, setConnecting]     = useState(false);
  const [error, setError]           = useState('');
  const connected = connectedData?.status === 'connected';
  // P1: location selector only matters for the two providers that send a
  // locationId to the backend (Google + Jobber). The other providers derive
  // the location from the auth token and ignore it.
  const needsLocation = integration.id === 'google' || integration.id === 'jobber';

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
    await axios.delete(`${API}/integrations/${integration.id}`, { headers: authH() }).catch(() => {});
    onDisconnect();
  }

  return (
    <div style={{
      background: 'white', border: `1px solid ${connected ? '#e4e0d8' : '#e4e0d8'}`,
      borderRadius: 14, overflow: 'hidden',
      borderTop: connected ? `3px solid ${integration.color}` : '3px solid transparent',
      transition: 'all .15s',
    }}>
      <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Icon */}
        <div style={{
          width: 44, height: 44, borderRadius: 11,
          background: `${integration.color}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.2rem', flexShrink: 0,
        }}>
          {integration.icon}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontWeight: 700, fontSize: '.9rem' }}>{integration.name}</span>
            <StatusBadge status={connectedData?.status} />
          </div>
          <div style={{ fontSize: '.78rem', color: '#7a7670', lineHeight: 1.5 }}>
            {integration.description}
          </div>
          {connected && (
            <div style={{ fontSize: '.72rem', color: '#1a6b45', marginTop: 4, display: 'flex', gap: 12 }}>
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
                padding: '7px 14px', borderRadius: 50, border: '1.5px solid #e4e0d8',
                background: 'transparent', cursor: 'pointer', fontSize: '.8rem',
                fontWeight: 600, color: '#7a7670', fontFamily: 'inherit',
              }}>Disconnect</button>
            </>
          ) : (
            <button onClick={() => setExpanded(e => !e)} style={{
              padding: '8px 18px', borderRadius: 50,
              background: '#0a0a0a', color: 'white', border: 'none',
              cursor: 'pointer', fontSize: '.82rem', fontWeight: 700, fontFamily: 'inherit',
            }}>
              {expanded ? 'Cancel' : 'Connect →'}
            </button>
          )}
        </div>
      </div>

      {/* Expanded connect form */}
      {expanded && !connected && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f0eeea' }}>
          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 9,
              padding: '9px 13px', fontSize: '.82rem', color: '#c0392b', margin: '12px 0' }}>
              {error}
            </div>
          )}

          {integration.authType === 'oauth' && (
            <>
              {needsLocation && locations.length > 1 && (
                <div style={{ marginTop: 12 }}>
                  <label style={{ display: 'block', fontSize: '.67rem', fontWeight: 700,
                    letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 5 }}>
                    Location
                  </label>
                  <select
                    value={selectedLocation || ''}
                    onChange={e => setSelectedLocation(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e4e0d8',
                      borderRadius: 9, fontSize: '16px', fontFamily: 'inherit', outline: 'none', background: 'white' }}
                  >
                    {locations.map(l => (
                      <option key={l.id} value={l.id}>{l.business_name || l.id}</option>
                    ))}
                  </select>
                </div>
              )}
              {integration.extraField && (
                <div style={{ marginTop: 12 }}>
                  <label style={{ display: 'block', fontSize: '.67rem', fontWeight: 700,
                    letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 5 }}>
                    {integration.extraField.label}
                  </label>
                  <input
                    placeholder={integration.extraField.placeholder}
                    value={fields[integration.extraField.key] || ''}
                    onChange={e => setFields(f => ({ ...f, [integration.extraField.key]: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e4e0d8',
                      borderRadius: 9, fontSize: '16px', fontFamily: 'inherit', outline: 'none' }}
                  />
                </div>
              )}
              <p style={{ fontSize: '.78rem', color: '#7a7670', margin: '12px 0', lineHeight: 1.6 }}>
                You'll be redirected to {integration.name} to authorise SwarmReply. We only request
                read access to your {integration.trigger.toLowerCase()} data.
              </p>
            </>
          )}

          {(integration.authType === 'credentials' || integration.authType === 'toggle') && (
            integration.fields?.map(field => (
              <div key={field.key} style={{ marginTop: 12 }}>
                <label style={{ display: 'block', fontSize: '.67rem', fontWeight: 700,
                  letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 5 }}>
                  {field.label}
                </label>
                <input
                  type={field.type || 'text'}
                  placeholder={field.placeholder}
                  value={fields[field.key] || ''}
                  onChange={e => setFields(f => ({ ...f, [field.key]: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e4e0d8',
                    borderRadius: 9, fontSize: '16px', fontFamily: 'inherit', outline: 'none' }}
                />
              </div>
            ))
          )}

          <div style={{ marginTop: 14, display: 'flex', gap: 9, alignItems: 'center' }}>
            <button onClick={handleConnect} disabled={connecting} style={{
              padding: '10px 22px', borderRadius: 50, background: '#0a0a0a',
              color: 'white', border: 'none', cursor: 'pointer', fontSize: '.875rem',
              fontWeight: 700, fontFamily: 'inherit', opacity: connecting ? .6 : 1,
            }}>
              {connecting ? 'Connecting…'
                : integration.authType === 'oauth' ? `Connect with ${integration.name} →`
                : 'Connect'}
            </button>
            <span style={{ fontSize: '.72rem', color: '#7a7670' }}>
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
  // P1: these were referenced by load() but never declared here (the declarations
  // lived inside IntegrationCard), so setLocations/setSelectedLocation threw a
  // ReferenceError that the try/catch swallowed — locations were fetched then lost.
  const [locations, setLocations]               = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);

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

  const filtered = INTEGRATIONS.filter(i =>
    category === 'All' || i.category === category
  );

  return (
    <DashboardLayout title="Integrations">
      <div className="page-padding" style={{ padding: 24 }}>

        {/* Header stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
          <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 6 }}>Connected</div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.8rem', fontWeight: 900 }}>{connectedCount}</div>
          </div>
          <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 6 }}>Available</div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.8rem', fontWeight: 900 }}>{INTEGRATIONS.length}</div>
          </div>
          <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 6 }}>Also via Zapier</div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.8rem', fontWeight: 900 }}>7,000+</div>
          </div>
        </div>

        {/* Category filter */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)} style={{
              padding: '6px 14px', borderRadius: 50,
              border: '1.5px solid', borderColor: category === cat ? '#0a0a0a' : '#e4e0d8',
              background: category === cat ? '#0a0a0a' : 'white',
              color: category === cat ? 'white' : '#7a7670',
              fontSize: '.8rem', fontWeight: category === cat ? 700 : 500,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
            }}>{cat}</button>
          ))}
        </div>

        {/* Integration cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(integration => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              connectedData={getConnected(integration.id)}
              locations={locations}
              selectedLocation={selectedLocation}
              setSelectedLocation={setSelectedLocation}
              onConnect={load}
              onDisconnect={load}
            />
          ))}
        </div>

        {/* Zapier banner */}
        <div style={{ background: '#0a0a0a', borderRadius: 16, padding: '24px 28px', marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.1rem', fontWeight: 900, color: 'white', marginBottom: 5 }}>Need a different integration?</div>
            <div style={{ fontSize: '.84rem', color: 'rgba(255,255,255,.5)', lineHeight: 1.6 }}>
              Connect SwarmReply to 7,000+ apps via Zapier — Mailchimp, ActiveCampaign, Slack, QuickBooks, and more.
            </div>
          </div>
          <a href="https://zapier.com/apps/swarmreply" target="_blank" rel="noreferrer"
            style={{ padding: '10px 22px', borderRadius: 50, background: '#f5c842', color: '#0a0a0a',
              fontWeight: 700, fontSize: '.875rem', textDecoration: 'none', flexShrink: 0 }}>
            Browse Zapier →
          </a>
        </div>
      </div>

      {/* API Key & Zapier — merged from Settings */}
      <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 16, padding: 24, marginTop: 20 }}>
        <div style={{ fontWeight: 700, fontSize: '.9rem', marginBottom: 16 }}>API Key & Zapier</div>
        <div style={{ background: '#f8f7f4', border: '1px solid #e4e0d8', borderRadius: 12, padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ fontSize: '.67rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 8 }}>Your API Key</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <code style={{ flex: 1, fontFamily: 'monospace', fontSize: '.78rem', background: 'white', border: '1px solid #e4e0d8', borderRadius: 8, padding: '8px 12px', color: '#1a1a18' }}>sr_live_••••••••••••••••••••</code>
            <button style={{ padding: '6px 14px', borderRadius: 50, border: '1.5px solid #e4e0d8', background: 'white', fontSize: '.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Copy</button>
          </div>
          <div style={{ fontSize: '.75rem', color: '#7a7670', marginTop: 8 }}>Use this key to authenticate requests to the SwarmReply API and Zapier.</div>
        </div>
        <div style={{ background: '#0a0a0a', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: '.84rem', fontWeight: 700, color: 'white', marginBottom: 4 }}>Connect Zapier</div>
            <div style={{ fontSize: '.75rem', color: 'rgba(255,255,255,.5)' }}>Access 7,000+ apps — trigger review requests from any tool</div>
          </div>
          <a href="https://zapier.com" target="_blank" rel="noopener noreferrer" style={{ padding: '8px 18px', borderRadius: 50, background: '#f5c842', color: '#0a0a0a', fontWeight: 700, fontSize: '.82rem', textDecoration: 'none', whiteSpace: 'nowrap' }}>Browse Zapier →</a>
        </div>
      </div>
    </DashboardLayout>
  );
}
