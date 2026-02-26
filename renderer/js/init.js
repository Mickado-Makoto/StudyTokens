/* ================================================
   INIT.JS — Orchestration du démarrage
   Gère l'auth Firebase avant de lancer l'app
   ================================================ */
'use strict';

async function sleep(ms) { return new Promise(r=>setTimeout(r,ms)); }

function setLoadProgress(pct, label) {
  const bar=document.getElementById('ls-bar'), pctEl=document.getElementById('ls-pct'), step=document.getElementById('ls-step');
  if (bar)   bar.style.width=pct+'%';
  if (pctEl) pctEl.textContent=pct+'%';
  if (step)  step.textContent=label;
}

function hideLoadingScreen() {
  return new Promise(resolve => {
    const ls=document.getElementById('loading-screen');
    const appEl=document.getElementById('app')||document.getElementById('app-shell');
    if (appEl) appEl.style.display='flex';
    if (!ls||ls.style.display==='none') { resolve(); return; }
    ls.style.pointerEvents='none';
    ls.style.transition='opacity .55s ease'; ls.style.opacity='0';
    setTimeout(()=>{ ls.style.display='none'; resolve(); }, 600);
  });
}

function showCrashScreen(msg) {
  document.body.innerHTML=`<div style="position:fixed;inset:0;background:#030610;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;font-family:monospace;color:#fc8181;padding:40px;z-index:99999"><div style="font-size:40px">⚠️</div><div style="font-size:18px;font-weight:700;color:#fff">Erreur au démarrage</div><div style="background:#0a0f22;border:1px solid #fc618140;border-radius:12px;padding:20px;max-width:600px;font-size:13px;line-height:1.6;white-space:pre-wrap;color:#fc8181">${msg}</div><div style="font-size:12px;color:#6880b0">Ouvre les DevTools avec F12 pour plus de détails</div><button onclick="location.reload()" style="margin-top:8px;padding:10px 24px;background:#1a2744;border:1px solid #3a5294;border-radius:8px;color:#7b9fff;cursor:pointer;font-size:14px">🔄 Recharger</button></div>`;
}

// ── Boot principal ────────────────────────────
async function runLoadSequence() {
  try {
    setLoadProgress(10, 'Chargement du noyau...');
    await sleep(180);

    setLoadProgress(35, 'Connexion au serveur...');
    const firebaseOk = initFirebase();
    await sleep(200);

    setLoadProgress(60, 'Vérification de l\'identité...');
    await sleep(180);

    setLoadProgress(85, 'Préparation de l\'interface...');
    await sleep(200);

    setLoadProgress(100, 'Prêt !');
    await sleep(300);

  } catch(err) {
    console.error('[StudyTokens] Erreur init:', err);
    showCrashScreen(String(err?.stack||err));
    return;
  }

  await hideLoadingScreen();

  // Vérifier si l'utilisateur est déjà connecté
  await checkAuthAndLaunch();
}

async function checkAuthAndLaunch() {
  return new Promise(resolve => {
    if (!fb.ready) {
      showAuthScreen();
      spawnAuthParticles();
      resolve();
      return;
    }

    let done = false; // ← garde pour éviter double-exécution
    let unsub = null;

    const finish = (fn) => {
      if (done) return;
      done = true;
      if (unsub) { try { unsub(); } catch(e){} }
      fn();
      resolve();
    };

    unsub = onAuthStateChanged(async (user) => {
      if (done) return; // ← ignore si timeout a déjà résolu

      if (user) {
        try {
          await fbLoadOrCreateProfile(user);
          await loadState();
          document.documentElement.setAttribute('data-theme', state.settings.theme||'cosmos');
          if (state.settings.zoom && api.win?.setZoom) api.win.setZoom(state.settings.zoom);
          buildAppShell();
          navigate(state.currentPage||'timer');
          fetchAnnouncements().catch(()=>{});
          checkStreak();
          initUpdater();
          finish(() => {}); // succès
        } catch(e) {
          const msg = e.message || '';
          console.error('[Auth] Erreur reconnexion:', e);
          if (msg.startsWith('BANNED:')) {
            finish(() => { showAuthScreen(); spawnAuthParticles(); });
          } else if (msg.startsWith('SESSION_EXPIRED:')) {
            finish(() => { showAuthScreen(); spawnAuthParticles(); });
          } else {
            finish(() => { showAuthScreen(); spawnAuthParticles(); });
          }
        }
      } else {
        finish(() => { showAuthScreen(); spawnAuthParticles(); });
      }
    });

    // Timeout fallback si Firebase ne répond pas en 6s
    setTimeout(() => {
      finish(() => { showAuthScreen(); spawnAuthParticles(); });
    }, 6000);
  });
}

