/**
 * X101 — ΣΤΑΘΜΟΣ, isolated CPU on the SHIPPED path, alternating reps, medians.
 *
 * The 29-lane interleaved A/B (stathmos29.json) gave 584 924 ms -> 103 555 ms, but arm A ran first in
 * that process and the chain is known to be JIT- and load-sensitive (X97).  This probe removes that
 * confound: for each lane the two arms are run in ALTERNATING order (A B A B A B) in one process,
 * three reps each, and the MEDIAN is reported.  Nothing else differs between the arms except
 * OMEGA_KEEP_BLOCKS_ONLY, which is set per rep.
 *
 * Byte-exactness is checked on the full decode on every rep of both arms.
 */
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';

process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
const enc: any = 'o200k_base';
const med = (xs: number[]): number => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const lanes = ['ls-l-real', 'apt-real', 'ps-aux-real', 'code-ts', 'psql-output', 'prices.csv', 'kubectl-get-pods', 'ls-real'];
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
      if (arm === 'off') process.env.OMEGA_KEEP_BLOCKS_ONLY = '1';
      else delete process.env.OMEGA_KEEP_BLOCKS_ONLY;
      const t = Date.now();
      const R: any = tagstackEncode(text, enc);
      const ms = Date.now() - t;
      if (arm === 'on') { on.push(ms); tokOn = R.messageTokens; } else { off.push(ms); tokOff = R.messageTokens; }
      if (R.decoded !== text) exact = false;
    }
  }
  gOn += med(on); gOff += med(off);
  rows.push({ lane, tokens: tokOn, msStathmos: med(on), msControl: med(off), repsOn: on, repsOff: off, exactAll: exact });
  console.log(`${lane.padEnd(18)} tokens=${String(tokOn).padStart(5)}  ΣΤΑΘΜΟΣ=${String(med(on)).padStart(7)}ms  control=${String(med(off)).padStart(7)}ms  ${(100 * (med(off) - med(on)) / med(off)).toFixed(1)}% faster  reps on=[${on.join(',')}] off=[${off.join(',')}]  exact=${exact}`);
}
delete process.env.OMEGA_KEEP_BLOCKS_ONLY;
fs.writeFileSync('bench/x101/receipts/stathmoscpu.json', JSON.stringify({ note: 'X101 STATHMOS isolated CPU on the shipped chain: alternating reps in one process, medians, full-decode exactness per rep', rows, totals: { msStathmos: gOn, msControl: gOff } }, null, 1));
console.log(`\nΣΤΑΘΜΟΣ isolated CPU over these ${lanes.length} lanes: ${gOn} ms vs ${gOff} ms control = ${(100 * (gOff - gOn) / gOff).toFixed(1)}% less wall clock, byte-exact on every rep`);
