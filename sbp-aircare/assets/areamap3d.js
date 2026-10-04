// SBP AirCare — service area in 3D with motion ("4D") — Rev.20 (owner 3 ต.ค. 2569: "ภาพพื้นที่ให้บริการหน้าแรกให้ดูมีมิติ สวยงาม
// มากกว่ากล่องสี่เหลี่ยมโยงเส้น ให้เป็น 4D หรือ 3D มี animation โชว์ให้บริการจุดไหนเป็นหลัก และบริเวณใกล้เคียง")
//   · Bangkok and the provinces around it, raised from a cool sea (Natural Earth admin-1, assets/thai-provinces.json)
//   · the main service area = Bangkok within TRAVEL.freeKm road km of HQ: a glowing disc + a radar sweep + every district point
//   · nearby districts (address book th-address.json) as small amber points; rings at 60 / 100 / 150 road km with the trip fee
//     from travelFee() — the same numbers as the calculators
//   · motion: crews leave HQ along arcs to district points all day (time-of-day clock), a ripple where they arrive
//   · compact (home tile): city view only, no controls · full (#area): city / region views, hover + click a district
// Road km ≈ straight km × TRAVEL.roadFactor (the rings are drawn at straight-line radius = road km ÷ roadFactor).
import * as THREE from './three.module.min.js';
import { track as glTrack } from './gl-pool.js';
import { deferred } from './lazy.js';
import { TRAVEL, HQ, ADDR, travelFee, zoneOf, roadKm, baht, h } from './sbp-core.js';

const KX = 111.32 * Math.cos(HQ.lat * Math.PI / 180), KZ = 110.57;   // 1 unit = 1 km
const P = (lon, lat) => [(lon - HQ.lon) * KX, -(lat - HQ.lat) * KZ];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const RM = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const BOX = { lon: [99.2, 101.75], lat: [12.55, 14.85] };
const PAL = {
  light: { sea: 0xcfeaf8, sea2: 0xeef8fd, land: 0xffffff, side: 0xd5e2ee, bkk: 0xeaf5fd, line: 0x9fbdd6, core: 0x13a3e0, coreA: 0.2, ring: 0x0b74b5, ring2: 0x7fa7c7, ext: 0xf08a1c, hq: 0xe8410f, arc: 0x13a3e0, txt: 'light' },
  blueprint: { sea: 0xdcebf8, sea2: 0xf1f7fc, land: 0xffffff, side: 0xcfdced, bkk: 0xe6f0fa, line: 0x2c6cb8, core: 0x2c6cb8, coreA: 0.16, ring: 0x123f7b, ring2: 0x6f95c4, ext: 0xe2711d, hq: 0xe8410f, arc: 0x2c6cb8, txt: 'light' },
  dark: { sea: 0x08131d, sea2: 0x0f2232, land: 0x172433, side: 0x0f1923, bkk: 0x1c3247, line: 0x3d5a75, core: 0x4fd0ff, coreA: 0.22, ring: 0x9fdcff, ring2: 0x4d6f8c, ext: 0xffa04a, hq: 0xff6a3d, arc: 0x5ad0ff, txt: 'dark' },
};
const LABEL_PROV = { 'กรุงเทพมหานคร': 'กรุงเทพฯ', 'นนทบุรี': 'นนทบุรี', 'ปทุมธานี': 'ปทุมธานี', 'สมุทรปราการ': 'สมุทรปราการ', 'สมุทรสาคร': 'สมุทรสาคร', 'นครปฐม': 'นครปฐม',
  'ฉะเชิงเทรา': 'ฉะเชิงเทรา', 'ชลบุรี': 'ชลบุรี', 'พระนครศรีอยุธยา': 'อยุธยา', 'สมุทรสงคราม': 'สมุทรสงคราม', 'ราชบุรี': 'ราชบุรี', 'สุพรรณบุรี': 'สุพรรณบุรี', 'นครนายก': 'นครนายก', 'สระบุรี': 'สระบุรี' };

