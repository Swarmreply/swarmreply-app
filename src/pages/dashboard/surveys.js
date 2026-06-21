// ============================================
// pages/dashboard/surveys.js
// Modular survey builder — assemble a feedback survey from blocks.
// Writes to the survey_templates table (decoupled from review requests).
// The customer-facing /review/[token] renderer reads whatever is saved here.
// ============================================

import { useState, useEffect } from 'react';
import axios from 'axios';
import DashboardLayout from '../../components/DashboardLayout';
import { PageHeader, Card, Button, SectionLabel } from '../../components/ui';

const API = process.env.NEXT_PUBLIC_API_URL;
function authHeaders() {
  const t = typeof window !== 'undefined' ? localStorage.getItem('swarmreply_token') : '';
  return t ? { Authorization: `Bearer ${t}` } : {};
}

const BLOCK_TYPES = [
  { type: 'open_text', label: 'Open text', icon: '\u270D', hint: 'A free-text answer' },
  { type: 'multiple_choice', label: 'Multiple choice', icon: '\u2630', hint: 'Pick from options' },
  { type: 'yes_no', label: 'Yes / No', icon: '\u25D0', hint: 'A simple yes or no' },
  { type: 'rating', label: 'Rating 1\u20135', icon: '\u25D4', hint: '1 to 5 scale' },
  { type: 'star', label: 'Star rating', icon: '\u2605', hint: '1 to 5 stars' },
  { type: 'smiley', label: 'Smiley scale', icon: '\u263A', hint: '5 faces' },
];
const SCALE_OPTIONS = [
  { type: 'nps', label: 'NPS (0\u201310)', max: 10 },
  { type: 'star', label: 'Stars (1\u20135)', max: 5 },
  { type: 'smiley', label: 'Smileys (1\u20135)', max: 5 },
];
const PATHS = [
  { key: 'promoter', label: 'Promoters', desc: 'Your happiest customers', tone: '#1a6b45', bg: '#dcfce7', bd: '#bbf7d0' },
  { key: 'passive', label: 'Passives', desc: 'Satisfied, not wowed', tone: '#92690a', bg: '#fef9c3', bd: '#fde68a' },
  { key: 'detractor', label: 'Detractors', desc: 'Unhappy customers', tone: '#c0392b', bg: '#fee2e2', bd: '#fca5a5' },
];

let _bid = 0;
const newBlockId = () => 'b' + Date.now() + '_' + (_bid++);

function blankConfig() {
  return {
    type: 'nps',
    classifier: {
      type: 'nps', scale: '0-10',
      question: 'How likely are you to recommend us to a friend or family member?',
      lowLabel: 'Not likely', highLabel: 'Extremely likely',
      thresholds: { promoter: 9, detractor: 6 },
    },
    paths: { promoter: [], passive: [], detractor: [] },
    messages: { promoter: '', detractorOpening: "We're sorry your experience didn't meet expectations." },
    brand: { color: '#f5c842' },
  };
}

function blankCustomConfig() {
  return {
    type: 'custom',
    questions: [],
    reviewInvite: true,
    messages: { intro: '', thankYou: 'Thanks for your feedback!' },
    brand: { color: '#f5c842' },
  };
}

const label = { display: 'block', fontSize: '.72rem', fontWeight: 700, color: '#7a7670', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 };
const input = { width: '100%', padding: '10px 13px', border: '1.5px solid #e4e0d8', borderRadius: 9, fontSize: '.9rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', color: '#1a1a18' };

function mergeConfig(c0) {
  const c = c0 || {};
  if ((c.type || 'nps') === 'custom') {
    const base = blankCustomConfig();
    return {
      ...base, ...c, type: 'custom',
      questions: Array.isArray(c.questions) ? c.questions : [],
      reviewInvite: c.reviewInvite !== false,
      messages: { ...base.messages, ...(c.messages || {}) },
      brand: { ...base.brand, ...(c.brand || {}) },
    };
  }
  const base = blankConfig();
  return {
    ...base, ...c,
    type: 'nps',
    classifier: { ...base.classifier, ...(c.classifier || {}), thresholds: { ...base.classifier.thresholds, ...((c.classifier || {}).thresholds || {}) } },
    paths: { promoter: (c.paths || {}).promoter || [], passive: (c.paths || {}).passive || [], detractor: (c.paths || {}).detractor || [] },
    messages: { ...base.messages, ...(c.messages || {}) },
    brand: { ...base.brand, ...(c.brand || {}) },
  };
}

