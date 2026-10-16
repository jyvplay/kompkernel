// X16 debug: cost breakdown of the HOMOIOS arm on one file.
import fs from 'node:fs';
import { homoiosSubstitute, HOMOIOS_CONTRACT, homoiosExpand } from '@/lib/omega/homoios';
import { daedalusDualEncode } from '@/lib/omega/daedalus-dual';
import { countTokens } from '@/lib/omega/bpe';
const text = fs.readFileSync(process.argv[2], 'utf8');
const { out, subs } = homoiosSubstitute(text, 'o200k_base');
console.log('subs', subs, 'expandOK', homoiosExpand(out) === text);
const plain = daedalusDualEncode(text);
const sub = daedalusDualEncode(out);
console.log('plain M', plain.messageTokens.o200k_base, 'sub M', sub.messageTokens.o200k_base, 'contract', countTokens(HOMOIOS_CONTRACT, 'o200k_base'));
console.log('raw tokens plain', countTokens(text, 'o200k_base'), 'raw tokens sub', countTokens(out, 'o200k_base'));
console.log('--- wire blocks with ⟪ (first 6) ---');
const lines = out.split('\n').filter(l => l.includes('⟪')).slice(0, 6);
for (const l of lines) console.log(l.slice(0, 300));
