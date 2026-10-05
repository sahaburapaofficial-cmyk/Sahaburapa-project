// SBP AirCare — design F "Spatial": a floating glass diorama of a condo bedroom you can turn in your hand, with the room's climate
// running in it — Rev.29 (owner 5 ต.ค. 2569: "ภาพที่สมจริง 5D 4D 3D Visual ต่าง ๆ เหนือคำบรรยาย")
//   dimensions: the room in 3D · time (a simulation clock, 1 s = 1 min) · the air itself (a field of points coloured by temperature:
//   the cold jet, the warm ceiling layer, the sunny window) · sound on request (a soft fan hiss whose level follows the fan; off by
//   default, never autoplays) — the "5D" of the brief, each one tied to something the customer pays for
//   · the climate is the studio's model (studio-model.thermal / stepT / timeToSet) for this room: outdoor air, people, clean or dirty
//     coil, inverter or fixed speed. The field's shape (jet, stratification) is illustrative; the room temperature and the time to
//     25 °C are the model's — both labelled "แบบจำลอง"
//   · hotspots on the unit, the outdoor unit, the window and the bed open short explanations that lead to the right section
import * as THREE from './three.module.min.js';
import { RoomEnvironment } from './RoomEnvironment.js';
import { track } from './gl-pool.js';
import { whenNear } from './lazy.js';
import { buildLuxRoom } from './luxroom3d.js';
import { buildOutdoor, materialSet } from './ac3d.js';
import { tempColor } from './airflow3d.js';
import { h, $, baht } from './sbp-core.js';
import { cleanFrom } from './quickclean.js';
import { SCENE_BY_ID, defaultOrient, thermal, stepT, timeToSet, steadyT, needBtu, STD_SIZES, effects, T_SET } from './studio-model.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const RM = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// WebGL available? probe once and give the context back at once (it must not count against the gl-pool budget of 3)
const hasGL = () => { try { const c = document.createElement('canvas'), g = c.getContext('webgl2') || c.getContext('webgl'); if (!g) return false; const x = g.getExtension('WEBGL_lose_context'); x && x.loseContext(); return true; } catch (_) { return false; } };
const W = 4.6, D = 4.0, HH = 2.8;   // the diorama room (m)

// ---- the room model ----
const SC0 = SCENE_BY_ID.bedroom;
export function makeClimate(s) {
  const SC = { ...SC0, w: W, d: D, h: HH };
  const p = { ...SC, orient: defaultOrient(SC), people: s.people };
  const cap = STD_SIZES.find(x => x >= needBtu({ ...p, people: SC.people }, SC)) || 12000;
  const th = thermal(p, SC, cap, s.dirt, { time: 'day', inverter: s.inv });
  th.tout = s.out;
  return { th, cap, t25: timeToSet({ ...th }, s.start ?? 32, 120), steady: steadyT(th) };
}

const HOTS = [
  { id: 'unit', th: 'คอยล์เย็น', go: 'book', text: () => `ฝุ่นที่แผ่นกรองและครีบคอยล์ทำให้ลมผ่านน้อยลง ลองสลับ "คอยล์สกปรก" แล้วดูว่าห้องเย็นช้าลงเท่าไร · ล้างแอร์เริ่ม ${baht(cleanFrom() || 0)} ต่อเครื่อง ก่อน VAT`, cta: 'จองล้างแอร์' },
  { id: 'cdu', th: 'คอยล์ร้อน', go: 'cleanflow', text: () => 'ระบายความร้อนที่ดึงออกจากห้องทิ้งนอกอาคาร ถ้าครีบอุดตันหรือติดในที่อับลม เครื่องทำงานหนักขึ้น ทีมล้างคอยล์ร้อนทุกครั้งที่ล้างแอร์', cta: 'ดูขั้นตอนล้าง' },
  { id: 'win', th: 'หน้าต่างและแดด', go: 'studio', text: () => 'แดดผ่านกระจกเป็นภาระความร้อนส่วนใหญ่ของห้องหันทิศตะวันออกหรือตะวันตก เป็นหนึ่งในค่าที่ใช้คำนวณ BTU ของห้อง', cta: 'คำนวณ BTU ห้องของคุณ' },
  { id: 'bed', th: 'คนในห้อง', go: 'studio', text: () => 'คนที่เพิ่มขึ้นแต่ละคนเพิ่มความร้อนราว 600 BTU ตามสูตรเดียวกับห้องจำลอง ลองเพิ่มจำนวนคนแล้วดูเวลาเย็นของห้อง', cta: 'ดูห้องจำลอง 48 ห้อง' },
];

