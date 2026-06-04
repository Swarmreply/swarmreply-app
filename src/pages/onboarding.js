// ============================================
// src/pages/onboarding.js
// Full-page, non-blocking onboarding wizard. Renders entirely off the
// data-driven engine (/api/onboarding/status): progress ring, points,
// milestone tiers, dependency locking, and next-best-step.
//
// CHUNK 2 = the shell + gamification. Each step's CTA deep-links to where the
// task is done today; CHUNK 3 will replace those with inline step UIs + the
// "where do I find this?" help content.
// ============================================

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import { STEP_PANELS } from '../components/OnboardingPanels';

const API = process.env.NEXT_PUBLIC_API_URL;

function authHeaders() {
  const t = typeof window !== 'undefined' ? localStorage.getItem('swarmreply_token') : null;
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// Where each step is completed today (deep-link target). Chunk 3 swaps these for
// inline step panels + help. Keyed by the engine's step id.
const STEP_DEST = {
  business_details:    '/dashboard/settings',
  connect_google:      '/dashboard/integrations',
  review_link:         '/dashboard/settings',
  test_request:        '/dashboard/grow',
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

// ── Big progress ring ──
function ProgressRing({ pct, size = 132 }) {
  const stroke = 11;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f0eeea" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f5c842" strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset .7s cubic-bezier(.2,.8,.2,1)' }}
      />
      <text x="50%" y="46%" dominantBaseline="central" textAnchor="middle"
        style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.9rem', fontWeight: 700, fill: '#0a0a0a' }}>
        {pct}%
      </text>
      <text x="50%" y="64%" dominantBaseline="central" textAnchor="middle"
        style={{ fontSize: '.62rem', fontWeight: 700, letterSpacing: '.08em', fill: '#7a7670' }}>
        COMPLETE
      </text>
    </svg>
  );
}

function StepCard({ step, onSetUp, onMarkDone, depTitle, hasPanel, expanded }) {
  const { completed, locked } = step;
  return (
    <div style={{
      background: completed ? '#f6faf7' : 'white',
      border: `1px solid ${completed ? '#cfe8da' : '#e4e0d8'}`,
      borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14,
      opacity: locked ? 0.6 : 1, transition: 'all .2s',
    }}>
      {/* status bubble */}
      <div style={{
        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: completed ? '#1a6b45' : locked ? '#f0eeea' : '#fdf6e3',
        border: completed ? 'none' : `1px solid ${locked ? '#e4e0d8' : '#f5e4b8'}`,
        color: completed ? 'white' : '#92690a', fontWeight: 800, fontSize: '.8rem',
      }}>
        {completed ? '✓' : locked ? '🔒' : '•'}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '.92rem', fontWeight: 600, color: '#0a0a0a' }}>{step.title}</div>
        <div style={{ fontSize: '.74rem', color: '#7a7670', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ color: '#92690a', fontWeight: 700 }}>+{step.points} pts</span>
          {step.estMinutes ? <span>~{step.estMinutes} min</span> : null}
          {locked && depTitle && <span>Complete “{depTitle}” first</span>}
        </div>
      </div>

      {/* actions */}
      {completed ? (
        <span style={{ fontSize: '.8rem', fontWeight: 700, color: '#1a6b45', flexShrink: 0 }}>Done</span>
      ) : locked ? (
        <span style={{ fontSize: '.8rem', color: '#a8a39a', flexShrink: 0 }}>Locked</span>
      ) : (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {step.manual && !hasPanel && (
            <button onClick={() => onMarkDone(step)} style={{
              background: 'transparent', color: '#7a7670', border: '1px solid #e4e0d8',
              borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: '.78rem', fontFamily: 'inherit',
            }}>Mark done</button>
          )}
          <button onClick={() => onSetUp(step)} style={{
            background: '#0a0a0a', color: 'white', border: 'none', borderRadius: 8,
            padding: '8px 16px', cursor: 'pointer', fontWeight: 700, fontSize: '.8rem', fontFamily: 'inherit',
          }}>{hasPanel ? (expanded ? 'Close ▴' : 'Set up') : 'Set up →'}</button>
        </div>
      )}
    </div>
  );
}

