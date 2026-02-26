/* ================================================
   ADMIN-CORE.JS — Noyau du panel d'administration
   État, navigation, authentification, layout
   ================================================ */
'use strict';

// ── État global admin ─────────────────────────
const adminState = {
  open: false, authenticated: false,
  currentTab: 'dashboard',
  ghToken: '',
  pendingAnn:  { active:false, type:'info', title:'', message:'' },
  pendingMult: { active:false, factor:2, label:'', until:'' },
  pendingCl:   { version: APP_VERSION, entries:[] },
  remoteData:  null,
};

// ── Permissions par onglet ────────────────────
const TAB_PERMISSIONS = {
  dashboard:2, activity:2, users:2, alerts:2, analytics:2, tickets:2,
  minigames:3, announce:3, multiplier:3, changelog:3, shop:3,
  settings:4, updates:4, permissions:4,
};
const TAB_LABELS = {
  dashboard:'Dashboard', activity:"Journal d'activité", analytics:'Statistiques',
  users:'Utilisateurs', alerts:'Alertes sécurité', minigames:'Mini-jeux',
  announce:'Annonces', multiplier:'Multiplicateur', shop:'Boutique',
  changelog:'Changelog', settings:'Paramètres app', updates:'Déploiement',
  permissions:'Permissions',
  tickets:'Tickets Support',
};

function canAccessTab(tab) {
  return getRoleLevel(fb.profile?.role) >= (TAB_PERMISSIONS[tab] || 4);
}

function getNavStructure() {
  const level = getRoleLevel(fb.profile?.role);
  const nav = [
    { section:'Vue générale', items:[
      { tab:'dashboard',  icon:'📊', label:'Dashboard',         min:2 },
      { tab:'activity',   icon:'📋', label:"Journal d'activité",min:2 },
      { tab:'analytics',  icon:'📈', label:'Statistiques',      min:2 },
    ]},
    { section:'Communauté', items:[
      { tab:'users',  icon:'👥', label:'Utilisateurs', min:2 },
      { tab:'alerts',  icon:'🚨', label:'Alertes sécu.', min:2 },
      { tab:'tickets', icon:'🎫', label:'Tickets support', min:2 },
    ]},
    { section:'Mini-jeux', items:[
      { tab:'minigames', icon:'🎮', label:'Configuration', min:3 },
    ]},
    { section:'Contenu & App', items:[
      { tab:'announce',   icon:'📣', label:'Annonces',       min:3 },
      { tab:'multiplier', icon:'✨', label:'Multiplicateur', min:3 },
      { tab:'shop',       icon:'🏪', label:'Boutique',       min:3 },
      { tab:'changelog',  icon:'📝', label:'Changelog',      min:3 },
    ]},
  ];
  if (level >= 4) nav.push({ section:'👑 Fondateur', items:[
    { tab:'settings',    icon:'⚙️', label:'Paramètres app', min:4 },
    { tab:'permissions', icon:'🛡️', label:'Permissions',    min:4 },
    { tab:'updates',     icon:'🚀', label:'Déploiement',    min:4 },
  ]});
  return nav;
}

// ── Ouverture du panel ────────────────────────
async function openAdminPanel() {
  if (getRoleLevel(fb.profile?.role) < 2) {
    notify('Accès réservé aux Modérateurs et plus', 'error'); return;
  }
  adminState.open = true;
  adminState.ghToken = await api.store.get(GH_TOKEN_KEY, '');
  await fetchRemoteAdminData();
  SFX.open?.();
  renderAdminOverlay();
}

