/** X89 — AUTHORITATIVE both-tier frontier confirmation, under OMEGA_DET=1.
 *
 *  WHY THIS EXISTS.  bench/x86/front.ts (runs A-E) prices `tagstackFrontier`, which
 *  src/lib/omega/tagstack.ts:505-510 documents as "the identity WITHOUT the X74
 *  candidates" -- it exists so that a candidate can price its own body without
 *  recursing. What the stack actually SHIPS is `tagstackEncode`, which appends the
 *  X73/X74 chain (STICHOMYTHIA, then PROSPHYSIS/STOICHEION). So every
 *  "FRONTIER 29 TOTAL 12639" reported since X80 is the PRE-CHAIN number.
 *
 *  front2 measured both tiers in one process but WITHOUT OMEGA_DET=1, and paid for
 *  it: src/lib/omega/clock.ts documents (measured motivation z13) that the searches
 *  are cut at wall-clock deadlines, so the frontier is not a pure function of the
 *  text under load. front2's F total came out 12678 against run E's 12639 and 4 of
 *  29 lanes drifted (code-ts +11, ls-l-real +20, ps-aux-real +7, apt-real +1) -- a
 *  clean independent reproduction of that load-dependence, and a warning that any
 *  harness which forgets OMEGA_DET=1 is measuring machine load, not the codec.
 *
 *  This script therefore runs the SHIPPED encoder only, once per lane, under
 *  OMEGA_DET=1, and diffs against the committed run E frontier numbers. Run E's F
 *  column is authoritative and is not recomputed here: that keeps the cost at one
 *  encode per lane instead of two. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';

const enc: any = 'o200k_base';
const runE = JSON.parse(fs.readFileSync('bench/x86/receipts/frontier-runE.json', 'utf8'));
const E = new Map(runE.rows.map((r: any) => [r.path, r]));
const rows: any[] = [];
const t0 = Date.now();
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const t1 = Date.now();
  const r: any = tagstackEncode(text, enc);
  const e: any = E.get(p);
  const row = {
    path: p, lane: p.split('/').pop(), raw: countTokens(text, enc),
    X: r.messageTokens, parent: r.parentCodec, exact: r.decoded === text,
    runE: e ? e.tokens : null, runEparent: e ? e.parent : null,
    delta: e ? r.messageTokens - e.tokens : null, ms: Date.now() - t1,
  };
  rows.push(row);
  console.log(`${row.lane!.padEnd(28)} raw=${String(row.raw).padStart(5)} X74=${String(row.X).padStart(5)}(${String(row.parent).padEnd(13)}) runE_F=${String(row.runE).padStart(5)} Δ=${String(row.delta).padStart(5)} exact=${row.exact} ${row.ms}ms`);
  fs.mkdirSync('bench/x89/receipts', { recursive: true });
  fs.writeFileSync('bench/x96/receipts/front3-400.json', JSON.stringify({
    det: process.env.OMEGA_DET ?? null, note: 'X74 chain (tagstackEncode) under OMEGA_DET=1, diffed against run E tagstackFrontier',
    rows, Xtotal: rows.reduce((a, b) => a + b.X, 0),
    runEtotal: rows.reduce((a, b) => a + (b.runE ?? 0), 0),
  }, null, 1) + '\n');
}
const X = rows.reduce((a, b) => a + b.X, 0);
const F = rows.reduce((a, b) => a + (b.runE ?? 0), 0);
const wins = rows.filter((r) => (r.delta ?? 0) < 0);
console.log(`\n=== X89 AUTHORITATIVE (OMEGA_DET=1) ===`);
console.log(`run E tagstackFrontier TOTAL ${F}   ->   tagstackEncode TOTAL ${X}   delta ${X - F}`);
console.log(`exact ${rows.filter((r) => r.exact).length}/${rows.length}   ms ${Date.now() - t0}`);
console.log(`lanes where the shipped chain beats the reported frontier: ${wins.length}`);
for (const w of wins.sort((a, b) => a.delta - b.delta)) console.log(`  ${w.lane.padEnd(28)} ${w.runE} -> ${w.X}  (${w.delta})  parent ${w.parent}`);
const worse = rows.filter((r) => (r.delta ?? 0) > 0);
if (worse.length) { console.log(`LANES THAT GOT WORSE (must be zero for a Pareto claim): ${worse.length}`); for (const w of worse) console.log(`  ${w.lane} ${w.runE} -> ${w.X} (+${w.delta})`); }
