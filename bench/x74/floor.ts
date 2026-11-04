/** X74: per-lane headroom. Compares the frontier's message to strong generic codecs,
 *  expressed in the same currency (o200k tokens) under three transport densities:
 *    - 14.8 bits/token : unreadable atom alphabet (OMEGA-XI class; NOT admissible)
 *    - 6.6  bits/token : stated base-100 mechanical transport (NOT readable)
 *    - 4.7  bits/token : English-like transport (the only admissible class)
 */
import * as fs from 'node:fs';
import * as zlib from 'node:zlib';
import { countTokens as T } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const prev = JSON.parse(fs.readFileSync('bench/x72/receipts/stadion-broad.json','utf8'));
const F = new Map<string, number>(prev.rows.map((r: any) => [r.path, r.tokens]));
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const raw = T(t, enc);
  const br = zlib.brotliCompressSync(Buffer.from(t, 'utf8'), { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: t.length } }).length;
  const zs = zlib.gzipSync(Buffer.from(t,'utf8'), { level: 9 }).length;
  const bits = br * 8;
  const frontier = F.get(p) ?? null;
  const f = frontier ?? 0;
  console.log(`${p.split('/').pop()!.padEnd(22)} raw ${String(raw).padStart(4)} br ${String(br).padStart(4)}B gz ${String(zs).padStart(4)}B | frontier ${String(frontier).padStart(4)} | atom@14.8 ${String(Math.ceil(bits/14.8)).padStart(4)} base100@6.6 ${String(Math.ceil(bits/6.6)).padStart(4)} eng@4.7 ${String(Math.ceil(bits/4.7)).padStart(4)} | frontier/eng ${frontier ? (frontier/(bits/4.7)).toFixed(2) : '-'}`);
}
