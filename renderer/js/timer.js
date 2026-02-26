/* ================================================
   TIMER.JS — Logique du chronomètre & Pomodoro
   ================================================ */
'use strict';

const timerState = {
  mode: 'chrono',
  running: false, paused: false,
  seconds: 0, intervalId: null,
  subject: '',
  sessionStart: null,
  // Pomodoro
  pomodoroPhase: 'work',
  pomodoroCurrentCycle: 0,
  pomodoroPhaseSeconds: 0,
  pomodoroWork: 25, pomodoroBreak: 5, pomodoroCycles: 4,
};

function startTimer() {
  if (timerState.running) return;
  timerState.running = true;
  if(typeof SFX!=='undefined') SFX.timerStart();
  timerState.paused = false;
  if (!timerState.sessionStart) {
    timerState.sessionStart = Date.now();
    if (timerState.mode === 'pomodoro') {
      timerState.pomodoroPhaseSeconds = timerState.pomodoroWork * 60;
      timerState.pomodoroCurrentCycle = 0;
      timerState.pomodoroPhase = 'work';
    }
  }
  timerState.intervalId = setInterval(tickTimer, 1000);
  updateTimerUI();
}

function pauseTimer() {
  if (!timerState.running) return;
  timerState.running = false;
  timerState.paused = true;
  clearInterval(timerState.intervalId);
  timerState.intervalId = null;
  updateTimerUI();
}

async function stopTimer() {
  if (!timerState.sessionStart && timerState.seconds < 5) {
    resetTimerState(); updateTimerUI(); return;
  }
  const mins = Math.floor(timerState.seconds / 60);
  if (mins > 0) {
    const tokensEarned = Math.floor(timerState.seconds / (state.settings.minutesPerToken * 60)) * (state.activeMultiplier||1);
    state.sessions.unshift({
      id: Date.now(), date: new Date().toISOString(),
      subject: timerState.subject || 'Général',
      minutes: mins, seconds: timerState.seconds,
      mode: timerState.mode, tokensEarned,
    });
    if (state.sessions.length > 100) state.sessions.pop();
    state.totalMinutes += mins;
    await saveField('sessions', state.sessions);
    await saveField('totalMinutes', state.totalMinutes);
    await updateStreak();
    if(typeof SFX!=='undefined') SFX.tokenEarned();
    notify(`+${tokensEarned > 0 ? tokensEarned+'🪙 · ' : ''}${mins} min enregistrées`, 'reward', {
      title: '✅ Session terminée !', sound: false
    });
    // Objectifs + badges
    if (typeof onSessionCompletedGoals === 'function') {
      await onSessionCompletedGoals(mins, tokensEarned);
    }
    if (typeof checkBadges === 'function') {
      setTimeout(() => checkBadges(), 400);
    }
  }
  clearInterval(timerState.intervalId);
  resetTimerState();
  updateTimerUI();
}

function resetTimerState() {
  timerState.running = false; timerState.paused = false;
  timerState.seconds = 0; timerState.intervalId = null;
  timerState.sessionStart = null;
  timerState.pomodoroPhase = 'work'; timerState.pomodoroCurrentCycle = 0;
  timerState.pomodoroPhaseSeconds = timerState.pomodoroWork * 60;
}

async function tickTimer() {
  timerState.seconds++;
  if (timerState.mode === 'pomodoro') {
    timerState.pomodoroPhaseSeconds--;
    if (timerState.pomodoroPhaseSeconds <= 0) await nextPomodoroPhase();
  }
  // Jeton toutes les N minutes
  const mpt = state.settings.minutesPerToken * 60;
  if (timerState.mode === 'chrono' && timerState.seconds % mpt === 0) {
    await awardToken();
    api.notify('🪙 Jeton gagné !', `+1 jeton pour ${state.settings.minutesPerToken} min d'étude !`);
  }
  updateTimerUI();
}

async function nextPomodoroPhase() {
  if (timerState.pomodoroPhase === 'work') {
    timerState.pomodoroCurrentCycle++;
    const mpt = state.settings.minutesPerToken * 60;
    if ((timerState.pomodoroWork * 60) % mpt === 0) await awardToken();
    if (timerState.pomodoroCurrentCycle >= timerState.pomodoroCycles) {
      await stopTimer();
      api.notify('🏆 Pomodoro terminé !', `${timerState.pomodoroCycles} cycles accomplis !`);
      return;
    }
    timerState.pomodoroPhase = 'break';
    timerState.pomodoroPhaseSeconds = timerState.pomodoroBreak * 60;
    api.notify('🌿 Pause !', `${timerState.pomodoroBreak} min de repos mérité.`);
  } else {
    timerState.pomodoroPhase = 'work';
    timerState.pomodoroPhaseSeconds = timerState.pomodoroWork * 60;
    api.notify('🧠 Au travail !', 'Cycle suivant — courage !');
  }
}

function skipPomodoroPhase() {
  timerState.pomodoroPhaseSeconds = 0;
}