function createDiorama(host, labels, o) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(1.75, devicePixelRatio || 1));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const cv = renderer.domElement; cv.setAttribute('aria-hidden', 'true'); cv.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y';
  host.append(cv);
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.55; pm.dispose();
  const G = track(renderer, host, { scene });
  // the diorama: the room on a glass plinth, a balcony ledge with the outdoor unit
  const dio = new THREE.Group(); scene.add(dio);
  const room = buildLuxRoom(dio, { mood: 'day', facade: false, open: true, W, D, H: HH });
  const plinthM = new THREE.MeshPhysicalMaterial({ color: 0xdfe9ff, roughness: 0.08, metalness: 0, transmission: 0.6, thickness: 0.4, transparent: true, opacity: 0.55, clearcoat: 1 });
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.75, 0.3, 96), plinthM); plinth.position.y = -0.16; dio.add(plinth);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.68, 0.012, 8, 160), new THREE.MeshBasicMaterial({ color: 0x8fe9ff, transparent: true, opacity: 0.8 })); ring.rotation.x = Math.PI / 2; ring.position.y = -0.005; dio.add(ring);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 1.0), new THREE.MeshStandardMaterial({ color: 0xc9c4bb, roughness: 0.9 })); slab.position.set(W / 2 - 0.75, 0.0, D / 2 + 0.75); dio.add(slab);
  const OU = buildOutdoor(materialSet('studio'), { logo: true }); const ou = new THREE.Group(); ou.add(OU.root); OU.root.visible = true;
  ou.position.set(W / 2 - 0.75, 0.36, D / 2 + 0.75); ou.rotation.y = -0.35; dio.add(ou);
  dio.position.y = -0.9;
  // the air: a field of points coloured by temperature
  const NX = 16, NY = 7, NZ = 14, N = NX * NY * NZ;
  const fp = new Float32Array(N * 3), fc = new Float32Array(N * 3), cell = [];
  for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) for (let k = 0; k < NZ; k++) { const x = -W / 2 + (i + 0.5) * W / NX, y = 0.15 + (j + 0.5) * (HH - 0.3) / NY, z = -D / 2 + (k + 0.5) * D / NZ; cell.push([x, y, z, Math.random() * 6.28]); }
  const fgeo = new THREE.BufferGeometry(); fgeo.setAttribute('position', new THREE.BufferAttribute(fp, 3)); fgeo.setAttribute('color', new THREE.BufferAttribute(fc, 3));
  const fieldM = new THREE.PointsMaterial({ size: 0.2, vertexColors: true, transparent: true, opacity: 0.62, depthWrite: false, sizeAttenuation: true, map: dotTex(), alphaTest: 0.02, toneMapped: false });
  const field = new THREE.Points(fgeo, fieldM); dio.add(field);
  scene.updateMatrixWorld(true);
  const vent = room.vent(new THREE.Vector3()); dio.worldToLocal(vent);
  // anchors for the HTML pins (local to the diorama)
  const anchors = { unit: vent.clone().add(new THREE.Vector3(0, 0.12, 0)), cdu: new THREE.Vector3(W / 2 - 0.75, 0.78, D / 2 + 0.75), win: new THREE.Vector3(W / 2 - 0.05, 1.5, 0.1), bed: new THREE.Vector3(-0.6, 0.75, -D / 2 + 1.2) };
  const cam = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
  const orb = { th: -0.62, ph: 1.02, r: 12.5, tth: -0.62, user: 0 };
  let Wd = 1, Hd = 1, t = 0, last = performance.now(), visible = true, raf = 0;
  const size = () => { const r = host.getBoundingClientRect(); Wd = Math.max(1, r.width); Hd = Math.max(1, r.height); renderer.setSize(Wd, Hd, false); cam.aspect = Wd / Hd; orb.r = Wd / Hd < 0.9 ? 17 : Wd / Hd < 1.3 ? 14.5 : 12.5; cam.updateProjectionMatrix(); };
  size(); const ro = new ResizeObserver(size); ro.observe(host);
  const io = new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); if (visible) loop(); }, { rootMargin: '10% 0px' }); io.observe(host);
  // drag to turn (horizontal on touch so the page still scrolls)
  let drag = null;
  cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, th: orb.tth, ph: orb.ph }; orb.user = performance.now(); });
  addEventListener('pointerup', () => { drag = null; });
  addEventListener('pointermove', e => { if (!drag) return; orb.tth = clamp(drag.th - (e.clientX - drag.x) * 0.006, -1.45, 0.3); if (e.pointerType === 'mouse') orb.ph = clamp(drag.ph - (e.clientY - drag.y) * 0.004, 0.62, 1.32); orb.user = performance.now(); });
  const v = new THREE.Vector3(), col = [0, 0, 0];
  function paintField(S) {
    const Troom = S.T, run = S.running, air = effects(S.dirt).air, sup = run ? Troom - 11 * air : Troom;
    for (let n = 0; n < N; n++) {
      const [x, y, z, ph] = cell[n];
      // stratification (warm ceiling), the sunny window side, and the cold jet leaving the vent forward and down
      let T = Troom + (y - 1.2) * 0.9 + clamp((x - 1.2) / 1.2) * 1.2;
      if (run) {
        const dz = z - vent.z; if (dz > -0.05) {
          const s = dz / (3.0 * air), yj = vent.y - 0.2 * s - 1.2 * s * s, xj = vent.x;
          const d2 = (x - xj) ** 2 * 0.8 + (y - yj) ** 2 * 2.2;
          T = lerp(T, sup + 2.2 * s, Math.exp(-d2 / (0.18 + 0.25 * s)) * clamp(1.2 - s) );
        }
      }
      tempColor(T, col);
      fc[n * 3] = col[0]; fc[n * 3 + 1] = col[1]; fc[n * 3 + 2] = col[2];
      const jitter = RM() ? 0 : 0.03;
      fp[n * 3] = x + Math.sin(t * 0.7 + ph) * jitter; fp[n * 3 + 1] = y + Math.cos(t * 0.5 + ph) * jitter; fp[n * 3 + 2] = z + (run ? ((t * 0.25 * air + ph) % 1) * 0.06 : 0);
    }
    fgeo.attributes.color.needsUpdate = true; fgeo.attributes.position.needsUpdate = true;
  }
  function frame(dt) {
    t += dt;
    if (!RM() && performance.now() - orb.user > 4000) orb.tth += (-0.62 + Math.sin(t * 0.12) * 0.45 - orb.tth) * 0.01;
    orb.th += (orb.tth - orb.th) * Math.min(1, dt * 6);
    cam.position.set(Math.sin(orb.th) * Math.sin(orb.ph) * orb.r, Math.cos(orb.ph) * orb.r + 0.3, Math.cos(orb.th) * Math.sin(orb.ph) * orb.r);
    cam.lookAt(0.2, 0.1, 0.3);
    dio.position.y = -0.9 + (RM() ? 0 : Math.sin(t * 0.6) * 0.04);   // the diorama floats
    ring.material.opacity = 0.55 + Math.sin(t * 1.4) * 0.2;
    const S = o.state(); room.setDirt(S.dirt);
    OU.parts && OU.parts['o-fan'] && S.running && (OU.parts['o-fan'].rotation.z -= dt * 14);
    paintField(S);
    renderer.render(scene, cam);
    // pins
    dio.updateMatrixWorld();
    for (const k in anchors) {
      const el = labels[k]; if (!el) continue;
      v.copy(anchors[k]).applyMatrix4(dio.matrixWorld).project(cam);
      el.style.transform = `translate(${((v.x + 1) / 2 * Wd).toFixed(1)}px,${((1 - v.y) / 2 * Hd).toFixed(1)}px)`; el.classList.toggle('on', v.z < 1);
    }
  }
  function loop() {
    cancelAnimationFrame(raf);
    const step = now => { const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; if (!visible) return; o.tick && o.tick(dt); frame(dt); raf = requestAnimationFrame(step); };
    last = performance.now(); raf = requestAnimationFrame(step);
  }
  loop();
  return { dispose() { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); G.release(); renderer.dispose(); } };
}
function dotTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t;
}

