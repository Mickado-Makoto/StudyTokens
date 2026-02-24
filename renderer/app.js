/* ================================================
   StudyTokens v1.1 — Thème Médical/Infirmier
   ================================================ */

// ===== CONSTANTES =====
const EMOJIS = ['📚','📖','🩺','💊','🩹','🧠','🫀','🫁','🦴','🧬','💉','🔬',
  '☕','🍫','🍔','🍕','🎮','🎬','📱','🏃','🛁','🚿','😴','🎵','🍜','🧁',
  '⚡','🔥','💪','🎯','✨','🏆','💎','🌙','⭐','🎊','🎁','🛒','🍦','🥤'];

const PALIERS = [
  { id:'basique',        name:'Basique',         icon:'📘', minLifetime:0   },
  { id:'boissons',       name:'Boissons',         icon:'☕', minLifetime:5   },
  { id:'snacks',         name:'Snacks',           icon:'🍫', minLifetime:15  },
  { id:'soins',          name:'Soins perso.',     icon:'🚿', minLifetime:30  },
  { id:'divertissement', name:'Divertissement',   icon:'🎮', minLifetime:60  },
  { id:'premium',        name:'Premium',          icon:'🏆', minLifetime:100 },
];

const DEFAULT_REWARDS = [
  { id:'r1', emoji:'🚿', name:'Douche',       desc:'Une bonne douche chaude 😌', cost:1,  palier:'soins',          limitPerMonth:0, category:'Soins personnels' },
  { id:'r2', emoji:'☕', name:'Boisson',      desc:'Café, thé, coca...',          cost:2,  palier:'boissons',       limitPerMonth:0, category:'Boisson' },
  { id:'r3', emoji:'🍫', name:'Snack',        desc:'Chocolat ou autre snack',     cost:2,  palier:'snacks',         limitPerMonth:0, category:'Snack' },
  { id:'r4', emoji:'🎮', name:'Jeux vidéo',   desc:'1 heure de gaming',           cost:15, palier:'divertissement', limitPerMonth:0, category:'Divertissement' },
  { id:'r5', emoji:'🎬', name:'Série / Film', desc:'Un épisode ou un film',       cost:10, palier:'divertissement', limitPerMonth:0, category:'Divertissement' },
  { id:'r6', emoji:'🍔', name:'Burger King',  desc:'Récompense premium 🔥',       cost:50, palier:'premium',        limitPerMonth:2, category:'Premium' },
];

const DEFAULT_SUBJECTS = ['Anatomie','Pharmacologie','Soins infirmiers','Biologie','Pathologies','Autre'];

// ===== STATE =====
let state = {
  tokens: 0,
  lifetimeTokens: 0,
  streak: 0,
  lastStudyDate: null,
  totalMinutes: 0,
  sessions: [],
  rewards: [],
  redeemedHistory: [],
  settings: {
    minutesPerToken: 10,
    subjects: [...DEFAULT_SUBJECTS],
    zoom: 1.0,
    notifBreakReminder: true,
    notifBreakMinutes: 50,
    notifDailyReminder: false,
    notifDailyTime: '09:00',
    notifTokenEarned: true,
  },
  currentPage: 'dashboard',
  timer: {
    running: false,
    paused: false,
    seconds: 0,
    subject: DEFAULT_SUBJECTS[0],
    intervalId: null,
  },
};

// ===== NOTIFICATION SYSTEM =====
let dailyReminderTimeout = null;
let breakReminderTimeout = null;

function sendNotif(title, body) {
  try { api.notify(title, body) } catch(e) {}
}

function scheduleBreakReminder() {
  clearTimeout(breakReminderTimeout);
  if (!state.settings.notifBreakReminder) return;
  const ms = state.settings.notifBreakMinutes * 60 * 1000;
  breakReminderTimeout = setTimeout(() => {
    sendNotif('⏸ StudyTokens — Pause !', `Tu étudies depuis ${state.settings.notifBreakMinutes} min. Prends une vraie pause !`);
  }, ms);
}

function cancelBreakReminder() {
  clearTimeout(breakReminderTimeout);
}

