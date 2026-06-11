// ============================================
// src/components/SendReviewRequests.js
// Contact management + send interface
// Paste contacts, upload CSV, or enter manually
// then send email/SMS review requests directly
// ============================================

import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function SendReviewRequests({ location, templates }) {
  const [contacts, setContacts] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [manualForm, setManualForm] = useState({ name: '', email: '', phone: '' });
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState(null);
  const [dailyStats, setDailyStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('contacts'); // contacts | history

  useEffect(() => {
    if (location) {
      loadStats();
      loadHistory();
    }
    if (templates?.length > 0) {
      setSelectedTemplate(templates[0].id);
    }
  }, [location]);

  async function loadStats() {
    try {
      const res = await axios.get(`${API_URL}/send/stats/${location.id}`);
      setDailyStats(res.data.stats);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }

  async function loadHistory() {
    try {
      const res = await axios.get(`${API_URL}/send/history/${location.id}?limit=20`);
      setHistory(res.data.history);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  }

  // Parse pasted text into contacts
  // Supports: "Name, email" or "Name, phone" or "Name email" per line
  function parsePasteText(text) {
    const lines = text.trim().split('\n').filter(l => l.trim());
    const parsed = [];
    const errors = [];

    lines.forEach((line, i) => {
      // Try comma-separated first, then space-separated
      const parts = line.includes(',')
        ? line.split(',').map(p => p.trim())
        : line.trim().split(/\s+/);

      if (parts.length < 2) {
        errors.push(`Line ${i + 1}: "${line}" — needs at least a name and email/phone`);
        return;
      }

      const name = parts[0];
      const contact = { name };

      // Detect email vs phone
      parts.slice(1).forEach(part => {
        if (part.includes('@')) contact.email = part;
        else if (/[\d\-\(\)\+\s]{7,}/.test(part)) contact.phone = part.replace(/\s/g, '');
      });

      if (!contact.email && !contact.phone) {
        errors.push(`Line ${i + 1}: "${line}" — no valid email or phone found`);
        return;
      }

      parsed.push(contact);
    });

    return { parsed, errors };
  }

  function handleParsePaste() {
    const { parsed, errors } = parsePasteText(pasteText);
    if (errors.length > 0) {
      alert(`Some contacts had issues:\n\n${errors.join('\n')}\n\nValid contacts were still added.`);
    }
    setContacts(prev => {
      // Deduplicate by email/phone
      const existing = new Set(prev.map(c => c.email || c.phone));
      const newOnes = parsed.filter(c => !existing.has(c.email || c.phone));
      return [...prev, ...newOnes];
    });
    setPasteText('');
  }

  function handleCSVUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const { parsed, errors } = parsePasteText(text);
      if (errors.length > 0) {
        alert(`${errors.length} rows had issues and were skipped.`);
      }
      setContacts(prev => {
        const existing = new Set(prev.map(c => c.email || c.phone));
        const newOnes = parsed.filter(c => !existing.has(c.email || c.phone));
        return [...prev, ...newOnes];
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function addManualContact() {
    if (!manualForm.name || (!manualForm.email && !manualForm.phone)) {
      alert('Please enter a name and at least one of email or phone.');
      return;
    }
    setContacts(prev => [...prev, { ...manualForm }]);
    setManualForm({ name: '', email: '', phone: '' });
  }

  function removeContact(index) {
    setContacts(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSend() {
    if (!selectedTemplate || contacts.length === 0) return;
    setSending(true);
    setResults(null);

    try {
      const res = await axios.post(`${API_URL}/send/bulk/${location.id}`, {
        templateId: selectedTemplate,
        contacts
      });
      setResults(res.data);
      setContacts([]);
      await loadStats();
      await loadHistory();
    } catch (err) {
      alert(`Send failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setSending(false);
    }
  }

  const emailTemplates = templates?.filter(t => t.channel === 'email') || [];
  const smsTemplates = templates?.filter(t => t.channel === 'sms') || [];
  const selectedTpl = templates?.find(t => t.id === selectedTemplate);

  const inputStyle = {
    width: '100%', padding: '10px 14px',
    border: '1px solid #e4e0d8', borderRadius: 8,
    fontSize: '0.875rem', outline: 'none',
    fontFamily: 'DM Sans, sans-serif', background: 'white'
  };

  return (
    <div>
      {/* Daily limit banner */}
      {dailyStats && (
        <div style={{
          background: '#f8f7f4', border: '1px solid #e4e0d8',
          borderRadius: 12, padding: '12px 20px', marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 8
        }}>
          <div style={{ fontSize: '0.825rem', color: '#7a7670' }}>
            <strong style={{ color: '#0d0d0d' }}>{dailyStats.sent_today || 0}</strong> sent today ·
            <strong style={{ color: '#0d0d0d' }}> {Math.max(0, parseInt(dailyStats.remaining_today || 100))}</strong> remaining (100/day limit)
          </div>
          <div style={{
            width: 200, height: 6, background: '#e4e0d8',
            borderRadius: 50, overflow: 'hidden'
          }}>
            <div style={{
              height: '100%', borderRadius: 50, background: '#0d0d0d',
              width: `${Math.min(100, ((dailyStats.sent_today || 0) / 100) * 100)}%`,
              transition: 'width 0.3s'
            }} />
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 0 }}>
        {[
          { id: 'contacts', label: `Send to contacts (${contacts.length})` },
          { id: 'history', label: `Send history (${history.length})` }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '8px 18px', fontSize: '0.8rem', fontWeight: 500,
            border: '1px solid #e4e0d8',
            borderBottom: activeTab === tab.id ? '1px solid white' : '1px solid #e4e0d8',
            borderRadius: '8px 8px 0 0',
            background: activeTab === tab.id ? 'white' : '#f8f7f4',
            color: activeTab === tab.id ? '#0d0d0d' : '#7a7670',
            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            marginBottom: activeTab === tab.id ? '-1px' : 0,
            position: 'relative', zIndex: activeTab === tab.id ? 1 : 0
          }}>{tab.label}</button>
        ))}
      </div>

      {/* CONTACTS TAB */}
      {activeTab === 'contacts' && (
        <div style={{
          background: 'white', border: '1px solid #e4e0d8',
          borderRadius: '0 8px 8px 8px', padding: 28
        }}>
          <div className="m-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

            {/* Left — add contacts */}
            <div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 16 }}>
                Add contacts
              </h3>

              {/* Paste / CSV */}
              <div style={{ marginBottom: 20 }}>
                <label style={{
                  fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: '#7a7670', marginBottom: 6, display: 'block'
                }}>Paste list (one per line)</label>
                <p style={{ fontSize: '0.78rem', color: '#7a7670', marginBottom: 8 }}>
                  Format: <code style={{ background: '#f0eeea', padding: '1px 6px', borderRadius: 4 }}>Name, email@example.com</code> or <code style={{ background: '#f0eeea', padding: '1px 6px', borderRadius: 4 }}>Name, +15551234567</code>
                </p>
                <textarea
                  style={{ ...inputStyle, minHeight: 100, resize: 'vertical', marginBottom: 8 }}
                  placeholder={"Sarah Johnson, sarah@gmail.com\nMike Smith, +15551234567\nJane Doe, jane@email.com"}
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleParsePaste} disabled={!pasteText.trim()} style={{
                    flex: 1, padding: '9px', borderRadius: 8,
                    background: pasteText.trim() ? '#0d0d0d' : '#c8c4bc',
                    color: 'white', border: 'none', fontSize: '0.825rem',
                    fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif'
                  }}>Add from paste</button>
                  <label style={{
                    flex: 1, padding: '9px', borderRadius: 8,
                    border: '1px solid #e4e0d8', background: '#f8f7f4',
                    fontSize: '0.825rem', fontWeight: 500, cursor: 'pointer',
                    textAlign: 'center', color: '#7a7670'
                  }}>
                    Upload CSV
                    <input type="file" accept=".csv,.txt" onChange={handleCSVUpload} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>

              {/* Manual add */}
              <div style={{
                background: '#f8f7f4', borderRadius: 10, padding: 16, marginBottom: 20
              }}>
                <label style={{
                  fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: '#7a7670', marginBottom: 10, display: 'block'
                }}>Add one manually</label>
                <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  <input style={{ ...inputStyle, flex: 1 }} placeholder="Full name" value={manualForm.name} onChange={e => setManualForm({ ...manualForm, name: e.target.value })} />
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <input style={{ ...inputStyle, flex: 1 }} type="email" placeholder="Email" value={manualForm.email} onChange={e => setManualForm({ ...manualForm, email: e.target.value })} />
                  <input style={{ ...inputStyle, flex: 1 }} type="tel" placeholder="Phone (SMS)" value={manualForm.phone} onChange={e => setManualForm({ ...manualForm, phone: e.target.value })} />
                </div>
                <button onClick={addManualContact} style={{
                  width: '100%', padding: '8px', borderRadius: 8,
                  border: '1px solid #e4e0d8', background: 'white',
                  fontSize: '0.825rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif'
                }}>+ Add contact</button>
              </div>

              {/* Template selector */}
              <div>
                <label style={{
                  fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: '#7a7670', marginBottom: 8, display: 'block'
                }}>Template to send</label>
                <select
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  value={selectedTemplate}
                  onChange={e => setSelectedTemplate(e.target.value)}
                >
                  <optgroup label="Email">
                    {emailTemplates.map(t => (
                      <option key={t.id} value={t.id}>📧 {t.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="SMS">
                    {smsTemplates.map(t => (
                      <option key={t.id} value={t.id}>💬 {t.name}</option>
                    ))}
                  </optgroup>
                </select>
                {selectedTpl && (
                  <div style={{
                    background: '#f8f7f4', borderRadius: 8, padding: '10px 12px',
                    marginTop: 8, fontSize: '0.78rem', color: '#7a7670', lineHeight: 1.6
                  }}>
                    {selectedTpl.body.substring(0, 100)}...
                  </div>
                )}
              </div>
            </div>

            {/* Right — contact list + send */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  Ready to send ({contacts.length})
                </h3>
                {contacts.length > 0 && (
                  <button onClick={() => setContacts([])} style={{
                    background: 'none', border: 'none', color: '#c0392b',
                    fontSize: '0.78rem', cursor: 'pointer', padding: 0,
                    fontFamily: 'DM Sans, sans-serif'
                  }}>Clear all</button>
                )}
              </div>

              {contacts.length === 0 ? (
                <div style={{
                  background: '#f8f7f4', borderRadius: 10, padding: 32,
                  textAlign: 'center', color: '#7a7670', fontSize: '0.875rem',
                  marginBottom: 16
                }}>
                  Add contacts on the left to get started
                </div>
              ) : (
                <div style={{
                  maxHeight: 300, overflowY: 'auto',
                  border: '1px solid #e4e0d8', borderRadius: 10,
                  marginBottom: 16
                }}>
                  {contacts.map((c, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', borderBottom: '1px solid #e4e0d8',
                      fontSize: '0.825rem'
                    }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{c.name}</div>
                        <div style={{ color: '#7a7670', fontSize: '0.78rem' }}>
                          {c.email || c.phone}
                          {c.email && c.phone && ` · ${c.phone}`}
                        </div>
                      </div>
                      <button onClick={() => removeContact(i)} style={{
                        background: 'none', border: 'none', color: '#c0392b',
                        cursor: 'pointer', fontSize: '1rem', padding: '0 4px'
                      }}>×</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Results */}
              {results && (
                <div style={{
                  background: results.failed === 0 ? '#f0fdf4' : '#fffbeb',
                  border: `1px solid ${results.failed === 0 ? '#bbf7d0' : '#fcd34d'}`,
                  borderRadius: 10, padding: '14px 16px', marginBottom: 16
                }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 6 }}>
                    {results.failed === 0 ? '✓ All sent!' : 'Sending complete'}
                  </div>
                  <div style={{ fontSize: '0.825rem', color: '#7a7670', lineHeight: 1.7 }}>
                    ✓ Sent: {results.sent} · ⟳ Skipped (already sent): {results.skipped} · ✗ Failed: {results.failed}
                  </div>
                </div>
              )}

              <button
                onClick={handleSend}
                disabled={sending || contacts.length === 0 || !selectedTemplate}
                style={{
                  width: '100%', padding: 14, borderRadius: 50,
                  background: sending || contacts.length === 0 ? '#c8c4bc' : '#0d0d0d',
                  color: 'white', border: 'none', fontSize: '0.9rem',
                  fontWeight: 600, cursor: contacts.length === 0 ? 'not-allowed' : 'pointer',
                  fontFamily: 'DM Sans, sans-serif'
                }}
              >
                {sending ? 'Sending...' : `Send to ${contacts.length} contact${contacts.length !== 1 ? 's' : ''} →`}
              </button>

              <p style={{ fontSize: '0.75rem', color: '#7a7670', textAlign: 'center', marginTop: 8, lineHeight: 1.5 }}>
                We automatically skip contacts sent to in the last 30 days.
                Max 100 sends per day.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <div style={{
          background: 'white', border: '1px solid #e4e0d8',
          borderRadius: '0 8px 8px 8px', overflow: 'hidden'
        }}>
          {history.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#7a7670', fontSize: '0.875rem' }}>
              No sends yet — start sending review requests to build your history
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f7f4', borderBottom: '1px solid #e4e0d8' }}>
                  {['Contact', 'Channel', 'Status', 'Sent'].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px', fontSize: '0.72rem', fontWeight: 700,
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                      color: '#7a7670', textAlign: 'left'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((send, i) => (
                  <tr key={send.id} style={{ borderBottom: '1px solid #e4e0d8' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{send.contact_name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#7a7670' }}>
                        {send.contact_email || send.contact_phone}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
                        padding: '2px 10px', borderRadius: 50,
                        background: send.channel === 'email' ? '#e8f5ef' : '#e8f0fe',
                        color: send.channel === 'email' ? '#1a6b45' : '#1a4baa'
                      }}>{send.channel}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 700,
                        padding: '2px 10px', borderRadius: 50,
                        background: send.status === 'sent' ? '#e8f5ef' : '#fee2e2',
                        color: send.status === 'sent' ? '#1a6b45' : '#c0392b'
                      }}>
                        {send.status === 'sent' ? '✓ Sent' : '✗ Failed'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#7a7670' }}>
                      {new Date(send.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
