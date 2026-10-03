// SBP AirCare — booking queue rules — Rev.15 (owner 2 ต.ค. 2569: "สถานะคิวว่างตั้งไว้เป็น Booking ล่วงหน้า 3 วัน นอกจาก priority queue
// ภายในวัน +500 และต้องมีคิว ที่เหลือคำนวณให้")
//   · normal booking: the visit date is at least LEAD_DAYS days after today (Bangkok time); a Sunday moves to Monday
//   · priority queue (คิวด่วน): any earlier date, today included — + RUSH_FEE_EX per visit (before VAT, like every Pricebook
//     figure) and only when a crew is free: the team confirms first, and with no free crew there is no rush fee and the
//     nearest free date is offered
//   · how long the visit takes = Σ units × JOB_TIME (the same estimate the crew section shows, always with TIME_NOTE) → which
//     slot fits (half day / whole day / several working days) and whether a same-day visit can still end inside working hours
//   · live availability is optional: QUEUE_URL (Apps Script, backend/apps-script/Code.gs `?q=slots` reading the sheet tab
//     "คิว") → full slots are shown as full; empty URL / no answer → "ทีมยืนยันคิว" (never a made-up free slot)
// Pure logic, no DOM.
import { COMPANY, JOB_TIME, QUEUE_RULES } from './sbp-core.js';
import { BACKEND } from './submit.js';

export const LEAD_DAYS = QUEUE_RULES.leadDays;
export const RUSH_FEE_EX = QUEUE_RULES.rushFeeEx;
export const QUEUE_URL = BACKEND;   // the back office (submit.js) — empty = "ทีมยืนยันคิว", never a made-up free slot
const toMin = s => { const [a, b] = s.split(':').map(Number); return a * 60 + b; };
export const DAY_FROM = toMin(COMPANY.open.from), DAY_TO = toMin(COMPANY.open.to), DAY_MIN = DAY_TO - DAY_FROM;   // 08:30–17:30 = 540
export const SLOTS = {
  am: { th: 'ช่วงเช้า', sub: `เริ่ม ${COMPANY.open.from} น.` },
  pm: { th: 'ช่วงบ่าย', sub: 'เริ่มหลังเที่ยง' },
  day: { th: 'ทั้งวัน', sub: `${COMPANY.open.from}–${COMPANY.open.to} น.` },
};

/** today's date and minutes since midnight in Bangkok, whatever the visitor's own time zone */
export function bkkNow(now = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, min: +p.hour * 60 + +p.minute };
}
export const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const dow = iso => new Date(iso + 'T12:00:00Z').getUTCDay();
export const isOpen = iso => COMPANY.open.days.includes(dow(iso));
const nextOpen = iso => { let d = iso; for (let i = 0; i < 7 && !isOpen(d); i++) d = addDays(d, 1); return d; };
export const dateTh = iso => new Date(iso + 'T12:00:00Z').toLocaleDateString('th-TH', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });

/** first date a normal (non-rush) booking can take */
export const earliestNormal = (now = bkkNow()) => nextOpen(addDays(now.date, LEAD_DAYS));

/** on-site time of one crew for the cleaning lines [{t, qty}] at level C1/C2 → [min, max] minutes */
export function visitTime(lines, level = 'C1') {
  return lines.reduce(([a, b], l) => { const T = JOB_TIME[l.level || level]; if (!T) return [a, b]; const r = T[l.t] || T.wall; return [a + r[0] * l.qty, b + r[1] * l.qty]; }, [0, 0]);
}
/** how the visit fits the working day: 'half' (a morning or an afternoon), 'day', or several working days */
export function fitOf([, max]) {
  if (max <= 0) return { kind: 'half', days: 0.5, unknown: true };   // e.g. repair: no published time → a morning or an afternoon
  if (max <= DAY_MIN / 2) return { kind: 'half', days: 0.5 };
  if (max <= DAY_MIN) return { kind: 'day', days: 1 };
  return { kind: 'days', days: Math.ceil(max / DAY_MIN) };
}

/**
 * Everything the booking form needs to say about a date.
 * → { kind: 'none'|'past'|'rush'|'normal', rush, closed, sameDay, late, earliest, slots: [ids allowed], fit, time }
 */
export function judge(date, lines, level, now = bkkNow()) {
  const time = visitTime(lines, level), fit = fitOf(time), earliest = earliestNormal(now);
  const base = { earliest, time, fit };
  if (!date) return { ...base, kind: 'none', rush: false, slots: [] };
  if (date < now.date) return { ...base, kind: 'past', rush: false, slots: [] };
  const rush = date < earliest, closed = !isOpen(date), sameDay = date === now.date;
  let slots = fit.kind === 'half' ? ['am', 'pm'] : ['day'];
  // same day: a slot that already started is gone; a visit that cannot end by closing time runs into out-of-hours work
  let late = false;
  if (sameDay) {
    const left = DAY_TO - Math.max(now.min, DAY_FROM);
    if (now.min >= 12 * 60) slots = slots.filter(s => s !== 'am' && s !== 'day');
    if (left < time[0] || !slots.length) late = true;
  }
  return { ...base, kind: rush ? 'rush' : 'normal', rush, closed, sameDay, late, slots };
}

/** optional live availability: { 'YYYY-MM-DD': { am: bool, pm: bool } } (true = free) or null when not configured / unreachable */
let cache = null, cacheAt = 0;   // Rev.19: kept 60 s — the team confirms visits all day, a long-open page must not show an old queue
export async function fetchSlots(url = QUEUE_URL) {
  if (!url) return null;
  try { if (/(^|\.)claude(usercontent)?\.(ai|com)$/.test(location.hostname)) return null; } catch (e) { return null; }
  if (cache && Date.now() - cacheAt < 60000) return cache;
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(url + (url.includes('?') ? '&' : '?') + 'q=slots', { signal: ctl.signal });
    const j = await r.json();
    cacheAt = Date.now(); return (cache = j && j.ok && j.days && typeof j.days === 'object' ? j.days : null);
  } catch (e) { return null; } finally { clearTimeout(t); }
}
/** true / false when the sheet says so, null when unknown (the team confirms) */
export function slotFree(days, date, slot) {
  const d = days && days[date];
  if (!d) return null;
  return slot === 'day' ? (d.am !== false && d.pm !== false) : d[slot] !== false;
}

/** request status from the team's sheet (Code.gs ?q=status) → { ok, status } | null when not configured / unreachable */
export async function fetchStatus(ref, tel4, url = QUEUE_URL) {
  if (!url) return null;
  try {
    const r = await fetch(`${url}${url.includes('?') ? '&' : '?'}q=status&ref=${encodeURIComponent(ref)}&tel=${encodeURIComponent(tel4)}`);
    return await r.json();
  } catch (e) { return null; }
}
