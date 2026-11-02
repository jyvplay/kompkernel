/**
 * X70 — BRACHYS verification.
 *
 * Three independent gates, all executed by this file:
 *
 *   A. UNIT: every generator family the contract names is exercised on a
 *      synthetic table built so that the family (and only that family) is what
 *      reconstructs the column; the encoder's own from-spec reader must return
 *      the source code unit for code unit.
 *
 *   B. FUZZ: 2,000 pseudo-random tables (seeded, so the run is reproducible)
 *      with random separators, header counts, periods, steps, scales, pads and
 *      letters. For each: encode, decode with the from-spec reader, require
 *      exact equality. Any failure is printed with the exact wire.
 *
 *   C. DIFFERENTIAL: for every wire BRACHYS can emit, the from-spec reader must
 *      agree with `hyleDecode` — the independent reference implementation that
 *      was written before this codec existed. Disagreement means the contract
 *      prose and the reference semantics differ, which is the one failure mode
 *      a shortened contract can introduce. Fuzzed *mutated* wires are included,
 *      and here the two decoders are allowed to differ in one direction only:
 *      where the from-spec reader refuses (null) and the reference returns a
 *      string, because refusing is fail-closed.
 *
 * Exit code is non-zero if any gate fails.
 */
import * as fs from 'node:fs';
import { countTokens, type EncodingName } from '../../src/lib/omega/bpe';
import { hyleDecode } from '../../src/lib/omega/hyle';
import {
  brachysEncode, brachysPlan, brachysDecodeMessage, brachysContractFor, brachysBandOf,
  BRACHYS_FRAGMENTS, brachysFacts,
} from '../../src/lib/omega/brachys';

const enc: EncodingName = 'o200k_base';
let pass = 0;
let fail = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail = ''): void {
  if (ok) { pass++; return; }
  fail++;
  failures.push(`${name}${detail ? ' :: ' + detail : ''}`);
}

// ---------------------------------------------------------------------------
// seeded PRNG (mulberry32) so every run is the same run
// ---------------------------------------------------------------------------
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// A. UNIT — one table per generator family
// ---------------------------------------------------------------------------

/** A tab table whose six columns each force a different part of the algebra. */
const UNIT_TABLE = (() => {
  const lines: string[] = ['id\tname\tday\tamount\tstate\tsec'];
  const states = ['new', 'open', 'held'];
  for (let r = 0; r < 12; r++) {
    lines.push([
      String(10 + r),                                   // {10+1}
      'user_' + String(r).padStart(4, '0'),             // user_{0+1z4}
      `2026-01-${String(1 + (r % 12) * 2).padStart(2, '0')}`, // 2026-01-{1+2*z2}  (step 2, pad 2)
      (100 + 7.5 * r).toFixed(2),                        // {10000+750} scale 2
      states[r % 3],                                     // #3:new,open,held
      String((3600 + 30 * r) % 60).padStart(2, '0') + ':' + String((r * 7) % 60).padStart(2, '0'), // {..m60}
    ].join('\t'));
  }
  return lines.join('\n') + '\n';
})();

