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

const label = { display: 'block', fontSize: '.72rem', fontWeight: 700, color: '#7a7670', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 };
const input = { width: '100%', padding: '10px 13px', border: '1.5px solid #e4e0d8', borderRadius: 9, fontSize: '.9rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', color: '#1a1a18' };

export default function SurveyBuilder() {
  const [tpl, setTpl] = useState(null);
  const [cfg, setCfg] = useState(blankConfig());
  const [name, setName] = useState('Post-visit feedback');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setErr('');
    try {
      const r = await axios.get(`${API}/survey-templates`, { headers: authHeaders() });
      const t = (r.data.templates || [])[0];
      if (t) {
        setTpl(t);
        setName(t.name || 'Survey');
        const base = blankConfig();
        const c = t.config || {};
        setCfg({
          ...base, ...c,
          classifier: { ...base.classifier, ...(c.classifier || {}), thresholds: { ...base.classifier.thresholds, ...((c.classifier || {}).thresholds || {}) } },
          paths: { promoter: (c.paths || {}).promoter || [], passive: (c.paths || {}).passive || [], detractor: (c.paths || {}).detractor || [] },
          messages: { ...base.messages, ...(c.messages || {}) },
          brand: { ...base.brand, ...(c.brand || {}) },
        });
      }
    } catch (e) {
      setErr('Could not load your survey. ' + (e.response?.data?.error || e.message));
    }
    setLoading(false);
  }

  async function save() {
    setSaving(true); setErr('');
    try {
      if (tpl && tpl.id) {
        const r = await axios.put(`${API}/survey-templates/${tpl.id}`, { name, config: cfg }, { headers: authHeaders() });
        setTpl(r.data.template);
      } else {
        const r = await axios.post(`${API}/survey-templates`, { name, config: cfg, scope: 'account', isDefault: true }, { headers: authHeaders() });
        setTpl(r.data.template);
      }
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setErr(e.response?.data?.error || e.message || 'Save failed');
    }
    setSaving(false);
  }

  const scaleMax = (SCALE_OPTIONS.find((o) => o.type === (cfg.classifier.type === 'nps' ? 'nps' : cfg.classifier.type)) || SCALE_OPTIONS[0]).max;
  const th = cfg.classifier.thresholds;

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

  const SaveBtn = (
    <Button variant="gold" onClick={save} disabled={saving}>
      {saving ? 'Saving…' : saved ? 'Saved \u2713' : 'Save survey'}
    </Button>
  );

  return (
    <DashboardLayout>
      <PageHeader
        title="Surveys"
        subtitle="Build the feedback survey your customers see. Every customer is invited to leave a public review — the questions below are how you listen."
        action={SaveBtn}
      />

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '8px 0 60px' }}>
        {loading ? (
          <Card style={{ textAlign: 'center', color: '#7a7670', padding: 48 }}>Loading your survey…</Card>
        ) : (
          <>
            {err && <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#c0392b', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: '.85rem', fontWeight: 600 }}>{err}</div>}

            {/* Name */}
            <Card style={{ marginBottom: 16 }}>
              <label style={label}>Survey name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} style={input} placeholder="e.g. Post-visit feedback" />
              <p style={{ fontSize: '.75rem', color: '#a8a39a', margin: '8px 0 0' }}>Just for you — customers never see this.</p>
            </Card>

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
