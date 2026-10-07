// SBP AirCare — 3D vignettes for the service journeys of D · E · F — Rev.39 (owner 6 ต.ค. 2569: "D E F จากที่ดูภาพไม่สวยไม่เสมือนจริง
// เป็นเหมือนรูปการ์ตูนยุคเก่า ๆ … ต้องการ ICON ทุกอย่างที่ high-tech / new technology / luxury / Modern … 4D 5D 3D เพื่อสร้างเป็น Visual")
// One offscreen studio renders each scene once as a still (product-photo lighting on a lacquered pedestal with an accent light ring,
// glass information panels with the real figures, the site's own 3D models: FUJIVA unit, outdoor unit, tools, manifold gauges,
// vacuum pump, copper line set). The page then moves the still with CSS (drift, light sweep, parallax) — no live WebGL left
// running, nothing added to the ≤ 3 context budget. Shots are queued one at a time and the GL context is released when idle.
//   vignette(key, { theme, accent, info, view, force }) → Promise<dataURL | null>   (null = no WebGL, software GL, or a slow device →
//   the page keeps its line art; force renders anyway — test pages only)
//   view: −1 · 0 · 1 = the camera from the left · front · right (Rev.40: the customer turns the still to look from another side)
//   key: door:clean · door:install · door:repair · c1…c6 · i1…i6 · r1…r6
//   info: figures to print on the glass panels (from the shared constants — this module types no numbers of its own)
import { quiet } from './lazy.js';

const SHOTS = {};
let studioP = null, studioK = '', queue = Promise.resolve(), idle = 0;

