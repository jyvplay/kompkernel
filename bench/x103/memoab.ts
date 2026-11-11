/**
 * X103 — THE X67 OURA MEMO IS NOT WALL-CLOCK-ONLY.
 *
 * oura.ts documents the replay as: "Charging the recorded cost back makes the
 * meter trajectory — and therefore every later decision — identical to the
 * uncached run; only wall-clock work disappears."
 *
 * MEASURED OTHERWISE (bench/x103/receipts/memoprobe-*.json, three lanes, one
 * process each, OMEGA_DET=1 + OMEGA_NO_MEMO=1 in every arm):
 *
 *     lane        memo ON   memo OFF
 *     apt-real      843        834      (-9)
 *     code-ts       970        968      (-2)
 *     dpkg-l        668        668       ( 0)
 *
 * So the memoised path emits a DIFFERENT, LARGER wire on two of three lanes.
 * OMEGA_NO_MEMO does not cover it: grep says that flag disables the TAGSTACK
 * memo only (tagstack.ts:501, :538, :564), while the X67 memo is switched by
 * OMEGA_OURA_MEMO=0 (oura.ts:494).
 *
 * This probe measures the whole lane set.  Arm A is the shipped default (memo
 * on); arm B is OMEGA_OURA_MEMO=0.  Both arms have ΠΡΟΑΓΩΓΗ enabled, so the
 * memo effect is isolated from the new codec.  Interleaved lane by lane, one
 * process, and the wall clock of each arm is recorded separately because a memo
 * exists to buy time and the price has to be reported with the gain.
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
let gA = 0, gB = 0, gAm = 0, gBm = 0, better = 0, worse = 0, same = 0, sameDec = 0;
for (const r of plan.slice(lo, hi)) {
  const text = fs.readFileSync(r.path, 'utf8');
  delete process.env.OMEGA_OURA_MEMO;
  let t = Date.now();
  const A: any = tagstackEncode(text, enc);
  const am = Date.now() - t;
  process.env.OMEGA_OURA_MEMO = '0';
  t = Date.now();
  const B: any = tagstackEncode(text, enc);
  const bm = Date.now() - t;
  const sd = A.decoded === B.decoded;
  if (sd) sameDec++;
  const d = B.messageTokens - A.messageTokens;
  if (d < 0) better++; else if (d > 0) worse++; else same++;
  gA += A.messageTokens; gB += B.messageTokens; gAm += am; gBm += bm;
  rows.push({ lane: r.lane, armA: A.messageTokens, armB: B.messageTokens, delta: d, armAms: am, armBms: bm, sameDecode: sd });
  console.log(`${r.lane.padEnd(22)} memoOn=${String(A.messageTokens).padStart(5)} memoOff=${String(B.messageTokens).padStart(5)} Δ=${String(d).padStart(4)}  ${String(am).padStart(6)}ms -> ${String(bm).padStart(6)}ms  sameDecode=${sd}`);
}
fs.writeFileSync(`bench/x103/receipts/memoab-${lo}-${hi}.json`, JSON.stringify({
  note: 'X103 OURA-MEMO A/B: arm A = shipped default (X67 memo on), arm B = OMEGA_OURA_MEMO=0. Both arms OMEGA_DET=1, OMEGA_NO_MEMO=1, PROAGOGE enabled. Interleaved lane by lane, one process.',
  lo, hi, rows, totals: { armA: gA, armB: gB, delta: gB - gA, better, worse, same, sameDec, armAms: gAm, armBms: gBm },
}, null, 1));
console.log(`\nOURA MEMO lanes ${lo}..${hi}: on=${gA} off=${gB} Δ=${gB - gA}; better(off) ${better}, worse(off) ${worse}, same ${same}; sameDecode ${sameDec}/${rows.length}`);
console.log(`  wall clock on=${gAm}ms off=${gBm}ms`);
