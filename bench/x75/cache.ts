/** Where does the count budget go: chunk-cache hit rate and long-count hit rate. */
import * as fs from 'node:fs';
import { countTokens, chunkCacheStats } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const s0 = chunkCacheStats();
  const r: any = tagstackFrontier(t, enc);
  const s1 = chunkCacheStats();
  const d = (a: number, b: number) => b - a;
  console.log(`${p.split('/')!.pop()!.padEnd(20)} tok ${String(r.messageTokens).padStart(5)} | chunk hits ${String(d(s0.hits, s1.hits)).padStart(8)} miss ${String(d(s0.misses, s1.misses)).padStart(8)} rate ${(d(s0.hits, s1.hits) / Math.max(1, d(s0.hits, s1.hits) + d(s0.misses, s1.misses)) * 100).toFixed(1)}% | long hits ${String(d(s0.longHits ?? 0, s1.longHits ?? 0)).padStart(7)} miss ${String(d(s0.longMisses ?? 0, s1.longMisses ?? 0)).padStart(7)} | fallbacks ${d(s0.fallbacks, s1.fallbacks)}`);
}
