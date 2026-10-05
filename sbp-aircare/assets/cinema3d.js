// SBP AirCare — design D "Cinema": a scroll-scrubbed short film in five chapters — Rev.29 (owner 5 ต.ค. 2569: "ภาพที่สมจริง 5D 4D
// 3D … ยิ่งกว่าระบบ IMAX Theater หรือภาพยนตร์ Cinematic")
//   the camera flies from the street at dusk through the window of a condo bedroom, finds the unit blowing weak air into a warm room,
//   opens the front panel onto a dusty filter and coil, a technician's cleaning sweep washes the dust away, and the room cools.
//   · scroll = the film's timeline (sticky stage, letterbox bars, chapter captions, a scrubber); the camera eases toward the scroll
//     position so motion stays smooth whatever the wheel does
//   · every number on screen comes from the room model the studio uses (studio-model.thermal / stepT / effects): the same condo
//     bedroom, 12,000 BTU, dirty vs cleaned coil, labelled "แบบจำลอง" — no measured or promised result (rules 11, 12)
//   · reduced motion: no scrubbing, one still frame + the chapters as text · no WebGL: a graded poster + the same text
import * as THREE from './three.module.min.js';
import { RoomEnvironment } from './RoomEnvironment.js';
import { track } from './gl-pool.js';
import { whenNear } from './lazy.js';
import { createWisps } from './wisp3d.js';
import { buildLuxRoom } from './luxroom3d.js';
import { h } from './sbp-core.js';
import { SCENE_BY_ID, defaultOrient, thermal, stepT, effects } from './studio-model.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const RM = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// WebGL available? probe once and give the context back at once (it must not count against the gl-pool budget of 3)
const hasGL = () => { try { const c = document.createElement('canvas'), g = c.getContext('webgl2') || c.getContext('webgl'); if (!g) return false; const x = g.getExtension('WEBGL_lose_context'); x && x.loseContext(); return true; } catch (_) { return false; } };

// ---- the room model behind the captions (same formulas as the room studio) ----
const SC = SCENE_BY_ID.condobed;
const P = { ...SC, orient: defaultOrient(SC) };
export const DIRTY = 0.75, CLEAN = 0.05, CAP = 12000;
function curve(dirt, minutes = 30) {
  const th = thermal(P, SC, CAP, dirt, { time: 'day', inverter: true }); let T = 32; const out = [T];
  for (let s = 10; s <= minutes * 60; s += 10) { T = stepT(T, th, 10); if (s % 60 === 0) out.push(T); }
  return out;   // °C at minute 0..30
}
export const CURVE = { dirty: curve(DIRTY), clean: curve(CLEAN) };
const at = (arr, m) => { const i = clamp(m, 0, arr.length - 1), a = Math.floor(i), b = Math.min(arr.length - 1, a + 1); return lerp(arr[a], arr[b], i - a); };
const firstBelow = (arr, T) => { const i = arr.findIndex(x => x <= T); return i < 0 ? null : i; };

