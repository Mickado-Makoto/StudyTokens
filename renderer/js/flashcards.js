/* ================================================
   FLASHCARDS.JS — Mini-jeu de mémorisation
   Créer des decks, étudier, gagner des jetons
   StudyTokens © 2025
   ================================================ */
'use strict';

// ── État des flashcards ───────────────────────
const fcState = {
  decks: [],          // tous les decks
  session: null,      // session d'étude active
  view: 'list',       // 'list' | 'study' | 'create' | 'edit'
  editingDeck: null,
  loaded: false,
};

// ── Firebase helpers ──────────────────────────
async function loadFlashcardDecks() {
  if (!fb.user || !fb.db) return;
  try {
    const snap = await fb.db.collection('users').doc(fb.user.uid)
      .collection('flashcards').orderBy('updatedAt','desc').get();
    fcState.decks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    fcState.loaded = true;
  } catch(e) {
    // Fallback : local store
    const local = await api.store.get('flashcardDecks', []);
    fcState.decks = local;
    fcState.loaded = true;
  }
}

async function saveDeck(deck) {
  // Assure an ID
  if (!deck.id) deck.id = 'deck_' + Date.now();
  deck.updatedAt = new Date();
  const idx = fcState.decks.findIndex(d => d.id === deck.id);
  if (idx >= 0) fcState.decks[idx] = deck;
  else fcState.decks.unshift(deck);

  try {
    if (fb.user && fb.db) {
      const { id, ...data } = deck;
      await fb.db.collection('users').doc(fb.user.uid)
        .collection('flashcards').doc(id).set(data);
    }
  } catch(e) {}
  await api.store.set('flashcardDecks', fcState.decks);
}

async function deleteDeck(deckId) {
  fcState.decks = fcState.decks.filter(d => d.id !== deckId);
  try {
    if (fb.user && fb.db) {
      await fb.db.collection('users').doc(fb.user.uid)
        .collection('flashcards').doc(deckId).delete();
    }
  } catch(e) {}
  await api.store.set('flashcardDecks', fcState.decks);
}

// ══════════════════════════════════════════════
//  RENDU PRINCIPAL
// ══════════════════════════════════════════════
async function renderFlashcardsPage() {
  if (!fcState.loaded) await loadFlashcardDecks();
  const el = document.getElementById('main-content');
  if (!el) return;

  if (fcState.view === 'study' && fcState.session) {
    el.innerHTML = renderStudyView();
    bindStudyEvents();
  } else if (fcState.view === 'create' || fcState.view === 'edit') {
    el.innerHTML = renderDeckEditor();
    bindEditorEvents();
  } else {
    el.innerHTML = renderDeckList();
  }
}

// ── Liste des decks ───────────────────────────
function renderDeckList() {
  const stats = state.flashcardStats || {};
  return `
  <div class="page-header">
    <div class="page-title-row" style="justify-content:space-between">
      <h1 class="page-title">🃏 Flashcards</h1>
      <button class="btn btn-primary" onclick="startCreateDeck()">+ Nouveau deck</button>
    </div>
    <p class="page-subtitle">Mémorise tes cours, gagne des jetons</p>
  </div>

  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">
    <div class="stat-card" style="padding:12px">
      <div class="stat-card-val" style="color:#c084fc">${fcState.decks.length}</div>
      <div class="stat-card-label">Decks créés</div>
    </div>
    <div class="stat-card" style="padding:12px">
      <div class="stat-card-val" style="color:#5ee7c4">${stats.decksCompleted||0}</div>
      <div class="stat-card-label">Sessions terminées</div>
    </div>
    <div class="stat-card" style="padding:12px">
      <div class="stat-card-val" style="color:#facc15">${stats.tokensEarned||0}</div>
      <div class="stat-card-label">Jetons gagnés</div>
    </div>
  </div>

  ${fcState.decks.length === 0 ? `
  <div class="page-card" style="text-align:center;padding:48px 24px">
    <div style="font-size:48px;margin-bottom:12px">🃏</div>
    <div style="font-size:16px;font-weight:700;margin-bottom:6px">Aucun deck</div>
    <div style="font-size:13px;color:var(--text-muted);margin-bottom:20px">Crée ton premier deck de flashcards pour commencer !</div>
    <button class="btn btn-primary" onclick="startCreateDeck()">Créer un deck</button>
  </div>` : `
  <div style="display:flex;flex-direction:column;gap:10px">
    ${fcState.decks.map(deck => renderDeckCard(deck)).join('')}
  </div>`}`;
}

