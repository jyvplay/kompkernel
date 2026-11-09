/**
 * X91 — WHY DO TWO IDENTICAL HARNESSES DISAGREE ABOUT THE SAME LANE'S DEFAULT?
 *
 * The observation. bench/x91/large-sweep.ts measured ps-aux-real.txt at default = 1042 tokens
 * and at w.5c.5 = 1053. bench/x91/meter-isolate.ts measured the SAME lane at default = 1053 and
 * at w.5c.5 = 1066. The two harnesses are identical in every line that matters: both clear
 * OMEGA_WORK_BUDGET / OMEGA_CHIRON_BUDGET, both read baseW = workBudgetFor(chars) and
 * baseC = chironBudgetFor(chars) once, both set the overrides to Math.round(base * multiplier),
 * both call tagstackEncodeUncached, both ran under OMEGA_DET=1 and OMEGA_ENGRAM=0. They differ
 * in ONE respect: large-sweep encoded ps-aux-real sixth, after five other lanes in the same
 * process; meter-isolate encoded it first.
 *
 * Two hypotheses with OPPOSITE implications, so this cannot be left unresolved.
 *
 *   H-ORDER   Some module-level state survives across encodes in one process (a warmed
 *             permutation, a learned glyph table, a memo). Then the default is order-dependent,
 *             every interleaved budget sweep in this repository is confounded, and the ONLY
 *             valid measurement is one process per (lane, setting) -- or the real constant
 *             changed and the frontier re-run.
 *
 *   H-OVERRIDE `workBudgetFor(chars)` has more than one call site and nested call sites pass a
 *             DIFFERENT `chars` (a piece length, not the lane length). Then setting the override
 *             to the lane-level base replaces every nested budget with one absolute number and
 *             is NOT equivalent to leaving the environment clear, no matter what value is used.
 *             Then the sweep methodology is wrong even in a fresh process, and the multipliers
 *             reported by X89 and X91 do not mean what they say.
 *
 * Modes, each run in its OWN process so nothing can leak between them:
 *   clear   env cleared entirely, one encode            -> the true shipped default
 *   ovr     override set to exactly the resolved base   -> isolates H-OVERRIDE
 *   after   a decoy lane encoded first, then ovr        -> isolates H-ORDER
 *   half    override set to 0.5x the resolved base      -> the candidate factor, fresh process
 *
 * H-OVERRIDE is confirmed iff clear != ovr. H-ORDER is confirmed iff ovr != after.
 */
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import { tagstackEncodeUncached } from '../../src/lib/omega/tagstack';
import { workBudgetFor, chironBudgetFor } from '../../src/lib/omega/workmeter';

const enc = 'o200k_base' as any;
const mode = process.argv[2];
const lanePath = process.argv[3] || 'bench/holdout-x41/ps-aux-real.txt';
const decoyPath = process.argv[4] || 'bench/holdout-x42/kb-article.txt';
const text = fs.readFileSync(lanePath, 'utf8');
const chars = text.length;
const sha = (s: string) => crypto.createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);
delete process.env.OMEGA_WORK_BUDGET; delete process.env.OMEGA_CHIRON_BUDGET;
const baseW = workBudgetFor(chars), baseC = chironBudgetFor(chars);

if (mode === 'ovr' || mode === 'after' || mode === 'half') {
  const m = mode === 'half' ? 0.5 : 1;
  process.env.OMEGA_WORK_BUDGET = String(Math.round(baseW * m));
  process.env.OMEGA_CHIRON_BUDGET = String(Math.round(baseC * m));
}
if (mode === 'after') {
  const d = fs.readFileSync(decoyPath, 'utf8');
  const t = Date.now();
  const r: any = tagstackEncodeUncached(d, enc);
  console.log(`decoy ${decoyPath} ${r.messageTokens} tok ${Date.now() - t}ms exact=${r.decoded === d}`);
}
const t = Date.now();
const r: any = tagstackEncodeUncached(text, enc);
console.log(JSON.stringify({ mode, lane: lanePath, chars, baseWork: baseW, baseChiron: baseC,
  workEnv: process.env.OMEGA_WORK_BUDGET ?? null, chironEnv: process.env.OMEGA_CHIRON_BUDGET ?? null,
  tokens: r.messageTokens, ms: Date.now() - t, sha: sha(r.message), exact: r.decoded === text,
  det: process.env.OMEGA_DET ?? null, engram: process.env.OMEGA_ENGRAM ?? null }));
