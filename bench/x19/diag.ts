import fs from 'node:fs';
import { stigmeElide, stigmeRestore } from '@/lib/omega/stigme';
import { countTokens } from '@/lib/omega/bpe';
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const el = stigmeElide(t, {});
  console.log(f.split('/').pop(), 'inTok', countTokens(t, 'o200k_base'),
    '-> null?', el === null, el ? `outTok ${countTokens(el.out, 'o200k_base')} sep=${el.sep} dates=${el.dates} subTok=${el.subTok} saved=${el.saved}` : '');
  if (el) console.log('   restore ok:', stigmeRestore(el.out, el.sep, false) === t);
}
