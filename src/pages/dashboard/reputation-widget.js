// pages/dashboard/reputation-widget.js — Item 14
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;
function authH() {
  const t = typeof window !== 'undefined' ? localStorage.getItem('swarmreply_token') : '';
  return t ? { Authorization: `Bearer ${t}` } : {};
}

const STYLES    = ['floating','bar','badge'];
const POSITIONS = ['bottom-right','bottom-left','top-right','top-left'];
const COLORS    = ['var(--honey, #f5c842)','var(--ink, #0a0a0a)','var(--green, #1a6b45)','#4285F4','var(--danger, #c0392b)','#7c3aed','#FF7A59'];

// Rendered as the "Rep Widget" tab inside Settings.
export function RepWidgetPanel() {
  const { customer } = useAuth();
  const [config, setConfig]       = useState(null);
  const [embedCode, setEmbed]     = useState('');
  const [badgeCode, setBadge]     = useState('');
  const [stats, setStats]         = useState({ views: 0, clicks: 0 });
  const [loading, setLoading]     = useState(true);
  const [saved, setSaved]         = useState(false);
  const [rotating, setRotating]   = useState(false);

  // Local edits
  const [style, setStyle]         = useState('floating');
  const [position, setPosition]   = useState('bottom-right');
  const [color, setColor]         = useState('var(--honey, #f5c842)');
  const [showCount, setShowCount] = useState(true);
  const [ctaText, setCtaText]     = useState('Leave a review');

  useEffect(() => { if (customer) load(); }, [customer]);

  async function load() {
    try {
      const res = await axios.get(`${API}/rep-widget/config`, { headers: authH() });
      const c   = res.data.config;
      setConfig(c);
      setEmbed(res.data.embedCode);
      setBadge(res.data.badgeCode);
      setStats(res.data.stats || { views: 0, clicks: 0 });
      setStyle(c.style || 'floating');
      setPosition(c.position || 'bottom-right');
      setColor(c.accent_color || 'var(--honey, #f5c842)');
      setShowCount(c.show_count ?? true);
      setCtaText(c.review_cta_text || 'Leave a review');
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function save() {
    try {
      await axios.put(`${API}/rep-widget/config`, {
        style, position, accentColor: color, showCount, reviewCtaText: ctaText,
      }, { headers: authH() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      load();
    } catch (e) { console.error(e); }
  }

  async function rotateToken() {
    if (!confirm('Rotate token? Your existing embed code will stop working — you will need to update it on your website.')) return;
    setRotating(true);
    try {
      await axios.post(`${API}/rep-widget/config/rotate`, {}, { headers: authH() });
      load();
    } catch (e) { console.error(e); }
    finally { setRotating(false); }
  }

  function copy(text) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  // Live preview
  const previewRating = 4.8;
  const previewCount  = 247;
  const previewStars  = '★'.repeat(Math.round(previewRating)) + '☆'.repeat(5 - Math.round(previewRating));

  return (
      <div className="page-padding" style={{ padding: 24 }}>

        {/* Stats */}
        <div className="grid-responsive-3" style={{ marginBottom: 20 }}>
          {[['Widget views',stats.views.toLocaleString(),'all time'],['Review link clicks',stats.clicks.toLocaleString(),'from widget'],['Click rate', stats.views ? ((stats.clicks/stats.views)*100).toFixed(1)+'%' : '—','views to clicks']].map(([l,v,s]) => (
            <div key={l} style={{ background: 'white', border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 'var(--r-md, 16px)', padding: '16px 18px' }}>
              <div style={{ fontSize: 'var(--fs-xs, 0.75rem)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--taupe, #7a7670)', marginBottom: 6 }}>{l}</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 'var(--fs-3xl, 2rem)', fontWeight: 900 }}>{v}</div>
              <div style={{ fontSize: 'var(--fs-xs, 0.75rem)', color: 'var(--taupe, #7a7670)', marginTop: 4 }}>{s}</div>
            </div>
          ))}
        </div>

        <div className="m-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>

          {/* Left — config */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Style */}
            <div style={{ background: 'white', border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 'var(--r-md, 16px)', padding: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 'var(--fs-base, 0.875rem)', marginBottom: 14 }}>Widget style</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                {STYLES.map(s => (
                  <button key={s} onClick={() => setStyle(s)} style={{ padding: '8px 16px', borderRadius: 'var(--r-pill, 999px)', border: '1.5px solid', borderColor: style === s ? 'var(--ink, #0a0a0a)' : 'var(--line, #e4e0d8)', background: style === s ? 'var(--ink, #0a0a0a)' : 'white', color: style === s ? 'white' : 'var(--taupe, #7a7670)', fontSize: 'var(--fs-sm, 0.8125rem)', fontWeight: style === s ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>
                    {s}
                  </button>
                ))}
              </div>

              {style === 'floating' && (
                <>
                  <div style={{ fontSize: 'var(--fs-2xs, 0.6875rem)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--taupe, #7a7670)', marginBottom: 8 }}>Position</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                    {POSITIONS.map(p => (
                      <button key={p} onClick={() => setPosition(p)} style={{ padding: '6px 12px', borderRadius: 'var(--r-pill, 999px)', border: '1.5px solid', borderColor: position === p ? 'var(--ink, #0a0a0a)' : 'var(--line, #e4e0d8)', background: position === p ? 'var(--cream, #f8f7f4)' : 'white', color: position === p ? 'var(--ink, #0a0a0a)' : 'var(--taupe, #7a7670)', fontSize: 'var(--fs-xs, 0.75rem)', fontWeight: position === p ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit' }}>
                        {p}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <div style={{ fontSize: 'var(--fs-2xs, 0.6875rem)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--taupe, #7a7670)', marginBottom: 8 }}>Accent colour</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)} style={{ width: 30, height: 30, borderRadius: 'var(--r-full, 50%)', background: c, border: color === c ? '3px solid var(--ink, #0a0a0a)' : '2px solid white', boxShadow: '0 0 0 1px var(--line, #e4e0d8)', cursor: 'pointer' }} />
                ))}
                <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 30, height: 30, borderRadius: 'var(--r-full, 50%)', border: '2px solid var(--line, #e4e0d8)', cursor: 'pointer', padding: 0 }} />
              </div>

              <div className="m-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--fs-2xs, 0.6875rem)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--taupe, #7a7670)', marginBottom: 5 }}>CTA button text</label>
                  <input value={ctaText} onChange={e => setCtaText(e.target.value)} maxLength={40} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 'var(--r-xs, 8px)', fontSize: 'var(--fs-lg, 1rem)', fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 'var(--fs-base, 0.875rem)' }}>
                    <div onClick={() => setShowCount(v => !v)} style={{ width: 40, height: 22, background: showCount ? 'var(--ink, #0a0a0a)' : 'var(--line, #e4e0d8)', borderRadius: 'var(--r-pill, 999px)', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
                      <div style={{ position: 'absolute', top: 2, left: showCount ? 20 : 2, width: 18, height: 18, background: 'white', borderRadius: 'var(--r-full, 50%)', transition: 'left .2s' }} />
                    </div>
                    Show review count
                  </label>
                </div>
              </div>

              {saved && <div style={{ background: 'var(--green-bg, #e8f5ef)', border: '1px solid #bbf7d0', borderRadius: 'var(--r-xs, 8px)', padding: '8px 12px', fontSize: 'var(--fs-sm, 0.8125rem)', color: 'var(--green, #1a6b45)', marginTop: 14 }}>Saved</div>}
              <button onClick={save} style={{ width: '100%', padding: 11, borderRadius: 'var(--r-pill, 999px)', background: 'var(--ink, #0a0a0a)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 'var(--fs-base, 0.875rem)', fontWeight: 700, fontFamily: 'inherit', marginTop: 14 }}>
                Save settings
              </button>
            </div>

            {/* Embed codes */}
            <div style={{ background: 'white', border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 'var(--r-md, 16px)', padding: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 'var(--fs-base, 0.875rem)', marginBottom: 14 }}>Embed on your website</div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 'var(--fs-xs, 0.75rem)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--taupe, #7a7670)', marginBottom: 6 }}>Floating / bar widget</div>
                <div style={{ background: 'var(--cream, #f8f7f4)', border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 'var(--r-xs, 8px)', padding: '10px 14px', fontFamily: 'monospace', fontSize: 'var(--fs-xs, 0.75rem)', lineHeight: 1.6, color: 'var(--tx-3, #3a3a38)', wordBreak: 'break-all', marginBottom: 8 }}>{embedCode}</div>
                <button onClick={() => copy(embedCode)} style={{ padding: '6px 14px', borderRadius: 'var(--r-pill, 999px)', background: 'transparent', border: '1.5px solid var(--line, #e4e0d8)', cursor: 'pointer', fontSize: 'var(--fs-xs, 0.75rem)', fontWeight: 600, fontFamily: 'inherit', color: 'var(--ink, #0a0a0a)' }}>Copy code</button>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 'var(--fs-xs, 0.75rem)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--taupe, #7a7670)', marginBottom: 6 }}>SVG badge (for emails, email signatures)</div>
                <div style={{ background: 'var(--cream, #f8f7f4)', border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 'var(--r-xs, 8px)', padding: '10px 14px', fontFamily: 'monospace', fontSize: 'var(--fs-xs, 0.75rem)', lineHeight: 1.6, color: 'var(--tx-3, #3a3a38)', wordBreak: 'break-all', marginBottom: 8 }}>{badgeCode}</div>
                <button onClick={() => copy(badgeCode)} style={{ padding: '6px 14px', borderRadius: 'var(--r-pill, 999px)', background: 'transparent', border: '1.5px solid var(--line, #e4e0d8)', cursor: 'pointer', fontSize: 'var(--fs-xs, 0.75rem)', fontWeight: 600, fontFamily: 'inherit', color: 'var(--ink, #0a0a0a)' }}>Copy badge code</button>
              </div>

              <div style={{ paddingTop: 14, borderTop: '1px solid var(--cream-2, #f0eeea)' }}>
                <button onClick={rotateToken} disabled={rotating} style={{ padding: '7px 14px', borderRadius: 'var(--r-pill, 999px)', background: 'transparent', border: '1.5px solid #fecaca', cursor: 'pointer', fontSize: 'var(--fs-xs, 0.75rem)', fontWeight: 600, fontFamily: 'inherit', color: 'var(--danger, #c0392b)', opacity: rotating ? .5 : 1 }}>
                  {rotating ? 'Rotating...' : 'Rotate token'}
                </button>
                <span style={{ fontSize: 'var(--fs-xs, 0.75rem)', color: 'var(--taupe, #7a7670)', marginLeft: 10 }}>Invalidates current embed code</span>
              </div>
            </div>
          </div>

          {/* Right — live preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 80 }}>
            <div style={{ background: 'white', border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 'var(--r-md, 16px)', padding: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 'var(--fs-base, 0.875rem)', marginBottom: 14 }}>Live preview</div>
              <div style={{ background: 'var(--cream, #f8f7f4)', borderRadius: 'var(--r-sm, 10px)', padding: 20, minHeight: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <div style={{ background: 'white', border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 'var(--r-md, 16px)', padding: '14px 18px', minWidth: 180, borderTop: `3px solid ${color}`, boxShadow: '0 4px 20px rgba(0,0,0,.1)' }}>
                  <div style={{ fontSize: 'var(--fs-2xs, 0.6875rem)', fontWeight: 700, color: 'var(--taupe, #7a7670)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>Google Reviews</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 'var(--fs-2xl, 1.5rem)', fontWeight: 900, color: 'var(--ink, #0a0a0a)', lineHeight: 1 }}>{previewRating}</span>
                    <span style={{ fontSize: 'var(--fs-lg, 1rem)', color, letterSpacing: 1 }}>{previewStars}</span>
                  </div>
                  {showCount && <div style={{ fontSize: 'var(--fs-xs, 0.75rem)', color: 'var(--taupe, #7a7670)', marginBottom: 10 }}>{previewCount} reviews</div>}
                  <div style={{ background: color, color: 'var(--ink, #0a0a0a)', padding: '7px 14px', borderRadius: 'var(--r-pill, 999px)', fontSize: 'var(--fs-xs, 0.75rem)', fontWeight: 700, textAlign: 'center' }}>{ctaText}</div>
                </div>
              </div>
            </div>
            <div style={{ background: 'var(--cream, #f8f7f4)', border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 'var(--r-md, 16px)', padding: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 'var(--fs-xs, 0.75rem)', marginBottom: 10 }}>Installation</div>
              {['Paste the embed code just before </body> on every page of your website.','On Squarespace, Wix, or Shopify — add a Custom Code block with the script.','On WordPress — use a plugin like "Insert Headers and Footers".','Rating updates automatically from your Google reviews — nothing to maintain.'].map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 'var(--fs-xs, 0.75rem)', color: 'var(--taupe, #7a7670)', lineHeight: 1.55 }}>
                  <span style={{ fontWeight: 700, flexShrink: 0 }}>{i+1}.</span> {tip}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
  );
}

// The widget moved to Settings → Rep Widget; keep the old URL working.
export default function ReputationWidgetRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard/settings?tab=widget'); }, [router]);
  return null;
}
