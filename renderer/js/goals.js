/* ================================================
   GOALS.JS — Objectifs quotidiens
   Barre de progression, notifications, streak
   StudyTokens © 2025
   ================================================ */
'use strict';

// ── État des objectifs ────────────────────────
const goalState = {
  daily: { tokens: 5, minutes: 30 }, // objectif du jour
  todayTokens: 0,
  todayMinutes: 0,
  todayDate: '',
  goalStreak: 0,
  goalMetToday: false,
};

// ── Initialisation ────────────────────────────
async function initGoals() {
  try {
    const saved = await api.store.get('goals', null);
    if (saved) {
      goalState.daily = saved.daily || goalState.daily;
      goalState.goalStreak = saved.goalStreak || 0;
    }
    refreshTodayGoalProgress();
  } catch(e) {}
}

function refreshTodayGoalProgress() {
  const today = new Date().toISOString().split('T')[0];
  if (goalState.todayDate !== today) {
    goalState.todayDate = today;
    goalState.todayTokens = 0;
    goalState.todayMinutes = 0;
    goalState.goalMetToday = false;
    // Recalculate from sessions
    const todaySessions = (state.sessions || []).filter(s =>
      s.date && s.date.startsWith(today));
    goalState.todayMinutes = todaySessions.reduce((a, s) => a + (s.minutes||0), 0);
    goalState.todayTokens  = todaySessions.reduce((a, s) => a + (s.tokensEarned||0), 0);
  }
  updateGoalSidebar();
}

// ── Appelé après chaque session ──────────────
async function onSessionCompletedGoals(sessionMins, tokensEarned) {
  const today = new Date().toISOString().split('T')[0];
  if (goalState.todayDate !== today) refreshTodayGoalProgress();
  goalState.todayMinutes += sessionMins;
  goalState.todayTokens  += tokensEarned;

  const wasMetBefore = goalState.goalMetToday;
  const tokenGoalMet = goalState.daily.tokens <= 0 || goalState.todayTokens >= goalState.daily.tokens;
  const minGoalMet   = goalState.daily.minutes <= 0 || goalState.todayMinutes >= goalState.daily.minutes;
  const nowMet = tokenGoalMet && minGoalMet;

  if (nowMet && !wasMetBefore) {
    goalState.goalMetToday = true;
    goalState.goalStreak++;
    await api.store.set('goals', { daily: goalState.daily, goalStreak: goalState.goalStreak });
    state.goalStreak = goalState.goalStreak;
    SFX.streak?.();
    notify('Objectif du jour atteint ! Continue comme ça !', 'reward', {
      title: '🎯 Objectif quotidien rempli !',
      duration: 7000, sound: false,
    });
    // Check badges
    setTimeout(() => checkBadges(), 500);
    // OS notification
    try { api.notify({ title:'🎯 StudyTokens', body:'Objectif du jour atteint ! Bravo !' }); } catch(e) {}
  }
  updateGoalSidebar();
}

// ── Mise à jour du widget sidebar ─────────────
function updateGoalSidebar() {
  const el = document.getElementById('goal-sidebar-widget');
  if (!el) return;

  const tGoal = goalState.daily.tokens;
  const mGoal = goalState.daily.minutes;
  const tNow  = Math.min(goalState.todayTokens, tGoal || 999);
  const mNow  = Math.min(goalState.todayMinutes, mGoal || 999);
  const tPct  = tGoal > 0 ? Math.round((tNow / tGoal) * 100) : 100;
  const mPct  = mGoal > 0 ? Math.round((mNow / mGoal) * 100) : 100;
  const bothMet = goalState.goalMetToday;

  el.innerHTML = `
    <div class="goal-widget ${bothMet?'goal-met':''}">
      <div class="goal-widget-header">
        <span class="goal-label">Objectif du jour</span>
        ${bothMet ? '<span class="goal-check">✅</span>' : `<span class="goal-streak">${goalState.goalStreak>0?'🔥'+goalState.goalStreak:''}</span>`}
      </div>
      ${tGoal > 0 ? `
      <div class="goal-bar-row">
        <span class="goal-bar-label">🪙 ${tNow}/${tGoal}</span>
        <div class="goal-bar"><div class="goal-bar-fill ${tPct>=100?'goal-done':''}" style="width:${Math.min(tPct,100)}%"></div></div>
      </div>` : ''}
      ${mGoal > 0 ? `
      <div class="goal-bar-row">
        <span class="goal-bar-label">⏱ ${mNow}/${mGoal}min</span>
        <div class="goal-bar"><div class="goal-bar-fill ${mPct>=100?'goal-done':''}" style="width:${Math.min(mPct,100)}%"></div></div>
      </div>` : ''}
    </div>`;
}

