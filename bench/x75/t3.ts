import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const t = fs.readFileSync(process.argv[2], 'utf8');
const r: any = tagstackEncode(t, 'o200k_base' as any);
const m = r.message;
console.log('LEN', m.length, '¶ at', m.indexOf('\u00b6'), '§ at', m.indexOf('\u00a7'));
console.log('FULL >>>');
console.log(m);
console.log('<<< END');
