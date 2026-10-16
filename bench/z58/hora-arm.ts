import fs from 'node:fs';
import { horaEncode } from '@/lib/omega/hora';
const text = fs.readFileSync(process.argv[2], 'utf8');
const r = horaEncode(text, 'o200k_base');
console.log(JSON.stringify({ arm: r.arm, marks: r.marks, M: r.messageTokens, notes: r.notes }));
