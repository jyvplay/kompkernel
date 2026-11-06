import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { chunkCacheStats } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
for (const p of process.argv.slice(2)) {
  const t0 = process.hrtime.bigint();
  const r: any = tagstackEncode(fs.readFileSync(p, 'utf8'), enc);
  const ms = Math.round(Number(process.hrtime.bigint() - t0) / 1e6);
  const s: any = chunkCacheStats();
  const tot = s.hits + s.misses;
  console.log(`${p.split('/').pop()!.padEnd(20)} ${String(ms).padStart(6)} ms | chunk hits ${String(s.hits).padStart(9)} misses ${String(s.misses).padStart(7)} (hit ${(100 * s.hits / (tot || 1)).toFixed(2)}%) | short ${s.shortHits}/${s.shortMisses} long ${s.longHits}/${s.longMisses}`);
}
