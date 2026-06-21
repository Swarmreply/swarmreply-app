// ============================================
// src/pages/onboarding.js
// Full-page setup wizard. Styled to mirror the public /signup page
// (off-white canvas + faint decorative layer, Playfair + DM Sans, circular
// stepper, gold pill buttons, uppercase labels) and laid out like the Request
// Template builder: a steps list on the left, the active step's panel on the
// right. Progress is by steps completed — no points.
// ============================================

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';
import { STEP_PANELS } from '../components/OnboardingPanels';
import { useAuth } from '../hooks/useAuth';

const API = process.env.NEXT_PUBLIC_API_URL;
function authHeaders() {
  const t = typeof window !== 'undefined' ? localStorage.getItem('swarmreply_token') : null;
  return t ? { Authorization: `Bearer ${t}` } : {};
}

const STEP_DEST = {
  business_details:    '/dashboard/settings',
  connect_google:      '/dashboard/integrations?connect=google',
  review_link:         '/dashboard/settings',
  test_request:        '/dashboard/grow',
  listings_sync:       '/dashboard/listings',
  review_platforms:    '/dashboard/settings',
  keywords:            '/dashboard/rank-tracking',
  ai_criteria:         '/dashboard/ai-visibility',
  connect_integration: '/dashboard/integrations',
  auto_reply_config:   '/dashboard/settings',
  social_posting:      '/dashboard/campaigns',
};

const MILESTONE_ORDER = ['activate', 'optimize', 'pro'];
const MILESTONE_HEADINGS = {
  activate: { title: 'Activate', blurb: 'The essentials to start collecting and managing reviews.' },
  optimize: { title: 'Optimize', blurb: 'Get found in local search and AI assistants.' },
  pro:      { title: 'Pro',      blurb: 'Automate and connect the rest of your stack.' },
};

// Compact count-based ring for the header.
function HeaderRing({ pct, size = 92 }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line, #e4e0d8)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--honey, #f5c842)" strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset .7s cubic-bezier(.2,.8,.2,1)' }}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle"
        style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.35rem', fontWeight: 900, fill: 'var(--ink, #0a0a0a)' }}>
        {pct}%
      </text>
    </svg>
  );
}

// Left-rail step row with the signup-style circular indicator.
function StepRow({ step, n, selected, onSelect }) {
  const { completed, locked } = step;
  const clickable = !locked;
  const circleBg = completed ? 'var(--green, #1a6b45)' : selected ? 'var(--ink, #0a0a0a)' : '#fff';
  const circleColor = completed || selected ? '#fff' : 'var(--taupe, #7a7670)';
  const circleBorder = completed ? 'var(--green, #1a6b45)' : selected ? 'var(--ink, #0a0a0a)' : 'var(--line, #e4e0d8)';
  return (
    <button
      onClick={() => clickable && onSelect(step.id)}
      disabled={!clickable}
      style={{
        width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12,
        background: selected ? '#fff' : 'transparent',
        border: selected ? '1.5px solid var(--ink, #0a0a0a)' : '1.5px solid transparent',
        borderRadius: 14, padding: '11px 13px', cursor: clickable ? 'pointer' : 'not-allowed',
        opacity: locked ? 0.55 : 1, fontFamily: 'inherit', transition: 'all .15s',
        boxShadow: selected ? '0 2px 14px rgba(0,0,0,.06)' : 'none',
      }}>
      <span style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: circleBg, color: circleColor, border: `1.5px solid ${circleBorder}`,
        fontSize: '.74rem', fontWeight: 700,
      }}>
        {completed ? '✓' : locked ? '🔒' : n}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: '.86rem', fontWeight: 600, color: 'var(--tx, #1a1a18)' }}>{step.title}</span>
        <span style={{ display: 'block', fontSize: '.72rem', color: 'var(--taupe, #7a7670)', marginTop: 1 }}>
          {completed ? 'Done' : locked ? 'Locked' : step.estMinutes ? `~${step.estMinutes} min` : 'Ready'}
        </span>
      </span>
    </button>
  );
}

