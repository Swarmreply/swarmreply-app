// ============================================
// SmsGateBanner — shown wherever SMS-dependent features live while
// texting is gated (not launched yet).
// Renders nothing once SMS is enabled.
// ============================================
export default function SmsGateBanner({ feature = 'Text messaging', enabled = false, loading = false, liveDate = '', style = {} }) {
  if (loading || enabled) return null;

  const when = liveDate
    ? new Date(liveDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
    : 'in about 2 weeks';

  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        background: '#fff7e6',
        border: '1px solid var(--honey, #f5c842)',
        borderRadius: 'var(--r-md, 16px)',
        padding: '12px 16px',
        marginBottom: 16,
        fontSize: 'var(--fs-base, 0.875rem)',
        color: '#6b5a14',
        lineHeight: 1.55,
        ...style
      }}
    >
      <span style={{ fontSize: 'var(--fs-lg, 1rem)', lineHeight: 1.2 }} aria-hidden="true">⏳</span>
      <span>
        <strong>{feature} goes live {when}.</strong>{' '}
        Email features work today. To be ready for texting, add your business details in{' '}
        <a href="/dashboard/settings?tab=texting" style={{ color: 'inherit', fontWeight: 700 }}>Settings &rarr; Business Texting</a>{' '}
        &mdash; we get you a dedicated number and handle carrier registration for you.
      </span>
    </div>
  );
}
