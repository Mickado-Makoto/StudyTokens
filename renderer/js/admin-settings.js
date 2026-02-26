/* ================================================
   ADMIN-SETTINGS.JS — Paramètres, déploiement,
   permissions
   ================================================ */
'use strict';

// ══════════════════════════════════════════════
function renderAdminSettings() {
  if (getRoleLevel(fb.profile?.role) < 4) {
    return `<div style="padding:60px;text-align:center;color:var(--text-muted)">
      🔒 Accès réservé au Fondateur</div>`;
  }
  return `
  <div class="cms-page-header">
    <div class="cms-page-title"><div class="cms-page-title-icon">⚙️</div>Paramètres de l'application</div>
    <div class="cms-page-subtitle">Configuration globale — Fondateur uniquement</div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">

    <!-- Identité -->
    <div class="cms-card">
      <div class="cms-card-header"><div class="cms-card-title"><div class="cct-dot"></div>IDENTITÉ DE L'APP</div></div>
      <div class="form-group">
        <label class="form-label">Nom de l'application</label>
        <input type="text" class="form-input" id="cfg-appname" value="StudyTokens"/>
      </div>
      <div class="form-group">
        <label class="form-label">Slogan</label>
        <input type="text" class="form-input" id="cfg-slogan" value="L'application de motivation pour les études"/>
      </div>
      <div class="form-group">
        <label class="form-label">Email de support</label>
        <input type="email" class="form-input" id="cfg-support-email" value="${FONDATEUR_EMAIL}"/>
      </div>
      <button class="btn btn-primary" style="width:100%" onclick="saveAppIdentity()">💾 Sauvegarder</button>
    </div>

    <!-- Mot de passe admin -->
    <div class="cms-card">
      <div class="cms-card-header"><div class="cms-card-title"><div class="cct-dot red"></div>MOT DE PASSE ADMIN</div></div>
      <div class="form-group">
        <label class="form-label">Nouveau mot de passe</label>
        <div class="auth-input-wrap">
          <input type="password" class="form-input" id="new-password" placeholder="••••••••"/>
          <button class="auth-eye" onclick="togglePasswordVis('new-password',this)" tabindex="-1">👁</button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Confirmer</label>
        <div class="auth-input-wrap">
          <input type="password" class="form-input" id="confirm-password" placeholder="••••••••"/>
          <button class="auth-eye" onclick="togglePasswordVis('confirm-password',this)" tabindex="-1">👁</button>
        </div>
      </div>
      <button class="btn btn-primary" style="width:100%" onclick="changeAdminPassword()">🔐 Changer le mot de passe</button>
      <div style="font-size:11px;color:var(--text-muted);margin-top:8px">Ce mot de passe est stocké sur Firebase et survive aux mises à jour.</div>
    </div>

    <!-- Token GitHub -->
    <div class="cms-card">
      <div class="cms-card-header"><div class="cms-card-title"><div class="cct-dot ${adminState.ghToken?'green':'red'}"></div>GITHUB & DÉPLOIEMENT</div>
        <span style="font-size:11px;padding:3px 8px;border-radius:20px;background:${adminState.ghToken?'rgba(94,231,196,.1)':'rgba(248,113,113,.1)'};color:${adminState.ghToken?'#5ee7c4':'#f87171'}">
          ${adminState.ghToken?'✅ Configuré':'❌ Manquant'}
        </span>
      </div>
      <div class="form-group">
        <label class="form-label">Token GitHub (Personal Access Token)</label>
        <div class="auth-input-wrap">
          <input type="password" class="form-input" id="cfg-gh-token"
            value="${adminState.ghToken}" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"/>
          <button class="auth-eye" onclick="togglePasswordVis('cfg-gh-token',this)" tabindex="-1">👁</button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Repository</label>
        <input type="text" class="form-input" value="Mickado-Makoto/StudyTokens" readonly
          style="opacity:.6;cursor:not-allowed"/>
      </div>
      <button class="btn btn-primary" style="width:100%;margin-bottom:10px" onclick="saveGhToken()">💾 Sauvegarder le token</button>
      <div style="background:rgba(123,159,255,.06);border:1px solid rgba(123,159,255,.15);border-radius:10px;padding:12px;font-size:12px;color:var(--text-muted);line-height:1.8">
        <div style="font-weight:700;color:var(--text-secondary);margin-bottom:6px">💡 Comment obtenir un token GitHub ?</div>
        1. Aller sur <strong style="color:var(--accent)">github.com</strong> → connecte-toi<br>
        2. Cliquer sur ta photo de profil → <strong>Settings</strong><br>
        3. En bas à gauche → <strong>Developer settings</strong><br>
        4. <strong>Personal access tokens</strong> → <strong>Tokens (classic)</strong><br>
        5. <strong>Generate new token (classic)</strong><br>
        6. Cocher uniquement la case <strong style="color:#fbbf24">repo</strong> ✅<br>
        7. Copier le token généré ici
      </div>
    </div>

    <!-- Règles d'accès -->
    <div class="cms-card">
      <div class="cms-card-header"><div class="cms-card-title"><div class="cct-dot"></div>RÈGLES D'ACCÈS</div></div>
      <div class="form-group">
        <label class="form-label" style="display:flex;align-items:center;gap:10px;cursor:pointer">
          <input type="checkbox" id="cfg-open-register" checked/>
          <span>Inscription libre (tout le monde peut s'inscrire)</span>
        </label>
      </div>
      <div class="form-group">
        <label class="form-label" style="display:flex;align-items:center;gap:10px;cursor:pointer">
          <input type="checkbox" id="cfg-google-auth" checked/>
          <span>Connexion Google activée</span>
        </label>
      </div>
      <div class="form-group">
        <label class="form-label" style="display:flex;align-items:center;gap:10px;cursor:pointer">
          <input type="checkbox" id="cfg-maintenance"/>
          <span>Mode maintenance (bloque toutes les connexions sauf Fondateur)</span>
        </label>
      </div>
      <div class="form-group">
        <label class="form-label">Message de maintenance</label>
        <input type="text" class="form-input" id="cfg-maintenance-msg"
          placeholder="L'application est en maintenance. Revenez dans quelques minutes."/>
      </div>
      <button class="btn btn-primary" style="width:100%" onclick="saveAccessRules()">💾 Sauvegarder</button>
    </div>

    <!-- Sons & Interface -->
    <div class="cms-card">
      <div class="cms-card-header"><div class="cms-card-title"><div class="cct-dot"></div>SONS & INTERFACE</div></div>
      <div class="form-group">
        <label class="form-label">Volume des effets sonores</label>
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:16px">🔇</span>
          <input type="range" id="cfg-sfx-volume" min="0" max="100" value="${Math.round((SFX.volume||0.35)*100)}"
            style="flex:1;accent-color:var(--accent)"
            oninput="SFX.volume=this.value/100;document.getElementById('vol-val').textContent=this.value+'%';SFX.click()"/>
          <span style="font-size:16px">🔊</span>
          <span id="vol-val" style="font-size:12px;color:var(--text-muted);min-width:36px">${Math.round((SFX.volume||0.35)*100)}%</span>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Tester les sons</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-secondary btn-sm" onclick="SFX.success()">✅ Succès</button>
          <button class="btn btn-secondary btn-sm" onclick="SFX.error()">❌ Erreur</button>
          <button class="btn btn-secondary btn-sm" onclick="SFX.notify()">🔔 Notif</button>
          <button class="btn btn-secondary btn-sm" onclick="SFX.timerEnd()">⏱ Timer</button>
          <button class="btn btn-secondary btn-sm" onclick="SFX.levelUp()">🎮 Level up</button>
          <button class="btn btn-secondary btn-sm" onclick="SFX.publish()">🚀 Publish</button>
        </div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="saveSFXVolume()" style="margin-top:4px">💾 Sauvegarder le volume</button>
    </div>

    <!-- Rangs personnalisés -->
    <div class="cms-card" style="grid-column:1/-1">
      <div class="cms-card-header"><div class="cms-card-title"><div class="cct-dot"></div>CONFIGURATION DES RANGS</div></div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px">
        ${Object.entries(ROLES).map(([k,r]) => `
          <div style="padding:12px;background:var(--bg-elevated);border-radius:10px;border:1px solid var(--border)">
            <div style="font-size:22px;margin-bottom:6px">${r.emoji}</div>
            <div style="font-size:13px;font-weight:700;margin-bottom:4px">${r.label}</div>
            <div class="user-role-badge ${r.css}" style="margin-bottom:8px">Level ${r.level}</div>
            <div style="font-size:11px;color:var(--text-muted)">
              ${r.perms.adminPanel?'✅':'❌'} Panel admin<br>
              ${r.perms.manageUsers?'✅':'❌'} Gestion users<br>
              ${r.perms.viewAllStats?'✅':'❌'} Stats globales<br>
              Thèmes: ${r.perms.themes.length}
            </div>
          </div>`).join('')}
      </div>
      <div style="margin-top:10px;font-size:12px;color:var(--text-muted)">ℹ️ Les rangs sont définis dans config.js. La modification nécessite une mise à jour de l'application.</div>
    </div>

  </div>`;
}

