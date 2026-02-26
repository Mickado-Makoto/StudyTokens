/* ================================================
   AUTH.JS — Connexion / Inscription
   Google OAuth + Email/Password
   ================================================ */
'use strict';

const authUI = { tab: 'login', loading: false };

const GOOGLE_SVG = `<svg width="20" height="20" viewBox="0 0 18 18" style="flex-shrink:0">
  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
  <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
</svg>`;

function showAuthScreen() {
  document.getElementById('auth-screen')?.remove();
  const el = document.createElement('div');
  el.id = 'auth-screen';
  el.innerHTML = buildAuthHTML();
  document.body.appendChild(el);
  setTimeout(() => { document.getElementById('auth-email')?.focus(); spawnAuthParticles(); }, 100);
}

function buildAuthHTML() {
  return `
  <div class="auth-bg">
    <div class="auth-nebula auth-nebula-1"></div>
    <div class="auth-nebula auth-nebula-2"></div>
    <div class="auth-particles" id="auth-particles"></div>
  </div>

  <!-- Barre de titre sur l'écran auth -->
  <div class="auth-titlebar">
    <div class="auth-titlebar-logo">
      <div class="logo-badge" style="width:22px;height:22px;font-size:9px">ST</div>
      <span style="font-size:13px;font-weight:700">Study<span style="color:var(--accent)">Tokens</span></span>
    </div>
    <div class="auth-titlebar-controls">
      <button class="win-btn" onclick="api.win.minimize()">─</button>
      <button class="win-btn close" onclick="api.win.close()">✕</button>
    </div>
  </div>

  <div class="auth-card" id="auth-card">
    <div class="auth-logo">
      <div class="auth-logo-badge">ST</div>
      <div>
        <div class="auth-logo-name">Study<span>Tokens</span></div>
        <div class="auth-logo-sub">Espace personnel</div>
      </div>
    </div>

    <div class="auth-error" id="auth-error" style="display:none"></div>

    <button class="auth-btn-google-main" id="auth-google-btn"
      onclick="handleGoogleAuth()" ${authUI.loading?'disabled':''}>
      ${authUI.loading ? '<span class="auth-spinner"></span> Connexion...' : GOOGLE_SVG + '<span>Continuer avec Google</span>'}
    </button>
    <div class="auth-google-hint">Recommandé · Rapide · Sécurisé ✨</div>

    <div class="auth-separator"><span>ou avec email</span></div>

    <div class="auth-tabs">
      <button class="auth-tab ${authUI.tab==='login'?'active':''}" onclick="switchAuthTab('login')">Connexion</button>
      <button class="auth-tab ${authUI.tab==='register'?'active':''}" onclick="switchAuthTab('register')">Inscription</button>
    </div>

    ${authUI.tab==='register' ? `
    <div class="auth-field">
      <label class="auth-label">Nom d'affichage</label>
      <input type="text" class="auth-input" id="auth-name" placeholder="Ton prénom ou pseudo" onkeydown="if(event.key==='Enter')handleAuth()"/>
    </div>` : ''}

    <div class="auth-field">
      <label class="auth-label">Email</label>
      <input type="email" class="auth-input" id="auth-email" placeholder="exemple@gmail.com" onkeydown="if(event.key==='Enter')handleAuth()"/>
    </div>

    <div class="auth-field">
      <label class="auth-label">Mot de passe</label>
      <div class="auth-input-wrap">
        <input type="password" class="auth-input" id="auth-password" placeholder="••••••••" onkeydown="if(event.key==='Enter')handleAuth()"/>
        <button class="auth-eye" onclick="togglePasswordVis('auth-password',this)" tabindex="-1">👁</button>
      </div>
    </div>

    ${authUI.tab==='register' ? `
    <div class="auth-field">
      <label class="auth-label">Confirmer</label>
      <div class="auth-input-wrap">
        <input type="password" class="auth-input" id="auth-password2" placeholder="••••••••" onkeydown="if(event.key==='Enter')handleAuth()"/>
        <button class="auth-eye" onclick="togglePasswordVis('auth-password2',this)" tabindex="-1">👁</button>
      </div>
    </div>` : ''}

    <button class="auth-btn-email" id="auth-submit-btn" onclick="handleAuth()" ${authUI.loading?'disabled':''}>
      ${authUI.loading ? '<span class="auth-spinner"></span> Chargement...' : authUI.tab==='login' ? 'Se connecter' : 'Créer mon compte'}
    </button>

    ${authUI.tab==='login' ? `
    <div class="auth-footer-link">
      <button class="auth-link" onclick="showForgotPassword()">Mot de passe oublié ?</button>
    </div>` : ''}
  </div>`;
}

