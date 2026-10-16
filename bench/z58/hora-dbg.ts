import fs from 'node:fs';
import { horaSubstitute, horaExpand } from '@/lib/omega/hora';
import { daedalusEncode, daedalusDecode } from '@/lib/omega/daedalus';
const text = fs.readFileSync(process.argv[2], 'utf8');
const { out, marks } = horaSubstitute(text);
const ex = horaExpand(out);
console.log('marks', marks, 'G1', ex === text);
if (ex !== text) { const a = ex.split('\n'), b = text.split('\n'); for (let i = 0; i < b.length; i++) if (a[i] !== b[i]) { console.log('line', i, JSON.stringify(b[i].slice(0,200)), '\n got', JSON.stringify((a[i]??'').slice(0,200))); break; } }
const d = daedalusEncode(out, 'o200k_base');
console.log('G2 exact', d.exact, 'roundtrip', daedalusDecode(d.wire) === out, 'M', d.messageTokens);
console.log(out.split('\n').slice(0,3).join('\n').slice(0,400));
