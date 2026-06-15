// ============================================
// pages/s/[token].js
// The public survey page customers see.
// Fully self-contained — no DashboardLayout.
// Designed to be beautiful, fast, and
// mobile-first (most customers open on phone).
//
// States:
//  1. Loading   — fetching survey data
//  2. Rating    — 0–10 score selection
//  3. Followup  — text feedback (detractors)
//  4. Thank you (promoter) — + Google redirect countdown
//  5. Thank you (detractor/passive) — private feedback
//  6. Already responded — graceful re-visit
//  7. Not found — invalid token
// ============================================

import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// ─── Score button ─────────────────────────────────
function ScoreButton({ score, selected, onClick, accent, promoterThreshold }) {
  const isPromoter  = score >= promoterThreshold;
  const isDetractor = score <= 6;
  const isSelected  = selected === score;

  let bg, color, border;
  if (isSelected) {
    bg     = accent;
    color  = '#0a0a0a';
    border = accent;
  } else if (isPromoter) {
    bg     = `${accent}20`;
    color  = accent === '#f5c842' ? '#92690a' : accent;
    border = `${accent}40`;
  } else if (isDetractor) {
    bg     = '#fee2e2';
    color  = '#c0392b';
    border = '#fecaca';
  } else {
    bg     = '#f8f7f4';
    color  = '#7a7670';
    border = '#e4e0d8';
  }

  return (
    <button
      onClick={() => onClick(score)}
      style={{
        width: '100%', aspectRatio: '1', borderRadius: '50%',
        border: `2px solid ${border}`,
        background: bg, color, fontSize: '1rem', fontWeight: 700,
        fontFamily: 'DM Sans, sans-serif',
        cursor: 'pointer', transition: 'all .15s',
        transform: isSelected ? 'scale(1.15)' : 'scale(1)',
        boxShadow: isSelected ? `0 0 0 4px ${accent}30` : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
    >
      {score}
    </button>
  );
}

// ─── Progress dots ────────────────────────────────
function ProgressDots({ step, total, accent }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 32 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i < step ? 18 : 7, height: 7, borderRadius: 50,
          background: i < step ? accent : '#e4e0d8',
          transition: 'all .3s'
        }} />
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────
export default function SurveyPage() {
  const router   = useRouter();
  const { token } = router.query;

  const [state, setState]   = useState('loading'); // loading|rating|followup|thanks_promoter|thanks_other|already|notfound
  const [survey, setSurvey] = useState(null);
  const [selected, setSelected] = useState(null);
  const [followup, setFollowup] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const countdownRef = useRef(null);

  // Check if score was pre-selected via email link (?score=N)
  useEffect(() => {
    if (!token) return;

    const scoreParam = new URLSearchParams(window.location.search).get('score');
    const preScore   = scoreParam !== null ? parseInt(scoreParam) : null;

    loadSurvey(token, preScore);
  }, [token]);

  async function loadSurvey(tok, preScore) {
    try {
      const res = await axios.get(`${API_URL}/survey/${tok}`);
      const data = res.data;
      setSurvey(data);

      if (data.alreadyResponded) {
        setState('already');
        return;
      }

      // If score was pre-selected in email, submit immediately
      if (preScore !== null && preScore >= 0 && preScore <= 10) {
        setSelected(preScore);
        await submitScore(tok, data, preScore);
      } else {
        setState('rating');
      }
    } catch (err) {
      setState('notfound');
    }
  }

  async function handleScoreClick(score) {
    setSelected(score);
    // Brief haptic pause then proceed
    await delay(180);
    await submitScore(token, survey, score);
  }

  async function submitScore(tok, surveyData, score) {
    setSubmitting(true);
    try {
      const res = await axios.post(`${API_URL}/survey/${tok}/respond`, { score });
      const result = res.data;

      if (surveyData.askFollowup && !result.isPromoter) {
        // Show followup for detractors and passives
        setState('followup');
      } else if (result.isPromoter) {
        setState('thanks_promoter');
        if (result.shouldRedirect && result.redirectUrl) {
          startCountdown(result.redirectUrl, result.redirectDelay);
        }
      } else {
        setState('thanks_other');
      }
    } catch (err) {
      console.error('Survey submit error:', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFollowupSubmit() {
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/survey/${token}/followup`, { text: followup });
    } catch (err) {
      // Non-fatal — still show thank you
    } finally {
      setSubmitting(false);
      setState('thanks_other');
    }
  }

  function startCountdown(redirectUrl, delayMs) {
    const seconds = Math.round((delayMs || 2000) / 1000);
    setCountdown(seconds);

    let count = seconds;
    countdownRef.current = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(countdownRef.current);
        // Only follow http(s) destinations — never a javascript:/data: URL.
        if (typeof redirectUrl === 'string' && /^https?:\/\//i.test(redirectUrl)) {
          window.location.href = redirectUrl;
        }
      }
    }, 1000);
  }

  // Cleanup
  useEffect(() => () => clearInterval(countdownRef.current), []);

  if (!survey && state !== 'loading' && state !== 'notfound') return null;

  const accent   = survey?.accentColor  || '#f5c842';
  const isDark   = survey?.theme        === 'dark';
  const bg       = isDark ? '#0a0a0a'   : '#f8f7f4';
  const cardBg   = isDark ? '#141414'   : '#ffffff';
  const textCol  = isDark ? '#ffffff'   : '#0a0a0a';
  const mutedCol = isDark ? 'rgba(255,255,255,.5)' : '#7a7670';
  const borderCol = isDark ? 'rgba(255,255,255,.1)' : '#e4e0d8';

  const wrapStyle = {
    minHeight: '100vh',
    background: bg,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    fontFamily: "'DM Sans', -apple-system, sans-serif"
  };

  const cardStyle = {
    background: cardBg,
    borderRadius: 24,
    padding: '40px 36px',
    border: `1px solid ${borderCol}`,
    maxWidth: 480,
    width: '100%',
    boxShadow: isDark
      ? 'none'
      : '0 20px 60px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)'
  };

  // ── LOADING ────────────────────────────────────
  if (state === 'loading') return (
    <div style={wrapStyle}>
      <div style={{ textAlign: 'center', color: mutedCol, fontSize: '0.875rem' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🐝</div>
        Loading...
      </div>
    </div>
  );

  // ── NOT FOUND ──────────────────────────────────
  if (state === 'notfound') return (
    <>
      <Head><title>Survey not found</title></Head>
      <div style={wrapStyle}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: textCol, marginBottom: 8 }}>
            Survey not found
          </h1>
          <p style={{ fontSize: '0.875rem', color: mutedCol, lineHeight: 1.6 }}>
            This link may have expired or already been used.
          </p>
        </div>
      </div>
    </>
  );

  // ── ALREADY RESPONDED ──────────────────────────
  if (state === 'already') return (
    <>
      <Head><title>{survey.businessName} — Thank you!</title></Head>
      <div style={wrapStyle}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          {survey.logoUrl
            ? <img src={survey.logoUrl} alt={survey.businessName} style={{ height: 40, objectFit: 'contain', marginBottom: 20 }} />
            : <div style={{ fontSize: 36, marginBottom: 16 }}>🐝</div>
          }
          <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: textCol, marginBottom: 8 }}>
            You've already responded
          </h1>
          <p style={{ fontSize: '0.875rem', color: mutedCol, lineHeight: 1.6 }}>
            Thank you for your feedback — it means a lot to {survey.businessName}.
          </p>
        </div>
      </div>
    </>
  );

  // ── RATING ─────────────────────────────────────
  if (state === 'rating') return (
    <>
      <Head>
        <title>{survey.businessName} — How was your visit?</title>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div style={wrapStyle}>
        <div style={cardStyle}>
          {/* Logo or bee */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            {survey.logoUrl
              ? <img src={survey.logoUrl} alt={survey.businessName} style={{ height: 44, objectFit: 'contain' }} />
              : <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1.5rem' }}>🐝</span>
                  <span style={{ fontWeight: 700, fontSize: '1.05rem', color: textCol }}>{survey.businessName}</span>
                </div>
            }
          </div>

          <ProgressDots step={0} total={2} accent={accent} />

          <h1 style={{
            fontFamily: 'Georgia, serif', fontSize: '1.45rem', fontWeight: 700,
            color: textCol, margin: '0 0 8px', lineHeight: 1.2, textAlign: 'center'
          }}>
            Hi {survey.contactName}! How was your visit?
          </h1>
          <p style={{
            fontSize: '0.9rem', color: mutedCol, margin: '0 0 32px',
            lineHeight: 1.65, textAlign: 'center'
          }}>
            {survey.question}
          </p>

          {/* Score grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(11, 1fr)',
            gap: 6,
            marginBottom: 10
          }}>
            {[0,1,2,3,4,5,6,7,8,9,10].map(s => (
              <ScoreButton
                key={s}
                score={s}
                selected={selected}
                onClick={handleScoreClick}
                accent={accent}
                promoterThreshold={survey.promoterThreshold}
              />
            ))}
          </div>

          {/* Labels */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: '0.72rem', color: mutedCol, marginBottom: 32
          }}>
            <span>😞 Not likely</span>
            <span>Extremely likely 😊</span>
          </div>

          {/* Legend */}
          <div style={{
            display: 'flex', gap: 12, justifyContent: 'center',
            fontSize: '0.72rem', color: mutedCol, flexWrap: 'wrap'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fee2e2', border: '1px solid #fecaca', display: 'inline-block' }} />
              0–6 Needs work
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f8f7f4', border: '1px solid #e4e0d8', display: 'inline-block' }} />
              7–8 Good
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: `${accent}30`, border: `1px solid ${accent}50`, display: 'inline-block' }} />
              9–10 Love it
            </span>
          </div>

          {submitting && (
            <div style={{ textAlign: 'center', marginTop: 20, color: mutedCol, fontSize: '0.82rem' }}>
              Saving your response...
            </div>
          )}
        </div>

        <p style={{ fontSize: '0.72rem', color: mutedCol, marginTop: 20, textAlign: 'center' }}>
          Takes 10 seconds · Your response is private unless you choose to share it
        </p>
      </div>
    </>
  );

  // ── FOLLOW-UP ──────────────────────────────────
  if (state === 'followup') return (
    <>
      <Head><title>{survey.businessName} — Tell us more</title></Head>
      <div style={wrapStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            {survey.logoUrl
              ? <img src={survey.logoUrl} alt={survey.businessName} style={{ height: 44, objectFit: 'contain' }} />
              : <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>🐝</div>
            }
          </div>

          <ProgressDots step={1} total={2} accent={accent} />

          {/* Score confirmation pill */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#fee2e2', color: '#c0392b',
              padding: '6px 16px', borderRadius: 50, fontSize: '0.82rem', fontWeight: 600
            }}>
              You rated us {selected}/10
            </span>
          </div>

          <h1 style={{
            fontFamily: 'Georgia, serif', fontSize: '1.3rem', fontWeight: 700,
            color: textCol, margin: '0 0 8px', lineHeight: 1.2, textAlign: 'center'
          }}>
            {survey.followupQuestion}
          </h1>
          <p style={{
            fontSize: '0.875rem', color: mutedCol, margin: '0 0 20px',
            textAlign: 'center', lineHeight: 1.6
          }}>
            Your honest feedback helps us improve. It stays completely private.
          </p>

          <textarea
            value={followup}
            onChange={e => setFollowup(e.target.value)}
            placeholder={survey.followupPlaceholder}
            maxLength={500}
            autoFocus
            style={{
              width: '100%', minHeight: 110, padding: '13px 15px',
              border: `1.5px solid ${borderCol}`, borderRadius: 12,
              fontSize: '0.9rem', fontFamily: 'DM Sans, sans-serif',
              color: textCol, background: isDark ? '#0a0a0a' : 'white',
              outline: 'none', resize: 'vertical', lineHeight: 1.6,
              marginBottom: 6,
              transition: 'border-color .15s',
            }}
            onFocus={e => e.target.style.borderColor = accent}
            onBlur={e => e.target.style.borderColor = borderCol}
          />
          <div style={{ textAlign: 'right', fontSize: '0.72rem', color: mutedCol, marginBottom: 20 }}>
            {followup.length} / 500
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setState('thanks_other')}
              style={{
                flex: 1, padding: '13px', borderRadius: 50,
                border: `1.5px solid ${borderCol}`, background: 'transparent',
                color: mutedCol, fontSize: '0.9rem', fontWeight: 500,
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif'
              }}
            >
              Skip
            </button>
            <button
              onClick={handleFollowupSubmit}
              disabled={submitting}
              style={{
                flex: 2, padding: '13px', borderRadius: 50,
                border: 'none', background: accent,
                color: '#0a0a0a', fontSize: '0.9rem', fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontFamily: 'DM Sans, sans-serif',
                opacity: submitting ? 0.7 : 1,
                transition: 'opacity .15s'
              }}
            >
              {submitting ? 'Sending...' : 'Send feedback →'}
            </button>
          </div>
        </div>
      </div>
    </>
  );

  // ── THANK YOU — PROMOTER ───────────────────────
  if (state === 'thanks_promoter') return (
    <>
      <Head><title>Thank you! — {survey.businessName}</title></Head>
      <div style={wrapStyle}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          {survey.logoUrl
            ? <img src={survey.logoUrl} alt={survey.businessName} style={{ height: 44, objectFit: 'contain', marginBottom: 20 }} />
            : <div style={{ fontSize: 40, marginBottom: 16 }}>🎉</div>
          }

          {/* Animated score display */}
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: accent, color: '#0a0a0a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.6rem', fontWeight: 900,
            margin: '0 auto 20px',
            boxShadow: `0 0 0 8px ${accent}25`,
            fontFamily: 'Georgia, serif'
          }}>
            {selected}
          </div>

          <h1 style={{
            fontFamily: 'Georgia, serif', fontSize: '1.45rem', fontWeight: 700,
            color: textCol, margin: '0 0 12px', lineHeight: 1.2
          }}>
            {survey.promoterThankYou}
          </h1>

          {survey.redirectToGoogle && survey.googleReviewLink && (
            <>
              <p style={{ fontSize: '0.9rem', color: mutedCol, margin: '0 0 24px', lineHeight: 1.65 }}>
                Would you mind sharing your experience on Google? It only takes 60 seconds and makes a huge difference.
              </p>

              <a
                href={survey.googleReviewLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block', padding: '14px 28px', borderRadius: 50,
                  background: '#4285F4', color: 'white',
                  fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none',
                  marginBottom: 12, transition: 'opacity .15s'
                }}
              >
                ⭐ Leave a Google review
              </a>

              {countdown > 0 && (
                <p style={{ fontSize: '0.75rem', color: mutedCol }}>
                  Taking you there automatically in {countdown}s...
                </p>
              )}
            </>
          )}
        </div>

        <p style={{ fontSize: '0.72rem', color: mutedCol, marginTop: 20, textAlign: 'center' }}>
          Powered by SwarmReply
        </p>
      </div>
    </>
  );

  // ── THANK YOU — DETRACTOR / PASSIVE ────────────
  if (state === 'thanks_other') return (
    <>
      <Head><title>Thank you — {survey.businessName}</title></Head>
      <div style={wrapStyle}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          {survey.logoUrl
            ? <img src={survey.logoUrl} alt={survey.businessName} style={{ height: 44, objectFit: 'contain', marginBottom: 20 }} />
            : <div style={{ fontSize: 40, marginBottom: 16 }}>🙏</div>
          }

          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: '#f8f7f4', border: `2px solid ${accent}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.4rem', fontWeight: 900,
            margin: '0 auto 20px',
            fontFamily: 'Georgia, serif', color: textCol
          }}>
            {selected}
          </div>

          <h1 style={{
            fontFamily: 'Georgia, serif', fontSize: '1.35rem', fontWeight: 700,
            color: textCol, margin: '0 0 12px', lineHeight: 1.2
          }}>
            {survey.detractorThankYou}
          </h1>

          {followup && (
            <div style={{
              background: isDark ? '#1a1a1a' : '#f8f7f4',
              border: `1px solid ${borderCol}`,
              borderRadius: 12, padding: '12px 16px',
              fontSize: '0.85rem', color: mutedCol,
              fontStyle: 'italic', margin: '16px 0', textAlign: 'left',
              lineHeight: 1.65
            }}>
              "{followup}"
            </div>
          )}

          <p style={{ fontSize: '0.875rem', color: mutedCol, margin: '12px 0 0', lineHeight: 1.65 }}>
            Your feedback has been received by {survey.businessName} privately.
          </p>
        </div>

        <p style={{ fontSize: '0.72rem', color: mutedCol, marginTop: 20, textAlign: 'center' }}>
          Powered by SwarmReply
        </p>
      </div>
    </>
  );

  return null;
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

export async function getServerSideProps(context) {
  return { props: {} };
}
