import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const t0 = Date.now();
  const r: any = tagstackEncode(text, enc);
  const row = { path: p, chars: text.length, raw: countTokens(text, enc), frontier: r.messageTokens, winner: r.parentCodec, exact: r.decoded === text, ms: Date.now() - t0, costs: r.frontierCosts };
  rows.push(row);
  console.error(`${p}: raw ${row.raw} frontier ${row.frontier} (${row.winner}) ${((1 - row.frontier / row.raw) * 100).toFixed(1)}% ${row.ms}ms exact=${row.exact}`);
  fs.mkdirSync('bench/x71/receipts', { recursive: true });
  fs.writeFileSync('bench/x71/receipts/census.json', JSON.stringify(rows, null, 1) + '\n');
}
