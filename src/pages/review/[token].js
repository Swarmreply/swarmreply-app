import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;
const SMILEYS = ['\uD83D\uDE1E', '\uD83D\uDE15', '\uD83D\uDE10', '\uD83D\uDE42', '\uD83D\uDE04'];

// Preview/demo survey so /review/preview renders without a real token.
const DEMO_SURVEY = {
  classifier: {
    type: 'nps', scale: '0-10',
    question: 'How likely are you to recommend us to a friend or family member?',
    lowLabel: 'Not likely', highLabel: 'Extremely likely',
    thresholds: { promoter: 9, detractor: 6 },
  },
  paths: {
    promoter: [],
    passive: [{ blockId: 'p1', type: 'open_text', question: "What would've made it a perfect experience?" }],
    detractor: [
      { blockId: 'd1', type: 'open_text', question: 'What fell short?' },
      { blockId: 'd2', type: 'open_text', question: 'What could we do better?' },
    ],
  },
  messages: {
    promoter: "We're so glad you had a great experience!",
    detractorOpening: "We're sorry your experience didn't meet expectations.",
  },
  brand: { color: '#f5c842', logo: 'https://swarmreply.com/bee-logo.png', logoPosition: 'left' },
};

const DEMO = {
  businessName: 'SwarmReply Demo',
  brandColor: '#f5c842',
  brandLogo: 'https://swarmreply.com/bee-logo.png',
  logoPosition: 'left',
  platforms: [{ id: 'google', name: 'Google', color: '#4285F4', icon: 'G', url: '#' }],
  survey: DEMO_SURVEY,
};

function classify(score, thresholds) {
  const t = thresholds || { promoter: 9, detractor: 6 };
  if (score >= t.promoter) return 'promoter';
  if (score <= t.detractor) return 'detractor';
  return 'passive';
}

const card = { background: 'white', borderRadius: 16, padding: '32px 28px', boxShadow: '0 4px 24px rgba(0,0,0,.08)', maxWidth: 520, width: '100%', margin: '0 auto' };

// 5d-1/5d-2: conditional display. A question's condition is satisfied when its
// rule(s) match earlier answers. Choice sources match selected value(s) (is /
// is_not); rating/scale sources compare the number (≤ ≥ = < >). Multiple rules
// combine with all (AND) / any (OR). No condition / no rules → always shown.
function ruleMet(rule, answers) {
  if (!rule || !rule.blockId) return true;
  const a = (answers || []).find((x) => x && x.blockId === rule.blockId);
  if (['lte', 'gte', 'lt', 'gt', 'eq'].includes(rule.op)) {
    const n = a && a.number != null ? Number(a.number) : null;
    const v = Number(rule.value);
    if (n == null || isNaN(n) || isNaN(v)) return false;
    if (rule.op === 'lte') return n <= v;
    if (rule.op === 'gte') return n >= v;
    if (rule.op === 'lt') return n < v;
    if (rule.op === 'gt') return n > v;
    return n === v; // eq
  }
  if (!(rule.values || []).length) return true;
  const answered = a ? ((a.options && a.options.length) ? a.options : (a.text != null && a.text !== '' ? [String(a.text)] : [])) : [];
  const hit = answered.some((v) => rule.values.includes(v));
  return rule.op === 'is_not' ? !hit : hit;
}

function condMet(condition, answers) {
  if (!condition) return true;
  if (Array.isArray(condition.rules)) {
    const active = condition.rules.filter((r) => r && r.blockId);
    if (!active.length) return true;
    const results = active.map((r) => ruleMet(r, answers));
    return condition.match === 'any' ? results.some(Boolean) : results.every(Boolean);
  }
  if (!condition.blockId) return true; // legacy single condition (5d-1)
  return ruleMet(condition, answers);
}

