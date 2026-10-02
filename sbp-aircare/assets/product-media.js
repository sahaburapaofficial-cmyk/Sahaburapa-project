// SBP AirCare — product photos per model / series, with rendered 3D product shots as the fallback — Rev.09
// Owner decision (1 ต.ค. 2569): every model gets an image slot now; real photos are added later without code changes.
//   1) put the photo in assets/products/  (webp / png / jpg; transparent background looks best, ≥ 1200 px wide)
//   2) list it in assets/product-media.json — most specific key wins:
//        "models":  { "FTKB09ZV2S": ["daikin-ftkb09zv2s.webp", "daikin-ftkb09zv2s-side.webp"] }
//        "series":  { "daikin|FTKB / Max Inverter": ["daikin-ftkb.webp"] }        (brand id | series as shown on the card)
//        "brands":  { "fujiva": { "wall": ["fujiva-wall.webp"], "cassette": ["fujiva-4way.webp"] } }
//   build.py inlines the manifest as globalThis.__SBP_MEDIA and publishes the files next to each page (products/…).
// Without a photo the card shows a studio render of the neutral 3D body of that type (no brand design copied),
// captioned "ภาพประกอบ" so a render is never mistaken for the real product.
import { h, TYPE_BY_ID, BRAND_BY_ID } from './sbp-core.js';
import { typeArt } from './proto-ui.js';
import { whenNear } from './lazy.js';

let MEDIA = { models: {}, series: {}, brands: {} };
let BASE = './assets/products/';
export async function loadMedia() {
  try {
    if (globalThis.__SBP_MEDIA) { MEDIA = { ...MEDIA, ...globalThis.__SBP_MEDIA }; BASE = globalThis.__SBP_MEDIA.base || 'products/'; return MEDIA; }
    BASE = new URL('./products/', import.meta.url).href;
    const r = await fetch(new URL('./product-media.json', import.meta.url));
    if (r.ok) MEDIA = { ...MEDIA, ...(await r.json()) };
  } catch (e) { /* no manifest → renders only */ }
  return MEDIA;
}
const url = f => (/^(https?:|data:|\/)/.test(f) ? f : BASE + f);
// photos for one SKU of a catalog series card (m = DEMO.models entry, sku = one of m.skus)
export function photosFor(m, sku) {
  const b = BRAND_BY_ID[m.brand];
  const list = (sku && MEDIA.models[sku.sku]) || MEDIA.series[`${m.brand}|${m.series}`] || MEDIA.series[`${m.brand}|${sku?.d?.series}`] || (MEDIA.brands[m.brand] || {})[m.type] || [];
  return (Array.isArray(list) ? list : [list]).map(url).map(src => ({ src, alt: `${b ? b.name : ''} ${sku ? sku.sku : m.series}`.trim() }));
}
export const hasPhoto = (m, sku) => photosFor(m, sku).length > 0;

