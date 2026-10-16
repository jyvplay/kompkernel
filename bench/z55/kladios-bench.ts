// z55: KLADOS vs DAEDALUS and DAEDALUS-D on drawn-tree lanes. One-chat M (contract + wire), o200k, exact.
import fs from 'node:fs';
import { kladosEncode, kladosDecode } from '@/lib/omega/kladios';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { countTokens } from '@/lib/omega/bpe';
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const k = kladosEncode(text, 'o200k_base');
  const d = daedalusEncode(text, 'o200k_base');
  const exact = k.style === 'identity' ? k.exact : kladosDecode(k.wire, k.style) === text;
  console.log(JSON.stringify({ lane: f.split('/').pop(), raw: text.length, style: k.style, exact, kladios: k.messageTokens, daedalus: d.messageTokens, delta: k.messageTokens - d.messageTokens, wireTokens: countTokens(k.wire, 'o200k_base'), contractTokens: countTokens(k.decoderPrompt, 'o200k_base') - countTokens(k.daedalus.decoderPrompt, 'o200k_base') }));
}