function scheduleDailyReminder() {
  clearTimeout(dailyReminderTimeout);
  if (!state.settings.notifDailyReminder) return;
  const [h, m] = state.settings.notifDailyTime.split(':').map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(h, m, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  const ms = target - now;
  dailyReminderTimeout = setTimeout(() => {
    sendNotif('📚 StudyTokens — C\'est l\'heure d\'étudier !', 'Commence ta session et gagne des jetons 🏥');
    scheduleDailyReminder(); // re-schedule for next day
  }, ms);
}

// ===== STORE =====
async function loadState() {
  try {
    state.tokens          = await api.store.get('tokens', 0);
    state.lifetimeTokens  = await api.store.get('lifetimeTokens', 0);
    state.streak          = await api.store.get('streak', 0);
    state.lastStudyDate   = await api.store.get('lastStudyDate', null);
    state.totalMinutes    = await api.store.get('totalMinutes', 0);
    state.sessions        = await api.store.get('sessions', []);
    state.rewards         = await api.store.get('rewards', DEFAULT_REWARDS);
    state.redeemedHistory = await api.store.get('redeemedHistory', []);
    state.settings        = { ...state.settings, ...await api.store.get('settings', {}) };

    // BUG FIX: Si tokens > lifetimeTokens (ex: jetons ajoutés manuellement)
    // On synchronise lifetimeTokens au minimum
    if (state.tokens > state.lifetimeTokens) {
      state.lifetimeTokens = state.tokens;
      await saveField('lifetimeTokens', state.lifetimeTokens);
    }

    checkStreak();
    applyZoom(state.settings.zoom);
    scheduleDailyReminder();
  } catch(e) {
    state.rewards = DEFAULT_REWARDS;
  }
}

async function saveField(key, value) { await api.store.set(key, value); }

// ===== ZOOM =====
function applyZoom(factor) {
  try { api.win.setZoom(factor); } catch(e) {}
}

// ===== STREAK =====
function checkStreak() {
  if (!state.lastStudyDate) return;
  const diff = Math.floor((Date.now() - new Date(state.lastStudyDate)) / 86400000);
  if (diff > 1) { state.streak = 0; saveField('streak', 0); }
}

function updateStreak() {
  const today = new Date().toDateString();
  if (state.lastStudyDate === today) return;
  const last = state.lastStudyDate ? new Date(state.lastStudyDate) : null;
  if (last) {
    const diff = Math.floor((new Date() - last) / 86400000);
    state.streak = diff === 1 ? state.streak + 1 : 1;
  } else {
    state.streak = 1;
  }
  state.lastStudyDate = today;
  saveField('streak', state.streak);
  saveField('lastStudyDate', state.lastStudyDate);
}

// ===== TIMER =====
function startTimer() {
  if (state.timer.running) return;
  state.timer.running = true;
  state.timer.paused = false;
  scheduleBreakReminder();
  state.timer.intervalId = setInterval(() => {
    state.timer.seconds++;
    updateTimerUI();
    const secs = state.settings.minutesPerToken * 60;
    if (state.timer.seconds > 0 && state.timer.seconds % secs === 0) {
      awardToken();
    }
  }, 1000);
  updateTimerUI();
  renderControls();
}

function pauseTimer() {
  if (!state.timer.running) return;
  clearInterval(state.timer.intervalId);
  state.timer.running = false;
  state.timer.paused = true;
  cancelBreakReminder();
  updateTimerUI();
  renderControls();
}

async function stopTimer() {
  if (!state.timer.running && !state.timer.paused) return;
  clearInterval(state.timer.intervalId);
  state.timer.running = false;
  state.timer.paused = false;
  cancelBreakReminder();
  const seconds = state.timer.seconds;
  const minutes = Math.floor(seconds / 60);

  if (minutes >= 1) {
    const tokensEarned = Math.floor(seconds / (state.settings.minutesPerToken * 60));
    const session = {
      id: Date.now().toString(),
      subject: state.timer.subject,
      seconds, minutes, tokensEarned,
      date: new Date().toISOString(),
    };
    state.sessions.unshift(session);
    if (state.sessions.length > 200) state.sessions.pop();
    state.totalMinutes += minutes;
    await saveField('sessions', state.sessions);
    await saveField('totalMinutes', state.totalMinutes);
    updateStreak();
    sendNotif('✅ StudyTokens — Session terminée !', `${fmtTime(seconds)} d'étude sur ${state.timer.subject}. Bravo ! 🏆`);
    showToast(`✅ ${fmtTime(seconds)} d'étude enregistrés !`, 'success');
  }

  state.timer.seconds = 0;
  updateTimerUI();
  renderControls();
}

async function awardToken() {
  state.tokens++;
  state.lifetimeTokens++;
  await saveField('tokens', state.tokens);
  await saveField('lifetimeTokens', state.lifetimeTokens);
  showTokenPop();
  updateSidebarTokens();
  if (state.settings.notifTokenEarned) {
    sendNotif('🪙 +1 Jeton gagné !', `Tu as maintenant ${state.tokens} jetons disponibles.`);
  }
  // Pulse dot animation
  const dot = document.querySelector('.timer-pulse-dot');
  if (dot) { dot.classList.remove('beat'); void dot.offsetWidth; dot.classList.add('beat'); }
}

function updateSidebarTokens() {
  const el = document.getElementById('sidebar-tokens-num');
  if (el) el.textContent = state.tokens;
  const st = document.getElementById('sidebar-streak');
  if (st) st.innerHTML = state.streak > 0
    ? `🔥 ${state.streak} jour${state.streak > 1 ? 's' : ''} de streak` : '';
}

function renderControls() {
  const wrap = document.getElementById('timer-controls-wrap');
  if (!wrap) return;
  wrap.innerHTML = buildControls();
}

function buildControls() {
  const { running, paused } = state.timer;
  if (!running && !paused) return `<button class="btn btn-primary" onclick="startTimer()">▶ Démarrer</button>`;
  if (running) return `
    <button class="btn btn-secondary" onclick="pauseTimer()">⏸ Pause</button>
    <button class="btn btn-danger btn-sm" onclick="stopTimer()">⏹ Terminer</button>`;
  return `
    <button class="btn btn-primary" onclick="startTimer()">▶ Reprendre</button>
    <button class="btn btn-danger btn-sm" onclick="stopTimer()">⏹ Terminer</button>`;
}

// ===== TIME FORMATTING =====
function fmtTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}
function pad(n) { return String(n).padStart(2, '0'); }

