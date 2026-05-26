// ============================================
// src/pages/dashboard/widget.js
// Review Widget Builder
// Live preview + settings panel + embed code
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const WIDGET_BASE = process.env.NEXT_PUBLIC_WIDGET_URL || 'https://swarmreply.com';

// ─── LAYOUT PREVIEWS ───────────────────────
const LAYOUTS = [
  { id: 'carousel', label: 'Carousel',   icon: '⟵⟶', desc: 'Scrolling cards — best for homepage heroes' },
  { id: 'grid',     label: 'Grid',        icon: '⊞',   desc: 'Masonry grid — best for dedicated reviews pages' },
  { id: 'list',     label: 'List',        icon: '≡',   desc: 'Stacked rows — best for sidebars' },
  { id: 'badge',    label: 'Badge',       icon: '★',   desc: 'Compact score badge — best for headers & footers' },
];

const THEMES = [
  { id: 'light', label: 'Light', bg: '#ffffff', border: '#e4e0d8' },
  { id: 'dark',  label: 'Dark',  bg: '#0a0a0a', border: '#222222' },
];

const STAR_OPTIONS = [5, 4, 3];
const REVIEW_COUNT_OPTIONS = [3, 4, 6, 8, 10, 12];

// ─── COPY BUTTON ───────────────────────────
function CopyButton({ value, label }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={handleCopy}
      style={{
        padding: '9px 18px', borderRadius: 50, fontSize: '0.82rem',
        fontWeight: 600, border: 'none', cursor: 'pointer',
        fontFamily: 'DM Sans, sans-serif',
        background: copied ? '#1a6b45' : '#0a0a0a',
        color: 'white', transition: 'background 0.2s', flexShrink: 0
      }}
    >
      {copied ? '✓ Copied!' : label || 'Copy code'}
    </button>
  );
}

// ─── STAR DISPLAY ──────────────────────────
function Stars({ rating, color = '#f5c842', size = 14 }) {
  const full  = Math.round(rating || 0);
  const empty = 5 - full;
  return (
    <span style={{ fontSize: size, letterSpacing: 1 }}>
      <span style={{ color }}>{'★'.repeat(full)}</span>
      <span style={{ color: '#e4e0d8' }}>{'★'.repeat(empty)}</span>
    </span>
  );
}

