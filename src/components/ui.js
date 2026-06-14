// ============================================
// src/components/ui.js
// SwarmReply design kit — shared components
// Brand: cream #f8f7f4 · ink #1a1a18 · muted #7a7670
//        border #e4e0d8 · honey #f5c842 → #d4a515
//        Playfair Display (titles/numbers) · DM Sans (body)
// ============================================

import React from 'react';
import Link from 'next/link';

const SERIF = "'Playfair Display', serif";

// ── Card ─────────────────────────────────────
// White surface. pad: number|string. hover: lifts on hover (for clickable cards).
export function Card({ children, pad = 24, hover = false, style = {}, ...rest }) {
  return (
    <div
      className={`sr-card${hover ? ' sr-card-link' : ''}`}
      style={{
        background: 'white', border: '1.5px solid #e4e0d8', borderRadius: 16,
        padding: pad, ...style
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

// ── SectionLabel ─────────────────────────────
// Small uppercase eyebrow above a content block.
export function SectionLabel({ children, style = {} }) {
  return (
    <div style={{
      fontSize: '.7rem', fontWeight: 700, letterSpacing: '.09em',
      textTransform: 'uppercase', color: '#a39e93', marginBottom: 12, ...style
    }}>
      {children}
    </div>
  );
}

// ── PageHeader ───────────────────────────────
// Consistent page top: serif title, optional subtitle, one primary action slot.
export function PageHeader({ title, subtitle, action, sticky = true, children }) {
  return (
    <div style={{
      background: 'white', borderBottom: '1px solid #e4e0d8',
      padding: '18px 32px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', gap: 16,
      ...(sticky ? { position: 'sticky', top: 0, zIndex: 50 } : {})
    }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={{
          fontFamily: SERIF, fontSize: '1.45rem', fontWeight: 700,
          color: '#1a1a18', margin: 0, lineHeight: 1.2, letterSpacing: '-.01em'
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: '.85rem', color: '#7a7670', margin: '3px 0 0' }}>{subtitle}</p>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        {children}
        {action}
      </div>
    </div>
  );
}

// ── Button ───────────────────────────────────
// variant: 'gold' | 'dark' | 'ghost'   size: 'sm' | 'md'
// Renders <Link> when href given, else <button>.
export function Button({ children, variant = 'gold', size = 'md', href, onClick, disabled, style = {}, ...rest }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    borderRadius: 50, fontWeight: 700, fontFamily: 'inherit', cursor: disabled ? 'default' : 'pointer',
    border: 'none', textDecoration: 'none', whiteSpace: 'nowrap',
    opacity: disabled ? .55 : 1,
    padding: size === 'sm' ? '8px 16px' : '11px 22px',
    fontSize: size === 'sm' ? '.8rem' : '.875rem',
  };
  const variants = {
    gold:  { background: 'linear-gradient(135deg,#f5c842,#d4a515)', color: '#1a1408' },
    dark:  { background: '#1a1a18', color: 'white' },
    ghost: { background: 'transparent', color: '#1a1a18', boxShadow: 'inset 0 0 0 1.5px #e4e0d8' },
  };
  const cls = `sr-btn${variant === 'gold' ? ' sr-btn-gold' : ''}`;
  const styles = { ...base, ...variants[variant], ...style };

  if (href && !disabled) {
    return <Link href={href} className={cls} style={styles} {...rest}>{children}</Link>;
  }
  return (
    <button className={cls} onClick={onClick} disabled={disabled} style={styles} {...rest}>
      {children}
    </button>
  );
}

// ── StatCard ─────────────────────────────────
// Big serif number with eyebrow label. Optional sub line + accent bar + link.
export function StatCard({ label, value, sub, subColor = '#7a7670', accent, valueColor = '#1a1a18', dest, loading = false }) {
  const inner = (
    <>
      {accent && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${accent}, transparent)`,
          borderRadius: '16px 16px 0 0'
        }} />
      )}
      <div style={{
        fontSize: '.68rem', fontWeight: 700, letterSpacing: '.08em',
        textTransform: 'uppercase', color: '#a39e93', marginBottom: 10
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: SERIF, fontSize: '1.9rem', fontWeight: 700,
        color: valueColor, lineHeight: 1.05, letterSpacing: '-.01em'
      }}>
        {loading ? '·' : value}
      </div>
      {sub && (
        <div style={{ fontSize: '.78rem', color: subColor, marginTop: 8, fontWeight: 500 }}>
          {sub}
        </div>
      )}
    </>
  );
  const cardStyle = {
    background: 'white', border: '1.5px solid #e4e0d8', borderRadius: 16,
    padding: '18px 22px', position: 'relative', overflow: 'hidden',
    display: 'block', textDecoration: 'none'
  };
  if (dest) {
    return <Link href={dest} className="sr-card sr-card-link" style={cardStyle}>{inner}</Link>;
  }
  return <div className="sr-card" style={cardStyle}>{inner}</div>;
}

// ── QueueItem ────────────────────────────────
// One row in the "needs your attention" queue.
// tone: 'amber' | 'blue' | 'red' | 'green'
const TONES = {
  amber: { bg: '#fdf3dc', fg: '#8a5d00' },
  blue:  { bg: '#e8f0fe', fg: '#1a4baa' },
  red:   { bg: '#fdecea', fg: '#b3261e' },
  green: { bg: '#e8f5ef', fg: '#1a6b45' },
};
export function QueueItem({ icon, tone = 'amber', title, detail, actionLabel, href, onDismiss }) {
  const t = TONES[tone] || TONES.amber;
  return (
    <div className="sr-queue-item" style={{
      background: 'white', border: '1.5px solid #e4e0d8', borderRadius: 14,
      padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10
    }}>
      <span style={{
        width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
        background: t.bg, color: t.fg, display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: '1.05rem'
      }}>
        {icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '.9rem', fontWeight: 600, color: '#1a1a18' }}>{title}</div>
        {detail && (
          <div style={{
            fontSize: '.78rem', color: '#7a7670', marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}>
            {detail}
          </div>
        )}
      </div>
      {href && <Button href={href} variant="ghost" size="sm">{actionLabel || 'View'}</Button>}
      {onDismiss && (
        <button onClick={onDismiss} aria-label="Clear notification" title="Clear"
          style={{
            flexShrink: 0, width: 28, height: 28, borderRadius: '50%', border: 'none',
            background: 'transparent', color: '#a8a39a', cursor: 'pointer', fontSize: '1.1rem',
            lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f0eeea'; e.currentTarget.style.color = '#4a4a48'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#a8a39a'; }}>
          ✕
        </button>
      )}
    </div>
  );
}

// ── EmptyState ───────────────────────────────
// Wallabee-flavored blank slate with one clear next step.
export function EmptyState({ title, body, actionLabel, href, onAction, compact = false }) {
  return (
    <div style={{ textAlign: 'center', padding: compact ? '28px 20px' : '48px 24px' }}>
      <img
        src="/bee-logo.png" alt=""
        style={{ width: compact ? 44 : 60, height: compact ? 44 : 60, objectFit: 'contain', marginBottom: 14, opacity: .92 }}
      />
      <div style={{
        fontFamily: SERIF, fontSize: compact ? '1rem' : '1.2rem',
        fontWeight: 700, color: '#1a1a18', marginBottom: 6
      }}>
        {title}
      </div>
      {body && (
        <p style={{ fontSize: '.85rem', color: '#7a7670', margin: '0 auto 18px', maxWidth: 360, lineHeight: 1.55 }}>
          {body}
        </p>
      )}
      {(href || onAction) && (
        <Button href={href} onClick={onAction} size="sm">{actionLabel || 'Get started'}</Button>
      )}
    </div>
  );
}