function renderDeckCard(deck) {
  const cards = deck.cards || [];
  const mastered = cards.filter(c => (c.score||0) >= 3).length;
  const pct = cards.length > 0 ? Math.round((mastered/cards.length)*100) : 0;
  const lastStudied = deck.lastStudied ? new Date(deck.lastStudied).toLocaleDateString('fr-FR',{day:'numeric',month:'short'}) : 'Jamais';
  return `
  <div class="fc-deck-card" style="border-left:3px solid ${deck.color||'var(--accent)'}">
    <div class="fc-deck-info">
      <div class="fc-deck-emoji">${deck.emoji||'📚'}</div>
      <div style="flex:1;min-width:0">
        <div class="fc-deck-name">${deck.name}</div>
        <div class="fc-deck-meta">${cards.length} carte${cards.length>1?'s':''} · Dernière étude : ${lastStudied}</div>
        <div class="goal-bar" style="height:4px;margin-top:6px;max-width:200px">
          <div class="goal-bar-fill" style="width:${pct}%;background:${deck.color||'var(--accent)'}"></div>
        </div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${mastered}/${cards.length} maîtrisées (${pct}%)</div>
      </div>
    </div>
    <div class="fc-deck-actions">
      <button class="btn btn-primary btn-sm" onclick="startStudyDeck('${deck.id}')" ${cards.length===0?'disabled':''}>
        ▶ Étudier
      </button>
      <button class="btn btn-secondary btn-sm" onclick="startEditDeck('${deck.id}')">✏️</button>
      <button class="btn btn-secondary btn-sm" style="color:#f87171" onclick="confirmDeleteDeck('${deck.id}','${deck.name.replace(/'/g,"\\'").replace(/"/g,'&quot;')}')">🗑</button>
    </div>
  </div>`;
}

// ── Éditeur de deck ───────────────────────────
function startCreateDeck() {
  fcState.view = 'create';
  fcState.editingDeck = { id:null, name:'', emoji:'📚', color:'var(--accent)', cards:[], subject:'' };
  renderFlashcardsPage();
}

function startEditDeck(deckId) {
  const deck = fcState.decks.find(d => d.id === deckId);
  if (!deck) return;
  fcState.view = 'edit';
  fcState.editingDeck = JSON.parse(JSON.stringify(deck));
  renderFlashcardsPage();
}

function renderDeckEditor() {
  const d = fcState.editingDeck || {};
  const cards = d.cards || [];
  const isEdit = fcState.view === 'edit';
  return `
  <div class="page-header">
    <div class="page-title-row" style="justify-content:space-between">
      <h1 class="page-title">${isEdit?'✏️ Modifier':'➕ Créer'} un deck</h1>
      <button class="btn btn-secondary" onclick="fcBack()">← Retour</button>
    </div>
  </div>
  <div class="page-card">
    <div class="card-label">INFORMATIONS DU DECK</div>
    <div style="display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:end;margin:12px 0">
      <div>
        <label class="form-label">Emoji</label>
        <input type="text" id="fc-emoji" class="form-input" value="${d.emoji||'📚'}"
          maxlength="2" style="width:56px;text-align:center;font-size:20px"/>
      </div>
      <div>
        <label class="form-label">Nom du deck</label>
        <input type="text" id="fc-name" class="form-input" value="${d.name||''}"
          placeholder="Ex: Anatomie — Os du bras" maxlength="50"/>
      </div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:4px">
      <label class="form-label" style="width:100%">Couleur</label>
      ${['var(--accent)','#c084fc','#5ee7c4','#f97316','#facc15','#f87171','#34d399','#60a5fa'].map(c =>
        `<button onclick="selectFcColor(this,'${c}')" data-color="${c}"
          style="width:24px;height:24px;border-radius:50%;background:${c};border:2px solid ${(d.color||'var(--accent)')===c?'#fff':'transparent'};cursor:pointer"></button>`
      ).join('')}
    </div>
  </div>

  <div class="page-card">
    <div class="card-header-row">
      <div class="card-label">CARTES (${cards.length})</div>
      <button class="btn btn-primary btn-sm" onclick="addFcCard()">+ Ajouter une carte</button>
    </div>
    <div id="fc-cards-list" style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
      ${cards.map((c,i) => renderCardEditor(c, i)).join('')}
    </div>
    ${cards.length === 0 ? '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px">Aucune carte — clique sur "Ajouter une carte" !</div>' : ''}
  </div>

  <div style="display:flex;gap:10px;margin-bottom:24px">
    <button class="btn btn-secondary" style="flex:1" onclick="fcBack()">Annuler</button>
    <button class="btn btn-primary" style="flex:2" onclick="saveDeckEditor()">
      💾 ${isEdit?'Sauvegarder':'Créer le deck'}
    </button>
  </div>`;
}

