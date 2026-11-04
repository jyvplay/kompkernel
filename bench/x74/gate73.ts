/**
 * THE CONTROL — the same 29 lanes through the X73 IDENTITY ONLY
 * (`tagstackEncodeUncached`, no X74 candidates, memo cleared per lane), in the same
 * process mode as the treatment. Without this, the X74 delta would be confounded by
 * the stack's wall-clock-budgeted search: the parent itself returns different wires on
 * a fast machine and under OMEGA_DET=1 (measured: code-ts 985 wall-clock vs 969 DET).
 *
 * Receipt: bench/x74/receipts/gate73-<mode>.json
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncodeUncached } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const mode = typeof process !== 'undefined' && process.env?.OMEGA_DET === '1' ? 'det' : 'wall';
const rows: any[] = [];
const t00 = Date.now();
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const t0 = Date.now();
  const r: any = tagstackEncodeUncached(text, enc);
  rows.push({ path: p, raw: countTokens(text, enc), tokens: r.messageTokens, exact: r.decoded === text, ms: Date.now() - t0 });
  fs.writeFileSync(`bench/x74/receipts/gate73-${mode}.json`, JSON.stringify({
    mode, encoding: enc, rows, totalTokens: rows.reduce((a, b) => a + b.tokens, 0),
    exactLanes: rows.filter((r) => r.exact).length, totalMs: Date.now() - t00,
  }, null, 1) + '\n');
}
const tot = rows.reduce((a, b) => a + b.tokens, 0);
console.error(`LANES73 ${rows.length} TOTAL ${tot} exact ${rows.filter((r) => r.exact).length}/${rows.length} ms ${Date.now() - t00}`);
