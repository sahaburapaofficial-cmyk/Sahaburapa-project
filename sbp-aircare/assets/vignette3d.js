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
    const { buildCeilingUnit, buildCassetteUnit, buildFloorUnit } = await import('./units3d.js');
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
    const unit = (type = 'wall', logo = true) => {
      const U = type === 'ceiling' ? buildCeilingUnit(M, { interior: false, rod: 0 }) : type === 'cassette' ? buildCassetteUnit(M, { interior: false, rod: 0 }) : type === 'floor' ? buildFloorUnit(M, {}) : buildPremiumIndoor(M, { logo });
      if (U.parts && U.parts.hangers) U.parts.hangers.visible = false;
      return U;
    };
    const outdoor = (logo = true) => buildOutdoor(M, { logo }).root;
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

    /* ---------- Rev.45 extra pieces for the symptom / knowledge / type / material / building scenes ---------- */
    const box = (w, h, d, m, x, y, z, ry = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y + h / 2, z); b.rotation.y = ry; return b; };
    const cylM = (r, h, m, x, y, z, seg = 32, r2) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r2 ?? r, h, seg), m); c.position.set(x, y + h / 2, z); return c; };
    const wallM = mat(dark ? 0x1d2533 : 0xe9e5de, { roughness: 0.92 }), glassM = new THREE.MeshPhysicalMaterial({ color: dark ? 0x6fb7e8 : 0x9cc8ea, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.55 });
    const whiteM = mat(0xf2f4f6, { roughness: 0.45 }), darkM = mat(0x23282f, { roughness: 0.5 }), redM = mat(0xd8452c, { roughness: 0.45 }), blueM = mat(0x2f7fd0, { roughness: 0.4 });
    const glowM = c => new THREE.MeshBasicMaterial({ color: c, toneMapped: false, transparent: true, opacity: 0.9 });
    const backWall = (w = 1.7, h = 1.25) => { const m = box(w, h, 0.06, wallM, 0, 0, -0.38); m.userData.noShadow = true; return m; };
    const wallUnit = (g, logo = false, y = 0.86) => { g.add(backWall()); const U = unit('wall', logo); U.root.position.set(0, y, -0.24); g.add(U.root); return U; };
    const puddle = (x, z, r = 0.22) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 40), new THREE.MeshPhysicalMaterial({ color: 0x8fd0ff, roughness: 0.02, transparent: true, opacity: 0.55, clearcoat: 1 })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.004, z); m.scale.y = 0.6; m.userData.noShadow = true; return m; };
    const crystals = (n, box3) => { const g = new THREE.Group(), m = new THREE.MeshPhysicalMaterial({ color: 0xeaf8ff, roughness: 0.15, transmission: 0, transparent: true, opacity: 0.85, clearcoat: 1 }); for (let i = 0; i < n; i++) { const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.012 + rnd() * 0.02), m); c.position.set(box3[0] + rnd() * (box3[1] - box3[0]), box3[2] + rnd() * (box3[3] - box3[2]), box3[4] + rnd() * (box3[5] - box3[4])); c.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); c.scale.y = 1.6; g.add(c); } return g; };
    const rings = (x, y, z, n = 3, c = ACC) => { const g = new THREE.Group(); for (let i = 0; i < n; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.16 + i * 0.12, 0.006, 8, 64, Math.PI * 0.9), glowM(c)); t.material.opacity = 0.75 - i * 0.2; t.position.set(x, y, z); t.rotation.set(0, Math.PI / 2, -Math.PI * 0.45); g.add(t); } return g; };
    const haze = (from, c, n = 4) => { const g = new THREE.Group(); for (let i = 0; i < n; i++) { const pts = [new THREE.Vector3(from.x - 0.2 + i * 0.13, from.y, from.z), new THREE.Vector3(from.x - 0.15 + i * 0.13 + 0.06, from.y - 0.2, from.z + 0.25), new THREE.Vector3(from.x - 0.2 + i * 0.13 - 0.04, from.y - 0.42, from.z + 0.5), new THREE.Vector3(from.x - 0.2 + i * 0.13 + 0.05, from.y - 0.6, from.z + 0.7)]; const t = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.018, 8), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false })); t.userData.noShadow = true; g.add(t); } return g; };
    const thermo = (x, y, z, hot = true) => { const g = new THREE.Group(); g.add(cylM(0.022, 0.42, mat(0xffffff, { roughness: 0.1, transparent: true, opacity: 0.6 }), 0, 0.04, 0, 20)); g.add(cylM(0.011, hot ? 0.34 : 0.16, mat(hot ? 0xe0452a : 0x2f7fd0), 0, 0.05, 0, 12)); const b = new THREE.Mesh(new THREE.SphereGeometry(0.04, 20, 14), mat(hot ? 0xe0452a : 0x2f7fd0)); b.position.y = 0.04; g.add(b); g.position.set(x, y, z); return g; };
    const panelBox = (x, y, z, tripped = 1) => { const g = new THREE.Group(); g.add(box(0.5, 0.62, 0.12, mat(0xe3e7ea, { roughness: 0.4, metalness: 0.2 }), 0, 0, 0)); for (let i = 0; i < 4; i++) { g.add(box(0.07, 0.16, 0.05, mat(0xf7f8f9), -0.15 + i * 0.1, 0.36, 0.07)); g.add(box(0.035, 0.05, 0.03, i === tripped ? redM : darkM, -0.15 + i * 0.1, i === tripped ? 0.38 : 0.45, 0.1)); } g.position.set(x, y, z); return g; };
    const clock = (x, y, z) => { const g = new THREE.Group(); const f = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 48), whiteM); f.rotation.x = Math.PI / 2; g.add(f); const rim = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.012, 8, 48), chrome); g.add(rim); [[0.1, 0.4], [0.13, 2.2]].forEach(([l, a]) => { const hnd = box(0.012, l, 0.006, darkM, 0, 0, 0.02); hnd.position.y = 0; hnd.geometry.translate(0, l / 2 - 0.005, 0); hnd.rotation.z = -a; g.add(hnd); }); g.position.set(x, y, z); return g; };
    const coins = (x, z, n = 6) => { const g = new THREE.Group(); for (let i = 0; i < n; i++) g.add(cylM(0.06, 0.012, mat(0xd8b24a, { metalness: 1, roughness: 0.3 }), x + (i % 2) * 0.004, i * 0.013, z, 32)); return g; };
    const paper = (w, h, x, y, z, rx = -Math.PI / 2, ry = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat(0xfbfbf8, { roughness: 0.9, side: THREE.DoubleSide })); m.rotation.set(rx, ry, 0); m.position.set(x, y, z); return m; };
    const lines = (w, h, n, x, y, z, rx = -Math.PI / 2) => { const g = new THREE.Group(); for (let i = 0; i < n; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(w * (i % 3 === 2 ? 0.5 : 0.8), 0.008), mat(0x9aa6b2)); l.position.set(x - w * 0.05, y + 0.001, z - h / 2 + 0.06 + i * (h - 0.1) / n); l.rotation.x = rx; g.add(l); } return g; };
    const building = (w, h, d, floors, x, z, m = whiteM, opt = {}) => { const g = new THREE.Group(); g.add(box(w, h, d, m, 0, 0, 0)); for (let f = 0; f < floors; f++) { const y = (f + 0.35) * h / floors; g.add(box(w + 0.004, h / floors * 0.42, d + 0.004, glassM, 0, y, 0)); if (opt.balcony) g.add(box(w + 0.04, 0.012, d + 0.04, m, 0, y - 0.01, 0)); } g.add(box(w * 1.02, 0.02, d * 1.02, darkM, 0, h, 0)); g.position.set(x, 0, z); return g; };
    const pin = (x, z) => { const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 24), redM); c.rotation.x = Math.PI; c.position.y = 0.08; g.add(c); const b = new THREE.Mesh(new THREE.SphereGeometry(0.055, 24, 18), redM); b.position.y = 0.19; g.add(b); const r = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.006, 8, 64), glowM(ACC)); r.rotation.x = Math.PI / 2; r.position.y = 0.006; g.add(r); g.position.set(x, 0, z); return g; };
    const insulTube = (pts, r = 0.035) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, r, 20), mat(0x1a1c1f, { roughness: 0.95 }));
    const pipe = (pts, r, m) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, r, 16), m);
    const P3 = (x, y, z) => new THREE.Vector3(x, y, z);

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
      /* Rev.45 — symptoms (a customer's own unit: no brand, rule 20) */
      'sym:warm': g => { wallUnit(g); g.add(airflow(P3(0, 0.74, -0.12), 6, 0.9, false)); g.add(thermo(0.62, 0.15, 0.25, true)); },
      'sym:drip': g => { wallUnit(g); g.add(droplets(14, [-0.3, 0.3, 0.12, 0.68, -0.15, -0.05])); g.add(puddle(0, -0.05)); },
      'sym:ice': g => { wallUnit(g); g.add(crystals(70, [-0.42, 0.42, 0.7, 0.8, -0.16, -0.08])); g.add(airflow(P3(0, 0.74, -0.12), 4, 0.5)); },
      'sym:dead': g => { wallUnit(g); const rm = tool('remote', 3.2); rm.position.set(0.45, 0.32, 0.3); rm.rotation.set(-0.6, -0.4, 0.2); g.add(rm); },
      'sym:code': g => { wallUnit(g); for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.03 + i * 0.03, 20, 14), glowM(0xff4a3a)); l.material.opacity = 0.9 - i * 0.3; l.position.set(0.26, 1.0, -0.06); g.add(l); } },
      'sym:trip': g => { g.add(backWall()); g.add(panelBox(0, 0.4, -0.3, 1)); for (let i = 0; i < 3; i++) { const z = new THREE.Mesh(new THREE.TorusGeometry(0.05 + i * 0.03, 0.005, 6, 6), glowM(0xffc23a)); z.position.set(-0.06, 0.95, -0.2); z.rotation.z = i; g.add(z); } },
      'sym:cycle': g => { wallUnit(g); g.add(clock(0.6, 0.45, -0.3)); },
      'sym:noise': g => { const O = outdoor(false); O.scale.setScalar(0.62); O.position.set(-0.2, 0.0, -0.1); O.rotation.y = 0.35; g.add(O); g.add(rings(0.35, 0.3, 0.0, 3)); },
      'sym:smell': g => { wallUnit(g); g.add(haze(P3(0, 0.72, -0.1), 0x8ab86a, 4)); },
      'sym:weak': g => { wallUnit(g); const f = box(0.55, 0.03, 0.26, mat(0x8a7a66, { roughness: 1 }), 0.35, 0.02, 0.25, -0.3); g.add(f); g.add(airflow(P3(0, 0.74, -0.12), 2, 0.35)); },
      'sym:swing': g => { const U = wallUnit(g); const fl = box(0.7, 0.012, 0.08, whiteM, 0, 0.7, -0.08); fl.rotation.x = 0.9; g.add(fl); },
      'sym:cduwater': g => { const O = outdoor(false); O.scale.setScalar(0.62); O.position.set(0, 0.12, -0.1); g.add(O); g.add(box(0.7, 0.12, 0.42, mat(0x8b939b, { metalness: 0.6, roughness: 0.4 }), 0, 0, -0.1)); g.add(droplets(10, [-0.25, 0.25, 0.02, 0.1, 0.08, 0.14])); g.add(puddle(0, 0.25, 0.26)); },
      'sym:bill': g => { g.add(paper(0.36, 0.5, -0.2, 0.01, 0.1, -Math.PI / 2, 0.3)); g.add(lines(0.36, 0.5, 7, -0.2, 0.01, 0.1)); g.add(coins(0.25, 0.15, 7)); g.add(coins(0.38, -0.02, 4)); const m = box(0.3, 0.42, 0.14, mat(0xe8eaec, { roughness: 0.4 }), 0.1, 0, -0.32); g.add(m); g.add(cylM(0.07, 0.02, glowM(ACC), 0.1, 0.25, -0.24, 32)); },
      'sym:care': g => { wallUnit(g, false, 0.92); const c = box(0.42, 0.42, 0.03, whiteM, 0.55, 0.22, -0.3); g.add(c); for (let i = 0; i < 16; i++) g.add(box(0.07, 0.05, 0.005, i === 9 ? glowM(ACC) : mat(0xdfe5ea), 0.43 + (i % 4) * 0.08, 0.27 + Math.floor(i / 4) * 0.075, -0.28)); },
      /* knowledge topics */
      'kn:btu': g => { const room = new THREE.Group(); room.add(box(1.3, 0.03, 0.95, mat(0xb78b5e, { roughness: 0.6 }), 0, 0, 0)); room.add(box(1.3, 0.7, 0.03, wallM, 0, 0, -0.48)); room.add(box(0.03, 0.7, 0.95, wallM, -0.65, 0, 0)); const U = unit(); U.root.scale.setScalar(0.32); U.root.position.set(0, 0.58, -0.45); room.add(U.root); room.add(airflow(P3(0, 0.54, -0.42), 4, 0.6)); room.add(box(0.5, 0.008, 0.02, glowM(ACC), 0, 0.03, 0.47)); room.add(box(0.02, 0.008, 0.9, glowM(ACC), 0.64, 0.03, 0)); g.add(room); },
      'kn:types': g => { [['wall', -0.75, 0.55, 0.5], ['ceiling', -0.15, 0.62, 0.42], ['cassette', 0.45, 0.6, 0.42], ['floor', 0.95, 0, 0.42]].forEach(([t, x, y, sc]) => { const U = unit(t); U.root.scale.setScalar(sc); U.root.position.set(x, y, 0); if (t === 'cassette') U.root.rotation.x = -0.8; g.add(U.root); }); },
      'kn:inverter': g => { g.add(cylM(0.17, 0.42, mat(0x2b3138, { metalness: 0.6, roughness: 0.35 }), -0.3, 0, 0, 40)); g.add(cylM(0.17, 0.04, mat(0x3a424b, { metalness: 0.6 }), -0.3, 0.42, 0, 40)); g.add(pipe([P3(-0.3, 0.46, 0), P3(-0.3, 0.6, 0), P3(-0.05, 0.62, 0.05)], 0.016, copperM)); g.add(box(0.5, 0.025, 0.36, mat(0x1f6b3a, { roughness: 0.5 }), 0.3, 0.02, 0.05)); g.add(box(0.14, 0.03, 0.14, darkM, 0.3, 0.045, 0.05)); for (let i = 0; i < 8; i++) g.add(box(0.03, 0.02, 0.05, mat(0xc9cdd1, { metalness: 0.8 }), 0.12 + (i % 4) * 0.12, 0.045, -0.08 + Math.floor(i / 4) * 0.27)); g.add(box(0.12, 0.012, 0.012, glowM(ACC), 0.3, 0.08, 0.05)); },
      'kn:clean': g => { wallUnit(g, true); g.add(droplets(24, [-0.32, 0.32, 0.25, 0.7, -0.12, 0.05])); const gun = tool('gun', 1.6); gun.position.set(0.55, 0.55, 0.2); gun.rotation.set(0.2, -0.6, 0.9); g.add(gun); },
      'kn:c1c2': g => { const U = unit(); U.root.scale.setScalar(0.62); U.root.position.set(-0.35, 0.05, 0); g.add(U.root); [0, 1, 2].forEach(i => g.add(box(0.36, 0.012, 0.22, i === 2 ? mat(0xf2f4f6) : mat(0x9fb3c6, { roughness: 0.8 }), 0.35 + (i % 2) * 0.1, 0.012 * i, -0.15 + i * 0.25, 0.2))); },
      'kn:install': g => { g.add(backWall(2.0, 1.3)); const U = unit(); U.root.position.set(-0.35, 0.95, -0.24); g.add(U.root); g.add(box(0.08, 0.06, 0.06, whiteM, 0.12, 0.98, -0.32)); g.add(box(0.06, 0.95, 0.06, whiteM, 0.18, 0.05, -0.32)); const O = outdoor(); O.scale.setScalar(0.45); O.position.set(0.6, 0, -0.15); g.add(O); },
      'kn:place': g => { const room = new THREE.Group(); room.add(box(1.4, 0.03, 1.0, mat(0xc9a77e, { roughness: 0.6 }), 0, 0, 0)); room.add(box(1.4, 0.75, 0.03, wallM, 0, 0, -0.5)); const U = unit(); U.root.scale.setScalar(0.34); U.root.position.set(-0.25, 0.62, -0.47); room.add(U.root); room.add(airflow(P3(-0.25, 0.58, -0.44), 4, 0.75)); room.add(box(0.7, 0.2, 0.3, mat(0x8d99a8, { roughness: 0.95 }), 0.2, 0.03, 0.28)); room.add(box(0.7, 0.22, 0.08, mat(0x8d99a8, { roughness: 0.95 }), 0.2, 0.23, 0.42)); g.add(room); },
      'kn:contract': g => { [0, 1, 2].forEach(i => { const U = unit(); U.root.scale.setScalar(0.42); U.root.position.set(-0.55 + i * 0.4, 0.15 + i * 0.12, -0.1 - i * 0.05); g.add(U.root); }); const t = tool('tablet', 2.2); t.position.set(0.55, 0.12, 0.25); t.rotation.set(-0.9, -0.3, 0); g.add(t); },
      'kn:packages': g => { [[0.28, 0.2], [0.32, 0.3], [0.36, 0.42]].forEach(([w, h], i) => { g.add(box(w, h, w * 0.8, mat(0xeef1f4, { roughness: 0.5 }), -0.45 + i * 0.45, 0, 0)); g.add(box(w + 0.004, 0.03, w * 0.8 + 0.004, glowM(ACC), -0.45 + i * 0.45, h * 0.6, 0)); }); },
      'kn:docs': g => { for (let i = 0; i < 5; i++) g.add(paper(0.42, 0.56, -0.15 + i * 0.006, 0.006 + i * 0.008, 0.05 - i * 0.004, -Math.PI / 2, 0.05 * i)); g.add(lines(0.42, 0.56, 8, -0.126, 0.05, 0.034)); const t = tool('tablet', 2.0); t.position.set(0.42, 0.06, 0.05); t.rotation.set(-1.3, 0.3, 0); g.add(t); },
      'kn:vrf': g => { g.add(box(1.8, 0.05, 0.8, mat(0x9aa3ad, { roughness: 0.8 }), 0, 0, 0)); [0, 1, 2].forEach(i => { const O = outdoor(); O.scale.setScalar(0.5); O.position.set(-0.6 + i * 0.6, 0.05, 0); g.add(O); }); },
      'kn:area': g => { for (let i = 0; i < 16; i++) { const x = -0.75 + (i % 4) * 0.5, z = -0.6 + Math.floor(i / 4) * 0.4, h = 0.08 + rnd() * 0.35; if (i !== 6) g.add(building(0.2, h, 0.2, Math.max(1, Math.round(h * 12)), x + rnd() * 0.08, z, whiteM)); } g.add(pin(0.25, 0.0)); },
      /* AC types (product scenes — FUJIVA unit allowed) */
      'type:wall': g => { const U = unit('wall'); U.root.position.set(0, 0.25, 0); g.add(U.root); },
      'type:ceiling': g => { const U = unit('ceiling'); U.root.position.set(0, 0.2, 0); g.add(U.root); },
      'type:cassette': g => { const U = unit('cassette'); U.root.position.set(0, 0.35, 0); U.root.rotation.x = -0.7; g.add(U.root); },
      'type:floor': g => { const U = unit('floor'); g.add(U.root); },
      /* materials (generic pieces, no logos — rule 14) */
      'mat:copper': g => { const c1 = coil(3.0, 0.26, 0.012); c1.position.set(-0.05, 0, 0); g.add(c1); const c2 = coil(2.4, 0.34, 0.018); c2.position.set(-0.05, 0, 0); g.add(c2); },
      'mat:insul': g => { g.add(insulTube([P3(-0.6, 0.06, 0.1), P3(-0.1, 0.06, 0.15), P3(0.3, 0.12, -0.05), P3(0.6, 0.06, -0.2)], 0.04)); const c = pipe([P3(0.6, 0.06, -0.2), P3(0.72, 0.06, -0.27)], 0.02, copperM); g.add(c); g.add(insulTube([P3(-0.6, 0.05, 0.3), P3(0.2, 0.05, 0.35), P3(0.6, 0.05, 0.15)], 0.03)); },
      'mat:duct': g => { g.add(box(1.0, 0.08, 0.1, whiteM, -0.1, 0, 0)); g.add(box(0.1, 0.5, 0.1, whiteM, 0.45, 0, 0)); g.add(box(0.12, 0.12, 0.12, mat(0xeceff1), 0.45, 0, 0)); g.add(box(0.55, 0.08, 0.1, whiteM, -0.2, 0, 0.35, 0.3)); },
      'mat:cable': g => { [[0x8a5a2b, 0], [0x2f7fd0, 0.05], [0x3fa34d, 0.1]].forEach(([c, dz], i) => { const pts = []; for (let k = 0; k <= 80; k++) { const a = k / 80 * Math.PI * 5; pts.push(P3(Math.cos(a) * (0.26 - i * 0.04), 0.03 + k * 0.0012, Math.sin(a) * (0.26 - i * 0.04))); } g.add(pipe(pts, 0.012, mat(c, { roughness: 0.5 }))); }); },
      'mat:drain': g => { const pm = mat(0x3f8fd6, { roughness: 0.4 }); g.add(pipe([P3(-0.6, 0.05, 0), P3(0.4, 0.05, 0)], 0.03, pm)); g.add(pipe([P3(0.4, 0.05, 0), P3(0.48, 0.05, 0), P3(0.5, 0.12, 0), P3(0.5, 0.5, 0)], 0.03, pm)); g.add(pipe([P3(-0.5, 0.04, 0.3), P3(0.3, 0.04, 0.3)], 0.022, pm)); },
      'mat:mount': g => { const st = mat(0x8e979f, { metalness: 0.8, roughness: 0.35 }); [-0.3, 0.3].forEach(x => { g.add(box(0.05, 0.6, 0.04, st, x, 0, -0.25)); g.add(box(0.05, 0.04, 0.6, st, x, 0.08, 0.02)); g.add(cylM(0.045, 0.03, darkM, x, 0.12, 0.1, 24)); }); },
      'mat:rcbo': g => { [0, 1, 2].forEach(i => { g.add(box(0.12, 0.3, 0.2, mat(0xf4f5f6, { roughness: 0.35 }), -0.2 + i * 0.14, 0, 0)); g.add(box(0.05, 0.06, 0.02, i === 1 ? glowM(ACC) : darkM, -0.2 + i * 0.14, 0.2, 0.11)); }); g.add(box(0.5, 0.03, 0.06, chrome, -0.06, 0.12, -0.1)); },
      /* enterprise building types */
      'ent:office': g => { g.add(building(0.5, 1.2, 0.5, 12, 0, 0)); g.add(building(0.36, 0.6, 0.36, 6, 0.55, 0.15)); },
      'ent:chain': g => { [-0.6, 0, 0.6].forEach((x, i) => { g.add(building(0.42, 0.34, 0.36, 1, x, 0)); g.add(box(0.44, 0.04, 0.1, glowM(ACC), x, 0.26, 0.2)); }); },
      'ent:condo': g => { g.add(building(0.36, 1.35, 0.36, 18, -0.15, 0, whiteM, { balcony: true })); g.add(building(0.32, 0.95, 0.32, 13, 0.35, 0.1, whiteM, { balcony: true })); },
      'ent:hospital': g => { g.add(building(1.2, 0.5, 0.5, 4, 0, 0)); [0, 1].forEach(r => g.add(box(r ? 0.16 : 0.05, r ? 0.05 : 0.16, 0.02, redM, 0, 0.6 - (r ? 0 : 0.055), 0.26))); g.add(box(0.3, 0.12, 0.3, whiteM, 0, 0.5, 0)); },
      'ent:school': g => { g.add(building(1.1, 0.42, 0.42, 2, 0, 0)); g.add(cylM(0.008, 0.9, chrome, 0.7, 0, 0.2, 8)); g.add(box(0.18, 0.1, 0.005, mat(0x2f5fb0), 0.79, 0.78, 0.2)); g.add(box(0.9, 0.01, 0.4, mat(0x4f8a57, { roughness: 0.9 }), 0, 0, 0.45)); },
      'ent:hotel': g => { g.add(building(0.7, 1.1, 0.4, 14, 0, -0.1)); g.add(box(0.6, 0.02, 0.32, mat(0x3fb4e6, { roughness: 0.05 }), 0.1, 0, 0.35)); },
      'ent:factory': g => { const sh = mat(0xd9dde1, { roughness: 0.6, metalness: 0.3 }); g.add(box(1.2, 0.36, 0.7, sh, 0, 0, 0)); const tri = new THREE.Shape(); tri.moveTo(0, 0); tri.lineTo(0.3, 0); tri.lineTo(0.3, 0.16); tri.closePath(); const tg = new THREE.ExtrudeGeometry(tri, { depth: 0.7, bevelEnabled: false }); tg.translate(0, 0, -0.35); for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(tg, sh); r.position.set(-0.6 + i * 0.3, 0.36, 0); g.add(r); g.add(box(0.012, 0.15, 0.68, glassM, -0.3 + i * 0.3 - 0.006, 0.36, 0)); } g.add(cylM(0.05, 0.85, mat(0x8a929a), 0.5, 0, -0.25, 20)); },
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
      scene.background = backdrop;   // Rev.43: opaque studio backdrop for stills and film frames alike (smaller files, photo-like)
      if (backGlow) backGlow.visible = false;
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
        try { cv.toBlob(bl => (bl && bl.type === 'image/webp') ? done(bl) : cv.toBlob(done, 'image/png'), 'image/webp', 0.84); } catch (e) { res(null); }
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
