// ============================================
// src/pages/dashboard/surveys.js
// NPS & Post-Visit Survey Dashboard
// Three tabs: Setup, Analytics, History
// ============================================

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const SURVEY_BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://swarmreply.com';

const HOURS = [0,1,2,3,4,6,8,12,24,48,72].map(h => ({
  val: h,
  label: h === 0 ? 'Immediately'
    : h < 24 ? `${h} hour${h !== 1 ? 's' : ''} after visit`
    : `${h / 24} day${h / 24 !== 1 ? 's' : ''} after visit`
}));

const SCALE_OPTIONS = [
  { id: '0-10', label: '0 – 10',  desc: 'Standard NPS scale' },
  { id: '1-10', label: '1 – 10',  desc: '1 to 10 scale' },
  { id: '1-5',  label: '1 – 5 ★', desc: 'Star rating scale' },
];

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} role="switch" aria-checked={value}
      style={{ width:44, height:23, borderRadius:50, border:'none', cursor:'pointer',
        background: value ? '#0a0a0a' : '#e4e0d8', position:'relative', transition:'background .2s', flexShrink:0 }}>
      <div style={{ position:'absolute', top:2.5, left: value ? 23 : 2.5, width:18, height:18,
        borderRadius:'50%', background:'white', transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.2)' }} />
    </button>
  );
}

function SettingRow({ label, desc, children }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'13px 0', borderBottom:'.5px solid #f0eeea' }}>
      <div style={{ flex:1, paddingRight:20 }}>
        <div style={{ fontSize:'0.875rem', fontWeight:500 }}>{label}</div>
        {desc && <div style={{ fontSize:'0.75rem', color:'#7a7670', marginTop:2, lineHeight:1.5 }}>{desc}</div>}
      </div>
      {children}
    </div>
  );
}

function NpsGauge({ score }) {
  if (score === null || score === undefined) return (
    <div style={{ textAlign:'center' }}>
      <div style={{ fontFamily:'Playfair Display,serif', fontSize:'2.5rem', fontWeight:900, color:'#b0aca6' }}>—</div>
      <div style={{ fontSize:'0.72rem', color:'#7a7670', marginTop:4 }}>No data yet</div>
    </div>
  );
  const color = score >= 50 ? '#1a6b45' : score >= 0 ? '#f59e0b' : '#c0392b';
  const label = score >= 50 ? 'Excellent' : score >= 20 ? 'Good' : score >= 0 ? 'Needs work' : 'Critical';
  return (
    <div style={{ textAlign:'center' }}>
      <div style={{ fontFamily:'Playfair Display,serif', fontSize:'2.8rem', fontWeight:900, color, lineHeight:1 }}>
        {score > 0 ? '+' : ''}{score}
      </div>
      <div style={{ fontSize:'0.72rem', fontWeight:700, color, marginTop:4, textTransform:'uppercase', letterSpacing:'.07em' }}>{label}</div>
    </div>
  );
}

function StatCard({ label, value, sub, subColor }) {
  return (
    <div style={{ background:'white', border:'1px solid #e4e0d8', borderRadius:12, padding:'16px 18px' }}>
      <div style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#7a7670', marginBottom:8 }}>{label}</div>
      <div style={{ fontFamily:'Playfair Display,serif', fontSize:'2rem', fontWeight:900, lineHeight:1 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize:'0.75rem', color: subColor || '#7a7670', marginTop:5 }}>{sub}</div>}
    </div>
  );
}

