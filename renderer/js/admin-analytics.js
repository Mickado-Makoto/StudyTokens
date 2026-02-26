/* ================================================
   ADMIN-ANALYTICS.JS — Dashboard, Activité, Stats
   ================================================ */
'use strict';

// ══════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════
function renderAdminDashboard() {
  const ann  = adminState.remoteData?.announcement;
  const mult = adminState.remoteData?.multiplier;
  const level = getRoleLevel(fb.profile?.role);
  return `
  <div class="cms-page-header">
    <div class="cms-page-title"><div class="cms-page-title-icon">📊</div>Dashboard</div>
    <div class="cms-page-subtitle">Vue globale de StudyTokens · v${APP_VERSION}</div>
  </div>

  <div class="cms-stats-row" id="admin-global-stats">
    <div class="cms-stat-box" style="cursor:pointer" onclick="switchAdminTab('users')">
      <div class="cms-stat-icon purple">👥</div>
      <div><div class="cms-stat-val" id="stat-users">—</div><div class="cms-stat-lbl">Utilisateurs</div></div>
    </div>
    <div class="cms-stat-box">
      <div class="cms-stat-icon teal">🪙</div>
      <div><div class="cms-stat-val" id="stat-tokens">—</div><div class="cms-stat-lbl">Jetons total</div></div>
    </div>
    <div class="cms-stat-box">
      <div class="cms-stat-icon gold">📚</div>
      <div><div class="cms-stat-val" id="stat-sessions">—</div><div class="cms-stat-lbl">Sessions</div></div>
    </div>
    <div class="cms-stat-box">
      <div class="cms-stat-icon green">🔥</div>
      <div><div class="cms-stat-val" id="stat-active">—</div><div class="cms-stat-lbl">Actifs ce mois</div></div>
    </div>
    <div class="cms-stat-box">
      <div class="cms-stat-icon red">🚫</div>
      <div><div class="cms-stat-val" id="stat-banned">—</div><div class="cms-stat-lbl">Bannis</div></div>
    </div>
    <div class="cms-stat-box">
      <div class="cms-stat-icon blue">⭐</div>
      <div><div class="cms-stat-val" id="stat-pro">—</div><div class="cms-stat-lbl">Utilisateurs Pro+</div></div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px">

    <!-- Statut système -->
    <div class="cms-card">
      <div class="cms-card-header"><div class="cms-card-title"><div class="cct-dot"></div>STATUT SYSTÈME</div></div>
      <div class="cms-status-list">
        <div class="cms-status-item"><span class="cms-status-label">Firebase</span>
          <span class="cms-status-val ok">✅ Connecté</span></div>
        <div class="cms-status-item"><span class="cms-status-label">Version app</span>
          <span class="cms-status-val ok">v${APP_VERSION}</span></div>
        <div class="cms-status-item"><span class="cms-status-label">Annonce active</span>
          <span data-status-id="announcement" class="cms-status-val ${ann?.active?'warn':'ok'}">${ann?.active?'📣 '+ann.title:'— Aucune'}</span></div>
        <div class="cms-status-item"><span class="cms-status-label">Multiplicateur</span>
          <span data-status-id="multiplier" class="cms-status-val ${mult?.active?'warn':'ok'}">${mult?.active?'✨ x'+mult.factor:'— Inactif'}</span></div>
        ${level >= 4 ? `<div class="cms-status-item"><span class="cms-status-label">Token GitHub</span>
          <span class="cms-status-val ${adminState.ghToken?'ok':'warn'}">${adminState.ghToken?'✅ Configuré':'⚠️ Manquant'}</span></div>` : ''}
      </div>
    </div>

    <!-- Dernières inscriptions -->
    <div class="cms-card">
      <div class="cms-card-header">
        <div class="cms-card-title"><div class="cct-dot"></div>DERNIERS INSCRITS</div>
        <button class="btn btn-secondary btn-sm" onclick="switchAdminTab('users')">Voir tous</button>
      </div>
      <div id="recent-users-list" style="font-size:13px;color:var(--text-muted)">Chargement...</div>
    </div>

    <!-- Dernières alertes -->
    <div class="cms-card">
      <div class="cms-card-header">
        <div class="cms-card-title"><div class="cct-dot red"></div>ALERTES RÉCENTES</div>
        <button class="btn btn-secondary btn-sm" onclick="switchAdminTab('alerts')">Voir toutes</button>
      </div>
      <div id="recent-alerts-list" style="font-size:13px;color:var(--text-muted)">Chargement...</div>
    </div>

    <!-- Rang distribution -->
    <div class="cms-card">
      <div class="cms-card-header"><div class="cms-card-title"><div class="cct-dot"></div>DISTRIBUTION DES RANGS</div></div>
      <div id="rank-distribution" style="font-size:13px;color:var(--text-muted)">Chargement...</div>
    </div>

  </div>`;
}

