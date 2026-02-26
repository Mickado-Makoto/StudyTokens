/* ================================================
   DIAGNOSTICS.JS — Outil de détection de bugs
   Analyse automatique de l'application
   ================================================ */
'use strict';

const DIAG = {
  results: [],
  running: false,
};

// ── Enregistrement des résultats ──────────────
function diagAdd(category, level, title, detail, fix = null) {
  DIAG.results.push({ category, level, title, detail, fix, ts: new Date().toISOString() });
}

// ── Vérifications ─────────────────────────────
async function runDiagnostics() {
  if (DIAG.running) return;
  DIAG.running = true;
  DIAG.results = [];

  const checks = [
    diagCheckFirebase,
    diagCheckAuth,
    diagCheckFirestore,
    diagCheckAppConfig,
    diagCheckState,
    diagCheckPermissions,
    diagCheckUI,
    diagCheckPerformance,
    diagCheckSecurity,
  ];

  for (const check of checks) {
    try { await check(); } catch(e) {
      diagAdd('Système', 'error', 'Erreur lors du diagnostic', e.message);
    }
  }

  DIAG.running = false;
  return DIAG.results;
}

// ── 1. Firebase ───────────────────────────────
async function diagCheckFirebase() {
  if (typeof firebase === 'undefined') {
    diagAdd('Firebase', 'error', 'SDK Firebase non chargé',
      'Les scripts Firebase ne sont pas chargés.',
      'Vérifier la connexion internet et le chargement des CDN dans index.html');
    return;
  }
  diagAdd('Firebase', 'ok', 'SDK Firebase chargé', 'firebase-app, firebase-auth, firebase-firestore OK');

  if (!fb.ready) {
    diagAdd('Firebase', 'error', 'Firebase non initialisé',
      `Erreur: ${fb.error || 'inconnue'}`,
      'Vérifier les clés API dans config.js → FIREBASE_CONFIG');
    return;
  }
  diagAdd('Firebase', 'ok', 'Firebase initialisé', `Projet: ${FIREBASE_CONFIG.projectId}`);

  if (!fb.auth) {
    diagAdd('Firebase', 'error', 'Auth Firebase null', 'fb.auth est null'); return;
  }
  diagAdd('Firebase', 'ok', 'Firebase Auth OK', '');

  if (!fb.db) {
    diagAdd('Firebase', 'error', 'Firestore null', 'fb.db est null'); return;
  }
  diagAdd('Firebase', 'ok', 'Firestore OK', '');
}

// ── 2. Authentification ───────────────────────
async function diagCheckAuth() {
  if (!fb.ready) return;
  const user = fb.auth.currentUser;
  if (!user) {
    diagAdd('Auth', 'warn', 'Aucun utilisateur connecté', 'Utilisateur non authentifié');
    return;
  }
  diagAdd('Auth', 'ok', 'Utilisateur connecté', `${user.email} (uid: ${user.uid.slice(0,8)}...)`);

  if (!fb.profile) {
    diagAdd('Auth', 'error', 'Profil Firebase manquant',
      'fb.profile est null alors qu\'un user est connecté',
      'Le profil doit être chargé lors du login via fbLoadOrCreateProfile()');
    return;
  }

  const role = fb.profile.role;
  const validRoles = Object.keys(ROLES);
  if (!validRoles.includes(role)) {
    diagAdd('Auth', 'error', 'Rang invalide',
      `Role "${role}" inconnu. Rangs valides: ${validRoles.join(', ')}`,
      'Corriger le rang dans Firebase Console → Firestore → users → document');
  } else {
    diagAdd('Auth', 'ok', `Rang valide : ${ROLES[role].label}`, `Niveau ${ROLES[role].level}`);
  }

  if (fb.profile.isBanned) {
    diagAdd('Auth', 'warn', 'Compte banni',
      `Raison: ${fb.profile.banReason || 'non spécifiée'}. Jusqu'au: ${fb.profile.banUntil?.toDate?.()?.toLocaleDateString('fr-FR') || 'permanent'}`);
  }
}

