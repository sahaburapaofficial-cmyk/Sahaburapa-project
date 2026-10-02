// SBP AirCare — room-fit simulator scene (Rev.09, owner request 1 ต.ค. 2569):
// the visitor's own room (W × L × H), the chosen model at its spec size, its mounting position, clearance and
// dimension lines, the cold-air throw, and the outdoor unit with the pipe route through the wall.
// Illustrative model ("แบบจำลองเพื่ออธิบาย") — distances and pipe length are estimates the team confirms on site.
// Room frame: x = width (left −, right +), z = length (back wall −L/2, front +L/2), y = up, floor at 0.
// Walls: back (faces +z), left (faces +x), right (faces −x), front (faces −z).
// Rev.09 round 3: room planner — furniture / windows / doors from roomplan.js (drag on the floor or along a wall, rotate,
// delete from a floating tool bar), the AC can be dragged along its wall (or across the ceiling for a cassette), and the
// cold air is the shared physics flow (airflow3d: soft wisps) that runs around the furniture instead of fixed beams.
import * as THREE from './three.module.min.js';
import { track as glTrack } from './gl-pool.js';
import { RoomEnvironment } from './RoomEnvironment.js';
import { materialSet, buildOutdoor, buildPremiumIndoor, orbit, canvasTex } from './ac3d.js';
import { buildCeilingUnit, buildCassetteUnit, buildFloorUnit, animateUnit } from './units3d.js';
import { mats as roomMats, rbox, F, windowUnit } from './roomkit3d.js';
import { createAirflow } from './airflow3d.js';
import { FURN, footprint, clampItem, frame2 } from './roomplan.js';

const RM = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// wall frames: inward normal n, along-axis t (left → right as seen from inside, facing the wall), rotation of a unit on it
export function wallFrame(wall, W, L) {
  switch (wall) {
    case 'left': return { n: V(1, 0, 0), t: V(0, 0, -1), o: V(-W / 2, 0, L / 2), len: L, rotY: Math.PI / 2 };
    case 'right': return { n: V(-1, 0, 0), t: V(0, 0, 1), o: V(W / 2, 0, -L / 2), len: L, rotY: -Math.PI / 2 };
    case 'front': return { n: V(0, 0, -1), t: V(-1, 0, 0), o: V(W / 2, 0, L / 2), len: W, rotY: Math.PI };
    default: return { n: V(0, 0, 1), t: V(1, 0, 0), o: V(-W / 2, 0, -L / 2), len: W, rotY: 0 };
  }
}

const PAL = {
  light: { ok: 0x1b7a45, warn: 0xd0611a, info: 0x1b5aa8, line: 0x33475e, air: 0x3aa0ff, airWarm: 0xff8a3d, pipe: 0xf1f1ee, hole: 0x2b2f35, bg: null, exposure: 1.02, env: 0.75 },
  dark: { ok: 0x4ed39a, warn: 0xffb35c, info: 0x8db9f2, line: 0xc9d6e6, air: 0x5ad0ff, airWarm: 0xff9d5c, pipe: 0xdfe3e7, hole: 0x0d1013, bg: null, exposure: 0.95, env: 0.5 },
};

