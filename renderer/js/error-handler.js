/* ================================================
   ERROR-HANDLER.JS — Gestionnaire d'erreurs global
   Intercepte TOUTES les erreurs JS, affiche un
   écran crash élégant, système de tickets Firebase
   ================================================ */
'use strict';

// ── Stubs pour fonctions manquantes connues ───
// (empêche les erreurs venant d'anciens fichiers)
window.dragEvent      = window.dragEvent      || function(){};
window.showToast      = window.showToast      || function(m){ console.log('[Toast]', m); };

// ── Stockage des erreurs capturées ─────────────
const ERR_LOG = {
  errors: [],
  maxErrors: 50,
  sessionId: Date.now().toString(36),
};

// ── Capture window.onerror ────────────────────
window.onerror = function(message, source, lineno, colno, error) {
  // Ignorer les warnings bénins (Firebase, Electron, Cross-Origin)
  const IGNORE = [
    'Cross-Origin-Opener-Policy',
    'enableMultiTabIndexedDb',
    'FirestoreSettings',
    'warnAboutInsecureCSP',
    'ResizeObserver loop',
    'Non-Error promise rejection',
  ];
  if (IGNORE.some(p => message?.includes(p))) return false;

  const entry = {
    type: 'error',
    message: message || 'Erreur inconnue',
    source: source || '',
    line: lineno,
    col: colno,
    stack: error?.stack || '',
    time: new Date().toISOString(),
    page: window.state?.currentPage || 'unknown',
    user: window.fb?.user?.email || 'non connecté',
    version: window.APP_VERSION || '?',
  };

  ERR_LOG.errors.push(entry);
  if (ERR_LOG.errors.length > ERR_LOG.maxErrors) ERR_LOG.errors.shift();

  console.error('[ERR-HANDLER]', message, 'at', source, lineno);

  // Sauvegarder dans Firebase silencieusement
  _logErrorToFirebase(entry).catch(() => {});

  // Ne pas crasher pour des erreurs mineures
  const isCritical = _isCriticalError(message, source);
  if (isCritical) {
    _showCrashScreen(entry);
    return true; // Empêche la propagation
  }
  return false;
};

// ── Capture promises rejetées ─────────────────
window.onunhandledrejection = function(event) {
  const reason = event.reason;
  const message = reason?.message || String(reason) || 'Promise rejetée';

  const IGNORE_PROM = [
    'network error', 'Failed to fetch', 'firestore', 'timeout',
    'permission-denied', 'PERMISSION_DENIED', 'No document to update',
  ];
  if (IGNORE_PROM.some(p => message.toLowerCase().includes(p.toLowerCase()))) return;

  const entry = {
    type: 'unhandledRejection',
    message,
    stack: reason?.stack || '',
    time: new Date().toISOString(),
    page: window.state?.currentPage || 'unknown',
    user: window.fb?.user?.email || 'non connecté',
    version: window.APP_VERSION || '?',
  };

  ERR_LOG.errors.push(entry);
  console.error('[ERR-HANDLER] Unhandled rejection:', message);
  _logErrorToFirebase(entry).catch(() => {});
};

// ── Décider si une erreur est critique ────────
function _isCriticalError(message, source) {
  // Erreurs critiques = celles qui cassent l'UI visible
  const CRITICAL_PATTERNS = [
    'is not defined',      // Variable manquante (comme dragEvent)
    'is not a function',   // Fonction appelée sur undefined
    'Cannot read prop',    // null pointer
    'Cannot set prop',
    'Unexpected token',    // Erreur de syntaxe
    'SyntaxError',
    'Maximum call stack',  // Stack overflow
  ];
  // Mais seulement si ça vient de nos fichiers
  const OUR_FILES = ['pages.js','timer.js','auth.js','init.js','admin','badges','goals','stats','flashcards'];
  const isOurCode = OUR_FILES.some(f => source?.includes(f));

  if (!isOurCode) return false;
  return CRITICAL_PATTERNS.some(p => message?.includes(p));
}

