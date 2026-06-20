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
  const path = (survey.paths && survey.paths[classification]) || [];
  const fmt = (s) => (s || '').replace(/\{business\}/g, data.businessName || '');

  function pickScore(n) {
    setScore(n);
    const cls = classify(n, survey.classifier && survey.classifier.thresholds);
    setClassification(cls);
    const blocks = (survey.paths && survey.paths[cls]) || [];
    setTimeout(() => {
      if (blocks.length) { setBlockIdx(0); setPhase('blocks'); }
      else goShare([], n, cls);
    }, 280);
  }

  function answerBlock(block, value) {
    const ans = {
      blockId: block.blockId, type: block.type, question: block.question,
      text: value.text ?? null, number: value.number ?? null, options: value.options ?? null,
    };
    const next = [...answers, ans];
    setAnswers(next);
    const blocks = (survey.paths && survey.paths[classification]) || [];
    if (blockIdx + 1 < blocks.length) setBlockIdx(blockIdx + 1);
    else goShare(next, score, classification);
  }

  async function goShare(finalAnswers, finalScore, finalClass) {
    setPhase('share');
    if (preview || submitted || !token) return;
    setSubmitted(true);
    try {
      await axios.post(API + '/review/' + token + '/submit', {
        score: finalScore, classification: finalClass, channel: 'email',
        templateId: survey.id || null,
        answers: (finalAnswers || []).map((a) => ({
          blockId: a.blockId, type: a.type, question: a.question,
          text: a.text, number: a.number, options: a.options,
        })),
      });
    } catch (e) { console.error('Survey submit failed:', e.message); }
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f4f0' }}><span style={{ color: '#7a7670' }}>Loading…</span></div>;
  }

  const currentBlock = phase === 'blocks' ? path[blockIdx] : null;
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
              {classification === 'detractor' && blockIdx === 0 && survey.messages && survey.messages.detractorOpening && (
                <p style={{ fontSize: '.875rem', color: '#4a4a48', marginBottom: 20, lineHeight: 1.65 }}>{fmt(survey.messages.detractorOpening)}</p>
              )}
              <BlockInput key={currentBlock.blockId || blockIdx} block={currentBlock} color={c} businessName={data.businessName} onAnswer={(v) => answerBlock(currentBlock, v)} />
            </div>
          )}

          {phase === 'share' && (
            <div style={card}>
              <div style={{ textAlign: 'center', fontSize: '2rem', marginBottom: 16 }}>{classification === 'promoter' ? '\uD83C\uDF1F' : '\uD83D\uDE4F'}</div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, textAlign: 'center', marginBottom: 12 }}>Thank you!</h2>
              <p style={{ fontSize: '.875rem', color: '#4a4a48', textAlign: 'center', lineHeight: 1.7, marginBottom: 28 }}>
                {classification === 'promoter'
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
