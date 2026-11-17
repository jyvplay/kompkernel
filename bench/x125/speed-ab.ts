/**
 * bench/x125/speed-ab.ts — in-process alternating A/B for counting-side speed
 * arms. Wall time drifts across sandbox suspensions, so the only honest clock
 * comparison alternates the arms inside ONE process and reports every round
 * (bench/x88/memoab.ts established this pattern for the memo budget).
 *
 * Arms are selected by environment flags that are read per call, so they can be
 * flipped between arms without rebuilding:
 *
 *   OMEGA_NO_PROLEPSIS=1      X121 prefix-resume off
 *   OMEGA_NO_EPIPSEPHISIS=1   X125 window re-price off
 *
 * Every arm must return the SAME token count and the same exactness; a speed arm
 * that changes a price is not a speed arm.
 */
import * as fs from 'node:fs';
import { tagstackEncode, tagstackMemoClear } from '../../src/lib/omega/tagstack';
import { countTokens, chunkCacheClear } from '../../src/lib/omega/bpe';
import { epipsephisisReset, epipsephisisStats } from '../../src/lib/omega/epipsephisis';
import { prolepsisReset, prolepsisStats } from '../../src/lib/omega/prolepsis';

const enc = 'o200k_base' as const;
const LANES = (process.env.LANES ?? 'bench/holdout-x41/apt-real.txt').split(',');
const ROUNDS = Number(process.env.ROUNDS ?? '2');
/** name -> env overrides */
const ARMS: Array<[string, Record<string, string>]> = [
  ['pro+epi', { OMEGA_NO_PROLEPSIS: '0', OMEGA_NO_EPIPSEPHISIS: '0' }],
  ['pro only', { OMEGA_NO_PROLEPSIS: '0', OMEGA_NO_EPIPSEPHISIS: '1' }],
  ['epi only', { OMEGA_NO_PROLEPSIS: '1', OMEGA_NO_EPIPSEPHISIS: '0' }],
  ['neither', { OMEGA_NO_PROLEPSIS: '1', OMEGA_NO_EPIPSEPHISIS: '1' }],
];
if (process.env.ARMS) {
  const want = process.env.ARMS.split(',');
  ARMS.splice(0, ARMS.length, ...ARMS.filter(([n]) => want.includes(n)));
}

function reset(): void {
  tagstackMemoClear();
  chunkCacheClear();
  epipsephisisReset();
  prolepsisReset();
}

const rows: Array<{ lane: string; arm: string; ms: number; M: number; exact: boolean; epi: number; pro: number }> = [];

for (const lane of LANES) {
  const src = fs.readFileSync(lane, 'utf8');
  for (let round = 0; round < ROUNDS; round++) {
    const order = round % 2 === 0 ? ARMS : [...ARMS].reverse();
    for (const [arm, env] of order) {
      for (const [k, v] of Object.entries(env)) process.env[k] = v;
      reset();
      const t0 = Date.now();
      const r = tagstackEncode(src, enc);
      const ms = Date.now() - t0;
      const M = countTokens(r.message, enc);
      rows.push({ lane: lane.split('/').pop()!, arm, ms, M, exact: r.decoded === src,
        epi: epipsephisisStats().hits, pro: prolepsisStats().hits });
      console.log(`round ${round}  ${lane.split('/').pop()!.padEnd(16)} ${arm.padEnd(9)} ${String(ms).padStart(7)} ms   M=${M}  exact=${r.decoded === src}  epiHits=${epipsephisisStats().hits}  proHits=${prolepsisStats().hits}`);
    }
  }
}

console.log('');
console.log('lane                 arm         rounds   best      median    M      exact');
for (const lane of [...new Set(rows.map((r) => r.lane))]) {
  for (const [arm] of ARMS) {
    const g = rows.filter((r) => r.lane === lane && r.arm === arm).map((r) => r.ms).sort((a, b) => a - b);
    if (!g.length) continue;
    const med = g[Math.floor(g.length / 2)]!;
    const Ms = new Set(rows.filter((r) => r.lane === lane && r.arm === arm).map((r) => r.M));
    const ex = rows.filter((r) => r.lane === lane && r.arm === arm).every((r) => r.exact);
    console.log(`${lane.padEnd(20)} ${arm.padEnd(11)} ${String(g.length).padStart(6)}   ${String(g[0]).padStart(7)}   ${String(med).padStart(8)}   ${[...Ms].join('/')}   ${ex}`);
  }
}
const byArm = new Map<string, number[]>();
for (const r of rows) { const a = byArm.get(r.arm) ?? []; a.push(r.ms); byArm.set(r.arm, a); }
console.log('');
for (const [arm, xs] of byArm) {
  const s = [...xs].sort((a, b) => a - b);
  console.log(`Σ ${arm.padEnd(11)} ${s.reduce((a, b) => a + b, 0)} ms over ${s.length} runs (median ${s[Math.floor(s.length / 2)]})`);
}
