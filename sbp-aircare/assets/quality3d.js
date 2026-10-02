// SBP AirCare — sharper 3D on capable computers — Rev.12 (owner 2 ต.ค. 2569: "ปรับภาพ 3 มิติให้สมจริงขึ้น" /
// earlier: "ไม่เอาให้คุณภาพต่ำลง … ลื่นขึ้น"). On a computer with a fine pointer, a wide screen, ≥ 4 cores, ≥ 4 GB (when
// reported) and a hardware GPU, every tracked scene gets crisper shadow maps (1024 → 2048: contact shadows under the unit,
// the crew and furniture lose their blur) and full anisotropic filtering on its textures (printed pipe insulation, floor
// boards, labels stay sharp at grazing angles). Phones, tablets and software GPUs keep exactly the current look and speed.
// ?hq=1 / ?hq=0 force it for testing.
// Tried and rejected (Rev.12): screen-space ambient occlusion (GTAOPass) — it shifted the colour of the additive airflow
// wisps (blending in a linear half-float target) and added dark halos on end caps, so it was not a clear improvement.
// Wired in gl-pool.track(): the first scene a renderer draws is upgraded before its frames.

const q = (() => { try { return new URLSearchParams(location.search).get('hq'); } catch (e) { return null; } })();
export const HQ_WANTED = q === '1' ? true : q === '0' ? false : (() => {
  try {
    if (matchMedia('(pointer: coarse)').matches || innerWidth < 1000) return false;
    if ((navigator.hardwareConcurrency || 4) < 4) return false;
    if (navigator.deviceMemory && navigator.deviceMemory < 4) return false;
    return true;
  } catch (e) { return false; }
})();

/** software / emulated GL (SwiftShader, llvmpipe …) — never worth the extra work */
export function softwareGL(gl) {
  try { const x = gl.getExtension('WEBGL_debug_renderer_info'); const r = x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : ''; return /swiftshader|llvmpipe|software|basic render/i.test(r || ''); } catch (e) { return false; }
}

const TEX_KEYS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'bumpMap', 'alphaMap', 'emissiveMap', 'aoMap'];

/** enhance(renderer) → { prepare(scene) } or null. prepare() upgrades the scene (a traverse at most every 3 s, no extra render passes). */
export function enhance(renderer) {
  const gl = renderer.getContext();
  if (!HQ_WANTED || (q !== '1' && softwareGL(gl))) return null;
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1);
  const seenTex = new WeakSet();
  let first = null, last = -1e9;   // re-checked every 3 s: scenes add parts / swap rooms after their first frame
  return {
    prepare(scene) {
      if (!scene || !scene.isScene) return;
      if (!first) first = scene;
      const now = performance.now();
      if (scene !== first || now - last < 3000) return;
      last = now;
      scene.traverse(o => {
        if (o.isLight && o.castShadow && o.shadow && o.shadow.mapSize.x < 2048) { o.shadow.mapSize.set(2048, 2048); if (o.shadow.map) { o.shadow.map.dispose(); o.shadow.map = null; } }
        if (aniso > 1 && o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => TEX_KEYS.forEach(k => {
          const t = m[k]; if (t && !seenTex.has(t) && t.anisotropy < aniso) { seenTex.add(t); t.anisotropy = aniso; t.needsUpdate = true; }
        }));
      });
    },
  };
}