function studio(theme, accent, force) {
  if (studioP && studioK !== theme + accent) { const p = studioP; studioP = null; p.then(s => s && s.dispose()); }
  if (studioP) return studioP;
  studioK = theme + accent;
  studioP = (async () => {
    const THREE = await import('./three.module.min.js');
    await (await import('./brand3d.js')).logosReady();
    const { buildPremiumIndoor, buildOutdoor, materialSet } = await import('./ac3d.js');
    const { buildCeilingUnit, buildCassetteUnit } = await import('./units3d.js');
    const { handTools } = await import('./tech3d.js');
    const { RoomEnvironment } = await import('./RoomEnvironment.js');
    try { await document.fonts.ready; } catch (e) { /* fonts optional */ }
    const cv = document.createElement('canvas');
    const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
    let soft = false; try { const g = r.getContext(), d = g.getExtension('WEBGL_debug_renderer_info'); soft = /swiftshader|llvmpipe|software|basic render/i.test(d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : ''); } catch (e) { /* unknown */ }
    if (soft && !force) { r.dispose(); r.forceContextLoss(); return { soft, has: () => true, render: async () => null, dispose() {} }; }   // stop before the costly setup
    const W = 1280, H = 800;   // (software GL reaches here only when forced — the offline pre-render tool — so full size too)
    r.setPixelRatio(1); r.setSize(W, H, false); r.debug.checkShaderErrors = false;
    r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = theme === 'light' ? 1.05 : 1.12;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(r); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = theme === 'light' ? 0.9 : 0.55;
    const ACC = new THREE.Color(accent || '#63E6FF'), dark = theme !== 'light';
    // lighting: soft warm key with a long soft shadow, cool fill, an accent-coloured rim from behind that outlines every object
    scene.add(new THREE.HemisphereLight(dark ? 0x9fb4d8 : 0xffffff, dark ? 0x0b0f18 : 0xd9dfe8, dark ? 0.35 : 0.55));
    const key = new THREE.DirectionalLight(0xfff3e6, dark ? 2.2 : 1.6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 8; key.shadow.bias = -0.0004;
    const fill = new THREE.DirectionalLight(0xdfe9ff, dark ? 0.5 : 0.45), rim = new THREE.DirectionalLight(ACC, dark ? 3.2 : 1.6), rim2 = new THREE.DirectionalLight(0xffffff, dark ? 0.9 : 0.6);
    scene.add(key, key.target, fill, fill.target, rim, rim.target, rim2, rim2.target);
    // the pedestal: lacquered disc, a thin light ring, a soft floor glow
    const ped = new THREE.Group(); scene.add(ped);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.3, 0.09, 96), new THREE.MeshPhysicalMaterial({ color: dark ? 0x0a0e16 : 0xeeebe6, roughness: 0.62, metalness: dark ? 0.08 : 0.0, clearcoat: 0.35, clearcoatRoughness: 0.45, envMapIntensity: 0.18 }));
    // turned top (fine concentric lathe lines, like a machined plinth) and a brushed metal band around the edge
    { const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d'); g.fillStyle = dark ? '#0d121b' : '#ece8e2'; g.fillRect(0, 0, 1024, 1024);
      for (let r = 8; r < 512; r += 3) { g.strokeStyle = dark ? `rgba(255,255,255,${0.012 + (r % 9 === 2 ? 0.02 : 0)})` : `rgba(0,0,0,${0.014 + (r % 9 === 2 ? 0.016 : 0)})`; g.lineWidth = 1; g.beginPath(); g.arc(512, 512, r, 0, 7); g.stroke(); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
      const top = new THREE.Mesh(new THREE.CircleGeometry(1.18, 128), new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.66, metalness: dark ? 0.12 : 0.0, clearcoat: 0.25, clearcoatRoughness: 0.5, envMapIntensity: 0.07, specularIntensity: 0.35 }));
      top.rotation.x = -Math.PI / 2; top.position.y = 0.0015; top.receiveShadow = true; ped.add(top); }
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.302, 1.302, 0.034, 128, 1, true), new THREE.MeshStandardMaterial({ color: dark ? 0x8d97a3 : 0xb9c0c8, metalness: 1, roughness: 0.32 }));
    band.position.y = -0.03; ped.add(band);
    // a soft studio light far behind the scene, for depth (stills only — film frames have their own backdrop)
    let backGlow = null;
    { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d'), lg = g.createLinearGradient(0, 0, 0, 256); lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(0.55, `rgba(${ACC.r * 255 | 0},${ACC.g * 255 | 0},${ACC.b * 255 | 0},${dark ? 0.16 : 0.1})`); lg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = lg; g.fillRect(0, 0, 64, 256);
      const back = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: dark ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: false })); back.position.set(0, 0.9, -1.9); ped.add(back); backGlow = back; }
    disc.position.y = -0.045; disc.receiveShadow = true; ped.add(disc);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.27, 0.007, 8, 160), new THREE.MeshBasicMaterial({ color: ACC, toneMapped: false })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.001; ped.add(ring);
    const gc = document.createElement('canvas'); gc.width = gc.height = 256; { const g = gc.getContext('2d'), rg = g.createRadialGradient(128, 128, 0, 128, 128, 128); rg.addColorStop(0, `rgba(${ACC.r * 255 | 0},${ACC.g * 255 | 0},${ACC.b * 255 | 0},.55)`); rg.addColorStop(0.55, `rgba(${ACC.r * 255 | 0},${ACC.g * 255 | 0},${ACC.b * 255 | 0},.12)`); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, 256, 256); }
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(gc), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = -0.088; ped.add(glow);
    // an opaque studio backdrop for the film frames (video has no transparency): deep navy / soft ivory with the accent glowing low
    const backdrop = (() => { const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d');
      const lg = g.createLinearGradient(0, 0, 0, 512); lg.addColorStop(0, dark ? '#05080f' : '#f6f8fb'); lg.addColorStop(1, dark ? '#0b1220' : '#e6edf5'); g.fillStyle = lg; g.fillRect(0, 0, 1024, 512);
      const rg = g.createRadialGradient(512, 470, 10, 512, 470, 560); rg.addColorStop(0, `rgba(${ACC.r * 255 | 0},${ACC.g * 255 | 0},${ACC.b * 255 | 0},${dark ? 0.28 : 0.16})`); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, 1024, 512);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const cam = new THREE.PerspectiveCamera(28, W / H, 0.05, 40);
    const M = materialSet('studio');
    const FONT = (() => { try { return getComputedStyle(document.body).fontFamily || 'sans-serif'; } catch (e) { return 'sans-serif'; } })();
    const accHex = '#' + ACC.getHexString();

    /* ---------- building blocks ---------- */
    const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
    const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); };
    /** a floating glass panel (frosted, with a light edge) carrying a canvas drawing */
    function glass(w, h, draw, o = {}) {
      const grp = new THREE.Group();
      const shape = new THREE.Shape(); const rad = Math.min(w, h) * 0.08; shape.moveTo(-w / 2 + rad, -h / 2); shape.lineTo(w / 2 - rad, -h / 2); shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + rad); shape.lineTo(w / 2, h / 2 - rad); shape.quadraticCurveTo(w / 2, h / 2, w / 2 - rad, h / 2); shape.lineTo(-w / 2 + rad, h / 2); shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - rad); shape.lineTo(-w / 2, -h / 2 + rad); shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + rad, -h / 2);
      const slab = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 3 }), new THREE.MeshPhysicalMaterial({ color: dark ? 0x101a2c : 0xffffff, roughness: 0.18, metalness: 0.1, transparent: true, opacity: dark ? 0.72 : 0.78, clearcoat: 1, clearcoatRoughness: 0.05, depthWrite: false }));
      slab.position.z = -0.016; grp.add(slab);
      const px = 512, py = Math.round(512 * h / w);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.94, h * 0.94), new THREE.MeshBasicMaterial({ map: tex(px, py, (g, W2, H2) => { g.clearRect(0, 0, W2, H2); draw(g, W2, H2); }), transparent: true, toneMapped: false, depthWrite: false }));
      face.position.z = 0.002; grp.add(face);
      const edge = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(shape.getPoints(24).map(p => new THREE.Vector3(p.x, p.y, 0.003))), new THREE.LineBasicMaterial({ color: ACC, transparent: true, opacity: 0.85, toneMapped: false }));
      grp.add(edge);
      grp.userData.noShadow = true;
      if (o.at) grp.position.set(...o.at); if (o.ry != null) grp.rotation.y = o.ry; if (o.rx != null) grp.rotation.x = o.rx;
      return grp;
    }
    const ink = dark ? '#eaf3ff' : '#101a2a', ink2 = dark ? 'rgba(220,235,255,.72)' : 'rgba(16,26,42,.66)';
    const T = (g, s, x, y, size, col = ink, weight = 600, align = 'left') => { g.font = `${weight} ${size}px ${FONT}`; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillText(s, x, y); };
    const unit = (type = 'wall') => {
      const U = type === 'ceiling' ? buildCeilingUnit(M, { interior: false, rod: 0 }) : type === 'cassette' ? buildCassetteUnit(M, { interior: false, rod: 0 }) : buildPremiumIndoor(M, { logo: true });
      if (U.parts && U.parts.hangers) U.parts.hangers.visible = false;
      return U;
    };
    const outdoor = () => buildOutdoor(M, { logo: true }).root;
    const tools = handTools();
    const tool = (name, s = 1.6) => { const t = tools[name].clone(); t.visible = true; t.scale.setScalar(s); return t; };
    const mat = (c, x = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, ...x });
    const copperM = new THREE.MeshPhysicalMaterial({ color: 0xc87a4a, metalness: 1, roughness: 0.26, clearcoat: 0.4 });
    const insulM = mat(0x16181b, { roughness: 0.92 });
    const chrome = mat(0xd9dee4, { metalness: 1, roughness: 0.18 });
    function coil(turns = 3.2, R = 0.32, rTube = 0.022, m = copperM) {
      const pts = []; for (let i = 0; i <= 160; i++) { const a = i / 160 * turns * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * R, 0.03 + i / 160 * 0.18, Math.sin(a) * R)); }
      return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 220, rTube, 16), m);
    }
    function dial(color = '#e5483a', val = 0.62, label = '') {
      return tex(256, 256, (g, w) => {
        const c = w / 2; g.fillStyle = '#f7f8fa'; g.beginPath(); g.arc(c, c, c - 4, 0, 7); g.fill();
        g.lineWidth = 10; g.strokeStyle = color; g.beginPath(); g.arc(c, c, c - 16, Math.PI * 0.75, Math.PI * 2.25); g.stroke();
        g.strokeStyle = '#2b3440'; g.lineWidth = 2; for (let i = 0; i <= 20; i++) { const a = Math.PI * 0.75 + i / 20 * Math.PI * 1.5; g.beginPath(); g.moveTo(c + Math.cos(a) * (c - 30), c + Math.sin(a) * (c - 30)); g.lineTo(c + Math.cos(a) * (c - (i % 5 ? 40 : 48)), c + Math.sin(a) * (c - (i % 5 ? 40 : 48))); g.stroke(); }
        const a = Math.PI * 0.75 + val * Math.PI * 1.5; g.strokeStyle = '#d23a1e'; g.lineWidth = 6; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.cos(a) * (c - 44), c + Math.sin(a) * (c - 44)); g.stroke();
        g.fillStyle = '#20262e'; g.beginPath(); g.arc(c, c, 12, 0, 7); g.fill();
        if (label) { g.font = `600 22px ${FONT}`; g.fillStyle = '#20262e'; g.textAlign = 'center'; g.fillText(label, c, c + 62); }
      });
    }
    function gauge(color, val, label, r = 0.11) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.05, 48), chrome); body.rotation.x = Math.PI / 2; g.add(body);
      const face = new THREE.Mesh(new THREE.CircleGeometry(r * 0.9, 48), new THREE.MeshStandardMaterial({ map: dial(color, val, label), roughness: 0.35 })); face.position.z = 0.026; g.add(face);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(r * 0.9, 48), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0, transparent: true, opacity: 0.12, clearcoat: 1 })); lens.position.z = 0.03; g.add(lens);
      return g;
    }
    function manifold() {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.07), mat(0x2b3138, { metalness: 0.6, roughness: 0.35 })));
      const L = gauge('#2f74d0', 0.32, 'LOW'), Hh = gauge('#e5483a', 0.64, 'HIGH'); L.position.set(-0.12, 0.15, 0.01); Hh.position.set(0.12, 0.15, 0.01); g.add(L, Hh);
      [[-0.15, 0x2f74d0], [0, 0xf2c230], [0.15, 0xd23a1e]].forEach(([x, c]) => { const pts = [new THREE.Vector3(x, -0.05, 0), new THREE.Vector3(x * 1.6, -0.25, 0.08), new THREE.Vector3(x * 2.4 + 0.1, -0.33, 0.3)]; g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.012, 10), mat(c, { roughness: 0.55 }))); });
      return g;
    }
    function vacuumPump() {
      const g = new THREE.Group(), body = mat(0x1f6fb0, { roughness: 0.35, metalness: 0.2 });
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.34, 40), body); m.rotation.z = Math.PI / 2; m.position.y = 0.12; g.add(m);
      { const b = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.2), mat(0x24292f)); b.position.y = 0.02; g.add(b); }
      const h = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 8, 30, Math.PI), mat(0x24292f)); h.position.y = 0.22; g.add(h);
      for (let i = 0; i < 8; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.16, 0.2), chrome); f.position.set(-0.14 + i * 0.012, 0.12, 0); g.add(f); }
      return g;
    }
    function phone(draw) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.68, 0.03), new THREE.MeshPhysicalMaterial({ color: 0x0d1015, metalness: 0.6, roughness: 0.2, clearcoat: 1 })));
      const s = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.64), new THREE.MeshBasicMaterial({ map: tex(310, 640, draw), toneMapped: false })); s.position.z = 0.016; g.add(s);
      return g;
    }
    let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    function droplets(n, box) {
      const g = new THREE.Group(), m = new THREE.MeshPhysicalMaterial({ color: 0xbfe6ff, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.75, clearcoat: 1, envMapIntensity: 1.6 });
      // fine spray: many small drops, each stretched along its fall like a short exposure, a few beads among them
      const geo = new THREE.SphereGeometry(1, 12, 10);
      for (let i = 0; i < n * 2; i++) { const bead = i % 7 === 0, r = bead ? 0.009 : 0.004 + rnd() * 0.003; const d = new THREE.Mesh(geo, m); d.scale.set(r, bead ? r * 1.3 : r * (3 + rnd() * 3), r); d.position.set(box[0] + rnd() * (box[1] - box[0]), box[2] + rnd() * (box[3] - box[2]), box[4] + rnd() * (box[5] - box[4])); d.userData.noShadow = true; g.add(d); }
      return g;
    }
    function airflow(from, n = 5, len = 1.1, cold = true) {
      const g = new THREE.Group();
      for (let i = 0; i < n; i++) {
        const x = from.x - 0.3 + i * 0.15, pts = [new THREE.Vector3(x, from.y, from.z), new THREE.Vector3(x + 0.02, from.y - 0.25, from.z + len * 0.4), new THREE.Vector3(x + 0.06, from.y - 0.55, from.z + len)];
        const m = new THREE.MeshBasicMaterial({ color: cold ? (dark ? 0x8fdcff : 0x4f9ad8) : 0xffb074, transparent: true, opacity: dark ? 0.26 : 0.22, depthWrite: false, blending: dark ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: false });
        const t = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.012, 8), m); t.userData.noShadow = true; g.add(t);
      }
      return g;
    }
    const chip = (g, x, y, s, fill = accHex, col = dark ? '#03121a' : '#ffffff', size = 26) => { g.font = `700 ${size}px ${FONT}`; const w = g.measureText(s).width + size * 1.1; g.fillStyle = fill; rr(g, x, y - size, w, size * 1.5, size * 0.75); g.fill(); T(g, s, x + size * 0.55, y + size * 0.28, size, col, 700); return w; };

    /* ---------- the scenes ---------- */
    const I = {};   // info figures for the current render (set per call)
    const S = {
      'door:clean': g => { const U = unit(); U.root.position.set(0, 0.62, 0); g.add(U.root); g.add(droplets(26, [-0.35, 0.35, 0.1, 0.48, 0.12, 0.3])); const gun = tool('gun', 1.8); gun.position.set(0.55, 0.58, 0.32); gun.rotation.set(0.2, -0.6, 0.9); g.add(gun);
        g.add(glass(0.62, 0.3, (c, w, h) => { T(c, 'CLEANING', 30, 58, 26, accHex, 700); T(c, I.cleanFrom || '', 30, 132, 58, ink, 700); T(c, 'ก่อน VAT · ต่อเครื่อง', 30, 188, 26, ink2, 500); }, { at: [-0.62, 0.36, 0.25], ry: 0.35 })); },
      'door:install': g => { const U = unit(); U.root.position.set(-0.05, 0.72, -0.05); g.add(U.root); const c = coil(2.6, 0.22, 0.016); c.position.set(0.55, 0, 0.15); g.add(c); const ins = coil(1.4, 0.3, 0.03, insulM); ins.position.set(0.55, 0, 0.15); g.add(ins);
        const p = vacuumPump(); p.position.set(-0.55, 0, 0.3); p.rotation.y = 0.5; g.add(p);
        g.add(glass(0.6, 0.3, (c2) => { T(c2, 'INSTALLATION', 30, 58, 26, accHex, 700); T(c2, I.installFrom || '', 30, 132, 58, ink, 700); T(c2, 'ค่าติดตั้งมาตรฐาน ก่อน VAT', 30, 188, 26, ink2, 500); }, { at: [0.62, 0.62, 0.3], ry: -0.4 })); },
      'door:repair': g => { const O = outdoor(); O.scale.setScalar(0.62); O.position.set(-0.35, 0.17, -0.05); O.rotation.y = 0.35; g.add(O); const mf = manifold(); mf.position.set(0.42, 0.42, 0.25); mf.rotation.y = -0.4; g.add(mf);
        g.add(glass(0.56, 0.3, (c) => { T(c, 'DIAGNOSIS FIRST', 30, 58, 26, accHex, 700); T(c, I.diag || '', 30, 132, 58, ink, 700); T(c, 'ค่าตรวจ · ซ่อมเมื่อคุณอนุมัติ', 30, 188, 26, ink2, 500); }, { at: [0.5, 0.95, 0.15], ry: -0.3 })); },
      // Rev.43 hero film: the FUJIVA wall unit breathing cool air over the pedestal, the outdoor unit and the tools of the three services
      hero: g => { const U = unit(); U.root.position.set(-0.15, 0.78, -0.15); g.add(U.root); g.add(airflow(new THREE.Vector3(-0.15, 0.66, -0.02), 7, 1.0));
        const O = outdoor(); O.scale.setScalar(0.5); O.position.set(0.72, 0.14, -0.2); O.rotation.y = -0.45; g.add(O);
        const mf = manifold(); mf.scale.setScalar(0.8); mf.position.set(-0.85, 0.3, 0.3); mf.rotation.y = 0.5; g.add(mf);
        const gun = tool('gun', 1.5); gun.position.set(0.25, 0.08, 0.45); gun.rotation.set(Math.PI / 2, 0, 0.9); g.add(gun);
        const c = coil(2.2, 0.16, 0.012); c.position.set(-0.35, 0, 0.45); g.add(c); },
      c1: g => { ['wall', 'ceiling', 'cassette'].forEach((t, i) => { const U = unit(t); U.root.scale.setScalar(t === 'wall' ? 0.62 : 0.5); U.root.position.set(-0.62 + i * 0.62, t === 'cassette' ? 0.3 : 0.32, 0); if (t === 'cassette') U.root.rotation.x = -0.9; g.add(U.root); });
        g.add(glass(0.36, 0.22, (c, w, h) => { T(c, '× 3', w / 2, h * 0.62, 120, accHex, 700, 'center'); }, { at: [0.62, 0.62, 0.25], ry: -0.3 })); },
      c2: g => { g.add(glass(0.86, 1.0, (c, w, h) => { T(c, 'ใบเสนอราคา', 40, 70, 40, accHex, 700); T(c, 'ราคามาตรฐาน · ก่อน VAT', 40, 112, 26, ink2, 500);
          (I.lines || []).forEach(([a, b], k) => { T(c, a, 40, 190 + k * 64, 30, ink, 500); T(c, b, w - 40, 190 + k * 64, 30, ink, 700, 'right'); c.fillStyle = ink2; c.globalAlpha = 0.25; c.fillRect(40, 205 + k * 64, w - 80, 2); c.globalAlpha = 1; });
          c.fillStyle = accHex; c.fillRect(40, h - 150, w - 80, 4); T(c, 'ขั้นต่ำต่อการเข้างาน', 40, h - 92, 28, ink2, 500); T(c, I.min || '', w - 40, h - 92, 34, ink, 700, 'right'); T(c, 'ไม่ถึง → ค่าเดินทาง ' + (I.trip || ''), 40, h - 44, 26, ink2, 500); }, { at: [0, 0.58, 0], ry: -0.25 }));
        const U = unit(); U.root.scale.setScalar(0.55); U.root.position.set(-0.68, 0.25, -0.2); g.add(U.root); },
      c3: g => { g.add(glass(1.0, 0.86, (c, w, h) => { T(c, I.month || 'ปฏิทินคิว', 40, 66, 36, accHex, 700); const days = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']; days.forEach((d, i) => T(c, d, 60 + i * 64, 122, 24, ink2, 600, 'center'));
          for (let i = 0; i < 28; i++) { const x = 32 + (i % 7) * 64, y = 140 + Math.floor(i / 7) * 62, pick = i === 10, near = i < 3, sun = i % 7 === 6; c.fillStyle = pick ? accHex : near ? (dark ? 'rgba(255,170,90,.35)' : 'rgba(230,120,40,.25)') : (dark ? 'rgba(255,255,255,.07)' : 'rgba(16,26,42,.06)'); rr(c, x, y, 56, 52, 10); c.fill(); T(c, String(i + 1), x + 28, y + 35, 24, pick ? (dark ? '#03121a' : '#fff') : sun ? ink2 : ink, 600, 'center'); }
          chip(c, 40, h - 30, `จองปกติล่วงหน้า ${I.lead || ''} วัน`, accHex, dark ? '#03121a' : '#fff', 24); }, { at: [0, 0.55, 0], ry: 0.25 }));
        const rm = tool('remote', 2.2); rm.position.set(0.66, 0.4, 0.2); rm.rotation.set(0.3, -0.5, 0.2); g.add(rm); },
      c4: g => { const p = phone((c, w, h) => { c.fillStyle = '#0d141f'; c.fillRect(0, 0, w, h); c.fillStyle = '#e9eef4'; c.fillRect(0, 70, w, 230); const gr = c.createLinearGradient(0, 70, 0, 300); gr.addColorStop(0, '#cdd8e3'); gr.addColorStop(1, '#a9b8c6'); c.fillStyle = gr; c.fillRect(14, 84, w - 28, 202); c.fillStyle = '#f7f9fb'; c.fillRect(60, 130, 190, 54); c.fillStyle = '#9aa6b2'; c.fillRect(74, 170, 162, 6);
          T(c, 'ใบจองงาน', 20, 44, 26, '#eaf3ff', 700); ['ความสูง 2.4 ม.', 'คอยล์ร้อนระเบียง', 'แนบรูป 3 รูป'].forEach((s, k) => T(c, '✓  ' + s, 22, 350 + k * 46, 22, '#cfe3f5', 500)); c.fillStyle = accHex; rr(c, 22, h - 96, w - 44, 60, 30); c.fill(); T(c, 'ส่งใบจองงาน', w / 2, h - 56, 24, '#03121a', 700, 'center'); });
        p.position.set(-0.25, 0.55, 0); p.rotation.set(-0.05, 0.4, 0.02); g.add(p);
        g.add(glass(0.6, 0.34, (c, w, h) => { T(c, 'เลขอ้างอิง', 34, 64, 28, ink2, 500); T(c, 'B·2410·0715', 34, 132, 50, ink, 700); chip(c, 34, h - 34, 'ทีมยืนยันคิว', accHex, dark ? '#03121a' : '#fff', 24); }, { at: [0.45, 0.72, 0.2], ry: -0.35 })); },
      c5: g => { const U = unit(); U.root.position.set(0, 0.78, 0); g.add(U.root);
        const bag = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.16, 0.5, 40, 1, true), new THREE.MeshPhysicalMaterial({ color: 0x8fc8f0, roughness: 0.3, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false })); bag.scale.z = 0.45; bag.position.set(0, 0.42, 0.06); bag.userData.noShadow = true; g.add(bag);
        g.add(droplets(40, [-0.4, 0.4, 0.25, 0.62, 0.05, 0.22])); const gun = tool('gun', 1.8); gun.position.set(0.5, 0.95, 0.35); gun.rotation.set(0.3, -0.5, 1.1); g.add(gun);
        g.add(glass(0.5, 0.36, (c, w, h) => { T(c, 'น้ำยาทำงาน', 30, 62, 28, ink2, 500); T(c, '5–15', 30, 160, 92, accHex, 700); T(c, 'นาที ตามความสกปรก', 30, 210, 26, ink2, 500); }, { at: [-0.72, 0.62, 0.25], ry: 0.4 })); },
      c6: g => { const U = unit(); U.root.position.set(-0.25, 0.85, -0.1); g.add(U.root); g.add(airflow(new THREE.Vector3(-0.25, 0.73, 0.02), 6, 1.0));
        g.add(glass(0.62, 0.8, (c, w, h) => { T(c, 'รายงานหลังงาน', 36, 64, 34, accHex, 700); ['ล้างแผ่นกรอง', 'ล้างคอยล์เย็น', 'ล้างถาดน้ำทิ้ง', 'ทดสอบลมเย็น'].forEach((s, k) => { c.fillStyle = accHex; c.beginPath(); c.arc(56, 132 + k * 70, 16, 0, 7); c.fill(); T(c, '✓', 56, 141 + k * 70, 22, dark ? '#03121a' : '#fff', 700, 'center'); T(c, s, 88, 142 + k * 70, 30, ink, 500); });
          T(c, I.cleanWarranty ? 'รับประกัน ' + I.cleanWarranty : 'รับประกันตามแพ็กเกจ', 36, h - 48, 28, ink2, 500); }, { at: [0.6, 0.55, 0.15], ry: -0.35 })); },
      i1: g => { [[0.5, '9,000'], [0.62, '12,000'], [0.74, '18,000']].forEach(([s, b], i) => { const U = unit(); U.root.scale.setScalar(s); U.root.position.set(-0.62 + i * 0.62, 0.3 + i * 0.06, 0); g.add(U.root);
          g.add(glass(0.36, 0.13, (c, w, h) => { T(c, b + ' BTU', w / 2, h * 0.66, 50, i === 1 ? accHex : ink, 700, 'center'); }, { at: [-0.62 + i * 0.62, 0.62 + i * 0.1, 0.18] })); }); },
      i2: g => { const room = new THREE.Group(), wm = new THREE.MeshStandardMaterial({ color: 0xd9d2c6, roughness: 0.9 }), fl = new THREE.MeshStandardMaterial({ color: 0xb78b5e, roughness: 0.6 });
          const f = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.03, 1.0), fl); f.position.y = 0.015; room.add(f); const b = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.75, 0.03), wm); b.position.set(0, 0.39, -0.5); room.add(b); const l = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.75, 1.0), wm); l.position.set(0.7, 0.39, 0); room.add(l);
          const bed = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.62), new THREE.MeshStandardMaterial({ color: 0xe9e6e0, roughness: 0.95 })); bed.position.set(0.2, 0.08, -0.15); room.add(bed);
          const U = unit(); U.root.scale.setScalar(0.32); U.root.position.set(-0.2, 0.62, -0.47); room.add(U.root); room.add(airflow(new THREE.Vector3(-0.2, 0.58, -0.44), 4, 0.6));
          room.rotation.y = -0.15; g.add(room);
          g.add(glass(0.56, 0.3, (c, w, h) => { T(c, 'ห้อง 3.5 × 4.0 ม.', 30, 70, 32, ink, 700); T(c, 'ระยะฝ้า · ทิศลม · ความยาวท่อ', 30, 130, 24, ink2, 500); chip(c, 30, h - 34, 'แบบจำลองเพื่ออธิบาย', accHex, dark ? '#03121a' : '#fff', 22); }, { at: [0.62, 0.75, 0.3], ry: -0.4 })); },
      i3: g => { const c1 = coil(3.4, 0.3, 0.018); c1.position.set(-0.32, 0, 0.05); g.add(c1); const c2 = coil(2.2, 0.36, 0.034, insulM); c2.position.set(-0.32, 0, 0.05); g.add(c2);
          g.add(glass(0.66, 0.42, (c, w, h) => { T(c, 'รวมในค่าติดตั้ง', 34, 64, 28, ink2, 500); T(c, `${I.pipe || 4} ม. แรก`, 34, 150, 70, accHex, 700); T(c, 'ท่อทองแดง O-TWO 0.70 มม. · ฉนวน · ราง', 34, 206, 22, ink2, 500); T(c, 'ส่วนเกินคิดต่อเมตรตาม Pricebook', 34, h - 30, 22, ink2, 500); }, { at: [0.45, 0.55, 0.15], ry: -0.35 })); },
      i4: g => { const p = phone((c, w, h) => { c.fillStyle = '#0d141f'; c.fillRect(0, 0, w, h); const gr = c.createLinearGradient(0, 80, 0, 320); gr.addColorStop(0, '#e9e2d6'); gr.addColorStop(1, '#cdbfa9'); c.fillStyle = gr; c.fillRect(14, 80, w - 28, 240); c.fillStyle = '#8b97a3'; c.fillRect(70, 150, 170, 12); c.strokeStyle = accHex; c.lineWidth = 3; c.setLineDash([8, 6]); c.strokeRect(60, 120, 190, 90); c.setLineDash([]);
          T(c, 'รูปจุดติดตั้ง', 20, 48, 26, '#eaf3ff', 700); ['ผนังที่จะติด', 'ตำแหน่งคอยล์ร้อน', 'เบรกเกอร์'].forEach((s, k) => T(c, '✓  ' + s, 22, 372 + k * 46, 22, '#cfe3f5', 500)); });
        p.position.set(-0.3, 0.55, 0); p.rotation.set(-0.05, 0.4, 0.02); g.add(p); const d = tool('drill', 1.7); d.position.set(0.5, 0.42, 0.2); d.rotation.set(0.2, -0.6, 1.4); g.add(d);
        g.add(glass(0.56, 0.3, (c, w, h) => { T(c, 'งานนอกมาตรฐาน', 30, 64, 26, ink2, 500); T(c, 'แจ้งราคาก่อน', 30, 136, 50, ink, 700); T(c, 'ไม่เพิ่มรายการหน้างานโดยไม่แจ้ง', 30, h - 30, 22, ink2, 500); }, { at: [0.55, 0.85, 0.1], ry: -0.35 })); },
      i5: g => { const plate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.015), mat(0x8b97a3, { metalness: 0.6 })); plate.position.set(-0.1, 0.98, -0.12); g.add(plate); const U = unit(); U.root.position.set(-0.1, 0.9, -0.05); g.add(U.root);
        const mf = manifold(); mf.position.set(0.55, 0.45, 0.15); mf.rotation.y = -0.4; g.add(mf); const p = vacuumPump(); p.position.set(-0.45, 0.0, 0.35); p.rotation.y = 0.6; g.add(p);
        g.add(glass(0.5, 0.3, (c, w, h) => { T(c, 'VACUUM', 30, 60, 26, accHex, 700); T(c, 'micron', 30, 140, 70, ink, 700); T(c, 'ไมครอนเกจ · ค่าตามคู่มือผู้ผลิต', 30, h - 28, 22, ink2, 500); }, { at: [-0.68, 0.62, 0.2], ry: 0.4 })); },
      i6: g => { const sh = new THREE.Shape(); sh.moveTo(0, 0.42); sh.lineTo(0.3, 0.32); sh.lineTo(0.3, 0.05); sh.quadraticCurveTo(0.28, -0.25, 0, -0.38); sh.quadraticCurveTo(-0.28, -0.25, -0.3, 0.05); sh.lineTo(-0.3, 0.32); sh.closePath();
        const shield = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.02, bevelSegments: 6 }), new THREE.MeshPhysicalMaterial({ color: ACC, metalness: 0.85, roughness: 0.22, clearcoat: 1 })); shield.position.set(-0.3, 0.6, 0); shield.rotation.y = 0.35; g.add(shield);
        g.add(glass(0.66, 0.42, (c, w, h) => { T(c, 'รับประกันงานติดตั้ง', 34, 62, 28, ink2, 500); T(c, '3 ปี', 34, 160, 96, accHex, 700); T(c, 'ซื้อเครื่องกับบริษัท · 1 ปี เครื่องที่คุณจัดหา', 34, h - 32, 22, ink2, 500); }, { at: [0.42, 0.6, 0.15], ry: -0.3 })); },
      r1: g => { const U = unit(); U.root.position.set(-0.1, 0.8, 0); g.add(U.root); g.add(droplets(10, [-0.3, 0.1, 0.25, 0.62, 0.05, 0.12]));
        ['ไม่เย็น', 'น้ำหยด', 'มีเสียง'].forEach((s, i) => g.add(glass(0.36, 0.12, (c, w, h) => { T(c, s, w / 2, h * 0.68, 48, i === 1 ? accHex : ink, 700, 'center'); }, { at: [0.58, 0.95 - i * 0.18, 0.25 - i * 0.04], ry: -0.35 }))); },
      r2: g => { const rm = tool('remote', 3.2); rm.position.set(-0.45, 0.62, 0.1); rm.rotation.set(0.2, 0.4, 0.1); g.add(rm);
        const bx = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.55, 0.12), mat(0xe8ebee, { roughness: 0.5 })); bx.position.set(0.1, 0.5, -0.1); g.add(bx); for (let i = 0; i < 3; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.05), mat(i === 1 ? 0x2b3440 : 0x5a646e)); t.position.set(-0.01 + i * 0.11, 0.55, -0.02); t.rotation.x = i === 1 ? -0.4 : 0.3; g.add(t); }
        g.add(glass(0.56, 0.36, (c, w, h) => { T(c, 'ตรวจเองได้', 30, 60, 26, accHex, 700); ['โหมด Cool · 25–26°C', 'แผ่นกรอง', 'เบรกเกอร์ / แบตรีโมต'].forEach((s, k) => T(c, '•  ' + s, 30, 116 + k * 50, 26, ink, 500)); }, { at: [0.58, 0.85, 0.2], ry: -0.4 })); },
      r3: g => { g.add(glass(0.86, 0.66, (c, w, h) => { T(c, 'จองช่างตรวจ', 40, 70, 38, accHex, 700); T(c, 'ค่าตรวจวินิจฉัย', 40, 150, 28, ink2, 500); T(c, I.diag || '', 40, 230, 66, ink, 700); T(c, 'ผลประเมินอาการแนบในใบจอง', 40, h - 44, 26, ink2, 500); }, { at: [-0.15, 0.55, 0], ry: 0.2 }));
        const w = tool('wrench', 2.2); w.position.set(0.62, 0.45, 0.2); w.rotation.set(0.2, -0.4, 1.1); g.add(w); const m = tool('meter', 2.0); m.position.set(0.55, 0.85, 0.1); m.rotation.set(0.2, -0.5, 0.2); g.add(m); },
      r4: g => { const mf = manifold(); mf.scale.setScalar(1.6); mf.position.set(-0.4, 0.55, 0.1); mf.rotation.y = 0.3; g.add(mf);
        g.add(glass(0.62, 0.6, (c, w, h) => { T(c, 'ผลวินิจฉัย', 34, 60, 30, accHex, 700); [['สาเหตุ', 'แจ้งพร้อมภาพ'], ['ทางเลือก', 'ซ่อม · ล้าง · เปลี่ยน'], ['ราคา', 'ก่อน VAT']].forEach(([a, b], k) => { T(c, a, 34, 130 + k * 64, 26, ink2, 500); T(c, b, w - 34, 130 + k * 64, 26, ink, 700, 'right'); });
          chip(c, 34, h - 34, 'รอคุณอนุมัติ', accHex, dark ? '#03121a' : '#fff', 26); }, { at: [0.45, 0.6, 0.15], ry: -0.3 })); },
      r5: g => { const O = outdoor(); O.scale.setScalar(0.66); O.position.set(-0.2, 0.18, -0.05); O.rotation.y = 0.4; g.add(O); const w = tool('wrench', 2.4); w.position.set(0.5, 0.6, 0.25); w.rotation.set(0.1, -0.5, 1.6); g.add(w);
        g.add(glass(0.52, 0.26, (c, w2, h) => { T(c, 'ซ่อมหลังอนุมัติ', 30, 64, 30, ink, 700); T(c, 'ราคาตามที่ตกลง', 30, h - 34, 24, ink2, 500); }, { at: [0.55, 0.95, 0.1], ry: -0.35 })); },
      r6: g => { const U = unit(); U.root.position.set(-0.25, 0.85, -0.1); g.add(U.root); g.add(airflow(new THREE.Vector3(-0.25, 0.73, 0.02), 6, 1.0));
        g.add(glass(0.5, 0.6, (c, w, h) => { T(c, 'ลมออก', 34, 62, 28, ink2, 500); T(c, '12.4°C', 34, 150, 72, accHex, 700); T(c, 'กระแสไฟ', 34, 230, 28, ink2, 500); T(c, '5.1 A', 34, 300, 56, ink, 700); T(c, 'ตัวอย่างการบันทึก', 34, h - 30, 22, ink2, 500); }, { at: [0.6, 0.6, 0.15], ry: -0.35 })); },
    };

    function render(k, info, view = 0, size = null) {
      if (size) { r.setSize(size[0], size[1], false); cam.aspect = size[0] / size[1]; } else { r.setSize(W, H, false); cam.aspect = W / H; } cam.updateProjectionMatrix();
      scene.background = size ? backdrop : null;   // sized renders are film frames: opaque
      if (backGlow) backGlow.visible = !size;
      seed = 7 + k.length * 131 + k.charCodeAt(k.length - 1);
      Object.keys(I).forEach(x => delete I[x]); Object.assign(I, info || {});
      const g = new THREE.Group(); S[k](g);
      g.traverse(o => { if (o.isMesh) { const ns = o.userData.noShadow || (o.parent && o.parent.userData.noShadow); o.castShadow = !ns; o.receiveShadow = true; } });
      scene.add(g);
      const b0 = new THREE.Box3().setFromObject(g), c0 = b0.getCenter(new THREE.Vector3()), s0 = b0.getSize(new THREE.Vector3());
      ped.position.set(c0.x, b0.min.y - 0.001, c0.z); ped.scale.setScalar(Math.max(0.55, Math.max(s0.x, s0.z) * 0.46)); ped.updateMatrixWorld(true);
      const bb = b0.clone().union(new THREE.Box3().setFromObject(disc)), c = bb.getCenter(new THREE.Vector3()), sz = bb.getSize(new THREE.Vector3());
      const tv = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)), yaw = -0.34 + view * 0.46, pitch = 0.13;
      const dist = Math.max(sz.y / 2 / tv, Math.max(sz.x, sz.z * 0.7) / 2 / (tv * cam.aspect)) * 1.04 + sz.z * 0.3;
      cam.position.set(c.x + Math.sin(yaw) * Math.cos(pitch) * dist, c.y + Math.sin(pitch) * dist + 0.05, c.z + Math.cos(yaw) * Math.cos(pitch) * dist); cam.lookAt(c.x, c.y - sz.y * 0.07, c.z);
      key.position.set(c.x + 2.0, c.y + 3.2, c.z + 2.6); key.target.position.copy(c); fill.position.set(c.x - 3, c.y + 1, c.z + 2); fill.target.position.copy(c);
      rim.position.set(c.x - 1.4, c.y + 1.8, c.z - 3); rim.target.position.copy(c); rim2.position.set(c.x + 2.2, c.y + 1.2, c.z - 2.6); rim2.target.position.copy(c);
      const sc = key.shadow.camera, rad = sz.length() * 0.9; sc.left = sc.bottom = -rad; sc.right = sc.top = rad; sc.near = 0.1; sc.far = 14; sc.updateProjectionMatrix();
      r.render(scene, cam);
      scene.remove(g); g.traverse(o => { if (o.isMesh) { o.geometry.dispose(); const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => { if (m.map && m.map.isCanvasTexture) m.map.dispose(); }); } });
      return new Promise(res => {
        const done = blob => { if (!blob || blob.size < 6000) return res(null); const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => res(null); fr.readAsDataURL(blob); };
        try { cv.toBlob(bl => (bl && bl.type === 'image/webp') ? done(bl) : cv.toBlob(done, 'image/png'), 'image/webp', 0.9); } catch (e) { res(null); }
      });
    }
    return { render, soft, has: k => !!S[k], dispose() { pm.dispose(); r.dispose(); r.forceContextLoss(); } };
  })().catch(() => null);
  return studioP;
}

