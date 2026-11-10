/**
 * X101 — ΤΥΠΟΣ instrumentation run: how often does the string the macro search PRICE differ from the
 * string that SHIPS?  If the answer is zero on every lane, ΤΥΠΟΣ is a latent-defect fix and must be
 * reported as such, not as a gain.
 */
import * as fs from 'node:fs';
import { chironEncode, TYPOS_PROBE } from '../../src/lib/omega/chiron';
process.env.OMEGA_DET = '1';
process.env.OMEGA_TYPOS_PROBE = '1';
const enc: any = 'o200k_base';
const plan = JSON.parse(fs.readFileSync('bench/x89/receipts/front3-runK.json', 'utf8')).rows as any[];
let gP = 0, gD = 0;
for (const r of plan) {
  TYPOS_PROBE.priced = 0; TYPOS_PROBE.differed = 0;
  const text = fs.readFileSync(r.path, 'utf8');
  chironEncode(text, enc, { exactAccept: true } as any);
  gP += TYPOS_PROBE.priced; gD += TYPOS_PROBE.differed;
  console.log(`${r.lane.padEnd(22)} macro candidates priced=${String(TYPOS_PROBE.priced).padStart(5)}  priced-on-a-different-string=${String(TYPOS_PROBE.differed).padStart(4)}`);
}
fs.writeFileSync('bench/x101/receipts/typosprobe.json', JSON.stringify({ note: 'X101 TYPOS instrumentation: how often the priced string differs from the shipped string', totals: { priced: gP, differed: gD } }, null, 1));
console.log(`\nΤΥΠΟΣ instrumentation over the 29 lanes: ${gP} macro candidates priced, ${gD} of them priced on a string different from the one that ships.`);
