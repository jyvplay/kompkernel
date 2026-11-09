/** X90 — the two X88 EXTRA lanes, measured with the FINAL contract (the one carrying
 *  `Body first.`). bench/x90/run.json measured them with the 22/27-token contract; adding the
 *  reading-order statement costs 4 tokens, which is decisive on a lane whose margin was 1.
 *
 *  These are not among the 29 gate lanes, so run G does not cover them, and the numbers that
 *  go into the leaders table and §X90 must be MEASURED rather than predicted even though the
 *  additive model (total = T(contract) + 1 + F(rewrite)) verified exactly on ls-l-real.
 *  The prediction on offer was: ls-la-usrbin 946 -> 931 (-15), dpkg-l-full 2262 -> 2265
 *  (REFUSED, its 1-token margin consumed by the ordering statement). This run settles it. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { symphyiaEncode } from '../../src/lib/omega/symphyia';

const enc = 'o200k_base' as any;
const LANES = [
  { path: 'bench/holdout-x86/ls-la-usrbin.txt', gate: 946, shipped: 946, rawTokens: 3271, predicted: 931 },
  { path: 'bench/holdout-x86/dpkg-l-full.txt', gate: 2262, shipped: 2262, rawTokens: 4277, predicted: 2265 },
];
const rows: any[] = [];
for (const L of LANES) {
  const text = fs.readFileSync(L.path, 'utf8');
  const ms0 = Date.now();
  const r = symphyiaEncode(text, enc, L.shipped);
  const ms = Date.now() - ms0;
  const exact = r.decoded === text;
  const verdict = !r.applied ? `REFUSED (${r.notes})`
    : !exact ? 'APPLIED BUT NOT BYTE EXACT — FATAL'
    : `WINS ${L.shipped} -> ${r.messageTokens} (${r.messageTokens - L.shipped})`;
  rows.push({ lane: L.path, rawTokens: L.rawTokens, gate: L.gate, shipped: L.shipped, predicted: L.predicted,
    applied: r.applied, exact, messageTokens: r.messageTokens, deltaShipped: r.messageTokens - L.shipped,
    contractTokens: r.contractTokens, fields: r.rewritten, rules: r.rules, crc: r.crc,
    frontierParent: r.frontierParent, ms, notes: r.notes, verdict,
    predictionError: r.applied ? r.messageTokens - L.predicted : (L.shipped - L.predicted) });
  console.log(`\n━━ ${L.path}`);
  console.log(`   raw ${L.rawTokens}  shipped ${L.shipped}  predicted ${L.predicted}  MINE ${r.messageTokens}  applied=${r.applied} exact=${exact} contract=${r.contractTokens} fields=${r.rewritten} ms=${ms}`);
  console.log(`   ${r.notes}`);
  console.log(`   VERDICT: ${verdict}`);
  if (r.applied) console.log(`   first line: ${r.message.split('\n')[0]}`);
  fs.mkdirSync('bench/x90/receipts', { recursive: true });
  fs.writeFileSync('bench/x90/receipts/run-extras.json', JSON.stringify({
    note: 'X90 extra lanes with the FINAL contract (carrying `Body first.`, +4 tokens over the contract in run.json). Not among the 29 gate lanes, so run G does not cover them. OMEGA_DET=1, OMEGA_ENGRAM=0, one frontier call per lane, incumbent read from committed receipts.',
    det: process.env.OMEGA_DET, engram: process.env.OMEGA_ENGRAM, lanes: rows,
  }, null, 1) + '\n');
}
console.log(`\napplied ${rows.filter((r) => r.applied).length}/${rows.length}  byte exact ${rows.filter((r) => r.exact).length}/${rows.length}`);
console.log(`shipped total on these two: ${rows.reduce((a, r) => a + r.shipped, 0)} -> ${rows.reduce((a, r) => a + (r.applied && r.exact ? r.messageTokens : r.shipped), 0)}`);
console.log('wrote bench/x90/receipts/run-extras.json');
