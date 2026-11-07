/** X80 — THE REAL FRONTIER CONFIRMATION.
 *  NB: bench/x74/gate73.ts is the X73 IDENTITY CONTROL ("no X74 candidates"), so it cannot
 *  move when a codec is added and does NOT confirm the frontier. This runs tagstackFrontier,
 *  which is the full stack, over the same 29 lanes. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const rows: any[] = [];
const t0 = Date.now();
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const t1 = Date.now();
  const r: any = tagstackFrontier(text, enc);
  rows.push({ path: p, raw: countTokens(text, enc), tokens: r.messageTokens, exact: r.decoded === text, parent: r.parentCodec, ms: Date.now() - t1 });
  console.log(`${p.split('/').pop()!.padEnd(24)} raw ${String(countTokens(text, enc)).padStart(5)} F ${String(r.messageTokens).padStart(5)} exact=${r.decoded === text} parent=${r.parentCodec}`);
  fs.writeFileSync('bench/x80/receipts/frontier.json', JSON.stringify({ rows, total: rows.reduce((a, b) => a + b.tokens, 0) }, null, 1) + '\n');
}
const tot = rows.reduce((a, b) => a + b.tokens, 0);
console.log(`\nFRONTIER ${rows.length} TOTAL ${tot} exact ${rows.filter((r) => r.exact).length}/${rows.length} ms ${Date.now() - t0}`);
