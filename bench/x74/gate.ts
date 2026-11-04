/**
 * X74 gate — the 29 lanes through `tagstackEncode`, the identity that carries the
 * X73 and X74 candidates. Each row records the complete message the winner emits,
 * the lane's previous number (X72 receipt = the configuration the last turn ended
 * on), and whether the emitted message decodes to the source byte for byte.
 *
 * Receipt: bench/x74/receipts/gate.json
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode, tagstackMemoStats, tagstackMemoClear } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const prev = JSON.parse(fs.readFileSync('bench/x72/receipts/stadion-broad.json', 'utf8'));
const priorByPath = new Map<string, number>(prev.rows.map((r: any) => [r.path, r.tokens]));
const rows: any[] = [];
const t00 = Date.now();
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  tagstackMemoClear();
  const t0 = Date.now();
  const r: any = tagstackEncode(text, enc);
  const ms = Date.now() - t0;
  const prior = priorByPath.get(p) ?? null;
  const row = {
    path: p, raw: countTokens(text, enc), tokens: r.messageTokens, prior,
    delta: prior === null ? null : r.messageTokens - prior,
    arm: String(r.notes).split(' ')[0], exact: r.decoded === text, ms,
    memo: tagstackMemoStats(),
  };
  rows.push(row);
  console.error(`${p}: raw ${row.raw} tok ${row.tokens} prior ${prior} delta ${row.delta} ${row.arm} exact=${row.exact} ${ms}ms`);
  fs.writeFileSync('bench/x74/receipts/gate.json', JSON.stringify({
    encoding: enc, node: process.version, rows,
    totalTokens: rows.reduce((a, b) => a + b.tokens, 0),
    totalPrior: rows.reduce((a, b) => a + (b.prior ?? 0), 0),
    exactLanes: rows.filter((r) => r.exact).length,
    totalMs: Date.now() - t00,
  }, null, 1) + '\n');
}
const tot = rows.reduce((a, b) => a + b.tokens, 0);
const tp = rows.reduce((a, b) => a + (b.prior ?? 0), 0);
console.error(`LANES ${rows.length} TOTAL ${tot} PRIOR ${tp} DELTA ${tot - tp} exact ${rows.filter((r) => r.exact).length}/${rows.length} ms ${Date.now() - t00}`);
for (const d of rows.filter((r) => r.delta !== null && r.delta !== 0)) console.error(`  delta ${d.path} ${d.prior} -> ${d.tokens} (${d.delta})`);
