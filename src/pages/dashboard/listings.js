// ============================================
// src/pages/dashboard/listings.js
// Business Listings Sync Dashboard
// ============================================

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const DAY_LABELS = { monday:'Mon',tuesday:'Tue',wednesday:'Wed',thursday:'Thu',friday:'Fri',saturday:'Sat',sunday:'Sun' };

const PLATFORM_META = {
  google: { label: 'Google Business Profile', icon: '🔍', color: '#4285F4', note: 'Most critical — directly affects Google Maps ranking' },
  apple:  { label: 'Apple Maps',              icon: '🍎', color: '#000000', note: '23% of local searches — iPhone users' },
  bing:   { label: 'Bing Places',             icon: '🔷', color: '#008272', note: '6% of local searches' },
};

const STATUS_STYLE = {
  synced:         { bg: '#e8f5ef', color: '#1a6b45', label: '✓ Synced' },
  pending_review: { bg: '#fef3cd', color: '#92690a', label: '⏳ Pending review' },
  diverged:       { bg: '#fee2e2', color: '#c0392b', label: '⚠ Diverged' },
  error:          { bg: '#fee2e2', color: '#c0392b', label: '✗ Error' },
  connected:      { bg: '#e8f0fe', color: '#1a4baa', label: '○ Connected' },
  not_connected:  { bg: '#f0eeea', color: '#7a7670', label: '— Not connected' },
};

// ── Score Ring ──────────────────────────────
function ScoreRing({ score }) {
  const r = 36, circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 80 ? '#1a6b45' : score >= 50 ? '#92690a' : '#c0392b';
  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <circle cx="48" cy="48" r={r} fill="none" stroke="#f0eeea" strokeWidth="8"/>
      <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 48 48)" style={{ transition: 'stroke-dasharray .6s ease' }}/>
      <text x="48" y="52" textAnchor="middle" fontSize="20" fontWeight="700" fill={color}
        fontFamily="Playfair Display, serif">{score}</text>
    </svg>
  );
}

