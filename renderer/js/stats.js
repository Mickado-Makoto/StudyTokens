/* ================================================
   STATS.JS — Statistiques personnelles
   Graphiques, records, analyse des sessions
   StudyTokens © 2025
   ================================================ */
'use strict';

// ── Rendu de la page stats ────────────────────
function renderStatsPage() {
  const sessions = state.sessions || [];
  if (sessions.length === 0) {
    return `
    <div class="page-header">
      <h1 class="page-title">📊 Statistiques</h1>
      <p class="page-subtitle">Tes données d'étude en un coup d'oeil</p>
    </div>
    <div class="page-card" style="text-align:center;padding:48px 24px">
      <div style="font-size:48px;margin-bottom:12px">📭</div>
      <div style="font-size:16px;font-weight:700;margin-bottom:6px">Aucune session enregistrée</div>
      <div style="font-size:13px;color:var(--text-muted)">Lance ton premier timer pour voir tes stats apparaître ici !</div>
    </div>`;
  }

  const range = window._statsRange || '7';
  return `
  <div class="page-header">
    <div class="page-title-row" style="justify-content:space-between;flex-wrap:wrap;gap:10px">
      <h1 class="page-title">📊 Statistiques</h1>
      <div class="stats-range-tabs">
        ${[['7','7 jours'],['30','30 jours'],['all','Tout']].map(([v,l]) =>
          `<button class="srt-btn ${range===v?'active':''}" onclick="setStatsRange('${v}')">${l}</button>`
        ).join('')}
      </div>
    </div>
    <p class="page-subtitle">Tes données personnelles d'étude</p>
  </div>
  ${renderStatsSummary(sessions, range)}
  ${renderStatsChart(sessions, range)}
  ${renderSubjectBreakdown(sessions, range)}
  ${renderRecords(sessions)}
  ${renderGoalsSection()}`;
}

function setStatsRange(r) {
  window._statsRange = r;
  navigate('stats');
}

// ── Résumé chiffres clés ─────────────────────
function renderStatsSummary(sessions, range) {
  const filtered = filterByRange(sessions, range);
  const totalMins = filtered.reduce((a, s) => a + (s.minutes||0), 0);
  const totalTokens = filtered.reduce((a, s) => a + (s.tokensEarned||0), 0);
  const avgMins = filtered.length > 0 ? Math.round(totalMins / filtered.length) : 0;
  const bestDay = getBestDay(filtered);
  const h = Math.floor(totalMins/60), m = totalMins%60;

  const cards = [
    { icon:'⏱️', val: h>0?`${h}h${m>0?m+'m':''}`:m+'min', label:'Temps total',    accent:'var(--accent)' },
    { icon:'📋', val: filtered.length,   label:'Sessions',        accent:'#c084fc' },
    { icon:'🪙', val: totalTokens,        label:'Jetons gagnés',   accent:'#facc15' },
    { icon:'📈', val: avgMins+'min',       label:'Session moyenne', accent:'#5ee7c4' },
    { icon:'🔥', val: state.streak+'j',    label:'Streak actuel',   accent:'#f97316' },
    { icon:'🏆', val: bestDay.mins>0?bestDay.mins+'min':'—', label:'Meilleur jour', accent:'#a78bfa' },
  ];

  return `
  <div class="stats-summary-grid">
    ${cards.map(c => `
    <div class="stat-card">
      <div class="stat-card-icon" style="color:${c.accent}">${c.icon}</div>
      <div class="stat-card-val" style="color:${c.accent}">${c.val}</div>
      <div class="stat-card-label">${c.label}</div>
    </div>`).join('')}
  </div>`;
}

// ── Graphique activité (barres SVG) ──────────
function renderStatsChart(sessions, range) {
  const days = range === 'all' ? 30 : parseInt(range);
  const buckets = [];
  for (let i = days-1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate()-i);
    const key = d.toISOString().split('T')[0];
    const daySessions = sessions.filter(s => s.date?.startsWith(key));
    const mins = daySessions.reduce((a,s) => a+(s.minutes||0), 0);
    buckets.push({ key, mins, label: i===0?'Auj':i===1?'Hier':d.toLocaleDateString('fr-FR',{weekday:'short',day:'numeric'}) });
  }
  const maxMins = Math.max(...buckets.map(b=>b.mins), 1);
  const barW = Math.max(8, Math.min(36, Math.floor(560 / days) - 4));

  return `
  <div class="page-card">
    <div class="card-header-row">
      <div class="card-label">ACTIVITÉ QUOTIDIENNE</div>
      <div class="card-label-right">${days} derniers jours</div>
    </div>
    <div class="stats-chart-wrap">
      <svg class="stats-chart" viewBox="0 0 580 140" preserveAspectRatio="xMidYMid meet">
        <!-- Grid lines -->
        ${[0.25,0.5,0.75,1].map(f => `
          <line x1="0" y1="${120-f*100}" x2="580" y2="${120-f*100}"
            stroke="rgba(99,179,237,.08)" stroke-width="1"/>
          <text x="0" y="${120-f*100-3}" fill="rgba(120,140,180,.5)" font-size="8">${Math.round(maxMins*f)}m</text>
        `).join('')}
        <!-- Bars -->
        ${buckets.map((b, i) => {
          const x = 8 + i * (580-16) / days;
          const barH = b.mins > 0 ? Math.max(4, Math.round((b.mins/maxMins)*100)) : 0;
          const y = 120 - barH;
          const today = b.key === new Date().toISOString().split('T')[0];
          return `
          <rect x="${x}" y="${y}" width="${barW}" height="${barH}"
            rx="3" fill="${today?'var(--accent)':'rgba(99,179,237,.35)'}"/>
          ${i % Math.ceil(days/10) === 0 ? `<text x="${x+barW/2}" y="135" text-anchor="middle" fill="rgba(120,140,180,.5)" font-size="7.5">${b.label.split(' ')[0]}</text>` : ''}
          ${b.mins > 0 && barH > 12 ? `<text x="${x+barW/2}" y="${y-3}" text-anchor="middle" fill="rgba(200,220,255,.7)" font-size="7">${b.mins}</text>` : ''}`;
        }).join('')}
        <!-- Baseline -->
        <line x1="0" y1="120" x2="580" y2="120" stroke="rgba(99,179,237,.2)" stroke-width="1"/>
      </svg>
    </div>
  </div>`;
}

