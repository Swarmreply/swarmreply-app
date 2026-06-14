// ============================================
// pages/dashboard/listings.js
// Listings Health — one canonical business profile,
// pushed live to Google (true write-API) and monitored
// for drift on Facebook and Foursquare.
// No copy-paste portals: every row here connects via API.
// ============================================

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { Card, PageHeader, Button, StatCard, EmptyState } from '../../components/ui';
import { Skeleton } from '../../components/Skeleton';
import { getLocations, getListings, saveListings, pushListings, scanListings } from '../../utils/api';

const SERIF = "'Playfair Display', serif";

// SYNCED tier — true write-API: we push your info live.
const PLATFORM_META = {
  google: { name: 'Google Business Profile', note: 'Connect Google to push your hours, phone, website and more — live.' },
  bing:   { name: 'Bing Places', note: 'Bing mirrors your Google profile automatically — keep Google synced and Bing follows.' },
  apple:  { name: 'Apple Maps', note: 'Apple’s listings API is partner-gated — manage Apple Business directly for now.' },
};

// MONITORED tier — read-only API: we watch for drift and flag mismatches.
// 'facebook' works with the page connection you already have;
// 'foursquare' activates once its API key is configured server-side.
const MONITORED = [
  { id: 'facebook',   name: 'Facebook',   needsKey: false, blurb: 'Watches your Facebook page info for changes.' },
  { id: 'foursquare', name: 'Foursquare', needsKey: true,  blurb: 'Feeds Apple Maps, Uber, Nextdoor & more — fix it once, fix it everywhere.' },
];

const STATUS_CHIP = {
  synced:        ['#e8f5ef', '#1a6b45', 'Synced ✓'],
  connected:     ['#eef2fb', '#27508f', 'Connected — push to sync'],
  diverged:      ['#fdf3e0', '#9a6a08', 'Differs from your info'],
  pending_review:['#eef2fb', '#27508f', 'Pending platform review'],
  error:         ['#fdeaea', '#b3261e', 'Error'],
  not_connected: ['#f3f1ec', '#7a7670', 'Not connected'],
};

function Chip({ status }) {
  const [bg, color, label] = STATUS_CHIP[status] || STATUS_CHIP.not_connected;
  return (
    <span style={{ background: bg, color, fontSize: '.72rem', fontWeight: 700,
      padding: '4px 11px', borderRadius: 50, whiteSpace: 'nowrap' }}>{label}</span>
  );
}

const field = {
  width: '100%', border: '1.5px solid #e4e0d8', borderRadius: 12,
  padding: '11px 13px', fontSize: 16, fontFamily: 'inherit',
  background: 'white', color: '#1a1a18', outline: 'none', boxSizing: 'border-box',
};
const lbl = {
  fontSize: '.7rem', fontWeight: 700, letterSpacing: '.06em',
  textTransform: 'uppercase', color: '#a39e93', display: 'block', marginBottom: 5,
};

export default function Listings() {
  const [locationId, setLocationId] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (locId) => {
    try {
      const d = await getListings(locId);
      setData(d); setError('');
    } catch (e) {
      setError(e.response?.data?.error || 'Could not load listings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const locs = await getLocations();
        if (!locs.length) { setLoading(false); setError('no-location'); return; }
        setLocationId(locs[0].id);
        await load(locs[0].id);
      } catch (e) { setLoading(false); setError('Could not load your location'); }
    })();
  }, [load]);

  return (
    <DashboardLayout>
      <PageHeader
        title="Listings"
        subtitle="One source of truth for your business info — synced everywhere it can be, guided everywhere else."
      />
      <div style={{ padding: 24 }}>
        {loading ? (
          <div>
            <div className="m-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
              {[0,1,2,3].map(i => <Skeleton key={i} height={92} />)}
            </div>
            <Skeleton height={300} />
          </div>
        ) : error === 'no-location' ? (
          <EmptyState title="Add a location first"
            body="Listings sync needs a business location. Set one up and your info board appears here."
            actionLabel="Open settings" href="/dashboard/settings" />
        ) : error ? (
          <EmptyState title="Couldn't load listings" body={error} />
        ) : data && (
          <ListingsBoard data={data} locationId={locationId} reload={() => load(locationId)} />
        )}
      </div>
    </DashboardLayout>
  );
}

const DIR_FIX_URL = {
  facebook:   'https://www.facebook.com/settings',
  foursquare: 'https://foursquare.com/venue/claim',
};
const DIR_NAME = { facebook: 'Facebook', foursquare: 'Foursquare' };

