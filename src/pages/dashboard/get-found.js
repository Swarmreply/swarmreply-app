// ============================================
// pages/dashboard/get-found.js
// "Get Found" — folds AI Visibility + Rank Tracking under one nav item.
// A top-level pill toggle switches between the two panels (each panel keeps
// its own internal tabs / controls). The standalone /dashboard/ai-visibility
// and /dashboard/rank-tracking routes still work for direct links.
// ============================================

import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { AiVisibilityPanel } from './ai-visibility';
import { RankTrackingPanel } from './rank-tracking';

const VIEWS = [
  { id: 'ai',   label: 'AI Visibility' },
  { id: 'rank', label: 'Rank Tracking' },
];

export default function GetFound() {
  const [view, setView] = useState('ai');

  return (
    <DashboardLayout title="Get Found">
      <div style={{ background: 'white', borderBottom: '1px solid var(--line, #e4e0d8)', padding: '12px 24px', display: 'flex', gap: 8 }}>
        {VIEWS.map(v => (
          <button key={v.id} onClick={() => setView(v.id)} style={{
            padding: '7px 16px', borderRadius: 'var(--r-pill, 999px)', cursor: 'pointer', fontFamily: 'inherit',
            border: view === v.id ? '2px solid var(--ink, #0a0a0a)' : '1.5px solid var(--line, #e4e0d8)',
            background: view === v.id ? 'var(--ink, #0a0a0a)' : 'transparent',
            color: view === v.id ? 'white' : 'var(--taupe, #7a7670)',
            fontSize: 'var(--fs-sm, 0.8125rem)', fontWeight: 600,
          }}>{v.label}</button>
        ))}
      </div>

      {view === 'ai' ? <AiVisibilityPanel /> : <RankTrackingPanel />}
    </DashboardLayout>
  );
}
