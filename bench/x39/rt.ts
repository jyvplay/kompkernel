/**
 * X39 APOGRAPHE — red team.  No encoder search, no parent, no timing: every
 * case here exercises apographeApply -> apographeUndo and asserts
 *
 *      apply returns null   (refused, safely)        OR
 *      undo(apply(x)) === x (byte-exact)
 *
 * which is the whole soundness contract of the transform. It is deliberately
 * separate from bench/x39/verify.ts, which runs the real cached pipeline.
 */
import { apographeApply, apographeUndo, apographePlan, parseDate, formatDate, dayNumber, weekdayOf, nextWorkday, splitNumber, detectSeparator, apographeParseHeader, apographeEncode, apographeDecode } from '@/lib/omega/apographe';
import { countTokens } from '@/lib/omega/bpe';
import * as fs from 'node:fs';
import { chironDecode } from '@/lib/omega/chiron';

type Line = { text: string; eol: string };
let pass = 0, fail = 0;
const fails: string[] = [];
function ok(name: string, cond: boolean, detail = '') {
  if (cond) pass++;
  else { fail++; fails.push(name + (detail ? ' :: ' + detail : '')); }
}

function lines(text: string): Line[] {
  const out: Line[] = [];
  let i = 0;
  while (i <= text.length) {
    const j = text.indexOf('\n', i);
    if (j < 0) { if (i < text.length || !out.length) out.push({ text: text.slice(i), eol: '' }); break; }
    let b = text.slice(i, j), eol = '\n';
    if (b.endsWith('\r')) { b = b.slice(0, -1); eol = '\r\n'; }
    out.push({ text: b, eol });
    i = j + 1;
  }
  return out;
}

const cfg = (n: number, sep: string, lifts: any[]) =>
  ({ n, sep, headerSep: sep === '|' ? ';' : '|', open: '<', close: '>', lifts });

/** apply+undo must either refuse or be byte-exact. */
function exact(name: string, text: string, n: number, sep: string, lifts: any[]) {
  const c = cfg(n, sep, lifts);
  const ap = apographeApply(lines(text), c as any);
  if (ap === null) { ok(name + ' [refused]', true); return; }
  const back = apographeUndo(ap.text);
  ok(name + ' [exact]', back === text, back === null ? 'undo=null' : JSON.stringify(firstDiff(text, back)));
}

function firstDiff(a: string, b: string | null): string {
  if (b === null) return 'null';
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) return `at ${i}: want ${JSON.stringify(a.slice(Math.max(0, i - 30), i + 30))} got ${JSON.stringify(b.slice(Math.max(0, i - 30), i + 30))}`;
  }
  return 'len';
}

// ---------------------------------------------------------------------------
// 1. calendar primitives
// ---------------------------------------------------------------------------
ok('dayNumber 2000-01-01 = 2451545', dayNumber(2000, 1, 1) === 2451545);
ok('formatDate roundtrip 2014-01-02', formatDate(dayNumber(2014, 1, 2)) === '2014-01-02');
ok('weekday 2000-01-01 is Saturday', weekdayOf(2451545) === 6);
ok('2014-01-03 is Friday, next workday is Monday 01-06',
  formatDate(nextWorkday(dayNumber(2014, 1, 3))) === '2014-01-06');
ok('leap day 2016-02-28 + 1 day = 02-29', formatDate(dayNumber(2016, 2, 28) + 1) === '2016-02-29');
ok('2016-02-29 + 1 day = 03-01', formatDate(dayNumber(2016, 2, 29) + 1) === '2016-03-01');
ok('1900-02-28 + 1 = 1900-03-01 (1900 is not a leap year)',
  formatDate(dayNumber(1900, 2, 28) + 1) === '1900-03-01');
ok('2000-02-28 + 1 = 2000-02-29 (2000 is a leap year)',
  formatDate(dayNumber(2000, 2, 28) + 1) === '2000-02-29');
ok('2014-12-31 + 1 = 2015-01-01', formatDate(dayNumber(2014, 12, 31) + 1) === '2015-01-01');
ok('parseDate rejects 2026-02-30', parseDate('2026-02-30') === null);
ok('parseDate rejects 2026-13-01', parseDate('2026-13-01') === null);
ok('parseDate rejects 2026-1-01 (width)', parseDate('2026-1-01') === null);
ok('parseDate accepts 0001-01-01', parseDate('0001-01-01') !== null);
ok('splitNumber 100G', JSON.stringify(splitNumber('100G')) === JSON.stringify({ pre: '', digits: '100', suf: 'G' }));
ok('splitNumber user_0007', JSON.stringify(splitNumber('user_0007')) === JSON.stringify({ pre: 'user_', digits: '0007', suf: '' }));

// ---------------------------------------------------------------------------
// 2. structural refusals and exactness
// ---------------------------------------------------------------------------
const aaplHead = ['AAPL_x,AAPL_y', '2014-01-02,77.44539475', '2014-01-03,77.04557544',
  '2014-01-06,74.89697204', '2014-01-07,75.856461', '2014-01-08,75.09194679',
  '2014-01-09,76.20263178', '2014-01-10,75.2301837'].join('\n') + '\n';

