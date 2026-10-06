// SBP AirCare — design E "Atelier": the living room through a day, rendered in 3D — Rev.36 (owner 6 ต.ค. 2569: "D E F Animation 3D
// 4D 5D movement motion cinematic ทุกอย่าง จัดทำให้เสมือนจริงในส่วนที่ยังดูเป็น Graphic design หรือภาพที่ไม่หรูหราหรือสมจริง")
// Replaces the flat 2.5D drawing with a lit room: the sun really moves (its light comes through the window, the mullions cast
// their shadows on the oak floor, the patch travels and warms toward evening), a light shaft with dust drifting in it, the sky
// and the city behind the glass change from morning to night (lit windows, a floor lamp, a warm cove line), sheer curtains
// glow against the light, and the FUJIVA unit's cool air leaves the vent. Camera: a slow hand-held breath + pointer parallax.
//   · everything procedural (canvas textures), three.js r170, one WebGL context through gl-pool (≤ 3 per page)
//   · shadows are redrawn only when the hour changes; the loop runs only while the room is on screen; reduced motion = still frame
//   · the numbers on screen stay those of atelier.roomAt / outAt (model) — this module only draws
import * as THREE from './three.module.min.js';
import { RoomEnvironment } from './RoomEnvironment.js';
import { track } from './gl-pool.js';
import { hqFor } from './quality3d.js';
import { createWisps } from './wisp3d.js';
import { mats, F, rbox, ctex, TEX } from './roomkit3d.js';
import { mergeStatic } from './luxroom3d.js';
import { buildPremiumIndoor, materialSet } from './ac3d.js';
import { effects } from './studio-model.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
const RM = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const R = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(24680);
// sky keyframes by hour: [hour, zenith, horizon] — the same day as the drawing it replaces
const SKY = [[5, '#1b2140', '#4a3b5c'], [6.5, '#7f8fc4', '#f6b48c'], [8.5, '#86bfe9', '#e9eef0'], [13, '#4f9ee0', '#cfe6f6'], [16.5, '#79a9d8', '#f3d3a1'], [18, '#5a5f9a', '#f28f5c'], [19, '#2d335f', '#a2577a'], [21, '#0d1330', '#2b2a4f'], [23, '#0a0f24', '#1b1d3a']];
const skyAt = hr => { let i = 0; while (i < SKY.length - 2 && hr > SKY[i + 1][0]) i++; const a = SKY[i], b = SKY[i + 1], t = clamp((hr - a[0]) / (b[0] - a[0])); return [new THREE.Color(a[1]).lerp(new THREE.Color(b[1]), t), new THREE.Color(a[2]).lerp(new THREE.Color(b[2]), t)]; };

