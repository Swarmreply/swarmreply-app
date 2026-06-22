// ============================================
// src/components/WallabeeChat.js
// Wallabee — the floating support bee. Bottom-right on every dashboard
// screen. Deflection-first: answers come from the Help Center catalog
// (deterministic word-overlap matching — instant, free, no failure modes).
// If the guides don't cut it, Wallabee offers an in-chat message to the
// team (POST /api/support, replies go to the customer's email) plus a
// mailto fallback to hello@swarmreply.com.
// Conversation persists across page navigation via sessionStorage.
// ============================================

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { sendSupportRequest, askSupportAgent } from '../utils/api';

const HELP_BASE = 'https://swarmreply.com/help';
const GOLD = 'linear-gradient(135deg,var(--honey, #f5c842),var(--amber, #d4a515))';

// Help Center catalog — mirrors files/help.html on the website repo.
// If you add articles there, add them here too so Wallabee can find them.
const FALLBACK_ARTICLES = [
  { id: 'vs-yext', t: 'SwarmReply vs Yext — own your listings, don\u2019t rent them', c: 'Compare', u: '/compare/yext-alternative.html', k: 'yext alternative listings compare versus rent own sync' },
  { id: 'vs-broadly', t: 'SwarmReply vs Broadly — honest comparison', c: 'Compare', u: '/compare/broadly-alternative.html', k: 'broadly alternative compare versus price affordable onboarding' },
  { id: 'vs-reviewtrackers', t: 'SwarmReply vs ReviewTrackers — honest comparison', c: 'Compare', u: '/compare/reviewtrackers-alternative.html', k: 'reviewtrackers alternative compare versus monitoring' },
  { id: 'vs-birdeye', t: 'SwarmReply vs Birdeye — honest comparison', c: 'Compare', u: '/compare/birdeye-alternative.html', k: 'birdeye alternative compare versus price affordable switch' },
  { id: 'vs-podium', t: 'SwarmReply vs Podium — honest comparison', c: 'Compare', u: '/compare/podium-alternative.html', k: 'podium alternative compare versus price affordable switch contract' },
  { id: 'vs-nicejob', t: 'SwarmReply vs NiceJob — honest comparison', c: 'Compare', u: '/compare/nicejob-alternative.html', k: 'nicejob alternative compare versus reviews only' },
  { id: 'ai-visibility-explained', t: 'AI search visibility — show up in ChatGPT answers', c: 'Get Found', u: '/ai-search-visibility.html', k: 'chatgpt gemini claude ai visibility recommendations search appear' },
  { id: 'welcome', t: 'Welcome to SwarmReply', c: 'Getting started' },
  { id: 'connect-google', t: 'How to connect Google Business Profile', c: 'Getting started' },
  { id: 'first-review-request', t: 'Sending your first review request', c: 'Getting started' },
  { id: 'onboarding-checklist', t: 'Onboarding checklist', c: 'Getting started' },
  { id: 'invite-team', t: 'Inviting team members', c: 'Getting started' },
  { id: 'reply-templates', t: 'Customising AI reply style', c: 'AI Replies' },
  { id: 'edit-reply', t: 'Reviewing replies before they post', c: 'AI Replies' },
  { id: 'reply-quality', t: 'How reply quality is protected', c: 'AI Replies' },
  { id: 'multi-language', t: 'Multi-language replies', c: 'AI Replies' },
  { id: 'import-contacts', t: 'Importing contacts from CSV', c: 'Review Generation' },
  { id: 'review-platforms', t: 'Choosing your review platform', c: 'Review Generation' },
  { id: 'sms-requests', t: 'Sending review requests via SMS', c: 'Review Generation' },
  { id: 'template-customise', t: 'Customising review request templates', c: 'Review Generation' },
  { id: 'review-widget', t: 'Setting up the review widget', c: 'Review Generation' },
  { id: 'request-timing', t: 'When to send review requests', c: 'Review Generation' },
  { id: 'bulk-send', t: 'Sending review requests in bulk', c: 'Review Generation' },
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
  { id: 'listings-overview', t: 'How listings sync will work', c: 'Listings Sync' },
  { id: 'fix-mismatch', t: 'Fixing a listing mismatch', c: 'Listings Sync' },
  { id: 'apple-maps', t: 'Getting listed on Apple Maps', c: 'Listings Sync' },
  { id: 'bing-places', t: 'Getting listed on Bing Places', c: 'Listings Sync' },
  { id: 'insights-overview', t: 'Reports dashboard overview', c: 'Insights & Analytics' },
  { id: 'sentiment-score', t: 'Understanding your sentiment score', c: 'Insights & Analytics' },
  { id: 'keyword-tracker', t: 'Using the keyword tracker', c: 'Insights & Analytics' },
  { id: 'competitor-benchmarking', t: 'Competitor benchmarking', c: 'Insights & Analytics' },
  { id: 'rating-velocity', t: 'Rating velocity explained', c: 'Insights & Analytics' },
  { id: 'monthly-report', t: 'Your weekly summary email', c: 'Insights & Analytics' },
  { id: 'llm-overview', t: 'Understanding AI Visibility Monitoring', c: 'AI Visibility Monitoring' },
  { id: 'visibility-score', t: 'Understanding your visibility score', c: 'AI Visibility Monitoring' },
  { id: 'improve-visibility', t: 'How to improve your AI visibility', c: 'AI Visibility Monitoring' },
  { id: 'llm-setup', t: 'Setting up AI visibility monitoring', c: 'AI Visibility Monitoring' },
  { id: 'facebook-reviews', t: 'Connecting Facebook Reviews', c: 'Integrations' },
  { id: 'connect-square', t: 'Connecting Square', c: 'Integrations' },
  { id: 'connect-hubspot', t: 'Connecting HubSpot CRM', c: 'Integrations' },
  { id: 'connect-shopify', t: 'Connecting Shopify', c: 'Integrations' },
  { id: 'connect-mindbody', t: 'Connecting Mindbody', c: 'Integrations' },
  { id: 'connect-calendly', t: 'Connecting Calendly', c: 'Integrations' },
  { id: 'connect-acuity', t: 'Connecting Acuity Scheduling', c: 'Integrations' },
  { id: 'connect-stripe-trigger', t: 'Setting up the Stripe payment trigger', c: 'Integrations' },
  { id: 'zapier-setup', t: 'Zapier integration', c: 'Integrations' },
  { id: 'csv-import', t: 'Importing contacts via CSV', c: 'Integrations' },
  { id: 'api-key', t: 'Does SwarmReply have an API?', c: 'Integrations' },
  { id: 'connect-jobber', t: 'Connecting Jobber', c: 'Integrations' },
  { id: 'billing-faq', t: 'Billing FAQ', c: 'Billing & Plans' },
  { id: 'upgrade-plan', t: 'Adding locations to your plan', c: 'Billing & Plans' },
  { id: 'cancel', t: 'Cancelling your subscription', c: 'Billing & Plans' },
  { id: 'update-card', t: 'Updating your payment method', c: 'Billing & Plans' },
  { id: 'invoices', t: 'Viewing and downloading invoices', c: 'Billing & Plans' },
  { id: 'account-settings', t: 'Account settings overview', c: 'Settings' },
  { id: 'alert-preferences', t: 'Setting your alert preferences', c: 'Settings' },
  { id: 'google-posts-settings', t: 'Google Posts auto-publisher', c: 'Settings' },
  { id: 'locations', t: 'Managing multiple locations', c: 'Settings' },
  { id: 'review-links', t: 'Setting up your review links', c: 'Settings' },
];

