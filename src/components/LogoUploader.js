// ============================================
// components/LogoUploader.js
// Drag-and-drop business logo with position control.
// Client-side downsize keeps uploads small + fast;
// images go to Supabase Storage via the backend.
// ============================================

import { useState, useRef, useCallback } from 'react';
import { uploadLogo, setLogoOptions } from '../utils/api';

const SERIF = "'Playfair Display', serif";
const POSITIONS = [
  { id: 'left',   label: 'Left',   justify: 'flex-start' },
  { id: 'middle', label: 'Middle', justify: 'center' },
  { id: 'right',  label: 'Right',  justify: 'flex-end' },
];

// Downscale to <= 480px on the long edge, return a data URI.
// SVGs pass through untouched (already tiny + vector).
function downscale(file) {
  return new Promise((resolve, reject) => {
    if (file.type === 'image/svg+xml') {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
      return;
    }
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 480;
        let { width, height } = img;
        if (width > max || height > max) {
          const scale = max / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        // PNG preserves transparency (logos usually need it)
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = r.result;
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function LogoUploader({ locationId, initialUrl, initialPosition = 'left', brandColor = '#f5c842', onChange }) {
  const [url, setUrl] = useState(initialUrl || null);
  const [position, setPosition] = useState(initialPosition || 'left');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp|svg\+xml)$/i.test(file.type)) {
      setError('Please use a PNG, JPG, WEBP, or SVG image.'); return;
    }
    if (file.size > 5 * 1024 * 1024) { setError('That image is over 5 MB — try a smaller one.'); return; }
    setBusy(true); setError('');
    try {
      const dataUri = await downscale(file);
      const res = await uploadLogo(locationId, dataUri);
      setUrl(res.logoUrl);
      onChange && onChange({ logoUrl: res.logoUrl, logoPosition: position });
    } catch (e) {
      setError(e.response?.data?.error || 'Upload failed — please try again.');
    } finally { setBusy(false); }
  }, [locationId, position, onChange]);

  async function choosePosition(id) {
    setPosition(id);
    try {
      await setLogoOptions(locationId, { logoPosition: id });
      onChange && onChange({ logoUrl: url, logoPosition: id });
    } catch (e) { /* non-fatal */ }
  }

  async function remove() {
    setBusy(true); setError('');
    try {
      await setLogoOptions(locationId, { remove: true });
      setUrl(null);
      onChange && onChange({ logoUrl: null, logoPosition: position });
    } catch (e) {
      setError('Could not remove logo.');
    } finally { setBusy(false); }
  }

  const justify = POSITIONS.find(p => p.id === position)?.justify || 'flex-start';

  return (
    <div style={{ maxWidth: 520 }}>
      <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 4 }}>Business logo</div>
      <div style={{ fontSize: '.8rem', color: '#7a7670', marginBottom: 14 }}>
        Shown on your review requests, the review page, and customer surveys — so emails look like they came from you, not us.
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files?.[0]); }}
        onClick={() => inputRef.current && inputRef.current.click()}
        style={{
          border: `2px dashed ${dragging ? '#d4a515' : '#e4e0d8'}`,
          background: dragging ? '#fffaf0' : '#faf9f6',
          borderRadius: 14, padding: url ? 16 : 32, textAlign: 'center',
          cursor: 'pointer', transition: 'all .15s',
        }}
      >
        {url ? (
          <img src={url} alt="Your logo" style={{ maxHeight: 64, maxWidth: 220, objectFit: 'contain' }} />
        ) : (
          <div style={{ color: '#7a7670' }}>
            <div style={{ fontSize: '1.6rem', marginBottom: 6 }}>⬆</div>
            <div style={{ fontSize: '.85rem', fontWeight: 600, color: '#1a1a18' }}>
              {busy ? 'Uploading…' : 'Drag a logo here, or click to choose'}
            </div>
            <div style={{ fontSize: '.72rem', marginTop: 4 }}>PNG, JPG, WEBP, or SVG · up to 5 MB</div>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"
          style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files?.[0])} />
      </div>

      {url && (
        <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
          <button onClick={() => inputRef.current && inputRef.current.click()} disabled={busy}
            style={ghostBtn}>Replace</button>
          <button onClick={remove} disabled={busy}
            style={{ ...ghostBtn, color: '#b3261e', borderColor: '#f0d0d0' }}>Remove</button>
        </div>
      )}

      {error && <div style={{ fontSize: '.78rem', color: '#b3261e', fontWeight: 600, marginTop: 10 }}>{error}</div>}

      {/* Position picker + live header preview */}
      {url && (
        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#a39e93', marginBottom: 8 }}>
            Logo position
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {POSITIONS.map(p => (
              <button key={p.id} onClick={() => choosePosition(p.id)}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: '.82rem', fontWeight: position === p.id ? 700 : 500,
                  border: position === p.id ? '2px solid #0a0a0a' : '1.5px solid #e4e0d8',
                  background: position === p.id ? '#f8f7f4' : 'white', color: '#1a1a18',
                }}>{p.label}</button>
            ))}
          </div>
          <div style={{ fontSize: '.72rem', color: '#a39e93', marginBottom: 6 }}>Preview</div>
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e4e0d8' }}>
            <div style={{ background: brandColor, padding: '16px 22px', display: 'flex', alignItems: 'center', justifyContent: justify }}>
              <img src={url} alt="" style={{ maxHeight: 40, maxWidth: 150, objectFit: 'contain' }} />
            </div>
            <div style={{ background: 'white', padding: '16px 22px', fontSize: '.8rem', color: '#7a7670' }}>
              How did we do? — your review request, headed by your brand.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ghostBtn = {
  padding: '8px 16px', borderRadius: 50, background: 'white', color: '#1a1a18',
  border: '1.5px solid #e4e0d8', cursor: 'pointer', fontSize: '.8rem', fontWeight: 600, fontFamily: 'inherit',
};
