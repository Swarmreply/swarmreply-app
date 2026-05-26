// ============================================
// src/pages/dashboard/alerts.js
// Alert preferences management page
// Control when and how you get notified
// ============================================

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function AlertSettings() {
  const { customer, reload } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    alertAllReviews: false,
    alertEmail: ''
  });

  useEffect(() => {
    if (customer) {
      setForm({
        alertAllReviews: customer.alert_all_reviews || false,
        alertEmail: customer.alert_email || customer.email || ''
      });
    }
  }, [customer]);

  async function handleSave() {
    setSaving(true);
    try {
      await axios.put(`${API_URL}/customers/${customer.id}/alerts`, form);
      setSaved(true);
      reload();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const toggleStyle = (active) => ({
    width: 44, height: 24, borderRadius: 50,
    background: active ? '#0d0d0d' : '#e4e0d8',
    position: 'relative', cursor: 'pointer',
    transition: 'background 0.2s', flexShrink: 0
  });

  const knobStyle = (active) => ({
    position: 'absolute', top: 3,
    left: active ? 23 : 3,
    width: 18, height: 18, borderRadius: '50%',
    background: 'white', transition: 'left 0.2s'
  });

  return (
    <DashboardLayout>
      <div style={{
        background: 'white', borderBottom: '1px solid #e4e0d8',
        padding: '16px 32px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Review Alerts</h2>
          <p style={{ fontSize: '0.78rem', color: '#7a7670', marginTop: 1 }}>
            Get notified the moment a new review comes in
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '10px 24px', borderRadius: 50,
            background: saved ? '#1a6b45' : '#0d0d0d',
            color: 'white', border: 'none', fontSize: '0.875rem',
            fontWeight: 600, cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif', transition: 'background 0.2s'
          }}
        >
          {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Changes'}
        </button>
      </div>

      <div style={{ padding: '28px 32px', maxWidth: 600 }}>

        {/* Alert email */}
        <div style={{
          background: 'white', border: '1px solid #e4e0d8',
          borderRadius: 16, padding: 28, marginBottom: 20
        }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 6 }}>
            Alert email address
          </h3>
          <p style={{ fontSize: '0.825rem', color: '#7a7670', marginBottom: 16, lineHeight: 1.6 }}>
            Where should we send review notifications? Defaults to your account email.
          </p>
          <input
            type="email"
            value={form.alertEmail}
            onChange={e => setForm({ ...form, alertEmail: e.target.value })}
            placeholder="you@yourbusiness.com"
            style={{
              width: '100%', padding: '12px 16px',
              border: '1px solid #e4e0d8', borderRadius: 10,
              fontSize: '0.9rem', outline: 'none',
              fontFamily: 'DM Sans, sans-serif'
            }}
          />
        </div>

        {/* Alert type */}
        <div style={{
          background: 'white', border: '1px solid #e4e0d8',
          borderRadius: 16, padding: 28, marginBottom: 20
        }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 16 }}>
            When to alert you
          </h3>

          {/* Always on — negative alerts */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            padding: '14px 0', borderBottom: '1px solid #e4e0d8'
          }}>
            <div style={{ flex: 1, paddingRight: 16 }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 4 }}>
                Negative reviews (1-2 stars)
                <span style={{
                  background: '#e8f5ef', color: '#1a6b45',
                  fontSize: '0.68rem', fontWeight: 700,
                  padding: '2px 8px', borderRadius: 50, marginLeft: 8
                }}>Always on</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#7a7670', lineHeight: 1.6 }}>
                You'll always be alerted for 1 and 2-star reviews so you can follow up with unhappy customers quickly.
              </div>
            </div>
            <div style={{ ...toggleStyle(true), cursor: 'default', opacity: 0.6 }}>
              <div style={knobStyle(true)} />
            </div>
          </div>

          {/* Optional — all review alerts */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            padding: '14px 0'
          }}>
            <div style={{ flex: 1, paddingRight: 16 }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 4 }}>
                All reviews (including positive)
              </div>
              <div style={{ fontSize: '0.8rem', color: '#7a7670', lineHeight: 1.6 }}>
                Get notified for every review — great for staying on top of your reputation in real time. Can be noisy for busy businesses.
              </div>
            </div>
            <div
              style={toggleStyle(form.alertAllReviews)}
              onClick={() => setForm({ ...form, alertAllReviews: !form.alertAllReviews })}
            >
              <div style={knobStyle(form.alertAllReviews)} />
            </div>
          </div>
        </div>

        {/* What the alert looks like */}
        <div style={{
          background: '#f8f7f4', border: '1px solid #e4e0d8',
          borderRadius: 16, padding: 24
        }}>
          <h3 style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 12 }}>
            What you'll receive
          </h3>
          <div style={{
            background: 'white', border: '1px solid #e4e0d8',
            borderRadius: 10, padding: 16
          }}>
            <div style={{
              background: '#c0392b', borderRadius: 8, padding: '10px 14px', marginBottom: 12
            }}>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '0.875rem' }}>
                🚨 Urgent: 1-star review needs attention
              </div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', marginTop: 2 }}>
                Bella's Kitchen · Just now
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: '#f0eeea', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#7a7670'
              }}>J</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.825rem' }}>James T.</div>
                <div style={{ color: '#e53e3e', fontSize: '0.75rem' }}>★☆☆☆☆</div>
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#7a7670', fontStyle: 'italic', marginBottom: 8 }}>
              "Food arrived cold and 45 minutes late..."
            </div>
            <div style={{
              background: '#e8f5ef', color: '#1a6b45',
              padding: '4px 10px', borderRadius: 50,
              fontSize: '0.7rem', fontWeight: 700, display: 'inline-block'
            }}>🐝 SwarmReply is drafting a response</div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
