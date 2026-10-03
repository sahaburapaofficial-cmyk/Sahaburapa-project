// SBP AirCare — local Google Apps Script emulator for backend/apps-script/Code.gs + Board.html — Rev.19
// Runs the real Code.gs (unchanged) inside node:vm with in-memory stand-ins for SpreadsheetApp, DriveApp, MailApp, CacheService,
// PropertiesService, ContentService, HtmlService, ScriptApp, UrlFetchApp and Utilities, so the whole ticket flow can be tested
// before the company deploys the web app. It copies the Sheets behaviour that matters here: a value written without a leading
// apostrophe is parsed like typed input (0812345678 → number, 2026-10-08 → date), "'" keeps text.
//
//   node backend/test/gas-emulator.mjs [port=8790]
//     GET/POST /exec           → doGet / doPost (CORS like a deployed web app)
//     GET  /exec?view=board&key=… → Board.html with a google.script.run bridge (POST /rpc)
//     GET  /__run?fn=setup|selfTest → run a function, return its result + console log
//     GET  /__state            → every tab, Drive files, e-mails and LINE pushes (for test assertions)
import vm from 'node:vm';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DIR = new URL('../apps-script/', import.meta.url);
const TZ_OFF = 7 * 3600e3;   // Asia/Bangkok, no DST

const pad = n => String(n).padStart(2, '0');
function fmt(d, _tz, pat) {   // Utilities.formatDate for the patterns Code.gs uses, Bangkok time
  const t = new Date(d.getTime() + TZ_OFF);
  return pat.replace('yyyy', t.getUTCFullYear()).replace('MM', pad(t.getUTCMonth() + 1)).replace('dd', pad(t.getUTCDate()))
    .replace('HH', pad(t.getUTCHours())).replace('mm', pad(t.getUTCMinutes())).replace('ss', pad(t.getUTCSeconds()));
}
// what Sheets stores when a script writes v
function parseInput(v) {
  if (typeof v !== 'string') return v;
  if (v.startsWith("'")) return v.slice(1);
  if (/^-?\d+(\.\d+)?$/.test(v.trim())) return Number(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(v.trim())) return new Date(v.trim() + 'T00:00:00+07:00');
  return v;
}
const display = v => v instanceof Date ? fmt(v, '', 'yyyy-MM-dd HH:mm:ss').replace(/ 00:00:00$/, '') : v == null ? '' : String(v);