async function saveAppIdentity() {
  try {
    const config = {
      appName: document.getElementById('cfg-appname')?.value,
      slogan: document.getElementById('cfg-slogan')?.value,
      supportEmail: document.getElementById('cfg-support-email')?.value,
      updatedAt: new Date().toISOString(), updatedBy: fb.user?.email,
    };
    await fb.db.collection('appConfig').doc('identity').set(config, { merge: true });
    notify('✅ Identité sauvegardée', 'success');
  } catch(e) { notify('Erreur : '+e.message, 'error'); }
}

async function saveGhToken() {
  const token = document.getElementById('cfg-gh-token')?.value?.trim();
  if (!token) { notify('Token vide', 'error'); return; }
  await api.store.set(GH_TOKEN_KEY, token);
  adminState.ghToken = token;
  notify('✅ Token GitHub sauvegardé', 'success');
}

async function saveAccessRules() {
  try {
    const config = {
      openRegister: document.getElementById('cfg-open-register')?.checked ?? true,
      googleAuth: document.getElementById('cfg-google-auth')?.checked ?? true,
      maintenance: document.getElementById('cfg-maintenance')?.checked ?? false,
      maintenanceMsg: document.getElementById('cfg-maintenance-msg')?.value || '',
      updatedAt: new Date().toISOString(), updatedBy: fb.user?.email,
    };
    await fb.db.collection('appConfig').doc('access').set(config, { merge: true });
    notify('✅ Règles d\'accès sauvegardées', 'success');
  } catch(e) { notify('Erreur : '+e.message, 'error'); }
}