async function loadGeo() {
  if (globalThis.__SBP_TH) return globalThis.__SBP_TH;
  return (await fetch(new URL('./thai-provinces.json', import.meta.url))).json();
}
// districts with one point each (the address book lists subdistricts; the district point = the first row's district point is not kept,
// so use the mean of its rows) → [{p, d, x, z, km, tier}]
function districtPoints() {
  const by = new Map();
  ADDR.list.forEach(r => { const k = r.p + '|' + r.d; const o = by.get(k) || { p: r.p, d: r.d, la: 0, lo: 0, n: 0 }; o.la += r.lat; o.lo += r.lon; o.n++; by.set(k, o); });
  return [...by.values()].map(o => { const lat = o.la / o.n, lon = o.lo / o.n, [x, z] = P(lon, lat), zn = zoneOf({ p: o.p, d: o.d }); return { p: o.p, d: o.d, x, z, km: roadKm(lat, lon), tier: zn ? zn.tier : 'out' }; })
    .filter(d => d.tier !== 'out');
}

export async function mountAreaMap(host, cfg = {}) {
  if (!host) return { highlight() {}, setView() {} };
  const hold = h('div', { class: 'am-stage am-wait', 'aria-hidden': 'true' });
  host.classList.add('am', 'am-' + (cfg.theme || 'light'), cfg.compact ? 'am-compact' : 'am-full'); host.append(hold, legendEl());
  // Rev.26.1 smooth: the placeholder keeps its place (same box as the stage, legend already there) until the stage replaces it —
  // before, it was removed first and the whole page below jumped up and back while the map loaded
  return deferred(host, () => boot(host, cfg, hold));
}

const legendEl = () => h('div', { class: 'am-legend' },
  h('span', {}, h('i', { class: 'core' }), `พื้นที่หลัก กรุงเทพฯ ≤ ${TRAVEL.freeKm} กม.`),
  h('span', {}, h('i', { class: 'ext' }), 'ใกล้เคียง · คิดค่าเดินทางตามระยะ'),
  h('span', {}, h('i', { class: 'hq' }), 'สำนักงานใหญ่ พระราม 2'));