export function createGas({ bound = true } = {}) {
  const state = { sheets: new Map(), files: [], folders: [], mail: [], line: [], props: {}, cache: {}, log: [], ssCreated: bound, ssName: 'SBP AirCare – คำขอจากเว็บ' };
  let fid = 0;

  /* ---------- Sheets ---------- */
  class Range {
    constructor(sh, r, c, nr = 1, nc = 1) { Object.assign(this, { sh, r, c, nr, nc }); }
    cells(f) { const out = []; for (let i = 0; i < this.nr; i++) { const row = []; for (let j = 0; j < this.nc; j++) row.push(f(this.sh.rows[this.r - 1 + i]?.[this.c - 1 + j])); out.push(row); } return out; }
    getValues() { return this.cells(v => v == null ? '' : v); }
    getDisplayValues() { return this.cells(display); }
    setValues(vals) { vals.forEach((row, i) => row.forEach((v, j) => this.sh.put(this.r + i, this.c + j, parseInput(v)))); return this; }
    setValue(v) { this.sh.put(this.r, this.c, parseInput(v)); return this; }
    clearContent() { for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) this.sh.put(this.r + i, this.c + j, ''); return this; }
  }
  class Sheet {
    constructor(name) { this.name = name; this.rows = []; this.frozen = 0; }
    put(r, c, v) { while (this.rows.length < r) this.rows.push([]); const row = this.rows[r - 1]; while (row.length < c) row.push(''); row[c - 1] = v; }
    getName() { return this.name; }
    appendRow(a) { this.rows.push(a.map(parseInput)); return this; }
    setFrozenRows(n) { this.frozen = n; }
    getLastRow() { return this.rows.length; }
    getLastColumn() { return Math.max(0, ...this.rows.map(r => r.length)); }
    getRange(r, c, nr, nc) { if (r < 1 || c < 1) throw new Error('Range out of bounds'); return new Range(this, r, c, nr, nc); }
    getDataRange() { return new Range(this, 1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn())); }
    deleteRow(r) { this.rows.splice(r - 1, 1); }
  }
  const ss = {
    getId: () => 'SHEET-LOCAL', getUrl: () => 'https://docs.google.com/spreadsheets/d/SHEET-LOCAL/edit',
    getSheetByName: n => state.sheets.get(n) || null,
    insertSheet: n => { if (state.sheets.has(n)) throw new Error('sheet exists ' + n); const s = new Sheet(n); state.sheets.set(n, s); return s; },
  };
  const SpreadsheetApp = {
    getActiveSpreadsheet: () => bound ? ss : null,
    openById: id => { if (id !== 'SHEET-LOCAL' || !state.ssCreated) throw new Error('no sheet ' + id); return ss; },
    create: name => { state.ssCreated = true; state.ssName = name; return ss; },
  };

  /* ---------- Drive ---------- */
  const iter = list => { let i = 0; return { hasNext: () => i < list.length, next: () => list[i++] }; };
  function Folder(name, parent) {
    const f = { id: 'F' + (++fid), name, parent, trashed: false, children: [] };
    Object.assign(f, {
      getUrl: () => 'https://drive.google.com/drive/folders/' + f.id, getName: () => name, getId: () => f.id,
      createFolder: n => { const c = Folder(n, f); f.children.push(c); return c; },
      getFoldersByName: n => iter(f.children.filter(c => c.name === n && !c.trashed)),
      createFile: blob => { const file = { id: 'D' + (++fid), folder: f, name: blob.name, type: blob.type, size: blob.bytes.length, getUrl: () => 'https://drive.google.com/file/d/' + file.id }; state.files.push(file); return file; },
      setTrashed: t => { f.trashed = t; },
    });
    state.folders.push(f);
    return f;
  }
  const driveRoot = [];
  const DriveApp = {
    getFoldersByName: n => iter(driveRoot.filter(c => c.name === n && !c.trashed)),
    createFolder: n => { const f = Folder(n, null); driveRoot.push(f); return f; },
  };

  /* ---------- the rest of the services ---------- */
  const Utilities = {
    formatDate: fmt, getUuid: () => crypto.randomUUID(),
    base64Decode: b => [...Buffer.from(b, 'base64')],
    newBlob: (bytes, type, name) => ({ bytes, type, name }),
  };
  const props = { getProperty: k => state.props[k] ?? null, setProperty: (k, v) => { state.props[k] = String(v); return props; }, deleteProperty: k => { delete state.props[k]; } };
  const cache = { get: k => state.cache[k] ?? null, put: (k, v) => { state.cache[k] = v; } };
  const text = s => { const o = { content: s, mime: 'text/plain', getContent: () => s, setMimeType: m => { o.mime = m; return o; } }; return o; };
  const html = s => { const o = { content: s, title: '', getContent: () => o.content, setTitle: t => { o.title = t; return o; }, addMetaTag: () => o, setXFrameOptionsMode: () => o }; return o; };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const HtmlService = {
    createHtmlOutput: s => html(s),
    createTemplateFromFile: name => {
      const src = readFileSync(new URL(name + '.html', DIR), 'utf8'), t = {};
      t.evaluate = () => {
        if (/<\?(?!=|!=)/.test(src.replace(/<\?(=|!=)/g, ''))) throw new Error('emulator: code scriptlets not supported');
        const run = expr => vm.runInNewContext(expr, { ...t });
        return html(src.replace(/<\?!=([\s\S]*?)\?>/g, (_, e) => String(run(e))).replace(/<\?=([\s\S]*?)\?>/g, (_, e) => esc(run(e))));
      };
      return t;
    },
  };
  let serviceUrl = '';
  const ctx = {
    SpreadsheetApp, DriveApp, Utilities,
    PropertiesService: { getScriptProperties: () => props },
    CacheService: { getScriptCache: () => cache },
    ContentService: { createTextOutput: text, MimeType: { JSON: 'application/json', TEXT: 'text/plain' } },
    HtmlService,
    LockService: { getScriptLock: () => ({ waitLock: () => { state.locks = (state.locks || 0) + 1; }, releaseLock: () => {}, tryLock: () => true }) },
    MailApp: { sendEmail: m => { state.mail.push(m); } },
    UrlFetchApp: { fetch: (url, o) => { state.line.push({ url, body: JSON.parse(o.payload) }); return { getResponseCode: () => 200 }; } },
    ScriptApp: { getService: () => ({ getUrl: () => serviceUrl }) },
    console: { log: (...a) => state.log.push(a.join(' ')), error: (...a) => state.log.push('ERROR ' + a.map(String).join(' ')), warn: (...a) => state.log.push(a.join(' ')) },
    Buffer, crypto, Date,   // one Date for both sides, so instanceof Date in Code.gs sees the sheet's dates
  };
  vm.createContext(ctx);
  vm.runInContext(readFileSync(new URL('Code.gs', DIR), 'utf8'), ctx, { filename: 'Code.gs' });

  return {
    state, ctx,
    setServiceUrl: u => { serviceUrl = u; },
    call(fn, ...args) { if (typeof ctx[fn] !== 'function') throw new Error('no function ' + fn); return ctx[fn](...args); },
    dump() {
      const tabs = {};
      for (const [n, s] of state.sheets) tabs[n] = s.rows.map(r => r.map(display));
      return { tabs, files: state.files.map(f => ({ folder: f.folder.name, trashed: f.folder.trashed, name: f.name, type: f.type, size: f.size })), mail: state.mail.map(m => ({ to: m.to, subject: m.subject })), line: state.line.map(x => x.body.messages[0].text), props: Object.keys(state.props) };
    },
  };
}