function renderCardEditor(card, idx) {
  return `
  <div class="fc-card-editor" id="fce-${idx}">
    <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:start">
      <div>
        <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px;letter-spacing:.5px">QUESTION / RECTO</div>
        <textarea class="form-input fc-card-q" data-idx="${idx}" rows="2"
          placeholder="Question ou terme..."
          style="resize:vertical">${card.q||''}</textarea>
      </div>
      <div>
        <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px;letter-spacing:.5px">RÉPONSE / VERSO</div>
        <textarea class="form-input fc-card-a" data-idx="${idx}" rows="2"
          placeholder="Réponse ou définition..."
          style="resize:vertical">${card.a||''}</textarea>
      </div>
      <button onclick="removeFcCard(${idx})"
        style="margin-top:18px;background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.2);
               border-radius:8px;padding:8px;cursor:pointer;color:#f87171;font-size:14px">🗑</button>
    </div>
  </div>`;
}

function selectFcColor(btn, color) {
  document.querySelectorAll('[data-color]').forEach(b => b.style.borderColor = 'transparent');
  btn.style.borderColor = '#fff';
  if (fcState.editingDeck) fcState.editingDeck.color = color;
}

function addFcCard() {
  if (!fcState.editingDeck) return;
  fcState.editingDeck.cards.push({ q:'', a:'', score:0 });
  const list = document.getElementById('fc-cards-list');
  if (list) {
    const i = fcState.editingDeck.cards.length - 1;
    const div = document.createElement('div');
    div.innerHTML = renderCardEditor({ q:'', a:'', score:0 }, i);
    list.appendChild(div.firstElementChild);
    list.lastElementChild.scrollIntoView({ behavior:'smooth' });
  }
  SFX.click?.();
}

function removeFcCard(idx) {
  if (!fcState.editingDeck) return;
  fcState.editingDeck.cards.splice(idx, 1);
  const list = document.getElementById('fc-cards-list');
  if (list) list.innerHTML = fcState.editingDeck.cards.map((c,i) => renderCardEditor(c,i)).join('');
  SFX.click?.();
}

function bindEditorEvents() {
  document.getElementById('fc-emoji')?.addEventListener('input', e => {
    if (fcState.editingDeck) fcState.editingDeck.emoji = e.target.value;
  });
  document.getElementById('fc-name')?.addEventListener('input', e => {
    if (fcState.editingDeck) fcState.editingDeck.name = e.target.value;
  });
}

async function saveDeckEditor() {
  if (!fcState.editingDeck) return;
  const name = document.getElementById('fc-name')?.value?.trim();
  if (!name) { notify('Donne un nom à ton deck', 'error'); return; }

  // Sync cards from DOM
  const qs = document.querySelectorAll('.fc-card-q');
  const as = document.querySelectorAll('.fc-card-a');
  fcState.editingDeck.cards = Array.from(qs).map((q,i) => ({
    q: q.value.trim(),
    a: as[i]?.value?.trim() || '',
    score: fcState.editingDeck.cards[i]?.score || 0,
  })).filter(c => c.q || c.a);

  if (fcState.editingDeck.cards.length === 0) {
    notify('Ajoute au moins une carte à ton deck', 'error'); return;
  }
  fcState.editingDeck.name = name;
  fcState.editingDeck.emoji = document.getElementById('fc-emoji')?.value || '📚';

  await saveDeck(fcState.editingDeck);
  SFX.success?.();
  notify(`"${name}" — ${fcState.editingDeck.cards.length} cartes`, 'success', {
    title: fcState.view==='edit' ? '✅ Deck mis à jour' : '🃏 Deck créé !'
  });
  fcState.view = 'list';
  fcState.editingDeck = null;
  renderFlashcardsPage();
}

