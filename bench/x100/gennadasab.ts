/**
 * X100 — ΓΕΝΝΑΔΑΣ END-TO-END A/B ON THE REAL CHAIN.
 * Two arms, interleaved lane by lane in ONE process so the load-sensitivity defect
 * (X97: the shipped encoder produces 846/850/858/874 for identical bytes across
 * processes, all exact=true) cannot masquerade as a codec effect:
 *   arm A = the chain as shipped (OMEGA_NO_GENNADAS=1)
 *   arm B = the chain with ΓΕΝΝΑΔΑΣ
 * Both arms run the full tagstackEncode from the SOURCE, so the number reported is
 * the whole-message cost a user would actually pay, and the only difference between
 * the arms is the new codec.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';

process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
const enc: any = 'o200k_base';
const wireDir = 'bench/x87/receipts/wires';
const lanes = fs.readdirSync(wireDir).filter((f) => f.endsWith('.wire.txt')).map((f) => f.replace('.wire.txt', ''));
const srcPath = (lane: string): string => {
  for (const d of ['bench/holdout-x41', 'bench/holdout', 'bench/holdout-work', 'bench/holdout-x42', 'bench/holdout-x42b', 'bench/holdout-tbl', 'bench/holdout-x40', 'bench/holdout-ops', 'bench/holdout-lang', 'bench/holdout-mk', 'bench/holdout-x86', 'bench/holdout-x87']) {
    for (const e of ['', '.txt', '.md', '.patch']) { const f = `${d}/${lane}${e}`; if (fs.existsSync(f)) return f; }
  }
  throw new Error('no source for ' + lane);
};
const rows: any[] = [];
let aTot = 0, bTot = 0, msA = 0, msB = 0;
for (const lane of lanes) {
  const text = fs.readFileSync(srcPath(lane), 'utf8');
  const raw = countTokens(text, enc);
  const t0 = Date.now();
  process.env.OMEGA_NO_GENNADAS = '1';
  const A: any = tagstackEncode(text, enc);
  const msA1 = Date.now() - t0;
  const t1 = Date.now();
  delete process.env.OMEGA_NO_GENNADAS;
  const B: any = tagstackEncode(text, enc);
  const msB1 = Date.now() - t1;
  aTot += A.messageTokens; bTot += B.messageTokens; msA += msA1; msB += msB1;
  rows.push({ lane, raw, armA: A.messageTokens, armB: B.messageTokens, delta: B.messageTokens - A.messageTokens, exactA: A.exact, exactB: B.exact, msA: msA1, msB: msB1, notesB: B.notes });
  console.log(`${lane.padEnd(18)} raw=${String(raw).padStart(5)}  A(no GENNADAS)=${String(A.messageTokens).padStart(5)}  B(GENNADAS)=${String(B.messageTokens).padStart(5)}  d=${String(B.messageTokens - A.messageTokens).padStart(3)}  exact=${A.exact}/${B.exact}  ${String(msA1).padStart(6)}/${String(msB1).padStart(6)}ms`);
}
fs.writeFileSync('bench/x100/receipts/gennadasab.json', JSON.stringify({ note: 'X100 GENNADAS end-to-end A/B on the real chain, interleaved in one process, OMEGA_DET=1 OMEGA_NO_MEMO=1', rows, totals: { armA: aTot, armB: bTot, delta: bTot - aTot, msA, msB } }, null, 1) + '\n');
console.log(`\nTOTAL armA=${aTot}  armB=${bTot}  d=${bTot - aTot} (${(100 * (bTot - aTot) / aTot).toFixed(3)}%)   ms armA=${msA} armB=${msB}`);
