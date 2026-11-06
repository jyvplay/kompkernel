/** X78 — where does countTokens' time actually go? Phase-isolated micro-benchmark. */
import * as fs from 'node:fs';
import { countTokens, chunkCacheStats } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const re = /[^\r\n\p{L}\p{N}]?[\p{Lu}\p{Lt}\p{Lm}\p{Lo}\p{M}]*[\p{Ll}\p{Lm}\p{Lo}\p{M}]+(?:'(?:[sStT]|[rR][eE]|[vV][eE]|[mM]|[lL][lL]|[dD]))?|[^\r\n\p{L}\p{N}]?[\p{Lu}\p{Lt}\p{Lm}\p{Lo}\p{M}]+[\p{Ll}\p{Lm}\p{Lo}\p{M}]*(?:'(?:[sStT]|[rR][eE]|[vV][eE]|[mM]|[lL][lL]|[dD]))?|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n/]*|\s*[\r\n]+|\s+(?!\S)|\s+/gu;

// build a representative candidate population: the kind of strings the search counts
const texts: string[] = [];
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  texts.push(t);
  for (let i = 0; i + 400 < t.length; i += 61) texts.push(t.slice(i, i + 400));
}
console.log(`${texts.length} candidate strings, ${texts.reduce((a, s) => a + s.length, 0)} chars`);

// warm every cache so we measure the STEADY STATE the search actually runs in
for (const s of texts) countTokens(s, enc);
const st0 = chunkCacheStats();
console.log(`after warm: hits ${st0.hits} misses ${st0.misses} fallbacks ${st0.fallbacks} cacheSize ${st0.chunkSize}`);

const N = 5;
let tMatch = 0, tLoop = 0, tFull = 0, chunks = 0;
for (let it = 0; it < N; it++) {
  for (const s of texts) {
    if (s.length < 24) continue;
    let a = process.hrtime.bigint();
    re.lastIndex = 0;
    const cs = s.match(re);
    let b = process.hrtime.bigint();
    if (cs) {
      let cov = 0;
      for (let i = 0; i < cs.length; i++) cov += cs[i].length;
      chunks += cs.length;
      if (cov === s.length) tLoop += Number(process.hrtime.bigint() - b);
    }
    tMatch += Number(b - a);
    const c = process.hrtime.bigint();
    countTokens(s, enc);
    tFull += Number(process.hrtime.bigint() - c);
  }
}
const ms = (x: number) => (x / 1e6).toFixed(0);
console.log(`\nregex match (allocates): ${ms(tMatch)} ms   <-- phase A`);
console.log(`cover check loop:        ${ms(tLoop)} ms`);
console.log(`FULL countTokens:        ${ms(tFull)} ms   (over ${N} passes x ${texts.length} strings)`);
console.log(`=> match+covers is ${((tMatch + tLoop) / tFull * 100).toFixed(1)}% of countTokens; the rest is the cache-lookup loop + misses`);
console.log(`chunks per pass: ${(chunks / N).toFixed(0)}`);
