/* ================================================
   FIREBASE.JS — Auth + Firestore + Sécurité
   StudyTokens © 2025
   ================================================ */
'use strict';

const fb = {
  app: null, auth: null, db: null,
  ready: false, user: null, profile: null, error: null,
};

// ── Constantes sécurité ────────────────────────
const ADMIN_MAX_ATTEMPTS  = 5;
const ADMIN_BLOCK_MINUTES = 15;
const AUTO_LOGOUT_MONTHS  = 6;

// ── Init Firebase ─────────────────────────────
function initFirebase() {
  try {
    if (typeof firebase === 'undefined') { fb.error = 'Firebase SDK non chargé'; return false; }
    if (FIREBASE_CONFIG.apiKey.startsWith('REMPLACE')) { fb.error = 'firebase_not_configured'; return false; }
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    fb.app  = firebase.app();
    fb.auth = firebase.auth();
    fb.db   = firebase.firestore();
    fb.ready = true;
    fb.db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
    return true;
  } catch(e) {
    fb.error = e.message;
    console.error('[Firebase] Init error:', e);
    return false;
  }
}

// ── Auth ──────────────────────────────────────
async function fbSignOut() {
  if (!fb.ready) return;
  await fb.auth.signOut();
  fb.user = null; fb.profile = null;
}

async function fbResetPassword(email) {
  if (!fb.ready) throw new Error('Firebase non initialisé');
  await fb.auth.sendPasswordResetEmail(email);
}

function onAuthStateChanged(callback) {
  if (!fb.ready || !fb.auth) { callback(null); return () => {}; }
  return fb.auth.onAuthStateChanged(callback);
}

// ── Profil utilisateur ─────────────────────────
async function fbLoadOrCreateProfile(user) {
  const ref = fb.db.collection('users').doc(user.uid);
  const snap = await ref.get();
  const now = firebase.firestore.FieldValue.serverTimestamp();
  const deviceInfo = `${navigator.platform} / ${navigator.userAgent.match(/Chrome\/[\d.]+/)?.[0] || 'Electron'}`;

  // Vérifier bannissement AVANT tout
  if (snap.exists) {
    const data = snap.data();
    if (data.isBanned) {
      const banUntil = data.banUntil?.toDate?.();
      if (!banUntil || banUntil > new Date()) {
        const msg = banUntil
          ? `Tu es banni jusqu'au ${banUntil.toLocaleDateString('fr-FR')}.`
          : 'Tu es banni définitivement.';
        if (data.banReason) throw new Error(`BANNED:${msg} Raison : ${data.banReason}`);
        throw new Error(`BANNED:${msg}`);
      } else {
        // Ban expiré — lever le ban
        await ref.update({ isBanned: false, banUntil: null, banReason: null });
      }
    }
  }

  if (!snap.exists) {
    const isFondateur = user.email?.toLowerCase() === FONDATEUR_EMAIL.toLowerCase();
    const profile = {
      uid: user.uid, email: user.email,
      displayName: user.displayName || user.email.split('@')[0],
      role: isFondateur ? 'fondateur' : 'utilisateur',
      createdAt: now, lastLogin: now,
      photoURL: user.photoURL || null,
      isBanned: false, banUntil: null, banReason: null,
      loginCount: 1,
      loginHistory: [{
        date: new Date().toISOString(),
        device: deviceInfo,
        method: user.providerData?.[0]?.providerId || 'email',
      }],
    };
    await ref.set(profile);
    fb.profile = profile;
  } else {
    const data = snap.data();
    const isFondateur = user.email?.toLowerCase() === FONDATEUR_EMAIL.toLowerCase();
    if (isFondateur && data.role !== 'fondateur') {
      await ref.update({ role: 'fondateur' });
      data.role = 'fondateur';
    }

    // Vérifier auto-logout (6 mois sans connexion)
    const lastLogin = data.lastLogin?.toDate?.();
    if (lastLogin) {
      const monthsAgo = (Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsAgo > AUTO_LOGOUT_MONTHS) {
        await fb.auth.signOut();
        throw new Error('SESSION_EXPIRED:Ton compte a été déconnecté automatiquement après ' + AUTO_LOGOUT_MONTHS + ' mois d\'inactivité. Reconnecte-toi.');
      }
    }

    // Ajouter à l'historique de connexion (garder les 50 dernières)
    const newEntry = {
      date: new Date().toISOString(),
      device: deviceInfo,
      method: user.providerData?.[0]?.providerId || 'email',
    };
    const history = data.loginHistory || [];
    history.unshift(newEntry);
    if (history.length > 50) history.splice(50);

    await ref.update({
      lastLogin: now,
      loginCount: firebase.firestore.FieldValue.increment(1),
      loginHistory: history,
    });
    data.loginHistory = history;
    fb.profile = data;
  }

  fb.user = user;
  return fb.profile;
}

