// ============================================
// components/SendRequestModal.js
// The "Send requests" popup — one happy customer's
// email in, a branded review invite out. Phone is
// optional and adds a text invite.
// ============================================

import { useState, useEffect, useRef } from 'react';
import SmsGateBanner from './SmsGateBanner';
import { useSmsGate } from '../hooks/useSmsGate';
import { sendQuickReviewRequest } from '../utils/api';

const SERIF = "'Playfair Display', serif";

export default function SendRequestModal({ open, onClose }) {
  const smsGate = useSmsGate();
  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo]   = useState(null);
  const [error, setError]     = useState('');
  const emailRef = useRef(null);

  // Reset + focus each time the modal opens
  useEffect(() => {
    if (!open) return;
    setSentTo(null); setError('');
    const t = setTimeout(() => emailRef.current && emailRef.current.focus(), 60);
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); };
  }, [open, onClose]);

  if (!open) return null;

  async function send() {
    const em = email.trim();
    if (!em) { setError('Email is required.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { setError('That email doesn\u2019t look right \u2014 double-check it?'); return; }
    setSending(true); setError('');
    try {
      await sendQuickReviewRequest({ name: name.trim(), email: em, phone: phone.trim() || null });
      setSentTo(em);
      setName(''); setEmail(''); setPhone('');
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to send \u2014 please try again.');
    } finally {
      setSending(false);
    }
  }

  const field = {
    width: '100%', border: '1.5px solid #e4e0d8', borderRadius: 12,
    padding: '12px 14px', fontSize: 16, fontFamily: 'inherit',
    background: 'white', color: '#1a1a18', outline: 'none', boxSizing: 'border-box',
  };
  const label = {
    fontSize: '.72rem', fontWeight: 700, letterSpacing: '.06em',
    textTransform: 'uppercase', color: '#a39e93', display: 'block', marginBottom: 6,
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(10,10,8,.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      role="dialog" aria-modal="true" aria-label="Send a review request"
    >
      <div className="sr-fade-in" style={{
        background: '#faf9f6', borderRadius: 20, width: 'min(440px, 100%)',
        boxShadow: '0 30px 80px rgba(0,0,0,.3)', overflow: 'hidden',
      }}>
        {/* Honey header */}
        <div style={{
          background: 'linear-gradient(135deg,#f5c842,#d4a515)', padding: '18px 24px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <img src="/bee-logo.png" alt="" style={{ width: 38, height: 38, objectFit: 'contain' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: '1.15rem', color: '#1a1408' }}>
              Send a review request
            </div>
            <div style={{ fontSize: '.74rem', color: 'rgba(26,20,8,.7)', fontWeight: 600 }}>
              A friendly, branded invite — sent instantly
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            background: 'rgba(10,10,8,.12)', border: 'none', borderRadius: '50%',
            width: 32, height: 32, cursor: 'pointer', color: '#1a1408',
            fontSize: '.95rem', lineHeight: 1, flexShrink: 0,
          }}>✕</button>
        </div>

        {sentTo ? (
          /* ── Success ── */
          <div style={{ padding: '36px 28px', textAlign: 'center' }}>
            <img src="/bee-logo.png" alt="" style={{ width: 54, height: 54, objectFit: 'contain', marginBottom: 12 }} />
            <div style={{ fontFamily: SERIF, fontSize: '1.3rem', fontWeight: 700, color: '#1a1a18', marginBottom: 6 }}>
              Request sent!
            </div>
            <p style={{ fontSize: '.875rem', color: '#7a7670', margin: '0 0 24px' }}>
              On its way to <strong style={{ color: '#1a1a18' }}>{sentTo}</strong>
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="sr-btn" onClick={() => setSentTo(null)} style={{
                padding: '10px 20px', borderRadius: 50, background: 'transparent',
                border: '1.5px solid #e4e0d8', color: '#1a1a18', cursor: 'pointer',
                fontSize: '.85rem', fontWeight: 700, fontFamily: 'inherit',
              }}>Send another</button>
              <button className="sr-btn" onClick={onClose} style={{
                padding: '10px 24px', borderRadius: 50, background: '#1a1a18',
                border: 'none', color: 'white', cursor: 'pointer',
                fontSize: '.85rem', fontWeight: 700, fontFamily: 'inherit',
              }}>Done</button>
            </div>
          </div>
        ) : (
          /* ── Form ── */
          <div style={{ padding: '24px 28px 28px' }}>
            <SmsGateBanner feature="Text invites" enabled={smsGate.enabled} loading={smsGate.loading} liveDate={smsGate.liveDate} />
            <div style={{ marginBottom: 14 }}>
              <label style={label} htmlFor="srm-name">Customer name <span style={{ textTransform: 'none', fontWeight: 500 }}>(optional)</span></label>
              <input id="srm-name" style={field} placeholder="Sarah Miller"
                value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label} htmlFor="srm-email">Email <span style={{ color: '#b3261e', textTransform: 'none' }}>*</span></label>
              <input id="srm-email" ref={emailRef} type="email" style={field} placeholder="sarah@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') send(); }} />
            </div>
            <div style={{ marginBottom: 6 }}>
              <label style={label} htmlFor="srm-phone">Mobile phone <span style={{ textTransform: 'none', fontWeight: 500 }}>(optional — adds a text invite)</span></label>
              <input id="srm-phone" type="tel" style={field} placeholder="(555) 123-4567"
                value={phone} onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') send(); }} />
            </div>

            {error && (
              <div style={{ fontSize: '.8rem', color: '#b3261e', fontWeight: 600, margin: '10px 0 0' }}>{error}</div>
            )}

            <button className="sr-btn sr-btn-gold" onClick={send} disabled={sending} style={{
              width: '100%', marginTop: 18, padding: '13px',
              background: 'linear-gradient(135deg,#f5c842,#d4a515)', color: '#1a1408',
              border: 'none', borderRadius: 50, cursor: sending ? 'default' : 'pointer',
              fontSize: '.92rem', fontWeight: 700, fontFamily: 'inherit',
              opacity: sending ? .6 : 1,
            }}>
              {sending ? 'Sending…' : '⚡ Send request'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
