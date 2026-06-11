// ============================================
// pages/dashboard/support.js
// Support — deflection-first help. Customers search the Help Center
// catalog as they type; matching articles open at swarmreply.com/help.
// Only after searching does the "email our team" form reveal — the form
// sends via POST /api/support as the logged-in customer, and we reply
// to their email directly.
// ============================================

import { useState, useRef } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import { sendSupportRequest } from '../../utils/api';

const HELP_BASE = 'https://swarmreply.com/help';

// Help Center catalog — mirrors files/help.html on the website repo.
// If you add articles there, add them here too so in-app search finds them.
const ARTICLES = [
  { id: 'welcome', t: 'Welcome to SwarmReply', c: 'Getting started' },
  { id: 'connect-google', t: 'How to connect Google Business Profile', c: 'Getting started' },
  { id: 'first-review-request', t: 'Sending your first review request', c: 'Getting started' },
  { id: 'onboarding-checklist', t: 'Onboarding checklist', c: 'Getting started' },
  { id: 'invite-team', t: 'Inviting team members', c: 'Getting started' },
  { id: 'import-contacts', t: 'Importing contacts from CSV', c: 'Review Generation' },
  { id: 'review-platforms', t: 'Choosing your review platform', c: 'Review Generation' },
  { id: 'sms-requests', t: 'Sending review requests via SMS', c: 'Review Generation' },
  { id: 'template-customise', t: 'Customising review request templates', c: 'Review Generation' },
  { id: 'review-widget', t: 'Setting up the review widget', c: 'Review Generation' },
  { id: 'request-timing', t: 'Scheduling review request timing', c: 'Review Generation' },
  { id: 'survey-setup', t: 'Setting up your NPS survey', c: 'Surveys & NPS' },
  { id: 'nps-routing', t: 'How NPS routing works', c: 'Surveys & NPS' },
  { id: 'promoter-destination', t: 'Setting your promoter destination', c: 'Surveys & NPS' },
  { id: 'survey-link', t: 'Sharing your survey link', c: 'Surveys & NPS' },
  { id: 'detractor-handling', t: 'Handling detractor responses', c: 'Surveys & NPS' },
  { id: 'embed-webchat', t: 'Adding the webchat widget to your website', c: 'Webchat & Inbox' },
  { id: 'webchat-setup', t: 'Webchat appearance settings', c: 'Webchat & Inbox' },
  { id: 'ai-agent-setup', t: 'Setting up the AI chat agent', c: 'Webchat & Inbox' },
  { id: 'knowledge-base', t: 'Building your AI knowledge base', c: 'Webchat & Inbox' },
  { id: 'handoff', t: 'How handoffs work', c: 'Webchat & Inbox' },
  { id: 'inbox-manage', t: 'Managing your inbox', c: 'Webchat & Inbox' },
  { id: 'sms-bridge', t: 'How the SMS bridge works', c: 'Webchat & Inbox' },
  { id: 'webchat-notifications', t: 'Webchat notification settings', c: 'Webchat & Inbox' },
  { id: 'sms-campaign', t: 'Creating your first SMS campaign', c: 'SMS Campaigns' },
  { id: 'contact-import', t: 'Importing contacts for campaigns', c: 'SMS Campaigns' },
  { id: 'segments', t: 'Creating audience segments', c: 'SMS Campaigns' },
  { id: 'campaign-limits', t: 'SMS campaign limits by plan', c: 'SMS Campaigns' },
  { id: 'tcpa-compliance', t: 'TCPA compliance guide', c: 'SMS Campaigns' },
  { id: 'opt-outs', t: 'Managing opt-outs', c: 'SMS Campaigns' },
  { id: 'sms-best-practices', t: 'SMS campaign best practices', c: 'SMS Campaigns' },
  { id: 'listings-overview', t: 'How listings sync works', c: 'Listings Sync' },
  { id: 'fix-mismatch', t: 'Fixing a listing mismatch', c: 'Listings Sync' },
  { id: 'apple-maps', t: 'Connecting Apple Maps', c: 'Listings Sync' },
  { id: 'bing-places', t: 'Connecting Bing Places', c: 'Listings Sync' },
  { id: 'insights-overview', t: 'Insights dashboard overview', c: 'Insights & Analytics' },
  { id: 'sentiment-score', t: 'Understanding your sentiment score', c: 'Insights & Analytics' },
  { id: 'keyword-tracker', t: 'Using the keyword tracker', c: 'Insights & Analytics' },
  { id: 'competitor-benchmarking', t: 'Competitor benchmarking', c: 'Insights & Analytics' },
  { id: 'rating-velocity', t: 'Rating velocity explained', c: 'Insights & Analytics' },
  { id: 'monthly-report', t: 'Your monthly reputation report', c: 'Insights & Analytics' },
  { id: 'llm-overview', t: 'Understanding AI Visibility Monitoring', c: 'AI Visibility Monitoring' },
  { id: 'visibility-score', t: 'Understanding your visibility score', c: 'AI Visibility Monitoring' },
  { id: 'improve-visibility', t: 'How to improve your AI visibility', c: 'AI Visibility Monitoring' },
  { id: 'llm-setup', t: 'Setting up AI visibility monitoring', c: 'AI Visibility Monitoring' },
  { id: 'facebook-reviews', t: 'Replying to Facebook reviews', c: 'Integrations' },
  { id: 'connect-square', t: 'Connecting Square', c: 'Integrations' },
  { id: 'connect-hubspot', t: 'Connecting HubSpot CRM', c: 'Integrations' },
  { id: 'connect-shopify', t: 'Connecting Shopify', c: 'Integrations' },
  { id: 'connect-mindbody', t: 'Connecting Mindbody', c: 'Integrations' },
  { id: 'connect-calendly', t: 'Connecting Calendly', c: 'Integrations' },
  { id: 'connect-acuity', t: 'Connecting Acuity Scheduling', c: 'Integrations' },
  { id: 'connect-stripe-trigger', t: 'Setting up the Stripe payment trigger', c: 'Integrations' },
  { id: 'zapier-setup', t: 'Setting up Zapier integration', c: 'Integrations' },
  { id: 'csv-import', t: 'Importing contacts via CSV', c: 'Integrations' },
  { id: 'api-key', t: 'Using the SwarmReply API key', c: 'Integrations' },
  { id: 'billing-faq', t: 'Billing FAQ', c: 'Billing & Plans' },
  { id: 'upgrade-plan', t: 'Adding locations to your plan', c: 'Billing & Plans' },
  { id: 'cancel', t: 'Cancelling your subscription', c: 'Billing & Plans' },
  { id: 'update-card', t: 'Updating your payment method', c: 'Billing & Plans' },
  { id: 'invoices', t: 'Viewing and downloading invoices', c: 'Billing & Plans' },
  { id: 'account-settings', t: 'Account settings overview', c: 'Settings' },
  { id: 'alert-preferences', t: 'Setting your alert preferences', c: 'Settings' },
  { id: 'google-posts-settings', t: 'Google Posts auto-publisher settings', c: 'Settings' },
  { id: 'locations', t: 'Managing multiple locations', c: 'Settings' },];

