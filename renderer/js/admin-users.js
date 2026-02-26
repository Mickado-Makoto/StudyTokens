/* ================================================
   ADMIN-USERS.JS — Gestion utilisateurs & alertes
   ================================================ */
'use strict';

async function renderAdminUsers() {
  const panel = document.getElementById('cms-page-content');
  if (!panel) return;
  const level = getRoleLevel(fb.profile?.role);

  panel.innerHTML = `
  <div class="cms-page-header">
    <div class="cms-page-title"><div class="cms-page-title-icon">👥</div>Utilisateurs</div>
    <div class="cms-page-subtitle">Gestion de tous les comptes</div>
  </div>

  <div class="cms-stats-row" id="users-stats-row">
    <div class="cms-stat-box"><div class="cms-stat-icon purple">👥</div><div><div class="cms-stat-val" id="us-total">—</div><div class="cms-stat-lbl">Total</div></div></div>
    <div class="cms-stat-box"><div class="cms-stat-icon green">✅</div><div><div class="cms-stat-val" id="us-active">—</div><div class="cms-stat-lbl">Actifs (30j)</div></div></div>
    <div class="cms-stat-box"><div class="cms-stat-icon gold">⭐</div><div><div class="cms-stat-val" id="us-pro">—</div><div class="cms-stat-lbl">Pro+</div></div></div>
    <div class="cms-stat-box"><div class="cms-stat-icon red">🚫</div><div><div class="cms-stat-val" id="us-banned">—</div><div class="cms-stat-lbl">Bannis</div></div></div>
    <div class="cms-stat-box"><div class="cms-stat-icon teal">📅</div><div><div class="cms-stat-val" id="us-new">—</div><div class="cms-stat-lbl">Nouveaux (7j)</div></div></div>
  </div>

  <div class="cms-card">
    <div class="cms-card-header" style="flex-wrap:wrap;gap:8px">
      <div class="cms-card-title"><div class="cct-dot"></div>LISTE DES UTILISATEURS</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <input class="form-input" id="users-search" style="width:200px;padding:7px 12px;font-size:13px"
          placeholder="🔍 Nom ou email..." oninput="filterUsersTable(this.value)"/>
        <select class="form-input" id="users-filter-role" style="padding:7px 12px;font-size:13px" onchange="filterUsersTable(document.getElementById('users-search').value)">
          <option value="">Tous les rangs</option>
          ${Object.entries(ROLES).map(([k,r])=>`<option value="${k}">${r.emoji} ${r.label}</option>`).join('')}
        </select>
        <select class="form-input" id="users-filter-status" style="padding:7px 12px;font-size:13px" onchange="filterUsersTable(document.getElementById('users-search').value)">
          <option value="">Tous statuts</option>
          <option value="active">✅ Actifs</option>
          <option value="banned">🚫 Bannis</option>
        </select>
        <button class="btn btn-secondary btn-sm" onclick="renderAdminUsers()">🔄</button>
      </div>
    </div>
    <div style="overflow-x:auto">
      <table class="users-table" id="users-table">
        <thead><tr>
          <th>Utilisateur</th><th>Email</th><th>Rang</th>
          <th>Connexions</th><th>Dernière co.</th><th>Inscrit</th><th>Statut</th>
          ${level >= 3 ? '<th>Actions</th>' : ''}
        </tr></thead>
        <tbody id="users-tbody"><tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-muted)"><span class="auth-spinner"></span> Chargement...</td></tr></tbody>
      </table>
    </div>
  </div>`;

  // Charger les utilisateurs
  try {
    const users = await fbGetAllUsers(200);
    const now = new Date();
    const d30 = new Date(now - 30*86400000);
    const d7  = new Date(now - 7*86400000);

    const active = users.filter(u => u.lastLogin?.toDate?.() >= d30).length;
    const pro    = users.filter(u => getRoleLevel(u.role) >= 1).length;
    const banned = users.filter(u => u.isBanned).length;
    const newU   = users.filter(u => u.createdAt?.toDate?.() >= d7).length;

    document.getElementById('us-total').textContent  = users.length;
    document.getElementById('us-active').textContent = active;
    document.getElementById('us-pro').textContent    = pro;
    document.getElementById('us-banned').textContent = banned;
    document.getElementById('us-new').textContent    = newU;

    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;
    tbody.innerHTML = users.map(u => {
      const role = ROLES[u.role] || ROLES.utilisateur;
      const created  = u.createdAt?.toDate?.() ? u.createdAt.toDate().toLocaleDateString('fr-FR') : '—';
      const lastLogin = u.lastLogin?.toDate?.() ? u.lastLogin.toDate().toLocaleDateString('fr-FR') : '—';
      const isBanned = u.isBanned;
      const banUntil = u.banUntil?.toDate?.() ? u.banUntil.toDate().toLocaleDateString('fr-FR') : null;
      const safeName = (u.displayName||'').replace(/'/g, "\\'").replace(/"/g, '&quot;');
      return `<tr data-name="${(u.displayName||'').toLowerCase()}"
                  data-email="${(u.email||'').toLowerCase()}"
                  data-role="${u.role||'utilisateur'}"
                  data-status="${isBanned?'banned':'active'}">
        <td><strong>${u.displayName||'—'}</strong></td>
        <td style="font-size:12px;color:var(--text-muted)">${u.email||'—'}</td>
        <td><span class="user-role-badge ${role.css}">${role.emoji} ${role.label}</span></td>
        <td style="font-size:12px">${u.loginCount||1}×</td>
        <td style="font-size:12px">${lastLogin}</td>
        <td style="font-size:12px">${created}</td>
        <td>${isBanned
          ? `<span style="color:var(--red);font-size:12px;font-weight:700">🚫 ${banUntil?`Jusqu'au ${banUntil}`:'Permanent'}</span>`
          : '<span style="color:#5ee7c4;font-size:12px">✅ Actif</span>'}</td>
        ${level >= 3 ? `<td><button class="btn btn-secondary btn-sm" onclick="openUserDetails('${u.id}','${safeName}','${u.role}','${isBanned}')">⚙️ Gérer</button></td>` : ''}
      </tr>`;
    }).join('') || '<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--text-muted)">Aucun utilisateur</td></tr>';

  } catch(e) {
    document.getElementById('users-tbody').innerHTML =
      `<tr><td colspan="8" style="color:var(--red);padding:20px">${e.message}</td></tr>`;
  }
}

