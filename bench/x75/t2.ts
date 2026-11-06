import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const t = fs.readFileSync(process.argv[2], 'utf8');
const r: any = tagstackEncode(t, enc);
console.log('--- notes:', r.notes);
console.log('--- message, one line per row, each with its own token count:');
for (const [i, l] of r.message.split('\n').entries()) console.log(String(i).padStart(3), String(T(l, enc)).padStart(5), JSON.stringify(l.slice(0, 130)));
