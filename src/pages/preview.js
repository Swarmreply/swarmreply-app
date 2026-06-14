import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;

const DEMO = {
  businessName: 'SwarmReply Demo',
  brandColor: '#f5c842',
  brandLogo: 'https://swarmreply.com/bee-logo.png',
  promoterMin: 9,
  neutralMin: 7,
  npsQuestion: 'How likely are you to recommend us to a friend or family member?',
  promoterMessage: "We're so glad you had a great experience! Would you mind sharing it online?",
  neutralQuestion: 'Would you consider using us again in the future?',
  detractorOpening: "We're sorry your experience didn't meet expectations.",
  detractorQ1: 'What aspect of your experience fell short?',
  detractorQ2: 'What could we do better in the future?',
  platforms: [{ id: 'google', name: 'Google', color: '#4285F4', icon: 'G', url: '#' }],
};

export default function ReviewPage({ preview }) {
  const router = useRouter();
  const { token } = router.query;
  const [step, setStep]         = useState('nps');
  const [score, setScore]       = useState(null);
  const [d1, setD1]             = useState('');
  const [d2, setD2]             = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [data, setData]         = useState(DEMO);
  const [loading, setLoading]   = useState(!preview);

  useEffect(() => {
    if (preview || !token) { setLoading(false); return; }
    axios.get(API + '/review/' + token)
      .then(r => { setData({ ...DEMO, ...r.data }); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  function getPath(s) {
    if (s >= data.promoterMin) return 'promoter';
    if (s >= data.neutralMin)  return 'neutral';
    return 'detractor';
  }

  function selectScore(s) {
    setScore(s);
    setTimeout(() => setStep(getPath(s)), 300);
  }

  async function submit(extra) {
    setSubmitting(true);
    if (!preview && token) {
      await axios.post(API + '/review/' + token + '/submit', { npsScore: score, path: getPath(score), ...extra }).catch(() => {});
    }
    setSubmitting(false);
  }

  const c = data.brandColor || '#f5c842';
  const card = { background: 'white', borderRadius: 16, padding: '32px 28px', boxShadow: '0 4px 24px rgba(0,0,0,.08)', maxWidth: 520, width: '100%', margin: '0 auto' };

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f4f0' }}><span style={{ color: '#7a7670' }}>Loading…</span></div>;

  return (
    <>
      <Head><title>Share your feedback</title><meta name="viewport" content="width=device-width,initial-scale=1" /></Head>
      <div style={{ minHeight: '100vh', background: '#f4f4f0', fontFamily: 'system-ui,-apple-system,sans-serif', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: c, padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {data.brandLogo ? <img src={data.brandLogo} alt={data.businessName} style={{ maxHeight: 48, maxWidth: 160, objectFit: 'contain' }} /> : <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0a0a0a' }}>{data.businessName}</span>}
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>

          {step === 'nps' && (
            <div style={card}>
              {preview && <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', marginBottom: 20, fontSize: '.78rem', color: '#92690a', fontWeight: 600 }}>Preview mode — this is how your customers will see the survey</div>}
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0a0a0a', marginBottom: 8, textAlign: 'center', lineHeight: 1.4 }}>{data.npsQuestion.replace(/{business}/g, data.businessName)}</h2>
              <p style={{ fontSize: '.82rem', color: '#7a7670', textAlign: 'center', marginBottom: 24 }}>Tap a number below</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 10 }}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <button key={n} onClick={() => selectScore(n)} style={{ width: 44, height: 44, borderRadius: 10, border: '1.5px solid', borderColor: score === n ? c : '#e4e0d8', background: score === n ? c : 'white', fontWeight: 700, fontSize: '.9rem', cursor: 'pointer', color: score === n ? '#0a0a0a' : '#4a4a48', transition: 'all .12s' }}>{n}</button>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.72rem', color: '#7a7670' }}><span>Not likely at all</span><span>Extremely likely</span></div>
            </div>
          )}

          {step === 'promoter' && (
            <div style={card}>
              <div style={{ textAlign: 'center', fontSize: '2rem', marginBottom: 16 }}>🌟</div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, textAlign: 'center', marginBottom: 12 }}>Thank you!</h2>
              <p style={{ fontSize: '.875rem', color: '#4a4a48', textAlign: 'center', lineHeight: 1.7, marginBottom: 28 }}>{data.promoterMessage}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(data.platforms || []).map(p => (
                  <a key={p.id} href={p.url || '#'} onClick={() => submit({ leftReview: true, platform: p.id })} style={{ display: 'block', padding: '14px 20px', borderRadius: 50, background: p.color, color: 'white', textDecoration: 'none', fontWeight: 700, fontSize: '.9rem', textAlign: 'center' }}>{p.icon} Leave a review on {p.name}</a>
                ))}
              </div>
              <button onClick={() => { submit({}); setStep('done'); }} style={{ width: '100%', marginTop: 12, padding: 10, background: 'none', border: 'none', cursor: 'pointer', fontSize: '.78rem', color: '#7a7670' }}>No thanks</button>
            </div>
          )}

          {step === 'neutral' && (
            <div style={card}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, textAlign: 'center', marginBottom: 24, lineHeight: 1.5 }}>{data.neutralQuestion.replace(/{business}/g, data.businessName)}</h2>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setStep('promoter')} style={{ flex: 1, padding: 14, borderRadius: 12, background: '#dcfce7', border: '1.5px solid #bbf7d0', cursor: 'pointer', fontWeight: 700, fontSize: '.875rem', color: '#1a6b45', fontFamily: 'inherit' }}>Yes, I would</button>
                <button onClick={() => setStep('detractor')} style={{ flex: 1, padding: 14, borderRadius: 12, background: '#fee2e2', border: '1.5px solid #fca5a5', cursor: 'pointer', fontWeight: 700, fontSize: '.875rem', color: '#c0392b', fontFamily: 'inherit' }}>No, I wouldn't</button>
              </div>
            </div>
          )}

          {step === 'detractor' && (
            <div style={card}>
              <p style={{ fontSize: '.875rem', color: '#4a4a48', marginBottom: 24, lineHeight: 1.65 }}>{data.detractorOpening}</p>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 700, color: '#7a7670', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>{data.detractorQ1}</label>
                <textarea value={d1} onChange={e => setD1(e.target.value)} rows={3} style={{ width: '100%', padding: '10px 13px', border: '1.5px solid #e4e0d8', borderRadius: 9, fontSize: '.875rem', fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 700, color: '#7a7670', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>{data.detractorQ2}</label>
                <textarea value={d2} onChange={e => setD2(e.target.value)} rows={3} style={{ width: '100%', padding: '10px 13px', border: '1.5px solid #e4e0d8', borderRadius: 9, fontSize: '.875rem', fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <button onClick={() => { submit({ detractorQ1: d1, detractorQ2: d2 }); setStep('done'); }} disabled={submitting} style={{ width: '100%', padding: 13, borderRadius: 50, background: '#0a0a0a', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '.9rem', fontFamily: 'inherit', opacity: submitting ? .6 : 1 }}>{submitting ? 'Submitting…' : 'Submit feedback'}</button>
            </div>
          )}

          {step === 'done' && (
            <div style={{ ...card, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>🙏</div>
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