const CAT_ICONS = {
  'Getting started': '🚀', 'Review Generation': '★', 'NPS Surveys': '◎',
  'Webchat & Inbox': '💬', 'SMS Campaigns': '📣', 'Listings': '📍',
  'Insights & Reports': '📊', 'AI Visibility': '✦', 'Integrations': '⊕',
  'Billing & Plans': '💳', 'Settings': '⚙', 'Help': '📖',
};

const inp = {
  width: '100%', boxSizing: 'border-box', padding: '12px 15px',
  border: '1.5px solid #e4e0d8', borderRadius: 11, fontFamily: 'inherit',
  fontSize: '.95rem', background: 'white', outline: 'none',
};

export default function Support() {
  const { customer } = useAuth();

  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [searched, setSearched] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [subject, setSubject]   = useState('');
  const [message, setMessage]   = useState('');
  const [sending, setSending]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [error, setError]       = useState('');
  const timer = useRef(null);

  function handleSearch(val) {
    setQuery(val);
    clearTimeout(timer.current);
    if (!val.trim()) { setResults([]); setSearched(false); return; }
    timer.current = setTimeout(() => {
      const q = val.trim().toLowerCase();
      const matches = ARTICLES.filter(a =>
        a.t.toLowerCase().includes(q) || a.c.toLowerCase().includes(q)
      ).slice(0, 7);
      setResults(matches);
      setSearched(true);
    }, 180);
  }

  async function send() {
    setError('');
    if (!subject.trim() || !message.trim()) {
      setError('Please add a subject and a message.');
      return;
    }
    setSending(true);
    try {
      await sendSupportRequest({ subject: subject.trim(), message: message.trim() });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'We couldn\u2019t send your message just now. Please email us at hello@swarmreply.com.');
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <DashboardLayout title="Support">
        <div style={{ maxWidth: 620 }}>
          <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: '40px 36px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.2rem', marginBottom: 12 }}>🐝</div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.4rem', fontWeight: 900, marginBottom: 8 }}>Message sent</div>
            <div style={{ fontSize: '.92rem', color: '#7a7670', lineHeight: 1.6 }}>
              We&rsquo;ve got it and we&rsquo;ll reply to <strong style={{ color: '#0a0a0a' }}>{customer?.email}</strong> — usually within a few hours on business days.
            </div>
            <button onClick={() => { setSent(false); setFormOpen(false); setSubject(''); setMessage(''); setQuery(''); setResults([]); setSearched(false); }}
              style={{ marginTop: 22, padding: '11px 20px', borderRadius: 10, border: '1px solid #e4e0d8', background: '#f8f7f4', cursor: 'pointer', fontFamily: 'inherit', fontSize: '.85rem', fontWeight: 600 }}>
              Done
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Support">
      <div style={{ maxWidth: 620 }}>
        <div style={{ fontSize: '.92rem', color: '#7a7670', marginBottom: 18, lineHeight: 1.6 }}>
          Tell us what you&rsquo;re trying to do — chances are there&rsquo;s a guide for it. If not, our team is one message away.
        </div>

        <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, padding: '26px 28px' }}>
          <div style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 10 }}>
            What do you need help with?
          </div>
          <input value={query} onChange={e => handleSearch(e.target.value)}
            placeholder={'Try \u201cconnect Google\u201d, \u201cSMS campaign\u201d, \u201cbilling\u201d\u2026'}
            style={inp} />

          {results.length > 0 && (
            <div style={{ marginTop: 14, border: '1px solid #ece9e2', borderRadius: 12, overflow: 'hidden' }}>
              {results.map(a => (
                <a key={a.id} href={`${HELP_BASE}#${a.id}`} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', textDecoration: 'none', borderBottom: '1px solid #ece9e2', background: 'white' }}>
                  <span style={{ fontSize: '1rem' }}>{CAT_ICONS[a.c] || '📖'}</span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontSize: '.9rem', fontWeight: 600, color: '#0a0a0a' }}>{a.t}</span>
                    <span style={{ display: 'block', fontSize: '.74rem', color: '#7a7670', marginTop: 2 }}>{a.c}</span>
                  </span>
                  <span style={{ fontSize: '.78rem', color: '#7a7670' }}>↗</span>
                </a>
              ))}
            </div>
          )}

          {searched && results.length === 0 && (
            <div style={{ marginTop: 14, fontSize: '.85rem', color: '#7a7670' }}>
              No matching articles — go ahead and email us below.
            </div>
          )}

          {searched && !formOpen && (
            <button onClick={() => setFormOpen(true)}
              style={{ marginTop: 16, padding: '11px 18px', borderRadius: 10, border: '1px solid #e4e0d8', background: '#f8f7f4', cursor: 'pointer', fontFamily: 'inherit', fontSize: '.85rem', fontWeight: 600 }}>
              {results.length > 0 ? 'None of these helped — email our team →' : 'Email our team →'}
            </button>
          )}

          {formOpen && (
            <div style={{ marginTop: 20, borderTop: '1px solid #ece9e2', paddingTop: 20 }}>
              <div style={{ fontSize: '.78rem', color: '#7a7670', marginBottom: 12 }}>
                Sending as <strong style={{ color: '#0a0a0a' }}>{customer?.email}</strong> — we&rsquo;ll reply there.
              </div>
              <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" maxLength={200}
                style={{ ...inp, marginBottom: 12 }} />
              <textarea rows={5} value={message} onChange={e => setMessage(e.target.value)} maxLength={5000}
                placeholder={'Tell us what\u2019s going on \u2014 the more detail, the faster we can help.'}
                style={{ ...inp, padding: '13px 15px', borderRadius: 12, resize: 'vertical', fontSize: '.9rem' }} />
              {error && <div style={{ marginTop: 10, fontSize: '.85rem', color: '#a4282a' }}>{error}</div>}
              <button onClick={send} disabled={sending}
                style={{ marginTop: 12, padding: '12px 22px', borderRadius: 10, border: 'none', background: '#0a0a0a', color: 'white', cursor: sending ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: '.88rem', fontWeight: 600, opacity: sending ? 0.6 : 1 }}>
                {sending ? 'Sending\u2026' : 'Send to support'}
              </button>
            </div>
          )}
        </div>

        <div style={{ marginTop: 18, fontSize: '.8rem', color: '#7a7670' }}>
          Prefer to browse? Visit the full{' '}
          <a href={HELP_BASE} target="_blank" rel="noreferrer" style={{ color: '#0a0a0a' }}>Help Center ↗</a>
        </div>
      </div>
    </DashboardLayout>
  );
}