// ─── MINI REVIEW CARD PREVIEW ──────────────
function PreviewCard({ review, settings }) {
  const isDark = settings.theme === 'dark';
  const accent = settings.accentColor || '#f5c842';
  const cardBg = isDark ? '#141414' : '#f8f7f4';
  const border = isDark ? '#222' : '#e4e0d8';
  const text   = isDark ? 'white' : '#1a1a18';
  const muted  = isDark ? 'rgba(255,255,255,.4)' : '#7a7670';
  const initials = review.name?.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div style={{
      background: cardBg, border: `1px solid ${border}`,
      borderRadius: settings.borderRadius || 12, padding: '16px',
      display: 'flex', flexDirection: 'column', gap: 8
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: isDark ? '#222' : '#e4e0d8',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.72rem', fontWeight: 700, color: muted, flexShrink: 0
        }}>{initials}</div>
        <div>
          {settings.showReviewer && (
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: text }}>{review.name}</div>
          )}
          <Stars rating={review.rating} color={accent} size={13} />
        </div>
      </div>
      <p style={{
        fontSize: '0.83rem', color: isDark ? 'rgba(255,255,255,.6)' : '#4a4a48',
        lineHeight: 1.65, margin: 0, fontStyle: 'italic'
      }}>
        "{review.text}"
      </p>
      {settings.showReply && review.reply && (
        <div style={{
          background: isDark ? '#1a1a1a' : '#f0eeea',
          borderLeft: `3px solid ${accent}`,
          padding: '7px 10px', borderRadius: '0 6px 6px 0',
          fontSize: '0.75rem', color: muted, lineHeight: 1.6
        }}>
          <div style={{ fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 3 }}>Response from owner</div>
          {review.reply}
        </div>
      )}
      {(settings.showDate || settings.showPlatform) && (
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center',
          paddingTop: 8, borderTop: `1px solid ${border}`, flexWrap: 'wrap'
        }}>
          {settings.showDate && review.date && (
            <span style={{ fontSize: '0.72rem', color: muted }}>{review.date}</span>
          )}
          {settings.showPlatform && (
            <span style={{
              fontSize: '0.68rem', fontWeight: 600, padding: '2px 8px',
              borderRadius: 50, background: isDark ? '#222' : '#e4e0d8', color: muted
            }}>Google</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── LIVE PREVIEW ──────────────────────────
function LivePreview({ settings, reviews, stats, businessName }) {
  const isDark  = settings.theme === 'dark';
  const accent  = settings.accentColor || '#f5c842';
  const bg      = isDark ? '#0a0a0a' : '#ffffff';
  const border  = isDark ? '#222' : '#e4e0d8';
  const text    = isDark ? 'white' : '#1a1a18';
  const muted   = isDark ? 'rgba(255,255,255,.4)' : '#7a7670';
  const r       = settings.borderRadius || 12;
  const display = reviews.slice(0, settings.maxReviews || 6);

  // Badge layout
  if (settings.layout === 'badge') {
    const rating = (stats?.avgRating || 4.8).toFixed(1);
    const count  = stats?.totalReviews || 0;
    return (
      <div style={{
        background: bg, border: `1px solid ${border}`,
        borderRadius: r, padding: '16px 20px', display: 'inline-block',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)', minWidth: 200
      }}>
        <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: muted, marginBottom: 6 }}>
          {businessName}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', fontWeight: 900, color: text, lineHeight: 1 }}>{rating}</span>
          <Stars rating={stats?.avgRating || 4.8} color={accent} size={18} />
        </div>
        <div style={{ fontSize: '0.75rem', color: muted }}>{count} Google reviews</div>
        {settings.showCta && settings.ctaUrl && (
          <div style={{
            marginTop: 10, padding: '7px 16px', borderRadius: 50,
            background: accent, color: '#0a0a0a', fontSize: '0.75rem',
            fontWeight: 700, textAlign: 'center'
          }}>{settings.ctaText || 'Leave us a review'}</div>
        )}
      </div>
    );
  }

  const gridCols = settings.layout === 'list' ? 1
    : settings.layout === 'grid' ? (display.length <= 2 ? display.length : 3)
    : Math.min(3, display.length);

  return (
    <div style={{
      background: bg, border: `1px solid ${border}`,
      borderRadius: r + 4, padding: 24, overflow: 'hidden'
    }}>
      {/* Aggregate header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.5rem', fontWeight: 900, color: text, lineHeight: 1 }}>
          {(stats?.avgRating || 4.8).toFixed(1)}
        </span>
        <Stars rating={stats?.avgRating || 4.8} color={accent} size={16} />
        <span style={{ fontSize: '0.78rem', color: muted }}>
          Based on {stats?.totalReviews || 0} Google reviews
        </span>
      </div>

      {/* Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
        gap: 12, overflow: 'hidden'
      }}>
        {display.map((review, i) => (
          <PreviewCard key={i} review={review} settings={settings} />
        ))}
      </div>

      {/* Carousel dots (simulated) */}
      {settings.layout === 'carousel' && display.length > 3 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 14 }}>
          {display.slice(0, Math.ceil(display.length / 3)).map((_, i) => (
            <div key={i} style={{
              width: i === 0 ? 18 : 7, height: 7, borderRadius: 50,
              background: i === 0 ? accent : border, transition: 'all .15s'
            }} />
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 16, paddingTop: 14, borderTop: `1px solid ${border}`, flexWrap: 'wrap', gap: 8
      }}>
        {settings.showCta && settings.ctaUrl && (
          <div style={{
            padding: '8px 18px', borderRadius: 50, background: accent,
            color: '#0a0a0a', fontSize: '0.8rem', fontWeight: 700
          }}>{settings.ctaText || 'Leave a review'} →</div>
        )}
        <span style={{ fontSize: '0.7rem', color: muted, marginLeft: 'auto' }}>
          Powered by SwarmReply
        </span>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ─────────────────────────────
export default function WidgetPage() {
  const { customer } = useAuth();
  const [locations, setLocations]     = useState([]);
  const [locationId, setLocationId]   = useState(null);
  const [config, setConfig]           = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [analytics, setAnalytics]     = useState(null);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [rotating, setRotating]       = useState(false);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState('display');
  const saveTimer = useRef(null);

  // Local settings state (synced from config)
  const [settings, setSettings] = useState({
    layout:        'carousel',
    theme:         'light',
    accentColor:   '#f5c842',
    borderRadius:  12,
    minStars:      4,
    maxReviews:    6,
    showDate:      true,
    showReviewer:  true,
    showPlatform:  true,
    showReply:     false,
    showCta:       true,
    ctaText:       'Leave us a review',
    ctaUrl:        '',
    schemaEnabled: true,
  });

  useEffect(() => {
    if (customer) loadLocations();
  }, [customer]);

  async function loadLocations() {
    try {
      const res = await axios.get(`${API_URL}/locations/${customer.id}`);
      const locs = res.data.locations || [];
      setLocations(locs);
      if (locs.length > 0) {
        setLocationId(locs[0].id);
        await loadWidget(locs[0].id);
      }
    } catch (err) {
      console.error('Failed to load locations:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadWidget(locId) {
    setLoading(true);
    try {
      const [configRes, previewRes, analyticsRes] = await Promise.all([
        axios.get(`${API_URL}/widgets/${locId}`),
        axios.get(`${API_URL}/widgets/${locId}/preview`),
        axios.get(`${API_URL}/widgets/${locId}/analytics`)
      ]);

      const cfg = configRes.data.widget;
      setConfig(cfg);
      setPreviewData(previewRes.data);
      setAnalytics(analyticsRes.data.analytics);

      // Sync settings from config
      setSettings({
        layout:        cfg.layout        || 'carousel',
        theme:         cfg.theme         || 'light',
        accentColor:   cfg.accent_color  || '#f5c842',
        borderRadius:  cfg.border_radius ?? 12,
        minStars:      cfg.min_stars     || 4,
        maxReviews:    cfg.max_reviews   || 6,
        showDate:      cfg.show_date     ?? true,
        showReviewer:  cfg.show_reviewer ?? true,
        showPlatform:  cfg.show_platform ?? true,
        showReply:     cfg.show_reply    ?? false,
        showCta:       cfg.show_cta      ?? true,
        ctaText:       cfg.cta_text      || 'Leave us a review',
        ctaUrl:        cfg.cta_url       || previewRes.data?.ctaUrl || '',
        schemaEnabled: cfg.schema_enabled ?? true,
      });
    } catch (err) {
      console.error('Failed to load widget:', err);
    } finally {
      setLoading(false);
    }
  }

  // Debounced auto-save
  const updateSetting = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveSettings({ ...settings, [key]: value }), 1200);
  }, [settings]);

  async function saveSettings(s) {
    if (!locationId) return;
    setSaving(true);
    try {
      await axios.put(`${API_URL}/widgets/${locationId}`, {
        layout:        s.layout,
        minStars:      s.minStars,
        maxReviews:    s.maxReviews,
        showDate:      s.showDate,
        showReviewer:  s.showReviewer,
        showPlatform:  s.showPlatform,
        showReply:     s.showReply,
        theme:         s.theme,
        accentColor:   s.accentColor,
        borderRadius:  s.borderRadius,
        showCta:       s.showCta,
        ctaText:       s.ctaText,
        ctaUrl:        s.ctaUrl,
        schemaEnabled: s.schemaEnabled,
      });
      setSaved(true);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleRotateToken() {
    if (!confirm('Rotating the token will break any existing embed code on your website. Are you sure?')) return;
    setRotating(true);
    try {
      const res = await axios.post(`${API_URL}/widgets/${locationId}/rotate`);
      setConfig(prev => ({ ...prev, widget_token: res.data.token }));
    } catch (err) {
      alert('Failed to rotate token');
    } finally {
      setRotating(false);
    }
  }

  // Build embed code strings
  const widgetToken = config?.widget_token || '';
  const embedScript = `<!-- SwarmReply Review Widget -->
<div id="swarmreply-widget"></div>
<script
  src="${WIDGET_BASE}/widget.js"
  data-token="${widgetToken}"
  data-container="swarmreply-widget"
></script>`;

  const badgeScript = `<!-- SwarmReply Review Badge -->
<img
  src="${API_URL}/widget/${widgetToken}/badge"
  alt="Google Reviews"
  style="height:60px;width:auto;"
/>`;

  const inputStyle = {
    width: '100%', padding: '10px 12px', border: '1.5px solid #e4e0d8',
    borderRadius: 10, fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif',
    outline: 'none', color: '#1a1a18', background: 'white'
  };
  const toggleStyle = (on) => ({
    width: 42, height: 22, borderRadius: 50, position: 'relative', cursor: 'pointer',
    background: on ? '#0a0a0a' : '#e4e0d8', transition: 'background .2s', flexShrink: 0,
    border: 'none', padding: 0
  });

  function Toggle({ value, onChange }) {
    return (
      <button style={toggleStyle(value)} onClick={() => onChange(!value)} role="switch" aria-checked={value}>
        <div style={{
          position: 'absolute', top: 2, left: value ? 22 : 2,
          width: 18, height: 18, borderRadius: '50%', background: 'white',
          transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)'
        }} />
      </button>
    );
  }

  function SettingRow({ label, desc, children }) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid #f0eeea' }}>
        <div style={{ flex: 1, paddingRight: 16 }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1a1a18' }}>{label}</div>
          {desc && <div style={{ fontSize: '0.78rem', color: '#7a7670', marginTop: 2 }}>{desc}</div>}
        </div>
        {children}
      </div>
    );
  }

  if (loading) return (
    <DashboardLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, color: '#7a7670' }}>
        Loading widget builder...
      </div>
    </DashboardLayout>
  );

  const reviews     = previewData?.reviews || [];
  const stats       = previewData?.stats   || { avgRating: 4.8, totalReviews: 47 };
  const bizName     = previewData?.businessName || locations[0]?.business_name || 'Your Business';

  return (
    <DashboardLayout>
      {/* Topbar */}
      <div style={{
        background: 'white', borderBottom: '1px solid #e4e0d8',
        padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Review Widget</h2>
          <p style={{ fontSize: '0.78rem', color: '#7a7670', marginTop: 1 }}>
            Embed your best Google reviews on your website — one &lt;script&gt; tag
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {saving && <span style={{ fontSize: '0.78rem', color: '#7a7670' }}>Saving...</span>}
          {saved && !saving && <span style={{ fontSize: '0.78rem', color: '#1a6b45' }}>✓ Saved</span>}
          {locations.length > 1 && (
            <select
              value={locationId || ''}
              onChange={e => { setLocationId(e.target.value); loadWidget(e.target.value); }}
              style={{ ...inputStyle, width: 'auto' }}
            >
              {locations.map(l => <option key={l.id} value={l.id}>{l.business_name}</option>)}
            </select>
          )}
          <button
            onClick={() => saveSettings(settings)}
            style={{
              padding: '9px 22px', borderRadius: 50, background: '#f5c842',
              color: '#0a0a0a', border: 'none', fontSize: '0.875rem',
              fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif'
            }}
          >Save changes</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', height: 'calc(100vh - 140px)' }}>

        {/* ─── LEFT PANEL — SETTINGS ─── */}
        <div style={{
          borderRight: '1px solid #e4e0d8', overflowY: 'auto',
          background: 'white'
        }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e4e0d8' }}>
            {[
              { id: 'display',  label: 'Display' },
              { id: 'content',  label: 'Content' },
              { id: 'cta',      label: 'CTA' },
              { id: 'embed',    label: 'Get code' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1, padding: '12px 8px', border: 'none', cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '0.78rem', fontWeight: activeTab === tab.id ? 600 : 500,
                  background: activeTab === tab.id ? 'white' : '#f8f7f4',
                  color: activeTab === tab.id ? '#0a0a0a' : '#7a7670',
                  borderBottom: activeTab === tab.id ? '2px solid #0a0a0a' : '2px solid transparent',
                  transition: 'all .15s'
                }}
              >
                {tab.label}
                {tab.id === 'embed' && (
                  <span style={{
                    marginLeft: 5, background: '#f5c842', color: '#0a0a0a',
                    fontSize: '0.6rem', fontWeight: 800, padding: '1px 6px',
                    borderRadius: 50, verticalAlign: 'middle'
                  }}>NEW</span>
                )}
              </button>
            ))}
          </div>

          <div style={{ padding: '16px 20px' }}>

            {/* ─ DISPLAY TAB ─ */}
            {activeTab === 'display' && (
              <>
                {/* Layout picker */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 10 }}>Layout</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {LAYOUTS.map(l => (
                      <div
                        key={l.id}
                        onClick={() => updateSetting('layout', l.id)}
                        style={{
                          border: `1.5px solid ${settings.layout === l.id ? '#0a0a0a' : '#e4e0d8'}`,
                          borderRadius: 10, padding: '12px 10px', cursor: 'pointer',
                          background: settings.layout === l.id ? '#f8f7f4' : 'white',
                          transition: 'all .15s', textAlign: 'center'
                        }}
                      >
                        <div style={{ fontSize: '1.3rem', marginBottom: 4 }}>{l.icon}</div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>{l.label}</div>
                        <div style={{ fontSize: '0.68rem', color: '#7a7670', marginTop: 2, lineHeight: 1.4 }}>{l.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Theme */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 10 }}>Theme</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {THEMES.map(t => (
                      <div
                        key={t.id}
                        onClick={() => updateSetting('theme', t.id)}
                        style={{
                          flex: 1, border: `1.5px solid ${settings.theme === t.id ? '#0a0a0a' : '#e4e0d8'}`,
                          borderRadius: 10, padding: '12px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 8, transition: 'all .15s'
                        }}
                      >
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: t.bg, border: `1px solid ${t.border}`, flexShrink: 0 }} />
                        <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>{t.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Accent color */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 10 }}>Accent color</div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input type="color" value={settings.accentColor} onChange={e => updateSetting('accentColor', e.target.value)}
                      style={{ width: 48, height: 40, padding: 2, borderRadius: 8, border: '1.5px solid #e4e0d8', cursor: 'pointer', background: 'white' }}
                    />
                    <input type="text" value={settings.accentColor} onChange={e => updateSetting('accentColor', e.target.value)}
                      style={{ ...inputStyle, width: 'auto', flex: 1 }}
                    />
                    {['#f5c842', '#0a0a0a', '#1a6b45', '#3b82f6', '#e53e3e'].map(c => (
                      <div key={c} onClick={() => updateSetting('accentColor', c)}
                        style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', flexShrink: 0, border: settings.accentColor === c ? '2px solid #0a0a0a' : '2px solid transparent' }}
                      />
                    ))}
                  </div>
                </div>

                {/* Border radius */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 8 }}>
                    <span>Corner radius</span>
                    <span style={{ fontWeight: 400 }}>{settings.borderRadius}px</span>
                  </div>
                  <input type="range" min="0" max="24" value={settings.borderRadius}
                    onChange={e => updateSetting('borderRadius', parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: '#0a0a0a' }}
                  />
                </div>
              </>
            )}

            {/* ─ CONTENT TAB ─ */}
            {activeTab === 'content' && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 8 }}>Minimum star rating</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {STAR_OPTIONS.map(s => (
                      <button key={s} onClick={() => updateSetting('minStars', s)} style={{
                        flex: 1, padding: '9px', borderRadius: 10, cursor: 'pointer',
                        fontFamily: 'DM Sans, sans-serif', fontSize: '0.82rem', fontWeight: 600,
                        border: `1.5px solid ${settings.minStars === s ? '#0a0a0a' : '#e4e0d8'}`,
                        background: settings.minStars === s ? '#f8f7f4' : 'white', transition: 'all .15s'
                      }}>
                        {'★'.repeat(s)} {s}+
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 8 }}>Number of reviews</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {REVIEW_COUNT_OPTIONS.map(n => (
                      <button key={n} onClick={() => updateSetting('maxReviews', n)} style={{
                        padding: '7px 14px', borderRadius: 50, cursor: 'pointer',
                        fontFamily: 'DM Sans, sans-serif', fontSize: '0.82rem', fontWeight: 600,
                        border: `1.5px solid ${settings.maxReviews === n ? '#0a0a0a' : '#e4e0d8'}`,
                        background: settings.maxReviews === n ? '#f8f7f4' : 'white', transition: 'all .15s'
                      }}>{n}</button>
                    ))}
                  </div>
                </div>

                <SettingRow label="Show reviewer name" desc="Display first name and last initial">
                  <Toggle value={settings.showReviewer} onChange={v => updateSetting('showReviewer', v)} />
                </SettingRow>
                <SettingRow label="Show review date" desc="Display the month and year">
                  <Toggle value={settings.showDate} onChange={v => updateSetting('showDate', v)} />
                </SettingRow>
                <SettingRow label="Show platform badge" desc="Shows a 'Google' label on each card">
                  <Toggle value={settings.showPlatform} onChange={v => updateSetting('showPlatform', v)} />
                </SettingRow>
                <SettingRow label="Show owner reply" desc="Display the reply below the review">
                  <Toggle value={settings.showReply} onChange={v => updateSetting('showReply', v)} />
                </SettingRow>
                <SettingRow label="JSON-LD schema markup" desc="Enables star ratings in Google search results">
                  <Toggle value={settings.schemaEnabled} onChange={v => updateSetting('schemaEnabled', v)} />
                </SettingRow>
              </>
            )}

            {/* ─ CTA TAB ─ */}
            {activeTab === 'cta' && (
              <>
                <SettingRow label="Show CTA button" desc="Invite visitors to leave a review">
                  <Toggle value={settings.showCta} onChange={v => updateSetting('showCta', v)} />
                </SettingRow>
                {settings.showCta && (
                  <>
                    <div style={{ marginTop: 14 }}>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 6 }}>Button text</label>
                      <input style={inputStyle} value={settings.ctaText}
                        onChange={e => updateSetting('ctaText', e.target.value)}
                        placeholder="Leave us a review"
                      />
                    </div>
                    <div style={{ marginTop: 14 }}>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 6 }}>
                        Google review link
                      </label>
                      <input style={inputStyle} value={settings.ctaUrl}
                        onChange={e => updateSetting('ctaUrl', e.target.value)}
                        placeholder="https://g.page/r/YOUR_PLACE_ID/review"
                        type="url"
                      />
                      <div style={{ fontSize: '0.72rem', color: '#7a7670', marginTop: 5, lineHeight: 1.5 }}>
                        Find your link: Google Maps → your business → Share → Copy link
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* ─ EMBED CODE TAB ─ */}
            {activeTab === 'embed' && (
              <>
                {/* Analytics */}
                {analytics && (
                  <div style={{ background: '#f8f7f4', border: '1px solid #e4e0d8', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 10 }}>Widget stats</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {[
                        { label: 'Total views', val: (analytics.total_views || 0).toLocaleString() },
                        { label: 'Sites embedded', val: analytics.embed_count || 0 },
                        { label: 'Avg rating shown', val: analytics.cached_avg_rating ? `${analytics.cached_avg_rating}★` : '—' },
                        { label: 'Reviews displayed', val: analytics.cached_review_count || 0 },
                      ].map(s => (
                        <div key={s.label} style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0a0a0a', fontFamily: 'Playfair Display, serif' }}>{s.val}</div>
                          <div style={{ fontSize: '0.7rem', color: '#7a7670', marginTop: 2 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Script embed */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>Widget embed code</div>
                    <CopyButton value={embedScript} label="Copy code" />
                  </div>
                  <pre style={{
                    background: '#0a0a0a', color: '#f5c842', padding: '14px', borderRadius: 10,
                    fontSize: '0.72rem', lineHeight: 1.7, overflowX: 'auto', whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all', fontFamily: 'monospace'
                  }}>{embedScript}</pre>
                  <div style={{ marginTop: 8, padding: '10px 14px', background: '#e8f5ef', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: '0.78rem', color: '#1a6b45', lineHeight: 1.6 }}>
                    ✓ Paste this anywhere in your website HTML — before &lt;/body&gt; works for any builder.
                    Works with WordPress, Wix, Squarespace, Webflow, Shopify, and custom HTML.
                  </div>
                </div>

                {/* Badge embed */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>Badge embed (image)</div>
                    <CopyButton value={badgeScript} label="Copy badge" />
                  </div>
                  <pre style={{
                    background: '#0a0a0a', color: '#f0eeea', padding: '14px', borderRadius: 10,
                    fontSize: '0.72rem', lineHeight: 1.7, overflowX: 'auto', whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all', fontFamily: 'monospace'
                  }}>{badgeScript}</pre>
                  <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#7a7670', lineHeight: 1.5 }}>
                    Use in email signatures, PDF footers, or anywhere a full widget doesn't fit.
                  </div>
                </div>

                {/* WordPress shortcode */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: 8 }}>WordPress shortcode</div>
                  <div style={{ background: '#f8f7f4', border: '1px solid #e4e0d8', borderRadius: 10, padding: '12px 14px', fontFamily: 'monospace', fontSize: '0.8rem', color: '#0a0a0a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <span style={{ wordBreak: 'break-all' }}>[swarmreply_widget token="{widgetToken}"]</span>
                    <CopyButton value={`[swarmreply_widget token="${widgetToken}"]`} label="Copy" />
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#7a7670', marginTop: 6, lineHeight: 1.5 }}>
                    Install the SwarmReply WordPress plugin to use shortcodes.
                  </div>
                </div>

                {/* Token management */}
                <div style={{ padding: '16px', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 10 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0a0a0a', marginBottom: 4 }}>Widget token</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#7a7670', marginBottom: 10, wordBreak: 'break-all' }}>
                    {widgetToken}
                  </div>
                  <button
                    onClick={handleRotateToken}
                    disabled={rotating}
                    style={{
                      padding: '7px 14px', borderRadius: 50, fontSize: '0.75rem', fontWeight: 600,
                      border: '1px solid #fecaca', background: 'white', color: '#c0392b',
                      cursor: 'pointer', fontFamily: 'DM Sans, sans-serif'
                    }}
                  >
                    {rotating ? 'Rotating...' : 'Rotate token (breaks existing embeds)'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ─── RIGHT PANEL — LIVE PREVIEW ─── */}
        <div style={{ background: '#f0eeea', overflowY: 'auto', padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Live preview</div>
              <div style={{ fontSize: '0.75rem', color: '#7a7670', marginTop: 2 }}>
                {reviews.length} review{reviews.length !== 1 ? 's' : ''} · {stats.avgRating?.toFixed(1)}★ avg
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['light', 'dark'].map(t => (
                <button key={t} onClick={() => updateSetting('theme', t)} style={{
                  padding: '6px 14px', borderRadius: 50, fontSize: '0.75rem', fontWeight: 600,
                  border: `1.5px solid ${settings.theme === t ? '#0a0a0a' : '#e4e0d8'}`,
                  background: settings.theme === t ? '#0a0a0a' : 'white',
                  color: settings.theme === t ? 'white' : '#7a7670',
                  cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all .15s'
                }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
              ))}
            </div>
          </div>

          {reviews.length === 0 ? (
            <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 16, padding: 48, textAlign: 'center', color: '#7a7670' }}>
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>⭐</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>No reviews to display yet</div>
              <div style={{ fontSize: '0.825rem', lineHeight: 1.6 }}>
                Reviews will appear here once SwarmReply has replied to reviews<br />
                that meet your minimum star rating.
              </div>
            </div>
          ) : (
            <LivePreview
              settings={settings}
              reviews={reviews}
              stats={stats}
              businessName={bizName}
            />
          )}

          {/* Platform compatibility note */}
          <div style={{ marginTop: 20, background: 'white', border: '1px solid #e4e0d8', borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 10 }}>
              Works with
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['WordPress', 'Wix', 'Squarespace', 'Webflow', 'Shopify', 'Framer', 'Any HTML'].map(p => (
                <span key={p} style={{
                  background: '#f8f7f4', border: '1px solid #e4e0d8',
                  padding: '4px 12px', borderRadius: 50, fontSize: '0.75rem',
                  fontWeight: 500, color: '#1a1a18'
                }}>{p}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
