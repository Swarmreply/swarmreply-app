// components/Skeleton.js
// Reusable loading placeholders. Use <SkeletonCard/> for list rows, or <Skeleton/>
// for individual blocks. Matches the platform's warm palette.

export function Skeleton({ width = '100%', height = 16, radius = 8, style = {} }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width, height, borderRadius: radius,
        background: 'linear-gradient(90deg,#f1eee8 25%,#e8e4dc 37%,#f1eee8 63%)',
        backgroundSize: '400% 100%',
        animation: 'srShimmer 1.4s ease infinite',
        ...style,
      }}
    >
      <style jsx global>{`
        @keyframes srShimmer {
          0% { background-position: 100% 50%; }
          100% { background-position: 0 50%; }
        }
      `}</style>
    </div>
  );
}

// A row that mirrors the IntegrationCard layout so loading feels seamless.
export function SkeletonCard() {
  return (
    <div style={{
      background: 'white', border: '1.5px solid #e4e0d8', borderRadius: 14,
      padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <Skeleton width={44} height={44} radius={11} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Skeleton width="38%" height={12} style={{ marginBottom: 9 }} />
        <Skeleton width="72%" height={10} />
      </div>
      <Skeleton width={86} height={32} radius={8} />
    </div>
  );
}
