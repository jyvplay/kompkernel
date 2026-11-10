/**
 * X102 — isolated CPU for ΔΙΑΓΡΑΦΗ + ΠΑΛΙΝΔΡΟΜΟΣ, alternating reps, medians.
 *
 * ΠΑΛΙΝΔΡΟΜΟΣ re-runs the wire-level codecs, so its cost is the thing to price.
 * The two arms are run in ALTERNATING order (off on off on off on) in one process,
 * three reps each, and the MEDIAN is reported.  This is the design that caught
 * ΣΤΑΘΜΟΣ's withdrawn 82 % figure, so it is used again from the start.
 */
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';

process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
const enc: any = 'o200k_base';
const med = (xs: number[]): number => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const lanes = ['ls-l-real', 'code-ts', 'metrics.tsv', 'dpkg-l', 'ps-aux-real', 'psql-output'];
const srcPath = (lane: string): string => {
  for (const d of ['bench/holdout-x41', 'bench/holdout', 'bench/holdout-work', 'bench/holdout-x42', 'bench/holdout-x42b', 'bench/holdout-tbl', 'bench/holdout-x40', 'bench/holdout-ops', 'bench/holdout-lang', 'bench/holdout-mk', 'bench/holdout-x86', 'bench/holdout-x87']) {
    for (const e of ['', '.txt', '.md', '.patch']) { const f = `${d}/${lane}${e}`; if (fs.existsSync(f)) return f; }
  }
  throw new Error('no source for ' + lane);
};
const rows: any[] = [];
let gOn = 0, gOff = 0;
for (const lane of lanes) {
  const text = fs.readFileSync(srcPath(lane), 'utf8');
  const on: number[] = [], off: number[] = [];
  let tokOn = -1, tokOff = -1, exact = true;
  for (let r = 0; r < 3; r++) {
    for (const arm of ['off', 'on'] as const) {
      if (arm === 'off') { process.env.OMEGA_NO_DIAGRAPHE = '1'; process.env.OMEGA_NO_PALINDROMOS = '1'; }
      else { delete process.env.OMEGA_NO_DIAGRAPHE; delete process.env.OMEGA_NO_PALINDROMOS; }
      const t = Date.now();
      const R: any = tagstackEncode(text, enc);
      const ms = Date.now() - t;
      if (arm === 'on') { on.push(ms); tokOn = R.messageTokens; } else { off.push(ms); tokOff = R.messageTokens; }
      if (R.decoded !== text) exact = false;
    }
  }
  delete process.env.OMEGA_NO_DIAGRAPHE; delete process.env.OMEGA_NO_PALINDROMOS;
  gOn += med(on); gOff += med(off);
  rows.push({ lane, tokensOn: tokOn, tokensOff: tokOff, msOn: med(on), msOff: med(off), repsOn: on, repsOff: off, exactAll: exact });
  console.log(`${lane.padEnd(18)} tokens ${String(tokOff).padStart(5)} -> ${String(tokOn).padStart(5)}  X102=${String(med(on)).padStart(7)}ms  control=${String(med(off)).padStart(7)}ms  ${(100 * (med(off) - med(on)) / med(off)).toFixed(1)}%  reps on=[${on.join(',')}] off=[${off.join(',')}]  exact=${exact}`);
}
fs.writeFileSync('bench/x102/receipts/x102cpu.json', JSON.stringify({ note: 'X102 isolated CPU for DIAGRAPHE+PALINDROMOS: alternating reps in one process, medians, full-decode exactness per rep', rows, totals: { msOn: gOn, msOff: gOff } }, null, 1));
console.log(`\nX102 isolated CPU over these ${lanes.length} lanes: ${gOn} ms vs ${gOff} ms control = ${(100 * (gOff - gOn) / gOff).toFixed(1)}%, byte-exact on every rep`);
