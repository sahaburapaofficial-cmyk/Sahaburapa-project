// SBP AirCare — design F "Spatial": a floating glass diorama of a condo bedroom you can turn in your hand, with the room's climate
// running in it — Rev.29 (owner 5 ต.ค. 2569: "ภาพที่สมจริง 5D 4D 3D Visual ต่าง ๆ เหนือคำบรรยาย")
//   dimensions: the room in 3D · time (a simulation clock, 1 s = 1 min) · the air itself (a field of points coloured by temperature:
//   the cold jet, the warm ceiling layer, the sunny window) · sound on request (a soft fan hiss whose level follows the fan; off by
//   default, never autoplays) — the "5D" of the brief, each one tied to something the customer pays for
//   · the climate is the studio's model (studio-model.thermal / stepT / timeToSet) for this room: outdoor air, people, clean or dirty
//     coil, inverter or fixed speed. The field's shape (jet, stratification) is illustrative; the room temperature and the time to
//     25 °C are the model's — both labelled "แบบจำลอง"
//   · hotspots on the unit, the outdoor unit, the window and the bed open short explanations that lead to the right section
//   · Rev.31 (owner: "D E F ต้องล้ำสมัย technology high tech และเสมือนจริงในโลกอนาคต") holodeck: the room is projected from an
//     emitter pad on a grid floor — a light cone up to the glass plinth, cyan edges where the walls would be, a scan plane that
//     rises through the room and lights up the air it passes, dusk light inside. Decoration only: no number comes from it
import * as THREE from './three.module.min.js';
import { RoomEnvironment } from './RoomEnvironment.js';
import { track } from './gl-pool.js';
import { whenNear, whenQuiet } from './lazy.js';
import { buildLuxRoom } from './luxroom3d.js';
import { buildOutdoor, materialSet } from './ac3d.js';
import { tempColor } from './airflow3d.js';
import { h, $, baht } from './sbp-core.js';
import { cleanFrom } from './quickclean.js';
import { sound } from './luxsound.js';
import { SCENE_BY_ID, defaultOrient, thermal, stepT, timeToSet, steadyT, needBtu, STD_SIZES, effects, T_SET } from './studio-model.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const RM = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// WebGL available? probe once and give the context back at once (it must not count against the gl-pool budget of 3)
// Rev.30 smooth: no probe context (creating one cost ~1 s on slow GPUs) — the API's presence decides; a failed renderer falls back below
const hasGL = () => typeof WebGLRenderingContext !== 'undefined';
const W = 4.6, D = 4.0, HH = 2.8;   // the diorama room (m)