async function changeAdminPassword() {
  const np = document.getElementById('new-password')?.value;
  const cp = document.getElementById('confirm-password')?.value;
  if (!np || np.length < 6) { notify('Mot de passe trop court (6 min)', 'error'); return; }
  if (np !== cp) { notify('Mots de passe différents', 'error'); return; }
  if (fb.ready && fb.user) {
    await fb.db.collection('users').doc(fb.user.uid).set({ adminPassword: np }, { merge: true });
  }
  await api.store.set(ADMIN_PASSWORD_KEY, np);
  document.getElementById('new-password').value = '';
  document.getElementById('confirm-password').value = '';
  notify('✅ Mot de passe admin mis à jour', 'success');
}


// ══════════════════════════════════════════════
//  UTILISATEURS — Gestion complète
// ══════════════════════════════════════════════
async function renderAdminPublish() {
  const panel = document.getElementById('cms-page-content');
  if (!panel) return;
  if (getRoleLevel(fb.profile?.role) < 4) {
    panel.innerHTML = `<div style="padding:60px;text-align:center;color:var(--text-muted)">🔒 Accès Fondateur uniquement</div>`; return;
  }

  panel.innerHTML = `
  <div class="cms-page-header">
    <div class="cms-page-title"><div class="cms-page-title-icon">🚀</div>Déploiement & Mises à jour</div>
    <div class="cms-page-subtitle">Publication sur GitHub + distribution aux utilisateurs</div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
    <div class="cms-card">
      <div class="cms-card-header"><div class="cms-card-title"><div class="cct-dot ${adminState.ghToken?'green':'red'}"></div>TOKEN GITHUB</div></div>
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <div class="auth-input-wrap" style="flex:1">
          <input type="password" class="form-input" id="pub-gh-token" value="${adminState.ghToken}" placeholder="ghp_..."/>
          <button class="auth-eye" onclick="togglePasswordVis('pub-gh-token',this)" tabindex="-1">👁</button>
        </div>
        <button class="btn btn-primary" onclick="saveGhToken2()">💾</button>
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">
        Repository : <code style="color:var(--accent)">Mickado-Makoto/StudyTokens</code>
      </div>
      <div class="cms-card-header" style="margin-bottom:10px"><div class="cms-card-title"><div class="cct-dot"></div>PUBLIER UNE VERSION</div></div>
      <div class="form-group">
        <label class="form-label">Numéro de version</label>
        <div style="display:flex;gap:8px">
          <input type="text" class="form-input" id="pub-version" value="${APP_VERSION}" placeholder="1.3.0" style="flex:1"/>
          <button class="btn btn-secondary" onclick="bumpVersion('patch')">+patch</button>
          <button class="btn btn-secondary" onclick="bumpVersion('minor')">+minor</button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" id="pub-prerelease"/>
          <span>Pré-version (bêta)</span>
        </label>
      </div>
      <button class="btn btn-primary" style="width:100%" id="pub-btn" onclick="publishRelease()">
        🚀 Publier la mise à jour
      </button>
    </div>
    <div class="cms-card">
      <div class="cms-card-header"><div class="cms-card-title"><div class="cct-dot"></div>JOURNAL DE DÉPLOIEMENT</div></div>
      <div id="pub-log" style="font-family:var(--font-mono);font-size:12px;background:var(--bg-base);border-radius:8px;padding:12px;min-height:150px;max-height:350px;overflow-y:auto;color:#5ee7c4;line-height:1.7">
        Prêt.<br>Token GitHub : ${adminState.ghToken?'✅ Configuré':'❌ Manquant'}
      </div>
    </div>
  </div>`;
}

