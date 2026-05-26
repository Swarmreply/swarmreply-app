// ============================================
// src/pages/dashboard/nps.js
// NPS / Post-Visit Survey Dashboard
// ============================================

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const SURVEY_BASE = process.env.NEXT_PUBLIC_SURVEY_BASE || 'https://swarmreply.com/s';

const DELAY_OPTIONS = [
  { val: 1,  label: '1 hour after visit'  },
  { val: 2,  label: '2 hours after visit' },
  { val: 4,  label: '4 hours after visit' },
  { val: 24, label: 'Next day (24 hours)' },
  { val: 48, label: '2 days after visit'  },
];

const THRESHOLD_OPTIONS = [
  { val: 7,  label: '7+ (Broader funnel)'   },
  { val: 8,  label: '8+ (Balanced)'         },
  { val: 9,  label: '9+ (Recommended)'      },
  { val: 10, label: '10 only (Very strict)' },
];

// ─── Toggle ──────────────────────────────────
function Toggle({ value, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      role="switch" aria-checked={value}
      style={{
        width: 46, height: 24, borderRadius: 50, border: 'none',
        background: value ? '#0a0a0a' : '#e4e0d8',
        cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative', transition: 'background .2s',
        flexShrink: 0, opacity: disabled ? 0.5 : 1
      }}
    >
      <div style={{
        position: 'absolute', top: 3, width: 18, height: 18,
        borderRadius: '50%', background: 'white',
        left: value ? 25 : 3, transition: 'left .2s',
        boxShadow: '0 1px 3px rgba(0,0,0,.2)'
      }} />
    </button>
  );
}

// ─── Setting Row ─────────────────────────────
function Row({ label, desc, children }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      alignItems: 'flex-start', padding: '13px 0',
      borderBottom: '1px solid #f0eeea'
    }}>
      <div style={{ flex: 1, paddingRight: 20 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{label}</div>
        {desc && <div style={{ fontSize: '0.78rem', color: '#7a7670', marginTop: 2, lineHeight: 1.5 }}>{desc}</div>}
      </div>
      {children}
    </div>
  );
}

// ─── NPS Score Bar ────────────────────────────
function NpsBar({ label, pct, color }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: '0.82rem', color: '#7a7670' }}>{pct}%</span>
      </div>
      <div style={{ height: 8, background: '#f0eeea', borderRadius: 50, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 50, transition: 'width .6s ease' }} />
      </div>
    </div>
  );
}

// ─── Score Badge ─────────────────────────────
function ScoreBadge({ score }) {
  if (score === null || score === undefined) return <span style={{ color: '#7a7670' }}>—</span>;
  const isPromoter  = score >= 9;
  const isDetractor = score <= 6;
  const bg    = isPromoter ? '#e8f5ef' : isDetractor ? '#fee2e2' : '#fef3cd';
  const color = isPromoter ? '#1a6b45' : isDetractor ? '#c0392b' : '#92690a';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 32, height: 32, borderRadius: '50%', background: bg,
      color, fontWeight: 700, fontSize: '0.85rem'
    }}>
      {score}
    </span>
  );
}