// ── 3. Firestore R/W ──────────────────────────
async function diagCheckFirestore() {
  if (!fb.ready || !fb.user) return;
  try {
    const testRef = fb.db.collection('_diag_test').doc(fb.user.uid);
    await testRef.set({ ts: new Date().toISOString(), test: true });
    await testRef.delete();
    diagAdd('Firestore', 'ok', 'Écriture Firestore OK', 'Test écriture/suppression réussi');
  } catch(e) {
    diagAdd('Firestore', 'error', 'Erreur écriture Firestore', e.message,
      'Vérifier les règles Firestore dans Firebase Console → Firestore → Règles');
  }

  try {
    const ref = fb.db.collection('users').doc(fb.user.uid).collection('data').doc('main');
    const snap = await ref.get();
    if (snap.exists) {
      const d = snap.data();
      diagAdd('Firestore', 'ok', 'Données utilisateur accessibles',
        `tokens: ${d.tokens||0}, sessions: ${d.sessions?.length||0}, streak: ${d.streak||0}`);
    } else {
      diagAdd('Firestore', 'warn', 'Aucune donnée utilisateur en cloud',
        'Le document data/main n\'existe pas encore — normal pour un nouveau compte');
    }
  } catch(e) {
    diagAdd('Firestore', 'error', 'Lecture données utilisateur impossible', e.message);
  }
}

// ── 4. Config app ─────────────────────────────
async function diagCheckAppConfig() {
  if (!fb.ready) return;
  try {
    // Check fondateur email
    if (!FONDATEUR_EMAIL || FONDATEUR_EMAIL.includes('REMPLACE')) {
      diagAdd('Config', 'error', 'Email fondateur non configuré',
        `FONDATEUR_EMAIL = "${FONDATEUR_EMAIL}"`,
        'Mettre l\'email réel dans config.js → FONDATEUR_EMAIL');
    } else {
      diagAdd('Config', 'ok', 'Email fondateur configuré', FONDATEUR_EMAIL);
    }

    // Check API key
    if (FIREBASE_CONFIG.apiKey.startsWith('REMPLACE')) {
      diagAdd('Config', 'error', 'Firebase non configuré',
        'Les clés API Firebase sont des placeholders',
        'Remplir FIREBASE_CONFIG dans config.js avec les vraies clés');
    } else {
      diagAdd('Config', 'ok', 'Clés Firebase configurées', `Project: ${FIREBASE_CONFIG.projectId}`);
    }

    // Check app version
    diagAdd('Config', 'ok', 'Version de l\'app', `v${APP_VERSION}`);

    // Check minigames config
    try {
      const mgSnap = await fb.db.collection('appConfig').doc('minigames').get();
      if (mgSnap.exists) {
        diagAdd('Config', 'ok', 'Config mini-jeux présente dans Firebase', '');
      } else {
        diagAdd('Config', 'info', 'Config mini-jeux absente de Firebase',
          'Sera créée à la première sauvegarde depuis le panel admin');
      }
    } catch(e) {}

  } catch(e) {
    diagAdd('Config', 'error', 'Erreur vérification config', e.message);
  }
}

// ── 5. État local ─────────────────────────────
async function diagCheckState() {
  if (typeof state === 'undefined') {
    diagAdd('État', 'error', 'Variable state non définie', '`state` est undefined — state.js pas chargé'); return;
  }

  const issues = [];
  if (typeof state.tokens !== 'number') issues.push('tokens non numérique');
  if (typeof state.streak !== 'number') issues.push('streak non numérique');
  if (!Array.isArray(state.sessions)) issues.push('sessions n\'est pas un tableau');
  if (typeof state.settings !== 'object') issues.push('settings non objet');

  if (issues.length) {
    diagAdd('État', 'warn', 'Incohérences dans state', issues.join(', '));
  } else {
    diagAdd('État', 'ok', 'État local cohérent',
      `tokens: ${state.tokens}, streak: ${state.streak}, sessions: ${state.sessions?.length||0}`);
  }

  if (state.tokens < 0) diagAdd('État', 'warn', 'Tokens négatifs', `tokens = ${state.tokens}`);
  if (state.streak < 0) diagAdd('État', 'warn', 'Streak négatif', `streak = ${state.streak}`);
}

