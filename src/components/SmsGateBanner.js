// ============================================
// SmsGateBanner — shown wherever SMS-dependent features live while
// texting is gated (carrier A2P 10DLC registration pending).
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
        borderRadius: 12,
        padding: '12px 16px',
        marginBottom: 16,
        fontSize: '.85rem',
        color: '#6b5a14',
        lineHeight: 1.55,
        ...style
      }}
    >
      <span style={{ fontSize: '1.05rem', lineHeight: 1.2 }} aria-hidden="true">⏳</span>
      <span>
        <strong>{feature} goes live {when}.</strong>{' '}
        We&rsquo;re finishing carrier registration (A2P 10DLC) so your texts deliver reliably.
        Email features work today &mdash; SMS switches on automatically once approved, with nothing for you to do.
      </span>
    </div>
  );
}