function ResponseRow({ r }) {
  const sc = r.score_label === 'promoter' ? { bg:'#e8f5ef', color:'#1a6b45' }
    : r.score_label === 'detractor'        ? { bg:'#fee2e2', color:'#c0392b' }
    : { bg:'#fef3cd', color:'#92690a' };
  const date = r.responded_at
    ? new Date(r.responded_at).toLocaleDateString('en-US', { month:'short', day:'numeric' })
    : '—';
  return (
    <div style={{ padding:'12px 18px', borderBottom:'.5px solid #f0eeea', display:'flex', gap:12, alignItems:'flex-start' }}>
      <div style={{ width:34, height:34, borderRadius:'50%', background:'#f0eeea', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.78rem', fontWeight:700, color:'#7a7670', flexShrink:0 }}>
        {r.contact_name?.[0] || '?'}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3, flexWrap:'wrap' }}>
          <span style={{ fontWeight:600, fontSize:'0.85rem' }}>{r.contact_name || 'Anonymous'}</span>
          <span style={{ padding:'2px 9px', borderRadius:50, fontSize:'0.68rem', fontWeight:700, background:sc.bg, color:sc.color }}>
            {r.score} · {r.score_label}
          </span>
          <span style={{ fontSize:'0.72rem', color:'#b0aca6', marginLeft:'auto' }}>{date}</span>
        </div>
        {r.followup_text && (
          <div style={{ fontSize:'0.82rem', color:'#4a4a48', fontStyle:'italic', lineHeight:1.6 }}>
            "{r.followup_text}"
          </div>
        )}
      </div>
    </div>
  );
}

