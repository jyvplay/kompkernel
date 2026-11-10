/**
 * X101 — ΣΤΑΘΜΟΣ stage 3: can the wall clock that ΣΤΑΘΜΟΣ freed be spent on TOKENS?
 *
 * The shared sweep meter is 96 % exhausted on ls-l-real, 75 % on ps-aux-real and 73 % on code-ts
 * (bench/x101/klimax29.json) — exactly the lanes where more search could pay.  ΣΤΑΘΜΟΣ removed the
 * never-winning `blocks-only` variants and gave 82.3 % of the chain's wall clock back, so the meter
 * can be raised without spending that gift.
 *
 * Arm A = ΣΤΑΘΜΟΣ, meter at 64 M units (the shipped default).
 * Arm B = ΣΤΑΘΜΟΣ, meter at 256 M units (4x).
 *
 * One process, interleaved lane by lane, OMEGA_DET=1 OMEGA_NO_MEMO=1.  Byte-exactness is checked on
 * the full decode on both arms, so a token difference is a compression difference.
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
  process.env.OMEGA_CHIRON_WORK_SCALE = '1';
  let t = Date.now();
  const A: any = tagstackEncode(text, enc);
  const am = Date.now() - t;
  process.env.OMEGA_CHIRON_WORK_SCALE = '4';
  t = Date.now();
  const B: any = tagstackEncode(text, enc);
  const bm = Date.now() - t;
  const eq = A.decoded === text && B.decoded === text;
  if (eq) exact++;
  const d = B.messageTokens - A.messageTokens;
  if (d < 0) better++; else if (d > 0) worse++; else same++;
  gA += A.messageTokens; gB += B.messageTokens; gAm += am; gBm += bm;
  rows.push({ lane: r.lane, armA: A.messageTokens, armB: B.messageTokens, delta: d, armAms: am, armBms: bm, exactBoth: eq });
  console.log(`${r.lane.padEnd(22)} A=${String(A.messageTokens).padStart(5)} B=${String(B.messageTokens).padStart(5)} Δ=${String(d).padStart(3)}  ${String(am).padStart(6)}ms -> ${String(bm).padStart(6)}ms  exact=${eq}`);
}
fs.writeFileSync('bench/x101/receipts/stathmos29c.json', JSON.stringify({ note: 'X101 STATHMOS stage 3: shared sweep meter 64M vs 256M units; 29-lane interleaved A/B', rows, totals: { armA: gA, armB: gB, delta: gB - gA, better, worse, same, exact, armAms: gAm, armBms: gBm } }, null, 1));
console.log(`\nΣΤΑΘΜΟΣ stage 3, 29 lanes: A=${gA} B=${gB} Δ=${gB - gA}; better ${better}, worse ${worse}, same ${same}; byte-exact ${exact}/29`);
console.log(`  wall clock A=${gAm}ms B=${gBm}ms (${gAm > 0 ? (100 * (gBm - gAm) / gAm).toFixed(0) : '?'}% for arm B)`);