/** skyline with a transparent sky: day (hazy glass towers) or night (dark towers, warm windows) */
function skyline(night) {
  return ctex(2048, 640, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    [[0.3, 0.42, night ? '#272c47' : '#aebdcb', 0.4], [0.45, 0.6, night ? '#171b30' : '#8a9db0', 0.6], [0.62, 0.86, night ? '#0b0e1b' : '#64788c', 1]].forEach(([base, tall, col, near]) => {
      let x = -30;
      while (x < w) {
        const bw = 40 + R() * 120 * near, bh = h * tall * (0.4 + R() * 0.6), y = h - bh * (0.6 + base * 0.4);
        const gr = g.createLinearGradient(x, 0, x + bw, 0); gr.addColorStop(0, col); gr.addColorStop(1, night ? '#05060c' : '#4f6274');
        g.fillStyle = gr; g.fillRect(x, y, bw, h - y);
        if (!night) { g.fillStyle = 'rgba(255,255,255,.10)'; g.fillRect(x, y, bw * 0.3, h - y); }   // sky caught on the glass
        if (!night) { for (let yy = y + 9; yy < h; yy += 9) { g.fillStyle = 'rgba(30,45,60,.10)'; g.fillRect(x, yy, bw, 1.5); } for (let xx = x + 12; xx < x + bw; xx += 12) { g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(xx, y, 1, h - y); } }   // day: floor bands + mullions of a glass tower
        else for (let yy = y + 8; yy < h - 6; yy += 9) for (let xx = x + 5; xx < x + bw - 5; xx += 7) {
          if (R() < 0.3) { g.fillStyle = night ? `rgba(255,${200 + R() * 40 | 0},${130 + R() * 60 | 0},${(0.5 + R() * 0.5).toFixed(2)})` : 'rgba(255,255,255,.4)'; g.fillRect(xx, yy, 3, 4); }
        }
        x += bw + 3 + R() * 14;
      }
    });
    const hz = g.createLinearGradient(0, h * 0.55, 0, h); hz.addColorStop(0, 'rgba(255,255,255,0)'); hz.addColorStop(1, night ? 'rgba(255,160,110,.12)' : 'rgba(235,240,245,.55)');
    g.fillStyle = hz; g.fillRect(0, h * 0.55, w, h * 0.45);
  });
}
const glowTex = () => ctex(128, 128, (g, w) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.18, 'rgba(255,255,255,.75)'); r.addColorStop(0.45, 'rgba(255,255,255,.18)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });

export function createDayRoom3D(host, o = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  const HQ = hqFor(renderer);
  renderer.setPixelRatio(Math.min(HQ ? 2 : 1.5, devicePixelRatio || 1));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
  const cv = renderer.domElement; cv.setAttribute('aria-hidden', 'true'); cv.style.cssText = 'display:block;width:100%;height:100%';
  host.append(cv);
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.22; pm.dispose();
  const G = track(renderer, host, { scene });

  // ---- the room ----
  const W = 5.6, D = 4.6, H = 2.9, BZ = -D / 2;
  const K = mats('light');
  const S = (c, x = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.92, ...x });
  const root = new THREE.Group(); scene.add(root);
  const plaster = S(0xebe2d4, { map: K.wall.map }), plaster2 = S(0xe2d7c6, { map: K.wall.map });
  K.floorT.repeat.set(W / 1.5, D / 1.5); K.floor.roughness = 0.34; K.floor.envMapIntensity = 0.9;   // satin oil-finished oak: catches the light patch
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), K.floor); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; root.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), S(0xf6f2ec)); ceil.rotation.x = Math.PI / 2; ceil.position.y = H; root.add(ceil);
  // back wall with a tall window (x 0.25…2.55, sill 0.12, head 2.62)
  const WX0 = 0.25, WX1 = 2.55, WY0 = 0.12, WY1 = 2.62;
  const sh = new THREE.Shape([new THREE.Vector2(-W / 2, 0), new THREE.Vector2(W / 2, 0), new THREE.Vector2(W / 2, H), new THREE.Vector2(-W / 2, H)]);
  sh.holes.push(new THREE.Path([new THREE.Vector2(WX0, WY0), new THREE.Vector2(WX0, WY1), new THREE.Vector2(WX1, WY1), new THREE.Vector2(WX1, WY0)]));
  const bg = new THREE.ShapeGeometry(sh); const uv = bg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2.2, uv.getY(i) / 2.2);
  const back = new THREE.Mesh(bg, plaster); back.position.z = BZ; back.receiveShadow = true; back.castShadow = true; root.add(back);
  // the wall has a thickness at the opening (reveals) — the sun draws its edge on them
  const rev = (w, h, x, y, ry, rx = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), plaster2); m.position.set(x, y, BZ - 0.1); m.rotation.set(rx, ry, 0); m.receiveShadow = m.castShadow = true; root.add(m); };
  rev(0.2, WY1 - WY0, WX0, (WY0 + WY1) / 2, Math.PI / 2); rev(0.2, WY1 - WY0, WX1, (WY0 + WY1) / 2, -Math.PI / 2);
  rev(WX1 - WX0, 0.2, (WX0 + WX1) / 2, WY1, 0, Math.PI / 2); rev(WX1 - WX0, 0.2, (WX0 + WX1) / 2, WY0, 0, -Math.PI / 2);
  const outerBack = new THREE.Mesh(bg, S(0xd9cfbf)); outerBack.position.z = BZ - 0.2; outerBack.rotation.y = 0; outerBack.castShadow = true; root.add(outerBack);   // outside face (casts the opening's shadow)
  const left = new THREE.Mesh(new THREE.PlaneGeometry(D, H), plaster2); left.rotation.y = Math.PI / 2; left.position.set(-W / 2, H / 2, 0); left.receiveShadow = true; root.add(left);
  const right = new THREE.Mesh(new THREE.PlaneGeometry(D, H), plaster2); right.rotation.y = -Math.PI / 2; right.position.set(W / 2, H / 2, 0); right.receiveShadow = true; root.add(right);
  // skirting + a recessed cove line under the ceiling (warm LED at night)
  const skirtM = S(0xf3eee6, { roughness: 0.5 });
  [[W, -0, BZ + 0.006, 0], [D, -W / 2 + 0.006, 0, Math.PI / 2], [D, W / 2 - 0.006, 0, -Math.PI / 2]].forEach(([len, x, z, ry]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.09, 0.012), skirtM); m.position.set(x, 0.045, z); m.rotation.y = ry; m.receiveShadow = true; root.add(m); });
  const coveM = new THREE.MeshBasicMaterial({ color: 0xffc888, transparent: true, opacity: 0, toneMapped: false });
  [[W, 0, BZ + 0.03, 0], [D, -W / 2 + 0.03, 0, Math.PI / 2]].forEach(([len, x, z, ry]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.05), coveM); m.position.set(x, H - 0.09, z); m.rotation.y = ry; root.add(m); });
  // window: slim bronze frame, a mullion, glass
  const bz = S(0x4b3a2a, { roughness: 0.32, metalness: 0.75 });
  const fb = (w, h, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), bz); m.position.set(x, y, BZ - 0.06); m.castShadow = true; root.add(m); };
  fb(WX1 - WX0, 0.05, (WX0 + WX1) / 2, WY1 - 0.025); fb(WX1 - WX0, 0.05, (WX0 + WX1) / 2, WY0 + 0.025); fb(0.05, WY1 - WY0, WX0 + 0.025, (WY0 + WY1) / 2); fb(0.05, WY1 - WY0, WX1 - 0.025, (WY0 + WY1) / 2);
  fb(0.045, WY1 - WY0, (WX0 + WX1) / 2, (WY0 + WY1) / 2); fb(WX1 - WX0, 0.035, (WX0 + WX1) / 2, 2.05);   // mullion + transom: their shadows cross the floor
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(WX1 - WX0, WY1 - WY0), new THREE.MeshPhysicalMaterial({ color: 0xdfeefa, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.1, depthWrite: false, envMapIntensity: 1.4 }));
  glass.position.set((WX0 + WX1) / 2, (WY0 + WY1) / 2, BZ - 0.07); root.add(glass);
  // sheer curtains each side of the window — they glow when the sun is behind them
  const sheer = new THREE.MeshStandardMaterial({ color: 0xffffff, map: K.curtain.map, roughness: 1, transparent: true, opacity: 0.72, side: THREE.DoubleSide, emissive: 0xfff2dc, emissiveIntensity: 0 });
  const curt = [];
  [WX0 - 0.28, WX1 + 0.22].forEach((x, i) => { const c = F.curtain({ ...K, curtain: sheer }, i ? 0.55 : 0.62, H - 0.12); c.position.set(x, 0.02, BZ + 0.12); root.add(c); curt.push(c); });

  // ---- furniture ----
  const sofaM = new THREE.MeshStandardMaterial({ color: 0xffffff, map: TEX.fabric('#d6cab6'), roughness: 0.97, sheen: 0 });   // warm bouclé
  const leather = new THREE.MeshStandardMaterial({ color: 0x8a5634, roughness: 0.48, metalness: 0.02 });   // cognac leather lounge chair
  const KK = { ...K, sofa: sofaM, cushion: new THREE.MeshStandardMaterial({ color: 0xffffff, map: TEX.fabric('#b9825f'), roughness: 0.95 }) };
  const sofa = F.sofa(KK, 2.5); sofa.rotation.y = Math.PI / 2; sofa.position.set(-W / 2 + 0.56, 0, -0.35); root.add(sofa);
  const rug = F.rug(K, 3.0, 2.2); rug.position.set(-0.95, 0, -0.35); root.add(rug);
  const coffee = F.coffee(K); coffee.position.set(-1.15, 0, -0.35); coffee.rotation.y = Math.PI / 2; root.add(coffee);
  const arm = F.armchair({ ...KK, sofa: leather, cushion: leather }); arm.position.set(0.35, 0, 0.55); arm.rotation.y = -Math.PI / 2 - 0.35; root.add(arm);
  const lamp = F.lamp(K); lamp.position.set(-W / 2 + 0.38, 0, -1.85); root.add(lamp);
  const plant = F.plant(K, 1.25); plant.position.set(W / 2 - 0.42, 0, BZ + 0.5); root.add(plant);
  const plant2 = F.plant(K, 0.8); plant2.position.set(-W / 2 + 0.4, 0, 1.25); root.add(plant2);
  const side = F.side(K); side.position.set(-W / 2 + 0.33, 0, 1.05); root.add(side);
  const art = F.art(K, 28); art.rotation.y = Math.PI / 2; art.position.set(-W / 2 + 0.03, 1.62, -0.35); art.scale.set(1.5, 1.5, 1); root.add(art);
  const slats = new THREE.Group(); const slatM = S(0x8f6a49, { roughness: 0.5 });
  for (let i = 0; i < 22; i++) slats.add(rbox(0.05, H - 0.2, 0.035, 0.008, slatM, -2.45 + i * 0.075, (H - 0.2) / 2 + 0.1, BZ + 0.02));
  root.add(slats);
  [sofa, rug, coffee, arm, lamp, plant, plant2, side, art, slats, ...curt].forEach(g => g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }));
  mergeStatic(root, [sofa, coffee, arm, side, slats]);
  // the wall unit — FUJIVA body (a product scene, not a job scene)
  const U = buildPremiumIndoor(materialSet('studio'), { logo: true });
  U.root.traverse(m => { if (m.isMesh) m.castShadow = true; });
  const unitG = new THREE.Group(); unitG.add(U.root); unitG.position.set(-1.05, 2.4, BZ + 0.13); root.add(unitG);

  // ---- outside: sky, sun disc, city ----
  const skyC = document.createElement('canvas'); skyC.width = 8; skyC.height = 256; const skyG = skyC.getContext('2d');
  const skyT = new THREE.CanvasTexture(skyC); skyT.colorSpace = THREE.SRGBColorSpace;
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(46, 22), new THREE.MeshBasicMaterial({ map: skyT, toneMapped: false })); sky.position.set(1.4, 7.5, BZ - 16); scene.add(sky);
  const cityD = new THREE.Mesh(new THREE.PlaneGeometry(30, 9.4), new THREE.MeshBasicMaterial({ map: skyline(false), transparent: true, toneMapped: false, depthWrite: false }));
  const cityN = new THREE.Mesh(new THREE.PlaneGeometry(30, 9.4), new THREE.MeshBasicMaterial({ map: skyline(true), transparent: true, opacity: 0, toneMapped: false, depthWrite: false }));
  [cityD, cityN].forEach((m, i) => { m.position.set(1.4, 1.9 - 0.6, BZ - 11 + i * 0.01); m.renderOrder = 1 + i; scene.add(m); });
  const GT = glowTex();
  const sunS = new THREE.Sprite(new THREE.SpriteMaterial({ map: GT, color: 0xfff1d6, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); sunS.scale.set(4.6, 4.6, 1); scene.add(sunS);
  const moonS = new THREE.Sprite(new THREE.SpriteMaterial({ map: GT, color: 0xdfe7ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); moonS.scale.set(1.3, 1.3, 1); moonS.position.set(2.6, 6.4, BZ - 15.5); scene.add(moonS);

  // ---- light ----
  const hemi = new THREE.HemisphereLight(0xcfe4ff, 0x8a6e52, 0.5); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1dc, 3); sun.castShadow = true; sun.shadow.mapSize.set(HQ ? 2048 : 1024, HQ ? 2048 : 1024);
  Object.assign(sun.shadow.camera, { left: -4.5, right: 4.5, top: 4.5, bottom: -4.5, near: 0.5, far: 30 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 3;
  sun.target.position.set(0.4, 0, -0.4); scene.add(sun, sun.target);
  const bounce = new THREE.PointLight(0xffe8cc, 0, 7, 1.6); bounce.position.set(0.4, 1.9, 0.4); scene.add(bounce);   // light thrown back up from the sunlit floor
  const skyFill = new THREE.PointLight(0xbcd8ff, 0, 6, 1.8); skyFill.position.set(1.4, 1.6, BZ + 0.6); scene.add(skyFill);   // daylight through the glass
  const lampL = new THREE.PointLight(0xffb86e, 0, 5.5, 1.7); lampL.position.set(-W / 2 + 0.38, 1.5, -1.85); scene.add(lampL);
  const coveL = new THREE.PointLight(0xffc888, 0, 6, 1.8); coveL.position.set(-1.0, H - 0.25, BZ + 0.5); scene.add(coveL);
  const shadeM = []; lamp.traverse(m => { if (m.isMesh && m.material && m.material.emissive && m.material.emissive.getHex() !== 0) shadeM.push(m.material); });

  // ---- the light shaft from the window, and dust drifting in it ----
  const shaftGeo = new THREE.BufferGeometry(); const shaftPos = new Float32Array(4 * 6 * 3), shaftUv = new Float32Array(4 * 6 * 2);
  shaftGeo.setAttribute('position', new THREE.BufferAttribute(shaftPos, 3)); shaftGeo.setAttribute('uv', new THREE.BufferAttribute(shaftUv, 2));
  const shaftM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uA: { value: 0 }, uC: { value: new THREE.Color(0xffe2b8) }, uT: { value: 0 } },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'varying vec2 vU; uniform float uA, uT; uniform vec3 uC; void main(){ float along = vU.y; float fade = smoothstep(0.0,0.12,along)*(1.0-smoothstep(0.55,1.0,along)); float streak = 0.75 + 0.25*sin(vU.x*38.0 + uT*0.25) * sin(vU.x*11.0 - uT*0.13); gl_FragColor = vec4(uC*streak, uA*fade); }' });
  const shaft = new THREE.Mesh(shaftGeo, shaftM); shaft.frustumCulled = false; shaft.renderOrder = 5; scene.add(shaft);
  const ND = 260, dP = new Float32Array(ND * 3), dS = Array.from({ length: ND }, () => [R(), R(), R(), R()]);
  const dGeo = new THREE.BufferGeometry(); dGeo.setAttribute('position', new THREE.BufferAttribute(dP, 3));
  const dust = new THREE.Points(dGeo, new THREE.PointsMaterial({ map: GT, color: 0xfff0d2, size: 0.02, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); dust.frustumCulled = false; scene.add(dust);
  const corners = [[WX0, WY0], [WX1, WY0], [WX1, WY1], [WX0, WY1]].map(([x, y]) => new THREE.Vector3(x, y, BZ - 0.1));
  const ray = new THREE.Vector3(); let shaftLen = 0;
  function buildShaft() {
    // the sun's rays enter through the opening and run until they hit the floor (or 6 m)
    shaftLen = ray.y < -0.02 ? Math.min(6, (WY1 * 0.6) / -ray.y) : 6;
    const far = corners.map(c => c.clone().addScaledVector(ray, Math.min(6, c.y / Math.max(0.02, -ray.y))));
    let k = 0, u = 0;
    for (let s = 0; s < 4; s++) {
      const a = corners[s], b = corners[(s + 1) % 4], a2 = far[s], b2 = far[(s + 1) % 4];
      [[a, 0, 0], [b, 1, 0], [b2, 1, 1], [a, 0, 0], [b2, 1, 1], [a2, 0, 1]].forEach(([p, ux, uy]) => { shaftPos[k++] = p.x; shaftPos[k++] = p.y; shaftPos[k++] = p.z; shaftUv[u++] = (s + ux) / 4; shaftUv[u++] = uy; });
    }
    shaftGeo.attributes.position.needsUpdate = shaftGeo.attributes.uv.needsUpdate = true; shaftGeo.computeBoundingSphere();
    shaft.userData.far = far;
  }

  // ---- the unit's cool air ----
  const wisps = createWisps(scene, { max: 1600, additive: false, minPx: 1.1 });
  scene.updateMatrixWorld(true);
  const vent = new THREE.Vector3(0, -0.11, 0.1).applyMatrix4(unitG.matrixWorld);
  const ventGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: GT, color: 0xa8e6ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); ventGlow.scale.set(1.2, 0.36, 1); ventGlow.position.copy(vent).add(new THREE.Vector3(0, -0.05, 0.12)); scene.add(ventGlow);

  // ---- camera ----
  const cam = new THREE.PerspectiveCamera(44, 1, 0.05, 80);
  const base = new THREE.Vector3(1.15, 1.42, 3.55), look = new THREE.Vector3(-0.25, 1.28, -1.6);
  let px = 0, py = 0, tx = 0, ty = 0;
  if (!RM()) host.addEventListener('pointermove', e => { const r = host.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width - 0.5; ty = (e.clientY - r.top) / r.height - 0.5; });
  host.addEventListener('pointerleave', () => { tx = 0; ty = 0; });

  // ---- state ----
  let st = { hr: 15, on: true, dirt: 0.05 }, day = 1, night = 0, lastHr = -1, Wd = 1, Hd = 1, sw = 0, shh = 0, spr = 0, t = 0, last = performance.now(), raf = 0, visible = true, dirty = true;
  const size = () => { const r = host.getBoundingClientRect(); Wd = Math.max(1, Math.round(r.width)); Hd = Math.max(1, Math.round(r.height)); if (Wd === sw && Hd === shh && renderer.getPixelRatio() === spr) return; sw = Wd; shh = Hd; spr = renderer.getPixelRatio(); renderer.setSize(Wd, Hd, false); cam.aspect = Wd / Hd; cam.fov = Wd / Hd < 1 ? 62 : 44; cam.updateProjectionMatrix(); dirty = true; };
  size(); const ro = new ResizeObserver(size); ro.observe(host);
  const io = new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); if (visible) loop(); }, { rootMargin: '10% 0px' }); io.observe(host);

  function applyHour() {
    const hr = st.hr; lastHr = hr;
    day = clamp(Math.sin(Math.PI * (hr - 6) / 12.5)); night = 1 - clamp((hr < 12 ? hr - 5.5 : 19.5 - hr) / 1.5);
    const [zen, hor] = skyAt(hr);
    const gr = skyG.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0.45, '#' + zen.getHexString()); gr.addColorStop(0.9, '#' + hor.getHexString()); gr.addColorStop(1, '#' + hor.clone().lerp(new THREE.Color(0xffffff), 0.15).getHexString());
    skyG.fillStyle = gr; skyG.fillRect(0, 0, 8, 256); skyT.needsUpdate = true;
    // sun path: rises behind the right of the window, sets to the left; low sun = long warm light deep into the room
    // sun by azimuth / elevation: morning from the left, evening from the right; never below ~14° while up, so its light lands
    // on the floor (a long golden patch reaching the sofa in the evening, a short bright one under the window at noon)
    const f = clamp((hr - 6) / 12.5), az = lerp(-0.85, 0.85, f), el = THREE.MathUtils.degToRad(14 + 50 * day);
    const sp = sun.target.position.clone().add(new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).multiplyScalar(14));
    sun.position.copy(sp); ray.copy(sun.target.position).sub(sp).normalize();
    const warmC = new THREE.Color(0xffa45c).lerp(new THREE.Color(0xfff3e2), clamp(day * 1.4 - 0.2));
    sun.color.copy(warmC); sun.intensity = 5.2 * clamp(day * 1.6); sun.visible = day > 0.01;
    // sun disc on the sky plane, along the line camera → sun
    const toSun = sp.clone().sub(base).normalize(), k = (sky.position.z + 0.1 - base.z) / toSun.z; sunS.position.copy(base).addScaledVector(toSun, k);
    sunS.material.color.copy(warmC); sunS.material.opacity = day > 0.02 ? 0.95 : 0; sunS.scale.setScalar(lerp(6.5, 4.2, day));
    moonS.material.opacity = night * 0.9;
    cityN.material.opacity = clamp(night * 1.2); cityD.material.opacity = 1 - clamp(night * 1.1);
    cityD.material.color.copy(new THREE.Color(0xffffff).lerp(hor, 0.25));
    hemi.color.copy(zen).lerp(new THREE.Color(0xffffff), 0.45); hemi.intensity = lerp(0.12, 0.26, day);
    skyFill.color.copy(hor).lerp(new THREE.Color(0xbcd8ff), 0.5); skyFill.intensity = 0.8 * day + 0.15;
    bounce.color.copy(warmC); bounce.intensity = 0.7 * clamp(day * 1.3);
    lampL.intensity = 5.5 * night; coveL.intensity = 2.6 * night; coveM.opacity = 0.95 * night; shadeM.forEach(m => { m.emissiveIntensity = 0.25 + 1.6 * night; });
    sheer.emissiveIntensity = 0.12 * day + 0.05 * clamp(1 - Math.abs(hr - 17.5) / 1.5);
    renderer.toneMappingExposure = lerp(1.2, 1.0, day);
    shaftM.uniforms.uC.value.copy(warmC); shaftM.uniforms.uA.value = 0.17 * clamp(day * 1.5) * (hr > 16 ? 1.3 : 1);
    dust.material.color.copy(warmC); dust.material.opacity = 0.6 * clamp(day * 1.5);
    buildShaft();
    renderer.shadowMap.needsUpdate = true; dirty = true;
  }
  const tmp = new THREE.Vector3();
  function frame(dt) {
    t += dt;
    px += (tx - px) * Math.min(1, dt * 2.5); py += (ty - py) * Math.min(1, dt * 2.5);
    const br = RM() ? 0 : 1;
    cam.position.set(base.x - px * 0.55 + Math.sin(t * 0.19) * 0.03 * br, base.y + py * 0.18 + Math.sin(t * 0.23) * 0.015 * br, base.z + Math.sin(t * 0.11) * 0.04 * br);
    cam.lookAt(look.x - px * 0.2, look.y - py * 0.08, look.z);
    shaftM.uniforms.uT.value = t;
    // dust: slow Brownian drift inside the shaft
    if (dust.material.opacity > 0.01 && shaft.userData.far) {
      const far = shaft.userData.far;
      for (let i = 0; i < ND; i++) {
        const [a, b, c, s] = dS[i], u = (a + Math.sin(t * 0.05 + s * 9) * 0.04 + 1) % 1, v = (b + t * 0.006 * (0.5 + s) + 1) % 1, w = clamp(0.18 + c * 0.7 + Math.sin(t * 0.07 + s * 5) * 0.03, 0.16, 0.9);   // inside the room only (dots in front of the bright glass read as snow)
        const p0 = tmp.copy(corners[0]).lerp(corners[1], u).lerp(tmp.clone().copy(corners[3]).lerp(corners[2], u), v);
        const p1 = far[0].clone().lerp(far[1], u).lerp(far[3].clone().lerp(far[2], u), v);
        p0.lerp(p1, w); dP[i * 3] = p0.x; dP[i * 3 + 1] = p0.y; dP[i * 3 + 2] = p0.z;
      }
      dGeo.attributes.position.needsUpdate = true;
    }
    // cool air: fainter and shorter when the coil is fouled; none when off
    const air = st.on ? effects(st.dirt).air : 0;
    ventGlow.material.opacity = 0.32 * air;
    wisps.begin();
    if (air > 0.01) {
      const L = 2.7 * air, n = Math.round(34 * air);
      for (let i = 0; i < n; i++) {
        const sd = (i * 0.6180339) % 1, xo = (sd - 0.5) * 0.72, ph = (t * (0.3 + 0.1 * air) + sd * 3.1) % 1;
        let qx = vent.x + xo, qy = vent.y, qz = vent.z;
        for (let s = 1; s <= 11; s++) {
          const f = s / 11, x = vent.x + xo * (1 + f * 0.9) + Math.sin(t * 0.8 + sd * 9 + f * 4) * 0.05 * f, y = vent.y - 0.16 * f - 1.0 * f * f * (L / 2.7), z = vent.z + L * f;
          const a = 0.2 * air * Math.exp(-Math.pow((f - ph) * 3.2, 2)) * (1 - f * 0.7);
          if (a > 0.01) wisps.seg(qx, qy, qz, x, y, z, 0.8, 0.92, 1, a, a * 0.85, 0.02 + 0.024 * f);
          qx = x; qy = y; qz = z;
        }
      }
    }
    wisps.end();
    renderer.render(scene, cam); dirty = false;
    if (o.onFrame) o.onFrame();
  }
  function loop() {
    cancelAnimationFrame(raf);
    const step = now => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!visible) return;
      if (st.hr !== lastHr) applyHour();
      if (RM()) { if (dirty) frame(0); raf = requestAnimationFrame(step); return; }
      frame(dt); raf = requestAnimationFrame(step);
    };
    last = performance.now(); raf = requestAnimationFrame(step);
  }
  applyHour(); loop();
  const proj = new THREE.Vector3();
  const anchors = { unit: vent.clone().add(new THREE.Vector3(0.55, 0.22, 0)), win: new THREE.Vector3(1.4, 1.95, BZ - 0.2), room: new THREE.Vector3(-1.2, 1.2, -0.35) };
  return {
    set(s) { st = { ...st, ...s }; dirty = true; },
    /** screen position (px within the host) of an anchor: unit · win · room */
    project(k) { proj.copy(anchors[k]).project(cam); return { x: (proj.x * 0.5 + 0.5) * Wd, y: (-proj.y * 0.5 + 0.5) * Hd, vis: proj.z < 1 }; },
    ready: () => cv.style.opacity !== '0',
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); G.release(); renderer.dispose(); cv.remove(); },
  };
}
