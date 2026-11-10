/**
 * X100 — ΓΕΝΝΑΔΑΣ 29-LANE A/B ON THE REAL CHAIN.  Interleaved lane by lane in one
 * process, OMEGA_DET=1, OMEGA_NO_MEMO=1, so the load-sensitivity defect (X97: 846 /
 * 850 / 858 / 874 for identical bytes across processes, all exact=true) cannot be
 * mistaken for a codec effect.  Arm A disables ΓΕΝΝΑΔΑΣ; arm B is the shipped chain.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';

process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
const enc: any = 'o200k_base';
const rows: any[] = [];
const plan = JSON.parse(fs.readFileSync('bench/x89/receipts/front3-runK.json', 'utf8')).rows as any[];
let aTot = 0, bTot = 0, rawTot = 0, msA = 0, msB = 0, impr = 0, worse = 0, inexact = 0;
for (const r of plan) {
  const text = fs.readFileSync(r.path, 'utf8');
  const raw = countTokens(text, enc);
  const t0 = Date.now();
  process.env.OMEGA_NO_GENNADAS = '1';
  const A: any = tagstackEncode(text, enc);
  const msA1 = Date.now() - t0;
  const t1 = Date.now();
  delete process.env.OMEGA_NO_GENNADAS;
  const B: any = tagstackEncode(text, enc);
  const msB1 = Date.now() - t1;
  aTot += A.messageTokens; bTot += B.messageTokens; rawTot += raw; msA += msA1; msB += msB1;
  if (B.messageTokens < A.messageTokens) impr++;
  if (B.messageTokens > A.messageTokens) worse++;
  if (!B.exact) inexact++;
  rows.push({ lane: r.lane, path: r.path, raw, armA: A.messageTokens, armB: B.messageTokens, delta: B.messageTokens - A.messageTokens, exactA: A.exact, exactB: B.exact, msA: msA1, msB: msB1 });
  console.log(`${r.lane.padEnd(22)} raw=${String(raw).padStart(5)}  A=${String(A.messageTokens).padStart(5)}  B=${String(B.messageTokens).padStart(5)}  d=${String(B.messageTokens - A.messageTokens).padStart(3)}  exact=${A.exact}/${B.exact}  ${String(msA1).padStart(7)}/${String(msB1).padStart(7)}ms`);
}
fs.writeFileSync('bench/x100/receipts/gennadas29.json', JSON.stringify({ note: 'X100 GENNADAS 29-lane A/B, interleaved in one process, OMEGA_DET=1 OMEGA_NO_MEMO=1', rows, totals: { raw: rawTot, armA: aTot, armB: bTot, delta: bTot - aTot, improved: impr, worse, inexact, msA, msB } }, null, 1) + '\n');
console.log(`\n29-LANE TOTAL raw=${rawTot} armA=${aTot} armB=${bTot} d=${bTot - aTot} (${(100 * (bTot - aTot) / aTot).toFixed(3)}%)  improved=${impr} worse=${worse} inexact=${inexact}`);
console.log(`ms armA=${msA} armB=${msB}`);
