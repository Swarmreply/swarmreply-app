// ============================================
// pages/dashboard/listings.js
// Listings Health — one source of truth for business
// info, synced to the platforms we can write to
// (Google; Apple/Bing when API keys are configured)
// and guided everywhere else.
// ============================================

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { Card, PageHeader, Button, StatCard, EmptyState } from '../../components/ui';
import { Skeleton } from '../../components/Skeleton';
import { getLocations, getListings, saveListings, pushListings, setListingDirectory, scanListings } from '../../utils/api';

const SERIF = "'Playfair Display', serif";

const PLATFORM_META = {
  google: { name: 'Google Business Profile', note: 'Synced through your Google connection' },
  apple:  { name: 'Apple Maps', note: 'Needs Apple Maps API keys — use guided setup below meanwhile' },
  bing:   { name: 'Bing Places', note: 'Needs a Bing Places API key — Bing can also import from Google' },
};

const GUIDED = [
  { id: 'yelp',        name: 'Yelp',          url: 'https://biz.yelp.com' },
  { id: 'facebook',    name: 'Facebook page info', url: 'https://www.facebook.com/settings' },
  { id: 'nextdoor',    name: 'Nextdoor',      url: 'https://business.nextdoor.com' },
  { id: 'bbb',         name: 'BBB',           url: 'https://www.bbb.org/get-listed' },
  { id: 'yellowpages', name: 'Yellow Pages',  url: 'https://accounts.yellowpages.com' },
  { id: 'tripadvisor', name: 'TripAdvisor',   url: 'https://www.tripadvisor.com/Owners' },
  { id: 'foursquare',  name: 'Foursquare',    url: 'https://business.foursquare.com' },
  { id: 'angi',        name: 'Angi',          url: 'https://office.angi.com' },
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

function ListingsBoard({ data, locationId, reload }) {
  const { location, platforms, directories, summary, history } = data;
  const verified = directories.filter(d => d.status === 'verified').length;
  const attention = directories.filter(d => d.status === 'attention').length
    + platforms.filter(p => p.status === 'diverged' || p.status === 'error').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="m-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        <StatCard label="Listings health" value={`${summary.score || 0}%`}
          sub="Consistency across platforms" valueColor={summary.score >= 80 ? '#1a6b45' : summary.score >= 50 ? '#9a6a08' : '#b3261e'} />
        <StatCard label="Synced platforms" value={`${summary.synced}/${summary.total}`} sub="Google, Apple, Bing" />
        <StatCard label="Guided directories" value={`${verified}/${directories.length}`} sub="Verified by you" />
        <StatCard label="Needs attention" value={attention} sub={attention ? 'Review below' : 'All clear'}
          valueColor={attention ? '#b3261e' : '#1a6b45'} />
      </div>

      <BusinessInfoCard location={location} locationId={locationId} reload={reload} />
      <SyncPlatformsCard platforms={platforms} locationId={locationId} reload={reload} />
      <GuidedDirectoriesCard directories={directories} location={location} locationId={locationId} reload={reload} />
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
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: '1.05rem' }}>Synced platforms</div>
        {anyConnected && (
          <Button size="sm" onClick={() => push(null)} disabled={!!pushing}>
            {pushing === 'all' ? 'Pushing…' : 'Push everywhere'}
          </Button>
        )}
      </div>
      <div style={{ fontSize: '.8rem', color: '#7a7670', marginBottom: 14 }}>
        SwarmReply checks these daily and flags anything that drifts from your business info.
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

// ── Guided directories ───────────────────────

const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;

function dirSubline(d) {
  if (d.status === 'attention') return [d.note || 'Needs an update', '#b3261e', 700];
  if (d.status === 'verified') {
    const stale = d.verified_at && (Date.now() - new Date(d.verified_at).getTime() > NINETY_DAYS) && !d.last_checked_at;
    if (stale) return [`Verified ${new Date(d.verified_at).toLocaleDateString()} — worth a 2-minute re-check`, '#9a6a08', 700];
    return [
      d.last_checked_at
        ? `Verified · auto-checked ${new Date(d.last_checked_at).toLocaleDateString()} ✓`
        : `Verified ${d.verified_at ? new Date(d.verified_at).toLocaleDateString() : ''}`,
      '#1a6b45', 700,
    ];
  }
  if (d.found_name) return [`We found your listing — looks consistent. Verify to track it.`, '#27508f', 600];
  return ['Not set up yet', '#7a7670', 400];
}