async function saveGhToken2() {
  const token = document.getElementById('pub-gh-token')?.value?.trim();
  if (!token) { notify('Token vide', 'error'); return; }
  await api.store.set(GH_TOKEN_KEY, token);
  adminState.ghToken = token;
  notify('✅ Token sauvegardé', 'success');
}

function bumpVersion(type) {
  const el = document.getElementById('pub-version');
  if (!el) return;
  const parts = (el.value || APP_VERSION).split('.').map(Number);
  if (type === 'patch') parts[2] = (parts[2]||0) + 1;
  else if (type === 'minor') { parts[1] = (parts[1]||0) + 1; parts[2] = 0; }
  else { parts[0] = (parts[0]||0) + 1; parts[1] = 0; parts[2] = 0; }
  el.value = parts.join('.');
}

function pubLog(msg) {
  const el = document.getElementById('pub-log');
  if (!el) return;
  const line = document.createElement('div');
  line.innerHTML = `<span style="color:rgba(123,159,255,.5);font-size:10px">${new Date().toLocaleTimeString('fr-FR')}</span> ${msg}`;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

async function publishRelease() {
  if (!adminState.ghToken) {
    notify('⚠️ Configure le token GitHub d\'abord dans Paramètres app', 'error', 5000);
    pubLog('❌ Token GitHub manquant — Va dans Paramètres app → GitHub & Déploiement');
    return;
  }
  const version = document.getElementById('pub-version')?.value?.trim();
  if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
    notify('Format de version invalide (ex: 1.3.0)', 'error'); return;
  }
  const isPrerelease = document.getElementById('pub-prerelease')?.checked;
  const btn = document.getElementById('pub-btn');
  if (btn) { btn.disabled=true; btn.innerHTML='<span class="auth-spinner"></span> Publication en cours...'; }

  const logEl = document.getElementById('pub-log');
  if (logEl) logEl.innerHTML = '';
  pubLog('🚀 Démarrage de la publication...');
  pubLog(`📦 Version cible : <strong>v${version}</strong>${isPrerelease?' (pré-version)':''}`);
  pubLog(`👤 Publié par : ${fb.user?.email}`);
  pubLog('─────────────────────────────');

  try {
    pubLog('🔑 Vérification du token GitHub...');
    const userResp = await fetch('https://api.github.com/user', {
      headers: { Authorization: `token ${adminState.ghToken}` }
    });
    if (!userResp.ok) throw new Error(`Token invalide (${userResp.status}) — Vérifie ton token GitHub`);
    const ghUser = await userResp.json();
    pubLog(`✅ Authentifié sur GitHub : ${ghUser.login}`);

    pubLog('🔍 Vérification que la version n\'existe pas déjà...');
    const checkResp = await fetch(`https://api.github.com/repos/Mickado-Makoto/StudyTokens/releases/tags/v${version}`, {
      headers: { Authorization: `token ${adminState.ghToken}` }
    });
    if (checkResp.ok) throw new Error(`La release v${version} existe déjà sur GitHub !`);

    pubLog('📝 Création de la release GitHub...');
    const r = await fetch('https://api.github.com/repos/Mickado-Makoto/StudyTokens/releases', {
      method: 'POST',
      headers: { Authorization: `token ${adminState.ghToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tag_name: `v${version}`,
        name: `StudyTokens v${version}`,
        body: `## StudyTokens v${version}\n\nRelease publiée via le panel d\'administration.`,
        prerelease: isPrerelease,
        draft: false,
      })
    });
    if (!r.ok) {
      const errData = await r.json().catch(()=>({}));
      throw new Error(`GitHub API ${r.status}: ${errData.message || 'Erreur inconnue'}`);
    }
    const release = await r.json();
    pubLog(`✅ Release créée avec succès !`);
    pubLog(`🔗 <a href="#" style="color:var(--accent)">${release.html_url}</a>`);
    pubLog('─────────────────────────────');
    pubLog('✅ <strong>Publication terminée !</strong>');
    pubLog(`ℹ️ GitHub Actions va maintenant builder et distribuer l\'update aux utilisateurs.`);

    SFX.publish();
    notify('Distribué automatiquement aux utilisateurs.', 'success', { title: `🚀 v${version} publiée !`, duration: 8000 });
    await fbLogSecurityAlert('version_published', { by: fb.user?.email, version, prerelease: isPrerelease, url: release.html_url });

  } catch(e) {
    pubLog(`─────────────────────────────`);
    pubLog(`❌ <strong>Échec :</strong> ${e.message}`);
    if (e.message.includes('Token')) pubLog('💡 Obtenir un token : github.com → Settings → Developer settings → Personal access tokens → Generate new token (scope: repo)');
    SFX.error();
    notify('❌ '+e.message, 'error', 8000);
  }
  if (btn) { btn.disabled=false; btn.innerHTML='🚀 Publier la mise à jour'; }
}