async function boot(host, cfg, hold) {
  const theme = cfg.theme || 'light', C = PAL[theme] || PAL.light, compact = !!cfg.compact;
  const geo = await loadGeo(); const raw = geo.prov || geo;
  const inBox = p => p.p.some(rings => rings.some(r => { for (let i = 0; i < r.length; i += 2) if (r[i] > BOX.lon[0] && r[i] < BOX.lon[1] && r[i + 1] > BOX.lat[0] && r[i + 1] < BOX.lat[1]) return true; return false; }));
  const provs = raw.filter(inBox).map(p => ({ th: p.th, label: P(p.l[0], p.l[1]), poly: p.p.map(rings => rings.map(r => { const pts = []; for (let i = 0; i < r.length; i += 2) pts.push(P(r[i], r[i + 1])); return pts; })) }));
  const dists = districtPoints();
  const coreR = TRAVEL.freeKm / TRAVEL.roadFactor;
  const OUTER = [60, 100, TRAVEL.maxKm].map(km => ({ km, r: km / TRAVEL.roadFactor, fee: travelFee(km) }));

  /* ---------- markup ---------- */
  const stage = h('div', { class: 'am-stage' });
  const labels = h('div', { class: 'am-labels', 'aria-hidden': 'true' });
  const tip = h('div', { class: 'am-tip', hidden: true, role: 'status' });
  const clock = h('div', { class: 'am-clock', 'aria-hidden': 'true' }, h('b'), h('span'));
  stage.append(labels, tip, clock);
  const views = compact ? null : h('div', { class: 'am-views', role: 'group', 'aria-label': 'มุมมองแผนที่' },
    h('button', { type: 'button', 'data-v': 'city', 'aria-pressed': 'true' }, 'พื้นที่หลัก'),
    h('button', { type: 'button', 'data-v': 'region', 'aria-pressed': 'false' }, `รอบนอก ${TRAVEL.maxKm} กม.`));
  if (views) stage.append(views);
  if (hold && hold.parentNode) hold.replaceWith(stage); else host.prepend(stage);
  if (!host.querySelector('.am-legend')) host.append(legendEl());
  if (!compact) host.append(h('p', { class: 's-note am-note' }, `แบบจำลองเพื่ออธิบาย · วงรอบ = ระยะถนนโดยประมาณจากสำนักงานใหญ่ · จุด = ที่ว่าการเขต/อำเภอ · เส้นเคลื่อนไหว = ทีมช่างออกงาน (ภาพประกอบ ไม่ใช่ตำแหน่งจริง) · ค่าเดินทางจริงคิดจากแขวง/ตำบลของหน้างาน`));

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return fallback(); }
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = theme === 'dark' ? 1 : 1.05;
  stage.prepend(renderer.domElement); renderer.domElement.setAttribute('aria-hidden', 'true');
  const scene = new THREE.Scene();
  glTrack(renderer, stage, { scene });
  const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 3000);
  scene.add(new THREE.HemisphereLight(0xffffff, theme === 'dark' ? 0x0a1118 : 0xc7d6e4, theme === 'dark' ? 1.0 : 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, theme === 'dark' ? 1.1 : 1.3); sun.position.set(-80, 200, 120); scene.add(sun);

  // sea with a soft radial light around Bangkok
  const tex = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); const r = g.createRadialGradient(256, 236, 20, 256, 256, 300);
    r.addColorStop(0, '#' + new THREE.Color(C.sea2).getHexString()); r.addColorStop(1, '#' + new THREE.Color(C.sea).getHexString()); g.fillStyle = r; g.fillRect(0, 0, 512, 512);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  sea.rotation.x = -Math.PI / 2; sea.position.y = -0.05; scene.add(sea);

  // provinces: white land, Bangkok slightly raised and tinted
  const lit = theme === 'dark' ? 0.08 : 0.42;   // bright, airy land in the light themes
  const landTop = new THREE.MeshStandardMaterial({ color: C.land, emissive: C.land, emissiveIntensity: lit, roughness: 0.9 }), landSide = new THREE.MeshStandardMaterial({ color: C.side, roughness: 0.9 });
  const bkkTop = new THREE.MeshStandardMaterial({ color: C.bkk, emissive: C.bkk, emissiveIntensity: lit, roughness: 0.85 });
  const lineM = new THREE.LineBasicMaterial({ color: C.line, transparent: true, opacity: theme === 'blueprint' ? 0.7 : 0.55 });
  provs.forEach(p => {
    const H = p.th === 'กรุงเทพมหานคร' ? 1.6 : 0.9;
    const shapes = p.poly.map(rings => { const s = new THREE.Shape(rings[0].map(([x, z]) => new THREE.Vector2(x, -z))); rings.slice(1).forEach(hr => s.holes.push(new THREE.Path(hr.map(([x, z]) => new THREE.Vector2(x, -z))))); return s; });
    const g = new THREE.ExtrudeGeometry(shapes, { depth: H, bevelEnabled: false, curveSegments: 1 }); g.rotateX(-Math.PI / 2);
    scene.add(new THREE.Mesh(g, [p.th === 'กรุงเทพมหานคร' ? bkkTop : landTop, landSide]));
    const pts = []; p.poly.forEach(rings => rings.forEach(r => r.forEach(([x, z], i) => { const [x2, z2] = r[(i + 1) % r.length]; pts.push(x, H + 0.05, z, x2, H + 0.05, z2); })));
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); scene.add(new THREE.LineSegments(lg, lineM));
  });

  // core disc (glow) + ring + radar sweep
  const discTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const col = '#' + new THREE.Color(C.core).getHexString();
    const r = g.createRadialGradient(128, 128, 0, 128, 128, 128); r.addColorStop(0, col + 'aa'); r.addColorStop(0.7, col + '55'); r.addColorStop(0.97, col + '88'); r.addColorStop(1, col + '00');
    g.fillStyle = r; g.beginPath(); g.arc(128, 128, 128, 0, Math.PI * 2); g.fill(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const disc = new THREE.Mesh(new THREE.CircleGeometry(coreR, 96), new THREE.MeshBasicMaterial({ map: discTex, transparent: true, opacity: C.coreA * 2.2, depthWrite: false, toneMapped: false }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = 1.7; scene.add(disc);
  const ringAt = (r, col, op, dash) => { const pts = []; for (let k = 0; k <= 200; k++) { const a = k / 200 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, 1.75, Math.sin(a) * r)); }
    const g = new THREE.BufferGeometry().setFromPoints(pts); const l = new THREE.Line(g, dash ? new THREE.LineDashedMaterial({ color: col, dashSize: dash, gapSize: dash * 0.7, transparent: true, opacity: op }) : new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op }));
    if (dash) l.computeLineDistances(); scene.add(l); return l; };
  ringAt(coreR, C.ring, 0.95);
  OUTER.forEach((o, i) => ringAt(o.r, C.ring2, 0.75 - i * 0.12, 2.2));
  const sweep = new THREE.Mesh(new THREE.CircleGeometry(coreR, 48, 0, Math.PI / 5), new THREE.MeshBasicMaterial({ color: C.core, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  sweep.rotation.x = -Math.PI / 2; sweep.position.y = 1.78; scene.add(sweep);

  // district points: core = cyan pillars, nearby = amber dots (instanced, raycastable)
  const dummy = new THREE.Object3D();
  const coreD = dists.filter(d => d.tier === 'core'), extD = dists.filter(d => d.tier !== 'core');
  const pil = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.42, 0.42, 1, 12), new THREE.MeshStandardMaterial({ color: C.core, emissive: C.core, emissiveIntensity: 0.35, roughness: 0.4 }), coreD.length);
  coreD.forEach((d, i) => { dummy.position.set(d.x, 1.6 + 0.9, d.z); dummy.scale.set(1, 1.8, 1); dummy.updateMatrix(); pil.setMatrixAt(i, dummy.matrix); }); scene.add(pil);
  const dot = new THREE.InstancedMesh(new THREE.SphereGeometry(0.55, 12, 8), new THREE.MeshStandardMaterial({ color: C.ext, emissive: C.ext, emissiveIntensity: 0.25, roughness: 0.5 }), extD.length);
  extD.forEach((d, i) => { dummy.position.set(d.x, (d.p === 'กรุงเทพมหานคร' ? 1.6 : 0.9) + 0.6, d.z); dummy.scale.setScalar(1); dummy.updateMatrix(); dot.setMatrixAt(i, dummy.matrix); }); scene.add(dot);

  // HQ pin + pulse
  const hqM = new THREE.MeshStandardMaterial({ color: C.hq, emissive: C.hq, emissiveIntensity: 0.4, roughness: 0.35 });
  const pin = new THREE.Group(); scene.add(pin);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 6, 12), hqM); stem.position.y = 1.6 + 3; pin.add(stem);
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.1, 24, 16), hqM); head.position.y = 8; pin.add(head);
  const pulseM = new THREE.MeshBasicMaterial({ color: C.hq, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
  const pulse = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.6, 48), pulseM); pulse.rotation.x = -Math.PI / 2; pulse.position.y = 1.8; pin.add(pulse);

  // crews: arcs from HQ with a travelling bead and an arrival ripple
  const arcs = [], ARCS = compact ? 4 : 6;
  const mkArc = () => {
    const ext = Math.random() < 0.28 && extD.length, d = ext ? extD[Math.floor(Math.random() * extD.length)] : coreD[Math.floor(Math.random() * coreD.length)];
    if (!d) return null;
    const a = new THREE.Vector3(0, 2, 0), b = new THREE.Vector3(d.x, 2, d.z), len = a.distanceTo(b), mid = a.clone().add(b).multiplyScalar(0.5); mid.y = 4 + len * 0.28;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b), pts = curve.getPoints(48);
    const col = ext ? C.ext : C.arc;
    const geo = new THREE.BufferGeometry().setFromPoints(pts); geo.setDrawRange(0, 0);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.9 }));
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 8), new THREE.MeshBasicMaterial({ color: col, toneMapped: false }));
    const rip = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.95, 32), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
    rip.rotation.x = -Math.PI / 2; rip.position.set(d.x, (d.p === 'กรุงเทพมหานคร' ? 1.6 : 0.9) + 0.1, d.z);
    scene.add(line, bead, rip);
    return { curve, line, bead, rip, t: 0, dur: 1.4 + len / 45, hold: 1.6 };
  };
  const dropArc = A => { scene.remove(A.line, A.bead, A.rip); A.line.geometry.dispose(); A.line.material.dispose(); A.bead.geometry.dispose(); A.bead.material.dispose(); A.rip.geometry.dispose(); A.rip.material.dispose(); };

  // job pin from the address checker
  const job = new THREE.Group(); job.visible = false; scene.add(job);
  const jobM = new THREE.MeshStandardMaterial({ color: theme === 'dark' ? 0xffffff : 0x0e2238, roughness: 0.4 });
  const js = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 5, 10), jobM); js.position.y = 2.5; job.add(js);
  const jh = new THREE.Mesh(new THREE.OctahedronGeometry(0.9), jobM); jh.position.y = 5.6; job.add(jh);
  const jobLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: C.hq })); jobLine.visible = false; scene.add(jobLine);

  /* ---------- labels ---------- */
  const labelList = [];
  const addLabel = (text, v, cls) => { const el = h('div', { class: 'am-lb ' + cls }, h('span', {}, text)); labels.append(el); const L = { el, v, cls }; labelList.push(L); return L; };
  addLabel(compact ? 'สำนักงานใหญ่ พระราม 2' : 'สหบูรพากรุ๊ป · สำนักงานใหญ่ พระราม 2', new THREE.Vector3(0, 9.6, 0), 'hq');
  addLabel(`พื้นที่หลัก ${TRAVEL.freeKm} กม.`, new THREE.Vector3(0, 2, coreR), 'ring core');
  OUTER.forEach(o => addLabel(`${o.km} กม. · ${baht(o.fee)}`, new THREE.Vector3(0, 2, o.r), 'ring far'));
  provs.forEach(p => LABEL_PROV[p.th] && addLabel(LABEL_PROV[p.th], new THREE.Vector3(p.label[0], 2.2, p.label[1]), p.th === 'กรุงเทพมหานคร' ? 'prov bkk' : 'prov'));
  addLabel('อ่าวไทย', new THREE.Vector3(...P(100.55, 13.05).flatMap((v, i) => i ? [0.2, v] : [v])), 'sea');
  const jobLabel = addLabel('', new THREE.Vector3(), 'job'); jobLabel.el.hidden = true;

  /* ---------- camera ---------- */
  const VIEWS = { city: { t: new THREE.Vector3(2, 0, -3), r: compact ? 78 : 92, th: -0.22, ph: 0.78 }, region: { t: new THREE.Vector3(8, 0, 6), r: 300, th: -0.12, ph: 0.62 } };
  const cam = { t: VIEWS.region.t.clone(), r: VIEWS.region.r, th: VIEWS.region.th, ph: VIEWS.region.ph };
  let fly = null, view = 'city';
  const flyTo = (to, dur = 1600) => { if (RM()) dur = 1; fly = { from: { t: cam.t.clone(), r: cam.r, th: cam.th, ph: cam.ph }, to, t0: performance.now(), dur }; };
  function setView(v) { view = v; flyTo(VIEWS[v]); views && views.querySelectorAll('[data-v]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v))); }
  views && views.querySelectorAll('[data-v]').forEach(b => b.addEventListener('click', () => setView(b.dataset.v)));
  new ResizeObserver(() => { const W = stage.clientWidth || 1, Hh = stage.clientHeight || 1; renderer.setSize(W, Hh, false); camera.aspect = W / Hh; camera.updateProjectionMatrix(); }).observe(stage);

  /* ---------- hover / click a district ---------- */
  const el = renderer.domElement, ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const hit = e => { const r = el.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, camera);
    const a = ray.intersectObject(pil)[0], b = ray.intersectObject(dot)[0]; const i = a && (!b || a.distance < b.distance) ? coreD[a.instanceId] : b ? extD[b.instanceId] : null; return i; };
  if (!compact) {
    el.addEventListener('pointermove', e => { const d = hit(e); el.style.cursor = d ? 'pointer' : 'default'; if (!d) { tip.hidden = true; return; }
      const z = zoneOf({ p: d.p, d: d.d }), r = stage.getBoundingClientRect(); tip.hidden = false; tip.innerHTML = '';
      tip.append(h('b', {}, `${d.p === 'กรุงเทพมหานคร' ? 'เขต' : 'อ.'}${d.d}`), h('span', {}, z.tier === 'core' ? `${z.km} กม. · พื้นที่หลัก` : `${z.km} กม. · ค่าเดินทาง ${baht(z.fee)}/เที่ยว`));
      tip.style.transform = `translate(${Math.min(e.clientX - r.left + 14, r.width - 220)}px,${e.clientY - r.top + 14}px)`; });
    el.addEventListener('pointerleave', () => { tip.hidden = true; });
    el.addEventListener('click', e => { const d = hit(e); if (d && cfg.onPick) cfg.onPick({ p: d.p, d: d.d }); });
  }

  /* ---------- loop ---------- */
  const tmp = new THREE.Vector3(); let vis = false, started = false, last = performance.now(), clockT = 8.5;
  new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis && !started) { started = true; setTimeout(() => setView('city'), RM() ? 0 : 500); } }, { threshold: 0.2 }).observe(stage);
  const still = RM();
  if (still) for (let i = 0; i < ARCS; i++) { const A = mkArc(); if (A) { A.t = A.dur; A.line.geometry.setDrawRange(0, 49); A.bead.visible = false; arcs.push(A); } }
  function frame(now) {
    requestAnimationFrame(frame);
    if (!vis || document.hidden) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now; const tt = now / 1000;
    if (fly) { const k = clamp((now - fly.t0) / fly.dur, 0, 1), e = ease(k); cam.t.lerpVectors(fly.from.t, fly.to.t, e); cam.r = fly.from.r + (fly.to.r - fly.from.r) * e; cam.th = fly.from.th + (fly.to.th - fly.from.th) * e; cam.ph = fly.from.ph + (fly.to.ph - fly.from.ph) * e; if (k >= 1) fly = null; }
    const th = cam.th + (still || fly ? 0 : Math.sin(tt * 0.12) * 0.12);
    const R = cam.r * Math.max(1, 1.25 / camera.aspect);
    camera.position.set(cam.t.x + R * Math.sin(cam.ph) * Math.sin(th), R * Math.cos(cam.ph), cam.t.z + R * Math.sin(cam.ph) * Math.cos(th));
    camera.lookAt(cam.t);
    if (!still) {
      sweep.rotation.z = -tt * 0.9;
      const pk = (tt % 2.2) / 2.2; pulse.scale.setScalar(1 + pk * 6); pulseM.opacity = 0.55 * (1 - pk);
      head.position.y = 8 + Math.sin(tt * 2) * 0.35;
      disc.material.opacity = C.coreA * (2 + Math.sin(tt * 1.3) * 0.25);
      // crews out from 08:30 to 17:30 on a 40-second "day"
      clockT += dt * (9 / 40); if (clockT > 17.5) clockT = 8.5;
      while (arcs.length < ARCS) { const A = mkArc(); if (!A) break; A.t = -Math.random() * 1.5; arcs.push(A); }
      for (let i = arcs.length - 1; i >= 0; i--) {
        const A = arcs[i]; A.t += dt;
        if (A.t < 0) continue;
        const k = clamp(A.t / A.dur, 0, 1), n = Math.max(2, Math.round(ease(k) * 49));
        A.line.geometry.setDrawRange(0, n); A.curve.getPoint(ease(k), tmp); A.bead.position.copy(tmp); A.bead.visible = k < 1;
        if (k >= 1) { const q = (A.t - A.dur) / A.hold; A.rip.material.opacity = 0.8 * (1 - q); A.rip.scale.setScalar(1 + q * 3); A.line.material.opacity = 0.9 * (1 - q);
          if (q >= 1) { dropArc(A); arcs.splice(i, 1); } }
      }
      const hh = Math.floor(clockT), mm = Math.floor((clockT - hh) * 60 / 15) * 15;
      clock.firstChild.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`; clock.lastChild.textContent = 'ทีมช่างออกงาน (ภาพประกอบ)';
    } else { clock.firstChild.textContent = '08:30–17:30'; clock.lastChild.textContent = 'เวลาทำการ'; }
    renderer.render(scene, camera);
    place();
  }
  requestAnimationFrame(frame);
  function place() {
    const W = stage.clientWidth, Hh = stage.clientHeight, far = cam.r > 160, placed = [];
    labelList.forEach(L => {
      let show = L.cls === 'hq' || (L.cls === 'job' && !L.el.hidden) || L.cls.startsWith('ring core') || (L.cls.startsWith('ring far') && (far || !compact)) || (L.cls.startsWith('prov') && (!compact || L.cls.includes('bkk') || !far)) || (L.cls === 'sea' && !compact);
      if (L.cls === 'job' && L.el.hidden) show = false;
      if (!show) { L.el.style.display = 'none'; return; }
      tmp.copy(L.v).project(camera);
      if (tmp.z > 1 || Math.abs(tmp.x) > 1.02 || Math.abs(tmp.y) > 1.02) { L.el.style.display = 'none'; return; }
      const x = (tmp.x + 1) / 2 * W, y = (1 - tmp.y) / 2 * Hh, w = L.w || (L.w = L.el.firstChild.offsetWidth || 60);
      const pri = L.cls === 'hq' || L.cls === 'job';
      if (L.cls === 'hq') L.el.classList.toggle('flip', x - w - 14 < 0);
      if (!pri && placed.some(q => Math.abs(q.x - x) < (q.w + w) / 2 + 4 && Math.abs(q.y - y) < 18)) { L.el.style.display = 'none'; return; }
      placed.push({ x, y, w }); L.el.style.display = ''; L.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
    });
  }

  /* ---------- API ---------- */
  function highlight(z) {
    const r = z && z.province ? ADDR.list.filter(x => x.p === z.province && (!z.district || x.d === z.district) && (!z.sub || x.s === z.sub)) : [];
    if (!r.length) { job.visible = false; jobLine.visible = false; jobLabel.el.hidden = true; return; }
    const lat = r.reduce((n, x) => n + x.lat, 0) / r.length, lon = r.reduce((n, x) => n + x.lon, 0) / r.length, [x, zz] = P(lon, lat);
    const y = z.province === 'กรุงเทพมหานคร' ? 1.6 : 0.9;
    job.position.set(x, y, zz); job.visible = true;
    const a = new THREE.Vector3(0, 6, 0), b = new THREE.Vector3(x, y + 5.6, zz), d = Math.hypot(x, zz), mid = a.clone().add(b).multiplyScalar(0.5); mid.y = 8 + d * 0.25;
    jobLine.geometry.dispose(); jobLine.geometry = new THREE.BufferGeometry().setFromPoints(new THREE.QuadraticBezierCurve3(a, mid, b).getPoints(40)); jobLine.visible = true;
    jobLabel.el.hidden = false; jobLabel.el.firstChild.textContent = `${z.district || z.province}${z.km != null ? ` · ~${z.km} กม.` : ''}`; jobLabel.w = 0; jobLabel.v.set(x, y + 7.4, zz);
    flyTo({ t: new THREE.Vector3(x / 2, 0, zz / 2), r: clamp(70 + d * 1.6, compact ? 70 : 80, 320), th: cam.th, ph: 0.72 }, 1200);
  }
  function fallback() {
    const all = provs.flatMap(p => p.poly.flat(2)); const xs = all.map(a => a[0]), zs = all.map(a => a[1]);
    const minX = Math.max(-170, Math.min(...xs)), maxX = Math.min(170, Math.max(...xs)), minZ = Math.max(-170, Math.min(...zs)), maxZ = Math.min(170, Math.max(...zs));
    const col = n => '#' + new THREE.Color(n).getHexString();
    stage.innerHTML = `<svg viewBox="${minX} ${minZ} ${maxX - minX} ${maxZ - minZ}" role="img" aria-label="แผนที่พื้นที่ให้บริการ กรุงเทพฯ และจังหวัดใกล้เคียง">${provs.map(p => `<path d="${p.poly.map(r => r.map(ring => 'M' + ring.map(q => q.map(v => v.toFixed(1)).join(' ')).join('L') + 'Z').join('')).join('')}" fill="${col(p.th === 'กรุงเทพมหานคร' ? C.bkk : C.land)}" stroke="${col(C.line)}" stroke-width=".4"/>`).join('')}<circle cx="0" cy="0" r="${coreR}" fill="${col(C.core)}" fill-opacity=".18" stroke="${col(C.ring)}"/>${OUTER.map(o => `<circle cx="0" cy="0" r="${o.r}" fill="none" stroke="${col(C.ring2)}" stroke-dasharray="3 2"/>`).join('')}<circle cx="0" cy="0" r="2.4" fill="${col(C.hq)}"/></svg>`;
    return { highlight() {}, setView() {} };
  }
  return { highlight, setView };
}