// ── Données utilisateur ────────────────────────
async function fbSaveUserData(key, value) {
  if (!fb.ready || !fb.user) return api.store.set(key, value);
  try {
    await fb.db.collection('users').doc(fb.user.uid).collection('data').doc('main')
      .set({ [key]: value }, { merge: true });
    api.store.set(key, value).catch(() => {});
  } catch(e) {
    console.error('[Firebase] Save error:', e);
    return api.store.set(key, value);
  }
}

async function fbLoadUserData() {
  if (!fb.ready || !fb.user) return null;
  try {
    const snap = await fb.db.collection('users').doc(fb.user.uid).collection('data').doc('main').get();
    return snap.exists ? snap.data() : null;
  } catch(e) {
    console.error('[Firebase] Load error:', e);
    return null;
  }
}

// ── Sécurité Admin — tentatives mot de passe ──
async function fbCheckAdminRateLimit() {
  if (!fb.ready || !fb.user) return { blocked: false };
  try {
    const ref = fb.db.collection('adminAttempts').doc(fb.user.uid);
    const snap = await ref.get();
    if (!snap.exists) return { blocked: false };
    const data = snap.data();
    const blockUntil = data.blockUntil?.toDate?.();
    if (blockUntil && blockUntil > new Date()) {
      const mins = Math.ceil((blockUntil - new Date()) / 60000);
      return { blocked: true, minutesLeft: mins };
    }
    return { blocked: false, attempts: data.attempts || 0 };
  } catch(e) { return { blocked: false }; }
}

async function fbRecordAdminFailedAttempt() {
  if (!fb.ready || !fb.user) return;
  try {
    const ref = fb.db.collection('adminAttempts').doc(fb.user.uid);
    const snap = await ref.get();
    const attempts = (snap.data()?.attempts || 0) + 1;
    const blockUntil = attempts >= ADMIN_MAX_ATTEMPTS
      ? new Date(Date.now() + ADMIN_BLOCK_MINUTES * 60 * 1000) : null;

    await ref.set({
      uid: fb.user.uid,
      email: fb.user.email,
      attempts,
      lastAttempt: firebase.firestore.FieldValue.serverTimestamp(),
      blockUntil: blockUntil ? firebase.firestore.Timestamp.fromDate(blockUntil) : null,
    }, { merge: true });

    // Alerte email si trop de tentatives
    if (attempts >= ADMIN_MAX_ATTEMPTS) {
      await fbLogSecurityAlert('admin_brute_force', {
        email: fb.user.email,
        attempts,
        blockedUntil: blockUntil?.toISOString(),
      });
    }
    return { attempts, blocked: attempts >= ADMIN_MAX_ATTEMPTS };
  } catch(e) { return {}; }
}

async function fbClearAdminAttempts() {
  if (!fb.ready || !fb.user) return;
  try {
    await fb.db.collection('adminAttempts').doc(fb.user.uid).delete();
  } catch(e) {}
}

