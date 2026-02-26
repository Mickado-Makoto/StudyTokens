/* ================================================
   ADMIN-CONTENT.JS — Contenu: mini-jeux, annonces,
   multiplicateur, boutique, changelog
   ================================================ */
'use strict';

// ══════════════════════════════════════════════
//  MINI-JEUX
// ══════════════════════════════════════════════
function renderAdminMinigames() {
  return `
  <div class="cms-page-header">
    <div class="cms-page-title"><div class="cms-page-title-icon">🎮</div>Mini-jeux</div>
    <div class="cms-page-subtitle">Configuration des jeux de révision — À venir dans une prochaine version</div>
  </div>

  <div class="cms-stats-row">
    <div class="cms-stat-box">
      <div class="cms-stat-icon purple">🃏</div>
      <div><div class="cms-stat-val">0</div><div class="cms-stat-lbl">Jeux actifs</div></div>
    </div>
    <div class="cms-stat-box">
      <div class="cms-stat-icon teal">🔓</div>
      <div><div class="cms-stat-val">0</div><div class="cms-stat-lbl">Jeux gratuits</div></div>
    </div>
    <div class="cms-stat-box">
      <div class="cms-stat-icon gold">⭐</div>
      <div><div class="cms-stat-val">0</div><div class="cms-stat-lbl">Jeux Pro</div></div>
    </div>
    <div class="cms-stat-box">
      <div class="cms-stat-icon green">🎯</div>
      <div><div class="cms-stat-val">0</div><div class="cms-stat-lbl">Parties jouées</div></div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">

    <!-- Jeux disponibles -->
    <div class="cms-card">
      <div class="cms-card-header">
        <div class="cms-card-title"><div class="cct-dot"></div>JEUX PLANIFIÉS</div>
      </div>
      ${[
        { icon:'🃏', name:'Flashcards', desc:'Cartes questions/réponses', status:'planned', tier:'gratuit' },
        { icon:'🧩', name:'Quiz rapide', desc:'QCM chrono', status:'planned', tier:'gratuit' },
        { icon:'🔤', name:'Épellation', desc:'Dictée de mots', status:'planned', tier:'pro' },
        { icon:'🗺️', name:'Carte mentale', desc:'Association de concepts', status:'planned', tier:'pro' },
        { icon:'⚔️', name:'Duel de révision', desc:'Multijoueur temps réel', status:'planned', tier:'pro' },
        { icon:'📊', name:'Graphes interactifs', desc:'Visualisation de données', status:'planned', tier:'pro' },
      ].map(g => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
          <div style="display:flex;gap:10px;align-items:center">
            <span style="font-size:20px">${g.icon}</span>
            <div>
              <div style="font-size:13px;font-weight:600">${g.name}</div>
              <div style="font-size:11px;color:var(--text-muted)">${g.desc}</div>
            </div>
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            <span style="font-size:11px;padding:2px 8px;border-radius:20px;background:${g.tier==='pro'?'rgba(250,204,21,.12)':'rgba(94,231,196,.12)'};color:${g.tier==='pro'?'#facc15':'#5ee7c4'}">${g.tier==='pro'?'⭐ Pro':'🔓 Gratuit'}</span>
            <span style="font-size:11px;padding:2px 8px;border-radius:20px;background:rgba(255,255,255,.06);color:var(--text-muted)">Planifié</span>
          </div>
        </div>`).join('')}
    </div>

    <!-- Configuration globale -->
    <div class="cms-card">
      <div class="cms-card-header">
        <div class="cms-card-title"><div class="cct-dot"></div>CONFIGURATION GLOBALE</div>
      </div>
      <div class="form-group">
        <label class="form-label">Limite parties/jour (gratuit)</label>
        <div style="display:flex;gap:8px">
          <input type="number" class="form-input" id="mg-free-limit" value="10" min="0" max="100"/>
          <span style="font-size:12px;color:var(--text-muted);align-self:center">parties</span>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Limite parties/jour (Pro)</label>
        <div style="display:flex;gap:8px">
          <input type="number" class="form-input" id="mg-pro-limit" value="0" min="0"/>
          <span style="font-size:12px;color:var(--text-muted);align-self:center">0 = illimité</span>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Récompense en jetons par victoire</label>
        <input type="number" class="form-input" id="mg-reward" value="1" min="0" max="10"/>
      </div>
      <div class="form-group">
        <label class="form-label" style="display:flex;align-items:center;gap:10px;cursor:pointer">
          <input type="checkbox" id="mg-enabled" checked/>
          <span>Activer les mini-jeux</span>
        </label>
        <label class="form-label" style="display:flex;align-items:center;gap:10px;cursor:pointer;margin-top:8px">
          <input type="checkbox" id="mg-leaderboard"/>
          <span>Classement global activé</span>
        </label>
      </div>
      <button class="btn btn-primary" style="width:100%;margin-top:8px" onclick="saveMiniGamesConfig()">💾 Sauvegarder la configuration</button>
      <div style="margin-top:12px;padding:10px;background:rgba(123,159,255,.06);border:1px solid rgba(123,159,255,.15);border-radius:8px;font-size:12px;color:var(--text-muted)">
        ℹ️ Les mini-jeux seront disponibles dans une prochaine mise à jour. La configuration est sauvegardée maintenant pour être prête.
      </div>
    </div>
  </div>`;
}

async function saveMiniGamesConfig() {
  const config = {
    enabled:      document.getElementById('mg-enabled')?.checked ?? true,
    leaderboard:  document.getElementById('mg-leaderboard')?.checked ?? false,
    freeLimit:    parseInt(document.getElementById('mg-free-limit')?.value || '10'),
    proLimit:     parseInt(document.getElementById('mg-pro-limit')?.value || '0'),
    tokenReward:  parseInt(document.getElementById('mg-reward')?.value || '1'),
    updatedAt:    new Date().toISOString(),
    updatedBy:    fb.user?.email,
  };
  try {
    if (fb.ready) {
      await fb.db.collection('appConfig').doc('minigames').set(config, { merge: true });
    }
    notify('✅ Configuration mini-jeux sauvegardée', 'success');
  } catch(e) { notify('Erreur : '+e.message, 'error'); }
}

// ══════════════════════════════════════════════
// ══════════════════════════════════════════════
//  ANNONCES
// ══════════════════════════════════════════════
async function renderAdminAnnounce() {
  const panel = document.getElementById('cms-page-content');
  if (!panel) return;

  const remote = adminState.remoteData;
  const ann = remote?.announcement || {};

  panel.innerHTML = `
  <div class="cms-page-header">
    <div class="cms-page-title"><div class="cms-page-title-icon">📣</div>Annonces</div>
    <div class="cms-page-subtitle">Messages diffusés à tous les utilisateurs au démarrage</div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
    <div class="cms-card">
      <div class="cms-card-header"><div class="cms-card-title"><div class="cct-dot ${ann.active?'green':''}"></div>ANNONCE ACTIVE</div></div>
      <div style="padding:12px;background:var(--bg-elevated);border-radius:10px;margin-bottom:16px;border:1px solid var(--border)">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">Statut actuel :</div>
        ${ann.active
          ? `<div style="color:#5ee7c4;font-weight:700">✅ Active — "${ann.title||'Sans titre'}"</div>
             <div style="font-size:12px;color:var(--text-muted);margin-top:4px">${ann.message||''}</div>`
          : `<div style="color:var(--text-muted)">— Aucune annonce active</div>`}
      </div>
      <div class="form-group">
        <label class="form-label">Type</label>
        <select class="form-input" id="ann-type">
          <option value="info">ℹ️ Info</option>
          <option value="success">✅ Succès</option>
          <option value="warning">⚠️ Avertissement</option>
          <option value="error">🔴 Urgent</option>
          <option value="event">🎉 Événement</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Titre</label>
        <input type="text" class="form-input" id="ann-title" placeholder="Titre de l'annonce" value="${ann.title||''}"/>
      </div>
      <div class="form-group">
        <label class="form-label">Message</label>
        <textarea class="form-input" id="ann-message" rows="3" placeholder="Message...">${ann.message||''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label" style="display:flex;align-items:center;gap:10px;cursor:pointer">
          <input type="checkbox" id="ann-active" ${ann.active?'checked':''}/>
          <span>Activer l'annonce</span>
        </label>
      </div>
      <button class="btn btn-primary" style="width:100%" onclick="saveAnnounce()">📣 Publier l'annonce</button>
      ${ann.active ? `<button class="btn btn-secondary btn-sm" style="width:100%;margin-top:8px" onclick="clearAnnounce()">🗑 Désactiver l'annonce</button>` : ''}
    </div>
    <div class="cms-card">
      <div class="cms-card-header"><div class="cms-card-title"><div class="cct-dot"></div>APERÇU</div></div>
      <div id="ann-preview" style="padding:16px;background:var(--bg-elevated);border-radius:12px;border:1px solid rgba(123,159,255,.15)">
        <div style="font-size:12px;color:var(--text-muted);text-align:center">L'aperçu s'affichera ici</div>
      </div>
      <div style="margin-top:14px;font-size:12px;color:var(--text-muted);line-height:1.6">
        <div style="font-weight:700;color:var(--text-secondary);margin-bottom:6px">💡 Bonnes pratiques</div>
        · Titre court et percutant (< 50 caractères)<br>
        · Message clair et informatif (< 200 caractères)<br>
        · Utilise "Urgent" uniquement pour des infos critiques<br>
        · Désactive l'annonce dès qu'elle n'est plus pertinente
      </div>
    </div>
  </div>`;

  // Live preview
  const titleEl = document.getElementById('ann-title');
  const msgEl = document.getElementById('ann-message');
  const typeEl = document.getElementById('ann-type');
  const updatePreview = () => {
    const preview = document.getElementById('ann-preview');
    if (!preview) return;
    const t = typeEl?.value || 'info';
    const colors = {info:'#7b9fff',success:'#5ee7c4',warning:'#fbbf24',error:'#f87171',event:'#c084fc'};
    const icons = {info:'ℹ️',success:'✅',warning:'⚠️',error:'🚨',event:'🎉'};
    preview.innerHTML = `
      <div style="border-left:3px solid ${colors[t]};padding:10px 14px;border-radius:0 8px 8px 0;background:${colors[t]}15">
        <div style="font-size:14px;font-weight:700;color:${colors[t]};margin-bottom:4px">${icons[t]} ${titleEl?.value||'Titre'}</div>
        <div style="font-size:13px;color:var(--text-secondary)">${msgEl?.value||'Message de l\'annonce'}</div>
      </div>`;
  };
  titleEl?.addEventListener('input', updatePreview);
  msgEl?.addEventListener('input', updatePreview);
  typeEl?.addEventListener('change', updatePreview);
  updatePreview();
}

async function saveAnnounce() {
  const announcement = {
    active:  document.getElementById('ann-active')?.checked || false,
    type:    document.getElementById('ann-type')?.value || 'info',
    title:   document.getElementById('ann-title')?.value?.trim() || '',
    message: document.getElementById('ann-message')?.value?.trim() || '',
    publishedAt: new Date().toISOString(),
    publishedBy: fb.profile?.displayName || fb.user?.email,
  };
  if (announcement.active && !announcement.title) {
    notify('Ajoute un titre à l\'annonce', 'error'); return;
  }
  try {
    // Sauvegarder sur Firebase
    await fb.db.collection('appConfig').doc('announcement').set(announcement);
    // Mettre à jour l'état local
    if (!adminState.remoteData) adminState.remoteData = {};
    adminState.remoteData.announcement = announcement;
    SFX.notify();
    notify('Annonce publiée et active pour tous les utilisateurs.', 'success', { title: '📣 Annonce diffusée' });
    await fbLogSecurityAlert('announcement_published', { by: fb.user?.email, title: announcement.title, active: announcement.active });
  } catch(e) { notify('Erreur : '+e.message, 'error'); }
}

async function clearAnnounce() {
  try {
    await fb.db.collection('appConfig').doc('announcement').set({ active: false });
    if (adminState.remoteData) adminState.remoteData.announcement = { active: false };
    notify('🗑 Annonce désactivée', 'teal');
    renderAdminAnnounce();
  } catch(e) { notify('Erreur : '+e.message, 'error'); }
}

// ══════════════════════════════════════════════
//  MULTIPLICATEUR
// ══════════════════════════════════════════════
async function renderAdminMultiplier() {
  const panel = document.getElementById('cms-page-content');
  if (!panel) return;
  const mult = adminState.remoteData?.multiplier || {};

  panel.innerHTML = `
  <div class="cms-page-header">
    <div class="cms-page-title"><div class="cms-page-title-icon">✨</div>Multiplicateur de jetons</div>
    <div class="cms-page-subtitle">Booste temporairement les gains de jetons pour tous les utilisateurs</div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
    <div class="cms-card">
      <div class="cms-card-header">
        <div class="cms-card-title"><div class="cct-dot ${mult.active?'green':''}"></div>STATUT ACTUEL</div>
      </div>
      ${mult.active ? `
        <div style="text-align:center;padding:20px;background:rgba(251,191,36,.07);border:1px solid rgba(251,191,36,.2);border-radius:12px;margin-bottom:16px">
          <div style="font-size:42px;margin-bottom:8px">✨</div>
          <div style="font-size:26px;font-weight:800;color:#fbbf24">× ${mult.factor}</div>
          <div style="font-size:14px;color:var(--text-secondary);margin-top:4px">${mult.label||'Multiplicateur actif'}</div>
          ${mult.until ? `<div style="font-size:12px;color:var(--text-muted);margin-top:6px">Jusqu'au ${new Date(mult.until).toLocaleDateString('fr-FR')}</div>` : ''}
        </div>
        <button class="btn btn-secondary" style="width:100%;margin-bottom:12px" onclick="clearMultiplier()">⏹ Désactiver le multiplicateur</button>
      ` : `
        <div style="text-align:center;padding:20px;color:var(--text-muted);margin-bottom:16px">— Aucun multiplicateur actif</div>
      `}
      <div class="form-group">
        <label class="form-label">Facteur de multiplication</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${[1.5, 2, 3, 5, 10].map(f => `
            <button class="btn btn-secondary" onclick="document.getElementById('mult-factor').value='${f}';document.getElementById('mult-factor').dispatchEvent(new Event('input'))"
              style="flex:1;min-width:52px;padding:8px">${f === Math.floor(f) ? f : f}×</button>`).join('')}
        </div>
        <input type="number" class="form-input" id="mult-factor" value="${mult.factor||2}" min="1.1" max="100" step="0.5" style="margin-top:8px"/>
      </div>
      <div class="form-group">
        <label class="form-label">Label affiché aux utilisateurs</label>
        <input type="text" class="form-input" id="mult-label" value="${mult.label||''}" placeholder="Ex: Week-end bonus, Soirée révision..."/>
      </div>
      <div class="form-group">
        <label class="form-label">Date de fin (optionnel)</label>
        <input type="datetime-local" class="form-input" id="mult-until" value="${mult.until?new Date(mult.until).toISOString().slice(0,16):''}"/>
      </div>
      <button class="btn btn-primary" style="width:100%;margin-top:4px" onclick="saveMultiplier()">✨ Activer le multiplicateur</button>
    </div>
    <div class="cms-card">
      <div class="cms-card-header"><div class="cms-card-title"><div class="cct-dot"></div>IMPACT ESTIMÉ</div></div>
      <div id="mult-preview" style="padding:14px"></div>
      <div style="margin-top:14px">
        <div class="cms-card-header"><div class="cms-card-title"><div class="cct-dot"></div>HISTORIQUE</div></div>
        <div id="mult-history" style="font-size:12px;color:var(--text-muted);padding:8px 0">Chargement...</div>
      </div>
    </div>
  </div>`;

  // Update preview on factor change
  const updateMultPreview = () => {
    const f = parseFloat(document.getElementById('mult-factor')?.value || 2);
    document.getElementById('mult-preview').innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px">
        ${[10, 15, 20, 30].map(mins => `
          <div style="display:flex;justify-content:space-between;padding:8px 12px;background:var(--bg-elevated);border-radius:8px">
            <span style="color:var(--text-muted)">${mins} min. d'étude</span>
            <div>
              <span style="text-decoration:line-through;color:var(--text-muted);font-size:11px;margin-right:6px">
                ${Math.floor(mins/10)} 🪙
              </span>
              <span style="color:#fbbf24;font-weight:700">${Math.floor(mins/10*f)} 🪙 ✨</span>
            </div>
          </div>`).join('')}
        <div style="font-size:12px;color:var(--text-muted);text-align:center;margin-top:4px">
          Basé sur 10 min = 1 jeton (paramètre par défaut)
        </div>
      </div>`;
  };
  document.getElementById('mult-factor')?.addEventListener('input', updateMultPreview);
  updateMultPreview();

  // Load history
  try {
    const snap = await fb.db.collection('appConfig').doc('multiplierHistory').get().catch(()=>null);
    const history = snap?.data()?.history || [];
    document.getElementById('mult-history').innerHTML = history.length
      ? history.slice(0,5).map(h => `
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px">
          <span>×${h.factor} — ${h.label||'Sans label'}</span>
          <span style="color:var(--text-muted)">${h.activatedAt ? new Date(h.activatedAt).toLocaleDateString('fr-FR') : '—'}</span>
        </div>`).join('')
      : 'Aucun historique';
  } catch(e) {}
}

async function saveMultiplier() {
  const factor = parseFloat(document.getElementById('mult-factor')?.value || 2);
  const label  = document.getElementById('mult-label')?.value?.trim() || '';
  const until  = document.getElementById('mult-until')?.value;
  if (factor < 1) { notify('Facteur minimum : 1', 'error'); return; }
  const mult = { active: true, factor, label, until: until||null, activatedAt: new Date().toISOString(), activatedBy: fb.user?.email };
  try {
    await fb.db.collection('appConfig').doc('multiplier').set(mult);
    // Save to history
    const histRef = fb.db.collection('appConfig').doc('multiplierHistory');
    const histSnap = await histRef.get().catch(()=>null);
    const history = histSnap?.data()?.history || [];
    history.unshift(mult);
    await histRef.set({ history: history.slice(0, 20) });
    if (!adminState.remoteData) adminState.remoteData = {};
    adminState.remoteData.multiplier = mult;
    SFX.tokenEarned();
    notify(`Gains multipliés par ${factor} pour tous !`, 'reward', { title: `✨ ×${factor} activé` });
    renderAdminMultiplier();
  } catch(e) { notify('Erreur : '+e.message, 'error'); }
}

async function clearMultiplier() {
  try {
    await fb.db.collection('appConfig').doc('multiplier').set({ active: false });
    if (adminState.remoteData) adminState.remoteData.multiplier = { active: false };
    notify('⏹ Multiplicateur désactivé', 'teal');
    renderAdminMultiplier();
  } catch(e) { notify('Erreur : '+e.message, 'error'); }
}

// ══════════════════════════════════════════════
//  BOUTIQUE / RÉCOMPENSES
// ══════════════════════════════════════════════
async function renderAdminShop() {
  const panel = document.getElementById('cms-page-content');
  if (!panel) return;
  panel.innerHTML = `
  <div class="cms-page-header">
    <div class="cms-page-title"><div class="cms-page-title-icon">🏪</div>Boutique & Récompenses</div>
    <div class="cms-page-subtitle">Gère les récompenses disponibles dans la boutique</div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
    <div class="cms-card">
      <div class="cms-card-header">
        <div class="cms-card-title"><div class="cct-dot"></div>AJOUTER UNE RÉCOMPENSE</div>
      </div>
      <div class="form-group">
        <label class="form-label">Emoji / Icône</label>
        <input type="text" class="form-input" id="shop-emoji" placeholder="🎁" maxlength="4" style="width:80px"/>
      </div>
      <div class="form-group">
        <label class="form-label">Nom</label>
        <input type="text" class="form-input" id="shop-name" placeholder="Ex: Pause café 15min"/>
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <input type="text" class="form-input" id="shop-desc" placeholder="Courte description..."/>
      </div>
      <div class="form-group">
        <label class="form-label">Coût en jetons</label>
        <input type="number" class="form-input" id="shop-cost" value="10" min="1" max="9999"/>
      </div>
      <div class="form-group">
        <label class="form-label">Catégorie</label>
        <select class="form-input" id="shop-category">
          <option value="pause">☕ Pause</option>
          <option value="divertissement">🎮 Divertissement</option>
          <option value="nourriture">🍕 Nourriture</option>
          <option value="social">💬 Social</option>
          <option value="privilege">👑 Privilège</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" id="shop-pro-only"/>
          <span>Réservé aux utilisateurs Pro+</span>
        </label>
      </div>
      <button class="btn btn-primary" style="width:100%" onclick="addShopItem()">➕ Ajouter à la boutique</button>
    </div>
    <div class="cms-card">
      <div class="cms-card-header">
        <div class="cms-card-title"><div class="cct-dot"></div>RÉCOMPENSES EXISTANTES</div>
        <button class="btn btn-secondary btn-sm" onclick="renderAdminShop()">🔄</button>
      </div>
      <div id="shop-items-list">Chargement...</div>
    </div>
  </div>`;

  loadShopItems();
}

async function loadShopItems() {
  const el = document.getElementById('shop-items-list');
  if (!el) return;
  try {
    const snap = await fb.db.collection('appConfig').doc('shopItems').get();
    const items = snap.data()?.items || REWARDS || [];
    if (!items.length) { el.innerHTML = '<div style="color:var(--text-muted);padding:20px;text-align:center">Aucune récompense</div>'; return; }
    el.innerHTML = `<div style="display:flex;flex-direction:column;gap:6px;max-height:400px;overflow-y:auto">
      ${items.map((item, i) => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg-elevated);border-radius:8px;border:1px solid var(--border)">
          <span style="font-size:22px">${item.emoji||'🎁'}</span>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:600">${item.name}</div>
            <div style="font-size:11px;color:var(--text-muted)">${item.desc||''} ${item.proOnly?'<span style="color:#fbbf24">⭐ Pro</span>':''}</div>
          </div>
          <div style="font-size:13px;font-weight:700;color:var(--gold)">🪙 ${item.cost}</div>
          <button class="btn btn-secondary btn-sm" onclick="removeShopItem(${i})">🗑</button>
        </div>`).join('')}
    </div>`;
  } catch(e) { el.innerHTML = `<div style="color:var(--red)">Erreur: ${e.message}</div>`; }
}

async function addShopItem() {
  const item = {
    emoji:    document.getElementById('shop-emoji')?.value || '🎁',
    name:     document.getElementById('shop-name')?.value?.trim(),
    desc:     document.getElementById('shop-desc')?.value?.trim() || '',
    cost:     parseInt(document.getElementById('shop-cost')?.value || 10),
    category: document.getElementById('shop-category')?.value || 'pause',
    proOnly:  document.getElementById('shop-pro-only')?.checked || false,
    addedAt:  new Date().toISOString(), addedBy: fb.user?.email,
  };
  if (!item.name) { notify('Donne un nom à la récompense', 'error'); return; }
  try {
    const ref = fb.db.collection('appConfig').doc('shopItems');
    const snap = await ref.get();
    const items = snap.data()?.items || [];
    items.push(item);
    await ref.set({ items });
    SFX.shopBuy();
    notify(`✅ "${item.name}" ajouté à la boutique`, 'success');
    loadShopItems();
  } catch(e) { notify('Erreur : '+e.message, 'error'); }
}

async function removeShopItem(index) {
  try {
    const ref = fb.db.collection('appConfig').doc('shopItems');
    const snap = await ref.get();
    const items = snap.data()?.items || [];
    items.splice(index, 1);
    await ref.set({ items });
    notify('🗑 Récompense supprimée', 'teal');
    loadShopItems();
  } catch(e) { notify('Erreur : '+e.message, 'error'); }
}

// ══════════════════════════════════════════════
//  CHANGELOG
// ══════════════════════════════════════════════
async function renderAdminChangelog() {
  const panel = document.getElementById('cms-page-content');
  if (!panel) return;

  panel.innerHTML = `
  <div class="cms-page-header">
    <div class="cms-page-title"><div class="cms-page-title-icon">📝</div>Changelog</div>
    <div class="cms-page-subtitle">Notes de version distribuées aux utilisateurs</div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
    <div class="cms-card">
      <div class="cms-card-header"><div class="cms-card-title"><div class="cct-dot"></div>CRÉER UNE ENTRÉE</div></div>
      <div class="form-group">
        <label class="form-label">Version</label>
        <input type="text" class="form-input" id="cl-version" value="${APP_VERSION}" placeholder="1.3.0"/>
      </div>
      <div class="form-group">
        <label class="form-label">Entrées (une par ligne)</label>
        <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap">
          ${['✨ Nouveauté','🐛 Correctif','⚡ Amélioration','🗑 Suppression','🔒 Sécurité'].map(p =>
            `<button class="btn btn-secondary btn-sm" onclick="addChangelogPrefix('${p}')">${p}</button>`
          ).join('')}
        </div>
        <textarea class="form-input" id="cl-entries" rows="6"
          placeholder="✨ Nouveau système d'authentification Google&#10;🐛 Correction du bug de chargement&#10;⚡ Interface améliorée"></textarea>
      </div>
      <button class="btn btn-primary" style="width:100%" onclick="saveChangelog()">📝 Sauvegarder le changelog</button>
    </div>
    <div class="cms-card">
      <div class="cms-card-header"><div class="cms-card-title"><div class="cct-dot"></div>VERSIONS PRÉCÉDENTES</div></div>
      <div id="changelog-history" style="max-height:400px;overflow-y:auto">Chargement...</div>
    </div>
  </div>`;

  try {
    const snap = await fb.db.collection('appConfig').doc('changelog').get();
    const versions = snap.data()?.versions || [];
    document.getElementById('changelog-history').innerHTML = versions.length
      ? versions.map(v => `
          <div style="padding:12px 0;border-bottom:1px solid var(--border)">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px">
              <span style="font-size:14px;font-weight:700;color:var(--accent)">v${v.version}</span>
              <span style="font-size:11px;color:var(--text-muted)">${v.publishedAt?new Date(v.publishedAt).toLocaleDateString('fr-FR'):'—'}</span>
            </div>
            ${(v.entries||[]).map(e=>`<div style="font-size:12px;color:var(--text-secondary);padding:2px 0">${e}</div>`).join('')}
          </div>`).join('')
      : '<div style="color:var(--text-muted);text-align:center;padding:20px">Aucun historique</div>';
  } catch(e) {}
}

function addChangelogPrefix(prefix) {
  const ta = document.getElementById('cl-entries');
  if (!ta) return;
  const lines = ta.value ? ta.value.split('\n') : [];
  lines.push(prefix + ' ');
  ta.value = lines.join('\n');
  ta.focus();
  ta.setSelectionRange(ta.value.length, ta.value.length);
}

async function saveChangelog() {
  const version = document.getElementById('cl-version')?.value?.trim();
  const raw = document.getElementById('cl-entries')?.value?.trim();
  if (!version || !raw) { notify('Version et entrées requises', 'error'); return; }
  const entries = raw.split('\n').map(s=>s.trim()).filter(Boolean);
  try {
    const ref = fb.db.collection('appConfig').doc('changelog');
    const snap = await ref.get();
    const versions = snap.data()?.versions || [];
    const newEntry = { version, entries, publishedAt: new Date().toISOString(), publishedBy: fb.user?.email };
    const existing = versions.findIndex(v => v.version === version);
    if (existing >= 0) versions[existing] = newEntry; else versions.unshift(newEntry);
    await ref.set({ versions: versions.slice(0, 30) });
    notify(`📝 Changelog v${version} sauvegardé`, 'success');
    renderAdminChangelog();
  } catch(e) { notify('Erreur : '+e.message, 'error'); }
}

// ══════════════════════════════════════════════