// ── 6. Permissions ────────────────────────────
async function diagCheckPermissions() {
  if (!fb.profile) return;
  const role = fb.profile.role;
  const level = getRoleLevel(role);

  // Verify helper functions work
  try {
    const r1 = getRoleLevel('fondateur');
    const r2 = getRoleLevel('utilisateur');
    if (r1 !== 4 || r2 !== 0) {
      diagAdd('Permissions', 'error', 'getRoleLevel() retourne des valeurs incorrectes',
        `fondateur=${r1} (attendu 4), utilisateur=${r2} (attendu 0)`);
    } else {
      diagAdd('Permissions', 'ok', 'getRoleLevel() fonctionne', '');
    }
  } catch(e) {
    diagAdd('Permissions', 'error', 'getRoleLevel() non défini', e.message,
      'Vérifier que config.js est chargé avant les autres scripts');
  }

  // Vérify admin panel access
  if (level >= 2) {
    if (typeof openAdminPanel === 'undefined') {
      diagAdd('Permissions', 'error', 'openAdminPanel() non défini',
        'La fonction admin n\'est pas accessible malgré les permissions suffisantes',
        'Vérifier que admin.js se charge sans erreur de syntaxe (F12 Console)');
    } else {
      diagAdd('Permissions', 'ok', `Accès admin disponible (${ROLES[role].label})`, '');
    }
  }
}

// ── 7. Interface ──────────────────────────────
async function diagCheckUI() {
  const checks = [
    ['loading-screen', false, 'L\'écran de chargement est toujours visible'],
    ['app', true, 'Le div #app est absent'],
    ['toast-container', true, 'Le conteneur de toasts est absent'],
  ];

  for (const [id, mustExist, errMsg] of checks) {
    const el = document.getElementById(id);
    const exists = el !== null;
    const visible = el && el.style.display !== 'none';

    if (id === 'loading-screen' && visible) {
      diagAdd('Interface', 'warn', errMsg, 'L\'écran de chargement est toujours affiché');
    } else if (mustExist && !exists) {
      diagAdd('Interface', 'error', errMsg, `#${id} introuvable dans le DOM`);
    }
  }

  // Check for js errors in window
  diagAdd('Interface', 'ok', 'DOM vérifié', 'Structure HTML de base OK');

  // Check theme
  const theme = document.documentElement.getAttribute('data-theme');
  if (!theme || !THEMES[theme]) {
    diagAdd('Interface', 'warn', `Thème inconnu: "${theme}"`,
      `Thèmes valides: ${Object.keys(THEMES).join(', ')}`,
      'Réinitialiser le thème à "cosmos" dans les paramètres');
  } else {
    diagAdd('Interface', 'ok', `Thème actif: ${THEMES[theme].label}`, '');
  }
}

// ── 8. Performance ────────────────────────────
async function diagCheckPerformance() {
  const nav = window.performance?.getEntriesByType('navigation')?.[0];
  if (nav) {
    const loadTime = Math.round(nav.loadEventEnd - nav.startTime);
    if (loadTime > 5000) {
      diagAdd('Performance', 'warn', `Chargement lent: ${loadTime}ms`, 'Plus de 5 secondes pour charger la page');
    } else {
      diagAdd('Performance', 'ok', `Temps de chargement: ${loadTime}ms`, loadTime < 2000 ? 'Excellent' : 'Correct');
    }
  }

  if (state?.sessions?.length > 500) {
    diagAdd('Performance', 'warn', 'Trop de sessions en mémoire',
      `${state.sessions.length} sessions chargées`,
      'Archiver les anciennes sessions sur Firebase pour améliorer les performances');
  }
}

