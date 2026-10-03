// SBP AirCare — send requests to the team — Rev.10 (owner 2 ต.ค. 2569: "ทำเป็นเว็บพร้อมใช้งาน" → "ส่งเข้าอีเมล")
// Quote requests, contact-form requests and beta feedback POST to ENDPOINT, which can be either
//   · FormSubmit (https://formsubmit.co/ajax/<email or alias>) — each request arrives as an e-mail to the team (in use now), or
//   · a Google Apps Script web app — a row in the company's Google Sheet + e-mail (backend/apps-script/Code.gs, backend/README.md).
// Empty ENDPOINT → every form keeps the honest hand-off box (copy / LINE / e-mail).
// Inside Claude Artifacts the page cannot reach other domains (CSP), so sending is skipped there and the hand-off box is used.
// The browser never decides prices: totals travel as "ยอดประมาณการ" and the team confirms them in the formal quotation.
import { h } from './sbp-core.js';
import { handoffBox } from './contact.js';

const TIMEOUT = 15000;
const inArtifact = () => { try { return /(^|\.)claude(usercontent)?\.(ai|com)$/.test(location.hostname); } catch (e) { return false; } };
export const canSend = () => !!ENDPOINT && !inArtifact() && navigator.onLine !== false;
// ★Rev.16 the company back office (Google Apps Script web app, backend/apps-script/Code.gs + Board.html): job tickets with
// photos, the live queue (?q=slots) and request status (?q=status). Empty until the company deploys it — then paste the
// /exec URL here (ENDPOINT may point at the same URL so every form lands in the same Sheet).
// ★Rev.19 one switch for every model: BACKEND_URL below, or <meta name="sbp-backend" content="…/exec"> in a page (test runs,
// a staging copy). Only an Apps Script /exec URL is accepted — never a URL from the address bar.
// When the back office is on, ENDPOINT points at it too, so quotes / contact / feedback land in the same Sheet as the jobs.
const BACKEND_URL = '';
const FORMSUBMIT = 'https://formsubmit.co/ajax/Sahaburapa.official@gmail.com';
const okUrl = u => /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(u);
const metaUrl = () => { try { const m = document.querySelector('meta[name="sbp-backend"]'); const u = m ? m.content.trim() : ''; return okUrl(u) ? u : ''; } catch (e) { return ''; } };
export const BACKEND = metaUrl() || BACKEND_URL;
export const ENDPOINT = BACKEND || FORMSUBMIT;
export const canReach = () => !!BACKEND && !inArtifact() && navigator.onLine !== false;

// kind: 'quote' | 'contact' | 'feedback' · fields: flat {label: value} for the sheet · text: the same summary the customer sees
export async function sendRequest(kind, { ref, variant, fields = {}, text, hp = '' }) {
  if (!canSend()) return { ok: false, reason: 'off' };
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const r = await fetch(ENDPOINT, { method: 'POST', signal: ctl.signal, ...requestBody(ENDPOINT, { kind, ref, variant, page: location.pathname + location.hash, fields, text, hp }) });
    const j = await r.json().catch(() => null);
    return j && (j.ok || j.success === true || j.success === 'true') ? { ok: true, ref: j.ref || ref } : { ok: false, reason: (j && (j.error || j.message)) || 'http ' + r.status };
  } catch (e) { return { ok: false, reason: e.name === 'AbortError' ? 'timeout' : 'network' }; } finally { clearTimeout(t); }
}

const KIND_TH = { quote: 'ใบเสนอราคา', booking: 'ใบจองงาน', contact: 'ติดต่อ', feedback: 'ความเห็นทดลองใช้' };
// FormSubmit wants flat JSON (fields become rows of the e-mail table; `_honey` is its bot trap); Apps Script reads one JSON blob
// sent as text/plain so the request stays "simple" (no CORS preflight, which Apps Script cannot answer).
export function requestBody(url, { kind, ref, variant, page, fields = {}, text = '', hp = '' }) {
  if (/formsubmit\.co\//.test(url)) {
    const flat = {}; for (const [k, v] of Object.entries(fields)) if (v !== '' && v != null) flat[k] = String(v);
    return { headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({
      _subject: `[SBP AirCare] ${KIND_TH[kind] || kind} · ${ref}${variant ? ' · แบบ ' + variant : ''}`, _template: 'table', _captcha: 'false', _honey: hp,
      'เลขอ้างอิง': ref, 'ประเภท': KIND_TH[kind] || kind, 'แบบเว็บไซต์': variant || '-', 'หน้า': page, ...flat, 'สรุป': text }) };
  }
  return { headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ kind, ref, variant, page, fields, text, hp, ts: new Date().toISOString() }) };
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
