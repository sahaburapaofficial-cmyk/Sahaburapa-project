// SBP AirCare — "ลองวางบนผนังบ้านคุณ" (design C · Virtual Showroom) — Rev.35 (owner 6 ต.ค. 2569: "A B C เป็นการพัฒนาจากต้นฉบับเดิม
// ให้แตกออกมาให้ดีกว่าเดิมที่สุด เพิ่มลูกเล่นต่าง ๆ")
// C is the showroom: here the visitor brings the showroom home. A photo of their own wall (or a sample wall) with the indoor unit
// drawn to scale on it — drag it into place, pick the type and size, show the cool air, see the free space it needs around it.
//   · sizes come from roomfit.unitDims (typical size per type / BTU — the same numbers the 3D room fit uses) and the clearances
//     from FIT_RULES (general guidance, not the maker's figures — said on the page, rule 17)
//   · the scale is the visitor's own estimate of how wide the wall in the photo is — an illustration, not a measurement
//   · the photo never leaves the browser (object URL, not stored, not sent)
import { h, btuFmt } from './sbp-core.js';
import { unitDims, FIT_RULES } from './roomfit.js';

const TYPES = [['wall', 'ติดผนัง'], ['ceiling', 'แขวนใต้ฝ้า'], ['floor', 'ตู้ตั้งพื้น']];
const BTUS = { wall: [9000, 12000, 18000, 24000], ceiling: [18000, 24000, 36000, 48000], floor: [36000, 48000, 60000] };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// front view of a plain (brandless) indoor unit, drawn in a w × h box — illustration
function unitSvg(type) {
  if (type === 'floor') return `<svg viewBox="0 0 100 340" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="wfB" x1="0" x2="1"><stop offset="0" stop-color="#e9edf2"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#dfe4ea"/></linearGradient></defs><rect x="1" y="1" width="98" height="338" rx="8" fill="url(#wfB)" stroke="#b9c2cc"/><rect x="12" y="22" width="76" height="120" rx="4" fill="#d9e0e7"/>${Array.from({ length: 12 }, (_, i) => `<line x1="16" x2="84" y1="${30 + i * 9}" y2="${30 + i * 9}" stroke="#aeb8c3" stroke-width="2"/>`).join('')}<rect x="36" y="160" width="28" height="14" rx="3" fill="#24303c"/><text x="50" y="171" font-size="10" text-anchor="middle" fill="#9fe0ff" font-family="monospace">25</text>${Array.from({ length: 10 }, (_, i) => `<line x1="14" x2="86" y1="${230 + i * 9}" y2="${230 + i * 9}" stroke="#c4ccd5" stroke-width="2"/>`).join('')}</svg>`;
  if (type === 'ceiling') return `<svg viewBox="0 0 400 94" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="wfC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#dfe5eb"/></linearGradient></defs><rect x="1" y="1" width="398" height="92" rx="10" fill="url(#wfC)" stroke="#b9c2cc"/><rect x="24" y="58" width="352" height="24" rx="6" fill="#cfd7df"/>${Array.from({ length: 22 }, (_, i) => `<line x1="${34 + i * 15.6}" x2="${34 + i * 15.6}" y1="61" y2="79" stroke="#9eaab6" stroke-width="2"/>`).join('')}<rect x="300" y="18" width="40" height="16" rx="3" fill="#24303c"/><text x="320" y="30" font-size="11" text-anchor="middle" fill="#9fe0ff" font-family="monospace">25</text></svg>`;
  return `<svg viewBox="0 0 400 136" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="wfW" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".75" stop-color="#f1f4f7"/><stop offset="1" stop-color="#d5dce3"/></linearGradient></defs><path d="M14 2h372a12 12 0 0 1 12 12v88q0 30-30 30H32q-30 0-30-30V14A12 12 0 0 1 14 2z" fill="url(#wfW)" stroke="#b9c2cc"/><rect x="40" y="10" width="320" height="12" rx="6" fill="#3a4652" opacity=".55"/><text x="200" y="66" font-size="22" text-anchor="middle" fill="#cfd7df" font-family="monospace">26</text><rect x="22" y="112" width="356" height="14" rx="7" fill="#c4ccd5"/><line x1="40" x2="360" y1="119" y2="119" stroke="#8e9aa6" stroke-width="2"/></svg>`;
}