// ─── Survey Preview ───────────────────────────
function SurveyPreview({ config }) {
  const accent    = config.accentColor    || '#f5c842';
  const isDark    = config.theme          === 'dark';
  const bg        = isDark ? '#0a0a0a'    : '#f8f7f4';
  const cardBg    = isDark ? '#141414'    : '#ffffff';
  const textCol   = isDark ? '#ffffff'    : '#0a0a0a';
  const mutedCol  = isDark ? 'rgba(255,255,255,.45)' : '#7a7670';
  const borderCol = isDark ? 'rgba(255,255,255,.1)' : '#e4e0d8';
  const threshold = config.promoterThreshold || 9;

  const scores = [0,1,2,3,4,5,6,7,8,9,10];

  return (
    <div style={{
      background: bg, borderRadius: 20, padding: '28px 24px',
      border: '1px solid #e4e0d8'
    }}>
      {/* Phone frame hint */}
      <div style={{ textAlign: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#7a7670' }}>
          Mobile preview
        </span>
      </div>
      <div style={{
        background: cardBg, borderRadius: 18, padding: '28px 22px',
        border: `1px solid ${borderCol}`,
        maxWidth: 340, margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: '1.3rem', marginBottom: 6 }}>🐝</div>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: textCol }}>
            {config.businessName || 'Your Business'}
          </div>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ width: 16, height: 6, borderRadius: 50, background: accent }} />
          <div style={{ width: 6, height: 6, borderRadius: 50, background: '#e4e0d8' }} />
        </div>

        {/* Headline */}
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '1.1rem', fontWeight: 700, color: textCol, textAlign: 'center', marginBottom: 6, lineHeight: 1.2 }}>
          Hi Jane! How was your visit?
        </div>
        <div style={{ fontSize: '0.8rem', color: mutedCol, textAlign: 'center', marginBottom: 18, lineHeight: 1.6 }}>
          {config.question || 'How likely are you to recommend us to a friend or family member?'}
        </div>

        {/* Score buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', gap: 4, marginBottom: 8 }}>
          {scores.map(s => {
            const isP = s >= threshold;
            const isD = s <= 6;
            const bg2 = isP ? `${accent}25` : isD ? '#fee2e2' : '#f8f7f4';
            const c2  = isP ? '#92690a' : isD ? '#c0392b' : '#7a7670';
            return (
              <div key={s} style={{
                aspectRatio: '1', borderRadius: '50%',
                background: bg2, color: c2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.68rem', fontWeight: 700,
                border: `1.5px solid ${isP ? `${accent}50` : isD ? '#fecaca' : '#e4e0d8'}`
              }}>{s}</div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: mutedCol, marginBottom: 16 }}>
          <span>😞 Not likely</span>
          <span>Extremely likely 😊</span>
        </div>

        <div style={{ borderTop: `1px solid ${borderCol}`, paddingTop: 12, textAlign: 'center', fontSize: '0.7rem', color: mutedCol }}>
          Takes 10 seconds · Your response is private
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────
export default function NpsPage() {
  const { customer }          = useAuth();
  const [locations, setLocations]   = useState([]);
  const [locationId, setLocationId] = useState(null);
  const [config, setConfig]         = useState(null);
  const [analytics, setAnalytics]   = useState(null);
  const [history, setHistory]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [sending, setSending]       = useState(false);
  const [activeTab, setActiveTab]   = useState('setup');
  const [toast, setToast]           = useState(null);

  // Send form state
  const [sendForm, setSendForm] = useState({ name: '', email: '', phone: '', channel: 'sms' });

  useEffect(() => { if (customer) loadLocations(); }, [customer]);

  async function loadLocations() {
    try {
      const res = await axios.get(`${API_URL}/locations/${customer.id}`);
      const locs = res.data.locations || [];
      setLocations(locs);
      if (locs.length > 0) {
        setLocationId(locs[0].id);
        await loadAll(locs[0].id);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function loadAll(locId) {
    try {
      const [cfgRes, analyticsRes, histRes] = await Promise.all([
        axios.get(`${API_URL}/nps/${locId}/config`),
        axios.get(`${API_URL}/nps/${locId}/analytics?days=30`),
        axios.get(`${API_URL}/nps/${locId}/history?limit=30`)
      ]);
      setConfig(cfgRes.data.config);
      setAnalytics(analyticsRes.data);
      setHistory(histRes.data.history || []);
    } catch (err) { console.error(err); }
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function updateConfig(key, value) {
    setConfig(prev => ({ ...prev, [key]: value }));
  }

  async function saveConfig() {
    setSaving(true);
    try {
      const res = await axios.put(`${API_URL}/nps/${locationId}/config`, {
        isEnabled:          config.is_enabled,
        question:           config.question,
        promoterThreshold:  config.promoter_threshold,
        redirectToGoogle:   config.redirect_to_google,
        googleReviewLink:   config.google_review_link,
        redirectDelayMs:    config.redirect_delay_ms,
        askFollowup:        config.ask_followup,
        followupQuestion:   config.followup_question,
        followupPlaceholder: config.followup_placeholder,
        promoterThankYou:   config.promoter_thank_you,
        detractorThankYou:  config.detractor_thank_you,
        sendDelayHours:     config.send_delay_hours,
        channel:            config.channel,
        emailSubject:       config.email_subject,
        smsMessage:         config.sms_message,
        accentColor:        config.accent_color,
        theme:              config.theme,
      });
      setConfig(res.data.config);
      showToast('Settings saved');
    } catch (err) {
      showToast('Save failed', 'error');
    } finally { setSaving(false); }
  }

  async function handleSend() {
    if (!sendForm.name || (!sendForm.email && !sendForm.phone)) {
      showToast('Name + email or phone required', 'error');
      return;
    }
    setSending(true);
    try {
      const res = await axios.post(`${API_URL}/nps/${locationId}/send`, {
        contact: { name: sendForm.name, email: sendForm.email, phone: sendForm.phone },
        channel: sendForm.channel
      });
      if (res.data.success) {
        showToast(`Survey sent to ${sendForm.name} via ${sendForm.channel} ✓`);
        setSendForm({ name: '', email: '', phone: '', channel: 'sms' });
        await loadAll(locationId);
      } else {
        showToast(res.data.error || 'Send failed', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Send failed', 'error');
    } finally { setSending(false); }
  }

  const inputStyle = {
    width: '100%', padding: '10px 13px', border: '1.5px solid #e4e0d8',
    borderRadius: 10, fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif',
    outline: 'none', color: '#1a1a18', background: 'white'
  };
  const labelStyle = {
    display: 'block', fontSize: '0.7rem', fontWeight: 700,
    letterSpacing: '0.08em', textTransform: 'uppercase',
    color: '#7a7670', marginBottom: 6
  };

  if (loading) return (
    <DashboardLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, color: '#7a7670' }}>
        Loading survey settings...
      </div>
    </DashboardLayout>
  );

  const npsScore = analytics?.npsScore;
  const npsColor = npsScore === null ? '#7a7670'
    : npsScore >= 50 ? '#1a6b45'
    : npsScore >= 0  ? '#92690a' : '#c0392b';

  return (
    <DashboardLayout>
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: toast.type === 'error' ? '#c0392b' : '#0a0a0a',
          color: 'white', padding: '11px 18px', borderRadius: 12,
          fontSize: '0.875rem', fontWeight: 500,
          boxShadow: '0 8px 24px rgba(0,0,0,.2)'
        }}>
          {toast.msg}
        </div>
      )}
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Topbar */}
      <div style={{
        background: 'white', borderBottom: '1px solid #e4e0d8',
        padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>NPS & Post-Visit Survey</h2>
          <p style={{ fontSize: '0.78rem', color: '#7a7670', marginTop: 1 }}>
            Score 9–10 → redirects to Google Reviews · Below 9 → captured privately
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {locations.length > 1 && (
            <select value={locationId || ''} onChange={e => { setLocationId(e.target.value); loadAll(e.target.value); }} style={{ ...inputStyle, width: 'auto' }}>
              {locations.map(l => <option key={l.id} value={l.id}>{l.business_name}</option>)}
            </select>
          )}
          {config && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px',
              background: config.is_enabled ? '#e8f5ef' : '#f8f7f4',
              border: '1px solid #e4e0d8', borderRadius: 50
            }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: config.is_enabled ? '#1a6b45' : '#7a7670' }}>
                {config.is_enabled ? 'Surveys ON' : 'Surveys OFF'}
              </span>
              <Toggle
                value={config?.is_enabled || false}
                onChange={v => { updateConfig('is_enabled', v); }}
              />
            </div>
          )}
          <button
            onClick={saveConfig} disabled={saving}
            style={{
              padding: '9px 22px', borderRadius: 50,
              background: saving ? '#c8c4bc' : '#f5c842', color: '#0a0a0a',
              border: 'none', fontSize: '0.875rem', fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif'
            }}
          >
            {saving ? 'Saving...' : 'Save settings'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: 'white', borderBottom: '1px solid #e4e0d8', padding: '0 32px', display: 'flex' }}>
        {[
          { id: 'setup',     label: 'Setup & Preview' },
          { id: 'messaging', label: 'Message & Branding' },
          { id: 'send',      label: 'Send a Survey' },
          { id: 'analytics', label: 'Analytics' },
          { id: 'responses', label: `Responses (${history.filter(h => h.responded_at).length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: '13px 18px', border: 'none', cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem',
            fontWeight: activeTab === t.id ? 600 : 500,
            background: 'transparent',
            color: activeTab === t.id ? '#0a0a0a' : '#7a7670',
            borderBottom: activeTab === t.id ? '2px solid #0a0a0a' : '2px solid transparent',
            transition: 'all .15s', whiteSpace: 'nowrap'
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding: '24px 32px', maxWidth: 980 }}>

        {/* ─── SETUP TAB ─── */}
        {activeTab === 'setup' && config && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 16, padding: 28, marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 16 }}>Survey question</div>
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Main question</label>
                  <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
                    value={config.question || ''}
                    onChange={e => updateConfig('question', e.target.value)}
                  />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Promoter threshold — send to Google</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {THRESHOLD_OPTIONS.map(o => (
                      <button key={o.val} onClick={() => updateConfig('promoter_threshold', o.val)} style={{
                        flex: 1, padding: '8px 6px', borderRadius: 10, cursor: 'pointer',
                        fontFamily: 'DM Sans, sans-serif', fontSize: '0.78rem', fontWeight: 600,
                        border: `1.5px solid ${config.promoter_threshold === o.val ? '#0a0a0a' : '#e4e0d8'}`,
                        background: config.promoter_threshold === o.val ? '#f8f7f4' : 'white',
                        transition: 'all .15s', textAlign: 'center', lineHeight: 1.4
                      }}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#7a7670', marginTop: 8, lineHeight: 1.55, background: '#f8f7f4', borderRadius: 8, padding: '8px 12px' }}>
                    Customers who give {config.promoter_threshold || 9}–10 are redirected to leave a Google review. Scores below {config.promoter_threshold || 9} are captured privately.
                  </div>
                </div>
              </div>

              <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 16, padding: 28, marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 14 }}>Google redirect</div>
                <Row label="Redirect promoters to Google" desc="After a high score, redirect to your Google review page">
                  <Toggle value={config.redirect_to_google} onChange={v => updateConfig('redirect_to_google', v)} />
                </Row>
                {config.redirect_to_google && (
                  <div style={{ marginTop: 14 }}>
                    <label style={labelStyle}>Google review link</label>
                    <input style={inputStyle} value={config.google_review_link || ''}
                      onChange={e => updateConfig('google_review_link', e.target.value)}
                      placeholder="https://g.page/r/YOUR_PLACE_ID/review"
                    />
                    <div style={{ fontSize: '0.72rem', color: '#7a7670', marginTop: 5 }}>
                      Google Maps → your business → Share → Copy link
                    </div>
                  </div>
                )}
              </div>

              <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 16, padding: 28, marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 14 }}>Follow-up feedback</div>
                <Row label="Ask for written feedback" desc="For scores below the promoter threshold — captured privately">
                  <Toggle value={config.ask_followup} onChange={v => updateConfig('ask_followup', v)} />
                </Row>
                {config.ask_followup && (
                  <div style={{ marginTop: 14 }}>
                    <label style={labelStyle}>Follow-up question</label>
                    <textarea style={{ ...inputStyle, minHeight: 64, resize: 'vertical', marginBottom: 12 }}
                      value={config.followup_question || ''}
                      onChange={e => updateConfig('followup_question', e.target.value)}
                    />
                    <label style={labelStyle}>Placeholder text</label>
                    <input style={inputStyle} value={config.followup_placeholder || ''}
                      onChange={e => updateConfig('followup_placeholder', e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 16, padding: 28 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 14 }}>Thank you messages</div>
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Promoter message ({config.promoter_threshold || 9}–10 stars)</label>
                  <textarea style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }}
                    value={config.promoter_thank_you || ''}
                    onChange={e => updateConfig('promoter_thank_you', e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Detractor message (below {config.promoter_threshold || 9})</label>
                  <textarea style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }}
                    value={config.detractor_thank_you || ''}
                    onChange={e => updateConfig('detractor_thank_you', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Right — preview */}
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 12 }}>Live preview</div>
              {config && (
                <SurveyPreview config={{
                  ...config,
                  accentColor: config.accent_color,
                  businessName: config.business_name,
                  promoterThreshold: config.promoter_threshold || 9,
                  theme: config.theme || 'light'
                }} />
              )}
              <div style={{ marginTop: 14, background: '#f8f7f4', border: '1px solid #e4e0d8', borderRadius: 12, padding: '12px 16px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 8 }}>Your survey link</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.78rem', color: '#0a0a0a', wordBreak: 'break-all' }}>
                  {SURVEY_BASE}/[unique-token-per-customer]
                </div>
                <div style={{ fontSize: '0.72rem', color: '#7a7670', marginTop: 6, lineHeight: 1.55 }}>
                  Each customer gets a unique link. Scores and feedback are stored against their contact record.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── MESSAGING TAB ─── */}
        {activeTab === 'messaging' && config && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 16, padding: 28, marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 14 }}>Branding</div>
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Accent color</label>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input type="color" value={config.accent_color || '#f5c842'}
                      onChange={e => updateConfig('accent_color', e.target.value)}
                      style={{ width: 46, height: 38, borderRadius: 8, border: '1.5px solid #e4e0d8', padding: 2, cursor: 'pointer' }}
                    />
                    <input style={{ ...inputStyle, flex: 1 }} value={config.accent_color || '#f5c842'}
                      onChange={e => updateConfig('accent_color', e.target.value)}
                    />
                    {['#f5c842', '#0a0a0a', '#1a6b45', '#3b82f6', '#e53e3e'].map(c => (
                      <div key={c} onClick={() => updateConfig('accent_color', c)} style={{
                        width: 26, height: 26, borderRadius: '50%', background: c, cursor: 'pointer',
                        border: config.accent_color === c ? '2px solid #0a0a0a' : '2px solid transparent', flexShrink: 0
                      }} />
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Theme</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[{id:'light',label:'Light'},{id:'dark',label:'Dark'}].map(t => (
                      <div key={t.id} onClick={() => updateConfig('theme', t.id)} style={{
                        flex: 1, border: `1.5px solid ${config.theme === t.id ? '#0a0a0a' : '#e4e0d8'}`,
                        borderRadius: 10, padding: '10px 14px', cursor: 'pointer',
                        display: 'flex', gap: 8, alignItems: 'center', background: config.theme === t.id ? '#f8f7f4' : 'white'
                      }}>
                        <div style={{ width: 22, height: 22, borderRadius: 5, background: t.id === 'dark' ? '#0a0a0a' : 'white', border: '1px solid #e4e0d8' }} />
                        <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>{t.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Logo URL (optional)</label>
                  <input style={inputStyle} value={config.logo_url || ''}
                    onChange={e => updateConfig('logo_url', e.target.value)}
                    placeholder="https://yourdomain.com/logo.png"
                  />
                  <div style={{ fontSize: '0.72rem', color: '#7a7670', marginTop: 5 }}>
                    Shown at the top of the survey. Leave blank to use the SwarmReply bee icon.
                  </div>
                </div>
              </div>

              <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 16, padding: 28, marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 14 }}>SMS message</div>
                <div style={{ marginBottom: 8 }}>
                  <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                    value={config.sms_message || ''}
                    onChange={e => updateConfig('sms_message', e.target.value)}
                  />
                </div>
                <div style={{ fontSize: '0.72rem', color: '#7a7670', background: '#f8f7f4', borderRadius: 8, padding: '8px 12px', lineHeight: 1.6 }}>
                  Variables: <code>{'{{customer_name}}'}</code>, <code>{'{{business_name}}'}</code>, <code>{'{{survey_link}}'}</code>
                </div>
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: 6 }}>Preview:</div>
                  <div style={{ background: '#0a0a0a', color: 'white', borderRadius: 10, padding: '10px 14px', fontSize: '0.82rem', lineHeight: 1.65 }}>
                    {(config.sms_message || '')
                      .replace(/{{customer_name}}/g, 'Jane')
                      .replace(/{{business_name}}/g, config.business_name || 'Your Business')
                      .replace(/{{survey_link}}/g, `${SURVEY_BASE}/abc123`)}
                  </div>
                </div>
              </div>

              <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 16, padding: 28 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 14 }}>Email subject</div>
                <input style={inputStyle} value={config.email_subject || ''}
                  onChange={e => updateConfig('email_subject', e.target.value)}
                />
                <div style={{ fontSize: '0.72rem', color: '#7a7670', marginTop: 6 }}>
                  Variable: <code>{'{{business_name}}'}</code>
                </div>
              </div>
            </div>

            {/* Right — SMS preview */}
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 12 }}>SMS preview</div>
              <div style={{ background: '#f0eeea', borderRadius: 20, padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                  <div style={{ background: '#0a0a0a', color: 'white', borderRadius: '18px 18px 4px 18px', padding: '10px 14px', maxWidth: '80%', fontSize: '0.85rem', lineHeight: 1.65 }}>
                    {(config.sms_message || '')
                      .replace(/{{customer_name}}/g, 'Jane')
                      .replace(/{{business_name}}/g, config.business_name || 'Your Business')
                      .replace(/{{survey_link}}/g, `${SURVEY_BASE}/abc123`)}
                  </div>
                </div>
                <div style={{ textAlign: 'center', fontSize: '0.68rem', color: '#7a7670' }}>Delivered</div>
              </div>
            </div>
          </div>
        )}

        {/* ─── SEND TAB ─── */}
        {activeTab === 'send' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 16, padding: 28 }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 16 }}>Send a survey to one contact</div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Customer name</label>
                <input style={inputStyle} value={sendForm.name} onChange={e => setSendForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input style={inputStyle} type="email" value={sendForm.email} onChange={e => setSendForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@example.com" />
                </div>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input style={inputStyle} value={sendForm.phone} onChange={e => setSendForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 555 000 0000" />
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Send via</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['sms','email','both'].map(ch => (
                    <button key={ch} onClick={() => setSendForm(f => ({ ...f, channel: ch }))} style={{
                      flex: 1, padding: '9px', borderRadius: 10, cursor: 'pointer',
                      fontFamily: 'DM Sans, sans-serif', fontSize: '0.82rem', fontWeight: 600,
                      border: `1.5px solid ${sendForm.channel === ch ? '#0a0a0a' : '#e4e0d8'}`,
                      background: sendForm.channel === ch ? '#f8f7f4' : 'white', transition: 'all .15s'
                    }}>
                      {ch.charAt(0).toUpperCase() + ch.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleSend} disabled={sending} style={{
                width: '100%', padding: '13px', borderRadius: 50,
                background: sending ? '#c8c4bc' : '#f5c842', color: '#0a0a0a',
                border: 'none', fontSize: '0.95rem', fontWeight: 700,
                cursor: sending ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif'
              }}>
                {sending ? 'Sending...' : '→ Send survey'}
              </button>
            </div>

            <div>
              <div style={{ background: '#0a0a0a', borderRadius: 14, padding: '20px 22px', marginBottom: 14 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', marginBottom: 12 }}>How the review funnel works</div>
                {[
                  { step: '1', text: 'Customer receives SMS or email with a unique survey link' },
                  { step: '2', text: 'They tap a score 0–10. Takes about 10 seconds on mobile.' },
                  { step: '3', text: `Score ${config?.promoter_threshold || 9}–10 → thank you + redirect to Google Reviews` },
                  { step: '4', text: `Score below ${config?.promoter_threshold || 9} → optional feedback captured privately. Never goes to Google.` },
                  { step: '5', text: 'You see all scores and feedback in the Responses tab.' },
                ].map(s => (
                  <div key={s.step} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', background: '#f5c842',
                      color: '#0a0a0a', fontSize: '0.72rem', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1
                    }}>{s.step}</div>
                    <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,.65)', lineHeight: 1.6 }}>{s.text}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: '#e8f5ef', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px 16px', fontSize: '0.8rem', color: '#1a6b45', lineHeight: 1.65 }}>
                ✓ Surveys also fire automatically when CSV imports are processed or via Zapier. You can also use the Import Contacts page to upload a list and send surveys on a schedule.
              </div>
            </div>
          </div>
        )}

        {/* ─── ANALYTICS TAB ─── */}
        {activeTab === 'analytics' && analytics && (
          <>
            {/* NPS Score hero */}
            <div style={{ background: '#0a0a0a', borderRadius: 20, padding: '32px 36px', marginBottom: 20, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 32, alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '4rem', fontWeight: 900, lineHeight: 1, color: npsColor }}>
                  {npsScore !== null ? npsScore : '—'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,.4)', marginTop: 4 }}>NPS score</div>
              </div>
              <div>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: '1.1rem', fontWeight: 700, color: 'white', marginBottom: 8 }}>
                  {npsScore === null ? 'No responses yet'
                    : npsScore >= 50 ? 'Excellent — customers love you'
                    : npsScore >= 0  ? 'Good — room to grow'
                    : 'Needs attention — more detractors than promoters'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {[
                    { label: 'Sent',        val: analytics.totalSent },
                    { label: 'Responses',   val: analytics.totalResponses },
                    { label: 'Response rate', val: `${analytics.responseRate}%` },
                    { label: 'Avg score',   val: analytics.avgScore?.toFixed(1) || '—' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'rgba(255,255,255,.07)', borderRadius: 10, padding: '10px 14px' }}>
                      <div style={{ fontFamily: 'Georgia, serif', fontSize: '1.4rem', fontWeight: 700, color: 'white', lineHeight: 1 }}>{s.val}</div>
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,.4)', marginTop: 3 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: 24 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 16 }}>Score breakdown</div>
                <NpsBar label={`Promoters (${config?.promoter_threshold || 9}–10)`}
                  pct={analytics.totalResponses > 0 ? Math.round((analytics.promoters / analytics.totalResponses) * 100) : 0}
                  color="#1a6b45" />
                <NpsBar label="Passives (7–8)"
                  pct={analytics.totalResponses > 0 ? Math.round((analytics.passives / analytics.totalResponses) * 100) : 0}
                  color="#92690a" />
                <NpsBar label="Detractors (0–6)"
                  pct={analytics.totalResponses > 0 ? Math.round((analytics.detractors / analytics.totalResponses) * 100) : 0}
                  color="#c0392b" />
                <div style={{ marginTop: 16, fontSize: '0.78rem', color: '#7a7670', background: '#f8f7f4', borderRadius: 8, padding: '8px 12px', lineHeight: 1.6 }}>
                  NPS formula: % promoters − % detractors = {npsScore !== null ? npsScore : '—'}
                </div>
              </div>
              <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: 24 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 16 }}>Score distribution</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
                  {[0,1,2,3,4,5,6,7,8,9,10].map(s => {
                    const count = analytics.recent?.filter(r => r.score === s).length || 0;
                    const maxCount = Math.max(...([0,1,2,3,4,5,6,7,8,9,10].map(x => analytics.recent?.filter(r => r.score === x).length || 0)), 1);
                    const pct = (count / maxCount) * 100;
                    const isP = s >= (config?.promoter_threshold || 9);
                    const isD = s <= 6;
                    const color = isP ? '#1a6b45' : isD ? '#c0392b' : '#f59e0b';
                    return (
                      <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: '100%', height: `${Math.max(pct, 4)}%`, background: color, borderRadius: '3px 3px 0 0', minHeight: 4 }} />
                        <span style={{ fontSize: '0.62rem', color: '#7a7670' }}>{s}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ─── RESPONSES TAB ─── */}
        {activeTab === 'responses' && (
          <div>
            {history.length === 0 ? (
              <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: 48, textAlign: 'center', color: '#7a7670' }}>
                <div style={{ fontSize: '2rem', marginBottom: 10 }}>📋</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No surveys sent yet</div>
                <div style={{ fontSize: '0.82rem' }}>Use the "Send a Survey" tab to send your first one.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {history.map((h, i) => {
                  const responded = !!h.responded_at;
                  const type = h.is_promoter ? 'promoter' : h.is_detractor ? 'detractor' : h.is_passive ? 'passive' : null;
                  const typeSt = type === 'promoter' ? { bg: '#e8f5ef', color: '#1a6b45', label: '★ Promoter' }
                    : type === 'detractor' ? { bg: '#fee2e2', color: '#c0392b', label: '↓ Detractor' }
                    : type === 'passive' ? { bg: '#fef3cd', color: '#92690a', label: '◎ Passive' }
                    : { bg: '#f0eeea', color: '#7a7670', label: '○ Pending' };
                  return (
                    <div key={i} style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 12, padding: '14px 18px', display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: 14, alignItems: 'center' }}>
                      <ScoreBadge score={h.nps_score} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{h.contact_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#7a7670', marginTop: 2 }}>
                          {h.contact_email || h.contact_phone} · {h.channel.toUpperCase()}
                          {responded && h.followup_text && (
                            <span style={{ marginLeft: 8, fontStyle: 'italic', color: '#4a4a48' }}>
                              "{h.followup_text.substring(0, 60)}{h.followup_text.length > 60 ? '…' : ''}"
                            </span>
                          )}
                        </div>
                      </div>
                      <span style={{ padding: '3px 10px', borderRadius: 50, fontSize: '0.7rem', fontWeight: 700, background: typeSt.bg, color: typeSt.color, whiteSpace: 'nowrap' }}>
                        {typeSt.label}
                      </span>
                      <div style={{ fontSize: '0.72rem', color: '#7a7670', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {responded
                          ? new Date(h.responded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : 'Awaiting response'
                        }
                        {h.redirected_to_google && (
                          <div style={{ color: '#1a6b45', fontWeight: 600 }}>→ Google ✓</div>
                        )}
                      </div>
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
