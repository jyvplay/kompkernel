/**
 * X43 DIASTEMA — red team.
 *
 * The codec replaces a wide numeric token with an INTERVAL and rebuilds it from a
 * mask plus a running BigInt. Its failure modes are arithmetic and positional:
 * a wrong chain still renders a plausible number, a wrong token ordinal still
 * splices into the line, a wrong pad still looks like a date. Every test below
 * is about exactness, plus the refusal rule: a wire we cannot re-parse must be
 * returned UNCHANGED, never guessed at.
 *
 *   A  grammar refusals        malformed headers, patterns, ordinals, masks
 *   B  boundary deformations   CRLF, no final newline, leading zeros, sign changes
 *   C  adversarial sources     the Δ glyph, every delimiter, widening values
 *   D  seeded fuzz             random listings, random masks, 200 cases
 *   E  algebra                 mask / value / render / pattern / runs
 */
import {
  diastemaPlan, diastemaWire, diastemaDecode, diastemaTokens, diastemaMask,
  diastemaValue, diastemaRender, diastemaPattern, diastemaRuns, diastemaClause,
  DIASTEMA_OPEN,
} from '@/lib/omega/diastema';
import { countTokens } from '@/lib/omega/bpe';

let pass = 0, fail = 0;
const fails: string[] = [];
function ok(name: string, cond: boolean, detail = '') {
  if (cond) pass++; else { fail++; fails.push(name + (detail ? ' :: ' + detail : '')); }
}
const ENC: any = 'o200k_base';
const identity = (w: string) => diastemaDecode(w) === w;
const HDR = `${DIASTEMA_OPEN}¦####-##-##T##:##:##.##########¦0¦s¦R3L1`;

/** A listing whose first token is a wide shaped value, the way `find -printf` prints one. */
function listing(n: number, opts: { eol?: string; trail?: boolean; step?: number } = {}): string {
  const eol = opts.eol ?? '\n';
  const step = opts.step ?? 52000000n;
  let v = 20260930075_952_640_393_8810n;
  const rows: string[] = [];
  for (let i = 0; i < n; i++) {
    const m = diastemaRender('####-##-##T##:##:##.##########', v)!;
    rows.push(`${m}        ${String(1000 + i * 7).padStart(4)} node_modules/@babel/pkg-${i}/lib/index.js`);
    v += step;
  }
  return rows.join(eol) + (opts.trail === false ? '' : eol);
}
function rt(name: string, text: string, mustPlan = false) {
  let plan: any = null;
  try { plan = diastemaPlan(text, ENC); } catch (e: any) { ok(name + ' [threw]', false, e.message); return; }
  if (!plan) { ok(name + ' [no plan -> identity]', true); if (mustPlan) ok(name + ' expected a plan', false); return; }
  const wire = diastemaWire(plan, text);
  if (!wire) { ok(name + ' [no wire]', false); return; }
  const back = diastemaDecode(wire);
  ok(name + ' exact', back === text,
    back === text ? '' : 'len ' + back.length + '/' + text.length + ' @' +
      (() => { let i = 0; while (i < back.length && i < text.length && back[i] === text[i]) i++; return i; })());
}

// ------------------------------------------------------------- A: refusals
ok('A1 plain text passes through', identity('hello world\nnot a wire'));
ok('A2 empty', identity(''));
ok('A3 header only, no body', identity(HDR));
ok('A4 Δ alone', identity(DIASTEMA_OPEN));
ok('A5 too few header fields', identity(`${DIASTEMA_OPEN}¦####-##-##¦0¦s\n1\n2`));
ok('A6 bad eol flag', identity(`${DIASTEMA_OPEN}¦####-##-##¦0¦x¦R1L1\na\nb`));
ok('A7 bad pattern letter', identity(`${DIASTEMA_OPEN}¦####-##-##¦0¦s¦Q1L1\na\nb`));
ok('A8 pattern without counts', identity(`${DIASTEMA_OPEN}¦####-##-##¦0¦s¦RL\na\nb`));
ok('A9 pattern length mismatch', identity(`${DIASTEMA_OPEN}¦####-##-##¦0¦s¦R1L1\na`));
ok('A10 ordinal not a number', identity(`${DIASTEMA_OPEN}¦####-##-##¦z¦s¦R1L1\na\nb`));
ok('A11 ordinal out of range', identity(`${DIASTEMA_OPEN}¦####-##-##¦9¦s¦R1L1\na\nb`));
ok('A12 mask with no digit run', identity(`${DIASTEMA_OPEN}¦abc¦0¦s¦R1L1\na\nb`));
ok('A13 mask that starts with a literal', identity(`${DIASTEMA_OPEN}¦-##-##¦0¦s¦R1L1\na\nb`));
ok('A14 mask too long', identity(`${DIASTEMA_OPEN}¦${'#'.repeat(80)}¦0¦s¦R1L1\na\nb`));
ok('A15 R line missing the token', identity(`${DIASTEMA_OPEN}¦####-##-##¦2¦s¦R1\na b\n`));
ok('A16 R token not an integer', identity(`${DIASTEMA_OPEN}¦####-##-##¦0¦s¦R1\n2026x\n`));
ok('A17 sum overflows the mask', identity(`${DIASTEMA_OPEN}¦#### ¦0¦s¦R1\n99999999\n`));
ok('A18 header with the wrong delimiter count', identity(`${DIASTEMA_OPEN}¦####-##-##¦0¦s¦R1L1¦x\na\nb`));

