/* ================================================
   BADGES.JS — Système de succès / achievements
   Vérifie et débloque automatiquement les badges
   StudyTokens © 2025
   ================================================ */
'use strict';

// ── Définition de tous les badges ────────────
const BADGES_DEF = [
  // ── Premières fois ──
  { id:'first_session',   emoji:'🎯', name:'Premier pas',       desc:'Terminer ta première session',            cat:'débutant',
    check: (s) => s.sessions?.length >= 1 },
  { id:'first_token',     emoji:'🪙', name:'Premier jeton',     desc:'Gagner ton premier jeton',                cat:'débutant',
    check: (s) => s.lifetimeTokens >= 1 },
  { id:'first_reward',    emoji:'🎁', name:'Première récompense', desc:'Dépenser des jetons en boutique',        cat:'débutant',
    check: (s) => Object.values(s.redeemedCount||{}).some(v => v > 0) },

  // ── Sessions ──
  { id:'sessions_5',      emoji:'📚', name:'Lecteur',           desc:'5 sessions complètes',                    cat:'sessions',
    check: (s) => s.sessions?.length >= 5 },
  { id:'sessions_25',     emoji:'🎓', name:'Étudiant',          desc:'25 sessions complètes',                   cat:'sessions',
    check: (s) => s.sessions?.length >= 25 },
  { id:'sessions_100',    emoji:'🏛️', name:'Académicien',       desc:'100 sessions complètes',                  cat:'sessions',
    check: (s) => s.sessions?.length >= 100 },
  { id:'long_session',    emoji:'⏳', name:'Marathonien',       desc:'Une session de 60 minutes ou plus',       cat:'sessions',
    check: (s) => s.sessions?.some(r => r.minutes >= 60) },
  { id:'pomodoro_master', emoji:'🍅', name:'Maître Pomodoro',   desc:'10 sessions en mode Pomodoro',            cat:'sessions',
    check: (s) => s.sessions?.filter(r => r.mode==='pomodoro').length >= 10 },

  // ── Temps ──
  { id:'hours_5',         emoji:'⏱️', name:'Studieux',          desc:'5 heures d\'étude au total',              cat:'temps',
    check: (s) => s.totalMinutes >= 300 },
  { id:'hours_25',        emoji:'🔭', name:'Chercheur',         desc:'25 heures d\'étude au total',             cat:'temps',
    check: (s) => s.totalMinutes >= 1500 },
  { id:'hours_100',       emoji:'🌟', name:'Expert',            desc:'100 heures d\'étude au total',            cat:'temps',
    check: (s) => s.totalMinutes >= 6000 },

  // ── Streak ──
  { id:'streak_3',        emoji:'🔥', name:'En feu',            desc:'3 jours consécutifs',                     cat:'streak',
    check: (s) => s.streak >= 3 },
  { id:'streak_7',        emoji:'🌊', name:'Semaine parfaite',  desc:'7 jours consécutifs',                     cat:'streak',
    check: (s) => s.streak >= 7 },
  { id:'streak_30',       emoji:'💫', name:'Invincible',        desc:'30 jours consécutifs',                    cat:'streak',
    check: (s) => s.streak >= 30 },
  { id:'streak_100',      emoji:'⚡', name:'Légende',           desc:'100 jours consécutifs',                   cat:'streak',
    check: (s) => s.streak >= 100 },

  // ── Jetons ──
  { id:'tokens_10',       emoji:'💰', name:'Épargnant',         desc:'10 jetons gagnés au total',               cat:'jetons',
    check: (s) => s.lifetimeTokens >= 10 },
  { id:'tokens_50',       emoji:'💎', name:'Collecteur',        desc:'50 jetons gagnés au total',               cat:'jetons',
    check: (s) => s.lifetimeTokens >= 50 },
  { id:'tokens_200',      emoji:'👑', name:'Millionnaire',      desc:'200 jetons gagnés au total',              cat:'jetons',
    check: (s) => s.lifetimeTokens >= 200 },

  // ── Flashcards ──
  { id:'flashcard_first', emoji:'🃏', name:'Mémorisateur',      desc:'Terminer un deck de flashcards',          cat:'mini-jeux',
    check: (s) => (s.flashcardStats?.decksCompleted||0) >= 1 },
  { id:'flashcard_pro',   emoji:'🧠', name:'Mnémoniste',        desc:'Compléter 10 decks de flashcards',        cat:'mini-jeux',
    check: (s) => (s.flashcardStats?.decksCompleted||0) >= 10 },
  { id:'flashcard_perfect',emoji:'✨',name:'Parfait',           desc:'Terminer un deck avec 100% de réussite',  cat:'mini-jeux',
    check: (s) => (s.flashcardStats?.perfectDecks||0) >= 1 },

  // ── Spéciaux ──
  { id:'night_owl',       emoji:'🦉', name:'Hibou',             desc:'Étudier après 22h',                       cat:'spécial',
    check: (s) => s.sessions?.some(r => { const h = new Date(r.date).getHours(); return h >= 22 || h < 3; }) },
  { id:'early_bird',      emoji:'🐦', name:'Lève-tôt',          desc:'Étudier avant 7h du matin',              cat:'spécial',
    check: (s) => s.sessions?.some(r => new Date(r.date).getHours() < 7) },
  { id:'weekend_warrior', emoji:'⚔️', name:'Guerrier du weekend', desc:'5 sessions le week-end',               cat:'spécial',
    check: (s) => s.sessions?.filter(r => [0,6].includes(new Date(r.date).getDay())).length >= 5 },
  { id:'multitasker',     emoji:'🎭', name:'Polyglotte',        desc:'Étudier 5 matières différentes',          cat:'spécial',
    check: (s) => new Set(s.sessions?.map(r=>r.subject)).size >= 5 },
  { id:'goal_streak_7',   emoji:'🏅', name:'Objectif tenu',     desc:'Atteindre son objectif 7 jours de suite', cat:'spécial',
    check: (s) => (s.goalStreak||0) >= 7 },
];