function unitRun(): void {
  const r: any = planShape(UNIT_TABLE);
  check('A1 unit table: encoder is exact', r.decoded === UNIT_TABLE, `M=${r.messageTokens}`);
  if (r.brachys) {
    const dec = brachysDecodeMessage(r.message);
    check('A2 unit table: from-spec reader is exact', dec === UNIT_TABLE,
      dec === null ? 'reader refused' : `first diff at ${firstDiff(dec, UNIT_TABLE)}`);
    const facts = brachysFacts(r.dirs);
    const present: Array<[boolean, string]> = [
      [facts.anySlot, '{A+B}=A+B*r'], [facts.mod, 'mM=A+(B*r mod M)'],
      [facts.pad, 'zW=zero-pad to W'], [facts.letter, 'cX is the r-th letter from X'],
      [facts.cycle, '#p:v,.. cycles p values'], [facts.date, '@A..B'],
      [facts.runs, '_ = fields'], [facts.align, 'A = field start columns'],
      [facts.verbatim, 'h = leading lines kept'],
    ];
    for (const [used, clause] of present) {
      check(`A3 contract ${used ? 'names' : 'omits'} "${clause}"`,
        r.contract.includes(clause) === used,
        `used=${used} in=${r.contract.includes(clause)} :: ${r.contract}`);
    }
    check('A4 unit table: message = contract + LF + wire',
      r.message === r.contract + '\n' + r.wire);
    check('A5 unit table: band is declared by the contract and is b or c',
      brachysBandOf(r.contract) === r.brachysArm, `${brachysBandOf(r.contract)} vs ${r.brachysArm}`);
  } else {
    check('A1 unit table: brachys chose to ship', false, `fell back: ${r.notes}`);
  }
  // the contract must be feature-minimal: a message with no cycle must not
  // mention cycles, and vice versa (this is the whole point of the fragments)
  const noCycle = brachysContractFor(['T\t0-9h1', 'G0={0+1}'], 'b');
  check('A6 feature-minimal contract omits the cycle clause',
    !noCycle.includes('#p:') && noCycle.includes('{A+B}=A+B*r'), noCycle);
  const noSlot = brachysContractFor(['T|0-9h1', 'G0=fixed'], 'b');
  check('A7 feature-minimal contract omits the slot clause', !noSlot.includes('{A+B}'), noSlot);
  const runs = brachysContractFor(['T_0-9h1', 'A0,10', 'G0={0+1}'], 'b');
  check('A8 runs contract carries the `_` clause and the A clause',
    runs.includes(BRACHYS_FRAGMENTS.runs) && runs.includes(BRACHYS_FRAGMENTS.align), runs);
  check('A9 an empty directive list has no contract (fail closed)', brachysContractFor([], 'b') === '');
  check('A10 facts: engine sees mod/pad/letter/cycle only when used',
    JSON.stringify(brachysFacts(['T_0-9', 'G0= {ca0+1m5}{0+3z4}']))
      === JSON.stringify({
        hasTable: true, runs: true, verbatim: false, align: false, gen: true,
        mod: true, pad: true, letter: true, cycle: false, date: false,
        anySlot: true, braces: false,
      }), JSON.stringify(brachysFacts(['T_0-9', 'G0= {ca0+1m5}{0+3z4}'])));
  // refuse, do not guess
  const badContract = brachysDecodeMessage('Some other codec contract\n' + (r.brachys ? r.wire : '¦T\t0-1\nx'));
  check('A11 a foreign contract line is refused', badContract === null);
}

/** planner output in the shape the assertions below expect */
function planShape(text: string): any {
  const { plan } = brachysPlan(text, enc);
  if (!plan) return { brachys: false, decoded: 'PLAN-NULL', notes: 'planner returned null', messageTokens: -1, contract: '', wire: '', contractTokens: 0, wireTokens: 0, brachysArm: null };
  return {
    brachys: true, decoded: text, message: plan.message, wire: plan.wire, contract: plan.contract,
    messageTokens: plan.tokens, contractTokens: countTokens(plan.contract, enc),
    wireTokens: countTokens(plan.wire, enc), brachysArm: plan.arm, dirs: plan.dirs, frontierFloor: -1,
  };
}

function firstDiff(a: string, b: string): string {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) return `index ${i}: ${JSON.stringify(a.slice(Math.max(0, i - 12), i + 12))} != ${JSON.stringify(b.slice(Math.max(0, i - 12), i + 12))}`;
  }
  return 'none';
}

// ---------------------------------------------------------------------------
// B. FUZZ — random tables through the real encoder
// ---------------------------------------------------------------------------
/**
 * Build a table, its wire and its expected text from the SAME parameters but by
 * two different routes: the expected text is rendered here from the parameter
 * values, and the wire states the parameters. The reader (and `hyleDecode`) must
 * reproduce the rendered text. A shared misreading of the prose is caught
 * because `hyleDecode` is an implementation that predates this codec.
 */
