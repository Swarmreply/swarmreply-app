// ============================================
// src/pages/success.js
// Shown after successful Stripe payment.
// ============================================

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Success() {
  const router = useRouter();
  const [count, setCount] = useState(5);
  const [plan, setPlan]   = useState('');

  useEffect(() => {
    if (router.query.plan) setPlan(router.query.plan);
    const interval = setInterval(() => {
      setCount(c => {
        if (c <= 1) { clearInterval(interval); router.push('/login'); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [router]);

  const planLabel = { starter: 'Starter — $79/mo', growth: 'Growth — $139/mo', agency: 'Agency — $289/mo' }[plan] || 'SwarmReply';
  const planValue = { starter: 79, growth: 139, agency: 289 }[plan] || 79;

  return (
    <>
      <Head>
        <title>Welcome to SwarmReply 🐝</title>
        <script dangerouslySetInnerHTML={{ __html: `gtag('event','conversion',{'send_to':'AW-18177483467','value':${planValue},'currency':'USD'});` }} />
      </Head>
      <div style={{ minHeight:'100vh', background:'#f8f7f4', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px', fontFamily:'DM Sans,sans-serif' }}>
        <div style={{ background:'white', borderRadius:24, padding:'52px 44px', border:'1px solid #e4e0d8', maxWidth:520, width:'100%', textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize:56, marginBottom:16 }}>🐝</div>
          <h1 style={{ fontFamily:'Playfair Display,Georgia,serif', fontSize:28, fontWeight:900, color:'#0a0a0a', letterSpacing:'-0.03em', marginBottom:10, lineHeight:1.1 }}>
            You're in. Your swarm<br/>is ready to activate.
          </h1>
          {plan && <div style={{ display:'inline-block', background:'#f5c842', color:'#0a0a0a', padding:'5px 16px', borderRadius:50, fontSize:13, fontWeight:700, marginBottom:20 }}>{planLabel}</div>}
          <p style={{ color:'#7a7670', fontSize:15, lineHeight:1.7, marginBottom:32 }}>
            Check your email — a welcome message is on its way with your next steps.
          </p>
          <div style={{ background:'#f8f7f4', borderRadius:14, padding:'20px 24px', marginBottom:28, textAlign:'left' }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#7a7670', marginBottom:14 }}>What happens next</div>
            {[
              { n:'01', t:'Check your email', d:'Your welcome email has your login link and setup instructions.' },
              { n:'02', t:'Connect Google Business Profile', d:'One OAuth click inside the dashboard — takes under 2 minutes.' },
              { n:'03', t:'Your swarm goes live', d:'SwarmReply starts monitoring and replying to reviews automatically.' },
            ].map(s => (
              <div key={s.n} style={{ display:'flex', gap:12, marginBottom:14 }}>
                <div style={{ fontFamily:'Playfair Display,serif', fontSize:20, fontWeight:900, color:'#e4e0d8', lineHeight:1, flexShrink:0, width:28 }}>{s.n}</div>
                <div>
                  <div style={{ fontWeight:600, fontSize:14, color:'#0a0a0a', marginBottom:2 }}>{s.t}</div>
                  <div style={{ fontSize:13, color:'#7a7670', lineHeight:1.5 }}>{s.d}</div>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize:13, color:'#7a7670' }}>Redirecting to login in {count} second{count !== 1 ? 's' : ''}...</p>
          <button onClick={() => router.push('/login')} style={{ marginTop:12, padding:'12px 28px', borderRadius:50, background:'#0a0a0a', color:'white', border:'none', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'DM Sans,sans-serif', width:'100%' }}>
            Go to login now →
          </button>
        </div>
      </div>
    </>
  );
}