function GuidedDirectoriesCard({ directories, location, locationId, reload }) {
  const [openDir, setOpenDir] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState('');
  const byKey = Object.fromEntries(directories.map(d => [d.directory, d]));

  async function scan() {
    setScanning(true); setScanMsg('');
    try {
      const res = await scanListings(locationId);
      const checked = Object.values(res.results || {}).filter(r => r.checked).length;
      const flagged = Object.values(res.results || {}).filter(r => r.diverged).length;
      setScanMsg(checked === 0
        ? 'No directories could be checked yet — connect Facebook or add Yelp/Foursquare API keys.'
        : `Checked ${checked} director${checked === 1 ? 'y' : 'ies'} — ${flagged ? `${flagged} need${flagged === 1 ? 's' : ''} attention` : 'all consistent ✓'}`);
      reload();
    } catch (e) {
      setScanMsg(e.response?.data?.error || 'Scan failed — please try again.');
    } finally { setScanning(false); }
  }

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: '1.05rem' }}>Guided directories</div>
        <Button size="sm" variant="ghost" onClick={scan} disabled={scanning}>
          {scanning ? 'Scanning…' : 'Scan directories now'}
        </Button>
      </div>
      {scanMsg && <div style={{ fontSize: '.76rem', fontWeight: 600, color: '#27508f', marginBottom: 8 }}>{scanMsg}</div>}
      <div style={{ fontSize: '.8rem', color: '#7a7670', marginBottom: 16 }}>
        These sites don\u2019t allow automatic updates — but a consistent listing on them still boosts your visibility
        (Apple Maps, for one, cross-references Yelp). Each takes about 5 minutes with your info pre-formatted.
      </div>
      <div className="m-grid-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
        {GUIDED.map(g => {
          const d = byKey[g.id] || { status: 'not_setup' };
          return (
            <div key={g.id} style={{ border: '1.5px solid #e4e0d8', borderRadius: 14, padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '.85rem' }}>{g.name}</div>
                {(() => { const [text, color, weight] = dirSubline(d); return (
                  <div style={{ fontSize: '.72rem', color, fontWeight: weight }}>{text}</div>
                ); })()}
              </div>
              <Button size="sm" variant={d.status === 'verified' ? 'ghost' : 'dark'} onClick={() => setOpenDir(g)}>
                {d.status === 'verified' ? 'Review' : 'Set up'}
              </Button>
            </div>
          );
        })}
      </div>
      {openDir && (
        <GuidedModal dir={openDir} state={byKey[openDir.id]} location={location}
          locationId={locationId} onClose={() => setOpenDir(null)} reload={reload} />
      )}
    </Card>
  );
}

function GuidedModal({ dir, state, location, locationId, onClose, reload }) {
  const [busy, setBusy] = useState(false);
  const infoLines = [
    ['Name', location.businessName],
    ['Phone', location.phone],
    ['Website', location.website],
    ['Address', [location.addressLine1, location.addressLine2, location.city, location.state, location.zip].filter(Boolean).join(', ')],
    ['Description', location.description],
  ].filter(([, v]) => v);

  async function mark(status) {
    setBusy(true);
    try {
      await setListingDirectory(locationId, dir.id, status);
      reload(); onClose();
    } catch (e) {
      alert(e.response?.data?.error || 'Could not update');
    } finally { setBusy(false); }
  }

  function copyAll() {
    const text = infoLines.map(([k, v]) => `${k}: ${v}`).join('\n');
    if (navigator.clipboard) navigator.clipboard.writeText(text);
  }

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(10,10,8,.55)',
        backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      role="dialog" aria-modal="true" aria-label={`Set up ${dir.name}`}>
      <div className="sr-fade-in" style={{ background: '#faf9f6', borderRadius: 20, width: 'min(460px,100%)',
        boxShadow: '0 30px 80px rgba(0,0,0,.3)', overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg,#f5c842,#d4a515)', padding: '16px 22px',
          display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, fontFamily: SERIF, fontWeight: 700, fontSize: '1.1rem', color: '#1a1408' }}>
            Set up {dir.name} — 5 minutes
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'rgba(10,10,8,.12)', border: 'none',
            borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', color: '#1a1408', lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: '20px 22px 24px' }}>
          <ol style={{ fontSize: '.83rem', color: '#1a1a18', paddingLeft: 18, margin: '0 0 14px', lineHeight: 1.7 }}>
            <li>Open {dir.name} and sign in (or claim your business)</li>
            <li>Paste your info below — exactly as written, consistency is the whole game</li>
            <li>Come back and mark it verified</li>
          </ol>
          <div style={{ background: 'white', border: '1.5px solid #e4e0d8', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
            {infoLines.length === 0 ? (
              <div style={{ fontSize: '.8rem', color: '#7a7670' }}>Fill in your Business info card first — then your details appear here ready to paste.</div>
            ) : infoLines.map(([k, v]) => (
              <div key={k} style={{ fontSize: '.78rem', padding: '3px 0' }}>
                <span style={{ color: '#a39e93', fontWeight: 700 }}>{k}: </span>{v}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {infoLines.length > 0 && <Button size="sm" variant="ghost" onClick={copyAll}>Copy all</Button>}
            <Button size="sm" variant="ghost" href={dir.url} target="_blank" rel="noreferrer">Open {dir.name} ↗</Button>
            <div style={{ flex: 1 }} />
            <Button size="sm" onClick={() => mark('verified')} disabled={busy}>Mark verified ✓</Button>
          </div>
          {state?.status === 'verified' && (
            <button onClick={() => mark('attention')} disabled={busy} style={{ background: 'none', border: 'none',
              color: '#7a7670', fontSize: '.72rem', cursor: 'pointer', marginTop: 12, padding: 0, fontFamily: 'inherit', textDecoration: 'underline' }}>
              Something changed — flag this listing for an update
            </button>
          )}
        </div>
      </div>
    </div>
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
