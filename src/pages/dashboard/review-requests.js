// ============================================
// src/pages/dashboard/review-requests.js
// Review request template manager
// Create, edit, preview and copy templates
// to send to customers asking for reviews
// ============================================

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import { getLocations } from '../../utils/api';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const VARIABLES = [
  { var: '{{customer_name}}', desc: "Customer's first name" },
  { var: '{{business_name}}', desc: 'Your business name' },
  { var: '{{owner_name}}', desc: 'Your name' },
  { var: '{{review_link}}', desc: 'Your Google review link' },
];

const CHANNEL_COLORS = {
  email: { bg: '#e8f5ef', text: '#1a6b45' },
  sms: { bg: '#e8f0fe', text: '#1a4baa' }
};

// Template card component
function TemplateCard({ template, onEdit, onCopy, onPreview, onDelete }) {
  const cc = CHANNEL_COLORS[template.channel];
  const preview = template.body.substring(0, 100) + (template.body.length > 100 ? '...' : '');

  return (
    <div style={{
      background: 'white', border: '1px solid #e4e0d8',
      borderRadius: 14, padding: 24,
      transition: 'box-shadow 0.15s'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ flex: 1, paddingRight: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              background: cc.bg, color: cc.text,
              fontSize: '0.7rem', fontWeight: 700,
              padding: '2px 10px', borderRadius: 50,
              textTransform: 'uppercase', letterSpacing: '0.06em'
            }}>{template.channel}</span>
            {template.is_default && (
              <span style={{
                background: '#f8f7f4', color: '#7a7670',
                fontSize: '0.7rem', fontWeight: 600,
                padding: '2px 10px', borderRadius: 50
              }}>Default</span>
            )}
          </div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>
            {template.name}
          </h3>
          {template.subject && (
            <div style={{ fontSize: '0.78rem', color: '#7a7670', marginTop: 2 }}>
              Subject: {template.subject}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => onPreview(template)} style={{
            padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem',
            border: '1px solid #e4e0d8', background: 'white', cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif', color: '#7a7670'
          }}>Preview</button>
          <button onClick={() => onEdit(template)} style={{
            padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem',
            border: '1px solid #e4e0d8', background: 'white', cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif', color: '#7a7670'
          }}>Edit</button>
          <button onClick={() => onCopy(template)} style={{
            padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem',
            border: '1px solid #0d0d0d', background: '#0d0d0d',
            color: 'white', cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif'
          }}>Copy</button>
        </div>
      </div>

      {/* Body preview */}
      <div style={{
        background: '#f8f7f4', borderRadius: 8, padding: '12px 14px',
        fontSize: '0.825rem', color: '#7a7670', lineHeight: 1.6,
        marginBottom: 12, fontFamily: 'monospace'
      }}>{preview}</div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '0.75rem', color: '#7a7670' }}>
          {template.send_count > 0
            ? `Sent ${template.send_count} time${template.send_count !== 1 ? 's' : ''}`
            : 'Not sent yet'}
        </div>
        {!template.is_default && (
          <button onClick={() => onDelete(template)} style={{
            background: 'none', border: 'none', color: '#c0392b',
            fontSize: '0.75rem', cursor: 'pointer', padding: 0,
            fontFamily: 'DM Sans, sans-serif'
          }}>Delete</button>
        )}
      </div>
    </div>
  );
}

