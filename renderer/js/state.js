/* ================================================
   STATE.JS — État global + persistence + UI utils
   Données sauvegardées sur Firebase (si connecté)
   sinon fallback electron-store local
   ================================================ */
'use strict';

const state = {
  tokens: 0, lifetimeTokens: 0, totalMinutes: 0,
  streak: 0, lastStudyDate: '',
  sessions: [], rewards: [], redeemedCount: {},
  settings: {
    minutesPerToken: 10,
    theme: 'cosmos',
    zoom: 1.0,
    notifications: { daily:true, break:true, streak:true },
    subjects: [...SUBJECTS_DEFAULT],
  },
  currentPage: 'timer',
  activeMultiplier: 1,
  multiplierLabel: '',
  timer: null,
};

// ── Chargement ────────────────────────────────
async function loadState() {
  const keys = ['tokens','lifetimeTokens','totalMinutes','streak','lastStudyDate','sessions','rewards','redeemedCount','settings'];

  // Essayer Firebase d'abord
  let cloudData = null;
  if (fb.ready && fb.user) {
    cloudData = await fbLoadUserData();
  }

  if (cloudData) {
    // Données du cloud
    for (const key of keys) {
      if (cloudData[key] !== undefined && cloudData[key] !== null) {
        if (key === 'settings') {
          state.settings = { ...state.settings, ...cloudData[key] };
          if (!state.settings.subjects?.length) state.settings.subjects = [...SUBJECTS_DEFAULT];
        } else {
          state[key] = cloudData[key];
        }
      }
    }
  } else {
    // Fallback electron-store local
    for (const key of keys) {
      const val = await api.store.get(key, null);
      if (val !== null && val !== undefined) {
        if (key === 'settings') {
          state.settings = { ...state.settings, ...val };
          if (!state.settings.subjects?.length) state.settings.subjects = [...SUBJECTS_DEFAULT];
        } else {
          state[key] = val;
        }
      }
    }
  }

  if (!state.rewards?.length) state.rewards = JSON.parse(JSON.stringify(DEFAULT_REWARDS));
}

// ── Sauvegarde ────────────────────────────────
async function saveField(key, value) {
  // Sauvegarder sur Firebase si connecté
  if (fb.ready && fb.user) {
    await fbSaveUserData(key, value);
  } else {
    await api.store.set(key, value);
  }
}

// ── UI Utilities ──────────────────────────────
function showToast(msg, type = 'teal', duration = 3000) {
  const icons = { teal:'✨', success:'✅', error:'❌' };
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type]||'•'}</span><span class="toast-msg">${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity='0'; el.style.transform='translateX(26px)'; el.style.transition='all .3s';
    setTimeout(()=>el.remove(),300);
  }, duration);
}

function fmt(seconds) {
  const h=Math.floor(seconds/3600), m=Math.floor((seconds%3600)/60), s=seconds%60;
  const pad=n=>String(n).padStart(2,'0');
  return h>0?`${pad(h)}:${pad(m)}:${pad(s)}`:`${pad(m)}:${pad(s)}`;
}
function fmtDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'});
}
function todayStr() { return new Date().toISOString().split('T')[0]; }

function updateSidebarTokens() {
  const numEl   = document.getElementById('sidebar-tokens-num');
  const streakEl = document.getElementById('sidebar-streak');
  if (numEl)   numEl.textContent = state.tokens;
  if (streakEl) streakEl.textContent = state.streak>0?`🔥 ${state.streak} jour${state.streak>1?'s':''}`:'' ;
  document.querySelector('.multiplier-badge')?.remove();
  const box = document.querySelector('.sidebar-tokens-box');
  if (box && state.activeMultiplier>1) {
    const badge=document.createElement('div'); badge.className='multiplier-badge';
    badge.textContent=state.multiplierLabel||`⚡ x${state.activeMultiplier}`;
    box.appendChild(badge);
  }
}

function updateSidebarMultiplier() {
  updateSidebarTokens();
}

// ── Calculs ───────────────────────────────────
function getCurrentPalierIndex() {
  for (let i=PALIERS.length-1;i>=0;i--) { if (state.lifetimeTokens>=PALIERS[i].tokens) return i; }
  return 0;
}
function getNextPalier() {
  const idx=getCurrentPalierIndex();
  return idx<PALIERS.length-1?PALIERS[idx+1]:null;
}
function getMonthKey() {
  const d=new Date(); return `${d.getFullYear()}-${d.getMonth()+1}`;
}

