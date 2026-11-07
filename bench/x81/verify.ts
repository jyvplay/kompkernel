/** X81 HARMOS — end-to-end verification against the real codec file */
import * as fs from 'node:fs';
import { harmosEncode, harmosDecode } from '../../src/lib/omega/harmos';
const enc: any = 'o200k_base';
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const r = harmosEncode(S, enc);
  const n = p.split('/').pop()!;
  const rt = r.decoded === S;
  const dec = harmosDecode(r.message) === S;
  console.log(`${n.padEnd(22)} F ${String(r.frontierTokens).padStart(5)} -> ${String(r.messageTokens).padStart(5)} (${r.messageTokens - r.frontierTokens >= 0 ? '+' : ''}${r.messageTokens - r.frontierTokens}) applied=${r.applied} rt=${rt} dec=${dec}`);
  if (!rt) console.log('   !!! ROUND TRIP FAILED');
  rows.push({ lane: n, F: r.frontierTokens, M: r.messageTokens, applied: r.applied, rt, dec, forms: r.forms, contract: r.contractTokens, notes: r.notes });
}
fs.writeFileSync('bench/x81/receipts/harmos.json', JSON.stringify(rows, null, 1) + '\n');
const a = rows.filter(r => r.applied);
console.log(`\nAPPLIED ${a.length}/${rows.length}  total delta ${a.reduce((x, r) => x + (r.M - r.F), 0)}`);
