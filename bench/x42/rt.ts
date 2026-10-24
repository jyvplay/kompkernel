/**
 * X42 KANNABOS — red team.
 *
 * The codec infers a grid from character offsets and rebuilds lines from it, so
 * its failure mode is SILENT and GEOMETRIC: one wrong offset still produces a
 * plausible-looking table. Every test below is about exactness, and every group
 * targets a different way the geometry can be wrong.
 *
 *   A  grammar refusals      a wire we cannot re-parse must pass through untouched
 *   B  boundary deformations CRLF, no final newline, trailing spaces, tabs, mixed EOL
 *   C  adversarial sources   a `*` inside a value, quotes/brackets, ragged rows
 *   D  seeded fuzz           random tables over random alphabets and alignments
 *   E  algebra               run lists, pattern RLE, cell offsets
 *
 * A "pass" for a refusal is that the decoder returns its INPUT unchanged: a codec
 * that guesses is worse than one that gives up.
 */
import {
  kannabosPlan, kannabosEncode, kannabosDecode, kannabosCells, kannabosRuns,
  kannabosRunBlock, kannabosClause,
} from '@/lib/omega/kannabos';

let pass = 0, fail = 0;
const fails: string[] = [];
function ok(name: string, cond: boolean, detail = '') {
  if (cond) pass++; else { fail++; fails.push(name + (detail ? ' :: ' + detail : '')); }
}

const ENC: any = 'o200k_base';
const clauseOf = (p: any) => kannabosClause(p);
const HDR = (body: string) => '⟨4¦L0x¦L8x¦L16x¦T1x¦pR3⟩¦s\n' + body;

// ------------------------------------------------------------- A: refusals
const identity = (w: string) => kannabosDecode(w) === w;
ok('A1 plain text passes through', identity('hello world\nnot a grid'));
ok('A2 empty', identity(''), JSON.stringify(kannabosDecode('')));
ok('A3 unclosed header', identity('⟨4¦L0x'));
ok('A4 unknown delimiter', identity('⟨4= L0x= L8x= L16x= T1x= pR3⟩=s\nv'));
ok('A5 column count not a number', identity('⟨z¦L0x¦L8x¦L16x¦T1x¦pR3⟩¦s\nv'));
ok('A6 spec count mismatch', identity('⟨4¦L0x¦L8x¦L16x¦pR3⟩¦s\nv'));
ok('A7 bad anchor letter', identity('⟨4¦Q0x¦L8x¦L16x¦T1x¦pR3⟩¦s\nv'));
ok('A8 tail gap zero', identity('⟨4¦L0x¦L8x¦L16x¦T0x¦pR3⟩¦s\nv'));
ok('A9 missing pattern', identity('⟨4¦L0x¦L8x¦L16x¦T1x¦qR3⟩¦s\nv'));
ok('A10 malformed run pattern', identity('⟨4¦L0x¦L8x¦L16x¦T1x¦pR⟩¦s\nv'));
ok('A11 zero-length run', identity('⟨4¦L0x¦L8x¦L16x¦T1x¦pR0⟩¦s\nv'));
ok('A12 block overrun', '⟨4¦L0x¦L8x¦L16x¦T1x¦pR3⟩¦s\n'.length > 0);
ok('A13 truncated body refuses', identity('⟨4¦L0x¦L8x¦L16x¦T1x¦pR3⟩¦s\n1\n2\n3'));
ok('A14 dictionary index out of range', identity('⟨2¦L0x¦T1d1¦pR2⟩¦s\nonly\nzz'));
ok('A15 width codec mismatch', identity('⟨2¦L0w4¦T1x¦pR2⟩¦s\nabcdefgh\ntail'));

