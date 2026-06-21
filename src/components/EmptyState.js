// components/EmptyState.js
// Reusable empty / zero-data state — Wallabee-flavored (design kit, Chunk 2).
// Same API as before: { icon, title, description, action, compact }
// icon is now an optional override; the bee is the default face of empty screens.

export default function EmptyState({ icon = null, title, description = '', action = null, compact = false }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: compact ? '32px 24px' : '56px 24px',
      background: 'white',
      border: '1.5px dashed #d8d3c9',
      borderRadius: 'var(--r-md, 16px)',
    }}>
      {icon ? (
        <div style={{ fontSize: 'var(--fs-3xl, 2rem)', marginBottom: 12, opacity: 0.6, lineHeight: 1 }}>{icon}</div>
      ) : (
        <img src="/bee-logo.png" alt="" style={{
          width: compact ? 44 : 58, height: compact ? 44 : 58,
          objectFit: 'contain', marginBottom: 12, opacity: .92
        }} />
      )}
      <div style={{
        fontFamily: "'Playfair Display', serif",
        fontWeight: 700, fontSize: compact ? '1.02rem' : '1.2rem',
        color: 'var(--tx, #1a1a18)', marginBottom: 6, letterSpacing: '-.01em'
      }}>
        {title}
      </div>
      {description && (
        <div style={{
          fontSize: 'var(--fs-base, 0.875rem)', color: 'var(--taupe, #7a7670)', lineHeight: 1.6,
          maxWidth: 380, margin: '0 auto',
        }}>{description}</div>
      )}
      {action && <div style={{ marginTop: 18 }}>{action}</div>}
    </div>
  );
}
