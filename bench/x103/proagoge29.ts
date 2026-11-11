/**
 * X103 — ΠΡΟΑΓΩΓΗ 29-lane A/B: bring interior factors forward so their users can
 * reference them.  Same protocol as bench/x102/diagraphe29.ts — one process,
 * interleaved lane by lane, OMEGA_DET=1 OMEGA_NO_MEMO=1, arm A = the shipped
 * chain with ΠΡΟΑΓΩΓΗ disabled (OMEGA_NO_PROAGOGE=1), arm B with it enabled.
 *
 * Two exactness checks, not one: `A.decoded === B.decoded` (both arms must expand
 * to the same bytes — the invariant that actually matters for an A/B) and the
 * existing `decoded === text`.  A lane is counted exact only when both hold.
 *
 * Lane range comes from argv so a 26-minute run can be split across calls without
 * losing the interleaving inside a lane.
 */
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
const enc: any = 'o200k_base';
const plan = JSON.parse(fs.readFileSync('bench/x89/receipts/front3-runK.json', 'utf8')).rows as any[];
const lo = Number(process.argv[2] ?? '0');
const hi = Number(process.argv[3] ?? String(plan.length));
const rows: any[] = [];
let gA = 0, gB = 0, gAm = 0, gBm = 0, better = 0, worse = 0, same = 0, exact = 0, sameDecode = 0;
for (const r of plan.slice(lo, hi)) {
  const text = fs.readFileSync(r.path, 'utf8');
  process.env.OMEGA_NO_PROAGOGE = '1';
  let t = Date.now();
  const A: any = tagstackEncode(text, enc);
  const am = Date.now() - t;
  delete process.env.OMEGA_NO_PROAGOGE;
  t = Date.now();
  const B: any = tagstackEncode(text, enc);
  const bm = Date.now() - t;
  const sameDec = A.decoded === B.decoded;
  const eq = sameDec && A.decoded === text && B.decoded === text;
  if (sameDec) sameDecode++;
  if (eq) exact++;
  const d = B.messageTokens - A.messageTokens;
  if (d < 0) better++; else if (d > 0) worse++; else same++;
  gA += A.messageTokens; gB += B.messageTokens; gAm += am; gBm += bm;
  rows.push({ lane: r.lane, armA: A.messageTokens, armB: B.messageTokens, delta: d, armAms: am, armBms: bm, sameDecode: sameDec, exactBoth: eq, notesB: String(B.notes).slice(0, 200) });
  console.log(`${r.lane.padEnd(22)} A=${String(A.messageTokens).padStart(5)} B=${String(B.messageTokens).padStart(5)} Δ=${String(d).padStart(4)}  ${String(am).padStart(6)}ms -> ${String(bm).padStart(6)}ms  sameDecode=${sameDec}`);
}
const out = `bench/x103/receipts/proagoge29-${lo}-${hi}.json`;
fs.writeFileSync(out, JSON.stringify({ note: 'X103 PROAGOGE: bring interior factors forward; 29-lane interleaved A/B, arm A = OMEGA_NO_PROAGOGE=1', lo, hi, rows, totals: { armA: gA, armB: gB, delta: gB - gA, better, worse, same, exact, sameDecode, armAms: gAm, armBms: gBm } }, null, 1));
console.log(`\nΠΡΟΑΓΩΓΗ lanes ${lo}..${hi}: A=${gA} B=${gB} Δ=${gB - gA}; better ${better}, worse ${worse}, same ${same}; sameDecode ${sameDecode}/${rows.length}, byte-exact ${exact}/${rows.length}`);
console.log(`  wall clock A=${gAm}ms B=${gBm}ms`);
