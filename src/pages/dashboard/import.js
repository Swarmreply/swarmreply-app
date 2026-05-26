// ============================================
// src/pages/dashboard/import.js
// CSV Import & Automated Review Request Trigger
// 3-step flow: Upload → Preview → Schedule
// Works with any dental PMS or CRM export
// ============================================

import { useState, useRef, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import { getLocations } from '../../utils/api';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// ─── STEP INDICATOR ───
function StepBar({ step }) {
  const steps = ['Upload', 'Preview', 'Schedule'];
  return (
    <div style={{ display: 'flex', gap: 0, marginBottom: 28 }}>
      {steps.map((s, i) => {
        const idx = i + 1;
        const done = step > idx;
        const active = step === idx;
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: done ? '#1a6b45' : active ? '#0d0d0d' : '#f0eeea',
                color: done || active ? 'white' : '#7a7670',
                fontSize: '0.8rem', fontWeight: 700, flexShrink: 0, transition: 'all 0.2s'
              }}>
                {done ? '✓' : idx}
              </div>
              <span style={{
                fontSize: '0.825rem', fontWeight: active ? 600 : 400,
                color: active ? '#0d0d0d' : done ? '#1a6b45' : '#7a7670'
              }}>{s}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: 2, background: done ? '#1a6b45' : '#e4e0d8',
                margin: '0 12px', transition: 'background 0.2s'
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── PMS GUIDE ───
function PMSGuide({ onClose }) {
  const guides = [
    {
      name: 'Dentrix',
      icon: '🦷',
      steps: [
        'Open Dentrix → Office Manager',
        'Reports → Patient Lists → select "Patients Seen"',
        'Set date range (e.g. last 7 days)',
        'Export as CSV or Excel',
        'Upload that file here'
      ]
    },
    {
      name: 'Eaglesoft',
      icon: '🦅',
      steps: [
        'Open Eaglesoft → Reports',
        'Clinical → Patient Visit Report',
        'Filter by date range',
        'Export → Save as CSV',
        'Upload that file here'
      ]
    },
    {
      name: 'Open Dental',
      icon: '📋',
      steps: [
        'Open Dental → Reports → Standard',
        'Patient Reports → Appointments',
        'Set date completed range',
        'Export to CSV',
        'Upload that file here'
      ]
    },
    {
      name: 'Any system',
      icon: '📊',
      steps: [
        'Export any list of customers/patients',
        'Ensure columns include: Name, Email or Phone',
        'Optionally include: Visit Date, Provider',
        'Save as .CSV file',
        'Upload that file here'
      ]
    }
  ];

  return (
    <div style={{
      background: '#f8f7f4', border: '1px solid #e4e0d8',
      borderRadius: 16, padding: 24, marginBottom: 24
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 16
      }}>
        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
          How to export from your software
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#7a7670', fontSize: '1.2rem', lineHeight: 1
          }}
        >×</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {guides.map(g => (
          <div key={g.name} style={{
            background: 'white', border: '1px solid #e4e0d8',
            borderRadius: 10, padding: 14
          }}>
            <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>{g.icon}</div>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 8 }}>{g.name}</div>
            <ol style={{ paddingLeft: 16, margin: 0 }}>
              {g.steps.map((step, i) => (
                <li key={i} style={{
                  fontSize: '0.75rem', color: '#7a7670',
                  lineHeight: 1.6, marginBottom: 2
                }}>{step}</li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── IMPORT HISTORY ROW ───
function ImportRow({ imp, onViewContacts, onCancel }) {
  const statusColors = {
    pending: { bg: '#f0eeea', text: '#7a7670' },
    scheduled: { bg: '#fef3cd', text: '#92690a' },
    sending: { bg: '#e8f0fe', text: '#1a4baa' },
    complete: { bg: '#e8f5ef', text: '#1a6b45' },
    failed: { bg: '#fee2e2', text: '#c0392b' },
    cancelled: { bg: '#f0eeea', text: '#7a7670' }
  };
  const sc = statusColors[imp.status] || statusColors.pending;
  const progress = imp.to_send_count > 0
    ? Math.round((imp.sent_count / imp.to_send_count) * 100)
    : 0;

  return (
    <tr style={{ borderBottom: '1px solid #e4e0d8' }}>
      <td style={{ padding: '12px 16px' }}>
        <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>
          {imp.filename}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#7a7670', marginTop: 2 }}>
          {new Date(imp.created_at).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
          })}
        </div>
      </td>
      <td style={{ padding: '12px 16px', fontSize: '0.875rem' }}>
        {imp.to_send_count} contacts
        {imp.template_name && (
          <div style={{ fontSize: '0.75rem', color: '#7a7670', marginTop: 2 }}>
            via {imp.template_channel?.toUpperCase()} — {imp.template_name}
          </div>
        )}
      </td>
      <td style={{ padding: '12px 16px' }}>
        <span style={{
          background: sc.bg, color: sc.text,
          padding: '3px 10px', borderRadius: 50,
          fontSize: '0.72rem', fontWeight: 700, textTransform: 'capitalize'
        }}>{imp.status}</span>
      </td>
      <td style={{ padding: '12px 16px', width: 140 }}>
        {imp.status === 'complete' ? (
          <div>
            <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#1a6b45' }}>
              {imp.sent_count}/{imp.to_send_count} sent
            </div>
            <div style={{
              height: 4, background: '#f0eeea', borderRadius: 50,
              overflow: 'hidden', marginTop: 4
            }}>
              <div style={{
                height: '100%', width: `${progress}%`,
                background: '#1a6b45', borderRadius: 50
              }} />
            </div>
          </div>
        ) : imp.status === 'sending' ? (
          <div style={{ fontSize: '0.825rem', color: '#1a4baa' }}>
            Sending... {imp.sent_count}/{imp.to_send_count}
          </div>
        ) : imp.status === 'scheduled' ? (
          <div style={{ fontSize: '0.75rem', color: '#92690a' }}>
            Scheduled for<br />
            {imp.scheduled_for
              ? new Date(imp.scheduled_for).toLocaleTimeString('en-US', {
                  hour: '2-digit', minute: '2-digit'
                })
              : 'soon'}
          </div>
        ) : '—'}
      </td>
      <td style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => onViewContacts(imp)}
            style={{
              padding: '5px 12px', borderRadius: 6, fontSize: '0.75rem',
              border: '1px solid #e4e0d8', background: 'white',
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif'
            }}
          >View</button>
          {['pending', 'scheduled'].includes(imp.status) && (
            <button
              onClick={() => onCancel(imp.id)}
              style={{
                padding: '5px 12px', borderRadius: 6, fontSize: '0.75rem',
                border: '1px solid #fecaca', background: '#fff5f5',
                color: '#c0392b', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif'
              }}
            >Cancel</button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── MAIN PAGE ───
export default function ImportPage() {
  const { customer } = useAuth();
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [step, setStep] = useState(1);
  const [showGuide, setShowGuide] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [imports, setImports] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [viewingImport, setViewingImport] = useState(null);
  const [viewContacts, setViewContacts] = useState([]);

  // Schedule settings
  const [templateId, setTemplateId] = useState('');
  const [sendDelay, setSendDelay] = useState(0);
  const [scheduling, setScheduling] = useState(false);
  const [scheduled, setScheduled] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (customer) loadInitialData();
  }, [customer]);

  async function loadInitialData() {
    const locs = await getLocations(customer.id);
    setLocations(locs);
    if (locs.length > 0) {
      setSelectedLocation(locs[0]);
      await Promise.all([
        loadTemplates(locs[0].id),
        loadHistory(locs[0].id)
      ]);
    }
  }

  async function loadTemplates(locationId) {
    try {
      const res = await axios.get(`${API_URL}/templates/${locationId}`);
      setTemplates(res.data.templates || []);
      if (res.data.templates?.length > 0) {
        setTemplateId(res.data.templates[0].id);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  }

  async function loadHistory(locationId) {
    setLoadingHistory(true);
    try {
      const res = await axios.get(`${API_URL}/imports/${locationId}`);
      setImports(res.data.imports || []);
    } catch (err) {
      console.error('Failed to load import history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }

  // ─── FILE HANDLING ───
  const handleFile = useCallback(async (file) => {
    if (!file || !selectedLocation) return;
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      alert('Please upload a .CSV file');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dayWindow', '30');

      const res = await axios.post(
        `${API_URL}/imports/${selectedLocation.id}/preview`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setPreview(res.data);
      setStep(2);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to parse CSV. Please check the file format.');
    } finally {
      setUploading(false);
    }
  }, [selectedLocation]);

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  // ─── SCHEDULE ───
  async function handleSchedule() {
    if (!preview || !templateId || !selectedLocation) return;
    setScheduling(true);
    try {
      const res = await axios.post(`${API_URL}/imports/${selectedLocation.id}/confirm`, {
        contactsJson: preview.contactsJson,
        templateId,
        sendDelayHours: sendDelay,
        filename: preview.filename
      });

      setScheduled(res.data);
      setStep(3);
      await loadHistory(selectedLocation.id);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to schedule import');
    } finally {
      setScheduling(false);
    }
  }

  // ─── VIEW CONTACTS ───
  async function handleViewContacts(imp) {
    setViewingImport(imp);
    try {
      const res = await axios.get(
        `${API_URL}/imports/${selectedLocation.id}/${imp.id}/contacts`
      );
      setViewContacts(res.data.contacts || []);
    } catch (err) {
      setViewContacts([]);
    }
  }

  async function handleCancel(importId) {
    if (!confirm('Cancel this scheduled import? Contacts will not be sent.')) return;
    try {
      await axios.delete(`${API_URL}/imports/${selectedLocation.id}/${importId}`);
      await loadHistory(selectedLocation.id);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel');
    }
  }

  function resetToUpload() {
    setStep(1);
    setPreview(null);
    setScheduled(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px',
    border: '1px solid #e4e0d8', borderRadius: 10,
    fontSize: '0.875rem', outline: 'none',
    fontFamily: 'DM Sans, sans-serif', background: 'white'
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
          <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>
            Import Contacts & Send Review Requests
          </h2>
          <p style={{ fontSize: '0.78rem', color: '#7a7670', marginTop: 1 }}>
            Upload a patient or customer list — requests fire automatically
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {locations.length > 1 && (
            <select
              value={selectedLocation?.id || ''}
              onChange={e => {
                const loc = locations.find(l => l.id === e.target.value);
                if (loc) {
                  setSelectedLocation(loc);
                  loadTemplates(loc.id);
                  loadHistory(loc.id);
                  resetToUpload();
                }
              }}
              style={{ ...inputStyle, width: 'auto' }}
            >
              {locations.map(l => (
                <option key={l.id} value={l.id}>{l.business_name}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => setShowGuide(g => !g)}
            style={{
              padding: '9px 18px', borderRadius: 50, fontSize: '0.825rem',
              border: '1px solid #e4e0d8', background: 'white',
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif'
            }}
          >
            {showGuide ? 'Hide guide' : '? How to export from my PMS'}
          </button>
        </div>
      </div>

      <div style={{ padding: '28px 32px' }}>
        {showGuide && <PMSGuide onClose={() => setShowGuide(false)} />}

        <StepBar step={step} />

        {/* ─── STEP 1: UPLOAD ─── */}
        {step === 1 && (
          <div style={{ maxWidth: 640 }}>
            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? '#0d0d0d' : '#c8c4bc'}`,
                borderRadius: 16, padding: '48px 32px', textAlign: 'center',
                cursor: 'pointer', background: dragging ? '#f8f7f4' : 'white',
                transition: 'all 0.15s', marginBottom: 24
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files[0])}
              />
              {uploading ? (
                <>
                  <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⏳</div>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Parsing your CSV...</div>
                  <div style={{ color: '#7a7670', fontSize: '0.875rem' }}>
                    Detecting columns and validating contacts
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📁</div>
                  <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 8 }}>
                    {dragging ? 'Drop your CSV here' : 'Click to upload or drag and drop'}
                  </div>
                  <div style={{ color: '#7a7670', fontSize: '0.875rem', marginBottom: 16 }}>
                    CSV files from Dentrix, Eaglesoft, Open Dental, HubSpot, or any source
                  </div>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: '#f0eeea', padding: '6px 16px',
                    borderRadius: 50, fontSize: '0.8rem', color: '#7a7670'
                  }}>
                    .CSV · up to 5MB · max 500 contacts per import
                  </div>
                </>
              )}
            </div>

            {/* Required columns info */}
            <div style={{
              background: '#f8f7f4', border: '1px solid #e4e0d8',
              borderRadius: 12, padding: 20
            }}>
              <div style={{
                fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: '#7a7670', marginBottom: 12
              }}>
                Required columns in your CSV
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { field: 'Name (or First Name + Last Name)', required: true, note: 'Patient or customer name' },
                  { field: 'Email or Phone (or both)', required: true, note: 'At least one contact method' },
                  { field: 'Visit Date / Appointment Date', required: false, note: 'Optional — for your records' },
                  { field: 'Provider / Doctor', required: false, note: 'Optional — for personalisation' }
                ].map((col, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                      background: col.required ? '#0d0d0d' : '#f0eeea',
                      color: col.required ? 'white' : '#7a7670',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.65rem', fontWeight: 700, marginTop: 1
                    }}>
                      {col.required ? '✓' : '○'}
                    </span>
                    <div>
                      <div style={{ fontSize: '0.825rem', fontWeight: 500 }}>{col.field}</div>
                      <div style={{ fontSize: '0.75rem', color: '#7a7670' }}>{col.note}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{
                marginTop: 14, padding: '10px 14px',
                background: '#e8f5ef', borderRadius: 8,
                fontSize: '0.8rem', color: '#1a6b45', lineHeight: 1.6
              }}>
                ✓ SwarmReply auto-detects your column names — works with standard exports
                from Dentrix, Eaglesoft, Open Dental, HubSpot, Salesforce, and most spreadsheets.
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 2: PREVIEW ─── */}
        {step === 2 && preview && (
          <div style={{ maxWidth: 720 }}>
            {/* Stats summary */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
              gap: 14, marginBottom: 24
            }}>
              {[
                { label: 'Total in file', value: preview.stats.totalRows, color: '#0d0d0d' },
                { label: 'Ready to send', value: preview.stats.toSend, color: '#1a6b45' },
                { label: 'Already sent (30d)', value: preview.stats.recentlySent, color: '#7a7670' },
                { label: 'Skipped / invalid', value: preview.stats.skipped + preview.stats.duplicatesInFile, color: '#7a7670' }
              ].map((s, i) => (
                <div key={i} style={{
                  background: 'white', border: '1px solid #e4e0d8',
                  borderRadius: 12, padding: '16px 18px'
                }}>
                  <div style={{
                    fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: '#7a7670', marginBottom: 6
                  }}>{s.label}</div>
                  <div style={{
                    fontFamily: 'Playfair Display, serif',
                    fontSize: '1.8rem', fontWeight: 700, color: s.color
                  }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Detected columns */}
            <div style={{
              background: '#f8f7f4', border: '1px solid #e4e0d8',
              borderRadius: 12, padding: '14px 18px', marginBottom: 20
            }}>
              <div style={{
                fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: '#7a7670', marginBottom: 8
              }}>Detected columns</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {preview.detectedHeaders.map((h, i) => (
                  <span key={i} style={{
                    background: 'white', border: '1px solid #e4e0d8',
                    padding: '3px 10px', borderRadius: 6,
                    fontSize: '0.78rem', color: '#7a7670'
                  }}>{h || `Column ${i + 1}`}</span>
                ))}
              </div>
            </div>

            {/* Sample contacts */}
            <div style={{
              background: 'white', border: '1px solid #e4e0d8',
              borderRadius: 12, overflow: 'hidden', marginBottom: 20
            }}>
              <div style={{
                padding: '12px 18px', borderBottom: '1px solid #e4e0d8',
                fontSize: '0.875rem', fontWeight: 600
              }}>
                Sample — first {Math.min(preview.sample.length, 10)} contacts
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f7f4' }}>
                    {['Name', 'Email', 'Phone', 'Visit Date', 'Provider'].map(h => (
                      <th key={h} style={{
                        padding: '9px 14px', fontSize: '0.72rem', fontWeight: 700,
                        letterSpacing: '0.06em', textTransform: 'uppercase',
                        color: '#7a7670', textAlign: 'left',
                        borderBottom: '1px solid #e4e0d8'
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.sample.map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #e4e0d8' }}>
                      <td style={{ padding: '10px 14px', fontSize: '0.875rem', fontWeight: 500 }}>
                        {c.name}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.825rem', color: '#7a7670' }}>
                        {c.email || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.825rem', color: '#7a7670' }}>
                        {c.phone || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.825rem', color: '#7a7670' }}>
                        {c.visitDate || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.825rem', color: '#7a7670' }}>
                        {c.provider || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.stats.toSend > 10 && (
                <div style={{
                  padding: '10px 18px', background: '#f8f7f4',
                  fontSize: '0.8rem', color: '#7a7670',
                  borderTop: '1px solid #e4e0d8'
                }}>
                  + {preview.stats.toSend - 10} more contacts not shown
                </div>
              )}
            </div>

            {/* Parse errors */}
            {preview.errors.length > 0 && (
              <div style={{
                background: '#fff5f5', border: '1px solid #fecaca',
                borderRadius: 12, padding: '14px 18px', marginBottom: 20
              }}>
                <div style={{
                  fontSize: '0.825rem', fontWeight: 600, color: '#c0392b', marginBottom: 8
                }}>
                  {preview.errors.length} row{preview.errors.length !== 1 ? 's' : ''} skipped
                </div>
                {preview.errors.slice(0, 5).map((e, i) => (
                  <div key={i} style={{
                    fontSize: '0.78rem', color: '#c0392b', lineHeight: 1.5
                  }}>• {e}</div>
                ))}
                {preview.errors.length > 5 && (
                  <div style={{ fontSize: '0.78rem', color: '#c0392b', marginTop: 4 }}>
                    + {preview.errors.length - 5} more
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={resetToUpload}
                style={{
                  padding: '12px 24px', borderRadius: 50, fontSize: '0.9rem',
                  border: '1px solid #e4e0d8', background: 'white',
                  cursor: 'pointer', fontFamily: 'DM Sans, sans-serif'
                }}
              >← Upload different file</button>
              <button
                onClick={() => setStep(3)}
                disabled={preview.stats.toSend === 0}
                style={{
                  padding: '12px 28px', borderRadius: 50, fontSize: '0.9rem',
                  fontWeight: 600, cursor: preview.stats.toSend === 0 ? 'not-allowed' : 'pointer',
                  border: 'none', fontFamily: 'DM Sans, sans-serif',
                  background: preview.stats.toSend === 0 ? '#c8c4bc' : '#0d0d0d',
                  color: 'white'
                }}
              >
                Continue with {preview.stats.toSend} contacts →
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: SCHEDULE (before confirmed) ─── */}
        {step === 3 && !scheduled && preview && (
          <div style={{ maxWidth: 520 }}>
            <div style={{
              background: 'white', border: '1px solid #e4e0d8',
              borderRadius: 16, padding: 28, marginBottom: 20
            }}>
              <div style={{ marginBottom: 20 }}>
                <label style={{
                  display: 'block', fontSize: '0.78rem', fontWeight: 700,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  color: '#7a7670', marginBottom: 8
                }}>Template to send</label>
                <select
                  style={inputStyle}
                  value={templateId}
                  onChange={e => setTemplateId(e.target.value)}
                >
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.channel === 'email' ? '📧' : '💬'} {t.name}
                    </option>
                  ))}
                </select>
                {templates.find(t => t.id === templateId) && (
                  <div style={{
                    background: '#f8f7f4', borderRadius: 8, padding: '10px 14px',
                    marginTop: 8, fontSize: '0.78rem', color: '#7a7670',
                    fontFamily: 'monospace', lineHeight: 1.6
                  }}>
                    {templates.find(t => t.id === templateId)?.body?.substring(0, 100)}...
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{
                  display: 'block', fontSize: '0.78rem', fontWeight: 700,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  color: '#7a7670', marginBottom: 8
                }}>When to send</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { value: 0, label: 'Send now', desc: 'Immediately after confirming' },
                    { value: 1, label: 'In 1 hour', desc: 'Good for same-day visits' },
                    { value: 2, label: 'In 2 hours', desc: 'Recommended for dental' },
                    { value: 24, label: 'Tomorrow', desc: 'Next business day' }
                  ].map(opt => (
                    <div
                      key={opt.value}
                      onClick={() => setSendDelay(opt.value)}
                      style={{
                        padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                        border: `1.5px solid ${sendDelay === opt.value ? '#0d0d0d' : '#e4e0d8'}`,
                        background: sendDelay === opt.value ? '#f8f7f4' : 'white',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{opt.label}</div>
                      <div style={{ fontSize: '0.75rem', color: '#7a7670', marginTop: 2 }}>
                        {opt.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div style={{
                background: '#f8f7f4', border: '1px solid #e4e0d8',
                borderRadius: 10, padding: '14px 16px', marginBottom: 20
              }}>
                <div style={{ fontSize: '0.875rem', lineHeight: 1.7 }}>
                  <div>
                    <span style={{ color: '#7a7670' }}>Sending to:</span>{' '}
                    <strong>{preview.stats.toSend} contacts</strong>
                  </div>
                  <div>
                    <span style={{ color: '#7a7670' }}>Template:</span>{' '}
                    <strong>{templates.find(t => t.id === templateId)?.name || '—'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#7a7670' }}>When:</span>{' '}
                    <strong>{sendDelay === 0 ? 'Immediately' : `In ${sendDelay} hour${sendDelay !== 1 ? 's' : ''}`}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#7a7670' }}>Location:</span>{' '}
                    <strong>{selectedLocation?.business_name}</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setStep(2)}
                  style={{
                    padding: '12px 20px', borderRadius: 50, fontSize: '0.9rem',
                    border: '1px solid #e4e0d8', background: 'white',
                    cursor: 'pointer', fontFamily: 'DM Sans, sans-serif'
                  }}
                >← Back</button>
                <button
                  onClick={handleSchedule}
                  disabled={scheduling || !templateId}
                  style={{
                    flex: 1, padding: '12px', borderRadius: 50, fontSize: '0.9rem',
                    fontWeight: 600, border: 'none', fontFamily: 'DM Sans, sans-serif',
                    background: scheduling ? '#c8c4bc' : '#f5c842',
                    color: '#0d0d0d', cursor: scheduling ? 'not-allowed' : 'pointer'
                  }}
                >
                  {scheduling
                    ? 'Scheduling...'
                    : sendDelay === 0
                      ? `Send to ${preview.stats.toSend} contacts now 🐝`
                      : `Schedule ${preview.stats.toSend} contacts →`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 3: CONFIRMED ─── */}
        {step === 3 && scheduled && (
          <div style={{ maxWidth: 520 }}>
            <div style={{
              background: 'white', border: '1px solid #e4e0d8',
              borderRadius: 16, padding: 36, textAlign: 'center', marginBottom: 24
            }}>
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>🐝</div>
              <h3 style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: '1.5rem', fontWeight: 700, marginBottom: 10
              }}>
                {scheduled.status === 'sending' ? 'Sending now!' : 'Scheduled!'}
              </h3>
              <p style={{ color: '#7a7670', marginBottom: 20, lineHeight: 1.7 }}>
                {scheduled.message}
              </p>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: 12, marginBottom: 24, textAlign: 'left'
              }}>
                <div style={{
                  background: '#f8f7f4', borderRadius: 10, padding: '12px 16px'
                }}>
                  <div style={{ fontSize: '0.72rem', color: '#7a7670', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Contacts</div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', fontWeight: 700 }}>
                    {scheduled.contactCount}
                  </div>
                </div>
                <div style={{
                  background: '#f8f7f4', borderRadius: 10, padding: '12px 16px'
                }}>
                  <div style={{ fontSize: '0.72rem', color: '#7a7670', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Status</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, textTransform: 'capitalize' }}>
                    {scheduled.status}
                  </div>
                </div>
              </div>
              <button
                onClick={resetToUpload}
                style={{
                  padding: '12px 28px', borderRadius: 50, fontSize: '0.9rem',
                  fontWeight: 600, border: 'none', background: '#0d0d0d',
                  color: 'white', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif'
                }}
              >Import another file</button>
            </div>
          </div>
        )}

        {/* ─── IMPORT HISTORY ─── */}
        <div style={{ marginTop: 40 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 16
          }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Import history</div>
            <button
              onClick={() => selectedLocation && loadHistory(selectedLocation.id)}
              style={{
                background: 'none', border: 'none', color: '#7a7670',
                fontSize: '0.825rem', cursor: 'pointer', padding: 0,
                fontFamily: 'DM Sans, sans-serif'
              }}
            >↻ Refresh</button>
          </div>

          {/* Contact detail modal */}
          {viewingImport && (
            <div style={{
              background: 'white', border: '1px solid #e4e0d8',
              borderRadius: 14, overflow: 'hidden', marginBottom: 20
            }}>
              <div style={{
                padding: '14px 20px', borderBottom: '1px solid #e4e0d8',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  {viewingImport.filename} — {viewContacts.length} contacts
                </div>
                <button
                  onClick={() => { setViewingImport(null); setViewContacts([]); }}
                  style={{
                    background: 'none', border: 'none', color: '#7a7670',
                    cursor: 'pointer', fontSize: '1.2rem'
                  }}
                >×</button>
              </div>
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8f7f4', position: 'sticky', top: 0 }}>
                      {['Name', 'Contact', 'Visit Date', 'Status', 'Sent'].map(h => (
                        <th key={h} style={{
                          padding: '8px 14px', fontSize: '0.72rem', fontWeight: 700,
                          letterSpacing: '0.06em', textTransform: 'uppercase',
                          color: '#7a7670', textAlign: 'left',
                          borderBottom: '1px solid #e4e0d8'
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {viewContacts.map((c, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #e4e0d8' }}>
                        <td style={{ padding: '9px 14px', fontSize: '0.825rem', fontWeight: 500 }}>
                          {c.name}
                        </td>
                        <td style={{ padding: '9px 14px', fontSize: '0.8rem', color: '#7a7670' }}>
                          {c.email || c.phone || '—'}
                        </td>
                        <td style={{ padding: '9px 14px', fontSize: '0.8rem', color: '#7a7670' }}>
                          {c.visit_date || '—'}
                        </td>
                        <td style={{ padding: '9px 14px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 50,
                            fontSize: '0.7rem', fontWeight: 700,
                            background: c.status === 'sent' ? '#e8f5ef' : c.status === 'failed' ? '#fee2e2' : '#f0eeea',
                            color: c.status === 'sent' ? '#1a6b45' : c.status === 'failed' ? '#c0392b' : '#7a7670'
                          }}>
                            {c.status}
                          </span>
                        </td>
                        <td style={{ padding: '9px 14px', fontSize: '0.78rem', color: '#7a7670' }}>
                          {c.sent_at ? new Date(c.sent_at).toLocaleTimeString('en-US', {
                            hour: '2-digit', minute: '2-digit'
                          }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {loadingHistory ? (
            <div style={{ textAlign: 'center', padding: 32, color: '#7a7670' }}>
              Loading history...
            </div>
          ) : imports.length === 0 ? (
            <div style={{
              background: 'white', border: '1px solid #e4e0d8',
              borderRadius: 14, padding: 32, textAlign: 'center', color: '#7a7670'
            }}>
              <div style={{ fontSize: '1.8rem', marginBottom: 10 }}>📁</div>
              No imports yet — upload your first contact list above.
            </div>
          ) : (
            <div style={{
              background: 'white', border: '1px solid #e4e0d8',
              borderRadius: 14, overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f7f4' }}>
                    {['File', 'Contacts', 'Status', 'Progress', 'Actions'].map(h => (
                      <th key={h} style={{
                        padding: '10px 16px', fontSize: '0.72rem', fontWeight: 700,
                        letterSpacing: '0.06em', textTransform: 'uppercase',
                        color: '#7a7670', textAlign: 'left',
                        borderBottom: '1px solid #e4e0d8'
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {imports.map(imp => (
                    <ImportRow
                      key={imp.id}
                      imp={imp}
                      onViewContacts={handleViewContacts}
                      onCancel={handleCancel}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