/* ---- the fan's sound (5th dimension): brown noise through a low-pass, level ∝ fan; created only on the visitor's click ---- */
function fanSound() {
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  const ctx = new AC(), len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  let lastV = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; lastV = (lastV + 0.02 * w) / 1.02; d[i] = lastV * 3.2; }
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
  const g = ctx.createGain(); g.gain.value = 0; src.connect(lp).connect(g).connect(ctx.destination); src.start();
  return { level(v) { g.gain.setTargetAtTime(v * 0.12, ctx.currentTime, 0.3); lp.frequency.setTargetAtTime(500 + v * 900, ctx.currentTime, 0.3); }, close() { try { ctx.close(); } catch (_) {} } };
}

/** mountSpatial(root, { go }) — the diorama, its hotspots, and the climate lab beside it */
export function mountSpatial(root, { go = () => {} } = {}) {
  if (!root) return null;
  const S = { out: 35, people: 2, dirt: 0.05, inv: true, running: true, playing: !RM(), m: 0, T: 32, hist: [32] };
  let C = makeClimate(S);
  const stage = h('div', { class: 'sp-cv' }), pins = h('div', { class: 'sp-pins' });
  const info = h('div', { class: 'sp-info', 'aria-live': 'polite' }, h('p', { class: 'sp-k' }, 'แตะจุดเรืองแสงในห้อง'), h('p', {}, 'ดูว่าแต่ละส่วนของห้องเกี่ยวกับความเย็นและค่าใช้จ่ายอย่างไร'));
  const labels = {};
  HOTS.forEach(x => { const b = h('button', { type: 'button', class: 'sp-pin', 'aria-label': x.th, onclick: () => pick(x) }, h('span', {}, x.th)); labels[x.id] = b; pins.append(b); });
  function pick(x) { Object.values(labels).forEach(b => b.classList.toggle('sel', b === labels[x.id])); info.innerHTML = ''; info.append(h('p', { class: 'sp-k' }, x.th), h('p', {}, x.text()), h('button', { type: 'button', class: 'btn-ghost', onclick: () => go(x.go) }, x.cta)); }
  // climate lab
  const big = h('b', { class: 'sp-T' }), sub = h('small', {}), t25 = h('p', { class: 'sp-t25' });
  const chart = h('div', { class: 'sp-chart', 'aria-hidden': 'true' });
  const rng = (lab, min, max, step, key, fmt) => { const out = h('b', {}, fmt(S[key])); const i = h('input', { type: 'range', min, max, step, value: S[key], 'aria-label': lab }); i.addEventListener('input', () => { S[key] = Number(i.value); out.textContent = fmt(S[key]); recompute(); }); return h('label', { class: 'sp-rng' }, h('span', {}, lab, out), i); };
  const tog = (lab, key, a, b) => { const btn = h('button', { type: 'button', 'aria-pressed': String(S[key] === a) }, lab); btn.addEventListener('click', () => { S[key] = S[key] === a ? b : a; btn.setAttribute('aria-pressed', String(S[key] === a)); recompute(); }); return btn; };
  const playB = h('button', { type: 'button', class: 'sp-play', 'aria-pressed': String(S.playing) }, S.playing ? 'หยุดเวลา' : 'เดินเวลา');
  playB.addEventListener('click', () => { S.playing = !S.playing; playB.setAttribute('aria-pressed', String(S.playing)); playB.textContent = S.playing ? 'หยุดเวลา' : 'เดินเวลา'; });
  const resetB = h('button', { type: 'button', class: 'btn-ghost', onclick: () => { S.m = 0; S.T = 32; S.hist = [32]; C = makeClimate(S); draw(); } }, 'เริ่มใหม่จาก 32°C');
  let snd = null; const sndB = h('button', { type: 'button', 'aria-pressed': 'false' }, 'เสียงลม');
  sndB.addEventListener('click', () => { if (snd) { snd.close(); snd = null; sndB.setAttribute('aria-pressed', 'false'); } else { snd = fanSound(); sndB.setAttribute('aria-pressed', String(!!snd)); } });
  const lab = h('div', { class: 'sp-lab' },
    h('div', { class: 'sp-read' }, h('div', {}, h('small', {}, 'ในห้อง (แบบจำลอง)'), big, sub), chart, t25),
    h('div', { class: 'sp-ctl' }, rng('อากาศนอกบ้าน', 29, 38, 0.5, 'out', v => v + '°C'), rng('คนในห้อง', 1, 6, 1, 'people', v => v + ' คน'),
      h('div', { class: 'sp-tg' }, tog('คอยล์สกปรก', 'dirt', 0.85, 0.05), tog('Inverter', 'inv', true, false), tog('เปิดแอร์', 'running', true, false), sndB)),
    h('div', { class: 'sp-run' }, playB, resetB),
    h('p', { class: 'sp-fine' }, 'แบบจำลองเพื่ออธิบาย · 1 วินาที = 2 นาที · อุณหภูมิห้องและเวลาถึง 25°C คำนวณด้วยสูตรเดียวกับห้องจำลองบนเว็บ สีของอากาศเป็นภาพประกอบ ไม่ใช่ค่าวัดจริง'));
  const scale = h('div', { class: 'sp-scale', 'aria-hidden': 'true' }, h('span', {}, '13°C'), h('i'), h('span', {}, '34°C'));
  root.append(h('div', { class: 'sp-wrap' }, h('div', { class: 'sp-stage' }, stage, pins, scale, info), lab));
  function recompute() { C = makeClimate(S); draw(); }
  function draw() {
    big.textContent = S.T.toFixed(1) + '°C'; sub.textContent = `นาทีที่ ${Math.floor(S.m)} · แอร์ ${C.cap.toLocaleString('en-US')} BTU ${S.inv ? 'Inverter' : 'Fixed speed'}`;
    t25.textContent = !S.running ? 'ปิดแอร์: ห้องอุ่นขึ้นตามความร้อนที่เข้ามา' : C.t25 != null ? `จาก 32°C ถึง ${T_SET}°C ราว ${Math.round(C.t25)} นาที` + (S.dirt > 0.5 ? ' (คอยล์สกปรก)' : '') : `ทำได้ต่ำสุดราว ${C.steady.toFixed(1)}°C ในสภาพนี้`;
    const pts = S.hist.map((T, i) => `${(i / 90 * 300).toFixed(1)},${(110 - (T - 22) / 12 * 110).toFixed(1)}`).join(' ');
    chart.innerHTML = `<svg viewBox="0 0 300 110" preserveAspectRatio="none"><line x1="0" x2="300" y1="${110 - (T_SET - 22) / 12 * 110}" y2="${110 - (T_SET - 22) / 12 * 110}" class="sp-set"/><polyline points="${pts}" class="sp-line"/></svg>`;
    root.style.setProperty('--sp-k', clamp((S.T - 22) / 12).toFixed(3));
    snd && snd.level(S.running ? effects(S.dirt).air : 0);
  }
  const tick = dt => {
    if (!S.playing) return;
    if (!(dt > 0)) return; const before = Math.floor(S.m); const secs = dt * 120; const th = C.th;
    let T = S.T; if (S.running) { for (let s = 0; s < secs; s += 10) T = stepT(T, th, Math.min(10, secs - s)); } else { const load = 0.78 * (th.Qi + th.UA * (th.tout - T)); T += load / th.C * secs; }
    S.T = clamp(T, 18, 40); S.m += dt * 2;
    if (Math.floor(S.m) !== before) { S.hist.push(S.T); if (S.m >= 90) { S.m = 0; S.T = 32; S.hist = [32]; } draw(); }
  };
  draw();
  if (!hasGL()) { root.classList.add('sp-nogl'); stage.append(h('p', { class: 'sp-fb' }, 'อุปกรณ์นี้เปิดภาพ 3 มิติไม่ได้ ห้องทดลองด้านข้างยังใช้งานได้ครบ')); let l = performance.now(); setInterval(() => { const n = performance.now(); tick(Math.min(0.5, (n - l) / 1000)); l = n; }, 250); return { state: S }; }
  whenNear(stage, () => createDiorama(stage, labels, { state: () => S, tick }), '50% 0px');
  return { state: S, pick: id => pick(HOTS.find(x => x.id === id)) };
}
