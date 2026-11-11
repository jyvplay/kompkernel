/**
 * X103 — ΠΡΟΑΓΩΓΗ CPU, MEASURED IN ISOLATION.
 *
 * The wall-clock columns of the 29-lane A/B are NOT usable: arm A runs cold and
 * arm B warm in the same process, so B looks ~6x faster for reasons that have
 * nothing to do with the codec (that is exactly the trap the repo's own notes
 * record for the committed wires).  This probe therefore measures the way the
 * protocol demands: seven lanes that actually carry rules, three reps each,
 * ALTERNATING the arm order between reps, and reporting the MEDIAN of the three.
 *
 * Lanes are the medium ones on purpose.  The three heaviest lanes (ls-l-real
 * 350 s, ps-aux-real 35 s, apt-real 80 s) would make a 3-rep alternating A/B
 * cost over an hour per arm, and a measurement that is too expensive to repeat
 * is not a measurement.  Their cost is reported separately from the codec's own
 * work counters, which are deterministic.
 */
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
process.env.OMEGA_DET = '1'; process.env.OMEGA_NO_MEMO = '1';
const enc: any = 'o200k_base';
const lanes = ['bench/holdout-work/kb-article.txt', 'bench/holdout-x42b/vmstat.txt', 'bench/holdout-work/unified-diff.patch', 'bench/holdout-x41/df-real.txt', 'bench/holdout-x41/du-real.txt', 'bench/holdout-x41/node-help.txt', 'bench/holdout-x42/findmnt.txt'];
const REPS = 3;
const res: Record<string, { on: number[]; off: number[]; onTok: number; offTok: number }> = {};
for (const p of lanes) res[p] = { on: [], off: [], onTok: -1, offTok: -1 };
for (let rep = 0; rep < REPS; rep++) {
  const flip = rep % 2 === 1;   // alternate the arm order so warm-up cannot favour either
  for (const p of lanes) {
    const text = fs.readFileSync(p, 'utf8');
    const arms = flip ? ['on', 'off'] : ['off', 'on'];
    for (const arm of arms) {
      if (arm === 'off') process.env.OMEGA_NO_PROAGOGE = '1'; else delete process.env.OMEGA_NO_PROAGOGE;
      const t = Date.now();
      const R: any = tagstackEncode(text, enc);
      const ms = Date.now() - t;
      if (arm === 'off') { res[p].off.push(ms); res[p].offTok = R.messageTokens; }
      else { res[p].on.push(ms); res[p].onTok = R.messageTokens; }
    }
  }
  console.log(`rep ${rep + 1}/${REPS} done (${flip ? 'on-first' : 'off-first'})`);
}
const med = (a: number[]): number => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
let gOn = 0, gOff = 0;
const rows: any[] = [];
for (const p of lanes) {
  const r = res[p];
  const mo = med(r.on), mf = med(r.off);
  gOn += mo; gOff += mf;
  rows.push({ lane: p.split('/').pop(), onMs: r.on, offMs: r.off, onMedian: mo, offMedian: mf, onTokens: r.onTok, offTokens: r.offTok, delta: r.onTok - r.offTok });
  console.log(`${p.split('/').pop()!.padEnd(20)} off median ${String(mf).padStart(6)}ms  on median ${String(mo).padStart(6)}ms  Δcpu ${((mo - mf) / mf * 100).toFixed(1)}%   tokens ${r.offTok} -> ${r.onTok} (Δ=${r.onTok - r.offTok})   off[${r.off.join(',')}] on[${r.on.join(',')}]`);
}
console.log(`\nΠΡΟΑΓΩΓΗ CPU over ${lanes.length} lanes x ${REPS} alternating reps: off median total ${gOff}ms, on median total ${gOn}ms, Δ ${((gOn - gOff) / gOff * 100).toFixed(2)}%`);
fs.writeFileSync('bench/x103/receipts/procpu.json', JSON.stringify({ note: 'X103 PROAGOGE CPU: 7 lanes, 3 reps, alternating arm order, medians. OMEGA_DET=1 OMEGA_NO_MEMO=1.', rows, totals: { offMedian: gOff, onMedian: gOn, relPct: (gOn - gOff) / gOff * 100 } }, null, 1));