export default function Onboarding() {
  const router = useRouter();
  const { customer, loading } = useAuth();
  const [ob, setOb] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [celebrate, setCelebrate] = useState(false);
  const prevActivated = useRef(null);
  // Subscription activation gate: 'checking' | 'active' | 'polling' | 'failed'.
  const [acct, setAcct] = useState('checking');

  useEffect(() => { if (!loading && !customer) router.push('/login'); }, [customer, loading, router]);

  useEffect(() => {
    if (customer) load();
    const onFocus = () => customer && load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer]);

  // Subscription activation gate. A brand-new signup can land here a beat before
  // the payment webhook flips the account to 'active', so poll the real account
  // status and hold on a brief "finalizing" screen until it activates. A
  // never-paid 'pending' account that reaches here times out into a prompt to
  // finish checkout — so the product is never reachable without an active plan.
  useEffect(() => {
    if (!customer) return;
    let cancelled = false, tries = 0, timer = null;
    async function check() {
      try {
        const res = await axios.get(`${API}/billing/health`, { headers: authHeaders() });
        const status = res.data && res.data.billing && res.data.billing.status;
        if (cancelled) return;
        if (status && status !== 'pending') { setAcct('active'); return; }
        tries += 1;
        if (tries >= 8) { setAcct('failed'); return; }   // ~17s of polling
        setAcct('polling');
        timer = setTimeout(check, 2200);
      } catch (e) {
        if (cancelled) return;
        tries += 1;
        if (tries >= 3) { setAcct('active'); return; }    // health check itself failing — don't hard-block
        timer = setTimeout(check, 2200);
      }
    }
    check();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer]);

  async function load() {
    try {
      const res = await axios.get(`${API}/onboarding/status`, { headers: authHeaders() });
      const next = res.data.onboarding;
      setOb(next);
      // Default selection: the next best step (first time only).
      setSelectedId(prev => prev || next.nextStepId || next.steps.find(s => !s.completed && !s.locked)?.id || next.steps[0]?.id);
      // "Activated" is a real, meaningful milestone — keep the moment.
      if (prevActivated.current === false && next.activated === true) {
        setCelebrate(true);
        setTimeout(() => setCelebrate(false), 4200);
      }
      prevActivated.current = next.activated;
    } catch (e) { /* leave as-is */ }
  }

  // Called when a step's panel reports completion: refresh, then auto-advance
  // the selection to the next incomplete, unlocked step in the track.
  async function handleStepDone(doneId) {
    try {
      const res = await axios.get(`${API}/onboarding/status`, { headers: authHeaders() });
      const next = res.data.onboarding;
      setOb(next);
      const steps = Array.isArray(next.steps) ? next.steps : [];
      // Prefer the next incomplete, unlocked step. If there is none (e.g. the user
      // skipped the last optional step), fall back to the next unlocked step after
      // this one so the wizard moves forward instead of stalling on the same panel.
      let advanceTo = next.nextStepId || steps.find(s => !s.completed && !s.locked)?.id;
      if (!advanceTo || advanceTo === doneId) {
        const idx = steps.findIndex(s => s.id === doneId);
        advanceTo = idx >= 0 ? steps.slice(idx + 1).find(s => !s.locked)?.id : null;
      }
      if (advanceTo && advanceTo !== doneId) {
        setSelectedId(advanceTo);
      } else {
        // Nothing left to advance to — the final onboarding step is done.
        // Send the customer to their Home dashboard.
        router.push('/dashboard');
        return;
      }
      if (prevActivated.current === false && next.activated === true) {
        setCelebrate(true);
        setTimeout(() => setCelebrate(false), 4200);
      }
      prevActivated.current = next.activated;
    } catch (e) { /* leave as-is */ }
  }

  const gateScreen = (node) => (
    <div style={{ minHeight: '100vh', background: 'var(--cream, #f8f7f4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily: "'DM Sans', system-ui, sans-serif", padding: 24 }}>{node}</div>
  );

  if (loading || !customer || acct === 'checking') {
    return gateScreen(<span style={{ color: 'var(--taupe, #7a7670)' }}>Loading your setup…</span>);
  }
  if (acct === 'polling') {
    return gateScreen(
      <>
        <div style={{ width: 42, height: 42, border: '3px solid var(--line, #e4e0d8)', borderTopColor: 'var(--honey, #f5c842)', borderRadius: '50%', animation: 'srspin .8s linear infinite', marginBottom: 18 }} />
        <div style={{ fontFamily: '"Playfair Display", serif', fontWeight: 700, fontSize: '1.3rem', color: 'var(--ink, #0a0a0a)', marginBottom: 6 }}>Finalizing your subscription…</div>
        <div style={{ fontSize: '.88rem', color: 'var(--taupe, #7a7670)' }}>This only takes a moment.</div>
        <style>{'@keyframes srspin{to{transform:rotate(360deg)}}'}</style>
      </>
    );
  }
  if (acct === 'failed') {
    return gateScreen(
      <div style={{ maxWidth: 420 }}>
        <div style={{ fontFamily: '"Playfair Display", serif', fontWeight: 700, fontSize: '1.4rem', color: 'var(--ink, #0a0a0a)', marginBottom: 10 }}>Let's finish setting up your plan</div>
        <p style={{ fontSize: '.9rem', color: 'var(--taupe, #7a7670)', lineHeight: 1.6, marginBottom: 22 }}>
          We couldn't confirm an active subscription on your account yet. If you just paid, give it a moment and refresh. Otherwise, complete checkout to get started.
        </p>
        <button onClick={() => window.location.reload()} style={{ display: 'block', width: '100%', padding: 13, borderRadius: 50, background: 'var(--ink, #0a0a0a)', color: '#fff', border: 'none', fontWeight: 600, fontSize: '.92rem', cursor: 'pointer', marginBottom: 10, fontFamily: 'inherit' }}>Refresh</button>
        <a href="https://swarmreply.com/signup.html" style={{ display: 'block', width: '100%', padding: 13, borderRadius: 50, background: '#fff', color: 'var(--ink, #0a0a0a)', border: '1.5px solid var(--line, #e4e0d8)', fontWeight: 600, fontSize: '.92rem', textDecoration: 'none', boxSizing: 'border-box' }}>Complete checkout &rarr;</a>
        <p style={{ fontSize: '.78rem', color: '#a39e95', marginTop: 16 }}>Need help? <a href="mailto:hello@swarmreply.com" style={{ color: 'var(--ink, #0a0a0a)' }}>hello@swarmreply.com</a></p>
      </div>
    );
  }
  if (!ob) {
    return gateScreen(<span style={{ color: 'var(--taupe, #7a7670)' }}>Loading your setup…</span>);
  }

  // Sequential numbering across steps in display order.
  const ordered = MILESTONE_ORDER.flatMap(m => ob.steps.filter(s => s.milestone === m));
  const numberOf = {}; ordered.forEach((s, i) => { numberOf[s.id] = i + 1; });
  const titleById = (id) => ob.steps.find(s => s.id === id)?.title;
  const selected = ob.steps.find(s => s.id === selectedId) || null;
  const Panel = selected ? STEP_PANELS[selected.id] : null;
  const lockedDep = selected && selected.locked
    ? titleById(selected.dependsOn?.find(d => !ob.steps.find(x => x.id === d)?.completed))
    : null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream, #f8f7f4)', color: 'var(--tx, #1a1a18)', fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif" }}>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,400&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        .ob-bg{position:fixed;inset:0;pointer-events:none;z-index:0;
          background:
            radial-gradient(420px 420px at 12% 8%, rgba(245,200,66,.10), transparent 70%),
            radial-gradient(520px 520px at 92% 0%, rgba(26,107,69,.06), transparent 70%),
            radial-gradient(640px 640px at 78% 100%, rgba(245,200,66,.07), transparent 70%);}
        .ob-wrap{position:relative;z-index:1}
        .ob-grid{display:grid;grid-template-columns:330px 1fr;gap:22px;
          max-width:1040px;margin:0 auto;padding:8px 24px 70px}
        .ob-pane-input:focus{border-color:var(--ink, #0a0a0a)}
        @media (max-width:820px){.ob-grid{grid-template-columns:1fr}}
      `}</style>

      <div className="ob-bg" />

      <div className="ob-wrap">
        {/* Nav — mirrors signup */}
        <nav style={{
          background: '#fff', borderBottom: '1px solid var(--line, #e4e0d8)', height: 62, padding: '0 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 100,
        }}>
          <span style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.55rem', fontWeight: 900, color: 'var(--ink, #0a0a0a)', lineHeight: 1, letterSpacing: '-.02em' }}>
            SwarmReply
          </span>
          <button onClick={() => router.push('/dashboard')} style={{
            background: 'transparent', border: 'none', color: 'var(--taupe, #7a7670)', cursor: 'pointer',
            fontSize: '.82rem', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            Go to dashboard →
          </button>
        </nav>

        {/* Header */}
        <header style={{ maxWidth: 1040, margin: '0 auto', padding: '40px 24px 8px', display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
          <HeaderRing pct={ob.pct} />
          <div style={{ flex: 1, minWidth: 260 }}>
            <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2rem', fontWeight: 900, color: 'var(--ink, #0a0a0a)', margin: 0, lineHeight: 1.1 }}>
              {ob.activated
                ? <>You&rsquo;re live — <em style={{ fontStyle: 'italic', color: 'var(--amber, #d4a515)' }}>let&rsquo;s optimize.</em></>
                : <>Let&rsquo;s set up <em style={{ fontStyle: 'italic', color: 'var(--amber, #d4a515)' }}>your swarm.</em></>}
            </h1>
            <p style={{ fontSize: '.92rem', color: 'var(--taupe, #7a7670)', margin: '8px 0 14px', lineHeight: 1.55 }}>
              {ob.activated
                ? 'Your essentials are done. These next steps help customers find you in local search and AI.'
                : `Finish the essentials to start collecting reviews${ob.minutesLeft > 0 ? ` — about ${ob.minutesLeft} minutes with your info handy.` : '.'}`}
            </p>
            <div style={{ display: 'flex', gap: 9, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--tx, #1a1a18)' }}>
                {ob.completedCount} of {ob.totalSteps} steps complete
              </span>
              <span style={{ color: '#d8d3ca' }}>·</span>
              {MILESTONE_ORDER.map(m => {
                const reached = MILESTONE_ORDER.indexOf(ob.milestoneTier) >= MILESTONE_ORDER.indexOf(m);
                return (
                  <span key={m} style={{
                    fontSize: '.68rem', fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase',
                    color: reached ? 'var(--green, #1a6b45)' : 'var(--mute, #a8a39a)',
                    background: reached ? 'var(--green-bg, #e8f5ef)' : 'var(--cream-2, #f0eeea)', borderRadius: 50, padding: '4px 11px',
                  }}>
                    {MILESTONE_HEADINGS[m].title}{reached ? ' ✓' : ''}
                  </span>
                );
              })}
            </div>
          </div>
        </header>

        {/* Two-pane: steps list (left) + active step (right) */}
        <div className="ob-grid">
          {/* LEFT: steps list */}
          <aside style={{
            background: '#fff', border: '1px solid var(--line, #e4e0d8)', borderRadius: 22,
            boxShadow: '0 4px 32px rgba(0,0,0,.06)', padding: '14px 12px', alignSelf: 'start',
          }}>
            {MILESTONE_ORDER.map(m => {
              const steps = ob.steps.filter(s => s.milestone === m);
              if (!steps.length) return null;
              const done = steps.filter(s => s.completed).length;
              return (
                <div key={m} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '8px 13px 4px' }}>
                    <span style={{ fontSize: '.66rem', fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--taupe, #7a7670)' }}>
                      {MILESTONE_HEADINGS[m].title}
                    </span>
                    <span style={{ fontSize: '.7rem', color: 'var(--mute, #a8a39a)', fontWeight: 600 }}>{done}/{steps.length}</span>
                  </div>
                  {steps.map(s => (
                    <StepRow key={s.id} step={s} n={numberOf[s.id]} selected={s.id === selectedId} onSelect={setSelectedId} />
                  ))}
                </div>
              );
            })}
          </aside>

          {/* RIGHT: active step panel */}
          <section style={{
            background: '#fff', border: '1px solid var(--line, #e4e0d8)', borderRadius: 22,
            boxShadow: '0 4px 32px rgba(0,0,0,.06)', padding: '32px 34px', alignSelf: 'start', minHeight: 280,
          }}>
            {!selected ? (
              <p style={{ color: 'var(--taupe, #7a7670)' }}>Pick a step on the left to begin.</p>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '.66rem', fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--taupe, #7a7670)' }}>
                    Step {numberOf[selected.id]} · {MILESTONE_HEADINGS[selected.milestone].title}
                  </span>
                  {selected.completed && (
                    <span style={{ fontSize: '.68rem', fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--green, #1a6b45)', background: 'var(--green-bg, #e8f5ef)', borderRadius: 50, padding: '3px 10px' }}>
                      ✓ Done
                    </span>
                  )}
                </div>
                <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.55rem', fontWeight: 900, color: 'var(--ink, #0a0a0a)', margin: '0 0 18px', lineHeight: 1.15 }}>
                  {selected.title}
                </h2>

                {selected.locked ? (
                  <div style={{ background: '#faf8f3', border: '1px solid var(--line, #e4e0d8)', borderRadius: 14, padding: '18px 20px', color: 'var(--taupe, #7a7670)', fontSize: '.9rem', lineHeight: 1.6 }}>
                    This step unlocks once you complete{lockedDep ? <> &ldquo;<strong style={{ color: 'var(--ink, #0a0a0a)' }}>{lockedDep}</strong>&rdquo;</> : ' the steps it depends on'}.
                  </div>
                ) : Panel ? (
                  <Panel customer={customer} onDone={() => handleStepDone(selected.id)} />
                ) : (
                  <div>
                    <p style={{ fontSize: '.9rem', color: 'var(--taupe, #7a7670)', margin: '0 0 16px', lineHeight: 1.55 }}>
                      This step is completed on its own page.
                    </p>
                    <button onClick={() => router.push(STEP_DEST[selected.id] || '/dashboard')} style={{
                      background: 'linear-gradient(135deg,var(--honey, #f5c842),var(--amber, #d4a515))', color: '#1a1408', border: 'none', borderRadius: 50,
                      padding: '12px 24px', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', fontSize: '.9rem',
                    }}>
                      Open this step →
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      {/* Activation celebration (meaningful milestone, not points) */}
      {celebrate && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--ink, #0a0a0a)', color: '#fff', borderRadius: 50, padding: '14px 26px',
          boxShadow: '0 10px 30px rgba(0,0,0,.25)', display: 'flex', alignItems: 'center', gap: 10, zIndex: 200,
        }}>
          <span style={{ fontSize: '1.2rem' }}>🎉</span>
          <span style={{ fontSize: '.92rem', fontWeight: 700 }}>You&rsquo;re activated! Your account is live.</span>
        </div>
      )}
    </div>
  );
}