/* ---------- HTTP server ---------- */
const BRIDGE = `<script>
// emulator stand-in for google.script.run (calls the same server functions over POST /rpc)
window.google = { script: { get run() { let ok = () => {}, bad = () => {};
  const p = new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? f => { ok = f; return p; } : k === 'withFailureHandler' ? f => { bad = f; return p; } :
    (...args) => fetch('/rpc', { method: 'POST', body: JSON.stringify({ fn: k, args }) }).then(r => r.json()).then(j => j.ok ? ok(j.value) : bad(new Error(j.error))).catch(bad) });
  return p; } } };
</script>`;
export function serve(gas, port = 8790) {
  const RPC = new Set(['boardData', 'boardUpdate']);
  const cors = { 'Access-Control-Allow-Origin': '*' };
  const srv = http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x'), body = await new Promise(r => { let b = ''; req.on('data', c => b += c); req.on('end', () => r(b)); });
    const send = (code, type, s, h = {}) => { res.writeHead(code, { 'Content-Type': type, ...cors, ...h }); res.end(s); };
    try {
      if (req.method === 'OPTIONS') return send(405, 'text/plain', 'Apps Script web apps do not answer preflight');   // like the real thing
      if (u.pathname === '/exec') {
        const e = { parameter: Object.fromEntries(u.searchParams), postData: req.method === 'POST' ? { contents: body, type: req.headers['content-type'] } : undefined };
        const out = gas.call(req.method === 'POST' ? 'doPost' : 'doGet', e);
        if (out.mime) return send(200, out.mime + '; charset=utf-8', out.content);
        return send(200, 'text/html; charset=utf-8', out.content.replace('</head>', BRIDGE + '</head>'));
      }
      if (u.pathname === '/rpc' && req.method === 'POST') {
        const { fn, args } = JSON.parse(body);
        if (!RPC.has(fn)) return send(200, 'application/json', JSON.stringify({ ok: false, error: 'not callable' }));
        try { return send(200, 'application/json', JSON.stringify({ ok: true, value: gas.call(fn, ...args) })); }
        catch (err) { return send(200, 'application/json', JSON.stringify({ ok: false, error: String(err.message || err) })); }
      }
      if (u.pathname === '/__run') {
        const n = gas.state.log.length, value = gas.call(u.searchParams.get('fn'));
        return send(200, 'application/json', JSON.stringify({ value, log: gas.state.log.slice(n) }));
      }
      if (u.pathname === '/__state') return send(200, 'application/json', JSON.stringify(gas.dump()));
      send(404, 'text/plain', 'not found');
    } catch (err) { send(500, 'text/plain', String(err.stack || err)); }
  });
  return new Promise(r => srv.listen(port, '127.0.0.1', () => r(srv)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = +(process.argv[2] || 8790), gas = createGas();
  gas.setServiceUrl(`http://127.0.0.1:${port}/exec`);
  await serve(gas, port);
  console.log(`Apps Script emulator on http://127.0.0.1:${port}/exec`);
}