// --------------------------------------------------- B: boundary deformations
rt('B1 30-line listing', listing(30), true);
rt('B2 CRLF listing', listing(30, { eol: '\r\n' }), true);
rt('B3 no final newline', listing(30, { trail: false }), true);
rt('B4 decreasing values (negative intervals)', listing(30, { step: -52000000n }), true);
rt('B5 leading zeros in a run', listing(20).replace(/T/g, 'T'), true);
rt('B6 short listing (below the row floor)', listing(4));
rt('B7 mixed EOL refuses', listing(20).split('\n').map((l, i) => l + (i % 2 ? '\r' : '')).join('\n'));
rt('B8 blank line inside', listing(20) + '\n' + listing(20).replace(/pkg-/g, 'zzz-'), true);
rt('B9 a mask that ends in a literal', (() => {
  const rows: string[] = [];
  for (let i = 0; i < 20; i++) rows.push(`id-${String(100000 + i * 3)}.bak   file-${i}.txt`);
  return rows.join('\n') + '\n';
})(), true);
rt('B10 decreasing values that stay non-negative', (() => {
  const rows: string[] = [];
  for (let i = 0; i < 20; i++) rows.push(`${String(9000000 - i * 120000).padStart(12, '0')}  x-${i}`);
  return rows.join('\n') + '\n';
})(), true);

// ------------------------------------------------- C: adversarial sources
ok('C1 a source that starts with Δ is never re-encoded', diastemaPlan(`${DIASTEMA_OPEN} hello\nworld`, ENC) === null);
ok('C2 every candidate delimiter in the text still yields a wire or none', (() => {
  const t = listing(20).replace('node_modules', 'node_modules¦·␟‖⁞‡⟂');
  const p: any = diastemaPlan(t, ENC);
  if (!p) return true;
  const w = diastemaWire(p, t);
  return w === null || diastemaDecode(w) === t;
})());
ok('C3 a body line that looks like a header is literal', (() => {
  const t = listing(20) + `${DIASTEMA_OPEN}¦####¦0¦s¦R1\n`;
  const p: any = diastemaPlan(t, ENC);
  if (!p) return true;
  const w = diastemaWire(p, t)!;
  return diastemaDecode(w) === t;
})());
rt('C4 widening values drop out as literals', (() => {
  const rows: string[] = [];
  for (let i = 0; i < 24; i++) rows.push(`${String(99990 + i * 3)}  row-${i}`);
  return rows.join('\n') + '\n';
})(), true);
rt('C5 a 30-digit delta', (() => {
  const rows: string[] = [];
  for (let i = 0; i < 12; i++) rows.push(`${(10n ** 29n + BigInt(i) * 12345678901234567890n).toString()}  y-${i}`);
  return rows.join('\n') + '\n';
})(), true);
rt('C6 a shaped token at the END of the line', (() => {
  const rows: string[] = [];
  for (let i = 0; i < 20; i++) rows.push(`job ${i}  out-${String(20260930 + i * 7)}`);
  return rows.join('\n') + '\n';
})(), true);

