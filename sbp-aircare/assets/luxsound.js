// SBP AirCare — sound for the second website (D · E · F) — Rev.32 (owner 5 ต.ค. 2569: "พัฒนา D E F ให้ดีที่สุด แสง สี เสียงต่าง ๆ
// motion movement")
//   · everything is synthesised with WebAudio — no audio files, nothing downloaded, no voice, no music licence
//   · silent until the visitor presses the "เสียง" button in the header (never autoplays); the choice is kept for this tab only
//     (sessionStorage) and a remembered "on" waits for the visitor's next tap before it starts, as browsers require
//   · three layers: a bed per design (D cinematic drone · E quiet room tone · F holodeck hum) · the air leaving the unit (filtered
//     noise whose level follows the airflow the scene reports — a dirty coil sounds weaker) · short cues (chapter whoosh, scan
//     sweep, target lock, wash, the resolve chime, a soft tick on choices)
//   · the bed and the air drop when the hero scene is off screen (focus) and everything stops while the tab is hidden
//   · reduced motion: cues and air only, no moving bed
const RM = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const KEY = 'sbp-lux-sound';
let ctx = null, master = null, bedG = null, airG = null, airF = null, noiseBuf = null, bedKind = 'cinema', bedNodes = [];
let on = false, focus = 1, airLevel = 0, lastAir = -1;
const subs = new Set();
const remembered = () => { try { return sessionStorage.getItem(KEY) === '1'; } catch (_) { return false; } };
const remember = v => { try { sessionStorage.setItem(KEY, v ? '1' : '0'); } catch (_) {} };

function noise() {
  if (noiseBuf) return noiseBuf;
  const len = ctx.sampleRate * 2; noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate); const d = noiseBuf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;   // pink-ish (Paul Kellet's economy filter) — softer than white noise
  for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.11; }
  return noiseBuf;
}
const src = () => { const s = ctx.createBufferSource(); s.buffer = noise(); s.loop = true; s.start(); return s; };
const osc = (type, f) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.start(); return o; };
const gain = v => { const g = ctx.createGain(); g.gain.value = v; return g; };
const filt = (type, f, q = 0.7) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };

function start() {
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
  if (!ctx) {
    ctx = new AC();
    master = gain(0); master.connect(ctx.destination);
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4; comp.connect(master);
    bedG = gain(0); bedG.connect(comp);
    // the air: pink noise through a band-pass — level and brightness follow the airflow
    airF = filt('bandpass', 700, 0.55); airG = gain(0); src().connect(airF).connect(airG).connect(comp);
    master.comp = comp;
    buildBed();
    document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else if (on) ctx.resume(); });
  }
  ctx.resume();
  master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.25);
  levels();
  return true;
}
function buildBed() {
  bedNodes.forEach(n => { try { n.stop && n.stop(); n.disconnect(); } catch (_) {} }); bedNodes = [];
  if (!ctx) return;
  const out = gain(1); out.connect(bedG); bedNodes.push(out);
  const lfo = (rate, depth, target) => { const l = osc('sine', rate), g = gain(depth); l.connect(g).connect(target); bedNodes.push(l, g); };
  if (bedKind === 'cinema') {          // D: a low, slowly breathing drone under the film
    const lp = filt('lowpass', 260, 0.8); lp.connect(out);
    [55, 55.35, 82.4].forEach((f, i) => { const o = osc(i < 2 ? 'sawtooth' : 'triangle', f), g = gain(i < 2 ? 0.16 : 0.1); o.connect(g).connect(lp); bedNodes.push(o, g); });
    if (!RM()) lfo(0.06, 90, lp.frequency);
    bedNodes.push(lp);
  } else if (bedKind === 'room') {     // E: the room itself — soft broadband tone, a touch of warmth
    const lp = filt('lowpass', 420, 0.5), g = gain(0.5); src().connect(lp).connect(g).connect(out);
    const o = osc('sine', 110), og = gain(0.04); o.connect(og).connect(out);
    bedNodes.push(lp, g, o, og);
  } else {                             // F: holodeck hum — two close tones beating, a faint high shimmer
    const lp = filt('lowpass', 900, 0.6); lp.connect(out);
    [60, 120.6, 180.2].forEach((f, i) => { const o = osc('sine', f), g = gain([0.22, 0.12, 0.05][i]); o.connect(g).connect(lp); bedNodes.push(o, g); });
    const sh = osc('sine', 1760), shg = gain(0.006); sh.connect(shg).connect(out); bedNodes.push(sh, shg, lp);
    if (!RM()) lfo(0.18, 300, lp.frequency);
  }
}
function levels() {
  if (!ctx) return;
  const t = ctx.currentTime;
  bedG.gain.setTargetAtTime(on ? (RM() ? 0 : 0.11 * (0.3 + 0.7 * focus)) : 0, t, 0.6);
  airG.gain.setTargetAtTime(on ? 0.09 * airLevel * focus : 0, t, 0.35);
  airF.frequency.setTargetAtTime(380 + 900 * airLevel, t, 0.4);
}
function env(node, peak, a, d, t0 = ctx.currentTime) { node.gain.setValueAtTime(0, t0); node.gain.linearRampToValueAtTime(peak, t0 + a); node.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d); }