async function confirmDeleteDeck(id, name) {
  if (!confirm(`Supprimer le deck "${name}" ? Cette action est irréversible.`)) return;
  await deleteDeck(id);
  SFX.delete?.();
  notify(`"${name}" supprimé`, 'warning', { title:'🗑 Deck supprimé' });
  renderFlashcardsPage();
}

// ══════════════════════════════════════════════
//  MODE ÉTUDE
// ══════════════════════════════════════════════
function startStudyDeck(deckId) {
  const deck = fcState.decks.find(d => d.id === deckId);
  if (!deck || !deck.cards?.length) return;

  // Mélanger les cartes (priorité aux moins maîtrisées)
  const shuffled = [...deck.cards]
    .sort((a,b) => (a.score||0) - (b.score||0))
    .sort(() => Math.random() - 0.4);

  fcState.session = {
    deckId,
    deckName: deck.name,
    deckEmoji: deck.emoji || '📚',
    cards: shuffled,
    current: 0,
    flipped: false,
    known: 0,
    unknown: 0,
    startTime: Date.now(),
  };
  fcState.view = 'study';
  renderFlashcardsPage();
}

function renderStudyView() {
  const s = fcState.session;
  if (!s) return '';
  const card = s.cards[s.current];
  const total = s.cards.length;
  const done = s.current;
  const pct = Math.round((done/total)*100);

  return `
  <div class="fc-study-wrap">
    <div class="fc-study-header">
      <button class="btn btn-secondary btn-sm" onclick="endStudySession(false)">← Quitter</button>
      <div style="text-align:center">
        <div style="font-size:13px;font-weight:700">${s.deckEmoji} ${s.deckName}</div>
        <div style="font-size:11px;color:var(--text-muted)">${done+1}/${total} · ✅ ${s.known} · ❌ ${s.unknown}</div>
      </div>
      <div style="text-align:right;font-size:13px;font-weight:700;color:var(--accent)">${pct}%</div>
    </div>

    <div class="goal-bar" style="height:4px;border-radius:0;margin:0 -28px;width:calc(100% + 56px)">
      <div class="goal-bar-fill" style="width:${pct}%;border-radius:0;transition:width .4s ease"></div>
    </div>

    <!-- La carte -->
    <div class="fc-card-scene" onclick="flipCard()">
      <div class="fc-card ${s.flipped?'fc-flipped':''}">
        <div class="fc-card-face fc-front">
          <div class="fc-face-label">QUESTION</div>
          <div class="fc-face-content">${card.q || '...'}</div>
          <div class="fc-face-hint" style="margin-top:auto;padding-top:16px;font-size:12px;color:var(--text-muted)">
            👆 Cliquer pour retourner
          </div>
        </div>
        <div class="fc-card-face fc-back">
          <div class="fc-face-label">RÉPONSE</div>
          <div class="fc-face-content">${card.a || '...'}</div>
        </div>
      </div>
    </div>

    <!-- Boutons de réponse (visibles après flip) -->
    <div class="fc-answer-btns ${s.flipped?'fc-btns-visible':''}">
      <button class="btn fc-btn-unknown" onclick="answerCard(false)">
        ❌ Je ne savais pas
      </button>
      <button class="btn fc-btn-known" onclick="answerCard(true)">
        ✅ Je savais !
      </button>
    </div>

    <div style="text-align:center;margin-top:12px;font-size:12px;color:var(--text-muted)">
      Barre espace = retourner · ← Non · → Oui
    </div>
  </div>`;
}

function flipCard() {
  if (!fcState.session) return;
  fcState.session.flipped = !fcState.session.flipped;
  const card = document.querySelector('.fc-card');
  if (card) card.classList.toggle('fc-flipped', fcState.session.flipped);
  const btns = document.querySelector('.fc-answer-btns');
  if (btns) btns.classList.toggle('fc-btns-visible', fcState.session.flipped);
  if (fcState.session.flipped) SFX.click?.();
}

function answerCard(knew) {
  const s = fcState.session;
  if (!s || !s.flipped) return;
  const card = s.cards[s.current];
  if (knew) {
    s.known++;
    card.score = (card.score||0) + 1;
  } else {
    s.unknown++;
    card.score = Math.max(0, (card.score||0) - 1);
  }
  SFX.click?.();
  s.current++;
  s.flipped = false;

  if (s.current >= s.cards.length) {
    endStudySession(true);
  } else {
    renderFlashcardsPage();
  }
}