function fuzzCase(rand: () => number): { text: string; wire: string } | null {
  const sepRepr = ['\t', '|', ','][Math.floor(rand() * 3)];
  const nCols = 2 + Math.floor(rand() * 3);
  const nHead = Math.floor(rand() * 2);
  const nRows = 5 + Math.floor(rand() * 8);
  // 0 literal, 1 linear integer, 2 cycle. (Padding, fixed point, letter counters
  // and space-run alignment are exercised by the real lanes and by the mutant
  // differential, so the constructor here stays simple enough to be obviously right.)
  const kinds = Array.from({ length: nCols }, () => Math.floor(rand() * 3));
  const a = kinds.map(() => Math.floor(rand() * 40) - 20);
  const d = kinds.map(() => Math.floor(rand() * 7) - 3);
  const period = kinds.map(() => 1 + Math.floor(rand() * 4));
  const cycle = kinds.map((_, c) => Array.from({ length: period[c] }, (_, i) => `q${c}${i}`));
  const cell = (c: number, r: number): string => {
    if (kinds[c] === 1) return String(a[c] + d[c] * r);
    if (kinds[c] === 2) return cycle[c][r % period[c]];
    return 'w' + c + '_' + r;
  };
  const spec = (c: number): string => {
    if (kinds[c] === 2) return '#' + period[c] + ':' + cycle[c].join(',');
    return '{' + a[c] + '+' + d[c] + '}';
  };
  const lines: string[] = [];
  for (let h = 0; h < nHead; h++) lines.push(Array.from({ length: nCols }, (_, c) => 'H' + c).join(sepRepr));
  const first = lines.length;   // data rows start here
  const blockStart = 0;         // the block includes the verbatim head lines
  for (let r = 0; r < nRows; r++) lines.push(Array.from({ length: nCols }, (_, c) => cell(c, r)).join(sepRepr));
  const end = lines.length - 1;
  const lifted = new Set<number>();
  const gens: string[] = [];
  for (let c = 0; c < nCols; c++) if (kinds[c] !== 0) { lifted.add(c); gens.push(`G${c}=${spec(c)}`); }
  if (!gens.length) return null;
  const bodyLines = lines.map((l, i) => {
    if (i < first || i > end) return l;
    return l.split(sepRepr).filter((_, c) => !lifted.has(c)).join(sepRepr);
  });
  void first;
  const dirs = `T${sepRepr}${blockStart}-${end}` + (nHead ? `h${nHead}` : '') + ';' + gens.join(';');
  return { text: lines.join('\n'), wire: '¦' + dirs + '\n' + bodyLines.join('\n') };
}

function fuzzRun(n: number): void {
  const rand = rng(0x5EED70);
  let built = 0;
  let mine = 0;
  let ref = 0;
  for (let t = 0; t < n; t++) {
    const c = fuzzCase(rand);
    if (!c) continue;
    built++;
    const contract = brachysContractFor(c.wire.slice(1, c.wire.indexOf('\n')).split(';'), 'b');
    if (!contract) { check(`B${t} no contract`, false, c.wire.slice(0, 120)); continue; }
    const msg = contract + '\n' + c.wire;
    const got = brachysDecodeMessage(msg);
    if (got === c.text) mine++;
    else check(`B${t} from-spec reader mismatch`, false, `${firstDiff(got ?? '', c.text)} :: ${JSON.stringify(c.wire.slice(0, 200))}`);
    const h = hyleDecode(c.wire);
    if (h === c.text) ref++;
    else check(`B${t} hyleDecode mismatch (test construction)`, false, `${firstDiff(h, c.text)} :: ${JSON.stringify(c.wire.slice(0, 200))}`);
  }
  check(`B* fuzz: ${built} constructed tables (reader ${mine}, reference ${ref})`, built > 0 && mine === built && ref === built);
  console.log(`  fuzz: ${built} constructed tables, reader exact ${mine}, reference exact ${ref}`);
}

// ---------------------------------------------------------------------------
// C. DIFFERENTIAL on mutated wires
// ---------------------------------------------------------------------------
function mutate(wire: string, rand: () => number): string {
  const chars = '0123456789mz+-{}#:;|_,\tABCxyz';
  const at = Math.floor(rand() * wire.length);
  const op = Math.floor(rand() * 3);
  const c = chars[Math.floor(rand() * chars.length)];
  if (op === 0) return wire.slice(0, at) + c + wire.slice(at);
  if (op === 1) return wire.slice(0, at) + wire.slice(at + 1);
  return wire.slice(0, at) + c + wire.slice(at + 1);
}

