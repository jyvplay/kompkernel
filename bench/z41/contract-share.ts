// Z41: share of a DAEDALUS-D message that is the decoder instruction (contract), per tokenizer, on the stratified sample.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { chironDecoderPrompt } from '@/lib/omega/chiron';
const files = process.argv.slice(2);
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const r = daedalusEncode(t, 'o200k_base', { dualTokenizer: true });
  if (r.mode !== 'daedalus') { console.log(JSON.stringify({ f: f.split('/').slice(-1)[0], mode: 'raw' })); continue; }
  const wireO = countTokens(r.wire, 'o200k_base'), wireC = countTokens(r.wire, 'cl100k_base');
  const contractO = countTokens(r.decoderPrompt.replace(r.wire, ''), 'o200k_base');
  const contractC = countTokens(r.decoderPrompt.replace(r.wire, ''), 'cl100k_base');
  const msgO = countTokens(r.decoderPrompt, 'o200k_base'), msgC = countTokens(r.decoderPrompt, 'cl100k_base');
  console.log(JSON.stringify({ f: f.split('/').slice(-1)[0], inO: countTokens(t, 'o200k_base'), msgO, contractO, shareO: +(100 * contractO / msgO).toFixed(1), msgC, contractC, shareC: +(100 * contractC / msgC).toFixed(1), wireO, wireC }));
}
console.log(JSON.stringify({ promptHead: chironDecoderPrompt('§a¶b').slice(0, 400) }));