// ── Single source of truth ───────────────────────────────────────────────────
// The catalog above is a baked-in fallback. The live list is the same
// help-catalog.json the marketing site serves. We fetch it once on mount; any
// failure (offline / blocked / CORS) silently keeps FALLBACK_ARTICLES.
const CATALOG_URL = 'https://swarmreply.com/help-catalog.json';
let CATALOG = FALLBACK_ARTICLES;
let catalogLoaded = false;
async function loadCatalog() {
  if (catalogLoaded) return;
  catalogLoaded = true;
  try {
    const r = await fetch(CATALOG_URL, { cache: 'default' });
    if (!r.ok) return;
    const data = await r.json();
    if (data && Array.isArray(data.articles) && data.articles.length &&
        data.articles[0] && data.articles[0].id) {
      CATALOG = data.articles;
    }
  } catch { /* offline / blocked / CORS — keep fallback */ }
}

// ── Matching ─────────────────────────────────────────────────────────────────
const STOP = new Set(['the','a','an','to','of','in','on','for','my','i','do',
  'how','can','is','it','me','with','and','or','what','where','when','why',
  'does','am','are','your','our','this','that','about','help','need','want',
  'get','set','up','have','please','you','swarmreply','work','works','working','use','using','make','new','still','really','just']);

const SYNONYMS = {
  gbp: 'google', gmb: 'google', text: 'sms', texts: 'sms', texting: 'sms',
  pay: 'billing', payment: 'billing', card: 'billing', credit: 'billing',
  charge: 'billing', debit: 'billing',
  price: 'plan', pricing: 'plan', cost: 'plan', subscription: 'billing',
  chat: 'webchat', chatbot: 'webchat', widget: 'webchat', bot: 'agent',
  csv: 'import', upload: 'import', cancel: 'cancelling', email: 'request',
  staff: 'team', employee: 'team', invite: 'team', star: 'review',
  stars: 'review', rating: 'review', ratings: 'review', chatgpt: 'ai',
  facebook: 'reviews', nps: 'survey', feedback: 'survey', stop: 'opt-outs',
  unsubscribe: 'opt-outs', ask: 'request', asking: 'request', texted: 'sms',
};

