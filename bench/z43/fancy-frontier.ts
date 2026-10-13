// Z43: frontier (DAEDALUS single / dual) one-chat cost on the constructed styled-text inputs.
import fs from 'node:fs';
import { daedalusEncode, daedalusDecode } from '@/lib/omega/daedalus';
import { countTokens } from '@/lib/omega/bpe';
const files = fs.readFileSync(process.env.FILES!, 'utf8').split('\n').filter(Boolean);
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  for (const enc of ['o200k_base', 'cl100k_base'] as const) {
    for (const dual of [false, true]) {
      const r = daedalusEncode(text, enc, { dualTokenizer: dual });
      console.log(JSON.stringify({ file: f.split('/').slice(-1)[0], enc, dual, inTokens: countTokens(text, enc), messageTokens: r.messageTokens, mode: r.mode, exact: daedalusDecode(r.wire) === text }));
    }
  }
}
