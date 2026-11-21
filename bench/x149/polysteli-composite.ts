// X149 ΠΟΛΥΣΤΗΛΗ chain composite: incumbent = shipped chain with OMEGA_NO_POLYSTELI=1,
// candidate = shipped chain with the codec wired. Byte-exact + strict gain gates inside.
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
// canonical frontier flags: identical configuration to bench/x149/frontier-worker.mjs
process.env.OMEGA_DET = '1'; process.env.OMEGA_NO_MEMO = '1'; process.env.OMEGA_ENGRAM = '0';
process.env.OMEGA_OURA_MEMO = '0'; process.env.OMEGA_NO_OROTHESIA = '1';
const lanes = process.argv.slice(2);
let out = '';
for (const p of lanes) {
  const text = fs.readFileSync(p, 'utf8');
  process.env.OMEGA_NO_POLYSTELI = '1';
  const t0 = Date.now(); const inc = tagstackEncode(text, enc); const incMs = Date.now() - t0;
  if (inc.decoded !== text) { console.log('BAD INCUMBENT', p); process.exit(3); }
  delete process.env.OMEGA_NO_POLYSTELI;
  const t1 = Date.now(); const cand = tagstackEncode(text, enc); const candMs = Date.now() - t1;
  if (cand.decoded !== text) { console.log('BAD CANDIDATE', p); process.exit(3); }
  const row = { path: p, incumbent: inc.messageTokens, candidate: cand.messageTokens, delta: inc.messageTokens - cand.messageTokens, incMs, candMs, notes: cand.notes };
  out += JSON.stringify(row) + '\n';
  fs.writeFileSync('bench/x149/receipts/polysteli-composite.jsonl', out);
  console.log(p, row.incumbent, '->', row.candidate, row.delta, Math.round(incMs / 1000) + 's/' + Math.round(candMs / 1000) + 's');
}