async function awardToken() {
  const factor=Math.max(1,state.activeMultiplier||1);
  state.tokens+=factor; state.lifetimeTokens+=factor;
  await saveField('tokens',state.tokens);
  await saveField('lifetimeTokens',state.lifetimeTokens);
  updateSidebarTokens();
  const el=document.createElement('div'); el.className='token-pop';
  el.textContent=factor>1?`+${factor} 🪙`:'+1 🪙';
  el.style.cssText=`left:${Math.random()*200+100}px;top:${Math.random()*100+200}px`;
  document.body.appendChild(el); setTimeout(()=>el.remove(),1100);
}

// ── Streak ────────────────────────────────────
async function updateStreak() {
  const today=todayStr();
  if (state.lastStudyDate===today) return;
  const yesterday=new Date(Date.now()-86400000).toISOString().split('T')[0];
  state.streak=state.lastStudyDate===yesterday?state.streak+1:1;
  state.lastStudyDate=today;
  await saveField('streak',state.streak);
  await saveField('lastStudyDate',state.lastStudyDate);
}

// ── Annonces GitHub ───────────────────────────
async function fetchAnnouncements() {
  // Source unique : Firebase — plus de fichier GitHub
  if (!fb.ready || !fb.db) return;
  try {
    await _fetchAnnouncementsFromFirebase();
  } catch(e) {
    console.warn('[Announcements] Erreur Firebase:', e.message);
  }
}

async function _fetchAnnouncementsFromFirebase() {
  try {
    // Charger l'annonce active
    const annSnap = await fb.db.collection('appConfig').doc('announcement').get();
    const ann = annSnap.exists ? annSnap.data() : null;

    // Charger le multiplicateur
    const multSnap = await fb.db.collection('appConfig').doc('multiplier').get();
    const mult = multSnap.exists ? multSnap.data() : null;

    // Charger le changelog
    const clSnap = await fb.db.collection('appConfig').doc('changelog').get();
    const clVersions = clSnap.exists ? clSnap.data()?.versions : null;
    const latestCl = clVersions?.[0] || null;

    // Appliquer
    if (ann?.active && ann?.title) {
      const annId = ann.publishedAt || ann.title;
      const seen = await api.store.get('lastSeenAnnouncement', '');
      if (seen !== annId) showGlobalAnnouncement({ ...ann, id: annId });
    }

    if (mult?.active) {
      const until = mult.until ? new Date(mult.until) : null;
      if (!until || until > new Date()) {
        state.activeMultiplier = mult.factor || 1;
        state.multiplierLabel = mult.label || '';
        updateSidebarTokens();
      }
    }

    if (latestCl?.version) {
      const seen = await api.store.get('lastSeenChangelog', '');
      if (seen !== latestCl.version) {
        showChangelogModal(latestCl);
        await api.store.set('lastSeenChangelog', latestCl.version);
      }
    }

    // Vérifier maintenance
    const accessSnap = await fb.db.collection('appConfig').doc('access').get();
    if (accessSnap.exists) {
      const access = accessSnap.data();
      if (access.maintenance && getRoleLevel(fb.profile?.role) < 4) {
        showMaintenanceScreen(access.maintenanceMsg);
      }
    }
  } catch(e) {
    console.warn('[Firebase Announcements]', e.message);
  }
}

async function _applyAnnouncementData(data) {
  window._adminRemoteData = data;
  const ann = data.announcement;
  if (ann?.active && ann?.id) {
    const seen = await api.store.get('lastSeenAnnouncement', '');
    if (seen !== ann.id) showGlobalAnnouncement(ann);
  }
  if (data.multiplier?.active) {
    const until = data.multiplier.until ? new Date(data.multiplier.until) : null;
    if (!until || until > new Date()) {
      state.activeMultiplier = data.multiplier.factor;
      state.multiplierLabel = data.multiplier.label;
      updateSidebarTokens();
    }
  }
}