export default function SurveysPage() {
  const { customer }            = useAuth();
  const [locations, setLocs]    = useState([]);
  const [locationId, setLocId]  = useState(null);
  const [config, setConfig]     = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [history, setHistory]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [sending, setSending]   = useState(false);
  const [toast, setToast]       = useState(null);
  const [activeTab, setActiveTab] = useState('setup');

  // Manual send form
  const [sendName,  setSendName]  = useState('');
  const [sendEmail, setSendEmail] = useState('');
  const [sendPhone, setSendPhone] = useState('');

  useEffect(() => { if (customer) loadLocations(); }, [customer]);

  async function loadLocations() {
    try {
      const res = await axios.get(`${API_URL}/locations/${customer.id}`);
      const locs = res.data.locations || [];
      setLocs(locs);
      if (locs.length > 0) {
        setLocId(locs[0].id);
        await loadAll(locs[0].id);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function loadAll(locId) {
    try {
      const [cfgRes, analyticsRes, histRes] = await Promise.all([
        axios.get(`${API_URL}/surveys/${locId}/config`),
        axios.get(`${API_URL}/surveys/${locId}/analytics`),
        axios.get(`${API_URL}/surveys/${locId}/history`)
      ]);
      setConfig(cfgRes.data.config);
      setAnalytics(analyticsRes.data);
      setHistory(histRes.data.history || []);
    } catch (err) { console.error(err); }
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await axios.put(`${API_URL}/surveys/${locationId}/config`, config);
      setConfig(res.data.config);
      showToast('Settings saved');
    } catch (err) {
      showToast(err.response?.data?.error || 'Save failed', 'error');
    } finally { setSaving(false); }
  }

  async function handleManualSend() {
    if (!sendName || (!sendEmail && !sendPhone)) return;
    setSending(true);
    try {
      await axios.post(`${API_URL}/surveys/${locationId}/send`, {
        name: sendName, email: sendEmail || undefined, phone: sendPhone || undefined
      });
      showToast(`Survey sent to ${sendName} ✓`);
      setSendName(''); setSendEmail(''); setSendPhone('');
      await loadAll(locationId);
    } catch (err) {
      showToast(err.response?.data?.error || 'Send failed', 'error');
    } finally { setSending(false); }
  }

  function updateConfig(key, val) {
    setConfig(prev => ({ ...prev, [key]: val }));
  }

  const fi = {
    width: '100%', padding: '10px 13px', border: '1.5px solid #e4e0d8',
    borderRadius: 10, fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif',
    outline: 'none', color: '#1a1a18', background: 'white'
  };
  const fl = {
    display: 'block', fontSize: '0.68rem', fontWeight: 700,
    letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 6
  };

  const previewUrl = config
    ? `${SURVEY_BASE}/survey/preview`
    : null;

  if (loading) return (
    <DashboardLayout>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:400, color:'#7a7670' }}>Loading surveys...</div>
    </DashboardLayout>
  );

  const summary = analytics?.summary || {};

  return (
    <DashboardLayout>
      {toast && (
        <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999,
          background: toast.type === 'error' ? '#c0392b' : '#0a0a0a',
          color:'white', padding:'11px 18px', borderRadius:12,
          fontSize:'0.875rem', fontWeight:500,
          boxShadow:'0 8px 24px rgba(0,0,0,.2)' }}>
          {toast.msg}
        </div>
      )}

      {/* Topbar */}
      <div style={{ background:'white', borderBottom:'1px solid #e4e0d8', padding:'16px 32px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h2 style={{ fontSize:'1rem', fontWeight:600 }}>Post-Visit Surveys & NPS</h2>
          <p style={{ fontSize:'0.78rem', color:'#7a7670', marginTop:1 }}>
            Send after every visit — route promoters to Google reviews, capture detractor feedback privately
          </p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          {locations.length > 1 && (
            <select value={locationId || ''} onChange={e => { setLocId(e.target.value); loadAll(e.target.value); }}
              style={{ ...fi, width:'auto' }}>
              {locations.map(l => <option key={l.id} value={l.id}>{l.business_name}</option>)}
            </select>
          )}
          {/* Master toggle */}
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 16px',
            background: config?.is_enabled ? '#e8f5ef' : '#f8f7f4',
            border:'1px solid #e4e0d8', borderRadius:50 }}>
            <span style={{ fontSize:'0.82rem', fontWeight:600, color: config?.is_enabled ? '#1a6b45' : '#7a7670' }}>
              {config?.is_enabled ? 'Surveys ON' : 'Surveys OFF'}
            </span>
            <Toggle value={config?.is_enabled || false}
              onChange={v => { updateConfig('is_enabled', v); axios.put(`${API_URL}/surveys/${locationId}/config`, { ...config, is_enabled: v }); }}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background:'white', borderBottom:'1px solid #e4e0d8', padding:'0 32px', display:'flex' }}>
        {[
          { id:'setup',     label:'Setup & Preview' },
          { id:'analytics', label:`Analytics${summary.totalResponses ? ` (${summary.totalResponses})` : ''}` },
          { id:'history',   label:`History${history.length ? ` (${history.length})` : ''}` },
          { id:'send',      label:'Send Survey' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding:'13px 20px', border:'none', cursor:'pointer', fontFamily:'DM Sans,sans-serif',
            fontSize:'0.85rem', fontWeight: activeTab === tab.id ? 600 : 500,
            background:'transparent', color: activeTab === tab.id ? '#0a0a0a' : '#7a7670',
            borderBottom: activeTab === tab.id ? '2px solid #0a0a0a' : '2px solid transparent',
            transition:'all .15s'
          }}>{tab.label}</button>
        ))}
      </div>

      <div style={{ padding:'28px 32px', maxWidth:960 }}>

        {/* ── SETUP TAB ── */}
        {activeTab === 'setup' && config && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:22 }}>

            {/* Left — survey content */}
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

              {/* Question */}
              <div style={{ background:'white', border:'1px solid #e4e0d8', borderRadius:16, padding:24 }}>
                <div style={{ fontWeight:600, fontSize:'0.875rem', marginBottom:14 }}>The question</div>
                <div style={{ marginBottom:14 }}>
                  <label style={fl}>Survey question</label>
                  <input style={fi} value={config.question_text || ''} onChange={e => updateConfig('question_text', e.target.value)} />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
                  <div><label style={fl}>Low score label</label><input style={fi} value={config.low_label || ''} onChange={e => updateConfig('low_label', e.target.value)} placeholder="Not likely" /></div>
                  <div><label style={fl}>High score label</label><input style={fi} value={config.high_label || ''} onChange={e => updateConfig('high_label', e.target.value)} placeholder="Very likely" /></div>
                </div>
                <div>
                  <label style={fl}>Scale</label>
                  <div style={{ display:'flex', gap:8 }}>
                    {SCALE_OPTIONS.map(s => (
                      <div key={s.id} onClick={() => updateConfig('scale_type', s.id)} style={{
                        flex:1, border: `1.5px solid ${config.scale_type === s.id ? '#0a0a0a' : '#e4e0d8'}`,
                        borderRadius:10, padding:'10px', cursor:'pointer',
                        background: config.scale_type === s.id ? '#f8f7f4' : 'white',
                        transition:'all .15s', textAlign:'center'
                      }}>
                        <div style={{ fontSize:'0.82rem', fontWeight:600 }}>{s.label}</div>
                        <div style={{ fontSize:'0.68rem', color:'#7a7670', marginTop:2 }}>{s.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Routing thresholds */}
              <div style={{ background:'white', border:'1px solid #e4e0d8', borderRadius:16, padding:24 }}>
                <div style={{ fontWeight:600, fontSize:'0.875rem', marginBottom:6 }}>Score routing</div>
                <div style={{ fontSize:'0.78rem', color:'#7a7670', marginBottom:16, lineHeight:1.6 }}>
                  Scores are routed to different follow-up actions based on these thresholds.
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
                  <div style={{ background:'#e8f5ef', borderRadius:10, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div><div style={{ fontSize:'0.82rem', fontWeight:600, color:'#1a6b45' }}>Promoter</div><div style={{ fontSize:'0.72rem', color:'#1a6b45' }}>Score ≥ {config.promoter_min} → Google review request</div></div>
                    <input type="number" min="5" max="10" value={config.promoter_min || 9}
                      onChange={e => updateConfig('promoter_min', parseInt(e.target.value))}
                      style={{ ...fi, width:60, padding:'6px', textAlign:'center' }} />
                  </div>
                  <div style={{ background:'#fef3cd', borderRadius:10, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div><div style={{ fontSize:'0.82rem', fontWeight:600, color:'#92690a' }}>Passive</div><div style={{ fontSize:'0.72rem', color:'#92690a' }}>Score ≥ {config.passive_min} → optional follow-up</div></div>
                    <input type="number" min="3" max="9" value={config.passive_min || 7}
                      onChange={e => updateConfig('passive_min', parseInt(e.target.value))}
                      style={{ ...fi, width:60, padding:'6px', textAlign:'center' }} />
                  </div>
                  <div style={{ background:'#fee2e2', borderRadius:10, padding:'10px 14px' }}>
                    <div style={{ fontSize:'0.82rem', fontWeight:600, color:'#c0392b' }}>Detractor</div>
                    <div style={{ fontSize:'0.72rem', color:'#c0392b' }}>Score &lt; {config.passive_min} → private feedback form</div>
                  </div>
                </div>
              </div>

              {/* Follow-up messages */}
              <div style={{ background:'white', border:'1px solid #e4e0d8', borderRadius:16, padding:24 }}>
                <div style={{ fontWeight:600, fontSize:'0.875rem', marginBottom:14 }}>Follow-up messages</div>
                <div style={{ marginBottom:12 }}>
                  <label style={fl}>Promoter message (shown to 9–10 scorers)</label>
                  <textarea style={{ ...fi, minHeight:68, resize:'vertical' }}
                    value={config.promoter_message || ''}
                    onChange={e => updateConfig('promoter_message', e.target.value)} />
                </div>
                <div style={{ marginBottom:12 }}>
                  <label style={fl}>Passive message (shown to 7–8 scorers)</label>
                  <textarea style={{ ...fi, minHeight:68, resize:'vertical' }}
                    value={config.passive_message || ''}
                    onChange={e => updateConfig('passive_message', e.target.value)} />
                </div>
                <div style={{ marginBottom:12 }}>
                  <label style={fl}>Detractor message (shown to 0–6 scorers)</label>
                  <textarea style={{ ...fi, minHeight:68, resize:'vertical' }}
                    value={config.detractor_message || ''}
                    onChange={e => updateConfig('detractor_message', e.target.value)} />
                </div>
                <SettingRow label="Follow-up question enabled" desc="Ask an open-text question after low scores">
                  <Toggle value={config.followup_enabled ?? true} onChange={v => updateConfig('followup_enabled', v)} />
                </SettingRow>
                {config.followup_enabled && (
                  <div style={{ marginTop:12 }}>
                    <label style={fl}>Follow-up question text</label>
                    <input style={fi} value={config.followup_question || ''} onChange={e => updateConfig('followup_question', e.target.value)} />
                  </div>
                )}
              </div>
            </div>

            {/* Right — timing, branding, send settings */}
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

              {/* Timing & channel */}
              <div style={{ background:'white', border:'1px solid #e4e0d8', borderRadius:16, padding:24 }}>
                <div style={{ fontWeight:600, fontSize:'0.875rem', marginBottom:14 }}>Timing & delivery</div>
                <div style={{ marginBottom:14 }}>
                  <label style={fl}>Send delay</label>
                  <select style={{ ...fi, appearance:'none' }}
                    value={config.send_delay_hours ?? 2}
                    onChange={e => updateConfig('send_delay_hours', parseInt(e.target.value))}>
                    {HOURS.map(h => <option key={h.val} value={h.val}>{h.label}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom:14 }}>
                  <label style={fl}>Send via</label>
                  <div style={{ display:'flex', gap:8 }}>
                    {[{id:'email',label:'Email'},{id:'sms',label:'SMS'},{id:'both',label:'Both'}].map(c => (
                      <div key={c.id} onClick={() => updateConfig('send_channel', c.id)} style={{
                        flex:1, border: `1.5px solid ${config.send_channel === c.id ? '#0a0a0a' : '#e4e0d8'}`,
                        borderRadius:10, padding:'9px', cursor:'pointer', textAlign:'center',
                        background: config.send_channel === c.id ? '#f8f7f4' : 'white',
                        fontSize:'0.82rem', fontWeight: config.send_channel === c.id ? 600 : 400,
                        transition:'all .15s'
                      }}>{c.label}</div>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={fl}>Google review link (for promoters)</label>
                  <input style={fi} value={config.promoter_url || ''} onChange={e => updateConfig('promoter_url', e.target.value)} placeholder="https://g.page/r/YOUR_ID/review" />
                  <div style={{ fontSize:'0.72rem', color:'#7a7670', marginTop:5 }}>Find it in Google Maps → Share → Copy link</div>
                </div>
              </div>

              {/* Branding */}
              <div style={{ background:'white', border:'1px solid #e4e0d8', borderRadius:16, padding:24 }}>
                <div style={{ fontWeight:600, fontSize:'0.875rem', marginBottom:14 }}>Survey branding</div>
                <div style={{ marginBottom:12 }}>
                  <label style={fl}>Brand color</label>
                  <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                    <input type="color" value={config.brand_color || '#f5c842'}
                      onChange={e => updateConfig('brand_color', e.target.value)}
                      style={{ width:44, height:38, borderRadius:8, border:'1.5px solid #e4e0d8', padding:2, cursor:'pointer', background:'white' }} />
                    <input style={{ ...fi, flex:1 }} value={config.brand_color || '#f5c842'} onChange={e => updateConfig('brand_color', e.target.value)} />
                    {['#f5c842','#0a0a0a','#1a6b45','#3b82f6','#e53e3e','#7e22ce'].map(c => (
                      <div key={c} onClick={() => updateConfig('brand_color', c)}
                        style={{ width:26, height:26, borderRadius:'50%', background:c, cursor:'pointer', flexShrink:0, border: config.brand_color === c ? '2px solid #0a0a0a' : '2px solid transparent' }} />
                    ))}
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                  <div><label style={fl}>Thank you title</label><input style={fi} value={config.thank_you_title || ''} onChange={e => updateConfig('thank_you_title', e.target.value)} /></div>
                  <div><label style={fl}>Button text</label><input style={fi} value={config.button_text || ''} onChange={e => updateConfig('button_text', e.target.value)} /></div>
                </div>
                <div>
                  <label style={fl}>Thank you message</label>
                  <textarea style={{ ...fi, minHeight:64, resize:'vertical' }}
                    value={config.thank_you_message || ''} onChange={e => updateConfig('thank_you_message', e.target.value)} />
                </div>
              </div>

              {/* Email/SMS customisation */}
              <div style={{ background:'white', border:'1px solid #e4e0d8', borderRadius:16, padding:24 }}>
                <div style={{ fontWeight:600, fontSize:'0.875rem', marginBottom:14 }}>Email & SMS copy</div>
                <div style={{ marginBottom:12 }}>
                  <label style={fl}>Email subject</label>
                  <input style={fi} value={config.email_subject || ''} onChange={e => updateConfig('email_subject', e.target.value)} />
                </div>
                <div style={{ marginBottom:12 }}>
                  <label style={fl}>SMS message <span style={{ fontWeight:400, color:'#b0aca6' }}>— use {'{{first_name}}'}, {'{{business_name}}'}, {'{{survey_url}}'}</span></label>
                  <textarea style={{ ...fi, minHeight:72, resize:'vertical' }}
                    value={config.sms_body || ''} onChange={e => updateConfig('sms_body', e.target.value)} />
                </div>
              </div>

              <button onClick={handleSave} disabled={saving} style={{
                padding:'13px', borderRadius:50,
                background: saving ? '#c8c4bc' : '#f5c842', color:'#0a0a0a',
                border:'none', fontSize:'0.95rem', fontWeight:700,
                cursor: saving ? 'not-allowed' : 'pointer', fontFamily:'DM Sans,sans-serif'
              }}>
                {saving ? 'Saving...' : 'Save settings'}
              </button>
            </div>
          </div>
        )}

        {/* ── ANALYTICS TAB ── */}
        {activeTab === 'analytics' && (
          <>
            {/* NPS + stats row */}
            <div style={{ display:'grid', gridTemplateColumns:'auto 1fr 1fr 1fr 1fr', gap:14, marginBottom:18, alignItems:'stretch' }}>
              <div style={{ background:'white', border:'1.5px solid #e4e0d8', borderRadius:16, padding:'20px 28px', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', minWidth:130 }}>
                <div style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#7a7670', marginBottom:10 }}>NPS Score</div>
                <NpsGauge score={summary.npsScore} />
                <div style={{ fontSize:'0.68rem', color:'#b0aca6', marginTop:8, textAlign:'center' }}>-100 to +100 scale</div>
              </div>
              <StatCard label="Surveys sent" value={summary.totalSent ?? 0} />
              <StatCard label="Response rate" value={summary.responseRate != null ? `${summary.responseRate}%` : '—'} sub={`${summary.totalResponses ?? 0} responses`} />
              <StatCard label="Avg score" value={summary.avgScore ? parseFloat(summary.avgScore).toFixed(1) : '—'} sub="out of 10" />
              <StatCard label="Promoters" value={summary.promoters ?? 0} sub={`${summary.passives ?? 0} passive · ${summary.detractors ?? 0} detractors`} subColor="#1a6b45" />
            </div>

            {/* Score distribution + private feedback */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
              <div style={{ background:'white', border:'1px solid #e4e0d8', borderRadius:16, padding:'20px 22px' }}>
                <div style={{ fontWeight:600, fontSize:'0.875rem', marginBottom:14 }}>Score distribution</div>
                <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:80 }}>
                  {(analytics?.distribution || []).map(d => {
                    const maxCount = Math.max(...(analytics?.distribution || []).map(x => parseInt(x.count)));
                    const h = maxCount > 0 ? Math.max(8, Math.round((parseInt(d.count) / maxCount) * 80)) : 8;
                    const color = d.score >= (config?.promoter_min || 9) ? '#1a6b45'
                      : d.score >= (config?.passive_min || 7) ? '#f59e0b' : '#c0392b';
                    return (
                      <div key={d.score} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                        <div style={{ height:80, display:'flex', alignItems:'flex-end', width:'100%' }}>
                          <div style={{ width:'100%', height:`${h}px`, background:color, borderRadius:'3px 3px 0 0', transition:'height .4s ease' }} />
                        </div>
                        <div style={{ fontSize:'0.6rem', color:'#7a7670' }}>{d.score}</div>
                        <div style={{ fontSize:'0.6rem', fontWeight:600, color:'#0a0a0a' }}>{d.count}</div>
                      </div>
                    );
                  })}
                  {(!analytics?.distribution?.length) && (
                    <div style={{ flex:1, textAlign:'center', color:'#b0aca6', fontSize:'0.82rem', alignSelf:'center' }}>No data yet</div>
                  )}
                </div>
              </div>

              <div style={{ background:'white', border:'1px solid #e4e0d8', borderRadius:16, overflow:'hidden' }}>
                <div style={{ padding:'16px 18px', borderBottom:'1px solid #e4e0d8', fontWeight:600, fontSize:'0.875rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span>Private detractor feedback</span>
                  <span style={{ fontSize:'0.72rem', color:'#7a7670' }}>{analytics?.feedback?.length || 0} responses</span>
                </div>
                {(analytics?.feedback || []).length === 0 ? (
                  <div style={{ padding:'24px', textAlign:'center', color:'#b0aca6', fontSize:'0.82rem' }}>
                    No detractor feedback yet — that's a good sign! 🎉
                  </div>
                ) : (
                  <div style={{ overflowY:'auto', maxHeight:220 }}>
                    {analytics.feedback.map((f, i) => (
                      <div key={i} style={{ padding:'12px 18px', borderBottom:'.5px solid #f0eeea' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                          <span style={{ fontSize:'0.82rem', fontWeight:600 }}>{f.contact_name?.split(' ')[0] || 'Anonymous'}</span>
                          <span style={{ fontSize:'0.7rem', color:'#b0aca6' }}>
                            {new Date(f.responded_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
                          </span>
                        </div>
                        <div style={{ fontSize:'0.82rem', color:'#4a4a48', fontStyle:'italic', lineHeight:1.6 }}>
                          "{f.followup_text}"
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent responses */}
            <div style={{ background:'white', border:'1px solid #e4e0d8', borderRadius:16, overflow:'hidden' }}>
              <div style={{ padding:'16px 22px', borderBottom:'1px solid #e4e0d8', fontWeight:600, fontSize:'0.875rem' }}>Recent responses</div>
              {(analytics?.responses || []).length === 0 ? (
                <div style={{ padding:'32px', textAlign:'center', color:'#b0aca6', fontSize:'0.875rem' }}>
                  <div style={{ fontSize:'2rem', marginBottom:10 }}>📊</div>
                  No responses yet — send your first survey to get started.
                </div>
              ) : (
                analytics.responses.map((r, i) => <ResponseRow key={i} r={r} />)
              )}
            </div>
          </>
        )}

        {/* ── HISTORY TAB ── */}
        {activeTab === 'history' && (
          <div style={{ background:'white', border:'1px solid #e4e0d8', borderRadius:16, overflow:'hidden' }}>
            <div style={{ padding:'16px 22px', borderBottom:'1px solid #e4e0d8', fontWeight:600, fontSize:'0.875rem', display:'flex', justifyContent:'space-between' }}>
              <span>Send history</span>
              <span style={{ fontSize:'0.75rem', color:'#7a7670' }}>{history.length} total</span>
            </div>
            {history.length === 0 ? (
              <div style={{ padding:'40px', textAlign:'center', color:'#b0aca6', fontSize:'0.875rem' }}>No surveys sent yet.</div>
            ) : history.map((h, i) => {
              const st = h.score != null
                ? h.score_label === 'promoter' ? { bg:'#e8f5ef', color:'#1a6b45', text: `${h.score} — Promoter` }
                  : h.score_label === 'detractor' ? { bg:'#fee2e2', color:'#c0392b', text: `${h.score} — Detractor` }
                  : { bg:'#fef3cd', color:'#92690a', text: `${h.score} — Passive` }
                : h.status === 'sent' ? { bg:'#e8f0fe', color:'#1a4baa', text:'Sent' }
                : h.status === 'failed' ? { bg:'#fee2e2', color:'#c0392b', text:'Failed' }
                : { bg:'#f0eeea', color:'#7a7670', text:'Pending' };
              return (
                <div key={i} style={{ padding:'12px 22px', borderBottom:'.5px solid #f0eeea', display:'flex', gap:12, alignItems:'center' }}>
                  <div style={{ width:34, height:34, borderRadius:'50%', background:'#f0eeea', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.78rem', fontWeight:700, color:'#7a7670', flexShrink:0 }}>
                    {h.contact_name?.[0] || '?'}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontWeight:600, fontSize:'0.85rem' }}>{h.contact_name}</span>
                      <span style={{ padding:'2px 8px', borderRadius:50, fontSize:'0.68rem', fontWeight:700, background:st.bg, color:st.color }}>{st.text}</span>
                      <span style={{ fontSize:'0.72rem', color:'#b0aca6', marginLeft:'auto' }}>
                        {h.sent_at ? new Date(h.sent_at).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—'}
                      </span>
                    </div>
                    <div style={{ fontSize:'0.72rem', color:'#b0aca6', marginTop:2 }}>
                      {h.channel?.toUpperCase()} · {h.contact_email || h.contact_phone || 'No contact'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── SEND TAB ── */}
        {activeTab === 'send' && (
          <div style={{ maxWidth:480 }}>
            <div style={{ background:'white', border:'1px solid #e4e0d8', borderRadius:16, padding:28 }}>
              <div style={{ fontWeight:600, fontSize:'0.875rem', marginBottom:6 }}>Send a survey manually</div>
              <div style={{ fontSize:'0.8rem', color:'#7a7670', lineHeight:1.6, marginBottom:20 }}>
                Enter a customer or patient's details and send them the survey immediately.
                Surveys are also sent automatically from CSV imports.
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={fl}>Full name</label>
                <input style={fi} value={sendName} onChange={e => setSendName(e.target.value)} placeholder="Jane Smith" />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
                <div>
                  <label style={fl}>Email address</label>
                  <input style={fi} type="email" value={sendEmail} onChange={e => setSendEmail(e.target.value)} placeholder="jane@example.com" />
                </div>
                <div>
                  <label style={fl}>Phone (SMS)</label>
                  <input style={fi} value={sendPhone} onChange={e => setSendPhone(e.target.value)} placeholder="+1 555 000 0000" />
                </div>
              </div>
              <button
                onClick={handleManualSend}
                disabled={sending || !sendName || (!sendEmail && !sendPhone)}
                style={{
                  width:'100%', padding:'13px', borderRadius:50,
                  background: (sending || !sendName || (!sendEmail && !sendPhone)) ? '#c8c4bc' : '#f5c842',
                  color:'#0a0a0a', border:'none', fontSize:'0.95rem', fontWeight:700,
                  cursor: (sending || !sendName || (!sendEmail && !sendPhone)) ? 'not-allowed' : 'pointer',
                  fontFamily:'DM Sans, sans-serif'
                }}
              >
                {sending ? 'Sending...' : 'Send Survey →'}
              </button>

              {/* What happens next */}
              <div style={{ marginTop:20, background:'#f8f7f4', borderRadius:12, padding:'14px 16px' }}>
                <div style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'.07em', textTransform:'uppercase', color:'#7a7670', marginBottom:10 }}>What happens next</div>
                {[
                  { score:'9–10', label:'Promoter', action:'Shown: "Leave a Google review?" → direct link', color:'#1a6b45', bg:'#e8f5ef' },
                  { score:'7–8',  label:'Passive',  action:'Shown: optional follow-up question',           color:'#92690a', bg:'#fef3cd' },
                  { score:'0–6',  label:'Detractor',action:'Shown: private feedback form — never public',  color:'#c0392b', bg:'#fee2e2' },
                ].map(r => (
                  <div key={r.score} style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:8 }}>
                    <span style={{ padding:'2px 8px', borderRadius:50, fontSize:'0.68rem', fontWeight:700, background:r.bg, color:r.color, flexShrink:0 }}>{r.score}</span>
                    <div style={{ fontSize:'0.8rem', color:'#4a4a48', lineHeight:1.5 }}>{r.action}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