// ── Envoyer l'erreur à Firebase (silencieux) ──
async function _logErrorToFirebase(entry) {
  if (!window.fb?.db || !window.fb?.user) return;
  try {
    await window.fb.db.collection('errorLogs').add({
      ...entry,
      sessionId: ERR_LOG.sessionId,
      uid: window.fb.user.uid,
      appVersion: window.APP_VERSION || '?',
      loggedAt: new Date(),
    });
  } catch(e) {
    // Silencieux — on ne peut pas logger une erreur de logging
  }
}

// ══════════════════════════════════════════════
//  ÉCRAN CRASH ÉLÉGANT
// ══════════════════════════════════════════════
function _showCrashScreen(errorEntry) {
  // Ne pas montrer plusieurs crash screens
  if (document.getElementById('crash-screen')) return;

  const screen = document.createElement('div');
  screen.id = 'crash-screen';

  const errMsg = errorEntry.message || 'Erreur inattendue';
  const errCode = 'ERR_' + Math.random().toString(36).substr(2,6).toUpperCase();
  const timeStr = new Date().toLocaleTimeString('fr-FR');

  screen.innerHTML = `
    <div class="cr-bg">
      <div class="cr-grid"></div>
      <div class="cr-stars" id="cr-stars"></div>
      <div class="cr-particles" id="cr-particles"></div>
    </div>

    <div class="cr-content">
      <!-- Header badge -->
      <div class="cr-badge">
        <span class="cr-badge-dot"></span>
        INCIDENT DÉTECTÉ — ${errCode}
      </div>

      <!-- Icon animée -->
      <div class="cr-icon-wrap">
        <div class="cr-icon-ring cr-ring-1"></div>
        <div class="cr-icon-ring cr-ring-2"></div>
        <div class="cr-icon-core">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          </svg>
        </div>
      </div>

      <!-- Title -->
      <h1 class="cr-title">Quelque chose s'est cassé</h1>
      <p class="cr-sub">
        Une erreur inattendue vient de se produire.<br>
        Le fondateur a été notifié automatiquement.
      </p>

      <!-- Status card -->
      <div class="cr-status-row">
        <div class="cr-status-item cr-status-alert">
          <div class="cr-status-icon">⚡</div>
          <div class="cr-status-label">Rapport envoyé</div>
        </div>
        <div class="cr-status-item cr-status-ok">
          <div class="cr-status-icon">🛡️</div>
          <div class="cr-status-label">Données sécurisées</div>
        </div>
        <div class="cr-status-item cr-status-ok">
          <div class="cr-status-icon">🔄</div>
          <div class="cr-status-label">Rechargement possible</div>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="cr-actions">
        <button class="cr-btn cr-btn-primary" onclick="_crashReload()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Redémarrer l'app
        </button>
        <button class="cr-btn cr-btn-secondary" onclick="_openTicketPanel()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Envoyer un ticket
        </button>
      </div>

      <!-- Error details (collapsible) -->
      <details class="cr-details">
        <summary class="cr-details-summary">
          <span>Détails techniques</span>
          <span class="cr-details-arrow">›</span>
        </summary>
        <div class="cr-details-body">
          <div class="cr-detail-row">
            <span class="cr-detail-key">Erreur</span>
            <span class="cr-detail-val">${_escHtml(errMsg)}</span>
          </div>
          <div class="cr-detail-row">
            <span class="cr-detail-key">Fichier</span>
            <span class="cr-detail-val">${_escHtml(errorEntry.source?.split('/').pop() || '—')}</span>
          </div>
          <div class="cr-detail-row">
            <span class="cr-detail-key">Ligne</span>
            <span class="cr-detail-val">${errorEntry.line || '—'}</span>
          </div>
          <div class="cr-detail-row">
            <span class="cr-detail-key">Page</span>
            <span class="cr-detail-val">${errorEntry.page}</span>
          </div>
          <div class="cr-detail-row">
            <span class="cr-detail-key">Heure</span>
            <span class="cr-detail-val">${timeStr}</span>
          </div>
          <div class="cr-detail-row">
            <span class="cr-detail-key">Version</span>
            <span class="cr-detail-val">v${errorEntry.version}</span>
          </div>
          <div class="cr-detail-row">
            <span class="cr-detail-key">Code</span>
            <span class="cr-detail-val" style="color:var(--accent,#7b9fff)">${errCode}</span>
          </div>
        </div>
      </details>
    </div>

    <!-- Ticket panel (hidden by default) -->
    <div class="cr-ticket-panel" id="cr-ticket-panel">
      <div class="cr-ticket-card">
        <div class="cr-ticket-header">
          <div class="cr-ticket-title">🎫 Envoyer un rapport</div>
          <button class="cr-ticket-close" onclick="_closeTicketPanel()">✕</button>
        </div>

        <div class="cr-ticket-body">
          <div class="cr-field">
            <label class="cr-field-label">Que faisais-tu avant que ça plante ?</label>
            <textarea id="cr-ticket-desc" class="cr-field-input cr-field-textarea"
              placeholder="Ex: J'étudiais les maths, j'ai cliqué sur la boutique et..."
              rows="3"></textarea>
          </div>

          <div class="cr-field">
            <label class="cr-field-label">Photo (optionnelle)</label>
            <div class="cr-file-drop" id="cr-file-drop" onclick="document.getElementById('cr-file-input').click()">
              <input type="file" id="cr-file-input" accept="image/*" style="display:none"
                onchange="_handleTicketFile(this)"/>
              <div id="cr-file-preview" style="display:none"></div>
              <div id="cr-file-placeholder">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:.5;margin-bottom:6px">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <div style="font-size:12px;color:var(--text-muted,#6880b0)">Clique pour ajouter une capture d'écran</div>
              </div>
            </div>
          </div>

          <div id="cr-ticket-status" style="display:none"></div>
        </div>

        <div class="cr-ticket-footer">
          <button class="cr-btn cr-btn-secondary" onclick="_closeTicketPanel()">Annuler</button>
          <button class="cr-btn cr-btn-primary" id="cr-send-btn" onclick="_sendTicket('${errCode}', '${_escHtml(errMsg).replace(/'/g,"\\'")}')">
            📨 Envoyer le rapport
          </button>
        </div>
      </div>
    </div>`;

  document.body.appendChild(screen);

  // Animate in
  requestAnimationFrame(() => screen.classList.add('cr-visible'));

  // Generate background particles
  _buildCrashParticles();
}

