// ============================================
// src/components/DashboardLayout.js
// Mobile-first layout — bottom nav on mobile,
// sidebar on desktop, safe areas, touch targets
// ============================================

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Sidebar from './Sidebar';
import OnboardingWizard from './OnboardingWizard';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import { useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;

// Bottom nav — 5 primary items visible, "More" opens a drawer
const BOTTOM_NAV = [
  { href: '/dashboard',               icon: '⊞', label: 'Home'       },
  { href: '/dashboard/reviews',       icon: '★', label: 'Reviews'    },
  { href: '/dashboard/ai-visibility', icon: '✦', label: 'AI'         },
  { href: '/dashboard/grow',          icon: '↑', label: 'Grow'       },
  { href: '/dashboard/inbox',         icon: '💬', label: 'Inbox'     },
];

const MORE_NAV = [
  { href: '/dashboard/campaigns',  icon: '📣', label: 'Campaigns'  },
  { href: '/dashboard/pulse',      icon: '◎', label: 'Pulse'       },
  { href: '/dashboard/integrations', icon: '⊕', label: 'Integrations' },
  { href: '/dashboard/settings',   icon: '⚙', label: 'Settings'   },
];

function MobileNav({ pathname, onMoreToggle, moreOpen }) {
  const isActive = (href) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  return (
    <>
      <nav className="mobile-nav-bar">
        {BOTTOM_NAV.map(item => (
          <Link key={item.href} href={item.href} className={`mobile-nav-item${isActive(item.href) ? ' active' : ''}`}>
            <span className="mni-icon">{item.icon}</span>
            <span className="mni-label">{item.label}</span>
          </Link>
        ))}
        <button
          onClick={onMoreToggle}
          className={`mobile-nav-item${moreOpen ? ' active' : ''}`}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <span className="mni-icon">⋯</span>
          <span className="mni-label">More</span>
        </button>
      </nav>

      {/* More drawer */}
      <div className={`mobile-more-overlay${moreOpen ? ' open' : ''}`} onClick={onMoreToggle} />
      <div className={`mobile-more-drawer${moreOpen ? ' open' : ''}`}>
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,.2)', borderRadius: 50, margin: '0 auto 18px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {MORE_NAV.map(item => (
            <Link key={item.href} href={item.href} onClick={onMoreToggle}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 8px', borderRadius: 12, background: 'rgba(255,255,255,.07)', textDecoration: 'none' }}>
              <span style={{ fontSize: '1.3rem' }}>{item.icon}</span>
              <span style={{ fontSize: '.72rem', fontWeight: 600, color: 'rgba(255,255,255,.7)' }}>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

export default function DashboardLayout({ children, title }) {
  const { customer, loading, reload } = useAuth();
  const router = useRouter();
  const [showWizard, setShowWizard]     = useState(false);
  const [wizardChecked, setWizardChecked] = useState(false);
  const [moreOpen, setMoreOpen]         = useState(false);
  const [billing, setBilling]           = useState(null);
  const [dismissed, setDismissed]       = useState(false);

  useEffect(() => {
    if (!loading && !customer) router.push('/login');
  }, [customer, loading, router]);

  useEffect(() => {
    if (!customer || wizardChecked) return;
    checkOnboarding();
  }, [customer]);

  // Load billing status
  useEffect(() => { if (customer) checkBillingStatus(); }, [customer]);

  // Close more drawer on route change
  useEffect(() => { setMoreOpen(false); }, [router.pathname]);

  async function checkOnboarding() {
    setWizardChecked(true);
    if (router.pathname === '/dashboard/billing') return;
    try {
      const t = localStorage.getItem('swarmreply_token');
      const res = await axios.get(`${API}/onboarding/status`, {
        headers: t ? { Authorization: `Bearer ${t}` } : {}
      });
      if (!res.data.onboarding?.completed) setShowWizard(true);
    } catch (err) {
      console.warn('Onboarding check failed:', err.message);
    }
  }

  async function checkBillingStatus() {
    // Skip billing check on billing page itself
    if (router.pathname === '/dashboard/settings') return;
    try {
      const t = localStorage.getItem('swarmreply_token');
      const res = await axios.get(`${API}/billing/status`, {
        headers: t ? { Authorization: `Bearer ${t}` } : {}
      });
      setBilling(res.data.billing);
    } catch (err) {
      // Don't block the dashboard if billing check fails
      console.warn('Billing status check failed:', err.message);
    }
  }

  async function openBillingPortal() {
    try {
      const t = localStorage.getItem('swarmreply_token');
      const res = await axios.post(`${API}/billing/portal`, {}, {
        headers: t ? { Authorization: `Bearer ${t}` } : {}
      });
      if (res.data.url) window.open(res.data.url, '_blank');
    } catch (err) {
      console.error('Portal error:', err);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8f7f4' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>🐝</div>
          <div style={{ color: '#7a7670', fontSize: '0.875rem' }}>Loading your swarm…</div>
        </div>
      </div>
    );
  }

  if (!customer) return null;

  // ── FULL LOCKOUT — grace period expired ──────────────────────────────────
  if (billing?.locked) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f7f4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'DM Sans, sans-serif' }}>
        <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 20, padding: '48px 40px', maxWidth: 520, width: '100%', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,.08)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '1.8rem' }}>💳</div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.6rem', fontWeight: 900, color: '#0a0a0a', marginBottom: 10 }}>Payment required</div>
          <p style={{ fontSize: '.9rem', color: '#7a7670', lineHeight: 1.75, marginBottom: 28 }}>
            Your last payment didn't go through and the grace period has ended. Please update your payment method to restore access to SwarmReply.
          </p>
          <button onClick={openBillingPortal} style={{ width: '100%', padding: '14px 0', borderRadius: 50, background: '#0a0a0a', color: 'white', border: 'none', cursor: 'pointer', fontSize: '.95rem', fontWeight: 700, fontFamily: 'inherit', marginBottom: 12 }}>
            Update payment method →
          </button>
          <p style={{ fontSize: '.78rem', color: '#7a7670' }}>
            Need help? Email <a href="mailto:hello@swarmreply.com" style={{ color: '#0a0a0a', fontWeight: 600 }}>hello@swarmreply.com</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      {/* ── ADMIN IMPERSONATION BANNER ── */}
      {typeof window !== 'undefined' && sessionStorage.getItem('impersonating') && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: 'linear-gradient(90deg,#f5c842,#d4a515)',
          color: '#0a0a0a', padding: '8px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: '0.8rem', fontWeight: 700, boxShadow: '0 2px 12px rgba(0,0,0,.2)'
        }}>
          <span>⚡ ADMIN VIEW — Logged in as: {sessionStorage.getItem('impersonating')} — All actions are real</span>
          <button onClick={() => { sessionStorage.removeItem('impersonating'); localStorage.removeItem('swarmreply_token'); window.close(); }}
            style={{ background: 'rgba(0,0,0,.15)', border: 'none', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem' }}>
            Exit ✕
          </button>
        </div>
      )}
      {/* ── BILLING WARNING BANNER ── */}
      {billing?.bannerLevel === 'warn' && !dismissed && (
        <div style={{
          background: '#c0392b', color: 'white',
          padding: '12px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 16, flexWrap: 'wrap',
          position: 'sticky', top: 0, zIndex: 200,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
            <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>⚠️</span>
            <div>
              <span style={{ fontWeight: 700, fontSize: '.875rem' }}>Payment failed — action required. </span>
              <span style={{ fontSize: '.875rem', opacity: .9 }}>
                {billing.graceDaysLeft > 0
                  ? `Your account will be locked in ${billing.graceDaysLeft} day${billing.graceDaysLeft === 1 ? '' : 's'} if not resolved.`
                  : 'Please update your payment method immediately to avoid losing access.'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={openBillingPortal} style={{ padding: '7px 18px', borderRadius: 50, background: 'white', color: '#c0392b', border: 'none', cursor: 'pointer', fontSize: '.82rem', fontWeight: 700, fontFamily: 'inherit' }}>
              Update card →
            </button>
            <button onClick={() => setDismissed(true)} style={{ padding: '7px 12px', borderRadius: 50, background: 'rgba(255,255,255,.15)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '.82rem', fontFamily: 'inherit' }}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {showWizard && (
        <OnboardingWizard
          customer={customer}
          onComplete={() => { setShowWizard(false); reload(); }}
        />
      )}

      <div className="dashboard-layout">
        {/* Sidebar — desktop only */}
        <div className="dashboard-sidebar">
          <Sidebar customer={customer} />
        </div>

        {/* Main content */}
        <main className="dashboard-main">
          {title && (
            <div style={{
              background: '#fff', borderBottom: '1px solid #e4e0d8',
              padding: '14px 20px', fontSize: '.875rem', fontWeight: 600,
              color: '#0a0a0a', position: 'sticky', top: 0, zIndex: 50,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <span className="topbar-title">{title}</span>
            </div>
          )}
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav
        pathname={router.pathname}
        onMoreToggle={() => setMoreOpen(o => !o)}
        moreOpen={moreOpen}
      />
    </div>
  );
}