exact('basic csv + workdays', aaplHead, 2, ',', [{ col: 0, model: { kind: 'workdays' } }]);
exact('crlf csv', aaplHead.replace(/\n/g, '\r\n'), 2, ',', [{ col: 0, model: { kind: 'workdays' } }]);
exact('no trailing newline', aaplHead.trimEnd(), 2, ',', [{ col: 0, model: { kind: 'workdays' } }]);
exact('leap-year dates', ['d,x', '2016-02-26,1', '2016-02-29,2', '2016-03-01,3', '2016-03-02,4',
  '2016-03-03,5', '2016-03-04,6', '2016-03-07,7'].join('\n') + '\n', 2, ',',
  [{ col: 0, model: { kind: 'workdays' } }]);
exact('year rollover', ['d,x', '2014-12-29,1', '2014-12-30,2', '2014-12-31,3', '2015-01-01,4',
  '2015-01-02,5', '2015-01-05,6', '2015-01-06,7'].join('\n') + '\n', 2, ',',
  [{ col: 0, model: { kind: 'workdays' } }]);

// a line with n-L fields in the SOURCE is ambiguous and must be refused
exact('source already has n-L fields', ['a,b', '1,2', '3', '4,5', '6,7', '8,9', '10,11'].join('\n') + '\n',
  2, ',', [{ col: 0, model: { kind: 'above' } }]);

// ragged rows are copied, not modelled
exact('ragged rows', ['a,b', '1,2', '3,4', 'not-a-record', '5,6', '7,8', '9,10', '11,12'].join('\n') + '\n',
  2, ',', [{ col: 0, model: { kind: 'int', step: 2 } }]);

// an `int` step that changes the digit width cannot be predicted: the line goes literal
exact('width overflow is literal', ['n,v', '98,a', '99,b', '100,c', '101,d', '102,e', '103,f']
  .join('\n') + '\n', 2, ',', [{ col: 0, model: { kind: 'int', step: 1 } }]);

exact('zero padded counter', ['k,v', 'user_0001,a', 'user_0002,b', 'user_0003,c',
  'user_0004,d', 'user_0005,e', 'user_0006,f'].join('\n') + '\n', 2, ',',
  [{ col: 0, model: { kind: 'int', step: 1 } }]);

exact('negative numbers', ['n,v', '-3,a', '-2,b', '-1,c', '0,d', '1,e', '2,f'].join('\n') + '\n',
  2, ',', [{ col: 0, model: { kind: 'int', step: 1 } }]);

exact('tab separated', ['a\tb\tc', '1\tx\tp', '2\tx\tq', '3\tx\tr', '4\tx\ts', '5\tx\tt',
  '6\tx\tu'].join('\n') + '\n', 3, '\t',
  [{ col: 0, model: { kind: 'int', step: 1 } }, { col: 2, model: { kind: 'int', step: 1 } }]);

exact('pipe separated with spaces', ['| a | b |', '| 1 | x |', '| 2 | x |', '| 3 | x |',
  '| 4 | x |', '| 5 | x |', '| 6 | x |'].join('\n') + '\n', 4, '|',
  [{ col: 1, model: { kind: 'int', step: 1 } }]);

exact('above with an empty field', ['a,b', 'k,1', 'k,2', 'k,3', ',4', 'k,5', 'k,6'].join('\n') + '\n',
  2, ',', [{ col: 0, model: { kind: 'above' } }]);

exact('copy of an earlier column', ['a,b,c', '9,1,1', '9,2,2', '9,3,3', '9,4,4', '9,5,5', '9,6,6']
  .join('\n') + '\n', 3, ',', [{ col: 2, model: { kind: 'col', src: 1 } }, { col: 0, model: { kind: 'above' } }]);

exact('blank lines between records', ['a,b', '1,x', '', '2,y', '3,z', '', '4,w', '5,v'].join('\n') + '\n',
  2, ',', [{ col: 0, model: { kind: 'int', step: 1 } }]);

exact('trailing eol variants', 'a,b\n1,x\r\n2,y\n3,z\r\n4,w\n5,v\r\n', 2, ',',
  [{ col: 0, model: { kind: 'int', step: 1 } }]);

// a date model on a column that is not a date must simply never fire
exact('date model on non-dates', ['a,b', 'x,1', 'y,2', 'z,3', 'w,4', 'v,5', 'u,6'].join('\n') + '\n',
  2, ',', [{ col: 0, model: { kind: 'workdays' } }]);