export function createRoomFit3D(container, o = {}) {
  const theme = o.theme === 'dark' ? 'dark' : 'light';
  const P = PAL[theme];
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = P.exposure;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true'); renderer.domElement.classList.add('rf-canvas');
  container.append(renderer.domElement);
  const labels = document.createElement('div'); labels.className = 'rf-labels'; labels.setAttribute('aria-hidden', 'true'); container.append(labels);

  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = P.env; pm.dispose();
  const gl = glTrack(renderer, container, { scene, redraw: () => kick() });   // B1: context budget (gl-pool)
  scene.add(new THREE.HemisphereLight(0xffffff, theme === 'dark' ? 0x1a2230 : 0xd9dfe6, theme === 'dark' ? 0.45 : 0.7));
  const sun = new THREE.DirectionalLight(0xfff4e6, theme === 'dark' ? 0.9 : 1.5); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.radius = 5; sun.shadow.bias = -0.0004;
  scene.add(sun, sun.target);
  const cam = new THREE.PerspectiveCamera(36, 1, 0.05, 200);
  const K = roomMats(theme);
  const M = materialSet(theme === 'dark' ? 'showroom' : 'studio');

  const roomG = new THREE.Group(), unitG = new THREE.Group(), airG = new THREE.Group(), dimG = new THREE.Group(), outG = new THREE.Group(), refG = new THREE.Group();
  scene.add(roomG, unitG, airG, dimG, outG, refG);
  let S = null, walls = [], ceil = null, U = null, unitKey = '', roomKey = '', photoTex = null, photoKey = '';
  const lab = [];   // { el, p: Vector3 }

  /* ---------- room ---------- */
  function buildRoom(W, L, H) {
    roomG.clear(); walls = [];
    K.floorT.repeat.set(W / 1.6, L / 1.6);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(W + 0.2, 0.06, L + 0.2), K.floor); floor.position.y = -0.03; floor.receiveShadow = true; roomG.add(floor);
    const T = 0.1;
    [['back', W + 2 * T, V(0, H / 2, -L / 2 - T / 2), 0], ['front', W + 2 * T, V(0, H / 2, L / 2 + T / 2), 0], ['left', L, V(-W / 2 - T / 2, H / 2, 0), Math.PI / 2], ['right', L, V(W / 2 + T / 2, H / 2, 0), Math.PI / 2]].forEach(([id, len, p, ry]) => {
      const mat = K.wall.clone(); mat.transparent = true;
      const m = new THREE.Mesh(new THREE.BoxGeometry(len, H, T), mat); m.position.copy(p); m.rotation.y = ry; m.receiveShadow = true; m.castShadow = false;
      // skirting on the room side of each wall (local +z faces the room for back/left, −z for front/right)
      const base = new THREE.Mesh(new THREE.BoxGeometry(len - 2 * T - 0.002, 0.08, 0.012), K.base); base.position.set(0, -H / 2 + 0.04, { back: 1, left: 1, front: -1, right: -1 }[id] * (T / 2 + 0.006));
      m.add(base);
      m.userData = { id, n: wallFrame(id, W, L).n }; roomG.add(m); walls.push(m);
    });
    const cm = K.ceiling.clone(); cm.transparent = true; cm.opacity = 0.32; cm.depthWrite = false; cm.side = THREE.DoubleSide;
    ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, L), cm); ceil.rotation.x = Math.PI / 2; ceil.position.y = H; roomG.add(ceil);
    // grid on the floor every 0.5 m (reads as scale)
    const grid = new THREE.GridHelper(Math.max(W, L), Math.round(Math.max(W, L) / 0.5), 0x000000, 0x000000);
    grid.material.transparent = true; grid.material.opacity = theme === 'dark' ? 0.12 : 0.07; grid.position.y = 0.002; grid.scale.set(W / Math.max(W, L), 1, L / Math.max(W, L)); roomG.add(grid); gridLine = grid;
    // reference: a 1.70 m person standing in the room
    refG.clear(); refG.add(person());
    sun.position.set(W * 0.6 + 2, H + 4, L * 0.5 + 3); sun.target.position.set(0, 0, 0);
    const sc = sun.shadow.camera, R = Math.max(W, L) * 0.8 + 1; sc.left = sc.bottom = -R; sc.right = sc.top = R; sc.near = 0.5; sc.far = 40; sc.updateProjectionMatrix();
  }
  function person() {
    const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: theme === 'dark' ? 0x7d8ea3 : 0x9aa8b8, roughness: 0.8 });
    const cap = (r, l, x, y, z) => { const c = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 6, 12), m); c.position.set(x, y, z); c.castShadow = true; g.add(c); return c; };
    cap(0.075, 0.72, -0.1, 0.44, 0); cap(0.075, 0.72, 0.1, 0.44, 0);   // legs
    cap(0.17, 0.42, 0, 1.13, 0);                                          // torso
    cap(0.055, 0.5, -0.24, 1.12, 0).rotation.z = 0.08; cap(0.055, 0.5, 0.24, 1.12, 0).rotation.z = -0.08;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 16), m); head.position.y = 1.59; head.castShadow = true; g.add(head);
    g.userData.h = 1.7; return g;
  }

  /* ---------- unit ---------- */
  function buildUnitBody(u) {
    unitG.clear(); U = null;
    const t = u.type, d = u.dims;
    let root;
    if (t === 'floor') { U = buildFloorUnit(M, { w: d.w, h: d.h, d: d.d }); root = U.root; }
    else if (t === 'ceiling') { U = buildCeilingUnit(M, { interior: false, rod: 0 }); U.parts.hangers && (U.parts.hangers.visible = false); root = U.root; fitTo(root, d.w, d.h, d.d); }
    else if (t === 'cassette') { U = buildCassetteUnit(M, { interior: false, rod: 0 }); U.parts.hangers && (U.parts.hangers.visible = false); root = U.root; const s = d.w / 0.84; root.scale.set(s, d.h / 0.246, s); }
    else { U = buildPremiumIndoor(M, { logo: !!u.logo }); U.anim = { spin: [{ obj: U.parts.blower.userData.spin, axis: 'x', rate: -9 }], flaps: [{ obj: U.parts.louver.userData.flap, axis: 'x', base: 0.5, amp: 0.2, speed: 0.9 }], vanes: [] }; root = U.root; fitTo(root, d.w, d.h, d.d); }
    root.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    const holder = new THREE.Group(); holder.add(root); unitG.add(holder); U.holder = holder;
    // photo card (real product photo at true size on the front face) — shown in "ภาพจริง" mode
    const ph = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, depthWrite: false }));
    ph.visible = false; holder.add(ph); U.photo = ph;
  }
  // scale a built root so its bounding box is exactly w × h × d and centred on the origin
  function fitTo(root, w, h, d) {
    root.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(root), sz = bb.getSize(V(0, 0, 0)), c = bb.getCenter(V(0, 0, 0));
    root.scale.set(w / sz.x, h / sz.y, d / sz.z); root.position.set(-c.x * w / sz.x, -c.y * h / sz.y, -c.z * d / sz.z);
  }
  function setPhoto(url, u) {
    if (!U) return;
    if (!url) { U.photo.visible = false; return; }
    const apply = tex => {
      const img = tex.image, ar = img.width / img.height, d = u.dims;
      let pw = d.w, ph = d.w / ar; if (u.type === 'floor' && ph < d.h) { ph = d.h; pw = d.h * ar; } else if (ph > d.h * 1.25 && u.type !== 'floor') { ph = d.h * 1.25; pw = ph * ar; }
      U.photo.material.map = tex; U.photo.material.needsUpdate = true; U.photo.scale.set(pw, ph, 1);
      U.photo.position.set(0, u.type === 'floor' ? ph / 2 : u.type === 'cassette' ? -0.05 : 0, u.type === 'cassette' ? 0 : d.d / 2 + 0.004);
      if (u.type === 'cassette') U.photo.rotation.x = Math.PI / 2; else U.photo.rotation.x = 0;
      U.photo.visible = true;
    };
    if (photoTex && photoKey === url) { apply(photoTex); return; }
    new THREE.TextureLoader().load(url, tex => { tex.colorSpace = THREE.SRGBColorSpace; photoTex && photoTex.dispose(); photoTex = tex; photoKey = url; if (S && S.photo) apply(tex); }, undefined, () => { U && (U.photo.visible = false); });
  }

  /* ---------- placement (returns world anchors used by dims, air and pipes) ---------- */
  function place(s) {
    const { w: W, l: L, h: H } = s.room, u = s.unit, d = u.dims, p = s.place;
    const hold = U.holder; hold.rotation.set(0, 0, 0);
    const A = {};
    if (u.type === 'cassette') {
      const x = clamp(p.cx, -W / 2 + d.w / 2, W / 2 - d.w / 2), z = clamp(p.cz, -L / 2 + d.w / 2, L / 2 - d.w / 2);
      hold.position.set(x, H, z); A.center = V(x, H, z); A.out = [V(1, 0, 0), V(-1, 0, 0), V(0, 0, 1), V(0, 0, -1)].map(n => ({ n, at: V(x, H - 0.03, z).addScaledVector(n, 0.37 * d.w / 0.84) }));
      A.wallBack = V(x, H, z); A.frame = null;
      return A;
    }
    const f = wallFrame(p.wall, W, L);
    const along = clamp(p.along, d.w / 2, f.len - d.w / 2);
    const base = f.o.clone().addScaledVector(f.t, along);
    let y;
    if (u.type === 'wall') y = p.height + d.h / 2;
    else if (u.type === 'ceiling') y = H - p.gap - d.h / 2;
    else y = 0;
    const c = base.clone().addScaledVector(f.n, d.d / 2 + 0.006); c.y = y;
    hold.position.copy(c); hold.rotation.y = f.rotY;
    A.frame = f; A.along = along; A.center = c; A.wallPt = base.clone().setY(y);
    const outY = u.type === 'floor' ? d.h * 0.83 : u.type === 'ceiling' ? y - d.h * 0.2 : y - d.h * 0.36;
    A.out = [{ n: f.n.clone(), at: c.clone().addScaledVector(f.n, d.d / 2).setY(outY) }];
    return A;
  }

  /* ---------- dimension lines with HTML labels ---------- */
  const lineMat = c => new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: 0.95, depthTest: false });
  function dim(a, b, text, kind = 'line', tick = null, minor = false) {   // minor = hidden on phone-size stages unless it is a warning (the panel lists every value)
    const col = kind === 'warn' ? P.warn : kind === 'ok' ? P.ok : P.line;
    const g = new THREE.BufferGeometry().setFromPoints([a, b]);
    const ln = new THREE.Line(g, lineMat(col)); ln.renderOrder = 10; dimG.add(ln);
    const tk = tick || V(0, 0, 0);
    if (tick) [a, b].forEach(p => { const tg = new THREE.BufferGeometry().setFromPoints([p.clone().addScaledVector(tk, -0.04), p.clone().addScaledVector(tk, 0.04)]); const t = new THREE.Line(tg, lineMat(col)); t.renderOrder = 10; dimG.add(t); });
    const el = document.createElement('span'); el.className = 'rf-dim ' + kind + (minor ? ' minor' : ''); el.textContent = text; labels.append(el);
    lab.push({ el, p: a.clone().lerp(b, 0.5) });
  }
  function note(p, text, kind = 'tag') { const el = document.createElement('span'); el.className = 'rf-dim ' + kind; el.textContent = text; labels.append(el); lab.push({ el, p: p.clone() }); }
  const cm = m => `${Math.round(m * 100)} ซม.`;
  const mm = m => `${(m).toFixed(2)} ม.`;

  function drawDims(s, A, R) {
    dimG.clear(); labels.innerHTML = ''; lab.length = 0;
    if (!s.show.dims) return;
    const { w: W, l: L, h: H } = s.room, u = s.unit, d = u.dims;
    const k = id => (R.gaps[id] && R.gaps[id].ok === false ? 'warn' : 'ok');
    if (u.type === 'cassette') {
      const c = A.center; const y = H - 0.01;
      dim(V(-W / 2, y, c.z), V(c.x - d.w / 2 - 0.055, y, c.z), cm(R.gaps.left.v), k('left'), V(0, 0, 1), true);
      dim(V(c.x + d.w / 2 + 0.055, y, c.z), V(W / 2, y, c.z), cm(R.gaps.right.v), k('right'), V(0, 0, 1), true);
      dim(V(c.x, y, -L / 2), V(c.x, y, c.z - d.w / 2 - 0.055), cm(R.gaps.back.v), k('back'), V(1, 0, 0));
      dim(V(c.x, y, c.z + d.w / 2 + 0.055), V(c.x, y, L / 2), cm(R.gaps.front.v), k('front'), V(1, 0, 0));
      dim(V(W / 2 - 0.02, 0, L / 2 - 0.02), V(W / 2 - 0.02, H, L / 2 - 0.02), `สูงถึงฝ้า ${mm(H)}`, 'line', V(1, 0, 0), true);
      return;
    }
    const f = A.frame, off = f.n.clone().multiplyScalar(0.03), t = f.t, c = A.center;
    const top = c.y + d.h / 2, bot = c.y - d.h / 2;
    const left = A.wallPt.clone().addScaledVector(t, -d.w / 2).add(off), right = A.wallPt.clone().addScaledVector(t, d.w / 2).add(off);
    const wallL = f.o.clone().add(off), wallR = f.o.clone().addScaledVector(t, f.len).add(off);
    const yMid = c.y;
    if (u.type !== 'floor') dim(V(c.x, top, c.z).addScaledVector(f.n, -d.d / 2 + 0.02).add(off), V(c.x, H, c.z).addScaledVector(f.n, -d.d / 2 + 0.02).add(off), `ห่างฝ้า ${cm(R.gaps.top.v)}`, k('top'), t);
    else dim(V(c.x, top, c.z).addScaledVector(f.n, -d.d / 2 + 0.02).add(off), V(c.x, H, c.z).addScaledVector(f.n, -d.d / 2 + 0.02).add(off), `ด้านบน ${cm(R.gaps.top.v)}`, k('top'), t);
    if (u.type === 'wall') dim(V(c.x, 0, c.z).addScaledVector(f.n, -d.d / 2 + 0.02).add(off).addScaledVector(t, d.w * 0.25), V(c.x, bot, c.z).addScaledVector(f.n, -d.d / 2 + 0.02).add(off).addScaledVector(t, d.w * 0.25), `ใต้เครื่องสูงจากพื้น ${mm(bot)}`, k('bottom'), t);
    if (u.type === 'ceiling') dim(V(c.x, 0, c.z).addScaledVector(f.n, -d.d / 2 + 0.02).add(off).addScaledVector(t, d.w * 0.3), V(c.x, bot, c.z).addScaledVector(f.n, -d.d / 2 + 0.02).add(off).addScaledVector(t, d.w * 0.3), `ใต้เครื่อง ${mm(bot)}`, k('bottom'), t);
    dim(wallL.clone().setY(yMid), left.clone().setY(yMid), cm(R.gaps.left.v), k('left'), V(0, 1, 0), true);
    dim(right.clone().setY(yMid), wallR.clone().setY(yMid), cm(R.gaps.right.v), k('right'), V(0, 1, 0), true);
    dim(left.clone().setY(bot - 0.07), right.clone().setY(bot - 0.07), `เครื่องกว้าง ${cm(d.w)}`, 'line', V(0, 1, 0), true);
    // room height on the far corner
    const corner = f.o.clone().addScaledVector(t, f.len).addScaledVector(f.n, 0.02);
    dim(corner.clone().setY(0), corner.clone().setY(H), `สูงถึงฝ้า ${mm(H)}`, 'line', f.n, true);
    // throw reach tag
    if (A.out[0] && s.show.air) note(A.out[0].at.clone().addScaledVector(A.out[0].n, Math.min(R.throw, R.depth) * 0.75).setY(Math.max(0.3, A.out[0].at.y - 0.9)), `ลมเย็นไปถึง ~${R.throw.toFixed(1)} ม.${R.depth > R.throw * 1.15 ? ' · ห้องลึก ' + R.depth.toFixed(1) + ' ม.' : ''}`, R.depth > R.throw * 1.15 ? 'warn' : 'tag');
  }

  /* ---------- cold air: the shared physics flow (soft wisps), around the furniture ---------- */
  const air = createAirflow(airG, { count: 1500, dark: theme === 'dark', width: 0.024, trail: 0.2, plumeShare: 0, haze: 0.3 });
  let airKey = '';
  const DRAG = { wall: 0.52, ceiling: 0.53, cassette: 0.85, floor: 0.5 };   // = airflow3d jet decay per type
  function drawAir(s, A, R, live) {
    air.visible(!!s.show.air); if (!s.show.air) { airKey = ''; return; }
    const u = s.unit, d = u.dims, H = s.room.h, kind = u.type;
    // launch speed chosen so the drawn reach matches the throw used by the checks (decay × throw + stop speed)
    const v0 = clamp(R.throw * DRAG[kind] + 0.14, 1.2, 6.5);
    const E = A.out.map(({ n, at }) => {
      const e = { o: at.clone(), f: n.clone().setY(0).normalize(), r: V(n.z, 0, -n.x), kind, v0 };
      if (kind === 'cassette') { e.width = 0.6 * d.w / 0.84; e.intake = A.center.clone().setY(H - 0.15); }
      else { e.width = d.w * 0.8; e.intake = kind === 'wall' ? A.center.clone().setY(A.center.y + d.h / 2 + 0.05) : kind === 'floor' ? A.center.clone().addScaledVector(n, d.d / 2 + 0.1).setY(0.45) : A.center.clone().addScaledVector(n, -d.d * 0.2).setY(A.center.y - d.h / 2 - 0.05); }
      return e;
    });
    const key = [s.room.w, s.room.l, H, kind, v0.toFixed(2), ...E.map(e => [e.o.x, e.o.y, e.o.z, e.f.x, e.f.z].map(v => v.toFixed(2)).join())].join('|');
    air.obstacles(obstacles(s));
    if (key === airKey) return;
    air.setRoom({ w: s.room.w, d: s.room.l, h: H, x0: 0, z0: 0 });
    air.setEmitters(E);
    air.set({ running: true, swing: true, fan: 1, airF: 1, supplyT: 14, roomT: 30, dark: theme === 'dark' });
    if (!live) air.prewarm(110, 0.05);   // settled flow at once (not while the unit is being dragged)
    airKey = live ? 'live' : key;
  }
  // furniture as boxes the air flows over / around (rugs and wall openings are not obstacles)
  function obstacles(s) {
    return (s.furn || []).filter(it => !FURN[it.k].wallItem && !FURN[it.k].flat).map(it => { const fp = footprint(it); return { minX: it.x - fp.hx, maxX: it.x + fp.hx, minZ: it.z - fp.hz, maxZ: it.z + fp.hz, minY: 0, maxY: fp.h }; });
  }

  /* ---------- furniture, windows and doors (room planner) ---------- */
  const furnG = new THREE.Group(); scene.add(furnG);
  const FM = new Map();   // id → { g, k, it }
  const BUILD = {
    bed: () => F.bed(K, 1.6, 2.0), bedS: () => F.bed(K, 1.07, 2.0), side: () => F.side(K), wardrobe: () => F.wardrobe(K), sofa: () => F.sofa(K, 2.1), armchair: () => F.armchair(K),
    coffee: () => F.coffee(K), tv: () => F.tv(K, 1.5), rug: () => F.rug(K, 2.0, 1.4), dining: () => F.dining(K), desk: () => F.desk(K), shelf: () => F.shelf(K, 1.0, 1.8),
    meeting: () => F.meeting(K), work4: () => F.work4(K), fridge: () => F.fridge(K), counter: () => F.counter(K), rack: () => F.rack(K), plant: () => F.plant(K, 1.3), lamp: () => F.lamp(K),
    window: () => { const f = FURN.window, g = new THREE.Group(), w = windowUnit(K, f.w, f.h); w.position.set(0, f.sill + f.h / 2, 0.09); g.add(w);
      [-1, 1].forEach(sd => { const c = F.curtain(K, 0.42, f.h + 0.55); c.position.set(sd * (f.w / 2 + 0.3), Math.max(0.02, f.sill - 0.3), 0.16); g.add(c); }); return g; },
    door: () => { const g = new THREE.Group(), d = F.door(K, FURN.door.w, FURN.door.h); d.position.z = 0.045; g.add(d); return g; },
  };
  function buildFurn(it) {
    const g = (BUILD[it.k] || (() => new THREE.Group()))();
    g.traverse(o => { if (o.isLight) o.intensity = 0; if (o.isMesh) { o.castShadow = !FURN[it.k].flat; o.receiveShadow = true; o.material = o.material.clone(); } });   // no extra lights (a new light recompiles every material); own materials so a piece can fade alone
    g.userData.fid = it.id; furnG.add(g); return { g, k: it.k, faded: false };
  }
  function placeFurn(e, it, s) {
    const f = FURN[it.k];
    if (f.wallItem) { const fr = frame2(it.wall, s.room.w, s.room.l); e.g.position.set(fr.o[0] + fr.t[0] * it.along, 0, fr.o[1] + fr.t[1] * it.along); e.g.rotation.set(0, wallFrame(it.wall, s.room.w, s.room.l).rotY, 0); e.g.userData.wall = it.wall; }
    else { e.g.position.set(it.x, 0, it.z); e.g.rotation.set(0, (it.q || 0) * Math.PI / 2, 0); }
  }
  function syncFurn(s) {
    const seen = new Set();
    (s.furn || []).forEach(it => { seen.add(it.id); let e = FM.get(it.id); if (!e || e.k !== it.k) { if (e) disposeObj(e.g); e = buildFurn(it); FM.set(it.id, e); } e.it = it; placeFurn(e, it, s); });
    [...FM.keys()].forEach(id => { if (!seen.has(id)) { disposeObj(FM.get(id).g); FM.delete(id); if (selId === id) select(null, true); } });
  }
  function disposeObj(g) { g.parent && g.parent.remove(g); g.traverse(o => { if (o.isMesh && o.geometry && !o.geometry.parameters?.shapes) o.geometry.dispose(); }); }

  /* ---------- outdoor unit + pipe route (through the mounting wall) ---------- */
  function drawOutdoor(s, A, R) {
    outG.clear();
    walls.forEach(w => { w.material.opacity = 1; w.material.depthWrite = true; });
    if (!s.show.pipe || !A.frame || s.unit.type === 'cassette' && !A.frame) return;
    const f = A.frame, { h: H } = s.room, d = s.unit.dims;
    const mw = walls.find(w => w.userData.id === (s.place.wall || 'back')); if (mw) { mw.material.opacity = 0.42; mw.material.depthWrite = false; }
    const outN = f.n.clone().negate();                         // outside the mounting wall
    const exitAlong = A.along - d.w / 2 + 0.08;                // pipe hole behind the left end of the unit
    const holeY = s.unit.type === 'floor' ? 0.25 : A.center.y - d.h * 0.25;
    const hole = f.o.clone().addScaledVector(f.t, exitAlong).setY(holeY);
    const outAlong = clamp(exitAlong + (s.outdoor.side === 'left' ? -1 : 1) * s.outdoor.run, 0.4, f.len - 0.4);
    const ouY = clamp(holeY - s.outdoor.drop, 0.05, H + 6);
    const O = buildOutdoor(M); const sc = 0.8; O.root.scale.setScalar(sc);
    const ou = f.o.clone().addScaledVector(f.t, outAlong).addScaledVector(outN, 0.1 + 0.15 + 0.3 * sc / 2).setY(ouY + 0.55 * sc / 2);
    O.root.position.copy(ou); O.root.rotation.y = f.rotY + Math.PI; O.root.traverse(m => { if (m.isMesh) m.castShadow = true; });
    outG.add(O.root);
    // outside: a balcony / ground slab when the unit stands low, otherwise a wall bracket
    if (ouY < 0.6) { const slab = new THREE.Mesh(new THREE.BoxGeometry(Math.min(f.len, 2.6), 0.08, 1.1), K.concrete); slab.position.copy(f.o.clone().addScaledVector(f.t, outAlong).addScaledVector(outN, 0.1 + 0.55).setY(ouY - 0.04)); slab.rotation.y = f.rotY; slab.receiveShadow = true; outG.add(slab); }
    // bracket
    const br = new THREE.MeshStandardMaterial({ color: 0x2b2f35, roughness: 0.5, metalness: 0.6 });
    [-1, 1].forEach(k => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.45), br); b.position.copy(f.o.clone().addScaledVector(f.t, outAlong + k * 0.25).addScaledVector(outN, 0.1 + 0.22).setY(ouY - 0.02)); b.rotation.y = f.rotY; outG.add(b); });
    // route: hole → outside face → along (horizontal at hole height) → down/up to the outdoor unit valves; drawn as a white trunk
    const pOut = hole.clone().addScaledVector(outN, 0.1 + 0.04);
    const valve = f.o.clone().addScaledVector(f.t, outAlong + 0.3 * sc).addScaledVector(outN, 0.1 + 0.04).setY(ouY + 0.12);
    const pts = [hole.clone().addScaledVector(f.n, 0.01), pOut, pOut.clone().setY(valve.y > pOut.y ? pOut.y : valve.y), V(valve.x, valve.y > pOut.y ? pOut.y : valve.y, valve.z), valve];
    const trunkM = new THREE.MeshStandardMaterial({ color: P.pipe, roughness: 0.45 });
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], L2 = a.distanceTo(b); if (L2 < 0.01) continue;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, L2 + 0.06), trunkM); m.position.copy(a).lerp(b, 0.5); m.lookAt(b); m.castShadow = true; outG.add(m);
    }
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 24), trunkM); rim.position.copy(hole.clone().addScaledVector(f.n, 0.006)); rim.quaternion.setFromUnitVectors(V(0, 1, 0), f.n); outG.add(rim);
    if (s.show.dims) note(valve.clone().addScaledVector(outN, 0.2).setY(valve.y - 0.32), `ท่อ ~${R.pipe.len.toFixed(1)} ม.${R.pipe.extra > 0 ? ` (เกิน ${R.pipe.extra} ม.)` : ' (รวมในราคา)'}`, R.pipe.extra > 0 ? 'warn' : 'ok');
  }

  /* ---------- camera ---------- */
  const st = { theta: 0.55, phi: 1.05, radius: 8, minR: 2, maxR: 40, wheelZoom: false, target: V(0, 1.2, 0) };
  const goal = { theta: 0.55, phi: 1.05, radius: 8, target: V(0, 1.2, 0) };
  let mode = 'iso', userMoved = false;
  orbit(renderer.domElement, st, () => { userMoved = true; goal.theta = st.theta; goal.phi = st.phi; kick(); });
  function frame(m = mode) {
    mode = m; userMoved = false;
    if (!S) return;
    const { w: W, l: L, h: H } = S.room;
    const n = S.unit.type === 'cassette' ? V(0, 0, 1) : wallFrame(S.place.wall, W, L).n;
    const base = Math.atan2(n.x, n.z);
    const span = Math.max(W, L, H * 1.3);
    const asp = Math.max(0.6, cam.aspect);   // iso: square/portrait phone stages need more distance
    if (m === 'top') { goal.theta = base; goal.phi = 0.12; goal.radius = span * 1.55 / Math.min(1, asp); goal.target = V(0, 0, 0); }
    else if (m === 'front') { goal.theta = base; goal.phi = Math.PI / 2 - 0.04; goal.radius = Math.max(W, L) * 1.25 / Math.min(1, asp) + 1; const c = U && U.holder ? U.holder.position : V(0, H / 2, 0); goal.target = V(S.unit.type === 'cassette' ? 0 : c.x * 0.5, H * 0.5, S.unit.type === 'cassette' ? 0 : c.z * 0.5); }
    else {   // planner view: the whole furnished room from a high corner (~50° from above), framed by its bounding sphere
      const c = U && U.holder ? U.holder.position : V(0, H / 2, 0), rs = 0.5 * Math.hypot(W, L, H);
      const half = Math.min(THREE.MathUtils.degToRad(cam.fov / 2), Math.atan(Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.aspect));
      goal.theta = base + 0.62; goal.phi = 0.88; goal.radius = rs / Math.sin(half) * (cam.aspect < 1.2 ? 0.98 : 0.84); goal.target = V(c.x * 0.15, H * 0.3, c.z * 0.15);
    }
    if (RM()) { st.theta = goal.theta; st.phi = goal.phi; st.radius = goal.radius; st.target.copy(goal.target); }
  }
  function updCam(dt) {
    const k = RM() ? 1 : 1 - Math.pow(0.0015, dt);
    if (!userMoved) { st.theta += (goal.theta - st.theta) * k; st.phi += (goal.phi - st.phi) * k; }
    st.radius += (goal.radius - st.radius) * k; st.target.lerp(goal.target, k);
    cam.position.set(st.target.x + st.radius * Math.sin(st.phi) * Math.sin(st.theta), st.target.y + st.radius * Math.cos(st.phi), st.target.z + st.radius * Math.sin(st.phi) * Math.cos(st.theta));
    cam.lookAt(st.target);
  }
  // dollhouse: walls between the camera and the room fade out, the ceiling shows only when looking from below
  function cutaway() {
    walls.forEach(w => {
      const n = w.userData.n, toCam = cam.position.clone().sub(w.position); const outside = toCam.dot(n) < 0;
      w.visible = !outside;
    });
    FM.forEach(e => {
      if (e.g.userData.wall) { const wm = walls.find(w => w.userData.id === e.g.userData.wall); e.g.visible = !wm || wm.visible; return; }
      // tall pieces standing against a cut-away wall fade out (they would hide the room from this angle), like a dollhouse view
      const it = e.it, fp = it && footprint(it); if (!fp) return;
      const near = fp.h >= 1.4 && walls.some(w => !w.visible && (w.userData.id === 'back' ? it.z - fp.hz < -S.room.l / 2 + 0.3 : w.userData.id === 'front' ? it.z + fp.hz > S.room.l / 2 - 0.3 : w.userData.id === 'left' ? it.x - fp.hx < -S.room.w / 2 + 0.3 : it.x + fp.hx > S.room.w / 2 - 0.3));
      if (near !== e.faded) { e.faded = near; e.g.traverse(o => { if (o.isMesh) { o.material.transparent = near; o.material.opacity = near ? 0.22 : 1; o.material.depthWrite = !near; o.castShadow = !near && !FURN[it.k].flat; } }); }
    });
    if (ceil) ceil.visible = cam.position.y < S.room.h - 0.05 || S.unit.type === 'cassette' || S.unit.type === 'ceiling';
    if (ceil) ceil.material.opacity = cam.position.y > S.room.h ? 0.18 : 0.6;
  }

  /* ---------- select · drag · tool bar (room planner) ---------- */
  const ACC = theme === 'dark' ? 0x5ad0ff : 0x1b5aa8, BAD = theme === 'dark' ? 0xff6b6b : 0xc8312b;
  const selLine = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: ACC, transparent: true, opacity: 0.95, depthTest: false }));
  selLine.renderOrder = 30; selLine.visible = false; scene.add(selLine);
  const selFoot = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: ACC, transparent: true, opacity: 0.2, depthWrite: false }));
  selFoot.rotation.x = -Math.PI / 2; selFoot.renderOrder = 4; selFoot.visible = false; scene.add(selFoot);
  const tool = document.createElement('div'); tool.className = 'rf-tool'; tool.hidden = true; container.append(tool);
  let selId = null, drag = null, gridLine = null;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hitP = V(0, 0, 0), bb = new THREE.Box3();
  const setNdc = e => { const r = renderer.domElement.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, cam); };
  // what is under the pointer: a furniture piece / window / door (its id), or the AC ('unit')
  function pick(e) {
    setNdc(e);
    const list = [...FM.values()].filter(f => f.g.visible).map(f => f.g); if (U && U.holder) list.push(U.holder);
    const hit = ray.intersectObjects(list, true).find(h2 => h2.object.visible && !h2.object.isLine);
    if (!hit) return null;
    for (let o = hit.object; o; o = o.parent) { if (o.userData.fid) return o.userData.fid; if (U && o === U.holder) return 'unit'; }
    return null;
  }
  function select(id, quiet) {
    selId = id; renderer.domElement.style.touchAction = id ? 'none' : 'pan-y';   // phones: a selected piece drags, the page does not scroll under it
    updSel(); if (!quiet && o.onPick) o.onPick(id === 'unit' ? null : id); kick();
  }
  function selObj() { if (selId === 'unit') return U && U.holder; const e = FM.get(selId); return e && e.g; }
  function updSel() {
    const g = selObj();
    selLine.visible = selFoot.visible = !!g; tool.hidden = !g; if (!g) { if (gridLine) gridLine.material.opacity = theme === 'dark' ? 0.12 : 0.07; return; }
    bb.setFromObject(g, true); const c = bb.getCenter(V(0, 0, 0)), sz = bb.getSize(V(0, 0, 0));
    selLine.position.copy(c); selLine.scale.set(Math.max(0.05, sz.x + 0.04), Math.max(0.05, sz.y + 0.04), Math.max(0.05, sz.z + 0.04));
    const e = FM.get(selId), it = e && e.it;
    const bad = !!(it && !FURN[it.k].wallItem && !FURN[it.k].flat && S && S.furn.some(o2 => o2 !== it && !FURN[o2.k].wallItem && !FURN[o2.k].flat && (() => { const A2 = footprint(it), B2 = footprint(o2); return Math.abs(it.x - o2.x) < A2.hx + B2.hx - 0.02 && Math.abs(it.z - o2.z) < A2.hz + B2.hz - 0.02; })()));
    selLine.material.color.setHex(bad ? BAD : ACC); selFoot.material.color.setHex(bad ? BAD : ACC);
    selFoot.visible = !!(it && !FURN[it.k].wallItem); if (selFoot.visible) { const fp = footprint(it); selFoot.position.set(it.x, 0.006, it.z); selFoot.scale.set(fp.hx * 2 + 0.06, fp.hz * 2 + 0.06, 1); }
    if (gridLine) gridLine.material.opacity = theme === 'dark' ? 0.24 : 0.16;   // "build mode": the 50 cm grid shows while a piece is selected
    // tool bar content
    tool.innerHTML = '';
    const btn = (th, fn, cls = '') => { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.textContent = th; b.addEventListener('click', ev => { ev.stopPropagation(); fn(); }); tool.append(b); };
    const name = document.createElement('b'); name.textContent = selId === 'unit' ? 'แอร์ · ลากเพื่อเลื่อน' : FURN[it.k].th + (bad ? ' · วางทับกัน' : ''); tool.append(name);
    if (selId !== 'unit') {
      if (FURN[it.k].wallItem) btn('ผนังถัดไป', () => o.actions && o.actions.nextWall(selId)); else btn('หมุน', () => o.actions && o.actions.rotate(selId));
      btn('ลบ', () => o.actions && o.actions.remove(selId), 'del');
    }
    btn('ปิด', () => select(null), 'x');
  }
  function placeTool() {
    const g = selObj(); if (!g || tool.hidden) return;
    bb.setFromObject(g, true); const top = V((bb.min.x + bb.max.x) / 2, bb.max.y, (bb.min.z + bb.max.z) / 2).project(cam);
    const W = renderer.domElement.clientWidth, Hh = renderer.domElement.clientHeight, tw = tool.offsetWidth || 160;
    const x = clamp((top.x + 1) / 2 * W, tw / 2 + 4, W - tw / 2 - 4), y = clamp((1 - top.y) / 2 * Hh - 14, 34, Hh - 8);
    tool.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
  }
  const snap = v => Math.round(v / 0.05) * 0.05;
  function startDrag(e, id) {
    const g = selObj(); if (!g) return;
    let plane, kind;
    if (id === 'unit') {
      if (!S || !A) return;
      if (S.unit.type === 'cassette') { plane = new THREE.Plane(V(0, -1, 0), S.room.h); kind = 'cas'; }
      else { const f = A.frame; plane = new THREE.Plane().setFromNormalAndCoplanarPoint(f.n, f.o); kind = 'unit'; }
    } else {
      const it = FM.get(id).it;
      if (FURN[it.k].wallItem) { const f = wallFrame(it.wall, S.room.w, S.room.l); plane = new THREE.Plane().setFromNormalAndCoplanarPoint(f.n, f.o); kind = 'wallItem'; }
      else { plane = new THREE.Plane(V(0, 1, 0), 0); kind = 'floor'; }
    }
    setNdc(e); if (!ray.ray.intersectPlane(plane, hitP)) return;
    drag = { id, kind, plane, start: hitP.clone(), x0: e.clientX, y0: e.clientY, moved: false, ref: { along: S.place.along, height: S.place.height, cx: S.place.cx, cz: S.place.cz } };
    if (kind === 'floor' || kind === 'wallItem') { const it = FM.get(id).it; drag.ref = { x: it.x, z: it.z, along: it.along }; }
    container.style.cursor = 'grabbing';
  }
  function moveDrag(e) {
    if (!drag) return;
    if (!drag.moved && Math.abs(e.clientX - drag.x0) + Math.abs(e.clientY - drag.y0) < 3) return;
    drag.moved = true; setNdc(e); if (!ray.ray.intersectPlane(drag.plane, hitP)) return;
    const dv = hitP.clone().sub(drag.start), { w: W, l: L } = S.room;
    if (drag.kind === 'floor') { const it = FM.get(drag.id).it; it.x = snap(drag.ref.x + dv.x); it.z = snap(drag.ref.z + dv.z); clampItem(it, W, L); placeFurn(FM.get(drag.id), it, S); o.onEdit && o.onEdit('furn', true); }
    else if (drag.kind === 'wallItem') { const it = FM.get(drag.id).it, f = wallFrame(it.wall, W, L); it.along = snap(drag.ref.along + dv.dot(f.t)); clampItem(it, W, L); placeFurn(FM.get(drag.id), it, S); o.onEdit && o.onEdit('wallItem', true); }
    else if (drag.kind === 'cas') { S.place.cx = snap(drag.ref.cx + dv.x); S.place.cz = snap(drag.ref.cz + dv.z); o.onEdit && o.onEdit('unit', true); }
    else { S.place.along = snap(drag.ref.along + dv.dot(A.frame.t)); if (S.unit.type === 'wall') S.place.height = snap(drag.ref.height + dv.y); o.onEdit && o.onEdit('unit', true); }
    updSel(); kick();
  }
  function endDrag() {
    if (!drag) return; const d = drag; drag = null; container.style.cursor = '';
    if (d.moved && o.onEdit) o.onEdit(d.kind === 'cas' ? 'unit' : d.kind === 'floor' ? 'furn' : d.kind, false);
  }
  let downEmpty = null;
  // capture phase on the container: a press on a piece never reaches the orbit control on the canvas
  container.addEventListener('pointerdown', e => {
    if (e.target.closest && e.target.closest('.rf-tool')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const id = pick(e);
    if (!id) { downEmpty = { x: e.clientX, y: e.clientY }; return; }
    e.stopPropagation(); downEmpty = null;
    if (selId !== id) select(id);
    startDrag(e, id); try { container.setPointerCapture(e.pointerId); } catch (_) {}
    kick();
  }, { capture: true });
  container.addEventListener('pointermove', e => { if (drag) { moveDrag(e); return; } hover(e); });
  const up = e => { if (drag) { endDrag(); try { container.releasePointerCapture(e.pointerId); } catch (_) {} return; } if (downEmpty && Math.abs(e.clientX - downEmpty.x) + Math.abs(e.clientY - downEmpty.y) < 4 && selId) select(null); downEmpty = null; };
  container.addEventListener('pointerup', up); container.addEventListener('pointercancel', () => { endDrag(); downEmpty = null; });
  let hovT = 0;
  function hover(e) { if (e.pointerType !== 'mouse') return; const now = performance.now(); if (now - hovT < 60) return; hovT = now; container.style.cursor = pick(e) ? 'grab' : ''; }
  // keyboard: arrows move the selected piece 10 cm, R turns it, Delete removes it, Esc lets go
  container.tabIndex = 0; container.setAttribute('role', 'group'); container.setAttribute('aria-label', 'ห้อง 3 มิติ · เลือกของจากรายการ "จัดห้องของคุณ" แล้วใช้ปุ่มลูกศรเพื่อย้าย R เพื่อหมุน Delete เพื่อลบ');
  container.addEventListener('keydown', e => {
    if (!selId || !S || e.target !== container) return;
    const st2 = { ArrowLeft: [-0.1, 0], ArrowRight: [0.1, 0], ArrowUp: [0, -0.1], ArrowDown: [0, 0.1] }[e.key];
    const e2 = FM.get(selId), it = e2 && e2.it;
    if (st2 && it) { e.preventDefault(); if (FURN[it.k].wallItem) it.along += st2[0] + st2[1]; else { it.x += st2[0]; it.z += st2[1]; } clampItem(it, S.room.w, S.room.l); placeFurn(e2, it, S); updSel(); o.onEdit && o.onEdit('furn', false); }
    else if ((e.key === 'r' || e.key === 'R') && it) { e.preventDefault(); o.actions && (FURN[it.k].wallItem ? o.actions.nextWall(selId) : o.actions.rotate(selId)); }
    else if ((e.key === 'Delete' || e.key === 'Backspace') && it) { e.preventDefault(); o.actions && o.actions.remove(selId); }
    else if (e.key === 'Escape') select(null);
  });

  /* ---------- public: apply a whole state ---------- */
  let A = null, R = null;
  let dimKey = '', outKey = '';
  function set(s, res, opt = {}) {
    S = s; R = res; const live = !!opt.live;
    const rk = [s.room.w, s.room.l, s.room.h].join();
    if (rk !== roomKey) { roomKey = rk; buildRoom(s.room.w, s.room.l, s.room.h); }
    const uk = [s.unit.type, s.unit.dims.w, s.unit.dims.h, s.unit.dims.d, !!s.unit.logo].join();
    if (uk !== unitKey) { unitKey = uk; buildUnitBody(s.unit); }
    A = place(s);
    U.root.visible = !(s.photo && s.unit.photo);
    setPhoto(s.photo ? s.unit.photo : null, s.unit);
    syncFurn(s);
    // person (scale reference): only in an empty room — furnished rooms already show the scale
    const pr = refG.children[0];
    if (pr) pr.visible = !(s.furn && s.furn.some(it => !FURN[it.k].wallItem && !FURN[it.k].flat));
    if (pr && pr.visible) {
      if (A.frame) { const p = A.wallPt.clone().addScaledVector(A.frame.n, 1.5).addScaledVector(A.frame.t, -(s.unit.dims.w / 2 + 0.7)); p.y = 0; p.x = clamp(p.x, -s.room.w / 2 + 0.3, s.room.w / 2 - 0.3); p.z = clamp(p.z, -s.room.l / 2 + 0.3, s.room.l / 2 - 0.3); pr.position.copy(p); pr.rotation.y = A.frame.rotY + Math.PI; }
      else { pr.position.set(clamp(A.center.x + 1.0, -s.room.w / 2 + 0.3, s.room.w / 2 - 0.3), 0, clamp(A.center.z + 0.8, -s.room.l / 2 + 0.3, s.room.l / 2 - 0.3)); }
    }
    // rebuild dimension lines / the outdoor run only when what they show changed (drags call set() every frame)
    const pk = [s.room.w, s.room.l, s.room.h, s.unit.type, s.unit.dims.w, s.unit.dims.h, s.unit.dims.d, s.place.wall, s.place.along, s.place.height, s.place.gap, s.place.cx, s.place.cz].join();
    const dk = pk + [s.show.dims, s.show.air, R.throw.toFixed(2), R.depth.toFixed(2)].join();
    const ok2 = pk + [s.show.pipe, s.outdoor.side, s.outdoor.run, s.outdoor.drop, R.pipe.len, R.pipe.extra, s.show.dims].join();
    if (dk !== dimKey) { dimKey = dk; drawDims(s, A, R); }
    drawAir(s, A, R, live);
    if (ok2 !== outKey) { outKey = ok2; drawOutdoor(s, A, R); }
    updSel();
    if (!userMoved && !live) frame(mode);
    kick();
  }

  /* ---------- loop ---------- */
  let raf = 0, last = performance.now(), vis = false, clock = 0, idle = 0;
  const io = new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis) kick(); }, { rootMargin: '120px 0px' }); io.observe(container);
  function size() { const w = container.clientWidth, hgt = container.clientHeight; if (!w || !hgt) return; renderer.setSize(w, hgt, false); cam.aspect = w / hgt; cam.updateProjectionMatrix(); }
  const ro = new ResizeObserver(() => { size(); if (!userMoved) frame(mode); kick(); }); ro.observe(container);
  function kick() { idle = 0; if (!raf && vis) { last = performance.now(); raf = requestAnimationFrame(tick); } }
  const tmp = V(0, 0, 0);
  function tick(now) {
    raf = 0; if (!vis || !S) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; clock += dt;
    updCam(dt); cutaway();
    if (U && U.anim && !RM()) animateUnit(U, dt, clock, 0.8);
    if (S.show.air) air.update(RM() ? 0 : dt, clock);
    renderer.render(scene, cam);
    const W = renderer.domElement.clientWidth, Hh = renderer.domElement.clientHeight;
    // labels stay whole inside the frame (clamped by their own width, measured once — their text never changes)
    lab.forEach(l => {
      tmp.copy(l.p).project(cam); const off = tmp.z > 1 || tmp.x < -1.1 || tmp.x > 1.1 || tmp.y < -1.1 || tmp.y > 1.1; l.el.style.visibility = off ? 'hidden' : 'visible';
      if (off) return; if (!l.w) l.w = l.el.offsetWidth; const hw = (l.w || 60) / 2;   // 0 while the layer is hidden → measured again later
      const x = Math.min(W - hw - 4, Math.max(hw + 4, (tmp.x + 1) / 2 * W)), y = Math.min(Hh - 12, Math.max(12, (1 - tmp.y) / 2 * Hh));
      l.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
    });
    placeTool();
    // keep rendering while animating or settling; otherwise stop after ~2 s of stillness (saves battery)
    const moving = Math.abs(goal.theta - st.theta) + Math.abs(goal.phi - st.phi) + Math.abs(goal.radius - st.radius) > 0.002;
    idle = moving ? 0 : idle + dt;
    if (!RM() && (s_air() || idle < 2)) raf = requestAnimationFrame(tick);
    else if (RM() && idle < 0.3) raf = requestAnimationFrame(tick);
  }
  const s_air = () => S && (S.show.air || (U && U.anim));
  renderer.domElement.addEventListener('pointerdown', kick);
  size();

  return {
    set, view: m => { frame(m); kick(); }, kick, select: id => select(id, true),
    snapshot: () => { renderer.render(scene, cam); return renderer.domElement.toDataURL('image/png'); },
    dispose() { gl.release(); cancelAnimationFrame(raf); air.dispose(); tool.remove(); io.disconnect(); ro.disconnect(); scene.traverse(o2 => { if (o2.isMesh) { o2.geometry.dispose(); } }); photoTex && photoTex.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); labels.remove(); },
  };
}