function filterUsersTable(q) {
  const roleFilter   = document.getElementById('users-filter-role')?.value || '';
  const statusFilter = document.getElementById('users-filter-status')?.value || '';
  const search = q.toLowerCase();
  document.querySelectorAll('#users-tbody tr').forEach(r => {
    const matchSearch = !search || r.dataset.name?.includes(search) || r.dataset.email?.includes(search);
    const matchRole   = !roleFilter || r.dataset.role === roleFilter;
    const matchStatus = !statusFilter || r.dataset.status === statusFilter;
    r.style.display = matchSearch && matchRole && matchStatus ? '' : 'none';
  });
}

function openUserDetails(uid, name, currentRole, isBanned) {
  const myLevel = getRoleLevel(fb.profile?.role);
  const targetLevel = getRoleLevel(currentRole);

  // Un admin ne peut pas gérer quelqu'un de même niveau ou supérieur
  if (myLevel < 4 && targetLevel >= myLevel) {
    notify('🔒 Tu ne peux pas gérer un utilisateur de rang égal ou supérieur', 'error', 4000);
    return;
  }

  document.getElementById('user-detail-modal')?.remove();
  const modal = document.createElement('div');
  modal.className = 'modal-overlay'; modal.id = 'user-detail-modal';
  modal.style.zIndex = '6500'; // Au-dessus de l'admin-overlay (5000)

  // Rangs disponibles selon le niveau de l'admin
  const availableRoles = Object.entries(ROLES).filter(([k,r]) => {
    if (myLevel < 4 && r.level >= myLevel) return false; // Pas de promotion au même niveau ou supérieur
    return true;
  });

  modal.innerHTML = `
  <div class="modal" style="max-width:520px">
    <div class="modal-header">
      <div class="modal-title">⚙️ ${name || 'Utilisateur'}</div>
      <button class="modal-close" onclick="document.getElementById('user-detail-modal').remove()">✕</button>
    </div>
    <div style="font-size:11px;color:var(--text-muted);margin-bottom:14px;font-family:var(--font-mono);word-break:break-all">${uid}</div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group">
        <label class="form-label">🎭 Rang</label>
        <select class="form-input" id="user-role-select">
          ${availableRoles.map(([k,r])=>`<option value="${k}" ${k===currentRole?'selected':''}>${r.emoji} ${r.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">🚫 Durée de ban</label>
        <select class="form-input" id="ban-duration">
          <option value="1">1 jour</option><option value="3">3 jours</option>
          <option value="7" selected>7 jours</option><option value="30">30 jours</option>
          <option value="90">3 mois</option><option value="365">1 an</option>
          <option value="0">Permanent</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Raison du bannissement</label>
      <input type="text" class="form-input" id="ban-reason" placeholder="Ex: Comportement inapproprié, spam..."/>
    </div>

    <div class="confirm-actions" style="flex-wrap:wrap;gap:8px;margin-top:16px">
      <button class="btn btn-secondary" onclick="document.getElementById('user-detail-modal').remove()">Annuler</button>
      <button class="btn btn-primary" onclick="applyUserRole('${uid}')">💾 Changer le rang</button>
      ${isBanned==='true'
        ? `<button class="btn" style="background:rgba(94,231,196,.1);color:#5ee7c4;border:1px solid rgba(94,231,196,.3)" onclick="doUnbanUser('${uid}')">✅ Débannir</button>`
        : `<button class="btn" style="background:rgba(255,165,0,.1);color:#ffa500;border:1px solid rgba(255,165,0,.3)" onclick="doBanUser('${uid}')">🚫 Bannir</button>`}
      ${myLevel >= 4 ? `<button class="btn btn-danger" onclick="confirmDeleteUser('${uid}','${name}')">🗑 Supprimer</button>` : ''}
    </div>

    <div style="margin-top:18px">
      <div style="font-size:12px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">📋 Historique connexions</div>
      <button class="btn btn-secondary btn-sm" onclick="loadLoginHistory('${uid}')">Charger</button>
      <div id="login-history-${uid}" style="margin-top:8px"></div>
    </div>
  </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e=>{if(e.target===modal)modal.remove()});
}