// Charger les stats dynamiques après le rendu
function loadDashboardStats() {
  if (adminState.currentTab !== 'dashboard') return;
  fbGetAllUsers(200).then(users => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const active = users.filter(u => u.lastLogin?.toDate && u.lastLogin.toDate() >= thisMonth);
    const banned = users.filter(u => u.isBanned);
    const pro = users.filter(u => getRoleLevel(u.role) >= 1);

    document.getElementById('stat-users')?.textContent != null &&
      (document.getElementById('stat-users').textContent = users.length);
    document.getElementById('stat-active')?.textContent != null &&
      (document.getElementById('stat-active').textContent = active.length);
    document.getElementById('stat-banned')?.textContent != null &&
      (document.getElementById('stat-banned').textContent = banned.length);
    document.getElementById('stat-pro')?.textContent != null &&
      (document.getElementById('stat-pro').textContent = pro.length);

    // Derniers inscrits
    const recentEl = document.getElementById('recent-users-list');
    if (recentEl) {
      const recent = [...users].slice(0, 5);
      recentEl.innerHTML = recent.length ? `<div style="display:flex;flex-direction:column;gap:6px">
        ${recent.map(u => {
          const role = ROLES[u.role] || ROLES.utilisateur;
          const d = u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString('fr-FR') : '—';
          return `<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)">
            <div>
              <div style="font-size:13px;font-weight:600;color:var(--text-primary)">${u.displayName||'—'}</div>
              <div style="font-size:11px;color:var(--text-muted)">${u.email||''}</div>
            </div>
            <div style="text-align:right">
              <span class="user-role-badge ${role.css}">${role.emoji} ${role.label}</span>
              <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${d}</div>
            </div>
          </div>`;
        }).join('')}
      </div>` : '<div style="color:var(--text-muted)">Aucun utilisateur</div>';
    }

    // Distribution rangs
    const distEl = document.getElementById('rank-distribution');
    if (distEl) {
      const counts = {};
      users.forEach(u => { counts[u.role||'utilisateur'] = (counts[u.role||'utilisateur']||0)+1; });
      distEl.innerHTML = Object.entries(ROLES).map(([k,r]) => {
        const count = counts[k]||0;
        const pct = users.length ? Math.round(count/users.length*100) : 0;
        return `<div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span class="user-role-badge ${r.css}">${r.emoji} ${r.label}</span>
            <span style="font-size:12px;color:var(--text-muted)">${count} (${pct}%)</span>
          </div>
          <div style="height:4px;background:var(--bg-elevated);border-radius:2px">
            <div style="height:4px;background:var(--accent);border-radius:2px;width:${pct}%;transition:width .6s"></div>
          </div>
        </div>`;
      }).join('');
    }

    // Totaux tokens/sessions (approximation depuis nos données locales)
    document.getElementById('stat-tokens')?.textContent != null &&
      (document.getElementById('stat-tokens').textContent = state.tokens);
    document.getElementById('stat-sessions')?.textContent != null &&
      (document.getElementById('stat-sessions').textContent = state.sessions.length);

  }).catch(e => console.error('[Dashboard stats]', e));

  // Alertes récentes
  fbGetSecurityAlerts(5).then(alerts => {
    const el = document.getElementById('recent-alerts-list');
    if (!el) return;
    const typeLabel = { admin_brute_force:'🔓 Brute force', role_change:'🎭 Rang modifié', user_banned:'🚫 Ban', account_deleted:'🗑 Suppression' };
    el.innerHTML = alerts.length ? `<div style="display:flex;flex-direction:column;gap:6px">
      ${alerts.map(a => {
        const d = a.createdAt?.toDate ? a.createdAt.toDate().toLocaleString('fr-FR') : '—';
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:12px">${typeLabel[a.type]||a.type} ${!a.seen?'<span class="alert-dot" style="display:inline-block;margin-left:4px"></span>':''}</span>
          <span style="font-size:11px;color:var(--text-muted)">${d}</span>
        </div>`;
      }).join('')}
    </div>` : '<div style="color:var(--text-muted)">Aucune alerte 🎉</div>';
  }).catch(() => {});
}

// ══════════════════════════════════════════════
//  ACTIVITÉ
// ══════════════════════════════════════════════
function renderAdminActivity() {
  return `
  <div class="cms-page-header">
    <div class="cms-page-title"><div class="cms-page-title-icon">📋</div>Activité</div>
    <div class="cms-page-subtitle">Historique des actions récentes sur la plateforme</div>
  </div>
  <div class="cms-card">
    <div class="cms-card-header">
      <div class="cms-card-title"><div class="cct-dot"></div>JOURNAL D'ACTIVITÉ</div>
      <button class="btn btn-secondary btn-sm" onclick="loadActivityLog()">🔄 Rafraîchir</button>
    </div>
    <div id="activity-log">Chargement...</div>
  </div>`;
}

async function loadActivityLog() {
  const el = document.getElementById('activity-log');
  if (!el) return;
  try {
    const alerts = await fbGetSecurityAlerts(100);
    const typeLabel = {
      admin_brute_force: { icon:'🔓', label:'Tentative brute force admin', color:'var(--red)' },
      role_change:       { icon:'🎭', label:'Changement de rang',          color:'var(--accent)' },
      user_banned:       { icon:'🚫', label:'Bannissement utilisateur',    color:'#ffa500' },
      account_deleted:   { icon:'🗑', label:'Suppression de compte',       color:'var(--red)' },
    };
    el.innerHTML = alerts.length ? `
      <div style="display:flex;flex-direction:column;gap:4px;max-height:500px;overflow-y:auto">
        ${alerts.map(a => {
          const t = typeLabel[a.type] || { icon:'📌', label:a.type, color:'var(--text-muted)' };
          const d = a.createdAt?.toDate ? a.createdAt.toDate().toLocaleString('fr-FR') : '—';
          const detail = a.data ? Object.entries(a.data).map(([k,v])=>`<b>${k}:</b> ${v}`).join(' · ') : '';
          return `<div style="display:flex;gap:12px;padding:10px 12px;border-radius:8px;background:var(--bg-elevated);border:1px solid var(--border);${!a.seen?'border-left:3px solid '+t.color:''}">
            <div style="font-size:20px;flex-shrink:0">${t.icon}</div>
            <div style="flex:1">
              <div style="font-size:13px;font-weight:600;color:${t.color}">${t.label}</div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${detail}</div>
            </div>
            <div style="font-size:11px;color:var(--text-muted);white-space:nowrap">${d}</div>
          </div>`;
        }).join('')}
      </div>` : '<div style="color:var(--text-muted);padding:20px;text-align:center">Aucune activité enregistrée 🎉</div>';
  } catch(e) {
    el.innerHTML = `<div style="color:var(--red)">Erreur : ${e.message}</div>`;
  }
}

// ══════════════════════════════════════════════
//  ANALYTICS
// ══════════════════════════════════════════════
async function renderAdminAnalytics() {
  const panel = document.getElementById('cms-page-content');
  if (!panel) return;
  panel.innerHTML = `
  <div class="cms-page-header">
    <div class="cms-page-title"><div class="cms-page-title-icon">📈</div>Statistiques d'usage</div>
    <div class="cms-page-subtitle">Analyse globale de la communauté StudyTokens</div>
  </div>
  <div class="cms-stats-row" id="analytics-stats"></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px">
    <div class="cms-card">
      <div class="cms-card-header"><div class="cms-card-title"><div class="cct-dot"></div>INSCRIPTIONS PAR SEMAINE</div></div>
      <div id="analytics-signups" style="padding:10px;min-height:120px">Chargement...</div>
    </div>
    <div class="cms-card">
      <div class="cms-card-header"><div class="cms-card-title"><div class="cct-dot teal"></div>TOP UTILISATEURS (JETONS)</div></div>
      <div id="analytics-top-users" style="min-height:120px">Chargement...</div>
    </div>
    <div class="cms-card">
      <div class="cms-card-header"><div class="cms-card-title"><div class="cct-dot gold"></div>DISTRIBUTION DES RANGS</div></div>
      <div id="analytics-ranks" style="min-height:120px">Chargement...</div>
    </div>
    <div class="cms-card">
      <div class="cms-card-header"><div class="cms-card-title"><div class="cct-dot purple"></div>MÉTHODES DE CONNEXION</div></div>
      <div id="analytics-methods" style="min-height:120px">Chargement...</div>
    </div>
  </div>`;

  try {
    const users = await fbGetAllUsers(500);
    const now = new Date();
    const d7  = new Date(now - 7*86400000);
    const d30 = new Date(now - 30*86400000);

    let totalTokens = 0, totalSessions = 0, totalMinutes = 0;
    const userDataPromises = users.slice(0, 50).map(u =>
      fb.db.collection('users').doc(u.id).collection('data').doc('main').get()
        .then(s => s.exists ? s.data() : {}).catch(() => ({}))
    );
    const allData = await Promise.all(userDataPromises);
    allData.forEach(d => {
      totalTokens += d.lifetimeTokens || 0;
      totalSessions += d.sessions?.length || 0;
      totalMinutes += d.totalMinutes || 0;
    });

    document.getElementById('analytics-stats').innerHTML = `
      <div class="cms-stat-box"><div class="cms-stat-icon purple">👥</div><div><div class="cms-stat-val">${users.length}</div><div class="cms-stat-lbl">Comptes total</div></div></div>
      <div class="cms-stat-box"><div class="cms-stat-icon green">📅</div><div><div class="cms-stat-val">${users.filter(u=>u.createdAt?.toDate?.()>=d7).length}</div><div class="cms-stat-lbl">Inscrits (7j)</div></div></div>
      <div class="cms-stat-box"><div class="cms-stat-icon gold">🪙</div><div><div class="cms-stat-val">${totalTokens.toLocaleString('fr-FR')}</div><div class="cms-stat-lbl">Jetons distribués</div></div></div>
      <div class="cms-stat-box"><div class="cms-stat-icon teal">📚</div><div><div class="cms-stat-val">${totalSessions.toLocaleString('fr-FR')}</div><div class="cms-stat-lbl">Sessions enregistrées</div></div></div>
      <div class="cms-stat-box"><div class="cms-stat-icon blue">⏱</div><div><div class="cms-stat-val">${Math.round(totalMinutes/60).toLocaleString('fr-FR')}h</div><div class="cms-stat-lbl">Heures d'étude</div></div></div>`;

    // Inscriptions par jour (7 derniers jours)
    const byDay = {};
    for (let i=6; i>=0; i--) {
      const d = new Date(now - i*86400000);
      byDay[d.toLocaleDateString('fr-FR', {day:'2-digit',month:'2-digit'})] = 0;
    }
    users.forEach(u => {
      const d = u.createdAt?.toDate?.();
      if (d && d >= d7) {
        const key = d.toLocaleDateString('fr-FR', {day:'2-digit',month:'2-digit'});
        if (byDay[key] !== undefined) byDay[key]++;
      }
    });
    const maxVal = Math.max(...Object.values(byDay), 1);
    document.getElementById('analytics-signups').innerHTML = `
      <div style="display:flex;align-items:flex-end;gap:6px;height:100px;padding:0 4px">
        ${Object.entries(byDay).map(([day, count]) => `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
            <div style="font-size:10px;color:var(--text-muted)">${count||''}</div>
            <div style="width:100%;background:var(--accent);border-radius:3px 3px 0 0;
              height:${Math.max(count/maxVal*80, count>0?6:2)}px;min-height:2px;
              background:${count>0?'var(--accent)':'var(--border)'};
              transition:height .4s"></div>
            <div style="font-size:10px;color:var(--text-muted);white-space:nowrap">${day}</div>
          </div>`).join('')}
      </div>`;

    // Top users par jetons lifetime
    const topUsers = users.slice(0,50).map((u,i) => ({u, d:allData[i]}))
      .sort((a,b) => (b.d.lifetimeTokens||0) - (a.d.lifetimeTokens||0))
      .slice(0,8);
    document.getElementById('analytics-top-users').innerHTML = topUsers.length
      ? `<div style="display:flex;flex-direction:column;gap:4px">
        ${topUsers.map((item,i) => {
          const r = ROLES[item.u.role]||ROLES.utilisateur;
          return `<div style="display:flex;align-items:center;gap:10px;padding:6px;background:var(--bg-elevated);border-radius:8px">
            <div style="font-size:16px;width:24px;text-align:center;font-weight:700;color:${i===0?'#fbbf24':i===1?'#9ca3af':i===2?'#b45309':'var(--text-muted)'}">${i+1}</div>
            <div style="flex:1">
              <div style="font-size:13px;font-weight:600">${item.u.displayName||'—'}</div>
              <span class="user-role-badge ${r.css}" style="font-size:10px">${r.emoji} ${r.label}</span>
            </div>
            <div style="font-size:13px;font-weight:700;color:var(--gold)">🪙 ${(item.d.lifetimeTokens||0).toLocaleString('fr-FR')}</div>
          </div>`;
        }).join('')}
      </div>` : '<div style="color:var(--text-muted);padding:20px;text-align:center">Aucune donnée</div>';

    // Distribution rangs bar
    const rankCounts = {};
    users.forEach(u => { rankCounts[u.role||'utilisateur'] = (rankCounts[u.role||'utilisateur']||0)+1; });
    document.getElementById('analytics-ranks').innerHTML = Object.entries(ROLES).map(([k,r]) => {
      const count = rankCounts[k]||0;
      const pct = users.length ? Math.round(count/users.length*100) : 0;
      return `<div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:13px">
          <span class="user-role-badge ${r.css}">${r.emoji} ${r.label}</span>
          <span style="color:var(--text-muted)">${count} · ${pct}%</span>
        </div>
        <div style="height:6px;background:var(--bg-elevated);border-radius:3px">
          <div style="height:6px;border-radius:3px;width:${pct}%;background:var(--accent);transition:width .6s"></div>
        </div>
      </div>`;
    }).join('');

    // Méthodes de connexion
    const methodCounts = { google: 0, email: 0, unknown: 0 };
    users.forEach(u => {
      const lastHistory = u.loginHistory?.[0];
      if (lastHistory?.method === 'google.com') methodCounts.google++;
      else if (lastHistory?.method === 'password') methodCounts.email++;
      else methodCounts.unknown++;
    });
    document.getElementById('analytics-methods').innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px;padding:10px 0">
        ${[
          {label:'Google OAuth', count:methodCounts.google, color:'#4285F4', icon:'🔵'},
          {label:'Email/Mot de passe', count:methodCounts.email, color:'var(--accent)', icon:'📧'},
          {label:'Inconnu', count:methodCounts.unknown, color:'var(--text-muted)', icon:'❓'},
        ].map(m => {
          const pct = users.length ? Math.round(m.count/users.length*100) : 0;
          return `<div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:13px">
              <span>${m.icon} ${m.label}</span>
              <span style="color:var(--text-muted)">${m.count} · ${pct}%</span>
            </div>
            <div style="height:6px;background:var(--bg-elevated);border-radius:3px">
              <div style="height:6px;border-radius:3px;width:${pct}%;background:${m.color};transition:width .8s"></div>
            </div>
          </div>`;
        }).join('')}
      </div>`;
  } catch(e) {
    document.getElementById('analytics-stats').innerHTML = `<div style="color:var(--red)">Erreur: ${e.message}</div>`;
  }
}

