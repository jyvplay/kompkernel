/**
 * X44 screen 7 — THE HIGHEST-INFORMATION TEST RECORDED AT THE END OF X43.
 *
 * KRISIS gates a layer off only when its best candidate shows no benefit on the
 * SOURCE text. That test is conservative but weak, and screen 6 of X43 showed
 * exactly why: pom.xml prices ANTISTROPHE at -16 raw against a clause of 6 and
 * keeps it, and it then returns no gain at all, while ls-full-iso prices it at
 * only -9 and keeps it, and there it IS the winner. A -16 that loses and a -9
 * that wins cannot be separated by any test computed on the source alone.
 *
 * The hypothesis is that a test computed one level DOWN the stack can separate
 * them. chironEncode costs 203 ms on pom.xml against 36,505 ms for the
 * ouraEncode trial it would stand in for -- 180x cheaper -- and unlike the raw
 * token count it already accounts for the dictionary and shape rules that eat
 * most of the redundancy a swap appears to remove.
 *
 * The test is a confusion matrix. For each candidate swap on a lane where
 * ANTISTROPHE loses and a lane where it wins, compare
 *     surrogate verdict : chironEncode(swapped) < chironEncode(text)
 * against
 *     true verdict      : the full lower-stack encode of swapped beats text
 * A surrogate that says "no" wherever the truth is "no", and "yes" wherever the
 * truth is "yes", would let eight of the seventeen lanes measured in X43 drop
 * from 1.0x to something much faster. A surrogate that disagrees on the winner
 * is worthless and must not be shipped.
 *
 * Also reads bpe.ts's own cache counters, which already exist, to show how much
 * of the wall clock is repeated tokenization of identical strings and how much is
 * irreducible work over distinct ones.
 */
import { readFileSync } from 'node:fs';
import { countTokens, chunkCacheStats, chunkCacheClear, type EncodingName } from '@/lib/omega/bpe';
import { chironEncode } from '@/lib/omega/chiron';
import { ouraEncode } from '@/lib/omega/oura';
import { antistrophePairsFor, antistropheSwap, antistropheClausesFor } from '@/lib/omega/antistrophe';

const enc = (process.env.ENC || 'o200k_base') as EncodingName;
const clauseTok = (c: string) =>
  c ? countTokens(' ' + c + ' print only.', enc) - countTokens(' print only.', enc) : 0;

for (const p of (process.env.LANES || '').split(',').map((s) => s.trim()).filter(Boolean)) {
  const t = readFileSync(p, 'utf8');
  const nm = p.split('/').pop()!;
  chunkCacheClear();

  const baseRaw = countTokens(t, enc);
  const t0 = Date.now();
  const cBase = chironEncode(t, enc);
  const tChiron = Date.now() - t0;
  const t1 = Date.now();
  const oBase = ouraEncode(t, enc);
  const tOura = Date.now() - t1;

  console.log(`\n=== ${nm}  (${t.length} chars, raw ${baseRaw})`);
  console.log(`  chironEncode  : ${String(cBase.messageTokens).padStart(5)} tok in ${String(tChiron).padStart(6)} ms`);
  console.log(`  ouraEncode    : ${String(oBase.messageTokens).padStart(5)} tok in ${String(tOura).padStart(6)} ms   ratio ${(tOura / Math.max(tChiron, 1)).toFixed(0)}x`);

  const pairs = antistrophePairsFor(t);
  const cands: Array<[string, string, number]> = [];
  for (const [a, b] of pairs) {
    const d = countTokens(antistropheSwap(t, a, b), enc) - baseRaw;
    if (d < 0) cands.push([a, b, d]);
  }
  cands.sort((x, y) => x[2] - y[2]);
  console.log(`  auction: ${pairs.length} pairs, ${cands.length} negative; taking top ${Math.min(3, cands.length)}`);
  console.log('  pair        rawD   clause  SURROGATE(chiron)          TRUE(oura)                 agree');

  let agree = 0, tot = 0;
  for (const [a, b, d] of cands.slice(0, 3)) {
    const sw = antistropheSwap(t, a, b);
    const cl = Math.min(...antistropheClausesFor(a, b).map(clauseTok));
    const t2 = Date.now(); const cSw = chironEncode(sw, enc); const tc = Date.now() - t2;
    const t3 = Date.now(); const oSw = ouraEncode(sw, enc); const to = Date.now() - t3;
    const surWin = cSw.messageTokens + cl < cBase.messageTokens;
    const trueWin = oSw.messageTokens + cl < oBase.messageTokens;
    tot++; if (surWin === trueWin) agree++;
    console.log(`  ${JSON.stringify(a + b).padEnd(11)} ${String(d).padStart(5)}  ${String(cl).padStart(5)}   ${String(cSw.messageTokens).padStart(5)} (${surWin ? 'WIN ' : 'lose'}, ${String(tc).padStart(5)}ms)   ${String(oSw.messageTokens).padStart(5)} (${trueWin ? 'WIN ' : 'lose'}, ${String(to).padStart(6)}ms)   ${surWin === trueWin ? 'yes' : '*** NO ***'}`);
  }
  const st = chunkCacheStats();
  const calls = st.shortHits + st.shortMisses + st.longHits + st.longMisses;
  console.log(`  surrogate agreement: ${agree}/${tot}`);
  console.log(`  bpe cache over this lane: ${calls} countTokens calls, hit rate ${(100 * (st.shortHits + st.longHits) / Math.max(calls, 1)).toFixed(1)}%`);
  console.log(`    short ${st.shortHits}h/${st.shortMisses}m  long ${st.longHits}h/${st.longMisses}m  chunk ${st.hits}h/${st.misses}m  fallbacks ${st.fallbacks}`);
  console.log(`    distinct long strings tokenized: ${st.longSize}; distinct short: ${st.shortSize}`);
}
