import fs from 'node:fs';
import { horaSubstitute } from '@/lib/omega/hora';
import { daedalusEncode } from '@/lib/omega/daedalus';
const text = fs.readFileSync(process.argv[2], 'utf8');
const { out } = horaSubstitute(text);
const d = daedalusEncode(out, 'o200k_base');
console.log(JSON.stringify({ scriptLen: d.script.length, scriptHasMark: d.script.includes('※'), opsHasMark: d.ops.some(o => o.includes('※')), opsCount: d.ops.length, sample: d.script.slice(0, 60) }));
