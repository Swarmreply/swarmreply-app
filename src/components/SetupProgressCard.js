// ============================================
// src/components/SetupProgressCard.js
// Non-blocking "finish your setup" card for the dashboard home.
// Reads the data-driven onboarding engine (/api/onboarding/status) and links
// into the full-page wizard. Hides itself when setup is complete or dismissed.
// ============================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;

function authHeaders() {
  const t = typeof window !== 'undefined' ? localStorage.getItem('swarmreply_token') : null;
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// Compact progress ring
function MiniRing({ pct, size = 58 }) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--cream-2, #f0eeea)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--honey, #f5c842)" strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset .6s ease' }}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle"
        style={{ fontFamily: '"Playfair Display", serif', fontSize: 'var(--fs-base, 0.875rem)', fontWeight: 700, fill: 'var(--ink, #0a0a0a)' }}>
        {pct}%
      </text>
    </svg>
  );
}

export default function SetupProgressCard() {
  const router = useRouter();
  const [ob, setOb] = useState(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await axios.get(`${API}/onboarding/status`, { headers: authHeaders() });
      setOb(res.data.onboarding || null);
    } catch (e) { /* never block the dashboard on this */ }
  }

  async function dismiss() {
    setHidden(true);
    try { await axios.post(`${API}/onboarding/dismiss`, { dismissed: true }, { headers: authHeaders() }); }
    catch (e) { /* visual dismiss is enough */ }
  }

  if (!ob || hidden) return null;
  const showNew = !!ob.newStepsAvailable;
  // Hide once finished/parked — unless a newly-launched feature added steps.
  if ((ob.completed || ob.dismissed) && !showNew) return null;

  const nextStep = ob.steps?.find(s => s.id === ob.nextStepId);
  const headline = showNew
    ? 'New setup steps are available'
    : (ob.activated ? 'Keep optimizing your setup' : 'Finish setting up SwarmReply');

  return (
    <div style={{
      background: 'white', border: '1.5px solid var(--line, #e4e0d8)', borderTop: '3px solid var(--honey, #f5c842)',
      borderRadius: 'var(--r-md, 16px)', padding: '18px 22px', margin: '20px 32px 0',
      display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap',
    }}>
      <MiniRing pct={ob.pct} />

      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: '"Playfair Display", serif', fontSize: 'var(--fs-lg, 1rem)', fontWeight: 700, color: 'var(--ink, #0a0a0a)' }}>
            {headline}
          </span>
          {showNew && (
            <span style={{ fontSize: 'var(--fs-2xs, 0.6875rem)', fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase',
              color: '#fff', background: 'var(--green, #1a6b45)', borderRadius: 'var(--r-pill, 999px)', padding: '3px 9px' }}>
              New
            </span>
          )}
          {ob.milestoneLabel && (
            <span style={{ fontSize: 'var(--fs-2xs, 0.6875rem)', fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase',
              color: 'var(--amber-tx, #92690a)', background: '#fdf6e3', border: '1px solid #f5e4b8', borderRadius: 'var(--r-pill, 999px)', padding: '3px 9px' }}>
              {ob.milestoneLabel}
            </span>
          )}
        </div>
        <div style={{ fontSize: 'var(--fs-sm, 0.8125rem)', color: 'var(--taupe, #7a7670)', marginTop: 4 }}>
          {ob.requiredDone}/{ob.requiredTotal} essentials done
          {ob.minutesLeft > 0 && <> · about {ob.minutesLeft} min left</>}
          {nextStep && <> · Next: <strong style={{ color: 'var(--ink, #0a0a0a)', fontWeight: 600 }}>{nextStep.title}</strong></>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={() => router.push('/onboarding')} style={{
          background: 'linear-gradient(135deg,var(--honey, #f5c842),var(--amber, #d4a515))', color: '#1a1408', border: 'none', borderRadius: 'var(--r-pill, 999px)',
          padding: '9px 18px', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', fontSize: 'var(--fs-sm, 0.8125rem)',
        }}>
          Continue setup →
        </button>
        <button onClick={dismiss} title="Hide for now" style={{
          background: 'transparent', color: 'var(--taupe, #7a7670)', border: 'none', cursor: 'pointer',
          fontSize: 'var(--fs-lg, 1rem)', lineHeight: 1, padding: '4px 6px', fontFamily: 'inherit',
        }}>
          ×
        </button>
      </div>
    </div>
  );
}