// ---- the room model ----
const SC0 = SCENE_BY_ID.bedroom;
export function makeClimate(s) {
  const SC = { ...SC0, w: W, d: D, h: HH };
  const p = { ...SC, orient: defaultOrient(SC), people: s.people };
  const cap = STD_SIZES.find(x => x >= needBtu({ ...p, people: SC.people }, SC)) || 12000;
  const th = thermal(p, SC, cap, s.dirt, { time: 'day', inverter: s.inv });
  th.tout = s.out;
  return { th, cap, need: needBtu(p, SC), t25: timeToSet({ ...th }, s.start ?? 32, 120), steady: steadyT(th) };
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
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.18; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;   // Rev.30 smooth: the room is still — shadows drawn once (and after a quality upgrade)
  const cv = renderer.domElement; cv.setAttribute('aria-hidden', 'true'); cv.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y';
  host.append(cv);
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.55; pm.dispose();
  const G = track(renderer, host, { scene });
  // the diorama: the room on a glass plinth, a balcony ledge with the outdoor unit
  const dio = new THREE.Group(); scene.add(dio);
  const room = buildLuxRoom(dio, { mood: 'dusk', facade: false, open: true, W, D, H: HH });
  const plinthM = new THREE.MeshPhysicalMaterial({ color: 0x0c1838, roughness: 0.12, metalness: 0.2, transparent: true, opacity: 0.72, clearcoat: 1, depthWrite: false, emissive: 0x0a1a44, emissiveIntensity: 0.6 });   // Rev.30: no transmission (it re-rendered the whole scene every frame)
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.75, 0.3, 96), plinthM); plinth.position.y = -0.16; dio.add(plinth);
  const ADD = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false };
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.68, 0.014, 8, 160), new THREE.MeshBasicMaterial({ color: 0x4df3ff, opacity: 0.8, ...ADD })); ring.rotation.x = Math.PI / 2; ring.position.y = -0.005; dio.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(3.76, 0.01, 8, 160), new THREE.MeshBasicMaterial({ color: 0x9a8cff, opacity: 0.6, ...ADD })); ring2.rotation.x = Math.PI / 2; ring2.position.y = -0.31; dio.add(ring2);
  const polar = new THREE.PolarGridHelper(3.56, 24, 5, 96, 0x2c5fa8, 0x1b2f63); polar.position.y = -0.004; polar.material.transparent = true; polar.material.opacity = 0.55; polar.material.depthWrite = false; dio.add(polar);
  // Rev.31 holodeck: grid floor + emitter pad + light cone + room edges + scan plane (all additive, no shadows, no extra pass)
  scene.fog = new THREE.FogExp2(0x050816, 0.03);
  const FLOOR = -3.3;
  const grid = new THREE.GridHelper(48, 96, 0x4df3ff, 0x1f3478); grid.material.transparent = true; grid.material.opacity = 0.42; grid.material.depthWrite = false; grid.position.y = FLOOR; scene.add(grid);
  const pad = new THREE.Mesh(new THREE.CircleGeometry(1.5, 64), new THREE.MeshBasicMaterial({ map: glowTex('rgba(77,243,255,1)', 'rgba(154,140,255,.35)'), opacity: 0.9, ...ADD })); pad.rotation.x = -Math.PI / 2; pad.position.y = FLOOR + 0.01; scene.add(pad);
  const padRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 0.95, 96), new THREE.MeshBasicMaterial({ color: 0x4df3ff, opacity: 0.85, side: THREE.DoubleSide, ...ADD })); padRing.rotation.x = -Math.PI / 2; padRing.position.y = FLOOR + 0.012; scene.add(padRing);
  const beamTop = -0.9 - 0.31, beamH = beamTop - FLOOR, streak = beamTex();
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(3.55, 0.92, beamH, 72, 1, true), new THREE.MeshBasicMaterial({ map: streak, alphaMap: fadeTex(), color: 0x7fe9ff, opacity: 0.42, side: THREE.DoubleSide, ...ADD }));
  beam.position.y = FLOOR + beamH / 2; scene.add(beam);
  const edgeM = new THREE.LineBasicMaterial({ color: 0x4df3ff, opacity: 0.55, ...ADD });
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W + 0.04, HH, D + 0.04)), edgeM); edges.position.y = HH / 2; dio.add(edges);
  // corner ticks at the top of the room — the "measured" frame of the hologram
  const tickPts = []; [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => { const x = sx * (W / 2 + 0.02), z = sz * (D / 2 + 0.02); tickPts.push(x, HH + 0.02, z, x - sx * 0.45, HH + 0.02, z, x, HH + 0.02, z, x, HH + 0.02, z - sz * 0.45, x, HH + 0.02, z, x, HH - 0.43, z); });
  const ticks = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(tickPts, 3)), new THREE.LineBasicMaterial({ color: 0xc9fbff, opacity: 0.95, ...ADD })); dio.add(ticks);
  const scan = new THREE.Group(); dio.add(scan);
  // ★Rev.31.1 heat map on the floor: the air field's lowest-but-one layer, smoothed by the texture filter, redrawn ~4×/s while shown
  const hmC = document.createElement('canvas'); hmC.width = 16; hmC.height = 14; const hmG = hmC.getContext('2d'), hmI = hmG.createImageData(16, 14);
  const hmT = new THREE.CanvasTexture(hmC); hmT.magFilter = THREE.LinearFilter; hmT.minFilter = THREE.LinearFilter; hmT.colorSpace = THREE.SRGBColorSpace;
  const heat = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.1, D - 0.1), new THREE.MeshBasicMaterial({ map: hmT, transparent: true, opacity: 0.0, depthWrite: false, toneMapped: false }));
  heat.rotation.x = -Math.PI / 2; heat.position.y = 0.035; heat.renderOrder = 2; dio.add(heat);
  let scanT0 = 0, lastHeat = -1;
  const scanPlane = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshBasicMaterial({ color: 0x4df3ff, opacity: 0.07, side: THREE.DoubleSide, ...ADD })); scanPlane.rotation.x = -Math.PI / 2; scan.add(scanPlane);
  const scanEdge = new THREE.LineLoop(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([-W / 2, 0, -D / 2, W / 2, 0, -D / 2, W / 2, 0, D / 2, -W / 2, 0, D / 2], 3)), new THREE.LineBasicMaterial({ color: 0x9ff6ff, opacity: 0.9, ...ADD })); scan.add(scanEdge);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 1.0), new THREE.MeshStandardMaterial({ color: 0xc9c4bb, roughness: 0.9 })); slab.position.set(W / 2 - 0.75, 0.0, D / 2 + 0.75); dio.add(slab);
  const OU = buildOutdoor(materialSet('studio'), { logo: true }); const ou = new THREE.Group(); ou.add(OU.root); OU.root.visible = true;
  ou.position.set(W / 2 - 0.75, 0.36, D / 2 + 0.75); ou.rotation.y = -0.35; dio.add(ou);
  dio.position.y = -0.9;
  // the air: a field of points coloured by temperature
  const NX = 16, NY = 7, NZ = 14, N = NX * NY * NZ;
  const fp = new Float32Array(N * 3), fc = new Float32Array(N * 3), Tc = new Float32Array(N), cell = [];
  for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) for (let k = 0; k < NZ; k++) { const x = -W / 2 + (i + 0.5) * W / NX, y = 0.15 + (j + 0.5) * (HH - 0.3) / NY, z = -D / 2 + (k + 0.5) * D / NZ; cell.push([x, y, z, Math.random() * 6.28]); }
  const fgeo = new THREE.BufferGeometry(); fgeo.setAttribute('position', new THREE.BufferAttribute(fp, 3)); fgeo.setAttribute('color', new THREE.BufferAttribute(fc, 3));
  const fieldM = new THREE.PointsMaterial({ size: 0.66, vertexColors: true, transparent: true, opacity: 0.11, depthWrite: false, sizeAttenuation: true, map: hazeTex(), blending: THREE.AdditiveBlending, toneMapped: false });   // ★Rev.36 realism: a soft glowing volume of air (large faint additive puffs) instead of a confetti of crisp dots   // Rev.31: brighter where the scan plane passes (paintField)
  const field = new THREE.Points(fgeo, fieldM); dio.add(field);
  scene.updateMatrixWorld(true);
  const vent = room.vent(new THREE.Vector3()); dio.worldToLocal(vent);
  // ★Rev.32 light & colour follow the room temperature: hot room = amber edges, cooled room = cyan; a cool fill from the outlet while it blows
  const cHot = new THREE.Color(0xffa060), cCool = new THREE.Color(0x4df3ff), cNow = new THREE.Color();
  const coolF = new THREE.PointLight(0x8fe3ff, 0, 4.5, 1.6); coolF.position.copy(vent).add(new THREE.Vector3(0, -0.5, 0.8)); dio.add(coolF);
  // anchors for the HTML pins (local to the diorama)
  const anchors = { unit: vent.clone().add(new THREE.Vector3(0, 0.12, 0)), cdu: new THREE.Vector3(W / 2 - 0.75, 0.78, D / 2 + 0.75), win: new THREE.Vector3(W / 2 - 0.05, 1.5, 0.1), bed: new THREE.Vector3(-0.6, 0.75, -D / 2 + 1.2) };
  const cardAt = { room: new THREE.Vector3(-W / 2, HH + 0.05, -D / 2), need: vent.clone().add(new THREE.Vector3(0.1, 0.5, 0)), out: anchors.win.clone().add(new THREE.Vector3(0, 0.75, 0.4)), people: anchors.bed.clone().add(new THREE.Vector3(0, 0.45, 0)), jet: vent.clone().add(new THREE.Vector3(0, -0.75, 1.3)) };
  const cam = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
  const orb = { th: -0.62, ph: 1.02, r: 12.5, tth: -0.62, user: 0 };
  let Wd = 1, Hd = 1, t = 0, last = performance.now(), visible = true, raf = 0, lastShadow = -9;
  let sw = 0, sh = 0, spr = 0;   // Rev.30 smooth: GL buffers are reallocated only when the size really changed
  const size = () => { const r = host.getBoundingClientRect(); Wd = Math.max(1, Math.round(r.width)); Hd = Math.max(1, Math.round(r.height)); if (Wd === sw && Hd === sh && renderer.getPixelRatio() === spr) return; sw = Wd; sh = Hd; spr = renderer.getPixelRatio(); renderer.setSize(Wd, Hd, false); cam.aspect = Wd / Hd; orb.r = Wd / Hd < 0.9 ? 18.5 : Wd / Hd < 1.3 ? 15.5 : 13.6; cam.updateProjectionMatrix(); };
  size(); const ro = new ResizeObserver(size); ro.observe(host);
  const io = new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); const S = o.state(); S.vis = visible; sound.focus(visible); if (!visible) sound.air(0); if (visible) loop(); }, { rootMargin: '10% 0px' }); io.observe(host);
  // drag to turn (horizontal on touch so the page still scrolls)
  let drag = null;
  cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, th: orb.tth, ph: orb.ph }; orb.user = performance.now(); orb.spin = 0; vel = 0; lastX = e.clientX; lastT = performance.now(); });
  let vel = 0, lastX = 0, lastT = 0;   // ★Rev.32 motion: a flick keeps the room turning a little, then it settles
  addEventListener('pointerup', () => { if (drag && !RM()) orb.spin = clamp(vel, -2.2, 2.2); drag = null; });
  addEventListener('pointermove', e => { if (!drag) return; const n = performance.now(); if (lastT) vel = vel * 0.6 + 0.4 * (-(e.clientX - lastX) * 0.006) / Math.max(0.008, (n - lastT) / 1000); lastX = e.clientX; lastT = n; orb.tth = clamp(drag.th - (e.clientX - drag.x) * 0.006, -1.45, 0.3); if (e.pointerType === 'mouse') orb.ph = clamp(drag.ph - (e.clientY - drag.y) * 0.004, 0.62, 1.32); orb.user = performance.now(); });
  const v = new THREE.Vector3(), col = [0, 0, 0];
  let scanY = -9;   // height of the scan plane (room metres); the air it passes glows brighter
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
      Tc[n] = T; tempColor(T, col);
      const glow = 0.6 + 1.5 * Math.exp(-((y - scanY) ** 2) / 0.02);
      fc[n * 3] = col[0] * glow; fc[n * 3 + 1] = col[1] * glow; fc[n * 3 + 2] = col[2] * glow;
      const jitter = RM() ? 0 : 0.03;
      fp[n * 3] = x + Math.sin(t * 0.7 + ph) * jitter; fp[n * 3 + 1] = y + Math.cos(t * 0.5 + ph) * jitter; fp[n * 3 + 2] = z + (run ? ((t * 0.25 * air + ph) % 1) * 0.06 : 0);
    }
    fgeo.attributes.color.needsUpdate = true; fgeo.attributes.position.needsUpdate = true;
  }
  function frame(dt) {
    t += dt;
    if (!RM() && performance.now() - orb.user > 4000) orb.tth += (-0.62 + Math.sin(t * 0.12) * 0.45 - orb.tth) * 0.01;
    if (orb.spin) { orb.tth = clamp(orb.tth + orb.spin * dt, -1.45, 0.3); orb.spin *= Math.pow(0.04, dt); if (Math.abs(orb.spin) < 0.02 || orb.tth <= -1.45 || orb.tth >= 0.3) orb.spin = 0; orb.user = performance.now(); }
    orb.th += (orb.tth - orb.th) * Math.min(1, dt * 6);
    cam.position.set(Math.sin(orb.th) * Math.sin(orb.ph) * orb.r, Math.cos(orb.ph) * orb.r + 0.3, Math.cos(orb.th) * Math.sin(orb.ph) * orb.r);
    const bob = RM() ? 0 : Math.sin(t * 0.6) * 0.04;   // the diorama floats — the camera breathes instead of moving the room, so its shadows stay valid
    cam.position.y -= bob; cam.lookAt(0.2, -0.45 - bob, 0.3);   // Rev.31: a little lower so the light cone under the plinth is in frame
    if (t - lastShadow > 3) { renderer.shadowMap.needsUpdate = true; lastShadow = t; }
    ring.material.opacity = 0.55 + Math.sin(t * 1.4) * 0.2;
    // holodeck motion: the scan plane rises through the room every 6 s; the light cone flows upward; the pad breathes
    const S = o.state();
    if (S.scanReq) { S.scanReq = false; scanT0 = t; S.scanAt = t; }   // ★Rev.31.1 "สแกนห้อง": restart the sweep now
    const sc = RM() ? (S.scan ? 1.01 : 0.62) : ((t - scanT0) % 6) / 4.2; scanY = sc <= 1 ? sc * HH : -9; scan.visible = sc <= 1; scan.position.y = Math.max(0.02, scanY);
    scanPlane.material.opacity = 0.07 * Math.sin(Math.min(1, sc) * Math.PI);
    if (!RM()) { streak.offset.y = -t * 0.12; padRing.scale.setScalar(1 + Math.sin(t * 1.6) * 0.04); }
    edgeM.opacity = 0.45 + Math.sin(t * 0.9) * 0.1;
    { const kT = clamp((S.T - 24.5) / 7); cNow.copy(cCool).lerp(cHot, kT); edgeM.color.copy(cNow); ring.material.color.copy(cNow);
      coolF.intensity += ((S.running ? 1.4 * effects(S.dirt).air * (1.15 - kT) : 0) - coolF.intensity) * Math.min(1, dt * 3); }
    room.setDirt(S.dirt);
    OU.parts && OU.parts['o-fan'] && S.running && (OU.parts['o-fan'].rotation.z -= dt * 14);
    paintField(S);
    // heat map fades in/out; its pixels follow the field
    heat.material.opacity += ((S.heat ? 0.72 : 0) - heat.material.opacity) * Math.min(1, dt * 5);
    if (heat.material.opacity > 0.01 && t - lastHeat > 0.25) { lastHeat = t; for (let i = 0; i < NX; i++) for (let k = 0; k < NZ; k++) { const b0 = i * NY * NZ + k; tempColor(Math.min(Tc[b0 + NZ], Tc[b0 + 2 * NZ], Tc[b0 + 3 * NZ]), col);   /* coolest air within ~1.3 m of this floor spot → the jet's footprint shows */ const q = (k * 16 + i) * 4;   /* canvas top row = back wall (flipY) */ hmI.data[q] = Math.min(255, col[0] * 255); hmI.data[q + 1] = Math.min(255, col[1] * 255); hmI.data[q + 2] = Math.min(255, col[2] * 255); hmI.data[q + 3] = 255; } hmG.putImageData(hmI, 0, 0); hmT.needsUpdate = true; }
    renderer.render(scene, cam);
    // pins
    dio.updateMatrixWorld();
    const cards = o.cards || {}, swept = S.scan && (RM() || t - (S.scanAt || 0) > 4.2), placed = [];
    for (const k in cards) {
      const c = cards[k], a = cardAt[k]; if (!c || !a) continue;
      v.copy(a).applyMatrix4(dio.matrixWorld).project(cam);
      const show = S.scan && v.z < 1 && (swept || scanY >= a.y - 0.05);
      c.classList.toggle('on', show); if (!show) continue;
      // keep cards apart: a card that would sit on one already placed slides down below it (box = CSS margin offset + measured size)
      const x = (v.x + 1) / 2 * Wd; let y = (1 - v.y) / 2 * Hd;
      const cw = c._w || (c._w = c.offsetWidth), ch = c._h || (c._h = c.offsetHeight), bx = x + 12, by = () => y - (Wd < 640 ? 46 : 58);
      for (let pass = 0; pass < 4; pass++) { const hit = placed.find(q => bx < q.x + q.w + 4 && bx + cw + 4 > q.x && by() < q.y + q.h + 4 && by() + ch + 4 > q.y); if (!hit) break; y += hit.y + hit.h + 6 - by(); }
      placed.push({ x: bx, y: by(), w: cw, h: ch });
      c.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
    }
    for (const k in anchors) {
      const el = labels[k]; if (!el) continue;
      v.copy(anchors[k]).applyMatrix4(dio.matrixWorld).project(cam);
      el.style.transform = `translate(${((v.x + 1) / 2 * Wd).toFixed(1)}px,${((1 - v.y) / 2 * Hd).toFixed(1)}px)`; el.classList.toggle('on', v.z < 1);
    }
  }
  function loop() {
    cancelAnimationFrame(raf);
    const step = now => { const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; if (!visible) return; o.tick && o.tick(dt);
      // Rev.30 smooth: nothing to animate but the drift (clock stopped, no drag for 2 s) → every other frame
      const idle = !o.state().playing && !drag && performance.now() - orb.user > 2000;
      if (!idle || (odd = !odd)) { frame(idle ? dt * 2 : dt); perf(dt); }
      raf = requestAnimationFrame(step); };
    last = performance.now(); raf = requestAnimationFrame(step);
  }
  // Rev.30 smooth: frames slower than ~30 fps for 2 s → 1× then 0.75× pixel ratio (motion before sharpness)
  let slow = 0, tier = 0, odd = false;
  const perf = dt => { if (dt <= 0) return; slow = dt > 0.034 ? slow + dt : Math.max(0, slow - dt * 0.5); if (slow > 2 && tier < 2) { tier++; slow = 0; renderer.setPixelRatio(tier === 1 ? 1 : 0.75); size(); } };
  loop();
  return { dispose() { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); G.release(); renderer.dispose(); } };
}
// Rev.31 holodeck textures — a soft radial glow, upward light streaks, and a fade (bright at the emitter, gone at the plinth)
function glowTex(a, b) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, a); gr.addColorStop(0.35, b); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
}
function beamTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#1a3a66'; g.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 70; i++) { const x = Math.random() * 256, w = 0.6 + Math.random() * 1.8, y = Math.random() * 128, len = 20 + Math.random() * 70; const gr = g.createLinearGradient(0, y, 0, y + len); gr.addColorStop(0, 'rgba(160,250,255,0)'); gr.addColorStop(0.5, `rgba(160,250,255,${(0.35 + Math.random() * 0.6).toFixed(2)})`); gr.addColorStop(1, 'rgba(160,250,255,0)'); g.fillStyle = gr; g.fillRect(x, y, w, len); g.fillRect(x, y - 128, w, len); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1); return t;
}
function fadeTex() {
  const c = document.createElement('canvas'); c.width = 4; c.height = 128; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 128, 0, 0); gr.addColorStop(0, '#fff'); gr.addColorStop(0.55, '#666'); gr.addColorStop(0.92, '#111'); gr.addColorStop(1, '#000');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 128); return new THREE.CanvasTexture(c);
}
function hazeTex() {   // Rev.36: a very soft falloff, no visible edge or core — puffs blend into one haze
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,.45)'); gr.addColorStop(0.3, 'rgba(255,255,255,.32)'); gr.addColorStop(0.65, 'rgba(255,255,255,.1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}
function dotTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t;
}