// ── Page de configuration des objectifs ───────
function renderGoalsSection() {
  const tGoal = goalState.daily.tokens;
  const mGoal = goalState.daily.minutes;
  return `
  <div class="page-card" style="margin-bottom:0">
    <div class="card-header-row">
      <div class="card-label">OBJECTIF QUOTIDIEN</div>
      ${goalState.goalMetToday ? '<span style="color:#5ee7c4;font-size:12px">✅ Atteint aujourd\'hui !</span>' : ''}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
      <div>
        <label class="form-label">Jetons par jour</label>
        <div style="display:flex;align-items:center;gap:8px">
          <input type="number" id="goal-tokens" class="form-input" value="${tGoal}"
            min="0" max="100" style="width:80px;text-align:center"/>
          <span style="font-size:11px;color:var(--text-muted)">(0 = désactivé)</span>
        </div>
      </div>
      <div>
        <label class="form-label">Minutes par jour</label>
        <div style="display:flex;align-items:center;gap:8px">
          <input type="number" id="goal-minutes" class="form-input" value="${mGoal}"
            min="0" max="480" style="width:80px;text-align:center"/>
          <span style="font-size:11px;color:var(--text-muted)">(0 = désactivé)</span>
        </div>
      </div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
      ${[
        {t:3,m:20,l:'Léger'},
        {t:5,m:30,l:'Normal'},
        {t:8,m:60,l:'Intensif'},
        {t:15,m:120,l:'Extreme'},
      ].map(p => `<button class="btn btn-secondary btn-sm" onclick="applyGoalPreset(${p.t},${p.m})">${p.l} (${p.t}🪙/${p.m}min)</button>`).join('')}
    </div>
    <button class="btn btn-primary" style="width:100%" onclick="saveGoals()">💾 Sauvegarder l'objectif</button>
    ${goalState.goalStreak > 0 ? `<div style="text-align:center;margin-top:10px;font-size:13px;color:var(--text-muted)">🔥 Série d'objectifs : <strong style="color:#facc15">${goalState.goalStreak} jour${goalState.goalStreak>1?'s':''}</strong></div>` : ''}
  </div>`;
}

async function saveGoals() {
  const t = parseInt(document.getElementById('goal-tokens')?.value || 5);
  const m = parseInt(document.getElementById('goal-minutes')?.value || 30);
  goalState.daily.tokens  = Math.max(0, t);
  goalState.daily.minutes = Math.max(0, m);
  await api.store.set('goals', { daily: goalState.daily, goalStreak: goalState.goalStreak });
  refreshTodayGoalProgress();
  SFX.success?.();
  notify(`Objectif : ${t>0?t+'🪙':''} ${m>0?m+'min':''}`.trim() || 'Objectif désactivé', 'success', { title:'🎯 Objectif sauvegardé' });
}

function applyGoalPreset(t, m) {
  const ti = document.getElementById('goal-tokens');
  const mi = document.getElementById('goal-minutes');
  if (ti) ti.value = t;
  if (mi) mi.value = m;
  SFX.click?.();
}