function _crashReload() {
  const btn = document.querySelector('.cr-btn-primary');
  if (btn) { btn.textContent = '⟳ Redémarrage...'; btn.disabled = true; }
  setTimeout(() => location.reload(), 600);
}

function _openTicketPanel() {
  document.getElementById('cr-ticket-panel')?.classList.add('cr-tp-visible');
  setTimeout(() => document.getElementById('cr-ticket-desc')?.focus(), 200);
}

function _closeTicketPanel() {
  document.getElementById('cr-ticket-panel')?.classList.remove('cr-tp-visible');
}

let _ticketImageData = null;
function _handleTicketFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    _ticketImageData = e.target.result;
    const prev = document.getElementById('cr-file-preview');
    const ph = document.getElementById('cr-file-placeholder');
    if (prev && ph) {
      prev.innerHTML = `<img src="${_ticketImageData}" style="max-width:100%;max-height:140px;border-radius:6px;object-fit:contain"/>
        <div style="font-size:11px;color:var(--text-muted,#6880b0);margin-top:4px">${file.name}</div>`;
      prev.style.display = 'block';
      ph.style.display = 'none';
    }
  };
  reader.readAsDataURL(file);
}

async function _sendTicket(errCode, errMsg) {
  const desc = document.getElementById('cr-ticket-desc')?.value?.trim();
  const statusEl = document.getElementById('cr-ticket-status');
  const sendBtn = document.getElementById('cr-send-btn');

  if (!desc) {
    if (statusEl) { statusEl.style.display='block'; statusEl.className='cr-status-msg cr-status-err'; statusEl.textContent='Décris le problème avant d\'envoyer.'; }
    return;
  }

  if (sendBtn) { sendBtn.disabled=true; sendBtn.textContent='Envoi...'; }

  try {
    const ticket = {
      errCode,
      errMsg,
      description: desc,
      hasScreenshot: !!_ticketImageData,
      screenshot: _ticketImageData || null,
      user: window.fb?.user?.email || 'anonymous',
      uid: window.fb?.user?.uid || null,
      version: window.APP_VERSION || '?',
      page: window.state?.currentPage || 'unknown',
      errorLog: ERR_LOG.errors.slice(-5),
      submittedAt: new Date().toISOString(),
      sessionId: ERR_LOG.sessionId,
      platform: navigator.platform,
    };

    if (window.fb?.db) {
      await window.fb.db.collection('supportTickets').add({
        ...ticket,
        screenshot: null, // Don't save full image to Firestore
        createdAt: new Date(),
        status: 'open',
        read: false,
      });
    }

    // Save locally too
    try {
      const existing = JSON.parse(localStorage.getItem('studytokens_tickets') || '[]');
      existing.push({ ...ticket, savedAt: Date.now() });
      localStorage.setItem('studytokens_tickets', JSON.stringify(existing.slice(-10)));
    } catch(e) {}

    if (statusEl) {
      statusEl.style.display='block';
      statusEl.className='cr-status-msg cr-status-ok';
      statusEl.innerHTML='✅ Rapport envoyé ! Le fondateur va vérifier ça.';
    }
    if (sendBtn) { sendBtn.textContent='✅ Envoyé !'; }
    setTimeout(() => _closeTicketPanel(), 2000);

  } catch(e) {
    if (statusEl) {
      statusEl.style.display='block';
      statusEl.className='cr-status-msg cr-status-err';
      statusEl.textContent='Erreur d\'envoi. Réessaie plus tard.';
    }
    if (sendBtn) { sendBtn.disabled=false; sendBtn.textContent='📨 Envoyer le rapport'; }
  }
}

