import * as fs from 'node:fs';
import { countTokens, tokenStrings } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';

const enc: any = 'o200k_base';
const p = process.argv[2];
const text = fs.readFileSync(p, 'utf8');
const r: any = tagstackEncode(text, enc);
console.log('winner', r.parentCodec, 'msgTok', r.messageTokens, 'costs', JSON.stringify(r.frontierCosts));
console.log('exact', r.decoded === text);
const m: string = r.message;
console.log('---- MESSAGE (' + m.length + ' chars, ' + countTokens(m, enc) + ' tok) ----');
console.log(m);