export const CHAPTERS = [
  { p: 0, k: 'บทที่ 1', t: '18:30 · กลับถึงห้อง', s: 'ห้องนอนคอนโดหันทิศตะวันออก แดดทั้งวันสะสมความร้อนไว้ในห้อง เปิดประตูเข้ามาเจออากาศ 32°C' },
  { p: 0.24, k: 'บทที่ 2', t: 'ลมเย็นที่อ่อนแรง', s: 'แอร์ 12,000 BTU ทำงานเต็มที่ แต่ลมออกเบา ห้องเย็นช้ากว่าที่ควร' },
  { p: 0.46, k: 'บทที่ 3', t: 'สิ่งที่ซ่อนอยู่ข้างใน', s: 'ฝุ่นสะสมที่แผ่นกรองและครีบคอยล์เย็น ลมผ่านได้น้อยลง ความเย็นที่ส่งออกมาลดลง' },
  { p: 0.62, k: 'บทที่ 4', t: 'ทีมช่างล้างถึงชิ้นส่วน', s: 'ถอดแผ่นกรอง ฉีดล้างคอยล์ โบลเวอร์ และถาดน้ำทิ้ง ตามแบบฟอร์มงานล้างของบริษัท' },
  { p: 0.8, k: 'บทที่ 5', t: 'ลมกลับมา ห้องกลับมาเย็น', s: '' },
];
function chapterText() {
  const d = CURVE.dirty, c = CURVE.clean, td = firstBelow(d, 25.2), tc = firstBelow(c, 25.2);
  CHAPTERS[1].s += ` · แบบจำลอง: 15 นาทีแรกห้องลงมาที่ ${d[15].toFixed(1)}°C`;
  CHAPTERS[4].s = `ลมกลับมาแรงขึ้น ห้องเดียวกันใน 15 นาทีลงมาที่ ${c[15].toFixed(1)}°C · แบบจำลอง: ถึง 25°C ` + (tc != null ? `ราวนาทีที่ ${tc}` : 'ภายหลัง') + (td != null ? ` เทียบกับก่อนล้างราวนาทีที่ ${td}` : ' ขณะที่ก่อนล้างยังไม่ถึงใน 30 นาที') + ' · ตัวเลขจากแบบจำลอง ไม่ใช่ค่าวัดจริง';
}
chapterText();

// camera keyframes: [progress, position, target]
const KEYS = [
  [0, [0.2, 1.7, 7.4], [0, 1.45, 2]],
  [0.13, [0.06, 1.62, 2.7], [0.3, 1.6, 0]],
  [0.22, [0.35, 1.6, 1.35], [0.7, 1.75, -1.5]],
  [0.4, [1.95, 1.55, 1.05], [0.15, 1.45, -1.2]],
  [0.52, [1.3, 2.2, -0.72], [0.9, 2.22, -1.85]],
  [0.66, [0.5, 2.12, -0.86], [0.9, 2.2, -1.85]],
  [0.8, [1.5, 2.0, -0.55], [0.9, 2.15, -1.85]],
  [1, [-1.55, 1.72, 1.72], [0.45, 1.3, -1.2]],
];

function heatFloor(W, D) {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uCool: { value: 0 }, uSrc: { value: new THREE.Vector2(0.9, -0.6) }, uT: { value: 0 }, uOp: { value: 0.3 } },
    vertexShader: 'varying vec2 vP; void main(){ vec4 w = modelMatrix * vec4(position,1.); vP = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `varying vec2 vP; uniform float uCool, uT, uOp; uniform vec2 uSrc;
      void main(){ float d = distance(vP, uSrc); float r = uCool * 4.2; float f = smoothstep(r, r - 1.4, d);
        float wave = 0.85 + 0.15 * sin(d * 6.0 - uT * 1.6);
        vec3 warm = vec3(1.0, 0.56, 0.26), cool = vec3(0.36, 0.78, 1.0);
        gl_FragColor = vec4(mix(warm, cool, f), uOp * wave * (0.55 + 0.45 * (1.0 - smoothstep(0.0, 3.6, d)))); }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mat); m.rotation.x = -Math.PI / 2; m.position.y = 0.012; m.renderOrder = 3; return m;
}