function ListingsBoard({ data, locationId, reload }) {
  const { location, platforms, directories, summary, history } = data;
  const monitored = (directories || []).filter(d => ['facebook', 'foursquare'].includes(d.directory));

  // Build a single, specific list of everything that's inconsistent
  const issues = [];
  platforms.forEach(p => {
    if (p.status === 'diverged' && p.diverged_fields?.length) {
      issues.push({ kind: 'google', platform: p.platform, name: 'Google',
        fields: p.diverged_fields, fixable: true });
    } else if (p.status === 'error') {
      issues.push({ kind: 'error', platform: p.platform, name: PLATFORM_META[p.platform]?.name || p.platform,
        message: p.last_error });
    }
  });
  monitored.forEach(d => {
    if (d.status === 'attention') {
      issues.push({ kind: 'monitored', platform: d.directory, name: DIR_NAME[d.directory] || d.directory,
        fields: d.diverged_fields || [], found: { name: d.found_name, phone: d.found_phone, address: d.found_address } });
    }
  });

  const drift = issues.length;
  const googleLive = platforms.some(p => p.platform === 'google' && (p.status === 'synced' || p.status === 'connected'));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="m-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        <StatCard label="Listings health" value={`${summary.score || 0}%`}
          sub={googleLive ? 'Your info is live on Google' : 'Connect Google to start'}
          valueColor={summary.score >= 80 ? '#1a6b45' : summary.score >= 50 ? '#9a6a08' : '#b3261e'} />
        <StatCard label="Synced to Google" value={googleLive ? 'Live' : 'Off'}
          sub={googleLive ? 'Hours, phone, website' : 'Not connected yet'}
          valueColor={googleLive ? '#1a6b45' : '#7a7670'} />
        <StatCard label="Needs attention" value={drift} sub={drift ? 'Fix below' : 'All consistent'}
          valueColor={drift ? '#b3261e' : '#1a6b45'} />
      </div>

      {issues.length > 0 && (
        <MismatchAlert issues={issues} location={location} locationId={locationId} reload={reload} />
      )}

      <BusinessInfoCard location={location} locationId={locationId} reload={reload} />
      <SyncPlatformsCard platforms={platforms} locationId={locationId} reload={reload} />
      <MonitoredCard monitored={monitored} locationId={locationId} reload={reload} />
      {history?.length > 0 && <HistoryCard history={history} />}
    </div>
  );
}

// ── Source of truth ──────────────────────────

