import fs from 'node:fs';
import { stigmeElide, stigmeRestore } from '@/lib/omega/stigme';
import { countTokens } from '@/lib/omega/bpe';
const time = process.env.T === '1', after = process.env.A === '1';
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const base = countTokens(t, 'o200k_base');
  const el = stigmeElide(t, { time, after });
  if (!el) { console.log(f.split('/').pop(), 'NULL'); continue; }
  console.log(f.split('/').pop(), 'inTok', base, '-> outTok', countTokens(el.out, 'o200k_base'),
    `(saves ${base - countTokens(el.out, 'o200k_base')}) sep=${el.sep} dates=${el.dates} times=${el.times} afters=${el.afters} dropped=${el.dropped}`,
    'restore', stigmeRestore(el.out, el.sep, after) === t);
}
