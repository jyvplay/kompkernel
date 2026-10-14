// Z49 probe: gross DAEDALUS saving when derived/constant JSON fields are removed (upper bound, no sentence).
import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as const;
for (const pair of process.argv.slice(2)) {
  const [a, b] = pair.split(',');
  for (const f of [a, b]) {
    const text = fs.readFileSync(f, 'utf8');
    const t0 = Date.now();
    const r = daedalusEncode(text, enc);
    console.log(`${f.split('/').pop()}\traw=${countTokens(text, enc)}\tD=${r.messageTokens}\texact=${r.exact}\t${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
}
