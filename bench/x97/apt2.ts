/**
 * X97 — APT-REAL THROUGH THE REAL ENCODER.  Runs `tagstackEncode` on apt-real under the four flag
 * combinations, memo bypassed, and recomputes the token count of the emitted message independently.
 * If the base arm (both post-passes off) reports more than 850, the regression is in the BASE chain,
 * not in ΜΕΤΑΤΑΞΙΣ -- and the prime suspect is the load-sensitivity defect X96 measured and reproduced
 * (hyle.ts:1465-1469 gates its arms on Date.now(), which OMEGA_DET does not stub).
 */
import * as fs from 'node:fs';
import { countTokens, countTokensExact } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';

process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
const enc: any = 'o200k_base';
const text = fs.readFileSync('bench/holdout-x41/apt-real.txt', 'utf8');
const arms: [string, () => void][] = [
  ['base  (no post-pass)', () => { process.env.OMEGA_NO_ISO = '1'; process.env.OMEGA_NO_METATAXIS = '1'; }],
  ['iso   only', () => { delete process.env.OMEGA_NO_ISO; process.env.OMEGA_NO_METATAXIS = '1'; }],
  ['meta  only', () => { process.env.OMEGA_NO_ISO = '1'; delete process.env.OMEGA_NO_METATAXIS; }],
  ['both  (as shipped)', () => { delete process.env.OMEGA_NO_ISO; delete process.env.OMEGA_NO_METATAXIS; }],
];
for (const [name, setup] of arms) {
  setup();
  const t = Date.now();
  const r: any = tagstackEncode(text, enc);
  const a = countTokens(r.message, enc), b = countTokensExact(r.message, enc);
  console.log(`${name.padEnd(22)} claimed=${String(r.messageTokens).padStart(5)} recount=${String(a).padStart(5)} exact=${String(b).padStart(5)} ` +
    `agree=${a === b && a === r.messageTokens} parent=${String(r.parentCodec).padEnd(12)} decoded_ok=${r.decoded === text} ${Date.now() - t}ms`);
}
