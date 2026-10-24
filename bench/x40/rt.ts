/**
 * X40 METRON — red team and unit tests.
 *
 * Two kinds of test, both necessary:
 *   (A) TEMPLATE ALGEBRA. parse/render must be exact inverses on the shapes real
 *       tables use: decimals, zero padding, unit suffixes, signs, clocks.
 *   (B) TRANSFORM EXACTNESS. apply -> undo must be byte-exact, or the plan must
 *       be refused. Includes the new failure modes the absolute generators
 *       introduce, and a seeded fuzz over generated ramp tables.
 *
 * The APOGRAPHE suite (bench/x39/rt.ts) is re-run in the same command because
 * METRON shares that engine: a repaired engine inherits no trust.
 */
import { apographeApply, apographeUndo, apographePlan, apographeParseHeader,
  parseNumTemplate, renderNumTemplate, parseClockTemplate, renderClockTemplate,
  sameNumTemplate, dayNumber, formatDate, type ApographeConfig, type ApographeLift } from '@/lib/omega/apographe';
import { metronEncode, metronPlan, metronDecodeResult } from '@/lib/omega/metron';

let pass = 0, fail = 0;
const fails: string[] = [];
function ok(name: string, cond: boolean, detail = '') {
  if (cond) pass++; else { fail++; fails.push(name + (detail ? ' :: ' + detail : '')); }
}

type Line = { text: string; eol: string };
function lines(text: string): Line[] {
  const out: Line[] = []; let i = 0;
  while (i <= text.length) {
    const j = text.indexOf('\n', i);
    if (j < 0) { if (i < text.length || !out.length) out.push({ text: text.slice(i), eol: '' }); break; }
    let b = text.slice(i, j), eol = '\n';
    if (b.endsWith('\r')) { b = b.slice(0, -1); eol = '\r\n'; }
    out.push({ text: b, eol }); i = j + 1;
  }
  return out;
}
const cfg = (n: number, sep: string, lifts: ApographeLift[]): ApographeConfig =>
  ({ n, sep, headerSep: sep === '|' ? ';' : '|', open: '<', close: '>', lifts });

function exact(name: string, text: string, n: number, sep: string, lifts: ApographeLift[]) {
  const c = cfg(n, sep, lifts);
  let ap: any;
  try { ap = apographeApply(lines(text), c); } catch (e: any) { ok(name + ' [threw]', false, e.message); return; }
  if (ap === null) { ok(name + ' [refused]', true); return; }
  const back = apographeUndo(ap.text);
  ok(name + ' [exact]', back === text, back === null ? 'undo=null' : firstDiff(text, back));
}
function firstDiff(a: string, b: string | null): string {
  if (b === null) return 'null';
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) return `@${i} want ${JSON.stringify(a.slice(Math.max(0, i - 25), i + 25))} got ${JSON.stringify(b.slice(Math.max(0, i - 25), i + 25))}`;
  }
  return 'len';
}

// ---------------------------------------------------------------------------
// A. template algebra
// ---------------------------------------------------------------------------
const t = (s: string) => parseNumTemplate(s);
const r = (s: string, v: number) => { const p = t(s)!; return renderNumTemplate(p.t, v); };