function showMaintenanceScreen(msg) {
  // ── Inject inline CSS (no dependency on pixel-theme.css) ──
  if (!document.getElementById('mx-inline-style')) {
    const style = document.createElement('style');
    style.id = 'mx-inline-style';
    style.textContent = `
      #maintenance-screen{position:fixed;inset:0;z-index:99999;background:#030008;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;font-family:'Press Start 2P',monospace}
      #maintenance-screen::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 100% 60% at 50% 0%,#1a004d 0%,transparent 60%),radial-gradient(ellipse 60% 40% at 20% 100%,#001a4d 0%,transparent 50%),radial-gradient(ellipse 40% 30% at 80% 80%,#2d0036 0%,transparent 50%),linear-gradient(180deg,#08001a 0%,#030008 60%,#000508 100%)}
      #maintenance-screen::after{content:'';position:absolute;bottom:0;left:0;right:0;height:45%;background-image:linear-gradient(rgba(80,0,180,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(80,0,180,.12) 1px,transparent 1px);background-size:40px 40px;transform:perspective(400px) rotateX(30deg);transform-origin:bottom center}
      .mx-stars{position:absolute;inset:0;pointer-events:none}
      .mx-star{position:absolute;background:#fff;border-radius:50%;animation:mx-twinkle var(--dur,3s) ease-in-out infinite;animation-delay:var(--del,0s)}
      @keyframes mx-twinkle{0%,100%{opacity:.1;transform:scale(1)}50%{opacity:1;transform:scale(1.5)}}
      .mx-city{position:absolute;bottom:80px;left:0;right:0;display:flex;align-items:flex-end;justify-content:center;pointer-events:none}
      .mx-content{position:relative;z-index:10;text-align:center;margin-bottom:80px}
      .mx-badge{display:inline-block;font-family:'Press Start 2P',monospace;font-size:9px;color:#ffdd00;background:rgba(255,220,0,.08);border:2px solid #ffdd00;padding:6px 16px;letter-spacing:3px;text-transform:uppercase;box-shadow:3px 3px 0 rgba(255,220,0,.3),0 0 20px rgba(255,220,0,.2);margin-bottom:28px;animation:mx-badge-pulse 2s ease-in-out infinite}
      @keyframes mx-badge-pulse{0%,100%{box-shadow:3px 3px 0 rgba(255,220,0,.3),0 0 20px rgba(255,220,0,.15)}50%{box-shadow:3px 3px 0 rgba(255,220,0,.5),0 0 35px rgba(255,220,0,.35)}}
      .mx-title{font-family:'Press Start 2P',monospace;font-size:clamp(14px,2.5vw,28px);color:#fff;text-shadow:0 0 20px rgba(200,0,255,.8),0 0 40px rgba(200,0,255,.4),3px 3px 0 rgba(0,0,0,.9);letter-spacing:3px;line-height:1.6;margin-bottom:20px;animation:mx-flicker 8s ease-in-out infinite}
      @keyframes mx-flicker{0%,95%,97%,100%{opacity:1}96%{opacity:.7}98%{opacity:.9}}
      .mx-subtitle{font-family:'VT323',monospace;font-size:clamp(16px,2vw,22px);color:rgba(180,140,255,.7);letter-spacing:1px;max-width:460px;line-height:1.6;margin:0 auto 36px}
      .mx-msg-box{position:relative;background:rgba(10,0,30,.8);border:2px solid rgba(150,0,255,.5);padding:20px 32px;max-width:500px;margin:0 auto;backdrop-filter:blur(12px);box-shadow:4px 4px 0 rgba(150,0,255,.25),0 0 30px rgba(150,0,255,.15)}
      .mx-msg-text{font-family:'VT323',monospace;font-size:20px;color:rgba(220,190,255,.85);line-height:1.6;letter-spacing:.5px}
      .mx-dots{display:flex;gap:10px;justify-content:center;margin-top:24px}
      .mx-dot{width:8px;height:8px;background:#00ffcc;box-shadow:0 0 8px #00ffcc;animation:mx-dot-pulse 1.2s ease-in-out infinite}
      .mx-dot:nth-child(2){animation-delay:.2s;background:#cc00ff;box-shadow:0 0 8px #cc00ff}
      .mx-dot:nth-child(3){animation-delay:.4s;background:#ff0080;box-shadow:0 0 8px #ff0080}
      .mx-dot:nth-child(4){animation-delay:.6s;background:#ffdd00;box-shadow:0 0 8px #ffdd00}
      @keyframes mx-dot-pulse{0%,100%{transform:scaleY(1);opacity:.4}50%{transform:scaleY(2.5);opacity:1}}
      .mx-particle{position:absolute;width:4px;height:4px;pointer-events:none;animation:mx-float var(--dur,6s) linear infinite;animation-delay:var(--del,0s);opacity:0}
      @keyframes mx-float{0%{transform:translateY(100vh) rotate(0deg);opacity:0}10%{opacity:.8}90%{opacity:.6}100%{transform:translateY(-20vh) rotate(360deg);opacity:0}}
      .mx-bypass-hint{font-family:'VT323',monospace;font-size:13px;color:rgba(80,60,120,.4);margin-top:20px;cursor:default;letter-spacing:1px;transition:color .3s}
      .mx-bypass-hint:hover{color:rgba(150,100,255,.6)}
      .mx-bypass-form{display:none;margin-top:16px;text-align:center}
      .mx-bypass-form.visible{display:block}
      .mx-bypass-input{background:rgba(0,0,0,.5);border:1px solid rgba(150,0,255,.4);color:#e0d0ff;padding:8px 16px;font-size:14px;letter-spacing:3px;text-align:center;outline:none;width:220px;font-family:'VT323',monospace}
      .mx-bypass-btn{background:rgba(150,0,255,.15);border:1px solid rgba(150,0,255,.4);color:#cc00ff;padding:8px 20px;cursor:pointer;font-size:12px;margin-top:8px;font-family:'VT323',monospace;display:block;width:100%;letter-spacing:2px;transition:all .2s}
      .mx-bypass-btn:hover{background:rgba(150,0,255,.3)}
      .mx-bypass-err{color:#ff4466;font-size:13px;margin-top:6px;display:none;font-family:'VT323',monospace}
      .sign-pulse{animation:sign-glow 1.5s ease-in-out infinite alternate}
      .sign-pulse2{animation:sign-glow 1.1s ease-in-out infinite alternate .3s}
      .bld-float{animation:bld-hover 4s ease-in-out infinite}
      .bld-float2{animation:bld-hover 3.5s ease-in-out infinite .8s}
      .bld-float3{animation:bld-hover 5s ease-in-out infinite 1.5s}
      .win-a1{animation:win-blink 3.1s ease-in-out infinite}
      .win-a2{animation:win-blink 2.3s ease-in-out infinite .4s}
      .win-a3{animation:win-blink 4.7s ease-in-out infinite 1.2s}
      .win-a4{animation:win-blink 1.9s ease-in-out infinite .8s}
      .win-a5{animation:win-blink 5.3s ease-in-out infinite 2.1s}
      @keyframes win-blink{0%,100%{opacity:1}40%,60%{opacity:.15}}
      @keyframes sign-glow{from{opacity:.7;filter:drop-shadow(0 0 4px currentColor)}to{opacity:1;filter:drop-shadow(0 0 12px currentColor)}}
      @keyframes bld-hover{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
    `;
    document.head.appendChild(style);
  }

  // ── Link Press Start 2P font if not already loaded ──
  if (!document.getElementById('mx-font-link')) {
    const link = document.createElement('link');
    link.id = 'mx-font-link';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323:wght@400&display=swap';
    document.head.appendChild(link);
  }

  const overlay = document.createElement('div');
  overlay.id = 'maintenance-screen';

  overlay.innerHTML = `
    <div class="mx-stars" id="mx-stars"></div>
    <div id="mx-particles"></div>
    <div class="mx-city">${_buildPixelCity()}</div>

    <div class="mx-content">
      <div class="mx-badge">&#9888; SYSTEME HORS LIGNE &#9888;</div>
      <div class="mx-title">MAINTENANCE<br>EN COURS</div>
      <div class="mx-subtitle">Nos équipes travaillent pour remettre l'app en ligne.</div>

      <div class="mx-msg-box">
        <div class="mx-msg-text">${msg || "L'application est temporairement indisponible.<br>Revenez dans quelques minutes !"}</div>
        <div class="mx-dots">
          <div class="mx-dot"></div><div class="mx-dot"></div>
          <div class="mx-dot"></div><div class="mx-dot"></div>
        </div>
      </div>

      <!-- Bypass fondateur discret -->
      <div class="mx-bypass-hint" onclick="_toggleBypassForm()" title="Accès fondateur">
        &#9670; acces fondateur &#9670;
      </div>
      <div class="mx-bypass-form" id="mx-bypass-form">
        <input type="password" id="mx-bypass-input" class="mx-bypass-input"
          placeholder="Mot de passe admin"
          onkeydown="if(event.key==='Enter')_submitBypass()"/>
        <button class="mx-bypass-btn" onclick="_submitBypass()">ACCEDER</button>
        <div class="mx-bypass-err" id="mx-bypass-err">Mot de passe incorrect</div>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  // Stars
  const starsEl = document.getElementById('mx-stars');
  for (let i = 0; i < 120; i++) {
    const s = document.createElement('div');
    s.className = 'mx-star';
    const size = Math.random() < 0.15 ? 2 : 1;
    s.style.cssText = `width:${size}px;height:${size}px;top:${Math.random()*55}%;left:${Math.random()*100}%;--dur:${2+Math.random()*4}s;--del:${Math.random()*5}s`;
    starsEl.appendChild(s);
  }

  // Particles
  const partEl = document.getElementById('mx-particles');
  const colors = ['#cc00ff','#00ffcc','#ff0080','#ffdd00','#0088ff'];
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'mx-particle';
    const c = colors[i % colors.length];
    p.style.cssText = `left:${Math.random()*100}%;background:${c};box-shadow:0 0 6px ${c};--dur:${5+Math.random()*8}s;--del:${Math.random()*6}s`;
    partEl.appendChild(p);
  }
}

// ── Bypass fondateur sur l'écran maintenance ──
function _toggleBypassForm() {
  const form = document.getElementById('mx-bypass-form');
  if (!form) return;
  form.classList.toggle('visible');
  if (form.classList.contains('visible')) {
    setTimeout(() => document.getElementById('mx-bypass-input')?.focus(), 50);
  }
}

async function _submitBypass() {
  const input = document.getElementById('mx-bypass-input');
  const err = document.getElementById('mx-bypass-err');
  if (!input) return;
  const entered = input.value;
  if (!entered) return;

  try {
    // Try Firebase admin password
    let stored = null;
    if (fb.db) {
      const snap = await fb.db.collection('appConfig').doc('adminPassword').get();
      stored = snap.exists ? snap.data().password : null;
    }
    if (stored && entered === stored) {
      document.getElementById('maintenance-screen')?.remove();
      document.getElementById('mx-inline-style')?.remove();
      buildAppShell();
      navigate(window.state?.currentPage || 'timer');
      notify('Accès fondateur accordé', 'success', { title: '🔓 Bypass maintenance' });
    } else {
      if (err) { err.style.display = 'block'; }
      input.value = '';
      setTimeout(() => { if(err) err.style.display='none'; }, 2000);
    }
  } catch(e) {
    // If Firebase fails, try local comparison
    if (err) { err.style.display = 'block'; err.textContent = 'Erreur connexion Firebase'; }
    setTimeout(() => { if(err) err.style.display='none'; }, 2000);
  }
}


function showGlobalAnnouncement(ann) {
  document.getElementById('global-announcement')?.remove();
  const icons={info:'ℹ️',success:'✅',warning:'⚠️',event:'🎉'};
  const container=document.getElementById('app-shell');
  if (!container) return;
  const el=document.createElement('div'); el.id='global-announcement'; el.className=`global-announcement ${ann.type}`;
  el.innerHTML=`<div class="ga-icon">${icons[ann.type]||'📢'}</div>
    <div class="ga-content"><div class="ga-title">${ann.title}</div>${ann.message?`<div class="ga-msg">${ann.message}</div>`:''}</div>
    <button class="ga-close" onclick="dismissAnnouncement('${ann.id}')">✕</button>`;
  const bodyArea=document.getElementById('body-area');
  if (bodyArea) container.insertBefore(el,bodyArea);
}

async function dismissAnnouncement(id) {
  document.getElementById('global-announcement')?.remove();
  await api.store.set('lastSeenAnnouncement',id);
}

function showChangelogModal(cl) {
  document.getElementById('changelog-modal')?.remove();
  const modal=document.createElement('div'); modal.className='modal-overlay'; modal.id='changelog-modal';
  modal.innerHTML=`<div class="modal" style="max-width:460px">
    <div class="modal-header"><div class="modal-title">🎉 Nouveautés — v${cl.version}</div>
    <button class="modal-close" onclick="document.getElementById('changelog-modal').remove()">✕</button></div>
    <div style="font-size:11px;color:var(--text-muted);margin-bottom:14px;font-family:var(--font-mono)">${cl.date||''}</div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:22px">
      ${(cl.entries||[]).map(e=>`<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;background:var(--bg-elevated);border-radius:10px;border:1px solid var(--border)"><span style="color:var(--accent);flex-shrink:0">→</span><span style="font-size:13.5px">${e}</span></div>`).join('')}
    </div>
    <button class="btn btn-primary" style="width:100%" onclick="document.getElementById('changelog-modal').remove()">✨ Super, merci !</button>
  </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{if(e.target===modal)modal.remove()});
}

window._adminRemoteData=null;