// ══════════════════════════════════════════════
//  PERMISSIONS (Fondateur)
// ══════════════════════════════════════════════
function renderAdminPermissions() {
  if (getRoleLevel(fb.profile?.role) < 4) {
    return `<div style="padding:60px;text-align:center;color:var(--text-muted)">🔒 Accès Fondateur uniquement</div>`;
  }
  return `
  <div class="cms-page-header">
    <div class="cms-page-title"><div class="cms-page-title-icon">🛡️</div>Permissions & Hiérarchie</div>
    <div class="cms-page-subtitle">Vue complète du système de rangs et permissions</div>
  </div>

  <!-- Hiérarchie visuelle -->
  <div class="cms-card" style="margin-bottom:14px">
    <div class="cms-card-header"><div class="cms-card-title"><div class="cct-dot gold"></div>HIÉRARCHIE DES RANGS</div></div>
    <div style="display:flex;gap:0;align-items:stretch">
      ${Object.entries(ROLES).reverse().map(([k,r], i, arr) => `
        <div style="flex:1;text-align:center;padding:16px 8px;
          background:rgba(${r.level>=4?'251,191,36':r.level>=3?'99,179,237':r.level>=2?'94,231,196':r.level>=1?'250,204,21':'255,255,255'},.06);
          border-right:${i<arr.length-1?'1px solid var(--border)':'none'}">
          <div style="font-size:28px;margin-bottom:6px">${r.emoji}</div>
          <div class="user-role-badge ${r.css}" style="margin-bottom:8px">${r.label}</div>
          <div style="font-size:11px;color:var(--text-muted);line-height:1.7">
            Niveau ${r.level}<br>
            ${r.perms.themes.length} thème(s)<br>
            ${r.perms.adminPanel?'<span style="color:#5ee7c4">✅ Panel admin</span>':'<span style="color:var(--text-muted)">❌ Pas d\'admin</span>'}<br>
            ${r.perms.manageUsers?'<span style="color:#5ee7c4">✅ Gérer users</span>':'<span style="color:var(--text-muted)">❌ Pas de gestion</span>'}<br>
            ${r.perms.viewAllStats?'<span style="color:#5ee7c4">✅ Voir stats</span>':'<span style="color:var(--text-muted)">❌ Stats privées</span>'}
          </div>
        </div>`).join('')}
    </div>
  </div>

  <!-- Règles de promotion -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
    <div class="cms-card">
      <div class="cms-card-header"><div class="cms-card-title"><div class="cct-dot red"></div>RÈGLES DE SÉCURITÉ</div></div>
      <div style="display:flex;flex-direction:column;gap:10px;font-size:13px">
        ${[
          { icon:'🔒', text:'Un Admin ne peut pas promouvoir au rang Admin ou Fondateur', ok:true },
          { icon:'🔒', text:'Un Admin ne peut pas modifier un Fondateur ou un autre Admin', ok:true },
          { icon:'🔒', text:'Seul le Fondateur peut attribuer le rang Admin et Fondateur', ok:true },
          { icon:'🔒', text:'Seul le Fondateur peut se retirer son propre rang', ok:true },
          { icon:'🔒', text:'Un banni ne peut plus se connecter (durée définie)', ok:true },
          { icon:'⚠️', text:'Le panneau admin est caché pour Utilisateur et Pro', ok:true },
          { icon:'⚠️', text:'5 tentatives max sur le mot de passe admin, puis blocage 15 min', ok:true },
        ].map(rule => `
          <div style="display:flex;gap:10px;padding:8px 12px;background:var(--bg-elevated);border-radius:8px">
            <span>${rule.icon}</span>
            <span style="color:var(--text-secondary)">${rule.text}</span>
          </div>`).join('')}
      </div>
    </div>
    <div class="cms-card">
      <div class="cms-card-header"><div class="cms-card-title"><div class="cct-dot"></div>DROITS PAR ONGLET ADMIN</div></div>
      <table style="width:100%;font-size:12px;border-collapse:collapse">
        <thead>
          <tr style="color:var(--text-muted)">
            <th style="padding:6px;text-align:left">Section</th>
            <th style="padding:6px;text-align:center">Modo</th>
            <th style="padding:6px;text-align:center">Admin</th>
            <th style="padding:6px;text-align:center">Fondateur</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(TAB_PERMISSIONS).map(([tab, min]) => {
            const label = TAB_LABELS[tab] || tab;
            return `<tr style="border-top:1px solid var(--border)">
              <td style="padding:6px;color:var(--text-secondary)">${label}</td>
              <td style="padding:6px;text-align:center">${min<=2?'✅':'❌'}</td>
              <td style="padding:6px;text-align:center">${min<=3?'✅':'❌'}</td>
              <td style="padding:6px;text-align:center">✅</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

async function saveSFXVolume() {
  const vol = document.getElementById('cfg-sfx-volume')?.value;
  if (vol !== undefined) {
    SFX.volume = parseInt(vol) / 100;
    await api.store.set('sfxVolume', SFX.volume);
    SFX.success();
    notify('Volume audio sauvegardé', 'success');
  }
}
