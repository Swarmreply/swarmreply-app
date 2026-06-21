// ============================================
// src/components/Sidebar.js
// 6-item nav matching final prototype design
// ============================================

import { keyClick } from '../utils/a11y';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import SendRequestModal from './SendRequestModal';

const Bee = () => (
  <img src="/bee-logo.png" alt="" style={{width:44,height:44,objectFit:"contain",flexShrink:0}} />
);

const NAV = [
  { href: '/dashboard',                   label: 'Home',          icon: '⊞',  group: 'Overview' },

  { href: '/dashboard/reviews',           label: 'Reviews',       icon: '★',  group: 'Workspace', liveBadge: 'pending_reviews' },
  { href: '/dashboard/inbox',             label: 'Messages',      icon: '💬', group: 'Workspace' },
  { href: '/dashboard/grow',              label: 'Grow',          icon: '↑',  group: 'Workspace' },
  { href: '/dashboard/campaigns',         label: 'Campaigns',     icon: '📣', group: 'Workspace' },
  { href: '/dashboard/surveys', label: 'Surveys', icon: '✎', group: 'Workspace' },

  { href: '/dashboard/get-found',         label: 'Get Found',     icon: '✦',  group: 'Insights', isNew: true },
  { href: '/dashboard/listings',          label: 'Listings',      icon: '◈',  group: 'Insights', isNew: true },
  { href: '/dashboard/pulse',             label: 'Reports',       icon: '◎',  group: 'Insights' },

  { href: '/dashboard/settings',          label: 'Settings',      icon: '⚙',  group: 'Account' },
  { href: '/dashboard/integrations',      label: 'Integrations',  icon: '⊕',  group: 'Account' },
];

const sbi = (active) => ({
  display: 'flex', alignItems: 'center', gap: 11,
  padding: '10px 14px', margin: '1px 10px', borderRadius: 'var(--r-sm, 10px)',
  color: active ? 'white' : 'rgba(255,255,255,.45)',
  fontSize: 'var(--fs-sm, 0.8125rem)', fontWeight: active ? 600 : 500,
  background: active ? 'rgba(255,255,255,.11)' : 'transparent',
  textDecoration: 'none', transition: 'all .15s', position: 'relative',
});

