import fs from 'node:fs';
import { horaSubstitute, horaExpand } from '@/lib/omega/hora';
import { daedalusEncode, daedalusDecode } from '@/lib/omega/daedalus';
const text = fs.readFileSync(process.argv[2], 'utf8');
const { out, marks } = horaSubstitute(text);
console.log('marks', marks, 'G1', horaExpand(out) === text);
const d = daedalusEncode(out, 'o200k_base');
console.log('wire has marker', d.wire.includes('※'), 'exact', d.exact, 'G2', daedalusDecode(d.wire) === out, 'M', d.messageTokens);
const idx = d.wire.indexOf('※'); if (idx >= 0) console.log('context', JSON.stringify(d.wire.slice(Math.max(0, idx - 40), idx + 40)));
