import * as fs from 'node:fs';
import { parataxisEncode } from '../../src/lib/omega/parataxis';
const enc: any = 'o200k_base';
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const r: any = parataxisEncode(S, enc);
  const d = r.applied ? r.messageTokens - r.frontierTokens : 0;
  rows.push({ lane: p.split('/').pop(), F: r.frontierTokens, after: r.messageTokens, d, applied: r.applied, exact: r.decoded === S, notes: r.notes });
  console.log(`${p.split('/').pop()!.padEnd(22)} F ${String(r.frontierTokens).padStart(4)} | ${r.applied ? String(d).padStart(5) : '  --  '} | exact=${r.decoded === S} | ${r.notes.slice(0, 70)}`);
}
const hit = rows.filter((r) => r.applied);
console.log(`\nPARATAXIS HIT ${hit.length}/${rows.length} | saved ${hit.reduce((a, r) => a + r.d, 0)}`);
fs.writeFileSync('bench/x80/receipts/parataxis.json', JSON.stringify(rows, null, 1) + '\n');
