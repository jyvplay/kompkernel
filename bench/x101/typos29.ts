/**
 * X101 — ΤΥΠΟΣ A/B: does pricing macro candidates on the EMITTED wire beat pricing them on the
 * search-time proxy?
 *
 * The macro search accepts a candidate when its wire gets cheaper.  Until now the wire it priced was
 * `provisionalWire`: the tape concatenated in CREATION order with the search-time glyph assignment.
 * The string the caller receives is `renderWire`: a topological order with a fresh glyph assignment
 * drawn from ctx.pool.  Those are different strings with different token counts, so the search has
 * been optimising a number the emitted wire does not have.
 *
 * Arm A = the shipped proxy.  Arm B = ΤΥΠΟΣ (price renderWire).  ΧΕΙΡΟΝ only, so the comparison is
 * isolated to the pass under test.  One process, interleaved lane by lane, medians of three reps,
 * and byte-exactness checked on chironDecode for every rep of both arms.
 */
import * as fs from 'node:fs';
import { chironEncode, chironDecode } from '../../src/lib/omega/chiron';

process.env.OMEGA_DET = '1';
const enc: any = 'o200k_base';
const plan = JSON.parse(fs.readFileSync('bench/x89/receipts/front3-runK.json', 'utf8')).rows as any[];
const med = (xs: number[]): number => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const rows: any[] = [];
let gA = 0, gB = 0, gAm = 0, gBm = 0, better = 0, worse = 0, same = 0, exact = 0;
for (const r of plan) {
  const text = fs.readFileSync(r.path, 'utf8');
  const A: number[] = [], B: number[] = [];
  let tA = -1, tB = -1, ok = true;
  for (let rep = 0; rep < 3; rep++) {
    for (const arm of ['A', 'B'] as const) {
      const t = Date.now();
      const R: any = chironEncode(text, enc, arm === 'B' ? { exactAccept: true } as any : undefined);
      const ms = Date.now() - t;
      if (arm === 'A') { A.push(ms); tA = R.messageTokens; } else { B.push(ms); tB = R.messageTokens; }
      if (chironDecode(R.wire) !== text) ok = false;
    }
  }
  const d = tB - tA;
  if (d < 0) better++; else if (d > 0) worse++; else same++;
  if (ok) exact++;
  gA += tA; gB += tB; gAm += med(A); gBm += med(B);
  rows.push({ lane: r.lane, armA: tA, armB: tB, delta: d, armAms: med(A), armBms: med(B), exact: ok });
  console.log(`${r.lane.padEnd(22)} A=${String(tA).padStart(5)} B=${String(tB).padStart(5)} Δ=${String(d).padStart(4)}  ${String(med(A)).padStart(6)}ms -> ${String(med(B)).padStart(6)}ms  exact=${ok}`);
}
fs.writeFileSync('bench/x101/receipts/typos29.json', JSON.stringify({ note: 'X101 TYPOS: price macro candidates on the emitted wire (renderWire) vs the creation-order proxy (provisionalWire); CHIRON only, 29 lanes, 3 reps interleaved', rows, totals: { armA: gA, armB: gB, delta: gB - gA, better, worse, same, exact, armAms: gAm, armBms: gBm } }, null, 1));
console.log(`\nΤΥΠΟΣ over the 29 lanes: A=${gA} B=${gB} Δ=${gB - gA}; better ${better}, worse ${worse}, same ${same}; chironDecode-exact ${exact}/29`);
console.log(`  ΧΕΙΡΟΝ wall clock A=${gAm}ms B=${gBm}ms (${gAm > 0 ? (100 * (gBm - gAm) / gAm).toFixed(0) : '?'}% for ΤΥΠΟΣ)`);
