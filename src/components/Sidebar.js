// ============================================
// src/components/Sidebar.js
// 6-item nav matching final prototype design
// ============================================

import Link from 'next/link';
import { useRouter } from 'next/router';

const Bee = () => (
  <svg width="26" height="26" viewBox="0 0 100 100" fill="none">
    <ellipse cx="50" cy="60" rx="21" ry="26" fill="white"/>
    <rect x="29" y="52" width="42" height="8" rx="2" fill="#f5c842" opacity=".95"/>
    <rect x="29" y="65" width="42" height="7" rx="2" fill="#f5c842" opacity=".7"/>
    <circle cx="50" cy="31" r="15" fill="white"/>
    <circle cx="43.5" cy="29" r="4" fill="#0a0a0a"/><circle cx="56.5" cy="29" r="4" fill="#0a0a0a"/>
    <circle cx="44.5" cy="29" r="2.2" fill="white"/><circle cx="57.5" cy="29" r="2.2" fill="white"/>
    <path d="M44 36 Q50 41 56 36" stroke="#0a0a0a" strokeWidth="2" strokeLinecap="round" fill="none"/>
    <ellipse cx="23" cy="46" rx="15" ry="7.5" fill="rgba(245,200,66,.55)" transform="rotate(-28 23 46)"/>
    <ellipse cx="77" cy="46" rx="15" ry="7.5" fill="rgba(245,200,66,.55)" transform="rotate(28 77 46)"/>
    <polygon points="50,86 46,95 54,95" fill="white"/>
    <ellipse cx="50" cy="18" rx="21" ry="5" fill="#f5c842"/>
    <path d="M32 18 Q33 6 50 6 Q67 6 68 18 Z" fill="#f5c842"/>
  </svg>
);

const NAV = [
  { href: '/dashboard',               label: 'Home',          icon: '⊞' },
  { href: '/dashboard/reviews',       label: 'Reviews',       icon: '★',  badge: 3 },
  { href: '/dashboard/inbox',         label: 'Inbox',         icon: '💬' },
  { href: '/dashboard/ai-visibility', label: 'AI Visibility', icon: '✦',  isNew: true },
  { href: '/dashboard/grow',          label: 'Grow',          icon: '↑' },
  { href: '/dashboard/campaigns',     label: 'Campaigns',     icon: '📣' },
  { href: '/dashboard/pulse',      label: 'Pulse',      icon: '◎' },
  { href: '/dashboard/integrations', label: 'Integrations', icon: '⊕' },
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
      <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Bee />
        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.05rem', fontWeight: 900, color: 'white' }}>
          SwarmReply
        </span>
      </div>

      {/* Swarm active pill */}
      <div style={{ margin: '12px 10px 0', background: 'linear-gradient(135deg,rgba(245,200,66,.15),rgba(245,200,66,.06))', border: '1px solid rgba(245,200,66,.25)', borderRadius: 10, padding: '10px 13px' }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(245,200,66,.9)', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 3 }}>✦ Swarm Active</div>
        <div style={{ fontSize: '0.71rem', color: 'rgba(255,255,255,.38)', lineHeight: 1.5 }}>AI replied to 3 reviews · 0 issues</div>
      </div>

      <div style={{ height: 14 }} />

      {/* Primary nav */}
      <nav style={{ flex: 1 }}>
        {NAV.map(item => {
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href} style={sbi(active)}
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
          );
        })}

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,.07)', margin: '10px 14px' }} />

        {/* Settings */}
        <Link href="/dashboard/settings" style={sbi(isActive('/dashboard/settings'))}
          onMouseEnter={e => { if (!isActive('/dashboard/settings')) { e.currentTarget.style.background = 'rgba(255,255,255,.07)'; e.currentTarget.style.color = 'rgba(255,255,255,.85)'; }}}
          onMouseLeave={e => { if (!isActive('/dashboard/settings')) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,.45)'; }}}
        >
          <span style={{ width: 20, height: 20, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', flexShrink: 0 }}>⚙</span>
          <span style={{ flex: 1 }}>Settings</span>
        </Link>
      </nav>

      {/* Plan badge */}
      <div style={{ padding: '14px 12px 16px', borderTop: '1px solid rgba(255,255,255,.07)' }}>
        <div style={{ background: 'rgba(245,200,66,.1)', border: '1px solid rgba(245,200,66,.18)', borderRadius: 10, padding: '10px 13px' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#f5c842', letterSpacing: '.06em', textTransform: 'uppercase' }}>
            {customer?.plan ? customer.plan.charAt(0).toUpperCase() + customer.plan.slice(1) + ' Plan' : 'SwarmReply'}
          </div>
          {customer?.email && (
            <div style={{ fontSize: '0.71rem', color: 'rgba(255,255,255,.38)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {customer.email}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
