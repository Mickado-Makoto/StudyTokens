/* ================================================
   PAGES.JS — Rendu de toutes les pages de l'app
   ================================================ */
'use strict';

// ── Navigation ───────────────────────────────────
function navigate(page) {
  state.currentPage = page;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page===page));
  renderMainContent();
}

function renderMainContent() {
  const el = document.getElementById('main-content');
  if (!el) return;
  switch (state.currentPage) {
    case 'timer':       el.innerHTML = renderTimerPage(); bindTimerEvents(); break;
    case 'paliers':     el.innerHTML = renderPaliersPage(); break;
    case 'shop':        el.innerHTML = renderShopPage(); break;
    case 'manage':      el.innerHTML = renderManagePage(); break;
    case 'history':     el.innerHTML = renderHistoryPage(); break;
    case 'notifs':      el.innerHTML = renderNotifsPage(); break;
    case 'settings':    el.innerHTML = renderSettingsPage(); break;
    case 'stats':       el.innerHTML = renderStatsPage(); break;
    case 'badges':      el.innerHTML = renderBadgesPage(); break;
    case 'flashcards':  renderFlashcardsPage(); break;
    default:            el.innerHTML = renderTimerPage(); bindTimerEvents();
  }
}

// ── APP SHELL ─────────────────────────────────────
function buildAppShell() {
  const app = document.getElementById('app');
  app.id = 'app-shell';
  app.style.display = 'flex';
  app.innerHTML = `
  ${renderTitlebar()}
  <div id="body-area">
    ${renderSidebar()}
    <div id="main-content"></div>
  </div>`;
}

function renderTitlebar() {
  return `<div id="titlebar">
    <div class="titlebar-logo">
      <div class="logo-badge">ST</div>
      <span>Study<span class="app-accent">Tokens</span></span>
    </div>
    <div class="titlebar-center">
      <div class="tb-dot"></div>
      <div class="tb-label">système actif</div>
    </div>
    <div class="titlebar-right">
      ${getRoleLevel(fb.profile?.role||'utilisateur') >= 2 ? `
      <button class="admin-access-btn" onclick="openAdminPanel()">
        <div class="admin-dot"></div>Administration
      </button>` : ''}
      <div class="titlebar-controls">
        ${getRoleLevel(fb.profile?.role) >= 2 ? `<button class="win-btn" onclick="showDiagnosticsPanel()" title="Diagnostics (Ctrl+Shift+D)" style="font-size:11px;opacity:.6">🔍</button>` : ''}
        <button class="win-btn" onclick="api.win.minimize()" title="Réduire">─</button>
        <button class="win-btn" onclick="api.win.maximize()" title="Agrandir">□</button>
        <button class="win-btn" onclick="api.win.close()" title="Masquer dans le tray">✕</button>
        <button class="win-btn quit" onclick="api.win.quit()" title="Quitter l'application">⏻</button>
      </div>
    </div>
  </div>`;
}