/** mountSpatial(root, { go }) — the diorama, its hotspots, and the climate lab beside it */
export function mountSpatial(root, { go = () => {} } = {}) {
  if (!root) return null;
  const S = { out: 35, people: 2, dirt: 0.05, inv: true, running: true, playing: !RM(), m: 0, T: 32, hist: [32], scan: false, scanReq: false, scanAt: 0, heat: false };
  let C = makeClimate(S);
  const stage = h('div', { class: 'sp-cv' }), pins = h('div', { class: 'sp-pins' });
  const info = h('div', { class: 'sp-info', 'aria-live': 'polite' }, h('p', { class: 'sp-k' }, 'แตะจุดเรืองแสงในห้อง'), h('p', {}, 'ดูว่าแต่ละส่วนของห้องเกี่ยวกับความเย็นและค่าใช้จ่ายอย่างไร'));
  const labels = {};
  HOTS.forEach(x => { const b = h('button', { type: 'button', class: 'sp-pin', 'aria-label': x.th, onclick: () => pick(x) }, h('span', {}, x.th)); labels[x.id] = b; pins.append(b); });
  function pick(x) { sound.cue('tick'); Object.values(labels).forEach(b => b.classList.toggle('sel', b === labels[x.id])); info.innerHTML = ''; info.append(h('p', { class: 'sp-k' }, x.th), h('p', {}, x.text()), h('button', { type: 'button', class: 'btn-ghost', onclick: () => go(x.go) }, x.cta)); }
  // climate lab
  const big = h('b', { class: 'sp-T' }), sub = h('small', {}), t25 = h('p', { class: 'sp-t25' });
  const chart = h('div', { class: 'sp-chart', 'aria-hidden': 'true' });
  const rng = (lab, min, max, step, key, fmt) => { const out = h('b', {}, fmt(S[key])); const i = h('input', { type: 'range', min, max, step, value: S[key], 'aria-label': lab }); i.addEventListener('input', () => { S[key] = Number(i.value); out.textContent = fmt(S[key]); recompute(); }); return h('label', { class: 'sp-rng' }, h('span', {}, lab, out), i); };
  const tog = (lab, key, a, b) => { const btn = h('button', { type: 'button', 'aria-pressed': String(S[key] === a) }, lab); btn.addEventListener('click', () => { S[key] = S[key] === a ? b : a; btn.setAttribute('aria-pressed', String(S[key] === a)); recompute(); }); return btn; };
  const playB = h('button', { type: 'button', class: 'sp-play', 'aria-pressed': String(S.playing) }, S.playing ? 'หยุดเวลา' : 'เดินเวลา');
  playB.addEventListener('click', () => { S.playing = !S.playing; playB.setAttribute('aria-pressed', String(S.playing)); playB.textContent = S.playing ? 'หยุดเวลา' : 'เดินเวลา'; });
  const resetB = h('button', { type: 'button', class: 'btn-ghost', onclick: () => { S.m = 0; S.T = 32; S.hist = [32]; C = makeClimate(S); draw(); } }, 'เริ่มใหม่จาก 32°C');
  // ★Rev.32: "เสียงลม" is the page's sound switch (luxsound) — the air you hear follows the airflow below; hum + scan sweep come with it
  const sndB = h('button', { type: 'button', 'aria-pressed': 'false' }, 'เสียงลม');
  sndB.addEventListener('click', () => sound.set(!sound.on)); sound.subscribe(v => sndB.setAttribute('aria-pressed', String(v)));
  const lab = h('div', { class: 'sp-lab' },
    h('div', { class: 'sp-read' }, h('div', {}, h('small', {}, 'ในห้อง (แบบจำลอง)'), big, sub), chart, t25),
    h('div', { class: 'sp-ctl' }, rng('อากาศนอกบ้าน', 29, 38, 0.5, 'out', v => v + '°C'), rng('คนในห้อง', 1, 6, 1, 'people', v => v + ' คน'),
      h('div', { class: 'sp-tg' }, tog('คอยล์สกปรก', 'dirt', 0.85, 0.05), tog('Inverter', 'inv', true, false), tog('เปิดแอร์', 'running', true, false), sndB)),
    h('div', { class: 'sp-run' }, playB, resetB),
    h('p', { class: 'sp-fine' }, 'แบบจำลองเพื่ออธิบาย · 1 วินาที = 2 นาที · อุณหภูมิห้องและเวลาถึง 25°C คำนวณด้วยสูตรเดียวกับห้องจำลองบนเว็บ สีของอากาศเป็นภาพประกอบ ไม่ใช่ค่าวัดจริง'));
  const scale = h('div', { class: 'sp-scale', 'aria-hidden': 'true' }, h('span', {}, '13°C'), h('i'), h('span', {}, '34°C'));
  // ★Rev.31.1 scan cards: the numbers the model uses for this room, pinned where they apply (aria-hidden — the lab beside says the same in text)
  const cardsBox = h('div', { class: 'sp-cards', 'aria-hidden': 'true' }), cards = {};
  ['room', 'need', 'out', 'people', 'jet'].forEach(k => { cards[k] = h('div', { class: 'sp-card sp-card-' + k }); cardsBox.append(cards[k]); });
  const scanB = h('button', { type: 'button', class: 'sp-scan', 'aria-pressed': 'false' }, 'สแกนห้อง');
  // on phones the buttons sit under the room: bring the room back into view so the visitor sees what the button does
  const showRoom = () => { const r = stage.getBoundingClientRect(); if (r.top < 0 || r.bottom > innerHeight) stage.scrollIntoView({ block: 'center', behavior: RM() ? 'auto' : 'smooth' }); };
  scanB.addEventListener('click', () => { S.scan = !S.scan; S.scanReq = S.scan; scanB.setAttribute('aria-pressed', String(S.scan)); fillCards(); if (S.scan) { showRoom(); sound.cue('scan'); } else sound.cue('tick'); });
  const heatB = h('button', { type: 'button', 'aria-pressed': 'false' }, 'แผนที่ความร้อน');
  heatB.addEventListener('click', () => { S.heat = !S.heat; heatB.setAttribute('aria-pressed', String(S.heat)); if (S.heat) showRoom(); sound.cue('tick'); });
  lab.querySelector('.sp-run').prepend(scanB); lab.querySelector('.sp-tg').append(heatB);
  function fillCards() {
    const fmt = n => Math.round(n).toLocaleString('en-US'), card = (el, k, v) => { el.innerHTML = ''; el.append(h('small', {}, k), h('b', {}, v)); };
    card(cards.room, 'ห้องนอน', `${W} × ${D} × ${HH} ม.`);
    card(cards.need, 'ต้องการ', `~${fmt(C.need)} BTU · ติดตั้ง ${fmt(C.cap)}`);
    card(cards.out, 'อากาศนอก', `${S.out}°C`);
    card(cards.people, 'คนในห้อง', `${S.people} คน`);
    card(cards.jet, 'ลมผ่านคอยล์', `${Math.round(effects(S.dirt).air * 100)}%`);
    Object.values(cards).forEach(c => { c._w = c._h = 0; });   // re-measure for the overlap check
  }
  root.append(h('div', { class: 'sp-wrap' }, h('div', { class: 'sp-stage' }, stage, pins, cardsBox, scale, info), lab));
  function recompute() { C = makeClimate(S); draw(); fillCards(); }
  function draw() {
    big.textContent = S.T.toFixed(1) + '°C'; sub.textContent = `นาทีที่ ${Math.floor(S.m)} · แอร์ ${C.cap.toLocaleString('en-US')} BTU ${S.inv ? 'Inverter' : 'Fixed speed'}`;
    t25.textContent = !S.running ? 'ปิดแอร์: ห้องอุ่นขึ้นตามความร้อนที่เข้ามา' : C.t25 != null ? `จาก 32°C ถึง ${T_SET}°C ราว ${Math.round(C.t25)} นาที` + (S.dirt > 0.5 ? ' (คอยล์สกปรก)' : '') : `ทำได้ต่ำสุดราว ${C.steady.toFixed(1)}°C ในสภาพนี้`;
    const pts = S.hist.map((T, i) => `${(i / 90 * 300).toFixed(1)},${(110 - (T - 22) / 12 * 110).toFixed(1)}`).join(' ');
    chart.innerHTML = `<svg viewBox="0 0 300 110" preserveAspectRatio="none"><line x1="0" x2="300" y1="${110 - (T_SET - 22) / 12 * 110}" y2="${110 - (T_SET - 22) / 12 * 110}" class="sp-set"/><polyline points="${pts}" class="sp-line"/></svg>`;
    root.style.setProperty('--sp-k', clamp((S.T - 22) / 12).toFixed(3));
    sound.air(S.running && S.vis !== false ? effects(S.dirt).air : 0);
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
  fillCards();
  whenNear(stage, () => whenQuiet(() => { try { createDiorama(stage, labels, { state: () => S, tick, cards }); } catch (e) { root.classList.add('sp-nogl'); stage.innerHTML = ''; stage.append(h('p', { class: 'sp-fb' }, 'อุปกรณ์นี้เปิดภาพ 3 มิติไม่ได้ ห้องทดลองด้านข้างยังใช้งานได้ครบ')); } }, 220, 2500), '50% 0px');   // Rev.35 smooth: built once the page has settled
  return { state: S, pick: id => pick(HOTS.find(x => x.id === id)) };
}
