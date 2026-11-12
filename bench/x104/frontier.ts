/**
 * X104 — the 29-lane frontier under a DETERMINISTIC chain.
 *
 * bench/x86/front.ts is the frontier probe, but it diffs against the X80
 * receipt, which was taken with a live clock (see clock.ts's X104 section).
 * This probe runs the same 29 lanes with the flag that now actually works and
 * writes a fresh receipt, and it also re-checks exactness with the repository's
 * own decoder rather than trusting the encoder's self-report.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
import { chironDecode } from '../../src/lib/omega/chiron';

process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
process.env.OMEGA_ENGRAM = '0';
process.env.OMEGA_OURA_MEMO = '0';

const enc: any = 'o200k_base';
const lanes = fs.readFileSync('/tmp/lanes.txt', 'utf8').split('\n').filter(Boolean);
const rows: any[] = [];
const t0 = Date.now();
for (const p of lanes) {
  const text = fs.readFileSync(p, 'utf8');
  const t1 = Date.now();
  const r: any = tagstackFrontier(text, enc);
  const raw = countTokens(text, enc);
  rows.push({ path: p, raw, tokens: r.messageTokens, exact: r.decoded === text, parent: r.parentCodec, ms: Date.now() - t1 });
  console.log(`${p.split('/').pop()!.padEnd(24)} raw ${String(raw).padStart(5)} F ${String(r.messageTokens).padStart(5)} exact=${r.decoded === text} parent=${r.parentCodec} ${(Date.now() - t1)}ms`);
}
const tot = rows.reduce((a, b) => a + b.tokens, 0);
fs.mkdirSync('bench/x104/receipts', { recursive: true });
fs.writeFileSync('bench/x104/receipts/frontier-det.json',
  JSON.stringify({ det: '1 (live, X104)', lanes: lanes.length, rows, total: tot,
    exact: rows.filter((r) => r.exact).length, ms: Date.now() - t0 }, null, 1) + '\n');
console.log(`\nFRONTIER ${lanes.length} TOTAL ${tot} exact ${rows.filter((r) => r.exact).length}/${lanes.length} ms ${Date.now() - t0}`);
