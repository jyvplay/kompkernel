import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { austereEncode } from '../../src/lib/omega/austere';
const enc: any = 'o200k_base';
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const t0 = Date.now();
  const r: any = austereEncode(text, enc);
  const ms = Date.now() - t0;
  const row = { path: p, raw: countTokens(text, enc), frontier: r.frontierTokens, brachys: r.brachysTokens, austere: r.messageTokens, delta: r.messageTokens - r.frontierTokens, band: r.band, contract: r.contractTokens, applied: r.applied, exact: r.decoded === text, ms };
  rows.push(row);
  console.error(`${p}: raw ${row.raw} frontier ${row.frontier} brachys ${row.brachys} austere ${row.austere} (${row.delta}) band=${row.band} c=${row.contract} exact=${row.exact} ${ms}ms`);
  fs.mkdirSync('bench/x71/receipts', { recursive: true });
  const tf = rows.reduce((a, b) => a + b.frontier, 0), ta = rows.reduce((a, b) => a + b.austere, 0);
  fs.writeFileSync('bench/x71/receipts/austere-broad.json', JSON.stringify({ encoding: enc, node: process.version, rows, totalFrontier: tf, totalAustere: ta }, null, 1) + '\n');
}
const tf = rows.reduce((a, b) => a + b.frontier, 0), ta = rows.reduce((a, b) => a + b.austere, 0);
const wins = rows.filter((r) => r.delta < 0).length;
console.error(`lanes ${rows.length} wins ${wins} total frontier ${tf} total austere ${ta} saved ${ta - tf}`);
