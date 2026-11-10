/**
 * X99 — LOAD-CONTROLLED 29-LANE A/B FOR ΣΥΝΔΥΑΣΜΟΣ.
 *
 * WHY THIS EXISTS.  RUN L pass 2 moved the shipped total 12 478 -> 12 470, but it is NOT a clean
 * measurement of ΜΕΤΑΤΑΞΙΣ: in the same process the shipped encoder produced apt-real = 874 while
 * run K's process produced 846 for the same bytes with ΜΕΤΑΤΑΞΙΣ absent.  The base chain is
 * load-sensitive (its parents budget with the wall clock), so a cross-process diff confounds the
 * new codec with machine noise.  ab29.json used the same design for ΜΕΤΑΤΑΞΙΣ (12 478 -> 12 434);
 * this is the ΣΥΝΔΥΑΣΜΟΣ arm, diffed against that same base.
 *
 * DESIGN.  Both arms run in ONE process, back to back per lane, with `OMEGA_DET=1 OMEGA_NO_MEMO=1`
 * (the memo key omits the environment, so without OMEGA_NO_MEMO the second arm is served the first
 * arm's cached object).  Arm A = shipped minus ΣΥΝΔΥΑΣΜΟΣ.  Arm B = shipped.  The only difference is
 * ΜΕΤΑΤΑΞΙΣ, so the per-lane Δ is the codec's contribution with load held constant.  Every emitted
 * message is re-decoded against the source and its token count recomputed independently, because
 * `admit` trusts `messageTokens`.
 */
import * as fs from 'node:fs';
import { countTokens, countTokensExact } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';

process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
delete process.env.OMEGA_NO_ISO;
const enc: any = 'o200k_base';
const lanes = fs.readFileSync('/tmp/lanes.txt', 'utf8').split('\n').filter(Boolean);
const out: any[] = [];
let aTot = 0, bTot = 0, imp = 0, wor = 0, inexact = 0;
for (const p of lanes) {
  const text = fs.readFileSync(p, 'utf8');
  const t0 = Date.now();
  process.env.OMEGA_NO_SYNDYASMOS = '1';
  const A: any = tagstackEncode(text, enc);
  const aMs = Date.now() - t0;
  const t1 = Date.now();
  delete process.env.OMEGA_NO_SYNDYASMOS;
  const B: any = tagstackEncode(text, enc);
  const bMs = Date.now() - t1;
  const okA = A.decoded === text, okB = B.decoded === text;
  const rA = countTokensExact(A.message, enc), rB = countTokensExact(B.message, enc);
  if (!okA || !okB || rA !== A.messageTokens || rB !== B.messageTokens) inexact++;
  const d = B.messageTokens - A.messageTokens;
  aTot += A.messageTokens; bTot += B.messageTokens;
  if (d < 0) imp++; if (d > 0) wor++;
  out.push({ lane: p, A_metaOnly: A.messageTokens, B_metaSynd: B.messageTokens, delta: d,
             recountA: rA, recountB: rB, exactA: okA, exactB: okB, msA: aMs, msB: bMs,
             parent: B.parentCodec, applied: B.notes.includes('ΜΕΤΑΤΑΞΙΣ') });
  console.log(`${p.replace(/^bench\/holdout[^/]*\//, '').padEnd(24)} iso=${String(A.messageTokens).padStart(5)} iso+meta=${String(B.messageTokens).padStart(5)} Δ=${String(d).padStart(4)} exact=${okB} parent=${B.parentCodec.padEnd(12)} ${aMs}/${bMs}ms`);
}
const summary = {
  lanes: lanes.length, inexact, improved: imp, worse: wor,
  totalA_metaOnly: aTot, totalB_metaSynd: bTot, delta: bTot - aTot,
  det: process.env.OMEGA_DET ?? null, memo: process.env.OMEGA_NO_MEMO ?? null,
  note: 'both arms in ONE process, OMEGA_DET=1 OMEGA_NO_MEMO=1, load held constant; Δ is ΣΥΝΔΥΑΣΜΟΣ alone',
};
fs.writeFileSync('bench/x99/receipts/ab99.json', JSON.stringify({ summary, rows: out }, null, 1));
console.log(`\nshipped minus ΣΥΝΔΥΑΣΜΟΣ ${aTot}  ->  shipped ${bTot}  Δ=${bTot - aTot}   improved ${imp}/${lanes.length}  worse ${wor}  inexact ${inexact}`);
console.log('wrote bench/x99/receipts/ab99.json');
