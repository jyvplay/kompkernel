/** X107 — tagstackFrontier vs tagstackEncode: do they return the same thing?
 *  tagstackFrontier -> tagstackEncodeUncached -> tagstackEncodeInner.
 *  tagstackEncode   -> tagstackX74Chain (STICHOMYTHIA + every registry arm).
 *  If they differ, five turns of "frontier" receipts measured only the inner
 *  codec and every registry arm's gain has been sitting outside the receipt. */
import * as fs from 'node:fs';
import { tagstackFrontier, tagstackEncode } from '../../src/lib/omega/tagstack';
process.env.OMEGA_DET = '1'; process.env.OMEGA_NO_MEMO = '1';
process.env.OMEGA_ENGRAM = '0'; process.env.OMEGA_OURA_MEMO = '0'; process.env.OMEGA_NO_OROTHESIA = '1';
const enc: any = 'o200k_base';
const lanes = ['bench/holdout-tbl/psql-output.txt', 'bench/holdout-x40/cue-sheet.md', 'bench/holdout-x42/node-help.txt', 'bench/holdout-x42/findmnt.txt', 'bench/holdout-x41/ls-l-real.txt'];
let fi = 0, fe = 0;
for (const p of lanes) {
  const text = fs.readFileSync(p, 'utf8');
  const a: any = tagstackFrontier(text, enc);
  const b: any = tagstackEncode(text, enc);
  fi += a.messageTokens; fe += b.messageTokens;
  console.log(`${p.split('/').pop()!.padEnd(18)} frontier(inner) ${String(a.messageTokens).padStart(5)}  encode(chain) ${String(b.messageTokens).padStart(5)}  Δ ${b.messageTokens - a.messageTokens}  exact ${a.decoded === text}/${b.decoded === text}  sameMsg=${a.message === b.message}`);
}
console.log(`\nTOTAL inner ${fi}  chain ${fe}  Δ ${fe - fi}`);