function renderSidebar() {
  const nav = [
    { page:'timer',      icon:'⏱️', label:'Timer' },
    { page:'stats',      icon:'📊', label:'Statistiques' },
    { page:'paliers',    icon:'🏆', label:'Progression' },
    { page:'shop',       icon:'🛍️', label:'Boutique' },
    { page:'flashcards', icon:'🃏', label:'Flashcards' },
    { page:'badges',     icon:'🏅', label:'Succès' },
    { page:'history',    icon:'📋', label:'Historique' },
  ];
  const nav2 = [
    { page:'notifs',   icon:'🔔', label:'Notifications' },
    { page:'rewards',  icon:'🎁', label:'Récompenses' },
    { page:'settings', icon:'⚙️', label:'Paramètres' },
  ];

  const cp = state.currentPage || 'timer';
  const name = fb.profile?.displayName || fb.auth.currentUser?.displayName || 'Utilisateur';
  const email = fb.auth.currentUser?.email || '';
  const role = fb.profile?.role || 'utilisateur';
  const roleInfo = ROLES[role] || ROLES['utilisateur'];
  const initials = name.charAt(0).toUpperCase();

  const navBtns1 = nav.map(n => `
    <button class="nav-btn ${cp===n.page?'active':''}" onclick="navigate('${n.page}')">
      <span class="nav-icon">${n.icon}</span>${n.label}
    </button>`).join('');

  const navBtns2 = nav2.map(n => `
    <button class="nav-btn ${cp===n.page?'active':''}" onclick="navigate('${n.page}')">
      <span class="nav-icon">${n.icon}</span>${n.label}
    </button>`).join('');

  const streak = state.streak || 1;
  const multiplierActive = state.settings?.streakMultiplier && streak >= 3;

  const el = document.getElementById('sidebar');
  el.innerHTML = `
    <!-- Profil HabboCity style -->
    <div class="sidebar-profile">
      <div class="sidebar-profile-inner">
        <div class="sidebar-avatar">${initials}</div>
        <div class="sidebar-profile-info">
          <div class="sidebar-profile-name">${name}</div>
          <div class="sidebar-profile-email" title="${email}">${email}</div>
        </div>
      </div>
      <div style="margin-top:8px">
        <span class="role-badge ${roleInfo.css}">${roleInfo.emoji} ${roleInfo.label}</span>
      </div>
    </div>

    <!-- Navigation -->
    <div class="sidebar-nav">
      <span class="sidebar-section-label">Principal</span>
      ${navBtns1}
      <span class="sidebar-section-label">Options</span>
      ${navBtns2}
    </div>

    <!-- Tokens + Streak -->
    <div class="sidebar-bottom">
      <div class="sidebar-tokens-box">
        <div class="sidebar-tokens-num">${state.tokens ?? 0}</div>
        <div class="sidebar-tokens-label">🪙 Jetons</div>
        <div class="sidebar-streak">🔥 ${streak} jour${streak>1?'s':''}</div>
        ${multiplierActive ? `<div class="multiplier-badge">⚡ ×${(1 + (streak-1)*0.1).toFixed(1)} boost</div>` : ''}
        <div class="quick-adjust">
          <button class="qa-btn" onclick="quickAdjust(-1)" title="-1 jeton">−</button>
          <span class="qa-label">ajuster</span>
          <button class="qa-btn" onclick="quickAdjust(1)" title="+1 jeton">+</button>
        </div>
      </div>
      <button class="btn btn-danger btn-sm" style="width:100%;justify-content:center" onclick="signOutUser()">
        ← Se déconnecter
      </button>
    </div>`;
}

function renderTimerPage() {
  const subjects = state.settings.subjects || SUBJECTS_DEFAULT;
  return `
  <div class="timer-page">
    <div class="timer-mode-tabs">
      <button class="mode-tab ${timerState.mode==='chrono'?'active chrono':''}" onclick="switchTimerMode('chrono')">⏱ Chronomètre</button>
      <button class="mode-tab ${timerState.mode==='pomodoro'?'active pomodoro':''}" onclick="switchTimerMode('pomodoro')">🍅 Pomodoro</button>
    </div>
    <div class="subject-row">
      ${subjects.map(s=>`<button class="subject-chip ${timerState.subject===s?'active':''}" data-subj="${s}" onclick="selectSubject('${s}')">${s}</button>`).join('')}
    </div>
    <div class="timer-circle-wrap">
      <svg class="timer-svg" viewBox="0 0 300 300">
        <circle class="timer-track" cx="150" cy="150" r="${CIRCLE_R}"/>
        <circle id="timer-ring" class="timer-ring chrono" cx="150" cy="150" r="${CIRCLE_R}"
          stroke-dasharray="${CIRCLE_C}" stroke-dashoffset="${CIRCLE_C}"/>
      </svg>
      <div class="timer-inner">
        <div class="timer-display-big idle" id="timer-display">00:00</div>
        <div class="timer-phase-label chrono" id="timer-phase">⏱ Chronomètre</div>
        <div class="timer-session-label" id="timer-subj-label">${timerState.subject||'Aucune matière'}</div>
      </div>
    </div>
    <div class="pomodoro-cycles" id="pomodoro-cycles" style="display:${timerState.mode==='pomodoro'?'flex':'none'}"></div>
    <div class="token-progress-row" id="token-progress-row" style="${timerState.mode==='pomodoro'?'display:none':''}">
      <div class="token-progress-bar-wrap"><div class="token-progress-bar" id="token-progress-bar" style="width:0%"></div></div>
      <div class="token-progress-text" id="token-progress-text"><span>${fmt(state.settings.minutesPerToken*60)}</span> → 🪙</div>
    </div>
    <div class="timer-controls-big">
      <button class="btn-circle stop" id="timer-stop" onclick="stopTimer()" style="display:none">⏹</button>
      <button class="btn-circle play" id="timer-play" onclick="startTimer()">▶</button>
      <button class="btn-circle pause" id="timer-pause" onclick="pauseTimer()" style="display:none">⏸</button>
      <button class="btn-circle skip" id="timer-skip" onclick="skipPomodoroPhase()" style="display:none">⏭</button>
    </div>
    ${timerState.mode==='pomodoro' ? `
    <div class="pomodoro-settings">
      <div class="pomo-setting"><label>Travail</label><input class="pomo-mini-input" id="pomo-work" type="number" min="1" max="60" value="${timerState.pomodoroWork}" onchange="updatePomoSetting()"/><span>min</span></div>
      <div class="pomo-divider"></div>
      <div class="pomo-setting"><label>Pause</label><input class="pomo-mini-input" id="pomo-break" type="number" min="1" max="30" value="${timerState.pomodoroBreak}" onchange="updatePomoSetting()"/><span>min</span></div>
      <div class="pomo-divider"></div>
      <div class="pomo-setting"><label>Cycles</label><input class="pomo-mini-input" id="pomo-cycles" type="number" min="1" max="8" value="${timerState.pomodoroCycles}" onchange="updatePomoSetting()"/></div>
    </div>` : ''}
  </div>`;
}