async function loadLoginHistory(uid) {
  const el = document.getElementById(`login-history-${uid}`);
  if (!el) return;
  try {
    const snap = await fb.db.collection('users').doc(uid).get();
    const history = snap.data()?.loginHistory || [];
    if (!history.length) { el.textContent = 'Aucun historique'; return; }
    el.innerHTML = `<div style="display:flex;flex-direction:column;gap:4px;max-height:160px;overflow-y:auto">
      ${history.slice(0,20).map(h=>`
        <div style="display:flex;justify-content:space-between;padding:5px 10px;background:var(--bg-elevated);border-radius:6px;font-size:11px">
          <span>${new Date(h.date).toLocaleString('fr-FR')}</span>
          <span style="color:var(--text-muted)">${h.method||'email'} · ${h.device?.split('/')[0]||'—'}</span>
        </div>`).join('')}
    </div>`;
  } catch(e) { el.textContent = 'Erreur: '+e.message; }
}

async function applyUserRole(uid) {
  const role = document.getElementById('user-role-select')?.value;
  if (!role) return;
  const myLevel = getRoleLevel(fb.profile?.role);
  const newLevel = getRoleLevel(role);
  if (myLevel < 4 && newLevel >= myLevel) {
    notify('🔒 Tu ne peux pas attribuer un rang égal ou supérieur au tien', 'error', 4000); return;
  }
  try {
    await fbSetUserRole(uid, role);
    document.getElementById('user-detail-modal')?.remove();
    SFX.levelUp();
    notify(`Rang modifié → ${ROLES[role].label}`, 'success', { title: '🎭 Rang mis à jour' });
    renderAdminUsers();
  } catch(e) { notify('Erreur : '+e.message, 'error'); }
}

async function doBanUser(uid) {
  const duration = parseInt(document.getElementById('ban-duration')?.value || '7');
  const reason = document.getElementById('ban-reason')?.value?.trim() || 'Non spécifiée';
  try {
    await fbBanUser(uid, duration, reason);
    document.getElementById('user-detail-modal')?.remove();
    SFX.ban();
    notify(duration>0?`Ban de ${duration} jour(s) appliqué`:'Ban permanent', 'warning', { title: '🚫 Utilisateur banni', detail: reason||undefined });
    renderAdminUsers();
  } catch(e) { notify('Erreur : '+e.message, 'error'); }
}

async function doUnbanUser(uid) {
  try {
    await fbUnbanUser(uid);
    document.getElementById('user-detail-modal')?.remove();
    SFX.success();
    notify("L'accès a été rétabli", 'success', { title: '✅ Débannissement' });
    renderAdminUsers();
  } catch(e) { notify('Erreur : '+e.message, 'error'); }
}