// ── Alertes de sécurité (email simulé via Firestore) ──
async function fbLogSecurityAlert(type, data) {
  if (!fb.ready) return;
  try {
    await fb.db.collection('securityAlerts').add({
      type,
      data,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      seen: false,
      notifiedEmail: FONDATEUR_EMAIL,
    });
  } catch(e) {}
}

// ── Gestion utilisateurs (admin) ──────────────
function requireManageUsers() {
  if (!fb.ready || !fb.user) throw new Error('Non connecté');
  if (getRoleLevel(fb.profile?.role) < 3) throw new Error('Permission refusée (admin requis)');
}

async function fbGetAllUsers(limitCount = 100) {
  requireManageUsers();
  const snap = await fb.db.collection('users').orderBy('createdAt', 'desc').limit(limitCount).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function fbGetUserData(uid) {
  requireManageUsers();
  const snap = await fb.db.collection('users').doc(uid).collection('data').doc('main').get();
  return snap.exists ? snap.data() : {};
}

async function fbSetUserRole(uid, role) {
  requireManageUsers();
  if (!ROLES[role]) throw new Error('Rang invalide');
  // Le fondateur ne peut pas être rétrogradé sauf par lui-même
  const target = await fb.db.collection('users').doc(uid).get();
  if (target.data()?.role === 'fondateur' && fb.profile?.role !== 'fondateur') {
    throw new Error('Seul le Fondateur peut modifier le rang Fondateur');
  }
  await fb.db.collection('users').doc(uid).update({ role });
  await fbLogSecurityAlert('role_change', {
    by: fb.user.email, targetUid: uid, newRole: role
  });
}

async function fbBanUser(uid, durationDays, reason) {
  requireManageUsers();
  const banUntil = durationDays > 0
    ? firebase.firestore.Timestamp.fromDate(new Date(Date.now() + durationDays * 86400000))
    : null; // null = ban permanent
  await fb.db.collection('users').doc(uid).update({
    isBanned: true,
    banUntil,
    banReason: reason || 'Non spécifiée',
    bannedBy: fb.user.email,
    bannedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  await fbLogSecurityAlert('user_banned', {
    by: fb.user.email, targetUid: uid, durationDays, reason
  });
}

async function fbUnbanUser(uid) {
  requireManageUsers();
  await fb.db.collection('users').doc(uid).update({
    isBanned: false, banUntil: null, banReason: null, bannedBy: null
  });
}

async function fbDeleteUserAccount(uid) {
  requireManageUsers();
  await fb.db.collection('users').doc(uid).collection('data').doc('main').delete().catch(() => {});
  await fb.db.collection('users').doc(uid).delete();
  await fbLogSecurityAlert('account_deleted', { by: fb.user.email, targetUid: uid });
}

async function fbGetSecurityAlerts(limitCount = 30) {
  requireManageUsers();
  const snap = await fb.db.collection('securityAlerts')
    .orderBy('createdAt', 'desc').limit(limitCount).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function fbMarkAlertSeen(alertId) {
  if (!fb.ready) return;
  await fb.db.collection('securityAlerts').doc(alertId).update({ seen: true });
}

// ── Migration données locales → Firebase ──────
async function migrateLocalDataToFirebase() {
  if (!fb.ready || !fb.user) return false;
  try {
    const existing = await fbLoadUserData();
    if (existing && (existing.tokens > 0 || existing.sessions?.length > 0)) return false;
    const keys = ['tokens','lifetimeTokens','totalMinutes','streak','lastStudyDate','sessions','rewards','redeemedCount','settings'];
    const localData = {};
    let hasLocalData = false;
    for (const key of keys) {
      const val = await api.store.get(key, null);
      if (val !== null) {
        localData[key] = val;
        if (key === 'tokens' && val > 0) hasLocalData = true;
        if (key === 'sessions' && val?.length > 0) hasLocalData = true;
      }
    }
    if (!hasLocalData) return false;
    await fb.db.collection('users').doc(fb.user.uid).collection('data').doc('main')
      .set(localData, { merge: true });
    return true;
  } catch(e) {
    console.error('[Migration] Erreur:', e);
    return false;
  }
}
