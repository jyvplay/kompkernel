/**
 * X100 — ΓΕΝΝΑΔΑΣ ISOLATED CPU COST, three reps, median reported.
 *
 * The 29-lane A/B's per-lane millisecond columns are NOT usable for this: arm A runs
 * first in the same process and pays the JIT and module-load warm-up that arm B does
 * not (apt-real read 65 700 ms for arm A against 21 812 ms for arm B on identical
 * bytes).  So the cost is measured on its own: the chain is run once with
 * ΓΕΝΝΑΔΑΣ disabled, and then ΓΕΝΝΑΔΑΣ alone is timed three times against that
 * incumbent.  The median of the three is reported, never a single sample.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { gennadasEncode } from '../../src/lib/omega/gennadas';

process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
const enc: any = 'o200k_base';
const wireDir = 'bench/x87/receipts/wires';
const lanes = fs.readdirSync(wireDir).filter((f) => f.endsWith('.wire.txt')).map((f) => f.replace('.wire.txt', ''));
const srcPath = (lane: string): string => {
  for (const d of ['bench/holdout-x41', 'bench/holdout', 'bench/holdout-work', 'bench/holdout-x42', 'bench/holdout-x42b', 'bench/holdout-tbl', 'bench/holdout-x40', 'bench/holdout-ops', 'bench/holdout-lang', 'bench/holdout-mk', 'bench/holdout-x86', 'bench/holdout-x87']) {
    for (const e of ['', '.txt', '.md', '.patch']) { const f = `${d}/${lane}${e}`; if (fs.existsSync(f)) return f; }
  }
  throw new Error('no source for ' + lane);
};
const med = (xs: number[]): number => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const rows: any[] = [];
let totMs = 0, totDelta = 0;
for (const lane of lanes) {
  const text = fs.readFileSync(srcPath(lane), 'utf8');
  process.env.OMEGA_NO_GENNADAS = '1';
  const A: any = tagstackEncode(text, enc);
  delete process.env.OMEGA_NO_GENNADAS;
  const inc = { message: A.message, messageTokens: A.messageTokens, decoded: A.decoded };
  const reps: number[] = [];
  let delta = 0, applied = false;
  for (let r = 0; r < 3; r++) {
    const t = Date.now();
    const G = gennadasEncode(text, enc, inc);
    reps.push(Date.now() - t);
    delta = G.messageTokens - inc.messageTokens;
    applied = G.applied;
  }
  const m = med(reps);
  totMs += m; totDelta += delta;
  rows.push({ lane, incumbent: inc.messageTokens, delta, applied, reps, medianMs: m });
  console.log(`${lane.padEnd(18)} incumbent=${String(inc.messageTokens).padStart(5)}  Δ=${String(delta).padStart(3)} applied=${String(applied).padEnd(5)}  reps=${reps.join('/')}ms  median=${m}ms`);
}
fs.writeFileSync('bench/x100/receipts/gennadascpu.json', JSON.stringify({ note: 'X100 GENNADAS isolated CPU, 3 reps, median; chain run once with GENNADAS disabled, then GENNADAS alone timed', rows, totals: { medianMs: totMs, delta: totDelta } }, null, 1) + '\n');
console.log(`\nΓΕΝΝΑΔΑΣ isolated: median total ${totMs} ms over the ten wires, pooled Δ ${totDelta}`);
console.log(`as a share of the chain's own ten-wire cost (armA ≈ 470 070 ms in gennadasab.json): ${(100 * totMs / 470070).toFixed(2)}%`);