export default function ReviewRequests() {
  const { customer } = useAuth();
  const [locations, setLocations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // list | edit | create | preview | generate
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [copied, setCopied] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const [activeChannel, setActiveChannel] = useState('all'); // all | email | sms

  // Edit form state
  const [form, setForm] = useState({
    name: '', channel: 'email', subject: '', body: ''
  });

  // Generate form state
  const [genForm, setGenForm] = useState({
    channel: 'email', tone: 'warm',
    businessType: '', instructions: ''
  });

  useEffect(() => {
    if (customer) loadLocations();
  }, [customer]);

  async function loadLocations() {
    const locs = await getLocations(customer.id);
    setLocations(locs);
    if (locs.length > 0) {
      setSelected(locs[0]);
      await loadTemplates(locs[0].id);
    }
  }

  async function loadTemplates(locationId) {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/templates/${locationId}`);
      let tmpl = res.data.templates;

      // If no templates, seed defaults
      if (tmpl.length === 0) {
        await axios.post(`${API_URL}/templates/${locationId}/seed`);
        const res2 = await axios.get(`${API_URL}/templates/${locationId}`);
        tmpl = res2.data.templates;
      }

      setTemplates(tmpl);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!selected || !form.name || !form.body) return;
    setSaving(true);
    try {
      if (activeTemplate && !activeTemplate.is_default) {
        // Update existing
        await axios.put(`${API_URL}/templates/${activeTemplate.id}`, form);
      } else {
        // Create new
        await axios.post(`${API_URL}/templates/${selected.id}`, form);
      }
      await loadTemplates(selected.id);
      setView('list');
    } catch (err) {
      alert('Failed to save template. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(template) {
    if (!confirm(`Delete "${template.name}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API_URL}/templates/${template.id}`);
      setTemplates(templates.filter(t => t.id !== template.id));
    } catch (err) {
      alert('Failed to delete template.');
    }
  }

  async function handlePreview(template) {
    try {
      const res = await axios.post(`${API_URL}/templates/${template.id}/preview`);
      setPreview({ ...res.data.preview, channel: template.channel, name: template.name });
      setActiveTemplate(template);
      setView('preview');
    } catch (err) {
      // Show raw preview if API fails
      setPreview({
        subject: template.subject,
        body: template.body
          .replace(/\{\{customer_name\}\}/g, 'Sarah')
          .replace(/\{\{business_name\}\}/g, selected?.business_name || 'Your Business')
          .replace(/\{\{owner_name\}\}/g, 'The Team')
          .replace(/\{\{review_link\}\}/g, 'https://g.page/r/your-review-link'),
        channel: template.channel,
        name: template.name
      });
      setView('preview');
    }
  }

  function handleEdit(template) {
    setActiveTemplate(template);
    setForm({
      name: template.name,
      channel: template.channel,
      subject: template.subject || '',
      body: template.body
    });
    setView('edit');
  }

  function handleCreate() {
    setActiveTemplate(null);
    setForm({ name: '', channel: 'email', subject: '', body: '' });
    setView('create');
  }

  async function handleCopy(template) {
    // Copy body with hint about inserting review link
    const textToCopy = template.channel === 'email'
      ? `Subject: ${template.subject || ''}\n\n${template.body}`
      : template.body;

    await navigator.clipboard.writeText(textToCopy);
    // Track send
    await axios.post(`${API_URL}/templates/${template.id}/track`).catch(() => {});
    setCopied(template.id);
    setTimeout(() => setCopied(null), 2000);
  }

  async function handleGenerate() {
    if (!selected) return;
    setGenerating(true);
    try {
      const res = await axios.post(`${API_URL}/templates/${selected.id}/generate`, {
        ...genForm,
        businessType: genForm.businessType || selected.business_type
      });
      const gen = res.data.generated;
      // Pre-fill the edit form with generated content
      setForm({
        name: `${genForm.channel === 'email' ? 'Email' : 'SMS'} — AI generated`,
        channel: genForm.channel,
        subject: gen.subject || '',
        body: gen.body
      });
      setActiveTemplate(null);
      setView('create');
    } catch (err) {
      alert('Generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  function insertVariable(varName) {
    setForm(f => ({ ...f, body: f.body + varName }));
  }

  const displayedTemplates = activeChannel === 'all'
    ? templates
    : templates.filter(t => t.channel === activeChannel);

  const inputStyle = {
    width: '100%', padding: '12px 16px',
    border: '1px solid #e4e0d8', borderRadius: 10,
    fontSize: '0.9rem', outline: 'none',
    fontFamily: 'DM Sans, sans-serif', background: 'white'
  };

  const labelStyle = {
    display: 'block', fontSize: '0.78rem', fontWeight: 600,
    letterSpacing: '0.06em', textTransform: 'uppercase',
    color: '#7a7670', marginBottom: 8
  };

  return (
    <DashboardLayout>
      {/* Topbar */}
      <div style={{
        background: 'white', borderBottom: '1px solid #e4e0d8',
        padding: '16px 32px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div>
          {view !== 'list' && (
            <button onClick={() => setView('list')} style={{
              background: 'none', border: 'none', color: '#7a7670',
              fontSize: '0.825rem', cursor: 'pointer', marginBottom: 4,
              display: 'block', padding: 0, fontFamily: 'DM Sans, sans-serif'
            }}>← Back to templates</button>
          )}
          <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>
            {view === 'list' ? 'Review Request Templates'
              : view === 'edit' ? `Edit: ${activeTemplate?.name}`
              : view === 'create' ? 'New Template'
              : view === 'generate' ? 'Generate with AI'
              : `Preview: ${activeTemplate?.name}`}
          </h2>
          <p style={{ fontSize: '0.78rem', color: '#7a7670', marginTop: 1 }}>
            {view === 'list'
              ? 'Ready-to-send templates to ask customers for Google reviews'
              : view === 'generate'
              ? 'Let AI write a custom template for your business'
              : 'Edit and personalise your template'}
          </p>
        </div>
        {view === 'list' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setView('generate')} style={{
              padding: '10px 20px', borderRadius: 50, fontSize: '0.875rem',
              fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              border: '1px solid #e4e0d8', background: 'white', color: '#0d0d0d'
            }}>✦ Generate with AI</button>
            <button onClick={handleCreate} style={{
              padding: '10px 20px', borderRadius: 50, fontSize: '0.875rem',
              fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              border: '1px solid #0d0d0d', background: '#0d0d0d', color: 'white'
            }}>+ New Template</button>
          </div>
        )}
        {(view === 'edit' || view === 'create') && (
          <button onClick={handleSave} disabled={saving || !form.name || !form.body} style={{
            padding: '10px 24px', borderRadius: 50, fontSize: '0.875rem',
            fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            border: 'none', background: '#0d0d0d', color: 'white'
          }}>{saving ? 'Saving...' : 'Save Template'}</button>
        )}
        {view === 'generate' && (
          <button onClick={handleGenerate} disabled={generating} style={{
            padding: '10px 24px', borderRadius: 50, fontSize: '0.875rem',
            fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            border: 'none', background: '#f5c842', color: '#0d0d0d'
          }}>{generating ? 'Generating...' : '✦ Generate Template'}</button>
        )}
      </div>

      <div style={{ padding: '28px 32px' }}>

        {/* ── LIST VIEW ── */}
        {view === 'list' && (
          <>
            {/* How to use banner */}
            <div style={{
              background: '#fffbeb', border: '1px solid #fcd34d',
              borderRadius: 14, padding: '16px 20px', marginBottom: 24,
              display: 'flex', gap: 14, alignItems: 'flex-start'
            }}>
              <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>💡</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 4 }}>
                  How to use these templates
                </div>
                <div style={{ fontSize: '0.825rem', color: '#7a7670', lineHeight: 1.65 }}>
                  Copy a template, paste it into your email client or SMS app, replace the variables with real customer info, add your Google review link, and send.
                  The variables <code style={{ background: '#f0eeea', padding: '1px 6px', borderRadius: 4 }}>{'{{customer_name}}'}</code> and others will be replaced manually by you before sending.
                  <strong style={{ color: '#0d0d0d' }}> Never offer discounts or incentives in exchange for reviews</strong> — this violates Google's policies.
                </div>
              </div>
            </div>

            {/* Channel filter + location selector */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {['all', 'email', 'sms'].map(ch => (
                  <button key={ch} onClick={() => setActiveChannel(ch)} style={{
                    padding: '6px 16px', borderRadius: 50, fontSize: '0.8rem',
                    fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                    border: '1px solid #e4e0d8',
                    background: activeChannel === ch ? '#0d0d0d' : 'white',
                    color: activeChannel === ch ? 'white' : '#7a7670',
                    textTransform: 'capitalize', transition: 'all 0.15s'
                  }}>{ch === 'all' ? `All (${templates.length})` : `${ch.toUpperCase()} (${templates.filter(t => t.channel === ch).length})`}</button>
                ))}
              </div>
              {locations.length > 1 && (
                <select
                  value={selected?.id || ''}
                  onChange={e => {
                    const loc = locations.find(l => l.id === e.target.value);
                    if (loc) { setSelected(loc); loadTemplates(loc.id); }
                  }}
                  style={{
                    padding: '6px 12px', borderRadius: 8, fontSize: '0.78rem',
                    border: '1px solid #e4e0d8', background: 'white', cursor: 'pointer'
                  }}
                >
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.business_name}</option>
                  ))}
                </select>
              )}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#7a7670' }}>
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>📝</div>
                Loading templates...
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {displayedTemplates.map(t => (
                  <TemplateCard
                    key={t.id}
                    template={{ ...t, _copied: copied === t.id }}
                    onEdit={handleEdit}
                    onCopy={handleCopy}
                    onPreview={handlePreview}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}

            {/* Variables reference */}
            <div style={{
              background: 'white', border: '1px solid #e4e0d8',
              borderRadius: 14, padding: 24, marginTop: 24
            }}>
              <div style={{
                fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: '#7a7670', marginBottom: 14
              }}>Available variables</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
                {VARIABLES.map(v => (
                  <div key={v.var} style={{
                    display: 'flex', gap: 10, alignItems: 'center',
                    padding: '8px 12px', background: '#f8f7f4',
                    borderRadius: 8, fontSize: '0.825rem'
                  }}>
                    <code style={{
                      background: '#0d0d0d', color: 'white',
                      padding: '2px 8px', borderRadius: 4, fontSize: '0.78rem',
                      flexShrink: 0
                    }}>{v.var}</code>
                    <span style={{ color: '#7a7670' }}>{v.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── EDIT / CREATE VIEW ── */}
        {(view === 'edit' || view === 'create') && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, maxWidth: 900 }}>
            <div>
              <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 16, padding: 28 }}>
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>Template name</label>
                  <input
                    style={inputStyle} type="text"
                    placeholder="e.g. Email — Post-visit follow-up"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>Channel</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {['email', 'sms'].map(ch => (
                      <div
                        key={ch}
                        onClick={() => setForm({ ...form, channel: ch })}
                        style={{
                          flex: 1, padding: '12px', borderRadius: 10, cursor: 'pointer',
                          border: `1.5px solid ${form.channel === ch ? '#0d0d0d' : '#e4e0d8'}`,
                          background: form.channel === ch ? '#f8f7f4' : 'white',
                          textAlign: 'center', fontSize: '0.875rem', fontWeight: 600,
                          textTransform: 'uppercase', transition: 'all 0.15s'
                        }}
                      >{ch}</div>
                    ))}
                  </div>
                </div>
                {form.channel === 'email' && (
                  <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>Subject line</label>
                    <input
                      style={inputStyle} type="text"
                      placeholder="How was your visit to {{business_name}}?"
                      value={form.subject}
                      onChange={e => setForm({ ...form, subject: e.target.value })}
                    />
                  </div>
                )}
                <div>
                  <label style={labelStyle}>
                    Message body
                    {form.channel === 'sms' && (
                      <span style={{ color: form.body.length > 320 ? '#c0392b' : '#7a7670', marginLeft: 8, fontWeight: 400 }}>
                        {form.body.length} chars
                      </span>
                    )}
                  </label>
                  <textarea
                    style={{ ...inputStyle, minHeight: form.channel === 'sms' ? 100 : 220, resize: 'vertical' }}
                    placeholder={form.channel === 'sms'
                      ? 'Hi {{customer_name}}, thanks for visiting {{business_name}}! ...'
                      : 'Hi {{customer_name}},\n\nThank you for your recent visit...'}
                    value={form.body}
                    onChange={e => setForm({ ...form, body: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Right panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Insert variables */}
              <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: 20 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 12 }}>
                  Insert variable
                </div>
                {VARIABLES.map(v => (
                  <button
                    key={v.var}
                    onClick={() => insertVariable(v.var)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '8px 10px', marginBottom: 6, borderRadius: 8,
                      border: '1px solid #e4e0d8', background: '#f8f7f4',
                      cursor: 'pointer', fontSize: '0.78rem',
                      fontFamily: 'DM Sans, sans-serif', color: '#0d0d0d'
                    }}
                  >
                    <code style={{ color: '#1a6b45', fontWeight: 700 }}>{v.var}</code>
                    <span style={{ color: '#7a7670', marginLeft: 6 }}>{v.desc}</span>
                  </button>
                ))}
              </div>

              {/* Tips */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: 20 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#1a6b45', marginBottom: 12 }}>
                  Tips for more reviews
                </div>
                {[
                  'Send within 24 hrs of the visit while memory is fresh',
                  'First name personalisation increases open rates by 26%',
                  'One clear CTA — just the review link, nothing else',
                  'SMS gets 5x more opens than email',
                  'Never promise rewards for reviews — Google policy violation'
                ].map((tip, i) => (
                  <div key={i} style={{ fontSize: '0.8rem', color: '#1a6b45', padding: '5px 0', borderBottom: '1px solid #dcfce7', lineHeight: 1.5 }}>
                    → {tip}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── GENERATE VIEW ── */}
        {view === 'generate' && (
          <div style={{ maxWidth: 560 }}>
            <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 16, padding: 32 }}>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Channel</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {['email', 'sms'].map(ch => (
                    <div key={ch} onClick={() => setGenForm({ ...genForm, channel: ch })} style={{
                      flex: 1, padding: 12, borderRadius: 10, cursor: 'pointer',
                      border: `1.5px solid ${genForm.channel === ch ? '#0d0d0d' : '#e4e0d8'}`,
                      background: genForm.channel === ch ? '#f8f7f4' : 'white',
                      textAlign: 'center', fontSize: '0.875rem', fontWeight: 600,
                      textTransform: 'uppercase', transition: 'all 0.15s'
                    }}>{ch}</div>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Tone</label>
                <select
                  style={inputStyle}
                  value={genForm.tone}
                  onChange={e => setGenForm({ ...genForm, tone: e.target.value })}
                >
                  <option value="warm">Warm & Friendly</option>
                  <option value="professional">Professional</option>
                  <option value="casual">Casual & Fun</option>
                  <option value="empathetic">Empathetic</option>
                </select>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Business type (optional override)</label>
                <select
                  style={inputStyle}
                  value={genForm.businessType}
                  onChange={e => setGenForm({ ...genForm, businessType: e.target.value })}
                >
                  <option value="">Use my default ({selected?.business_type || 'restaurant'})</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="dental">Dental</option>
                  <option value="gym">Gym / Fitness</option>
                  <option value="medspa">Med Spa / Salon</option>
                  <option value="auto">Auto Shop</option>
                  <option value="hotel">Hotel</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Special instructions (optional)</label>
                <textarea
                  style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                  placeholder="e.g. Mention our loyalty program, keep it under 100 words, mention our new location..."
                  value={genForm.instructions}
                  onChange={e => setGenForm({ ...genForm, instructions: e.target.value })}
                />
              </div>
              <div style={{
                background: '#f8f7f4', borderRadius: 10, padding: '14px 16px',
                fontSize: '0.825rem', color: '#7a7670', lineHeight: 1.6
              }}>
                ✦ AI will generate a template tailored to your business type and tone.
                You can edit it before saving.
              </div>
            </div>
          </div>
        )}

        {/* ── PREVIEW VIEW ── */}
        {view === 'preview' && preview && (
          <div style={{ maxWidth: 600 }}>
            <div style={{
              background: '#f8f7f4', borderRadius: 14, padding: 8, marginBottom: 16
            }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {['email', 'sms'].map(ch => (
                  <div key={ch} style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: '0.78rem',
                    fontWeight: 600, textTransform: 'uppercase',
                    background: preview.channel === ch ? 'white' : 'transparent',
                    color: preview.channel === ch ? '#0d0d0d' : '#7a7670',
                    border: preview.channel === ch ? '0.5px solid #e4e0d8' : 'none'
                  }}>{ch}</div>
                ))}
              </div>
            </div>

            {preview.channel === 'email' ? (
              <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, overflow: 'hidden' }}>
                {/* Email client chrome */}
                <div style={{ background: '#f8f7f4', padding: '14px 20px', borderBottom: '1px solid #e4e0d8' }}>
                  <div style={{ fontSize: '0.78rem', color: '#7a7670', marginBottom: 4 }}>
                    <strong style={{ color: '#0d0d0d' }}>From:</strong> {selected?.business_name || 'Your Business'} &lt;hello@yourbusiness.com&gt;
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#7a7670', marginBottom: 4 }}>
                    <strong style={{ color: '#0d0d0d' }}>To:</strong> Sarah &lt;sarah@example.com&gt;
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0d0d0d', marginTop: 8 }}>
                    {preview.subject}
                  </div>
                </div>
                <div style={{ padding: '24px 28px', whiteSpace: 'pre-line', fontSize: '0.9rem', lineHeight: 1.75, color: '#0d0d0d' }}>
                  {preview.body}
                </div>
              </div>
            ) : (
              <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: 24 }}>
                {/* SMS bubble */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                  <div style={{
                    background: '#0d0d0d', color: 'white',
                    borderRadius: '18px 18px 4px 18px',
                    padding: '12px 16px', maxWidth: '80%',
                    fontSize: '0.9rem', lineHeight: 1.6
                  }}>
                    {preview.body}
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#7a7670', textAlign: 'center' }}>
                  {preview.body.length} characters · {Math.ceil(preview.body.length / 160)} SMS segment{Math.ceil(preview.body.length / 160) !== 1 ? 's' : ''}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                onClick={() => handleCopy(activeTemplate)}
                style={{
                  flex: 1, padding: 14, borderRadius: 50, fontSize: '0.9rem',
                  fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                  border: 'none', background: '#0d0d0d', color: 'white'
                }}
              >{copied === activeTemplate?.id ? '✓ Copied!' : 'Copy to clipboard'}</button>
              <button
                onClick={() => handleEdit(activeTemplate)}
                style={{
                  padding: '14px 24px', borderRadius: 50, fontSize: '0.9rem',
                  fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                  border: '1px solid #e4e0d8', background: 'white', color: '#0d0d0d'
                }}
              >Edit</button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
