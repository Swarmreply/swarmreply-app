// ============================================
// pages/dashboard/ai-visibility.js
// AI Visibility — standalone page
// Tabs: Overview / By Model / Query Results / Competitors / Queries
// The Queries tab lets customers view and edit
// the 32 weekly queries before each scan.
// ============================================

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;

const TABS = [
  { id: 'overview',    label: 'Overview'       },
  { id: 'by-model',    label: 'By AI model'    },
  { id: 'results',     label: 'Query results'  },
  { id: 'competitors', label: 'AI competitors' },
  { id: 'queries',     label: '⚙ My Queries'   },
];

function authHeaders() {
  const t = typeof window !== 'undefined' ? localStorage.getItem('swarmreply_token') : '';
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// ── Shared components ─────────────────────────────────────────────────────────
function Card({ children, style = {} }) {
  return <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, ...style }}>{children}</div>;
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 12, padding: '16px 18px', borderTop: accent ? `3px solid ${accent}` : undefined }}>
      <div style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.8rem', fontWeight: 900, color: accent || '#0a0a0a' }}>{value}</div>
      {sub && <div style={{ fontSize: '.75rem', color: '#7a7670', marginTop: 4 }} dangerouslySetInnerHTML={{ __html: sub }} />}
    </div>
  );
}

function ModelBadge({ name }) {
  const styles = {
    chatgpt:    { background: '#e8f5ef', color: '#1a6b45'  },
    gemini:     { background: '#fee2e2', color: '#c0392b'  },
    perplexity: { background: '#ede8fe', color: '#7c3aed'  },
    claude:     { background: '#f0eeea', color: '#0a0a0a'  },
  };
  const s = styles[name?.toLowerCase()] || styles.claude;
  return <span style={{ ...s, fontSize: '.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 50 }}>{name}</span>;
}

function Bar({ pct, color = '#0a0a0a', height = 8 }) {
  return (
    <div style={{ flex: 1, height, background: '#f0eeea', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: color, borderRadius: 4, transition: 'width .5s' }} />
    </div>
  );
}

// ── Score gauge ───────────────────────────────────────────────────────────────
function ScoreGauge({ score = 73, delta = 8 }) {
  const circumference = 2 * Math.PI * 52;
  const offset        = circumference - (score / 100) * circumference;
  const color         = score >= 70 ? '#1a6b45' : score >= 50 ? '#f59e0b' : '#c0392b';

  return (
    <Card style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '28px 24px' }}>
      <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 14 }}>
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" fill="none" stroke="#f0eeea" strokeWidth="10"/>
          <circle cx="60" cy="60" r="52" fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dashoffset .8s ease' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '2rem', fontWeight: 900, lineHeight: 1, color: '#0a0a0a' }}>{score}</div>
          <div style={{ fontSize: '.62rem', fontWeight: 700, color: '#7a7670', letterSpacing: '.05em' }}>/100</div>
        </div>
      </div>
      <div style={{ fontWeight: 700, fontSize: '.9rem', marginBottom: 4 }}>AI Visibility Score</div>
      <div style={{ fontSize: '.75rem', color: '#7a7670', marginBottom: 10 }}>Mentioned in {score}% of AI queries</div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 11px', background: delta >= 0 ? '#e8f5ef' : '#fee2e2', borderRadius: 50 }}>
        <span style={{ color: delta >= 0 ? '#1a6b45' : '#c0392b', fontWeight: 700, fontSize: '.78rem' }}>{delta >= 0 ? '+' : ''}{delta}</span>
        <span style={{ fontSize: '.72rem', color: delta >= 0 ? '#1a6b45' : '#c0392b' }}>vs last week</span>
      </div>
    </Card>
  );
}