// ---------------------------------------------------------------------------
// 3. header grammar
// ---------------------------------------------------------------------------
ok('parse <2|,|1=workdays>', (() => {
  const c = apographeParseHeader('<2|,|1=workdays>', '<', '>')!;
  return c && c.n === 2 && c.sep === ',' && c.lifts.length === 1 && c.lifts[0].model.kind === 'workdays';
})());
ok('parse <5|;|2=+1|3=col2>', (() => {
  const c = apographeParseHeader('<5|;|2=+1|3=col2>', '<', '>')!;
  return c && c.n === 5 && c.sep === ';' && c.lifts.length === 2
    && c.lifts[0].model.kind === 'int' && c.lifts[1].model.kind === 'col';
})());
ok('reject colM pointing right', apographeParseHeader('<3|,|1=col2>', '<', '>') === null);
ok('reject duplicate column', apographeParseHeader('<3|,|1=above|1=above>', '<', '>') === null);
ok('reject column out of range', apographeParseHeader('<2|,|3=above>', '<', '>') === null);
ok('reject unknown model', apographeParseHeader('<2|,|1=magic>', '<', '>') === null);
ok('reject header without lifts', apographeParseHeader('<2|,|>', '<', '>') === null);
ok('reject n=1', apographeParseHeader('<1|,|1=above>', '<', '>') === null);

// a source whose first line already starts with '<' must not be transformed
const xml = ['<root>', '<row>1</row>', '<row>2</row>', '<row>3</row>', '<row>4</row>',
  '<row>5</row>', '<row>6</row>'].join('\n') + '\n';
let planXml = null;
try { planXml = apographePlan(xml, 'o200k_base' as any); } catch { planXml = 'threw'; }
ok('xml first line is refused', planXml === null);

// ---------------------------------------------------------------------------
// 4. seeded fuzz: random record sets must never break the round trip
// ---------------------------------------------------------------------------
let seed = 0x9e3779b9;
const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 0x100000000;
let fuzzRun = 0, fuzzExact = 0, fuzzRefused = 0;
const seps = [',', '\t', '|', ';'];
for (let t = 0; t < 300; t++) {
  const sep = seps[Math.floor(rnd() * seps.length)];
  const n = 2 + Math.floor(rnd() * 3);
  const rows = 4 + Math.floor(rnd() * 12);
  const kind = Math.floor(rnd() * 4);
  const out: string[] = [];
  let num = Math.floor(rnd() * 90) + 1;
  let day = dayNumber(2014, 1, 1) + Math.floor(rnd() * 300);
  const eol = rnd() < 0.2 ? '\r\n' : '\n';
  for (let r = 0; r < rows; r++) {
    const f: string[] = [];
    for (let c = 0; c < n; c++) {
      if (c === 0 && kind === 0) f.push(formatDate(day));
      else if (c === 0 && kind === 1) f.push(String(num));
      else if (c === 1 && n > 1) f.push(rnd() < 0.7 ? 'X' : 'Y');
      else f.push(Math.floor(rnd() * 1000).toString(36));
    }
    out.push(f.join(sep));
    if (kind === 0) day = nextWorkday(day);
    if (kind === 1) num += 1;
  }
  const text = out.join(eol) + (rnd() < 0.8 ? eol : '');
  const lifts = kind === 0
    ? [{ col: 0, model: { kind: 'workdays' } }]
    : kind === 1 ? [{ col: 0, model: { kind: 'int', step: 1 } }]
      : kind === 2 ? [{ col: 1, model: { kind: 'above' } }]
        : [{ col: 1, model: { kind: 'above' } }, { col: 0, model: { kind: 'int', step: 1 } }];
  fuzzRun++;
  const ap = apographeApply(lines(text), cfg(n, sep, lifts) as any);
  if (ap === null) { fuzzRefused++; continue; }
  const back = apographeUndo(ap.text);
  if (back === text) fuzzExact++;
  else { fail++; fails.push(`fuzz#${t} :: ${JSON.stringify(firstDiff(text, back))}`); }
}
ok('fuzz applied cases all exact', fuzzExact + fuzzRefused === fuzzRun,
  `${fuzzExact} exact, ${fuzzRefused} refused, ${fuzzRun} run`);

// ---------------------------------------------------------------------------
// 5. end-to-end on a small real lane (parent is cheap here)
// ---------------------------------------------------------------------------
function roundTrip(name: string, path: string) {
  const text = fs.readFileSync(path, 'utf8');
  const r: any = apographeEncode(text, 'o200k_base');
  const back = apographeDecode(r.wire, {
    stats: r.stats, order: r.order,
    undo: r.parent === 'identity' ? (w: string) => w : chironDecode,
  }, { alphabet: r.alphabet, marker: r.marker, marker2: r.marker2, group: r.syncopeGroup, framing: r.framing });
  ok(name + ' end-to-end', back === text, `${r.messageTokens} tokens, apo=${r.apographe}`);
}

roundTrip('psql-output', 'bench/holdout-tbl/psql-output.txt');

console.log(`\nAPOGRAPHE red team: ${pass} passed, ${fail} failed`);
if (fails.length) { console.log('FAILURES:'); for (const f of fails) console.log('  ' + f); }
process.exit(fail ? 1 : 0);