async function endStudySession(completed) {
  const s = fcState.session;
  if (!s) { fcState.view='list'; renderFlashcardsPage(); return; }

  if (completed) {
    const total = s.cards.length;
    const pct = Math.round((s.known / total) * 100);
    const isPerfect = pct === 100;

    // Tokens earned based on performance
    const tokensEarned = isPerfect ? 3 : pct >= 70 ? 2 : pct >= 40 ? 1 : 0;

    // Update deck stats
    const deck = fcState.decks.find(d => d.id === s.deckId);
    if (deck) {
      deck.lastStudied = new Date().toISOString();
      deck.cards = deck.cards.map(orig => {
        const studied = s.cards.find(sc => sc.q === orig.q);
        return studied ? { ...orig, score: studied.score } : orig;
      });
      await saveDeck(deck);
    }

    // Update state
    if (!state.flashcardStats) state.flashcardStats = { decksCompleted:0, perfectDecks:0, tokensEarned:0 };
    state.flashcardStats.decksCompleted++;
    if (isPerfect) state.flashcardStats.perfectDecks++;
    state.flashcardStats.tokensEarned += tokensEarned;
    await saveField('flashcardStats', state.flashcardStats);

    if (tokensEarned > 0) {
      for (let i = 0; i < tokensEarned; i++) await addToken();
      SFX.tokenEarned?.();
    }

    setTimeout(() => checkBadges(), 300);

    // Show results
    showFlashcardResults(s, pct, tokensEarned, isPerfect);
  } else {
    fcState.session = null;
    fcState.view = 'list';
    renderFlashcardsPage();
  }
}

function showFlashcardResults(s, pct, tokensEarned, isPerfect) {
  fcState.session = null;
  const el = document.getElementById('main-content');
  if (!el) { fcState.view='list'; renderFlashcardsPage(); return; }

  const dur = Math.round((Date.now()-s.startTime)/60000);
  el.innerHTML = `
  <div class="fc-results-wrap">
    <div class="fc-results-card">
      <div class="fc-results-emoji">${isPerfect?'🏆':pct>=70?'🎉':pct>=40?'📚':'💪'}</div>
      <div class="fc-results-title">${isPerfect?'Parfait !':pct>=70?'Excellent !':pct>=40?'Bon travail !':'Continue !'}</div>
      <div class="fc-results-sub">${s.deckEmoji} ${s.deckName}</div>

      <div class="fc-results-stats">
        <div class="fc-rs"><div class="fc-rs-val" style="color:#5ee7c4">${pct}%</div><div class="fc-rs-label">Réussite</div></div>
        <div class="fc-rs"><div class="fc-rs-val" style="color:#5ee7c4">${s.known}</div><div class="fc-rs-label">✅ Sus</div></div>
        <div class="fc-rs"><div class="fc-rs-val" style="color:#f87171">${s.unknown}</div><div class="fc-rs-label">❌ Raté</div></div>
        <div class="fc-rs"><div class="fc-rs-val">${dur}min</div><div class="fc-rs-label">⏱ Durée</div></div>
      </div>

      ${tokensEarned > 0 ? `
      <div class="fc-token-reward">
        <span style="font-size:20px">🪙</span>
        <span style="font-weight:800;font-size:18px;color:#facc15">+${tokensEarned} jeton${tokensEarned>1?'s':''}</span>
        <span style="font-size:13px;color:var(--text-muted)">gagnés !</span>
      </div>` : ''}

      <div style="display:flex;gap:10px;margin-top:20px">
        <button class="btn btn-secondary" style="flex:1" onclick="fcGoList()">← Mes decks</button>
        <button class="btn btn-primary" style="flex:1" onclick="startStudyDeck('${s.deckId}')">🔄 Recommencer</button>
      </div>
    </div>
  </div>`;
}

function fcBack() { fcState.view='list'; fcState.editingDeck=null; renderFlashcardsPage(); }
function fcGoList() { fcState.view='list'; renderFlashcardsPage(); }

// ── Raccourcis clavier en mode étude ─────────
function bindStudyEvents() {
  const handler = (e) => {
    if (fcState.view !== 'study') { document.removeEventListener('keydown', handler); return; }
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); flipCard(); }
    else if (e.key === 'ArrowRight') { if (fcState.session?.flipped) answerCard(true); }
    else if (e.key === 'ArrowLeft')  { if (fcState.session?.flipped) answerCard(false); }
  };
  document.addEventListener('keydown', handler);
}