export default function ReviewPage({ preview }) {
  const router = useRouter();
  const { token } = router.query;
  const [data, setData] = useState(DEMO);
  const [loading, setLoading] = useState(!preview);
  const [phase, setPhase] = useState('classifier'); // classifier | blocks | share | done
  const [blockIdx, setBlockIdx] = useState(0);
  const [score, setScore] = useState(null);
  const [classification, setClassification] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (preview || !token) { setLoading(false); return; }
    axios.get(API + '/review/' + token)
      .then((r) => { setData({ ...DEMO, ...r.data, survey: r.data.survey || DEMO.survey }); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const survey = data.survey || DEMO_SURVEY;
  const c = data.brandColor || (survey.brand && survey.brand.color) || '#f5c842';
  const isCustom = survey.type === 'custom';
  const blocks = isCustom ? (survey.questions || []) : ((survey.paths && survey.paths[classification]) || []);
  const fmt = (s) => (s || '').replace(/\{business\}/g, data.businessName || '');

  function pickScore(n) {
    setScore(n);
    const cls = classify(n, survey.classifier && survey.classifier.thresholds);
    setClassification(cls);
    const blocks = (survey.paths && survey.paths[cls]) || [];
    setTimeout(() => {
      let i = 0;
      while (i < blocks.length && !condMet(blocks[i].condition, [])) i++;
      if (i < blocks.length && blocks[i].type !== 'end') { setBlockIdx(i); setPhase('blocks'); }
      else goShare([], n, cls);
    }, 280);
  }

  function answerBlock(block, value) {
    const isDisplay = block.type === 'section';
    let next = answers;
    if (!isDisplay) {
      const ans = {
        blockId: block.blockId, type: block.type, question: block.question,
        text: value.text ?? null, number: value.number ?? null, options: value.options ?? null,
        ...(value.contact ? { contact: value.contact } : {}),
      };
      next = [...answers, ans];
      setAnswers(next);
    }
    const bl = isCustom ? (survey.questions || []) : ((survey.paths && survey.paths[classification]) || []);
    let nextIdx = blockIdx + 1;
    while (nextIdx < bl.length && !condMet(bl[nextIdx].condition, next)) nextIdx++;
    if (nextIdx < bl.length && bl[nextIdx].type !== 'end') setBlockIdx(nextIdx);
    else goShare(next, score, classification);
  }

  async function goShare(finalAnswers, finalScore, finalClass) {
    const showReview = !isCustom || survey.reviewInvite !== false;
    setPhase(showReview ? 'share' : 'done');
    if (preview || submitted || !token) return;
    setSubmitted(true);
    try {
      // Merge any contact-capture blocks into one write-back (last non-empty wins per field).
      const cap = {};
      (finalAnswers || []).forEach((a) => {
        if (a && a.contact) {
          if (a.contact.name) cap.name = a.contact.name;
          if (a.contact.email) cap.email = a.contact.email;
          if (a.contact.phone) cap.phone = a.contact.phone;
        }
      });
      await axios.post(API + '/review/' + token + '/submit', {
        score: finalScore, classification: finalClass, channel: 'email',
        templateId: survey.id || null,
        ...(Object.keys(cap).length ? { contact: cap } : {}),
        answers: (finalAnswers || []).map((a) => ({
          blockId: a.blockId, type: a.type, question: a.question,
          text: a.text, number: a.number, options: a.options,
        })),
      });
    } catch (e) { console.error('Survey submit failed:', e.message); }
  }

  // Custom surveys have no scoring step — start directly on the questions.
  useEffect(() => {
    if (survey.type === 'custom' && phase === 'classifier') {
      let i = 0;
      while (i < blocks.length && !condMet(blocks[i].condition, [])) i++;
      if (i < blocks.length && blocks[i].type !== 'end') { setBlockIdx(i); setPhase('blocks'); }
      else goShare([], null, null);
    }
  }, [survey.type]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f4f0' }}><span style={{ color: '#7a7670' }}>Loading…</span></div>;
  }

  const currentBlock = phase === 'blocks' ? blocks[blockIdx] : null;
  const justify = ({ left: 'flex-start', middle: 'center', right: 'flex-end' })[data.logoPosition] || 'center';

  return (
    <>
      <Head><title>Share your feedback</title><meta name="viewport" content="width=device-width,initial-scale=1" /></Head>
      <div style={{ minHeight: '100vh', background: '#f4f4f0', fontFamily: 'system-ui,-apple-system,sans-serif', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: c, padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: justify }}>
          {data.brandLogo ? <img src={data.brandLogo} alt={data.businessName} style={{ maxHeight: 48, maxWidth: 160, objectFit: 'contain' }} /> : <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0a0a0a' }}>{data.businessName}</span>}
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>

          {phase === 'classifier' && (
            <div style={card}>
              {preview && <PreviewBanner />}
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0a0a0a', marginBottom: 8, textAlign: 'center', lineHeight: 1.4 }}>{fmt(survey.classifier && survey.classifier.question)}</h2>
              <ScaleInput classifier={survey.classifier} color={c} onPick={pickScore} />
            </div>
          )}

          {phase === 'blocks' && currentBlock && (
            <div style={card}>
              {!isCustom && classification === 'detractor' && blockIdx === 0 && survey.messages && survey.messages.detractorOpening && (
                <p style={{ fontSize: '.875rem', color: '#4a4a48', marginBottom: 20, lineHeight: 1.65 }}>{fmt(survey.messages.detractorOpening)}</p>
              )}
              {isCustom && blockIdx === 0 && survey.messages && survey.messages.intro && (
                <p style={{ fontSize: '.875rem', color: '#4a4a48', marginBottom: 20, lineHeight: 1.65 }}>{fmt(survey.messages.intro)}</p>
              )}
              <BlockInput key={currentBlock.blockId || blockIdx} block={currentBlock} color={c} businessName={data.businessName} onAnswer={(v) => answerBlock(currentBlock, v)} />
            </div>
          )}

          {phase === 'share' && (
            <div style={card}>
              <div style={{ textAlign: 'center', fontSize: '2rem', marginBottom: 16 }}>{classification === 'promoter' ? '\uD83C\uDF1F' : '\uD83D\uDE4F'}</div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, textAlign: 'center', marginBottom: 12 }}>Thank you!</h2>
              <p style={{ fontSize: '.875rem', color: '#4a4a48', textAlign: 'center', lineHeight: 1.7, marginBottom: 28 }}>
                {isCustom
                  ? "Thanks for taking the time to share your feedback. If you have a moment, we'd love you to share your experience publicly too."
                  : classification === 'promoter'
                  ? (fmt(survey.messages && survey.messages.promoter) || "We're so glad you had a great experience!") + ' Would you mind sharing it publicly?'
                  : "We've shared your feedback with the team. You're also welcome to share your experience publicly."}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(data.platforms || []).map((p) => (
                  <a key={p.id} href={p.url || '#'} style={{ display: 'block', padding: '14px 20px', borderRadius: 50, background: p.color, color: 'white', textDecoration: 'none', fontWeight: 700, fontSize: '.9rem', textAlign: 'center' }}>{p.icon} Leave a review on {p.name}</a>
                ))}
              </div>
              <button onClick={() => setPhase('done')} style={{ width: '100%', marginTop: 12, padding: 10, background: 'none', border: 'none', cursor: 'pointer', fontSize: '.78rem', color: '#7a7670' }}>No thanks</button>
            </div>
          )}

          {phase === 'done' && (
            <div style={{ ...card, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>{'\uD83D\uDE4F'}</div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>Thank you for your feedback!</h2>
              <p style={{ fontSize: '.875rem', color: '#7a7670', lineHeight: 1.7 }}>Your response has been recorded. We appreciate you taking the time.</p>
            </div>
          )}

        </div>

        <div style={{ background: c, padding: '12px 24px', textAlign: 'center' }}>
          <span style={{ fontSize: '.68rem', color: '#0a0a0a', opacity: .6 }}>Powered by <a href="https://swarmreply.com" style={{ color: '#0a0a0a', opacity: .6, textDecoration: 'none' }}>SwarmReply</a></span>
        </div>
      </div>
    </>
  );
}

// ── Scale input: NPS 0-10, 1-5 rating, 5 stars, or 5 smileys ──────────────────
function ScaleInput({ classifier, color, onPick }) {
  const [sel, setSel] = useState(null);
  const type = (classifier && classifier.type) || 'nps';
  const scale = (classifier && classifier.scale) || '0-10';
  const pick = (n) => { setSel(n); onPick(n); };

  if (type === 'stars' || type === 'star' || scale === 'stars') {
    return (
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 10 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => pick(n)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '2.4rem', lineHeight: 1, padding: 2, transition: 'transform .1s', transform: sel === n ? 'scale(1.15)' : 'scale(1)', color: sel != null && n <= sel ? '#f5c842' : '#dcd8d0' }}>★</button>
        ))}
      </div>
    );
  }
  if (type === 'smiley' || scale === 'smiley') {
    return (
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 10 }}>
        {SMILEYS.map((e, i) => (
          <button key={i} onClick={() => pick(i + 1)} style={{ background: sel === i + 1 ? color : 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.9rem', borderRadius: 12, padding: '6px 8px', transition: 'all .12s', transform: sel === i + 1 ? 'scale(1.1)' : 'scale(1)' }}>{e}</button>
        ))}
      </div>
    );
  }
  if (type === 'rating' || scale === '1-5') {
    return (
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 10 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => pick(n)} style={{ width: 48, height: 48, borderRadius: 12, border: '1.5px solid', borderColor: sel === n ? color : '#e4e0d8', background: sel === n ? color : 'white', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', color: sel === n ? '#0a0a0a' : '#4a4a48', transition: 'all .12s' }}>{n}</button>
        ))}
      </div>
    );
  }
  // NPS 0-10
  const nums = [];
  for (let i = 0; i <= 10; i++) nums.push(i);
  return (
    <>
      <p style={{ fontSize: '.82rem', color: '#7a7670', textAlign: 'center', margin: '0 0 18px' }}>Tap a number below</p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 10 }}>
        {nums.map((n) => (
          <button key={n} onClick={() => pick(n)} style={{ width: 40, height: 40, borderRadius: 10, border: '1.5px solid', borderColor: sel === n ? color : '#e4e0d8', background: sel === n ? color : 'white', fontWeight: 700, fontSize: '.85rem', cursor: 'pointer', color: sel === n ? '#0a0a0a' : '#4a4a48', transition: 'all .12s' }}>{n}</button>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.72rem', color: '#7a7670' }}>
        <span>{(classifier && classifier.lowLabel) || 'Not likely'}</span>
        <span>{(classifier && classifier.highLabel) || 'Extremely likely'}</span>
      </div>
    </>
  );
}

// ── Block input: renders one survey block of any supported type ───────────────
function BlockInput({ block, color, businessName, onAnswer }) {
  const [text, setText] = useState('');
  const [opts, setOpts] = useState([]);
  const [date, setDate] = useState('');
  const [contact, setContact] = useState({});
  const q = (block.question || '').replace(/\{business\}/g, businessName || '');
  const type = block.type;
  const labelStyle = { display: 'block', fontSize: '1.05rem', fontWeight: 700, textAlign: 'center', marginBottom: 20, lineHeight: 1.5, color: '#0a0a0a' };

  if (type === 'open_text') {
    return (
      <div>
        <label style={labelStyle}>{q}</label>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e4e0d8', borderRadius: 10, fontSize: '.9rem', fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box', marginBottom: 16 }} placeholder="Type your answer…" />
        <ContinueBtn color={color} onClick={() => onAnswer({ text: text.trim() })} />
      </div>
    );
  }

  if (type === 'yes_no') {
    return (
      <div>
        <label style={labelStyle}>{q}</label>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => onAnswer({ text: 'Yes' })} style={choiceBtn('#dcfce7', '#bbf7d0', '#1a6b45')}>Yes</button>
          <button onClick={() => onAnswer({ text: 'No' })} style={choiceBtn('#fee2e2', '#fca5a5', '#c0392b')}>No</button>
        </div>
      </div>
    );
  }

  if (type === 'multiple_choice') {
    const options = block.options || [];
    if (block.multiple) {
      const toggle = (o) => setOpts(opts.includes(o) ? opts.filter((x) => x !== o) : [...opts, o]);
      return (
        <div>
          <label style={labelStyle}>{q}</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {options.map((o) => (
              <button key={o} onClick={() => toggle(o)} style={{ padding: '12px 16px', borderRadius: 10, border: '1.5px solid', borderColor: opts.includes(o) ? color : '#e4e0d8', background: opts.includes(o) ? '#fffbe9' : 'white', cursor: 'pointer', fontWeight: 600, fontSize: '.875rem', textAlign: 'left', fontFamily: 'inherit' }}>{opts.includes(o) ? '\u2713 ' : ''}{o}</button>
            ))}
          </div>
          <ContinueBtn color={color} onClick={() => onAnswer({ options: opts, text: opts.join(', ') })} />
        </div>
      );
    }
    return (
      <div>
        <label style={labelStyle}>{q}</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {options.map((o) => (
            <button key={o} onClick={() => onAnswer({ text: o, options: [o] })} style={{ padding: '13px 16px', borderRadius: 10, border: '1.5px solid #e4e0d8', background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '.875rem', textAlign: 'left', fontFamily: 'inherit', transition: 'all .1s' }}>{o}</button>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'rating' || type === 'stars' || type === 'star' || type === 'smiley') {
    const scale = type === 'smiley' ? 'smiley' : (type === 'rating' ? '1-5' : 'stars');
    return (
      <div>
        <label style={labelStyle}>{q}</label>
        <ScaleInput classifier={{ type, scale }} color={color} onPick={(n) => onAnswer({ number: n, text: type === 'smiley' ? String(n) : null })} />
      </div>
    );
  }

  if (type === 'dropdown') {
    const options = block.options || [];
    return (
      <div>
        <label style={labelStyle}>{q}</label>
        <select value={text} onChange={(e) => setText(e.target.value)} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e4e0d8', borderRadius: 10, fontSize: '.9rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 16, background: 'white' }}>
          <option value="">Choose…</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <ContinueBtn color={color} onClick={() => onAnswer({ text: text || null, options: text ? [text] : null })} />
      </div>
    );
  }

  if (type === 'date') {
    return (
      <div>
        <label style={labelStyle}>{q}</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e4e0d8', borderRadius: 10, fontSize: '.9rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 16 }} />
        <ContinueBtn color={color} onClick={() => onAnswer({ text: date || null })} />
      </div>
    );
  }

  if (type === 'contact') {
    const fields = block.fields || ['name', 'email', 'phone'];
    const fieldInput = (key, ph, inputType) => fields.includes(key) ? (
      <input key={key} type={inputType} value={contact[key] || ''} onChange={(e) => setContact({ ...contact, [key]: e.target.value })} placeholder={ph} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e4e0d8', borderRadius: 10, fontSize: '.9rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />
    ) : null;
    const filled = fields.map((k) => contact[k]).filter(Boolean);
    return (
      <div>
        <label style={labelStyle}>{q || 'Your contact details'}</label>
        {fieldInput('name', 'Name', 'text')}
        {fieldInput('email', 'Email', 'email')}
        {fieldInput('phone', 'Phone', 'tel')}
        <div style={{ marginTop: 6 }}>
          <ContinueBtn color={color} onClick={() => onAnswer({ text: filled.join(' \u2022 ') || null, contact: { name: contact.name || null, email: contact.email || null, phone: contact.phone || null } })} />
        </div>
      </div>
    );
  }

  if (type === 'section') {
    return (
      <div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0a0a0a', textAlign: 'center', marginBottom: block.description ? 10 : 22, lineHeight: 1.4 }}>{q}</h3>
        {block.description ? <p style={{ fontSize: '.9rem', color: '#4a4a48', textAlign: 'center', lineHeight: 1.65, marginBottom: 22 }}>{block.description.replace(/\{business\}/g, businessName || '')}</p> : null}
        <ContinueBtn color={color} onClick={() => onAnswer({ section: true })} />
      </div>
    );
  }

  // Unknown type — don't block the respondent.
  return (
    <div>
      <label style={labelStyle}>{q}</label>
      <ContinueBtn color={color} onClick={() => onAnswer({})} />
    </div>
  );
}

function ContinueBtn({ color, onClick, label }) {
  return <button onClick={onClick} style={{ width: '100%', padding: 13, borderRadius: 50, background: '#0a0a0a', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '.9rem', fontFamily: 'inherit' }}>{label || 'Continue'}</button>;
}

function choiceBtn(bg, border, fg) {
  return { flex: 1, padding: 14, borderRadius: 12, background: bg, border: '1.5px solid ' + border, cursor: 'pointer', fontWeight: 700, fontSize: '.875rem', color: fg, fontFamily: 'inherit' };
}

function PreviewBanner() {
  return <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', marginBottom: 20, fontSize: '.78rem', color: '#92690a', fontWeight: 600 }}>Preview mode — this is how your customers will see the survey</div>;
}
