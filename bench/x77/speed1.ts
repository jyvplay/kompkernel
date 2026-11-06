/**
 * X77 / speed1 — WHERE DOES countTokens TIME GO?
 * X75's profile: 25.5% countTokens, with the chunk cache already at 99.4% hits on
 * ~143M lookups per lane. So the cost is the LOOKUPS themselves, not misses.
 * This measures the chunk-length distribution and the miss distribution, which decides
 * whether a direct-index fast path for very short chunks is worth building.
 */
import * as fs from 'node:fs';
import { countTokens, chunkCacheStats } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const RE = /[^\r\n\p{L}\p{N}]?[\p{Lu}\p{Lt}\p{Lm}\p{Lo}\p{M}]*[\p{Ll}\p{Lm}\p{Lo}\p{M}]+(?:'(?:[sStT]|[rR][eE]|[vV][eE]|[mM]|[lL][lL]|[dD]))?|[^\r\n\p{L}\p{N}]?[\p{Lu}\p{Lt}\p{Lm}\p{Lo}\p{M}]+[\p{Ll}\p{Lm}\p{Lo}\p{M}]*(?:'(?:[sStT]|[rR][eE]|[vV][eE]|[mM]|[lL][lL]|[dD]))?|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n/]*|\s*[\r\n]+|\s+(?!\S)|\s+/gu;

for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  RE.lastIndex = 0;
  const cs = t.match(RE) ?? [];
  const hist = new Map<number, number>();
  const seen = new Set<string>();
  let len1 = 0, len2 = 0, len34 = 0, len5p = 0;
  for (const c of cs) {
    const n = c.length;
    hist.set(n, (hist.get(n) ?? 0) + 1);
    if (n === 1) len1++; else if (n === 2) len2++; else if (n <= 4) len34++; else len5p++;
    seen.add(c);
  }
  const before = chunkCacheStats();
  // warm the cache, then time a pure re-count
  countTokens(t, enc);
  const s0 = chunkCacheStats();
  const N = 300;
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < N; i++) countTokens(t, enc);
  const t1 = process.hrtime.bigint();
  const s1 = chunkCacheStats();
  const ms = Number(t1 - t0) / 1e6 / N;
  console.log(`${p.split('/').pop()!.padEnd(22)} chars ${String(t.length).padStart(6)} chunks ${String(cs.length).padStart(6)} distinct ${String(seen.size).padStart(5)} | len1 ${String(len1).padStart(5)} len2 ${String(len2).padStart(5)} len3-4 ${String(len34).padStart(5)} len5+ ${String(len5p).padStart(5)} | ${ms.toFixed(3)} ms/call, hits/call ${Math.round((s1.hits - s0.hits) / N)} misses/call ${Math.round((s1.misses - s0.misses) / N)}`);
}