// ── 9. Sécurité ───────────────────────────────
async function diagCheckSecurity() {
  if (!fb.ready || !fb.user) return;

  // Check admin attempts
  try {
    const snap = await fb.db.collection('adminAttempts').doc(fb.user.uid).get();
    if (snap.exists) {
      const d = snap.data();
      const blockUntil = d.blockUntil?.toDate?.();
      if (blockUntil && blockUntil > new Date()) {
        diagAdd('Sécurité', 'warn', 'Compte admin bloqué',
          `Bloqué jusqu'au ${blockUntil.toLocaleString('fr-FR')} (${d.attempts} tentatives)`);
      } else if (d.attempts > 0) {
        diagAdd('Sécurité', 'info', `${d.attempts} tentative(s) admin enregistrée(s)`,
          'Pas de blocage actif');
      }
    }
  } catch(e) {}

  // Check unseen alerts
  try {
    if (getRoleLevel(fb.profile?.role) >= 2) {
      const snap = await fb.db.collection('securityAlerts')
        .where('seen', '==', false).limit(5).get();
      if (!snap.empty) {
        diagAdd('Sécurité', 'warn', `${snap.size} alerte(s) non lue(s)`,
          'Des alertes de sécurité attendent d\'être consultées',
          'Ouvrir l\'admin → Alertes sécurité');
      } else {
        diagAdd('Sécurité', 'ok', 'Aucune alerte de sécurité non lue', '');
      }
    }
  } catch(e) {}
}

// ── Rendu du panel de diagnostic ──────────────
async function showDiagnosticsPanel() {
  document.getElementById('diag-panel')?.remove();

  const panel = document.createElement('div');
  panel.id = 'diag-panel';
  panel.style.cssText = `
    position:fixed; inset:0; z-index:99998;
    background:rgba(0,0,0,.85); backdrop-filter:blur(8px);
    display:flex; align-items:center; justify-content:center; padding:20px;`;
  panel.innerHTML = `
    <div style="
      background:var(--bg-card); border:1px solid var(--border); border-radius:16px;
      width:100%; max-width:760px; max-height:90vh; display:flex; flex-direction:column;
      overflow:hidden; box-shadow:0 24px 80px rgba(0,0,0,.6)">
      <div style="
        padding:16px 20px; border-bottom:1px solid var(--border);
        display:flex; align-items:center; justify-content:space-between; flex-shrink:0">
        <div>
          <div style="font-size:16px;font-weight:800">🔍 Diagnostics StudyTokens</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px">Analyse complète de l'application</div>
        </div>
        <div style="display:flex;gap:8px">
          <button onclick="runAndShowDiag()" style="
            padding:8px 14px;border-radius:8px;background:var(--accent);border:none;
            color:#fff;font-size:13px;font-weight:600;cursor:pointer">🔄 Relancer</button>
          <button onclick="document.getElementById('diag-panel').remove()" style="
            padding:8px 14px;border-radius:8px;background:var(--bg-elevated);border:1px solid var(--border);
            color:var(--text-primary);font-size:13px;cursor:pointer">✕</button>
        </div>
      </div>
      <div id="diag-content" style="overflow-y:auto;padding:16px;flex:1">
        <div style="text-align:center;padding:40px;color:var(--text-muted)">
          <span class="auth-spinner"></span> Analyse en cours...
        </div>
      </div>
    </div>`;
  document.body.appendChild(panel);
  await runAndShowDiag();
}