export default function SurveysPage() {
  const [view, setView] = useState('list');
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [flash, setFlash] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => { loadList(); }, []);
  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(''), 3500); return () => clearTimeout(t); }, [flash]);
  async function loadList() {
    setLoading(true); setErr('');
    try {
      const r = await axios.get(`${API}/survey-templates`, { headers: authHeaders() });
      setTemplates(r.data.templates || []);
    } catch (e) { setErr('Could not load your surveys. ' + (e.response?.data?.error || e.message)); }
    setLoading(false);
  }

  function openEdit(t) { setSelected(t); setView('edit'); }
  function createNew() { setView('pick'); }
  function create(type) {
    const config = type === 'custom' ? blankCustomConfig() : { ...blankConfig(), type: 'nps' };
    setSelected({ id: null, name: type === 'custom' ? 'Untitled survey' : 'Post-visit feedback', config, is_default: templates.length === 0 && type !== 'custom' });
    setView('edit');
  }
  async function remove(t) {
    if (!t.id || !window.confirm(`Delete "${t.name}"? This cannot be undone.`)) return;
    try { await axios.delete(`${API}/survey-templates/${t.id}`, { headers: authHeaders() }); loadList(); }
    catch (e) { alert('Could not delete: ' + (e.response?.data?.error || e.message)); }
  }

  if (view === 'edit') {
    return <Editor template={selected} onBack={(savedName) => { setView('list'); loadList(); if (savedName) setFlash(`"${savedName}" saved`); }} />;
  }

  if (view === 'pick') {
    return (
      <DashboardLayout>
        <PageHeader title="New survey" subtitle="Pick a starting point — you can change the questions either way." action={<Button variant="ghost" onClick={() => setView('list')}>{'\u2190'} All surveys</Button>} />
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '8px 0 60px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <TypeCard title="NPS survey" tone="#1a6b45" bg="#dcfce7" desc="A scored 0–10 question that sorts customers into Promoters, Passives, and Detractors, each with its own follow-up. Best for measuring loyalty." foot="Scoring question · branching follow-ups" onClick={() => create('nps')} />
          <TypeCard title="Custom survey" tone="#6d28d9" bg="#ede9fe" desc="Build from scratch — a simple ordered list of questions, no score required. Best for feedback forms, intake, or anything you design." foot="Linear questions · no branching" onClick={() => create('custom')} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Surveys"
        subtitle="Build and manage the feedback surveys your customers see. Every customer is invited to leave a public review — your questions are how you listen."
        action={<Button variant="gold" onClick={createNew}>New survey</Button>}
      />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '8px 0 60px' }}>
        {flash && <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', borderRadius: 12, padding: '11px 16px', marginBottom: 16, fontSize: '.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><span>{'\u2713'}</span>{flash}</div>}
        {err && <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#c0392b', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: '.85rem', fontWeight: 600 }}>{err}</div>}
        {loading ? (
          <Card style={{ textAlign: 'center', color: '#7a7670', padding: 48 }}>Loading your surveys…</Card>
        ) : templates.length === 0 ? (
          <Card style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: '2rem', marginBottom: 10 }}>📝</div>
            <div style={{ fontWeight: 700, color: '#1a1a18', marginBottom: 6 }}>No surveys yet</div>
            <p style={{ fontSize: '.85rem', color: '#7a7670', margin: '0 0 16px' }}>Create your first survey to start collecting feedback.</p>
            <Button variant="gold" onClick={createNew}>New survey</Button>
          </Card>
        ) : (() => {
          const ql = q.trim().toLowerCase();
          const filtered = ql ? templates.filter((t) => (t.name || '').toLowerCase().includes(ql)) : templates;
          return (
            <>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search surveys by name…" style={{ ...input, marginBottom: 14 }} />
              {filtered.length === 0 ? (
                <Card style={{ textAlign: 'center', color: '#7a7670', padding: 32, fontSize: '.88rem' }}>No surveys match {'\u201C'}{q}{'\u201D'}.</Card>
              ) : (
                <div style={{ maxHeight: '62vh', overflowY: 'auto', paddingRight: 2 }}>
                  {filtered.map((t) => <SurveyRow key={t.id} t={t} onEdit={() => openEdit(t)} onDelete={() => remove(t)} />)}
                </div>
              )}
            </>
          );
        })()}
      </div>
    </DashboardLayout>
  );
}

