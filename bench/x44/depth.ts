/**
 * X44 screen 8 — WHERE IN THE STACK DOES A SWAP'S BENEFIT BECOME VISIBLE?
 *
 * screen 7 refuted the cheap surrogate. On ls-full-iso the swap "."<->"/" is the
 * one that WINS, and chironEncode cannot see it: chiron(text)=423 against
 * chiron(swapped)=422, a one-token difference that a 5-token clause swallows, so
 * the surrogate says "lose". The truth three layers down is oura(text)=367
 * against oura(swapped)=361, which beats the clause and wins. On pom.xml, where
 * ANTISTROPHE genuinely loses, chiron agreed with the truth on all three
 * candidates -- so the surrogate is right exactly where it does not matter and
 * wrong exactly where it does.
 *
 * The conclusion is structural, not incidental: a character swap changes
 * punctuation, and punctuation is what the FRAMING and COLUMN layers key on, so
 * the benefit is created by layers that sit BELOW chiron in cost but ABOVE it in
 * the stack. If that is where it appears, a surrogate taken at that depth should
 * be predictive while still being much cheaper than a full trial.
 *
 * This walks the stack one layer at a time and reports, for each depth, whether
 * that layer's own verdict on the swap matches the full-stack truth. The shallowest
 * layer that is always right is the cheapest safe surrogate, and the price ratio
 * against a full ouraEncode trial is the speedup on offer.
 */
import { readFileSync } from 'node:fs';
import { countTokens, chunkCacheStats, chunkCacheClear, type EncodingName } from '@/lib/omega/bpe';
import { chironEncode } from '@/lib/omega/chiron';
import { anadiplosisEncode } from '@/lib/omega/anadiplosis';
import { euteleiaEncode } from '@/lib/omega/euteleia';
import { ouraEncode } from '@/lib/omega/oura';
import { antistrophePairsFor, antistropheSwap, antistropheClausesFor } from '@/lib/omega/antistrophe';

const enc = (process.env.ENC || 'o200k_base') as EncodingName;
const clauseTok = (c: string) =>
  c ? countTokens(' ' + c + ' print only.', enc) - countTokens(' print only.', enc) : 0;

const LAYERS: Array<[string, (t: string) => any]> = [
  ['chiron     ', (t) => chironEncode(t, enc)],
  ['anadiplosis', (t) => anadiplosisEncode(t, enc)],
  ['euteleia   ', (t) => euteleiaEncode(t, enc)],
  ['oura       ', (t) => ouraEncode(t, enc)],
];

for (const p of (process.env.LANES || '').split(',').map((s) => s.trim()).filter(Boolean)) {
  const t = readFileSync(p, 'utf8');
  const nm = p.split('/').pop()!;
  const baseRaw = countTokens(t, enc);

  const cands: Array<[string, string, number]> = [];
  for (const [a, b] of antistrophePairsFor(t)) {
    const d = countTokens(antistropheSwap(t, a, b), enc) - baseRaw;
    if (d < 0) cands.push([a, b, d]);
  }
  cands.sort((x, y) => x[2] - y[2]);
  const pick = cands.slice(0, Number(process.env.CANDS || 2));
  console.log(`\n=== ${nm}  (${t.length} ch, raw ${baseRaw}); ${cands.length} negative swaps, testing top ${pick.length}`);

  for (const [a, b, d] of pick) {
    const sw = antistropheSwap(t, a, b);
    const cl = Math.min(...antistropheClausesFor(a, b).map(clauseTok));
    console.log(`  swap ${JSON.stringify(a + b)} rawD=${d} clause=${cl}`);
    for (const [lname, fn] of LAYERS) {
      chunkCacheClear();
      const s0 = chunkCacheStats();
      const t0 = Date.now(); const rT = fn(t); const msT = Date.now() - t0;
      const t1 = Date.now(); const rS = fn(sw); const msS = Date.now() - t1;
      const s1 = chunkCacheStats();
      const calls = s1.shortHits + s1.shortMisses + s1.longHits + s1.longMisses
                  - (s0.shortHits + s0.shortMisses + s0.longHits + s0.longMisses);
      const win = rS.messageTokens + cl < rT.messageTokens;
      console.log(`    ${lname}  text=${String(rT.messageTokens).padStart(5)}  swapped=${String(rS.messageTokens).padStart(5)}  ${win ? 'WIN ' : 'lose'}   ${(msT + msS)} ms   ${(calls / 1e6).toFixed(2)}M countTokens calls`);
    }
  }
}