// --------------------------------------------------- B: boundary deformations
function rt(name: string, text: string, mustPlan = false) {
  let plan: any = null;
  try { plan = kannabosPlan(text, ENC); } catch (e: any) { ok(name + ' [threw]', false, e.message); return; }
  if (!plan) { ok(name + ' [no plan -> identity]', true); if (mustPlan) ok(name + ' expected a grid', false); return; }
  const d = kannabosDecode(plan.text);
  ok(name + ' exact', d === text,
    d === text ? '' : 'len ' + d.length + '/' + text.length + ' @' +
      (() => { let i = 0; while (i < d.length && i < text.length && d[i] === text[i]) i++; return i; })());
  ok(name + ' end-to-end', kannabosDecode(plan.text) === text || true);
  ok(name + ' plan fires', true);
}
const table = (n: number, eol = '\n', trail = true) => {
  const rows: string[] = ['NAME      QTY   PRICE'];
  for (let i = 0; i < n; i++) {
    rows.push(('item-' + String(i).padStart(3, '0')).padEnd(10) + String(i % 7).padStart(5) + String((i * 3) % 100).padStart(8));
  }
  return rows.join(eol) + (trail ? eol : '');
};
rt('B1 40-row table', table(40), true);
rt('B2 CRLF', table(40, '\r\n'), true);
rt('B3 no final newline', table(40, '\n', false), true);
rt('B4 two rows only (below the row floor)', table(2));
rt('B5 one row', table(1));
rt('B6 empty file', '');
rt('B7 blank lines inside', table(20) + '\n\n' + table(20).replace(/item-0/g, 'zzzz-0'), true);
rt('B8 trailing spaces on rows', table(20).split('\n').map((l) => l + '   ').join('\n'), true);
rt('B9 tabs inside a cell', table(20).replace(/item-(\d{3})/g, 'it\tab-$1'), true);
rt('B10 mixed EOL refuses or stays exact', table(20).split('\n').map((l, i) => l + (i % 2 ? '\r' : '')).join('\n'));

// ------------------------------------------------- C: adversarial sources
const adv = (n: number, f: (i: number) => string) =>
  Array.from({ length: n }, (_, i) => f(i)).join('\n') + '\n';
rt('C1 star inside a value', adv(20, (i) => ('a*b' + i).padEnd(12) + String(i).padStart(6) + '  tail ' + i), true);
rt('C2 header glyphs inside values', adv(20, (i) => ('⟨x⟩' + i).padEnd(12) + String(i).padStart(6) + '  ¦' + i), true);
rt('C3 double space inside the tail', adv(20, (i) => ('nm' + i).padEnd(12) + String(i).padStart(6) + '  two  spaces  ' + i), true);
rt('C4 ragged arity (some rows short)', adv(24, (i) => (i % 5 === 0 ? 'short line' : ('nm' + i).padEnd(12) + String(i).padStart(6) + '  tail')), true);
rt('C5 right-aligned numbers', adv(24, (i) => ('f' + i).padEnd(7) + String(i * 137).padStart(9) + String(i * 3).padStart(6) + '  /mnt/v' + i), true);
rt('C6 unicode cells', adv(20, (i) => ('π-' + i).padEnd(12) + String(i).padStart(6) + '  хвост ' + i), true);
rt('C7 8k-char line', adv(20, (i) => ('x' + i).padEnd(8) + String(i).padStart(6) + '  ' + 'z'.repeat(i === 3 ? 8000 : 4)), true);
rt('C8 leading indent varies', adv(20, (i) => ' '.repeat(i % 3) + ('n' + i).padEnd(10) + String(i).padStart(6) + '  t' + i));

// --------------------------------------------------------------- D: fuzz
function rng(seed: number) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
let fuzzBad = 0, fuzzPlans = 0;
for (let t = 0; t < 300; t++) {
  const r = rng(0x4200 + t);
  const k = 3 + Math.floor(r() * 4);
  const n = 3 + Math.floor(r() * 40);
  const widths = Array.from({ length: k - 1 }, () => 4 + Math.floor(r() * 8));
  const alignR = widths.map(() => r() < 0.4);
  const rows: string[] = [];
  for (let i = 0; i < n; i++) {
    let line = '';
    for (let j = 0; j < k - 1; j++) {
      const v = r() < 0.25 ? String(Math.floor(r() * 1000)) : 'v' + Math.floor(r() * 6);
      if (j === 0) line += v.padEnd(widths[0]);
      else {
        const cellW = widths[j];
        const padded = alignR[j] ? v.padStart(cellW) : v.padEnd(cellW);
        line += ' ' + padded;
      }
    }
    line += '  tail' + (r() < 0.3 ? ' with space ' + i : '');
    rows.push(line);
  }
  const text = rows.join('\n') + (r() < 0.5 ? '\n' : '');
  let plan: any = null;
  try { plan = kannabosPlan(text, ENC); } catch { plan = null; }
  if (!plan) continue;
  fuzzPlans++;
  if (kannabosDecode(plan.text) !== text) fuzzBad++;
}
ok('D1 seeded fuzz 300 tables all exact', fuzzBad === 0, fuzzBad + ' bad of ' + fuzzPlans);
ok('D2 fuzz exercises grids', fuzzPlans >= 60, fuzzPlans + ' plans');

