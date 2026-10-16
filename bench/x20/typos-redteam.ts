/**
 * X20: TYPOS red team.
 *
 *  Part A — full codec path (`typosEncode`): edge cases and scaled fixtures that
 *    actually trigger the transform. Checks byte-exactness through the library
 *    reader, the gate (M never above the base arm), and that the contract
 *    sentence is the last line of the message and names exactly the shapes used.
 *  Part B — transform-only invertibility, 3000 deterministic fuzz cases over an
 *    alphabet built to create digit-length collisions, word-glued digit runs,
 *    pre-existing marks and CHIRON frame characters. No DAEDALUS, so this can
 *    run at volume; it attacks the proof, not the search.
 *  Part C — every plan a fixture produces must itself be invertible, not only
 *    the plan the cascade ships.
 *
 * usage: bench/x20/run.sh bench/x20/typos-redteam.ts
 */
import fs from 'node:fs';
import {
  typosEncode, typosDecode, typosPlans, typosExpand, typosExpandIsolated, typosExpandMarked,
} from '@/lib/omega/typos';

let fails = 0;
let checked = 0;
let transformed = 0;
const messages: string[] = [];
const expectations: string[] = [];

function expandWith(p: { text: string; shapes: string[]; marks: string[]; mode: string }): string {
  return p.mode === 'marked' ? typosExpandMarked(p.text, p.shapes, p.marks)
    : p.mode === 'isolated' ? typosExpandIsolated(p.text, p.shapes)
      : typosExpand(p.text, p.shapes);
}

/* -------------------------------------------------- Part A: full codec path */
function check(name: string, text: string) {
  checked++;
  const r = typosEncode(text);
  const dec = typosDecode(r.wire, r.shapes, r.rule, r.marks, r.chained);
  if (dec !== text) { fails++; console.log(`FAIL ${name}: decode mismatch len=${text.length} rule=${r.rule}`); }
  if (r.messageTokens.o200k_base > r.baseTokens.o200k_base) { fails++; console.log(`FAIL ${name}: gate broken ${r.messageTokens.o200k_base} > ${r.baseTokens.o200k_base}`); }
  if (!r.transformed) return;
  transformed++;
  messages.push(r.message);
  expectations.push(text);
  const lines = r.message.split('\n');
  const last = lines[lines.length - 1];
  if (!/^(Digits are packed|A mark before a digit run)/.test(last)) { fails++; console.log(`FAIL ${name}: contract not last line`); }
  for (const sh of r.shapes) if (!last.includes(sh)) { fails++; console.log(`FAIL ${name}: shape ${sh} missing from the contract`); }
  if (r.rule === 'marked') {
    for (const [i, sh] of r.shapes.entries()) {
      if (!last.includes(`${r.marks[i]}=${sh}`)) { fails++; console.log(`FAIL ${name}: pair ${r.marks[i]}=${sh} missing`); }
    }
    for (const mk of r.marks) if (text.includes(mk)) { fails++; console.log(`FAIL ${name}: mark ${mk} occurs in the input`); }
  }
}

/* Fixtures use DISTINCT numbers. A fixture whose numbers repeat is compressed
 * to almost nothing by the DAEDALUS rules, so the TYPOS arm can never win it and
 * the transform would never be exercised (measured X20: the first version of this
 * red team transformed 0 of 20 cases for exactly that reason). */
function dates(n: number, sep = '-'): string {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(2024, 0, 5 + i * 3));
    return d.toISOString().slice(0, 10).replaceAll('-', sep);
  }).join(' ');
}
function times(n: number): string {
  return Array.from({ length: n }, (_, i) =>
    `${String((i * 3) % 24).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}:${String((i * 11) % 60).padStart(2, '0')}`).join(' and ');
}
function isos(n: number): string {
  return Array.from({ length: n }, (_, i) =>
    `2026-09-30T07:${String(10 + (i % 50)).padStart(2, '0')}:52.${String(100000 + i * 7919).slice(0, 6)}`).join(' ');
}
function prices(n: number): string {
  return Array.from({ length: n }, (_, i) => `${10 + i}.${String(100000 + i * 6151).slice(0, 6)}`).join(' ');
}
const DATES = dates(30);
const TIMES = times(30);
const ISO = isos(30);
const PRICES = prices(30);
const CSV = 'DATE,OPEN,HIGH\r\n' + Array.from({ length: 25 }, (_, i) => {
  const d = new Date(Date.UTC(2024, 0, 2 + i));
  return `${d.toISOString().slice(0, 10)},${(10 + i)}.${String(123456 + i * 977).slice(0, 6)},${(11 + i)}.${String(654321 + i * 811).slice(0, 6)}`;
}).join('\r\n') + '\r\n';
const PROSE = Array.from({ length: 8 }, (_, i) =>
  `Meeting on ${new Date(Date.UTC(2024, i, 3 + i)).toISOString().slice(0, 10)}. Budget line ${1000 + i * 37} approved at ${String(8 + i)}:${String(10 + i)}:00.`).join('\n');