async function confirmDeleteUser(uid, name) {
  document.getElementById('user-detail-modal')?.remove();
  const modal = document.createElement('div'); modal.className='modal-overlay';
  modal.style.zIndex = '6500';
  modal.innerHTML = `<div class="modal" style="max-width:380px">
    <div class="modal-header"><div class="modal-title">⚠️ Supprimer le compte</div></div>
    <p class="confirm-text">Supprimer définitivement <strong>${name}</strong> ? Irréversible.</p>
    <div class="confirm-actions">
      <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Annuler</button>
      <button class="btn btn-danger" onclick="doDeleteUser('${uid}',this.closest('.modal-overlay'))">🗑 Supprimer</button>
    </div></div>`;
  document.body.appendChild(modal);
}

async function doDeleteUser(uid, modalEl) {
  try {
    await fbDeleteUserAccount(uid);
    modalEl?.remove();
    SFX.delete();
    notify('Toutes les données ont été effacées.', 'warning', { title: '🗑 Compte supprimé' });
    renderAdminUsers();
  } catch(e) { notify('Erreur : '+e.message, 'error'); }
}

// ══════════════════════════════════════════════
//  ALERTES
// ══════════════════════════════════════════════
async function renderAdminAlerts() {
  const panel = document.getElementById('cms-page-content');
  if (!panel) return;
  panel.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)"><span class="auth-spinner"></span></div>`;
  try {
    const alerts = await fbGetSecurityAlerts(100);
    const unseen = alerts.filter(a=>!a.seen).length;
    const typeLabel = {
      admin_brute_force:{ icon:'🔓', label:'Brute force admin',   color:'var(--red)' },
      role_change:      { icon:'🎭', label:'Changement de rang',  color:'var(--accent)' },
      user_banned:      { icon:'🚫', label:'Bannissement',        color:'#ffa500' },
      account_deleted:  { icon:'🗑', label:'Suppression compte',  color:'var(--red)' },
    };
    panel.innerHTML = `
    <div class="cms-page-header">
      <div class="cms-page-title"><div class="cms-page-title-icon">🚨</div>Alertes de sécurité
        ${unseen>0?`<span style="background:var(--red);color:#fff;font-size:11px;padding:2px 8px;border-radius:20px;margin-left:8px">${unseen} nouvelles</span>`:''}
      </div>
      <button class="btn btn-secondary btn-sm" onclick="markAllAlertsSeen()">Tout marquer lu</button>
    </div>
    <div class="cms-card">
      ${alerts.length===0
        ? '<div style="color:var(--text-muted);text-align:center;padding:40px">Aucune alerte 🎉</div>'
        : `<div style="display:flex;flex-direction:column;gap:6px">
          ${alerts.map(a => {
            const t = typeLabel[a.type]||{icon:'📌',label:a.type,color:'var(--text-muted)'};
            const d = a.createdAt?.toDate?.() ? a.createdAt.toDate().toLocaleString('fr-FR') : '—';
            const detail = a.data ? Object.entries(a.data).map(([k,v])=>`<b>${k}:</b> ${v}`).join(' · ') : '';
            return `<div class="alert-row ${a.seen?'seen':''}" style="${!a.seen?'border-left:3px solid '+t.color:''}"
              onclick="markAlertSeen('${a.id}',this)">
              <div style="display:flex;gap:10px;align-items:center">
                <span style="font-size:20px">${t.icon}</span>
                <div>
                  <div style="font-size:13px;font-weight:600;color:${t.color}">${t.label}</div>
                  <div style="font-size:11px;color:var(--text-muted)">${detail}</div>
                </div>
              </div>
              <div style="font-size:11px;color:var(--text-muted);white-space:nowrap;display:flex;align-items:center;gap:6px">
                ${d} ${!a.seen?'<span class="alert-dot"></span>':''}
              </div>
            </div>`;
          }).join('')}
        </div>`}
    </div>`;
  } catch(e) {
    panel.innerHTML = `<div style="color:var(--red);padding:20px">Erreur: ${e.message}</div>`;
  }
}

async function markAlertSeen(id, el) {
  await fbMarkAlertSeen(id);
  el?.classList.add('seen');
  el?.querySelector('.alert-dot')?.remove();
  el?.style.removeProperty('border-left');
}

async function markAllAlertsSeen() {
  try {
    const alerts = await fbGetSecurityAlerts(100);
    await Promise.all(alerts.filter(a=>!a.seen).map(a=>fbMarkAlertSeen(a.id)));
    renderAdminAlerts();
  } catch(e) { notify('Erreur : '+e.message, 'error'); }
}