// ===== TIMER UI UPDATE (no full re-render) =====
function updateTimerUI() {
  const displayEl = document.getElementById('timer-display');
  const barEl     = document.getElementById('timer-progress-bar');
  const textEl    = document.getElementById('timer-progress-text');
  if (!displayEl) return;

  displayEl.textContent = fmtTime(state.timer.seconds);
  displayEl.className = `timer-display${state.timer.running?' running':state.timer.paused?' paused':''}`;

  const secs = state.settings.minutesPerToken * 60;
  const pct  = state.timer.seconds > 0 ? ((state.timer.seconds % secs) / secs * 100) : 0;
  if (barEl) barEl.style.width = pct + '%';

  if (textEl) {
    if (state.timer.seconds === 0) {
      textEl.innerHTML = `<span>${state.settings.minutesPerToken} min</span> = 1 jeton`;
    } else {
      const toNext = secs - (state.timer.seconds % secs);
      const earned = Math.floor(state.timer.seconds / secs);
      textEl.innerHTML = `Prochain jeton dans <span>${fmtTime(toNext)}</span> · ${earned} jeton${earned>1?'s':''} cette session`;
    }
  }
}

// ===== PALIER HELPERS =====
function isPalierUnlocked(palierId) {
  const p = PALIERS.find(x => x.id === palierId);
  return !p || state.lifetimeTokens >= p.minLifetime;
}

function getNextPalier() {
  return PALIERS.find(p => p.minLifetime > state.lifetimeTokens) || null;
}

// ===== MONTHLY USAGE =====
function getMonthlyUsage(rewardId) {
  const now = new Date();
  return state.redeemedHistory.filter(r => {
    if (r.rewardId !== rewardId) return false;
    const d = new Date(r.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
}

// ===== QUICK ADJUST TOKENS =====
async function quickAdjust(amount) {
  state.tokens = Math.max(0, state.tokens + amount);
  // Sync lifetime: if tokens went up, lifetime should too
  if (amount > 0 && state.tokens > state.lifetimeTokens) {
    state.lifetimeTokens = state.tokens;
    await saveField('lifetimeTokens', state.lifetimeTokens);
  }
  await saveField('tokens', state.tokens);
  updateSidebarTokens();
  showToast(`${amount > 0 ? '➕' : '➖'} ${Math.abs(amount)} jeton${Math.abs(amount)>1?'s':''} · Solde : ${state.tokens}`, 'teal');
  if (state.currentPage === 'shop' || state.currentPage === 'dashboard') renderMainContent();
}

// ===== REDEEM =====
async function redeemReward(rewardId) {
  const reward = state.rewards.find(r => r.id === rewardId);
  if (!reward) return;
  if (state.tokens < reward.cost) { showToast(`❌ Pas assez de jetons ! (${reward.cost} requis)`, 'error'); return; }
  if (reward.limitPerMonth > 0 && getMonthlyUsage(rewardId) >= reward.limitPerMonth) {
    showToast('❌ Limite mensuelle atteinte !', 'error'); return;
  }
  state.tokens -= reward.cost;
  state.redeemedHistory.push({ rewardId, date: new Date().toISOString() });
  await saveField('tokens', state.tokens);
  await saveField('redeemedHistory', state.redeemedHistory);
  updateSidebarTokens();
  sendNotif(`🎉 Récompense débloquée !`, `${reward.emoji} ${reward.name} — tu l'as bien mérité !`);
  showToast(`🎉 ${reward.emoji} ${reward.name} débloqué !`, 'teal');
  renderMainContent();
}

// ===== TOASTS =====
function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success:'✅', teal:'🪙', error:'❌' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type]||'📢'}</span><span class="toast-msg">${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity='0'; el.style.transition='opacity .3s'; setTimeout(()=>el.remove(),300); }, 3200);
}