// ── Platform Card ───────────────────────────
function PlatformCard({ platform, canonical, onSync, syncing }) {
  const meta = PLATFORM_META[platform.platform];
  const st   = STATUS_STYLE[platform.status] || STATUS_STYLE.not_connected;
  const [expanded, setExpanded] = useState(false);

  const diverged = platform.diverged_fields || [];

  return (
    <div style={{ background: 'white', border: `1.5px solid ${platform.has_divergence ? '#fecaca' : '#e4e0d8'}`, borderRadius: 14, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>{meta.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0a0a0a' }}>{meta.label}</div>
          <div style={{ fontSize: '0.75rem', color: '#7a7670', marginTop: 2 }}>{meta.note}</div>
        </div>
        <span style={{ padding: '3px 10px', borderRadius: 50, fontSize: '0.7rem', fontWeight: 700, background: st.bg, color: st.color, flexShrink: 0 }}>
          {st.label}
        </span>
        <span style={{ color: '#7a7670', flexShrink: 0 }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Divergence banner */}
      {platform.has_divergence && diverged.length > 0 && (
        <div style={{ margin: '0 16px 12px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', fontSize: '0.78rem', color: '#c0392b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠ {platform.platform === 'google' ? 'Google' : platform.platform === 'apple' ? 'Apple' : 'Bing'} shows different {diverged.join(', ')}</span>
          <button onClick={() => onSync(platform.platform)} disabled={syncing === platform.platform}
            style={{ padding: '4px 12px', borderRadius: 50, background: '#c0392b', color: 'white', border: 'none', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', flexShrink: 0, marginLeft: 8 }}>
            {syncing === platform.platform ? 'Fixing...' : 'Fix now'}
          </button>
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f0eeea' }}>
          <div style={{ paddingTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Name on platform',    canon: canonical?.businessName, current: platform.current_name },
              { label: 'Phone on platform',   canon: canonical?.phone,         current: platform.current_phone },
              { label: 'Address on platform', canon: canonical?.addressLine1 ? `${canonical.addressLine1}, ${canonical.city}` : null, current: platform.current_address },
              { label: 'Website on platform', canon: canonical?.website,       current: platform.current_website },
            ].map(f => {
              const differs = f.canon && f.current &&
                f.canon.toLowerCase().trim() !== f.current.toLowerCase().trim();
              return (
                <div key={f.label} style={{ background: differs ? '#fff5f5' : '#f8f7f4', border: `1px solid ${differs ? '#fecaca' : '#e4e0d8'}`, borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 5 }}>{f.label}</div>
                  <div style={{ fontSize: '0.82rem', color: f.current ? (differs ? '#c0392b' : '#0a0a0a') : '#b0aca6', fontWeight: f.current ? 500 : 400 }}>
                    {f.current || 'Not synced yet'}
                  </div>
                  {differs && (
                    <div style={{ fontSize: '0.72rem', color: '#7a7670', marginTop: 3 }}>
                      Should be: {f.canon}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Last synced */}
          {platform.last_synced_at && (
            <div style={{ fontSize: '0.72rem', color: '#7a7670', marginBottom: 12 }}>
              Last scanned: {new Date(platform.last_synced_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          )}

          {/* Error message */}
          {platform.last_error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', fontSize: '0.75rem', color: '#c0392b', marginBottom: 12, lineHeight: 1.5 }}>
              {platform.last_error}
            </div>
          )}

          <button onClick={() => onSync(platform.platform)} disabled={syncing === platform.platform}
            style={{ padding: '9px 20px', borderRadius: 50, background: syncing === platform.platform ? '#c8c4bc' : '#0a0a0a', color: 'white', border: 'none', fontSize: '0.82rem', fontWeight: 700, cursor: syncing === platform.platform ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            {syncing === platform.platform ? 'Syncing...' : `Push to ${meta.label}`}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Hours Editor ────────────────────────────
function HoursEditor({ hours, onChange }) {
  const defaultHours = {};
  DAYS.forEach(d => { defaultHours[d] = { open: '09:00', close: '17:00', closed: false }; });
  const h = hours || defaultHours;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {DAYS.map(day => (
        <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, fontSize: '0.78rem', fontWeight: 600, color: '#0a0a0a' }}>{DAY_LABELS[day]}</div>
          <input type="checkbox" checked={!h[day]?.closed} onChange={e => onChange({ ...h, [day]: { ...h[day], closed: !e.target.checked } })} />
          {!h[day]?.closed ? (
            <>
              <input type="time" value={h[day]?.open || '09:00'}
                onChange={e => onChange({ ...h, [day]: { ...h[day], open: e.target.value } })}
                style={{ padding: '4px 8px', border: '1.5px solid #e4e0d8', borderRadius: 6, fontSize: '0.82rem', fontFamily: 'DM Sans, sans-serif' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#7a7670' }}>to</span>
              <input type="time" value={h[day]?.close || '17:00'}
                onChange={e => onChange({ ...h, [day]: { ...h[day], close: e.target.value } })}
                style={{ padding: '4px 8px', border: '1.5px solid #e4e0d8', borderRadius: 6, fontSize: '0.82rem', fontFamily: 'DM Sans, sans-serif' }}
              />
            </>
          ) : (
            <span style={{ fontSize: '0.78rem', color: '#7a7670' }}>Closed</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main Page ───────────────────────────────
export default function ListingsPage() {
  const { customer } = useAuth();
  const [locations, setLocations]   = useState([]);
  const [locationId, setLocationId] = useState(null);
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [scanning, setScanning]     = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncing, setSyncing]       = useState(null);
  const [activeTab, setActiveTab]   = useState('overview');
  const [toast, setToast]           = useState(null);
  const [nap, setNap]               = useState({});

  useEffect(() => { if (customer) loadLocations(); }, [customer]);

  async function loadLocations() {
    try {
      const res = await axios.get(`${API_URL}/locations/${customer.id}`);
      const locs = res.data.locations || [];
      setLocations(locs);
      if (locs.length > 0) { setLocationId(locs[0].id); await loadData(locs[0].id); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function loadData(locId) {
    try {
      const res = await axios.get(`${API_URL}/listings/${locId}`);
      setData(res.data);
      setNap(res.data.location || {});
    } catch (err) { console.error(err); }
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleSaveNAP() {
    setSaving(true);
    try {
      const res = await axios.put(`${API_URL}/listings/${locationId}/nap`, {
        businessName: nap.businessName,
        addressLine1: nap.addressLine1,
        addressLine2: nap.addressLine2,
        city: nap.city, state: nap.state, zip: nap.zip,
        phone: nap.phone, website: nap.website,
        description: nap.description, hours: nap.hours
      });
      setData(res.data);
      showToast('NAP data saved');
    } catch (err) { showToast('Save failed', 'error'); }
    finally { setSaving(false); }
  }

  async function handleScan() {
    setScanning(true);
    try {
      await axios.post(`${API_URL}/listings/${locationId}/scan`);
      await loadData(locationId);
      showToast('Scan complete');
    } catch (err) { showToast('Scan failed', 'error'); }
    finally { setScanning(false); }
  }

  async function handleSyncAll() {
    setSyncingAll(true);
    try {
      const res = await axios.post(`${API_URL}/listings/${locationId}/sync`);
      await loadData(locationId);
      const successes = Object.values(res.data.results || {}).filter(r => r.success).length;
      showToast(`Pushed to ${successes} platform${successes !== 1 ? 's' : ''}`);
    } catch (err) { showToast('Sync failed — check platform connections', 'error'); }
    finally { setSyncingAll(false); }
  }

  async function handleSyncOne(platform) {
    setSyncing(platform);
    try {
      const res = await axios.post(`${API_URL}/listings/${locationId}/sync/${platform}`);
      await loadData(locationId);
      showToast(res.data.message || `${platform} updated`);
    } catch (err) { showToast(err.response?.data?.error || `Failed to sync ${platform}`, 'error'); }
    finally { setSyncing(null); }
  }

  const inputStyle = { width: '100%', padding: '10px 13px', border: '1.5px solid #e4e0d8', borderRadius: 10, fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', outline: 'none', color: '#1a1a18', background: 'white' };
  const labelStyle = { display: 'block', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 6 };

  if (loading) return <DashboardLayout><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, color: '#7a7670' }}>Loading listings...</div></DashboardLayout>;

  const summary   = data?.summary   || {};
  const platforms = data?.platforms || [];
  const location  = data?.location  || {};
  const divergedCount = summary.diverged || 0;

  return (
    <DashboardLayout>
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: toast.type === 'error' ? '#c0392b' : '#0a0a0a', color: 'white', padding: '11px 18px', borderRadius: 12, fontSize: '0.875rem', fontWeight: 500, boxShadow: '0 8px 24px rgba(0,0,0,.2)' }}>
          {toast.msg}
        </div>
      )}

      {/* Topbar */}
      <div style={{ background: 'white', borderBottom: '1px solid #e4e0d8', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Business Listings Sync</h2>
          <p style={{ fontSize: '0.78rem', color: '#7a7670', marginTop: 1 }}>
            Keep your name, address & phone consistent across Google, Apple Maps, and Bing
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {divergedCount > 0 && (
            <span style={{ background: '#fee2e2', color: '#c0392b', padding: '5px 12px', borderRadius: 50, fontSize: '0.75rem', fontWeight: 700 }}>
              {divergedCount} divergence{divergedCount !== 1 ? 's' : ''} found
            </span>
          )}
          {locations.length > 1 && (
            <select value={locationId || ''} onChange={e => { setLocationId(e.target.value); loadData(e.target.value); }} style={{ ...inputStyle, width: 'auto' }}>
              {locations.map(l => <option key={l.id} value={l.id}>{l.business_name}</option>)}
            </select>
          )}
          <button onClick={handleScan} disabled={scanning} style={{ padding: '9px 18px', borderRadius: 50, border: '1.5px solid #e4e0d8', background: 'white', fontSize: '0.82rem', fontWeight: 600, cursor: scanning ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', color: '#0a0a0a' }}>
            {scanning ? 'Scanning...' : '↻ Scan platforms'}
          </button>
          <button onClick={handleSyncAll} disabled={syncingAll} style={{ padding: '9px 22px', borderRadius: 50, background: syncingAll ? '#c8c4bc' : '#f5c842', color: '#0a0a0a', border: 'none', fontSize: '0.875rem', fontWeight: 700, cursor: syncingAll ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            {syncingAll ? 'Syncing...' : 'Sync all platforms'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: 'white', borderBottom: '1px solid #e4e0d8', padding: '0 32px', display: 'flex' }}>
        {[{ id: 'overview', label: 'Overview' }, { id: 'nap', label: 'Business Info' }, { id: 'hours', label: 'Hours' }, { id: 'history', label: 'Sync History' }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '13px 20px', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem', fontWeight: activeTab === tab.id ? 600 : 500, background: 'transparent', color: activeTab === tab.id ? '#0a0a0a' : '#7a7670', borderBottom: activeTab === tab.id ? '2px solid #0a0a0a' : '2px solid transparent', transition: 'all .15s' }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '28px 32px', maxWidth: 920 }}>

        {/* ─── OVERVIEW ─── */}
        {activeTab === 'overview' && (
          <>
            {/* Score + summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24, background: 'white', border: '1px solid #e4e0d8', borderRadius: 16, padding: 28, marginBottom: 20, alignItems: 'center' }}>
              <ScoreRing score={summary.score || 0} />
              <div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.1rem', fontWeight: 700, color: '#0a0a0a', marginBottom: 6 }}>
                  Listing consistency score
                </div>
                <div style={{ fontSize: '0.82rem', color: '#7a7670', lineHeight: 1.6, marginBottom: 12 }}>
                  {summary.score >= 80
                    ? 'Your listings are consistent across platforms.'
                    : summary.diverged > 0
                    ? `${summary.diverged} platform${summary.diverged !== 1 ? 's' : ''} showing different information. Click "Sync all platforms" to fix.`
                    : 'Connect your platforms below to start tracking consistency.'}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Synced', val: summary.synced || 0, color: '#1a6b45', bg: '#e8f5ef' },
                    { label: 'Diverged', val: summary.diverged || 0, color: '#c0392b', bg: '#fee2e2' },
                    { label: 'Pending', val: summary.pending || 0, color: '#92690a', bg: '#fef3cd' },
                  ].map(s => (
                    <div key={s.label} style={{ background: s.bg, borderRadius: 8, padding: '6px 14px', display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.1rem', fontWeight: 700, color: s.color }}>{s.val}</span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: s.color }}>{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>



            {/* Platform cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {platforms.map(p => (
                <PlatformCard key={p.platform} platform={p} canonical={location} onSync={handleSyncOne} syncing={syncing} />
              ))}
            </div>
          </>
        )}

        {/* ─── BUSINESS INFO (NAP) ─── */}
        {activeTab === 'nap' && (
          <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 16, padding: 28 }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1rem', fontWeight: 700, marginBottom: 4 }}>Canonical business information</div>
              <div style={{ fontSize: '0.8rem', color: '#7a7670', lineHeight: 1.6 }}>
                This is the single source of truth. When you click "Sync all platforms", this data gets pushed to Google, Apple Maps, and Bing.
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Business name</label>
                <input style={inputStyle} value={nap.businessName || ''} onChange={e => setNap(n => ({ ...n, businessName: e.target.value }))} placeholder="Bella's Kitchen" />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input style={inputStyle} value={nap.phone || ''} onChange={e => setNap(n => ({ ...n, phone: e.target.value }))} placeholder="+1 (555) 000-0000" />
              </div>
              <div>
                <label style={labelStyle}>Website</label>
                <input style={inputStyle} value={nap.website || ''} onChange={e => setNap(n => ({ ...n, website: e.target.value }))} placeholder="https://yourbusiness.com" />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Address line 1</label>
                <input style={inputStyle} value={nap.addressLine1 || ''} onChange={e => setNap(n => ({ ...n, addressLine1: e.target.value }))} placeholder="123 Main Street" />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Address line 2 (suite, unit)</label>
                <input style={inputStyle} value={nap.addressLine2 || ''} onChange={e => setNap(n => ({ ...n, addressLine2: e.target.value }))} placeholder="Suite 200" />
              </div>
              <div>
                <label style={labelStyle}>City</label>
                <input style={inputStyle} value={nap.city || ''} onChange={e => setNap(n => ({ ...n, city: e.target.value }))} placeholder="Los Angeles" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>State</label>
                  <input style={inputStyle} value={nap.state || ''} onChange={e => setNap(n => ({ ...n, state: e.target.value }))} placeholder="CA" />
                </div>
                <div>
                  <label style={labelStyle}>ZIP</label>
                  <input style={inputStyle} value={nap.zip || ''} onChange={e => setNap(n => ({ ...n, zip: e.target.value }))} placeholder="90210" />
                </div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Business description</label>
                <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={nap.description || ''} onChange={e => setNap(n => ({ ...n, description: e.target.value }))} placeholder="Describe your business in 1-2 sentences — appears on Google and Apple Maps." />
              </div>
            </div>

            <button onClick={handleSaveNAP} disabled={saving} style={{ padding: '12px 28px', borderRadius: 50, background: saving ? '#c8c4bc' : '#f5c842', color: '#0a0a0a', border: 'none', fontSize: '0.9rem', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', marginRight: 10 }}>
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            <button onClick={handleSyncAll} disabled={syncingAll} style={{ padding: '12px 28px', borderRadius: 50, background: syncingAll ? '#c8c4bc' : '#0a0a0a', color: 'white', border: 'none', fontSize: '0.9rem', fontWeight: 700, cursor: syncingAll ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              {syncingAll ? 'Syncing...' : 'Save & sync to all platforms'}
            </button>
          </div>
        )}

        {/* ─── HOURS ─── */}
        {activeTab === 'hours' && (
          <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 16, padding: 28 }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1rem', fontWeight: 700, marginBottom: 4 }}>Business hours</div>
              <div style={{ fontSize: '0.8rem', color: '#7a7670' }}>Set once — synced to Google, Apple Maps, and Bing automatically.</div>
            </div>
            <HoursEditor hours={nap.hours} onChange={h => setNap(n => ({ ...n, hours: h }))} />
            <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
              <button onClick={handleSaveNAP} disabled={saving} style={{ padding: '12px 28px', borderRadius: 50, background: saving ? '#c8c4bc' : '#f5c842', color: '#0a0a0a', border: 'none', fontSize: '0.9rem', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                {saving ? 'Saving...' : 'Save hours'}
              </button>
              <button onClick={handleSyncAll} disabled={syncingAll} style={{ padding: '12px 28px', borderRadius: 50, background: syncingAll ? '#c8c4bc' : '#0a0a0a', color: 'white', border: 'none', fontSize: '0.9rem', fontWeight: 700, cursor: syncingAll ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                {syncingAll ? 'Syncing...' : 'Save & push to all platforms'}
              </button>
            </div>
          </div>
        )}

        {/* ─── HISTORY ─── */}
        {activeTab === 'history' && (
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 14 }}>Sync history</div>
            {(data?.history || []).length === 0 ? (
              <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: 40, textAlign: 'center', color: '#7a7670' }}>
                <div style={{ fontSize: '1.8rem', marginBottom: 10 }}>📋</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No sync history yet</div>
                <div style={{ fontSize: '0.82rem' }}>Run a scan or sync to see activity here.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(data?.history || []).map((h, i) => {
                  const meta = PLATFORM_META[h.platform] || { icon: '○', label: h.platform };
                  const isSuccess = h.status === 'success' || h.status === 'no_change' || h.status === 'pending';
                  return (
                    <div key={i} style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: '1.1rem' }}>{meta.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#0a0a0a' }}>
                          {h.action === 'push' ? `Pushed to ${meta.label}` : h.action === 'detect' ? `Scanned ${meta.label}` : `Fetched ${meta.label}`}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#7a7670', marginTop: 2 }}>
                          {new Date(h.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          {h.changes_made?.divergedFields?.length > 0 && ` · Diverged: ${h.changes_made.divergedFields.join(', ')}`}
                        </div>
                      </div>
                      <span style={{ padding: '3px 9px', borderRadius: 50, fontSize: '0.7rem', fontWeight: 700, background: isSuccess ? '#e8f5ef' : '#fee2e2', color: isSuccess ? '#1a6b45' : '#c0392b' }}>
                        {h.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
