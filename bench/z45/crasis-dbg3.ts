import fs from 'node:fs';
import { crasisPlan, crasisHeader } from '../../src/lib/omega/crasis';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
import { countTokens } from '../../src/lib/omega/bpe';
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const p = crasisPlan(t, 'o200k_base', false);
  if (!p) { console.log(f, 'no plan'); continue; }
  const a = daedalusEncode(t, 'o200k_base');
  const b = daedalusEncode(p.fused, 'o200k_base');
  const h = crasisHeader(p.rules, false);
  console.log(f.split('/').pop(), 'plan', p.rules.join(''), 'gain', p.gain, 'hdr', p.headerTokens, '| plain M', a.messageTokens, 'out', a.outTokens, a.winningArm, `${a.phraseRules}p/${a.wordRules}w`, '| fused M', b.messageTokens, 'out', b.outTokens, b.winningArm, `${b.phraseRules}p/${b.wordRules}w`, '| composed', countTokens(h + '\n' + b.decoderPrompt, 'o200k_base'), 'dictGainPlain', a.inTokens - a.messageTokens, 'dictGainFused', b.inTokens - b.messageTokens);
}
