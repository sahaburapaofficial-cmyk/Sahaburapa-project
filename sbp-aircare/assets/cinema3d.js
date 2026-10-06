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
import { whenNear, whenQuiet } from './lazy.js';
import { createWisps } from './wisp3d.js';
import { buildLuxRoom } from './luxroom3d.js';
import { h } from './sbp-core.js';
import { SCENE_BY_ID, defaultOrient, thermal, stepT, effects } from './studio-model.js';
import { sound } from './luxsound.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const RM = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// WebGL available? probe once and give the context back at once (it must not count against the gl-pool budget of 3)
// Rev.30 smooth: no probe context (creating one cost ~1 s on slow GPUs) — the API's presence decides; a failed renderer falls back below
const hasGL = () => typeof WebGLRenderingContext !== 'undefined';

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
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;   // Rev.30 smooth: shadows redraw only when something in the room moves
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
  // ★Rev.32 light: cooled air lights the room — a cool fill from the outlet grows once the coil is clean; a soft glow at the outlet follows the airflow
  const coolL = new THREE.PointLight(0x8fe3ff, 0, 5.5, 1.8); coolL.position.copy(vent).add(new THREE.Vector3(0, -0.4, 0.7)); scene.add(coolL);
  const gc = document.createElement('canvas'); gc.width = gc.height = 64; { const g = gc.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); }
  const glowS = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gc), color: 0x9fe9ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  glowS.scale.set(1.3, 0.42, 1); glowS.position.copy(vent).add(new THREE.Vector3(0, -0.06, 0.14)); scene.add(glowS);
  // ★Rev.31 holographic scan (chapter 3): a light sheet sweeps the unit and a grid lights its front — the "look inside" moment
  const scanM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uA: { value: 0 }, uT: { value: 0 } },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'varying vec2 vU; uniform float uA, uT; void main(){ float e = smoothstep(0.0,0.25,vU.y)*smoothstep(1.0,0.75,vU.y); float l = 0.55 + 0.45*sin(vU.y*80.0 - uT*6.0); gl_FragColor = vec4(vec3(0.39,0.9,1.0)*l, uA*e*0.55); }' });
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.5), scanM); sheet.rotation.y = Math.PI / 2; sheet.position.set(U0.x, U0.y, U0.z + 0.12); scene.add(sheet);
  const gridM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uA: { value: 0 }, uX: { value: -1 } },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'varying vec2 vU; uniform float uA, uX; void main(){ vec2 g = abs(fract(vU*vec2(46.,14.))-0.5); float line = 1.0 - smoothstep(0.0, 0.06, min(g.x, g.y)); float seen = smoothstep(uX+0.02, uX-0.02, vU.x); float edge = exp(-pow((vU.x-uX)*30.0,2.0)); gl_FragColor = vec4(vec3(0.39,0.9,1.0), uA*(line*0.35*seen + edge*0.6)); }' });
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(0.94, 0.33), gridM); grid.position.set(U0.x, U0.y + 0.01, U0.z + 0.16); scene.add(grid);
  const proj = new THREE.Vector3();

  let W = 1, H = 1, q = o.start ?? 0, p = q, t = 0, last = performance.now(), visible = true, dirty = true, raf = 0, lastSet = 0, odd = false, lastOpen = -1, lastShadow = -9;
  let sw = 0, sh = 0, spr = 0;   // Rev.30 smooth: GL buffers are reallocated only when the size really changed
  const size = () => { const r = host.getBoundingClientRect(); W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height)); if (W === sw && H === sh && renderer.getPixelRatio() === spr) return; sw = W; sh = H; spr = renderer.getPixelRatio(); renderer.setSize(W, H, false); cam.aspect = W / H; cam.fov = W / H < 0.9 ? 58 : W / H < 1.3 ? 46 : 38; cam.updateProjectionMatrix(); dirty = true; };
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
    if (Math.abs(open - lastOpen) > 1e-4 || t - lastShadow > 3) { renderer.shadowMap.needsUpdate = true; lastOpen = open; lastShadow = t; }
    const air = effects(dirt).air * (P2 < 0.16 ? ss(0.08, 0.16, P2) : 1);
    const cool = P2 < 0.8 ? lerp(0.18, 0.42, ss(0.22, 0.45, P2)) : lerp(0.42, 1, ss(0.8, 0.97, P2));
    floor.material.uniforms.uCool.value = cool; floor.material.uniforms.uT.value = t;
    // grading: warm dusk → cool evening as the room cools
    renderer.toneMappingExposure = lerp(1.05, 0.95, ss(0.8, 1, P2));
    room.lights.warm.intensity = lerp(2.4, 1.4, ss(0.8, 1, P2));
    coolL.intensity = 1.8 * ss(0.8, 0.97, P2) + 0.25 * ss(0.2, 0.3, P2) * (1 - ss(0.46, 0.5, P2));
    glowS.material.opacity = 0.42 * air * (0.35 + 0.65 * cool);
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
    // scan: 0.44 → 0.56 the sheet sweeps left → right, the grid stays lit while the panel is open, dust found turns cyan
    const sc = ss(0.44, 0.56, P2), scanOn = P2 > 0.43 && P2 < 0.8 ? 1 - ss(0.74, 0.8, P2) : 0;
    scanM.uniforms.uA.value = sc > 0 && sc < 1 ? 1 : 0; scanM.uniforms.uT.value = t; sheet.position.x = U0.x - 0.48 + 0.96 * sc;
    gridM.uniforms.uA.value = scanOn; gridM.uniforms.uX.value = sc;
    dust.material.color.setHex(sc > 0.98 && wash < 0.02 ? 0x63e6ff : 0xb59a76);
    renderer.render(scene, cam);
    proj.copy(U0).project(cam);
    o.onFrame && o.onFrame(P2, { x: (proj.x + 1) / 2 * W, y: (1 - proj.y) / 2 * H, vis: proj.z < 1, air: effects(dirt).air, dirt, wash, scan: sc, W, H });
  }
  function loop() {
    cancelAnimationFrame(raf);
    const step = now => {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
      if (!visible) return;
      const k = 1 - Math.exp(-dt * 4.6); const before = q; q += (p - q) * k; if (Math.abs(p - q) < 1e-4) q = p;
      if (o.still) { if (dirty || before !== q) { frame(0); dirty = false; } return; }
      // Rev.30: while the visitor is not scrolling (camera settled), draw every other frame — the air keeps moving, the GPU does half the work
      const idle = Math.abs(p - q) < 1e-3 && performance.now() - lastSet > 1200;
      if (!idle || (odd = !odd)) { frame(idle ? dt * 2 : dt); perf(idle ? dt : dt); }
      raf = requestAnimationFrame(step);
    };
    last = performance.now(); raf = requestAnimationFrame(step);
  }
  // Rev.30 smooth: frames slower than ~30 fps for 2 s in a row → render at 1× pixel ratio (then 0.75×) — motion before sharpness
  let slow = 0, tier = 0;
  const perf = dt => { if (dt <= 0) return; slow = dt > 0.034 ? slow + dt : Math.max(0, slow - dt * 0.5); if (slow > 2 && tier < 2) { tier++; slow = 0; renderer.setPixelRatio(tier === 1 ? 1 : 0.75); size(); } };
  loop();
  return {
    set(v) { p = clamp(v); lastSet = performance.now(); if (o.still) { q = p; dirty = true; loop(); } },
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
  // ★Rev.31.1 HUD chart (model minutes 0–15 · 24–32 °C): dirty coil (heat) vs cleaned coil (cyan), same room, same window
  const CW = 200, CH = 58, cx = m => 4 + m / 15 * (CW - 8), cy = T => 4 + (32 - clamp(T, 24, 32)) / 8 * (CH - 8);
  const path = arr => arr.slice(0, 16).map((T, i) => `${i ? 'L' : 'M'}${cx(i).toFixed(1)} ${cy(T).toFixed(1)}`).join('');
  const chart = h('div', { class: 'cn-chart', 'aria-hidden': 'true', html: `<svg viewBox="0 0 ${CW} ${CH}"><path class="g" d="M4 ${cy(25)}H${CW - 4}"/><path class="d" d="${path(CURVE.dirty)}"/><path class="c" d="${path(CURVE.clean)}"/><line class="cur" y1="2" y2="${CH - 2}"/><circle r="3.6"/><text x="${CW - 4}" y="${cy(25) - 4}">25°</text></svg><p><i class="d"></i>ก่อนล้าง ${CURVE.dirty[15].toFixed(1)}° <i class="c"></i>หลังล้าง ${CURVE.clean[15].toFixed(1)}° <small>นาทีที่ 15</small></p>` });
  const dot = chart.querySelector('circle'), cursor = chart.querySelector('line.cur');
  const hud = h('div', { class: 'cn-hud', 'aria-hidden': 'true' }, h('span', {}, 'อุณหภูมิในห้อง'), hudT, hudM, h('i', { class: 'cn-bar' }, h('i')), chart);
  const scrub = h('nav', { class: 'cn-scrub', 'aria-label': 'บทของภาพยนตร์' });
  const stage = h('div', { class: 'cn-cv' });
  const skip = h('button', { type: 'button', class: 'cn-skip', onclick: () => { const n = root.nextElementSibling && root.nextElementSibling.querySelector('section[id]'); const t = n || root.nextElementSibling; if (t) { const de = document.documentElement, y = t.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(de).getPropertyValue('--hdr')) || 64), sb = de.style.scrollBehavior; de.style.scrollBehavior = 'auto'; scrollTo(0, y); de.style.scrollBehavior = sb; } } }, 'ข้ามภาพยนตร์');   // Rev.30: customers who came to book do not sit through the film · ★Rev.33 a real jump: behavior 'auto' followed the page's CSS smooth scrolling, so the skip played the whole film (every chapter cue) on the way down — or barely moved on a busy phone
  // ★Rev.31 HUD: corner frame, a reticle locked on the unit, telemetry from the room model (labelled as a model)
  const retLbl = h('span', {}, 'คอยล์เย็น · 12,000 BTU');
  const ret = h('div', { class: 'cn-ret', 'aria-hidden': 'true' }, h('i'), retLbl);
  const telA = h('b', {}, '—'), telD = h('b', {}, '—'), telS = h('b', {}, '—');
  const tel = h('dl', { class: 'cn-tel', 'aria-hidden': 'true' }, h('dt', {}, 'ลมออก'), h('dd', {}, telA, h('i', { class: 'cn-telbar' }, h('i'))), h('dt', {}, 'ฝุ่นที่คอยล์'), h('dd', {}, telD, h('i', { class: 'cn-telbar w' }, h('i'))), h('dt', {}, 'สถานะ'), h('dd', {}, telS), h('small', {}, 'แบบจำลอง'));
  const frameHud = h('div', { class: 'cn-frame', 'aria-hidden': 'true' });
  const leak = h('div', { class: 'cn-leak', 'aria-hidden': 'true' });   // ★Rev.32 light leak swept across on each new chapter
  const stick = h('div', { class: 'cn-stick', 'data-ch': '0' }, stage, h('div', { class: 'cn-tint', 'aria-hidden': 'true' }), leak, frameHud, ret, tel, skip, h('div', { class: 'cn-grade', 'aria-hidden': 'true' }), h('div', { class: 'cn-grain', 'aria-hidden': 'true' }),
    h('div', { class: 'cn-bars', 'aria-hidden': 'true' }, h('i'), h('i')), cap, hud, scrub, cta ? h('div', { class: 'cn-cta' }, cta) : null,
    h('p', { class: 'cn-note' }, 'ภาพยนตร์จำลองเพื่ออธิบาย · ตัวเลขจากแบบจำลองห้องเดียวกับห้องจำลองบนเว็บ'));
  const trk = h('div', { class: 'cn-track' + (still ? ' still' : '') }, stick);
  // ★Rev.32 holographic depth: the HUD layers drift a few pixels against the pointer (mouse only, motion allowed)
  if (!still && matchMedia('(hover:hover) and (pointer:fine)').matches) { let pend = false, px = 0, py = 0; stick.addEventListener('pointermove', e => { const r = stick.getBoundingClientRect(); px = (e.clientX - r.left) / r.width - 0.5; py = (e.clientY - r.top) / r.height - 0.5; if (pend) return; pend = true; requestAnimationFrame(() => { pend = false; stick.style.setProperty('--px', px.toFixed(3)); stick.style.setProperty('--py', py.toFixed(3)); }); }, { passive: true }); }
  // the film's sound only while the film is on screen (the bed drops, the air stops when the visitor reads on)
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { const v = es.some(e => e.isIntersecting); sound.focus(v); if (!v) sound.air(0); }, { threshold: 0.25 }).observe(trk);
  const text = h('ol', { class: 'cn-text' }, CHAPTERS.map(c => h('li', {}, h('b', {}, c.k, ' · ', c.t), ' ', c.s)));
  root.append(trk, text);
  let cur = -1, film = null;
  const btns = CHAPTERS.map((c, i) => { const b = h('button', { type: 'button', 'aria-label': `${c.k} ${c.t}`, onclick: () => goTo(c.p + 0.02) }, h('span', {}, String(i + 1).padStart(2, '0')), h('em', {}, c.t), h('i')); scrub.append(b); return b; });
  let cueS = false, cueL = false, cueW = false;   // ★Rev.32 sound cues fire once per pass
  const showCap = i => { if (i === cur) return; if (cur >= 0) { sound.cue(i === CHAPTERS.length - 1 && i > cur ? 'chime' : 'whoosh'); if (!still) { leak.classList.remove('go'); void leak.offsetWidth; leak.classList.add('go'); } } cur = i; stick.dataset.ch = String(i); const c = CHAPTERS[i]; cap.innerHTML = ''; cap.append(h('p', { class: 'cn-k' }, c.k, h('span', {}, ` / ${CHAPTERS.length}`)), h('h2', {}, c.t), h('p', { class: 'cn-s' }, c.s)); cap.classList.remove('in'); void cap.offsetWidth; cap.classList.add('in'); btns.forEach((b, j) => b.setAttribute('aria-current', j === i ? 'step' : 'false')); };
  const onFrame = (q, f) => {
    if (f) {
      // the reticle shows only while the unit sits well inside the frame (not under the letterbox, the captions or the read-outs)
      const on = f.vis && q > 0.2 && q < 0.86 && f.x > 90 && f.x < f.W - 90 && f.y > 120 && f.y < f.H - 220;
      ret.classList.toggle('on', on); if (on) ret.style.transform = `translate(${f.x.toFixed(1)}px,${f.y.toFixed(1)}px)`;
      ret.classList.toggle('flip', f.x > f.W - 340);
      ret.classList.toggle('lock', f.scan > 0.98 && f.wash < 0.98);
      // ★Rev.32 sound: the scan sweep, the lock, the wash, and the air leaving the unit (weaker before cleaning)
      if (f.scan > 0.03 && !cueS) { cueS = true; sound.cue('scan'); } else if (f.scan < 0.01) cueS = false;
      if (f.scan > 0.98 && f.wash < 0.02 && !cueL) { cueL = true; sound.cue('lock'); } else if (f.scan < 0.9) cueL = false;
      if (f.wash > 0.02 && f.wash < 0.9 && !cueW) { cueW = true; sound.cue('wash'); } else if (f.wash < 0.01) cueW = false;
      sound.air(q > 0.13 ? f.air : 0);
      retLbl.textContent = f.scan > 0.98 && f.wash < 0.02 ? 'พบฝุ่นที่แผ่นกรองและคอยล์' : f.wash > 0 && f.wash < 1 ? 'กำลังล้าง' : 'คอยล์เย็น · 12,000 BTU';
      telA.textContent = Math.round(f.air * 100) + ' %'; telD.textContent = Math.round(f.dirt * 100) + ' %';
      tel.style.setProperty('--a', f.air.toFixed(3)); tel.style.setProperty('--d', f.dirt.toFixed(3));
      telS.textContent = f.wash >= 1 ? 'หลังล้าง' : f.wash > 0 ? 'กำลังล้าง' : 'ก่อนล้าง';
    }
    let i = 0; CHAPTERS.forEach((c, j) => { if (q >= c.p - 0.001) i = j; }); showCap(i);
    btns.forEach((b, j) => { const a = CHAPTERS[j].p, z = (CHAPTERS[j + 1] || { p: 1 }).p; b.style.setProperty('--f', clamp((q - a) / (z - a)).toFixed(3)); });
    // the HUD runs the model clock: dirty unit 0→15 min across chapters 2–3, the cleaned unit 0→15 min in chapter 5 — same window, so the two read side by side
    let T, m, d = false;
    if (q < 0.2) { T = 32; m = 0; d = true; } else if (q < 0.8) { m = Math.round(15 * ss(0.2, 0.46, q)); T = at(CURVE.dirty, 15 * ss(0.2, 0.46, q)); d = true; } else { m = Math.round(15 * ss(0.8, 0.97, q)); T = at(CURVE.clean, 15 * ss(0.8, 0.97, q)); }
    hudT.textContent = T.toFixed(1) + '°'; hudM.textContent = `แบบจำลอง · ${d ? 'ก่อนล้าง' : 'หลังล้าง'} · นาทีที่ ${m}`;
    hud.style.setProperty('--k', clamp((32 - T) / 7).toFixed(3)); hud.dataset.state = d ? 'dirty' : 'clean';   // HUD clock: 15 model minutes before and after cleaning (dirty 27.2 vs clean 25.7 °C at minute 15) · Rev.31.1: the state assignment used to sit inside this comment
    // ★Rev.31.1 HUD chart: both 15-minute curves of the model, the playhead rides the one being shown
    const mm = q < 0.2 ? 0 : q < 0.8 ? 15 * ss(0.2, 0.46, q) : 15 * ss(0.8, 0.97, q);
    dot.setAttribute('cx', cx(mm).toFixed(1)); dot.setAttribute('cy', cy(T).toFixed(1)); dot.setAttribute('class', d ? 'd' : 'c');
    cursor.setAttribute('x1', cx(mm).toFixed(1)); cursor.setAttribute('x2', cx(mm).toFixed(1));
  };
  const progress = () => { const r = trk.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - innerHeight)); };
  function goTo(v) { const r = trk.getBoundingClientRect(), top = scrollY + r.top; if (still) { film && film.set(v); onFrame(v); return; } scrollTo({ top: top + v * (r.height - innerHeight), behavior: 'smooth' }); }
  if (!hasGL()) { trk.classList.add('poster'); onFrame(still ? 1 : 0); return { goTo }; }
  onFrame(still ? 0.9 : 0);
  // Rev.35 smooth: the film is built once the page has settled (first paint, menus, first taps answer at once) — the graded
  // poster and the chapter captions are already on screen meanwhile
  whenNear(stage, () => whenQuiet(() => {
    try { film = createFilm(stage, { still, start: still ? 0.9 : progress(), onFrame }); } catch (e) { trk.classList.add('poster'); stage.innerHTML = ''; return; }
    if (still) film.set(0.9);
  }, 220, 2500), '60% 0px');
  if (!still) addEventListener('scroll', () => { if (film) film.set(progress()); else onFrame(progress()); }, { passive: true });
  return { goTo, chapters: CHAPTERS, _film: () => film };
}