// ══════════════════════════════════════════════
//  TICKETS SUPPORT
// ══════════════════════════════════════════════
async function renderAdminTickets() {
  const page = document.getElementById('cms-page-content');
  if (!page) return;
  page.innerHTML = `
  <div class="cms-page-header">
    <div class="cms-page-title"><div class="cms-page-title-icon">🎫</div>Tickets support</div>
    <div class="cms-page-subtitle">Rapports d'erreurs et demandes utilisateurs</div>
  </div>
  <div id="tickets-content">
    <div style="text-align:center;padding:40px;color:var(--text-muted)">Chargement...</div>
  </div>`;

  try {
    if (!fb.db) throw new Error('Firebase non disponible');
    const snap = await fb.db.collection('supportTickets')
      .orderBy('createdAt','desc').limit(50).get();

    const tickets = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const unread = tickets.filter(t => !t.read).length;
    const tc = document.getElementById('tickets-content');
    if (!tc) return;

    if (tickets.length === 0) {
      tc.innerHTML = `<div class="cms-card" style="text-align:center;padding:48px">
        <div style="font-size:40px;margin-bottom:12px">🎉</div>
        <div style="font-size:16px;font-weight:700;margin-bottom:6px">Aucun ticket !</div>
        <div style="font-size:13px;color:var(--text-muted)">Les utilisateurs n'ont signalé aucun problème.</div>
      </div>`;
      return;
    }

    tc.innerHTML = `
    <div class="cms-stats-row" style="margin-bottom:14px">
      <div class="cms-stat-box">
        <div class="cms-stat-icon red">🎫</div>
        <div><div class="cms-stat-val">${tickets.length}</div><div class="cms-stat-lbl">Total</div></div>
      </div>
      <div class="cms-stat-box">
        <div class="cms-stat-icon gold">🔴</div>
        <div><div class="cms-stat-val">${unread}</div><div class="cms-stat-lbl">Non lus</div></div>
      </div>
      <div class="cms-stat-box">
        <div class="cms-stat-icon green">✅</div>
        <div><div class="cms-stat-val">${tickets.filter(t=>t.status==='resolved').length}</div><div class="cms-stat-lbl">Résolus</div></div>
      </div>
    </div>

    <div class="cms-card" style="padding:0;overflow:hidden">
      ${tickets.map(t => {
        const date = t.createdAt?.toDate ? t.createdAt.toDate().toLocaleString('fr-FR') : (t.submittedAt || '?');
        const statusColor = t.status==='resolved' ? '#5ee7c4' : t.status==='open' ? '#f87171' : '#facc15';
        const statusLabel = t.status==='resolved' ? 'Résolu' : t.status==='in_progress' ? 'En cours' : 'Ouvert';
        return `
        <div class="ticket-row ${!t.read?'ticket-unread':''}" onclick="openTicketDetail('${t.id}')">
          <div class="ticket-dot" style="background:${statusColor}"></div>
          <div class="ticket-info">
            <div class="ticket-user">${t.user || 'Anonyme'}
              ${!t.read ? '<span class="ticket-new-badge">NOUVEAU</span>' : ''}
              ${t.hasScreenshot ? '<span style="font-size:11px;margin-left:6px">📷</span>' : ''}
            </div>
            <div class="ticket-preview">${(t.description||'').substring(0,100)}${t.description?.length>100?'…':''}</div>
            <div class="ticket-meta">${t.errCode || '—'} · v${t.version||'?'} · ${date}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;flex-shrink:0">
            <span style="font-size:11px;font-weight:700;color:${statusColor};border:1px solid ${statusColor}40;padding:2px 8px;border-radius:20px">${statusLabel}</span>
            <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();resolveTicket('${t.id}',this)">✅ Résoudre</button>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  } catch(e) {
    const tc = document.getElementById('tickets-content');
    if (tc) tc.innerHTML = `<div class="cms-card" style="color:var(--red);padding:20px">Erreur: ${e.message}</div>`;
  }
}

async function openTicketDetail(ticketId) {
  // Mark as read
  try {
    if (fb.db) await fb.db.collection('supportTickets').doc(ticketId).update({ read: true });
    const row = document.querySelector(`[onclick="openTicketDetail('${ticketId}')"]`);
    row?.classList.remove('ticket-unread');
    row?.querySelector('.ticket-new-badge')?.remove();
  } catch(e) {}
}

async function resolveTicket(ticketId, btn) {
  try {
    if (fb.db) await fb.db.collection('supportTickets').doc(ticketId).update({
      status: 'resolved', resolvedAt: new Date(), resolvedBy: fb.user?.email
    });
    SFX.success?.();
    notify('Ticket marqué comme résolu', 'success');
    renderAdminTickets();
  } catch(e) { notify('Erreur: '+e.message, 'error'); }
}