function showTokenPop() {
  const el = document.createElement('div');
  el.className = 'token-pop';
  el.textContent = '+1 🪙';
  el.style.cssText = `left:${Math.random()*40+30}%;bottom:130px;`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

// ===== NAVIGATION =====
function navigate(page) {
  state.currentPage = page;
  render();
}

// ===== RENDER HELPERS =====
function renderMainContent() {
  const el = document.getElementById('main-content');
  if (el) el.innerHTML = renderPage();
  updateTimerUI();
}

// ===== FULL RENDER =====
function render() {
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = `
    <div id="app-shell">
      ${renderTitlebar()}
      <div id="body-area">
        ${renderSidebar()}
        <main id="main-content">${renderPage()}</main>
      </div>
    </div>
    <div id="toast-container"></div>
  `;
  updateTimerUI();
  updateSidebarTokens();
}

function renderTitlebar() {
  // ECG SVG path (simplified heartbeat line)
  const ecgPath = `M0,14 L30,14 L35,14 L40,4 L45,24 L50,14 L55,10 L60,14 L80,14 L90,14 L95,4 L100,24 L105,14 L110,10 L115,14 L160,14`;
  return `
  <div id="titlebar">
    <div class="titlebar-logo">
      <div class="cross">✚</div>
      <span class="app-name">Study<span class="app-accent">Tokens</span></span>
    </div>
    <div class="titlebar-center">
      <svg class="ecg-svg" viewBox="0 0 160 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="${ecgPath}" stroke="#00b4d8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>
    </div>
    <div class="titlebar-controls">
      <button class="win-btn" onclick="api.win.minimize()">─</button>
      <button class="win-btn" onclick="api.win.maximize()">□</button>
      <button class="win-btn close" onclick="api.win.close()">✕</button>
    </div>
  </div>`;
}

function renderSidebar() {
  const navItems = [
    { page:'dashboard', icon:'⏱️', label:'Dashboard'          },
    { page:'shop',      icon:'🛒', label:'Récompenses'        },
    { page:'manage',    icon:'⚙️', label:'Gérer récompenses'  },
    { page:'history',   icon:'📊', label:'Historique'         },
    { page:'notifs',    icon:'🔔', label:'Notifications'      },
    { page:'settings',  icon:'🔧', label:'Paramètres'         },
  ];
  return `
  <nav id="sidebar">
    <div class="sidebar-section-label">Navigation</div>
    ${navItems.map(n => `
      <button class="nav-btn ${state.currentPage===n.page?'active':''}" onclick="navigate('${n.page}')">
        <span class="nav-icon">${n.icon}</span><span>${n.label}</span>
      </button>
    `).join('')}
    <div class="sidebar-bottom">
      <div class="sidebar-tokens-box">
        <div class="sidebar-tokens-num" id="sidebar-tokens-num">${state.tokens}</div>
        <div class="sidebar-tokens-label">jetons disponibles</div>
        <div class="sidebar-streak" id="sidebar-streak">
          ${state.streak > 0 ? `🔥 ${state.streak} jour${state.streak>1?'s':''} de streak` : ''}
        </div>
        <div class="quick-adjust">
          <button class="qa-btn" onclick="quickAdjust(-1)" title="Retirer 1 jeton">−</button>
          <span class="qa-label">ajuster</span>
          <button class="qa-btn" onclick="quickAdjust(1)" title="Ajouter 1 jeton">+</button>
        </div>
      </div>
    </div>
  </nav>`;
}

function renderPage() {
  switch(state.currentPage) {
    case 'dashboard': return renderDashboard();
    case 'shop':      return renderShop();
    case 'manage':    return renderManage();
    case 'history':   return renderHistory();
    case 'notifs':    return renderNotifications();
    case 'settings':  return renderSettings();
    default:          return renderDashboard();
  }
}

// ===== DASHBOARD =====
function renderDashboard() {
  const todaySessions = state.sessions.filter(s => new Date(s.date).toDateString() === new Date().toDateString());
  const todayMinutes  = todaySessions.reduce((a,s) => a+s.minutes, 0);
  const weekAgo       = new Date(Date.now() - 7*86400000);
  const weekMinutes   = state.sessions.filter(s => new Date(s.date) >= weekAgo).reduce((a,s) => a+s.minutes, 0);

  return `
  <div class="page-header">
    <h1 class="page-title"><span class="cross-icon">✚</span>Dashboard</h1>
    <p class="page-subtitle">Lance le timer et gagne des jetons en étudiant. 10 min = 1 jeton 🪙</p>
  </div>

  <div class="dash-grid">
    <div class="stat-card">
      <div class="stat-icon teal">🪙</div>
      <div><div class="stat-val">${state.tokens}</div><div class="stat-label">Jetons disponibles</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon mint">⏱️</div>
      <div><div class="stat-val">${todayMinutes}<small style="font-size:14px;color:var(--text-secondary)"> min</small></div><div class="stat-label">Étudié aujourd'hui</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon gold">📅</div>
      <div><div class="stat-val">${Math.floor(weekMinutes/60)}h${weekMinutes%60}<small style="font-size:14px;color:var(--text-secondary)">m</small></div><div class="stat-label">Cette semaine</div></div>
    </div>
  </div>

  <!-- Timer -->
  <div class="timer-card">
    <div class="timer-subject-selector">
      ${state.settings.subjects.map(s => `
        <button class="subject-chip ${state.timer.subject===s?'active':''}" onclick="selectSubject('${s}')">${s}</button>
      `).join('')}
    </div>
    <div class="timer-display ${state.timer.running?'running':state.timer.paused?'paused':''}" id="timer-display">
      ${fmtTime(state.timer.seconds)}
      ${state.timer.running ? '<span class="timer-pulse-dot"></span>' : ''}
    </div>
    <div class="timer-progress-text" id="timer-progress-text">
      <span>${state.settings.minutesPerToken} min</span> = 1 jeton
    </div>
    <div class="timer-progress-bar-wrap">
      <div class="timer-progress-bar" id="timer-progress-bar" style="width:0%"></div>
    </div>
    <div class="timer-controls" id="timer-controls-wrap">
      ${buildControls()}
    </div>
  </div>

  <!-- Palier progress bar -->
  ${renderPalierBar()}
  `;
}

function renderPalierBar() {
  const maxPalier = PALIERS[PALIERS.length - 1].minLifetime;
  const progress  = Math.min(100, maxPalier === 0 ? 100 : (state.lifetimeTokens / maxPalier * 100));
  const nextPalier= getNextPalier();

  return `
  <div class="card">
    <div class="card-title">🏅 Progression des paliers</div>
    <div class="palier-bar-wrap" style="padding-top:60px;padding-bottom:32px;padding-left:24px;padding-right:24px;">
      <div class="palier-bar-track" style="position:relative;">
        <div class="palier-bar-fill" style="width:${progress}%"></div>
        ${PALIERS.map((p, i) => {
          const posPercent = maxPalier === 0 ? 0 : (p.minLifetime / maxPalier * 100);
          const unlocked = state.lifetimeTokens >= p.minLifetime;
          return `
          <div class="palier-milestone ${unlocked?'unlocked':''}"
            style="left:${posPercent}%;top:-54px;">
            <div class="palier-bubble">
              ${p.icon}
              <div class="palier-bubble-check">✓</div>
            </div>
            <div style="position:absolute;top:50px;left:50%;transform:translateX(-50%);text-align:center;pointer-events:none;">
              <div class="palier-bubble-name">${p.name}</div>
              <div class="palier-bubble-req">${p.minLifetime === 0 ? 'Toujours' : p.minLifetime+'🪙'}</div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
    <div class="palier-tokens-display">
      <div class="palier-token-stat">
        <div class="palier-token-val">${state.lifetimeTokens}</div>
        <div class="palier-token-label">Jetons totaux gagnés</div>
      </div>
      <div class="palier-next-info">
        ${nextPalier
          ? `Prochain palier : ${nextPalier.icon} <span>${nextPalier.name}</span> dans <span>${nextPalier.minLifetime - state.lifetimeTokens} jetons</span>`
          : '🏆 <span>Tous les paliers débloqués !</span>'
        }
      </div>
      <div class="palier-token-stat">
        <div class="palier-token-val">${state.tokens}</div>
        <div class="palier-token-label">Disponibles maintenant</div>
      </div>
    </div>
  </div>`;
}

function selectSubject(subject) {
  state.timer.subject = subject;
  document.querySelectorAll('.subject-chip').forEach(b => {
    b.classList.toggle('active', b.textContent.trim() === subject);
  });
}

// ===== SHOP =====
function renderShop() {
  return `
  <div class="page-header">
    <h1 class="page-title"><span class="cross-icon">🛒</span>Récompenses</h1>
    <p class="page-subtitle">Dépense tes jetons — tu l'as mérité ! ${state.tokens} jetons disponibles.</p>
  </div>
  <div class="rewards-grid">
    ${state.rewards.map(r => {
      const unlocked    = isPalierUnlocked(r.palier);
      const monthly     = getMonthlyUsage(r.id);
      const limitReached= r.limitPerMonth > 0 && monthly >= r.limitPerMonth;
      const canAfford   = state.tokens >= r.cost;
      const palierObj   = PALIERS.find(p=>p.id===r.palier);
      return `
      <div class="reward-card ${!unlocked?'locked':''}">
        ${monthly > 0 ? `<div class="redeemed-badge">✓ Utilisé ce mois</div>` : ''}
        <div class="reward-emoji">${r.emoji}</div>
        <div><div class="reward-name">${r.name}</div><div class="reward-desc">${r.desc}</div></div>
        <div class="reward-tags">
          <span class="tag teal">${r.cost} jeton${r.cost>1?'s':''}</span>
          <span class="tag">${r.category}</span>
          ${palierObj?`<span class="tag">📍 ${palierObj.name}</span>`:''}
          ${r.limitPerMonth>0?`<span class="tag">${monthly}/${r.limitPerMonth}/mois</span>`:''}
        </div>
        <div class="reward-footer">
          <div class="reward-cost">🪙 ${r.cost}</div>
          <button class="btn btn-gold btn-sm" onclick="redeemReward('${r.id}')" ${!unlocked||limitReached||!canAfford?'disabled':''}>
            ${!canAfford?'Insuffisant':limitReached?'Limite':'✨ Obtenir'}
          </button>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

// ===== MANAGE REWARDS =====
function renderManage() {
  return `
  <div class="page-header">
    <div style="display:flex;align-items:center;justify-content:space-between">
      <div>
        <h1 class="page-title"><span class="cross-icon">⚙️</span>Gérer les récompenses</h1>
        <p class="page-subtitle">Ajouter, éditer, supprimer tes récompenses.</p>
      </div>
      <button class="btn btn-primary" onclick="openAddRewardModal()">+ Ajouter</button>
    </div>
  </div>
  <div class="manage-list">
    ${state.rewards.map(r => {
      const palierObj = PALIERS.find(p=>p.id===r.palier);
      return `
      <div class="manage-item">
        <div class="manage-item-emoji">${r.emoji}</div>
        <div class="manage-item-info">
          <div class="manage-item-name">${r.name}</div>
          <div class="manage-item-desc">${r.desc}</div>
          <div class="manage-item-tags">
            <span class="tag teal">${r.cost} jeton${r.cost>1?'s':''}</span>
            <span class="tag">${r.category}</span>
            ${palierObj?`<span class="tag">${palierObj.icon} ${palierObj.name}</span>`:''}
            ${r.limitPerMonth>0?`<span class="tag">Limite: ${r.limitPerMonth}/mois</span>`:''}
          </div>
        </div>
        <div class="manage-item-actions">
          <button class="btn btn-secondary btn-sm" onclick="openEditRewardModal('${r.id}')">Éditer</button>
          <button class="btn btn-danger btn-sm" onclick="confirmDeleteReward('${r.id}')">🗑</button>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

// ===== HISTORY =====
function renderHistory() {
  const totalH = Math.floor(state.totalMinutes / 60);
  const totalM = state.totalMinutes % 60;
  return `
  <div class="page-header">
    <h1 class="page-title"><span class="cross-icon">📊</span>Historique</h1>
    <p class="page-subtitle">Toutes tes sessions d'étude enregistrées.</p>
  </div>
  <div class="dash-grid">
    <div class="stat-card"><div class="stat-icon teal">⏱️</div>
      <div><div class="stat-val">${totalH}h${totalM}m</div><div class="stat-label">Temps total étudié</div></div></div>
    <div class="stat-card"><div class="stat-icon gold">🪙</div>
      <div><div class="stat-val">${state.lifetimeTokens}</div><div class="stat-label">Jetons gagnés (total)</div></div></div>
    <div class="stat-card"><div class="stat-icon mint">📚</div>
      <div><div class="stat-val">${state.sessions.length}</div><div class="stat-label">Sessions complétées</div></div></div>
  </div>
  <div class="card">
    <div class="card-title">Sessions récentes</div>
    ${state.sessions.length === 0 ? `
      <div class="history-empty"><div class="empty-icon">📭</div><p>Aucune session.<br>Lance ton premier timer !</p></div>
    ` : `
    <div class="history-list">
      ${state.sessions.slice(0,60).map(s => {
        const d = new Date(s.date);
        const dateStr = d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});
        const timeStr = d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
        return `
        <div class="history-item">
          <div class="history-item-dot"></div>
          <div class="history-item-info">
            <div class="history-item-subject">📚 ${s.subject}</div>
            <div class="history-item-date">${dateStr} à ${timeStr}</div>
          </div>
          <div class="history-item-stats">
            <div class="history-stat">
              <div class="history-stat-val">${fmtTime(s.seconds)}</div>
              <div class="history-stat-label">durée</div>
            </div>
            <div class="history-stat">
              <div class="history-stat-val" style="color:var(--teal)">+${s.tokensEarned} 🪙</div>
              <div class="history-stat-label">jetons</div>
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>`}
  </div>`;
}

// ===== NOTIFICATIONS =====
function renderNotifications() {
  const s = state.settings;
  return `
  <div class="page-header">
    <h1 class="page-title"><span class="cross-icon">🔔</span>Notifications</h1>
    <p class="page-subtitle">Configure tes alertes et rappels.</p>
  </div>
  <div class="card">
    <div class="card-title">Alertes de session</div>

    <div class="notif-row">
      <div class="notif-info">
        <div class="notif-title">🪙 Jeton gagné</div>
        <div class="notif-desc">Notification à chaque fois que tu gagnes un jeton</div>
      </div>
      <label class="toggle">
        <input type="checkbox" ${s.notifTokenEarned?'checked':''} onchange="toggleNotif('notifTokenEarned', this.checked)" />
        <span class="toggle-slider"></span>
      </label>
    </div>

    <div class="notif-row">
      <div class="notif-info">
        <div class="notif-title">⏸ Rappel de pause</div>
        <div class="notif-desc">Te prévenir de faire une pause après X minutes de travail</div>
      </div>
      <div class="notif-control">
        <select class="form-select" style="width:100px" onchange="setNotifBreakMinutes(this.value)">
          ${[25,30,45,50,60,90].map(m => `<option value="${m}" ${s.notifBreakMinutes==m?'selected':''}>${m} min</option>`).join('')}
        </select>
        <label class="toggle">
          <input type="checkbox" ${s.notifBreakReminder?'checked':''} onchange="toggleNotif('notifBreakReminder', this.checked)" />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-title">Rappel quotidien</div>
    <div class="notif-row">
      <div class="notif-info">
        <div class="notif-title">📅 Rappel d'étude</div>
        <div class="notif-desc">Rappel chaque jour à l'heure choisie pour démarrer une session</div>
      </div>
      <div class="notif-control">
        <input type="time" class="form-input" style="width:110px"
          value="${s.notifDailyTime}"
          onchange="setNotifDailyTime(this.value)" />
        <label class="toggle">
          <input type="checkbox" ${s.notifDailyReminder?'checked':''} onchange="toggleNotif('notifDailyReminder', this.checked)" />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-title">Tester</div>
    <p style="font-size:13px;color:var(--text-secondary);margin-bottom:14px">Envoyer une notification de test pour vérifier que ça fonctionne.</p>
    <button class="btn btn-primary" onclick="testNotif()">🔔 Envoyer une notification test</button>
  </div>`;
}

async function toggleNotif(key, value) {
  state.settings[key] = value;
  await saveField('settings', state.settings);
  if (key === 'notifDailyReminder') scheduleDailyReminder();
}

async function setNotifBreakMinutes(val) {
  state.settings.notifBreakMinutes = parseInt(val);
  await saveField('settings', state.settings);
}

async function setNotifDailyTime(val) {
  state.settings.notifDailyTime = val;
  await saveField('settings', state.settings);
  scheduleDailyReminder();
}

function testNotif() {
  sendNotif('🔔 StudyTokens — Test notification', 'Si tu vois ça, les notifications fonctionnent ! ✅');
  showToast('🔔 Notification envoyée !', 'teal');
}

// ===== SETTINGS =====
function renderSettings() {
  const mpts = [5, 10, 15, 20];
  const zooms = [0.8, 0.9, 1.0, 1.1, 1.2, 1.3];
  return `
  <div class="page-header">
    <h1 class="page-title"><span class="cross-icon">🔧</span>Paramètres</h1>
    <p class="page-subtitle">Personnalise StudyTokens.</p>
  </div>
  <div class="settings-grid">
    <div class="setting-card">
      <div class="setting-title">⏱️ Taux de jetons</div>
      <div class="setting-desc">Combien de minutes d'étude pour 1 jeton ?</div>
      <div class="options-row">
        ${mpts.map(m => `
          <button class="option-btn ${state.settings.minutesPerToken===m?'active':''}" onclick="setSetting('minutesPerToken',${m})">${m} min</button>
        `).join('')}
      </div>
    </div>

    <div class="setting-card">
      <div class="setting-title">🔍 Zoom de l'interface</div>
      <div class="setting-desc">Agrandir ou réduire l'affichage si la taille ne te convient pas.</div>
      <div class="options-row" style="flex-wrap:wrap">
        ${zooms.map(z => `
          <button class="option-btn ${state.settings.zoom===z?'active':''}" onclick="setZoom(${z})">${Math.round(z*100)}%</button>
        `).join('')}
      </div>
    </div>

    <div class="setting-card" style="grid-column:1/-1">
      <div class="setting-title">📚 Matières du timer</div>
      <div class="setting-desc">Matières séparées par des virgules.</div>
      <div style="display:flex;gap:10px;align-items:center">
        <input type="text" class="form-input" id="subjects-input" value="${state.settings.subjects.join(', ')}" />
        <button class="btn btn-secondary btn-sm" onclick="saveSubjects()">Sauvegarder</button>
      </div>
    </div>

    <div class="setting-card">
      <div class="setting-title">🪙 Ajustement manuel des jetons</div>
      <div class="setting-desc">Correction si besoin (bug, oubli, etc.).</div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <input type="number" class="form-input" id="manual-tokens" value="${state.tokens}" min="0" style="width:100px" />
        <button class="btn btn-secondary btn-sm" onclick="setManualTokens()">Appliquer</button>
      </div>
    </div>

    <div class="setting-card">
      <div class="setting-title">📦 Installer l'application</div>
      <div class="setting-desc">Pour créer un vrai installateur .exe, ouvre CMD dans le dossier et tape :</div>
      <code style="display:block;background:var(--bg-input);padding:10px;border-radius:8px;font-size:12px;color:var(--teal);margin-top:8px;border:1px solid var(--border)">npm run build</code>
      <p style="font-size:11px;color:var(--text-muted);margin-top:6px">Le .exe sera dans le dossier <strong>dist/</strong></p>
    </div>

    <div class="setting-card" style="grid-column:1/-1;border-color:rgba(230,57,70,.2)">
      <div class="setting-title" style="color:var(--red)">⚠️ Zone dangereuse</div>
      <div class="setting-desc">Remettre toutes les données à zéro. Irréversible !</div>
      <button class="btn btn-danger btn-sm" onclick="confirmReset()">🗑 Réinitialiser toutes les données</button>
    </div>
  </div>`;
}

async function setSetting(key, value) {
  state.settings[key] = value;
  await saveField('settings', state.settings);
  renderMainContent();
}

async function setZoom(factor) {
  state.settings.zoom = factor;
  await saveField('settings', state.settings);
  applyZoom(factor);
  showToast(`🔍 Zoom : ${Math.round(factor*100)}%`, 'teal');
  renderMainContent();
}

async function setManualTokens() {
  const val = parseInt(document.getElementById('manual-tokens')?.value) || 0;
  const old = state.tokens;
  state.tokens = Math.max(0, val);
  // If added tokens, update lifetime
  if (state.tokens > state.lifetimeTokens) {
    state.lifetimeTokens = state.tokens;
    await saveField('lifetimeTokens', state.lifetimeTokens);
  }
  await saveField('tokens', state.tokens);
  updateSidebarTokens();
  showToast(`✅ Solde mis à jour : ${state.tokens} jetons`, 'success');
}

async function saveSubjects() {
  const val  = document.getElementById('subjects-input')?.value || '';
  const subs = val.split(',').map(s=>s.trim()).filter(Boolean);
  if (subs.length < 1) return;
  state.settings.subjects = subs;
  if (!subs.includes(state.timer.subject)) state.timer.subject = subs[0];
  await saveField('settings', state.settings);
  showToast('✅ Matières sauvegardées !', 'success');
}

// ===== MODAL REWARD =====
function openAddRewardModal()     { showRewardModal(null); }
function openEditRewardModal(id)  { showRewardModal(state.rewards.find(r=>r.id===id)); }

function showRewardModal(reward) {
  const isEdit = !!reward;
  const sel = reward?.emoji || '📚';
  const modal = document.createElement('div');
  modal.className = 'modal-overlay'; modal.id = 'reward-modal';
  modal.innerHTML = `
  <div class="modal">
    <div class="modal-header">
      <div class="modal-title">${isEdit?'✏️ Modifier':'➕ Nouvelle'} récompense</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="form-group">
      <label class="form-label">Emoji</label>
      <div class="emoji-grid">
        ${EMOJIS.map(e=>`<button class="emoji-btn ${e===sel?'selected':''}" onclick="selectEmoji('${e}')" data-emoji="${e}">${e}</button>`).join('')}
      </div>
      <input type="hidden" id="modal-emoji" value="${sel}" />
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Nom</label>
        <input type="text" class="form-input" id="modal-name" value="${reward?.name||''}" placeholder="Ex: Boisson" />
      </div>
      <div class="form-group">
        <label class="form-label">Coût (jetons)</label>
        <input type="number" class="form-input" id="modal-cost" value="${reward?.cost||1}" min="1" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Description</label>
      <input type="text" class="form-input" id="modal-desc" value="${reward?.desc||''}" placeholder="Ex: Café, thé..." />
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Catégorie</label>
        <input type="text" class="form-input" id="modal-category" value="${reward?.category||''}" placeholder="Ex: Boisson" />
      </div>
      <div class="form-group">
        <label class="form-label">Palier requis</label>
        <select class="form-select" id="modal-palier">
          ${PALIERS.map(p=>`<option value="${p.id}" ${reward?.palier===p.id?'selected':''}>${p.icon} ${p.name} (${p.minLifetime}🪙)</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Limite par mois (0 = illimité)</label>
      <input type="number" class="form-input" id="modal-limit" value="${reward?.limitPerMonth||0}" min="0" />
    </div>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveReward('${reward?.id||''}')">
        ${isEdit?'💾 Sauvegarder':'➕ Ajouter'}
      </button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if(e.target===modal) closeModal(); });
}

function selectEmoji(emoji) {
  document.querySelectorAll('.emoji-btn').forEach(b => b.classList.toggle('selected', b.dataset.emoji === emoji));
  const inp = document.getElementById('modal-emoji');
  if (inp) inp.value = emoji;
}

function closeModal() {
  document.getElementById('reward-modal')?.remove();
  document.getElementById('confirm-modal')?.remove();
}

async function saveReward(id) {
  const emoji    = document.getElementById('modal-emoji')?.value || '📚';
  const name     = document.getElementById('modal-name')?.value?.trim();
  const cost     = parseInt(document.getElementById('modal-cost')?.value) || 1;
  const desc     = document.getElementById('modal-desc')?.value?.trim() || '';
  const category = document.getElementById('modal-category')?.value?.trim() || 'Général';
  const palier   = document.getElementById('modal-palier')?.value || 'basique';
  const limitPerMonth = parseInt(document.getElementById('modal-limit')?.value) || 0;

  if (!name) { showToast('❌ Le nom est obligatoire', 'error'); return; }

  if (id) {
    const idx = state.rewards.findIndex(r=>r.id===id);
    if (idx !== -1) state.rewards[idx] = { id, emoji, name, cost, desc, category, palier, limitPerMonth };
  } else {
    state.rewards.push({ id: Date.now().toString(), emoji, name, cost, desc, category, palier, limitPerMonth });
  }

  await saveField('rewards', state.rewards);
  closeModal();
  showToast(`✅ Récompense ${id?'modifiée':'ajoutée'} !`, 'success');
  render();
}

function confirmDeleteReward(id) {
  const r = state.rewards.find(x=>x.id===id);
  if (!r) return;
  const modal = document.createElement('div');
  modal.className = 'modal-overlay'; modal.id = 'confirm-modal';
  modal.innerHTML = `
  <div class="modal" style="max-width:380px">
    <div class="modal-header">
      <div class="modal-title">🗑 Supprimer ?</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <p class="confirm-text">Supprimer <strong>${r.emoji} ${r.name}</strong> ? Irréversible.</p>
    <div class="confirm-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-danger" onclick="deleteReward('${id}')">Supprimer</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if(e.target===modal) closeModal(); });
}

async function deleteReward(id) {
  state.rewards = state.rewards.filter(r=>r.id!==id);
  await saveField('rewards', state.rewards);
  closeModal();
  showToast('🗑 Récompense supprimée', 'success');
  render();
}

function confirmReset() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay'; modal.id = 'confirm-modal';
  modal.innerHTML = `
  <div class="modal" style="max-width:400px">
    <div class="modal-header">
      <div class="modal-title" style="color:var(--red)">⚠️ Réinitialisation totale</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <p class="confirm-text">Toutes tes données seront <strong>définitivement supprimées</strong> : jetons, historique, streak, récompenses. Tu es sûr ?</p>
    <div class="confirm-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
      <button class="btn btn-danger" onclick="resetAll()">⚠️ Réinitialiser</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if(e.target===modal) closeModal(); });
}

async function resetAll() {
  clearInterval(state.timer.intervalId);
  state.tokens=0; state.lifetimeTokens=0; state.streak=0; state.lastStudyDate=null;
  state.totalMinutes=0; state.sessions=[]; state.redeemedHistory=[]; state.rewards=DEFAULT_REWARDS;
  state.timer = { running:false, paused:false, seconds:0, subject:DEFAULT_SUBJECTS[0], intervalId:null };
  state.settings = { minutesPerToken:10, subjects:[...DEFAULT_SUBJECTS], zoom:1.0,
    notifBreakReminder:true, notifBreakMinutes:50, notifDailyReminder:false,
    notifDailyTime:'09:00', notifTokenEarned:true };
  const keys = ['tokens','lifetimeTokens','streak','lastStudyDate','totalMinutes','sessions','redeemedHistory','rewards','settings'];
  for (const k of keys) await saveField(k, state[k] ?? null);
  closeModal();
  showToast('✅ Données réinitialisées', 'success');
  render();
}

// ===== INIT =====
async function init() {
  await loadState();
  document.getElementById('app').innerHTML = '';
  render();
}

init();

// ===== AUTO UPDATER UI =====
function initUpdater() {
  api.updater.onStatus((data) => {
    const existing = document.getElementById('update-banner')
    if (existing) existing.remove()

    if (data.type === 'uptodate') return // Pas de bannière si à jour

    const banner = document.createElement('div')
    banner.id = 'update-banner'

    if (data.type === 'checking') {
      banner.innerHTML = `
        <div class="update-bar checking">
          🔍 Vérification des mises à jour...
        </div>`
      document.body.appendChild(banner)
      setTimeout(() => banner.remove(), 3000)

    } else if (data.type === 'available') {
      banner.innerHTML = `
        <div class="update-bar available">
          ⬇️ Mise à jour v${data.version} disponible — téléchargement en cours...
        </div>`
      document.body.appendChild(banner)

    } else if (data.type === 'downloading') {
      banner.innerHTML = `
        <div class="update-bar downloading">
          ⬇️ Téléchargement... ${data.percent}%
          <div class="update-progress">
            <div class="update-progress-fill" style="width:${data.percent}%"></div>
          </div>
        </div>`
      document.body.appendChild(banner)

    } else if (data.type === 'downloaded') {
      banner.innerHTML = `
        <div class="update-bar downloaded">
          ✅ Mise à jour v${data.version} prête !
          <button class="btn btn-mint btn-sm" onclick="api.updater.install()">
            🔄 Redémarrer et installer
          </button>
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('update-banner').remove()">
            Plus tard
          </button>
        </div>`
      document.body.appendChild(banner)
    }
  })
}

// Lancer l'updater au démarrage
initUpdater()