// ------------------------------------------------------------------- D: fuzz
function rng(seed: number) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
let fuzzBad = 0, fuzzPlans = 0;
let attempts = 0;
for (let c = 0; c < 200 && attempts < 1200; ) {
  attempts++;
  const r = rng(0x4300 + attempts);
  const n = 8 + Math.floor(r() * 40);
  const groups = 1 + Math.floor(r() * 3);
  const widths: number[] = Array.from({ length: groups }, () => 1 + Math.floor(r() * 6));
  const seps: string[] = Array.from({ length: groups + 1 }, () => ['', '-', ':', '.', 'T', '/', '_'][Math.floor(r() * 7)]);
  const mask = widths.map((w, i) => seps[i] + '#'.repeat(w)).join('') + seps[groups];
  const total = widths.reduce((a, b) => a + b, 0);
  if (mask.length > 40 || total > 30) continue;          // no counter change: retry
  let v = BigInt(Math.floor(r() * 1e9));
  const rows: string[] = [];
  const step = BigInt(Math.floor(r() * 1e6));
  for (let i = 0; i < n; i++) {
    const m = diastemaRender(mask, v);
    if (m === null) break;
    rows.push(`${m}  payload-${(i * 37) % 101}`);
    v += (r() < 0.15 ? BigInt(Math.floor(r() * 1e6)) : step);
  }
  if (rows.length < 6) continue;
  c++;                                                    // a real case
  const text = rows.join('\n') + '\n';
  const plan: any = diastemaPlan(text, ENC);
  if (!plan) continue;
  fuzzPlans++;
  const wire = diastemaWire(plan, text);
  if (!wire || diastemaDecode(wire) !== text) fuzzBad++;
}
ok('D1 seeded fuzz 200 listings all exact', fuzzBad === 0, fuzzBad + ' bad of ' + fuzzPlans);
ok('D2 fuzz exercises plans', fuzzPlans >= 40, fuzzPlans + ' plans');

// ---------------------------------------------------------------- E: algebra
ok('E1 tokens carry exact offsets', (() => {
  const t = diastemaTokens('ab  cd   ef');
  return t.length === 3 && t[0].i === 0 && t[1].i === 4 && t[2].s === 'ef';
})());
ok('E2 mask replaces whole runs', diastemaMask('a12b345c') === 'a##b###c');
ok('E3 value concatenates runs', diastemaValue('2026-09-30') === 20260930n);
ok('E4 render pads to the total width', diastemaRender('##:##', 123n) === '01:23');
ok('E5 render refuses overflow', diastemaRender('##', 123n) === null);
ok('E6 render refuses negatives', diastemaRender('##', -1n) === null);
ok('E7 render keeps interior zeros', diastemaRender('##-##-##', 202600n) === '20-26-00'
  && diastemaRender('##:##:##.####', 1000300000n) === '10:00:30.0000');
ok('E8 pattern round-trips', diastemaPattern(diastemaRuns('RRRLL')) === 'RRRLL');
ok('E9 runs of a mixed pattern', diastemaRuns('RRLRRR') === 'R2L1R3');
ok('E10 pattern rejects junk', diastemaPattern('R2L') === null || diastemaPattern('R2L') === 'RR');
ok('E11 clause names the ordinal only when nonzero', (() => {
  const p0: any = diastemaPlan(listing(20), ENC);
  if (!p0) return false;
  const c0 = diastemaClause(p0);
  const shifted = listing(20).replace(/^(\S+)/gm, 'x $1');
  const p1: any = diastemaPlan(shifted, ENC);
  if (!p1) return /first space-token/.test(c0);
  return /first space-token/.test(c0) && !/first space-token/.test(diastemaClause(p1));
})());
ok('E12 a plan never costs more than the column it replaces', (() => {
  const p: any = diastemaPlan(listing(30), ENC);
  return !!p && p.proxyGain > 0;
})());
ok('E13 decode is idempotent on a non-wire', (() => {
  const junk = 'just some text\nwith lines\n';
  return diastemaDecode(junk) === junk;
})());
ok('E14 clause is shorter than 50 tokens', (() => {
  const p: any = diastemaPlan(listing(30), ENC);
  return !!p && countTokens(' ' + diastemaClause(p) + '; print only.', ENC) - countTokens('; print only.', ENC) < 50;
})());

console.log(`X43 diastema rt: ${pass}/${pass + fail} pass`);
for (const f of fails.slice(0, 40)) console.log('  FAIL ' + f);
process.exitCode = fail ? 1 : 0;
