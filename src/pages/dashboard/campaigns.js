// ============================================
// pages/dashboard/campaigns.js
// SMS Campaigns — list / contacts / segments / compliance
// ============================================

import React, { useState, useEffect } from 'react';
import SmsGateBanner from '../../components/SmsGateBanner';
import { useSmsGate } from '../../hooks/useSmsGate';
import { FEATURES } from '../../utils/featureFlags';
import DashboardLayout from '../../components/DashboardLayout';
import { StatCard, Button as KitButton } from '../../components/ui';
import EmptyState from '../../components/EmptyState';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;
const TABS = [
  { id: 'list',       label: 'Campaigns'    },
  { id: 'social',     label: 'Social Posts', flag: 'socialPosting' },
  { id: 'contacts',   label: 'Contacts'    },
  { id: 'segments',   label: 'Segments'    },
  { id: 'compliance', label: 'Compliance'  },
].filter(t => !t.flag || FEATURES[t.flag]);

function authHeaders() {
  const t = typeof window !== 'undefined' ? localStorage.getItem('swarmreply_token') : '';
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function Card({ children, style = {} }) {
  return <div style={{ background: 'white', border: '1.5px solid #e4e0d8', borderRadius: 14, ...style }}>{children}</div>;
}


function UsageMeter({ used = 0, limit = 1000, resetAt = null }) {
  const pct = limit > 0 ? Math.round((used / limit) * 100) : 0;
  const color = pct >= 100 ? '#c0392b' : pct >= 80 ? '#f59e0b' : '#1a6b45';
  const resetLabel = (() => {
    const d = resetAt ? new Date(resetAt) : (() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth() + 1, 1); })();
    return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
  })();
  return (
    <Card style={{ padding: 18, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 2 }}>Monthly SMS campaign limit</div>
          <div style={{ fontSize: '.75rem', color: '#7a7670' }}>Resets {resetLabel}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.4rem', fontWeight: 900 }}>{used.toLocaleString()}</div>
          <div style={{ fontSize: '.72rem', color: '#7a7670' }}>of {limit.toLocaleString()} used</div>
        </div>
      </div>
      <div style={{ height: 8, background: '#f0eeea', borderRadius: 50, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 50, transition: 'width .5s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.75rem', color: '#7a7670' }}>
        <span style={{ color, fontWeight: 600 }}>{(limit - used).toLocaleString()} remaining</span>
      </div>
    </Card>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// SOCIAL POSTS TAB
// ══════════════════════════════════════════════════════════════════════════════

// Platform definitions with content type compatibility
const SOCIAL_PLATFORMS = [
  { id: 'facebook',  name: 'Facebook',  icon: '📘', color: '#1877F2', connection: 'meta',
    supports: ['text','text_image','link','video','reel'] },
  { id: 'instagram', name: 'Instagram', icon: '📷', color: '#E1306C', connection: 'meta',
    supports: ['text_image','video','reel'],
    unsupported_reason: 'Instagram does not support text-only or link posts via API.' },
  { id: 'linkedin',  name: 'LinkedIn',  icon: '💼', color: '#0A66C2', connection: 'linkedin',
    supports: ['text','text_image','link','video'] },
  { id: 'google',    name: 'Google Business', icon: '🔍', color: '#4285F4', connection: 'google_posts',
    supports: ['text','text_image','link'],
    unsupported_reason: 'Google Business Posts do not support video or Reels.' },
  { id: 'tiktok',   name: 'TikTok',    icon: '🎵', color: '#000000', connection: 'tiktok',
    supports: ['video'],
    unsupported_reason: 'TikTok only supports video posts.' },
];

const CONTENT_TYPES = [
  { id: 'text',       label: 'Text only',       icon: '📝', desc: 'A text post with no media' },
  { id: 'text_image', label: 'Text + Image',     icon: '🖼', desc: 'Text post with one or more images' },
  { id: 'link',       label: 'Link post',        icon: '🔗', desc: 'Share a URL with a preview' },
  { id: 'video',      label: 'Video',            icon: '🎬', desc: 'Upload and post a video' },
  { id: 'reel',       label: 'Reel / Short',     icon: '📱', desc: 'Short-form vertical video' },
];

function SocialPostsTab() {
  const [step, setStep]             = useState('type');    // type → platforms → compose → confirm
  const [contentType, setContentType] = useState(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [postText, setPostText]     = useState('');
  const [postLink, setPostLink]     = useState('');
  const [postImage, setPostImage]   = useState(null);
  const [postVideo, setPostVideo]   = useState(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [posts, setPosts]           = useState([]);
  const [view, setView]             = useState('create'); // create | history
  const [published, setPublished]   = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL;
  function authH() {
    const t = typeof window !== 'undefined' ? localStorage.getItem('swarmreply_token') : '';
    return t ? { Authorization: `Bearer ${t}` } : {};
  }

  // Load real post history
  useEffect(() => { loadPosts(); }, []);
  async function loadPosts() {
    try {
      const res = await fetch(`${API}/social/posts`, { headers: authH() });
      const data = await res.json();
      setPosts((data.posts || []).map(p => ({
        id: p.id,
        text: p.text_content || '',
        platforms: Array.isArray(p.platforms) ? p.platforms : (() => { try { return JSON.parse(p.platforms); } catch { return []; } })(),
        content_type: p.content_type,
        status: p.status,
        published_at: p.created_at,
        platform_statuses: (() => { try { return typeof p.platform_results === 'string' ? JSON.parse(p.platform_results) : (p.platform_results || {}); } catch { return {}; } })(),
      })));
    } catch (e) { setPosts([]); }
  }

  function togglePlatform(id) {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  }

  function compatiblePlatforms() {
    if (!contentType) return [];
    return SOCIAL_PLATFORMS.map(p => ({
      ...p,
      compatible: p.supports.includes(contentType),
    }));
  }

  const [publishResults, setPublishResults] = useState(null);
  const [publishError, setPublishError]     = useState('');
  async function publish() {
    if (!postText.trim() && contentType === 'text') return;
    if (selectedPlatforms.length === 0) return;
    setPublishing(true);
    setPublishError('');
    try {
      const res = await fetch(`${API}/social/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authH() },
        body: JSON.stringify({
          platforms: selectedPlatforms,
          contentType,
          text: postText,
          link: postLink,
          scheduleAt: scheduleDate && scheduleTime ? `${scheduleDate}T${scheduleTime}` : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPublishError(data.error || 'Post failed. Check your connections in Settings.');
        setPublishing(false);
        return;
      }
      setPublishResults(data.results || {});
      setPublished(true);
      loadPosts();
    } catch(e) {
      setPublishError('Post failed. Please try again.');
    } finally {
      setPublishing(false);
    }
  }

  function reset() {
    setStep('type'); setContentType(null); setSelectedPlatforms([]);
    setPostText(''); setPostLink(''); setPostImage(null); setPostVideo(null);
    setScheduleDate(''); setScheduleTime(''); setPublished(false);
  }

  function fmtDate(iso) {
    const d = new Date(iso);
    const diff = (Date.now() - d) / 1000;
    if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
    return d.toLocaleDateString('en-US', { month:'short', day:'numeric' });
  }

  function statusBadge(status) {
    const cfg = {
      live:             { bg:'#dcfce7', color:'#1a6b45', label:'Live' },
      pending_approval: { bg:'#fef9c3', color:'#92690a', label:'Pending TikTok approval' },
      scheduled:        { bg:'#e0f2fe', color:'#0369a1', label:'Scheduled' },
      failed:           { bg:'#fee2e2', color:'#c0392b', label:'Failed' },
    }[status] || { bg:'#f0eeea', color:'#7a7670', label: status };
    return <span style={{ background:cfg.bg, color:cfg.color, fontSize:'.67rem', fontWeight:700, padding:'2px 8px', borderRadius:50 }}>{cfg.label}</span>;
  }

  const inp = { width:'100%', padding:'10px 13px', border:'1.5px solid #e4e0d8', borderRadius:9, fontSize:'.84rem', fontFamily:'inherit', outline:'none', boxSizing:'border-box' };

  if (published) return (
    <div style={{ padding:32, textAlign:'center' }}>
      <div style={{ fontSize:'2.5rem', marginBottom:16 }}>🎉</div>
      <div style={{ fontWeight:700, fontSize:'1.1rem', marginBottom:8 }}>
        {scheduleDate ? 'Post scheduled!' : 'Post submitted!'}
      </div>
      {publishResults && Object.values(publishResults).some(r => r.status === 'error') && (
        <div style={{ maxWidth:420, margin:'0 auto 16px', textAlign:'left' }}>
          {Object.entries(publishResults).map(([plat, r]) => (
            <div key={plat} style={{ display:'flex', justifyContent:'space-between', fontSize:'.78rem', padding:'4px 0', color: r.status==='error' ? '#c0392b' : '#1a6b45' }}>
              <span style={{ textTransform:'capitalize' }}>{plat}</span>
              <span>{r.status === 'error' ? ('Failed: ' + (r.error||'')) : r.status === 'pending_approval' ? 'Pending approval' : 'Posted'}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ fontSize:'.84rem', color:'#7a7670', marginBottom:24, lineHeight:1.65 }}>
        {scheduleDate
          ? `Your post will go live on ${new Date(scheduleDate+'T'+scheduleTime).toLocaleString('en-US',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}.`
          : 'Your post has been sent to the selected platforms. It may take a few minutes to appear.'}
        {selectedPlatforms.includes('tiktok') && (
          <span><br/><strong>TikTok:</strong> Open the TikTok app to review and publish your video from Drafts.</span>
        )}
      </div>
      <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
        <button onClick={reset} style={{ padding:'10px 24px', borderRadius:50, background:'#0a0a0a', color:'white', border:'none', cursor:'pointer', fontWeight:700, fontFamily:'inherit' }}>Create another post</button>
        <button onClick={() => { reset(); setView('history'); }} style={{ padding:'10px 24px', borderRadius:50, background:'white', border:'1.5px solid #e4e0d8', cursor:'pointer', fontWeight:600, fontFamily:'inherit', color:'#4a4a48' }}>View post history</button>
      </div>
    </div>
  );

  return (
    <div style={{ padding:24 }}>
      {/* Top bar */}
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        <button onClick={() => setView('create')} style={{ padding:'8px 18px', borderRadius:50, background: view==='create' ? '#0a0a0a' : 'white', color: view==='create' ? 'white' : '#4a4a48', border:'1.5px solid', borderColor: view==='create' ? '#0a0a0a' : '#e4e0d8', cursor:'pointer', fontWeight:600, fontSize:'.82rem', fontFamily:'inherit' }}>+ Create post</button>
        <button onClick={() => setView('history')} style={{ padding:'8px 18px', borderRadius:50, background: view==='history' ? '#0a0a0a' : 'white', color: view==='history' ? 'white' : '#4a4a48', border:'1.5px solid', borderColor: view==='history' ? '#0a0a0a' : '#e4e0d8', cursor:'pointer', fontWeight:600, fontSize:'.82rem', fontFamily:'inherit' }}>Post history</button>
      </div>

      {/* POST HISTORY VIEW */}
      {view === 'history' && (
        <div>
          {posts.length === 0 ? (
            <div style={{ padding: 16 }}>
              <EmptyState compact title="No posts yet"
                description="Create your first post and it will publish to every connected platform at once." />
            </div>
          ) : posts.map(post => {
            const platforms = SOCIAL_PLATFORMS.filter(p => post.platforms.includes(p.id));
            return (
              <div key={post.id} style={{ background:'white', border:'1px solid #e4e0d8', borderRadius:12, padding:'16px 20px', marginBottom:12 }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'.875rem', color:'#0a0a0a', lineHeight:1.6, marginBottom:10 }}>{post.text}</div>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
                      {platforms.map(p => (
                        <span key={p.id} style={{ display:'flex', alignItems:'center', gap:4, background: p.color+'18', color:p.color, fontSize:'.72rem', fontWeight:700, padding:'3px 9px', borderRadius:50 }}>
                          {p.icon} {p.name}
                          {post.platform_statuses?.[p.id] && (
                            <span style={{ opacity:.7 }}>· {post.platform_statuses[p.id] === 'live' ? 'Live' : post.platform_statuses[p.id] === 'pending_approval' ? 'Pending' : post.platform_statuses[p.id]}</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    {statusBadge(post.status)}
                    <div style={{ fontSize:'.73rem', color:'#7a7670', marginTop:6 }}>{fmtDate(post.published_at)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE POST FLOW */}
      {view === 'create' && (
        <div style={{ maxWidth:680 }}>
          {/* Step indicator */}
          <div style={{ display:'flex', gap:4, marginBottom:24, alignItems:'center' }}>
            {[['type','1','Content type'],['platforms','2','Platforms'],['compose','3','Write post'],['confirm','4','Review & post']].map(([s,n,label],i,arr) => {
              const steps = ['type','platforms','compose','confirm'];
              const idx = steps.indexOf(step);
              const thisIdx = steps.indexOf(s);
              const done = thisIdx < idx;
              const active = s === step;
              return (
                <React.Fragment key={s}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ width:26, height:26, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.72rem', fontWeight:800, background: done ? '#0a0a0a' : active ? '#f5c842' : '#f0eeea', color: done ? 'white' : active ? '#0a0a0a' : '#7a7670' }}>
                      {done ? '✓' : n}
                    </div>
                    <span style={{ fontSize:'.75rem', fontWeight: active ? 700 : 500, color: active ? '#0a0a0a' : '#7a7670' }}>{label}</span>
                  </div>
                  {i < arr.length-1 && <div style={{ flex:1, height:1, background:'#e4e0d8', minWidth:16 }} />}
                </React.Fragment>
              );
            })}
          </div>

          {/* STEP 1: Content type */}
          {step === 'type' && (
            <div>
              <div style={{ fontWeight:700, fontSize:'.95rem', marginBottom:6 }}>What type of content are you posting?</div>
              <div style={{ fontSize:'.82rem', color:'#7a7670', marginBottom:16 }}>Your selection will determine which platforms are available.</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {CONTENT_TYPES.map(ct => (
                  <div key={ct.id} onClick={() => setContentType(ct.id)}
                    style={{ padding:'14px 16px', border:'1.5px solid', borderRadius:12, cursor:'pointer', display:'flex', alignItems:'center', gap:14, transition:'all .12s',
                      borderColor: contentType===ct.id ? '#0a0a0a' : '#e4e0d8',
                      background: contentType===ct.id ? '#0a0a0a' : 'white' }}>
                    <span style={{ fontSize:'1.3rem' }}>{ct.icon}</span>
                    <div>
                      <div style={{ fontWeight:700, fontSize:'.875rem', color: contentType===ct.id ? 'white' : '#0a0a0a' }}>{ct.label}</div>
                      <div style={{ fontSize:'.75rem', color: contentType===ct.id ? 'rgba(255,255,255,.7)' : '#7a7670', marginTop:2 }}>{ct.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <KitButton disabled={!contentType} onClick={() => setStep('platforms')} variant="dark" style={{ marginTop:20 }}>
                Next: Choose platforms →
              </KitButton>
            </div>
          )}

          {/* STEP 2: Platform selector */}
          {step === 'platforms' && (
            <div>
              <div style={{ fontWeight:700, fontSize:'.95rem', marginBottom:6 }}>Select platforms to post to</div>
              <div style={{ fontSize:'.82rem', color:'#7a7670', marginBottom:16 }}>Greyed out platforms don't support your content type.</div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {compatiblePlatforms().map(p => {
                  const isSelected = selectedPlatforms.includes(p.id);
                  const disabled = !p.compatible;
                  return (
                    <div key={p.id} onClick={() => !disabled && togglePlatform(p.id)}
                      style={{ padding:'14px 16px', border:'1.5px solid', borderRadius:12,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? .45 : 1, transition:'all .12s',
                        borderColor: isSelected ? p.color : '#e4e0d8',
                        background: isSelected ? p.color+'12' : 'white' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        {/* Checkbox */}
                        <div style={{ width:20, height:20, borderRadius:5, border:'2px solid', flexShrink:0,
                          borderColor: isSelected ? p.color : '#c8c4bc',
                          background: isSelected ? p.color : 'white',
                          display:'flex', alignItems:'center', justifyContent:'center' }}>
                          {isSelected && <span style={{ color:'white', fontSize:'.65rem', fontWeight:900 }}>✓</span>}
                        </div>
                        <span style={{ fontSize:'1.2rem' }}>{p.icon}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:700, fontSize:'.875rem' }}>{p.name}</div>
                          {disabled && p.unsupported_reason && (
                            <div style={{ fontSize:'.73rem', color:'#7a7670', marginTop:2 }}>
                              ⊘ {p.unsupported_reason}
                            </div>
                          )}
                          {p.id === 'tiktok' && isSelected && (
                            <div style={{ fontSize:'.73rem', color:'#92690a', marginTop:2 }}>
                              ⚠ Videos go to TikTok Drafts — you'll approve from the TikTok app
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display:'flex', gap:8, marginTop:20 }}>
                <button onClick={() => setStep('type')} style={{ padding:'11px 20px', borderRadius:50, background:'white', border:'1.5px solid #e4e0d8', cursor:'pointer', fontWeight:600, fontSize:'.875rem', fontFamily:'inherit', color:'#4a4a48' }}>← Back</button>
                <KitButton disabled={selectedPlatforms.length === 0} onClick={() => setStep('compose')} variant="dark">
                  Next: Write your post →
                </KitButton>
              </div>
            </div>
          )}

          {/* STEP 3: Compose */}
          {step === 'compose' && (
            <div>
              <div style={{ fontWeight:700, fontSize:'.95rem', marginBottom:16 }}>Write your post</div>

              {/* Platform char limit hints */}
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
                {selectedPlatforms.map(pid => {
                  const p = SOCIAL_PLATFORMS.find(x => x.id === pid);
                  const limits = { facebook:'63,206 chars', instagram:'2,200 chars', linkedin:'3,000 chars', google:'1,500 chars', tiktok:'2,200 chars' };
                  return (
                    <span key={pid} style={{ fontSize:'.68rem', background: p.color+'18', color:p.color, padding:'2px 8px', borderRadius:50, fontWeight:600 }}>
                      {p.icon} {p.name} · {limits[pid]}
                    </span>
                  );
                })}
              </div>

              {/* Post text */}
              <div style={{ marginBottom:16 }}>
                <label style={{ display:'block', fontSize:'.72rem', fontWeight:700, color:'#7a7670', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>Post text</label>
                <textarea rows={6} value={postText} onChange={e => setPostText(e.target.value)}
                  placeholder="Write your post here…"
                  style={{ ...inp, resize:'vertical' }} />
                <div style={{ fontSize:'.7rem', color:'#7a7670', textAlign:'right', marginTop:4 }}>{postText.length} characters</div>
              </div>

              {/* Link field */}
              {(contentType === 'link') && (
                <div style={{ marginBottom:16 }}>
                  <label style={{ display:'block', fontSize:'.72rem', fontWeight:700, color:'#7a7670', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>URL</label>
                  <input type="url" value={postLink} onChange={e => setPostLink(e.target.value)}
                    placeholder="https://" style={{ ...inp }} />
                </div>
              )}

              {/* Image upload */}
              {(contentType === 'text_image') && (
                <div style={{ marginBottom:16 }}>
                  <label style={{ display:'block', fontSize:'.72rem', fontWeight:700, color:'#7a7670', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>Image</label>
                  <div style={{ border:'2px dashed #e4e0d8', borderRadius:12, padding:'24px', textAlign:'center', cursor:'pointer', background:'#f8f7f4' }}
                    onClick={() => document.getElementById('img-upload').click()}>
                    {postImage ? (
                      <div>
                        <img src={URL.createObjectURL(postImage)} alt="" style={{ maxHeight:120, maxWidth:'100%', borderRadius:8, objectFit:'contain' }} />
                        <div style={{ fontSize:'.75rem', color:'#7a7670', marginTop:8 }}>{postImage.name}</div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize:'1.5rem', marginBottom:8 }}>🖼</div>
                        <div style={{ fontSize:'.82rem', color:'#7a7670' }}>Click to upload an image</div>
                        <div style={{ fontSize:'.72rem', color:'#c8c4bc', marginTop:4 }}>JPG, PNG or GIF · Max 10MB</div>
                      </div>
                    )}
                    <input id="img-upload" type="file" accept="image/*" style={{ display:'none' }}
                      onChange={e => setPostImage(e.target.files[0])} />
                  </div>
                </div>
              )}

              {/* Video upload */}
              {(contentType === 'video' || contentType === 'reel') && (
                <div style={{ marginBottom:16 }}>
                  <label style={{ display:'block', fontSize:'.72rem', fontWeight:700, color:'#7a7670', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>Video file</label>
                  <div style={{ border:'2px dashed #e4e0d8', borderRadius:12, padding:'24px', textAlign:'center', cursor:'pointer', background:'#f8f7f4' }}
                    onClick={() => document.getElementById('vid-upload').click()}>
                    {postVideo ? (
                      <div>
                        <div style={{ fontSize:'1.5rem', marginBottom:8 }}>🎬</div>
                        <div style={{ fontSize:'.82rem', fontWeight:600 }}>{postVideo.name}</div>
                        <div style={{ fontSize:'.72rem', color:'#7a7670', marginTop:4 }}>{(postVideo.size/1024/1024).toFixed(1)} MB</div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize:'1.5rem', marginBottom:8 }}>🎬</div>
                        <div style={{ fontSize:'.82rem', color:'#7a7670' }}>Click to upload a video</div>
                        <div style={{ fontSize:'.72rem', color:'#c8c4bc', marginTop:4 }}>MP4 or MOV · Max 500MB</div>
                      </div>
                    )}
                    <input id="vid-upload" type="file" accept="video/*" style={{ display:'none' }}
                      onChange={e => setPostVideo(e.target.files[0])} />
                  </div>
                </div>
              )}

              {/* Schedule */}
              <div style={{ background:'#f8f7f4', borderRadius:12, padding:'14px 16px', marginBottom:16 }}>
                <div style={{ fontWeight:600, fontSize:'.82rem', marginBottom:10 }}>Schedule (optional)</div>
                <div style={{ display:'flex', gap:10 }}>
                  <div style={{ flex:1 }}>
                    <label style={{ display:'block', fontSize:'.7rem', color:'#7a7670', marginBottom:4 }}>Date</label>
                    <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      style={{ ...inp }} />
                  </div>
                  <div style={{ flex:1 }}>
                    <label style={{ display:'block', fontSize:'.7rem', color:'#7a7670', marginBottom:4 }}>Time</label>
                    <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
                      style={{ ...inp }} />
                  </div>
                </div>
                {!scheduleDate && <div style={{ fontSize:'.72rem', color:'#7a7670', marginTop:8 }}>Leave blank to post immediately.</div>}
              </div>

              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => setStep('platforms')} style={{ padding:'11px 20px', borderRadius:50, background:'white', border:'1.5px solid #e4e0d8', cursor:'pointer', fontWeight:600, fontSize:'.875rem', fontFamily:'inherit', color:'#4a4a48' }}>← Back</button>
                <KitButton disabled={!postText.trim()} onClick={() => setStep('confirm')} variant="dark">
                  Next: Review →
                </KitButton>
              </div>
            </div>
          )}

          {/* STEP 4: Confirm & publish */}
          {step === 'confirm' && (
            <div>
              <div style={{ fontWeight:700, fontSize:'.95rem', marginBottom:16 }}>Review your post</div>

              {/* Preview */}
              <div style={{ background:'#f8f7f4', borderRadius:14, padding:'18px 20px', marginBottom:20 }}>
                <div style={{ fontSize:'.875rem', color:'#0a0a0a', lineHeight:1.7, marginBottom:14, whiteSpace:'pre-wrap' }}>{postText}</div>
                {postLink && <div style={{ fontSize:'.78rem', color:'#1a4baa', marginBottom:10 }}>🔗 {postLink}</div>}
                {postImage && <img src={URL.createObjectURL(postImage)} alt="" style={{ maxHeight:160, borderRadius:8, objectFit:'cover' }} />}
                {postVideo && <div style={{ fontSize:'.82rem', color:'#7a7670' }}>🎬 {postVideo.name}</div>}
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:14 }}>
                  {selectedPlatforms.map(pid => {
                    const p = SOCIAL_PLATFORMS.find(x => x.id === pid);
                    return (
                      <span key={pid} style={{ fontSize:'.72rem', background:p.color+'18', color:p.color, padding:'3px 9px', borderRadius:50, fontWeight:700 }}>
                        {p.icon} {p.name}
                      </span>
                    );
                  })}
                </div>
                {scheduleDate && (
                  <div style={{ marginTop:12, fontSize:'.78rem', color:'#0369a1', fontWeight:600 }}>
                    🕐 Scheduled for {new Date(scheduleDate+'T'+scheduleTime).toLocaleString('en-US',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}
                  </div>
                )}
              </div>

              {/* TikTok notice */}
              {selectedPlatforms.includes('tiktok') && (
                <div style={{ background:'#fef9c3', border:'1px solid #fde68a', borderRadius:10, padding:'12px 14px', marginBottom:16, fontSize:'.8rem', color:'#92690a', lineHeight:1.65 }}>
                  <strong>TikTok:</strong> Your video will be sent to your TikTok Drafts folder. Open the TikTok app to review and publish it. This is required by TikTok's API.
                </div>
              )}

              {publishError && (
                <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:10, padding:'12px 14px', marginBottom:16, fontSize:'.8rem', color:'#c0392b', lineHeight:1.6 }}>
                  ✗ {publishError}
                </div>
              )}

              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => setStep('compose')} style={{ padding:'11px 20px', borderRadius:50, background:'white', border:'1.5px solid #e4e0d8', cursor:'pointer', fontWeight:600, fontSize:'.875rem', fontFamily:'inherit', color:'#4a4a48' }}>← Edit</button>
                <KitButton onClick={publish} disabled={publishing} style={{ flex:1, fontSize:'.95rem' }}>
                  {publishing ? 'Publishing…' : scheduleDate ? '🕐 Schedule post' : '🚀 Publish now'}
                </KitButton>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


export default function Campaigns() {
  const { customer } = useAuth();
  const smsGate = useSmsGate();
  const [tab, setTab]       = useState('list');
  const [campaigns, setCampaigns] = useState([]);
  const [usage, setUsage]   = useState({ used: 0, limit: 1000 });
  const [segments, setSegments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [name, setName]     = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => { if (customer) loadData(); }, [customer]);

  async function loadData() {
    try {
      const [campRes, usageRes] = await Promise.all([
        axios.get(`${API}/campaigns`, { headers: authHeaders() }),
        axios.get(`${API}/campaigns/usage`, { headers: authHeaders() }),
      ]);
      setCampaigns(campRes.data.campaigns || []);
      if (usageRes.data.usage) setUsage(usageRes.data.usage);
      // Segments are shared with Grow (contacts.segment) — load them for the Segments tab.
      axios.get(`${API}/contacts`, { headers: authHeaders() })
        .then(r => setSegments(r.data.segments || []))
        .catch(() => {});
    } catch (e) { console.error(e); }
  }

  async function launch() {
    if (!name.trim() || !message.trim()) return;
    setSending(true);
    try {
      await axios.post(`${API}/campaigns`, { name, message }, { headers: authHeaders() });
      setShowModal(false); setName(''); setMessage('');
      loadData();
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  }

  const statusColor = (s) => ({ sent: ['#e8f5ef','#1a6b45'], scheduled: ['#fff8e8','#92690a'], draft: ['#f0eeea','#7a7670'], sending: ['#e8f0fe','#1a4baa'] }[s] || ['#f0eeea','#7a7670']);

  return (
    <DashboardLayout title="SMS Campaigns">
      <div style={{ padding: '16px 24px 0' }}><SmsGateBanner feature="SMS campaigns" enabled={smsGate.enabled} loading={smsGate.loading} liveDate={smsGate.liveDate} style={{ marginBottom: 0 }} /></div>
      <div style={{ background: 'white', borderBottom: '1px solid #e4e0d8', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 2 }} className="tabs-scrollable">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '14px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '.84rem', fontWeight: tab === t.id ? 700 : 500, fontFamily: 'inherit', color: tab === t.id ? '#0a0a0a' : '#7a7670', borderBottom: tab === t.id ? '2px solid #0a0a0a' : '2px solid transparent' }}>{t.label}</button>
          ))}
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: '8px 18px', borderRadius: 50, background: '#0a0a0a', color: 'white', border: 'none', cursor: 'pointer', fontSize: '.82rem', fontWeight: 700, fontFamily: 'inherit', marginRight: 24 }}>+ New Campaign</button>
      </div>

      <div style={{ padding: 24 }}>
        {tab === 'list' && (
          <>
            <UsageMeter used={usage.used ?? usage.sms_sent ?? 0}
      limit={usage.limit ?? usage.sms_limit ?? 1000} resetAt={usage.resetAt} />
            <div className="m-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
              <StatCard label="Total sent" value={(usage.total_sent ?? 0).toLocaleString()} sub="Across all campaigns" />
              <StatCard label="Campaigns sent" value={(usage.total_campaigns ?? 0).toLocaleString()} sub="Completed campaigns" />
              <StatCard label="SMS remaining" value={Math.max(0, (usage.limit ?? 1000) - (usage.used ?? 0)).toLocaleString()} sub={"of " + (usage.limit ?? 1000).toLocaleString() + " this month"} />
              <StatCard label="Replies" value={(usage.total_replies ?? 0).toLocaleString()} sub="Across all campaigns" />
            </div>
            <Card style={{ overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #e4e0d8', fontWeight: 600, fontSize: '.875rem' }}>All campaigns</div>
              {campaigns.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#7a7670', fontSize: '.875rem' }}>
                  No campaigns yet — create your first one to start reaching customers.
                </div>
              ) : campaigns.map(c => {
                const [bg, color] = statusColor(c.status);
                return (
                  <div key={c.id} style={{ padding: '14px 20px', borderBottom: '1px solid #f8f7f4', display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 3 }}>{c.name}</div>
                      <div style={{ fontSize: '.75rem', color: '#7a7670' }}>{c.total_recipients ? `${c.total_recipients} recipients` : 'Draft'} · {new Date(c.created_at).toLocaleDateString()}</div>
                    </div>
                    <span style={{ background: bg, color, fontSize: '.67rem', fontWeight: 700, padding: '2px 9px', borderRadius: 50 }}>{c.status}</span>
                  </div>
                );
              })}
            </Card>
          </>
        )}

        {tab === 'contacts' && (
          <div style={{ textAlign: 'center', padding: 60, color: '#7a7670' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>📋</div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Contact management</div>
            <div style={{ fontSize: '.875rem' }}>Contacts are imported via CSV or collected automatically from surveys, webchat, and review requests.</div>
          </div>
        )}

        {tab === 'segments' && (
          <div style={{ maxWidth: 640 }}>
            <div style={{ fontWeight: 600, fontSize: '.95rem', marginBottom: 4 }}>Audience segments</div>
            <div style={{ fontSize: '.84rem', color: '#7a7670', lineHeight: 1.6, marginBottom: 16 }}>
              Segments are shared across SwarmReply — tag contacts in Grow › Bulk Send and target them here in your campaigns.
            </div>
            {segments.filter(s => s.id !== 'all').length === 0 ? (
              <Card style={{ padding: 28, textAlign: 'center', color: '#7a7670' }}>
                <div style={{ fontSize: '1.4rem', marginBottom: 8 }}>🎯</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No segments yet</div>
                <div style={{ fontSize: '.84rem' }}>Create one in <strong>Grow › Bulk Send</strong> by selecting contacts and adding them to a segment.</div>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {segments.filter(s => s.id !== 'all').map(s => (
                  <Card key={s.id} style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 600, fontSize: '.88rem', textTransform: 'capitalize' }}>{s.id}</div>
                    <span style={{ fontSize: '.74rem', color: '#7a7670', background: '#f0eeea', padding: '3px 10px', borderRadius: 50 }}>{s.count} contact{s.count !== 1 ? 's' : ''}</span>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'compliance' && (
          <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Card style={{ padding: 20, borderLeft: '4px solid #1a6b45' }}>
              <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 12 }}>What SwarmReply handles automatically</div>
              {['STOP opt-outs processed instantly and permanently','Global opt-out registry — applies across all campaigns','Send window enforced — 9am–8pm in your timezone (TCPA)','Carrier opt-outs caught and recorded automatically','Re-opt-in via START reply supported'].map(item => (
                <div key={item} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: '.84rem', lineHeight: 1.6 }}>
                  <span style={{ color: '#1a6b45', fontWeight: 700, flexShrink: 0 }}>✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </Card>
            <Card style={{ padding: 20, borderLeft: '4px solid #f59e0b' }}>
              <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 12 }}>Your responsibility</div>
              {['Only send to customers who have given prior consent','Identify your business in every message','Keep a record of when and how each contact consented'].map(item => (
                <div key={item} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: '.84rem', lineHeight: 1.6 }}>
                  <span style={{ color: '#f59e0b', fontWeight: 700, flexShrink: 0 }}>!</span>
                  <span>{item}</span>
                </div>
              ))}
            </Card>
          </div>
        )}
      </div>

      {/* New campaign modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 520, boxShadow: '0 24px 80px rgba(0,0,0,.2)' }}>
            <div style={{ padding: '22px 28px', borderBottom: '1px solid #e4e0d8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', fontWeight: 900 }}>New SMS campaign</div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#7a7670' }}>✕</button>
            </div>
            <div style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '.67rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 5 }}>Campaign name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Weekend special" style={{ width: '100%', padding: '10px 13px', border: '1.5px solid #e4e0d8', borderRadius: 10, fontSize: '.9rem', fontFamily: 'inherit', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '.67rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7a7670', marginBottom: 5 }}>
                  Message <span style={{ fontWeight: 400, color: message.length > 140 ? '#c0392b' : '#7a7670' }}>{message.length}/160</span>
                </label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} placeholder="Hi [name]! This weekend only..." style={{ width: '100%', padding: '10px 13px', border: '1.5px solid #e4e0d8', borderRadius: 10, fontSize: '.875rem', fontFamily: 'inherit', outline: 'none', resize: 'none', lineHeight: 1.6 }} />
                <div style={{ fontSize: '.73rem', color: '#7a7670', marginTop: 4 }}>Use [name] to personalise. Include "Reply STOP to unsubscribe."</div>
              </div>
            </div>
            <div style={{ padding: '16px 28px 22px', display: 'flex', gap: 10, borderTop: '1px solid #e4e0d8' }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: 11, borderRadius: 50, background: 'transparent', color: '#7a7670', border: '1.5px solid #e4e0d8', cursor: 'pointer', fontSize: '.875rem', fontWeight: 600, fontFamily: 'inherit' }}>Save draft</button>
              <button onClick={launch} disabled={sending || !name.trim() || !message.trim() || (!smsGate.enabled && !smsGate.loading)} style={{ flex: 1, padding: 11, borderRadius: 50, background: '#0a0a0a', color: 'white', border: 'none', cursor: 'pointer', fontSize: '.875rem', fontWeight: 700, fontFamily: 'inherit', opacity: !name.trim() || !message.trim() ? .5 : 1 }}>
                {(!smsGate.enabled && !smsGate.loading) ? 'SMS goes live soon' : sending ? 'Sending…' : 'Send campaign →'}
              </button>
            </div>
          </div>
        </div>
      )}
      {tab === 'social' && <SocialPostsTab />}
    </DashboardLayout>
  );
}