export default function Onboarding() {
  const { customer, loading } = useAuth();
  const router = useRouter();
  const [ob, setOb] = useState(null);
  const [toast, setToast] = useState(null);
  const [expandedStep, setExpandedStep] = useState(null);
  const prevPoints = useRef(null);
  const prevActivated = useRef(null);

  useEffect(() => { if (!loading && !customer) router.push('/login'); }, [customer, loading, router]);

  useEffect(() => {
    if (!customer) return;
    load();
    // Re-check when the user returns from a deep-linked task page.
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [customer]);

  async function load() {
    try {
      const res = await axios.get(`${API}/onboarding/status`, { headers: authHeaders() });
      const next = res.data.onboarding;

      // "+points" + "Activated" celebration moments
      if (prevPoints.current != null && next.earnedPoints > prevPoints.current) {
        setToast({ kind: 'points', amount: next.earnedPoints - prevPoints.current });
        setTimeout(() => setToast(null), 2600);
      }
      if (prevActivated.current === false && next.activated === true) {
        setToast({ kind: 'activated' });
        setTimeout(() => setToast(null), 3600);
      }
      prevPoints.current = next.earnedPoints;
      prevActivated.current = next.activated;
      setOb(next);
    } catch (e) { console.warn('onboarding load failed:', e.message); }
  }

  function setUp(step) {
    if (STEP_PANELS[step.id]) {
      setExpandedStep(prev => (prev === step.id ? null : step.id));
    } else {
      const dest = STEP_DEST[step.id] || '/dashboard';
      router.push(dest);
    }
  }

  async function markDone(step) {
    try {
      const res = await axios.post(`${API}/onboarding/step/${step.id}/complete`, {}, { headers: authHeaders() });
      const next = res.data.onboarding;
      if (next.earnedPoints > (prevPoints.current ?? 0)) {
        setToast({ kind: 'points', amount: next.earnedPoints - (prevPoints.current ?? 0) });
        setTimeout(() => setToast(null), 2600);
      }
      prevPoints.current = next.earnedPoints;
      prevActivated.current = next.activated;
      setOb(next);
    } catch (e) { console.warn('mark done failed:', e.message); }
  }

  if (loading || !ob) {
    return <div style={{ minHeight: '100vh', background: '#f8f7f4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7a7670', fontFamily: 'system-ui, sans-serif' }}>Loading your setup…</div>;
  }

  const stepsByMilestone = (m) => ob.steps.filter(s => s.milestone === m);
  const titleById = (id) => ob.steps.find(s => s.id === id)?.title;

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7f4', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Top bar (minimal chrome) */}
      <div style={{ background: 'white', borderBottom: '1px solid #e4e0d8', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.2rem', fontWeight: 800, color: '#0a0a0a' }}>SwarmReply</span>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'transparent', border: 'none', color: '#7a7670', cursor: 'pointer', fontSize: '.85rem', fontFamily: 'inherit' }}>
          Go to dashboard →
        </button>
      </div>

      {/* Hero: ring + score + milestone */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '36px 24px 12px', display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
        <ProgressRing pct={ob.pct} />
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.7rem', fontWeight: 800, color: '#0a0a0a', margin: 0 }}>
            {ob.activated ? "You're live — let's optimize" : "Let's get you set up"}
          </h1>
          <p style={{ fontSize: '.9rem', color: '#7a7670', margin: '6px 0 14px', lineHeight: 1.5 }}>
            {ob.activated
              ? 'Your essentials are done. These next steps help customers find you in local search and AI.'
              : `Finish the essentials to start collecting reviews${ob.minutesLeft > 0 ? ` — about ${ob.minutesLeft} minutes if you have your info handy.` : '.'}`}
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '.82rem', fontWeight: 700, color: '#92690a', background: '#fdf6e3', border: '1px solid #f5e4b8', borderRadius: 50, padding: '5px 12px' }}>
              {ob.earnedPoints} / {ob.totalPoints} pts
            </span>
            {/* Milestone tier pips */}
            {MILESTONE_ORDER.map(m => {
              const reached = MILESTONE_ORDER.indexOf(ob.milestoneTier) >= MILESTONE_ORDER.indexOf(m);
              return (
                <span key={m} style={{
                  fontSize: '.7rem', fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase',
                  color: reached ? '#1a6b45' : '#a8a39a',
                  background: reached ? '#e8f5ef' : '#f0eeea', borderRadius: 50, padding: '4px 11px',
                }}>
                  {MILESTONE_HEADINGS[m].title}{reached ? ' ✓' : ''}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Milestone sections */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '12px 24px 60px' }}>
        {MILESTONE_ORDER.map(m => {
          const steps = stepsByMilestone(m);
          if (!steps.length) return null;
          const doneCount = steps.filter(s => s.completed).length;
          const h = MILESTONE_HEADINGS[m];
          return (
            <div key={m} style={{ marginTop: 28 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
                <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.15rem', fontWeight: 700, color: '#0a0a0a', margin: 0 }}>{h.title}</h2>
                <span style={{ fontSize: '.78rem', color: '#7a7670', fontWeight: 600 }}>{doneCount}/{steps.length} done</span>
              </div>
              <p style={{ fontSize: '.82rem', color: '#7a7670', margin: '0 0 12px' }}>{h.blurb}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {steps.map(s => {
                  const Panel = STEP_PANELS[s.id];
                  const isExpanded = expandedStep === s.id;
                  return (
                    <div key={s.id}>
                      <StepCard step={s} onSetUp={setUp} onMarkDone={markDone}
                        hasPanel={!!Panel} expanded={isExpanded}
                        depTitle={s.locked ? titleById(s.dependsOn.find(d => !ob.steps.find(x => x.id === d)?.completed)) : null} />
                      {Panel && isExpanded && !s.completed && (
                        <div style={{ border: '1px solid #e4e0d8', borderTop: 'none', borderRadius: '0 0 12px 12px', background: 'white', padding: '18px 20px', margin: '-6px 0 0' }}>
                          <Panel customer={customer} onDone={() => load()} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Celebration toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: '#0a0a0a', color: 'white', borderRadius: 12, padding: '14px 22px',
          boxShadow: '0 10px 30px rgba(0,0,0,.25)', display: 'flex', alignItems: 'center', gap: 10, zIndex: 100,
        }}>
          {toast.kind === 'points' ? (
            <>
              <span style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.3rem', fontWeight: 800, color: '#f5c842' }}>+{toast.amount}</span>
              <span style={{ fontSize: '.9rem' }}>points earned</span>
            </>
          ) : (
            <>
              <span style={{ fontSize: '1.2rem' }}>🎉</span>
              <span style={{ fontSize: '.92rem', fontWeight: 700 }}>You're activated! Your account is live.</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