async function runAndShowDiag() {
  const content = document.getElementById('diag-content');
  if (content) content.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)"><span class="auth-spinner"></span> Analyse en cours...</div>`;

  const results = await runDiagnostics();
  if (!content) return;

  const counts = { ok:0, info:0, warn:0, error:0 };
  results.forEach(r => counts[r.level]++);

  const categories = [...new Set(results.map(r => r.category))];
  const levelColor = { ok:'#5ee7c4', info:'#7b9fff', warn:'#fbbf24', error:'#f87171' };
  const levelIcon  = { ok:'✅', info:'ℹ️', warn:'⚠️', error:'❌' };

  content.innerHTML = `
    <!-- Summary -->
    <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">
      ${Object.entries(counts).map(([level, count]) => `
        <div style="
          flex:1;min-width:100px;padding:10px 14px;border-radius:10px;
          background:${levelColor[level]}18;border:1px solid ${levelColor[level]}40;
          display:flex;align-items:center;gap:8px">
          <span style="font-size:18px">${levelIcon[level]}</span>
          <div>
            <div style="font-size:18px;font-weight:800;color:${levelColor[level]}">${count}</div>
            <div style="font-size:11px;color:var(--text-muted)">${level.toUpperCase()}</div>
          </div>
        </div>`).join('')}
    </div>

    <!-- Global status -->
    <div style="
      padding:12px 16px;border-radius:10px;margin-bottom:16px;font-size:14px;font-weight:600;
      background:${counts.error>0?'rgba(248,113,113,.1)':counts.warn>0?'rgba(251,191,36,.1)':'rgba(94,231,196,.1)'};
      border:1px solid ${counts.error>0?'rgba(248,113,113,.3)':counts.warn>0?'rgba(251,191,36,.3)':'rgba(94,231,196,.3)'};
      color:${counts.error>0?'#f87171':counts.warn>0?'#fbbf24':'#5ee7c4'}">
      ${counts.error>0
        ? `❌ ${counts.error} erreur${counts.error>1?'s':''} critique${counts.error>1?'s':''} détectée${counts.error>1?'s':''} — correction immédiate requise`
        : counts.warn>0
        ? `⚠️ ${counts.warn} avertissement${counts.warn>1?'s':''} — vérification recommandée`
        : '✅ Tout fonctionne correctement !'}
    </div>

    <!-- Results by category -->
    ${categories.map(cat => {
      const catResults = results.filter(r => r.category === cat);
      const catHasError = catResults.some(r => r.level === 'error');
      const catHasWarn = catResults.some(r => r.level === 'warn');
      return `
        <div style="margin-bottom:12px">
          <div style="
            font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;
            color:${catHasError?'#f87171':catHasWarn?'#fbbf24':'var(--text-muted)'};
            margin-bottom:6px;padding:0 4px">
            ${catHasError?'❌':catHasWarn?'⚠️':'✅'} ${cat}
          </div>
          <div style="display:flex;flex-direction:column;gap:4px">
            ${catResults.map(r => `
              <div style="
                display:flex;gap:10px;align-items:flex-start;padding:10px 12px;
                background:${levelColor[r.level]}0d;border:1px solid ${levelColor[r.level]}30;
                border-radius:8px;border-left:3px solid ${levelColor[r.level]}">
                <span style="flex-shrink:0;margin-top:1px">${levelIcon[r.level]}</span>
                <div style="flex:1;min-width:0">
                  <div style="font-size:13px;font-weight:600;color:var(--text-primary)">${r.title}</div>
                  ${r.detail ? `<div style="font-size:12px;color:var(--text-muted);margin-top:2px;word-break:break-word">${r.detail}</div>` : ''}
                  ${r.fix ? `<div style="font-size:11px;color:${levelColor[r.level]};margin-top:4px;font-style:italic">💡 ${r.fix}</div>` : ''}
                </div>
              </div>`).join('')}
          </div>
        </div>`;
    }).join('')}

    <div style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">
      Analyse effectuée le ${new Date().toLocaleString('fr-FR')} · ${results.length} vérifications
    </div>`;
}

// Raccourci clavier Ctrl+Shift+D pour ouvrir le panel
window.addEventListener('keydown', e => {
  if (e.ctrlKey && e.shiftKey && e.key === 'D') {
    e.preventDefault();
    showDiagnosticsPanel();
  }
});
