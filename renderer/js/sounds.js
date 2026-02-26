/* ================================================
   SOUNDS.JS — Système audio interactif
   Sons générés via Web Audio API (pas de fichiers)
   ================================================ */
'use strict';

const SFX = {
  ctx: null,
  enabled: true,
  volume: 0.35,

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) { this.enabled = false; }
  },

  getCtx() {
    if (!this.ctx) this.init();
    if (this.ctx?.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },

  // ── Générateur de base ──────────────────────
  _play(notes, masterVol = 1) {
    if (!this.enabled) return;
    const ctx = this.getCtx();
    if (!ctx) return;
    const vol = this.volume * masterVol;

    notes.forEach(({ freq, start, dur, type = 'sine', gain = 1, slide }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + start);
      if (slide) osc.frequency.linearRampToValueAtTime(slide, now + start + dur);

      gainNode.gain.setValueAtTime(0, now + start);
      gainNode.gain.linearRampToValueAtTime(vol * gain, now + start + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.05);
    });
  },

  // ── Sons spécifiques ───────────────────────
  success() {
    this._play([
      { freq: 440, start: 0,    dur: 0.12, type: 'sine',  gain: 0.8 },
      { freq: 554, start: 0.1,  dur: 0.12, type: 'sine',  gain: 0.8 },
      { freq: 659, start: 0.2,  dur: 0.25, type: 'sine',  gain: 1.0 },
    ]);
  },

  error() {
    this._play([
      { freq: 330, start: 0,    dur: 0.15, type: 'sawtooth', gain: 0.4 },
      { freq: 220, start: 0.14, dur: 0.25, type: 'sawtooth', gain: 0.4 },
    ]);
  },

  click() {
    this._play([
      { freq: 800, start: 0, dur: 0.05, type: 'sine', gain: 0.3 },
    ]);
  },

  notify() {
    this._play([
      { freq: 523, start: 0,    dur: 0.1, type: 'sine', gain: 0.7 },
      { freq: 659, start: 0.1,  dur: 0.2, type: 'sine', gain: 0.7 },
    ]);
  },

  warning() {
    this._play([
      { freq: 440, start: 0,    dur: 0.15, type: 'triangle', gain: 0.6 },
      { freq: 440, start: 0.2,  dur: 0.15, type: 'triangle', gain: 0.6 },
    ]);
  },

  timerStart() {
    this._play([
      { freq: 440, start: 0,   dur: 0.08, type: 'sine', gain: 0.5 },
      { freq: 880, start: 0.1, dur: 0.15, type: 'sine', gain: 0.7 },
    ]);
  },

  timerEnd() {
    this._play([
      { freq: 523, start: 0,    dur: 0.15, type: 'sine', gain: 0.9 },
      { freq: 659, start: 0.15, dur: 0.15, type: 'sine', gain: 0.9 },
      { freq: 784, start: 0.30, dur: 0.15, type: 'sine', gain: 0.9 },
      { freq: 1047,start: 0.45, dur: 0.40, type: 'sine', gain: 1.0 },
    ]);
  },

  tokenEarned() {
    this._play([
      { freq: 1047, start: 0,    dur: 0.08, type: 'sine', gain: 0.6 },
      { freq: 1319, start: 0.1,  dur: 0.15, type: 'sine', gain: 0.7 },
    ]);
  },

  levelUp() {
    this._play([
      { freq: 440,  start: 0,    dur: 0.1, type: 'sine', gain: 0.7 },
      { freq: 554,  start: 0.1,  dur: 0.1, type: 'sine', gain: 0.7 },
      { freq: 659,  start: 0.2,  dur: 0.1, type: 'sine', gain: 0.8 },
      { freq: 880,  start: 0.3,  dur: 0.3, type: 'sine', gain: 1.0 },
    ]);
  },

  publish() {
    // Fanfare de publication
    this._play([
      { freq: 523,  start: 0,    dur: 0.12, type: 'sine', gain: 0.8 },
      { freq: 659,  start: 0.12, dur: 0.12, type: 'sine', gain: 0.8 },
      { freq: 784,  start: 0.24, dur: 0.12, type: 'sine', gain: 0.8 },
      { freq: 1047, start: 0.36, dur: 0.35, type: 'sine', gain: 1.0 },
      { freq: 784,  start: 0.52, dur: 0.12, type: 'sine', gain: 0.6 },
      { freq: 1047, start: 0.64, dur: 0.45, type: 'sine', gain: 1.0 },
    ]);
  },

  ban() {
    this._play([
      { freq: 220, start: 0,    dur: 0.2,  type: 'sawtooth', gain: 0.5 },
      { freq: 165, start: 0.2,  dur: 0.3,  type: 'sawtooth', gain: 0.4, slide: 110 },
    ]);
  },

  delete() {
    this._play([
      { freq: 330, start: 0,   dur: 0.08, type: 'square', gain: 0.3 },
      { freq: 220, start: 0.1, dur: 0.15, type: 'square', gain: 0.3, slide: 110 },
    ]);
  },

  open() {
    this._play([
      { freq: 660, start: 0,    dur: 0.08, type: 'sine', gain: 0.4 },
      { freq: 880, start: 0.08, dur: 0.12, type: 'sine', gain: 0.4 },
    ]);
  },

  close() {
    this._play([
      { freq: 880, start: 0,    dur: 0.08, type: 'sine', gain: 0.3 },
      { freq: 660, start: 0.08, dur: 0.12, type: 'sine', gain: 0.3 },
    ]);
  },

  streak() {
    this._play([
      { freq: 440,  start: 0,    dur: 0.08, type: 'sine', gain: 0.6 },
      { freq: 554,  start: 0.08, dur: 0.08, type: 'sine', gain: 0.6 },
      { freq: 659,  start: 0.16, dur: 0.08, type: 'sine', gain: 0.7 },
      { freq: 880,  start: 0.24, dur: 0.2,  type: 'sine', gain: 0.8 },
      { freq: 1100, start: 0.44, dur: 0.25, type: 'sine', gain: 0.9 },
    ]);
  },

  shopBuy() {
    this._play([
      { freq: 784,  start: 0,    dur: 0.12, type: 'sine', gain: 0.7 },
      { freq: 1047, start: 0.15, dur: 0.25, type: 'sine', gain: 0.9 },
    ]);
  },
};

// ── Init au premier clic utilisateur ──────────
document.addEventListener('click', () => { if (!SFX.ctx) SFX.init(); }, { once: true });
document.addEventListener('keydown', () => { if (!SFX.ctx) SFX.init(); }, { once: true });
