// AKOLOUTHIA in-context sample: forced progression arm (not a savings claim). The original is NOT printed.
import fs from 'node:fs';
import { akolouthiaSubstitute, AKOLOUTHIA_CONTRACT } from '@/lib/omega/akolouthia';
import { daedalusEncode } from '@/lib/omega/daedalus';
const lines = Array.from({ length: 8 }, (_, i) => `W${i + 1}  x=${35 + 42 * i}  y=395  id=${100 + 7 * i}`);
const text = lines.join('\n') + '\n';
fs.writeFileSync('bench/z55/incontext/sample3.txt', text);
const { out, marks } = akolouthiaSubstitute(text);
const d = daedalusEncode(out, 'o200k_base');
const msg = AKOLOUTHIA_CONTRACT + '\n' + d.decoderPrompt;
fs.writeFileSync('bench/z55/incontext/message3.txt', msg);
console.log(JSON.stringify({ marks, daedalusExact: d.exact, messageChars: msg.length }));