function createFilm(host, o) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(1.75, devicePixelRatio || 1));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const cv = renderer.domElement; cv.setAttribute('aria-hidden', 'true'); cv.style.cssText = 'display:block;width:100%;height:100%';
  host.append(cv);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0b0f1c); scene.fog = new THREE.Fog(0x0b0f1c, 9, 26);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.32; pm.dispose();
  const G = track(renderer, host, { scene, redraw: () => { dirty = true; } });
  const room = buildLuxRoom(scene, { mood: 'dusk' });
  const cam = new THREE.PerspectiveCamera(38, 1, 0.03, 60);
  const pos = new THREE.CatmullRomCurve3(KEYS.map(k => new THREE.Vector3(...k[1])), false, 'centripetal');
  const tgt = new THREE.CatmullRomCurve3(KEYS.map(k => new THREE.Vector3(...k[2])), false, 'centripetal');
  const uOf = q => { let i = 0; while (i < KEYS.length - 2 && q > KEYS[i + 1][0]) i++; const a = KEYS[i][0], b = KEYS[i + 1][0]; const f = clamp((q - a) / (b - a)); return (i + f * f * (3 - 2 * f)) / (KEYS.length - 1); };
  // air, floor temperature, dust, wash mist
  const wisps = createWisps(scene, { max: 2600, additive: false, minPx: 1.2 });
  const floor = heatFloor(room.W, room.D); room.root.add(floor);
  const vent = new THREE.Vector3(); scene.updateMatrixWorld(true); room.vent(vent); floor.material.uniforms.uSrc.value.set(vent.x, vent.z + 1.1);
  const ND = 420, dpos = new Float32Array(ND * 3), dseed = new Float32Array(ND);
  for (let i = 0; i < ND; i++) { dseed[i] = Math.random(); }
  const dgeo = new THREE.BufferGeometry(); dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dust = new THREE.Points(dgeo, new THREE.PointsMaterial({ color: 0xb59a76, size: 0.012, transparent: true, opacity: 0, depthWrite: false })); scene.add(dust);
  const NM = 360, mpos = new Float32Array(NM * 3), mseed = new Float32Array(NM).map(() => Math.random());
  const mgeo = new THREE.BufferGeometry(); mgeo.setAttribute('position', new THREE.BufferAttribute(mpos, 3));
  const mist = new THREE.Points(mgeo, new THREE.PointsMaterial({ color: 0xdff4ff, size: 0.016, transparent: true, opacity: 0, depthWrite: false })); scene.add(mist);
  const U0 = new THREE.Vector3(); room.unitG.getWorldPosition(U0);

  let W = 1, H = 1, q = o.start ?? 0, p = q, t = 0, last = performance.now(), visible = true, dirty = true, raf = 0;
  const size = () => { const r = host.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height); renderer.setSize(W, H, false); cam.aspect = W / H; cam.fov = W / H < 0.9 ? 58 : W / H < 1.3 ? 46 : 38; cam.updateProjectionMatrix(); dirty = true; };
  size(); const ro = new ResizeObserver(size); ro.observe(host);
  const io = new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); if (visible) loop(); }, { rootMargin: '10% 0px' }); io.observe(host);

  function frame(dt) {
    t += dt;
    const P2 = q;
    // camera
    const u = uOf(P2); cam.position.copy(pos.getPoint(u)); const look = tgt.getPoint(u); if (W / H < 0.9) look.x += 0.32 * ss(0.2, 0.4, P2); cam.lookAt(look);   // tall phones: keep the unit in frame
    cam.position.x += Math.sin(t * 0.21) * 0.012; cam.position.y += Math.sin(t * 0.17) * 0.008;   // a hand-held breath
    // story state
    const open = ss(0.47, 0.56, P2) * (1 - ss(0.77, 0.84, P2));
    const wash = ss(0.62, 0.76, P2);
    const dirt = lerp(DIRTY, CLEAN, wash);
    room.open(open); room.setDirt(dirt);
    const air = effects(dirt).air * (P2 < 0.16 ? ss(0.08, 0.16, P2) : 1);
    const cool = P2 < 0.8 ? lerp(0.18, 0.42, ss(0.22, 0.45, P2)) : lerp(0.42, 1, ss(0.8, 0.97, P2));
    floor.material.uniforms.uCool.value = cool; floor.material.uniforms.uT.value = t;
    // grading: warm dusk → cool evening as the room cools
    renderer.toneMappingExposure = lerp(1.05, 0.95, ss(0.8, 1, P2));
    room.lights.warm.intensity = lerp(2.4, 1.4, ss(0.8, 1, P2));
    // airflow: streaks leave the vent forward and down; shorter and fainter while the coil is fouled
    wisps.begin();
    if (air > 0.01) {
      const L = 2.9 * air, n = Math.round(46 * air);
      for (let i = 0; i < n; i++) {
        const sd = (i * 0.6180339) % 1, xo = (sd - 0.5) * 0.74, ph = (t * (0.32 + 0.1 * air) + sd * 3.1) % 1;
        let px = vent.x + xo, py = vent.y, pz = vent.z;
        for (let s = 1; s <= 12; s++) {
          const f = s / 12, x = vent.x + xo * (1 + f * 0.8) + Math.sin(t * 0.9 + sd * 9 + f * 4) * 0.05 * f, y = vent.y - 0.18 * f - 1.05 * f * f * (L / 2.9), z = vent.z + L * f;
          const win = Math.exp(-Math.pow((f - ph) * 3.2, 2));
          const a = 0.26 * air * win * (1 - f * 0.7);
          if (a > 0.01) wisps.seg(px, py, pz, x, y, z, 0.74, 0.9, 1, a, a * 0.85, 0.022 + 0.026 * f);
          px = x; py = y; pz = z;
        }
      }
    }
    wisps.end();
    // dust on the filter / coil face, swept away left → right by the wash
    const dv = ss(0.44, 0.5, P2) * (1 - ss(0.78, 0.82, P2));
    dust.material.opacity = dv * 0.9;
    if (dv > 0.01) {
      const sweep = lerp(-0.5, 0.5, wash);
      for (let i = 0; i < ND; i++) {
        const s = dseed[i], lx = (s - 0.5) * 0.82, gone = lx < sweep ? clamp((sweep - lx) * 4) : 0;
        dpos[i * 3] = U0.x + lx; dpos[i * 3 + 1] = U0.y + 0.02 + ((s * 7.3) % 1 - 0.5) * 0.16 - gone * 0.5 - Math.sin(t + s * 20) * 0.003; dpos[i * 3 + 2] = U0.z + 0.11 + gone * 0.25 + ((s * 3.7) % 1) * 0.02;
      }
      dgeo.attributes.position.needsUpdate = true;
    }
    // wash mist at the sweep line
    const mv = wash > 0 && wash < 1 ? Math.sin(wash * Math.PI) : 0;
    mist.material.opacity = mv * 0.75;
    if (mv > 0.01) {
      const sx = U0.x + lerp(-0.5, 0.5, wash);
      for (let i = 0; i < NM; i++) { const s = mseed[i], k = (t * 1.4 + s) % 1; mpos[i * 3] = sx + (s - 0.5) * 0.08 + k * 0.05; mpos[i * 3 + 1] = U0.y + 0.1 - k * 0.35; mpos[i * 3 + 2] = U0.z + 0.16 + k * 0.08 + ((s * 5.1) % 1) * 0.05; }
      mgeo.attributes.position.needsUpdate = true;
    }
    renderer.render(scene, cam);
    o.onFrame && o.onFrame(P2);
  }
  function loop() {
    cancelAnimationFrame(raf);
    const step = now => {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
      if (!visible) return;
      const k = 1 - Math.exp(-dt * 3.2); const before = q; q += (p - q) * k; if (Math.abs(p - q) < 1e-4) q = p;
      if (o.still) { if (dirty || before !== q) { frame(0); dirty = false; } return; }
      frame(dt); raf = requestAnimationFrame(step);
    };
    last = performance.now(); raf = requestAnimationFrame(step);
  }
  loop();
  return {
    set(v) { p = clamp(v); if (o.still) { q = p; dirty = true; loop(); } },
    jump(v) { p = q = clamp(v); dirty = true; },
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); G.release(); renderer.dispose(); },
  };
}

