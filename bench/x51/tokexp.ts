import fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
const enc = 'o200k_base' as const;
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const variants: Array<[string, string]> = [
    ['orig', t],
    ['nospace', t.replace(/ +/g, '')],
    ['nopunct', t.replace(/[.,;:!?'"]/g, '')],
    ['lower', t.toLowerCase()],
    ['nospace+lower', t.replace(/ +/g, '').toLowerCase()],
  ];
  console.log('==', f, 'orig', countTokens(t, enc));
  for (const [k, v] of variants) console.log('   ', k.padEnd(16), countTokens(v, enc));
}