function showAdminPasswordModal() {
  document.getElementById('admin-pass-modal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'admin-pass-modal';
  modal.className = 'admin-password-modal';
  modal.innerHTML = `
    <div class="admin-pass-card">
      <div class="apc-icon">🔐</div>
      <div class="apc-title">Accès Administration</div>
      <div class="apc-subtitle">Entrez le mot de passe pour continuer</div>
      <div class="auth-input-wrap" style="margin:18px 0 12px">
        <input type="password" id="admin-pass-input" class="auth-input" placeholder="Mot de passe"
          onkeydown="if(event.key==='Enter')verifyAdminPassword()"
          style="text-align:center;letter-spacing:3px"/>
      </div>
      <div id="admin-pass-err" style="color:#f87171;font-size:12px;min-height:18px;text-align:center;margin-bottom:10px"></div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-secondary" style="flex:1" onclick="document.getElementById('admin-pass-modal').remove()">Annuler</button>
        <button class="btn btn-primary" style="flex:1" onclick="verifyAdminPassword()">Accéder</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  setTimeout(() => document.getElementById('admin-pass-input')?.focus(), 100);
}

async function verifyAdminPassword() {
  const input = document.getElementById('admin-pass-input');
  const errEl = document.getElementById('admin-pass-err');
  const entered = input?.value || '';
  try {
    const blockData = await fbCheckAdminBlock();
    if (blockData.blocked) {
      const mins = Math.ceil((blockData.until - Date.now()) / 60000);
      if (errEl) errEl.textContent = `Bloqué ${mins} min (trop de tentatives)`;
      return;
    }
    const stored = await fbGetAdminPassword();
    if (entered === stored) {
      await fbClearAdminAttempts();
      SFX.success();
      adminState.authenticated = true;
      document.getElementById('admin-pass-modal')?.remove();
      renderAdminOverlay();
    } else {
      SFX.error();
      const result = await fbRecordAdminFailedAttempt();
      const remaining = Math.max(0, 5 - (result.attempts || 0));
      if (errEl) errEl.textContent = remaining > 0
        ? `Mot de passe incorrect — ${remaining} tentative(s) restante(s)`
        : 'Compte bloqué 15 minutes';
      input.value = '';
      input.style.borderColor = 'rgba(224,82,82,.6)';
      setTimeout(() => { input.style.borderColor=''; if(errEl) errEl.textContent=''; }, 3000);
    }
  } catch(e) { if (errEl) errEl.textContent = 'Erreur: '+e.message; }
}

async function fetchRemoteAdminData() {
  if (!fb.ready || !fb.db) return;
  try {
    const [annSnap, multSnap] = await Promise.all([
      fb.db.collection('appConfig').doc('announcement').get(),
      fb.db.collection('appConfig').doc('multiplier').get(),
    ]);
    adminState.remoteData = {
      announcement: annSnap.exists ? annSnap.data() : { active:false },
      multiplier:   multSnap.exists ? multSnap.data() : { active:false },
    };
  } catch(e) { console.warn('[Admin] fetchRemoteAdminData:', e.message); }
}

// ── Layout principal ──────────────────────────
function renderAdminOverlay() {
  document.getElementById('admin-overlay')?.remove();
  const level = getRoleLevel(fb.profile?.role);
  if (!adminState.authenticated && level < 4) {
    showAdminPasswordModal(); return;
  }
  const overlay = document.createElement('div');
  overlay.id = 'admin-overlay';
  overlay.className = 'admin-overlay';

  const navHTML = getNavStructure().map(section => `
    <div class="cms-nav-section">
      <div class="cms-nav-section-title">${section.section}</div>
      ${section.items.map(i => adminNavItem(i.tab, i.icon, i.label)).join('')}
    </div>`).join('');

  const profile = fb.profile;
  const roleInfo = ROLES[profile?.role] || ROLES.utilisateur;
  overlay.innerHTML = `
    <div class="cms-topbar">
      <div class="cms-logo">
        <div class="cms-logo-badge">ST</div>
        <div><div class="cms-logo-title">Administration</div>
          <div class="cms-logo-sub">Study<span style="color:var(--accent)">Tokens</span> v${APP_VERSION}</div>
        </div>
      </div>
      <nav class="cms-breadcrumb">
        <span>Admin</span><span class="cms-bc-sep">›</span>
        <span id="cms-breadcrumb-current">${TAB_LABELS[adminState.currentTab]||''}</span>
      </nav>
      <button class="btn btn-secondary btn-sm" onclick="closeAdminPanel()" style="margin-left:auto">✕ Fermer</button>
    </div>
    <div class="cms-body">
      <aside class="cms-sidebar">
        <div class="cms-sidebar-profile">
          <div class="cms-sidebar-avatar">${roleInfo.emoji}</div>
          <div class="cms-sidebar-name">${profile?.displayName||profile?.email?.split('@')[0]||'Admin'}</div>
          <span class="user-role-badge ${roleInfo.css}" style="font-size:10px">${roleInfo.emoji} ${roleInfo.label}</span>
        </div>
        <nav class="cms-nav">${navHTML}</nav>
      </aside>
      <main class="cms-main">
        <div class="cms-page" id="cms-page-content"></div>
      </main>
    </div>`;
  document.body.appendChild(overlay);
  switchAdminTab(adminState.currentTab);
}

function adminNavItem(tab, icon, label) {
  const active = adminState.currentTab === tab;
  const locked = !canAccessTab(tab);
  return `<button class="cms-nav-item${active?' active':''}${locked?' locked':''}"
    data-tab="${tab}" onclick="switchAdminTab('${tab}')"
    ${locked?'title="Permission insuffisante"':''}>
    <span class="cni-icon">${locked?'🔒':icon}</span>
    <span>${label}</span>
  </button>`;
}

function switchAdminTab(tab) {
  if (!canAccessTab(tab)) { notify('Permission insuffisante', 'error'); return; }
  adminState.currentTab = tab;
  document.querySelectorAll('.cms-nav-item').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tab));
  const bc = document.getElementById('cms-breadcrumb-current');
  if (bc) bc.textContent = TAB_LABELS[tab] || tab;
  const page = document.getElementById('cms-page-content');
  if (!page) return;

  const renders = {
    dashboard:   renderAdminDashboard,
    activity:    () => { renderAdminActivity(); return ''; },
    analytics:   () => { renderAdminAnalytics(); return ''; },
    users:       () => { renderAdminUsers(); return ''; },
    alerts:      () => { renderAdminAlerts(); return ''; },
    tickets:     () => { renderAdminTickets(); return ''; },
    minigames:   renderAdminMinigames,
    announce:    () => { renderAdminAnnounce(); return ''; },
    multiplier:  () => { renderAdminMultiplier(); return ''; },
    shop:        () => { renderAdminShop(); return ''; },
    changelog:   () => { renderAdminChangelog(); return ''; },
    settings:    renderAdminSettings,
    permissions: renderAdminPermissions,
    updates:     () => { renderAdminPublish(); return ''; },
  };
  const fn = renders[tab];
  if (!fn) return;
  const result = fn();
  if (result) page.innerHTML = result;
  if (tab === 'dashboard') setTimeout(() => loadDashboardStats(), 50);
}

function closeAdminPanel() {
  SFX.close?.();
  document.getElementById('admin-overlay')?.remove();
  adminState.open = false;
}

function togglePasswordVis(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  if (btn) btn.textContent = inp.type === 'password' ? '👁' : '🙈';
}