// ── OVERVIEW TAB ──────────────────────────────────────────────────────────────
function OverviewTab({ report }) {
  if (!report) return <div style={{ padding: 40, textAlign: 'center', color: '#7a7670' }}>No scan data yet — run your first scan to see results.</div>;

  const { run, byLLM = [], bestMentions = [], missedQueries = [] } = report;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, marginBottom: 18 }}>
        <ScoreGauge score={run.visibility_score || 73} delta={run.prev_visibility ? run.visibility_score - run.prev_visibility : 8} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            <StatCard label="Queries run"     value={run.total_queries || 32}                sub="across all AI models" />
            <StatCard label="Times mentioned" value={run.total_mentions || 24}              sub={`<span style="color:#1a6b45;font-weight:600">${run.visibility_score || 73}%</span> mention rate`} />
            <StatCard label="Positive"        value={run.total_positive || 19}              accent="#1a6b45" sub="of all mentions" />
            <StatCard label="Missed queries"  value={run.total_not_found || 8}              accent="#f59e0b" sub="not mentioned" />
          </div>
          <Card style={{ padding: 16 }}>
            <div style={{ fontSize: '.68rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 10 }}>Visibility by AI model</div>
            {(byLLM.length ? byLLM : [
              { llm_name: 'chatgpt', visibility_pct: 88 },
              { llm_name: 'gemini',  visibility_pct: 75 },
              { llm_name: 'perplexity', visibility_pct: 63 },
              { llm_name: 'claude',  visibility_pct: 75 },
            ]).map(m => {
              const colors = { chatgpt:'#74aa9c', gemini:'#e8453c', perplexity:'#7c3aed', claude:'#0a0a0a' };
              const color  = colors[m.llm_name?.toLowerCase()] || '#0a0a0a';
              const pct    = parseInt(m.visibility_pct) || 0;
              return (
                <div key={m.llm_name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: '.84rem', fontWeight: 600, width: 90, textTransform: 'capitalize' }}>{m.llm_name}</span>
                  <Bar pct={pct} color={color} />
                  <span style={{ fontSize: '.8rem', fontWeight: 700, width: 36, color: pct >= 70 ? '#1a6b45' : pct >= 50 ? '#f59e0b' : '#c0392b' }}>{pct}%</span>
                </div>
              );
            })}
          </Card>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
        <Card style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #e4e0d8' }}>
            <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 2 }}>Where AI mentioned you ✓</div>
            <div style={{ fontSize: '.75rem', color: '#7a7670' }}>Queries where your business appeared</div>
          </div>
          {(bestMentions.length ? bestMentions : [
            { llm_name: 'chatgpt',    query_text: 'Best restaurant in Sacramento',    mention_context: 'Widely regarded as one of Sacramento\'s top Italian restaurants, known for handmade pasta...', sentiment: 'positive' },
            { llm_name: 'gemini',     query_text: 'Tell me about Bella\'s Kitchen',   mention_context: 'A family-owned Italian restaurant with strong Google reviews — 4.8 stars, 247 reviews...', sentiment: 'positive' },
            { llm_name: 'perplexity', query_text: 'Best Italian near Sacramento',     mention_context: 'Options include Bella\'s Kitchen and several others with high ratings...', sentiment: 'neutral'  },
          ]).slice(0,3).map((m, i) => (
            <div key={i} style={{ padding: '13px 20px', borderBottom: '1px solid #f8f7f4' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                <ModelBadge name={m.llm_name} />
                <span style={{ fontSize: '.78rem', fontWeight: 600, flex: 1 }}>{m.query_text}</span>
                <span style={{ fontSize: '.67rem', fontWeight: 700, padding: '2px 8px', borderRadius: 50, background: m.sentiment === 'positive' ? '#e8f5ef' : '#f0eeea', color: m.sentiment === 'positive' ? '#1a6b45' : '#7a7670' }}>
                  {m.sentiment === 'positive' ? '#1 result' : 'Mentioned'}
                </span>
              </div>
              {m.mention_context && (
                <div style={{ fontSize: '.78rem', color: '#4a4a48', fontStyle: 'italic', lineHeight: 1.6, padding: '6px 10px', background: '#f8f7f4', borderRadius: 8, borderLeft: '3px solid #f5c842' }}>
                  "{m.mention_context}"
                </div>
              )}
            </div>
          ))}
        </Card>
        <Card style={{ padding: 20, background: '#0a0a0a' }}>
          <div style={{ fontSize: '.68rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', marginBottom: 12 }}>How to improve your score</div>
          {['Keep Google reviews coming — AI models weight rating and review volume heavily.','Publish Google Posts weekly — fresh content signals an active business to AI crawlers.','Keep listings synced — AI models cross-reference Apple Maps, Bing, and other platforms.','Use your business name + city consistently across every platform.'].map((tip, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#f5c842', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.65rem', fontWeight: 800, color: '#0a0a0a', flexShrink: 0 }}>{i+1}</span>
              <div style={{ fontSize: '.8rem', color: 'rgba(255,255,255,.7)', lineHeight: 1.55 }}>{tip}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ── BY MODEL TAB ──────────────────────────────────────────────────────────────
function ByModelTab({ report }) {
  const models = report?.byLLM?.length ? report.byLLM : [
    { llm_name: 'chatgpt',    visibility_pct: 88, total_queries: 8, mentions: 7, positive: 6, negative: 0 },
    { llm_name: 'gemini',     visibility_pct: 75, total_queries: 8, mentions: 6, positive: 5, negative: 0 },
    { llm_name: 'perplexity', visibility_pct: 63, total_queries: 8, mentions: 5, positive: 4, negative: 0 },
    { llm_name: 'claude',     visibility_pct: 75, total_queries: 8, mentions: 6, positive: 4, negative: 0 },
  ];

  const modelMeta = {
    chatgpt:    { color: '#74aa9c', accent: '#74aa9c', desc: 'OpenAI · GPT-4o',                insight: 'ChatGPT mentions you first in 5 of 7 queries. Strong brand recognition.' },
    gemini:     { color: '#e8453c', accent: '#e8453c', desc: 'Google · Gemini 1.5 Pro',         insight: 'Good visibility on Google AI. Improving your Google Business Profile completeness will help.' },
    perplexity: { color: '#7c3aed', accent: '#7c3aed', desc: 'Perplexity · Online search',      insight: 'Lower score because Perplexity pulls from live web sources. More recent reviews will improve this fastest.' },
    claude:     { color: '#0a0a0a', accent: '#0a0a0a', desc: 'Anthropic · Claude Sonnet',       insight: 'Solid visibility. Claude tends to caveat recommendations — positive mentions are strong quality signals.' },
  };

  return (
    <div style={{ padding: 24, display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
      {models.map(m => {
        const meta = modelMeta[m.llm_name?.toLowerCase()] || {};
        const pct  = parseInt(m.visibility_pct) || 0;
        const scoreColor = pct >= 70 ? '#1a6b45' : pct >= 50 ? '#f59e0b' : '#c0392b';
        return (
          <Card key={m.llm_name} style={{ padding: 20, borderTop: `3px solid ${meta.accent || '#0a0a0a'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '.95rem', marginBottom: 3, textTransform: 'capitalize' }}>{m.llm_name}</div>
                <div style={{ fontSize: '.75rem', color: '#7a7670' }}>{meta.desc}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.8rem', fontWeight: 900, color: scoreColor }}>{pct}%</div>
                <div style={{ fontSize: '.67rem', color: '#7a7670' }}>visibility</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ background: '#e8f5ef', color: '#1a6b45', fontSize: '.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 50 }}>{m.mentions || 0} mentions</span>
              <span style={{ background: '#e8f5ef', color: '#1a6b45', fontSize: '.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 50 }}>{m.positive || 0} positive</span>
              <span style={{ background: '#fff8e8', color: '#92690a', fontSize: '.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 50 }}>{(m.total_queries || 0) - (m.mentions || 0)} missed</span>
            </div>
            <div style={{ background: '#f8f7f4', borderRadius: 10, padding: '10px 13px', fontSize: '.78rem', color: '#7a7670', lineHeight: 1.6 }}>{meta.insight}</div>
          </Card>
        );
      })}
    </div>
  );
}

// ── QUERY RESULTS TAB ─────────────────────────────────────────────────────────
function ResultsTab({ report }) {
  const [modelFilter, setModelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const rows = report ? [] : [
    { llm_name:'chatgpt',    query_text:'Best restaurant in Sacramento',           mentioned:true,  mention_position:1, sentiment:'positive' },
    { llm_name:'gemini',     query_text:'Tell me about Bella\'s Kitchen',          mentioned:true,  mention_position:1, sentiment:'positive' },
    { llm_name:'chatgpt',    query_text:'Best family dinner Sacramento',           mentioned:false, mention_position:null, sentiment:'not_mentioned' },
    { llm_name:'perplexity', query_text:'Recommend a restaurant near Sacramento',  mentioned:true,  mention_position:3, sentiment:'neutral'  },
    { llm_name:'claude',     query_text:'What do customers say about Bella\'s?',   mentioned:true,  mention_position:1, sentiment:'positive' },
    { llm_name:'gemini',     query_text:'Compare restaurants in Sacramento',       mentioned:false, mention_position:null, sentiment:'not_mentioned' },
    { llm_name:'perplexity', query_text:'Best Italian near Sacramento',            mentioned:true,  mention_position:3, sentiment:'neutral'  },
    { llm_name:'claude',     query_text:'Is Bella\'s Kitchen Sacramento good?',    mentioned:true,  mention_position:1, sentiment:'positive' },
  ];

  const filtered = rows.filter(r => {
    if (modelFilter !== 'all' && r.llm_name !== modelFilter) return false;
    if (statusFilter === 'mentioned' && !r.mentioned) return false;
    if (statusFilter === 'missed'    &&  r.mentioned) return false;
    return true;
  });

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', gap: 9, marginBottom: 16 }}>
        <select value={modelFilter} onChange={e => setModelFilter(e.target.value)} style={{ padding: '7px 12px', border: '1.5px solid #e4e0d8', borderRadius: 9, fontSize: '.8rem', fontFamily: 'inherit', outline: 'none' }}>
          <option value="all">All models</option>
          <option value="chatgpt">ChatGPT</option>
          <option value="gemini">Gemini</option>
          <option value="perplexity">Perplexity</option>
          <option value="claude">Claude</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '7px 12px', border: '1.5px solid #e4e0d8', borderRadius: 9, fontSize: '.8rem', fontFamily: 'inherit', outline: 'none' }}>
          <option value="all">All results</option>
          <option value="mentioned">Mentioned</option>
          <option value="missed">Not mentioned</option>
        </select>
      </div>
      <Card style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
          <thead><tr style={{ background: '#f8f7f4' }}>
            {['Query','AI Model','Result','Position','Sentiment'].map(h => (
              <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: '.65rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', borderBottom: '1px solid #e4e0d8' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f8f7f4' }}>
                <td style={{ padding: '10px 16px', fontWeight: 500, maxWidth: 240 }}>{r.query_text}</td>
                <td style={{ padding: '10px 16px' }}><ModelBadge name={r.llm_name} /></td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ fontSize: '.67rem', fontWeight: 700, padding: '2px 8px', borderRadius: 50, background: r.mentioned ? '#e8f5ef' : '#fff8e8', color: r.mentioned ? '#1a6b45' : '#92690a' }}>
                    {r.mentioned ? 'Mentioned' : 'Not mentioned'}
                  </span>
                </td>
                <td style={{ padding: '10px 16px', fontWeight: r.mention_position === 1 ? 700 : 400, color: r.mention_position === 1 ? '#1a6b45' : '#0a0a0a' }}>
                  {r.mention_position ? `#${r.mention_position}` : '—'}
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ fontSize: '.67rem', fontWeight: 700, padding: '2px 8px', borderRadius: 50, background: r.sentiment === 'positive' ? '#e8f5ef' : r.sentiment === 'negative' ? '#fee2e2' : '#f0eeea', color: r.sentiment === 'positive' ? '#1a6b45' : r.sentiment === 'negative' ? '#c0392b' : '#7a7670' }}>
                    {r.sentiment === 'not_mentioned' ? 'N/A' : r.sentiment}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ── COMPETITORS TAB ───────────────────────────────────────────────────────────
function CompetitorsTab({ report }) {
  const competitors = report?.topCompetitors?.length ? report.topCompetitors : [
    { competitor: 'Bella\'s Kitchen (You)', mentions: 24 },
    { competitor: 'Trattoria Roma',          mentions: 18 },
    { competitor: 'Pizzeria Milano',         mentions: 14 },
    { competitor: 'Café Verde',              mentions: 9  },
    { competitor: 'Sacramento Grill',        mentions: 6  },
  ];
  const max = competitors[0]?.mentions || 1;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontSize: '.875rem', color: '#7a7670', marginBottom: 18, lineHeight: 1.7, maxWidth: 600 }}>
        These are the businesses AI models recommended in the same queries where your business was evaluated — or in queries where you were not mentioned.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>
        <Card style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #e4e0d8', fontWeight: 600, fontSize: '.875rem' }}>AI competitor leaderboard</div>
          {competitors.map((c, i) => {
            const isYou = i === 0;
            return (
              <div key={i} style={{ padding: '13px 20px', borderBottom: '1px solid #f8f7f4', display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: 12, alignItems: 'center', background: isYou ? 'rgba(245,200,66,.06)' : undefined }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: isYou ? '#f5c842' : '#f0eeea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.75rem', fontWeight: 800, color: isYou ? '#0a0a0a' : '#7a7670' }}>{i + 1}</div>
                <div>
                  <div style={{ fontWeight: isYou ? 700 : 500, fontSize: '.875rem' }}>{c.competitor}</div>
                  <div style={{ height: 5, background: '#f0eeea', borderRadius: 3, overflow: 'hidden', marginTop: 5, width: '100%' }}>
                    <div style={{ width: `${(c.mentions / max) * 100}%`, height: '100%', background: isYou ? '#f5c842' : '#e4e0d8', borderRadius: 3 }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{c.mentions}</div>
                  <div style={{ fontSize: '.65rem', color: '#7a7670' }}>mentions</div>
                </div>
              </div>
            );
          })}
        </Card>
        <Card style={{ padding: 20, height: 'fit-content' }}>
          <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 12 }}>What makes competitors rank higher</div>
          {['Higher review volume on Google — AI models treat review count as a trust signal.','Listed on more platforms — more data sources for AI models to reference.','More consistent NAP data — name, address, phone identical everywhere.'].map((tip, i) => (
            <div key={i} style={{ background: '#f8f7f4', borderRadius: 10, padding: '10px 13px', marginBottom: 8 }}>
              <div style={{ fontSize: '.78rem', color: '#7a7670', lineHeight: 1.55 }}>{tip}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ── QUERIES TAB ───────────────────────────────────────────────────────────────
function QueriesTab() {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [newQuery, setNewQuery]   = useState('');
  const [customQueries, setCustom]= useState([]);
  const [error, setError]         = useState('');

  const MAX = 32;

  useEffect(() => { loadQueries(); }, []);

  async function loadQueries() {
    try {
      const res = await axios.get(`${API}/llm/queries`, { headers: authHeaders() });
      setData(res.data);
      setCustom(res.data.customQueries || []);
    } catch (e) {
      console.error(e);
      // Demo fallback
      setData({
        autoQueries: [
          'What are the best restaurants in Sacramento?',
          'Recommend a good restaurant near Sacramento',
          'Who is the top-rated restaurant in Sacramento?',
          "Tell me about Bella's Kitchen in Sacramento",
          "What do customers say about Bella's Kitchen?",
          "Is Bella's Kitchen in Sacramento good?",
          'What is the best restaurant in Sacramento and why?',
          'Compare restaurants in Sacramento',
        ],
        customQueries: [
          'Best pasta restaurant in Sacramento',
          'Italian catering Sacramento',
          'Family restaurant midtown Sacramento',
        ],
        totalQueries: 11, maxQueries: 32, maxCustom: 24, remainingSlots: 21,
        locked: false, nextScanAt: null, lastScanAt: null,
      });
      setCustom(['Best pasta restaurant in Sacramento','Italian catering Sacramento','Family restaurant midtown Sacramento']);
    } finally {
      setLoading(false);
    }
  }

  async function saveQueries() {
    setSaving(true);
    setError('');
    try {
      await axios.put(`${API}/llm/queries`, { customQueries }, { headers: authHeaders() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      loadQueries();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function addQuery() {
    const q = newQuery.trim();
    if (!q) return;
    if (q.length > 200) { setError('Query must be under 200 characters.'); return; }
    const autoCount = data?.autoQueries?.length || 8;
    if (customQueries.length + autoCount >= MAX) {
      setError(`Maximum ${MAX} total queries reached. Remove a custom query first.`);
      return;
    }
    if (customQueries.includes(q)) { setError('This query already exists.'); return; }
    setCustom(prev => [...prev, q]);
    setNewQuery('');
    setError('');
  }

  function removeQuery(idx) {
    setCustom(prev => prev.filter((_, i) => i !== idx));
    setError('');
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#7a7670' }}>Loading queries…</div>;

  const autoQueries   = data?.autoQueries || [];
  const totalUsed     = autoQueries.length + customQueries.length;
  const pct           = Math.round((totalUsed / MAX) * 100);
  const remaining     = MAX - totalUsed;
  const locked        = data?.locked || false;

  return (
    <div style={{ padding: 24 }}>
      {/* Header info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16, marginBottom: 20 }}>
        <Card style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 2 }}>Weekly query budget</div>
              <div style={{ fontSize: '.75rem', color: '#7a7670' }}>{totalUsed} used · {remaining} remaining</div>
            </div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.6rem', fontWeight: 900 }}>{totalUsed}<span style={{ fontSize: '.8rem', fontWeight: 400, color: '#7a7670' }}>/{MAX}</span></div>
          </div>
          <div style={{ height: 8, background: '#f0eeea', borderRadius: 50, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ width: `${pct}%`, height: '100%', background: pct >= 90 ? '#f59e0b' : '#0a0a0a', borderRadius: 50, transition: 'width .4s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.72rem', color: '#7a7670' }}>
            <span>{autoQueries.length} auto-generated</span>
            <span>{customQueries.length} custom</span>
          </div>
        </Card>
        <Card style={{ padding: 18 }}>
          <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 6 }}>Scan schedule</div>
          <div style={{ fontSize: '.8rem', color: '#7a7670', lineHeight: 1.7 }}>
            {data?.nextScanAt ? (
              <>Next scan: <strong>{new Date(data.nextScanAt).toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}</strong></>
            ) : 'Next scan: this week'}
            <br />
            {data?.lastScanAt ? (
              <>Last scan: {new Date(data.lastScanAt).toLocaleDateString()}</>
            ) : 'No scans run yet'}
          </div>
          {locked ? (
            <div style={{ marginTop: 10, background: '#fff8e8', border: '1px solid #fde68a', borderRadius: 9, padding: '8px 12px', fontSize: '.78rem', color: '#92690a' }}>
              🔒 Queries are locked within 24h of your scheduled scan. You can edit them after the scan completes.
            </div>
          ) : (
            <div style={{ marginTop: 10, background: '#e8f5ef', border: '1px solid #bbf7d0', borderRadius: 9, padding: '8px 12px', fontSize: '.78rem', color: '#1a6b45' }}>
              ✓ Queries are editable — changes apply to your next weekly scan.
            </div>
          )}
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>

        {/* Auto-generated queries — read only */}
        <Card style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #e4e0d8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '.875rem' }}>Auto-generated queries</div>
              <div style={{ fontSize: '.73rem', color: '#7a7670', marginTop: 2 }}>Built from your business name, type, and city · Read only</div>
            </div>
            <span style={{ background: '#f0eeea', color: '#7a7670', fontSize: '.7rem', fontWeight: 700, padding: '2px 9px', borderRadius: 50 }}>{autoQueries.length}</span>
          </div>
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {autoQueries.map((q, i) => (
              <div key={i} style={{ padding: '11px 20px', borderBottom: '1px solid #f8f7f4', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#f8f7f4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.7rem', fontWeight: 700, color: '#7a7670', flexShrink: 0 }}>{i + 1}</div>
                <span style={{ fontSize: '.84rem', color: '#3a3a38', flex: 1, lineHeight: 1.5 }}>{q}</span>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#1a6b45', flexShrink: 0 }} title="Auto-generated" />
              </div>
            ))}
          </div>
        </Card>

        {/* Custom queries — editable */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #e4e0d8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '.875rem' }}>Your custom queries</div>
                <div style={{ fontSize: '.73rem', color: '#7a7670', marginTop: 2 }}>Add queries specific to your business · Editable weekly</div>
              </div>
              <span style={{ background: '#0a0a0a', color: 'white', fontSize: '.7rem', fontWeight: 700, padding: '2px 9px', borderRadius: 50 }}>{customQueries.length}</span>
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {customQueries.length === 0 ? (
                <div style={{ padding: '24px 20px', textAlign: 'center', color: '#7a7670', fontSize: '.84rem' }}>
                  No custom queries yet.<br />
                  <span style={{ fontSize: '.78rem' }}>Add queries your customers would ask AI — city + service combinations work best.</span>
                </div>
              ) : customQueries.map((q, i) => (
                <div key={i} style={{ padding: '11px 20px', borderBottom: '1px solid #f8f7f4', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#f8f7f4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.7rem', fontWeight: 700, color: '#0a0a0a', flexShrink: 0 }}>{autoQueries.length + i + 1}</div>
                  <span style={{ fontSize: '.84rem', color: '#3a3a38', flex: 1, lineHeight: 1.5 }}>{q}</span>
                  {!locked && (
                    <button onClick={() => removeQuery(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7a7670', fontSize: '.9rem', padding: '2px 4px', borderRadius: 5, lineHeight: 1 }} title="Remove">✕</button>
                  )}
                </div>
              ))}
            </div>

            {/* Add query input */}
            {!locked && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid #e4e0d8', display: 'flex', gap: 8 }}>
                <input
                  value={newQuery} onChange={e => setNewQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addQuery()}
                  placeholder={remaining > 0 ? 'Add a custom query… (press Enter)' : 'Maximum queries reached'}
                  disabled={remaining <= 0}
                  maxLength={200}
                  style={{ flex: 1, padding: '8px 12px', border: '1.5px solid #e4e0d8', borderRadius: 9, fontSize: '.84rem', fontFamily: 'inherit', outline: 'none', opacity: remaining <= 0 ? .5 : 1 }}
                />
                <button onClick={addQuery} disabled={!newQuery.trim() || remaining <= 0} style={{ padding: '8px 16px', borderRadius: 50, background: '#0a0a0a', color: 'white', border: 'none', cursor: 'pointer', fontSize: '.82rem', fontWeight: 700, fontFamily: 'inherit', opacity: !newQuery.trim() || remaining <= 0 ? .4 : 1 }}>Add</button>
              </div>
            )}
          </Card>

          {/* Save button + error + tips */}
          {!locked && (
            <div>
              {error && (
                <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 9, padding: '9px 13px', fontSize: '.82rem', color: '#c0392b', marginBottom: 10 }}>{error}</div>
              )}
              {saved && (
                <div style={{ background: '#e8f5ef', border: '1px solid #bbf7d0', borderRadius: 9, padding: '9px 13px', fontSize: '.82rem', color: '#1a6b45', marginBottom: 10 }}>✓ Queries saved — will apply to your next weekly scan.</div>
              )}
              <button onClick={saveQueries} disabled={saving} style={{ width: '100%', padding: 12, borderRadius: 50, background: '#0a0a0a', color: 'white', border: 'none', cursor: 'pointer', fontSize: '.875rem', fontWeight: 700, fontFamily: 'inherit', opacity: saving ? .6 : 1 }}>
                {saving ? 'Saving…' : 'Save queries'}
              </button>
            </div>
          )}

          <Card style={{ padding: 16 }}>
            <div style={{ fontWeight: 600, fontSize: '.78rem', marginBottom: 10, color: '#0a0a0a' }}>Tips for good custom queries</div>
            {['Include your city or neighbourhood — "best dentist in Midtown Sacramento"','Think like a customer — what would they ask AI before choosing you?','Try category + location combos — "Italian catering Sacramento weddings"','Use competitor-adjacent queries — "alternatives to [category] near me"'].map((tip, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 7, fontSize: '.78rem', color: '#7a7670', lineHeight: 1.55 }}>
                <span style={{ color: '#f5c842', fontWeight: 700, flexShrink: 0 }}>✦</span>
                <span>{tip}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function AIVisibility() {
  const { customer }    = useAuth();
  const [tab, setTab]   = useState('overview');
  const [report, setReport] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState(null);

  useEffect(() => { if (customer) loadReport(); }, [customer]);

  async function loadReport() {
    try {
      const res = await axios.get(`${API}/llm/report`, { headers: authHeaders() });
      if (res.data.report) { setReport(res.data.report); setLastScanned(res.data.report?.run?.completed_at); }
    } catch (e) { console.error(e); }
  }

  async function triggerScan() {
    setScanning(true);
    try {
      await axios.post(`${API}/llm/scan`, {}, { headers: authHeaders() });
      setTimeout(loadReport, 5000);
    } catch (e) { console.error(e); }
    finally { setTimeout(() => setScanning(false), 3500); }
  }

  return (
    <DashboardLayout title="AI Visibility">
      {/* Topbar */}
      <div style={{ background: 'white', borderBottom: '1px solid #e4e0d8', padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 2 }} className="tabs-scrollable">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '.84rem', fontWeight: tab === t.id ? 700 : 500, fontFamily: 'inherit', color: tab === t.id ? '#0a0a0a' : '#7a7670', borderBottom: tab === t.id ? '2px solid #0a0a0a' : '2px solid transparent', transition: 'all .15s' }}>{t.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
          {lastScanned && <span style={{ fontSize: '.75rem', color: '#7a7670' }}>Last scan: {new Date(lastScanned).toLocaleDateString()}</span>}
          <button onClick={triggerScan} disabled={scanning} style={{ padding: '7px 18px', borderRadius: 50, background: scanning ? '#f0eeea' : '#0a0a0a', color: scanning ? '#7a7670' : 'white', border: 'none', cursor: 'pointer', fontSize: '.82rem', fontWeight: 700, fontFamily: 'inherit', transition: 'all .2s' }}>
            {scanning ? '↻ Scanning…' : data?.nextScanAt && new Date(data.nextScanAt) > new Date() ? `Next run: ${new Date(data.nextScanAt).toLocaleDateString('en-US',{month:'short',day:'numeric'})}` : '↻ Run scan now'}
          </button>
        </div>
      </div>

      {tab === 'overview'    && <OverviewTab    report={report} />}
      {tab === 'by-model'    && <ByModelTab     report={report} />}
      {tab === 'results'     && <ResultsTab     report={report} />}
      {tab === 'competitors' && <CompetitorsTab report={report} />}
      {tab === 'queries'     && <QueriesTab />}
    </DashboardLayout>
  );
}
