// ============================================
// src/pages/survey/[token].js
// PUBLIC survey page — what customers see.
// No auth. No sidebar. Just a warm, simple,
// conversion-optimised survey experience.
//
// URL: swarmreply.com/survey/abc123
//
// States: score → promote/followup → thanks
// ============================================

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function ScoreButton({ value, selected, onClick, brandColor }) {
  const [hovered, setHovered] = useState(false);
  const active = selected || hovered;
  return (
    <button
      onClick={() => onClick(value)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 46, height: 46, borderRadius: 'var(--r-md, 16px)',
        border: `2px solid ${active ? brandColor : 'var(--line, #e4e0d8)'}`,
        background: active ? brandColor : 'white',
        color: active ? 'var(--ink, #0a0a0a)' : 'var(--tx-2, #4a4a48)',
        fontSize: 'var(--fs-lg, 1rem)', fontWeight: active ? 700 : 500,
        cursor: 'pointer', transition: 'all .15s', fontFamily: 'inherit',
        transform: active ? 'translateY(-2px) scale(1.08)' : 'none',
        boxShadow: active ? `0 6px 20px ${brandColor}55` : 'none',
        flexShrink: 0
      }}
    >
      {value}
    </button>
  );
}

export default function SurveyPage() {
  const router = useRouter();
  const { token } = router.query;

  const [survey,      setSurvey]      = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [step,        setStep]        = useState('score');
  const [score,       setScore]       = useState(null);
  const [scoreLabel,  setScoreLabel]  = useState(null);
  const [followup,    setFollowup]    = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [scoreAnim,   setScoreAnim]   = useState(false);

  useEffect(() => { if (token) loadSurvey(); }, [token]);

  // Handle ?score= from email score-button click
  useEffect(() => {
    if (!survey || typeof window === 'undefined') return;
    const qs = new URLSearchParams(window.location.search);
    const emailScore = qs.get('score');
    if (emailScore !== null) {
      handleScoreSelect(parseInt(emailScore), survey);
    }
  }, [survey]);

  async function loadSurvey() {
    try {
      const res = await axios.get(`${API_URL}/survey/${token}`);
      setSurvey(res.data);
      if (res.data.alreadyResponded) setStep('thanks');
    } catch (err) {
      setError(err.response?.status === 404
        ? 'This survey link has expired or is invalid.'
        : 'Unable to load the survey. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  function getLabel(s, sv) {
    if (s >= sv.promoterMin) return 'promoter';
    if (s >= sv.passiveMin)  return 'passive';
    return 'detractor';
  }

  function handleScoreSelect(s, sv) {
    const d = sv || survey;
    const label = getLabel(s, d);
    setScore(s);
    setScoreLabel(label);
    setScoreAnim(true);
    setTimeout(() => {
      if (label === 'promoter' && d.promoterAction === 'google_review' && d.promoterUrl) {
        setStep('promote');
      } else if (d.followupEnabled && (label === 'detractor' || label === 'passive')) {
        setStep('followup');
      } else {
        doSubmit(s, label, '', false);
      }
    }, 380);
  }

  async function doSubmit(s, label, text, redirected) {
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/survey/${token}/respond`, {
        score: s, followupText: text, redirectedToReview: redirected
      });
    } catch (err) {
      console.error('Survey submit error:', err);
    } finally {
      setSubmitting(false);
      setStep('thanks');
    }
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'var(--cream, #f8f7f4)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center', color:'#b0aca6', fontSize: 'var(--fs-base, 0.875rem)', fontFamily:'sans-serif' }}>Loading...</div>
    </div>
  );

  if (error || !survey) return (
    <div style={{ minHeight:'100vh', background:'var(--cream, #f8f7f4)', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px', fontFamily:'sans-serif' }}>
      <div style={{ background:'white', borderRadius: 'var(--r-md, 16px)', padding:'44px 36px', border:'1px solid var(--line, #e4e0d8)', maxWidth:400, textAlign:'center' }}>
        <div style={{ fontSize: 'var(--fs-4xl, 2.5rem)', marginBottom:12 }}>🔗</div>
        <div style={{ fontWeight:700, fontSize: 'var(--fs-lg, 1rem)', marginBottom:8 }}>Link not found</div>
        <div style={{ color:'var(--taupe, #7a7670)', fontSize: 'var(--fs-base, 0.875rem)', lineHeight:1.6 }}>{error || 'Survey not available.'}</div>
      </div>
    </div>
  );

  const brand = survey.brandColor || 'var(--honey, #f5c842)';
  const scaleNums = survey.scaleType === '1-5' ? [1,2,3,4,5]
    : survey.scaleType === '0-10'              ? [0,1,2,3,4,5,6,7,8,9,10]
    : [1,2,3,4,5,6,7,8,9,10];

  const wrapStyle = {
    minHeight: '100vh', background: 'var(--cream, #f8f7f4)',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '40px 16px',
    fontFamily: "'DM Sans',-apple-system,BlinkMacSystemFont,sans-serif",
    WebkitFontSmoothing: 'antialiased'
  };

  const cardStyle = {
    background: 'white', borderRadius: 'var(--r-lg, 24px)',
    border: '1px solid var(--line, #e4e0d8)',
    boxShadow: '0 20px 60px rgba(0,0,0,.07)',
    maxWidth: 500, width: '100%', overflow: 'hidden'
  };

  const inputStyle = {
    width: '100%', padding: '14px 16px', border: '1.5px solid var(--line, #e4e0d8)',
    borderRadius: 'var(--r-md, 16px)', fontSize: 'var(--fs-base, 0.875rem)', fontFamily: 'inherit',
    color: 'var(--tx, #1a1a18)', outline: 'none', resize: 'vertical',
    lineHeight: 1.6, transition: 'border-color .15s', boxSizing: 'border-box'
  };

  const submitBtnStyle = (disabled) => ({
    width: '100%', padding: '14px', background: disabled ? 'var(--mute-2, #c8c4bc)' : brand,
    color: 'var(--ink, #0a0a0a)', border: 'none', borderRadius: 'var(--r-pill, 999px)',
    fontSize: 'var(--fs-lg, 1rem)', fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit', transition: 'all .15s'
  });

  return (
    <>
      <Head>
        <title>How was your visit? — {survey.businessName}</title>
        <meta name="robots" content="noindex" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <style>{`
          body { margin: 0; }
          textarea { display: block; }
          @keyframes bounce-in {
            0%   { transform: scale(.92); opacity: 0 }
            60%  { transform: scale(1.04) }
            100% { transform: scale(1); opacity: 1 }
          }
          .card-enter { animation: bounce-in .35s ease both }
        `}</style>
      </Head>

      <div style={wrapStyle}>

        {/* ── SCORE STEP ── */}
        {step === 'score' && (
          <div style={cardStyle} className="card-enter">
            <div style={{ height: 5, background: brand }} />
            <div style={{ padding: '36px 32px 32px' }}>

              {/* Business header */}
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                {survey.logoUrl ? (
                  <img src={survey.logoUrl} alt={survey.businessName}
                    style={{ maxHeight: 52, maxWidth: 180, objectFit: 'contain', display: 'block', margin: '0 auto 10px' }}
                  />
                ) : (
                  <div style={{
                    width: 52, height: 52, borderRadius: 'var(--r-full, 50%)',
                    background: brand, display: 'inline-flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 'var(--fs-xl, 1.25rem)', fontWeight: 700, color: 'var(--ink, #0a0a0a)',
                    marginBottom: 10
                  }}>
                    {survey.businessName?.[0]?.toUpperCase() || '★'}
                  </div>
                )}
                <div style={{
                  fontFamily: "'Playfair Display',serif",
                  fontSize: 'var(--fs-lg, 1rem)', fontWeight: 700, color: 'var(--ink, #0a0a0a)'
                }}>
                  {survey.businessName}
                </div>
              </div>

              {/* Greeting */}
              {survey.firstName && (
                <p style={{ textAlign:'center', fontSize: 'var(--fs-lg, 1rem)', color:'var(--ink, #0a0a0a)', fontWeight:500, margin:'0 0 4px' }}>
                  Hi {survey.firstName} 👋
                </p>
              )}

              {/* Question */}
              <p style={{
                textAlign: 'center', fontSize: 'var(--fs-lg, 1rem)', color: 'var(--tx, #1a1a18)',
                lineHeight: 1.55, fontWeight: 400, margin: '0 0 30px'
              }}>
                {survey.questionText}
              </p>

              {/* Score grid */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
                {scaleNums.map(n => (
                  <ScoreButton
                    key={n} value={n}
                    selected={score === n && scoreAnim}
                    onClick={handleScoreSelect}
                    brandColor={brand}
                  />
                ))}
              </div>

              {/* Labels */}
              <div style={{ display:'flex', justifyContent:'space-between', fontSize: 'var(--fs-xs, 0.75rem)', color:'#b0aca6', marginBottom: 20 }}>
                <span>{survey.lowLabel}</span>
                <span>{survey.highLabel}</span>
              </div>

              <p style={{ textAlign:'center', fontSize: 'var(--fs-xs, 0.75rem)', color:'var(--mute-2, #c8c4bc)', margin:0 }}>
                Tap a number above — takes 10 seconds
              </p>
            </div>
          </div>
        )}

        {/* ── PROMOTER STEP ── */}
        {step === 'promote' && (
          <div style={cardStyle} className="card-enter">
            <div style={{ height: 5, background: brand }} />
            <div style={{ padding: '44px 32px 36px', textAlign: 'center' }}>
              <div style={{
                width: 76, height: 76, borderRadius: 'var(--r-full, 50%)',
                background: brand, display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center', marginBottom: 20
              }}>
                <span style={{ fontSize: 'var(--fs-3xl, 2rem)', fontWeight: 900, color: 'var(--ink, #0a0a0a)' }}>{score}</span>
              </div>

              <h2 style={{
                fontFamily: "'Playfair Display',serif",
                fontSize: 'var(--fs-2xl, 1.5rem)', fontWeight: 900, color: 'var(--ink, #0a0a0a)',
                marginBottom: 12, letterSpacing: '-0.02em'
              }}>
                That's wonderful to hear! 🎉
              </h2>

              <p style={{ fontSize: 'var(--fs-lg, 1rem)', color: 'var(--tx-2, #4a4a48)', lineHeight: 1.75, fontWeight: 300, marginBottom: 32 }}>
                {survey.promoterMessage}
              </p>

              <a
                href={survey.promoterUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => { setTimeout(() => doSubmit(score, scoreLabel, '', true), 300); }}
                style={{
                  display: 'block', padding: '15px 24px', background: brand,
                  color: 'var(--ink, #0a0a0a)', borderRadius: 'var(--r-pill, 999px)', fontWeight: 700,
                  fontSize: 'var(--fs-lg, 1rem)', textDecoration: 'none', marginBottom: 14
                }}
              >
                ⭐ Leave a Google review
              </a>

              <button
                onClick={() => doSubmit(score, scoreLabel, '', false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--fs-sm, 0.8125rem)', color: '#b0aca6', fontFamily: 'inherit', padding: '8px' }}
              >
                No thanks, maybe later
              </button>
            </div>
          </div>
        )}

        {/* ── FOLLOWUP STEP ── */}
        {step === 'followup' && (
          <div style={cardStyle} className="card-enter">
            <div style={{ height: 5, background: scoreLabel === 'detractor' ? '#fecaca' : brand }} />
            <div style={{ padding: '40px 32px 36px' }}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 'var(--r-full, 50%)',
                  background: scoreLabel === 'detractor' ? 'var(--danger-bg, #fee2e2)' : 'var(--cream, #f8f7f4)',
                  display: 'inline-flex', alignItems: 'center',
                  justifyContent: 'center', marginBottom: 16
                }}>
                  <span style={{
                    fontSize: 'var(--fs-2xl, 1.5rem)', fontWeight: 900,
                    color: scoreLabel === 'detractor' ? 'var(--danger, #c0392b)' : 'var(--ink, #0a0a0a)'
                  }}>{score}</span>
                </div>

                <h2 style={{
                  fontFamily: "'Playfair Display',serif",
                  fontSize: 'var(--fs-xl, 1.25rem)', fontWeight: 900,
                  color: 'var(--ink, #0a0a0a)', marginBottom: 8
                }}>
                  {scoreLabel === 'detractor' ? "We're sorry to hear that." : "Thank you for the feedback!"}
                </h2>

                <p style={{ fontSize: 'var(--fs-base, 0.875rem)', color: 'var(--tx-2, #4a4a48)', lineHeight: 1.7, fontWeight: 300, margin: 0 }}>
                  {scoreLabel === 'detractor' ? survey.detractorMessage : survey.passiveMessage}
                </p>
              </div>

              <label style={{ display: 'block', fontSize: 'var(--fs-base, 0.875rem)', fontWeight: 600, color: 'var(--ink, #0a0a0a)', marginBottom: 10 }}>
                {survey.followupQuestion}
              </label>
              <textarea
                value={followup}
                onChange={e => setFollowup(e.target.value)}
                rows={4}
                placeholder={scoreLabel === 'detractor'
                  ? 'Please share what happened — we read every response personally...'
                  : 'Any specific moments that stood out?'}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--ink, #0a0a0a)'}
                onBlur={e => e.target.style.borderColor = 'var(--line, #e4e0d8)'}
              />

              <div style={{ marginTop: 18 }}>
                <button
                  onClick={() => doSubmit(score, scoreLabel, followup, false)}
                  disabled={submitting}
                  style={submitBtnStyle(submitting)}
                >
                  {submitting ? 'Sending...' : (survey.buttonText || 'Send feedback')}
                </button>
                <button
                  onClick={() => doSubmit(score, scoreLabel, '', false)}
                  disabled={submitting}
                  style={{ width:'100%', marginTop:10, background:'none', border:'none', cursor:'pointer', fontSize: 'var(--fs-sm, 0.8125rem)', color:'#b0aca6', fontFamily:'inherit', padding:'8px' }}
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── THANK YOU STEP ── */}
        {step === 'thanks' && (
          <div style={cardStyle} className="card-enter">
            <div style={{ height: 5, background: brand }} />
            <div style={{ padding: '52px 32px 44px', textAlign: 'center' }}>
              <div style={{
                width: 76, height: 76, borderRadius: 'var(--r-full, 50%)',
                background: brand, display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 20, fontSize: 'var(--fs-3xl, 2rem)'
              }}>
                🐝
              </div>
              <h2 style={{
                fontFamily: "'Playfair Display',serif",
                fontSize: 'var(--fs-3xl, 2rem)', fontWeight: 900, color: 'var(--ink, #0a0a0a)',
                marginBottom: 12, letterSpacing: '-0.03em', lineHeight: 1.1
              }}>
                {survey.thankYouTitle || 'Thank you!'}
              </h2>
              <p style={{ fontSize: 'var(--fs-lg, 1rem)', color: 'var(--taupe, #7a7670)', lineHeight: 1.75, fontWeight: 300, maxWidth: 340, margin: '0 auto 20px' }}>
                {survey.thankYouMessage}
              </p>
              {score !== null && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'var(--cream, #f8f7f4)', border: '1px solid var(--line, #e4e0d8)',
                  borderRadius: 'var(--r-pill, 999px)', padding: '7px 18px',
                  fontSize: 'var(--fs-sm, 0.8125rem)', color: 'var(--taupe, #7a7670)'
                }}>
                  Your score: <strong style={{ color: 'var(--ink, #0a0a0a)', fontSize: 'var(--fs-lg, 1rem)' }}>{score}</strong>
                </div>
              )}
            </div>
          </div>
        )}

        <p style={{ marginTop: 20, fontSize: 'var(--fs-2xs, 0.6875rem)', color: 'var(--mute-2, #c8c4bc)', textAlign: 'center' }}>
          Survey powered by{' '}
          <a href="https://swarmreply.com" style={{ color: 'var(--mute-2, #c8c4bc)' }}>SwarmReply</a>
        </p>
      </div>
    </>
  );
}
