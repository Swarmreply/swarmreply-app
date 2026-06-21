// ============================================
// src/components/OnboardingWizard.js
// Full-screen onboarding wizard
//
// Shown to new customers after first login
// until all 5 setup steps are completed.
// Intercepts the entire dashboard until done
// (or the customer explicitly skips).
// ============================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;

// Step definitions
const STEPS = [
  {
    n:       1,
    icon:    '🏢',
    title:   'Add your business',
    sub:     'Tell us where your reputation lives',
    detail:  'Enter your business name, industry, and the email to use for alerts. This takes 60 seconds.',
    action:  'Add business',
    col:     'ob_business_created'
  },
  {
    n:       2,
    icon:    '🔍',
    title:   'Connect Google Business Profile',
    sub:     'Where your reviews actually live',
    detail:  'One click. We\'ll open Google\'s login screen and ask for permission to read and reply to your reviews. Takes under 2 minutes.',
    action:  'Connect Google',
    col:     'ob_google_connected'
  },
  {
    n:       3,
    icon:    '✦',
    title:   'Set your AI reply tone',
    sub:     'Make every reply sound like you',
    detail:  'Choose how your replies should sound — warm and friendly, professional, casual, or empathetic. You can always change this later.',
    action:  'Set tone',
    col:     'ob_tone_configured'
  },
  {
    n:       4,
    icon:    '↑',
    title:   'Send your first review request',
    sub:     'Start collecting more reviews today',
    detail:  'Enter a customer\'s name and email or phone number. We\'ll send them a beautifully branded review request right now.',
    action:  'Send request',
    col:     'ob_review_request_sent'
  },
  {
    n:       5,
    icon:    '📊',
    title:   'Set up your NPS survey',
    sub:     'Protect your rating before bad reviews post',
    detail:  'After every visit, customers rate their experience and are invited to leave a public review. Anyone unhappy can also tell you privately first, so you can make it right. Add your review link to activate.',
    action:  'Activate surveys',
    col:     'ob_survey_configured'
  }
];

// Tone options for step 3
const TONES = [
  { id: 'warm',        label: 'Warm & Friendly',      desc: 'Personal, caring, uses customer\'s name' },
  { id: 'professional',label: 'Professional',          desc: 'Polished, clear, respectful' },
  { id: 'casual',      label: 'Casual',                desc: 'Relaxed, conversational, short sentences' },
  { id: 'empathetic',  label: 'Empathetic',            desc: 'Acknowledges feelings first, patient' }
];

