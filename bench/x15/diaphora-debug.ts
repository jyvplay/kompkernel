import fs from 'node:fs';
import { diaphoraSubstitute, diaphoraExpand, diaphoraEncode } from '@/lib/omega/diaphora';
import { daedalusEncode, daedalusDecode } from '@/lib/omega/daedalus';
const text = fs.readFileSync(process.argv[2], 'utf8');
const { out, n } = diaphoraSubstitute(text);
console.log('subs', n, 'sample', JSON.stringify(out.slice(0, 200)));
const ex = diaphoraExpand(out);
console.log('G1 expand exact', ex === text);
if (ex !== text) { let i = 0; while (i < text.length && text[i] === ex[i]) i++; console.log('first diff at', i, JSON.stringify(text.slice(i - 20, i + 20)), JSON.stringify(ex.slice(i - 20, i + 20))); }
const d = daedalusEncode(out, 'o200k_base');
console.log('G2 daedalus exact', d.exact, daedalusDecode(d.wire) === out, 'script', d.script);
const r = diaphoraEncode(text, 'o200k_base');
console.log('arm', r.arm, r.notes);
