/* ════════════════════════════════════════════════
   NOTIFICATIONS.JS — Système de notifications
   Toasts enrichis + Centre de notifications +
   Listeners temps réel Firebase
   ════════════════════════════════════════════════ */
'use strict';

// ── État ─────────────────────────────────────
const NOTIF = {
  items:     [],     // historique
  unread:    0,
  listeners: [],     // Firebase unsub callbacks
  maxHistory: 50,
};

// ── Types de notifications ────────────────────
const NOTIF_TYPES = {
  success: { icon:'✅', color:'#5ee7c4', sound:'success',  label:'Succès'       },
  error:   { icon:'❌', color:'#f87171', sound:'error',    label:'Erreur'       },
  warning: { icon:'⚠️', color:'#fbbf24', sound:'warning',  label:'Avertissement'},
  info:    { icon:'ℹ️', color:'#7b9fff', sound:'notify',   label:'Information'  },
  action:  { icon:'⚡', color:'#c084fc', sound:'click',    label:'Action'       },
  reward:  { icon:'🪙', color:'#facc15', sound:'tokenEarned', label:'Récompense' },
  alert:   { icon:'🚨', color:'#f87171', sound:'warning',  label:'Alerte'       },
  system:  { icon:'🔧', color:'#94a3b8', sound:null,       label:'Système'      },
};