// ── État local des badges ─────────────────────
let _unlockedBadges = new Set();

// ── Initialisation ────────────────────────────
async function initBadges() {
  try {
    const saved = await api.store.get('unlockedBadges', []);
    _unlockedBadges = new Set(Array.isArray(saved) ? saved : []);
  } catch(e) { _unlockedBadges = new Set(); }
}

// ── Vérification après chaque événement ──────
async function checkBadges() {
  const s = state;
  const newlyUnlocked = [];

  for (const badge of BADGES_DEF) {
    if (_unlockedBadges.has(badge.id)) continue;
    try {
      if (badge.check(s)) {
        _unlockedBadges.add(badge.id);
        newlyUnlocked.push(badge);
      }
    } catch(e) {}
  }

  if (newlyUnlocked.length > 0) {
    // Sauvegarder
    await api.store.set('unlockedBadges', [..._unlockedBadges]);
    // Sauvegarder aussi sur Firebase
    if (fb.user && fb.db) {
      try {
        await fb.db.collection('users').doc(fb.user.uid)
          .collection('data').doc('badges')
          .set({ unlocked: [..._unlockedBadges], updatedAt: new Date() }, { merge: true });
      } catch(e) {}
    }
    // Afficher les notifications avec délai entre chaque
    newlyUnlocked.forEach((badge, i) => {
      setTimeout(() => showBadgeUnlock(badge), i * 1200);
    });
  }
}

// ── Affichage du déblocage ────────────────────
function showBadgeUnlock(badge) {
  SFX.levelUp?.();
  notify(`${badge.name} — ${badge.desc}`, 'reward', {
    title: `${badge.emoji} Badge débloqué !`,
    duration: 6000,
    sound: false, // SFX already played
  });

  // Animation de badge flottant
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed; top:50%; left:50%;
    transform:translate(-50%,-50%) scale(0);
    z-index:99999; text-align:center;
    background:var(--bg-card);
    border:2px solid rgba(250,204,21,.5);
    border-radius:20px; padding:28px 36px;
    box-shadow:0 0 60px rgba(250,204,21,.3), 0 24px 80px rgba(0,0,0,.8);
    transition:transform .4s cubic-bezier(.34,1.56,.64,1), opacity .4s ease;
    opacity:0; pointer-events:none;`;
  el.innerHTML = `
    <div style="font-size:52px;margin-bottom:8px;animation:badge-float 1.5s ease-in-out infinite alternate">${badge.emoji}</div>
    <div style="font-size:11px;letter-spacing:2px;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px">Badge débloqué !</div>
    <div style="font-size:20px;font-weight:800;color:#facc15;margin-bottom:4px">${badge.name}</div>
    <div style="font-size:13px;color:var(--text-secondary)">${badge.desc}</div>
    <div style="margin-top:12px;font-size:11px;padding:4px 12px;background:rgba(250,204,21,.1);border-radius:99px;color:#facc15;display:inline-block">${badge.cat}</div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => {
    el.style.transform = 'translate(-50%,-50%) scale(1)';
    el.style.opacity = '1';
  });
  setTimeout(() => {
    el.style.transform = 'translate(-50%,-50%) scale(0.9)';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 400);
  }, 2800);
}

// ── Page Badges ───────────────────────────────
function renderBadgesPage() {
  const cats = [...new Set(BADGES_DEF.map(b => b.cat))];
  const total = BADGES_DEF.length;
  const unlocked = _unlockedBadges.size;
  const pct = Math.round((unlocked / total) * 100);

  return `
  <div class="page-header">
    <div class="page-title-row">
      <h1 class="page-title">🏅 Succès</h1>
      <div class="badge-progress-pill">
        <span style="color:var(--accent);font-weight:800">${unlocked}</span>
        <span style="color:var(--text-muted)">/ ${total}</span>
        <div class="bpp-bar"><div class="bpp-fill" style="width:${pct}%"></div></div>
        <span style="font-size:11px;color:var(--text-muted)">${pct}%</span>
      </div>
    </div>
    <p class="page-subtitle">Débloque des badges en étudiant régulièrement</p>
  </div>

  ${cats.map(cat => {
    const catBadges = BADGES_DEF.filter(b => b.cat === cat);
    const catUnlocked = catBadges.filter(b => _unlockedBadges.has(b.id)).length;
    return `
    <div class="page-card">
      <div class="card-header-row">
        <div class="card-label">${cat.toUpperCase()}</div>
        <div class="card-label-right">${catUnlocked}/${catBadges.length}</div>
      </div>
      <div class="badges-grid">
        ${catBadges.map(b => {
          const got = _unlockedBadges.has(b.id);
          return `
          <div class="badge-tile ${got?'badge-unlocked':'badge-locked'}" title="${b.desc}">
            <div class="badge-emoji">${got ? b.emoji : '🔒'}</div>
            <div class="badge-name">${b.name}</div>
            <div class="badge-desc">${got ? b.desc : '???'}</div>
            ${got ? '<div class="badge-unlocked-tag">✓</div>' : ''}
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('')}`;
}