// ── Répartition par matière ───────────────────
function renderSubjectBreakdown(sessions, range) {
  const filtered = filterByRange(sessions, range);
  if (filtered.length === 0) return '';
  const bySubject = {};
  filtered.forEach(s => {
    const sub = s.subject || 'Général';
    if (!bySubject[sub]) bySubject[sub] = { mins:0, count:0 };
    bySubject[sub].mins  += s.minutes||0;
    bySubject[sub].count += 1;
  });
  const sorted = Object.entries(bySubject).sort((a,b) => b[1].mins - a[1].mins).slice(0,8);
  const total = sorted.reduce((a,[,v]) => a+v.mins, 0);
  const colors = ['var(--accent)','#c084fc','#5ee7c4','#f97316','#facc15','#f87171','#a78bfa','#34d399'];

  return `
  <div class="page-card">
    <div class="card-label">RÉPARTITION PAR MATIÈRE</div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
      ${sorted.map(([sub, d], i) => {
        const pct = total > 0 ? Math.round((d.mins/total)*100) : 0;
        const h = Math.floor(d.mins/60), m = d.mins%60;
        return `
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:10px;height:10px;border-radius:50%;background:${colors[i]};flex-shrink:0"></div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <span style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${sub}</span>
              <span style="font-size:12px;color:var(--text-muted);flex-shrink:0;margin-left:8px">${h>0?h+'h':''} ${m>0?m+'m':''} · ${d.count} session${d.count>1?'s':''}</span>
            </div>
            <div class="goal-bar" style="height:6px">
              <div class="goal-bar-fill" style="width:${pct}%;background:${colors[i]}"></div>
            </div>
          </div>
          <span style="font-size:12px;color:var(--text-muted);width:36px;text-align:right;flex-shrink:0">${pct}%</span>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

// ── Records personnels ────────────────────────
function renderRecords(sessions) {
  if (sessions.length === 0) return '';
  const longestSession = sessions.reduce((a,b) => (b.minutes||0)>(a.minutes||0)?b:a, sessions[0]);
  const bestStreak = state.streak;

  // Meilleur jour
  const byDay = {};
  sessions.forEach(s => {
    const d = s.date?.split('T')[0];
    if (!d) return;
    byDay[d] = (byDay[d]||0) + (s.minutes||0);
  });
  const bestDayEntry = Object.entries(byDay).sort((a,b)=>b[1]-a[1])[0];
  const bestDayMins = bestDayEntry ? bestDayEntry[1] : 0;
  const bestDayDate = bestDayEntry ? new Date(bestDayEntry[0]).toLocaleDateString('fr-FR',{day:'numeric',month:'short'}) : '—';

  // Activité récente (7 derniers jours)
  const activeDays = new Set(sessions.filter(s => {
    if (!s.date) return false;
    const d = new Date(s.date);
    return (Date.now()-d.getTime()) < 7*86400000;
  }).map(s => s.date?.split('T')[0])).size;

  const records = [
    { icon:'🏆', label:'Session la plus longue', val:`${longestSession.minutes} min`, sub:longestSession.subject },
    { icon:'📅', label:'Meilleur jour', val:`${bestDayMins} min`, sub:bestDayDate },
    { icon:'🔥', label:'Meilleure série', val:`${bestStreak} jours`, sub:'streak actuel' },
    { icon:'📆', label:'Jours actifs (7j)', val:`${activeDays}/7`, sub:'dernière semaine' },
    { icon:'⭐', label:'Total lifetime', val:`${state.lifetimeTokens} 🪙`, sub:`${Math.floor(state.totalMinutes/60)}h de travail` },
    { icon:'🎯', label:'Série d\'objectifs', val:`${goalState.goalStreak} jours`, sub:'objectif quotidien' },
  ];

  return `
  <div class="page-card">
    <div class="card-label">RECORDS PERSONNELS</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-top:12px">
      ${records.map(r => `
      <div class="record-card">
        <span class="record-icon">${r.icon}</span>
        <div class="record-val">${r.val}</div>
        <div class="record-label">${r.label}</div>
        <div class="record-sub">${r.sub}</div>
      </div>`).join('')}
    </div>
  </div>`;
}

// ── Helpers ───────────────────────────────────
function filterByRange(sessions, range) {
  if (range === 'all') return sessions;
  const days = parseInt(range) || 7;
  const cutoff = Date.now() - days * 86400000;
  return sessions.filter(s => s.date && new Date(s.date).getTime() >= cutoff);
}

function getBestDay(sessions) {
  const byDay = {};
  sessions.forEach(s => {
    const d = s.date?.split('T')[0];
    if (d) byDay[d] = (byDay[d]||0) + (s.minutes||0);
  });
  const best = Object.values(byDay).sort((a,b)=>b-a)[0] || 0;
  return { mins: best };
}
