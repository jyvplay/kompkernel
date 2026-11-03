import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const p = process.argv[2];
const text = fs.readFileSync(p, 'utf8');
const r: any = tagstackEncode(text, enc);
console.error(`winner=${r.parentCodec} tokens=${r.messageTokens} exact=${r.decoded === text} costs=${JSON.stringify(r.frontierCosts)}`);
fs.writeFileSync(process.argv[3], r.message);
console.error(`message chars ${r.message.length}, wrote ${process.argv[3]}`);