export default function Sidebar({ customer }) {
  const { logout, member } = useAuth();
  const [sendOpen, setSendOpen] = useState(false);
  const router = useRouter();

  // Live stats for the Reviews nav badge (replaces the old hardcoded count)
  const [liveStats, setLiveStats] = useState(null);
  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('swarmreply_token') : null;
    if (!t) return;
    let cancelled = false;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/stats`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(d => { if (!cancelled) setLiveStats(d?.stats || null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Collapsible nav sections — all expanded by default
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const toggleGroup = (g) => setCollapsedGroups(prev => ({ ...prev, [g]: !prev[g] }));

  // Gold hover treatment — same styling as the signed-in user pill below
  const goldHover = {
    background: 'linear-gradient(135deg,rgba(245,200,66,.22),rgba(245,200,66,.10))',
    boxShadow: 'inset 0 0 0 1px rgba(245,200,66,.35)',
    color: 'var(--honey, #f5c842)',
  };

  const isActive = (href) =>
    href === '/dashboard'
      ? router.pathname === '/dashboard'
      : router.pathname.startsWith(href);

  return (
    <aside style={{
      background: 'var(--ink, #0a0a0a)', display: 'flex', flexDirection: 'column',
      position: 'fixed', top: 0, left: 0, bottom: 0, width: 220, zIndex: 100,
      overflowY: 'auto'
    }}>

      {/* Logo */}
      <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 0 }}>
          <Bee />
          <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 'var(--fs-xl, 1.25rem)', fontWeight: 900, color: 'white', lineHeight: 1, letterSpacing: '-.02em', position: 'relative', top: -2 }}>
            SwarmReply
          </span>
        </div>
      </div>

      <div style={{ height: 14 }} />

      {/* Persistent primary action — the one thing customers should do daily */}
      <div style={{ padding: '0 14px 14px' }}>
        <button onClick={() => setSendOpen(true)} className="sr-btn sr-btn-gold" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%',
          background: 'linear-gradient(135deg,var(--honey, #f5c842),var(--amber, #d4a515))', color: '#1a1408',
          border: 'none', borderRadius: 'var(--r-pill, 999px)', padding: '10px 14px', fontSize: 'var(--fs-sm, 0.8125rem)',
          fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
        }}>
          ⚡ Send requests
        </button>
      </div>
      <SendRequestModal open={sendOpen} onClose={() => setSendOpen(false)} />

      {/* Primary nav */}
      <nav style={{ flex: 1 }}>
        {NAV.map((item, i) => {
          const active = isActive(item.href);
          const prevItem = NAV[i - 1];
          const showHeader = i === 0 || item.group !== prevItem?.group;
          return (
            <React.Fragment key={item.href}>
              {showHeader && (
                <div role="button" tabIndex={0} onKeyDown={keyClick}
                  onClick={() => toggleGroup(item.group)}
                  style={{ padding: i === 0 ? '4px 20px 5px' : '15px 20px 5px', fontSize: 'var(--fs-2xs, 0.6875rem)', fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'rgba(255,255,255,.3)', cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'color .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'rgba(245,200,66,.8)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,.3)'; }}
                >
                  <span>{item.group}</span>
                  <span style={{ fontSize: 'var(--fs-2xs, 0.6875rem)', marginRight: 10 }}>{collapsedGroups[item.group] ? '▸' : '▾'}</span>
                </div>
              )}
            {!collapsedGroups[item.group] && (
            <Link href={item.href} style={sbi(active)}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = goldHover.background; e.currentTarget.style.boxShadow = goldHover.boxShadow; e.currentTarget.style.color = goldHover.color; }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,.45)'; }}}
            >
              <span style={{ width: 20, height: 20, borderRadius: 'var(--r-xs, 8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--fs-base, 0.875rem)', flexShrink: 0 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {(() => {
                const liveCount = item.liveBadge ? (parseInt(liveStats?.[item.liveBadge]) || 0) : null;
                const badge = item.liveBadge ? liveCount : item.badge;
                return badge ? (
                <span style={{ background: 'var(--danger, #c0392b)', color: 'white', fontSize: 'var(--fs-2xs, 0.6875rem)', fontWeight: 700, padding: '2px 6px', borderRadius: 'var(--r-pill, 999px)', minWidth: 18, textAlign: 'center' }}>
                  {badge}
                </span>
                ) : null;
              })() || (item.isNew ? (
                <span style={{ background: 'var(--honey, #f5c842)', color: 'var(--ink, #0a0a0a)', fontSize: 'var(--fs-2xs, 0.6875rem)', fontWeight: 800, padding: '2px 6px', borderRadius: 'var(--r-pill, 999px)', letterSpacing: '0.03em' }}>
                  NEW
                </span>
              ) : null)}
            </Link>
            )}
            </React.Fragment>
          );
        })}

      </nav>

      {/* Signed-in user + role */}
      <div style={{ padding: '14px 12px 16px', borderTop: '1px solid rgba(255,255,255,.07)' }}>
        <div style={{ background: 'linear-gradient(135deg,rgba(245,200,66,.22),rgba(245,200,66,.10))', border: '1px solid rgba(245,200,66,.35)', borderRadius: 'var(--r-sm, 10px)', padding: '10px 13px' }}>
          {(() => {
            const role = member?.role || customer?.role;
            const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Member';
            const name = member?.name || customer?.name;
            return (
              <>
                <div style={{ fontSize: 'var(--fs-2xs, 0.6875rem)', fontWeight: 800, color: 'var(--honey, #f5c842)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                  {roleLabel}
                </div>
                {(name || customer?.email) && (
                  <div style={{ fontSize: 'var(--fs-xs, 0.75rem)', color: 'rgba(255,255,255,.92)', fontWeight: 600, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {name || customer?.email}
                  </div>
                )}
                {name && customer?.email && (
                  <div style={{ fontSize: 'var(--fs-2xs, 0.6875rem)', color: 'rgba(255,255,255,.55)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {customer.email}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        style={{
          margin: '8px 12px 12px',
          background: 'none',
          border: '1px solid rgba(255,255,255,.12)',
          borderRadius: 'var(--r-xs, 8px)',
          padding: '8px 0',
          cursor: 'pointer',
          color: 'rgba(255,255,255,.4)',
          fontSize: 'var(--fs-xs, 0.75rem)',
          fontFamily: 'inherit',
          width: 'calc(100% - 24px)',
          transition: 'all .15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,.8)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.3)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.12)'; }}
      >
        Sign out
      </button>
    </aside>
  );
}