function switchTimerMode(mode) {
  if (timerState.running) stopTimer();
  timerState.mode = mode;
  resetTimerState();
  timerState.pomodoroWork = parseInt(document.getElementById('pomo-work')?.value||25);
  timerState.pomodoroBreak = parseInt(document.getElementById('pomo-break')?.value||5);
  timerState.pomodoroCycles = parseInt(document.getElementById('pomo-cycles')?.value||4);
  timerState.pomodoroPhaseSeconds = timerState.pomodoroWork * 60;
  updateTimerUI();
}

function selectSubject(subj) {
  timerState.subject = subj;
  document.querySelectorAll('.subject-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.subj === subj);
  });
}

function updateTimerUI() {
  const mode = timerState.mode;
  const isPomo = mode === 'pomodoro';
  const phase = timerState.pomodoroPhase;

  // Affichage temps
  const displayEl = document.getElementById('timer-display');
  if (!displayEl) return;

  let displaySec = timerState.seconds;
  if (isPomo) displaySec = timerState.pomodoroPhaseSeconds;

  displayEl.textContent = fmt(displaySec);

  // Classe couleur
  let cls = 'idle';
  if (timerState.paused) cls = 'paused';
  else if (timerState.running) {
    cls = isPomo ? (phase==='work'?'pomodoro-work':'pomodoro-break') : 'running';
  }
  displayEl.className = `timer-display-big ${cls}`;

  // Anneau SVG
  const ring = document.getElementById('timer-ring');
  if (ring) {
    ring.setAttribute('class', `timer-ring ${isPomo ? (phase==='work'?'pomodoro-work':'pomodoro-break') : 'chrono'}`);
    let progress = 0;
    if (timerState.running || timerState.paused) {
      if (isPomo) {
        const total = (phase==='work'?timerState.pomodoroWork:timerState.pomodoroBreak) * 60;
        progress = total > 0 ? (total - timerState.pomodoroPhaseSeconds) / total : 0;
      } else {
        const mpt = state.settings.minutesPerToken * 60;
        progress = (timerState.seconds % mpt) / mpt;
      }
    }
    ring.style.strokeDashoffset = CIRCLE_C * (1 - progress);
  }

  // Phase label
  const phaseEl = document.getElementById('timer-phase');
  if (phaseEl) {
    if (isPomo) {
      phaseEl.textContent = phase==='work'?'🧠 Travail':'🌿 Pause';
      phaseEl.className = `timer-phase-label ${phase==='work'?'work':'brk'}`;
    } else {
      phaseEl.textContent = '⏱ Chronomètre';
      phaseEl.className = 'timer-phase-label chrono';
    }
  }

  // Progress bar (chrono uniquement)
  const progBar = document.getElementById('token-progress-bar');
  const progText = document.getElementById('token-progress-text');
  const progRow = document.getElementById('token-progress-row');
  if (progRow) progRow.style.display = isPomo ? 'none' : 'flex';
  if (progBar && !isPomo) {
    const mpt = state.settings.minutesPerToken * 60;
    const pct = timerState.running||timerState.paused ? ((timerState.seconds%mpt)/mpt)*100 : 0;
    progBar.style.width = pct + '%';
    if (progText) {
      const secLeft = mpt - (timerState.seconds % mpt);
      progText.innerHTML = `<span>${fmt(secLeft)}</span> → 🪙`;
    }
  }

  // Cycles pomodoro
  const cyclesEl = document.getElementById('pomodoro-cycles');
  if (cyclesEl && isPomo) {
    cyclesEl.innerHTML = Array.from({length:timerState.pomodoroCycles},(_,i)=>`
      <div class="cycle-dot ${i<timerState.pomodoroCurrentCycle?'done':i===timerState.pomodoroCurrentCycle&&timerState.running?'current':''}"></div>
    `).join('');
  }
  if (cyclesEl) cyclesEl.style.display = isPomo ? 'flex' : 'none';

  // Aura du cercle timer
  const wrap = document.querySelector('.timer-circle-wrap');
  if (wrap) {
    wrap.classList.toggle('running', timerState.running && !timerState.paused);
  }

  // Boutons
  const playBtn  = document.getElementById('timer-play');
  const pauseBtn = document.getElementById('timer-pause');
  const stopBtn  = document.getElementById('timer-stop');
  const skipBtn  = document.getElementById('timer-skip');
  if (playBtn)  playBtn.style.display  = (!timerState.running||timerState.paused) ? 'flex' : 'none';
  if (pauseBtn) pauseBtn.style.display = (timerState.running&&!timerState.paused) ? 'flex' : 'none';
  if (stopBtn)  stopBtn.style.display  = (timerState.running||timerState.paused)  ? 'flex' : 'none';
  if (skipBtn)  skipBtn.style.display  = (isPomo&&timerState.running)             ? 'flex' : 'none';
  if (playBtn)  playBtn.className      = `btn-circle play${isPomo?' pomodoro':''}`;
}
