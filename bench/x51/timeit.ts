import fs from 'node:fs';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
import { countTokens } from '../../src/lib/omega/bpe';
const enc = 'o200k_base' as const;
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const t0 = Date.now();
  const r = daedalusEncode(text, enc);
  console.log(f, 'chars=' + text.length, 'tok=' + countTokens(text, enc), 'M=' + r.outTokens ?? '', 'ms=' + (Date.now() - t0));
}