function switchAuthTab(tab) {
  authUI.tab = tab;
  document.getElementById('auth-screen')?.remove();
  const el = document.createElement('div'); el.id='auth-screen'; el.innerHTML=buildAuthHTML();
  document.body.appendChild(el);
  spawnAuthParticles();
  setTimeout(()=>document.getElementById('auth-email')?.focus(),80);
}

// ── Google OAuth ──────────────────────────────
async function handleGoogleAuth() {
  if (authUI.loading) return;
  setAuthLoading(true);
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await fb.auth.signInWithPopup(provider);
    await onAuthSuccess(cred.user);
  } catch(e) {
    setAuthLoading(false);
    if (e.code==='auth/popup-closed-by-user'||e.code==='auth/cancelled-popup-request') return;
    console.error('[Google Auth]', e);
    showAuthError(translateAuthError(e.code||e.message));
  }
}

// ── Email/Password ────────────────────────────
async function handleAuth() {
  if (authUI.loading) return;
  const email=document.getElementById('auth-email')?.value?.trim();
  const password=document.getElementById('auth-password')?.value;
  if (!email||!password) { showAuthError('Remplis tous les champs.'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showAuthError('Email invalide.'); return; }
  if (password.length<6) { showAuthError('Mot de passe trop court (6 min).'); return; }
  if (authUI.tab==='register') {
    const name=document.getElementById('auth-name')?.value?.trim();
    const pass2=document.getElementById('auth-password2')?.value;
    if (!name) { showAuthError('Entre ton nom.'); return; }
    if (password!==pass2) { showAuthError('Mots de passe différents.'); return; }
    setAuthLoading(true);
    try {
      const cred=await fb.auth.createUserWithEmailAndPassword(email,password);
      await cred.user.updateProfile({displayName:name});
      await onAuthSuccess(cred.user);
    } catch(e) { setAuthLoading(false); showAuthError(translateAuthError(e.code||e.message)); }
  } else {
    setAuthLoading(true);
    try {
      const cred=await fb.auth.signInWithEmailAndPassword(email,password);
      await onAuthSuccess(cred.user);
    } catch(e) { setAuthLoading(false); showAuthError(translateAuthError(e.code||e.message)); }
  }
}

// ── Succès connexion ──────────────────────────
async function onAuthSuccess(user) {
  try {
    await fbLoadOrCreateProfile(user);
    const migrated=await migrateLocalDataToFirebase();
    await loadState();
    const authScreen=document.getElementById('auth-screen');
    if (authScreen) { authScreen.style.transition='opacity .4s'; authScreen.style.opacity='0'; setTimeout(()=>authScreen.remove(),420); }
    document.documentElement.setAttribute('data-theme', state.settings.theme||'cosmos');
    SFX.success();
    buildAppShell();
    navigate('timer');
    checkStreak();
    initUpdater();
    fetchAnnouncements().catch(()=>{});
    const name=fb.profile?.displayName||user.displayName||user.email;
    showToast(migrated ? `✅ Bienvenue ${name} ! Données sync ☁️` : `✅ Bienvenue, ${name} !`, 'success', migrated?5000:3000);
  } catch(e) {
    setAuthLoading(false);
    showAuthError('Erreur : '+e.message);
    console.error('[onAuthSuccess]', e);
  }
}

// ── Mot de passe oublié ───────────────────────
function showForgotPassword() {
  const card=document.getElementById('auth-card');
  if (!card) return;
  card.innerHTML=`
    <div class="auth-logo"><div class="auth-logo-badge">ST</div><div><div class="auth-logo-name">Study<span>Tokens</span></div></div></div>
    <div class="auth-error" id="auth-error" style="display:none"></div>
    <div class="auth-field">
      <label class="auth-label">Ton adresse email</label>
      <input type="email" class="auth-input" id="auth-reset-email" placeholder="exemple@gmail.com" onkeydown="if(event.key==='Enter')doResetPassword()"/>
    </div>
    <button class="auth-btn-primary" onclick="doResetPassword()">📧 Envoyer le lien</button>
    <div class="auth-footer-link"><button class="auth-link" onclick="showAuthScreen()">← Retour</button></div>`;
}

async function doResetPassword() {
  const email=document.getElementById('auth-reset-email')?.value?.trim();
  if (!email) { showAuthError('Entre ton email.'); return; }
  try {
    await fb.auth.sendPasswordResetEmail(email);
    const card=document.getElementById('auth-card');
    if (card) card.innerHTML=`<div style="text-align:center;padding:30px 0"><div style="font-size:52px;margin-bottom:14px">📧</div><div style="font-size:17px;font-weight:700;margin-bottom:10px">Email envoyé !</div><div style="font-size:13px;color:var(--text-secondary);margin-bottom:24px">Vérifie ta boîte mail.</div><button class="auth-btn-primary" onclick="showAuthScreen()">← Retour</button></div>`;
  } catch(e) { showAuthError(translateAuthError(e.code||e.message)); }
}

// ── Helpers ───────────────────────────────────
function setAuthLoading(val) {
  authUI.loading=val;
  const g=document.getElementById('auth-google-btn');
  const s=document.getElementById('auth-submit-btn');
  if (g) { g.disabled=val; g.innerHTML=val?'<span class="auth-spinner"></span> Connexion...':GOOGLE_SVG+'<span>Continuer avec Google</span>'; }
  if (s) { s.disabled=val; s.innerHTML=val?'<span class="auth-spinner"></span> Chargement...':(authUI.tab==='login'?'Se connecter':'Créer mon compte'); }
}

function showAuthError(msg) {
  if(typeof SFX!=='undefined') SFX.error();
  const el=document.getElementById('auth-error');
  if (el) { el.textContent=msg; el.style.display='flex'; }
}

function togglePasswordVis(id,btn) {
  const inp=document.getElementById(id); if (!inp) return;
  inp.type=inp.type==='password'?'text':'password';
  btn.textContent=inp.type==='password'?'👁':'🙈';
}

function translateAuthError(code) {
  const m={
    'auth/invalid-credential':'Email ou mot de passe incorrect.',
    'auth/user-not-found':'Aucun compte avec cet email.',
    'auth/wrong-password':'Mot de passe incorrect.',
    'auth/email-already-in-use':'Email déjà utilisé.',
    'auth/weak-password':'Mot de passe trop court (6 min).',
    'auth/invalid-email':'Email invalide.',
    'auth/too-many-requests':'Trop de tentatives, réessaie plus tard.',
    'auth/network-request-failed':'Erreur réseau.',
    'auth/popup-blocked':'Popup bloquée, réessaie.',
  };
  return m[code]||`Erreur : ${code}`;
}

function spawnAuthParticles() {
  const c=document.getElementById('auth-particles'); if (!c) return;
  for (let i=0;i<22;i++) {
    const p=document.createElement('div'); p.className='auth-particle';
    const s=1+Math.random()*2.2;
    p.style.cssText=`left:${Math.random()*100}%;top:${Math.random()*100}%;width:${s}px;height:${s}px;animation-delay:${Math.random()*6}s;animation-duration:${5+Math.random()*8}s;`;
    c.appendChild(p);
  }
}