function updatePomoSetting() {
  if (timerState.running) return;
  timerState.pomodoroWork   = parseInt(document.getElementById('pomo-work')?.value||25);
  timerState.pomodoroBreak  = parseInt(document.getElementById('pomo-break')?.value||5);
  timerState.pomodoroCycles = parseInt(document.getElementById('pomo-cycles')?.value||4);
  timerState.pomodoroPhaseSeconds = timerState.pomodoroWork * 60;
  updateTimerUI();
}

function bindTimerEvents() {
  updateTimerUI();
  // Subj label live
  setInterval(() => {
    const el = document.getElementById('timer-subj-label');
    if (el) el.textContent = timerState.subject || 'Aucune matière';
  }, 2000);
}

// ── PALIERS PAGE ──────────────────────────────────
function renderPaliersPage() {
  const current = getCurrentPalierIndex();
  const next = getNextPalier();
  const pct = next ? Math.min(100,(state.lifetimeTokens/next.tokens)*100) : 100;
  return `
  <div class="page-header">
    <h1 class="page-title"><div class="page-title-icon">🏆</div>Progression</h1>
    <p class="page-subtitle">Accumule des jetons pour débloquer des niveaux.</p>
  </div>
  <div class="card">
    <div class="palier-bar-wrap">
      <div class="palier-bar-track">
        <div class="palier-bar-fill" style="width:${pct}%"></div>
        ${PALIERS.map((p,i)=>{
          const pos = i/(PALIERS.length-1)*100;
          const unlocked = state.lifetimeTokens >= p.tokens;
          return `<div class="palier-milestone ${unlocked?'unlocked':''}" style="left:${pos}%">
            <div class="palier-bubble">${p.emoji}<div class="palier-bubble-check">✓</div></div>
            <div class="palier-meta">
              <div class="palier-bubble-name">${p.name}</div>
              <div class="palier-bubble-req">${p.tokens}🪙</div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
    <div class="palier-tokens-display">
      <div class="palier-token-stat"><div class="palier-token-val">${state.tokens}</div><div class="palier-token-label">Disponibles</div></div>
      <div class="palier-token-stat"><div class="palier-token-val">${state.lifetimeTokens}</div><div class="palier-token-label">Total gagné</div></div>
      <div class="palier-next-info">${next?`Prochain : <span>${next.tokens-state.lifetimeTokens} jetons</span> → ${next.emoji} ${next.name}`:'🏆 Niveau max atteint !'}</div>
    </div>
  </div>
  <div class="dash-grid">
    <div class="stat-card"><div class="stat-icon teal">⏱️</div><div><div class="stat-val">${Math.floor(state.totalMinutes/60)}h${state.totalMinutes%60}m</div><div class="stat-label">Temps total</div></div></div>
    <div class="stat-card"><div class="stat-icon gold">🔥</div><div><div class="stat-val">${state.streak}j</div><div class="stat-label">Streak actuel</div></div></div>
    <div class="stat-card"><div class="stat-icon mint">📚</div><div><div class="stat-val">${state.sessions.length}</div><div class="stat-label">Sessions</div></div></div>
  </div>`;
}

// ── SHOP PAGE ─────────────────────────────────────
function renderShopPage() {
  const palierIdx = getCurrentPalierIndex();
  const monthKey = getMonthKey();
  return `
  <div class="page-header">
    <h1 class="page-title"><div class="page-title-icon">🛍️</div>Boutique</h1>
    <p class="page-subtitle">Dépense tes jetons pour te récompenser. Tu as <strong style="color:var(--accent)">${state.tokens} 🪙</strong>.</p>
  </div>
  <div class="rewards-grid">
    ${state.rewards.map(r => {
      const locked = r.palier > palierIdx;
      const redeemed = (state.redeemedCount[monthKey]?.[r.id]||0);
      const limitOk = !r.monthLimit || redeemed < r.monthLimit;
      const canBuy = !locked && state.tokens >= r.cost && limitOk;
      return `
      <div class="reward-card ${locked?'locked':''}">
        ${redeemed>0?`<div class="redeemed-badge">×${redeemed} ce mois</div>`:''}
        <div class="reward-emoji">${r.emoji}</div>
        <div><div class="reward-name">${r.name}</div><div class="reward-desc">${r.desc}</div></div>
        <div class="reward-tags">${(r.tags||[]).map(t=>`<span class="tag teal">${t}</span>`).join('')}
          ${r.monthLimit?`<span class="tag gold">${redeemed}/${r.monthLimit}/mois</span>`:''}
        </div>
        <div class="reward-footer">
          <div class="reward-cost">${r.cost} 🪙</div>
          <button class="btn btn-primary btn-sm" ${!canBuy?'disabled':''} onclick="redeemReward('${r.id}')">
            ${locked?'🔒 Palier':!limitOk?'Limite':'Utiliser'}
          </button>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

async function redeemReward(id) {
  const r = state.rewards.find(x=>x.id===id);
  if (!r || state.tokens < r.cost) return;
  state.tokens -= r.cost;
  const mk = getMonthKey();
  if (!state.redeemedCount[mk]) state.redeemedCount[mk] = {};
  state.redeemedCount[mk][r.id] = (state.redeemedCount[mk][r.id]||0) + 1;
  await saveField('tokens', state.tokens);
  await saveField('redeemedCount', state.redeemedCount);
  updateSidebarTokens();
  showToast(`🎉 ${r.name} utilisé !`, 'success');
  renderMainContent();
}

// ── MANAGE PAGE ───────────────────────────────────
function renderManagePage() {
  return `
  <div class="page-header">
    <h1 class="page-title"><div class="page-title-icon">⚙️</div>Gérer les récompenses</h1>
  </div>
  <div style="margin-bottom:12px"><button class="btn btn-primary btn-sm" onclick="openAddRewardModal()">+ Ajouter une récompense</button></div>
  <div class="manage-list">
    ${state.rewards.map(r=>`
    <div class="manage-item">
      <div class="manage-item-emoji">${r.emoji}</div>
      <div class="manage-item-info">
        <div class="manage-item-name">${r.name}</div>
        <div class="manage-item-desc">${r.desc}</div>
        <div class="manage-item-tags">${(r.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('')}<span class="tag gold">${r.cost}🪙</span>${r.monthLimit?`<span class="tag">${r.monthLimit}/mois</span>`:''}</div>
      </div>
      <div class="manage-item-actions">
        <button class="btn btn-secondary btn-sm" onclick="openEditRewardModal('${r.id}')">✏️</button>
        <button class="btn btn-danger btn-sm" onclick="confirmDeleteReward('${r.id}')">🗑</button>
      </div>
    </div>`).join('')}
  </div>`;
}

function openAddRewardModal() { openRewardModal(null); }
function openEditRewardModal(id) { openRewardModal(state.rewards.find(r=>r.id===id)); }

let _editEmoji = '🎁';
function openRewardModal(reward) {
  document.getElementById('reward-modal')?.remove();
  _editEmoji = reward?.emoji || '🎁';
  const modal = document.createElement('div');
  modal.className='modal-overlay'; modal.id='reward-modal';
  modal.innerHTML=`<div class="modal">
    <div class="modal-header">
      <div class="modal-title">${reward?'✏️ Modifier':'➕ Ajouter'} une récompense</div>
      <button class="modal-close" onclick="document.getElementById('reward-modal').remove()">✕</button>
    </div>
    <div class="form-group"><label class="form-label">Emoji</label>
      <div class="emoji-grid">${EMOJIS.map(e=>`<button class="emoji-btn ${e===_editEmoji?'selected':''}" onclick="selectEmoji('${e}')">${e}</button>`).join('')}</div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Nom</label><input type="text" class="form-input" id="r-name" value="${reward?.name||''}"/></div>
      <div class="form-group"><label class="form-label">Coût (jetons)</label><input type="number" class="form-input" id="r-cost" value="${reward?.cost||5}" min="1"/></div>
    </div>
    <div class="form-group"><label class="form-label">Description</label><input type="text" class="form-input" id="r-desc" value="${reward?.desc||''}"/></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Limite mensuelle (0=∞)</label><input type="number" class="form-input" id="r-limit" value="${reward?.monthLimit||0}" min="0"/></div>
      <div class="form-group"><label class="form-label">Palier requis (0-4)</label><input type="number" class="form-input" id="r-palier" value="${reward?.palier||0}" min="0" max="4"/></div>
    </div>
    <div class="confirm-actions">
      <button class="btn btn-secondary" onclick="document.getElementById('reward-modal').remove()">Annuler</button>
      <button class="btn btn-primary" onclick="saveReward('${reward?.id||''}')">💾 Sauvegarder</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{if(e.target===modal)modal.remove()});
}

function selectEmoji(e) {
  _editEmoji = e;
  document.querySelectorAll('.emoji-btn').forEach(b=>b.classList.toggle('selected',b.textContent===e));
}

async function saveReward(id) {
  const name = document.getElementById('r-name')?.value.trim();
  if (!name) { showToast('❌ Nom requis','error'); return; }
  const reward = {
    id: id || 'r'+Date.now(), emoji:_editEmoji, name,
    desc: document.getElementById('r-desc')?.value.trim()||'',
    cost: parseInt(document.getElementById('r-cost')?.value||5),
    monthLimit: parseInt(document.getElementById('r-limit')?.value||0)||null,
    palier: parseInt(document.getElementById('r-palier')?.value||0),
    tags: [],
  };
  if (id) { const i=state.rewards.findIndex(r=>r.id===id); if(i>=0) state.rewards[i]=reward; }
  else state.rewards.push(reward);
  await saveField('rewards', state.rewards);
  document.getElementById('reward-modal')?.remove();
  showToast('✅ Récompense sauvegardée','success');
  renderMainContent();
}

function confirmDeleteReward(id) {
  const r = state.rewards.find(x=>x.id===id);
  const modal = document.createElement('div'); modal.className='modal-overlay';
  modal.innerHTML=`<div class="modal" style="max-width:380px">
    <div class="modal-header"><div class="modal-title">🗑 Supprimer</div><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button></div>
    <p class="confirm-text">Supprimer <strong>${r?.name}</strong> ?</p>
    <div class="confirm-actions">
      <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
      <button class="btn btn-danger" onclick="deleteReward('${id}',this.closest('.modal-overlay'))">Supprimer</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{if(e.target===modal)modal.remove()});
}

async function deleteReward(id, modalEl) {
  state.rewards = state.rewards.filter(r=>r.id!==id);
  await saveField('rewards', state.rewards);
  modalEl?.remove(); showToast('🗑 Supprimé','teal'); renderMainContent();
}

// ── HISTORY PAGE ──────────────────────────────────
function renderHistoryPage() {
  return `
  <div class="page-header">
    <h1 class="page-title"><div class="page-title-icon">📋</div>Historique</h1>
    <p class="page-subtitle">${state.sessions.length} session${state.sessions.length>1?'s':''} enregistrée${state.sessions.length>1?'s':''}</p>
  </div>
  ${!state.sessions.length ? `
  <div class="history-empty"><div class="empty-icon">📭</div>Aucune session pour l'instant.<br>Lance le timer pour commencer !</div>
  ` : `
  <div class="history-list">
    ${state.sessions.slice(0,50).map(s=>{
      const h = Math.floor(s.minutes/60); const m = s.minutes%60;
      return `<div class="history-item">
        <div class="history-item-dot"></div>
        <div class="history-item-info">
          <div class="history-item-subject">${s.subject||'Général'} ${s.mode==='pomodoro'?'🍅':''}</div>
          <div class="history-item-date">${fmtDate(s.date)}</div>
        </div>
        <div class="history-item-stats">
          <div class="history-stat"><div class="history-stat-val" style="color:var(--accent-light)">${h>0?`${h}h${m}m`:`${m}m`}</div><div class="history-stat-label">durée</div></div>
          <div class="history-stat"><div class="history-stat-val" style="color:var(--gold)">+${s.tokensEarned||0}🪙</div><div class="history-stat-label">jetons</div></div>
        </div>
      </div>`;
    }).join('')}
  </div>`}`;
}

// ── NOTIFICATIONS PAGE ────────────────────────────
function renderNotifsPage() {
  const n = state.settings.notifications;
  const row=(key,title,desc)=>`
  <div class="notif-row">
    <div class="notif-info"><div class="notif-title">${title}</div><div class="notif-desc">${desc}</div></div>
    <div class="notif-control">
      <label class="toggle"><input type="checkbox" ${n[key]?'checked':''} onchange="toggleNotif('${key}',this.checked)"/><span class="toggle-slider"></span></label>
    </div>
  </div>`;
  return `
  <div class="page-header"><h1 class="page-title"><div class="page-title-icon">🔔</div>Notifications</h1></div>
  <div class="card">
    ${row('daily','📅 Rappel quotidien','Rappel chaque jour pour étudier')}
    ${row('break','☕ Rappel de pause','Alerte toutes les heures si tu travailles')}
    ${row('streak','🔥 Streak en danger','Alerte si tu risques de perdre ton streak')}
  </div>`;
}

async function toggleNotif(key, val) {
  state.settings.notifications[key] = val;
  await saveField('settings', state.settings);
}

// ── SETTINGS PAGE ─────────────────────────────────
function renderSettingsPage() {
  const mpts = [5,10,15,20];
  const zooms = [0.8,0.9,1.0,1.1,1.2,1.3];
  return `
  <div class="page-header">
    <h1 class="page-title"><div class="page-title-icon">⚙️</div>Paramètres</h1>
    <p class="page-subtitle">Personnalise StudyTokens selon tes préférences.</p>
  </div>
  <div class="settings-grid">
    <div class="setting-card">
      <div class="setting-title">⏱️ Taux de jetons</div>
      <div class="setting-desc">Minutes d'étude pour 1 jeton.</div>
      <div class="options-row">
        ${mpts.map(m=>`<button class="option-btn ${state.settings.minutesPerToken===m?'active':''}" onclick="setSetting('minutesPerToken',${m})">${m} min</button>`).join('')}
      </div>
    </div>
    <div class="setting-card">
      <div class="setting-title">🔍 Zoom interface</div>
      <div class="setting-desc">Agrandir ou réduire l'affichage.</div>
      <div class="options-row">
        ${zooms.map(z=>`<button class="option-btn ${state.settings.zoom===z?'active':''}" onclick="setZoom(${z})">${Math.round(z*100)}%</button>`).join('')}
      </div>
    </div>
    <div class="setting-card" style="grid-column:1/-1">
      <div class="setting-title">📚 Matières du timer</div>
      <div class="setting-desc">Séparées par des virgules.</div>
      <div style="display:flex;gap:9px;align-items:center">
        <input type="text" class="form-input" id="subjects-input" value="${state.settings.subjects.join(', ')}" />
        <button class="btn btn-secondary btn-sm" onclick="saveSubjects()">Sauvegarder</button>
      </div>
    </div>
    <div class="setting-card">
      <div class="setting-title">🪙 Ajustement manuel</div>
      <div class="setting-desc">Corriger ton solde de jetons.</div>
      <div style="display:flex;gap:7px;align-items:center">
        <input type="number" class="form-input" id="manual-tokens" value="${state.tokens}" min="0" style="width:100px"/>
        <button class="btn btn-secondary btn-sm" onclick="setManualTokens()">Appliquer</button>
      </div>
    </div>
    <div class="setting-card" style="border-color:rgba(224,82,82,.18)">
      <div class="setting-title" style="color:var(--red)">⚠️ Réinitialiser</div>
      <div class="setting-desc">Supprimer toutes les données. Irréversible !</div>
      <button class="btn btn-danger btn-sm" onclick="confirmReset()">🗑 Réinitialiser</button>
    </div>
  </div>`;
}

async function setTheme(theme, isPremium) {
  // Vérifier les permissions selon le rang Firebase
  const role = fb.profile?.role || 'utilisateur';
  const roleLevel = getRoleLevel(role);

  if (isPremium === 'true' && roleLevel < 1) {
    // Utilisateur de base → bloqué
    showToast('✨ Ce thème est réservé aux Utilisateurs Pro', 'teal');
    return;
  }
  // Pro, Modérateur, Administrateur, Fondateur → accès libre
  state.settings.theme = theme;
  await saveField('settings', state.settings);
  // Theme unique - pas de changement
  renderMainContent();
  showToast(`🎨 Thème "${THEMES[theme]?.label||theme}" activé`, 'teal');
}


function showPremiumThemeInfo(theme) {
  showToast(`✨ ${THEMES[theme].label} — Disponible en Utilisateur Pro (1€/mois)`, 'teal', 4000);
}

async function setSetting(key, val) {
  state.settings[key] = val;
  await saveField('settings', state.settings);
  renderMainContent();
}

async function setZoom(z) {
  state.settings.zoom = z;
  await saveField('settings', state.settings);
  if (api.win?.setZoom) api.win.setZoom(z);
  renderMainContent();
}

async function saveSubjects() {
  const val = document.getElementById('subjects-input')?.value;
  if (!val) return;
  state.settings.subjects = val.split(',').map(s=>s.trim()).filter(Boolean);
  await saveField('settings', state.settings);
  showToast('✅ Matières sauvegardées','success');
  renderMainContent();
}

async function setManualTokens() {
  const val = parseInt(document.getElementById('manual-tokens')?.value);
  if (isNaN(val)||val<0) return;
  state.tokens = val;
  await saveField('tokens', val);
  updateSidebarTokens();
  showToast(`✅ Solde mis à jour : ${val} 🪙`,'success');
}

function confirmReset() {
  const modal = document.createElement('div'); modal.className='modal-overlay';
  modal.innerHTML=`<div class="modal" style="max-width:380px">
    <div class="modal-header"><div class="modal-title">⚠️ Réinitialiser</div></div>
    <p class="confirm-text">Toutes tes données seront supprimées définitivement. Cette action est irréversible.</p>
    <div class="confirm-actions">
      <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
      <button class="btn btn-danger" onclick="resetAll(this.closest('.modal-overlay'))">Réinitialiser</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{if(e.target===modal)modal.remove()});
}

async function resetAll(modalEl) {
  const keys=['tokens','lifetimeTokens','totalMinutes','streak','lastStudyDate','sessions','rewards','redeemedCount','settings'];
  for(const k of keys) await api.store.set(k,null);
  modalEl?.remove();
  location.reload();
}

// ── Déconnexion ───────────────────────────────
function confirmSignOut() {
  const modal = document.createElement('div'); modal.className='modal-overlay';
  modal.innerHTML=`<div class="modal" style="max-width:360px">
    <div class="modal-header"><div class="modal-title">↩ Se déconnecter</div></div>
    <p class="confirm-text">Tes données sont sauvegardées sur le cloud. Tu peux te reconnecter à tout moment.</p>
    <div class="confirm-actions">
      <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
      <button class="btn btn-danger" onclick="this.closest('.modal-overlay').remove();signOut()">Se déconnecter</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{if(e.target===modal)modal.remove()});
}


// ── AUTO UPDATER UI ───────────────────────────────
function initUpdater() {
  if (!api.updater) return;
  api.updater.onStatus(data => {
    document.getElementById('update-banner')?.remove();
    if (data.type === 'uptodate' || data.type === 'checking') return;
    const banner = document.createElement('div'); banner.id='update-banner';
    const bars = {
      available: `<div class="update-bar available">⬆️ Mise à jour v${data.version} disponible — téléchargement...</div>`,
      downloading: `<div class="update-bar downloading">⬇️ Téléchargement ${data.percent||0}%...<div class="update-progress"><div class="update-progress-fill" style="width:${data.percent||0}%"></div></div></div>`,
      downloaded: `<div class="update-bar downloaded" style="cursor:pointer" onclick="api.updater.install()">✅ Mise à jour prête — Cliquer pour installer</div>`,
    };
    banner.innerHTML = bars[data.type]||'';
    if (banner.innerHTML) document.body.appendChild(banner);
  });
}
