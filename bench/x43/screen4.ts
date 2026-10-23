/** X43 screen 4 — split ANTISTROPHE's 95 s into auction vs recursive encodes. */
import { readFileSync } from 'node:fs';
import { countTokens, type EncodingName } from '@/lib/omega/bpe';
import { ouraEncode } from '@/lib/omega/oura';
import { antistrophePairsFor, antistropheSwap } from '@/lib/omega/antistrophe';

const enc = (process.env.ENC || 'o200k_base') as EncodingName;
for (const p of (process.env.LANES || '').split(',').map(s=>s.trim()).filter(Boolean)) {
  const t = readFileSync(p, 'utf8');
  console.log(`\n=== ${p.split('/').pop()} (${t.length} chars)`);

  let t0 = Date.now(); const parent = ouraEncode(t, enc); const tParent = Date.now()-t0;
  console.log(`  ouraEncode(text) x1      : ${String(tParent).padStart(7)} ms  msg=${parent.messageTokens}`);

  const pairs = antistrophePairsFor(t);
  t0 = Date.now();
  const base = countTokens(t, enc);
  let neg = 0;
  for (const [a,b] of pairs) { if (countTokens(antistropheSwap(t,a,b), enc) - base < 0) neg++; }
  const tAuc = Date.now()-t0;
  console.log(`  auction (${String(pairs.length).padStart(3)} pairs)      : ${String(tAuc).padStart(7)} ms  (${(tAuc/Math.max(pairs.length,1)).toFixed(1)} ms/pair)  ${neg} negative`);

  t0 = Date.now(); const s1 = antistropheSwap(t, pairs[0][0], pairs[0][1]); const tSwap = Date.now()-t0;
  console.log(`  one antistropheSwap      : ${String(tSwap).padStart(7)} ms`);
  t0 = Date.now(); countTokens(s1, enc); const tTok = Date.now()-t0;
  console.log(`  one countTokens(swapped) : ${String(tTok).padStart(7)} ms`);

  t0 = Date.now(); const r1 = ouraEncode(antistropheSwap(t, pairs[0][0], pairs[0][1]), enc); const tTrial = Date.now()-t0;
  console.log(`  one TRIAL ouraEncode     : ${String(tTrial).padStart(7)} ms  msg=${r1.messageTokens}`);

  console.log(`  => predicted total: parent ${tParent} + auction ${tAuc} + 2 trials ${2*tTrial} = ${tParent+tAuc+2*tTrial} ms`);
}
