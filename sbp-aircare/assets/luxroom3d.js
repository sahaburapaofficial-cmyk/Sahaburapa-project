// SBP AirCare — luxury room kit for the second website (D · E · F) — Rev.29 (owner 5 ต.ค. 2569: "เพิ่มอีก 3 โมเดล … แบบฉบับใหม่หมด
// … ภาพที่สมจริง … Luxury premium ultra")
//   · one cut-away condo room built from the shared interior kit (roomkit3d) with a new art direction: warm greige plaster, oak,
//     a floor-to-ceiling window in the facade (the cinema camera flies in through it), a side window onto the city at dusk / day
//   · the wall unit is the company's own FUJIVA body (buildPremiumIndoor) — this is a product scene, not a job scene (rule 20
//     covers customers' units in the technician scenes only)
//   · dirt is shown on the parts it really collects on (filter, coil, blower); setDirt(0..1) re-tints those materials
//   · procedural only (canvas textures), no image files; three.js r170
import * as THREE from './three.module.min.js';
import { mats, F, rbox, ctex } from './roomkit3d.js';
import { buildPremiumIndoor, materialSet } from './ac3d.js';

const R = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(97531);

/** city skyline seen through a window: 'dusk' (blue hour, lit windows), 'night', 'day' */
export function cityTex(mood = 'dusk') {
  return ctex(1024, 512, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h * 0.72);
    const stops = mood === 'day' ? ['#7fb7e6', '#bfe0f5', '#f3e9d6'] : mood === 'night' ? ['#060b1a', '#16203f', '#3b2f4a'] : ['#1b2a55', '#5b5b8f', '#f2a66f'];
    sky.addColorStop(0, stops[0]); sky.addColorStop(0.6, stops[1]); sky.addColorStop(1, stops[2]);
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    if (mood !== 'day') for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${(R() * 0.6).toFixed(2)})`; g.fillRect(R() * w, R() * h * 0.4, 1.4, 1.4); }
    // three layers of towers, nearer = darker and taller
    [[0.55, 0.28, mood === 'day' ? '#9fb2c4' : '#2a3150'], [0.62, 0.42, mood === 'day' ? '#7d91a6' : '#1a2038'], [0.7, 0.6, mood === 'day' ? '#5f7388' : '#0e1224']].forEach(([base, tall, col], L) => {
      let x = -20;
      while (x < w) {
        const bw = 26 + R() * 70, bh = h * (tall * (0.35 + R() * 0.65));
        const y = h * base + h * 0.3 - bh;
        g.fillStyle = col; g.fillRect(x, y, bw, h - y);
        // lit windows
        for (let yy = y + 6; yy < h - 4; yy += 7) for (let xx = x + 4; xx < x + bw - 4; xx += 6) {
          if (R() < (mood === 'day' ? 0.05 : 0.32 - L * 0.06)) { g.fillStyle = mood === 'day' ? 'rgba(255,255,255,.35)' : `rgba(255,${190 + R() * 50 | 0},${120 + R() * 60 | 0},${(0.55 + R() * 0.45).toFixed(2)})`; g.fillRect(xx, yy, 3, 3); }
        }
        x += bw + 2 + R() * 8;
      }
    });
    // haze at the horizon
    const hz = g.createLinearGradient(0, h * 0.6, 0, h); hz.addColorStop(0, 'rgba(255,190,140,0)'); hz.addColorStop(1, mood === 'day' ? 'rgba(240,240,235,.5)' : 'rgba(255,170,110,.18)');
    g.fillStyle = hz; g.fillRect(0, h * 0.6, w, h * 0.4);
  });
}

/** building facade around the room's window: a grid of other apartments, a cut-out where the camera enters */
function facadeTex(hole, night) {
  return ctex(1024, 1024, (g, w, h) => {
    // concrete with fine board marks, recessed window bands, slab edges — a quiet high-rise, not a grid of lamps
    g.fillStyle = night ? '#191c23' : '#d6d0c6'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2200; i++) { g.fillStyle = `rgba(${night ? '255,255,255' : '0,0,0'},${(R() * 0.03).toFixed(3)})`; g.fillRect(R() * w, R() * h, 2, 1); }
    const rowH = 74, colW = 92;
    for (let y = 8; y < h; y += rowH) {
      g.fillStyle = night ? '#252a33' : '#c6bfb3'; g.fillRect(0, y + rowH - 12, w, 12);   // slab edge
      for (let x = 6; x < w; x += colW) {
        const lit = night && R() < 0.26, warm = 190 + R() * 50 | 0;
        const gr = g.createLinearGradient(0, y, 0, y + rowH - 16);
        if (lit) { gr.addColorStop(0, `rgba(255,${warm},${120 + R() * 50 | 0},.75)`); gr.addColorStop(1, `rgba(255,${warm - 30},90,.45)`); }
        else { gr.addColorStop(0, night ? '#10141c' : '#7d8c9a'); gr.addColorStop(1, night ? '#0a0d13' : '#5f6f7e'); }
        g.fillStyle = gr; g.fillRect(x, y + 6, colW - 10, rowH - 24);
        g.fillStyle = night ? 'rgba(160,190,255,.06)' : 'rgba(255,255,255,.25)'; g.fillRect(x, y + 6, (colW - 10) * 0.35, rowH - 24);   // sky reflection
      }
    }
    g.clearRect(hole[0] * w, hole[1] * h, hole[2] * w, hole[3] * h);
  });
}

/**
 * buildLuxRoom(scene, { mood: 'dusk'|'night'|'day', W, D, H, facade: true }) → room handle
 *   room origin: floor centre; back wall at z = −D/2 (the wall unit hangs on it), facade (camera side) at z = +D/2
 */
export function buildLuxRoom(scene, o = {}) {
  const mood = o.mood || 'dusk', night = mood !== 'day';
  const W = o.W ?? 4.6, D = o.D ?? 4.0, H = o.H ?? 2.8;
  const K = mats('light');
  const root = new THREE.Group(); scene.add(root);
  const S = (c, x = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, ...x });
  const plaster = S(0xe6dccd, { map: K.wall.map }), plasterAlt = S(0xcfc2ae, { map: K.wall.map });
  // floor (oak), ceiling, walls
  K.floorT.repeat.set(W / 1.6, D / 1.6);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), K.floor); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; root.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), S(0xf4efe8)); ceil.rotation.x = Math.PI / 2; ceil.position.y = H; if (!o.open) root.add(ceil);   // o.open: dollhouse (no ceiling, no left wall)
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H), plaster); back.position.set(0, H / 2, -D / 2); back.receiveShadow = true; root.add(back);
  // a slatted oak feature panel behind the bed — luxury detail, warm against the white unit
  const slats = new THREE.Group(); const slatM = S(0x9b7552, { roughness: 0.55 });
  for (let i = 0; i < 26; i++) slats.add(rbox(0.045, H * 0.62, 0.03, 0.008, slatM, -1.3 + i * 0.07, H * 0.31, -D / 2 + 0.02));
  root.add(slats);
  // right wall with a side window onto the city
  const right = new THREE.Group(); root.add(right);
  const ww = Math.min(1.9, D - 1.2), wh = 1.7, wy = 0.6, wz = 0.1;
  const rw = (w, h, y, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), plasterAlt); m.rotation.y = -Math.PI / 2; m.position.set(W / 2, y, z); m.receiveShadow = true; right.add(m); };
  rw(D, wy, wy / 2, 0); rw(D, H - wy - wh, wy + wh + (H - wy - wh) / 2, 0); rw((D / 2 + wz) - ww / 2, wh, wy + wh / 2, -D / 2 + ((D / 2 + wz) - ww / 2) / 2); rw((D / 2 - wz) - ww / 2, wh, wy + wh / 2, D / 2 - ((D / 2 - wz) - ww / 2) / 2);
  // the view: far away for the film (parallax through the window), right behind the glass for the diorama (no slab sticking out)
  const city = new THREE.Mesh(o.open ? new THREE.PlaneGeometry(ww + 0.3, wh + 0.3) : new THREE.PlaneGeometry(9, 4.5), new THREE.MeshBasicMaterial({ map: cityTex(mood), toneMapped: false }));
  city.rotation.y = -Math.PI / 2; city.position.set(o.open ? W / 2 + 0.12 : W / 2 + 3.5, o.open ? wy + wh / 2 : 1.5, wz); root.add(city);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), new THREE.MeshPhysicalMaterial({ color: 0xcfe6f5, roughness: 0.04, transparent: true, opacity: 0.12, depthWrite: false }));
  glass.rotation.y = -Math.PI / 2; glass.position.set(W / 2 - 0.01, wy + wh / 2, wz); root.add(glass);
  const frameM = S(0x2c2e31, { roughness: 0.4, metalness: 0.6 });
  [[0.04, wh + 0.08, 0, -ww / 2], [0.04, wh + 0.08, 0, ww / 2], [0.04, 0.04, -wh / 2, 0], [0.04, 0.04, wh / 2, 0]].forEach(([a, b, dy, dz], i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, i < 2 ? b : 0.04, i < 2 ? 0.04 : ww), frameM); m.position.set(W / 2 - 0.02, wy + wh / 2 + dy, wz + dz); right.add(m); });
  const curtain = F.curtain(K, 0.7, H - 0.1); curtain.rotation.y = -Math.PI / 2; curtain.position.set(W / 2 - 0.12, (H - 0.1) / 2, wz - ww / 2 - 0.3); root.add(curtain);
  // left wall (solid; hidden by the dollhouse cut when the camera swings left)
  const left = new THREE.Mesh(new THREE.PlaneGeometry(D, H), plasterAlt); left.rotation.y = Math.PI / 2; left.position.set(-W / 2, H / 2, 0); if (!o.open) root.add(left);
  // facade with a floor-to-ceiling opening (the cinema camera flies in through it)
  let facade = null;
  if (o.facade !== false) {
    const FW = 14, FH = 10, hole = [(FW / 2 - 1.3) / FW, (FH - 0.4 - 2.4) / FH, 2.6 / FW, 2.4 / FH];   // opening 2.6 × 2.4 m, sill 0.4
    const t = facadeTex(hole, night); t.colorSpace = THREE.SRGBColorSpace;
    facade = new THREE.Mesh(new THREE.PlaneGeometry(FW, FH), new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: night ? 0xffffff : 0x000000, emissiveIntensity: night ? 0.32 : 0, alphaTest: 0.5, transparent: false, side: THREE.DoubleSide, roughness: 0.9 }));
    facade.position.set(0, FH / 2, D / 2);   // canvas top = plane top, so the opening's sill lands at y = 0.4 and its head at 2.8
    root.add(facade);
    // the opening: bronze frame, a centre mullion, two sliding glass panes (the camera passes between them)
    const bz = S(0x5a4632, { roughness: 0.35, metalness: 0.7 }), z = D / 2 + 0.02;
    const fbox = (w, h, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.09), bz); m.position.set(x, y, z); root.add(m); };
    fbox(2.7, 0.06, 0, 2.8); fbox(2.7, 0.06, 0, 0.4); fbox(0.06, 2.4, -1.32, 1.6); fbox(0.06, 2.4, 1.32, 1.6);
    const pane = new THREE.MeshPhysicalMaterial({ color: 0xbfd9ff, roughness: 0.05, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide });
    [-0.95, 0.95].forEach(x => { const g = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 2.36), pane); g.position.set(x, 1.6, z + 0.01); root.add(g); fbox(0.04, 2.36, x + (x < 0 ? 0.36 : -0.36), 1.6); });
    // a balcony slab and glass rail under the opening
    const bal = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 1.1), S(night ? 0x2a2e36 : 0xcac3b8)); bal.position.set(0, 0.34, D / 2 + 0.55); root.add(bal);
    const rail = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.95), new THREE.MeshPhysicalMaterial({ color: 0xcfe3ff, transparent: true, opacity: 0.12, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide })); rail.position.set(0, 0.88, D / 2 + 1.1); root.add(rail);
    const top = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.03, 0.05), bz); top.position.set(0, 1.36, D / 2 + 1.1); root.add(top);
  }
  // furniture: bed under the unit's throw (not in it), bedside tables, rug, lamp, plant, art
  const bed = F.bed(K, 1.6, 2.0); bed.position.set(-0.6, 0, -D / 2 + 1.05); root.add(bed);
  [-1, 1].forEach(s => { const sd = F.side(K); sd.position.set(-0.6 + s * 1.12, 0, -D / 2 + 0.28); root.add(sd); });
  const rug = F.rug(K, 2.6, 1.8); rug.position.set(-0.4, 0, 0.35); root.add(rug);
  const lamp = F.lamp(K); lamp.position.set(W / 2 - 0.5, 0, -D / 2 + 0.5); root.add(lamp);
  const plant = F.plant(K, 1.1); plant.position.set(W / 2 - 0.45, 0, D / 2 - 0.7); root.add(plant);
  const arm = F.armchair(K); arm.position.set(1.3, 0, 0.8); arm.rotation.y = -0.6; root.add(arm);
  // the wall unit — FUJIVA body (product scene)
  const M = materialSet('studio');
  const U = buildPremiumIndoor(M, { logo: true });
  U.root.traverse(ob => { if (ob.isMesh || ob.isInstancedMesh) { ob.material = ob.material.clone(); ob.castShadow = true; ob.userData.c0 = ob.material.color.clone(); ob.userData.r0 = ob.material.roughness; } });
  const unitG = new THREE.Group(); unitG.add(U.root); unitG.position.set(0.9, 2.28, -D / 2 + 0.13); root.add(unitG);
  const front0 = { r: U.parts.front.rotation.x, p: U.parts.front.position.clone() };
  const filter0 = U.parts.filter.position.clone();
  const grime = new THREE.Color(0x6b5a44), coilGrime = new THREE.Color(0x5c4b38);
  const dirtyParts = ['filter', 'coil', 'blower', 'pan'].map(k => U.parts[k]).filter(Boolean);
  // lights: warm interior, cool moonlight / daylight through the side window
  const hemi = new THREE.HemisphereLight(night ? 0x9fb6e0 : 0xffffff, night ? 0x2a2018 : 0xd8cbb4, night ? 0.35 : 0.8); root.add(hemi);
  const sun = new THREE.DirectionalLight(night ? 0x9ab4ff : 0xfff1dc, night ? 0.6 : 2.2); sun.position.set(6, 4, 1.5); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 20 }); root.add(sun);
  const warm = new THREE.PointLight(0xffc98a, night ? 2.2 : 0.6, 6, 1.6); warm.position.set(-0.6, 2.3, 0.6); root.add(warm);
  return {
    root, K, W, D, H, unitG, U, floor, facade, city, lights: { hemi, sun, warm },
    /** vent (supply air outlet) in world space */
    vent(out = new THREE.Vector3()) { return out.set(0, -0.11, 0.1).applyMatrix4(unitG.matrixWorld); },
    setDirt(d) {
      dirtyParts.forEach(g => g.traverse(ob => { if (ob.material && ob.userData.c0) { ob.material.color.copy(ob.userData.c0).lerp(g === U.parts.coil ? coilGrime : grime, d * 0.75); ob.material.roughness = Math.min(1, (ob.userData.r0 ?? 0.5) + d * 0.4); } }));
    },
    /** open the front panel and slide the filter up (0..1) — what a technician does first */
    open(k) {
      U.parts.front.rotation.x = front0.r - 0.95 * k; U.parts.front.position.set(front0.p.x, front0.p.y + 0.05 * k, front0.p.z + 0.07 * k);
      U.parts.filter.position.set(filter0.x, filter0.y + 0.12 * k, filter0.z + 0.06 * k);
    },
  };
}