/* ---------- rendered product shots (one temporary WebGL context, then released) ---------- */
// Rev.11 (speed, same pictures): shots are rendered only when a card that needs one comes near the screen, one shot per
// frame (the page never freezes on a long render), the GL context is released once the queue is empty, and finished
// shots are kept in localStorage per render version so returning visitors see them at once.
const SHOTS = {};
const KEYS = ['wall', 'wall:fujiva', 'ceiling', 'cassette', 'floor'];
const CACHE = 'sbp-shots-r13';   // Rev.13: studio-lit, higher-resolution shots → older cached shots are dropped
try { ['sbp-shots-r11', 'sbp-shots-r12'].forEach(k => localStorage.removeItem(k)); } catch (e) { /* storage blocked */ }
try { Object.assign(SHOTS, JSON.parse(localStorage.getItem(CACHE) || '{}')); } catch (e) { /* storage blocked */ }
const saveShots = () => { try { localStorage.setItem(CACHE, JSON.stringify(SHOTS)); } catch (e) { /* full or blocked: render again next time */ } };
let studioP = null, queue = Promise.resolve(), idle = null;
function studio() {
  if (studioP) return studioP;
  studioP = (async () => {
    const THREE = await import('./three.module.min.js');
    await (await import('./brand3d.js')).logosReady();   // Rev.12: the FUJIVA shot is rendered once, with the official logo
    const { buildPremiumIndoor, buildOutdoor, materialSet } = await import('./ac3d.js');
    const { buildCeilingUnit, buildCassetteUnit, buildFloorUnit } = await import('./units3d.js');
    const { RoomEnvironment } = await import('./RoomEnvironment.js');
    let r;
    const W = 1080, H = 720;   // Rev.13: 1.5× the old size — crisp on retina cards and in the product drawer
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
    r.setPixelRatio(1); r.setSize(W, H, false);
    r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(r); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 1.0;
    // Rev.13 product-photo lighting: warm key (soft shadow), cool fill from the left, and a rim light from behind-above that
    // draws a bright edge along the white body so it separates from the light backdrop
    scene.add(new THREE.HemisphereLight(0xffffff, 0xdfe6ee, 0.4));
    const key = new THREE.DirectionalLight(0xfff6ec, 1.45); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 9; key.shadow.bias = -0.0004;
    const fill = new THREE.DirectionalLight(0xe6efff, 0.38), rim = new THREE.DirectionalLight(0xeaf2ff, 1.15);
    scene.add(key, key.target, fill, fill.target, rim, rim.target);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ opacity: 0.22 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    const cam = new THREE.PerspectiveCamera(26, W / H, 0.05, 30);
    const M = materialSet('studio');
    const shadowAll = g => g.traverse(o => { if (o.isMesh) { o.castShadow = !o.userData.noShadow; o.receiveShadow = true; } });
    const floating = U => U.root.traverse(o => { o.userData.noShadow = true; });   // indoor units float in the shot: only the outdoor unit grounds it
    const shot = (build, { yaw = -0.5, pitch = 0.16, pad = 0.97, floorAt = 'min', keyUp = 4 } = {}) => {   // Rev.13: tighter framing — the unit fills the card
      const g = new THREE.Group(); build(g); shadowAll(g); scene.add(g);
      const bb = new THREE.Box3().setFromObject(g), c = bb.getCenter(new THREE.Vector3()), sz = bb.getSize(new THREE.Vector3());
      ground.position.y = floorAt === 'min' ? bb.min.y - 0.002 : -50;
      // fit the box in both directions of the frame (tall floor units and wide ceiling units alike)
      const tv = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)), rad = sz.length() / 2;
      const dist = Math.max(sz.y / 2 / tv, Math.max(sz.x, sz.z) / 2 / (tv * cam.aspect)) * pad + Math.max(sz.x, sz.z) * 0.3;
      cam.position.set(c.x + Math.sin(yaw) * Math.cos(pitch) * dist, c.y + Math.sin(pitch) * dist, c.z + Math.cos(yaw) * Math.cos(pitch) * dist); cam.lookAt(c);
      key.position.set(c.x + 2.2, c.y + keyUp, c.z + 3); key.target.position.copy(c);
      fill.position.set(c.x - 3, c.y + 1, c.z + 2); fill.target.position.copy(c); rim.position.set(c.x - 1.5, c.y + 2.6, c.z - 3.2); rim.target.position.copy(c);
      const sc = key.shadow.camera; sc.left = sc.bottom = -rad * 1.6; sc.right = sc.top = rad * 1.6; sc.near = 0.1; sc.far = 12; sc.updateProjectionMatrix();
      r.render(scene, cam);
      let out = null; try { out = cv.toDataURL('image/webp', 0.9); if (!/^data:image\/webp/.test(out)) out = cv.toDataURL('image/png'); } catch (e) {}
      // Rev.14: a render that came out (almost) empty — software / broken GL draws only the shadow — is not a shot: keep the line art
      if (out && out.length < 24000) out = null;
      scene.remove(g); g.traverse(o => { if (o.isMesh) { o.geometry.dispose(); } });
      return out;
    };
    const outdoor = (g, x, z, s = 0.62, logo = false) => { const O = buildOutdoor(M, { logo }); O.root.scale.setScalar(s); O.root.position.set(x, 0.55 * s / 2, z); O.root.rotation.y = -0.18; g.add(O.root); };
    const BUILD = {
      wall: () => shot(g => { const U = buildPremiumIndoor(M, { logo: false }); floating(U); U.root.position.set(0, 0.62, 0); U.root.rotation.y = 0.04; g.add(U.root); outdoor(g, 0.72, -0.62); }, { yaw: -0.42, pitch: 0.12 }),
      'wall:fujiva': () => shot(g => { const U = buildPremiumIndoor(M, { logo: true }); floating(U); U.root.position.set(0, 0.62, 0); U.root.rotation.y = 0.04; g.add(U.root); outdoor(g, 0.72, -0.62, 0.62, true); }, { yaw: -0.42, pitch: 0.12 }),   // company brand: logo allowed
      ceiling: () => shot(g => { const U = buildCeilingUnit(M, { interior: false, rod: 0 }); floating(U); U.parts.hangers && (U.parts.hangers.visible = false); U.root.position.set(0, 0.7, 0); g.add(U.root); outdoor(g, 1.0, -0.9, 0.7); }, { yaw: -0.5, pitch: 0.05 }),
      cassette: () => shot(g => { const U = buildCassetteUnit(M, { interior: false, rod: 0 }); floating(U); U.root.position.set(0, 0.75, 0); U.root.rotation.x = -0.95; U.parts.hangers && (U.parts.hangers.visible = false); g.add(U.root); outdoor(g, 0.95, -0.8, 0.7); }, { yaw: -0.5, pitch: 0.1 }),   // panel tilted toward the camera, as product shots show it
      floor: () => shot(g => { const U = buildFloorUnit(M); g.add(U.root); outdoor(g, 0.92, -0.3, 0.62); }, { yaw: -0.45, pitch: 0.14, keyUp: 9 }),   // high key light: short shadow under a tall unit
    };
    return { render: k => BUILD[k](), dispose() { pm.dispose(); r.dispose(); r.forceContextLoss(); } };
  })().catch(() => null);   // no WebGL → the line-art illustration stays
  return studioP;
}
/** one rendered shot (data URL) — queued, one per frame; resolves to null when WebGL is unavailable */
export function productShot(key) {
  if (SHOTS[key]) return Promise.resolve(SHOTS[key]);
  const job = queue.then(async () => {
    if (SHOTS[key]) return SHOTS[key];
    clearTimeout(idle);
    const st = await studio(); if (!st) return null;
    await new Promise(res => requestAnimationFrame(() => setTimeout(res, 0)));   // let the page breathe between shots
    try { SHOTS[key] = st.render(key); } catch (e) { SHOTS[key] = null; }
    if (SHOTS[key]) saveShots();
    idle = setTimeout(() => { const p = studioP; studioP = null; p && p.then(s => s && s.dispose()); }, 1500);   // free the GL context
    return SHOTS[key];
  });
  queue = job.catch(() => null);
  return job;
}
/** all shots (kept for callers that want the whole set) */
export async function productShots() { for (const k of KEYS) await productShot(k); return SHOTS; }

