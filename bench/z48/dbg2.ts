import fs from 'node:fs';
import { induceRules } from '@/lib/omega/elleipsis';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as const;
const text = fs.readFileSync(process.argv[2], 'utf8');
const r = induceRules(text, enc, 24, 3);
const probe = text.replace(/\t\/usr\/share\//gm, '\t');
console.log('mine raw', countTokens(r.reduced, enc), 'probe raw', countTokens(probe, enc), 'same?', probe === r.reduced);
const a = r.reduced.split('\n'), b = probe.split('\n');
for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { console.log(i, JSON.stringify(a[i]), JSON.stringify(b[i])); break; }
const d1 = daedalusEncode(r.reduced, enc), d2 = daedalusEncode(probe, enc);
console.log('mine M', d1.messageTokens, d1.notes.slice(0, 160)); console.log('probe M', d2.messageTokens, d2.notes.slice(0, 160));
