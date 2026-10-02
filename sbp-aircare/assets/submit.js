// SBP AirCare — send requests to the team — Rev.10 (owner 2 ต.ค. 2569: "ทำเป็นเว็บพร้อมใช้งาน")
// Quote requests, contact-form requests and beta feedback POST to a Google Apps Script web app that appends a row to the
// company's Google Sheet and e-mails the sales team (backend/apps-script/Code.gs, set-up steps in backend/README.md).
// ENDPOINT is empty until the owner deploys that script → every form keeps the honest hand-off box (copy / LINE / e-mail).
// Inside Claude Artifacts the page cannot reach other domains (CSP), so sending is skipped there and the hand-off box is used.
// The browser never decides prices: totals travel as "ยอดประมาณการ" and the team confirms them in the formal quotation.
import { h } from './sbp-core.js';
import { handoffBox } from './contact.js';

export const ENDPOINT = '';   // https://script.google.com/macros/s/<deployment id>/exec
const TIMEOUT = 15000;
const inArtifact = () => { try { return /(^|\.)claude(usercontent)?\.(ai|com)$/.test(location.hostname); } catch (e) { return false; } };
export const canSend = () => !!ENDPOINT && !inArtifact() && navigator.onLine !== false;

// kind: 'quote' | 'contact' | 'feedback' · fields: flat {label: value} for the sheet · text: the same summary the customer sees
export async function sendRequest(kind, { ref, variant, fields = {}, text, hp = '' }) {
  if (!canSend()) return { ok: false, reason: 'off' };
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    // text/plain keeps this a "simple" request (no CORS preflight, which Apps Script cannot answer)
    const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, signal: ctl.signal,
      body: JSON.stringify({ kind, ref, variant, page: location.pathname + location.hash, fields, text, hp, ts: new Date().toISOString() }) });
    const j = await r.json().catch(() => null);
    return j && j.ok ? { ok: true, ref: j.ref || ref } : { ok: false, reason: (j && j.error) || 'http ' + r.status };
  } catch (e) { return { ok: false, reason: e.name === 'AbortError' ? 'timeout' : 'network' }; } finally { clearTimeout(t); }
}

// Fills `box` with the outcome: sending → received (ref + what happens next) or, when sending is off / failed, the hand-off box
export async function deliver(box, kind, { ref, variant, fields, text, title, subject, hp }) {
  box.innerHTML = '';
  if (!canSend()) { box.append(handoffBox({ ref, title, text, subject })); return false; }
  box.append(h('div', { class: 's-hand', role: 'status' }, h('p', {}, `กำลังส่งคำขอถึงทีม · เลขอ้างอิง ${ref}`)));
  const res = await sendRequest(kind, { ref, variant, fields, text, hp });
  box.innerHTML = '';
  if (res.ok) {
    box.append(h('div', { class: 's-hand s-hand-ok', role: 'status' },
      h('p', { class: 's-hand-b' }, 'ส่งถึงทีมแล้ว'),
      h('h3', {}, title, h('small', {}, ` · เลขอ้างอิง ${res.ref}`)),
      h('p', {}, kind === 'feedback' ? 'ขอบคุณที่สละเวลาให้ความเห็น ทีมใช้ทุกความเห็นประกอบการปรับเว็บไซต์' : 'ทีมได้รับข้อมูลแล้ว จะติดต่อกลับเพื่อยืนยันรายละเอียด ราคา และนัดวันตามช่องทางที่คุณให้ไว้ หากต้องการเร่งด่วน โทรแจ้งเลขอ้างอิงได้'),
      h('textarea', { class: 's-hand-t', readonly: true, rows: Math.min(8, text.split('\n').length + 1), 'aria-label': 'สรุปคำขอที่ส่ง' }, text)));
    return true;
  }
  box.append(handoffBox({ ref, title, text, subject, note: 'ส่งอัตโนมัติไม่สำเร็จ (การเชื่อมต่อขัดข้อง) — คำขอนี้ยังไม่ถึงทีม กรุณาส่งสรุปนี้ทาง LINE หรืออีเมล หรือโทรแจ้งเลขอ้างอิง' }));
  return false;
}

// Privacy line shown under every form that collects a name / phone (PDPA: purpose of use)
export const privacyNote = () => h('p', { class: 's-note s-privacy' }, 'ข้อมูลที่กรอกใช้เพื่อติดต่อกลับเรื่องคำขอนี้เท่านั้น ไม่เผยแพร่และไม่ใช้เพื่อการอื่น');
// Hidden trap field: people never fill it, simple bots do (the script drops those rows)
export const honeypot = () => h('label', { class: 's-hp', 'aria-hidden': 'true' }, 'เว็บไซต์', h('input', { name: 'website', tabindex: '-1', autocomplete: 'off' }));