export function mountWallFit(root, { onSize = null } = {}) {
  const S = { type: 'wall', btu: 12000, wallW: 3.6, x: 0.5, y: 0.22, air: true, photo: null };
  const stage = h('div', { class: 'wf-stage', 'data-photo': 'no' });
  const bg = h('img', { class: 'wf-bg', alt: 'รูปผนังที่คุณเลือก', hidden: true });
  const sample = h('div', { class: 'wf-sample', 'aria-hidden': 'true' }, h('i', { class: 'wf-win' }), h('i', { class: 'wf-skirt' }), h('i', { class: 'wf-plant' }));
  const box = h('div', { class: 'wf-clear', 'aria-hidden': 'true' });
  const air = h('div', { class: 'wf-air', 'aria-hidden': 'true' }, ...Array.from({ length: 7 }, (_, i) => h('i', { style: `--i:${i}` })));
  const unit = h('div', { class: 'wf-unit', tabindex: '0', role: 'img' });
  const tag = h('span', { class: 'wf-tag' });
  stage.append(bg, sample, box, air, unit, tag);
  const info = h('p', { class: 'wf-info', 'aria-live': 'polite' });
  const file = h('input', { type: 'file', accept: 'image/*', class: 'wf-file', id: 'wf-file', onchange: e => { const f = e.target.files && e.target.files[0]; if (f) usePhoto(f); } });
  const typeRow = h('div', { class: 'wf-seg', role: 'group', 'aria-label': 'ประเภทแอร์' });
  const btuRow = h('div', { class: 'wf-seg', role: 'group', 'aria-label': 'ขนาด BTU' });
  const wallIn = h('input', { type: 'range', min: '1.5', max: '8', step: '0.1', value: String(S.wallW), 'aria-label': 'ความกว้างผนังในภาพ (เมตร)', oninput: e => { S.wallW = +e.target.value; draw(); } });
  const wallOut = h('b', {});
  const airBtn = h('button', { type: 'button', class: 's-btn ghost', 'aria-pressed': 'true', onclick: () => { S.air = !S.air; draw(); } }, 'แสดงลมเย็น');
  root.append(h('div', { class: 'wf' },
    h('div', { class: 'wf-main' }, stage, info),
    h('div', { class: 'wf-side' },
      h('div', { class: 'wf-step' }, h('span', {}, '1'), h('div', {}, h('b', {}, 'รูปผนังของคุณ'), h('p', {}, 'ถ่ายตรงหน้าผนัง ให้เห็นผนังทั้งด้าน · รูปอยู่ในเครื่องนี้เท่านั้น ไม่ถูกส่งหรือบันทึก'),
        h('label', { class: 's-btn primary wf-up', for: 'wf-file' }, 'เลือกรูปผนัง'), file,
        h('button', { type: 'button', class: 'wf-link', onclick: () => usePhoto(null) }, 'ใช้ผนังตัวอย่าง'))),
      h('div', { class: 'wf-step' }, h('span', {}, '2'), h('div', {}, h('b', {}, 'ผนังในภาพกว้างประมาณ'), h('div', { class: 'wf-range' }, wallIn, wallOut), h('p', {}, 'ใช้กำหนดสัดส่วน — วัดหรือกะจากประตู (กว้างราว 0.8 ม.) หรือเตียง (1.5–1.8 ม.)'))),
      h('div', { class: 'wf-step' }, h('span', {}, '3'), h('div', {}, h('b', {}, 'ประเภทและขนาด'), typeRow, btuRow)),
      h('div', { class: 'wf-step' }, h('span', {}, '4'), h('div', {}, h('b', {}, 'ลากเครื่องไปวาง'), h('p', {}, 'ลากด้วยนิ้ว/เมาส์ หรือกดเครื่องแล้วใช้ปุ่มลูกศร · กรอบเส้นประ = ที่ว่างรอบเครื่องที่ควรเว้น'), airBtn)),
      onSize ? h('button', { type: 'button', class: 's-btn primary wf-go', onclick: () => onSize(S.type, S.btu) }, 'ดูรุ่นขนาดนี้ในแคตตาล็อก') : null),
  ));
  root.append(h('p', { class: 's-note' }, 'ภาพประกอบเพื่อกะสัดส่วน ไม่ใช่การวัดจริง · ขนาดเครื่องเป็นขนาดทั่วไปของประเภทและ BTU (รุ่นจริงต่างกันได้ ดูขนาดในสเปกของรุ่น) · ระยะเว้นรอบเครื่องเป็นค่าแนะนำทั่วไป ไม่ใช่ค่าจากผู้ผลิต — ทีมยืนยันตำแหน่งจริงเมื่อสำรวจหน้างาน'));

  let url = null;
  function usePhoto(f) {
    if (url) { URL.revokeObjectURL(url); url = null; }
    if (f) { url = URL.createObjectURL(f); bg.src = url; bg.hidden = false; sample.hidden = true; stage.dataset.photo = 'yes'; bg.onload = () => draw(); }
    else { bg.hidden = true; bg.removeAttribute('src'); sample.hidden = false; stage.dataset.photo = 'no'; file.value = ''; draw(); }
  }
  const seg = (row, list, cur, on) => { row.innerHTML = ''; list.forEach(([v, t]) => row.append(h('button', { type: 'button', 'aria-pressed': String(v === cur), onclick: () => on(v) }, t))); };
  function controls() {   // buttons rebuilt only when type / size change (not on every drag frame)
    seg(typeRow, TYPES, S.type, v => { S.type = v; if (!BTUS[v].includes(S.btu)) S.btu = BTUS[v][1] || BTUS[v][0]; S.y = v === 'ceiling' ? 0.02 : v === 'wall' ? 0.22 : 1; controls(); draw(); });
    seg(btuRow, BTUS[S.type].map(b => [b, btuFmt(b)]), S.btu, v => { S.btu = v; controls(); draw(); });
  }
  function draw() {
    const W = stage.clientWidth || 600, H = stage.clientHeight || 400, ppm = W / S.wallW;
    const d = unitDims(S.type, S.btu), R = FIT_RULES[S.type];
    const uw = d.w * ppm, uh = d.h * ppm;
    S.x = clamp(S.x, 0, 1); S.y = clamp(S.y, 0, 1);
    const cx = S.x * W, top = S.type === 'floor' ? H - uh - 6 : S.y * (H - uh);
    if (S.type === 'floor') S.y = 1;
    Object.assign(unit.style, { width: uw + 'px', height: uh + 'px', left: (cx - uw / 2) + 'px', top: top + 'px' });
    if (unit.dataset.t !== S.type) { unit.innerHTML = unitSvg(S.type); unit.dataset.t = S.type; }
    const side = (R.side || 0.15) * ppm, ctop = (R.top || R.gap || 0.1) * ppm;
    Object.assign(box.style, { width: (uw + side * 2) + 'px', height: (uh + ctop + (S.type === 'floor' ? 0 : 0.05 * ppm)) + 'px', left: (cx - uw / 2 - side) + 'px', top: (top - ctop) + 'px' });
    Object.assign(air.style, { width: uw * (S.type === 'floor' ? 2.2 : 1.1) + 'px', left: (cx - uw * (S.type === 'floor' ? 1.1 : 0.55)) + 'px', top: (S.type === 'floor' ? top + uh * 0.08 : top + uh * 0.82) + 'px', height: Math.min(H, 1.6 * ppm) + 'px' });
    air.dataset.t = S.type; air.hidden = !S.air;
    tag.textContent = `${Math.round(d.w * 100)} × ${Math.round(d.h * 100)} ซม.`;
    Object.assign(tag.style, { left: cx + 'px', top: Math.max(4, top - ctop - 26) + 'px' });
    unit.setAttribute('aria-label', `แอร์${TYPES.find(t => t[0] === S.type)[1]} ${btuFmt(S.btu)} กว้าง ${Math.round(d.w * 100)} ซม. สูง ${Math.round(d.h * 100)} ซม. — ลากหรือใช้ปุ่มลูกศรเพื่อย้าย`);
    wallOut.textContent = `${S.wallW.toFixed(1)} ม.`;
    airBtn.setAttribute('aria-pressed', String(S.air));
    const share = d.w / S.wallW;
    info.textContent = `${TYPES.find(t => t[0] === S.type)[1]} ${btuFmt(S.btu)} · ตัวเครื่องราว ${Math.round(d.w * 100)} × ${Math.round(d.h * 100)} ซม. = ${Math.round(share * 100)}% ของความกว้างผนัง` +
      (S.type === 'wall' ? ` · เว้นเหนือเครื่อง ${Math.round(R.top * 100)} ซม. ข้างละ ${Math.round(R.side * 100)} ซม. · ใต้เครื่องสูงจากพื้น ${R.bestBottom[0]}–${R.bestBottom[1]} ม. กำลังดี` : S.type === 'ceiling' ? ` · ชิดใต้ฝ้า ข้างละ ${Math.round(R.side * 100)} ซม. · ใต้เครื่องสูงจากพื้นอย่างน้อย ${R.minBottom} ม.` : ` · ข้างละ ${Math.round(R.side * 100)} ซม. · เหนือเครื่อง ${Math.round(R.top * 100)} ซม.`);
  }
  // drag
  let drag = null;
  unit.addEventListener('pointerdown', e => { const r = stage.getBoundingClientRect(), u = unit.getBoundingClientRect(); drag = { dx: e.clientX - (u.left + u.width / 2), dy: e.clientY - u.top, r }; unit.setPointerCapture(e.pointerId); unit.classList.add('drag'); e.preventDefault(); });
  unit.addEventListener('pointermove', e => {
    if (!drag) return; const { r } = drag, uw = unit.offsetWidth, uh = unit.offsetHeight;
    S.x = clamp((e.clientX - drag.dx - r.left) / r.width, uw / 2 / r.width, 1 - uw / 2 / r.width);
    if (S.type !== 'floor') S.y = clamp((e.clientY - drag.dy - r.top) / Math.max(1, r.height - uh), 0, 1);
    draw();
  });
  const end = () => { drag = null; unit.classList.remove('drag'); };
  unit.addEventListener('pointerup', end); unit.addEventListener('pointercancel', end);
  unit.addEventListener('keydown', e => {
    const k = { ArrowLeft: [-0.02, 0], ArrowRight: [0.02, 0], ArrowUp: [0, -0.03], ArrowDown: [0, 0.03] }[e.key];
    if (!k) return; e.preventDefault(); S.x += k[0]; if (S.type !== 'floor') S.y += k[1]; draw();
  });
  if (typeof ResizeObserver === 'function') new ResizeObserver(() => draw()).observe(stage);
  controls(); draw();
  return { state: () => S, draw };
}