/** mountCinema(root, { cta }) — root is an empty <section>; builds the film, its captions and the scrubber */
export function mountCinema(root, { cta = null } = {}) {
  if (!root) return null;
  const still = RM();
  const cap = h('div', { class: 'cn-cap', 'aria-live': 'polite' });
  const hudT = h('b', { class: 'cn-temp' }, '32.0°'), hudM = h('small', {}, 'แบบจำลอง · นาทีที่ 0');
  const hud = h('div', { class: 'cn-hud', 'aria-hidden': 'true' }, h('span', {}, 'อุณหภูมิในห้อง'), hudT, hudM, h('i', { class: 'cn-bar' }, h('i')));
  const scrub = h('nav', { class: 'cn-scrub', 'aria-label': 'บทของภาพยนตร์' });
  const stage = h('div', { class: 'cn-cv' });
  const stick = h('div', { class: 'cn-stick' }, stage, h('div', { class: 'cn-grade', 'aria-hidden': 'true' }), h('div', { class: 'cn-grain', 'aria-hidden': 'true' }),
    h('div', { class: 'cn-bars', 'aria-hidden': 'true' }, h('i'), h('i')), cap, hud, scrub, cta ? h('div', { class: 'cn-cta' }, cta) : null,
    h('p', { class: 'cn-note' }, 'ภาพยนตร์จำลองเพื่ออธิบาย · ตัวเลขจากแบบจำลองห้องเดียวกับห้องจำลองบนเว็บ'));
  const trk = h('div', { class: 'cn-track' + (still ? ' still' : '') }, stick);
  const text = h('ol', { class: 'cn-text' }, CHAPTERS.map(c => h('li', {}, h('b', {}, c.k, ' · ', c.t), ' ', c.s)));
  root.append(trk, text);
  let cur = -1, film = null;
  const btns = CHAPTERS.map((c, i) => { const b = h('button', { type: 'button', 'aria-label': `${c.k} ${c.t}`, onclick: () => goTo(c.p + 0.02) }, h('span', {}, String(i + 1).padStart(2, '0')), h('em', {}, c.t), h('i')); scrub.append(b); return b; });
  const showCap = i => { if (i === cur) return; cur = i; const c = CHAPTERS[i]; cap.innerHTML = ''; cap.append(h('p', { class: 'cn-k' }, c.k, h('span', {}, ` / ${CHAPTERS.length}`)), h('h2', {}, c.t), h('p', { class: 'cn-s' }, c.s)); cap.classList.remove('in'); void cap.offsetWidth; cap.classList.add('in'); btns.forEach((b, j) => b.setAttribute('aria-current', j === i ? 'step' : 'false')); };
  const onFrame = q => {
    let i = 0; CHAPTERS.forEach((c, j) => { if (q >= c.p - 0.001) i = j; }); showCap(i);
    btns.forEach((b, j) => { const a = CHAPTERS[j].p, z = (CHAPTERS[j + 1] || { p: 1 }).p; b.style.setProperty('--f', clamp((q - a) / (z - a)).toFixed(3)); });
    // the HUD runs the model clock: dirty unit 0→15 min across chapters 2–3, the cleaned unit 0→15 min in chapter 5 — same window, so the two read side by side
    let T, m, d = false;
    if (q < 0.2) { T = 32; m = 0; d = true; } else if (q < 0.8) { m = Math.round(15 * ss(0.2, 0.46, q)); T = at(CURVE.dirty, 15 * ss(0.2, 0.46, q)); d = true; } else { m = Math.round(15 * ss(0.8, 0.97, q)); T = at(CURVE.clean, 15 * ss(0.8, 0.97, q)); }
    hudT.textContent = T.toFixed(1) + '°'; hudM.textContent = `แบบจำลอง · ${d ? 'ก่อนล้าง' : 'หลังล้าง'} · นาทีที่ ${m}`;
    hud.style.setProperty('--k', clamp((32 - T) / 7).toFixed(3));   // HUD clock: 15 model minutes before and after cleaning (dirty 27.2 vs clean 25.7 °C at minute 15) hud.dataset.state = d ? 'dirty' : 'clean';
  };
  const progress = () => { const r = trk.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - innerHeight)); };
  function goTo(v) { const r = trk.getBoundingClientRect(), top = scrollY + r.top; if (still) { film && film.set(v); onFrame(v); return; } scrollTo({ top: top + v * (r.height - innerHeight), behavior: 'smooth' }); }
  if (!hasGL()) { trk.classList.add('poster'); onFrame(still ? 1 : 0); return { goTo }; }
  onFrame(still ? 0.9 : 0);
  whenNear(stage, () => {
    film = createFilm(stage, { still, start: still ? 0.9 : progress(), onFrame });
    if (still) film.set(0.9);
  }, '60% 0px');
  if (!still) addEventListener('scroll', () => { if (film) film.set(progress()); else onFrame(progress()); }, { passive: true });
  return { goTo, chapters: CHAPTERS, _film: () => film };
}