ok('template 100.00 dec=2 width=3', (() => { const p = t('100.00')!; return p.t.dec === 2 && p.t.width === 3 && p.t.pre === '' && p.t.suf === ''; })());
ok('template " 100.00 " keeps the padding in the template', (() => { const p = t(' 100.00 ')!; return p.t.pre === ' ' && p.t.suf === ' '; })());
ok('template 40.0 s dec=1 suf=" s "', (() => { const p = t('40.0 s ')!; return p.t.dec === 1 && p.t.suf === ' s ' && p.v === 400; })());
ok('template -12.5% sign is not part of the template', (() => { const p = t('-12.5%')!; return p.v === -125 && p.t.suf === '%' && p.t.pre === ''; })());
ok('template user_007 keeps pre and width 3', (() => { const p = t('user_007')!; return p.t.pre === 'user_' && p.t.width === 3 && p.v === 7; })());
ok('template 0.00 -> 0', t('0.00')!.v === 0);
// a thousands separator makes a SECOND digit run, so the field is not a simple
// template: the codec must refuse it rather than guess which run is the value
ok('template 1,234 is refused (two digit runs)', t('1,234') === null);
ok('render 100.00 at 10000 = 100.00', r('100.00', 10000) === '100.00');
ok('render 100.00 at 10730 = 107.30', r('100.00', 10730) === '107.30');
ok('render 100.00 at 8000 pads to the template width: 080.00', r('100.00', 8000) === '080.00');
ok('render 078.10 at 10000 = 100.00 (fits the width)', r('078.10', 10000) === '100.00');
ok('render 078.10 at 100000 refuses (width would grow)', r('078.10', 100000) === null);
ok('render 40.0 s at 425 = 42.5 s', r('40.0 s ', 425) === '42.5 s ');
ok('render -12.5% at -125 = -12.5%', r('-12.5%', -125) === '-12.5%');
ok('render -12.5% at 125 drops the sign', r('-12.5%', 125) === '12.5%');
ok('render 2026 at 2027', r('2026', 2027) === '2027');
ok('round trip every value 0..99 at 2 decimals', (() => {
  const p = t('05.00')!;
  for (let v = 0; v < 10000; v += 37) {
    const s = renderNumTemplate(p.t, v);
    if (s === null) continue;
    const q = parseNumTemplate(s);
    if (!q || q.v !== v || !sameNumTemplate(p.t, q.t)) return false;
  }
  return true;
})());
ok('clock 00:02:05 -> 125 s', parseClockTemplate('00:02:05')!.v === 125);
ok('clock [00:00:02] keeps the brackets', (() => { const p = parseClockTemplate('[00:00:02]')!; return p.t.pre === '[' && p.t.suf === ']' && p.v === 2; })());
ok('clock 02:05 (2 fields) -> 125 s', parseClockTemplate('02:05')!.v === 125);
ok('clock render 125 = 00:02:05', renderClockTemplate(parseClockTemplate('00:02:05')!.t, 125) === '00:02:05');
ok('clock render 3725 = 01:02:05', renderClockTemplate(parseClockTemplate('00:02:05')!.t, 3725) === '01:02:05');
ok('clock refuses a negative reading', renderClockTemplate(parseClockTemplate('00:02:05')!.t, -1) === null);
ok('clock refuses 3600 s in the 2-field form', renderClockTemplate(parseClockTemplate('02:05')!.t, 3600) === null);
ok('a date is not a clock', parseClockTemplate('2026-09-30') === null);

// ---------------------------------------------------------------------------
// B. transform exactness
// ---------------------------------------------------------------------------
const money = ['sku,asof,unit_price,qty', 'A,2026-01-02,12.50,10', 'B,2026-01-03,12.55,13',
  'C,2026-01-04,12.60,16', 'D,2026-01-05,12.65,19', 'E,2026-01-06,12.70,22', 'F,2026-01-07,12.75,25']
  .join('\n') + '\n';
const linLift = { col: 2, model: { kind: 'lin' as const, t: { pre: '', suf: '', dec: 2, width: 2 }, v: 1250, at: 1, s: 5 } };
exact('lin money column', money, 4, ',', [linLift]);
exact('lin with a literal row in the middle',
  money.replace('D,2026-01-05,12.65,19', 'D,2026-01-05,xx,19'), 4, ',', [linLift]);
exact('lin with the first data row literal',
  money.replace('A,2026-01-02,12.50,10', 'A,2026-01-02,xx,10'), 4, ',', [linLift]);
exact('lin on a column that overflows its width',
  money.replace('F,2026-01-07,12.75,25', 'F,2026-01-07,123.75,25'), 4, ',', [linLift]);

const cues = ['| cue | start | text |', '| 1 | 00:00:02 | a |', '| 2 | 00:00:03 | b |',
  '| 3 | 00:00:04 | c |', '| 4 | 00:00:05 | d |', '| 5 | 00:00:06 | e |', '| 6 | 00:00:07 | f |']
  .join('\n') + '\n';
