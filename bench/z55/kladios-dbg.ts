import fs from 'node:fs';
import { kladosParse, kladosRender } from '@/lib/omega/kladios';
const text = fs.readFileSync(process.argv[2], 'utf8');
const lines = kladosParse(text, 'ascii');
const r = kladosRender(lines, 'ascii').split('\n');
const o = text.split('\n');
let shown = 0;
for (let i = 0; i < o.length && shown < 4; i++) if (r[i] !== o[i]) { console.log(i, JSON.stringify(o[i]).slice(0,90), '=>', JSON.stringify(r[i]).slice(0,90), 'depth', lines[i].depth); shown++; }
console.log('lines', o.length, r.length, 'mismatches', o.filter((x, i) => r[i] !== x).length, 'depth0', lines.filter(l=>l.depth===0).length);