/* ---------- the visual used by catalog cards, product detail and the room-fit picker ---------- */
// size: 'card' | 'detail' | 'thumb'
export function productVisual(m, sku, { size = 'card', tag = null } = {}) {
  const t = TYPE_BY_ID[m.type];
  const photos = photosFor(m, sku);
  const fig = h('figure', { class: `s-ph s-ph-${size}` + (photos.length ? ' real' : ' render'), 'data-type': m.type });
  if (photos.length) {
    const main = h('img', { src: photos[0].src, alt: photos[0].alt, loading: 'lazy', decoding: 'async' });
    fig.append(main);
    if (size === 'detail' && photos.length > 1) {
      const strip = h('div', { class: 's-ph-strip', role: 'group', 'aria-label': 'ภาพสินค้า' });
      photos.forEach((p, i) => strip.append(h('button', { type: 'button', 'aria-pressed': i === 0, 'aria-label': `ภาพที่ ${i + 1}`, onclick: e => { main.src = p.src; strip.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === e.currentTarget)); } }, h('img', { src: p.src, alt: '', loading: 'lazy' }))));
      fig.append(strip);
    }
  } else {
    const holder = h('div', { class: 's-ph-art', html: typeArt(m.type) });
    fig.append(holder, h('figcaption', {}, 'ภาพประกอบ'));
    const key = m.brand === 'fujiva' && m.type === 'wall' ? 'wall:fujiva' : m.type;
    const swap = src => { if (src && holder.isConnected !== false) holder.replaceWith(h('img', { src, alt: `ภาพประกอบ ${t ? t.th : ''}`, decoding: 'async' })); };
    if (SHOTS[key]) swap(SHOTS[key]); else whenNear(fig, () => productShot(key).then(swap));
  }
  if (tag) fig.append(h('span', { class: 's-ph-tag' }, tag));
  return fig;
}
