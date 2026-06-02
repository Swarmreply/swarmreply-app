// components/BrandLogo.js
// Renders a clean, consistent brand tile for an integration.
//
// Each brand uses its OFFICIAL color. By default we render a crisp letterform
// (or a geometric mark for Square). To show a brand's *exact* official logo,
// download its SVG from that brand's press / brand-assets page and paste the
// path data into the `svg` field below — the tile will render it automatically,
// no other change needed. (Official asset pages, for convenience:
//   Google Business Profile: about.google/brand-resource-center
//   Meta/Facebook:           about.meta.com/brand/resources
//   Stripe:                  stripe.com/newsroom/brand-assets
//   Square:                  squareup.com/us/en/press/brand-assets
//   HubSpot:                 hubspot.com/style-guide
//   Shopify:                 shopify.com/brand-assets
//   Calendly / Mindbody / Acuity / Jobber: each brand's press/brand kit )
//
// `svg` accepts a single path string OR an array of { d, fill } for multi-color
// marks (e.g. the 4-color Google "G"). viewBox is assumed 0 0 24 24 unless `viewBox` set.

const BRANDS = {
  google:         { bg: '#4285F4', fg: '#fff', label: 'G', svg: null },
  facebook:       { bg: '#1877F2', fg: '#fff', label: 'f', svg: null },
  stripe:         { bg: '#635BFF', fg: '#fff', label: 'S', svg: null },
  stripe_trigger: { bg: '#635BFF', fg: '#fff', label: 'S', svg: null },
  square:         { bg: '#0A0A0A', fg: '#fff', shape: 'square', svg: null },
  hubspot:        { bg: '#FF7A59', fg: '#fff', label: 'H', svg: null },
  shopify:        { bg: '#5A8E2F', fg: '#fff', label: 'S', svg: null },
  mindbody:       { bg: '#00B0B9', fg: '#fff', label: 'M', svg: null },
  calendly:       { bg: '#006BFF', fg: '#fff', label: 'C', svg: null },
  acuity:         { bg: '#262161', fg: '#fff', label: 'A', svg: null },
  jobber:         { bg: '#1F8A4C', fg: '#fff', label: 'J', svg: null },
  zapier:         { bg: '#FF4F00', fg: '#fff', label: 'Z', svg: null },
};

export default function BrandLogo({ provider, name = '', size = 44, fallbackColor = '#7a7670' }) {
  const b = BRANDS[provider] || {
    bg: fallbackColor, fg: '#fff', label: (name.trim()[0] || '?').toUpperCase(), svg: null,
  };
  const radius = Math.round(size * 0.25);

  let mark;
  if (b.svg) {
    const paths = Array.isArray(b.svg) ? b.svg : [{ d: b.svg, fill: b.fg }];
    mark = (
      <svg viewBox={b.viewBox || '0 0 24 24'} width={size * 0.56} height={size * 0.56}
           role="img" aria-hidden="true">
        {paths.map((p, i) => <path key={i} d={p.d} fill={p.fill || b.fg} />)}
      </svg>
    );
  } else if (b.shape === 'square') {
    // Square's mark: a rounded-square ring (recognizable, geometric, not a reproduction).
    mark = (
      <svg viewBox="0 0 24 24" width={size * 0.52} height={size * 0.52}
           fill="none" stroke={b.fg} strokeWidth="2.4" role="img" aria-hidden="true">
        <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
        <rect x="9.25" y="9.25" width="5.5" height="5.5" rx="1.6" fill={b.fg} stroke="none" />
      </svg>
    );
  } else {
    mark = (
      <span style={{
        color: b.fg, fontWeight: 800, fontSize: size * 0.46, lineHeight: 1,
        fontFamily: 'inherit', userSelect: 'none',
      }}>{b.label}</span>
    );
  }

  return (
    <div aria-label={name || provider} title={name} style={{
      width: size, height: size, borderRadius: radius, background: b.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.14), 0 1px 2px rgba(0,0,0,.10)',
    }}>{mark}</div>
  );
}
