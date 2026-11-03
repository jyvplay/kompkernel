/**
 * X72 gate: STADION over the same 29 lanes X71 used, with wall clock.
 *
 * Two claims are checked here, not asserted:
 *   1. FIDELITY — every message decodes to its input byte for byte (`exact`).
 *   2. TOKEN IDENTITY — the accelerated counter must not move a single number.
 *      The comparison is against `bench/x71/receipts/austere-broad.json`, which
 *      was produced BEFORE the acceleration existed, on the same machine. Where
 *      the frontier is inherently run-to-run variable (it has clock-gated paths)
 *      the row is marked `drift` and reported with the delta rather than hidden.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { stadionEncode } from '../../src/lib/omega/stadion';
const enc: any = 'o200k_base';
const prev = (() => { try { return JSON.parse(fs.readFileSync('bench/x71/receipts/austere-broad.json', 'utf8')); } catch { return null; } })();
const priorByPath = new Map<string, number>((prev?.rows ?? []).map((r: any) => [r.path, r.frontier]));
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const t0 = Date.now();
  const r: any = stadionEncode(text, enc);
  const ms = Date.now() - t0;
  const prior = priorByPath.get(p);
  const row = { path: p, raw: countTokens(text, enc), tokens: r.messageTokens, prior,
    delta: prior === undefined ? null : r.messageTokens - prior,
    folded: r.folded, parent: r.parentCodec, exact: r.decoded === text, ms };
  rows.push(row);
  console.error(`${p}: raw ${row.raw} tokens ${row.tokens} prior ${prior} delta ${row.delta} folded=${row.folded} ${row.parent} exact=${row.exact} ${ms}ms`);
  fs.mkdirSync('bench/x72/receipts', { recursive: true });
  fs.writeFileSync('bench/x72/receipts/stadion-broad.json', JSON.stringify({
    encoding: enc, node: process.version, rows,
    totalTokens: rows.reduce((a, b) => a + b.tokens, 0),
    totalPrior: rows.reduce((a, b) => a + (b.prior ?? 0), 0),
    totalMs: rows.reduce((a, b) => a + b.ms, 0),
  }, null, 1) + '\n');
}
const tot = rows.reduce((a, b) => a + b.tokens, 0);
const tp = rows.reduce((a, b) => a + (b.prior ?? 0), 0);
const tms = rows.reduce((a, b) => a + b.ms, 0);
const drift = rows.filter(r => r.delta !== null && r.delta !== 0);
console.error(`lanes ${rows.length} total ${tot} prior ${tp} delta ${tot - tp} folded ${rows.filter(r => r.folded).length} driftRows ${drift.length} totalMs ${tms}`);
for (const d of drift) console.error(`  drift ${d.path} ${d.prior} -> ${d.tokens}`);