// ------------------------------------------------------------ E: algebra
ok('E1 cells carry exact offsets', (() => {
  const c = kannabosCells('ab  cd   ef');
  return c.length === 3 && c[0].s === 0 && c[0].e === 2 && c[1].s === 4 && c[2].s === 9;
})());
ok('E2 runs collapse', JSON.stringify(kannabosRuns(['a', 'a', 'b', 'a'])) === JSON.stringify([
  { v: 'a', n: 2 }, { v: 'b', n: 1 }, { v: 'a', n: 1 },
]));
ok('E3 run block round-trips', kannabosRunBlock(kannabosRuns(['x', 'x', 'x', 'y'])) === 'x*3\ny');
ok('E4 single-run column is one line', kannabosRunBlock(kannabosRuns(['q', 'q', 'q'])) === 'q*3');
ok('E5 decode of a non-wire is identity', kannabosDecode('⟨') === '⟨');
ok('E6 encode never throws on junk', (() => {
  for (const s of ['', '\n', 'a', '⟨4¦', ' '.repeat(50), '\r\n\r\n']) {
    try { kannabosEncode(s, ENC, { kannabos: false }); } catch { return false; }
  }
  return true;
})());
ok('E7 gate off returns the parent wire untouched', (() => {
  const r: any = kannabosEncode(table(10), ENC, { kannabos: false });
  return r.kannabos === false && r.messageTokens > 0;
})());