export default function OnboardingWizard({ customer, onComplete }) {
  const router = useRouter();
  const [status, setStatus]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  // Step 1 form state
  const [bizName, setBizName]     = useState(customer?.name || '');
  const [bizType, setBizType]     = useState('restaurant');
  const [alertEmail, setAlertEmail] = useState(customer?.email || '');

  // Step 3 form state
  const [tone, setTone]           = useState('warm');
  const [alwaysInclude, setAlwaysInclude] = useState('');
  const [neverInclude, setNeverInclude]   = useState('');

  // Step 4 form state
  const [reqName, setReqName]     = useState('');
  const [reqPhone, setReqPhone]   = useState('');
  const [reqEmail, setReqEmail]   = useState('');

  // Step 5 form state
  const [googleLink, setGoogleLink] = useState('');

  useEffect(() => { loadStatus(); }, []);

  function authHeaders() {
    const t = localStorage.getItem('swarmreply_token');
    return t ? { Authorization: `Bearer ${t}` } : {};
  }

  async function loadStatus(advance) {
    try {
      const res = await axios.get(`${API}/onboarding/status`, { headers: authHeaders() });
      const ob = res.data.onboarding;
      setStatus(ob);
      if (advance) setActiveStep(ob.currentStep && ob.currentStep <= 5 ? ob.currentStep : 5);
      if (ob.completed) setTimeout(() => onComplete(), 600);
      return ob;
    } catch (err) {
      console.error('Failed to load onboarding status', err);
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function completeStep(stepNum) {
    // Option A: steps are driven off real data. After doing the real work,
    // re-check status; if this step now registers as done, advance.
    setSaving(true);
    try {
      const ob = await loadStatus();
      if (ob?.completed) {
        setTimeout(() => onComplete(), 600);
      } else {
        // Advance regardless so the user can continue; status reflects real state
        setActiveStep(Math.min(stepNum + 1, 5));
      }
    } finally {
      setSaving(false);
    }
  }

  function skipAll() {
    // Persist skip decision so wizard never auto-shows again on this device
    localStorage.setItem('onboarding_skipped', '1');
    onComplete();
  }

  // ── STEP ACTIONS ────────────────────────────────────────────────────────────

  async function handleStep1() {
    if (!bizName.trim()) return;
    setSaving(true);
    try {
      await axios.post(`${API}/locations`, {
        customerId: customer?.id,
        businessName: bizName.trim(),
        businessType: bizType,
        platform: 'google',
        contactEmail: alertEmail.trim(),
      }, { headers: authHeaders() });
    } catch (err) {
      console.error('Create location failed', err.response?.data || err.message);
    }
    await completeStep(1);
  }

  async function handleStep2() {
    // Redirect to Google OAuth. Browser redirects can't carry an auth header,
    // so pass the token as a query param (backend accepts ?token= fallback).
    try {
      const token = localStorage.getItem('swarmreply_token');
      const locRes = await axios.get(`${API}/locations?customerId=${customer?.id}`, { headers: authHeaders() });
      const locationId = locRes.data.locations?.[0]?.id;
      if (locationId) {
        window.location.href = `${API}/auth/google?locationId=${locationId}&token=${token}`;
      } else {
        alert('Please add your business first (step 1).');
      }
    } catch (err) {
      console.error('Google connect failed', err.response?.data || err.message);
    }
  }

  async function handleStep3() {
    setSaving(true);
    try {
      const locRes = await axios.get(`${API}/locations?customerId=${customer?.id}`, { headers: authHeaders() });
      const locationId = locRes.data.locations?.[0]?.id;
      if (locationId) {
        await axios.put(`${API}/locations/${locationId}/settings`, {
          tone, alwaysInclude, neverInclude,
        }, { headers: authHeaders() });
      }
    } catch (err) {
      console.error('Save tone failed', err.response?.data || err.message);
    }
    await completeStep(3);
  }

  async function handleStep4() {
    if (!reqEmail.trim()) return;  // email required; name/phone optional
    setSaving(true);
    try {
      await axios.post(`${API}/review-requests/send`, {
        name: reqName, email: reqEmail, phone: reqPhone,
      }, { headers: authHeaders() });
    } catch (err) {
      console.error('Send request failed', err.response?.data || err.message);
    }
    await completeStep(4);
  }

  async function handleStep5() {
    if (!googleLink.trim()) return;
    setSaving(true);
    try {
      const locRes = await axios.get(`${API}/locations?customerId=${customer?.id}`, { headers: authHeaders() });
      const locationId = locRes.data.locations?.[0]?.id;
      if (locationId) {
        await axios.put(`${API}/locations/${locationId}/review-urls`, {
          googleReviewUrl: googleLink.trim(),
        }, { headers: authHeaders() });
      }
      // Persist a default template so surveys are 'configured'
      await axios.put(`${API}/templates`, { template: { platforms: ['google'] } }, { headers: authHeaders() });
    } catch (err) {
      console.error('Activate surveys failed', err.response?.data || err.message);
    }
    await completeStep(5);
  }

  const stepActions = { 1: handleStep1, 2: handleStep2, 3: handleStep3, 4: handleStep4, 5: handleStep5 };

  if (loading) return (
    <div style={overlay}>
      <div style={{ textAlign: 'center', color: '#fff' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🐝</div>
        <div style={{ fontSize: '.9rem', opacity: .6 }}>Loading your setup…</div>
      </div>
    </div>
  );

  const completedCount = status?.completedCount || 0;
  const totalSteps     = 5;
  const pct            = Math.round((completedCount / totalSteps) * 100);

  return (
    <div style={overlay}>
      <div style={wizardWrap}>

        {/* Skip confirm */}
        {showSkipConfirm && (
          <div style={skipOverlay}>
            <div style={skipCard}>
              <div style={{ fontSize: '1.8rem', marginBottom: 12 }}>⚠️</div>
              <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.2rem', fontWeight: 700, marginBottom: 10 }}>
                Skip setup?
              </h3>
              <p style={{ fontSize: '.875rem', color: 'var(--taupe, #7a7670)', marginBottom: 20, lineHeight: 1.65 }}>
                You can always come back to these steps from your dashboard. Some features won't work until they're set up.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowSkipConfirm(false)} style={btnOutline}>
                  Keep setting up
                </button>
                <button onClick={skipAll} style={btnRed}>
                  Skip for now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Left panel — progress */}
        <div style={leftPanel}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
              <span style={{ fontSize: '1.3rem' }}>🐝</span>
              <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.1rem', fontWeight: 900, color: '#fff' }}>
                SwarmReply
              </span>
            </div>
            <div style={{ fontSize: '.78rem', color: 'rgba(255,255,255,.4)', lineHeight: 1.5 }}>
              Let's get your swarm live
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.5)', fontWeight: 600 }}>
                {completedCount} of {totalSteps} steps complete
              </span>
              <span style={{ fontSize: '.72rem', color: 'var(--honey, #f5c842)', fontWeight: 700 }}>{pct}%</span>
            </div>
            <div style={{ height: 5, background: 'rgba(255,255,255,.1)', borderRadius: 50, overflow: 'hidden' }}>
              <div style={{
                width: `${pct}%`, height: '100%',
                background: 'var(--honey, #f5c842)', borderRadius: 50,
                transition: 'width .5s ease'
              }} />
            </div>
          </div>

          {/* Step list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {STEPS.map(s => {
              const done    = (Array.isArray(status?.steps) ? status.steps : []).find(st => st.step === s.n)?.completed;
              const current = s.n === activeStep;
              return (
                <div
                  key={s.n}
                  onClick={() => !saving && setActiveStep(s.n)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 14px', borderRadius: 11, cursor: 'pointer',
                    background: current ? 'rgba(255,255,255,.1)' : 'transparent',
                    transition: 'background .15s'
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '.75rem', fontWeight: 700,
                    background: done ? 'var(--honey, #f5c842)' : current ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.06)',
                    color: done ? 'var(--ink, #0a0a0a)' : current ? '#fff' : 'rgba(255,255,255,.35)'
                  }}>
                    {done ? '✓' : s.n}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '.82rem', fontWeight: current ? 600 : 400,
                      color: done ? 'rgba(255,255,255,.5)' : current ? '#fff' : 'rgba(255,255,255,.4)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>
                      {s.title}
                    </div>
                  </div>
                  {done && (
                    <div style={{ fontSize: '.7rem', color: 'var(--honey, #f5c842)', fontWeight: 700, flexShrink: 0 }}>Done</div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 'auto', paddingTop: 32 }}>
            <button
              onClick={() => setShowSkipConfirm(true)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer',
                fontSize: '.75rem', color: 'rgba(255,255,255,.3)',
                fontFamily: 'inherit', padding: 0 }}
            >
              Skip setup for now
            </button>
          </div>
        </div>

        {/* Right panel — step content */}
        <div style={rightPanel}>
          {STEPS.filter(s => s.n === activeStep).map(step => (
            <div key={step.n} style={{ animation: 'fadeSlide .25s ease both' }}>

              {/* Step header */}
              <div style={{ marginBottom: 28 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: 'var(--cream, #f8f7f4)', border: '1.5px solid var(--line, #e4e0d8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.4rem', marginBottom: 16
                }}>
                  {step.icon}
                </div>
                <div style={{ fontSize: '.7rem', fontWeight: 700, letterSpacing: '.1em',
                  textTransform: 'uppercase', color: 'var(--taupe, #7a7670)', marginBottom: 5 }}>
                  Step {step.n} of {totalSteps}
                </div>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.6rem',
                  fontWeight: 900, color: 'var(--ink, #0a0a0a)', marginBottom: 8, letterSpacing: '-.02em' }}>
                  {step.title}
                </h2>
                <p style={{ fontSize: '.9rem', color: 'var(--taupe, #7a7670)', lineHeight: 1.7 }}>
                  {step.detail}
                </p>
              </div>

              {/* Step 1: Business details */}
              {step.n === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={fieldLabel}>Business name *</label>
                    <input value={bizName} onChange={e => setBizName(e.target.value)}
                      style={fieldInput} placeholder="e.g. Bella's Kitchen" />
                  </div>
                  <div>
                    <label style={fieldLabel}>Industry *</label>
                    <select value={bizType} onChange={e => setBizType(e.target.value)} style={fieldInput}>
                      <option value="restaurant">Restaurant / Food & Beverage</option>
                      <option value="dental">Dental Practice</option>
                      <option value="medical">Medical / Healthcare</option>
                      <option value="salon">Salon / Beauty / Med Spa</option>
                      <option value="auto">Auto Shop / Dealership</option>
                      <option value="gym">Gym / Fitness</option>
                      <option value="law">Law Firm</option>
                      <option value="home">Home Services</option>
                      <option value="retail">Retail</option>
                      <option value="hotel">Hotel / Hospitality</option>
                      <option value="vet">Veterinary Clinic</option>
                      <option value="agency">Marketing Agency</option>
                    </select>
                  </div>
                  <div>
                    <label style={fieldLabel}>Alert email</label>
                    <input value={alertEmail} onChange={e => setAlertEmail(e.target.value)}
                      style={fieldInput} type="email" placeholder="you@yourbusiness.com" />
                  </div>
                </div>
              )}

              {/* Step 2: Connect Google */}
              {step.n === 2 && (
                <div>
                  <div style={{
                    background: 'var(--cream, #f8f7f4)', border: '1.5px solid var(--line, #e4e0d8)',
                    borderRadius: 14, padding: '20px 22px', marginBottom: 16
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {[
                        { icon: '✓', text: 'SwarmReply reads your Google reviews automatically' },
                        { icon: '✓', text: 'AI replies are posted within hours — in your voice' },
                        { icon: '✓', text: 'Your login credentials are never stored — OAuth only' },
                        { icon: '✓', text: 'Disconnect any time from your Settings page' }
                      ].map(item => (
                        <div key={item.text} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <span style={{ color: 'var(--green, #1a6b45)', fontWeight: 700, flexShrink: 0 }}>{item.icon}</span>
                          <span style={{ fontSize: '.875rem', color: 'var(--tx-2, #4a4a48)', lineHeight: 1.5 }}>{item.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ fontSize: '.78rem', color: 'var(--taupe, #7a7670)', lineHeight: 1.6, marginBottom: 4 }}>
                    You'll be redirected to Google's login screen and asked to approve access.
                    You'll come back here automatically when it's done.
                  </div>
                </div>
              )}

              {/* Step 3: Tone */}
              {step.n === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {TONES.map(t => (
                    <div
                      key={t.id}
                      onClick={() => setTone(t.id)}
                      style={{
                        border: tone === t.id ? '2px solid var(--ink, #0a0a0a)' : '1.5px solid var(--line, #e4e0d8)',
                        borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                        background: tone === t.id ? 'var(--cream, #f8f7f4)' : '#fff',
                        transition: 'all .15s',
                        display: 'flex', alignItems: 'center', gap: 12
                      }}
                    >
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                        border: tone === t.id ? '6px solid var(--ink, #0a0a0a)' : '2px solid var(--line, #e4e0d8)',
                        transition: 'all .15s'
                      }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 2 }}>{t.label}</div>
                        <div style={{ fontSize: '.78rem', color: 'var(--taupe, #7a7670)' }}>{t.desc}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: 4 }}>
                    <label style={fieldLabel}>Things to always include (optional)</label>
                    <input value={alwaysInclude} onChange={e => setAlwaysInclude(e.target.value)}
                      style={fieldInput} placeholder="e.g. 'our family', 'handmade', your manager's name" />
                  </div>
                </div>
              )}

              {/* Step 4: Review request */}
              {step.n === 4 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{
                    background: 'var(--cream, #f8f7f4)', border: '1.5px solid var(--line, #e4e0d8)',
                    borderRadius: 12, padding: '14px 16px', marginBottom: 4,
                    fontSize: '.82rem', color: 'var(--taupe, #7a7670)', lineHeight: 1.65
                  }}>
                    💡 Think of your last 5-star customer. Send them a request right now — you'll probably hear back within an hour.
                  </div>
                  <div>
                    <label style={fieldLabel}>Customer name *</label>
                    <input value={reqName} onChange={e => setReqName(e.target.value)}
                      style={fieldInput} placeholder="Sarah M." />
                  </div>
                  <div className="m-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={fieldLabel}>Email</label>
                      <input value={reqEmail} onChange={e => setReqEmail(e.target.value)}
                        style={fieldInput} type="email" placeholder="sarah@example.com" />
                    </div>
                    <div>
                      <label style={fieldLabel}>Phone (SMS)</label>
                      <input value={reqPhone} onChange={e => setReqPhone(e.target.value)}
                        style={fieldInput} placeholder="+1 555 000 0000" />
                    </div>
                  </div>
                  <div style={{ fontSize: '.78rem', color: 'var(--taupe, #7a7670)' }}>
                    Need at least one of email or phone.
                  </div>
                </div>
              )}

              {/* Step 5: NPS survey */}
              {step.n === 5 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{
                    background: 'var(--green-bg, #e8f5ef)', border: '1px solid #bbf7d0',
                    borderRadius: 12, padding: '14px 16px', marginBottom: 4
                  }}>
                    <div style={{ fontWeight: 600, fontSize: '.875rem', color: 'var(--green, #1a6b45)', marginBottom: 6 }}>
                      How it works
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {[
                        ['Score 9–10', 'Quick thank-you, then invited to review'],
                        ['Score 7–8',  'A follow-up question, then invited to review'],
                        ['Score 1–6',  'Private feedback first, then invited to review']
                      ].map(([score, desc]) => (
                        <div key={score} style={{ display: 'flex', gap: 8, fontSize: '.8rem' }}>
                          <span style={{ fontWeight: 700, color: 'var(--green, #1a6b45)', flexShrink: 0 }}>{score}</span>
                          <span style={{ color: 'var(--tx-2, #4a4a48)' }}>{desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={fieldLabel}>Your Google review link *</label>
                    <input value={googleLink} onChange={e => setGoogleLink(e.target.value)}
                      style={fieldInput} placeholder="https://g.page/r/YOUR_ID/review" />
                    <div style={{ fontSize: '.72rem', color: 'var(--taupe, #7a7670)', marginTop: 4 }}>
                      Find it in Google Business Profile → Get more reviews → Share review form
                    </div>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 10, marginTop: 24, alignItems: 'center' }}>
                <button
                  onClick={stepActions[step.n]}
                  disabled={saving}
                  style={btnPrimary}
                >
                  {saving ? 'Saving…' : step.action + ' →'}
                </button>
                {step.n < totalSteps && (
                  <button
                    onClick={() => completeStep(step.n)}
                    disabled={saving}
                    style={{ ...btnOutline, fontSize: '.8rem' }}
                  >
                    Skip this step
                  </button>
                )}
              </div>

              {/* Already done state */}
              {(Array.isArray(status?.steps) ? status.steps : []).find(s => s.step === step.n)?.completed && (
                <div style={{
                  marginTop: 14, display: 'flex', alignItems: 'center', gap: 7,
                  fontSize: '.78rem', color: 'var(--green, #1a6b45)', fontWeight: 600
                }}>
                  <span>✓</span> This step is complete
                  {step.n < totalSteps && (
                    <button onClick={() => setActiveStep(step.n + 1)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--ink, #0a0a0a)', fontWeight: 700, fontSize: '.78rem',
                        fontFamily: 'inherit', marginLeft: 6 }}>
                      Next step →
                    </button>
                  )}
                </div>
              )}

            </div>
          ))}
        </div>

      </div>

      <style>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateX(10px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────

const overlay = {
  position: 'fixed', inset: 0,
  background: 'rgba(10,10,10,.92)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 999, padding: 20,
  backdropFilter: 'blur(4px)'
};

const wizardWrap = {
  background: '#fff', borderRadius: 22,
  overflow: 'hidden', display: 'flex',
  width: '100%', maxWidth: 860,
  maxHeight: 'calc(100vh - 40px)',
  boxShadow: '0 32px 100px rgba(0,0,0,.4)'
};

const leftPanel = {
  width: 240, flexShrink: 0,
  background: 'var(--ink, #0a0a0a)',
  padding: '28px 20px',
  display: 'flex', flexDirection: 'column',
  overflowY: 'auto'
};

const rightPanel = {
  flex: 1, padding: '36px 40px',
  overflowY: 'auto', background: '#fff'
};

const skipOverlay = {
  position: 'absolute', inset: 0,
  background: 'rgba(10,10,10,.6)',
  display: 'flex', alignItems: 'center',
  justifyContent: 'center', zIndex: 10,
  borderRadius: 22
};

const skipCard = {
  background: '#fff', borderRadius: 18,
  padding: '28px 32px', maxWidth: 360,
  textAlign: 'center'
};

const fieldLabel = {
  display: 'block', fontSize: '.67rem', fontWeight: 700,
  letterSpacing: '.08em', textTransform: 'uppercase',
  color: 'var(--taupe, #7a7670)', marginBottom: 5
};

const fieldInput = {
  width: '100%', padding: '10px 13px',
  border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 10,
  fontSize: '.9rem', color: 'var(--ink, #0a0a0a)', outline: 'none',
  fontFamily: 'inherit', background: '#fff',
  transition: 'border-color .15s', boxSizing: 'border-box',
  appearance: 'none'
};

const btnPrimary = {
  padding: '11px 24px', borderRadius: 50,
  background: 'var(--ink, #0a0a0a)', color: '#fff',
  border: 'none', cursor: 'pointer',
  fontSize: '.875rem', fontWeight: 700,
  fontFamily: 'inherit', transition: 'all .15s'
};

const btnOutline = {
  padding: '10px 18px', borderRadius: 50,
  background: 'transparent', color: 'var(--taupe, #7a7670)',
  border: '1.5px solid var(--line, #e4e0d8)', cursor: 'pointer',
  fontSize: '.82rem', fontWeight: 600,
  fontFamily: 'inherit', transition: 'all .15s'
};

const btnRed = {
  padding: '10px 18px', borderRadius: 50,
  background: 'var(--danger-bg, #fee2e2)', color: 'var(--danger, #c0392b)',
  border: '1px solid #fecaca', cursor: 'pointer',
  fontSize: '.82rem', fontWeight: 600,
  fontFamily: 'inherit'
};