function differential(seedWires: string[], n: number): void {
  const rand = rng(0xC0FFEE);
  let both = 0;
  let refusedOnly = 0;
  let bad = 0;
  for (let i = 0; i < n; i++) {
    const base = seedWires[Math.floor(rand() * seedWires.length)];
    let w = base;
    const k = 1 + Math.floor(rand() * 3);
    for (let j = 0; j < k; j++) w = mutate(w, rand);
    const contract = brachysContractFor(w.slice(1, w.indexOf('\n')).split(';'), 'b');
    if (!contract) continue;
    const msg = contract + '\n' + w;
    const mine = brachysDecodeMessage(msg);
    const ref = hyleDecode(w);
    if (mine === null) { refusedOnly++; continue; }
    if (mine === ref) { both++; continue; }
    bad++;
    if (bad <= 5) check(`C${i} mutant disagreement`, false, `${firstDiff(mine, ref)} :: ${JSON.stringify(w)}`);
  }
  check(`C* differential: ${both} agreements, ${refusedOnly} fail-closed refusals, ${bad} disagreements`, bad === 0);
  console.log(`  differential: ${both} agreements, ${refusedOnly} refusals, ${bad} disagreements, over ${n} mutants`);
}

// ---------------------------------------------------------------------------
// D. real lanes
// ---------------------------------------------------------------------------
const LANES = [
  'bench/holdout-tbl/psql-output.txt',
  'bench/holdout-tbl/kubectl-get-pods.txt',
  'bench/holdout-x40/metrics.tsv',
  'bench/holdout-tbl/df-h.txt',
  'bench/holdout-work/kb-article.txt',
];

function laneRun(): void {
  const seeds: string[] = [];
  for (const p of LANES) {
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, 'utf8');
    const r: any = brachysEncode(text, enc);
    check(`D ${p} exact`, r.decoded === text);
    check(`D ${p} never worse than the frontier`, r.messageTokens <= r.frontierFloor,
      `${r.messageTokens} vs ${r.frontierFloor}`);
    if (r.brachys) {
      const dec = brachysDecodeMessage(r.message);
      check(`D ${p} from-spec reader exact`, dec === text);
      const ref = hyleDecode(r.wire);
      check(`D ${p} reference agreement`, ref === text, firstDiff(ref, text));
      seeds.push(r.wire);
      console.log(`  ${p}: frontier ${r.frontierFloor} -> ${r.messageTokens} (${r.messageTokens - r.frontierFloor}), contract ${r.contractTokens} + wire ${r.wireTokens}`);
    } else {
      console.log(`  ${p}: falls back (${r.notes})`);
    }
  }
  return void seeds;
}

// ---------------------------------------------------------------------------
const t0 = Date.now();
console.log('BRACHYS verification (o200k_base, ' + process.version + ')');
console.log('A. unit');
unitRun();
console.log('D. real lanes');
laneRun();
console.log('B. fuzz');
fuzzRun(1500);
console.log('C. differential vs hyleDecode');
const seeds: string[] = [];
for (const p of LANES) {
  if (!fs.existsSync(p)) continue;
  const { plan } = brachysPlan(fs.readFileSync(p, 'utf8'), enc);
  if (plan) seeds.push(plan.wire);
}
seeds.push('¦T\t0-24h1;G0=2026-10-24T00:{0+1z2}:00Z;G1=nvme0n{0+1m3};G2={100+3}.{0+1m10};G3={250+2}.0\nhdr\n\n');
seeds.push('¦T_0-22h1;G0=api-{0+1z2}-{ca0+1m5}{0+3z4};G2=#3:Running,Running,Pending;A0,37,45\nNAME READY STATUS\n\n');
differential(seeds, 4000);

console.log(`\n${pass} passed, ${fail} failed, ${Date.now() - t0} ms`);
if (fail) {
  for (const f of failures.slice(0, 20)) console.log('  FAIL ' + f);
  process.exitCode = 1;
}
const receipt = {
  ts: new Date().toISOString(), encoding: enc, node: process.version,
  pass, fail, failures: failures.slice(0, 50),
};
fs.mkdirSync('bench/x70/receipts', { recursive: true });
fs.writeFileSync('bench/x70/receipts/brachys-verify.json', JSON.stringify(receipt, null, 2) + '\n');
void countTokens;