function BusinessInfoCard({ location, locationId, reload }) {
  const [f, setF] = useState({
    businessName: location.businessName || '', phone: location.phone || '',
    website: location.website || '', addressLine1: location.addressLine1 || '',
    addressLine2: location.addressLine2 || '', city: location.city || '',
    state: location.state || '', zip: location.zip || '',
    description: location.description || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function save() {
    setSaving(true); setSaved(false);
    try {
      await saveListings(locationId, f);
      setSaved(true); setTimeout(() => setSaved(false), 2500);
      reload();
    } catch (e) {
      alert(e.response?.data?.error || 'Could not save');
    } finally { setSaving(false); }
  }

  return (
    <Card>
      <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: '1.05rem', marginBottom: 4 }}>Business info — your single source of truth</div>
      <div style={{ fontSize: '.8rem', color: '#7a7670', marginBottom: 18 }}>
        This is the canonical version of your business. Every sync and every guided setup uses exactly these details.
      </div>
      <div className="m-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div><label style={lbl}>Business name</label><input style={field} value={f.businessName} onChange={set('businessName')} /></div>
        <div><label style={lbl}>Phone</label><input style={field} value={f.phone} onChange={set('phone')} placeholder="(555) 123-4567" /></div>
        <div><label style={lbl}>Website</label><input style={field} value={f.website} onChange={set('website')} placeholder="https://example.com" /></div>
        <div><label style={lbl}>Address line 1</label><input style={field} value={f.addressLine1} onChange={set('addressLine1')} /></div>
        <div><label style={lbl}>Address line 2</label><input style={field} value={f.addressLine2} onChange={set('addressLine2')} placeholder="Suite 200 (optional)" /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
          <div><label style={lbl}>City</label><input style={field} value={f.city} onChange={set('city')} /></div>
          <div><label style={lbl}>State</label><input style={field} value={f.state} onChange={set('state')} /></div>
          <div><label style={lbl}>ZIP</label><input style={field} value={f.zip} onChange={set('zip')} /></div>
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <label style={lbl}>Description</label>
        <textarea style={{ ...field, minHeight: 84, resize: 'vertical' }} value={f.description} onChange={set('description')}
          placeholder="What you do, who you serve, what makes you different." />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
        <Button onClick={save} disabled={saving}>{saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save business info'}</Button>
        <span style={{ fontSize: '.72rem', color: '#a39e93' }}>
          Name and address changes on Google go through a short platform review (~3 days).
        </span>
      </div>
    </Card>
  );
}

// ── Synced platforms ─────────────────────────

function SyncPlatformsCard({ platforms, locationId, reload }) {
  const [pushing, setPushing] = useState(null); // platform | 'all'
  const [result, setResult] = useState(null);

  async function push(platform) {
    setPushing(platform || 'all'); setResult(null);
    try {
      const res = await pushListings(locationId, platform);
      setResult(res.results);
      reload();
    } catch (e) {
      setResult({ _error: e.response?.data?.error || e.message });
    } finally { setPushing(null); }
  }

  const anyConnected = platforms.some(p => p.status !== 'not_connected');

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: '1.05rem' }}>Synced to Google</div>
        {anyConnected && (
          <Button size="sm" onClick={() => push(null)} disabled={!!pushing}>
            {pushing === 'all' ? 'Pushing…' : 'Push my info live'}
          </Button>
        )}
      </div>
      <div style={{ fontSize: '.8rem', color: '#7a7670', marginBottom: 14 }}>
        This is the listing customers actually see first. Connect Google once and SwarmReply pushes your
        business info live — then keeps it in sync every day. Bing mirrors Google automatically.
      </div>
      {platforms.map(p => {
        const meta = PLATFORM_META[p.platform] || { name: p.platform };
        return (
          <div key={p.platform} style={{ display: 'flex', alignItems: 'center', gap: 12,
            padding: '13px 0', borderTop: '1px solid #f0eeea', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontWeight: 600, fontSize: '.875rem' }}>{meta.name}</div>
              <div style={{ fontSize: '.74rem', color: '#7a7670' }}>
                {p.status === 'diverged' && p.diverged_fields?.length
                  ? `Differs on: ${p.diverged_fields.join(', ')}`
                  : p.status === 'error' && p.last_error
                  ? p.last_error.slice(0, 90)
                  : p.last_synced_at
                  ? `Last checked ${new Date(p.last_synced_at).toLocaleDateString()}`
                  : meta.note}
              </div>
            </div>
            <Chip status={p.status} />
            {(p.status === 'connected' || p.status === 'synced' || p.status === 'diverged') && (
              <Button size="sm" variant="ghost" onClick={() => push(p.platform)} disabled={!!pushing}>
                {pushing === p.platform ? 'Pushing…' : p.status === 'diverged' ? 'Push fix' : 'Sync now'}
              </Button>
            )}
          </div>
        );
      })}
      {result?._error && <div style={{ fontSize: '.78rem', color: '#b3261e', fontWeight: 600, marginTop: 10 }}>{result._error}</div>}
      {result && !result._error && (
        <div style={{ fontSize: '.78rem', marginTop: 10 }}>
          {Object.entries(result).map(([k, v]) => (
            <div key={k} style={{ color: v.success ? '#1a6b45' : '#b3261e', fontWeight: 600 }}>
              {PLATFORM_META[k]?.name || k}: {v.success ? 'pushed ✓' : v.error}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Monitored directories (read-only API) ────

// ── Prominent mismatch alert ─────────────────
// One unmissable banner that names exactly what's wrong, where, and how to fix.

const FIELD_LABEL = { name: 'Business name', phone: 'Phone', address: 'Address', website: 'Website', hours: 'Hours' };

function yourValue(field, location) {
  if (!location) return null;
  switch (field) {
    case 'name':    return location.businessName || location.business_name;
    case 'phone':   return location.phone;
    case 'website': return location.website;
    case 'address': return [location.addressLine1 || location.address_line1, location.city, location.state, location.zip].filter(Boolean).join(', ');
    default: return null;
  }
}

function MismatchAlert({ issues, location, locationId, reload }) {
  const [pushing, setPushing] = useState(false);
  const [rescanning, setRescanning] = useState(false);
  const [msg, setMsg] = useState('');

  async function pushGoogleFix() {
    setPushing(true); setMsg('');
    try {
      await pushListings(locationId, 'google');
      setMsg('Pushed your info to Google ✓');
      reload();
    } catch (e) {
      setMsg(e.response?.data?.error || 'Could not push to Google.');
    } finally { setPushing(false); }
  }

  async function rescan() {
    setRescanning(true); setMsg('');
    try { await scanListings(locationId); reload(); }
    catch (e) { setMsg(e.response?.data?.error || 'Re-scan failed.'); }
    finally { setRescanning(false); }
  }

  return (
    <Card style={{ border: '1.5px solid #f0c9c0', background: '#fdf6f4' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '1.1rem' }}>⚠️</span>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: '1.05rem', color: '#9a2b1c' }}>
          {issues.length} {issues.length === 1 ? 'listing needs' : 'listings need'} your attention
        </div>
        <button onClick={rescan} disabled={rescanning}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#9a2b1c', fontSize: '.78rem',
            fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
          {rescanning ? 'Re-scanning…' : 'Re-scan now'}
        </button>
      </div>
      <div style={{ fontSize: '.8rem', color: '#7a5a54', marginBottom: 12 }}>
        Customers see your business info across the web. These don’t match what you’ve told us — here’s exactly what’s off and how to fix it.
      </div>

      {issues.map((issue, i) => (
        <div key={i} style={{ borderTop: '1px solid #f3ddd6', padding: '12px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ fontWeight: 700, fontSize: '.86rem', color: '#1a1a18' }}>{issue.name}</span>
            {issue.kind === 'google' && (
              <span style={{ fontSize: '.72rem', color: '#9a6a08', fontWeight: 600 }}>
                differs on {issue.fields.map(f => FIELD_LABEL[f] || f).join(', ')}
              </span>
            )}
            {issue.kind === 'error' && (
              <span style={{ fontSize: '.72rem', color: '#b3261e', fontWeight: 600 }}>connection issue</span>
            )}
            {issue.kind === 'monitored' && issue.fields.length > 0 && (
              <span style={{ fontSize: '.72rem', color: '#9a6a08', fontWeight: 600 }}>
                lists a different {issue.fields.map(f => (FIELD_LABEL[f] || f).toLowerCase()).join(', ')}
              </span>
            )}
          </div>

          {/* Field-by-field: yours → what they list */}
          {issue.kind === 'monitored' && issue.fields.map(f => {
            const mine = yourValue(f, location);
            const theirs = f === 'name' ? issue.found?.name : f === 'phone' ? issue.found?.phone : f === 'address' ? issue.found?.address : null;
            if (!mine && !theirs) return null;
            return (
              <div key={f} style={{ fontSize: '.76rem', padding: '2px 0', lineHeight: 1.5 }}>
                <span style={{ color: '#a39e93', fontWeight: 700 }}>{FIELD_LABEL[f] || f}: </span>
                <span style={{ color: '#1a6b45', fontWeight: 600 }}>{mine || '—'}</span>
                <span style={{ color: '#a39e93' }}> · they list </span>
                <span style={{ color: '#b3261e', fontWeight: 600 }}>{theirs || 'something different'}</span>
              </div>
            );
          })}

          {issue.kind === 'error' && issue.message && (
            <div style={{ fontSize: '.76rem', color: '#b3261e' }}>{String(issue.message).slice(0, 120)}</div>
          )}

          {/* Fix CTA */}
          <div style={{ marginTop: 8 }}>
            {issue.kind === 'google' ? (
              <Button size="sm" onClick={pushGoogleFix} disabled={pushing}>
                {pushing ? 'Pushing…' : 'Push my correct info to Google →'}
              </Button>
            ) : issue.kind === 'monitored' ? (
              <a href={DIR_FIX_URL[issue.platform] || '#'} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-block', fontSize: '.78rem', fontWeight: 700, color: '#9a2b1c',
                  textDecoration: 'none', border: '1.5px solid #e7b3a8', borderRadius: 50, padding: '6px 14px' }}>
                Fix on {issue.name} ↗
              </a>
            ) : (
              <a href="/dashboard/integrations" style={{ fontSize: '.78rem', fontWeight: 700, color: '#9a2b1c' }}>
                Reconnect {issue.name} →
              </a>
            )}
          </div>
        </div>
      ))}

      {msg && <div style={{ fontSize: '.78rem', fontWeight: 600, color: '#1a6b45', marginTop: 10 }}>{msg}</div>}
    </Card>
  );
}

function MonitoredCard({ monitored, locationId, reload }) {
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState('');
  const byKey = Object.fromEntries((monitored || []).map(d => [d.directory, d]));

  async function scan() {
    setScanning(true); setScanMsg('');
    try {
      const res = await scanListings(locationId);
      const checked = Object.values(res.results || {}).filter(r => r.checked).length;
      const flagged = Object.values(res.results || {}).filter(r => r.diverged).length;
      setScanMsg(checked === 0
        ? 'Nothing to scan yet — connect your Facebook page, and Foursquare activates once we enable it.'
        : `Checked ${checked} director${checked === 1 ? 'y' : 'ies'} — ${flagged ? `${flagged} need${flagged === 1 ? 's' : ''} attention (see the alert above)` : 'all consistent ✓'}`);
      reload();
    } catch (e) {
      setScanMsg(e.response?.data?.error || 'Scan failed — please try again.');
    } finally { setScanning(false); }
  }

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: '1.05rem' }}>Monitored directories</div>
        <Button size="sm" onClick={scan} disabled={scanning}>
          {scanning ? 'Scanning…' : 'Scan for inconsistencies'}
        </Button>
      </div>
      <div style={{ fontSize: '.8rem', color: '#7a7670', marginBottom: 14 }}>
        These can’t be written to by API, but we watch them for you and flag the moment your name,
        phone, or address drifts from your business info — so you can fix it before customers see it.
      </div>
      {scanMsg && <div style={{ fontSize: '.76rem', fontWeight: 600, color: '#27508f', marginBottom: 10 }}>{scanMsg}</div>}

      {MONITORED.map(m => {
        const d = byKey[m.id] || {};
        const checked = !!d.last_checked_at;
        const diverged = d.status === 'attention';
        // Status + sub copy
        let chipBg, chipColor, chipLabel, sub, subColor;
        if (diverged) {
          chipBg = '#fdf3e0'; chipColor = '#9a6a08'; chipLabel = 'Mismatch';
          sub = (d.diverged_fields?.length ? `Differs on ${d.diverged_fields.join(', ')} — see fix above` : (d.note || 'Differs from your info — see fix above')); subColor = '#b3261e';
        } else if (checked) {
          chipBg = '#e8f5ef'; chipColor = '#1a6b45'; chipLabel = 'Consistent ✓';
          sub = `Auto-checked ${new Date(d.last_checked_at).toLocaleDateString()}`; subColor = '#7a7670';
        } else if (m.needsKey) {
          chipBg = '#f3f1ec'; chipColor = '#7a7670'; chipLabel = 'Coming soon';
          sub = m.blurb; subColor = '#a39e93';
        } else {
          chipBg = '#eef2fb'; chipColor = '#27508f'; chipLabel = 'Connect to monitor';
          sub = m.blurb; subColor = '#7a7670';
        }
        return (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12,
            padding: '13px 0', borderTop: '1px solid #f0eeea', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontWeight: 600, fontSize: '.875rem' }}>{m.name}</div>
              <div style={{ fontSize: '.74rem', color: subColor }}>{sub}</div>
            </div>
            <span style={{ background: chipBg, color: chipColor, fontSize: '.72rem', fontWeight: 700,
              padding: '4px 11px', borderRadius: 50, whiteSpace: 'nowrap' }}>{chipLabel}</span>
          </div>
        );
      })}
    </Card>
  );
}

// ── History ──────────────────────────────────

function HistoryCard({ history }) {
  return (
    <Card>
      <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: '1.05rem', marginBottom: 12 }}>Recent sync activity</div>
      {history.slice(0, 8).map((h, i) => (
        <div key={h.id || i} style={{ display: 'flex', gap: 10, fontSize: '.78rem', padding: '7px 0',
          borderTop: i ? '1px solid #f0eeea' : 'none', alignItems: 'baseline' }}>
          <span style={{ color: '#a39e93', minWidth: 86 }}>{new Date(h.created_at).toLocaleDateString()}</span>
          <span style={{ fontWeight: 600, minWidth: 64, textTransform: 'capitalize' }}>{h.platform}</span>
          <span style={{ color: '#7a7670' }}>
            {h.action === 'detect' ? (h.status === 'no_change' ? 'Checked — consistent ✓' : 'Checked — divergence found') :
             h.action === 'push' ? `Pushed updates (${h.status})` : `${h.action} (${h.status})`}
          </span>
        </div>
      ))}
    </Card>
  );
}