/** one rendered vignette (queued, one at a time; the studio is released 6 s after the last one) */
let slow = false, soft = null;
/** can this device render other angles live? (a GPU, and no still has been slow) — checked once with a throw-away context */
export function liveOK() {
  if (slow) return false;
  if (soft === null) { try { const g = document.createElement('canvas').getContext('webgl'), d = g && g.getExtension('WEBGL_debug_renderer_info'); soft = !g || /swiftshader|llvmpipe|software|basic render/i.test(d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : ''); g && g.getExtension('WEBGL_lose_context')?.loseContext(); } catch (e) { soft = true; } }
  return !soft;
}   // a still took too long on this device: keep the line art from now on (the page must stay responsive)
export function vignette(key, { theme = 'dark', accent = '#63E6FF', info = {}, view = 0, force = false, size = null, keep = true } = {}) {
  const id = `${theme}|${accent}|${key}|${view}|${size ? size.join('x') : ''}`;
  if (SHOTS[id]) return Promise.resolve(SHOTS[id]);
  if (typeof WebGLRenderingContext === 'undefined') return Promise.resolve(null);
  const job = queue.then(async () => {
    if (SHOTS[id]) return SHOTS[id];
    clearTimeout(idle);
    if (slow && !force) return null;
    const st = await studio(theme, accent, force); if (!st || !st.has(key)) return null;
    // software GL (no graphics card): one still blocks the page for many seconds — keep the line art instead (test pages pass force)
    if (st.soft && !force) { slow = true; return null; }
    await quiet();   // between scrolls, when the browser is idle
    const t0 = performance.now();
    try { SHOTS[id] = await st.render(key, info, view, size); } catch (e) { SHOTS[id] = null; }
    if (!keep) { const v = SHOTS[id]; delete SHOTS[id]; return v; }
    if (performance.now() - t0 > 2500 && !force) slow = true;
    idle = setTimeout(() => { const p = studioP; studioP = null; p && p.then(s => s && s.dispose()); }, 6000);
    return SHOTS[id];
  });
  queue = job.catch(() => null);
  return job;
}
