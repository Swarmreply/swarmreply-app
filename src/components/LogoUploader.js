// ============================================
// components/LogoUploader.js
// Controlled drag-and-drop logo + position picker.
// The parent owns the value (url) and position; this
// widget just uploads bytes to storage and reports back.
//   value:    current logo URL (or null)
//   position: 'left' | 'middle' | 'right'
//   onChange: ({ url, position }) => void
//   brandColor: header color for the live preview
// ============================================

import { keyClick } from '../utils/a11y';
import { useState, useRef, useCallback } from 'react';
import { uploadBrandingLogo } from '../utils/api';

const POSITIONS = [
  { id: 'left',   label: 'Left',   justify: 'flex-start' },
  { id: 'middle', label: 'Middle', justify: 'center' },
  { id: 'right',  label: 'Right',  justify: 'flex-end' },
];

// Downscale raster images to <=480px; SVG passes through.
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
          const s = max / Math.max(width, height);
          width = Math.round(width * s); height = Math.round(height * s);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = r.result;
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function LogoUploader({ value, position = 'left', onChange, brandColor = 'var(--honey, #f5c842)' }) {
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
      const res = await uploadBrandingLogo(dataUri);
      onChange && onChange({ url: res.logoUrl, position });
    } catch (e) {
      setError(e.response?.data?.error || 'Upload failed — please try again.');
    } finally { setBusy(false); }
  }, [onChange, position]);

  const justify = POSITIONS.find(p => p.id === position)?.justify || 'flex-start';

  return (
    <div>
      <div role="button" tabIndex={0} onKeyDown={keyClick}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files?.[0]); }}
        onClick={() => inputRef.current && inputRef.current.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--amber, #d4a515)' : 'var(--line, #e4e0d8)'}`,
          background: dragging ? '#fffaf0' : '#faf9f6',
          borderRadius: 'var(--r-md, 16px)', padding: value ? 14 : 26, textAlign: 'center',
          cursor: 'pointer', transition: 'all .15s',
        }}
      >
        {value ? (
          <img src={value} alt="Your logo" style={{ maxHeight: 56, maxWidth: 200, objectFit: 'contain' }} />
        ) : (
          <div style={{ color: 'var(--taupe, #7a7670)' }}>
            <div style={{ fontSize: 'var(--fs-2xl, 1.5rem)', marginBottom: 4 }}>⬆</div>
            <div style={{ fontSize: 'var(--fs-sm, 0.8125rem)', fontWeight: 600, color: 'var(--tx, #1a1a18)' }}>
              {busy ? 'Uploading…' : 'Drag a logo here, or click to choose'}
            </div>
            <div style={{ fontSize: 'var(--fs-2xs, 0.6875rem)', marginTop: 3 }}>PNG, JPG, WEBP, or SVG · up to 5 MB</div>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"
          style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files?.[0])} />
      </div>

      {value && (
        <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => inputRef.current && inputRef.current.click()} disabled={busy} style={ghostBtn}>Replace</button>
          <button type="button" onClick={() => onChange && onChange({ url: null, position })} disabled={busy}
            style={{ ...ghostBtn, color: '#b3261e', borderColor: '#f0d0d0' }}>Remove</button>
        </div>
      )}

      {error && <div style={{ fontSize: 'var(--fs-xs, 0.75rem)', color: '#b3261e', fontWeight: 600, marginTop: 8 }}>{error}</div>}

      {value && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 'var(--fs-2xs, 0.6875rem)', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#a39e93', marginBottom: 7 }}>
            Logo position
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {POSITIONS.map(p => (
              <button key={p.id} type="button" onClick={() => onChange && onChange({ url: value, position: p.id })}
                style={{
                  flex: 1, padding: '7px 0', borderRadius: 'var(--r-xs, 8px)', cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 'var(--fs-sm, 0.8125rem)', fontWeight: position === p.id ? 700 : 500,
                  border: position === p.id ? '2px solid var(--ink, #0a0a0a)' : '1.5px solid var(--line, #e4e0d8)',
                  background: position === p.id ? 'var(--cream, #f8f7f4)' : 'white', color: 'var(--tx, #1a1a18)',
                }}>{p.label}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const ghostBtn = {
  padding: '7px 15px', borderRadius: 'var(--r-pill, 999px)', background: 'white', color: 'var(--tx, #1a1a18)',
  border: '1.5px solid var(--line, #e4e0d8)', cursor: 'pointer', fontSize: 'var(--fs-xs, 0.75rem)', fontWeight: 600, fontFamily: 'inherit',
};
