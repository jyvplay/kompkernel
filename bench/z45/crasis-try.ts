import fs from 'node:fs';
import { crasisEncode, crasisDecode, crasisDecoderPrompt, crasisPlan } from '../../src/lib/omega/crasis';
import { countTokens } from '../../src/lib/omega/bpe';
const enc = (process.env.ENC || 'o200k_base') as any;
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const t0 = Date.now();
  const r = crasisEncode(t, enc);
  const ms = Date.now() - t0;
  const promptOk = crasisDecoderPrompt(r.wire) === r.decoderPrompt;
  const mTok = countTokens(r.decoderPrompt, enc);
  console.log(`${f.split('/').pop()!.padEnd(34)} raw=${r.inTokens} plainM=${r.plainMessageTokens} crasisM=${r.messageTokens} (${mTok}) applied=${r.crasisApplied} rules=${r.crasisRules.join('')}${r.crasisFenced ? '/fence' : ''} gain=${r.crasisGain} fused=${r.crasisFusedSites}/${r.crasisSites} exact=${r.exact} decode=${crasisDecode(r.wire) === t} promptOk=${promptOk} ms=${ms}`);
}
