// components/EmptyState.js
// Reusable empty / zero-data state. Consistent across the platform so blank
// screens feel intentional and guide the user to the next action.

export default function EmptyState({ icon = null, title, description = '', action = null, compact = false }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: compact ? '32px 24px' : '56px 24px',
      background: 'white',
      border: '1px dashed #d8d3c9',
      borderRadius: 14,
    }}>
      {icon && (
        <div style={{ fontSize: 30, marginBottom: 12, opacity: 0.55, lineHeight: 1 }}>{icon}</div>
      )}
      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0a0a0a', marginBottom: 6 }}>
        {title}
      </div>
      {description && (
        <div style={{
          fontSize: '.85rem', color: '#7a7670', lineHeight: 1.6,
          maxWidth: 380, margin: '0 auto',
        }}>{description}</div>
      )}
      {action && <div style={{ marginTop: 18 }}>{action}</div>}
    </div>
  );
}
