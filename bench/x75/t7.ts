import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const t = fs.readFileSync(process.argv[2], 'utf8');
const r: any = tagstackFrontier(t, enc);
console.log(`ARM ${r.arm} parent ${r.parentCodec} tokens ${r.messageTokens}`);
for (const [i, l] of r.message.split('\n').entries()) console.log(String(i).padStart(2), String(T(l, enc)).padStart(4), JSON.stringify(l));
