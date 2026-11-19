// ============================================
// BusinessTextingTab — Settings → Business Texting
// The customer enters their business details once. SwarmReply then buys a
// dedicated toll-free number for them and submits carrier verification
// automatically. Texts to their customers only go out from that number,
// and only once it's approved.
// ============================================
import { useEffect, useState } from 'react';
import { Card as KitCard } from './ui';
import { getSmsSender, saveSmsSenderProfile } from '../utils/api';

const inp = { width: '100%', padding: '9px 12px', border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 'var(--r-xs, 8px)', fontSize: 'var(--fs-base, 0.875rem)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
const label = { display: 'block', fontSize: 'var(--fs-2xs, 0.6875rem)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--taupe, #7a7670)', marginBottom: 5 };

const BUSINESS_TYPE_LABELS = {
  PRIVATE_PROFIT: 'Private company (LLC, corporation)',
  PUBLIC_PROFIT: 'Publicly traded company',
  SOLE_PROPRIETOR: 'Sole proprietor (no EIN)',
  NON_PROFIT: 'Non-profit',
  GOVERNMENT: 'Government',
};

const EMPTY = {
  legal_business_name: '', doing_business_as: '', business_type: 'PRIVATE_PROFIT', ein: '',
  website: '', street_address: '', city: '', state: '', postal_code: '',
  contact_first_name: '', contact_last_name: '', contact_email: '', contact_phone: '',
  monthly_volume: '1,000',
};

function statusInfo(s) {
  switch (s?.status) {
    case 'approved':
      return { tone: 'ok', title: `Approved — your texting number is ${s.phoneNumber}`, body: 'Review requests, surveys and replies to your customers are sent from this number.' };
    case 'submitted':
      return { tone: 'wait', title: `In carrier review${s.phoneNumber ? ` — ${s.phoneNumber}` : ''}`, body: 'This usually takes a few business days. Nothing else is needed from you.' };
    case 'rejected':
      return { tone: 'bad', title: 'Carriers asked for changes', body: (s.rejectionReason ? `Reason: ${s.rejectionReason}. ` : '') + 'Update your details below and save — we resubmit automatically.' };
    case 'pending':
    case 'number_purchased':
    case 'failed':
    case 'queued':
      return { tone: 'wait', title: 'Setting up your number', body: 'We have your details and are setting up your dedicated number. We retry automatically if anything goes wrong.' };
    default:
      return { tone: 'info', title: 'Get your own texting number', body: 'Phone carriers require every business that texts customers to register. Fill this in once and we handle the rest: we get you a dedicated toll-free number and submit the registration for you.' };
  }
}

const TONES = {
  ok:   { bg: '#eaf6ef', border: '#9fd3b4', color: '#1a6b45' },
  wait: { bg: '#fff7e6', border: '#f5c842', color: '#6b5a14' },
  bad:  { bg: '#fdecea', border: '#f1a9a0', color: '#a3271b' },
  info: { bg: '#f5f3ef', border: '#e4e0d8', color: '#4a4a48' },
};

export default function BusinessTextingTab() {
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [options, setOptions] = useState({ businessTypes: Object.keys(BUSINESS_TYPE_LABELS), monthlyVolumes: ['10', '100', '1,000', '10,000', '100,000'] });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => { load(); }, []);

  function apply(data) {
    setStatus(data);
    if (data.options) setOptions(data.options);
    if (data.profile) {
      const p = data.profile;
      setForm(f => ({ ...f, ...Object.fromEntries(Object.keys(EMPTY).map(k => [k, p[k] == null ? '' : String(p[k])])) }));
    }
  }

  async function load() {
    setLoading(true);
    try { apply(await getSmsSender()); }
    catch (e) { setMsg({ ok: false, text: 'Could not load your texting setup.' }); }
    finally { setLoading(false); }
  }

  async function save() {
    setSaving(true); setMsg(null); setErrors({});
    try {
      apply(await saveSmsSenderProfile(form));
      setMsg({ ok: true, text: 'Saved ✓ We\'ll take it from here.' });
    } catch (e) {
      const d = e.response?.data || {};
      if (d.fields) setErrors(d.fields);
      setMsg({ ok: false, text: d.error || 'Could not save your details.' });
    } finally { setSaving(false); }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const field = (k, text, props = {}) => (
    <div style={{ marginBottom: 12, ...(props.wrapStyle || {}) }}>
      <label style={label} htmlFor={`sms-${k}`}>{text}</label>
      <input id={`sms-${k}`} style={{ ...inp, borderColor: errors[k] ? 'var(--danger, #c0392b)' : undefined }} value={form[k]} onChange={set(k)} disabled={loading} {...(props.input || {})} />
      {errors[k] && <div style={{ fontSize: 'var(--fs-xs, 0.75rem)', color: 'var(--danger, #c0392b)', marginTop: 4 }}>{errors[k]}</div>}
    </div>
  );

  const info = statusInfo(status);
  const tone = TONES[info.tone];
  const soleProp = form.business_type === 'SOLE_PROPRIETOR';

  return (
    <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div role="status" style={{ background: tone.bg, border: `1px solid ${tone.border}`, color: tone.color, borderRadius: 'var(--r-md, 16px)', padding: '14px 18px', lineHeight: 1.55, fontSize: 'var(--fs-base, 0.875rem)' }}>
        <strong>{loading ? 'Loading…' : info.title}</strong>
        {!loading && <div style={{ marginTop: 4 }}>{info.body}</div>}
      </div>

      <KitCard pad={0} style={{ padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 'var(--fs-base, 0.875rem)', marginBottom: 14 }}>Legal business details</div>
        {field('legal_business_name', 'Legal business name (as registered with the IRS)')}
        {field('doing_business_as', 'Name customers know you by (optional)')}
        <div style={{ marginBottom: 12 }}>
          <label style={label} htmlFor="sms-business_type">Business type</label>
          <select id="sms-business_type" style={inp} value={form.business_type} onChange={set('business_type')} disabled={loading}>
            {options.businessTypes.map(t => <option key={t} value={t}>{BUSINESS_TYPE_LABELS[t] || t}</option>)}
          </select>
        </div>
        {!soleProp && field('ein', 'EIN (federal tax ID)', { input: { placeholder: '12-3456789', inputMode: 'numeric' } })}
        {field('website', 'Business website', { input: { placeholder: 'https://yourbusiness.com' } })}
      </KitCard>

      <KitCard pad={0} style={{ padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 'var(--fs-base, 0.875rem)', marginBottom: 14 }}>Business address</div>
        {field('street_address', 'Street address')}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
          {field('city', 'City')}
          {field('state', 'State', { input: { maxLength: 2, placeholder: 'TX' } })}
          {field('postal_code', 'ZIP', { input: { inputMode: 'numeric' } })}
        </div>
      </KitCard>

      <KitCard pad={0} style={{ padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 'var(--fs-base, 0.875rem)', marginBottom: 14 }}>Contact person</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {field('contact_first_name', 'First name')}
          {field('contact_last_name', 'Last name')}
        </div>
        {field('contact_email', 'Email', { input: { type: 'email' } })}
        {field('contact_phone', 'Phone', { input: { type: 'tel', placeholder: '(512) 555-0100' } })}
        <div style={{ marginBottom: 4 }}>
          <label style={label} htmlFor="sms-monthly_volume">Texts per month (estimate)</label>
          <select id="sms-monthly_volume" style={inp} value={form.monthly_volume} onChange={set('monthly_volume')} disabled={loading}>
            {options.monthlyVolumes.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </KitCard>

      {msg && <div style={{ fontSize: 'var(--fs-sm, 0.8125rem)', fontWeight: 600, color: msg.ok ? 'var(--green, #1a6b45)' : 'var(--danger, #c0392b)' }}>{msg.text}</div>}
      <button onClick={save} disabled={saving || loading} style={{ padding: 12, width: '100%', borderRadius: 'var(--r-pill, 999px)', border: 'none', background: 'var(--ink, #0a0a0a)', color: 'white', cursor: 'pointer', fontSize: 'var(--fs-base, 0.875rem)', fontWeight: 700, fontFamily: 'inherit', opacity: (saving || loading) ? .6 : 1 }}>
        {saving ? 'Saving…' : status?.status === 'rejected' ? 'Save and resubmit' : 'Save business details'}
      </button>
      <div style={{ fontSize: 'var(--fs-xs, 0.75rem)', color: 'var(--taupe, #7a7670)', lineHeight: 1.5 }}>
        Carriers use these details only to verify your business. Your number is dedicated to you and is released if you cancel.
      </div>
    </div>
  );
}