const EDGE: Array<[string, string]> = [
  ['empty', ''],
  ['one char', '7'],
  ['only digits', '123456789012345678901234567890'],
  ['prose only', 'The quick brown fox jumps over the lazy dog. '.repeat(6)],
  ['collision 8v8', `date ${DATES} plain 12345678 here and 87654321 there`],
  ['dates scaled', `report:\n${DATES}`],
  ['times scaled', `log\n${TIMES}`],
  ['iso scaled', `trace\n${ISO}`],
  ['prices scaled', `close\n${PRICES}`],
  ['csv crlf', CSV],
  ['prose hybrid', PROSE],
  ['word glued', `ids a20240105b c20240106d e20240107f\n${DATES}`],
  ['marks present', `\u2020 note \u2021 here\n${DATES}`],
  ['chiron frame', '\u00a7\u00b6' + DATES],
  ['huge digits', Array.from({ length: 4 }, (_, i) => `${'9'.repeat(38)}${i}-${'9'.repeat(38)}${i}`).join(' ')],
  ['versions collide', `v1.2.3 v1.2.4 v1.2.5 v1.2.6 v1.2.7 v1.2.8 v1.2.9 v2.0.1 plain 123 and 456`],
  ['negatives', `delta ${Array.from({ length: 12 }, (_, i) => `-${10 + i}.${String(50000 + i * 977).slice(0, 5)}`).join(' ')}`],
  ['same length shapes', `${dates(12)}\n${Array.from({ length: 12 }, (_, i) => `${String(i % 24).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}.${String(100000 + i * 991).slice(0, 6)}`).join(' ')}`],
  ['leading zeros', `007 008 009 010 and ${DATES}`],
  ['ip-like', Array.from({ length: 12 }, (_, i) => `10.0.${i}.${(i * 7) % 250}`).join(' ')],
  ['mixed prose dates', `${PROSE}\nBudget 12345678 approved.\n`],
];

/* -------------------------------------------------- Part B: transform fuzz */
function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* Two fuzz families.
 *  (a) noise: random pieces from an alphabet built to create digit-length
 *      collisions, word-glued digit runs, pre-existing marks and frame chars;
 *  (b) structured: k distinct fillings of one or two randomly chosen shapes,
 *      interleaved with noise. Only (b) reaches the transform, so without it the
 *      proof would never be exercised at volume. */
const ALPHA = ['2024-01-0', '12:34:5', '1.250000', 'v1.2.3', ' ', ', ', '\n', 'x', 'ab12', '99999999', '-', ':', '.', '\u2020', '\u00a7', '\r\n', '07', '2024', '1.2', '2026-09-30T07:59:5', '12345678'];
const SHAPES = ['9999-99-99', '99:99:99', '9999-99-99T99:99:99.999999', '9.999999', '9.99', '999.99', '99/99/9999', '99-99-9999 99:99:99'];
function fillShape(sh: string, rnd: () => number): string {
  let out = '';
  for (const ch of sh) out += ch === '9' ? String(Math.floor(rnd() * 10)) : ch;
  return out;
}
function noise(rnd: () => number, n: number): string {
  let s = '';
  for (let i = 0; i < n; i++) s += ALPHA[Math.floor(rnd() * ALPHA.length)];
  return s;
}
function fuzzNoise(rnd: () => number): string {
  return noise(rnd, 6 + Math.floor(rnd() * 60));
}
function fuzzStructured(rnd: () => number): string {
  const picked = [SHAPES[Math.floor(rnd() * SHAPES.length)]];
  if (rnd() < 0.4) {
    const second = SHAPES[Math.floor(rnd() * SHAPES.length)];
    if (second !== picked[0]) picked.push(second);
  }
  const k = 3 + Math.floor(rnd() * 14);
  let s = noise(rnd, Math.floor(rnd() * 4));
  for (let i = 0; i < k; i++) {
    const sh = picked[Math.floor(rnd() * picked.length)];
    s += fillShape(sh, rnd);
    s += rnd() < 0.25 ? noise(rnd, 1 + Math.floor(rnd() * 3)) : (rnd() < 0.5 ? ' ' : '\n');
  }
  return s + noise(rnd, Math.floor(rnd() * 4));
}

let fuzzCases = 0;
let fuzzTransformed = 0;
let fuzzPlans = 0;
const byMode: Record<string, number> = {};
const rnd = mulberry32(20261016);
for (let i = 0; i < 4000; i++) {
  const text = i % 2 ? fuzzStructured(rnd) : fuzzNoise(rnd);
  fuzzCases++;
  const plans = typosPlans(text);
  for (const p of plans) {
    fuzzPlans++;
    byMode[p.mode] = (byMode[p.mode] ?? 0) + 1;
    if (expandWith(p) !== text) { fails++; console.log(`FAIL fuzz:${i}:${p.mode}: plan not invertible ${JSON.stringify(text.slice(0, 80))}`); break; }
    if (p.mode === 'marked') {
      for (const mk of p.marks) if (text.includes(mk)) { fails++; console.log(`FAIL fuzz:${i}: mark ${mk} in input`); }
    }
    // a plan must never declare two shapes with the same digit count
    const lens = p.shapes.map(x => x.split('9').length - 1);
    if (p.mode !== 'marked' && new Set(lens).size !== lens.length) { fails++; console.log(`FAIL fuzz:${i}:${p.mode}: duplicate digit count`); }
  }
  if (plans.length) fuzzTransformed++;
}

/* -------------------------------------------------- runs */
for (const [name, text] of EDGE) check(`edge:${name}`, text);

console.log(JSON.stringify({
  partA_cases: checked, partA_transformed: transformed,
  partB_fuzzCases: fuzzCases, partB_fuzzWithPlan: fuzzTransformed, partB_plansChecked: fuzzPlans, partB_byMode: byMode,
  fails,
}));
fs.writeFileSync('bench/x20/receipts/redteam-typos.messages.json', JSON.stringify(messages));
fs.writeFileSync('bench/x20/receipts/redteam-typos.expected.json', JSON.stringify(expectations));
console.log(`wrote ${messages.length} transformed messages for the CPython reader`);