function _buildCrashParticles() {
  const starsEl = document.getElementById('cr-stars');
  const partEl = document.getElementById('cr-particles');
  if (!starsEl || !partEl) return;

  for (let i = 0; i < 60; i++) {
    const s = document.createElement('div');
    s.className = 'cr-star';
    const sz = Math.random() < 0.1 ? 2 : 1;
    s.style.cssText = `width:${sz}px;height:${sz}px;top:${Math.random()*100}%;left:${Math.random()*100}%;animation-duration:${2+Math.random()*4}s;animation-delay:${Math.random()*5}s`;
    starsEl.appendChild(s);
  }

  const colors = ['#e05252','#ff6b6b','#cc00ff','#7b9fff','#5ee7c4'];
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('div');
    p.className = 'cr-particle';
    const c = colors[i % colors.length];
    p.style.cssText = `left:${Math.random()*100}%;background:${c};box-shadow:0 0 6px ${c};animation-duration:${6+Math.random()*6}s;animation-delay:${Math.random()*4}s`;
    partEl.appendChild(p);
  }
}

function _escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── API publique ─────────────────────────────
window.ERR_LOG = ERR_LOG;
window._showCrashScreen = _showCrashScreen;
window._crashReload = _crashReload;
window._openTicketPanel = _openTicketPanel;
window._closeTicketPanel = _closeTicketPanel;
window._sendTicket = _sendTicket;
window._handleTicketFile = _handleTicketFile;

// ── Fonction manuelle pour tester l'écran crash
window.testCrashScreen = function() {
  _showCrashScreen({
    message: 'Test du système d\'erreurs',
    source: 'test-manual',
    line: 1, col: 1,
    page: 'timer',
    user: window.fb?.user?.email || 'test@test.com',
    version: window.APP_VERSION || '1.2.0',
    time: new Date().toISOString(),
  });
};

console.log('[ErrorHandler] ✅ Gestionnaire d\'erreurs global actif');
