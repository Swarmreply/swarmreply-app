// ============================================
// src/components/Sidebar.js
// 6-item nav matching final prototype design
// ============================================

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';

const Bee = () => (
  <img src="/bee-logo.png" alt="" style={{width:44,height:44,objectFit:"contain",flexShrink:0}} />
);

const NAV = [
  { href: '/dashboard',                   label: 'Home',          icon: '⊞',  group: 'Overview' },

  { href: '/dashboard/reviews',           label: 'Reviews',       icon: '★',  group: 'Workspace', badge: 3 },
  { href: '/dashboard/inbox',             label: 'Messages',      icon: '💬', group: 'Workspace' },
  { href: '/dashboard/grow',              label: 'Grow',          icon: '↑',  group: 'Workspace' },
  { href: '/dashboard/campaigns',         label: 'Campaigns',     icon: '📣', group: 'Workspace' },

  { href: '/dashboard/get-found',         label: 'Get Found',     icon: '✦',  group: 'Insights', isNew: true },
  { href: '/dashboard/pulse',             label: 'Reports',       icon: '◎',  group: 'Insights' },

  { href: '/dashboard/settings',          label: 'Settings',      icon: '⚙',  group: 'Account' },
  { href: '/dashboard/integrations',      label: 'Integrations',  icon: '⊕',  group: 'Account' },
  { href: '/dashboard/reputation-widget', label: 'Review Widget',    icon: '★',  group: 'Account' },
];

const sbi = (active) => ({
  display: 'flex', alignItems: 'center', gap: 11,
  padding: '10px 14px', margin: '1px 10px', borderRadius: 10,
  color: active ? 'white' : 'rgba(255,255,255,.45)',
  fontSize: '0.84rem', fontWeight: active ? 600 : 500,
  background: active ? 'rgba(255,255,255,.11)' : 'transparent',
  textDecoration: 'none', transition: 'all .15s', position: 'relative',
});

export default function Sidebar({ customer }) {
  const { logout, member } = useAuth();
  const router = useRouter();

  const isActive = (href) =>
    href === '/dashboard'
      ? router.pathname === '/dashboard'
      : router.pathname.startsWith(href);

  return (
    <aside style={{
      background: '#0a0a0a', display: 'flex', flexDirection: 'column',
      position: 'fixed', top: 0, left: 0, bottom: 0, width: 220, zIndex: 100,
      overflowY: 'auto'
    }}>

      {/* Logo */}
      <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 0 }}>
          <Bee />
          <span style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.16rem', fontWeight: 900, color: 'white', lineHeight: 1, letterSpacing: '-.02em', position: 'relative', top: -2 }}>
            SwarmReply
          </span>
        </div>
      </div>

      {/* Swarm active pill */}
      <div style={{ margin: '12px 10px 0', background: 'linear-gradient(135deg,rgba(245,200,66,.22),rgba(245,200,66,.10))', border: '1px solid rgba(245,200,66,.35)', borderRadius: 10, padding: '10px 13px' }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(245,200,66,.9)', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 3 }}>✦ Swarm Active</div>
        <div style={{ fontSize: '0.71rem', color: 'rgba(255,255,255,.38)', lineHeight: 1.5 }}>AI replied to 3 reviews · 0 issues</div>
      </div>

      <div style={{ height: 14 }} />

      {/* Primary nav */}
      <nav style={{ flex: 1 }}>
        {NAV.map((item, i) => {
          const active = isActive(item.href);
          const prevItem = NAV[i - 1];
          const showHeader = i === 0 || item.group !== prevItem?.group;
          return (
            <React.Fragment key={item.href}>
              {showHeader && (
                <div style={{ padding: i === 0 ? '4px 20px 5px' : '15px 20px 5px', fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'rgba(255,255,255,.3)' }}>
                  {item.group}
                </div>
              )}
            <Link href={item.href} style={sbi(active)}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,.07)'; e.currentTarget.style.color = 'rgba(255,255,255,.85)'; }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,.45)'; }}}
            >
              <span style={{ width: 20, height: 20, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', flexShrink: 0 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge ? (
                <span style={{ background: '#c0392b', color: 'white', fontSize: '0.6rem', fontWeight: 700, padding: '2px 6px', borderRadius: 50, minWidth: 18, textAlign: 'center' }}>
                  {item.badge}
                </span>
              ) : item.isNew ? (
                <span style={{ background: '#f5c842', color: '#0a0a0a', fontSize: '0.55rem', fontWeight: 800, padding: '2px 6px', borderRadius: 50, letterSpacing: '0.03em' }}>
                  NEW
                </span>
              ) : null}
            </Link>
            </React.Fragment>
          );
        })}

      </nav>

      {/* Signed-in user + role */}
      <div style={{ padding: '14px 12px 16px', borderTop: '1px solid rgba(255,255,255,.07)' }}>
        <div style={{ background: 'linear-gradient(135deg,rgba(245,200,66,.22),rgba(245,200,66,.10))', border: '1px solid rgba(245,200,66,.35)', borderRadius: 10, padding: '10px 13px' }}>
          {(() => {
            const role = member?.role || customer?.role;
            const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Member';
            const name = member?.name || customer?.name;
            return (
              <>
                <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#f5c842', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                  {roleLabel}
                </div>
                {(name || customer?.email) && (
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,.92)', fontWeight: 600, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {name || customer?.email}
                  </div>
                )}
                {name && customer?.email && (
                  <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,.55)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
          borderRadius: 8,
          padding: '8px 0',
          cursor: 'pointer',
          color: 'rgba(255,255,255,.4)',
          fontSize: '0.75rem',
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
