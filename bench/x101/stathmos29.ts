/**
 * X101 — ΣΤΑΘΜΟΣ 29-lane A/B: dropping the never-winning `blocks-only` variants from ΧΕΙΡΟΝ's sweep.
 *
 * ONE process, interleaved lane by lane, OMEGA_DET=1 OMEGA_NO_MEMO=1, so the load-sensitivity defect
 * (X97) cannot manufacture a difference.  Arm A is the shipped sweep.  Arm B is the same sweep with
 * the `blocks-only` variants dropped (chiron.ts `skipBlocksOnly`).  Every lane is whole-chain:
 * chironDecode(arm A) must equal chironDecode(arm B) and both must equal the ΧΕΙΡΟΝ-layer expansion
 * of the shipped chain's own output, so the comparison is byte-exactness and not a token claim.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, chironDecode } from '../../src/lib/omega/chiron';
import { tagstackEncode } from '../../src/lib/omega/tagstack';

process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
const enc: any = 'o200k_base';
const plan = JSON.parse(fs.readFileSync('bench/x89/receipts/front3-runK.json', 'utf8')).rows as any[];
const rows: any[] = [];
let gA = 0, gB = 0, gAm = 0, gBm = 0, better = 0, worse = 0, same = 0, exact = 0;
for (const r of plan) {
  const text = fs.readFileSync(r.path, 'utf8');
  let t = Date.now();
  const A: any = tagstackEncode(text, enc);
  const am = Date.now() - t;
  t = Date.now();
  const B: any = tagstackEncode(text, enc, { chiron: { skipBlocksOnly: true } } as any);
  const bm = Date.now() - t;
  const dA = A.decoded, dB = B.decoded;
  const eq = dA === dB && dA === text;
  if (eq) exact++;
  const d = B.messageTokens - A.messageTokens;
  if (d < 0) better++; else if (d > 0) worse++; else same++;
  gA += A.messageTokens; gB += B.messageTokens; gAm += am; gBm += bm;
  rows.push({ lane: r.lane, armA: A.messageTokens, armB: B.messageTokens, delta: d, armAms: am, armBms: bm, exactBoth: eq });
  console.log(`${r.lane.padEnd(22)} A=${String(A.messageTokens).padStart(5)} B=${String(B.messageTokens).padStart(5)} Δ=${String(d).padStart(3)}  ${String(am).padStart(6)}ms -> ${String(bm).padStart(6)}ms  exact=${eq}`);
}
fs.writeFileSync('bench/x101/receipts/stathmos29.json', JSON.stringify({ note: 'X101 STATHMOS: drop the never-winning blocks-only variants; 29-lane interleaved A/B', rows, totals: { armA: gA, armB: gB, delta: gB - gA, better, worse, same, exact, armAms: gAm, armBms: gBm } }, null, 1));
console.log(`\nΣΤΑΘΜΟΣ 29 lanes: A=${gA} B=${gB} Δ=${gB - gA}; better ${better}, worse ${worse}, same ${same}; byte-exact on ${exact}/29`);
console.log(`  wall clock A=${gAm}ms B=${gBm}ms (${gAm > 0 ? (100 * (gAm - gBm) / gAm).toFixed(1) : '?'}%)`);
