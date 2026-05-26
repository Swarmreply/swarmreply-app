// ============================================
// pages/dashboard/grow.js
// Grow — Review Requests / Surveys & NPS / Import tabs
// ============================================

import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { useRouter } from 'next/router';

const TABS = [
  { id: 'requests', label: 'Review Requests' },
  { id: 'surveys',  label: 'Surveys & NPS'   },
  { id: 'import',   label: 'Import Contacts' },
];

function Card({ children, style = {} }) {
  return <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 14, ...style }}>{children}</div>;
}

function StatCard({ label, value, sub }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e4e0d8', borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.8rem', fontWeight: 900 }}>{value}</div>
      {sub && <div style={{ fontSize: '.75rem', color: '#7a7670', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function RequestsTab() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [sent, setSent] = useState(false);

  function send() {
    if (!name.trim() || (!email.trim() && !phone.trim())) return;
    setSent(true);
    setTimeout(() => setSent(false), 3000);
    setName(''); setEmail(''); setPhone('');
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label="Sent this month" value="47" sub="↑ +12 vs last month" />
        <StatCard label="Open rate" value="68%" sub="↑ +4% vs last month" />
        <StatCard label="Reviews generated" value="11" sub="↑ +3 vs last month" />
        <StatCard label="Conversion rate" value="23%" sub="Industry avg 12%" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>
        <Card>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e4e0d8', fontWeight: 600, fontSize: '.875rem' }}>Recent sends</div>
          {[['Sarah M.','Email · Opened','2h ago','Opened'],['James T.','SMS · Delivered','Yesterday','Pending'],['Rachel K.','Email · Reviewed','3 days ago','Reviewed']].map(([n,ch,t,s]) => (
            <div key={n} style={{ padding: '13px 20px', borderBottom: '1px solid #f8f7f4', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f0eeea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>{n[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '.84rem' }}>{n}</div>
                <div style={{ fontSize: '.73rem', color: '#7a7670', marginTop: 2 }}>{ch} · {t}</div>
              </div>
              <span style={{ fontSize: '.67rem', fontWeight: 700, padding: '2px 8px', borderRadius: 50, background: s === 'Reviewed' ? '#e8f5ef' : s === 'Opened' ? '#e8f0fe' : '#fef3cd', color: s === 'Reviewed' ? '#1a6b45' : s === 'Opened' ? '#1a4baa' : '#92690a' }}>{s}</span>
            </div>
          ))}
        </Card>
        <Card style={{ padding: 20, height: 'fit-content' }}>
          <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 14 }}>Send a review request</div>
          {sent && <div style={{ background: '#e8f5ef', border: '1px solid #bbf7d0', borderRadius: 9, padding: '9px 12px', fontSize: '.82rem', color: '#1a6b45', marginBottom: 12 }}>✓ Sent successfully!</div>}
          {[['Customer name *','text','Enter name…',name,setName],['Email','email','customer@example.com',email,setEmail],['Phone (SMS)',  'tel','+1 555 000 0000',phone,setPhone]].map(([l,t,p,v,s]) => (
            <div key={l} style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: '.67rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 4 }}>{l}</label>
              <input type={t} value={v} onChange={e => s(e.target.value)} placeholder={p} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e4e0d8', borderRadius: 9, fontSize: '.875rem', fontFamily: 'inherit', outline: 'none' }} />
            </div>
          ))}
          <button onClick={send} style={{ width: '100%', padding: 11, borderRadius: 50, background: '#0a0a0a', color: 'white', border: 'none', cursor: 'pointer', fontSize: '.875rem', fontWeight: 700, fontFamily: 'inherit', marginTop: 4 }}>
            Send request →
          </button>
        </Card>
      </div>
    </div>
  );
}

function SurveysTab() {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label="Surveys sent" value="128" sub="Last 30 days" />
        <StatCard label="Response rate" value="71%" sub="↑ Industry avg 45%" />
        <StatCard label="Avg NPS score" value="8.4" sub="↑ +0.3 vs last month" />
        <StatCard label="Promoters routed" value="43" sub="To Google review page" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
        <Card style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 14 }}>NPS breakdown</div>
          {[['Promoters','54%','#1a6b45'],['Passives','31%','#f59e0b'],['Detractors','15%','#c0392b']].map(([l,p,c]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
              <span style={{ width: 80, fontSize: '.8rem', fontWeight: 500 }}>{l}</span>
              <div style={{ flex: 1, height: 8, background: '#f0eeea', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: p, height: '100%', background: c, borderRadius: 4 }} />
              </div>
              <span style={{ fontSize: '.8rem', fontWeight: 600, color: c, width: 36 }}>{p}</span>
            </div>
          ))}
        </Card>
        <Card style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 14 }}>Survey settings</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0eeea' }}>
            <div>
              <div style={{ fontSize: '.875rem', fontWeight: 500 }}>Surveys enabled</div>
              <div style={{ fontSize: '.73rem', color: '#7a7670' }}>Sends automatically post-visit</div>
            </div>
            <div style={{ width: 40, height: 22, background: '#0a0a0a', borderRadius: 50, position: 'relative', cursor: 'pointer' }}>
              <div style={{ position: 'absolute', right: 2, top: 2, width: 18, height: 18, background: 'white', borderRadius: '50%' }} />
            </div>
          </div>
          <div style={{ padding: '10px 0' }}>
            <div style={{ fontSize: '.875rem', fontWeight: 500, marginBottom: 6 }}>Promoter destination</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['Google','Facebook','Yelp'].map((p, i) => (
                <button key={p} style={{ padding: '5px 12px', borderRadius: 50, border: i === 0 ? '2px solid #0a0a0a' : '1.5px solid #e4e0d8', background: i === 0 ? '#f8f7f4' : 'transparent', fontSize: '.8rem', fontWeight: i === 0 ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit' }}>{p}</button>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ImportTab() {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
        <Card style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 6 }}>Import contacts</div>
          <div style={{ fontSize: '.8rem', color: '#7a7670', marginBottom: 16, lineHeight: 1.6 }}>Upload a CSV from your PMS, CRM, or POS. We import names, emails, and phone numbers.</div>
          <div style={{ border: '2px dashed #e4e0d8', borderRadius: 12, padding: 32, textAlign: 'center', marginBottom: 14, cursor: 'pointer' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>⇪</div>
            <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 4 }}>Drop CSV here or click to browse</div>
            <div style={{ fontSize: '.78rem', color: '#7a7670' }}>CSV with name, email, phone columns</div>
          </div>
          <button style={{ width: '100%', padding: 11, borderRadius: 50, background: '#0a0a0a', color: 'white', border: 'none', cursor: 'pointer', fontSize: '.875rem', fontWeight: 700, fontFamily: 'inherit' }}>Import contacts</button>
        </Card>
        <Card style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 14 }}>Recent imports</div>
          {[['May import','142 contacts','May 15'],['April import','98 contacts','Apr 12']].map(([n,c,d]) => (
            <div key={n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8f7f4', borderRadius: 10, marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '.84rem' }}>{n}</div>
                <div style={{ fontSize: '.73rem', color: '#7a7670', marginTop: 2 }}>{c} · {d}</div>
              </div>
              <span style={{ background: '#e8f5ef', color: '#1a6b45', fontSize: '.67rem', fontWeight: 700, padding: '2px 8px', borderRadius: 50 }}>Complete</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

export default function Grow() {
  const [tab, setTab] = useState('requests');

  return (
    <DashboardLayout title="Grow">
      <div style={{ background: 'white', borderBottom: '1px solid #e4e0d8', padding: '0 24px', display: 'flex', gap: 2 }} className="tabs-scrollable">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '14px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: '.84rem', fontWeight: tab === t.id ? 700 : 500, fontFamily: 'inherit',
            color: tab === t.id ? '#0a0a0a' : '#7a7670',
            borderBottom: tab === t.id ? '2px solid #0a0a0a' : '2px solid transparent',
          }}>{t.label}</button>
        ))}
      </div>
      {tab === 'requests' && <RequestsTab />}
      {tab === 'surveys'  && <SurveysTab />}
      {tab === 'import'   && <ImportTab />}
    </DashboardLayout>
  );
}
