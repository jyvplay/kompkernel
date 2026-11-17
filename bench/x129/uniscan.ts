/**
 * X130 — exhaustive-ish scan: which Unicode block gives a large pool of
 * one-token characters whose PAIRS merge into single tokens?
 * Steps 0x100 blocks over the BMP (skipping surrogates), plus a few SMP planes.
 */
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const N = 36;
type Row = { n: string; pool: number; rate: number; good: number; ltr: boolean };
const rows: Row[] = [];
const blocks: Array<[number, number, string]> = [];
for (let cp = 0x0300; cp < 0xd000; cp += 0x80) blocks.push([cp, cp + 0x7f, 'U+' + cp.toString(16)]);
for (let cp = 0xe000; cp < 0x10000; cp += 0x80) blocks.push([cp, cp + 0x7f, 'U+' + cp.toString(16)]);
for (const [a, b, nm] of blocks) {
  const pool: string[] = [];
  for (let cp = a; cp <= b && pool.length < N; cp++) {
    if (cp >= 0xd800 && cp <= 0xdfff) continue;
    const c = String.fromCodePoint(cp);
    try { if (countTokens(c, enc) === 1) pool.push(c); } catch { /* skip */ }
  }
  if (pool.length < 20) continue;
  let merge = 0, tot = 0;
  for (const x of pool) for (const y of pool) { if (x === y) continue; tot++; if (countTokens(x + y, enc) === 1) merge++; }
  const rate = merge / Math.max(1, tot);
  let good = 0;
  for (const x of pool) { let k = 0; for (const y of pool) if (x !== y && countTokens(x + y, enc) === 1) k++; if (k >= 8) good++; }
  if (rate > 0.05) rows.push({ n: nm, pool: pool.length, rate, good, ltr: true });
}
rows.sort((p, q) => q.rate - p.rate);
console.log('block      pool  pairMerge  charsWith>=8partners');
for (const r of rows.slice(0, 25)) console.log(`${r.n.padEnd(10)} ${String(r.pool).padStart(4)}  ${(r.rate * 100).toFixed(1).padStart(7)}%   ${String(r.good).padStart(3)}/${r.pool}`);