function SurveyRow({ t, onEdit, onDelete }) {
  const type = (t.config && t.config.type) || 'nps';
  const isCustom = type === 'custom';
  const tc = isCustom ? { bg: '#ede9fe', fg: '#6d28d9' } : { bg: '#dcfce7', fg: '#1a6b45' };
  return (
    <Card style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, color: '#1a1a18', fontSize: '.98rem' }}>{t.name || 'Untitled survey'}</span>
          <span style={{ fontSize: '.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: tc.fg, background: tc.bg, borderRadius: 50, padding: '2px 8px' }}>{isCustom ? 'Custom' : 'NPS'}</span>
          {t.is_default && <span style={{ fontSize: '.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: '#92690a', background: '#fef9c3', borderRadius: 50, padding: '2px 8px' }}>Default</span>}
        </div>
        <div style={{ fontSize: '.76rem', color: '#a8a39a', marginTop: 3 }}>
          {isCustom ? 'Standalone survey' : 'Scored · Promoter / Passive / Detractor'}{t.is_default ? ' · sent with review requests' : ''}
        </div>
      </div>
      <Button variant="ghost" onClick={onEdit}>Edit</Button>
      {!t.is_default && <button onClick={onDelete} title="Delete survey" style={{ width: 34, height: 34, borderRadius: 8, border: '1.5px solid #f0d0d0', background: 'white', color: '#c0392b', cursor: 'pointer', fontSize: '1rem', fontWeight: 700, fontFamily: 'inherit' }}>{'\u00D7'}</button>}
    </Card>
  );
}

function TypeCard({ title, desc, foot, tone, bg, onClick }) {
  return (
    <button onClick={onClick} style={{ textAlign: 'left', background: 'white', border: '1.5px solid #e4e0d8', borderRadius: 16, padding: 22, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', gap: 10, transition: 'border-color .15s' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = tone; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e4e0d8'; }}>
      <span style={{ alignSelf: 'flex-start', fontSize: '.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: tone, background: bg, borderRadius: 50, padding: '3px 10px' }}>{title}</span>
      <p style={{ fontSize: '.86rem', color: '#4a4a48', margin: 0, lineHeight: 1.6 }}>{desc}</p>
      <span style={{ fontSize: '.74rem', color: '#a8a39a', marginTop: 'auto' }}>{foot}</span>
    </button>
  );
}

function Toggle({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} aria-pressed={on} style={{ width: 46, height: 27, borderRadius: 50, border: 'none', cursor: 'pointer', background: on ? '#1a6b45' : '#d4cfc5', position: 'relative', flexShrink: 0, transition: 'background .15s', padding: 0 }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 22 : 3, width: 21, height: 21, borderRadius: '50%', background: 'white', transition: 'left .15s', boxShadow: '0 1px 2px rgba(0,0,0,.2)' }} />
    </button>
  );
}

function Editor({ template, onBack }) {
  const [tpl, setTpl] = useState(template && template.id ? template : null);
  const [cfg, setCfg] = useState(() => mergeConfig(template && template.config));
  const [name, setName] = useState((template && template.name) || 'Untitled survey');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function save() {
    setSaving(true); setErr('');
    try {
      if (tpl && tpl.id) {
        await axios.put(`${API}/survey-templates/${tpl.id}`, { name, config: cfg }, { headers: authHeaders() });
      } else {
        await axios.post(`${API}/survey-templates`, { name, config: cfg, scope: 'account', isDefault: !!(template && template.is_default) }, { headers: authHeaders() });
      }
      onBack(name); // saved — return to the list, which shows a confirmation
      return;
    } catch (e) {
      setErr(e.response?.data?.error || e.message || 'Save failed');
    }
    setSaving(false);
  }

  const clsType = (cfg.classifier && cfg.classifier.type) || 'nps';
  const scaleMax = (SCALE_OPTIONS.find((o) => o.type === clsType) || SCALE_OPTIONS[0]).max;
  const th = (cfg.classifier && cfg.classifier.thresholds) || {};

  function setScale(type) {
    const isNps = type === 'nps';
    setCfg((c) => ({ ...c, classifier: { ...c.classifier, type, scale: isNps ? '0-10' : '1-5', thresholds: { promoter: isNps ? 9 : 5, detractor: isNps ? 6 : 2 } } }));
  }
  function setThreshold(which, val) {
    setCfg((c) => {
      const t = { ...c.classifier.thresholds, [which]: val };
      if (t.detractor >= t.promoter) { if (which === 'detractor') t.promoter = Math.min(scaleMax, val + 1); else t.detractor = Math.max(0, val - 1); }
      return { ...c, classifier: { ...c.classifier, thresholds: t } };
    });
  }
  function updateClassifier(patch) { setCfg((c) => ({ ...c, classifier: { ...c.classifier, ...patch } })); }
  function updateMessage(k, v) { setCfg((c) => ({ ...c, messages: { ...c.messages, [k]: v } })); }
  function addBlock(pk, type) {
    setCfg((c) => ({ ...c, paths: { ...c.paths, [pk]: [...(c.paths[pk] || []), { blockId: newBlockId(), type, question: '', ...(type === 'multiple_choice' ? { options: ['', ''] } : {}) }] } }));
  }
  function updateBlock(pk, i, patch) {
    setCfg((c) => { const a = [...(c.paths[pk] || [])]; a[i] = { ...a[i], ...patch }; return { ...c, paths: { ...c.paths, [pk]: a } }; });
  }
  function removeBlock(pk, i) {
    setCfg((c) => { const a = [...(c.paths[pk] || [])]; a.splice(i, 1); return { ...c, paths: { ...c.paths, [pk]: a } }; });
  }
  function moveBlock(pk, i, dir) {
    setCfg((c) => { const a = [...(c.paths[pk] || [])]; const j = i + dir; if (j < 0 || j >= a.length) return c; const t = a[i]; a[i] = a[j]; a[j] = t; return { ...c, paths: { ...c.paths, [pk]: a } }; });
  }
  function addQuestion(type) {
    setCfg((c) => ({ ...c, questions: [...(c.questions || []), { blockId: newBlockId(), type, question: '', ...(type === 'multiple_choice' ? { options: ['', ''] } : {}) }] }));
  }
  function updateQuestion(i, patch) {
    setCfg((c) => { const a = [...(c.questions || [])]; a[i] = { ...a[i], ...patch }; return { ...c, questions: a }; });
  }
  function removeQuestion(i) {
    setCfg((c) => { const a = [...(c.questions || [])]; a.splice(i, 1); return { ...c, questions: a }; });
  }
  function moveQuestion(i, dir) {
    setCfg((c) => { const a = [...(c.questions || [])]; const j = i + dir; if (j < 0 || j >= a.length) return c; const t = a[i]; a[i] = a[j]; a[j] = t; return { ...c, questions: a }; });
  }
  function setReviewInvite(v) { setCfg((c) => ({ ...c, reviewInvite: v })); }

  const SaveBtn = (
    <Button variant="gold" onClick={save} disabled={saving}>
      {saving ? 'Saving…' : 'Save survey'}
    </Button>
  );

  return (
    <DashboardLayout>
      <PageHeader
        title="Edit survey"
        subtitle="Build the feedback survey your customers see. Every customer is invited to leave a public review — the questions below are how you listen."
        action={<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Button variant="ghost" onClick={onBack}>{'\u2190'} All surveys</Button>{SaveBtn}</div>}
      />

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '8px 0 60px' }}>
        {(
          <>
            {err && <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#c0392b', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: '.85rem', fontWeight: 600 }}>{err}</div>}

            {/* Name */}
            <Card style={{ marginBottom: 16 }}>
              <label style={label}>Survey name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} style={input} placeholder="e.g. Post-visit feedback" />
              <p style={{ fontSize: '.75rem', color: '#a8a39a', margin: '8px 0 0' }}>Just for you — customers never see this.</p>
            </Card>

            {cfg.type !== 'custom' && (<>
            {/* Scoring question */}
            <Card style={{ marginBottom: 16 }}>
              <SectionLabel>The scoring question</SectionLabel>
              <p style={{ fontSize: '.82rem', color: '#7a7670', margin: '4px 0 16px', lineHeight: 1.55 }}>
                Everyone answers this first. Their score decides which follow-up questions they see.
              </p>

              <label style={label}>Scale</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
                {SCALE_OPTIONS.map((o) => {
                  const on = (cfg.classifier.type === 'nps' ? 'nps' : cfg.classifier.type) === o.type;
                  return (
                    <button key={o.type} onClick={() => setScale(o.type)} style={{ padding: '9px 16px', borderRadius: 50, border: '1.5px solid', borderColor: on ? '#f5c842' : '#e4e0d8', background: on ? '#fffbe9' : 'white', fontWeight: 700, fontSize: '.82rem', color: on ? '#7a5a06' : '#7a7670', cursor: 'pointer', fontFamily: 'inherit' }}>{o.label}</button>
                  );
                })}
              </div>

              <label style={label}>Question</label>
              <input value={cfg.classifier.question} onChange={(e) => updateClassifier({ question: e.target.value })} style={input} />

              {/* Threshold band */}
              <div style={{ marginTop: 22 }}>
                <label style={label}>Who counts as a promoter, passive, or detractor</label>
                <div style={{ display: 'flex', height: 38, borderRadius: 10, overflow: 'hidden', border: '1px solid #e4e0d8', marginBottom: 14 }}>
                  <Band tone="#c0392b" bg="#fee2e2" text={`Detractor 0\u2013${th.detractor}`} flex={th.detractor + 1} />
                  {th.promoter - th.detractor > 1 && <Band tone="#92690a" bg="#fef9c3" text={`Passive ${th.detractor + 1}\u2013${th.promoter - 1}`} flex={th.promoter - th.detractor - 1} />}
                  <Band tone="#1a6b45" bg="#dcfce7" text={`Promoter ${th.promoter}\u2013${scaleMax}`} flex={scaleMax - th.promoter + 1} />
                </div>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  <Stepper title="Detractor is at or below" value={th.detractor} min={0} max={th.promoter - 1} onChange={(v) => setThreshold('detractor', v)} />
                  <Stepper title="Promoter is at or above" value={th.promoter} min={th.detractor + 1} max={scaleMax} onChange={(v) => setThreshold('promoter', v)} />
                </div>
              </div>
            </Card>

            {/* Paths */}
            {PATHS.map((p) => (
              <PathEditor
                key={p.key}
                path={p}
                blocks={cfg.paths[p.key] || []}
                message={p.key === 'detractor' ? cfg.messages.detractorOpening : (p.key === 'promoter' ? cfg.messages.promoter : '')}
                onMessage={(v) => updateMessage(p.key === 'detractor' ? 'detractorOpening' : 'promoter', v)}
                showMessage={p.key !== 'passive'}
                onAdd={(type) => addBlock(p.key, type)}
                onUpdate={(i, patch) => updateBlock(p.key, i, patch)}
                onRemove={(i) => removeBlock(p.key, i)}
                onMove={(i, dir) => moveBlock(p.key, i, dir)}
              />
            ))}
            </>)}

            {cfg.type === 'custom' && (<>
              <Card style={{ marginBottom: 16 }}>
                <SectionLabel>Opening message</SectionLabel>
                <p style={{ fontSize: '.82rem', color: '#7a7670', margin: '4px 0 12px', lineHeight: 1.55 }}>An optional welcome shown before the first question.</p>
                <input value={cfg.messages.intro || ''} onChange={(e) => updateMessage('intro', e.target.value)} style={input} placeholder="e.g. We'd love your feedback — it only takes a minute." />
              </Card>

              <PathEditor
                path={{ key: 'questions', label: 'Questions', desc: 'Asked in order, to everyone', tone: '#6d28d9', bg: '#ede9fe', bd: '#ddd6fe' }}
                blocks={cfg.questions || []}
                showMessage={false}
                onAdd={(type) => addQuestion(type)}
                onUpdate={(i, patch) => updateQuestion(i, patch)}
                onRemove={(i) => removeQuestion(i)}
                onMove={(i, dir) => moveQuestion(i, dir)}
              />

              <Card style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <SectionLabel>Invite a public review at the end</SectionLabel>
                  <p style={{ fontSize: '.82rem', color: '#7a7670', margin: '4px 0 0', lineHeight: 1.55 }}>
                    When on, everyone who finishes sees a neutral invitation to leave a public review — shown to every respondent, never gated on answers. Turn off for purely internal feedback.
                  </p>
                </div>
                <Toggle on={cfg.reviewInvite !== false} onChange={setReviewInvite} />
              </Card>
            </>)}

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8 }}>
              {SaveBtn}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function Band({ tone, bg, text, flex }) {
  return <div style={{ flex: Math.max(0.5, flex), background: bg, color: tone, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.68rem', fontWeight: 700, padding: '0 4px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden' }}>{text}</div>;
}

function Stepper({ title, value, min, max, onChange }) {
  const btn = { width: 32, height: 32, borderRadius: 8, border: '1.5px solid #e4e0d8', background: 'white', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 700, color: '#7a7670', lineHeight: 1, fontFamily: 'inherit' };
  return (
    <div>
      <div style={{ fontSize: '.72rem', color: '#7a7670', fontWeight: 600, marginBottom: 6 }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button style={btn} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>{'\u2212'}</button>
        <span style={{ minWidth: 26, textAlign: 'center', fontWeight: 800, fontSize: '1.05rem', color: '#1a1a18' }}>{value}</span>
        <button style={btn} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>+</button>
      </div>
    </div>
  );
}

function PathEditor({ path, blocks, message, onMessage, showMessage, onAdd, onUpdate, onRemove, onMove }) {
  const [adding, setAdding] = useState(false);
  return (
    <Card style={{ marginBottom: 16, borderColor: path.bd }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: '.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: path.tone, background: path.bg, border: `1px solid ${path.bd}`, borderRadius: 50, padding: '4px 11px' }}>{path.label}</span>
        <span style={{ fontSize: '.8rem', color: '#a8a39a' }}>{path.desc}</span>
      </div>

      {showMessage && (
        <div style={{ marginBottom: 14 }}>
          <label style={label}>Opening message (optional)</label>
          <input value={message || ''} onChange={(e) => onMessage(e.target.value)} style={input} placeholder={path.key === 'detractor' ? "We're sorry your experience didn't meet expectations." : 'Thanks so much!'} />
        </div>
      )}

      {blocks.length === 0 ? (
        <p style={{ fontSize: '.82rem', color: '#a8a39a', margin: '0 0 12px', fontStyle: 'italic' }}>No follow-up questions — this group goes straight to the public review invite.</p>
      ) : (
        blocks.map((b, i) => (
          <BlockCard key={b.blockId || i} block={b} idx={i} total={blocks.length}
            onUpdate={(patch) => onUpdate(i, patch)} onRemove={() => onRemove(i)} onMove={(dir) => onMove(i, dir)} />
        ))
      )}

      {adding ? (
        <div style={{ border: '1.5px dashed #e4e0d8', borderRadius: 12, padding: 12, marginTop: 6 }}>
          <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#7a7670', marginBottom: 10 }}>Choose a question type</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 8 }}>
            {BLOCK_TYPES.map((t) => (
              <button key={t.type} onClick={() => { onAdd(t.type); setAdding(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e4e0d8', background: 'white', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                <span style={{ fontSize: '1.1rem' }}>{t.icon}</span>
                <span><span style={{ display: 'block', fontWeight: 700, fontSize: '.82rem', color: '#1a1a18' }}>{t.label}</span><span style={{ fontSize: '.7rem', color: '#a8a39a' }}>{t.hint}</span></span>
              </button>
            ))}
          </div>
          <button onClick={() => setAdding(false)} style={{ marginTop: 10, background: 'none', border: 'none', color: '#a8a39a', fontSize: '.78rem', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{ width: '100%', padding: 11, borderRadius: 10, border: '1.5px dashed #d8d4cc', background: 'transparent', color: '#7a7670', fontWeight: 700, fontSize: '.82rem', cursor: 'pointer', fontFamily: 'inherit', marginTop: 6 }}>+ Add a question</button>
      )}
    </Card>
  );
}

function BlockCard({ block, idx, total, onUpdate, onRemove, onMove }) {
  const meta = BLOCK_TYPES.find((t) => t.type === block.type) || { label: block.type, icon: '\u2022' };
  const isMC = block.type === 'multiple_choice';
  function setOpt(i, v) { const o = [...(block.options || [])]; o[i] = v; onUpdate({ options: o }); }
  function addOpt() { onUpdate({ options: [...(block.options || []), ''] }); }
  function rmOpt(i) { const o = [...(block.options || [])]; o.splice(i, 1); onUpdate({ options: o }); }
  const mini = { width: 26, height: 26, borderRadius: 7, border: '1.5px solid #e4e0d8', background: 'white', cursor: 'pointer', color: '#a8a39a', fontSize: '.85rem', lineHeight: 1, fontFamily: 'inherit' };

  return (
    <div style={{ border: '1px solid #ece9e3', borderRadius: 12, padding: 14, marginBottom: 10, background: '#fcfbf9' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: '.95rem' }}>{meta.icon}</span>
        <span style={{ fontSize: '.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: '#7a7670' }}>{meta.label}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
          <button style={mini} onClick={() => onMove(-1)} disabled={idx === 0} title="Move up">{'\u2191'}</button>
          <button style={mini} onClick={() => onMove(1)} disabled={idx === total - 1} title="Move down">{'\u2193'}</button>
          <button style={{ ...mini, color: '#c0392b' }} onClick={onRemove} title="Remove">{'\u00D7'}</button>
        </div>
      </div>
      <input value={block.question || ''} onChange={(e) => onUpdate({ question: e.target.value })} style={input} placeholder="Type your question…" />
      {isMC && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: '.7rem', fontWeight: 700, color: '#a8a39a', marginBottom: 6 }}>Options</div>
          {(block.options || []).map((o, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input value={o} onChange={(e) => setOpt(i, e.target.value)} style={{ ...input, padding: '7px 11px' }} placeholder={`Option ${i + 1}`} />
              <button style={mini} onClick={() => rmOpt(i)} disabled={(block.options || []).length <= 1}>{'\u00D7'}</button>
            </div>
          ))}
          <button onClick={addOpt} style={{ background: 'none', border: 'none', color: '#7a5a06', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>+ Add option</button>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8, fontSize: '.78rem', color: '#7a7670', cursor: 'pointer' }}>
            <input type="checkbox" checked={!!block.multiple} onChange={(e) => onUpdate({ multiple: e.target.checked })} /> Allow multiple selections
          </label>
        </div>
      )}
    </div>
  );
}
