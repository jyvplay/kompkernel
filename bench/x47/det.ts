/**
 * X47 screen 1 — IS CHIRON'S SEARCH TRUNCATED, AND IS IT DETERMINISTIC?
 *
 * X46 found that TEKMAR returned 607 on dump.sql where X45's parent returned 608
 * through what is by construction the same computation, and attributed the difference
 * to CHIRON's WALL-CLOCK-BOUNDED variant sweep (chiron.ts:1341 sets budgetMs =
 * min(11_000, 800 + 1.1*len); chiron.ts:1373 caps the whole sweep at
 * min(26_000, 2.1*budgetMs)). Two consequences follow, and neither has been tested.
 *
 * FIRST, determinism. If the sweep is cut off by a clock, the same input can admit a
 * different rule set under different machine load. That would mean every one-token
 * result ever recorded in this repository -- X41's meeting-transcript minus 1, X44's
 * prose-01 minus 1, X46's dump.sql minus 1 -- is inside the noise floor, and the
 * honest unit of account for future turns is not one token. Five identical runs of
 * one lane measure the spread directly.
 *
 * SECOND, and more interesting, truncation. A clock bound does not merely make the
 * search noisy, it makes it INCOMPLETE. chiron.ts:1380 already implements a
 * deterministic alternative, a workUnits budget, and X43 tested both knobs -- but
 * only on kb-article and component.jsx, where CHIRON returns the raw fallback with
 * script=none rules=0 blocks=0 at every setting, so there was nothing to truncate.
 * That test could not have found a gain even if one existed.
 *
 * pom.xml is the lane X43 did not use and it is the right one: CHIRON fires hard on
 * it, 544 raw tokens down to 305, in about 250 ms, so dozens of settings can be
 * priced. If a larger deterministic budget finds a smaller grammar, the wall clock
 * has been costing tokens on every lane all along, and that is a compression gain
 * rather than a speed trade.
 */
import { readFileSync } from 'node:fs';
import { countTokens, type EncodingName } from '@/lib/omega/bpe';
import { chironEncode, chironDecode } from '@/lib/omega/chiron';

const enc = (process.env.ENC || 'o200k_base') as EncodingName;

for (const p of (process.env.LANES || '').split(',').map((s) => s.trim()).filter(Boolean)) {
  const t = readFileSync(p, 'utf8');
  const nm = p.split('/').pop()!;
  console.log(`\n=== ${nm}  (${t.length} chars, raw ${countTokens(t, enc)} tokens)`);

  // ---- Q1 determinism: five identical runs ----
  const REPS = Number(process.env.REPS || 5);
  const seen: number[] = [];
  console.log(`  Q1 determinism, ${REPS} identical runs of chironEncode(t):`);
  for (let i = 0; i < REPS; i++) {
    const t0 = Date.now();
    const r = chironEncode(t, enc);
    const ms = Date.now() - t0;
    seen.push(r.messageTokens);
    const ok = chironDecode(r.wire) === t;
    console.log(`     run ${i + 1}: msg=${String(r.messageTokens).padStart(5)} rules=${String(r.rules).padStart(3)} blocks=${String(r.blocks).padStart(3)} script=${String(r.script).padEnd(9)} ${ms}ms ${ok ? 'EXACT' : '***FAIL***'}`);
  }
  const uniq = [...new Set(seen)].sort((a, b) => a - b);
  console.log(`     SPREAD: ${uniq.length === 1 ? 'DETERMINISTIC (all ' + uniq[0] + ')' : 'NON-DETERMINISTIC, values ' + uniq.join(' / ') + ', range ' + (uniq[uniq.length - 1] - uniq[0])}`);

  // ---- Q2 truncation: does a bigger budget find a smaller grammar? ----
  console.log(`  Q2 truncation, larger budgets on a lane where CHIRON actually fires:`);
  const trials: Array<[string, Record<string, any>]> = [
    ['default            ', {}],
    ['budgetMs=11000     ', { budgetMs: 11_000 }],
    ['budgetMs=26000     ', { budgetMs: 26_000 }],
    ['budgetMs=120000    ', { budgetMs: 120_000 }],
    ['workUnits=5000     ', { workUnits: 5_000 }],
    ['workUnits=50000    ', { workUnits: 50_000 }],
    ['workUnits=500000   ', { workUnits: 500_000 }],
    ['workUnits=5000000  ', { workUnits: 5_000_000 }],
    ['maxRules=1000      ', { maxRules: 1_000 }],
  ];
  let best = Infinity, bestName = '';
  for (const [name, cfg] of trials) {
    const t0 = Date.now();
    let r: any;
    try { r = chironEncode(t, enc, cfg); } catch (e: any) { console.log(`     ${name} THREW ${String(e).slice(0, 40)}`); continue; }
    const ms = Date.now() - t0;
    const ok = chironDecode(r.wire) === t;
    if (r.messageTokens < best) { best = r.messageTokens; bestName = name; }
    console.log(`     ${name} msg=${String(r.messageTokens).padStart(5)} rules=${String(r.rules).padStart(3)} blocks=${String(r.blocks).padStart(3)} script=${String(r.script).padEnd(9)} ${String(ms).padStart(7)}ms ${ok ? 'EXACT' : '***FAIL***'}`);
  }
  const base = seen[0];
  console.log(`     => best ${best} via ${bestName.trim()} vs default ${base}: ${best < base ? 'GAIN ' + (base - best) + ' TOKENS' : 'no gain'}`);
}