function tokenize(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/)
    .filter(w => w.length > 1 && !STOP.has(w))
    .map(w => SYNONYMS[w] || w);
}

function findArticles(question) {
  const qTokens = tokenize(question);
  if (!qTokens.length) return [];
  const scored = CATALOG.map(a => {
    const hay = tokenize(a.t + ' ' + a.c + ' ' + (a.k || ''));
    let score = 0;
    qTokens.forEach(qt => {
      if (hay.some(h => h === qt || (qt.length >= 4 && h.startsWith(qt)) || (h.length >= 4 && qt.startsWith(h)))) score += 1;
    });
    return { ...a, score };
  }).filter(a => a.score > 0);
  scored.sort((x, y) => y.score - x.score);
  return scored.slice(0, 3);
}

// ── Persistence ──────────────────────────────────────────────────────────────
const STORE_KEY = 'wallabee_chat_v1';
function loadState() {
  try { return JSON.parse(sessionStorage.getItem(STORE_KEY)) || null; } catch { return null; }
}
function saveState(s) {
  try { sessionStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch { /* full/blocked — fine */ }
}

// Route-aware opening: tailors the greeting + quick chips to the page the
// customer is on, then falls back to a getting-started greeting. Chips are
// canned questions — tapping one searches the catalog for that guide.
function freshConversation(pathname) {
  const p = String(pathname || '');
  const ctx = [
    ['/campaigns',  "You’re in Campaigns — here are the SMS essentials:",        ['SMS campaign limits', 'TCPA compliance', 'Managing opt-outs']],
    ['/grow',       "Sending review requests? These help:",                       ['Send your first request', 'Importing contacts', 'When to send requests']],
    ['/surveys',    "Setting up surveys? Start here:",                            ['Set up your NPS survey', 'How NPS routing works']],
    ['/inbox',      "Webchat & inbox — the common ones:",                          ['Add webchat to my site', 'Set up the AI agent', 'Manage my inbox']],
    ['/reviews',    "Managing your reviews? Try these:",                          ['Connect Facebook reviews', 'Set up the review widget', 'Review replies before posting']],
    ['/get-found',  "Getting found by AI assistants:",                            ['Set up AI visibility monitoring', 'Improve my AI visibility']],
    ['/ai-visib',   "Getting found by AI assistants:",                            ['Set up AI visibility monitoring', 'Improve my AI visibility']],
    ['/listings',   "Working on your listings?",                                  ['How listings sync works', 'Get listed on Apple Maps', 'Fixing a listing mismatch']],
    ['/pulse',      "Reading your reports — what the numbers mean:",              ['Understanding sentiment score', 'Using the keyword tracker', 'Rating velocity explained']],
    ['/integrations', "Connecting a tool? Pick one:",                             ['Connecting Google', 'Connecting Square', 'Connecting Jobber']],
    ['/settings',   "In Settings — the common ones:",                             ['Setting up your review links', 'Setting your alert preferences', 'Account settings overview']],
    ['/billing',    "Billing questions? These cover most of it:",                 ['Billing FAQ', 'Adding locations', 'Updating your payment method']],
    ['/reputation-widget', "Showing reviews on your site?",                       ['Setting up the review widget']],
  ];
  let line = "Hi! I’m Wallabee \uD83D\uDC1D — your support bee. A few popular starting points, or just ask me anything:";
  let chips = ['How to connect Google', 'Send your first request', 'Inviting team members'];
  for (const [frag, l, c] of ctx) { if (p.indexOf(frag) !== -1) { line = l; chips = c; break; } }
  return [
    { who: 'bee', type: 'text', text: line },
    { who: 'bee', type: 'chips', chips },
  ];
}

const GREETING = {
  who: 'bee', type: 'text',
  text: "Hi! I'm Wallabee \uD83D\uDC1D \u2014 SwarmReply's support bee. Ask me anything, like \u201chow do I connect Google\u201d or \u201csend my first review request\u201d, and I'll point you to the right guide.",
};

const GREETING_CHIPS = { who: 'bee', type: 'chips', chips: ['Email our team'] };

// ── Component ────────────────────────────────────────────────────────────────
export default function WallabeeChat({ customer }) {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState([GREETING, GREETING_CHIPS]);
  const [input, setInput]       = useState('');
  const [typing, setTyping]     = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject]   = useState('');
  const [body, setBody]         = useState('');
  const [sending, setSending]   = useState(false);
  const [formErr, setFormErr]   = useState('');
  const [hydrated, setHydrated] = useState(false);
  const router = useRouter();
  const bottomRef = useRef(null);
  const lastQuestion = useRef('');

  // Restore conversation (sessionStorage survives page navigation)
  useEffect(() => {
    const saved = loadState();
    if (saved) {
      setOpen(!!saved.open);
      setMessages(saved.messages?.length ? saved.messages : freshConversation(router.pathname));
      setShowForm(!!saved.showForm);
      setSubject(saved.subject || '');
      lastQuestion.current = saved.lastQuestion || '';
    } else {
      setMessages(freshConversation(router.pathname));
    }
    setHydrated(true);
  }, []);

  // Pull the shared Help Center catalog (single source of truth). Falls back to
  // the baked-in FALLBACK_ARTICLES if the fetch fails — never blocks chat.
  useEffect(() => { loadCatalog(); }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveState({ open, messages, showForm, subject, lastQuestion: lastQuestion.current });
  }, [open, messages, showForm, subject, hydrated]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open, typing, showForm]);

  function beeSay(msgs) {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages(m => [...m, ...msgs]);
    }, 550);
  }

  function ask(text) {
    const q = text.trim();
    if (!q) return;
    lastQuestion.current = q;
    setMessages(m => [...m, { who: 'user', type: 'text', text: q }]);
    setInput('');
    const hits = findArticles(q);
    if (hits.length) {
      beeSay([
        { who: 'bee', type: 'text', text: 'These guides should help:' },
        { who: 'bee', type: 'articles', articles: hits.map(({ id, t, c }) => ({ id, t, c })) },
        { who: 'bee', type: 'chips', chips: ['That helped \uD83D\uDC1D', 'I still need help'] },
      ]);
    } else {
      askAgent(q);
    }
  }

  function escalate() {
    setSubject(lastQuestion.current.slice(0, 200));
    beeSay([
      { who: 'bee', type: 'text',
        text: "Hmm, I couldn't find a guide for that one. Our human team can help \u2014 send them a message right here and they'll reply to your email, or email our team directly.",
        mailto: true },
    ]);
    setTimeout(() => setShowForm(true), 600);
  }

  function contactTeam() {
    beeSay([
      { who: 'bee', type: 'text',
        text: "Happy to connect you with a human \u2014 send the team a message right here and they'll reply to your email, or email our team directly.",
        mailto: true },
    ]);
    setTimeout(() => setShowForm(true), 600);
  }

  // Second line: when keyword search can't help, ask the support assistant for a
  // grounded answer. On escalate/failure it falls back to the human ticket form.
  async function askAgent(question) {
    const q = String(question || '').trim();
    if (!q) { escalate(); return; }
    setTyping(true);
    try {
      const r = await askSupportAgent({ question: q, history: agentHistory() });
      setTyping(false);
      if (r && r.answer && !r.escalate) {
        const msgs = [{ who: 'bee', type: 'text', text: r.answer }];
        if (Array.isArray(r.articles) && r.articles.length) {
          msgs.push({ who: 'bee', type: 'articles',
            articles: r.articles.slice(0, 3).map(a => ({ id: a.id, t: a.title || a.t, c: a.category || a.c })) });
        }
        msgs.push({ who: 'bee', type: 'chips', chips: ['That helped \uD83D\uDC1D', 'Talk to a human'] });
        setMessages(m => [...m, ...msgs]);
      } else {
        escalate();
      }
    } catch (e) {
      setTyping(false);
      escalate();
    }
  }

  // Recent text turns for the agent (excludes the trailing question, sent separately).
  function agentHistory() {
    const txt = messages.filter(m => m.type !== 'chips' && m.type !== 'articles' && m.text);
    const trimmed = (txt.length && txt[txt.length - 1].who === 'user') ? txt.slice(0, -1) : txt;
    return trimmed.slice(-6).map(m => ({ role: m.who === 'user' ? 'user' : 'assistant', content: String(m.text).slice(0, 1000) }));
  }

  function chip(label) {
    setMessages(m => [...m.map(x => x.type === 'chips' ? { ...x, done: true } : x),
      { who: 'user', type: 'text', text: label }]);
    if (label.startsWith('That helped')) {
      beeSay([{ who: 'bee', type: 'text', text: 'Happy to help! Buzz me anytime. \uD83D\uDC1D' }]);
    } else if (label.startsWith('Email our team') || label.startsWith('Talk to a human')) {
      contactTeam();
    } else if (label.startsWith('I still need help')) {
      askAgent(lastQuestion.current);
    } else {
      // Context chips are canned questions — search the catalog for the guide.
      const hits = findArticles(label);
      if (hits.length) {
        beeSay([
          { who: 'bee', type: 'text', text: 'Here you go:' },
          { who: 'bee', type: 'articles', articles: hits.map(({ id, t, c }) => ({ id, t, c })) },
          { who: 'bee', type: 'chips', chips: ['That helped \uD83D\uDC1D', 'I still need help'] },
        ]);
      } else {
        askAgent(label);
      }
    }
  }

  // Quietly appends where the customer was, so the team has context.
  function contextFooter() {
    const bits = [];
    if (router?.pathname) bits.push('page ' + router.pathname);
    if (customer?.plan) bits.push('plan ' + customer.plan);
    if (customer?.status) bits.push('status ' + customer.status);
    if (customer?.role) bits.push('role ' + customer.role);
    if (customer?.is_demo) bits.push('demo account');
    if (lastQuestion.current) bits.push('asked: "' + lastQuestion.current.slice(0, 120) + '"');
    return bits.length ? '\n\n— context (auto-added) —\n' + bits.join(' · ') : '';
  }

  async function sendToTeam() {
    setFormErr('');
    if (!subject.trim() || !body.trim()) { setFormErr('Please add a subject and a message.'); return; }
    setSending(true);
    try {
      await sendSupportRequest({ subject: subject.trim(), message: body.trim() + contextFooter() });
      setShowForm(false);
      setBody('');
      setMessages(m => [...m, { who: 'bee', type: 'text',
        text: `Sent! \uD83D\uDC1D Our team will reply to ${customer?.email || 'your email'} \u2014 usually within a few hours on business days.` }]);
    } catch (err) {
      setFormErr(err.response?.data?.error || 'That didn\u2019t send \u2014 please email us at hello@swarmreply.com.');
    } finally {
      setSending(false);
    }
  }

  // ── styles ──
  const beeAvatar = (size) => (
    <span style={{ width: size, height: size, borderRadius: 'var(--r-full, 50%)', background: 'white',
      border: '1.5px solid var(--line, #e4e0d8)', display: 'inline-flex', alignItems: 'center',
      justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
      <img src="/bee-logo.png" alt="Wallabee" style={{ width: size - 8, height: size - 8, objectFit: 'contain' }} />
    </span>
  );

  const bubble = (who) => ({
    maxWidth: '82%', padding: '10px 14px', borderRadius: 'var(--r-md, 16px)', fontSize: 'var(--fs-base, 0.875rem)',
    lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    ...(who === 'bee'
      ? { background: 'white', border: '1.5px solid var(--line, #e4e0d8)', color: 'var(--ink, #0a0a0a)', borderTopLeftRadius: 4 }
      : { background: 'var(--ink, #0a0a0a)', color: 'white', borderTopRightRadius: 4, marginLeft: 'auto' }),
  });

  const inp = {
    width: '100%', boxSizing: 'border-box', padding: '10px 13px',
    border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 'var(--r-md, 16px)', fontFamily: 'inherit',
    fontSize: 'var(--fs-base, 0.875rem)', background: 'white', outline: 'none',
  };

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      {/* ── Panel ── */}
      {open && (
        <div className="wallabee-panel" style={{
          position: 'fixed', bottom: 96, right: 20, zIndex: 9000,
          width: 'min(360px, calc(100vw - 32px))', height: 'min(540px, calc(100vh - 140px))',
          background: 'var(--cream, #f8f7f4)', borderRadius: 'var(--r-md, 16px)', border: '1.5px solid var(--line, #e4e0d8)',
          boxShadow: '0 12px 48px rgba(0,0,0,.18)', display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ background: GOLD, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 11 }}>
            {beeAvatar(40)}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: 'var(--fs-lg, 1rem)', color: 'var(--ink, #0a0a0a)' }}>Wallabee</div>
              <div style={{ fontSize: 'var(--fs-2xs, 0.6875rem)', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'rgba(10,10,10,.65)' }}>SwarmReply support bee</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat"
              style={{ background: 'rgba(10,10,10,.12)', border: 'none', borderRadius: 'var(--r-full, 50%)', width: 30, height: 30, cursor: 'pointer', fontSize: 'var(--fs-base, 0.875rem)', fontWeight: 700, color: 'var(--ink, #0a0a0a)' }}>
              ✕
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((m, i) => {
              if (m.type === 'articles') {
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: '88%' }}>
                    {m.articles.map(a => (
                      <a key={a.id} href={a.u ? `https://swarmreply.com${a.u}` : `${HELP_BASE}#${a.id}`} target="_blank" rel="noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'white', border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 'var(--r-md, 16px)', padding: '10px 13px', textDecoration: 'none' }}>
                        <span style={{ flex: 1 }}>
                          <span style={{ display: 'block', fontSize: 'var(--fs-sm, 0.8125rem)', fontWeight: 600, color: 'var(--ink, #0a0a0a)' }}>{a.t}</span>
                          <span style={{ display: 'block', fontSize: 'var(--fs-2xs, 0.6875rem)', color: 'var(--taupe, #7a7670)', marginTop: 1 }}>{a.c}</span>
                        </span>
                        <span style={{ fontSize: 'var(--fs-xs, 0.75rem)', color: 'var(--taupe, #7a7670)' }}>↗</span>
                      </a>
                    ))}
                  </div>
                );
              }
              if (m.type === 'chips') {
                if (m.done) return null;
                return (
                  <div key={i} style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                    {m.chips.map(c => (
                      <button key={c} onClick={() => chip(c)}
                        style={{ padding: '8px 14px', borderRadius: 'var(--r-pill, 999px)', border: '1.5px solid var(--line, #e4e0d8)', background: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--fs-sm, 0.8125rem)', fontWeight: 600, color: 'var(--ink, #0a0a0a)' }}>
                        {c}
                      </button>
                    ))}
                  </div>
                );
              }
              return (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', justifyContent: m.who === 'user' ? 'flex-end' : 'flex-start' }}>
                  {m.who === 'bee' && beeAvatar(26)}
                  <div style={bubble(m.who)}>
                    {m.text}
                    {m.mailto && (
                      <div style={{ marginTop: 10 }}>
                        <a href="https://swarmreply.com/contact.html" target="_blank" rel="noopener"
                          style={{ display: 'inline-block', background: GOLD, color: '#1a1408', fontWeight: 700, fontSize: 'var(--fs-sm, 0.8125rem)', padding: '8px 16px', borderRadius: 'var(--r-pill, 999px)', textDecoration: 'none' }}>
                          Email our team →
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {typing && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                {beeAvatar(26)}
                <div style={{ ...bubble('bee'), color: 'var(--taupe, #7a7670)', fontStyle: 'italic' }}>Wallabee is buzzing…</div>
              </div>
            )}

            {showForm && (
              <div style={{ background: 'white', border: '1.5px solid var(--line, #e4e0d8)', borderRadius: 'var(--r-md, 16px)', padding: 14 }}>
                <div style={{ fontSize: 'var(--fs-xs, 0.75rem)', color: 'var(--taupe, #7a7670)', marginBottom: 10 }}>
                  Sending as <strong style={{ color: 'var(--ink, #0a0a0a)' }}>{customer?.email}</strong> — the team will reply there.
                </div>
                <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" maxLength={200}
                  style={{ ...inp, marginBottom: 9 }} />
                <textarea rows={3} value={body} onChange={e => setBody(e.target.value)} maxLength={5000}
                  placeholder="Tell us what's going on — the more detail, the faster we can help."
                  style={{ ...inp, resize: 'vertical' }} />
                {formErr && <div style={{ marginTop: 8, fontSize: 'var(--fs-xs, 0.75rem)', color: '#a4282a' }}>{formErr}</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button onClick={sendToTeam} disabled={sending}
                    style={{ flex: 1, padding: '10px 0', borderRadius: 'var(--r-pill, 999px)', border: 'none', background: 'var(--ink, #0a0a0a)', color: 'white', cursor: sending ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: 'var(--fs-sm, 0.8125rem)', fontWeight: 700, opacity: sending ? 0.6 : 1 }}>
                    {sending ? 'Sending…' : 'Send to our team'}
                  </button>
                  <button onClick={() => setShowForm(false)}
                    style={{ padding: '10px 14px', borderRadius: 'var(--r-pill, 999px)', border: '1.5px solid var(--line, #e4e0d8)', background: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--fs-sm, 0.8125rem)', fontWeight: 600 }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 12px', background: 'white', borderTop: '1px solid var(--line, #e4e0d8)', display: 'flex', gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') ask(input); }}
              placeholder="Ask Wallabee anything…"
              style={{ ...inp, border: 'none', background: 'var(--cream, #f8f7f4)', borderRadius: 'var(--r-pill, 999px)', padding: '11px 16px' }} />
            <button onClick={() => ask(input)} aria-label="Send"
              style={{ width: 42, height: 42, borderRadius: 'var(--r-full, 50%)', border: 'none', background: GOLD, cursor: 'pointer', fontSize: 'var(--fs-lg, 1rem)', flexShrink: 0 }}>
              ↑
            </button>
          </div>
        </div>
      )}

      {/* ── Floating launcher: one pill, bee + label ── */}
      <button className="wallabee-launcher" onClick={() => setOpen(o => !o)} aria-label={open ? 'Close support chat' : 'Chat with Wallabee, our support bee'}
        style={{
          position: 'fixed', bottom: 24, right: 20, zIndex: 9000,
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '9px 18px 9px 11px', borderRadius: 'var(--r-pill, 999px)', border: 'none', cursor: 'pointer',
          background: GOLD, boxShadow: '0 6px 24px rgba(212,165,21,.45)',
          fontFamily: 'inherit', transition: 'transform .15s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
        {open ? (
          <>
            <span style={{ width: 34, height: 34, borderRadius: 'var(--r-full, 50%)', background: 'rgba(10,10,10,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--fs-lg, 1rem)', fontWeight: 700, color: 'var(--ink, #0a0a0a)' }}>✕</span>
            <span style={{ fontSize: 'var(--fs-base, 0.875rem)', fontWeight: 700, color: 'var(--ink, #0a0a0a)' }}>Close</span>
          </>
        ) : (
          <>
            <span style={{ width: 34, height: 34, borderRadius: 'var(--r-full, 50%)', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/bee-logo.png" alt="" style={{ width: 26, height: 26, objectFit: 'contain' }} />
            </span>
            <span style={{ fontSize: 'var(--fs-base, 0.875rem)', fontWeight: 700, color: 'var(--ink, #0a0a0a)' }}>Support</span>
          </>
        )}
      </button>
    </div>
  );
}