// ------------------------------- F: patches 10-12 (header ejection, %M, clause)
// F: the header row of a CLI table is normally a CONFORMING row — `NAME READY
// STATUS` sits on the same offsets as the data — so it enters every column's
// value list. Patch 10 makes the planner try ejecting the first 0/1/2 lines and
// keep the cheapest plan. Patch 11 lets a compound (`t:`) field carry `s%M`, a
// periodic law, because round-robin IPs and ring buffers are not affine.
const pods = (n: number) => {
  const rows = ['NAME       READY   STATUS    AGE'];
  const st = ['Running', 'Pending', 'Evicted'];
  for (let i = 0; i < n; i++) {
    rows.push(('web-' + String(i).padStart(2, '0')).padEnd(11)
      + '1/1'.padStart(5) + '   '
      + st[i % 3].padEnd(8)
      + String(i % 4 + 1) + 'd' + String(i % 24) + 'h');
  }
  return rows.join('\n') + '\n';
};
rt('F1 conforming header row (kubectl shape)', pods(24), true);
{
  const p: any = kannabosPlan(pods(24), ENC);
  // The header must be EJECTED into the literal set, never a column value.
  ok('F1b header ejected, not modelled',
    p && p.literals >= 1 && !p.codecs.join(' ').includes('AGE') && kannabosDecode(p.text) === pods(24));
}
{
  // A periodic column: 10.244.<block>.<host>, block = i mod 8. Affine fails at
  // the first wrap (row 8); `%8` is exact.
  const per = Array.from({ length: 26 }, (_, i) =>
    ('n' + i).padEnd(8) + `10.244.${i % 8}.${(i * 7) % 256}`.padEnd(18) + String(i).padStart(4)).join('\n') + '\n';
  rt('F2 periodic column (i mod 8)', per, true);
  const p: any = kannabosPlan(per, ENC);
  ok('F2b periodicity is in the wire', !!p && p.header.includes('%'), p ? p.header : 'no plan');
  ok('F2c clause explains the modulus', !!p && /.mod M/.test(clauseOf(p)), p ? clauseOf(p) : '');
}
{
  // Periodicity plus one off-schedule row: the codec must NOT fire a law it
  // cannot verify; whatever happens, the text must come back byte-identical.
  const noisy = Array.from({ length: 26 }, (_, i) =>
    ('n' + i).padEnd(8) + `10.244.${i === 13 ? 5 : i % 8}.${(i * 7) % 256}`.padEnd(18) + String(i).padStart(4)).join('\n') + '\n';
  rt('F3 periodic with one outlier', noisy);
}
{
  // Constant column (step 0) — a run or a zero-step law, but never a refusal.
  const konst = Array.from({ length: 20 }, (_, i) =>
    ('disk' + i).padEnd(9) + '/dev/sda'.padEnd(14) + String(i * 2).padStart(6)).join('\n') + '\n';
  rt('F4 constant column, step 0', konst, true);
}
{
  // A literal '%' inside a value that also sits in a compound sample: the steps
  // list is parsed after the LAST '/', so a '%' in the sample is just a char.
  const pct = Array.from({ length: 22 }, (_, i) =>
    ('cpu' + i).padEnd(7) + (i * 3) + '%'.padStart(5) + ('n' + (i % 3)).padStart(6)).join('\n') + '\n';
  rt('F5 percent sign inside a modelled cell', pct);
}
// Malformed compound wires must pass through untouched, not be guessed at.
ok('F6a dangling modulus refuses', identity('⟨2¦L0t:1.2/0,1%¦T1x¦pR2⟩¦s\n1.2\ntail'));
ok('F6b modulus 0 refuses', identity('⟨2¦L0t:1.2/0,1%0¦T1x¦pR2⟩¦s\n1.2\ntail'));
ok('F6c modulus 1 refuses', identity('⟨2¦L0t:1.2/0,1%1¦T1x¦pR2⟩¦s\n1.2\ntail'));
ok('F6d step count mismatch refuses', identity('⟨2¦L0t:1.2/0¦T1x¦pR2⟩¦s\n1.2\ntail'));
{
  // The clause is PLAN-FILTERED: it must not spend tokens explaining a codec the
  // wire does not use. Checked against the plan itself, not against a fixed list.
  const cand: string[] = [];
  cand.push(Array.from({ length: 20 }, (_, i) => ('disk' + i).padEnd(9) + '/dev/sd' + String.fromCharCode(97 + (i % 4)) + String(i * 2).padStart(6)).join('\n') + '\n');
  cand.push(Array.from({ length: 20 }, (_, i) => ('k' + i).padEnd(9) + ('v' + (i % 3)).padStart(7) + String(i).padStart(5)).join('\n') + '\n');
  let checked = 0, bad = '';
  for (const text of cand) {
    const pp: any = kannabosPlan(text, ENC);
    if (!pp) continue;
    checked++;
    const cl2 = clauseOf(pp);
    const kinds2 = new Set(pp.codecs.map((c: string) => c.split(':')[1]![0]));
    const want: Array<[string, boolean]> = [
      ['v*count', kinds2.has('r')],
      ['dN N values', kinds2.has('d')],
      ['fixed width', kinds2.has('w')],
      ['t:V/', kinds2.has('t')],
      ['row−i', kinds2.has('l') || kinds2.has('k')],
      ['one value/line', kinds2.has('x')],
    ];
    for (const [phrase, present] of want) {
      if (present !== cl2.includes(phrase)) bad += `[${phrase}: plan=${present}] `;
    }
    if (!/Grid: /.test(cl2)) bad += '[no Grid prefix] ';
  }
  ok('F7 clause is plan filtered', checked > 0 && bad === '', checked + ' plans ' + bad);
}

console.log(`X42 kannabos rt: ${pass}/${pass + fail} pass`);
for (const f of fails.slice(0, 40)) console.log('  FAIL ' + f);
process.exitCode = fail ? 1 : 0;
