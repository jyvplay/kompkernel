/**
 * X102 — ΔΙΑΓΡΑΦΗ 29-lane A/B: sweep the finished wire for rules that no longer pay.
 *
 * One process, interleaved lane by lane, OMEGA_DET=1 OMEGA_NO_MEMO=1.  Arm A is the
 * shipped chain with ΔΙΑΓΡΑΦΗ disabled (OMEGA_NO_DIAGRAPHE=1); arm B has it enabled.
 * Both arms are whole-chain and byte-exactness is checked on the FULL decode, so a
 * token difference is a real compression difference and not a different program.
 *
 * The control matters here more than usual: ΧΕΙΡΟΝ's own deletion pass already runs
 * inside chironEncode, so arm A is NOT a wire that has never been swept.  If ΔΙΑΓΡΑΦΗ
 * finds nothing, that is the result.
 */
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';

process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
const enc: any = 'o200k_base';
const plan = JSON.parse(fs.readFileSync('bench/x89/receipts/front3-runK.json', 'utf8')).rows as any[];
const rows: any[] = [];
let gA = 0, gB = 0, gAm = 0, gBm = 0, better = 0, worse = 0, same = 0, exact = 0;
for (const r of plan) {
  const text = fs.readFileSync(r.path, 'utf8');
  process.env.OMEGA_NO_DIAGRAPHE = '1';
  let t = Date.now();
  const A: any = tagstackEncode(text, enc);
  const am = Date.now() - t;
  delete process.env.OMEGA_NO_DIAGRAPHE;
  t = Date.now();
  const B: any = tagstackEncode(text, enc);
  const bm = Date.now() - t;
  const eq = A.decoded === text && B.decoded === text;
  if (eq) exact++;
  const d = B.messageTokens - A.messageTokens;
  if (d < 0) better++; else if (d > 0) worse++; else same++;
  gA += A.messageTokens; gB += B.messageTokens; gAm += am; gBm += bm;
  rows.push({ lane: r.lane, armA: A.messageTokens, armB: B.messageTokens, delta: d, armAms: am, armBms: bm, exactBoth: eq });
  console.log(`${r.lane.padEnd(22)} A=${String(A.messageTokens).padStart(5)} B=${String(B.messageTokens).padStart(5)} Δ=${String(d).padStart(4)}  ${String(am).padStart(6)}ms -> ${String(bm).padStart(6)}ms  exact=${eq}`);
}
fs.writeFileSync('bench/x102/receipts/diagraphe29.json', JSON.stringify({ note: 'X102 DIAGRAPHE: sweep the finished wire for rules that no longer pay; 29-lane interleaved A/B, arm A = OMEGA_NO_DIAGRAPHE=1', rows, totals: { armA: gA, armB: gB, delta: gB - gA, better, worse, same, exact, armAms: gAm, armBms: gBm } }, null, 1));
console.log(`\nΔΙΑΓΡΑΦΗ 29 lanes: A=${gA} B=${gB} Δ=${gB - gA}; better ${better}, worse ${worse}, same ${same}; byte-exact ${exact}/29`);
console.log(`  wall clock A=${gAm}ms B=${gBm}ms`);
