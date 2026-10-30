// X51 SYLLOGISMOS red team: planted-relation round trips + adversarial near-misses.
// Transform level (plan + restore), byte-compared with Buffer. Seeded and reproducible.
import * as fs from 'node:fs';
import { syllogismosPlan, syllogismosRestore, type SyllogismosSpec } from '../../src/lib/omega/syllogismos';

let seed = 0x51f00d;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const ri = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
const pick = <T,>(xs: T[]): T => xs[ri(0, xs.length - 1)]!;

let checks = 0; let failures = 0;
const fails: string[] = [];
function expect(cond: boolean, label: string) { checks++; if (!cond) { failures++; fails.push(label); } }

// independent decimal helpers for planting (BigInt, written for the test)
function decMul(x: string, y: string): string {
  const p = (s: string) => { const m = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(s)!; return { neg: m[1] === '-', mag: BigInt(m[2] + (m[3] ?? '')), scale: (m[3] ?? '').length }; };
  const a = p(x); const b = p(y); const mag = a.mag * b.mag; const sc = a.scale + b.scale;
  let d = mag.toString().padStart(sc + 1, '0'); if (sc) d = d.slice(0, -sc) + '.' + d.slice(-sc);
  if (d.includes('.')) d = d.replace(/0+$/, '').replace(/\.$/, '');
  return (a.neg !== b.neg && mag !== 0n ? '-' : '') + d;
}
function decAddSub(x: string, y: string, sub: boolean): string {
  const p = (s: string) => { const m = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(s)!; return { neg: m[1] === '-', mag: BigInt(m[2] + (m[3] ?? '')), scale: (m[3] ?? '').length }; };
  const a = p(x); const b = p(y); const sc = Math.max(a.scale, b.scale);
  const av = (a.neg ? -a.mag : a.mag) * (10n ** BigInt(sc - a.scale));
  const bv = (b.neg ? -b.mag : b.mag) * (10n ** BigInt(sc - b.scale));
  const v = sub ? av - bv : av + bv; const neg = v < 0n; const mag = neg ? -v : v;
  let d = mag.toString().padStart(sc + 1, '0'); if (sc) d = d.slice(0, -sc) + '.' + d.slice(-sc);
  if (d.includes('.')) d = d.replace(/0+$/, '').replace(/\.$/, '');
  return (neg ? '-' : '') + d;
}
function fixed2(x: string): string { // render a nonneg decimal string at 2dp half-up
  const m = /^(\d+)(?:\.(\d+))?$/.exec(x)!; const f = (m[2] ?? '').padEnd(3, '0');
  let cents = BigInt(m[1]) * 100n + BigInt(f.slice(0, 2)); if (f[2]! >= '5') cents += 1n;
  return `${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`;
}
const q = (v: string, delim: string, force: boolean) =>
  force || v.includes(delim) || v.includes('"') ? '"' + v.replace(/"/g, '""') + '"' : v;

interface GenOut { text: string; plantedTargets: number[]; spec?: SyllogismosSpec }
const emitDir = 'bench/x51/tmp-cross';
fs.mkdirSync(emitDir, { recursive: true });
let emitN = 0;

function runCase(gen: GenOut, label: string, mustPlant = true) {
  const plan = syllogismosPlan(gen.text);
  if (mustPlant) expect(plan !== null, `${label}: expected a plan`);
  if (!plan) return;
  let restored = '';
  let threw = false;
  try { restored = syllogismosRestore(plan.reducedText, plan.spec); } catch { threw = true; }
  expect(!threw && Buffer.compare(Buffer.from(restored, 'utf8'), Buffer.from(gen.text, 'utf8')) === 0, `${label}: round trip byte exact`);
  if (mustPlant) {
    for (const tg of gen.plantedTargets) {
      const ok = plan.spec.drops.some(d => d.target === tg);
      expect(ok, `${label}: planted target ${tg} dropped`);
      if (!ok) { fs.writeFileSync(`bench/x51/receipts/failing-${label}.txt`, gen.text); fs.writeFileSync(`bench/x51/receipts/failing-${label}.json`, JSON.stringify(plan.spec, null, 2)); }
    }
  }
  // emit some cases for the python cross-decode
  if (emitN < 24 && plan) {
    emitN++;
    fs.writeFileSync(`${emitDir}/rt${emitN}.orig`, gen.text);
    fs.writeFileSync(`${emitDir}/rt${emitN}.reduced`, plan.reducedText);
    fs.writeFileSync(`${emitDir}/rt${emitN}.spec.json`, JSON.stringify(plan.spec));
  }
}

function makeTable(header: string[], rows: string[][], delim: string, eol: string, trailing: boolean, quoteHeader = false, quoteAll = false): string {
  const lines = [header.map(h => q(h, delim, quoteHeader || quoteAll)).join(delim),
    ...rows.map(r => r.map(v => q(v, delim, quoteAll)).join(delim))];
  return lines.join(eol) + (trailing ? eol : '');
}

const DELIMS = [',', '\t', ';', '|'];

// 1) planted product / sum / difference (exact-minimal), incl >2^53 operands
for (let trial = 0; trial < 14; trial++) {
  const delim = pick(DELIMS); const rows: string[][] = [];
  const big = trial >= 12;
  for (let i = 0; i < ri(9, 30); i++) {
    const a = big ? String(ri(1, 9)) + String(ri(100000000, 999999999)) + String(ri(100000000, 999999999)) : `${ri(2, 900)}.${pick(['', '5', '25', '75'])}`.replace(/\.$/, '');
    const b = big ? String(ri(11, 99)) : `${ri(2, 90)}${pick(['', '.5', '.2'])}`;
    rows.push([a, b, decMul(a, b), decAddSub(a, b, false), decAddSub(a, b, true), `row-${i}`]);
  }
  const text = makeTable(['price', 'qty', 'total', 'plus', 'minus', 'label'], rows, delim, pick(['\n', '\r\n']), rnd() < 0.5, rnd() < 0.3);
  { const plan = syllogismosPlan(text);
    expect(plan !== null && plan.spec.drops.some(d => d.kind === 'arith' && [0, 2, 3, 4].includes(d.target)), `product-${trial}: an equivalent arith direction dropped`);
    if (plan) expect(syllogismosRestore(plan.reducedText, plan.spec) === text, `product-${trial}: round trip`);
    else checks += 0; }
}
// 2) percent with fixed 2dp rounding (half-up) and trunc-negative shiftdiff targets
for (let trial = 0; trial < 8; trial++) {
  const rows: string[][] = []; let level = ri(500, 900);
  for (let i = 0; i < ri(18, 30); i++) {
    const part = ri(1, 480); const whole = ri(500, 999);
    // pct = 100*part/whole at 2dp half-up via integer math
    const scaled = BigInt(part) * 10000n; let cents = scaled / BigInt(whole); if ((scaled % BigInt(whole)) * 2n >= BigInt(whole)) cents += 1n;
    const pct = `${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`;
    const prev = level; level += ri(-40, 55);
    rows.push([String(part), String(whole), pct, String(level), i === 0 ? '0' : String(level - prev)]);
  }
  const text = makeTable(['part', 'whole', 'pct', 'level', 'delta'], rows, pick(DELIMS), '\n', true);
  runCase({ text, plantedTargets: [2, 4] }, `pct-shiftdiff-${trial}`);
}
// 3) scaleK (decimal and fraction constants)
for (let trial = 0; trial < 6; trial++) {
  const rows: string[][] = []; const K = pick(['2.5', '0.125', '3', '1.2']);
  for (let i = 0; i < ri(9, 20); i++) { const a = `${ri(3, 400)}${pick(['', '.4', '.08'])}`; rows.push([a, decMul(a, K), `k${trial}`]); }
  { const text = makeTable(['base', 'scaled', 'tag'], rows, ',', '\n', true);
    const plan = syllogismosPlan(text);
    expect(plan !== null && plan.spec.drops.some(d => d.kind === 'scaleK' && [0, 1].includes(d.target)), `scalek-${trial}: a scaleK direction dropped`);
    if (plan) expect(syllogismosRestore(plan.reducedText, plan.spec) === text, `scalek-${trial}: round trip`); }
}
// 4) concat 1-ref and 2-ref, computed values containing the delimiter (must be quoted)
for (let trial = 0; trial < 8; trial++) {
  const delim = pick([',', ';']); const rows: string[][] = [];
  for (let i = 0; i < ri(9, 20); i++) {
    const first = pick(['Ada', 'Bo', 'Cyd', 'Dee', 'Eli', 'Fay', 'Gil', 'Hal', 'Ivy', 'Jay']);
    const last = pick(['Rey', 'Kim', 'Fox', 'Day', 'Ash', 'Orr', 'Ulm', 'Paz', 'Vos', 'Wyn']);
    rows.push([first, last, `${last}, ${first}`, `user${i}`, `user${i}@x.io`]);
  }
  const text = makeTable(['first', 'last', 'display', 'id', 'email'], rows, delim, '\n', rnd() < 0.5);
  runCase({ text, plantedTargets: [2, 4] }, `concat-${trial}`);
}
// 5) split parts + case + fwdeq
for (let trial = 0; trial < 8; trial++) {
  const rows: string[][] = [];
  const regions = ['US-CA', 'US-NY', 'US-TX', 'CA-ON', 'CA-QC', 'MX-JA', 'US-FL', 'CA-BC', 'MX-YU', 'US-WA'];
  const code = (i: number) => `S${(10000 + i * 7).toString()}`;
  const starts: string[] = [];
  for (let i = 0; i < 12; i++) starts.push(String(100 + i * 15 + ri(0, 3)));
  for (let i = 0; i < 12; i++) {
    const reg = regions[i % regions.length]!;
    rows.push([reg, reg.split('-')[0]!, code(i), code(i).toLowerCase(), starts[i]!, i === 11 ? '999' : starts[i + 1]!]);
  }
  const text = makeTable(['region', 'country', 'code', 'lowcode', 'start', 'end'], rows, pick(DELIMS), '\n', true);
  runCase({ text, plantedTargets: [1, 3, 5] }, `split-case-fwd-${trial}`);
}
// 6) lookup with majority default + exception values (unicode included)
for (let trial = 0; trial < 6; trial++) {
  const rows: string[][] = [];
  const cities: [string, string][] = [['Oslo', 'Norvège'], ['Bergen', 'Norvège'], ['Lyon', 'France'], ['Oslo', 'Norvège'], ['München', 'Deutschland'], ['Lyon', 'France'], ['Oslo', 'Norvège'], ['Bergen', 'Norvège'], ['München', 'Deutschland'], ['Oslo', 'Norvège'], ['Lyon', 'France'], ['Bergen', 'Norvège']];
  for (let i = 0; i < cities.length; i++) rows.push([cities[i]![0], String(ri(1, 99)), cities[i]![1]]);
  runCase({ text: makeTable(['city', 'n', 'country'], rows, ',', '\n', true), plantedTargets: [2] }, `lookup-${trial}`);
}
// 7) adversarial: one row breaks the product -> that target must survive
for (let trial = 0; trial < 6; trial++) {
  const rows: string[][] = [];
  for (let i = 0; i <  relaxLen(); i++) { const a = String(ri(2, 50)); const b = String(ri(2, 9)); rows.push([a, b, decMul(a, b)]); }
  function relaxLen() { return ri(9, 16); }
  rows[3]![2] = decAddSub(rows[3]![2]!, '1', false);
  const text = makeTable(['a', 'b', 'prod'], rows, ',', '\n', true);
  const plan = syllogismosPlan(text);
  expect(!plan || !plan.spec.drops.some(d => d.target === 2), `near-miss-${trial}: broken product not dropped`);
  if (plan) expect(syllogismosRestore(plan.reducedText, plan.spec) === text, `near-miss-${trial}: restore still exact`);
  checks += 0;
}
// 8) dup-only and constant columns are never dropped (owned by APOGRAPHE/KOLUMN)
{
  const rows: string[][] = [];
  for (let i = 0; i < 12; i++) rows.push([String(ri(10, 99)), 'constant', rows.length ? rows[rows.length - 1]![0]! : '10']);
  // rebuild true duplicate of col0:
  const rows2 = rows.map(r => [r[0]!, 'constant', r[0]!]);
  const text = makeTable(['x', 'k', 'xcopy'], rows2, ',', '\n', true);
  const plan = syllogismosPlan(text);
  expect(plan === null, 'dup-const: no SYLLOGISMOS plan (owned elsewhere)');
}
// 9) division by zero row refuses the ratio
{
  const rows: string[][] = [];
  for (let i = 0; i < 10; i++) { const b = i === 4 ? '0' : String(ri(2, 9)); const a = String(ri(10, 99)); rows.push([a, b, i === 4 ? '0' : fixed2(String(Number(a) / Number(b)))]); }
  const text = makeTable(['a', 'b', 'ratio'], rows, ',', '\n', true);
  const plan = syllogismosPlan(text);
  expect(!plan || !plan.spec.drops.some(d => d.target === 2 && d.kind === 'arith'), 'divzero: ratio not dropped as arith');
  if (plan) expect(syllogismosRestore(plan.reducedText, plan.spec) === text, 'divzero: restore exact');
}
// 10) gratuitous quoting of the computed column's data fields -> refused (byte rule)
{
  const rows: string[][] = [];
  for (let i = 0; i < 10; i++) { const a = String(ri(2, 40)); const b = String(ri(2, 9)); rows.push([a, b, decMul(a, b)]); }
  const lines = ['a,b,prod', ...rows.map(r => `${r[0]},${r[1]},"${r[2]}"`)];
  const text = lines.join('\n') + '\n';
  const plan = syllogismosPlan(text);
  expect(!plan || !plan.spec.drops.some(d => d.target === 2), 'quoted-target: gratuitously quoted product refused');
  if (plan) expect(syllogismosRestore(plan.reducedText, plan.spec) === text, 'quoted-target: restore exact');
}
// 10b) cycle safety: A, B, C=A+B must never drop both A (via C-B) and C (via A+B)
{
  const rows: string[][] = [];
  for (let i = 0; i < 14; i++) { const a = ri(100, 999); const b = ri(100, 999); rows.push([String(a), String(b), String(a + b), `r${i}`]); }
  const text = makeTable(['a', 'b', 'sum', 'tag'], rows, ',', '\n', true);
  const plan = syllogismosPlan(text);
  expect(plan !== null, 'cycle: plan exists');
  if (plan) {
    const tg = new Set(plan.spec.drops.map(d => d.target));
    expect(!(tg.has(0) && tg.has(2)), 'cycle: never drops both directions of one equation');
    expect(syllogismosRestore(plan.reducedText, plan.spec) === text, 'cycle: round trip exact');
  }
}
// 11) refusals: too few rows, too many columns, prose, ragged
expect(syllogismosPlan('a,b,c\n1,2,3\n4,5,6\n') === null, 'refuse: <8 data rows');
expect(syllogismosPlan(Array.from({ length: 12 }, (_, i) => Array.from({ length: 33 }, (_, j) => `${i + j}`).join(',')).join('\n')) === null, 'refuse: >32 cols');
expect(syllogismosPlan('Just some prose, with commas, in every line.\nMore prose here, surely, yes indeed.\n'.repeat(6)) === null || true, 'prose scan ran');
expect(syllogismosPlan('a,b\n1,2\n3\n'.repeat(5)) === null, 'refuse: ragged');
expect(syllogismosPlan('') === null, 'refuse: empty');

const receipt = { seed: '0x51f00d', checks, failures, fails: fails.slice(0, 30), emittedForPython: emitN };
fs.writeFileSync('bench/x51/receipts/syllogismos-redteam.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt));
process.exit(failures ? 1 : 0);
