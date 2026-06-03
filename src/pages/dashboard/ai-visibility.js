// ============================================
// pages/dashboard/ai-visibility.js
// AI Visibility — standalone page
// Tabs: Overview / By Model / Query Results / Competitors / Queries
// The Queries tab lets customers view and edit
// the 32 weekly queries before each scan.
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
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
              { llm_name: 'grok',    visibility_pct: 58 },
            ]).map(m => {
              const colors = { chatgpt:'#74aa9c', gemini:'#e8453c', perplexity:'#7c3aed', claude:'#0a0a0a', grok:'#1a1a1a' };
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
  const [expanded, setExpanded] = React.useState(null);
  const models = report?.byLLM?.length ? report.byLLM : [
    { llm_name:'chatgpt',    visibility_pct:88, total_queries:8, mentions:7, sentiment:'positive', snippets:[{query:'Best restaurant in Sacramento',text:'"For a top dining experience in Sacramento, Bella\'s Kitchen stands out with consistently excellent service." — ChatGPT'},{query:'Family dinner Sacramento',text:'"Bella\'s Kitchen is frequently recommended for family occasions, noting the warm atmosphere." — ChatGPT'}], citations:['Google Business Profile','Yelp','TripAdvisor'], recommendations:['Your Google Business description is pulling well — keep it updated monthly.','ChatGPT references your Yelp reviews. More reviews there would push your score above 90%.'] },
    { llm_name:'gemini',     visibility_pct:75, total_queries:8, mentions:6, sentiment:'positive', snippets:[{query:"Tell me about Bella\'s Kitchen",text:'"Bella\'s Kitchen in Sacramento is a well-regarded Italian restaurant known for its house-made pasta." — Gemini'}], citations:['Google Business Profile','Google Maps Reviews','OpenTable'], recommendations:['Gemini pulls from Google Maps. Add more photos to your Google Business Profile.','Your hours and menu on Google appear outdated — update them.'] },
    { llm_name:'perplexity', visibility_pct:63, total_queries:8, mentions:5, sentiment:'neutral',  snippets:[{query:'Recommend a restaurant near Sacramento',text:'"According to recent reviews, Bella\'s Kitchen offers a solid Italian dining experience." — Perplexity'}], citations:['Yelp','TripAdvisor','Facebook'], recommendations:['Perplexity uses live web sources. More reviews in the last 30 days will improve your ranking fastest.','Regular Facebook posts help Perplexity surface you more often.'] },
    { llm_name:'claude',     visibility_pct:75, total_queries:8, mentions:6, sentiment:'positive', snippets:[{query:"Is Bella\'s Kitchen Sacramento good?",text:'"Based on available reviews, Bella\'s Kitchen appears to be a well-regarded restaurant with strong customer satisfaction." — Claude'}], citations:['Yelp','Google Reviews','Local Blogs'], recommendations:["Claude tends to hedge. More consistent 5-star reviews will lead to more confident recommendations."] },
    { llm_name:'grok',       visibility_pct:58, total_queries:8, mentions:5, sentiment:'neutral',  snippets:[{query:'Best Italian near Sacramento',text:'"Bella\'s Kitchen is mentioned among Sacramento Italian dining options, with customers praising the pasta dishes." — Grok'}], citations:['X (Twitter)','Yelp','Google'], recommendations:['Grok pulls from X (Twitter). Encourage customers to share on X to boost your visibility.','2-3 social posts per week would significantly help your Grok score.'] },
  ];
  const meta = { chatgpt:{color:'#74aa9c',desc:'OpenAI · GPT-4o'}, gemini:{color:'#e8453c',desc:'Google · Gemini 1.5 Pro'}, perplexity:{color:'#7c3aed',desc:'Perplexity · Online search'}, claude:{color:'#0a0a0a',desc:'Anthropic · Claude Sonnet'}, grok:{color:'#1a1a1a',desc:'xAI · Grok'} };
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
              <div style={{ borderTop:'1px solid #e4e0d8', display:'grid', gridTemplateColumns:'1fr 1fr 1fr' }}>
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

  const rows = report?.results?.length ? report.results : (report ? [] : [
    { llm_name:'chatgpt',    query_text:'Best restaurant in Sacramento',           mentioned:true,  mention_position:1, sentiment:'positive', prev_mentioned:false },
    { llm_name:'gemini',     query_text:'Tell me about Bella\'s Kitchen',          mentioned:true,  mention_position:1, sentiment:'positive', prev_mentioned:true  },
    { llm_name:'chatgpt',    query_text:'Best family dinner Sacramento',           mentioned:false, mention_position:null, sentiment:'not_mentioned', prev_mentioned:false },
    { llm_name:'perplexity', query_text:'Recommend a restaurant near Sacramento',  mentioned:true,  mention_position:3, sentiment:'neutral',  prev_mentioned:true  },
    { llm_name:'claude',     query_text:'What do customers say about Bella\'s?',   mentioned:true,  mention_position:1, sentiment:'positive', prev_mentioned:false },
    { llm_name:'gemini',     query_text:'Compare restaurants in Sacramento',       mentioned:false, mention_position:null, sentiment:'not_mentioned', prev_mentioned:true  },
    { llm_name:'perplexity', query_text:'Best Italian near Sacramento',            mentioned:true,  mention_position:3, sentiment:'neutral',  prev_mentioned:true  },
    { llm_name:'claude',     query_text:'Is Bella\'s Kitchen Sacramento good?',    mentioned:true,  mention_position:1, sentiment:'positive', prev_mentioned:true  },
  ]);

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
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:18 }}>
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
          <option value="perplexity">Perplexity</option>
          <option value="claude">Claude</option>
          <option value="grok">Grok</option>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 10 }}>What you're looking at</div>
          <p style={{ fontSize: '.82rem', color: '#4a4a48', lineHeight: 1.7, margin: '0 0 10px' }}>
            When someone asks ChatGPT, Gemini, or Perplexity a question such as "best business near me", AI models recommend a shortlist of businesses. The competitors above are the ones showing up in those results. Sometimes those competitors are showing up instead of you, sometimes they are alongside you.
          </p>
          <p style={{ fontSize: '.82rem', color: '#4a4a48', lineHeight: 1.7, margin: '0 0 10px' }}>
            A business with more mentions, reviews and overall web presence gets recommended more often, which means more new customers discovering them through AI search.
          </p>
          <p style={{ fontSize: '.82rem', color: '#4a4a48', lineHeight: 1.7, margin: 0 }}>
            Your goal is to move up this leaderboard by increasing your review volume, consistency across directories, and online presence.
          </p>
        </Card>
        <Card style={{ padding: 20, height: 'fit-content' }}>
          <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 12 }}>Competitor gap analysis</div>
          {competitors.slice(1,4).map((c,i) => {
            const yours=competitors[0]?.mentions||0, gap=c.mentions-yours, ahead=gap>0;
            return (
              <div key={i} style={{ marginBottom:12, paddingBottom:12, borderBottom:i<2?'1px solid #f0eeea':'none' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:'.82rem', fontWeight:600 }}>{c.competitor}</span>
                  <span style={{ fontSize:'.7rem', fontWeight:700, color:ahead?'#c0392b':'#1a6b45', background:ahead?'#fee2e2':'#dcfce7', padding:'2px 7px', borderRadius:50 }}>{ahead?gap+' ahead':Math.abs(gap)+' behind'}</span>
                </div>
                <div style={{ fontSize:'.75rem', color:'#7a7670', lineHeight:1.55 }}>{ahead?'They have '+gap+' more AI mentions. Likely higher review volume or more directories.':'You lead by '+Math.abs(gap)+' mentions. Keep your review cadence to hold this lead.'}</div>
              </div>
            );
          })}
          <div style={{ borderTop:'1px solid #f0eeea', paddingTop:10, marginTop:4, fontWeight:700, fontSize:'.82rem', marginBottom:8 }}>What makes them rank higher</div>
          {['More Google reviews — AI models treat review volume and recency as a primary trust signal when deciding who to recommend.', 'Listed on more directories — Yelp, TripAdvisor, Facebook, Apple Maps all feed AI training data. More listings = more AI citations.', 'Consistent NAP data — if your name, address, and phone differ across sites, AI models lose confidence and recommend competitors instead.', 'Faster reply rate — businesses that respond to reviews signal active engagement, which AI models factor into recommendations.'].map((tip, i) => (
            <div key={i} style={{ background: '#f8f7f4', borderRadius: 10, padding: '10px 13px', marginBottom: 8 }}>
              <div style={{ fontSize: '.78rem', color: '#7a7670', lineHeight: 1.55 }}>{tip}</div>
            </div>
          ))}
        </Card>
        </div>
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
  const [allQueries, setAllQueries] = useState([]);
  const [error, setError]         = useState('');

  const MAX = 32;

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
      setAllQueries([
        'What are the best restaurants in Sacramento?',
        'Recommend a good restaurant near Sacramento',
        'Who is the top-rated restaurant in Sacramento?',
        "Tell me about Bella's Kitchen in Sacramento",
        "What do customers say about Bella's Kitchen?",
        "Is Bella's Kitchen in Sacramento good?",
        'What is the best restaurant in Sacramento and why?',
        'Compare restaurants in Sacramento',
        'Best pasta restaurant in Sacramento',
        'Italian catering Sacramento',
        'Family restaurant midtown Sacramento',
      ]);
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>

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
                  placeholder={remaining > 0 ? 'Add a query… (press Enter)' : 'Maximum 32 queries reached'}
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
      // Scan writes the report before responding, so use the response directly
      const res = await axios.post(`${API}/llm/scan`, {}, { headers: authHeaders() });
      if (res.data.report) {
        setReport(res.data.report);
        setLastScanned(res.data.report?.run?.completed_at);
      } else {
        await loadReport();
      }
    } catch (e) {
      console.error('Scan failed:', e.response?.data?.error || e.message);
    } finally {
      setScanning(false);
    }
  }

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
            <span style={{ fontSize: '.82rem', color: '#7a7670', fontWeight: 600 }}>↻ Scanning…</span>
          ) : report?.nextScanAt && new Date(report.nextScanAt) > new Date() ? (
            <div style={{ background: '#f8f7f4', border: '1px solid #e4e0d8', borderRadius: 8, padding: '6px 14px', textAlign: 'right' }}>
              <div style={{ fontSize: '.7rem', color: '#7a7670', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700 }}>Next scan</div>
              <div style={{ fontSize: '.82rem', fontWeight: 600, color: '#0a0a0a', marginTop: 2 }}>
                {new Date(report.nextScanAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                {' · '}
                {new Date(report.nextScanAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </div>
            </div>
          ) : !report?.lastScanAt ? (
            <button onClick={triggerScan} disabled={scanning} style={{ background: '#f5c842', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', fontSize: '.82rem' }}>
              ↻ Run my first scan
            </button>
          ) : (
            <div style={{ background: '#f8f7f4', border: '1px solid #e4e0d8', borderRadius: 8, padding: '6px 14px' }}>
              <div style={{ fontSize: '.7rem', color: '#7a7670', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700 }}>Scan frequency</div>
              <div style={{ fontSize: '.82rem', color: '#0a0a0a', fontWeight: 600, marginTop: 2 }}>Weekly</div>
            </div>
          )}
        </div>
      </div>

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