// ════════════════════════════════════════════════
//  TOAST — Notification flottante améliorée
// ════════════════════════════════════════════════
function notify(msg, type = 'success', opts = {}) {
  const {
    duration = 3500,
    title    = null,
    detail   = null,
    action   = null,   // { label, fn }
    sound    = true,
    persist  = false,  // ne pas auto-dismiss
    id       = null,
  } = opts;

  const cfg = NOTIF_TYPES[type] || NOTIF_TYPES.success;

  // ── Jouer le son ──
  if (sound && cfg.sound && typeof SFX !== 'undefined') {
    try { SFX[cfg.sound]?.(); } catch(e) {}
  }

  // ── Ajouter à l'historique ──
  const entry = {
    id:      id || `n_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    type, msg, title, detail, action,
    ts:      new Date(),
    read:    false,
  };
  NOTIF.items.unshift(entry);
  if (NOTIF.items.length > NOTIF.maxHistory) NOTIF.items.pop();
  NOTIF.unread++;
  _updateNotifBadge();

  // ── Créer le toast DOM ──
  const container = document.getElementById('toast-container');
  if (!container) return entry.id;

  // Supprimer ancien toast avec même ID
  document.getElementById(`toast-${entry.id}`)?.remove();

  const el = document.createElement('div');
  el.id = `toast-${entry.id}`;
  el.className = 'notif-toast';
  el.style.cssText = `--notif-color:${cfg.color}`;
  el.innerHTML = `
    <div class="nt-bar" style="background:${cfg.color}"></div>
    <div class="nt-body">
      <div class="nt-top">
        <span class="nt-icon">${cfg.icon}</span>
        <div class="nt-content">
          ${title ? `<div class="nt-title">${title}</div>` : ''}
          <div class="nt-msg">${msg}</div>
          ${detail ? `<div class="nt-detail">${detail}</div>` : ''}
        </div>
        <button class="nt-close" onclick="dismissToast('${entry.id}')">✕</button>
      </div>
      ${action ? `<button class="nt-action" onclick="(${action.fn.toString()})();dismissToast('${entry.id}')">${action.label}</button>` : ''}
    </div>
    ${!persist ? `<div class="nt-progress" style="animation-duration:${duration}ms;background:${cfg.color}"></div>` : ''}`;

  container.appendChild(el);

  // Animation entrée
  requestAnimationFrame(() => el.classList.add('nt-show'));

  // Auto-dismiss
  if (!persist) {
    setTimeout(() => dismissToast(entry.id), duration);
  }

  return entry.id;
}

function dismissToast(id) {
  const el = document.getElementById(`toast-${id}`);
  if (!el) return;
  el.classList.add('nt-hide');
  setTimeout(() => el.remove(), 320);
  // Marquer comme lu dans l'historique
  const item = NOTIF.items.find(n => n.id === id);
  if (item && !item.read) { item.read = true; NOTIF.unread = Math.max(0, NOTIF.unread-1); _updateNotifBadge(); }
}

// Retro-compat avec l'ancien showToast
function showToast(msg, type = 'teal', duration = 3000) {
  const map = { teal:'info', success:'success', error:'error', warn:'warning' };
  notify(msg, map[type] || 'info', { duration, sound: false }); // pas de son ici (géré ailleurs)
}

// ════════════════════════════════════════════════
//  CENTRE DE NOTIFICATIONS
// ════════════════════════════════════════════════
function _updateNotifBadge() {
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
  badge.textContent = NOTIF.unread > 9 ? '9+' : NOTIF.unread;
  badge.style.display = NOTIF.unread > 0 ? 'flex' : 'none';
}

function toggleNotifCenter() {
  const existing = document.getElementById('notif-center');
  if (existing) { closeNotifCenter(); return; }
  openNotifCenter();
}

function openNotifCenter() {
  document.getElementById('notif-center')?.remove();
  if (typeof SFX !== 'undefined') SFX.open?.();

  const panel = document.createElement('div');
  panel.id = 'notif-center';
  panel.className = 'notif-center';
  panel.innerHTML = `
    <div class="nc-header">
      <div>
        <div class="nc-title">🔔 Notifications</div>
        <div class="nc-subtitle">${NOTIF.unread} non lue${NOTIF.unread>1?'s':''}</div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="nc-btn" onclick="markAllNotifsRead()">Tout lire</button>
        <button class="nc-btn" onclick="clearAllNotifs()">Effacer</button>
        <button class="nc-close" onclick="closeNotifCenter()">✕</button>
      </div>
    </div>
    <div class="nc-body" id="nc-body">
      ${_renderNotifList()}
    </div>`;

  document.body.appendChild(panel);
  requestAnimationFrame(() => panel.classList.add('nc-show'));

  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', _closeNotifOutside, { once: false });
  }, 50);
}

function _closeNotifOutside(e) {
  const panel = document.getElementById('notif-center');
  const btn = document.getElementById('notif-btn');
  if (panel && !panel.contains(e.target) && !btn?.contains(e.target)) {
    closeNotifCenter();
    document.removeEventListener('click', _closeNotifOutside);
  }
}

function closeNotifCenter() {
  const panel = document.getElementById('notif-center');
  if (!panel) return;
  if (typeof SFX !== 'undefined') SFX.close?.();
  panel.classList.add('nc-hide');
  setTimeout(() => { panel.remove(); document.removeEventListener('click', _closeNotifOutside); }, 280);
}

function _renderNotifList() {
  if (!NOTIF.items.length) {
    return `<div class="nc-empty">
      <div style="font-size:32px;margin-bottom:10px">🔕</div>
      <div>Aucune notification</div>
    </div>`;
  }
  return NOTIF.items.map(n => {
    const cfg = NOTIF_TYPES[n.type] || NOTIF_TYPES.info;
    const timeAgo = _timeAgo(n.ts);
    return `
    <div class="nc-item ${n.read?'nc-read':''}" id="nci-${n.id}" onclick="markNotifRead('${n.id}')">
      <div class="nc-item-dot" style="background:${n.read?'transparent':cfg.color};border:2px solid ${cfg.color}"></div>
      <div class="nc-item-body">
        <div class="nc-item-header">
          <span class="nc-item-icon">${cfg.icon}</span>
          <span class="nc-item-title">${n.title || n.msg}</span>
          <span class="nc-item-time">${timeAgo}</span>
        </div>
        ${n.title ? `<div class="nc-item-msg">${n.msg}</div>` : ''}
        ${n.detail ? `<div class="nc-item-detail">${n.detail}</div>` : ''}
      </div>
    </div>`;
  }).join('');
}

function markNotifRead(id) {
  const item = NOTIF.items.find(n => n.id === id);
  if (item && !item.read) {
    item.read = true;
    NOTIF.unread = Math.max(0, NOTIF.unread-1);
    _updateNotifBadge();
    document.getElementById(`nci-${id}`)?.classList.add('nc-read');
    document.querySelector('.nc-subtitle').textContent = `${NOTIF.unread} non lue${NOTIF.unread>1?'s':''}`;
    document.getElementById(`nci-${id}`)?.querySelector('.nc-item-dot')?.style.setProperty('background', 'transparent');
  }
}

function markAllNotifsRead() {
  NOTIF.items.forEach(n => { n.read = true; });
  NOTIF.unread = 0;
  _updateNotifBadge();
  const body = document.getElementById('nc-body');
  if (body) body.innerHTML = _renderNotifList();
  document.querySelector('.nc-subtitle').textContent = '0 non lue';
}

function clearAllNotifs() {
  NOTIF.items = [];
  NOTIF.unread = 0;
  _updateNotifBadge();
  const body = document.getElementById('nc-body');
  if (body) body.innerHTML = _renderNotifList();
  document.querySelector('.nc-subtitle').textContent = '0 non lue';
}

function _timeAgo(date) {
  const diff = Date.now() - date.getTime();
  const s = Math.floor(diff/1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s/60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m/60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h/24)}j`;
}

// ════════════════════════════════════════════════
//  TEMPS RÉEL — Listeners Firebase
// ════════════════════════════════════════════════
function startRealtimeListeners() {
  if (!fb.ready || !fb.db) return;
  stopRealtimeListeners(); // clear previous

  // Listener : alertes de sécurité
  if (typeof getRoleLevel === 'function' && getRoleLevel(fb.profile?.role) >= 2) {
    const unsubAlerts = fb.db.collection('securityAlerts')
      .where('seen', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .onSnapshot(snap => {
        snap.docChanges().forEach(change => {
          if (change.type === 'added') {
            const data = change.doc.data();
            // Ignorer les alertes de plus de 5 minutes (existantes au chargement)
            const age = Date.now() - (data.createdAt?.toDate?.()?.getTime() || 0);
            if (age > 300000) return;
            const labels = {
              admin_brute_force: 'Tentative brute force admin',
              role_change: 'Changement de rang',
              user_banned: 'Bannissement utilisateur',
              account_deleted: 'Suppression de compte',
            };
            const detail = data.data ? Object.entries(data.data).slice(0,2).map(([k,v])=>`${k}: ${v}`).join(' · ') : '';
            notify(labels[data.type] || data.type, 'alert', {
              title: '🚨 Alerte sécurité',
              detail,
              duration: 8000,
              sound: true,
            });
          }
        });
        // Mettre à jour le badge dans la sidebar si ouvert
        if (adminState.currentTab === 'alerts') renderAdminAlerts();
      }, () => {});
    NOTIF.listeners.push(unsubAlerts);
  }

  // Listener : config annonces/multiplicateur (pour MAJ en direct dans le dashboard)
  const unsubConfig = fb.db.collection('appConfig')
    .onSnapshot(snap => {
      snap.docChanges().forEach(change => {
        if (change.type === 'modified' || change.type === 'added') {
          const docId = change.doc.id;
          const data = change.doc.data();
          // MAJ locale silencieuse
          if (docId === 'announcement') {
            if (adminState.remoteData) adminState.remoteData.announcement = data;
            if (adminState.currentTab === 'dashboard') _refreshDashboardStatus();
          }
          if (docId === 'multiplier') {
            if (adminState.remoteData) adminState.remoteData.multiplier = data;
            if (adminState.currentTab === 'dashboard') _refreshDashboardStatus();
            // Appliquer le multiplicateur en direct
            if (data.active) {
              const until = data.until ? new Date(data.until) : null;
              if (!until || until > new Date()) {
                state.activeMultiplier = data.factor || 1;
                state.multiplierLabel = data.label || '';
                updateSidebarTokens();
              }
            } else {
              state.activeMultiplier = 1;
              state.multiplierLabel = '';
              updateSidebarTokens();
            }
          }
        }
      });
    }, () => {});
  NOTIF.listeners.push(unsubConfig);
}

function stopRealtimeListeners() {
  NOTIF.listeners.forEach(unsub => { try { unsub(); } catch(e){} });
  NOTIF.listeners = [];
}

// Refresh uniquement le statut système du dashboard (pas le rendu complet)
function _refreshDashboardStatus() {
  if (adminState.currentTab !== 'dashboard') return;
  const ann  = adminState.remoteData?.announcement;
  const mult = adminState.remoteData?.multiplier;
  const annEl = document.querySelector('[data-status-id="announcement"]');
  const multEl = document.querySelector('[data-status-id="multiplier"]');
  if (annEl) annEl.innerHTML = ann?.active ? `<span class="cms-status-val warn">📣 ${ann.title||'Active'}</span>` : '<span class="cms-status-val ok">— Aucune</span>';
  if (multEl) multEl.innerHTML = mult?.active ? `<span class="cms-status-val warn">✨ x${mult.factor}</span>` : '<span class="cms-status-val ok">— Inactif</span>';
}

// ════════════════════════════════════════════════
//  CONFIRMATIONS — Boutons avec feedback
// ════════════════════════════════════════════════
// Remplace un clic normal par : spinner → résultat
async function withButtonFeedback(btnOrId, asyncFn, opts = {}) {
  const btn = typeof btnOrId === 'string' ? document.getElementById(btnOrId) : btnOrId;
  if (!btn || btn.disabled) return;

  const original = btn.innerHTML;
  const originalBg = btn.style.background;
  btn.disabled = true;
  btn.innerHTML = `<span class="auth-spinner" style="width:14px;height:14px;border-width:2px"></span> ${opts.loadingText || 'Chargement...'}`;

  try {
    const result = await asyncFn();
    // Feedback succès
    btn.innerHTML = `✅ ${opts.successText || 'Fait !'}`;
    btn.style.background = 'rgba(94,231,196,.2)';
    btn.style.borderColor = 'rgba(94,231,196,.4)';
    if (opts.successNotif) notify(opts.successNotif.msg, opts.successNotif.type || 'success', opts.successNotif);
    setTimeout(() => {
      btn.innerHTML = original;
      btn.style.background = originalBg;
      btn.style.borderColor = '';
      btn.disabled = false;
    }, opts.resetDelay || 1800);
    return result;
  } catch(e) {
    // Feedback erreur
    btn.innerHTML = `❌ ${opts.errorText || 'Erreur'}`;
    btn.style.background = 'rgba(248,113,113,.15)';
    btn.style.borderColor = 'rgba(248,113,113,.4)';
    notify(e.message, 'error', { title: opts.errorTitle || 'Erreur' });
    setTimeout(() => {
      btn.innerHTML = original;
      btn.style.background = originalBg;
      btn.style.borderColor = '';
      btn.disabled = false;
    }, opts.resetDelay || 2500);
    throw e;
  }
}

// ── Init ──────────────────────────────────────
function initNotifications() {
  // Injecter le bouton de notifications dans la sidebar
  _injectNotifButton();
}

function _injectNotifButton() {
  // Cherche la sidebar-bottom pour injecter le bouton
  const sidebarBottom = document.querySelector('.sidebar-bottom');
  if (!sidebarBottom || document.getElementById('notif-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'notif-btn';
  btn.className = 'notif-bell-btn';
  btn.onclick = toggleNotifCenter;
  btn.title = 'Notifications';
  btn.innerHTML = `
    <span style="font-size:16px">🔔</span>
    <span class="nav-label">Notifications</span>
    <span id="notif-badge" class="notif-badge" style="display:none">0</span>`;
  sidebarBottom.prepend(btn);
}