const CUES = {
  whoosh() { const s = ctx.createBufferSource(); s.buffer = noise(); const b = filt('bandpass', 300, 1.2), g = gain(0); s.connect(b).connect(g).connect(master.comp); const t = ctx.currentTime; b.frequency.setValueAtTime(260, t); b.frequency.exponentialRampToValueAtTime(2600, t + 0.55); env(g, 0.5, 0.18, 0.6); s.start(t); s.stop(t + 1); },
  scan() { const o = ctx.createOscillator(), g = gain(0), lp = filt('lowpass', 2400); o.type = 'triangle'; const t = ctx.currentTime; o.frequency.setValueAtTime(320, t); o.frequency.exponentialRampToValueAtTime(1500, t + 0.9); o.connect(lp).connect(g).connect(master.comp); env(g, 0.08, 0.05, 0.95); o.start(t); o.stop(t + 1.1);
    for (let i = 0; i < 5; i++) { const k = ctx.createOscillator(), kg = gain(0); k.frequency.value = 2400 + i * 180; k.connect(kg).connect(master.comp); env(kg, 0.025, 0.004, 0.05, t + 0.12 + i * 0.16); k.start(t + 0.1 + i * 0.16); k.stop(t + 0.3 + i * 0.16); } },
  lock() { const t = ctx.currentTime; [880, 1320].forEach((f, i) => { const o = osc('sine', f), g = gain(0); o.connect(g).connect(master.comp); env(g, 0.06, 0.006, 0.18, t + i * 0.09); o.stop(t + 0.5); }); },
  wash() { const s = ctx.createBufferSource(); s.buffer = noise(); const h = filt('highpass', 1800, 0.5), g = gain(0); s.connect(h).connect(g).connect(master.comp); const t = ctx.currentTime; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.22, t + 0.25); g.gain.setTargetAtTime(0.0001, t + 1.2, 0.35); s.start(t); s.stop(t + 3); },
  chime() { const t = ctx.currentTime; [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => { const o = osc('sine', f), o2 = osc('sine', f * 2.01), g = gain(0), g2 = gain(0.25); o.connect(g); o2.connect(g2).connect(g); g.connect(master.comp); env(g, 0.06, 0.01, 2.2, t + i * 0.11); o.stop(t + 3); o2.stop(t + 3); }); },
  tick() { const o = osc('sine', 1250), g = gain(0); o.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.04); o.connect(g).connect(master.comp); env(g, 0.035, 0.003, 0.06); o.stop(ctx.currentTime + 0.12); },
  on() { const t = ctx.currentTime; [440, 660, 990].forEach((f, i) => { const o = osc('sine', f), g = gain(0); o.connect(g).connect(master.comp); env(g, 0.045, 0.01, 0.25, t + i * 0.07); o.stop(t + 0.6); }); },
};

export const sound = {
  get on() { return on; },
  /** which bed this page uses: 'cinema' (D) · 'room' (E) · 'holo' (F) */
  bed(kind) { if (kind === bedKind) return; bedKind = kind; if (ctx) buildBed(); },
  /** 0..1 airflow leaving the unit (0 = off / out of view) */
  air(level) { level = Math.max(0, Math.min(1, level || 0)); if (Math.abs(level - lastAir) < 0.015) return; lastAir = airLevel = level; levels(); },
  /** 1 while the design's hero scene is on screen, 0 when the visitor reads further down */
  focus(v) { v = v ? 1 : 0; if (v === focus) return; focus = v; levels(); },
  cue(name) { if (!on || !ctx || !CUES[name] || ctx.state !== 'running') return; try { CUES[name](); } catch (_) {} },
  set(v) {
    v = !!v; if (v === on) return on;
    if (v && !start()) return false;
    on = v; remember(v); levels();
    if (on) CUES.on(); else if (ctx) { master.gain.setTargetAtTime(0, ctx.currentTime, 0.2); setTimeout(() => { if (!on && ctx) ctx.suspend(); }, 900); }
    subs.forEach(f => f(on)); return on;
  },
  subscribe(f) { subs.add(f); f(on); return () => subs.delete(f); },
};

/** the header button: speaker icon + "เสียง", aria-pressed; a remembered "on" resumes at the visitor's next tap */
export function soundButton(kind) {
  sound.bed(kind);
  const b = document.createElement('button'); b.type = 'button'; b.className = 'lx-snd';
  b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path class="w1" d="M16 9.5a3.5 3.5 0 0 1 0 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path class="w2" d="M18.5 7a7 7 0 0 1 0 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path class="x" d="M16.5 9.5l5 5m0-5l-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span>เสียง</span>';
  b.setAttribute('aria-label', 'เปิดเสียงประกอบ (สังเคราะห์ในเครื่อง ไม่มีการดาวน์โหลด)');
  b.addEventListener('click', () => { sound.set(!sound.on); });
  sound.subscribe(v => { b.setAttribute('aria-pressed', String(v)); b.setAttribute('aria-label', v ? 'ปิดเสียงประกอบ' : 'เปิดเสียงประกอบ (สังเคราะห์ในเครื่อง ไม่มีการดาวน์โหลด)'); });
  if (remembered()) { const go = e => { if (e.target.closest && e.target.closest('.lx-snd')) return; removeEventListener('pointerdown', go, true); sound.set(true); }; addEventListener('pointerdown', go, true); }
  return b;
}
