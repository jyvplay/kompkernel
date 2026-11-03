import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { stadionFold } from '../../src/lib/omega/stadion';
const enc: any = 'o200k_base';
const t = fs.readFileSync('/tmp/fw.txt', 'utf8');
const f = stadionFold(t);
if (!f) { console.log('no fold'); process.exit(0); }
const rule = countTokens(f.rule, enc);
console.log(`raw ${countTokens(t, enc)}  normal ${countTokens(f.normal, enc)}  rule ${rule}  sum ${countTokens(f.normal, enc) + rule}  widths [${f.widths.join(',')}]`);
console.log('--- rule ---'); console.log(f.rule);
console.log('--- normal (first 3) ---'); console.log(f.normal.split('\n').slice(0, 3).join('\n'));
