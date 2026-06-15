// ============================================
// pages/dashboard/ai-visibility.js
// AI Visibility — standalone page
// Tabs: Overview / By Model / Query Results / Competitors / Queries
// The Queries tab lets customers view and edit
// the 15 weekly queries before each scan.
// ============================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { StatCard, Button as KitButton } from '../../components/ui';
import EmptyState from '../../components/EmptyState';
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
  return <div style={{ background: 'white', border: '1.5px solid #e4e0d8', borderRadius: 14, ...style }}>{children}</div>;
}


function ModelBadge({ name }) {
  const styles = {
    chatgpt:    { background: '#e8f5ef', color: '#1a6b45'  },
    gemini:     { background: '#fee2e2', color: '#c0392b'  },
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
  if (!report) return <div style={{ padding: 24 }}><EmptyState title="No scan data yet" description="Run your first scan to see how often AI assistants like ChatGPT recommend your business." /></div>;

  const { run, byLLM = [], bestMentions = [], missedQueries = [] } = report;

  return (
    <div style={{ padding: 24 }}>
      <div className="m-grid-1" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, marginBottom: 18 }}>
        <ScoreGauge score={run.visibility_score ?? 0} delta={run.prev_visibility != null ? run.visibility_score - run.prev_visibility : 0} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="m-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            <StatCard label="Queries run"     value={run.total_queries ?? 0}                sub="across all AI models" />
            <StatCard label="Times mentioned" value={run.total_mentions ?? 0}              sub={<span><span style={{ color: '#1a6b45', fontWeight: 600 }}>{run.visibility_score ?? 0}%</span> mention rate</span>} />
            <StatCard label="Positive"        value={run.total_positive ?? 0}              accent="#1a6b45" valueColor="#1a6b45" sub="of all mentions" />
            <StatCard label="Missed queries"  value={run.total_not_found ?? 0}              accent="#f59e0b" valueColor="#b45309" sub="not mentioned" />
          </div>
          <Card style={{ padding: 16 }}>
            <div style={{ fontSize: '.68rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 10 }}>Visibility by AI model</div>
            {byLLM.map(m => {
              const colors = { chatgpt:'#74aa9c', gemini:'#e8453c', claude:'#0a0a0a' };
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
      <div className="m-grid-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
        <Card style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #e4e0d8' }}>
            <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 2 }}>Where AI mentioned you ✓</div>
            <div style={{ fontSize: '.75rem', color: '#7a7670' }}>Queries where your business appeared</div>
          </div>
          {bestMentions.slice(0,3).map((m, i) => (
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
          {(report.recommendations && report.recommendations.length
            ? report.recommendations.slice(0, 4).map(r => r.action)
            : ['Keep Google reviews coming — AI models weight rating and review volume heavily.', 'Publish fresh content regularly — an active business signals trust to AI crawlers.', 'Keep listings synced across Apple Maps, Bing, and other platforms.', 'Use your business name and city consistently across every platform.']
          ).map((tip, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#f5c842', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.65rem', fontWeight: 800, color: '#0a0a0a', flexShrink: 0 }}>{i+1}</span>
              <div style={{ fontSize: '.8rem', color: 'rgba(255,255,255,.7)', lineHeight: 1.55 }}>{tip}</div>
            </div>
          ))}
          {report.recommendations && report.recommendations.length > 0 && (
            <div style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.45)', marginTop: 4 }}>See the Competitors tab for the steps behind each.</div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ── BY MODEL TAB ──────────────────────────────────────────────────────────────
function ByModelTab({ report }) {
  const [expanded, setExpanded] = React.useState(null);
  if (!report?.byLLM?.length) return <div style={{ padding: 24 }}><EmptyState title="No scan data yet" description="Run your first scan to see results broken down by AI model." /></div>;
  const models = report.byLLM;
  const meta = { chatgpt:{color:'#74aa9c',desc:'OpenAI · ChatGPT'}, gemini:{color:'#e8453c',desc:'Google · Gemini'}, claude:{color:'#0a0a0a',desc:'Anthropic · Claude'} };
  const sc = { positive:{bg:'#dcfce7',color:'#1a6b45',label:'Positive'}, neutral:{bg:'#fef9c3',color:'#92690a',label:'Neutral'}, negative:{bg:'#fee2e2',color:'#c0392b',label:'Negative'} };
  return (
    <div style={{ padding:24, display:'flex', flexDirection:'column', gap:12 }}>
      {models.map(m => {
        const mm=meta[m.llm_name?.toLowerCase()]||{}, pct=parseInt(m.visibility_pct)||0;
        const pc=pct>=70?'#1a6b45':pct>=50?'#f59e0b':'#c0392b';
        const sent=sc[m.sentiment]||sc.neutral, open=expanded===m.llm_name;
        return (
          <Card key={m.llm_name} style={{ overflow:'hidden', borderTop:'3px solid '+(mm.color||'#0a0a0a') }}>
            <div style={{ padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }} onClick={() => setExpanded(open?null:m.llm_name)}>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:'.9rem', textTransform:'capitalize', marginBottom:2 }}>{m.llm_name}</div>
                  <div style={{ fontSize:'.72rem', color:'#7a7670' }}>{mm.desc}</div>
                </div>
                <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                  <span style={{ background:'#e8f5ef', color:'#1a6b45', fontSize:'.67rem', fontWeight:600, padding:'2px 7px', borderRadius:50 }}>{m.mentions||0} mentions</span>
                  <span style={{ background:sent.bg, color:sent.color, fontSize:'.67rem', fontWeight:600, padding:'2px 7px', borderRadius:50 }}>{sent.label}</span>
                  <span style={{ background:'#fff8e8', color:'#92690a', fontSize:'.67rem', fontWeight:600, padding:'2px 7px', borderRadius:50 }}>{(m.total_queries||0)-(m.mentions||0)} missed</span>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.7rem', fontWeight:900, color:pc, lineHeight:1 }}>{pct}%</div>
                  <div style={{ fontSize:'.65rem', color:'#7a7670' }}>visibility</div>
                </div>
                <span style={{ color:'#7a7670', display:'block', transition:'transform .2s', transform:open?'rotate(180deg)':'none' }}>▾</span>
              </div>
            </div>
            {open && (
              <div className="m-grid-1" style={{ borderTop:'1px solid #e4e0d8', display:'grid', gridTemplateColumns:'1fr 1fr 1fr' }}>
                <div style={{ padding:'14px 16px', borderRight:'1px solid #e4e0d8' }}>
                  <div style={{ fontSize:'.69rem', fontWeight:700, color:'#7a7670', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>Mention snippets</div>
                  {(m.snippets||[]).length===0 ? <div style={{ fontSize:'.78rem', color:'#c8c4bc' }}>No mentions yet</div> : (m.snippets||[]).map((s,i)=>(
                    <div key={i} style={{ marginBottom:10 }}>
                      <div style={{ fontSize:'.67rem', fontWeight:700, color:mm.color, marginBottom:3, textTransform:'uppercase' }}>{s.query}</div>
                      <div style={{ background:'#f8f7f4', borderLeft:'3px solid '+(mm.color||'#e4e0d8'), borderRadius:'0 8px 8px 0', padding:'7px 9px', fontSize:'.76rem', color:'#3a3a38', lineHeight:1.6, fontStyle:'italic' }}>{s.text}</div>
                    </div>
                  ))}
                </div>
                <div style={{ padding:'14px 16px', borderRight:'1px solid #e4e0d8' }}>
                  <div style={{ fontSize:'.69rem', fontWeight:700, color:'#7a7670', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>Where it finds you</div>
                  {(m.citations||[]).map((c,i)=>(
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:7 }}>
                      <div style={{ width:6, height:6, borderRadius:'50%', background:mm.color||'#e4e0d8', flexShrink:0 }} />
                      <span style={{ fontSize:'.8rem', color:'#3a3a38', fontWeight:500 }}>{c}</span>
                    </div>
                  ))}
                  <div style={{ marginTop:7, fontSize:'.7rem', color:'#7a7670', lineHeight:1.5 }}>The directories this AI pulls your data from.</div>
                </div>
                <div style={{ padding:'14px 16px' }}>
                  <div style={{ fontSize:'.69rem', fontWeight:700, color:'#7a7670', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>How to improve</div>
                  {(m.recommendations||[]).map((r,i)=>(
                    <div key={i} style={{ display:'flex', gap:7, marginBottom:8 }}>
                      <span style={{ color:'#f5c842', fontWeight:700, flexShrink:0 }}>✦</span>
                      <span style={{ fontSize:'.77rem', color:'#3a3a38', lineHeight:1.6 }}>{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function ResultsTab({ report }) {
  const [modelFilter, setModelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const rows = report?.results || [];

  const wowTotal=rows.filter(r=>r.mentioned).length, wowPrev=rows.filter(r=>r.prev_mentioned).length;
  const wowNew=rows.filter(r=>r.mentioned&&!r.prev_mentioned).length, wowLost=rows.filter(r=>!r.mentioned&&r.prev_mentioned).length;
  const wowDelta=wowTotal-wowPrev;
  const filtered = rows.filter(r => {
    if (modelFilter !== 'all' && r.llm_name !== modelFilter) return false;
    if (statusFilter === 'mentioned' && !r.mentioned) return false;
    if (statusFilter === 'missed'    &&  r.mentioned) return false;
    return true;
  });

  return (
    <div style={{ padding: 24 }}>
      <div className="m-grid-2" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:18 }}>
        {[
          {label:'Mentions this scan',value:wowTotal,sub:'of '+rows.length+' queries',c:'#0a0a0a'},
          {label:'vs last scan',value:(wowDelta>=0?'+':'')+wowDelta,sub:wowDelta>0?'improvement':wowDelta<0?'decline':'no change',c:wowDelta>0?'#1a6b45':wowDelta<0?'#c0392b':'#7a7670'},
          {label:'New mentions',value:'+'+wowNew,sub:'gained this scan',c:'#1a6b45'},
          {label:'Lost mentions',value:wowLost>0?'-'+wowLost:'0',sub:'dropped this scan',c:wowLost>0?'#c0392b':'#7a7670'},
        ].map(s=>(
          <Card key={s.label} style={{ padding:'12px 14px' }}>
            <div style={{ fontSize:'.7rem', color:'#7a7670', marginBottom:3 }}>{s.label}</div>
            <div style={{ fontSize:'1.5rem', fontWeight:900, color:s.c, lineHeight:1, fontFamily:"'Playfair Display',serif" }}>{s.value}</div>
            <div style={{ fontSize:'.68rem', color:'#7a7670', marginTop:2 }}>{s.sub}</div>
          </Card>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 9, marginBottom: 16 }}>
        <select value={modelFilter} onChange={e => setModelFilter(e.target.value)} style={{ padding: '7px 12px', border: '1.5px solid #e4e0d8', borderRadius: 9, fontSize: '.8rem', fontFamily: 'inherit', outline: 'none' }}>
          <option value="all">All models</option>
          <option value="chatgpt">ChatGPT</option>
          <option value="gemini">Gemini</option>
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

// ── COMPETITORS TAB (unified) ─────────────────────────────────────────────────
// One page, three zones: where you stand (strip), your competition (a single
// merged list of Google-nearby + AI-recommended businesses, matched by name),
// and condensed next moves. A business in BOTH lists is flagged as a top threat.
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();

function InfoTip({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button onClick={() => setOpen(o => !o)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        aria-label="What is this?"
        style={{ width: 18, height: 18, borderRadius: '50%', border: '1.5px solid #c8c4bc', background: 'white', color: '#7a7670', fontSize: '.64rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', lineHeight: 1, padding: 0 }}>i</button>
      {open && (
        <span style={{ position: 'absolute', top: 24, left: 0, zIndex: 30, width: 290, background: '#0a0a0a', color: 'white', fontSize: '.74rem', lineHeight: 1.55, padding: '11px 13px', borderRadius: 10, boxShadow: '0 8px 28px rgba(0,0,0,.22)', fontWeight: 400, textAlign: 'left' }}>{text}</span>
      )}
    </span>
  );
}

function CompetitorsTab({ report }) {
  const [bench, setBench]        = useState(null);
  const [bLoading, setBLoading]  = useState(true);
  const [refreshing, setRefresh] = useState(false);
  const [showAll, setShowAll]    = useState(false);
  const [err, setErr]            = useState('');

  useEffect(() => {
    let active = true;
    axios.get(`${API}/reports/competitors`, { headers: authHeaders() })
      .then(r => { if (active) { setBench(r.data); setBLoading(false); } })
      .catch(() => { if (active) { setBench(null); setBLoading(false); } });
    return () => { active = false; };
  }, []);

  async function scan() {
    setRefresh(true); setErr('');
    try {
      const r = await axios.post(`${API}/reports/competitors/refresh`, {}, { headers: authHeaders() });
      setBench(prev => ({ ...(prev || {}), benchmark: r.data.benchmark }));
    } catch (e) {
      setErr((e && e.response && e.response.data && e.response.data.error) || 'Scan failed. Please try again.');
    } finally { setRefresh(false); }
  }

  const run = report?.run || {};
  const benchmark = bench && bench.benchmark;
  const configured = bench && bench.configured;
  const hasBench = benchmark && benchmark.hasData;
  const ours = hasBench ? benchmark.ours : null;
  const fmtStars = (n) => n != null ? `${Number(n).toFixed(1)} ★` : '—';
  const aiScore = run.visibility_score != null ? run.visibility_score : null;

  // Merge competitors (nearby + AI), matched by normalized name.
  const map = new Map();
  if (hasBench) {
    for (const c of benchmark.competitors) {
      map.set(norm(c.name), { name: c.name, rating: c.rating, reviews: c.reviewCount, address: c.address, nearby: true, ai: false, mentions: null, reasons: [] });
    }
  }
  for (const c of (report?.topCompetitors || [])) {
    const name = c.competitor || c.name; if (!name) continue;
    const k = norm(name);
    if (map.has(k)) {
      const row = map.get(k);
      row.ai = true;
      row.mentions = c.mentions != null ? Number(c.mentions) : row.mentions;
      if (c.reasons && c.reasons.length) row.reasons = c.reasons;
    } else {
      map.set(k, { name, rating: null, reviews: null, address: null, nearby: false, ai: true, mentions: c.mentions != null ? Number(c.mentions) : null, reasons: c.reasons || [] });
    }
  }
  const competitors = Array.from(map.values()).sort((a, b) => {
    const aBoth = a.nearby && a.ai, bBoth = b.nearby && b.ai;
    if (aBoth !== bBoth) return (bBoth ? 1 : 0) - (aBoth ? 1 : 0);
    const ar = a.rating != null, br = b.rating != null;
    if (ar !== br) return (br ? 1 : 0) - (ar ? 1 : 0);
    if (ar && br && a.rating !== b.rating) return b.rating - a.rating;
    return (b.mentions || 0) - (a.mentions || 0);
  });

  // Review gap vs the most-reviewed nearby competitor.
  let gap = null, topName = '';
  if (hasBench) {
    const top = benchmark.competitors.reduce((m, c) => c.reviewCount > (m ? m.reviewCount : -1) ? c : m, null);
    if (top) { topName = top.name; gap = top.reviewCount - ours.totalReviews; }
  }

  const recs = report?.recommendations || [];
  const gaps = report?.queryGaps || [];
  const prio = { high: { bg:'#fee2e2', color:'#c0392b', text:'High impact' }, medium: { bg:'#fef3c7', color:'#92690a', text:'Medium' }, low: { bg:'#f0eeea', color:'#7a7670', text:'Low' } };
  const llmLabel = { chatgpt:'ChatGPT', gemini:'Gemini', claude:'Claude' };
  const label = (n) => llmLabel[n] || n;
  const visibleRecs = showAll ? recs : recs.slice(0, 2);

  const tag = (text, bg, color) => <span style={{ fontSize:'.64rem', fontWeight:700, color, background:bg, padding:'2px 7px', borderRadius:50, whiteSpace:'nowrap' }}>{text}</span>;

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <div style={{ fontWeight:700, fontSize:'1rem' }}>Local competition</div>
        <InfoTip text="Two views of your competition in one place: how your Google rating and review count compare to the nearest businesses in your category, and which businesses AI assistants name when customers ask for the best nearby. A business that shows up in both is your biggest threat." />
        <a href="https://swarmreply.com/help#competitor-benchmarking" target="_blank" rel="noreferrer"
          style={{ marginLeft:'auto', fontSize:'.78rem', fontWeight:600, color:'#4a4a48', textDecoration:'none', borderBottom:'1px solid #e4e0d8' }}>How this works →</a>
      </div>

      {err && <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:9, padding:'9px 12px', fontSize:'.8rem', color:'#c0392b', marginBottom:14 }}>{err}</div>}

      {/* ZONE 1 — Where you stand */}
      <div className="m-grid-2" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:18 }}>
        <Card style={{ padding:'14px 16px' }}>
          <div style={{ fontSize:'.7rem', color:'#7a7670', marginBottom:3 }}>Local rank</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.5rem', fontWeight:900, lineHeight:1 }}>{hasBench ? `#${ours.rank}` : '—'}</div>
          <div style={{ fontSize:'.68rem', color:'#7a7670', marginTop:3 }}>{hasBench ? `of ${ours.total} nearby` : 'Scan to see'}</div>
        </Card>
        <Card style={{ padding:'14px 16px' }}>
          <div style={{ fontSize:'.7rem', color:'#7a7670', marginBottom:3 }}>Your rating</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.5rem', fontWeight:900, lineHeight:1 }}>{hasBench ? fmtStars(ours.rating) : '—'}</div>
          <div style={{ fontSize:'.68rem', color:'#7a7670', marginTop:3 }}>{hasBench ? (benchmark.ratingDiff >= 0 ? `+${benchmark.ratingDiff} vs area avg` : `${benchmark.ratingDiff} vs area avg`) : 'vs area average'}</div>
        </Card>
        <Card style={{ padding:'14px 16px' }}>
          <div style={{ fontSize:'.7rem', color:'#7a7670', marginBottom:3 }}>AI visibility</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.5rem', fontWeight:900, lineHeight:1, color: aiScore != null ? (aiScore>=70?'#1a6b45':aiScore>=50?'#f59e0b':'#c0392b') : '#0a0a0a' }}>{aiScore != null ? `${aiScore}%` : '—'}</div>
          <div style={{ fontSize:'.68rem', color:'#7a7670', marginTop:3 }}>{aiScore != null ? 'of AI queries mention you' : 'Run a scan'}</div>
        </Card>
      </div>

      {/* ZONE 2 — Your competition (merged) */}
      <Card style={{ marginBottom:18, overflow:'hidden', padding:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 18px', borderBottom:'1px solid #e4e0d8' }}>
          <div style={{ fontWeight:600, fontSize:'.875rem' }}>Your competition</div>
          {configured && (
            <button onClick={scan} disabled={refreshing}
              style={{ padding:'6px 12px', borderRadius:50, border:'1.5px solid #e4e0d8', background:'white', fontSize:'.74rem', fontWeight:600, cursor:refreshing?'default':'pointer', fontFamily:'inherit', color:'#4a4a48' }}>
              {refreshing ? 'Scanning…' : hasBench ? '↻ Refresh' : '↻ Scan nearby'}
            </button>
          )}
        </div>

        {/* You */}
        {(hasBench || aiScore != null) && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr auto auto', gap:12, alignItems:'center', padding:'12px 18px', background:'rgba(245,200,66,.09)', borderBottom:'1px solid #f0eeea' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0, flexWrap:'wrap' }}>
              <span style={{ fontWeight:700, fontSize:'.86rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{ours ? ours.name : 'Your business'}</span>
              {tag('You', '#fef3c7', '#92690a')}
            </div>
            <div style={{ textAlign:'right', fontSize:'.82rem', fontWeight:700 }}>{hasBench ? fmtStars(ours.rating) : '—'}</div>
            <div style={{ textAlign:'right', fontSize:'.78rem', color:'#7a7670', width:84 }}>{hasBench ? `${ours.totalReviews} rev` : '—'}</div>
          </div>
        )}

        {/* Competitors */}
        {competitors.length === 0 ? (
          <div style={{ padding:'22px 18px' }}>
            {configured ? (
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:'.84rem', color:'#7a7670', marginBottom:12 }}>{hasBench ? 'No competitors found nearby yet.' : 'Scan to see the nearest businesses in your category — and run an AI visibility scan to see who AI recommends.'}</div>
                {!hasBench && <button onClick={scan} disabled={refreshing} style={{ padding:'8px 16px', borderRadius:50, border:'none', background:'#0a0a0a', color:'white', fontSize:'.8rem', fontWeight:700, cursor:refreshing?'default':'pointer', fontFamily:'inherit' }}>{refreshing ? 'Scanning…' : 'Try scanning now'}</button>}
              </div>
            ) : (
              <div style={{ fontSize:'.82rem', color:'#7a7670', textAlign:'center' }}>Competitor scanning isn’t enabled on this account yet.</div>
            )}
          </div>
        ) : competitors.map((c, i) => {
          const both = c.nearby && c.ai;
          return (
            <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr auto auto', gap:12, alignItems:'start', padding:'12px 18px', borderBottom: i < competitors.length-1 ? '1px solid #f8f7f4' : 'none' }}>
              <div style={{ minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                  <span style={{ fontWeight:600, fontSize:'.85rem' }}>{c.name}</span>
                  {both && tag('🔥 Top threat', '#fee2e2', '#c0392b')}
                  {c.nearby && !both && tag('Nearby', '#e8f5ef', '#1a6b45')}
                  {c.ai && !both && (
                    <span title={`Recommended by AI assistants${c.mentions ? ` — named in ${c.mentions} ${c.mentions === 1 ? 'query' : 'queries'} we ran` : ''}`}
                      style={{ fontSize:'.64rem', fontWeight:700, color:'#6d28d9', background:'#ede9fe', padding:'2px 7px', borderRadius:50, whiteSpace:'nowrap', cursor:'help' }}>
                      AI recommends
                    </span>
                  )}
                </div>
                {c.address && <div style={{ fontSize:'.7rem', color:'#7a7670', marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.address}</div>}
                {c.reasons && c.reasons.length > 0 && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:6 }}>
                    {c.reasons.slice(0,3).map((r,j) => <span key={j} style={{ fontSize:'.7rem', color:'#4a4a48', background:'#f8f7f4', border:'1px solid #f0eeea', borderRadius:50, padding:'2px 8px' }}>{r}</span>)}
                  </div>
                )}
              </div>
              <div style={{ textAlign:'right', fontSize:'.82rem', fontWeight:600 }}>{fmtStars(c.rating)}</div>
              <div style={{ textAlign:'right', fontSize:'.78rem', color:'#7a7670', width:84 }}>{c.reviews != null ? `${c.reviews} rev` : '—'}</div>
            </div>
          );
        })}

        {hasBench && benchmark.lastUpdated && (
          <div style={{ fontSize:'.68rem', color:'#7a7670', padding:'10px 18px' }}>Nearby data from Google · updated {new Date(benchmark.lastUpdated).toLocaleDateString('en-US',{month:'short',day:'numeric'})} · refreshes weekly</div>
        )}
      </Card>

      {/* ZONE 3 — What to do next */}
      {(gap > 0 || recs.length > 0) && (
        <Card style={{ padding:20 }}>
          <div style={{ fontWeight:600, fontSize:'.875rem', marginBottom:14 }}>What to do next</div>

          {gap > 0 && (
            <div style={{ display:'flex', gap:12, alignItems:'flex-start', padding:'12px 14px', background:'#fff8e8', border:'1px solid #fde68a', borderRadius:12, marginBottom:12 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'.84rem', fontWeight:700, color:'#92690a' }}>Close the review gap</div>
                <div style={{ fontSize:'.78rem', color:'#7a7670', marginTop:2 }}>You're {gap} review{gap===1?'':'s'} behind {topName}, the most-reviewed business nearby.</div>
              </div>
              <a href="/dashboard/grow" style={{ alignSelf:'center', padding:'7px 14px', borderRadius:50, background:'#0a0a0a', color:'white', textDecoration:'none', fontSize:'.76rem', fontWeight:700, whiteSpace:'nowrap' }}>Send requests →</a>
            </div>
          )}

          {visibleRecs.map((r, i) => {
            const p = prio[r.priority] || prio.medium;
            return (
              <div key={i} style={{ padding:'10px 0', borderBottom: i < visibleRecs.length-1 ? '1px solid #f0eeea' : 'none' }}>
                <div style={{ marginBottom:4 }}>{tag(p.text, p.bg, p.color)}</div>
                <div style={{ fontSize:'.83rem', fontWeight:600, lineHeight:1.45 }}>{r.action}</div>
                {r.rationale && <div style={{ fontSize:'.76rem', color:'#7a7670', lineHeight:1.55, marginTop:3 }}>{r.rationale}</div>}
                {showAll && r.steps && r.steps.length > 0 && (
                  <ul style={{ margin:'7px 0 0', paddingLeft:16 }}>
                    {r.steps.map((s,k) => <li key={k} style={{ fontSize:'.76rem', color:'#4a4a48', lineHeight:1.5, marginBottom:3 }}>{s}</li>)}
                  </ul>
                )}
              </div>
            );
          })}

          {(recs.length > 2 || gaps.length > 0) && (
            <button onClick={() => setShowAll(s => !s)}
              style={{ marginTop:12, background:'none', border:'none', color:'#0a0a0a', fontSize:'.78rem', fontWeight:700, cursor:'pointer', fontFamily:'inherit', padding:0 }}>
              {showAll ? '− Show less' : `+ See all moves${recs.length>2?` (${recs.length})`:''}`}
            </button>
          )}

          {showAll && gaps.length > 0 && (
            <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid #f0eeea' }}>
              <div style={{ fontSize:'.78rem', fontWeight:700, marginBottom:8 }}>Searches where AI didn't mention you</div>
              {gaps.map((g,i) => (
                <div key={i} style={{ marginBottom:8 }}>
                  <div style={{ fontSize:'.78rem', color:'#0a0a0a' }}>&ldquo;{g.query_text}&rdquo;</div>
                  <div style={{ fontSize:'.7rem', color:'#c0392b', marginTop:2 }}>Missing on {(g.missedOn || []).map(label).join(', ')}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
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
  const [allQueries, setAllQueries] = useState([]);
  const [error, setError]         = useState('');

  const MAX = 15;

  useEffect(() => { loadQueries(); }, []);

  async function loadQueries() {
    try {
      const res = await axios.get(`${API}/llm/queries`, { headers: authHeaders() });
      setData(res.data);
      // Merge auto-generated and custom into one unified list
      const combined = [
        ...(res.data.autoQueries || []),
        ...(res.data.customQueries || []),
      ];
      setAllQueries(combined);
    } catch (e) {
      console.error(e);
      // No fake data on failure — start from an empty list.
      setData({ autoQueries: [], customQueries: [], maxQueries: 15, locked: false, nextScanAt: null, lastScanAt: null });
      setAllQueries([]);
      setError('Could not load your queries. Add your own below, or refresh to try again.');
    } finally {
      setLoading(false);
    }
  }

  async function saveQueries() {
    setSaving(true);
    setError('');
    try {
      await axios.put(`${API}/llm/queries`, { customQueries: allQueries }, { headers: authHeaders() });
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
    if (allQueries.length >= MAX) {
      setError(`Maximum ${MAX} queries reached. Remove one first.`);
      return;
    }
    if (allQueries.includes(q)) { setError('This query already exists.'); return; }
    setAllQueries(prev => [...prev, q]);
    setNewQuery('');
    setError('');
  }

  function removeQuery(idx) {
    setAllQueries(prev => prev.filter((_, i) => i !== idx));
    setError('');
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#7a7670' }}>Loading queries…</div>;

  const totalUsed = allQueries.length;
  const pct       = Math.round((totalUsed / MAX) * 100);
  const remaining = MAX - totalUsed;
  const locked    = data?.locked || false;

  return (
    <div style={{ padding: 24 }}>
      {/* Header info */}
      <div className="m-grid-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16, marginBottom: 20 }}>
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
          <div style={{ fontSize: '.72rem', color: '#7a7670' }}>
            {remaining > 0 ? `${remaining} slots remaining` : 'Maximum reached'}
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

      <div className="m-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>

        {/* Unified query list — all editable */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #e4e0d8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '.875rem' }}>Your queries</div>
                <div style={{ fontSize: '.73rem', color: '#7a7670', marginTop: 2 }}>All queries are editable — pre-loaded ones give you a head start</div>
              </div>
              <span style={{ background: '#0a0a0a', color: 'white', fontSize: '.7rem', fontWeight: 700, padding: '2px 9px', borderRadius: 50 }}>{totalUsed}/{MAX}</span>
            </div>
            <div style={{ maxHeight: 420, overflowY: 'auto' }}>
              {allQueries.length === 0 ? (
                <div style={{ padding: '24px 20px', textAlign: 'center', color: '#7a7670', fontSize: '.84rem' }}>
                  No queries yet. Add your first query below.
                </div>
              ) : allQueries.map((q, i) => (
                <div key={i} style={{ padding: '11px 20px', borderBottom: '1px solid #f8f7f4', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#f8f7f4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.7rem', fontWeight: 700, color: '#0a0a0a', flexShrink: 0 }}>{i + 1}</div>
                  <span style={{ fontSize: '.84rem', color: '#3a3a38', flex: 1, lineHeight: 1.5 }}>{q}</span>
                  {!locked && (
                    <button onClick={() => removeQuery(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c8c4bc', fontSize: '.9rem', padding: '2px 6px', borderRadius: 5, lineHeight: 1, transition: 'color .15s' }}
                      onMouseEnter={e => e.currentTarget.style.color='#c0392b'}
                      onMouseLeave={e => e.currentTarget.style.color='#c8c4bc'}
                      title="Remove">✕</button>
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
                  placeholder={remaining > 0 ? 'Add a query… (press Enter)' : 'Maximum 15 queries reached'}
                  disabled={remaining <= 0}
                  maxLength={200}
                  style={{ flex: 1, padding: '8px 12px', border: '1.5px solid #e4e0d8', borderRadius: 9, fontSize: '.84rem', fontFamily: 'inherit', outline: 'none', opacity: remaining <= 0 ? .5 : 1 }}
                />
                <button onClick={addQuery} disabled={!newQuery.trim() || remaining <= 0} style={{ padding: '8px 16px', borderRadius: 50, background: '#0a0a0a', color: 'white', border: 'none', cursor: 'pointer', fontSize: '.82rem', fontWeight: 700, fontFamily: 'inherit', opacity: !newQuery.trim() || remaining <= 0 ? .4 : 1 }}>Add</button>
              </div>
            )}
          </Card>

          {/* Save button */}
          {!locked && (
            <div>
              {error && <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 9, padding: '9px 13px', fontSize: '.82rem', color: '#c0392b', marginBottom: 10 }}>{error}</div>}
              {saved && <div style={{ background: '#e8f5ef', border: '1px solid #bbf7d0', borderRadius: 9, padding: '9px 13px', fontSize: '.82rem', color: '#1a6b45', marginBottom: 10 }}>✓ Queries saved — will apply to your next weekly scan.</div>}
              <button onClick={saveQueries} disabled={saving} style={{ width: '100%', padding: 12, borderRadius: 50, background: '#0a0a0a', color: 'white', border: 'none', cursor: 'pointer', fontSize: '.875rem', fontWeight: 700, fontFamily: 'inherit', opacity: saving ? .6 : 1 }}>
                {saving ? 'Saving…' : 'Save queries'}
              </button>
            </div>
          )}
        </div>

        {/* Tips sidebar */}
        <Card style={{ padding: 16, height: 'fit-content' }}>
          <div style={{ fontWeight: 600, fontSize: '.78rem', marginBottom: 10, color: '#0a0a0a' }}>Tips for good queries</div>
          {['Include your city or neighbourhood — "best dentist in Midtown Sacramento"','Think like a customer — what would they ask AI before choosing you?','Try category + location combos — "Italian catering Sacramento weddings"','Use competitor-adjacent queries — "alternatives to [category] near me"'].map((tip, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 7, fontSize: '.78rem', color: '#7a7670', lineHeight: 1.55 }}>
              <span style={{ color: '#f5c842', fontWeight: 700, flexShrink: 0 }}>✦</span>
              <span>{tip}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export function AiVisibilityPanel() {
  const { customer }    = useAuth();
  const [tab, setTab]   = useState('overview');
  const [report, setReport] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    if (customer) loadReport({ maybeResume: true });
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [customer]);

  async function loadReport({ maybeResume = false } = {}) {
    try {
      const res = await axios.get(`${API}/llm/report`, { headers: authHeaders() });
      if (res.data.report) { setReport(res.data.report); setLastScanned(res.data.report?.run?.completed_at); }
      if (res.data.scanning) {
        setScanning(true);
        if (maybeResume) startPolling();   // a scan is still running — pick the UI back up
      } else {
        setScanning(false);
      }
      return res.data;
    } catch (e) { console.error(e); return null; }
  }

  function startPolling() {
    if (pollRef.current) return;           // already polling
    pollRef.current = setInterval(async () => {
      const data = await loadReport();
      if (!data || !data.scanning) {
        clearInterval(pollRef.current);
        pollRef.current = null;
        setScanning(false);
      }
    }, 8000);
  }

  async function triggerScan() {
    setScanning(true);
    try {
      // Async scan — the backend returns immediately and runs in the background;
      // we poll the report until it lands, so this page (and tab) can be left.
      await axios.post(`${API}/llm/scan`, {}, { headers: authHeaders() });
      startPolling();
    } catch (e) {
      setScanning(false);
      if (e.response?.status === 429) {
        await loadReport();                // weekly cooldown — show the "next scan" state
      } else {
        console.error('Scan failed:', e.response?.data?.error || e.message);
        await loadReport();
      }
    }
  }

  const LLM_LABEL = { chatgpt: 'ChatGPT', gemini: 'Gemini', claude: 'Claude' };
  const skipped = (!scanning && report?.skippedProviders) ? report.skippedProviders : [];

  return (
    <>
      {/* Topbar */}
      <div style={{ background: 'white', borderBottom: '1px solid #e4e0d8', padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 2 }} className="tabs-scrollable">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '.84rem', fontWeight: tab === t.id ? 700 : 500, fontFamily: 'inherit', color: tab === t.id ? '#0a0a0a' : '#7a7670', borderBottom: tab === t.id ? '2px solid #0a0a0a' : '2px solid transparent', transition: 'all .15s' }}>{t.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
          {lastScanned && <span style={{ fontSize: '.75rem', color: '#7a7670' }}>Last scan: {new Date(lastScanned).toLocaleDateString()}</span>}
          {scanning ? (
            <span style={{ fontSize: '.82rem', color: '#92690a', fontWeight: 700 }}>↻ Scanning…</span>
          ) : report?.nextScanAt && new Date(report.nextScanAt) > new Date() ? (
            <div style={{ background: '#f8f7f4', border: '1.5px solid #e4e0d8', borderRadius: 8, padding: '6px 14px', textAlign: 'right' }}>
              <div style={{ fontSize: '.7rem', color: '#7a7670', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700 }}>Next scan</div>
              <div style={{ fontSize: '.82rem', fontWeight: 600, color: '#0a0a0a', marginTop: 2 }}>
                {new Date(report.nextScanAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
            </div>
          ) : (
            <KitButton onClick={triggerScan} disabled={scanning} size="sm">
              ↻ {report?.lastScanAt ? 'Run scan' : 'Run my first scan'}
            </KitButton>
          )}
        </div>
      </div>

      {/* In-progress banner — scan runs server-side, so leaving the page is fine */}
      {scanning && (
        <div style={{ background: '#fffbeb', borderBottom: '1px solid #f5e4b8', padding: '10px 24px', fontSize: '.82rem', color: '#92690a', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700 }}>Scan in progress.</span>
          <span>This usually takes a few minutes. You can leave this page or use the rest of the app — your results will appear here automatically when they're ready.</span>
        </div>
      )}

      {/* Skipped-provider note — honest when a model was temporarily unavailable */}
      {skipped.length > 0 && (
        <div style={{ background: '#f8f7f4', borderBottom: '1px solid #e4e0d8', padding: '8px 24px', fontSize: '.78rem', color: '#7a7670' }}>
          {skipped.map(s => LLM_LABEL[s.llm_name] || s.llm_name).join(', ')} {skipped.length > 1 ? 'were' : 'was'} unavailable in this scan and excluded — included again next scan.
        </div>
      )}

      {tab === 'overview'    && <OverviewTab    report={report} />}
      {tab === 'by-model'    && <ByModelTab     report={report} />}
      {tab === 'results'     && <ResultsTab     report={report} />}
      {tab === 'competitors' && <CompetitorsTab report={report} />}
      {tab === 'queries'     && <QueriesTab />}
    </>
  );
}

export default function AIVisibility() {
  return (
    <DashboardLayout title="AI Visibility">
      <AiVisibilityPanel />
    </DashboardLayout>
  );
}
