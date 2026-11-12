/** X104 — HOW BIG ARE THE TIE GROUPS AT ΧΕΙΡΩΝ's TWO CUTS?
 * Env-gated census inside chiron.ts records, per epoch, the candidate-pool size,
 * the value at the cut, and how many candidates share that value. A large tie
 * group at a cut means the choice of which candidates survive is decided by Map
 * insertion order, i.e. by leftmost occurrence in the text, not by the objective.
 */
import * as fs from 'node:fs';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
import { TIE } from '../../src/lib/omega/chiron';
process.env.OMEGA_DET = '1'; process.env.OMEGA_NO_MEMO = '1';
process.env.OMEGA_ENGRAM = '0'; process.env.OMEGA_OURA_MEMO = '0';
process.env.OMEGA_X104_TIE_CENSUS = '1';
const lanes = fs.readFileSync('/tmp/lanes.txt', 'utf8').split('\n').filter(Boolean);
const agg: Record<string, { epochs: number; poolSum: number; tieSum: number; trunc: number; bigTies: number; maxTie: number }> = {};
for (const p of lanes) {
  TIE.length = 0;
  tagstackFrontier(fs.readFileSync(p, 'utf8'), 'o200k_base' as any);
  for (const t of TIE) {
    const a = agg[t.site] ?? (agg[t.site] = { epochs: 0, poolSum: 0, tieSum: 0, trunc: 0, bigTies: 0, maxTie: 0 });
    a.epochs++; a.poolSum += t.pool; a.tieSum += t.tieGroup; a.trunc += t.truncated;
    if (t.tieGroup > 1) a.bigTies++;
    if (t.tieGroup > a.maxTie) a.maxTie = t.tieGroup;
  }
}
console.log(JSON.stringify(agg, null, 1));
for (const [k, a] of Object.entries(agg)) {
  console.log(`${k.padEnd(10)} epochs=${String(a.epochs).padStart(5)} meanPool=${(a.poolSum / a.epochs).toFixed(1).padStart(8)} meanTieGroup=${(a.tieSum / a.epochs).toFixed(2).padStart(7)} epochsTruncated=${String(a.trunc).padStart(5)} epochsWithTie>1=${String(a.bigTies).padStart(5)} maxTieGroup=${a.maxTie}`);
}