function checkStreak() {
  if (!state.lastStudyDate) return;
  const yesterday=new Date(Date.now()-86400000).toISOString().split('T')[0];
  const today=new Date().toISOString().split('T')[0];
  if (state.lastStudyDate!==today&&state.lastStudyDate!==yesterday) {
    if (state.streak>0) { state.streak=0; saveField('streak',0); }
  }
}

// ── Particules et nébuleuses loading ─────────
function spawnLoadingParticles() {
  const container=document.getElementById('ls-particles');
  if (!container) return;
  for (let i=0;i<28;i++) {
    const p=document.createElement('div'); p.className='ls-particle';
    const size=1+Math.random()*2.5;
    p.style.cssText=`left:${Math.random()*100}vw;top:${Math.random()*100}vh;width:${size}px;height:${size}px;animation-delay:${Math.random()*5}s;animation-duration:${4+Math.random()*6}s;`;
    container.appendChild(p);
  }
}

function spawnLoadingNebula() {
  const ls=document.getElementById('loading-screen');
  if (!ls) return;
  [
    {color:'rgba(123,159,255,0.07)',size:'520px',top:'-10%',left:'-10%',dur:'9s'},
    {color:'rgba(192,132,252,0.05)',size:'380px',top:'40%',right:'-15%',dur:'12s'},
    {color:'rgba(94,231,196,0.04)', size:'300px',bottom:'-20%',left:'20%',dur:'15s'},
  ].forEach((o,i)=>{
    const orb=document.createElement('div');
    const pos=Object.entries(o).filter(([k])=>['top','left','right','bottom'].includes(k)).map(([k,v])=>`${k}:${v}`).join(';');
    orb.style.cssText=`position:absolute;border-radius:50%;width:${o.size};height:${o.size};background:radial-gradient(circle,${o.color} 0%,transparent 70%);pointer-events:none;z-index:0;${pos};animation:nebula-drift ${o.dur} ease-in-out ${i*2}s infinite alternate;`;
    ls.appendChild(orb);
  });
}

// ── Déconnexion ───────────────────────────────
async function signOut() {
  try {
    await fbSignOut();

    // Réinitialiser TOUT l'état en mémoire
    state.tokens=0; state.lifetimeTokens=0; state.totalMinutes=0;
    state.streak=0; state.lastStudyDate='';
    state.sessions=[]; state.rewards=[]; state.redeemedCount={};
    state.settings={ minutesPerToken:10, theme:'cosmos', zoom:1.0,
      notifications:{daily:true,break:true,streak:true}, subjects:[...SUBJECTS_DEFAULT] };
    state.activeMultiplier=1; state.multiplierLabel='';
    adminState.authenticated = false;
    if (typeof stopRealtimeListeners === 'function') stopRealtimeListeners();

    // Nettoyer l'UI - enlever l'app
    document.getElementById('app-shell')?.remove();
    const oldApp = document.getElementById('app');
    if (oldApp) oldApp.remove();

    // Recréer le div root propre
    const root = document.createElement('div');
    root.id = 'app';
    root.style.cssText = 'display:none;height:100vh;flex-direction:column;';
    document.body.insertBefore(root, document.getElementById('toast-container'));

    // Réappliquer le thème par défaut
    document.documentElement.setAttribute('data-theme', 'cosmos');

    // Afficher l'écran de connexion directement (PAS de re-check Firebase qui boucle)
    showAuthScreen();
    spawnAuthParticles();
    showToast('👋 Déconnecté', 'teal');
  } catch(e) {
    console.error('[signOut]', e);
    showToast('Erreur : '+e.message, 'error');
  }
}

// ── Gestionnaires d'erreurs globaux ──────────
window.addEventListener('error', e => console.error('[Global error]', e.error||e.message));
window.addEventListener('unhandledrejection', e => console.error('[Unhandled promise]', e.reason));

// ── Démarrage ─────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  spawnLoadingNebula();
  spawnLoadingParticles();
  runLoadSequence();
});