const clkLift = { col: 1, model: { kind: 'clock' as const, t: { pre: '', suf: '', fields: 3 as const }, v: 2, at: 1, s: 1 } };
exact('clock column', cues, 3, '|', [clkLift]);
exact('clock column with a gap (literal row)',
  cues.replace('| 4 | 00:00:05 | d |', '| 4 | 00:00:09 | d |'), 3, '|', [clkLift]);

// header grammar
ok('parse lin header', (() => {
  const c = apographeParseHeader('<2|,|1=lin:100.00/3,730>', '<', '>')!;
  const m: any = c && c.lifts[0].model;
  return !!m && m.kind === 'lin' && m.v === 10000 && m.at === 3 && m.s === 730;
})());
ok('parse clock header', (() => {
  const c = apographeParseHeader('<3;|;2=clock:00:02:05/1,3>', '<', '>')!;
  const m: any = c && c.lifts[0].model;
  return !!m && m.kind === 'clock' && m.v === 125 && m.at === 1 && m.s === 3;
})());
ok('a sample containing the header separator is refused',
  apographeParseHeader('<2|,|1=lin:1,2/0,5>', '<', '>') === null);
ok('a sample containing a second digit run is refused',
  apographeParseHeader('<2|,|1=lin:1,234/0,5>', '<', '>') === null);
ok('reject lin with a negative anchor index',
  apographeParseHeader('<2|,|1=lin:100.00/-1,5>', '<', '>') === null);
ok('reject lin with a non-integer step',
  apographeParseHeader('<2|,|1=lin:100.00/3,7.5>', '<', '>') === null);
ok('reject colM pointing right', apographeParseHeader('<3|,|1=col2>', '<', '>') === null);

// ---------------------------------------------------------------------------
// C. seeded fuzz over generated ramp tables
// ---------------------------------------------------------------------------
let seed = 0x5eed40;
const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 0x100000000;
let fuzzOk = 0, fuzzRefused = 0, fuzzRun = 0;
for (let t2 = 0; t2 < 200; t2++) {
  const rows = 6 + Math.floor(rnd() * 10);
  const dec = Math.floor(rnd() * 3);
  const step = Math.floor(rnd() * 20) - 5;
  const start = Math.floor(rnd() * 900) + 50;
  const out: string[] = ['k,v'];
  let v = start;
  for (let i = 0; i < rows; i++) {
    const mag = Math.abs(v);
    const unit = 10 ** dec;
    const ip = String(Math.floor(mag / unit)).padStart(3, '0');
    const fp = dec ? '.' + String(mag % unit).padStart(dec, '0') : '';
    out.push(`r${i},${v < 0 ? '-' : ''}${ip}${fp}`);
    v += step;
  }
  const text = out.join('\n') + '\n';
  const lift = { col: 1, model: { kind: 'lin' as const, t: { pre: '', suf: '', dec, width: 3 }, v: start, at: 1, s: step } };
  fuzzRun++;
  const ap = apographeApply(lines(text), cfg(2, ',', [lift]));
  if (ap === null) { fuzzRefused++; continue; }
  const back = apographeUndo(ap.text);
  if (back === text) fuzzOk++;
  else { fail++; fails.push(`fuzz#${t2} dec=${dec} step=${step} :: ${firstDiff(text, back)}`); }
}
ok('fuzz ramp tables exact or refused', fuzzOk + fuzzRefused === fuzzRun,
  `${fuzzOk} exact, ${fuzzRefused} refused of ${fuzzRun}`);

// ---------------------------------------------------------------------------
// D. end-to-end (real lanes; the encode is the expensive part)
// ---------------------------------------------------------------------------
const lanes = (process.env.LANES_ONE || '').split(',').filter(Boolean);
for (const p of lanes) {
  const fs = require('node:fs');
  const text = fs.readFileSync(p, 'utf8');
  const r2: any = metronEncode(text, 'o200k_base');
  const back = metronDecodeResult(r2);
  ok('end-to-end ' + p.split('/').pop(), back === text,
    `M=${r2.messageTokens} apo=${r2.apographe} hdr=${r2.apographeHeader || '-'}`);
}

console.log(`\nMETRON red team: ${pass} passed, ${fail} failed`);
if (fails.length) { console.log('FAILURES:'); for (const f of fails) console.log('  ' + f); }
process.exit(fail ? 1 : 0);
